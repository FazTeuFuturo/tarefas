import pg from 'pg';

const connectionString = "postgresql://postgres.cgmpjzwtolnrwsctrerr:RmrtqXoYYGpW3Dg2@aws-0-us-west-2.pooler.supabase.com:6543/postgres";
const client = new pg.Client({ connectionString });

async function check() {
    await client.connect();

    // Show ALL profiles
    const all = await client.query("SELECT id, nome, avatar, role, invite_token, created_at, created_by, clan_id FROM profiles ORDER BY created_at");
    for (const r of all.rows) {
        console.log(`[${r.role}] "${r.nome}" | id: ${r.id} | token: ${r.invite_token} | clan: ${r.clan_id} | created: ${r.created_at}`);
    }

    await client.end();
}

check().catch(console.error);
