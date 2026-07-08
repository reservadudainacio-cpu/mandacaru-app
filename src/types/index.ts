export interface Categoria {
  id: string;
  nome: string;
  descricao: string | null;
  ordem: number;
  ativo: boolean;
  created_at: string;
}

export interface Produto {
  id: string;
  categoria_id: string | null;
  nome: string;
  descricao: string | null;
  preco: number;
  custo: number;
  estoque_atual: number;
  unidade: string;
  ativo: boolean;
  imagem: string | null;
  created_at: string;
  categorias?: Categoria;
}

export type ProdutoCardapio = Pick<Produto, 'id' | 'categoria_id' | 'nome' | 'descricao' | 'preco' | 'ativo' | 'imagem' | 'created_at'> & {
  categorias?: Pick<Categoria, 'id' | 'nome' | 'ordem'>;
};

export interface Pedido {
  id: string;
  tipo: 'atendimento' | 'delivery' | 'online';
  status: 'novo' | 'aberto' | 'em_preparo' | 'pronto' | 'entregue' | 'cancelado';
  mesa: number | null;
  nome_cliente: string | null;
  telefone: string | null;
  endereco: string | null;
  tipo_entrega: 'retirada' | 'delivery' | null;
  forma_pagamento: 'dinheiro' | 'pix' | 'cartao' | 'nao_informado' | null;
  observacoes: string | null;
  taxa_entrega: number;
  desconto: number;
  subtotal: number;
  total: number;
  origem: 'sistema' | 'whatsapp';
  created_at: string;
  updated_at: string;
  fechado_at: string | null;
  itens?: ItemPedido[];
}

export interface ItemPedido {
  id: string;
  pedido_id: string;
  produto_id: string | null;
  product_name: string | null;
  quantidade: number;
  preco_unitario: number;
  custo_unitario: number;
  subtotal: number | null;
  custo_total: number;
  lucro_item: number;
  observacao: string | null;
  product_image_url: string | null;
  created_at: string;
  produtos?: Produto;
}

export interface MovimentacaoEstoque {
  id: string;
  produto_id: string;
  tipo: 'entrada' | 'saida';
  quantidade: number;
  motivo: string | null;
  pedido_id: string | null;
  valor_unitario: number | null;
  created_at: string;
  produtos?: Produto;
}

export interface Caixa {
  id: string;
  aberto_em: string;
  fechado_em: string | null;
  saldo_inicial: number;
  saldo_final: number | null;
  observacao: string | null;
  created_at: string;
  updated_at: string;
}

export type TipoMovimentacaoCaixa = 'entrada' | 'saida' | 'sangria' | 'suprimento' | 'venda' | 'ajuste';

export interface MovimentacaoCaixa {
  id: string;
  tipo: TipoMovimentacaoCaixa;
  valor: number;
  descricao: string;
  categoria: string | null;
  forma_pagamento: string;
  observacao: string | null;
  data_movimentacao: string;
  pedido_id: string | null;
  caixa_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface FinanceiroResumo {
  id: string;
  periodo_inicio: string;
  periodo_fim: string;
  total_vendido: number;
  total_pedidos: number;
  total_finalizados: number;
  total_cancelados: number;
  ticket_medio: number;
  total_entradas: number;
  total_saidas: number;
  saldo_caixa: number;
  lucro_bruto: number;
  lucro_liquido: number;
  dinheiro: number;
  pix: number;
  cartao: number;
  nao_informado: number;
  created_at: string;
}

export interface FinanceiroStats {
  totalVendidoHoje: number;
  totalVendidoMes: number;
  qtdPedidosHoje: number;
  qtdFinalizados: number;
  qtdCancelados: number;
  ticketMedio: number;
  pagamentoDinheiro: number;
  pagamentoPix: number;
  pagamentoCartao: number;
  pagamentoNaoInformado: number;
}

export interface CategoriaMovimentacaoCaixa {
  id: string;
  nome: string;
  tipo: 'entrada' | 'saida';
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Configuracao {
  chave: string;
  valor: string;
  descricao: string;
  created_at: string;
  updated_at: string;
}

export interface EmpresaConfig {
  id: string;
  nome_empresa: string;
  subtitulo: string;
  descricao: string;
  whatsapp_pedidos: string;
  telefone_principal: string;
  telefone_secundario: string;
  endereco: string;
  cidade: string;
  estado: string;
  taxa_entrega: number;
  pedido_minimo: number;
  horario_funcionamento: string;
  aberto: boolean;
  logo_url?: string;
  created_at: string;
  updated_at: string;
}

export type ConfigCardapio = Pick<EmpresaConfig, 'nome_empresa' | 'subtitulo' | 'descricao' | 'whatsapp_pedidos' | 'telefone_secundario' | 'endereco' | 'cidade' | 'estado' | 'taxa_entrega' | 'pedido_minimo' | 'horario_funcionamento' | 'aberto' | 'logo_url'>;

export type TabType = 'atendimento' | 'delivery' | 'produtos' | 'estoque' | 'pedidos-online' | 'financeiro' | 'configuracoes';
