import pg from 'pg';

const connectionString = "postgresql://postgres.cgmpjzwtolnrwsctrerr:RmrtqXoYYGpW3Dg2@aws-0-us-west-2.pooler.supabase.com:6543/postgres";
const client = new pg.Client({ connectionString });

async function debug() {
    await client.connect();
    try {
        const { rows } = await client.query(`
            SELECT id, nome, role, invite_token, 
                   CASE WHEN pin_hash IS NULL THEN 'SEM PIN' ELSE 'TEM PIN' END as pin_status
            FROM public.profiles 
            ORDER BY role, nome
        `);
        console.log(JSON.stringify(rows, null, 2));
    } finally {
        await client.end();
    }
}
debug();
