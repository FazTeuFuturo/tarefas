import pg from 'pg';

const connectionString = "postgresql://postgres.cgmpjzwtolnrwsctrerr:RmrtqXoYYGpW3Dg2@aws-0-us-west-2.pooler.supabase.com:6543/postgres";

async function confirmUsers() {
    const client = new pg.Client({ connectionString });
    try {
        await client.connect();
        console.log('Confirmando usuários no banco...');
        const res = await client.query("UPDATE auth.users SET confirmed_at = NOW(), last_sign_in_at = NOW(), email_confirmed_at = NOW() WHERE confirmed_at IS NULL");
        console.log(`✅ ${res.rowCount} usuário(s) confirmado(s) com sucesso!`);
    } catch (err) {
        console.error('❌ ERRO AO CONFIRMAR:', err.message);
    } finally {
        await client.end();
    }
}

confirmUsers();
