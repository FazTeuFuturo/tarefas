import pg from 'pg';

const connectionString = "postgresql://postgres.cgmpjzwtolnrwsctrerr:RmrtqXoYYGpW3Dg2@aws-0-us-west-2.pooler.supabase.com:6543/postgres";
const client = new pg.Client({ connectionString });

async function cleanup() {
    await client.connect();
    try {
        console.log('Buscando perfis duplicados ("Teo")...');

        // Find auth.users where email is hero_... but their id doesn't match the hex in the email
        const { rows: dupes } = await client.query(`
            SELECT u.id, u.email, p.nome, p.role
            FROM auth.users u
            JOIN public.profiles p ON p.id = u.id
            WHERE u.email LIKE 'hero_%@noreply.familyquest.app'
              AND replace(u.id::text, '-', '') != substring(u.email from 6 for 32);
        `);

        if (dupes.length === 0) {
            console.log('Nenhum duplicado encontrado.');
        } else {
            console.log('Encontrados duplicados:', dupes);
            for (const d of dupes) {
                console.log('Deletando auth user duplicado: ' + d.nome + ' (' + d.id + ')');
                await client.query('DELETE FROM auth.users WHERE id = $1', [d.id]);
            }
            console.log('Deleção concluída! O trigger CASCADE removeu do public.profiles também.');
        }

        // Also let's find the original Teo to show what's there
        const { rows: originals } = await client.query(`
            SELECT id, nome, role
            FROM public.profiles
            WHERE id NOT IN (SELECT id FROM auth.users)
              AND role = 'child';
        `);
        console.log('Heróis originais no banco (sem conta auth):');
        console.table(originals);

    } catch (err) {
        console.error('ERRO:', err.message);
    } finally {
        await client.end();
    }
}

cleanup();
