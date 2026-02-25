-- ============================================================
-- New features: expense tracking, post templates
-- ============================================================

-- Expense tracking
CREATE TABLE IF NOT EXISTS despesas (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  descricao   text NOT NULL,
  valor       numeric(10,2) NOT NULL DEFAULT 0,
  categoria   text DEFAULT 'outro',  -- producao | ads | software | equipamento | outro
  data        date NOT NULL DEFAULT CURRENT_DATE,
  notas       text,
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE despesas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth only" ON despesas FOR ALL USING (auth.role() = 'authenticated');

-- Post templates
CREATE TABLE IF NOT EXISTS post_templates (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nome        text NOT NULL,
  legenda     text,
  hashtags    text,
  plataformas text[] DEFAULT '{}',
  avatar_id   uuid REFERENCES avatares(id) ON DELETE SET NULL,
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE post_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth only" ON post_templates FOR ALL USING (auth.role() = 'authenticated');
