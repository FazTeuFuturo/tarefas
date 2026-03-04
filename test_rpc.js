import pg from 'pg';

const connectionString = "postgresql://postgres.cgmpjzwtolnrwsctrerr:RmrtqXoYYGpW3Dg2@aws-0-us-west-2.pooler.supabase.com:6543/postgres";
const client = new pg.Client({ connectionString });

async function debug() {
    await client.connect();
    try {
        console.log('Testando create_auth_user...');
        const res = await client.query(`
            SELECT public.create_auth_user(
                gen_random_uuid(),
                'test_create_auth_' || floor(random() * 1000) || '@test.com',
                'password123'
            )
        `);
        console.log('Sucesso:', res.rows[0]);
    } catch (err) {
        console.error('ERRO:', err.message);
    } finally {
        await client.end();
    }
}
debug();
