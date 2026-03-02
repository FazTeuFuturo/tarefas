-- ==========================================================
-- FAMILY QUEST - CONSOLIDATED PRODUCTION SCHEMA
-- Use este script no Editor SQL do seu projeto Supabase
-- [Projeto: cgmpjzwtolnrwsctrerr]
-- ==========================================================

-- 1. TIPOS EXCLUSIVOS
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('parent', 'child', 'mestre');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE task_status AS ENUM ('pending', 'active', 'completed', 'approved');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. TABELA DE PERFIS (PROFILES)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  email TEXT NOT NULL,
  nome TEXT NOT NULL,
  avatar TEXT,
  role user_role DEFAULT 'child' NOT NULL,
  xp INTEGER DEFAULT 0 NOT NULL,
  nivel INTEGER DEFAULT 1 NOT NULL,
  fc_balance INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. TABELA DE MISSÕES (TASKS)
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  descricao TEXT,
  xp_reward INTEGER DEFAULT 0 NOT NULL,
  fc_reward INTEGER DEFAULT 0 NOT NULL,
  status task_status DEFAULT 'active' NOT NULL,
  duracao_minutos INTEGER DEFAULT 10,
  is_recurring BOOLEAN DEFAULT false,
  assignee_id UUID REFERENCES public.profiles(id),
  created_by UUID REFERENCES public.profiles(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  -- Campos de Timer
  timer_status TEXT DEFAULT 'idle', -- idle, running, paused
  timer_remaining_seconds INTEGER,
  timer_updated_at TIMESTAMP WITH TIME ZONE
);

-- 4. TABELA DE RECOMPENSAS (REWARDS)
CREATE TABLE IF NOT EXISTS public.rewards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  descricao TEXT,
  cost_fc INTEGER DEFAULT 0 NOT NULL,
  icon_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 5. TABELA DE RESGATES E INVENTÁRIO (REDEMPTIONS)
CREATE TABLE IF NOT EXISTS public.redemptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID REFERENCES public.profiles(id) NOT NULL,
  reward_id UUID REFERENCES public.rewards(id) NOT NULL,
  status TEXT DEFAULT 'unused' NOT NULL, -- unused, used
  cost_fc INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 6. CONFIGURAÇÃO DE REALTIME
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime;
COMMIT;
ALTER PUBLICATION supabase_realtime ADD TABLE profiles, tasks, rewards, redemptions;

-- 7. SEGURANÇA (RLS) - Simples para Desenvolvimento/Produção Inicial
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE redemptions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Allow all operations" ON profiles FOR ALL USING (true) WITH CHECK (true);
  CREATE POLICY "Allow all operations" ON tasks FOR ALL USING (true) WITH CHECK (true);
  CREATE POLICY "Allow all operations" ON rewards FOR ALL USING (true) WITH CHECK (true);
  CREATE POLICY "Allow all operations" ON redemptions FOR ALL USING (true) WITH CHECK (true);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 8. TRIGGER DE CRIAÇÃO AUTOMÁTICA DE PERFIL (AUTH -> PUBLIC)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nome, role, avatar, nivel, xp, fc_balance)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nome', 'Herói Misterioso'),
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'child'::public.user_role),
    COALESCE(NEW.raw_user_meta_data->>'avatar', 'https://api.dicebear.com/7.x/avataaars/svg?seed=' || COALESCE(NEW.raw_user_meta_data->>'nome', 'heroi')),
    1,
    0,
    0
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
