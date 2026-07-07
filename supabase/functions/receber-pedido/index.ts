import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface ItemInput {
  produto_id: string;
  quantidade: number;
  observacao?: string;
}

interface PedidoInput {
  cliente_nome: string;
  cliente_telefone: string;
  tipo_entrega: 'retirada' | 'delivery';
  endereco?: string;
  observacoes?: string;
  itens: ItemInput[];
}

interface ProdutoDB {
  id: string;
  nome: string;
  preco: number;
  custo: number;
  ativo: boolean;
  estoque_atual: number;
  imagem: string | null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Método não permitido." }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const input: PedidoInput = await req.json();

    // ── Validações ──────────────────────────────────────────
    if (!input.cliente_nome?.trim()) {
      return new Response(
        JSON.stringify({ error: "Nome do cliente é obrigatório." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!input.cliente_telefone?.trim()) {
      return new Response(
        JSON.stringify({ error: "Telefone é obrigatório." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (input.tipo_entrega !== 'retirada' && input.tipo_entrega !== 'delivery') {
      return new Response(
        JSON.stringify({ error: "Tipo de entrega inválido." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (input.tipo_entrega === 'delivery' && !input.endereco?.trim()) {
      return new Response(
        JSON.stringify({ error: "Endereço é obrigatório para entrega." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!input.itens || input.itens.length === 0) {
      return new Response(
        JSON.stringify({ error: "Pedido deve conter pelo menos 1 item." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Buscar produtos do banco ────────────────────────────
    const produtoIds = input.itens.map(item => item.produto_id);
    const { data: produtos, error: produtosError } = await supabase
      .from("produtos")
      .select("id, nome, preco, custo, ativo, estoque_atual, imagem")
      .in("id", produtoIds);

    if (produtosError) {
      console.error("Erro ao buscar produtos:", produtosError);
      return new Response(
        JSON.stringify({ error: "Erro ao processar pedido. Tente novamente." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const produtosMap = new Map<string, ProdutoDB>(produtos?.map(p => [p.id, p]) ?? []);

    // ── Validar cada item e calcular ────────────────────────
    const itensCalculados: Array<{
      produto_id: string;
      product_name: string;
      product_image_url: string | null;
      quantidade: number;
      preco_unitario: number;
      custo_unitario: number;
      subtotal: number;
      custo_total: number;
      lucro_item: number;
      observacao: string | null;
    }> = [];

    let subtotalPedido = 0;

    for (const item of input.itens) {
      if (!item.produto_id) {
        return new Response(
          JSON.stringify({ error: "Produto inválido no pedido." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const qtd = Number(item.quantidade);
      if (!Number.isInteger(qtd) || qtd <= 0) {
        return new Response(
          JSON.stringify({ error: "Quantidade inválida para um dos produtos." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const produto = produtosMap.get(item.produto_id);
      if (!produto) {
        return new Response(
          JSON.stringify({ error: "Produto não encontrado." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!produto.ativo) {
        return new Response(
          JSON.stringify({ error: `"${produto.nome}" não está disponível no momento.` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (produto.estoque_atual < qtd) {
        return new Response(
          JSON.stringify({ error: `Estoque insuficiente para "${produto.nome}". Disponível: ${produto.estoque_atual}.` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const subtotal = produto.preco * qtd;
      const custoTotal = (produto.custo || 0) * qtd;
      const lucroItem = subtotal - custoTotal;
      subtotalPedido += subtotal;

      itensCalculados.push({
        produto_id: produto.id,
        product_name: produto.nome,
        product_image_url: produto.imagem,
        quantidade: qtd,
        preco_unitario: produto.preco,
        custo_unitario: produto.custo || 0,
        subtotal,
        custo_total: custoTotal,
        lucro_item: lucroItem,
        observacao: item.observacao?.trim() || null,
      });
    }

    // ── Buscar taxa de entrega da configuração ──────────────
    let taxaEntrega = 0;
    if (input.tipo_entrega === 'delivery') {
      const { data: config } = await supabase
        .from("configuracoes_empresa")
        .select("taxa_entrega")
        .limit(1)
        .maybeSingle();

      if (config?.taxa_entrega) {
        taxaEntrega = Number(config.taxa_entrega);
      }
    }

    const total = subtotalPedido + taxaEntrega;

    // ── Criar pedido via RPC (transação atômica) ────────────
    const { data: result, error: rpcError } = await supabase.rpc('criar_pedido_completo', {
      p_pedido: {
        tipo: 'online',
        status: 'novo',
        nome_cliente: input.cliente_nome.trim(),
        telefone: input.cliente_telefone.trim(),
        endereco: input.endereco?.trim() || null,
        tipo_entrega: input.tipo_entrega,
        taxa_entrega: taxaEntrega,
        observacoes: input.observacoes?.trim() || null,
        subtotal: subtotalPedido,
        total,
        origem: 'sistema',
      },
      p_itens: itensCalculados,
    });

    if (rpcError || !result?.ok) {
      console.error("Erro RPC:", rpcError || result);
      return new Response(
        JSON.stringify({ error: "Erro ao criar pedido. Tente novamente." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        pedido_id: result.pedido_id,
        total,
        mensagem: "Pedido recebido com sucesso!",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("Erro interno:", err);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
