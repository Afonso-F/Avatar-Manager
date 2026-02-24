-- ============================================================
-- AvatarStudio — Bucket de imagens para posts
-- ============================================================

-- Criar bucket público para imagens dos posts
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'post-images',
  'post-images',
  true,
  10485760,   -- 10 MB
  array['image/jpeg','image/png','image/webp','image/gif']
)
on conflict (id) do nothing;

-- Qualquer pessoa pode ler imagens (bucket é público)
create policy "Public read post-images" on storage.objects
  for select using (bucket_id = 'post-images');

-- Só utilizadores autenticados podem fazer upload
create policy "Auth upload post-images" on storage.objects
  for insert with check (
    bucket_id = 'post-images'
    and auth.role() = 'authenticated'
  );

-- Só utilizadores autenticados podem apagar as suas imagens
create policy "Auth delete post-images" on storage.objects
  for delete using (
    bucket_id = 'post-images'
    and auth.role() = 'authenticated'
  );
