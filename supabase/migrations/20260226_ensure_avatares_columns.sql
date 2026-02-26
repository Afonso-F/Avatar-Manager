-- ============================================================
-- Garantir que todas as colunas da tabela avatares existem
-- Seguro de correr mesmo que as colunas já existam
-- ============================================================

ALTER TABLE avatares
  ADD COLUMN IF NOT EXISTS profile_url        text,
  ADD COLUMN IF NOT EXISTS categorias         text[]  DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS imagens_referencia text[]  DEFAULT '{}';
