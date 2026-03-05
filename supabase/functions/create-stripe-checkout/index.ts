import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { corsHeaders } from '../_shared/cors.ts';

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');
const STRIPE_PRICE_ID = Deno.env.get('STRIPE_PRICE_ID'); // price_1T7ix9ReM19UrhDrvqRycZLx
const APP_URL = Deno.env.get('APP_URL') || 'http://localhost:5173';

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) throw new Error('Cabeçalho de autorização ausente');

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        );

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) throw new Error('Não autorizado');

        // 1. Buscar se o usuário já tem um stripe_customer_id
        const { data: profile } = await supabase
            .from('profiles')
            .select('stripe_customer_id')
            .eq('id', user.id)
            .single();

        let customerId = profile?.stripe_customer_id;

        // 2. Criar Checkout Session
        const formData = new URLSearchParams();
        formData.append('payment_method_types[]', 'card');
        formData.append('line_items[0][price]', STRIPE_PRICE_ID!);
        formData.append('line_items[0][quantity]', '1');
        formData.append('mode', 'subscription');
        formData.append('success_url', `${APP_URL}/?session_id={CHECKOUT_SESSION_ID}`);
        formData.append('cancel_url', `${APP_URL}/`);
        formData.append('metadata[user_id]', user.id);

        if (customerId) {
            formData.append('customer', customerId);
        } else {
            formData.append('customer_email', user.email!);
        }

        const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData.toString(),
        });

        const session = await response.json();
        if (!response.ok) throw new Error(session.error?.message || 'Erro ao criar sessão de checkout');

        return new Response(JSON.stringify({ url: session.url }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
