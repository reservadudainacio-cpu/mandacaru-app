/*
# Schema inicial para Mandacaru Esfihas e Jantinha

1. Novas Tabelas
- `categorias`: Categorias dos produtos (esfihas, salgados, bebidas, etc.)
- `produtos`: Produtos do cardápio com preços e estoque
- `pedidos`: Pedidos de atendimento (mesa) e delivery
- `itens_pedido`: Itens de cada pedido
- `movimentacoes_estoque`: Entradas e saídas de estoque

2. Segurança
- RLS habilitado em todas as tabelas
- Políticas permitem acesso completo (single-tenant, sem autenticação)
*/

-- Categorias
CREATE TABLE IF NOT EXISTS categorias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  ordem integer DEFAULT 0,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Produtos
CREATE TABLE IF NOT EXISTS produtos (
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

-- Pedidos
CREATE TABLE IF NOT EXISTS pedidos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL CHECK (tipo IN ('atendimento', 'delivery')),
  status text NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'em_preparo', 'pronto', 'entregue', 'cancelado')),
  mesa integer,
  nome_cliente text,
  telefone text,
  endereco text,
  observacoes text,
  taxa_entrega numeric(10,2) DEFAULT 0,
  desconto numeric(10,2) DEFAULT 0,
  total numeric(10,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  fechado_at timestamptz
);

-- Itens do Pedido
CREATE TABLE IF NOT EXISTS itens_pedido (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id uuid NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  produto_id uuid REFERENCES produtos(id) ON DELETE SET NULL,
  quantidade numeric(10,2) NOT NULL,
  preco_unitario numeric(10,2) NOT NULL,
  observacao text,
  created_at timestamptz DEFAULT now()
);

-- Movimentações de Estoque
CREATE TABLE IF NOT EXISTS movimentacoes_estoque (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id uuid NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  quantidade numeric(10,2) NOT NULL,
  motivo text,
  pedido_id uuid REFERENCES pedidos(id) ON DELETE SET NULL,
  valor_unitario numeric(10,2),
  created_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE itens_pedido ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimentacoes_estoque ENABLE ROW LEVEL SECURITY;

-- Políticas para categorias
DROP POLICY IF EXISTS "anon_categorias_select" ON categorias;
CREATE POLICY "anon_categorias_select" ON categorias FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_categorias_insert" ON categorias;
CREATE POLICY "anon_categorias_insert" ON categorias FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_categorias_update" ON categorias;
CREATE POLICY "anon_categorias_update" ON categorias FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_categorias_delete" ON categorias;
CREATE POLICY "anon_categorias_delete" ON categorias FOR DELETE TO anon, authenticated USING (true);

-- Políticas para produtos
DROP POLICY IF EXISTS "anon_produtos_select" ON produtos;
CREATE POLICY "anon_produtos_select" ON produtos FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_produtos_insert" ON produtos;
CREATE POLICY "anon_produtos_insert" ON produtos FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_produtos_update" ON produtos;
CREATE POLICY "anon_produtos_update" ON produtos FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_produtos_delete" ON produtos;
CREATE POLICY "anon_produtos_delete" ON produtos FOR DELETE TO anon, authenticated USING (true);

-- Políticas para pedidos
DROP POLICY IF EXISTS "anon_pedidos_select" ON pedidos;
CREATE POLICY "anon_pedidos_select" ON pedidos FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_pedidos_insert" ON pedidos;
CREATE POLICY "anon_pedidos_insert" ON pedidos FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_pedidos_update" ON pedidos;
CREATE POLICY "anon_pedidos_update" ON pedidos FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_pedidos_delete" ON pedidos;
CREATE POLICY "anon_pedidos_delete" ON pedidos FOR DELETE TO anon, authenticated USING (true);

-- Políticas para itens_pedido
DROP POLICY IF EXISTS "anon_itens_pedido_select" ON itens_pedido;
CREATE POLICY "anon_itens_pedido_select" ON itens_pedido FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_itens_pedido_insert" ON itens_pedido;
CREATE POLICY "anon_itens_pedido_insert" ON itens_pedido FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_itens_pedido_update" ON itens_pedido;
CREATE POLICY "anon_itens_pedido_update" ON itens_pedido FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_itens_pedido_delete" ON itens_pedido;
CREATE POLICY "anon_itens_pedido_delete" ON itens_pedido FOR DELETE TO anon, authenticated USING (true);

-- Políticas para movimentacoes_estoque
DROP POLICY IF EXISTS "anon_movimentacoes_select" ON movimentacoes_estoque;
CREATE POLICY "anon_movimentacoes_select" ON movimentacoes_estoque FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_movimentacoes_insert" ON movimentacoes_estoque;
CREATE POLICY "anon_movimentacoes_insert" ON movimentacoes_estoque FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_movimentacoes_update" ON movimentacoes_estoque;
CREATE POLICY "anon_movimentacoes_update" ON movimentacoes_estoque FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_movimentacoes_delete" ON movimentacoes_estoque;
CREATE POLICY "anon_movimentacoes_delete" ON movimentacoes_estoque FOR DELETE TO anon, authenticated USING (true);

-- Inserir categorias padrão
INSERT INTO categorias (nome, descricao, ordem) VALUES
('Esfihas', 'Esfihas tradicionais e especiais', 1),
('Salgados', 'Salgados fritos e assados', 2),
('Jantinha', 'Pratos para jantar', 3),
('Bebidas', 'Refrigerantes, sucos e drinks', 4),
('Sobremesas', 'Doces e sobremesas', 5)
ON CONFLICT DO NOTHING;

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_produtos_categoria ON produtos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_status ON pedidos(status);
CREATE INDEX IF NOT EXISTS idx_pedidos_tipo ON pedidos(tipo);
CREATE INDEX IF NOT EXISTS idx_itens_pedido_pedido ON itens_pedido(pedido_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_produto ON movimentacoes_estoque(produto_id);