-- ==========================================================
-- MIGRATION: Fix clan_id anti-pattern
-- Substitui IDs de usuários usados como clan_id por UUIDs reais
-- ==========================================================

BEGIN;

-- 1. Tabela temporária de mapeamento: old_id (= user_id do fundador) → new_id (UUID real do clã)
CREATE TEMP TABLE _clan_mapping AS
SELECT
    DISTINCT clan_id AS old_id,
    gen_random_uuid() AS new_id
FROM profiles
WHERE clan_id IS NOT NULL;

-- 2. Cria os clãs com UUIDs reais
--    Pega nome e plan do perfil do fundador (cujo id = old clan_id)
INSERT INTO clans (id, nome, plan, created_by, created_at)
SELECT
    m.new_id,
    f.nome || ' Clan' AS nome,
    COALESCE(f.plan, 'free')        AS plan,
    f.id                            AS created_by,
    f.created_at
FROM _clan_mapping m
JOIN profiles f ON f.id = m.old_id
ON CONFLICT (id) DO NOTHING;

-- 3. Atualiza todos os profiles para apontar para o novo UUID do clã
UPDATE profiles p
SET clan_id = m.new_id
FROM _clan_mapping m
WHERE p.clan_id = m.old_id;

-- 4. Cria clãs para parents que ainda não têm clan_id (NULL)
WITH inserted AS (
    INSERT INTO clans (id, nome, plan, created_by, created_at)
    SELECT
        gen_random_uuid(),
        p.nome || ' Clan',
        COALESCE(p.plan, 'free'),
        p.id,
        p.created_at
    FROM profiles p
    WHERE p.clan_id IS NULL
      AND p.role = 'parent'
    RETURNING id, created_by
)
UPDATE profiles p
SET clan_id = i.id
FROM inserted i
WHERE p.id = i.created_by;

-- 5. Cria trigger para sincronizar plan do clã → profiles dos membros
CREATE OR REPLACE FUNCTION public.sync_clan_plan_to_profiles()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.plan IS DISTINCT FROM NEW.plan THEN
        UPDATE public.profiles
        SET plan = NEW.plan
        WHERE clan_id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_clan_plan_updated ON clans;
CREATE TRIGGER on_clan_plan_updated
    AFTER UPDATE ON clans
    FOR EACH ROW EXECUTE FUNCTION public.sync_clan_plan_to_profiles();

-- 6. Cria trigger para atribuir clã ao novo parent no cadastro
--    (substitui a lógica manual de criar clan_id depois)
CREATE OR REPLACE FUNCTION public.handle_new_parent_clan()
RETURNS TRIGGER AS $$
DECLARE
    new_clan_id uuid;
BEGIN
    -- Só cria clã automático para parents
    IF NEW.role = 'parent' AND NEW.clan_id IS NULL THEN
        INSERT INTO public.clans (nome, plan, created_by)
        VALUES (NEW.nome || ' Clan', 'free', NEW.id)
        RETURNING id INTO new_clan_id;

        UPDATE public.profiles
        SET clan_id = new_clan_id
        WHERE id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_parent_profile_created ON profiles;
CREATE TRIGGER on_parent_profile_created
    AFTER INSERT ON profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_parent_clan();

-- 7. Adiciona clan_id à tabela de logs (sem FK — logs de auditoria são imutáveis)
ALTER TABLE stripe_webhook_logs ADD COLUMN IF NOT EXISTS clan_id uuid;

COMMIT;
