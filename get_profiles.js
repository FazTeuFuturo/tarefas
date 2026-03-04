import pg from 'pg';

const connectionString = "postgresql://postgres.cgmpjzwtolnrwsctrerr:RmrtqXoYYGpW3Dg2@aws-0-us-west-2.pooler.supabase.com:6543/postgres";
const client = new pg.Client({ connectionString });

async function check() {
    await client.connect();

    console.log("=== ALL PROFILES ===");
    const all = await client.query("SELECT id, nome, avatar, role, invite_token, created_at, clan_id FROM profiles ORDER BY created_at DESC");
    for (const r of all.rows) {
        console.log(JSON.stringify(r));
    }

    await client.end();
}

check().catch(console.error);
