-- ==========================================================
-- FAMILY QUEST - CONSOLIDATED PRODUCTION SCHEMA (CURRENT)
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

-- 2. TABELA DE CLÃS (CLANS) — source of truth para plano e stripe
CREATE TABLE IF NOT EXISTS public.clans (
  id                     uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome                   text        NOT NULL DEFAULT 'Família',
  plan                   text        NOT NULL DEFAULT 'free',
  stripe_customer_id     text,
  stripe_subscription_id text,
  subscription_status    text        NOT NULL DEFAULT 'inactive',
  created_by             uuid,       -- informacional, sem FK
  created_at             timestamptz NOT NULL DEFAULT now()
);

-- 3. TABELA DE PERFIS (PROFILES)
CREATE TABLE IF NOT EXISTS public.profiles (
  id                       uuid        NOT NULL,
  email                    text        NOT NULL,
  nome                     text        NOT NULL,
  avatar                   text,
  role                     user_role   NOT NULL DEFAULT 'child'::user_role,
  xp                       integer     NOT NULL DEFAULT 0,
  nivel                    integer     NOT NULL DEFAULT 1,
  fc_balance               integer     NOT NULL DEFAULT 0,
  created_at               timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  pin_hash                 text,
  invite_token             text        DEFAULT (gen_random_uuid())::text UNIQUE,
  created_by               uuid,
  data_nascimento          date,
  foto_url                 text,
  clan_id                  uuid,
  tempo_economizado_total  integer     DEFAULT 0,
  plan                     text        NOT NULL DEFAULT 'free', -- cache sincronizado via trigger de clans
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id),
  CONSTRAINT profiles_clan_id_fkey    FOREIGN KEY (clan_id)    REFERENCES public.clans(id)
);

-- 3. TABELA DE MISSÕES (TASKS)
CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  descricao text,
  xp_reward integer NOT NULL DEFAULT 0,
  fc_reward integer NOT NULL DEFAULT 0,
  status task_status NOT NULL DEFAULT 'active'::task_status,
  duracao_minutos integer DEFAULT 10,
  is_recurring boolean DEFAULT false,
  assignee_id uuid,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  timer_status text DEFAULT 'idle'::text,
  timer_remaining_seconds integer,
  timer_updated_at timestamp with time zone,
  clan_id uuid,
  time_saved_seconds integer DEFAULT 0,
  CONSTRAINT tasks_pkey PRIMARY KEY (id),
  CONSTRAINT tasks_assignee_id_fkey FOREIGN KEY (assignee_id) REFERENCES public.profiles(id),
  CONSTRAINT tasks_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);

-- 4. TABELA DE RECOMPENSAS (REWARDS)
CREATE TABLE IF NOT EXISTS public.rewards (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  descricao text,
  cost_fc integer NOT NULL DEFAULT 0,
  icon_type text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  clan_id uuid,
  CONSTRAINT rewards_pkey PRIMARY KEY (id)
);

-- 5. TABELA DE RESGATES E INVENTÁRIO (REDEMPTIONS)
CREATE TABLE IF NOT EXISTS public.redemptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL,
  reward_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'unused'::text,
  cost_fc integer NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  clan_id uuid,
  CONSTRAINT redemptions_pkey PRIMARY KEY (id),
  CONSTRAINT redemptions_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id),
  CONSTRAINT redemptions_reward_id_fkey FOREIGN KEY (reward_id) REFERENCES public.rewards(id)
);

-- 6. TABELA DE LOGS DE WEBHOOKS STRIPE
CREATE TABLE IF NOT EXISTS public.stripe_webhook_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  status text,
  error_message text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT stripe_webhook_logs_pkey PRIMARY KEY (id)
);

-- 7. CONFIGURAÇÃO DE REALTIME
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime;
COMMIT;
ALTER PUBLICATION supabase_realtime ADD TABLE profiles, tasks, rewards, redemptions;

-- 8. SEGURANÇA (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_webhook_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all operations' AND tablename = 'profiles') THEN
    CREATE POLICY "Allow all operations" ON profiles FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all operations' AND tablename = 'tasks') THEN
    CREATE POLICY "Allow all operations" ON tasks FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all operations' AND tablename = 'rewards') THEN
    CREATE POLICY "Allow all operations" ON rewards FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all operations' AND tablename = 'redemptions') THEN
    CREATE POLICY "Allow all operations" ON redemptions FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all operations' AND tablename = 'stripe_webhook_logs') THEN
    CREATE POLICY "Allow all operations" ON stripe_webhook_logs FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 9. TRIGGER DE CRIAÇÃO AUTOMÁTICA DE PERFIL (AUTH -> PUBLIC)
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
