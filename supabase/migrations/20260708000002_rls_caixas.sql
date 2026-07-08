-- ============================================================
-- SEGURANCA: RPC SECURITY DEFINER para operacoes de caixa
-- ============================================================

-- 1. RPC para registrar venda de pedido no caixa (segura)
CREATE OR REPLACE FUNCTION registrar_venda_caixa(p_pedido_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_caixa_id uuid;
  v_pedido record;
  v_existente uuid;
BEGIN
  -- Busca caixa aberto
  SELECT id INTO v_caixa_id
  FROM caixas
  WHERE fechado_em IS NULL
  ORDER BY aberto_em DESC
  LIMIT 1;

  IF v_caixa_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nenhum caixa aberto');
  END IF;

  -- Busca pedido
  SELECT id, total, nome_cliente, mesa, forma_pagamento, fechado_at, updated_at, created_at
  INTO v_pedido
  FROM pedidos
  WHERE id = p_pedido_id;

  IF v_pedido.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Pedido nao encontrado');
  END IF;

  -- Verifica duplicata
  SELECT id INTO v_existente
  FROM movimentacoes_caixa
  WHERE pedido_id = p_pedido_id AND tipo = 'venda'
  LIMIT 1;

  IF v_existente IS NOT NULL THEN
    RETURN jsonb_build_object('ok', true, 'mensagem', 'Venda ja registrada');
  END IF;

  -- Insere movimentacao
  INSERT INTO movimentacoes_caixa (
    tipo, valor, descricao, categoria, forma_pagamento,
    data_movimentacao, pedido_id, caixa_id
  ) VALUES (
    'venda',
    v_pedido.total,
    'Venda #' || left(v_pedido.id::text, 8) ||
      CASE WHEN v_pedido.nome_cliente IS NOT NULL THEN ' - ' || v_pedido.nome_cliente
           WHEN v_pedido.mesa IS NOT NULL THEN ' - Mesa ' || v_pedido.mesa
           ELSE ''
      END,
    'Venda de pedido',
    COALESCE(v_pedido.forma_pagamento, 'nao_informado'),
    COALESCE(v_pedido.fechado_at, v_pedido.updated_at, v_pedido.created_at)::date,
    p_pedido_id,
    v_caixa_id
  );

  RETURN jsonb_build_object('ok', true, 'caixa_id', v_caixa_id);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('ok', false, 'erro', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION registrar_venda_caixa TO authenticated;

-- 2. RPC para sincronizar todas as vendas pendentes (segura)
CREATE OR REPLACE FUNCTION sincronizar_vendas_caixa()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_caixa_id uuid;
  v_pedido record;
  v_existente uuid;
  v_count integer := 0;
BEGIN
  -- Busca caixa aberto
  SELECT id INTO v_caixa_id
  FROM caixas
  WHERE fechado_em IS NULL
  ORDER BY aberto_em DESC
  LIMIT 1;

  IF v_caixa_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nenhum caixa aberto');
  END IF;

  FOR v_pedido IN
    SELECT id, total, nome_cliente, mesa, forma_pagamento, fechado_at, updated_at, created_at
    FROM pedidos
    WHERE status IN ('pronto', 'entregue')
    ORDER BY created_at ASC
  LOOP
    SELECT id INTO v_existente
    FROM movimentacoes_caixa
    WHERE pedido_id = v_pedido.id AND tipo = 'venda'
    LIMIT 1;

    IF v_existente IS NULL THEN
      INSERT INTO movimentacoes_caixa (
        tipo, valor, descricao, categoria, forma_pagamento,
        data_movimentacao, pedido_id, caixa_id
      ) VALUES (
        'venda',
        v_pedido.total,
        'Venda #' || left(v_pedido.id::text, 8) ||
          CASE WHEN v_pedido.nome_cliente IS NOT NULL THEN ' - ' || v_pedido.nome_cliente
               WHEN v_pedido.mesa IS NOT NULL THEN ' - Mesa ' || v_pedido.mesa
               ELSE ''
          END,
        'Venda de pedido',
        COALESCE(v_pedido.forma_pagamento, 'nao_informado'),
        COALESCE(v_pedido.fechado_at, v_pedido.updated_at, v_pedido.created_at)::date,
        v_pedido.id,
        v_caixa_id
      );
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'sincronizadas', v_count);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('ok', false, 'erro', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION sincronizar_vendas_caixa TO authenticated;

-- 3. Reforca RLS em caixas (garante que anon nao tem acesso)
ALTER TABLE caixas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "caixas_all_authenticated" ON caixas;
CREATE POLICY "caixas_all_authenticated"
  ON caixas FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 4. Garante RLS em movimentacoes_caixa para novos tipos
DROP POLICY IF EXISTS "movimentacoes_caixa_all_authenticated" ON movimentacoes_caixa;
CREATE POLICY "movimentacoes_caixa_all_authenticated"
  ON movimentacoes_caixa FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 5. Revoga qualquer acesso anon a caixas explicitamente (redundante mas seguro)
REVOKE ALL ON caixas FROM anon;
REVOKE ALL ON movimentacoes_caixa FROM anon;
