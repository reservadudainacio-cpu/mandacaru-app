CREATE TABLE IF NOT EXISTS categorias_movimentacao_caixa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE categorias_movimentacao_caixa ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_categorias_movimentacao_caixa_select" ON categorias_movimentacao_caixa;
CREATE POLICY "anon_categorias_movimentacao_caixa_select" ON categorias_movimentacao_caixa FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_categorias_movimentacao_caixa_insert" ON categorias_movimentacao_caixa;
CREATE POLICY "anon_categorias_movimentacao_caixa_insert" ON categorias_movimentacao_caixa FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_categorias_movimentacao_caixa_update" ON categorias_movimentacao_caixa;
CREATE POLICY "anon_categorias_movimentacao_caixa_update" ON categorias_movimentacao_caixa FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

INSERT INTO categorias_movimentacao_caixa (nome, tipo) VALUES
  ('Aporte no caixa', 'entrada'),
  ('Dinheiro inicial', 'entrada'),
  ('Venda manual', 'entrada'),
  ('Recebimento externo', 'entrada'),
  ('Correção de caixa', 'entrada'),
  ('Outros', 'entrada'),
  ('Ingredientes', 'saida'),
  ('Motoboy', 'saida'),
  ('Energia', 'saida'),
  ('Água', 'saida'),
  ('Gás', 'saida'),
  ('Aluguel', 'saida'),
  ('Manutenção', 'saida'),
  ('Embalagens', 'saida'),
  ('Salário', 'saida'),
  ('Impostos', 'saida'),
  ('Divulgação', 'saida'),
  ('Outros', 'saida')
ON CONFLICT DO NOTHING;
