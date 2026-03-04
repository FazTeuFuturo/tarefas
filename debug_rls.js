import pg from 'pg';

const connectionString = "postgresql://postgres.cgmpjzwtolnrwsctrerr:RmrtqXoYYGpW3Dg2@aws-0-us-west-2.pooler.supabase.com:6543/postgres";
const client = new pg.Client({ connectionString });

async function debug() {
    await client.connect();
    try {
        const { rows } = await client.query(`
            SELECT tablename, policyname, roles, cmd, qual, with_check
            FROM pg_policies
            WHERE schemaname = 'public';
        `);
        console.table(rows);
    } finally {
        await client.end();
    }
}
debug();
