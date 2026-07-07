-- PARTE 3: Correções finais de RLS + SECURITY DEFINER na RPC
-- Corrige: (1) RPC quebrada para anon, (2) RLS faltando em configuracoes_empresa, (3) filtrar ativos

-- ============================================================
-- 1. CORREÇÃO CRÍTICA: RPC function precisa de SECURITY DEFINER
-- ============================================================
-- Motivo: a função INSERT em pedidos, itens_pedido, movimentacoes_estoque
-- e UPDATE em produtos. Com RLS restritivo, anon não consegue executar.
-- SECURITY DEFINER faz a função rodar como owner (postgres), ignorando RLS.
-- Isso é seguro porque a função só faz operações controladas (não aceita SQL arbitrário).

CREATE OR REPLACE FUNCTION criar_pedido_completo(
  p_pedido jsonb,
  p_itens jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pedido_id uuid;
  v_item jsonb;
  v_produto record;
BEGIN
  INSERT INTO pedidos (
    tipo, status, mesa, nome_cliente, telefone, endereco,
    tipo_entrega, forma_pagamento, observacoes,
    taxa_entrega, desconto, subtotal, total, origem
  ) VALUES (
    p_pedido->>'tipo',
    COALESCE(p_pedido->>'status', 'novo'),
    (p_pedido->>'mesa')::integer,
    p_pedido->>'nome_cliente',
    p_pedido->>'telefone',
    p_pedido->>'endereco',
    p_pedido->>'tipo_entrega',
    COALESCE(p_pedido->>'forma_pagamento', 'nao_informado'),
    p_pedido->>'observacoes',
    COALESCE((p_pedido->>'taxa_entrega')::numeric, 0),
    COALESCE((p_pedido->>'desconto')::numeric, 0),
    COALESCE((p_pedido->>'subtotal')::numeric, 0),
    COALESCE((p_pedido->>'total')::numeric, 0),
    COALESCE(p_pedido->>'origem', 'sistema')
  )
  RETURNING id INTO v_pedido_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_itens)
  LOOP
    INSERT INTO itens_pedido (
      pedido_id, produto_id, quantidade, preco_unitario, subtotal,
      observacao, product_name, product_image_url,
      custo_unitario, custo_total, lucro_item
    ) VALUES (
      v_pedido_id,
      (v_item->>'produto_id')::uuid,
      (v_item->>'quantidade')::numeric,
      (v_item->>'preco_unitario')::numeric,
      COALESCE((v_item->>'subtotal')::numeric, (v_item->>'quantidade')::numeric * (v_item->>'preco_unitario')::numeric),
      v_item->>'observacao',
      v_item->>'product_name',
      v_item->>'product_image_url',
      COALESCE((v_item->>'custo_unitario')::numeric, 0),
      COALESCE((v_item->>'custo_total')::numeric, 0),
      COALESCE((v_item->>'lucro_item')::numeric, 0)
    );

    SELECT id, estoque_atual INTO v_produto FROM produtos WHERE id = (v_item->>'produto_id')::uuid;
    IF FOUND THEN
      UPDATE produtos SET estoque_atual = estoque_atual - (v_item->>'quantidade')::numeric WHERE id = v_produto.id;
    END IF;

    INSERT INTO movimentacoes_estoque (produto_id, tipo, quantidade, motivo, pedido_id)
    VALUES (
      (v_item->>'produto_id')::uuid,
      'saida',
      (v_item->>'quantidade')::numeric,
      'Venda - Pedido ' || v_pedido_id,
      v_pedido_id
    );
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'pedido_id', v_pedido_id);

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('ok', false, 'erro', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION criar_pedido_completo TO anon, authenticated;

-- ============================================================
-- 2. RLS para configuracoes_empresa (se existir)
-- ============================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'configuracoes_empresa') THEN
    ALTER TABLE configuracoes_empresa ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "configuracoes_empresa_select_public" ON configuracoes_empresa;
    DROP POLICY IF EXISTS "configuracoes_empresa_all_authenticated" ON configuracoes_empresa;

    CREATE POLICY "configuracoes_empresa_select_public"
      ON configuracoes_empresa FOR SELECT
      TO anon, authenticated
      USING (true);

    CREATE POLICY "configuracoes_empresa_all_authenticated"
      ON configuracoes_empresa FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END;
$$;

-- ============================================================
-- 3. Restringir categorias: anon SELECT apenas ativas
-- ============================================================
DROP POLICY IF EXISTS "categorias_select_public" ON categorias;

CREATE POLICY "categorias_select_public"
  ON categorias FOR SELECT
  TO anon, authenticated
  USING (ativo = true);

-- ============================================================
-- 4. Restringir produtos: anon SELECT apenas ativos
-- ============================================================
DROP POLICY IF EXISTS "produtos_select_public" ON produtos;

CREATE POLICY "produtos_select_public"
  ON produtos FOR SELECT
  TO anon, authenticated
  USING (ativo = true);
