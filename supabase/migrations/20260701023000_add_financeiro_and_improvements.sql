/*
# Adicionar campos para pedidos online, financeiro e fotos dos produtos

1. Alterações na tabela produtos:
   - Já existe o campo `imagem`, vamos usar ele para fotos

2. Alterações na tabela pedidos:
   - Adicionar tipo_entrega (retirada/delivery)
   - Adicionar forma_pagamento
   - Adicionar status 'novo' ao CHECK constraint

3. Alterações na tabela itens_pedido:
   - Adicionar subtotal
   - Adicionar product_image_url (denormalizado para histórico)
   - Adicionar product_name (denormalizado para histórico)

4. Storage:
   - Criar bucket product-images para upload de fotos
*/

-- Adicionar coluna tipo_entrega na tabela pedidos
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS tipo_entrega text DEFAULT 'retirada';

-- Adicionar coluna forma_pagamento na tabela pedidos
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS forma_pagamento text DEFAULT 'nao_informado';

-- Adicionar coluna subtotal na tabela itens_pedido
ALTER TABLE itens_pedido ADD COLUMN IF NOT EXISTS subtotal numeric(10,2);

-- Adicionar coluna product_image_url na tabela itens_pedido
ALTER TABLE itens_pedido ADD COLUMN IF NOT EXISTS product_image_url text;

-- Adicionar coluna product_name na tabela itens_pedido
ALTER TABLE itens_pedido ADD COLUMN IF NOT EXISTS product_name text;

-- Atualizar CHECK constraint de status para incluir 'novo'
ALTER TABLE pedidos DROP CONSTRAINT IF EXISTS pedidos_status_check;
ALTER TABLE pedidos ADD CONSTRAINT pedidos_status_check
  CHECK (status IN ('novo', 'aberto', 'em_preparo', 'pronto', 'entregue', 'cancelado'));

-- Adicionar CHECK constraint para tipo_entrega
ALTER TABLE pedidos DROP CONSTRAINT IF EXISTS pedidos_tipo_entrega_check;
ALTER TABLE pedidos ADD CONSTRAINT pedidos_tipo_entrega_check
  CHECK (tipo_entrega IN ('retirada', 'delivery'));

-- Adicionar CHECK constraint para forma_pagamento
ALTER TABLE pedidos DROP CONSTRAINT IF EXISTS pedidos_forma_pagamento_check;
ALTER TABLE pedidos ADD CONSTRAINT pedidos_forma_pagamento_check
  CHECK (forma_pagamento IN ('dinheiro', 'pix', 'cartao', 'nao_informado'));

-- Índices para consultas financeiras
CREATE INDEX IF NOT EXISTS idx_pedidos_created_at ON pedidos(created_at);
CREATE INDEX IF NOT EXISTS idx_pedidos_status_tipo ON pedidos(status, tipo);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_pedidos_updated_at ON pedidos;
CREATE TRIGGER update_pedidos_updated_at
  BEFORE UPDATE ON pedidos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
