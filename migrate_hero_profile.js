import pg from 'pg';

const connectionString = "postgresql://postgres.cgmpjzwtolnrwsctrerr:RmrtqXoYYGpW3Dg2@aws-0-us-west-2.pooler.supabase.com:6543/postgres";

const sql = `
-- Adiciona campos de perfil de herói
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pin_hash TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS invite_token TEXT UNIQUE DEFAULT gen_random_uuid()::text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS data_nascimento DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS foto_url TEXT;

-- Gera invite_token para perfis existentes que não têm
UPDATE profiles SET invite_token = gen_random_uuid()::text WHERE invite_token IS NULL;

-- Índice para busca rápida por invite_token
CREATE INDEX IF NOT EXISTS idx_profiles_invite_token ON profiles(invite_token);
`;

async function migrate() {
    const client = new pg.Client({ connectionString });
    try {
        await client.connect();
        console.log('✅ Conectado ao banco...');
        await client.query(sql);
        console.log('✅ MIGRAÇÃO CONCLUÍDA — campos de perfil de herói adicionados!');

        // Verificar resultado
        const result = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'profiles' 
            AND column_name IN ('pin_hash', 'invite_token', 'created_by', 'data_nascimento', 'foto_url')
            ORDER BY column_name;
        `);
        console.log('\nColunas adicionadas:');
        result.rows.forEach(r => console.log(`  ✓ ${r.column_name} (${r.data_type})`));
    } catch (err) {
        console.error('❌ ERRO:', err.message);
    } finally {
        await client.end();
    }
}

migrate();
