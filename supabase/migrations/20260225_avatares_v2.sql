-- ============================================================
-- Avatares v2: profile_url, categorias, plataformas alargadas
-- ============================================================

-- URL do perfil público do avatar (link para Fansly, OnlyFans, etc.)
ALTER TABLE avatares ADD COLUMN IF NOT EXISTS profile_url text;

-- Categorias/tags (anime, cosplay, NSFW, SFW, realista, etc.)
ALTER TABLE avatares ADD COLUMN IF NOT EXISTS categorias text[] DEFAULT '{}';

-- Alargar constraint da tabela contas para incluir novas plataformas
ALTER TABLE contas DROP CONSTRAINT IF EXISTS contas_plataforma_check;
ALTER TABLE contas ADD CONSTRAINT contas_plataforma_check
  CHECK (plataforma IN (
    'instagram','tiktok','facebook','youtube',
    'fansly','onlyfans','patreon','twitch','spotify'
  ));
