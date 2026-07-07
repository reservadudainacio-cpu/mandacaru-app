CREATE TABLE IF NOT EXISTS financeiro_resumos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  periodo_inicio date NOT NULL,
  periodo_fim date NOT NULL,
  total_vendido numeric(10,2) DEFAULT 0,
  total_pedidos integer DEFAULT 0,
  total_finalizados integer DEFAULT 0,
  total_cancelados integer DEFAULT 0,
  ticket_medio numeric(10,2) DEFAULT 0,
  dinheiro numeric(10,2) DEFAULT 0,
  pix numeric(10,2) DEFAULT 0,
  cartao numeric(10,2) DEFAULT 0,
  nao_informado numeric(10,2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE financeiro_resumos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_financeiro_resumos_select" ON financeiro_resumos;
CREATE POLICY "anon_financeiro_resumos_select" ON financeiro_resumos FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_financeiro_resumos_insert" ON financeiro_resumos;
CREATE POLICY "anon_financeiro_resumos_insert" ON financeiro_resumos FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_financeiro_resumos_delete" ON financeiro_resumos;
CREATE POLICY "anon_financeiro_resumos_delete" ON financeiro_resumos FOR DELETE TO anon, authenticated USING (true);
