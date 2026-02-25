-- ============================================================
-- Adicionar campos de controlo de publicação automática
-- ============================================================

-- error_msg: mensagem de erro quando a publicação falha
ALTER TABLE posts ADD COLUMN IF NOT EXISTS error_msg text;

-- publicado_em: timestamp de quando o post foi publicado (na tabela posts)
-- Nota: a tabela publicados já tem publicado_em por registo individual de plataforma
ALTER TABLE posts ADD COLUMN IF NOT EXISTS publicado_em timestamptz;

-- Índice para posts com erro (útil para mostrar na fila)
CREATE INDEX IF NOT EXISTS posts_error_idx ON posts(status) WHERE status = 'erro';
