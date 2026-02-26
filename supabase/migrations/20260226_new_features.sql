-- ============================================================
-- Migração: novas features (arquivo, grupos, tags, recorrência,
--           aprovação, comentários, log de actividade, preços)
-- ============================================================

-- ── Avatares: arquivo, grupos, notas, persona ─────────────────
ALTER TABLE avatares ADD COLUMN IF NOT EXISTS arquivado       boolean DEFAULT false;
ALTER TABLE avatares ADD COLUMN IF NOT EXISTS grupo           text;
ALTER TABLE avatares ADD COLUMN IF NOT EXISTS notas           text;
ALTER TABLE avatares ADD COLUMN IF NOT EXISTS persona_ia      text;

-- ── Posts: tags, favorito, recorrência, aprovação ────────────
ALTER TABLE posts ADD COLUMN IF NOT EXISTS tags               text[];
ALTER TABLE posts ADD COLUMN IF NOT EXISTS favorito           boolean DEFAULT false;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS repetir            boolean DEFAULT false;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS repetir_frequencia text;      -- 'diario','semanal','quinzenal','mensal'
ALTER TABLE posts ADD COLUMN IF NOT EXISTS repetir_proxima    timestamptz;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS aprovacao_status   text DEFAULT 'aprovado'; -- 'pendente','aprovado','rejeitado'
ALTER TABLE posts ADD COLUMN IF NOT EXISTS aprovacao_nota     text;

-- ── Comentários em posts ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS post_comentarios (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id    uuid REFERENCES posts(id) ON DELETE CASCADE,
  texto      text NOT NULL,
  criado_em  timestamptz DEFAULT now()
);
ALTER TABLE post_comentarios ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "all_auth_post_comentarios" ON post_comentarios FOR ALL TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Log de actividade ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activity_log (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  acao       text NOT NULL,
  entidade   text,
  entidade_id text,
  detalhes   jsonb,
  criado_em  timestamptz DEFAULT now()
);
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "all_auth_activity_log" ON activity_log FOR ALL TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Tabela de preços de parceria ──────────────────────────────
CREATE TABLE IF NOT EXISTS partnership_prices (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  avatar_id  uuid REFERENCES avatares(id) ON DELETE CASCADE,
  tipo       text NOT NULL, -- 'story','post','reels','youtube','tiktok'
  preco      numeric NOT NULL DEFAULT 0,
  notas      text,
  criado_em  timestamptz DEFAULT now()
);
ALTER TABLE partnership_prices ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "all_auth_partnership_prices" ON partnership_prices FOR ALL TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Links de afiliados ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS affiliate_links (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  avatar_id   uuid REFERENCES avatares(id) ON DELETE SET NULL,
  nome        text NOT NULL,
  url_original text NOT NULL,
  url_curta    text,
  cliques      integer DEFAULT 0,
  conversoes   integer DEFAULT 0,
  comissao     numeric DEFAULT 0,
  ativo        boolean DEFAULT true,
  criado_em    timestamptz DEFAULT now()
);
ALTER TABLE affiliate_links ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "all_auth_affiliate_links" ON affiliate_links FOR ALL TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Pastas da biblioteca ──────────────────────────────────────
ALTER TABLE library_items ADD COLUMN IF NOT EXISTS pasta text DEFAULT 'Geral';

-- ── Index úteis ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_posts_tags            ON posts USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_posts_favorito        ON posts (favorito) WHERE favorito = true;
CREATE INDEX IF NOT EXISTS idx_posts_aprovacao       ON posts (aprovacao_status);
CREATE INDEX IF NOT EXISTS idx_activity_log_criado   ON activity_log (criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_avatares_grupo        ON avatares (grupo);
CREATE INDEX IF NOT EXISTS idx_avatares_arquivado    ON avatares (arquivado) WHERE arquivado = true;
