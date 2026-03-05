import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { corsHeaders } from '../_shared/cors.ts';

const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET');

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    try {
        const bodyText = await req.text();
        // Em produção, você deve validar a assinatura aqui usando o STRIPE_WEBHOOK_SECRET
        // Por enquanto, vamos focar na lógica de processamento
        const event = JSON.parse(bodyText);
        const { type, data } = event;

        // 1. Logar o Webhook para Auditoria
        await supabase.from('stripe_webhook_logs').insert({
            event_type: type,
            payload: event,
            status: 'received'
        });

        // 2. Processar Checkout Concluído
        if (type === 'checkout.session.completed') {
            const session = data.object;
            const userId = session.metadata?.user_id;
            const customerId = session.customer;
            const subscriptionId = session.subscription;

            if (userId) {
                const { error } = await supabase
                    .from('profiles')
                    .update({
                        stripe_customer_id: customerId,
                        stripe_subscription_id: subscriptionId,
                        subscription_status: 'active',
                        plan: 'premium'
                    })
                    .eq('id', userId);

                if (error) throw error;
                console.log(`[STRIPE-WEBHOOK] Usuário ${userId} atualizado para PREMIUM.`);
            }
        }

        // 3. Processar Assinatura Cancelada ou Falha de Pagamento
        if (type === 'customer.subscription.deleted' || type === 'invoice.payment_failed') {
            const subscriptionId = data.object.id;

            const { error } = await supabase
                .from('profiles')
                .update({
                    subscription_status: type === 'customer.subscription.deleted' ? 'canceled' : 'past_due',
                    plan: 'free'
                })
                .eq('stripe_subscription_id', subscriptionId);

            if (error) throw error;
            console.log(`[STRIPE-WEBHOOK] Assinatura ${subscriptionId} DESATIVADA (Motivo: ${type}).`);
        }

        return new Response(JSON.stringify({ received: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (err) {
        console.error('[STRIPE-WEBHOOK-ERROR]', err.message);
        return new Response(JSON.stringify({ error: err.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
