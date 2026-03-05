-- 1. Adicionar colunas de rastreio da Stripe à tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'free',
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive';

-- 2. Criar tabela de logs para Webhooks da Stripe (Auditoria)
CREATE TABLE IF NOT EXISTS public.stripe_webhook_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    status TEXT,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Habilitar RLS para stripe_webhook_logs
ALTER TABLE public.stripe_webhook_logs ENABLE ROW LEVEL SECURITY;

-- 4. Criar índice para busca rápida por subscription_id
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_subscription_id ON public.profiles(stripe_subscription_id);
