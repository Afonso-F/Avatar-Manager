-- ============================================================
-- Canais de vídeo: imagens de referência (banners, thumbnails)
-- ============================================================

ALTER TABLE youtube_channels
  ADD COLUMN IF NOT EXISTS imagens_referencia text[] DEFAULT '{}';
