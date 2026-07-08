import { useState, useEffect, useMemo } from 'react';
import {
  DollarSign, TrendingUp, ShoppingCart, CheckCircle, XCircle,
  Target, Calendar, Search, Trash2, AlertTriangle, ChevronDown,
  Clock, ArrowUpCircle, ArrowDownCircle, Wallet, PiggyBank,
  TrendingDown, BarChart3, PieChart, Download, Plus, Edit3,
  Package, CreditCard, Banknote, Smartphone, Loader2, X,
  Receipt, Info,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Pedido, ItemPedido, MovimentacaoCaixa, FinanceiroResumo, CategoriaMovimentacaoCaixa, Caixa, TipoMovimentacaoCaixa } from '../types';
import { buscarCaixaAberto, sincronizarVendasCaixa } from '../lib/caixa';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, PieChart as RePieChart, Pie, Cell,
  LineChart, Line,
} from 'recharts';

type PeriodoFiltro = 'hoje' | '7d' | '30d' | '60d' | '90d' | '1a' | 'todo' | 'personalizado';

const periodos: { key: PeriodoFiltro; label: string }[] = [
  { key: 'hoje', label: 'Hoje' },
  { key: '7d', label: '7 dias' },
  { key: '30d', label: '30 dias' },
  { key: '60d', label: '60 dias' },
  { key: '90d', label: '90 dias' },
  { key: '1a', label: '1 ano' },
  { key: 'todo', label: 'Todo período' },
];

const opcoesLimpar = [
  { dias: 30, label: 'mais de 30 dias' },
  { dias: 60, label: 'mais de 60 dias' },
  { dias: 90, label: 'mais de 90 dias' },
  { dias: 365, label: 'mais de 1 ano' },
  { dias: 0, label: 'todo histórico finalizado/cancelado' },
];

const FALLBACK_CATEGORIAS_ENTRADA = ['Aporte no caixa', 'Dinheiro inicial', 'Venda manual', 'Recebimento externo', 'Correção de caixa', 'Outros'];
const FALLBACK_CATEGORIAS_SAIDA = ['Ingredientes', 'Motoboy', 'Energia', 'Água', 'Gás', 'Aluguel', 'Manutenção', 'Embalagens', 'Salário', 'Impostos', 'Divulgação', 'Outros'];

const CHART_COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'];
const PAGAMENTO_CORES: Record<string, string> = {
  dinheiro: '#10b981',
  pix: '#3b82f6',
  cartao: '#8b5cf6',
  nao_informado: '#9ca3af',
};

export function FinanceiroTab() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoCaixa[]>([]);
  const [resumos, setResumos] = useState<FinanceiroResumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodoFiltro, setPeriodoFiltro] = useState<PeriodoFiltro>('30d');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [showLimparModal, setShowLimparModal] = useState(false);
  const [limparDias, setLimparDias] = useState(90);
  const [limparLoading, setLimparLoading] = useState(false);
  const [limparMensagem, setLimparMensagem] = useState('');
  const [showCaixaModal, setShowCaixaModal] = useState(false);
  const [caixaTipo, setCaixaTipo] = useState<'entrada' | 'saida'>('entrada');
  const [caixaForm, setCaixaForm] = useState({ valor: '', descricao: '', categoria: '', forma_pagamento: 'dinheiro', data_movimentacao: new Date().toISOString().split('T')[0], observacao: '' });
  const [caixaEditId, setCaixaEditId] = useState<string | null>(null);
  const [caixaLoading, setCaixaLoading] = useState(false);
  const [categoriasMov, setCategoriasMov] = useState<CategoriaMovimentacaoCaixa[]>([]);
  const [filtroMovTipo, setFiltroMovTipo] = useState('');
  const [showDetalheModal, setShowDetalheModal] = useState<{ titulo: string; dados: { label: string; valor: string }[] } | null>(null);
  const [historyPedidos, setHistoryPedidos] = useState<Pedido[]>([]);
  const [historyPage, setHistoryPage] = useState(0);
  const [historyHasMore, setHistoryHasMore] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const HISTORY_PAGE_SIZE = 100;

  const [caixaAberto, setCaixaAberto] = useState<Caixa | null>(null);
  const [showAbrirCaixaModal, setShowAbrirCaixaModal] = useState(false);
  const [showFecharCaixaModal, setShowFecharCaixaModal] = useState(false);
  const [showSangriaSuprimentoModal, setShowSangriaSuprimentoModal] = useState(false);
  const [sangriaSuprimentoTipo, setSangriaSuprimentoTipo] = useState<TipoMovimentacaoCaixa>('sangria');
  const [abrirCaixaForm, setAbrirCaixaForm] = useState({ saldo_inicial: '', observacao: '' });
  const [fecharCaixaForm, setFecharCaixaForm] = useState({ observacao: '' });
  const [sangriaSuprimentoForm, setSangriaSuprimentoForm] = useState({ valor: '', descricao: '' });

  const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <div className={`bg-white rounded-xl shadow-md p-4 ${className}`}>{children}</div>
  );

  useEffect(() => { loadData(); loadCaixaAberto(); }, []);

  useEffect(() => {
    loadData();
  }, [periodoFiltro, dataInicio, dataFim]);

  useEffect(() => {
    loadCaixaAberto();
  }, [movimentacoes]);

  async function loadData() {
    setLoading(true);
    try {
      const limites = getLimitesPeriodo();
      const inicioStr = limites.inicio.toISOString();
      const fimStr = limites.fim.toISOString();

      const isTodo = periodoFiltro === 'todo';

      let queryPedidos = supabase
        .from('pedidos')
        .select('*, itens_pedido(*, produtos(*))')
        .in('tipo', ['atendimento', 'delivery', 'online']);

      if (!isTodo) {
        queryPedidos = queryPedidos
          .gte('created_at', inicioStr)
          .lte('created_at', fimStr);
      }

      queryPedidos = queryPedidos.order('created_at', { ascending: false });

      const { data: ped, error: pedError } = await queryPedidos;
      if (pedError) {
        if (import.meta.env.DEV) console.error('Erro ao carregar pedidos:', pedError);
        alert('Erro ao carregar dados. Tente novamente.');
        setLoading(false);
        return;
      }
      if (ped) {
        setPedidos(ped.map(p => ({ ...p, itens: (p as Record<string, unknown>).itens_pedido })) as Pedido[]);
      }

      let queryMov = supabase
        .from('movimentacoes_caixa')
        .select('*');

      if (!isTodo) {
        queryMov = queryMov
          .gte('data_movimentacao', inicioStr.split('T')[0])
          .lte('data_movimentacao', fimStr.split('T')[0]);
      }

      queryMov = queryMov.order('data_movimentacao', { ascending: false });

      const { data: mov, error: movError } = await queryMov;
      if (movError) {
        if (import.meta.env.DEV) console.error('Erro ao carregar movimentações de caixa:', movError);
        alert('Erro ao carregar dados. Tente novamente.');
        setLoading(false);
        return;
      }
      if (mov) setMovimentacoes(mov);

      try {
        const { data: res } = await supabase.from('financeiro_resumos').select('*').order('periodo_fim', { ascending: false });
        if (res) setResumos(res);
      } catch { /* tabela pode não existir */ }

      const { data: cats } = await supabase.from('categorias_movimentacao_caixa').select('*').eq('ativo', true);
      if (cats) setCategoriasMov(cats);

      // Reset history on period change
      setHistoryPedidos([]);
      setHistoryPage(0);
      setHistoryHasMore(true);
      loadHistoryPage({ reset: true });
    } catch (e) {
      if (import.meta.env.DEV) console.error('Erro inesperado ao carregar dados:', e);
      alert('Erro ao carregar dados. Tente novamente.');
    }
    setLoading(false);
  }

  async function loadHistoryPage({ reset = false }: { reset?: boolean } = {}) {
    if (historyLoading) return;
    setHistoryLoading(true);
    try {
      const limites = getLimitesPeriodo();
      const inicioStr = limites.inicio.toISOString();
      const fimStr = limites.fim.toISOString();
      const isTodo = periodoFiltro === 'todo';

      const page = reset ? 0 : historyPage;
      const start = page * HISTORY_PAGE_SIZE;
      const end = start + HISTORY_PAGE_SIZE;

      let query = supabase
        .from('pedidos')
        .select('*, itens_pedido(*, produtos(*))')
        .in('tipo', ['atendimento', 'delivery', 'online']);

      if (!isTodo) {
        query = query
          .gte('created_at', inicioStr)
          .lte('created_at', fimStr);
      }

      if (filtroStatus) {
        query = query.eq('status', filtroStatus);
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .range(start, end);

      if (error) {
        if (import.meta.env.DEV) console.error('Erro ao carregar histórico:', error);
        setHistoryLoading(false);
        return;
      }

      const mapped = (data || []).map(p => ({
        ...p,
        itens: (p as Record<string, unknown>).itens_pedido,
      })) as Pedido[];

      const hasMore = mapped.length > HISTORY_PAGE_SIZE;
      const slice = mapped.slice(0, HISTORY_PAGE_SIZE);

      if (reset) {
        setHistoryPedidos(slice);
        setHistoryPage(1);
      } else {
        setHistoryPedidos(prev => {
          const ids = new Set(prev.map(p => p.id));
          const novos = slice.filter(p => !ids.has(p.id));
          return [...prev, ...novos];
        });
        setHistoryPage(prev => prev + 1);
      }
      setHistoryHasMore(hasMore);
    } catch (e) {
      if (import.meta.env.DEV) console.error('Erro inesperado ao carregar histórico:', e);
    }
    setHistoryLoading(false);
  }

  function getLimitesPeriodo() {
    const hoje = new Date(); const fim = new Date(hoje); fim.setHours(23, 59, 59, 999);
    const inicio = new Date(hoje); inicio.setHours(0, 0, 0, 0);
    switch (periodoFiltro) {
      case 'hoje': break;
      case '7d': inicio.setDate(inicio.getDate() - 6); break;
      case '30d': inicio.setDate(inicio.getDate() - 29); break;
      case '60d': inicio.setDate(inicio.getDate() - 59); break;
      case '90d': inicio.setDate(inicio.getDate() - 89); break;
      case '1a': inicio.setFullYear(inicio.getFullYear() - 1); break;
      case 'todo': inicio.setFullYear(2000, 0, 1); break;
      case 'personalizado':
        if (dataInicio) { const d = new Date(dataInicio); d.setHours(0, 0, 0, 0); inicio.setTime(d.getTime()); }
        if (dataFim) { const d = new Date(dataFim); d.setHours(23, 59, 59, 999); fim.setTime(d.getTime()); }
        break;
    }
    return { inicio, fim };
  }

  const { inicio: periodoInicio, fim: periodoFim } = useMemo(() => getLimitesPeriodo(), [periodoFiltro, dataInicio, dataFim]);

  const pedidosNoPeriodo = useMemo(() =>
    pedidos.filter(p => { const d = new Date(p.created_at); return d >= periodoInicio && d <= periodoFim; }),
    [pedidos, periodoInicio, periodoFim]
  );

  const movNoPeriodo = useMemo(() =>
    movimentacoes.filter(m => { const d = new Date(m.data_movimentacao); d.setHours(0, 0, 0, 0); return d >= periodoInicio && d <= periodoFim; }),
    [movimentacoes, periodoInicio, periodoFim]
  );

  const finalizados = useMemo(() => pedidosNoPeriodo.filter(p => p.status === 'pronto' || p.status === 'entregue'), [pedidosNoPeriodo]);
  const cancelados = useMemo(() => pedidosNoPeriodo.filter(p => p.status === 'cancelado'), [pedidosNoPeriodo]);

  const getCustoItem = (i: ItemPedido) => Number(i.custo_unitario ?? (i.produtos as Record<string, unknown>)?.custo ?? 0);
  const getCustoTotalItem = (i: ItemPedido) => Number(i.custo_total ?? Number(i.quantidade) * getCustoItem(i));

  const stats = useMemo(() => {
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const hojePedidos = pedidosNoPeriodo.filter(p => new Date(p.created_at) >= hoje);
    const mesPedidos = pedidosNoPeriodo.filter(p => new Date(p.created_at) >= inicioMes);
    const totalHoje = hojePedidos.filter(p => p.status === 'pronto' || p.status === 'entregue').reduce((s, p) => s + Number(p.total), 0);
    const totalMes = mesPedidos.filter(p => p.status === 'pronto' || p.status === 'entregue').reduce((s, p) => s + Number(p.total), 0);
    const receitaProdutos = finalizados.reduce((s, p) => s + (p.itens || []).reduce((si, i) => si + Number(i.subtotal || i.quantidade * i.preco_unitario), 0), 0);
    const totalFinalizados = finalizados.reduce((s, p) => s + Number(p.total), 0);
    const ticketMedio = finalizados.length > 0 ? totalFinalizados / finalizados.length : 0;
    const custoTotal = finalizados.reduce((s, p) => s + (p.itens || []).reduce((si, i) => si + getCustoTotalItem(i), 0), 0);
    const taxaEntrega = finalizados.reduce((s, p) => s + Number(p.taxa_entrega || 0), 0);
    const entradas = movNoPeriodo.filter(m => ['entrada', 'suprimento', 'venda', 'ajuste'].includes(m.tipo)).reduce((s, m) => s + Number(m.valor), 0);
    const saidas = movNoPeriodo.filter(m => ['saida', 'sangria'].includes(m.tipo)).reduce((s, m) => s + Number(m.valor), 0);
    const porPagamento = (status: string) => finalizados.filter(p => (p.forma_pagamento || 'nao_informado') === status).reduce((s, p) => s + Number(p.total), 0);
    const lucroBruto = receitaProdutos - custoTotal;
    const lucroLiquido = lucroBruto + taxaEntrega + entradas - saidas;
    return {
      totalVendidoHoje: totalHoje, totalVendidoMes: totalMes, qtdPedidosHoje: hojePedidos.length,
      qtdFinalizados: finalizados.length, qtdCancelados: cancelados.length, ticketMedio,
      pagamentoDinheiro: porPagamento('dinheiro'), pagamentoPix: porPagamento('pix'),
      pagamentoCartao: porPagamento('cartao'), pagamentoNaoInformado: porPagamento('nao_informado'),
      custoTotal, lucroBruto, lucroLiquido, receitaProdutos, taxaEntrega,
      totalEntradas: entradas, totalSaidas: saidas, saldoCaixa: entradas - saidas, totalFinalizados,
    };
  }, [finalizados, cancelados, pedidosNoPeriodo, movNoPeriodo]);

  const filtrados = useMemo(() => {
    let f = [...pedidosNoPeriodo];
    if (filtroStatus) f = f.filter(p => p.status === filtroStatus);
    return f;
  }, [pedidosNoPeriodo, filtroStatus]);

  // Chart data
  const vendasPorDia = useMemo(() => {
    const dias: Record<string, number> = {};
    finalizados.forEach(p => {
      const dia = new Date(p.created_at).toLocaleDateString('pt-BR');
      dias[dia] = (dias[dia] || 0) + Number(p.total);
    });
    return Object.entries(dias).sort(([a], [b]) => a.localeCompare(b)).map(([dia, valor]) => ({ dia, valor }));
  }, [finalizados]);

  const entradasSaidasChart = useMemo(() => {
    const dias: Record<string, { entrada: number; saida: number }> = {};
    const percorrer = periodoInicio.getTime();
    const ate = periodoFim.getTime();
    for (let d = percorrer; d <= ate; d += 86400000) {
      const key = new Date(d).toLocaleDateString('pt-BR');
      dias[key] = { entrada: 0, saida: 0 };
    }
    movNoPeriodo.forEach(m => {
      const key = new Date(m.data_movimentacao).toLocaleDateString('pt-BR');
      if (!dias[key]) dias[key] = { entrada: 0, saida: 0 };
      if (['entrada', 'venda', 'suprimento', 'ajuste'].includes(m.tipo)) dias[key].entrada += Number(m.valor);
      else dias[key].saida += Number(m.valor);
    });
    return Object.entries(dias).sort(([a], [b]) => a.localeCompare(b)).map(([dia, v]) => ({ dia, ...v }));
  }, [movNoPeriodo, periodoInicio, periodoFim]);

  const pagamentoChart = useMemo(() => [
    { name: 'Dinheiro', value: stats.pagamentoDinheiro, color: PAGAMENTO_CORES.dinheiro },
    { name: 'Pix', value: stats.pagamentoPix, color: PAGAMENTO_CORES.pix },
    { name: 'Cartão', value: stats.pagamentoCartao, color: PAGAMENTO_CORES.cartao },
    { name: 'N/Informado', value: stats.pagamentoNaoInformado, color: PAGAMENTO_CORES.nao_informado },
  ].filter(d => d.value > 0), [stats]);

  const statusChart = useMemo(() => [
    { name: 'Finalizados', value: finalizados.length, color: '#10b981' },
    { name: 'Cancelados', value: cancelados.length, color: '#ef4444' },
    { name: 'Em Preparo', value: pedidosNoPeriodo.filter(p => p.status === 'em_preparo').length, color: '#3b82f6' },
    { name: 'Novos', value: pedidosNoPeriodo.filter(p => p.status === 'novo' || p.status === 'aberto').length, color: '#f59e0b' },
  ].filter(d => d.value > 0), [pedidosNoPeriodo, finalizados, cancelados]);

  const lucroChart = useMemo(() => {
    const dias: Record<string, { receita: number; custo: number; taxa: number }> = {};
    finalizados.forEach(p => {
      const dia = new Date(p.created_at).toLocaleDateString('pt-BR');
      if (!dias[dia]) dias[dia] = { receita: 0, custo: 0, taxa: 0 };
      dias[dia].receita += (p.itens || []).reduce((s, i) => s + Number(i.subtotal || i.quantidade * i.preco_unitario), 0);
      dias[dia].custo += (p.itens || []).reduce((s, i) => s + getCustoTotalItem(i), 0);
      dias[dia].taxa += Number(p.taxa_entrega || 0);
    });
    return Object.entries(dias).sort(([a], [b]) => a.localeCompare(b)).map(([dia, v]) => ({ dia, lucro: v.receita - v.custo + v.taxa }));
  }, [finalizados]);

  const produtosRanking = useMemo(() => {
    const map: Record<string, { nome: string; qtd: number; receita: number; custo: number; margem: number }> = {};
    finalizados.forEach(p => (p.itens || []).forEach(i => {
      const nome = i.product_name || (i.produtos as Record<string, unknown>)?.nome || 'Produto';
      if (!map[nome]) map[nome] = { nome, qtd: 0, receita: 0, custo: 0, margem: 0 };
      const custo = getCustoTotalItem(i);
      map[nome].qtd += Number(i.quantidade);
      map[nome].receita += Number(i.subtotal || i.quantidade * i.preco_unitario);
      map[nome].custo += custo;
    }));
    return Object.values(map).sort((a, b) => b.receita - a.receita).slice(0, 10).map(p => ({ ...p, margem: p.receita > 0 ? (p.receita - p.custo) / p.receita : 0 }));
  }, [finalizados]);

  const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  const formatDate = (d: string) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(d));
  const formatDateShort = (d: string) => new Date(d).toLocaleDateString('pt-BR');
  const formatPercent = (v: number) => `${(v * 100).toFixed(1)}%`;

  const getStatusLabel = (s: string) => ({ novo: 'Novo', aberto: 'Aberto', em_preparo: 'Em Preparo', pronto: 'Finalizado', entregue: 'Entregue', cancelado: 'Cancelado' }[s] || s);
  const getStatusColor = (s: string) => ({ novo: 'bg-yellow-100 text-yellow-700', aberto: 'bg-yellow-100 text-yellow-700', em_preparo: 'bg-blue-100 text-blue-700', pronto: 'bg-green-100 text-green-700', entregue: 'bg-gray-100 text-gray-700', cancelado: 'bg-red-100 text-red-700' }[s] || 'bg-gray-100 text-gray-700');

  const MOV_TIPO_LABEL: Record<string, string> = { entrada: 'Entrada', saida: 'Saída', sangria: 'Sangria', suprimento: 'Suprimento', venda: 'Venda', ajuste: 'Ajuste' };
  const MOV_TIPO_COLOR: Record<string, string> = { entrada: 'bg-green-100 text-green-700', saida: 'bg-red-100 text-red-700', sangria: 'bg-orange-100 text-orange-700', suprimento: 'bg-blue-100 text-blue-700', venda: 'bg-emerald-100 text-emerald-700', ajuste: 'bg-yellow-100 text-yellow-700' };
  const MOV_TIPO_ICON = { entrada: ArrowUpCircle, saida: ArrowDownCircle, sangria: ArrowDownCircle, suprimento: ArrowUpCircle, venda: TrendingUp, ajuste: AlertTriangle };

  function matchTipoFilter(m: MovimentacaoCaixa, filter: string): boolean {
    if (!filter) return true;
    if (filter === 'entrada') return ['entrada', 'suprimento', 'venda', 'ajuste'].includes(m.tipo);
    if (filter === 'saida') return ['saida', 'sangria'].includes(m.tipo);
    return m.tipo === filter;
  }

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) => {
    if (!active || !payload) return null;
    return (
      <div className="bg-white shadow-lg rounded-lg p-3 border text-sm">
        <p className="font-medium text-gray-700 mb-1">{label}</p>
        {payload.map((p, i) => <p key={i} className="text-gray-600">{formatCurrency(p.value)}</p>)}
      </div>
    );
  };

  async function handleSalvarCaixa() {
    const valor = parseFloat(caixaForm.valor);
    if (!valor || valor <= 0) { alert('Valor deve ser positivo.'); return; }
    if (!caixaForm.descricao.trim()) { alert('Descrição é obrigatória.'); return; }
    if (!caixaForm.data_movimentacao) { alert('Data é obrigatória.'); return; }

    setCaixaLoading(true);
    const payload: Record<string, unknown> = {
      tipo: caixaTipo,
      valor,
      descricao: caixaForm.descricao.trim(),
      categoria: caixaForm.categoria || null,
      forma_pagamento: caixaForm.forma_pagamento,
      observacao: caixaForm.observacao || null,
      data_movimentacao: caixaForm.data_movimentacao,
    };
    if (!caixaEditId && caixaAberto) {
      payload.caixa_id = caixaAberto.id;
    }

    try {
      if (caixaEditId) {
        const { error } = await supabase.from('movimentacoes_caixa').update(payload).eq('id', caixaEditId);
        if (error) {
          if (import.meta.env.DEV) console.error('Erro ao atualizar movimentação:', error);
          alert('Erro ao salvar. Tente novamente.');
          return;
        }
      } else {
        const { error } = await supabase.from('movimentacoes_caixa').insert(payload);
        if (error) {
          if (import.meta.env.DEV) console.error('Erro ao inserir movimentação:', error);
          alert('Erro ao salvar. Tente novamente.');
          return;
        }
      }
    } catch (e) {
      if (import.meta.env.DEV) console.error('Erro ao salvar movimentação:', e);
      alert('Erro ao salvar. Tente novamente.');
      return;
    } finally {
      setCaixaLoading(false);
    }

    setShowCaixaModal(false);
    setCaixaEditId(null);
    setCaixaForm({ valor: '', descricao: '', categoria: '', forma_pagamento: 'dinheiro', data_movimentacao: new Date().toISOString().split('T')[0], observacao: '' });
    const { data: refreshData, error: refreshError } = await supabase.from('movimentacoes_caixa').select('*').order('data_movimentacao', { ascending: false });
    if (refreshError) {
      if (import.meta.env.DEV) console.error('Erro ao recarregar movimentações:', refreshError);
      alert('Erro ao recarregar dados. Atualize a página.');
      return;
    }
    if (refreshData) setMovimentacoes(refreshData);
  }

  async function handleExcluirMov(id: string) {
    if (!confirm('Tem certeza que deseja excluir esta movimentação?')) return;
    const { error } = await supabase.from('movimentacoes_caixa').delete().eq('id', id);
    if (error) {
      if (import.meta.env.DEV) console.error('Erro ao excluir:', error);
      alert('Erro ao excluir. Tente novamente.');
      return;
    }
    setMovimentacoes(m => m.filter(x => x.id !== id));
  }

  function abrirEditarMov(m: MovimentacaoCaixa) {
    if (!['entrada', 'saida'].includes(m.tipo)) {
      alert('Movimentações do tipo ' + MOV_TIPO_LABEL[m.tipo] + ' não podem ser editadas manualmente.');
      return;
    }
    setCaixaTipo(m.tipo);
    setCaixaEditId(m.id);
    setCaixaForm({
      valor: String(m.valor),
      descricao: m.descricao,
      categoria: m.categoria || '',
      forma_pagamento: m.forma_pagamento,
      data_movimentacao: m.data_movimentacao,
      observacao: m.observacao || '',
    });
    setShowCaixaModal(true);
  }

  async function handleLimparHistorico() {
    setLimparLoading(true); setLimparMensagem('');
    try {
      const limite = new Date();
      if (limparDias > 0) limite.setDate(limite.getDate() - limparDias);
      else limite.setFullYear(2000, 0, 1);

      // Fetch all pedidos (unfiltered) for cleanup
      const { data: todosPedidos } = await supabase
        .from('pedidos')
        .select('*, itens_pedido(*, produtos(*))')
        .in('tipo', ['atendimento', 'delivery', 'online']);
      const pedidosParaLimpar = (todosPedidos || []).map(p => ({
        ...p,
        itens: (p as Record<string, unknown>).itens_pedido,
      })) as Pedido[];

      const { data: todasMovs } = await supabase
        .from('movimentacoes_caixa')
        .select('*');
      const movsParaLimpar = (todasMovs || []) as MovimentacaoCaixa[];

      const aDeletar = pedidosParaLimpar.filter(p => {
        if (!['pronto', 'entregue', 'cancelado'].includes(p.status)) return false;
        if (limparDias > 0 && new Date(p.created_at) >= limite) return false;
        return true;
      });
      if (aDeletar.length === 0) { setLimparMensagem('Nenhum pedido encontrado.'); setLimparLoading(false); return; }

      const fins = aDeletar.filter(p => p.status === 'pronto' || p.status === 'entregue');
      const totalFins = fins.reduce((s, p) => s + Number(p.total), 0);
      const receitaFins = fins.reduce((s, p) => s + (p.itens || []).reduce((si, i) => si + Number(i.subtotal || i.quantidade * i.preco_unitario), 0), 0);
      const taxaFins = fins.reduce((s, p) => s + Number(p.taxa_entrega || 0), 0);
      const porPag = (st: string) => fins.filter(p => (p.forma_pagamento || 'nao_informado') === st).reduce((s, p) => s + Number(p.total), 0);
      const custoDel = fins.reduce((s, p) => s + (p.itens || []).reduce((si, i) => si + getCustoTotalItem(i), 0), 0);
      const entradasDel = movsParaLimpar.filter(m => {
        if (!['entrada', 'venda', 'suprimento', 'ajuste'].includes(m.tipo)) return false;
        const d = new Date(m.data_movimentacao); d.setHours(0, 0, 0, 0);
        return d < limite;
      }).reduce((s, m) => s + Number(m.valor), 0);
      const saidasDel = movsParaLimpar.filter(m => {
        if (!['saida', 'sangria'].includes(m.tipo)) return false;
        const d = new Date(m.data_movimentacao); d.setHours(0, 0, 0, 0);
        return d < limite;
      }).reduce((s, m) => s + Number(m.valor), 0);

      const resumo = {
        periodo_inicio: new Date(Math.min(...aDeletar.map(p => new Date(p.created_at).getTime()))).toISOString().split('T')[0],
        periodo_fim: new Date(Math.max(...aDeletar.map(p => new Date(p.created_at).getTime()))).toISOString().split('T')[0],
        total_vendido: totalFins, total_pedidos: aDeletar.length,
        total_finalizados: fins.length, total_cancelados: aDeletar.filter(p => p.status === 'cancelado').length,
        ticket_medio: fins.length > 0 ? totalFins / fins.length : 0,
        total_entradas: entradasDel, total_saidas: saidasDel, saldo_caixa: entradasDel - saidasDel,
        lucro_bruto: receitaFins - custoDel, lucro_liquido: receitaFins - custoDel + taxaFins + entradasDel - saidasDel,
        dinheiro: porPag('dinheiro'), pix: porPag('pix'), cartao: porPag('cartao'), nao_informado: porPag('nao_informado'),
      };

      const { error: saveErr } = await supabase.from('financeiro_resumos').insert(resumo);
      if (saveErr) { setLimparMensagem('Erro ao salvar resumo.'); setLimparLoading(false); return; }

      const ids = aDeletar.map(p => p.id);
      const { error: delErr } = await supabase.from('pedidos').delete().in('id', ids);
      if (delErr) { setLimparMensagem('Erro ao deletar pedidos.'); setLimparLoading(false); return; }

      setLimparMensagem(`${aDeletar.length} pedido(s) removido(s)!`);
      setShowLimparModal(false);
      loadData();
    } catch { setLimparMensagem('Erro inesperado.'); }
    setLimparLoading(false);
  }

  function escapeCSV(value: unknown): string {
    const str = String(value ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  async function loadCaixaAberto() {
    const caixa = await buscarCaixaAberto();
    setCaixaAberto(caixa);
  }

  function getSaldoCaixa(): number {
    if (!caixaAberto) return 0;
    const entradas = movimentacoes
      .filter(m => m.caixa_id === caixaAberto.id && (m.tipo === 'entrada' || m.tipo === 'venda' || m.tipo === 'suprimento'))
      .reduce((s, m) => s + Number(m.valor), 0);
    const saidas = movimentacoes
      .filter(m => m.caixa_id === caixaAberto.id && (m.tipo === 'saida' || m.tipo === 'sangria'))
      .reduce((s, m) => s + Number(m.valor), 0);
    return Number(caixaAberto.saldo_inicial) + entradas - saidas;
  }

  async function handleAbrirCaixa() {
    const saldoInicial = parseFloat(abrirCaixaForm.saldo_inicial) || 0;
    setShowAbrirCaixaModal(false);
    const { error } = await supabase.from('caixas').insert({
      saldo_inicial: saldoInicial,
      observacao: abrirCaixaForm.observacao || null,
    });
    if (error) {
      if (import.meta.env.DEV) console.error('Erro ao abrir caixa:', error);
      alert('Erro ao abrir caixa. Tente novamente.');
      return;
    }
    setAbrirCaixaForm({ saldo_inicial: '', observacao: '' });
    await loadData();
    await loadCaixaAberto();
  }

  async function handleFecharCaixa() {
    if (!caixaAberto) return;
    const saldoFinal = getSaldoCaixa();
    setShowFecharCaixaModal(false);
    const { error } = await supabase.from('caixas').update({
      fechado_em: new Date().toISOString(),
      saldo_final: saldoFinal,
      observacao: fecharCaixaForm.observacao || null,
    }).eq('id', caixaAberto.id);
    if (error) {
      if (import.meta.env.DEV) console.error('Erro ao fechar caixa:', error);
      alert('Erro ao fechar caixa. Tente novamente.');
      return;
    }
    setFecharCaixaForm({ observacao: '' });
    setCaixaAberto(null);
    await loadData();
  }

  async function handleSangriaSuprimento() {
    const valor = parseFloat(sangriaSuprimentoForm.valor);
    if (!valor || valor <= 0) { alert('Valor deve ser positivo.'); return; }
    if (!sangriaSuprimentoForm.descricao.trim()) { alert('Descrição é obrigatória.'); return; }
    if (!caixaAberto) { alert('Nenhum caixa aberto.'); return; }
    setShowSangriaSuprimentoModal(false);
    const { error } = await supabase.from('movimentacoes_caixa').insert({
      tipo: sangriaSuprimentoTipo,
      valor,
      descricao: sangriaSuprimentoForm.descricao.trim(),
      categoria: sangriaSuprimentoTipo === 'sangria' ? 'Sangria' : 'Suprimento',
      forma_pagamento: 'dinheiro',
      data_movimentacao: new Date().toISOString().split('T')[0],
      caixa_id: caixaAberto.id,
    });
    if (error) {
      if (import.meta.env.DEV) console.error('Erro ao registrar:', error);
      alert('Erro ao registrar. Tente novamente.');
      return;
    }
    setSangriaSuprimentoForm({ valor: '', descricao: '' });
    await loadData();
  }

  async function handleSincronizarVendas() {
    if (!caixaAberto) { alert('Abra o caixa primeiro.'); return; }
    const { sincronizadas, erro } = await sincronizarVendasCaixa();
    if (erro) {
      alert('Erro ao sincronizar: ' + erro);
      return;
    }
    alert(`${sincronizadas} venda(s) sincronizada(s) com o caixa!`);
    await loadData();
  }

  function exportarCSV() {
    const cabecalhos = ['Data', 'Cliente', 'Tipo', 'Status', 'Pagamento', 'Receita Produtos', 'Taxa Entrega', 'Total', 'Custo Produtos', 'Lucro Bruto', 'Lucro Líquido'];
    const rows = [cabecalhos.map(escapeCSV).join(',')];

    filtrados.forEach(p => {
      const custo = (p.itens || []).reduce((s, i) => s + getCustoTotalItem(i), 0);
      const receita = (p.itens || []).reduce((s, i) => s + Number(i.subtotal || i.quantidade * i.preco_unitario), 0);
      rows.push([
        escapeCSV(new Date(p.created_at).toISOString().split('T')[0]),
        escapeCSV(p.nome_cliente || (p.mesa ? 'Mesa ' + p.mesa : 'Sem nome')),
        escapeCSV(p.tipo),
        escapeCSV(p.status),
        escapeCSV(p.forma_pagamento || 'nao_informado'),
        escapeCSV(formatCurrency(receita).replace('R$', '').trim()),
        escapeCSV(formatCurrency(p.taxa_entrega || 0).replace('R$', '').trim()),
        escapeCSV(formatCurrency(p.total).replace('R$', '').trim()),
        escapeCSV(formatCurrency(custo).replace('R$', '').trim()),
        escapeCSV(formatCurrency(receita - custo).replace('R$', '').trim()),
        escapeCSV(formatCurrency(p.total - custo).replace('R$', '').trim()),
      ].join(','));
    });

    // BOM for Excel encoding
    const bom = '\uFEFF';
    const blob = new Blob([bom + rows.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `financeiro_${new Date().toISOString().split('T')[0]}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
    </div>
  );

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-green-500" />
            Financeiro
          </h2>
          <p className="text-gray-500 text-sm">Dashboard financeiro completo</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportarCSV} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium">
            <Download className="w-4 h-4" /> Exportar CSV
          </button>
          <button onClick={() => { setShowLimparModal(true); setLimparMensagem(''); }} className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium">
            <Trash2 className="w-4 h-4" /> Limpar Histórico
          </button>
        </div>
      </div>

      {/* Caixa Status */}
      <Card>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${caixaAberto ? 'bg-green-100' : 'bg-gray-100'}`}>
              <Wallet className={`w-6 h-6 ${caixaAberto ? 'text-green-600' : 'text-gray-400'}`} />
            </div>
            <div>
              <h3 className="font-bold text-gray-800">
                Caixa {caixaAberto ? 'Aberto' : 'Fechado'}
              </h3>
              <p className="text-sm text-gray-500">
                {caixaAberto
                  ? `Aberto em ${new Date(caixaAberto.aberto_em).toLocaleString('pt-BR')}`
                  : 'Nenhum caixa aberto no momento'}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {caixaAberto ? (
              <>
                <button onClick={() => { setSangriaSuprimentoTipo('sangria'); setSangriaSuprimentoForm({ valor: '', descricao: '' }); setShowSangriaSuprimentoModal(true); }}
                  className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors flex items-center gap-1.5">
                  <ArrowDownCircle className="w-4 h-4" /> Sangria
                </button>
                <button onClick={() => { setSangriaSuprimentoTipo('suprimento'); setSangriaSuprimentoForm({ valor: '', descricao: '' }); setShowSangriaSuprimentoModal(true); }}
                  className="px-4 py-2 bg-green-50 text-green-600 border border-green-200 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors flex items-center gap-1.5">
                  <ArrowUpCircle className="w-4 h-4" /> Suprimento
                </button>
                <button onClick={handleSincronizarVendas}
                  className="px-4 py-2 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors flex items-center gap-1.5">
                  <ShoppingCart className="w-4 h-4" /> Sinc. Vendas
                </button>
                <button onClick={() => { setFecharCaixaForm({ observacao: '' }); setShowFecharCaixaModal(true); }}
                  className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg text-sm font-medium hover:shadow-md transition-all flex items-center gap-1.5">
                  <Wallet className="w-4 h-4" /> Fechar Caixa
                </button>
              </>
            ) : (
              <button onClick={() => { setAbrirCaixaForm({ saldo_inicial: '', observacao: '' }); setShowAbrirCaixaModal(true); }}
                className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-lg text-sm font-medium hover:shadow-md transition-all flex items-center gap-1.5">
                <Plus className="w-4 h-4" /> Abrir Caixa
              </button>
            )}
          </div>
        </div>
        {caixaAberto && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-gray-100">
            <div className="text-center">
              <p className="text-xs text-gray-500">Saldo Inicial</p>
              <p className="text-base font-bold text-gray-800">{formatCurrency(Number(caixaAberto.saldo_inicial))}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500">Entradas + Vendas</p>
              <p className="text-base font-bold text-green-600">
                {formatCurrency(movimentacoes.filter(m => m.caixa_id === caixaAberto.id && (m.tipo === 'entrada' || m.tipo === 'venda' || m.tipo === 'suprimento')).reduce((s, m) => s + Number(m.valor), 0))}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500">Saídas + Sangrias</p>
              <p className="text-base font-bold text-red-600">
                {formatCurrency(movimentacoes.filter(m => m.caixa_id === caixaAberto.id && (m.tipo === 'saida' || m.tipo === 'sangria')).reduce((s, m) => s + Number(m.valor), 0))}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500">Saldo Atual</p>
              <p className={`text-base font-bold ${getSaldoCaixa() >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {formatCurrency(getSaldoCaixa())}
              </p>
            </div>
          </div>
        )}
      </Card>

      {/* Period Filters */}
      <Card>
        <div className="flex flex-wrap gap-2 mb-4">
          {periodos.map(p => (
            <button key={p.key} onClick={() => { setPeriodoFiltro(p.key); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${periodoFiltro === p.key ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-4 items-end">
          <div><label className="block text-xs text-gray-500 mb-1">Data Início</label>
            <input type="date" value={dataInicio} onChange={e => { setDataInicio(e.target.value); setPeriodoFiltro('personalizado'); }} className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-orange-500" /></div>
          <div><label className="block text-xs text-gray-500 mb-1">Data Fim</label>
            <input type="date" value={dataFim} onChange={e => { setDataFim(e.target.value); setPeriodoFiltro('personalizado'); }} className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-orange-500" /></div>
          <div><label className="block text-xs text-gray-500 mb-1">Status</label>
            <select value={filtroStatus} onChange={e => { setFiltroStatus(e.target.value); loadHistoryPage({ reset: true }); }} className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-orange-500">
              <option value="">Todos</option>
              <option value="pronto">Finalizados</option>
              <option value="cancelado">Cancelados</option>
              <option value="em_preparo">Em Preparo</option>
              <option value="novo">Novos</option>
            </select></div>
          <button onClick={() => { setFiltroStatus(''); setDataInicio(''); setDataFim(''); setPeriodoFiltro('30d'); }} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Limpar</button>
        </div>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
        <Card><div className="flex items-center gap-2 mb-1"><TrendingUp className="w-4 h-4 text-green-500" /><span className="text-xs text-gray-500">Vendido Hoje</span></div><p className="text-lg font-bold text-gray-800">{formatCurrency(stats.totalVendidoHoje)}</p></Card>
        <Card><div className="flex items-center gap-2 mb-1"><Calendar className="w-4 h-4 text-blue-500" /><span className="text-xs text-gray-500">Vendido no Mês</span></div><p className="text-lg font-bold text-gray-800">{formatCurrency(stats.totalVendidoMes)}</p></Card>
        <Card><div className="flex items-center gap-2 mb-1"><ShoppingCart className="w-4 h-4 text-purple-500" /><span className="text-xs text-gray-500">Pedidos Hoje</span></div><p className="text-lg font-bold text-gray-800">{stats.qtdPedidosHoje}</p></Card>
        <Card><div className="flex items-center gap-2 mb-1"><Target className="w-4 h-4 text-amber-500" /><span className="text-xs text-gray-500">Ticket Médio</span></div><p className="text-lg font-bold text-gray-800">{formatCurrency(stats.ticketMedio)}</p></Card>
        <Card><div className="flex items-center gap-2 mb-1"><CheckCircle className="w-4 h-4 text-green-500" /><span className="text-xs text-gray-500">Finalizados</span></div><p className="text-lg font-bold text-gray-800">{stats.qtdFinalizados}</p></Card>
        <Card><div className="flex items-center gap-2 mb-1"><XCircle className="w-4 h-4 text-red-500" /><span className="text-xs text-gray-500">Cancelados</span></div><p className="text-lg font-bold text-gray-800">{stats.qtdCancelados}</p></Card>
      </div>

      {/* Financial Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card className="border-l-4 border-emerald-400">
          <div className="flex items-center gap-2 mb-1"><TrendingUp className="w-4 h-4 text-emerald-500" /><span className="text-xs text-gray-500">Receita de Produtos</span></div>
          <p className="text-lg font-bold text-emerald-600">{formatCurrency(stats.receitaProdutos)}</p>
          <button onClick={() => setShowDetalheModal({ titulo: 'Receita de Produtos', dados: produtosRanking.filter(p => p.receita > 0).map(p => ({ label: p.nome, valor: formatCurrency(p.receita) })) })} className="text-xs text-blue-500 hover:underline mt-1">Ver Detalhes</button>
        </Card>
        <Card className="border-l-4 border-sky-400">
          <div className="flex items-center gap-2 mb-1">
            <Receipt className="w-4 h-4 text-sky-500" />
            <span className="text-xs text-gray-500" title="Soma de todas as taxas de entrega cobradas nos pedidos finalizados do período">Taxas de Entrega Recebidas</span>
            <Info className="w-3 h-3 text-gray-400" />
          </div>
          <p className="text-lg font-bold text-sky-600">{formatCurrency(stats.taxaEntrega)}</p>
          <button onClick={() => setShowDetalheModal({ titulo: 'Taxas de Entrega por Pedido', dados: finalizados.filter(p => Number(p.taxa_entrega) > 0).map(p => ({ label: `${p.nome_cliente || 'Mesa ' + p.mesa} - ${formatDateShort(p.created_at)}`, valor: formatCurrency(p.taxa_entrega || 0) })) })} className="text-xs text-blue-500 hover:underline mt-1">Ver Detalhes</button>
        </Card>
        <Card className="border-l-4 border-amber-400">
          <div className="flex items-center gap-2 mb-1"><TrendingDown className="w-4 h-4 text-amber-500" /><span className="text-xs text-gray-500" title="Custo total dos produtos vendidos (soma de custo_unitário × qtd)">Custo dos Produtos Vendidos</span></div>
          <p className="text-lg font-bold text-amber-600">{formatCurrency(stats.custoTotal)}</p>
          <button onClick={() => setShowDetalheModal({ titulo: 'Custo por Produto', dados: produtosRanking.filter(p => p.custo > 0).map(p => ({ label: p.nome, valor: formatCurrency(p.custo) })) })} className="text-xs text-blue-500 hover:underline mt-1">Ver Detalhes</button>
        </Card>
        <Card className="border-l-4 border-green-400">
          <div className="flex items-center gap-2 mb-1"><ArrowUpCircle className="w-4 h-4 text-green-500" /><span className="text-xs text-gray-500">Entradas (Caixa)</span></div>
          <p className="text-lg font-bold text-green-600">{formatCurrency(stats.totalEntradas)}</p>
          <button onClick={() => setShowDetalheModal({ titulo: 'Entradas por Categoria', dados: [...new Set(movNoPeriodo.filter(m => ['entrada', 'venda', 'suprimento', 'ajuste'].includes(m.tipo)).map(m => m.categoria || 'Sem categoria'))].map(cat => ({ label: cat, valor: formatCurrency(movNoPeriodo.filter(m => ['entrada', 'venda', 'suprimento', 'ajuste'].includes(m.tipo) && (m.categoria || 'Sem categoria') === cat).reduce((s, m) => s + Number(m.valor), 0)) })) })} className="text-xs text-blue-500 hover:underline mt-1">Ver Detalhes</button>
        </Card>
        <Card className="border-l-4 border-red-400">
          <div className="flex items-center gap-2 mb-1"><ArrowDownCircle className="w-4 h-4 text-red-500" /><span className="text-xs text-gray-500">Saídas (Caixa)</span></div>
          <p className="text-lg font-bold text-red-600">{formatCurrency(stats.totalSaidas)}</p>
          <button onClick={() => setShowDetalheModal({ titulo: 'Saídas por Categoria', dados: [...new Set(movNoPeriodo.filter(m => ['saida', 'sangria'].includes(m.tipo)).map(m => m.categoria || 'Sem categoria'))].map(cat => ({ label: cat, valor: formatCurrency(movNoPeriodo.filter(m => ['saida', 'sangria'].includes(m.tipo) && (m.categoria || 'Sem categoria') === cat).reduce((s, m) => s + Number(m.valor), 0)) })) })} className="text-xs text-blue-500 hover:underline mt-1">Ver Detalhes</button>
        </Card>
        <Card className="border-l-4 border-blue-400">
          <div className="flex items-center gap-2 mb-1"><Wallet className="w-4 h-4 text-blue-500" /><span className="text-xs text-gray-500">Saldo Operacional (Caixa)</span></div>
          <p className={`text-lg font-bold ${stats.saldoCaixa >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{formatCurrency(stats.saldoCaixa)}</p>
        </Card>
        <Card className="border-l-4 border-violet-400">
          <div className="flex items-center gap-2 mb-1"><PiggyBank className="w-4 h-4 text-violet-500" /><span className="text-xs text-gray-500" title="Receita de produtos - Custo dos produtos (sem considerar taxas ou caixa)">Margem Bruta (Produtos)</span></div>
          <p className={`text-lg font-bold ${stats.lucroBruto >= 0 ? 'text-violet-600' : 'text-red-600'}`}>{formatCurrency(stats.lucroBruto)}</p>
          <p className="text-xs text-gray-400">{stats.receitaProdutos > 0 ? formatPercent(stats.lucroBruto / stats.receitaProdutos) : '-'} margem</p>
          <button onClick={() => setShowDetalheModal({ titulo: 'Margem Bruta por Produto', dados: produtosRanking.map(p => ({ label: `${p.nome} (${formatPercent(p.margem)})`, valor: formatCurrency(p.receita - p.custo) })) })} className="text-xs text-blue-500 hover:underline mt-1">Ver Detalhes</button>
        </Card>
        <Card className="border-l-4 border-gray-400">
          <div className="flex items-center gap-2 mb-1"><BarChart3 className="w-4 h-4 text-gray-500" /><span className="text-xs text-gray-500" title="Margem Bruta + Taxas de Entrega + Entradas - Saídas de Caixa">Lucro Líquido Total</span></div>
          <p className={`text-lg font-bold ${stats.lucroLiquido >= 0 ? 'text-gray-800' : 'text-red-600'}`}>{formatCurrency(stats.lucroLiquido)}</p>
          <p className="text-xs text-gray-400">Bruto + Taxas + Caixa</p>
          <button onClick={() => setShowDetalheModal({ titulo: 'Composição do Lucro Líquido', dados: [
            { label: 'Margem Bruta (Produtos)', valor: formatCurrency(stats.lucroBruto) },
            { label: 'Taxas de Entrega Recebidas', valor: formatCurrency(stats.taxaEntrega) },
            { label: 'Entradas de Caixa', valor: formatCurrency(stats.totalEntradas) },
            { label: 'Saídas de Caixa', valor: formatCurrency(-stats.totalSaidas) },
          ] })} className="text-xs text-blue-500 hover:underline mt-1">Ver Detalhes</button>
        </Card>
      </div>

      {/* Payment Methods */}
      <Card>
        <h3 className="font-semibold text-gray-800 mb-4">Valor por Forma de Pagamento</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-green-50 rounded-lg p-3 text-center"><Banknote className="w-5 h-5 text-green-600 mx-auto mb-1" /><p className="text-xs text-gray-500">Dinheiro</p><p className="text-base font-bold text-green-600">{formatCurrency(stats.pagamentoDinheiro)}</p></div>
          <div className="bg-blue-50 rounded-lg p-3 text-center"><Smartphone className="w-5 h-5 text-blue-600 mx-auto mb-1" /><p className="text-xs text-gray-500">Pix</p><p className="text-base font-bold text-blue-600">{formatCurrency(stats.pagamentoPix)}</p></div>
          <div className="bg-purple-50 rounded-lg p-3 text-center"><CreditCard className="w-5 h-5 text-purple-600 mx-auto mb-1" /><p className="text-xs text-gray-500">Cartão</p><p className="text-base font-bold text-purple-600">{formatCurrency(stats.pagamentoCartao)}</p></div>
          <div className="bg-gray-50 rounded-lg p-3 text-center"><DollarSign className="w-5 h-5 text-gray-600 mx-auto mb-1" /><p className="text-xs text-gray-500">Não Informado</p><p className="text-base font-bold text-gray-600">{formatCurrency(stats.pagamentoNaoInformado)}</p></div>
        </div>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card><h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Vendas por Dia</h3>
          {vendasPorDia.length === 0 ? <p className="text-gray-400 text-sm text-center py-8">Nenhum dado no período</p> : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={vendasPorDia}><CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" /><XAxis dataKey="dia" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} tickFormatter={v => `R$${v}`} /><ReTooltip content={<CustomTooltip />} /><Bar dataKey="valor" fill="#f59e0b" radius={[4, 4, 0, 0]} /></BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card><h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2"><Wallet className="w-4 h-4" /> Entradas x Saídas</h3>
          {entradasSaidasChart.length === 0 ? <p className="text-gray-400 text-sm text-center py-8">Nenhuma movimentação</p> : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={entradasSaidasChart}><CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" /><XAxis dataKey="dia" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><ReTooltip content={<CustomTooltip />} /><Bar dataKey="entrada" fill="#10b981" radius={[4, 4, 0, 0]} name="Entrada" /><Bar dataKey="saida" fill="#ef4444" radius={[4, 4, 0, 0]} name="Saída" /></BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card><h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2"><PieChart className="w-4 h-4" /> Forma de Pagamento</h3>
          {pagamentoChart.length === 0 ? <p className="text-gray-400 text-sm text-center py-8">Nenhum dado no período</p> : (
            <ResponsiveContainer width="100%" height={250}>
              <RePieChart><Pie data={pagamentoChart} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>{pagamentoChart.map((e, i) => <Cell key={i} fill={e.color} />)}</Pie><ReTooltip /></RePieChart>
              <div className="flex flex-wrap justify-center gap-3 mt-2">{pagamentoChart.map(p => <div key={p.name} className="flex items-center gap-1.5 text-xs text-gray-600"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />{p.name}</div>)}</div>
              </ResponsiveContainer>
            )}
          </Card>

          <Card><h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Status dos Pedidos</h3>
            {statusChart.length === 0 ? <p className="text-gray-400 text-sm text-center py-8">Nenhum dado no período</p> : (
              <ResponsiveContainer width="100%" height={250}>
                <RePieChart><Pie data={statusChart} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>{statusChart.map((e, i) => <Cell key={i} fill={e.color} />)}</Pie><ReTooltip /></RePieChart>
              <div className="flex flex-wrap justify-center gap-3 mt-2">{statusChart.map(p => <div key={p.name} className="flex items-center gap-1.5 text-xs text-gray-600"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />{p.name}</div>)}</div>
              </ResponsiveContainer>
            )}
          </Card>

        <Card><h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2"><PiggyBank className="w-4 h-4" /> Lucro no Período</h3>
          {lucroChart.length === 0 ? <p className="text-gray-400 text-sm text-center py-8">Nenhum dado no período</p> : (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={lucroChart}><CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" /><XAxis dataKey="dia" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><ReTooltip content={<CustomTooltip />} /><Line type="monotone" dataKey="lucro" stroke="#8b5cf6" strokeWidth={2} dot={{ fill: '#8b5cf6', r: 3 }} /></LineChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Products Ranking */}
      <Card>
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2"><Package className="w-4 h-4" /> Produtos Mais Vendidos</h3>
        {produtosRanking.length === 0 ? <p className="text-gray-400 text-sm text-center py-8">Nenhum produto vendido no período</p> : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr><th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">#</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Produto</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Qtd</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Receita</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Custo</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Lucro</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Margem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {produtosRanking.map((p, i) => (
                  <tr key={p.nome} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-400">{i + 1}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{p.nome}</td>
                    <td className="px-4 py-3 text-right text-sm text-gray-600">{p.qtd}</td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-green-600">{formatCurrency(p.receita)}</td>
                    <td className="px-4 py-3 text-right text-sm text-amber-600">{formatCurrency(p.custo)}</td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-violet-600">{formatCurrency(p.receita - p.custo)}</td>
                    <td className="px-4 py-3 text-right text-sm font-medium">{p.receita > 0 ? <span className={p.margem >= 0.3 ? 'text-emerald-600' : p.margem >= 0.15 ? 'text-amber-600' : 'text-red-600'}>{formatPercent(p.margem)}</span> : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Administrative Financial Analysis */}
      <Card>
        <details className="group">
          <summary className="flex items-center justify-between cursor-pointer list-none">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-indigo-500" /> Administrativo Financeiro</h3>
            <ChevronDown className="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform" />
          </summary>
          <div className="mt-4 space-y-4">
            {/* Margins */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-indigo-50 rounded-xl p-4">
                <p className="text-xs text-indigo-500 font-medium uppercase">Margem Bruta</p>
                <p className="text-2xl font-bold text-indigo-700 mt-1">{stats.receitaProdutos > 0 ? formatPercent(stats.lucroBruto / stats.receitaProdutos) : '-'}</p>
                <p className="text-xs text-indigo-400 mt-1">Receita - Custo / Receita</p>
              </div>
              <div className="bg-violet-50 rounded-xl p-4">
                <p className="text-xs text-violet-500 font-medium uppercase">Margem Líquida</p>
                <p className="text-2xl font-bold text-violet-700 mt-1">{stats.totalFinalizados > 0 ? formatPercent(stats.lucroLiquido / stats.totalFinalizados) : '-'}</p>
                <p className="text-xs text-violet-400 mt-1">Lucro Líquido / Faturamento</p>
              </div>
              <div className="bg-amber-50 rounded-xl p-4">
                <p className="text-xs text-amber-500 font-medium uppercase">Custo %</p>
                <p className="text-2xl font-bold text-amber-700 mt-1">{stats.receitaProdutos > 0 ? formatPercent(stats.custoTotal / stats.receitaProdutos) : '-'}</p>
                <p className="text-xs text-amber-400 mt-1">Custo / Receita de Produtos</p>
              </div>
              <div className="bg-emerald-50 rounded-xl p-4">
                <p className="text-xs text-emerald-500 font-medium uppercase">Receita por Pedido</p>
                <p className="text-2xl font-bold text-emerald-700 mt-1">{formatCurrency(stats.ticketMedio)}</p>
                <p className="text-xs text-emerald-400 mt-1">Ticket médio do período</p>
              </div>
            </div>

            {/* Top & Bottom Products */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1"><TrendingUp className="w-4 h-4 text-green-500" /> Melhores Margens</h4>
                {produtosRanking.filter(p => p.qtd > 0).sort((a, b) => b.margem - a.margem).slice(0, 5).map((p, i) => (
                  <div key={i} className="flex justify-between items-center py-1.5 border-b border-gray-100 last:border-0">
                    <span className="text-sm text-gray-700">{p.nome}</span>
                    <span className={`text-sm font-medium ${p.margem >= 0.3 ? 'text-emerald-600' : p.margem >= 0.15 ? 'text-amber-600' : 'text-red-600'}`}>{formatPercent(p.margem)}</span>
                  </div>
                ))}
                {produtosRanking.length === 0 && <p className="text-sm text-gray-400">Nenhum produto vendido</p>}
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1"><TrendingDown className="w-4 h-4 text-red-500" /> Piores Margens</h4>
                {produtosRanking.filter(p => p.qtd > 0).sort((a, b) => a.margem - b.margem).slice(0, 5).map((p, i) => (
                  <div key={i} className="flex justify-between items-center py-1.5 border-b border-gray-100 last:border-0">
                    <span className="text-sm text-gray-700">{p.nome}</span>
                    <span className={`text-sm font-medium ${p.margem >= 0.3 ? 'text-emerald-600' : p.margem >= 0.15 ? 'text-amber-600' : 'text-red-600'}`}>{formatPercent(p.margem)}</span>
                  </div>
                ))}
                {produtosRanking.length === 0 && <p className="text-sm text-gray-400">Nenhum produto vendido</p>}
              </div>
            </div>

            {/* Financial Summary */}
            <div className="bg-gray-50 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Resumo do Período</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div><p className="text-gray-500">Faturamento Total</p><p className="font-bold text-gray-800">{formatCurrency(stats.totalFinalizados)}</p></div>
                <div><p className="text-gray-500">Receita Produtos</p><p className="font-bold text-gray-800">{formatCurrency(stats.receitaProdutos)}</p></div>
                <div><p className="text-gray-500">Taxas de Entrega</p><p className="font-bold text-gray-800">{formatCurrency(stats.taxaEntrega)}</p></div>
                <div><p className="text-gray-500">Custo Produtos</p><p className="font-bold text-amber-600">{formatCurrency(stats.custoTotal)}</p></div>
                <div><p className="text-gray-500">Margem Bruta</p><p className="font-bold text-emerald-600">{formatCurrency(stats.lucroBruto)}</p></div>
                <div><p className="text-gray-500">Entradas (Caixa)</p><p className="font-bold text-green-600">{formatCurrency(stats.totalEntradas)}</p></div>
                <div><p className="text-gray-500">Saídas (Caixa)</p><p className="font-bold text-red-600">{formatCurrency(stats.totalSaidas)}</p></div>
                <div><p className="text-gray-500">Lucro Líquido</p><p className={`font-bold ${stats.lucroLiquido >= 0 ? 'text-gray-800' : 'text-red-600'}`}>{formatCurrency(stats.lucroLiquido)}</p></div>
              </div>
            </div>
          </div>
        </details>
      </Card>

      {/* Cash Flow Section */}
      <Card>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2"><Wallet className="w-4 h-4" /> Movimentações de Caixa</h3>
          <button onClick={() => { setCaixaTipo('entrada'); setCaixaEditId(null); setCaixaForm({ valor: '', descricao: '', categoria: '', forma_pagamento: 'dinheiro', data_movimentacao: new Date().toISOString().split('T')[0], observacao: '' }); setShowCaixaModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-lg text-sm font-medium hover:shadow-md transition-all">
            <Plus className="w-4 h-4" /> Nova Movimentação
          </button>
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          {['', 'entrada', 'saida'].map(t => (
            <button key={t} onClick={() => setFiltroMovTipo(t)}
               className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filtroMovTipo === t ? (t === 'entrada' ? 'bg-green-100 text-green-700' : t === 'saida' ? 'bg-red-100 text-red-700' : 'bg-gray-800 text-white') : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {t === '' ? 'Todas' : t === 'entrada' ? 'Entradas (+Vendas/Suprimentos)' : 'Saídas (+Sangrias)'}
            </button>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr><th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Data</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Tipo</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Descrição</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Categoria</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Pagamento</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Valor</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {movNoPeriodo.filter(m => matchTipoFilter(m, filtroMovTipo)).map(m => {
                const TipoIcon = MOV_TIPO_ICON[m.tipo] || ArrowDownCircle;
                return (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-500">{formatDateShort(m.data_movimentacao)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${MOV_TIPO_COLOR[m.tipo] || 'bg-gray-100 text-gray-700'}`}>
                      <TipoIcon className="w-3 h-3" />
                      {MOV_TIPO_LABEL[m.tipo] || m.tipo}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-800">{m.descricao}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{m.categoria || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{m.forma_pagamento}</td>
                  <td className={`px-4 py-3 text-right text-sm font-bold ${m.tipo === 'entrada' || m.tipo === 'venda' || m.tipo === 'suprimento' || m.tipo === 'ajuste' ? 'text-green-600' : 'text-red-600'}`}>
                    {(m.tipo === 'entrada' || m.tipo === 'venda' || m.tipo === 'suprimento') ? '+' : '-'}{formatCurrency(m.valor)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => abrirEditarMov(m)} className="p-2.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"><Edit3 className="w-5 h-5" /></button>
                      <button onClick={() => handleExcluirMov(m.id)} className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"><Trash2 className="w-5 h-5" /></button>
                    </div>
                  </td>
                </tr>
                );
              })}
              {movNoPeriodo.filter(m => matchTipoFilter(m, filtroMovTipo)).length === 0 && (
                <tr><td colSpan={7} className="text-center py-8 text-gray-400 text-sm">Nenhuma movimentação no período</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* History Table */}
      <Card>
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="font-semibold text-gray-800">Histórico de Pedidos ({filtrados.length})</h3>
          {historyPedidos.length > 0 && <span className="text-xs text-gray-400">Exibindo {historyPedidos.length} de {filtrados.length}</span>}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr><th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Data</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Cliente</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Tipo</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Pagamento</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Itens</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Lucro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {historyPedidos.map(p => {
                const custo = (p.itens || []).reduce((s, i) => s + getCustoTotalItem(i), 0);
                const receita = (p.itens || []).reduce((s, i) => s + Number(i.subtotal || i.quantidade * i.preco_unitario), 0);
                return (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{formatDate(p.created_at)}</td>
                    <td className="px-4 py-3"><p className="font-medium text-gray-800">{p.nome_cliente || 'Mesa ' + p.mesa}</p>{p.telefone && <p className="text-xs text-gray-500">{p.telefone}</p>}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 capitalize">{p.tipo}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(p.status)}`}>{getStatusLabel(p.status)}</span></td>
                    <td className="px-4 py-3 text-sm text-gray-500">{p.forma_pagamento || 'nao_informado'}</td>
                    <td className="px-4 py-3 text-center text-sm text-gray-600">{p.itens?.length || 0}</td>
                    <td className="px-4 py-3 text-right font-bold text-orange-600 whitespace-nowrap">{formatCurrency(p.total)}</td>
                    <td className="px-4 py-3 text-right text-sm font-medium whitespace-nowrap">{p.status === 'cancelado' ? <span className="text-red-500">-</span> : <span className={receita - custo >= 0 ? 'text-green-600' : 'text-red-600'}>{formatCurrency(receita - custo)}</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {historyPedidos.length === 0 && filtrados.length === 0 && <div className="text-center py-12"><Search className="w-12 h-12 text-gray-300 mx-auto mb-4" /><p className="text-gray-500">Nenhum pedido encontrado</p></div>}
        {historyHasMore && (
          <div className="p-4 text-center border-t">
            <button onClick={() => loadHistoryPage({ reset: false })} disabled={historyLoading} className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium flex items-center gap-2 mx-auto disabled:opacity-50">
              {historyLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Carregando...</>
              ) : (
                <><ChevronDown className="w-4 h-4" /> Carregar mais</>
              )}
            </button>
          </div>
        )}
      </Card>

      {/* Saved Summaries */}
      {resumos.length > 0 && (
        <Card>
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2"><Clock className="w-4 h-4 text-gray-400" /> Resumos Financeiros Salvos ({resumos.length})</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr><th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Período</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Vendido</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Pedidos</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Finalizados</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Cancelados</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Lucro</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Ticket</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {resumos.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-600">{formatDateShort(r.periodo_inicio)} - {formatDateShort(r.periodo_fim)}</td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-gray-800">{formatCurrency(r.total_vendido)}</td>
                    <td className="px-4 py-3 text-right text-sm text-gray-600">{r.total_pedidos}</td>
                    <td className="px-4 py-3 text-right text-sm text-gray-600">{r.total_finalizados}</td>
                    <td className="px-4 py-3 text-right text-sm text-gray-600">{r.total_cancelados}</td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-emerald-600">{formatCurrency(r.lucro_liquido)}</td>
                    <td className="px-4 py-3 text-right text-sm text-gray-600">{formatCurrency(r.ticket_medio)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Cash Flow Modal */}
      {showCaixaModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={caixaTipo === 'entrada' ? 'bg-green-100 p-2 rounded-lg' : 'bg-red-100 p-2 rounded-lg'}>
                  {caixaTipo === 'entrada' ? <ArrowUpCircle className="w-6 h-6 text-green-600" /> : <ArrowDownCircle className="w-6 h-6 text-red-600" />}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800">{caixaEditId ? 'Editar' : 'Nova'} Movimentação</h3>
                  <p className="text-sm text-gray-500">{caixaTipo === 'entrada' ? 'Registrar entrada de caixa' : 'Registrar saída de caixa'}</p>
                </div>
              </div>
              <button onClick={() => setShowCaixaModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>

            <div className="flex gap-2 mb-4">
              <button onClick={() => setCaixaTipo('entrada')} className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${caixaTipo === 'entrada' ? 'bg-green-500 text-white shadow-md' : 'bg-gray-100 text-gray-600'}`}>
                <ArrowUpCircle className="w-4 h-4 inline mr-1" /> Entrada
              </button>
              <button onClick={() => setCaixaTipo('saida')} className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${caixaTipo === 'saida' ? 'bg-red-500 text-white shadow-md' : 'bg-gray-100 text-gray-600'}`}>
                <ArrowDownCircle className="w-4 h-4 inline mr-1" /> Saída
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Valor *</label>
                <input type="number" step="0.01" min="0.01" placeholder="0,00" value={caixaForm.valor} onChange={e => setCaixaForm({ ...caixaForm, valor: e.target.value })} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Descrição *</label>
                <input type="text" placeholder="Ex: Compra de ingredientes" value={caixaForm.descricao} onChange={e => setCaixaForm({ ...caixaForm, descricao: e.target.value })} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Categoria</label>
                <select value={caixaForm.categoria} onChange={e => setCaixaForm({ ...caixaForm, categoria: e.target.value })} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 bg-white">
                  <option value="">Selecione</option>
                    {(categoriasMov.length > 0
                      ? categoriasMov.filter(c => c.tipo === caixaTipo).map(c => c.nome)
                      : (caixaTipo === 'entrada' ? FALLBACK_CATEGORIAS_ENTRADA : FALLBACK_CATEGORIAS_SAIDA)
                    ).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Forma de Pagamento *</label>
                <select value={caixaForm.forma_pagamento} onChange={e => setCaixaForm({ ...caixaForm, forma_pagamento: e.target.value })} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 bg-white">
                  <option value="dinheiro">Dinheiro</option>
                  <option value="pix">Pix</option>
                  <option value="cartao">Cartão</option>
                  <option value="outro">Outro</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Data *</label>
                <input type="date" value={caixaForm.data_movimentacao} onChange={e => setCaixaForm({ ...caixaForm, data_movimentacao: e.target.value })} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Observação</label>
                <textarea rows={2} placeholder="Observação opcional..." value={caixaForm.observacao} onChange={e => setCaixaForm({ ...caixaForm, observacao: e.target.value })} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500" />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowCaixaModal(false)} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50">Cancelar</button>
              <button onClick={handleSalvarCaixa} disabled={caixaLoading} className={`flex-1 px-4 py-2.5 text-white rounded-xl text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2 ${caixaTipo === 'entrada' ? 'bg-gradient-to-r from-emerald-500 to-green-600 hover:shadow-md' : 'bg-gradient-to-r from-red-500 to-rose-600 hover:shadow-md'}`}>
                {caixaLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>{caixaEditId ? 'Salvar' : 'Registrar'}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetalheModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowDetalheModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">{showDetalheModal.titulo}</h3>
              <button onClick={() => setShowDetalheModal(null)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="max-h-96 overflow-y-auto space-y-2">
              {showDetalheModal.dados.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-4">Nenhum dado disponível</p>
              ) : (
                showDetalheModal.dados.map((d, i) => (
                  <div key={i} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                    <span className="text-sm text-gray-700">{d.label}</span>
                    <span className="text-sm font-semibold text-gray-900">{d.valor}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Limpar Histórico Modal */}
      {showLimparModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-100 p-2 rounded-lg"><AlertTriangle className="w-6 h-6 text-red-600" /></div>
              <div><h3 className="text-lg font-bold text-gray-800">Limpar Histórico</h3><p className="text-sm text-gray-500">Remover pedidos antigos com segurança</p></div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
              <p className="text-sm text-amber-800"><strong>Atenção:</strong> Essa ação vai remover pedidos antigos, mas os totais financeiros consolidados serão preservados em resumo.</p>
            </div>
            <p className="text-sm font-medium text-gray-700 mb-3">Limpar pedidos com:</p>
            <div className="space-y-2 mb-6">
              {opcoesLimpar.map(op => (
                <label key={op.dias} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${limparDias === op.dias ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input type="radio" name="limparPeriodo" checked={limparDias === op.dias} onChange={() => setLimparDias(op.dias)} className="w-4 h-4 text-red-500" />
                  <span className="text-sm text-gray-700">{op.label}</span>
                </label>
              ))}
            </div>
            {limparMensagem && <div className={`p-3 rounded-xl mb-4 text-sm ${limparMensagem.includes('sucesso') || limparMensagem.includes('removido') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{limparMensagem}</div>}
            <div className="flex gap-3">
              <button onClick={() => { setShowLimparModal(false); setLimparMensagem(''); }} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50" disabled={limparLoading}>Cancelar</button>
              <button onClick={handleLimparHistorico} disabled={limparLoading} className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 disabled:opacity-50 flex items-center justify-center gap-2">
                {limparLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Trash2 className="w-4 h-4" /> Limpar</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Abrir Caixa Modal */}
      {showAbrirCaixaModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="bg-green-100 p-2 rounded-lg"><Wallet className="w-6 h-6 text-green-600" /></div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800">Abrir Caixa</h3>
                  <p className="text-sm text-gray-500">Iniciar novo movimento de caixa</p>
                </div>
              </div>
              <button onClick={() => setShowAbrirCaixaModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Saldo Inicial (R$)</label>
                <input type="number" step="0.01" min="0" placeholder="0,00" value={abrirCaixaForm.saldo_inicial} onChange={e => setAbrirCaixaForm(f => ({ ...f, saldo_inicial: e.target.value }))} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Observação</label>
                <input type="text" placeholder="Observação opcional..." value={abrirCaixaForm.observacao} onChange={e => setAbrirCaixaForm(f => ({ ...f, observacao: e.target.value }))} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowAbrirCaixaModal(false)} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50">Cancelar</button>
              <button onClick={handleAbrirCaixa} className="flex-1 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl text-sm font-medium hover:shadow-md">Abrir Caixa</button>
            </div>
          </div>
        </div>
      )}

      {/* Fechar Caixa Modal */}
      {showFecharCaixaModal && caixaAberto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="bg-orange-100 p-2 rounded-lg"><Wallet className="w-6 h-6 text-orange-600" /></div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800">Fechar Caixa</h3>
                  <p className="text-sm text-gray-500">Encerrar o movimento atual</p>
                </div>
              </div>
              <button onClick={() => setShowFecharCaixaModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 space-y-2 mb-4">
              <div className="flex justify-between text-sm"><span className="text-gray-500">Saldo Inicial</span><span className="font-medium">{formatCurrency(Number(caixaAberto.saldo_inicial))}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">Entradas + Vendas + Suprimentos</span><span className="font-medium text-green-600">{formatCurrency(movimentacoes.filter(m => m.caixa_id === caixaAberto.id && (m.tipo === 'entrada' || m.tipo === 'venda' || m.tipo === 'suprimento')).reduce((s, m) => s + Number(m.valor), 0))}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">Saídas + Sangrias</span><span className="font-medium text-red-600">{formatCurrency(movimentacoes.filter(m => m.caixa_id === caixaAberto.id && (m.tipo === 'saida' || m.tipo === 'sangria')).reduce((s, m) => s + Number(m.valor), 0))}</span></div>
              <div className="border-t pt-2 flex justify-between text-sm font-bold"><span>Saldo Final</span><span className={getSaldoCaixa() >= 0 ? 'text-emerald-600' : 'text-red-600'}>{formatCurrency(getSaldoCaixa())}</span></div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Observação (opcional)</label>
                <input type="text" placeholder="Observação..." value={fecharCaixaForm.observacao} onChange={e => setFecharCaixaForm(f => ({ ...f, observacao: e.target.value }))} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowFecharCaixaModal(false)} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50">Cancelar</button>
              <button onClick={handleFecharCaixa} className="flex-1 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl text-sm font-medium hover:shadow-md">Confirmar Fechamento</button>
            </div>
          </div>
        </div>
      )}

      {/* Sangria / Suprimento Modal */}
      {showSangriaSuprimentoModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={sangriaSuprimentoTipo === 'sangria' ? 'bg-red-100 p-2 rounded-lg' : 'bg-green-100 p-2 rounded-lg'}>
                  {sangriaSuprimentoTipo === 'sangria' ? <ArrowDownCircle className="w-6 h-6 text-red-600" /> : <ArrowUpCircle className="w-6 h-6 text-green-600" />}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800">{sangriaSuprimentoTipo === 'sangria' ? 'Sangria' : 'Suprimento'}</h3>
                  <p className="text-sm text-gray-500">{sangriaSuprimentoTipo === 'sangria' ? 'Retirada de valor do caixa' : 'Inserção de valor no caixa'}</p>
                </div>
              </div>
              <button onClick={() => setShowSangriaSuprimentoModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Valor (R$) *</label>
                <input type="number" step="0.01" min="0.01" placeholder="0,00" value={sangriaSuprimentoForm.valor} onChange={e => setSangriaSuprimentoForm(f => ({ ...f, valor: e.target.value }))} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Descrição *</label>
                <input type="text" placeholder={sangriaSuprimentoTipo === 'sangria' ? 'Ex: Retirada para contas' : 'Ex: Aporte de capital'} value={sangriaSuprimentoForm.descricao} onChange={e => setSangriaSuprimentoForm(f => ({ ...f, descricao: e.target.value }))} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowSangriaSuprimentoModal(false)} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50">Cancelar</button>
              <button onClick={handleSangriaSuprimento} className={`flex-1 px-4 py-2.5 text-white rounded-xl text-sm font-medium hover:shadow-md ${sangriaSuprimentoTipo === 'sangria' ? 'bg-gradient-to-r from-red-500 to-rose-600' : 'bg-gradient-to-r from-emerald-500 to-green-600'}`}>
                {sangriaSuprimentoTipo === 'sangria' ? 'Registrar Sangria' : 'Registrar Suprimento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
