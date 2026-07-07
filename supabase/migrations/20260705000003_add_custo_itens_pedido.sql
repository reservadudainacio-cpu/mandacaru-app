ALTER TABLE itens_pedido ADD COLUMN IF NOT EXISTS custo_unitario numeric(10,2) DEFAULT 0;
ALTER TABLE itens_pedido ADD COLUMN IF NOT EXISTS custo_total numeric(10,2) DEFAULT 0;
ALTER TABLE itens_pedido ADD COLUMN IF NOT EXISTS lucro_item numeric(10,2) DEFAULT 0;
