import pg from 'pg';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Read .env for supabase client
const d = fs.readFileSync('.env', 'utf8');
const env = {};
d.split('\n').filter(l => l && !l.startsWith('#')).forEach(l => {
    const p = l.split('=');
    if (p.length >= 2) env[p[0].trim()] = p.slice(1).join('=').trim()
});
const sb = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

const connectionString = "postgresql://postgres.cgmpjzwtolnrwsctrerr:RmrtqXoYYGpW3Dg2@aws-0-us-west-2.pooler.supabase.com:6543/postgres";
const client = new pg.Client({ connectionString });

async function check() {
    await client.connect();
    console.log("=== DB QUERY ===");
    const res = await client.query("SELECT id, nome, avatar, invite_token, created_at, clan_id FROM profiles WHERE role='child' ORDER BY created_at DESC");
    console.log(res.rows);
    await client.end();

    console.log("=== SUPABASE RPC ===");
    for (const r of res.rows) {
        const rpcRes = await sb.rpc('get_hero_by_invite', { token: r.invite_token });
        console.log(`RPC for ${r.invite_token}:`, rpcRes.data);
    }
}

check().catch(console.error);
