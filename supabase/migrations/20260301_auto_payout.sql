-- ============================================================
-- Auto Payout — Levantamentos automáticos diários via Stripe
-- ============================================================
-- Adiciona flags para activar payout diário automático por
-- conta bancária, e rastrear levantamentos criados pelo job.

-- Flag por conta bancária: activar payout automático diário
ALTER TABLE contas_bancarias
  ADD COLUMN IF NOT EXISTS auto_daily_payout boolean NOT NULL DEFAULT false;

-- Flag para distinguir levantamentos automáticos dos manuais
ALTER TABLE levantamentos
  ADD COLUMN IF NOT EXISTS auto_created boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN contas_bancarias.auto_daily_payout IS
  'Quando true, o job diário cria automaticamente um payout do saldo Stripe disponível para esta conta.';

COMMENT ON COLUMN levantamentos.auto_created IS
  'Quando true, este levantamento foi criado automaticamente pelo job diário (não pelo utilizador).';

-- Índice para o job diário encontrar rapidamente as contas activas
CREATE INDEX IF NOT EXISTS idx_contas_bancarias_auto_payout
  ON contas_bancarias(auto_daily_payout)
  WHERE auto_daily_payout = true;
