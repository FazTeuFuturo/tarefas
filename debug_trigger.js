import pg from 'pg';

const connectionString = "postgresql://postgres.cgmpjzwtolnrwsctrerr:RmrtqXoYYGpW3Dg2@aws-0-us-west-2.pooler.supabase.com:6543/postgres";
const client = new pg.Client({ connectionString });

async function debug() {
    await client.connect();
    try {
        const { rows } = await client.query(`
            SELECT prosrc
            FROM pg_proc
            WHERE proname = 'handle_new_user';
        `);
        console.log("Trigger Code:", rows[0]?.prosrc);
    } finally {
        await client.end();
    }
}
debug();
