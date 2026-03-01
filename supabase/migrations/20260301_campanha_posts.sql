-- ============================================================
-- Liga posts a campanhas para planeamento semanal com IA
-- ============================================================

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS campanha_id uuid REFERENCES campanhas(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_posts_campanha
  ON posts(campanha_id) WHERE campanha_id IS NOT NULL;

COMMENT ON COLUMN posts.campanha_id IS
  'Campanha à qual este post pertence (preenchido pelo gerador de campanhas com IA).';
