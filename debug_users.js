import pg from 'pg';

const connectionString = "postgresql://postgres.cgmpjzwtolnrwsctrerr:RmrtqXoYYGpW3Dg2@aws-0-us-west-2.pooler.supabase.com:6543/postgres";

async function checkUsers() {
    const client = new pg.Client({ connectionString });
    try {
        await client.connect();
        const res = await client.query('SELECT id, email, confirmed_at FROM auth.users');
        if (res.rows.length === 0) {
            console.log('--- DIAGNÓSTICO: NENHUM USUÁRIO ENCONTRADO NO BANCO ---');
        } else {
            console.log(`--- DIAGNÓSTICO: ENCONTRADOS ${res.rows.length} USUÁRIOS ---`);
            res.rows.forEach(u => {
                console.log(`Email: ${u.email} | Confirmado em: ${u.confirmed_at || 'PENDENTE'}`);
            });
        }
    } catch (err) {
        console.error('ERRO AO CHECAR USUÁRIOS:', err.message);
    } finally {
        await client.end();
    }
}

checkUsers();
