import pg from 'pg';

const connectionString = "postgresql://postgres.cgmpjzwtolnrwsctrerr:RmrtqXoYYGpW3Dg2@aws-0-us-west-2.pooler.supabase.com:6543/postgres";
const client = new pg.Client({ connectionString });

async function debug() {
    await client.connect();
    try {
        const sql = `
        CREATE OR REPLACE FUNCTION public.create_auth_user(
            p_id UUID,
            p_email TEXT,
            p_password TEXT
        ) RETURNS BOOLEAN AS $$
        BEGIN
            INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role)
            VALUES (
                p_id,
                p_email,
                crypt(p_password, gen_salt('bf')),
                now(),
                '{"provider": "email", "providers": ["email"]}',
                '{"is_hero": true}',
                now(),
                now(),
                'authenticated'
            );
            
            INSERT INTO auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
            VALUES (
                gen_random_uuid(), p_id, format('{"sub":"%s","email":"%s"}', p_id::text, p_email)::jsonb, 'email', now(), now(), now()
            );

            RETURN TRUE;
        EXCEPTION WHEN unique_violation THEN
            -- Update password if exists
            UPDATE auth.users SET encrypted_password = crypt(p_password, gen_salt('bf')) WHERE id = p_id;
            RETURN TRUE;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
        `;
        await client.query(sql);
        console.log("Function created successfully!");
    } catch (err) {
        console.error("Error:", err.message);
    } finally {
        await client.end();
    }
}
debug();
