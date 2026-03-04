import pg from 'pg';

const connectionString = "postgresql://postgres.cgmpjzwtolnrwsctrerr:RmrtqXoYYGpW3Dg2@aws-0-us-west-2.pooler.supabase.com:6543/postgres";

const sql = `
-- 1. Remover FK constraint profiles.id → auth.users(id)
--    (para permitir heróis sem conta Supabase Auth)
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- 2. Permitir que pais (role=parent) insiram perfis de filhos
DROP POLICY IF EXISTS "Parents can insert child profiles" ON profiles;
CREATE POLICY "Parents can insert child profiles" ON profiles
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
            AND p.role = 'parent'
        )
    );

-- 3. Garantir que todos conseguem ler perfis (leaderboard)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
CREATE POLICY "Profiles are viewable by authenticated users" ON profiles
    FOR SELECT
    USING (auth.role() = 'authenticated');
`;

async function migrate() {
    const client = new pg.Client({ connectionString });
    try {
        await client.connect();
        console.log('✅ Conectado...');
        await client.query(sql);
        console.log('✅ MIGRAÇÃO OK — FK removido, RLS atualizado!');

        // Confirmar políticas
        const res = await client.query(`
            SELECT policyname, cmd FROM pg_policies WHERE tablename = 'profiles' ORDER BY policyname;
        `);
        console.log('\nPolíticas RLS atuais:');
        res.rows.forEach(r => console.log(`  ✓ [${r.cmd}] ${r.policyname}`));
    } catch (err) {
        console.error('❌ ERRO:', err.message);
    } finally {
        await client.end();
    }
}

migrate();
