/*
# Adicionar tabela de pedidos online (cardápio digital)

1. Novas Tabelas
- `pedidos_online`: Pedidos feitos pelo cardápio digital/WhatsApp
- Status: recebido, em_preparo, pronto, entregue, cancelado

2. Segurança
- RLS habilitado
- Acesso público para inserção (cardápio digital)
*/

-- Adicionar tipo de pedido 'online' ao enum de tipo
ALTER TABLE pedidos DROP CONSTRAINT IF EXISTS pedidos_tipo_check;
ALTER TABLE pedidos ADD CONSTRAINT pedidos_tipo_check 
  CHECK (tipo IN ('atendimento', 'delivery', 'online'));

-- Criar tabela para sessões do cardápio digital
CREATE TABLE IF NOT EXISTS sessoes_cardapio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_nome text,
  cliente_telefone text,
  cliente_endereco text,
  tipo_entrega text DEFAULT 'retirada' CHECK (tipo_entrega IN ('retirada', 'delivery')),
  criado_em timestamptz DEFAULT now(),
  expira_em timestamptz DEFAULT now() + INTERVAL '2 hours'
);

-- Habilitar RLS
ALTER TABLE sessoes_cardapio ENABLE ROW LEVEL SECURITY;

-- Políticas para sessoes_cardapio
DROP POLICY IF EXISTS "anon_sessoes_cardapio_select" ON sessoes_cardapio;
CREATE POLICY "anon_sessoes_cardapio_select" ON sessoes_cardapio FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_sessoes_cardapio_insert" ON sessoes_cardapio;
CREATE POLICY "anon_sessoes_cardapio_insert" ON sessoes_cardapio FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_sessoes_cardapio_update" ON sessoes_cardapio;
CREATE POLICY "anon_sessoes_cardapio_update" ON sessoes_cardapio FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);