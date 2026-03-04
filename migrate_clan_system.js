import pg from 'pg';

const connectionString = "postgresql://postgres.cgmpjzwtolnrwsctrerr:RmrtqXoYYGpW3Dg2@aws-0-us-west-2.pooler.supabase.com:6543/postgres";

const sql = `
-- 1. Adicionar clan_id UUID em todas as tabelas
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS clan_id UUID;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS clan_id UUID;
ALTER TABLE public.rewards ADD COLUMN IF NOT EXISTS clan_id UUID;
ALTER TABLE public.redemptions ADD COLUMN IF NOT EXISTS clan_id UUID;

-- 2. Backfill: Inicializar clan_id para dados existentes
-- Pais ganham um clan_id igual ao seu próprio ID
UPDATE public.profiles SET clan_id = id WHERE role = 'parent' AND clan_id IS NULL;

-- Filhos ganham o clan_id de quem os criou (created_by)
UPDATE public.profiles p
SET clan_id = parent.clan_id
FROM public.profiles parent
WHERE p.role = 'child' 
  AND p.created_by = parent.id
  AND p.clan_id IS NULL;

-- Se sobrar algum filho sem created_by (improvável no novo sistema), 
-- ganha um clan_id próprio para não quebrar
UPDATE public.profiles SET clan_id = id WHERE clan_id IS NULL;

-- Propagar clan_id para tarefas, recompensas e resgates
UPDATE public.tasks t SET clan_id = p.clan_id FROM public.profiles p WHERE t.created_by = p.id AND t.clan_id IS NULL;
UPDATE public.rewards SET clan_id = (SELECT clan_id FROM public.profiles WHERE role = 'parent' LIMIT 1) WHERE clan_id IS NULL;
UPDATE public.redemptions red SET clan_id = p.clan_id FROM public.profiles p WHERE red.profile_id = p.id AND red.clan_id IS NULL;

-- 3. Atualizar Trigger de handle_new_user para novos cadastros
-- Se for o primeiro de um clã, ele cria o clã (clan_id = id)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    target_clan_id UUID;
BEGIN
    -- Se houver um clan_id no metadata (convite), usa ele. 
    -- Se não, o mestre cria seu próprio clã.
    target_clan_id := (NEW.raw_user_meta_data->>'clan_id')::UUID;
    IF target_clan_id IS NULL THEN
        target_clan_id := NEW.id;
    END IF;

    INSERT INTO public.profiles (id, email, nome, role, avatar, nivel, xp, fc_balance, clan_id)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'nome', 'Personagem'),
        COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'parent'::public.user_role),
        COALESCE(NEW.raw_user_meta_data->>'avatar', 'https://api.dicebear.com/7.x/avataaars/svg?seed=' || NEW.id),
        1,
        0,
        0,
        target_clan_id
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Funções auxiliares para quebrar recursão de RLS
CREATE OR REPLACE FUNCTION public.get_my_clan_id() 
RETURNS UUID AS $$
  SELECT clan_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_parent() 
RETURNS BOOLEAN AS $$
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'parent');
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Profiles
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON profiles;
DROP POLICY IF EXISTS "Allow all operations" ON profiles;
DROP POLICY IF EXISTS "Clan members can see each other" ON profiles;
DROP POLICY IF EXISTS "Clan members can see each other v2" ON profiles;
DROP POLICY IF EXISTS "Parents can manage clan profiles" ON profiles;

CREATE POLICY "Clan members can see each other" ON profiles
    FOR SELECT USING (
        id = auth.uid() OR clan_id = public.get_my_clan_id()
    );

CREATE POLICY "Parents can manage clan profiles" ON profiles
    FOR ALL USING (
        public.is_parent() AND (id = auth.uid() OR clan_id = public.get_my_clan_id())
    );

-- Tasks
DROP POLICY IF EXISTS "Allow all operations" ON tasks;
DROP POLICY IF EXISTS "Clan members can see tasks" ON tasks;
DROP POLICY IF EXISTS "Parents can manage tasks" ON tasks;
DROP POLICY IF EXISTS "Children can update task timer" ON tasks;

CREATE POLICY "Clan members can see tasks" ON tasks
    FOR SELECT USING (
        clan_id = public.get_my_clan_id()
    );

CREATE POLICY "Parents can manage tasks" ON tasks
    FOR ALL USING (
        public.is_parent() AND clan_id = public.get_my_clan_id()
    );

CREATE POLICY "Children can update task timer" ON tasks
    FOR UPDATE USING (
        clan_id = public.get_my_clan_id()
    ) WITH CHECK (true);

-- Rewards
DROP POLICY IF EXISTS "Allow all operations" ON rewards;
DROP POLICY IF EXISTS "Clan members can see rewards" ON rewards;
DROP POLICY IF EXISTS "Parents can manage rewards" ON rewards;

CREATE POLICY "Clan members can see rewards" ON rewards
    FOR SELECT USING (
        clan_id = public.get_my_clan_id()
    );

CREATE POLICY "Parents can manage rewards" ON rewards
    FOR ALL USING (
        public.is_parent() AND clan_id = public.get_my_clan_id()
    );

-- Redemptions
DROP POLICY IF EXISTS "Allow all operations" ON redemptions;
DROP POLICY IF EXISTS "Clan members can see redemptions" ON redemptions;
DROP POLICY IF EXISTS "Users can manage redemptions" ON redemptions;

CREATE POLICY "Clan members can see redemptions" ON redemptions
    FOR SELECT USING (
        clan_id = public.get_my_clan_id()
    );

CREATE POLICY "Users can manage redemptions" ON redemptions
    FOR ALL USING (
        clan_id = public.get_my_clan_id()
    );
`;

async function migrate() {
    const client = new pg.Client({ connectionString });
    try {
        await client.connect();
        console.log('✅ Conectado...');
        await client.query(sql);
        console.log('✅ MIGRAÇÃO CLÃ OK!');
    } catch (err) {
        console.error('❌ ERRO:', err.message);
    } finally {
        await client.end();
    }
}

migrate();
