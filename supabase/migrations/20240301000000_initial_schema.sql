-- 0001_initial_schema.sql

-- Drop previous types if they existed (in case of re-running during dev)
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS task_status CASCADE;

CREATE TYPE user_role AS ENUM ('parent', 'child');
CREATE TYPE task_status AS ENUM ('pending', 'active', 'completed', 'approved');

CREATE TABLE profiles (
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

CREATE TABLE tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  descricao TEXT,
  xp_reward INTEGER DEFAULT 0 NOT NULL,
  fc_reward INTEGER DEFAULT 0 NOT NULL,
  status task_status DEFAULT 'pending' NOT NULL,
  duracao_minutos INTEGER DEFAULT 10,
  created_by UUID REFERENCES profiles(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE rewards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  descricao TEXT,
  cost_fc INTEGER DEFAULT 0 NOT NULL,
  icon_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable Realtime for all tables
alter publication supabase_realtime add table profiles;
alter publication supabase_realtime add table tasks;
alter publication supabase_realtime add table rewards;

-- RLS setup (simple for local dev)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for local dev profiles"
  ON profiles FOR ALL USING (true) WITH CHECK (true);
  
CREATE POLICY "Allow all operations for local dev tasks"
  ON tasks FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations for local dev rewards"
  ON rewards FOR ALL USING (true) WITH CHECK (true);
