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

        await supabase.from('stripe_webhook_logs').insert({
            event_type: type,
            payload: event,
            status: 'received'
        });

        // Upgrade para premium
        if (type === 'checkout.session.completed') {
            const session = data.object;
            const userId = session.metadata?.user_id;

            if (userId) {
                // Descobre o clan_id do pagador
                const { data: profile, error: profileErr } = await supabase
                    .from('profiles')
                    .select('clan_id')
                    .eq('id', userId)
                    .single();

                if (profileErr || !profile?.clan_id) throw profileErr ?? new Error('clan_id não encontrado');

                // Atualiza o clã — trigger propaga plan para todos os membros automaticamente
                const { error } = await supabase
                    .from('clans')
                    .update({
                        stripe_customer_id: session.customer,
                        stripe_subscription_id: session.subscription,
                        subscription_status: 'active',
                        plan: 'premium'
                    })
                    .eq('id', profile.clan_id);

                if (error) throw error;
                console.log(`[STRIPE-WEBHOOK] Clã ${profile.clan_id} atualizado para PREMIUM.`);
            }
        }

        // Cancelamento ou falha de pagamento
        if (type === 'customer.subscription.deleted' || type === 'invoice.payment_failed') {
            const subscriptionId = data.object.id;

            // Encontra o clã pela subscription — trigger propaga downgrade para todos
            const { data: clan, error: clanErr } = await supabase
                .from('clans')
                .select('id')
                .eq('stripe_subscription_id', subscriptionId)
                .single();

            if (clanErr || !clan) throw clanErr ?? new Error('Clã não encontrado para subscription');

            const { error } = await supabase
                .from('clans')
                .update({
                    subscription_status: type === 'customer.subscription.deleted' ? 'canceled' : 'past_due',
                    plan: 'free'
                })
                .eq('id', clan.id);

            if (error) throw error;
            console.log(`[STRIPE-WEBHOOK] Clã ${clan.id} revertido para FREE (${type}).`);
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
