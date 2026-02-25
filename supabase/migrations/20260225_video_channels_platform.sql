-- ============================================================
-- Adicionar coluna plataforma à tabela youtube_channels
-- Permite suportar múltiplas plataformas de vídeo
-- ============================================================

alter table youtube_channels
  add column if not exists plataforma text not null default 'youtube';
