-- ============================================================
-- Adicionar avatar_id à tabela youtube_channels
-- Permite associar um canal a um avatar específico
-- ============================================================

ALTER TABLE youtube_channels
  ADD COLUMN IF NOT EXISTS avatar_id UUID REFERENCES avatares(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS youtube_channels_avatar_idx ON youtube_channels(avatar_id);
