import pg from 'pg';

const connectionString = "postgresql://postgres.cgmpjzwtolnrwsctrerr:RmrtqXoYYGpW3Dg2@aws-0-us-west-2.pooler.supabase.com:6543/postgres";
const client = new pg.Client({ connectionString });

const sql = `
-- 1. Tabela de links de convite temporários
CREATE TABLE IF NOT EXISTS public.hero_invite_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hero_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '48 hours'),
    used_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índice para busca rápida por token
CREATE INDEX IF NOT EXISTS idx_hero_invite_links_token ON public.hero_invite_links(token);

-- RLS: Mestres autenticados leem os links do próprio clã
ALTER TABLE public.hero_invite_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "parent_manage_invite_links" ON public.hero_invite_links;
CREATE POLICY "parent_manage_invite_links" ON public.hero_invite_links
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.clan_id = (
                SELECT p2.clan_id FROM public.profiles p2 WHERE p2.id = hero_id
            )
            AND p.role = 'parent'
        )
    );

-- 2. RPC: Mestre gera um novo link temporário para um herói
DROP FUNCTION IF EXISTS public.generate_hero_invite(UUID);
CREATE OR REPLACE FUNCTION public.generate_hero_invite(p_hero_id UUID)
RETURNS TEXT AS $$
DECLARE
    new_token UUID;
BEGIN
    -- Verifica que o chamador é mestre do mesmo clã do herói
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles caller
        JOIN public.profiles hero ON hero.id = p_hero_id
        WHERE caller.id = auth.uid()
        AND caller.clan_id = hero.clan_id
        AND caller.role = 'parent'
    ) THEN
        RAISE EXCEPTION 'Não autorizado';
    END IF;

    -- Invalida links anteriores não utilizados do mesmo herói
    UPDATE public.hero_invite_links
    SET used_at = now()
    WHERE hero_id = p_hero_id AND used_at IS NULL;

    -- Cria novo token
    INSERT INTO public.hero_invite_links (hero_id)
    VALUES (p_hero_id)
    RETURNING token INTO new_token;

    RETURN new_token::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.generate_hero_invite(UUID) TO authenticated;

-- 3. RPC: Valida token temporário e retorna dados do herói (anon pode chamar)
DROP FUNCTION IF EXISTS public.claim_hero_invite(TEXT);
CREATE OR REPLACE FUNCTION public.claim_hero_invite(p_token TEXT)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'id', p.id,
        'nome', p.nome,
        'avatar', p.avatar,
        'nivel', p.nivel,
        'xp', p.xp,
        'invite_token', p.invite_token,
        'pin_set', (p.pin_hash IS NOT NULL AND p.pin_hash != ''),
        'link_id', hil.id
    ) INTO result
    FROM public.hero_invite_links hil
    JOIN public.profiles p ON p.id = hil.hero_id
    WHERE hil.token::TEXT = p_token
      AND hil.used_at IS NULL
      AND hil.expires_at > now()
    LIMIT 1;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.claim_hero_invite(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.claim_hero_invite(TEXT) TO authenticated;

-- 4. RPC: Filho define seu PIN e marca link como usado
DROP FUNCTION IF EXISTS public.set_hero_pin(TEXT, TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.set_hero_pin(p_token TEXT, p_link_id TEXT, p_pin_hash TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_hero_id UUID;
BEGIN
    -- Valida que o token ainda é válido e não foi usado
    SELECT hil.hero_id INTO v_hero_id
    FROM public.hero_invite_links hil
    WHERE hil.token::TEXT = p_token
      AND hil.id::TEXT = p_link_id
      AND hil.used_at IS NULL
      AND hil.expires_at > now();

    IF v_hero_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Salva o PIN hash no perfil
    UPDATE public.profiles
    SET pin_hash = p_pin_hash
    WHERE id = v_hero_id;

    -- Marca o link como usado
    UPDATE public.hero_invite_links
    SET used_at = now()
    WHERE token::TEXT = p_token AND id::TEXT = p_link_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.set_hero_pin(TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.set_hero_pin(TEXT, TEXT, TEXT) TO authenticated;
`;

async function migrate() {
    console.log('🚀 Aplicando migração: sistema de convite seguro...');
    await client.connect();
    try {
        await client.query(sql);
        console.log('✅ Migração aplicada com sucesso!');
    } catch (err) {
        console.error('❌ ERRO:', err.message);
    } finally {
        await client.end();
    }
}

migrate();
