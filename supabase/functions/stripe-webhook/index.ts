import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { corsHeaders } from '../_shared/cors.ts';

const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET');

/** Valida assinatura HMAC-SHA256 do Stripe sem SDK */
async function verifyStripeSignature(payload: string, signature: string, secret: string): Promise<boolean> {
    const parts: Record<string, string> = {};
    for (const part of signature.split(',')) {
        const idx = part.indexOf('=');
        if (idx !== -1) parts[part.slice(0, idx)] = part.slice(idx + 1);
    }
    const timestamp = parts['t'];
    const sig = parts['v1'];
    if (!timestamp || !sig) return false;

    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - parseInt(timestamp)) > 300) return false;

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
        'raw', encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false, ['sign']
    );
    const signatureBytes = await crypto.subtle.sign('HMAC', key, encoder.encode(`${timestamp}.${payload}`));
    const computedSig = Array.from(new Uint8Array(signatureBytes))
        .map(b => b.toString(16).padStart(2, '0')).join('');
    return computedSig === sig;
}

serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

    const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    try {
        const bodyText = await req.text();

        const stripeSignature = req.headers.get('stripe-signature');
        if (!stripeSignature || !STRIPE_WEBHOOK_SECRET) {
            return new Response('Unauthorized', { status: 401 });
        }
        if (!await verifyStripeSignature(bodyText, stripeSignature, STRIPE_WEBHOOK_SECRET)) {
            console.error('[STRIPE-WEBHOOK] Assinatura inválida.');
            return new Response('Invalid signature', { status: 401 });
        }

        const event = JSON.parse(bodyText);
        const { type, data } = event;

        // Insere o log inicial e captura o ID para atualizar depois
        const { data: logRow } = await supabase
            .from('stripe_webhook_logs')
            .insert({ event_type: type, payload: event, status: 'received' })
            .select('id')
            .single();

        const logId: string | null = logRow?.id ?? null;

        let clanId: string | null = null;
        let processingError: string | null = null;

        try {
            // Upgrade para premium
            if (type === 'checkout.session.completed') {
                const session = data.object;
                const userId = session.metadata?.user_id;

                if (userId) {
                    const { data: profile, error: profileErr } = await supabase
                        .from('profiles')
                        .select('clan_id')
                        .eq('id', userId)
                        .single();

                    if (profileErr || !profile?.clan_id) throw profileErr ?? new Error('clan_id não encontrado');
                    clanId = profile.clan_id;

                    const { error } = await supabase
                        .from('clans')
                        .update({
                            stripe_customer_id: session.customer,
                            stripe_subscription_id: session.subscription,
                            subscription_status: 'active',
                            plan: 'premium'
                        })
                        .eq('id', clanId);

                    if (error) throw error;
                    console.log(`[STRIPE-WEBHOOK] Clã ${clanId} atualizado para PREMIUM.`);
                }
            }

            // Cancelamento
            if (type === 'customer.subscription.deleted') {
                const subscriptionId = data.object.id;

                const { data: clan, error: clanErr } = await supabase
                    .from('clans')
                    .select('id')
                    .eq('stripe_subscription_id', subscriptionId)
                    .single();

                if (clanErr || !clan) throw clanErr ?? new Error('Clã não encontrado para subscription');
                clanId = clan.id;

                const { error } = await supabase
                    .from('clans')
                    .update({ subscription_status: 'canceled', plan: 'free' })
                    .eq('id', clanId);

                if (error) throw error;
                console.log(`[STRIPE-WEBHOOK] Clã ${clanId} cancelado → FREE.`);
            }

            // Falha de pagamento (mantém premium por enquanto, muda status para past_due)
            if (type === 'invoice.payment_failed') {
                const subscriptionId = data.object.subscription;

                const { data: clan, error: clanErr } = await supabase
                    .from('clans')
                    .select('id')
                    .eq('stripe_subscription_id', subscriptionId)
                    .single();

                if (clanErr || !clan) throw clanErr ?? new Error('Clã não encontrado para subscription');
                clanId = clan.id;

                const { error } = await supabase
                    .from('clans')
                    .update({ subscription_status: 'past_due' })
                    .eq('id', clanId);

                if (error) throw error;
                console.log(`[STRIPE-WEBHOOK] Clã ${clanId} com pagamento falho → past_due.`);
            }

        } catch (innerErr: unknown) {
            processingError = innerErr instanceof Error ? innerErr.message : 'Unknown processing error';
            throw innerErr; // re-lança para o catch externo retornar 400
        } finally {
            // Sempre atualiza o log com o resultado final
            if (logId) {
                await supabase
                    .from('stripe_webhook_logs')
                    .update({
                        status: processingError ? 'error' : 'processed',
                        error_message: processingError,
                        clan_id: clanId,
                    })
                    .eq('id', logId);
            }
        }

        return new Response(JSON.stringify({ received: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error('[STRIPE-WEBHOOK-ERROR]', message);
        return new Response(JSON.stringify({ error: message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
