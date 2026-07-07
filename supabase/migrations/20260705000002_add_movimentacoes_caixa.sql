CREATE TABLE IF NOT EXISTS movimentacoes_caixa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  valor numeric(10,2) NOT NULL CHECK (valor > 0),
  descricao text NOT NULL,
  categoria text,
  forma_pagamento text DEFAULT 'nao_informado',
  observacao text,
  data_movimentacao date NOT NULL DEFAULT CURRENT_DATE,
  pedido_id uuid REFERENCES pedidos(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE movimentacoes_caixa ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_movimentacoes_caixa_select" ON movimentacoes_caixa;
CREATE POLICY "anon_movimentacoes_caixa_select" ON movimentacoes_caixa FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_movimentacoes_caixa_insert" ON movimentacoes_caixa;
CREATE POLICY "anon_movimentacoes_caixa_insert" ON movimentacoes_caixa FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_movimentacoes_caixa_update" ON movimentacoes_caixa;
CREATE POLICY "anon_movimentacoes_caixa_update" ON movimentacoes_caixa FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_movimentacoes_caixa_delete" ON movimentacoes_caixa;
CREATE POLICY "anon_movimentacoes_caixa_delete" ON movimentacoes_caixa FOR DELETE TO anon, authenticated USING (true);

ALTER TABLE financeiro_resumos ADD COLUMN IF NOT EXISTS total_entradas numeric(10,2) DEFAULT 0;
ALTER TABLE financeiro_resumos ADD COLUMN IF NOT EXISTS total_saidas numeric(10,2) DEFAULT 0;
ALTER TABLE financeiro_resumos ADD COLUMN IF NOT EXISTS saldo_caixa numeric(10,2) DEFAULT 0;
ALTER TABLE financeiro_resumos ADD COLUMN IF NOT EXISTS lucro_bruto numeric(10,2) DEFAULT 0;
ALTER TABLE financeiro_resumos ADD COLUMN IF NOT EXISTS lucro_liquido numeric(10,2) DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_movimentacoes_caixa_data ON movimentacoes_caixa(data_movimentacao);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_caixa_tipo ON movimentacoes_caixa(tipo);
