-- ============================================================
-- Biblioteca de prompts e imagens categorizados
-- ============================================================

CREATE TABLE IF NOT EXISTS prompt_library (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo        text NOT NULL DEFAULT 'imagem' CHECK (tipo IN ('imagem', 'video')),
  titulo      text NOT NULL,
  prompt      text NOT NULL,
  categoria   text DEFAULT 'geral',
  tags        text[] DEFAULT '{}',
  imagem_url  text,                   -- URL pública de exemplo (Supabase Storage)
  avatar_id   uuid REFERENCES avatares(id) ON DELETE SET NULL,
  vezes_usado integer DEFAULT 0,
  criado_em   timestamptz DEFAULT now()
);

ALTER TABLE prompt_library ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth only" ON prompt_library FOR ALL USING (auth.role() = 'authenticated');

-- Índices
CREATE INDEX IF NOT EXISTS prompt_library_tipo_idx      ON prompt_library(tipo);
CREATE INDEX IF NOT EXISTS prompt_library_categoria_idx ON prompt_library(categoria);
CREATE INDEX IF NOT EXISTS prompt_library_uso_idx       ON prompt_library(vezes_usado DESC);

-- Função para incrementar uso de forma atómica
CREATE OR REPLACE FUNCTION increment_prompt_usage(prompt_id uuid)
RETURNS void LANGUAGE sql AS $$
  UPDATE prompt_library SET vezes_usado = vezes_usado + 1 WHERE id = prompt_id;
$$;
