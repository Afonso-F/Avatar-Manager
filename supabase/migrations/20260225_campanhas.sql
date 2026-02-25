-- ============================================================
-- Gestão de Campanhas Publicitárias
-- ============================================================

CREATE TABLE IF NOT EXISTS campanhas (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nome          text NOT NULL,
  descricao     text,
  objetivo      text DEFAULT 'reconhecimento'
                  CHECK (objetivo IN ('reconhecimento','trafego','leads','conversoes','engagement')),
  avatar_id     uuid REFERENCES avatares(id) ON DELETE SET NULL,
  plataformas   text[] DEFAULT '{}',
  budget_total  numeric(10,2) DEFAULT 0,
  budget_gasto  numeric(10,2) DEFAULT 0,
  data_inicio   date NOT NULL,
  data_fim      date,
  status        text DEFAULT 'planeamento'
                  CHECK (status IN ('planeamento','ativa','pausada','finalizada')),
  impressoes    integer DEFAULT 0,
  cliques       integer DEFAULT 0,
  conversoes    integer DEFAULT 0,
  notas         text,
  criado_em     timestamptz DEFAULT now(),
  atualizado_em timestamptz DEFAULT now()
);

ALTER TABLE campanhas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth only" ON campanhas FOR ALL USING (auth.role() = 'authenticated');

CREATE INDEX IF NOT EXISTS campanhas_status_idx     ON campanhas(status);
CREATE INDEX IF NOT EXISTS campanhas_avatar_idx     ON campanhas(avatar_id);
CREATE INDEX IF NOT EXISTS campanhas_inicio_idx     ON campanhas(data_inicio DESC);
