-- ============================================================
-- Metadados de vídeos curtos nos posts
-- Campos específicos para Reels, TikToks e YouTube Shorts
-- ============================================================

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS formato_video text
    CHECK (formato_video IN ('9:16', '16:9', '1:1')),
  ADD COLUMN IF NOT EXISTS modelo_video  text,
  ADD COLUMN IF NOT EXISTS hook          text;

COMMENT ON COLUMN posts.formato_video IS 'Rácio de aspecto do vídeo: 9:16 (vertical), 16:9 (horizontal), 1:1 (quadrado)';
COMMENT ON COLUMN posts.modelo_video  IS 'Modelo de IA usado para gerar o vídeo (ex: fal-ai/wan/v2.1/t2v-480p)';
COMMENT ON COLUMN posts.hook          IS 'Gancho de abertura do vídeo (primeiras palavras faladas)';
