import pg from 'pg';

const connectionString = "postgresql://postgres.cgmpjzwtolnrwsctrerr:RmrtqXoYYGpW3Dg2@aws-0-us-west-2.pooler.supabase.com:6543/postgres";

const sql = `
-- Drop previous versions to avoid signature conflicts if not completely replaced
DROP FUNCTION IF EXISTS public.get_hero_by_invite(UUID);
DROP FUNCTION IF EXISTS public.get_hero_by_invite(TEXT);

CREATE OR REPLACE FUNCTION public.get_hero_by_invite(token TEXT)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  -- Se o token for vazio ou inválido, retorna null antes da query principal
  IF token IS NULL OR token = '' THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object(
    'id', p.id,
    'nome', p.nome,
    'avatar', p.avatar,
    'nivel', p.nivel,
    'xp', p.xp,
    'pin_hash', p.pin_hash,
    'invite_token', p.invite_token,
    'role', p.role
  ) INTO result
  FROM public.profiles p
  WHERE p.invite_token = token
  LIMIT 1;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Garante que o usuário anônimo e o autenticado têm acesso a invocar a função
GRANT EXECUTE ON FUNCTION public.get_hero_by_invite(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_hero_by_invite(TEXT) TO authenticated;
`;

async function migrate() {
    console.log('Atualizando função get_hero_by_invite com TEXT...');
    const client = new pg.Client({ connectionString });
    try {
        await client.connect();
        await client.query(sql);
        console.log('✅ Função get_hero_by_invite (token TEXT) criada com sucesso!');
    } catch (err) {
        console.error('❌ ERRO:', err.message);
    } finally {
        await client.end();
    }
}

migrate();
