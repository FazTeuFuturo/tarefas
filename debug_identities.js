import pg from 'pg';

const connectionString = "postgresql://postgres.cgmpjzwtolnrwsctrerr:RmrtqXoYYGpW3Dg2@aws-0-us-west-2.pooler.supabase.com:6543/postgres";
const client = new pg.Client({ connectionString });

async function debug() {
    await client.connect();
    try {
        const { rows } = await client.query(`SELECT * FROM auth.identities LIMIT 1`);
        console.log(rows[0]);
    } finally {
        await client.end();
    }
}
debug();
