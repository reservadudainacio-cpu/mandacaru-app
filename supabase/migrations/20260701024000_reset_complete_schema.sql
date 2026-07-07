/*
# RESET COMPLETO - Mandacaru Esfihas e Jantinha
# Cria todas as tabelas do zero
# Funciona em banco vazio (novo projeto) ou com dados existentes
*/

-- ============================================================
-- 1. DROPAR TUDO (seguro: IF EXISTS + CASCADE)
-- ============================================================
DROP TABLE IF EXISTS movimentacoes_estoque CASCADE;
DROP TABLE IF EXISTS itens_pedido CASCADE;
DROP TABLE IF EXISTS pedidos CASCADE;
DROP TABLE IF EXISTS produtos CASCADE;
DROP TABLE IF EXISTS categorias CASCADE;
DROP TABLE IF EXISTS sessoes_cardapio CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP FUNCTION IF EXISTS decrementar_estoque(uuid, numeric);

-- ============================================================
-- 2. CATEGORIAS
-- ============================================================
CREATE TABLE categorias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  ordem integer DEFAULT 0,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- 3. PRODUTOS
-- ============================================================
CREATE TABLE produtos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria_id uuid REFERENCES categorias(id) ON DELETE SET NULL,
  nome text NOT NULL,
  descricao text,
  preco numeric(10,2) NOT NULL,
  custo numeric(10,2) DEFAULT 0,
  estoque_atual numeric(10,2) DEFAULT 0,
  unidade text DEFAULT 'un',
  ativo boolean DEFAULT true,
  imagem text,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- 4. PEDIDOS
-- ============================================================
CREATE TABLE pedidos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL CHECK (tipo IN ('atendimento', 'delivery', 'online')),
  status text NOT NULL DEFAULT 'novo' CHECK (status IN ('novo', 'aberto', 'em_preparo', 'pronto', 'entregue', 'cancelado')),
  mesa integer,
  nome_cliente text,
  telefone text,
  endereco text,
  tipo_entrega text DEFAULT 'retirada' CHECK (tipo_entrega IN ('retirada', 'delivery')),
  forma_pagamento text DEFAULT 'nao_informado' CHECK (forma_pagamento IN ('dinheiro', 'pix', 'cartao', 'nao_informado')),
  observacoes text,
  taxa_entrega numeric(10,2) DEFAULT 0,
  desconto numeric(10,2) DEFAULT 0,
  total numeric(10,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  fechado_at timestamptz
);

-- ============================================================
-- 5. ITENS DO PEDIDO
-- ============================================================
CREATE TABLE itens_pedido (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id uuid NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  produto_id uuid REFERENCES produtos(id) ON DELETE SET NULL,
  product_name text,
  quantidade numeric(10,2) NOT NULL,
  preco_unitario numeric(10,2) NOT NULL,
  subtotal numeric(10,2),
  observacao text,
  product_image_url text,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- 6. MOVIMENTAÇÕES DE ESTOQUE
-- ============================================================
CREATE TABLE movimentacoes_estoque (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id uuid NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  quantidade numeric(10,2) NOT NULL,
  motivo text,
  pedido_id uuid REFERENCES pedidos(id) ON DELETE SET NULL,
  valor_unitario numeric(10,2),
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- 7. TRIGGER PARA UPDATED_AT
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_pedidos_updated_at
  BEFORE UPDATE ON pedidos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 8. ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE itens_pedido ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimentacoes_estoque ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY['categorias', 'produtos', 'pedidos', 'itens_pedido', 'movimentacoes_estoque'])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "anon_%1$s_select" ON %1$s', tbl);
    EXECUTE format('CREATE POLICY "anon_%1$s_select" ON %1$s FOR SELECT TO anon, authenticated USING (true)', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "anon_%1$s_insert" ON %1$s', tbl);
    EXECUTE format('CREATE POLICY "anon_%1$s_insert" ON %1$s FOR INSERT TO anon, authenticated WITH CHECK (true)', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "anon_%1$s_update" ON %1$s', tbl);
    EXECUTE format('CREATE POLICY "anon_%1$s_update" ON %1$s FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true)', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "anon_%1$s_delete" ON %1$s', tbl);
    EXECUTE format('CREATE POLICY "anon_%1$s_delete" ON %1$s FOR DELETE TO anon, authenticated USING (true)', tbl);
  END LOOP;
END;
$$;

-- ============================================================
-- 9. ÍNDICES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_produtos_categoria ON produtos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_status ON pedidos(status);
CREATE INDEX IF NOT EXISTS idx_pedidos_tipo ON pedidos(tipo);
CREATE INDEX IF NOT EXISTS idx_pedidos_created_at ON pedidos(created_at);
CREATE INDEX IF NOT EXISTS idx_pedidos_status_tipo ON pedidos(status, tipo);
CREATE INDEX IF NOT EXISTS idx_itens_pedido_pedido ON itens_pedido(pedido_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_produto ON movimentacoes_estoque(produto_id);

-- ============================================================
-- 10. CATEGORIAS PADRÃO
-- ============================================================
INSERT INTO categorias (nome, descricao, ordem) VALUES
('Esfiha Tradicional', 'Esfihas clássicas de carne e queijo', 1),
('Esfihas Doce', 'Esfihas doces variadas', 2),
('Esfihas Especiais', 'Esfihas com ingredientes especiais', 3),
('Bebidas', 'Refrigerantes, sucos e drinks', 4),
('Espetos', 'Espetos simples e completos', 5);

-- ============================================================
-- 11. PRODUTOS PADRÃO
-- ============================================================
INSERT INTO produtos (nome, descricao, preco, custo, categoria_id, estoque_atual, unidade, ativo)
SELECT 'Esfiha de Carne', 'Esfiha tradicional de carne moída temperada', 5.00, 1.80, id, 100, 'un', true FROM categorias WHERE nome = 'Esfiha Tradicional'
UNION ALL
SELECT 'Esfiha de Queijo', 'Esfiha recheada com queijo mussarela', 5.00, 1.50, id, 100, 'un', true FROM categorias WHERE nome = 'Esfiha Tradicional'
UNION ALL
SELECT 'Esfiha Mista', 'Carne e queijo juntos', 6.00, 2.20, id, 80, 'un', true FROM categorias WHERE nome = 'Esfiha Tradicional'
UNION ALL
SELECT 'Esfiha de Frango', 'Frango desfiado temperado', 5.50, 1.90, id, 80, 'un', true FROM categorias WHERE nome = 'Esfiha Tradicional'
UNION ALL
SELECT 'Esfiha de Chocolate', 'Recheio cremoso de chocolate', 6.00, 2.00, id, 60, 'un', true FROM categorias WHERE nome = 'Esfihas Doce'
UNION ALL
SELECT 'Esfiha de Goiabada', 'Goiabada com queijo (Romeu e Julieta)', 6.00, 2.10, id, 50, 'un', true FROM categorias WHERE nome = 'Esfihas Doce'
UNION ALL
SELECT 'Esfiha de Leite Ninho', 'Creme de leite ninho com leite condensado', 7.00, 2.50, id, 40, 'un', true FROM categorias WHERE nome = 'Esfihas Doce'
UNION ALL
SELECT 'Esfiha de Banana', 'Banana com canela e açúcar', 5.50, 1.80, id, 40, 'un', true FROM categorias WHERE nome = 'Esfihas Doce'
UNION ALL
SELECT 'Esfiha de Carne com Queijo', 'Carne especial com queijo gratinado', 7.00, 2.80, id, 60, 'un', true FROM categorias WHERE nome = 'Esfihas Especiais'
UNION ALL
SELECT 'Esfiha de Calabresa', 'Calabresa com cebola e queijo', 7.50, 2.50, id, 50, 'un', true FROM categorias WHERE nome = 'Esfihas Especiais'
UNION ALL
SELECT 'Esfiha de Bacon', 'Bacon crocante com queijo', 8.00, 3.00, id, 40, 'un', true FROM categorias WHERE nome = 'Esfihas Especiais'
UNION ALL
SELECT 'Esfiha de Palmito', 'Palmito com molho especial', 8.50, 3.20, id, 30, 'un', true FROM categorias WHERE nome = 'Esfihas Especiais'
UNION ALL
SELECT 'Esfiha Portuguesa', 'Presunto, queijo, ovo e ervilha', 9.00, 3.50, id, 30, 'un', true FROM categorias WHERE nome = 'Esfihas Especiais'
UNION ALL
SELECT 'Refrigerante Lata', 'Coca, Guaraná ou Fanta 350ml', 5.00, 2.00, id, 100, 'un', true FROM categorias WHERE nome = 'Bebidas'
UNION ALL
SELECT 'Refrigerante 600ml', 'Coca, Guaraná ou Fanta', 7.00, 3.00, id, 80, 'un', true FROM categorias WHERE nome = 'Bebidas'
UNION ALL
SELECT 'Refrigerante 2L', 'Coca, Guaraná ou Fanta', 10.00, 5.00, id, 50, 'un', true FROM categorias WHERE nome = 'Bebidas'
UNION ALL
SELECT 'Suco Natural', 'Laranja, Limão ou Maracujá 400ml', 7.00, 2.50, id, 60, 'un', true FROM categorias WHERE nome = 'Bebidas'
UNION ALL
SELECT 'Água Mineral', 'Água mineral 500ml', 3.00, 1.00, id, 100, 'un', true FROM categorias WHERE nome = 'Bebidas'
UNION ALL
SELECT 'Espeto Simples - Carne', 'Espeto de carne bovina', 12.00, 5.00, id, 40, 'un', true FROM categorias WHERE nome = 'Espetos'
UNION ALL
SELECT 'Espeto Simples - Frango', 'Espeto de frango', 10.00, 4.00, id, 40, 'un', true FROM categorias WHERE nome = 'Espetos'
UNION ALL
SELECT 'Espeto Simples - Linguiça', 'Espeto de linguiça calabresa', 11.00, 4.50, id, 40, 'un', true FROM categorias WHERE nome = 'Espetos'
UNION ALL
SELECT 'Espeto Completo - Carne', 'Carne, queijo, bacon e farofa', 18.00, 7.00, id, 30, 'un', true FROM categorias WHERE nome = 'Espetos'
UNION ALL
SELECT 'Espeto Completo - Frango', 'Frango, queijo, bacon e farofa', 16.00, 6.00, id, 30, 'un', true FROM categorias WHERE nome = 'Espetos'
UNION ALL
SELECT 'Espeto Completo Misto', 'Carne, frango, queijo, bacon e farofa', 22.00, 9.00, id, 20, 'un', true FROM categorias WHERE nome = 'Espetos';

-- ============================================================
-- 12. FUNÇÃO PARA DECREMENTAR ESTOQUE (usada pela Edge Function)
-- ============================================================
CREATE OR REPLACE FUNCTION decrementar_estoque(p_produto_id uuid, p_quantidade numeric)
RETURNS void AS $$
BEGIN
  UPDATE produtos SET estoque_atual = estoque_atual - p_quantidade WHERE id = p_produto_id;
END;
$$ LANGUAGE plpgsql;
