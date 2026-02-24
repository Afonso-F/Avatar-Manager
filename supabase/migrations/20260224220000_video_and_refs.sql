-- ============================================================
-- Migração: imagens de referência nos avatares
--           e suporte a vídeo nos posts
-- ============================================================

-- Imagens de referência para o avatar (URLs de ficheiros no Storage)
ALTER TABLE avatares
  ADD COLUMN IF NOT EXISTS imagens_referencia text[] DEFAULT '{}';

-- Suporte a vídeo nos posts
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS video_url text;

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS tipo_conteudo text DEFAULT 'imagem'
    CHECK (tipo_conteudo IN ('imagem', 'video'));

-- ── Bucket: imagens de referência dos avatares ──────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatar-references',
  'avatar-references',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO NOTHING;

CREATE POLICY IF NOT EXISTS "Public read avatar-references"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'avatar-references');

CREATE POLICY IF NOT EXISTS "Auth upload avatar-references"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatar-references');

CREATE POLICY IF NOT EXISTS "Auth delete avatar-references"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatar-references');

-- ── Bucket: vídeos dos posts ─────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'post-videos',
  'post-videos',
  true,
  104857600,
  ARRAY['video/mp4', 'video/webm', 'video/quicktime']
) ON CONFLICT (id) DO NOTHING;

CREATE POLICY IF NOT EXISTS "Public read post-videos"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'post-videos');

CREATE POLICY IF NOT EXISTS "Auth upload post-videos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'post-videos');

CREATE POLICY IF NOT EXISTS "Auth delete post-videos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'post-videos');
