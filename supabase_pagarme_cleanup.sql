-- 1. Remover colunas de rastreio da tabela profiles
ALTER TABLE public.profiles 
DROP COLUMN IF EXISTS pagarme_customer_id,
DROP COLUMN IF EXISTS pagarme_subscription_id,
DROP COLUMN IF EXISTS subscription_status,
DROP COLUMN IF EXISTS cpf,
DROP COLUMN IF EXISTS phone,
DROP COLUMN IF EXISTS address_zip_code,
DROP COLUMN IF EXISTS address_street,
DROP COLUMN IF EXISTS address_number,
DROP COLUMN IF EXISTS address_complement,
DROP COLUMN IF EXISTS address_neighborhood,
DROP COLUMN IF EXISTS address_city,
DROP COLUMN IF EXISTS address_state;

-- 2. Remover tabela de logs de webhooks
DROP TABLE IF EXISTS public.webhook_logs;

-- 3. Remover índice
DROP INDEX IF EXISTS idx_profiles_pagarme_subscription_id;
