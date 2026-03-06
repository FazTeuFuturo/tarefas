-- ==========================================================
-- MIGRATION: Fix remaining clan_id references
-- Sincroniza tasks, rewards e redemptions com os novos UUIDs de Clãs
-- ==========================================================

BEGIN;

-- 1. Atualiza as tasks para o novo UUID do clã
--    O clã novo (clans.id) tem o criador (clans.created_by) igual ao antigo clan_id das tasks
UPDATE public.tasks t
SET clan_id = c.id
FROM public.clans c
WHERE t.clan_id = c.created_by;

-- 2. Atualiza as recompensas (rewards)
UPDATE public.rewards r
SET clan_id = c.id
FROM public.clans c
WHERE r.clan_id = c.created_by;

-- 3. Atualiza os resgates (redemptions)
UPDATE public.redemptions rd
SET clan_id = c.id
FROM public.clans c
WHERE rd.clan_id = c.created_by;

-- 4. Atualiza logs de webhooks (stripe)
UPDATE public.stripe_webhook_logs l
SET clan_id = c.id
FROM public.clans c
WHERE l.clan_id = c.created_by;

COMMIT;
