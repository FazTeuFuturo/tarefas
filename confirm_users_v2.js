import pg from 'pg';

const connectionString = "postgresql://postgres.cgmpjzwtolnrwsctrerr:RmrtqXoYYGpW3Dg2@aws-0-us-west-2.pooler.supabase.com:6543/postgres";

async function confirmUsers() {
    const client = new pg.Client({ connectionString });
    try {
        await client.connect();
        console.log('Confirmando usuários (Tentativa 2)...');
        // Em versões recentes do Supabase, confirmed_at é gerado. Vamos focar em email_confirmed_at
        const res = await client.query("UPDATE auth.users SET email_confirmed_at = NOW(), last_sign_in_at = NOW() WHERE email_confirmed_at IS NULL");
        console.log(`✅ ${res.rowCount} usuário(s) atualizado(s)!`);
    } catch (err) {
        console.error('❌ ERRO AO CONFIRMAR:', err.message);
    } finally {
        await client.end();
    }
}

confirmUsers();
