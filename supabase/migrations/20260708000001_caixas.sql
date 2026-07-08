-- Create caixas table
CREATE TABLE IF NOT EXISTS caixas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aberto_em timestamptz NOT NULL DEFAULT now(),
  fechado_em timestamptz,
  saldo_inicial numeric(10,2) NOT NULL DEFAULT 0,
  saldo_final numeric(10,2),
  observacao text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE caixas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "caixas_all_authenticated" ON caixas;
CREATE POLICY "caixas_all_authenticated" ON caixas FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Add caixa_id to movimentacoes_caixa
ALTER TABLE movimentacoes_caixa ADD COLUMN IF NOT EXISTS caixa_id uuid REFERENCES caixas(id) ON DELETE SET NULL;

-- Update CHECK constraint for tipo to include new types
ALTER TABLE movimentacoes_caixa DROP CONSTRAINT IF EXISTS movimentacoes_caixa_tipo_check;
ALTER TABLE movimentacoes_caixa ADD CONSTRAINT movimentacoes_caixa_tipo_check
  CHECK (tipo IN ('entrada', 'saida', 'sangria', 'suprimento', 'venda', 'ajuste'));

-- Index for fast caixa lookups
CREATE INDEX IF NOT EXISTS idx_movimentacoes_caixa_caixa_id ON movimentacoes_caixa(caixa_id);
CREATE INDEX IF NOT EXISTS idx_caixas_aberto ON caixas(aberto_em) WHERE fechado_em IS NULL;
