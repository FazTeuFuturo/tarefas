import pg from 'pg';

const connectionString = "postgresql://postgres.cgmpjzwtolnrwsctrerr:RmrtqXoYYGpW3Dg2@aws-0-us-west-2.pooler.supabase.com:6543/postgres";
const client = new pg.Client({ connectionString });

async function fixTrigger() {
    await client.connect();
    try {
        console.log('Atualizando a trigger handle_new_user...');
        const sql = `
        CREATE OR REPLACE FUNCTION public.handle_new_user()
        RETURNS trigger
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = public
        AS $$
        DECLARE
            target_clan_id UUID;
        BEGIN
            -- Se houver um clan_id no metadata (convite de clã), usar. Senão criar novo
            IF NEW.raw_user_meta_data->>'clan_id' IS NOT NULL THEN
                target_clan_id := (NEW.raw_user_meta_data->>'clan_id')::UUID;
            ELSE
                target_clan_id := NEW.id;
            END IF;

            INSERT INTO public.profiles (
                id, email, nome, avatar, clan_id, role
            ) VALUES (
                NEW.id,
                NEW.email,
                COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
                COALESCE(NEW.raw_user_meta_data->>'avatar', 'https://api.dicebear.com/7.x/avataaars/svg?seed=' || NEW.id),
                target_clan_id,
                COALESCE(NEW.raw_user_meta_data->>'role', 'parent')::user_role
            )
            ON CONFLICT (id) DO UPDATE SET
                email = EXCLUDED.email; -- Atualiza email, preserva o restante do perfil do herói
                
            RETURN NEW;
        END;
        $$;
        `;
        await client.query(sql);
        console.log('✅ Trigger handle_new_user atualizada!');
    } catch (err) {
        console.error('ERRO:', err.message);
    } finally {
        await client.end();
    }
}

fixTrigger();
