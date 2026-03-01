-- ============================================================
-- Fix: Storage policies para avatar-references
-- Problema: faltava política UPDATE; erros silenciosos nos uploads
-- ============================================================

-- Garantir que o bucket existe
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatar-references',
  'avatar-references',
  true,
  10485760,
  ARRAY['image/jpeg','image/jpg','image/png','image/webp','image/gif']
) ON CONFLICT (id) DO NOTHING;

-- Remover políticas antigas para recriar corretamente
DROP POLICY IF EXISTS "Public read avatar-references"  ON storage.objects;
DROP POLICY IF EXISTS "Auth upload avatar-references"  ON storage.objects;
DROP POLICY IF EXISTS "Auth delete avatar-references"  ON storage.objects;
DROP POLICY IF EXISTS "Auth update avatar-references"  ON storage.objects;

-- Leitura pública
CREATE POLICY "Public read avatar-references"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'avatar-references');

-- Upload (INSERT) para autenticados
CREATE POLICY "Auth upload avatar-references"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatar-references');

-- Update (substituição) para autenticados — política que faltava
CREATE POLICY "Auth update avatar-references"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatar-references')
  WITH CHECK (bucket_id = 'avatar-references');

-- Delete para autenticados
CREATE POLICY "Auth delete avatar-references"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatar-references');
