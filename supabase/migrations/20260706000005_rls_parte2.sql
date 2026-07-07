-- PARTE 2: RLS policies restritivas
-- Anon: apenas SELECT em categorias e produtos (cardapio público)
-- Authenticated: CRUD completo em todas as tabelas

-- ============================================================
-- Helper function to safely drop policies
-- ============================================================
DO $$
DECLARE
  policies text[][] := ARRAY[
    ['categorias', 'anon_categorias_select'],
    ['categorias', 'anon_categorias_insert'],
    ['categorias', 'anon_categorias_update'],
    ['categorias', 'anon_categorias_delete'],
    ['produtos', 'anon_produtos_select'],
    ['produtos', 'anon_produtos_insert'],
    ['produtos', 'anon_produtos_update'],
    ['produtos', 'anon_produtos_delete'],
    ['pedidos', 'anon_pedidos_select'],
    ['pedidos', 'anon_pedidos_insert'],
    ['pedidos', 'anon_pedidos_update'],
    ['pedidos', 'anon_pedidos_delete'],
    ['itens_pedido', 'anon_itens_pedido_select'],
    ['itens_pedido', 'anon_itens_pedido_insert'],
    ['itens_pedido', 'anon_itens_pedido_update'],
    ['itens_pedido', 'anon_itens_pedido_delete'],
    ['movimentacoes_estoque', 'anon_movimentacoes_estoque_select'],
    ['movimentacoes_estoque', 'anon_movimentacoes_estoque_insert'],
    ['movimentacoes_estoque', 'anon_movimentacoes_estoque_update'],
    ['movimentacoes_estoque', 'anon_movimentacoes_estoque_delete'],
    ['movimentacoes_caixa', 'anon_movimentacoes_caixa_select'],
    ['movimentacoes_caixa', 'anon_movimentacoes_caixa_insert'],
    ['movimentacoes_caixa', 'anon_movimentacoes_caixa_update'],
    ['movimentacoes_caixa', 'anon_movimentacoes_caixa_delete'],
    ['financeiro_resumos', 'anon_financeiro_resumos_select'],
    ['financeiro_resumos', 'anon_financeiro_resumos_insert'],
    ['financeiro_resumos', 'anon_financeiro_resumos_delete'],
    ['categorias_movimentacao_caixa', 'anon_categorias_movimentacao_caixa_select'],
    ['categorias_movimentacao_caixa', 'anon_categorias_movimentacao_caixa_insert'],
    ['categorias_movimentacao_caixa', 'anon_categorias_movimentacao_caixa_update']
  ];
  i integer;
BEGIN
  FOR i IN 1..array_length(policies, 1) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', policies[i][2], policies[i][1]);
  END LOOP;
END;
$$;

-- ============================================================
-- categorias: anon pode SELECT (cardapio), authenticated = tudo
-- ============================================================
CREATE POLICY "categorias_select_public" ON categorias FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "categorias_all_authenticated" ON categorias FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- produtos: anon pode SELECT (cardapio), authenticated = tudo
-- ============================================================
CREATE POLICY "produtos_select_public" ON produtos FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "produtos_all_authenticated" ON produtos FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- configuracoes: mantém as políticas existentes, só reforça
-- anon pode SELECT (precisa ler nome/endereço/etc), authenticated = tudo
-- ============================================================
DROP POLICY IF EXISTS "configuracoes_select_public" ON configuracoes;
DROP POLICY IF EXISTS "configuracoes_all_authenticated" ON configuracoes;
CREATE POLICY "configuracoes_select_public" ON configuracoes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "configuracoes_all_authenticated" ON configuracoes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- pedidos: apenas authenticated
-- ============================================================
CREATE POLICY "pedidos_all_authenticated" ON pedidos FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- itens_pedido: apenas authenticated
-- ============================================================
CREATE POLICY "itens_pedido_all_authenticated" ON itens_pedido FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- movimentacoes_estoque: apenas authenticated
-- ============================================================
CREATE POLICY "movimentacoes_estoque_all_authenticated" ON movimentacoes_estoque FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- movimentacoes_caixa: apenas authenticated
-- ============================================================
CREATE POLICY "movimentacoes_caixa_all_authenticated" ON movimentacoes_caixa FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- financeiro_resumos: apenas authenticated
-- ============================================================
CREATE POLICY "financeiro_resumos_all_authenticated" ON financeiro_resumos FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- categorias_movimentacao_caixa: apenas authenticated
-- ============================================================
CREATE POLICY "categorias_movimentacao_caixa_all_authenticated" ON categorias_movimentacao_caixa FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- RPC: permitir que anon execute criar_pedido_completo
-- ============================================================
GRANT EXECUTE ON FUNCTION criar_pedido_completo TO anon, authenticated;
