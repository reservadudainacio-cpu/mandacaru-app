import { useState, useEffect } from 'react';
import { Plus, ArrowDownCircle, ArrowUpCircle, Package, Search, Filter, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Produto, MovimentacaoEstoque } from '../types';

export function EstoqueTab() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoEstoque[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState<'entrada' | 'saida' | ''>('');
  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState({
    produto_id: '',
    tipo: 'entrada' as 'entrada' | 'saida',
    quantidade: '',
    valor_unitario: '',
    motivo: '',
  });

  const [showProdutosEstoque, setShowProdutosEstoque] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [produtosRes, movRes] = await Promise.all([
        supabase.from('produtos').select('*, categorias(*)').order('nome'),
        supabase
          .from('movimentacoes_estoque')
          .select('*, produtos(*, categorias(*))')
          .order('created_at', { ascending: false })
          .limit(100),
      ]);

      if (produtosRes.error) {
        if (import.meta.env.DEV) console.error('Erro ao carregar produtos:', produtosRes.error);
        alert('Erro ao carregar lista de produtos.');
        setLoading(false);
        return;
      }
      if (movRes.error) {
        if (import.meta.env.DEV) console.error('Erro ao carregar movimentações:', movRes.error);
        alert('Erro ao carregar movimentações.');
        setLoading(false);
        return;
      }

      if (produtosRes.data) setProdutos(produtosRes.data);
      if (movRes.data) setMovimentacoes(movRes.data);
    } catch (e) {
      if (import.meta.env.DEV) console.error('Erro inesperado ao carregar dados:', e);
      alert('Erro ao carregar dados. Tente novamente.');
    }
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // ── Validações ──────────────────────────────────────────────
    const produto = produtos.find((p) => p.id === formData.produto_id);
    if (!produto) {
      alert('Selecione um produto.');
      return;
    }

    const quantidade = parseFloat(formData.quantidade);
    if (!quantidade || quantidade <= 0) {
      alert('Quantidade deve ser maior que zero.');
      return;
    }

    if (formData.tipo === 'saida' && produto.estoque_atual < quantidade) {
      alert(
        `Estoque insuficiente! Disponível: ${produto.estoque_atual} ${produto.unidade ?? 'un'}. Solicitação: ${quantidade}.`
      );
      return;
    }

    const valorUnitario = parseFloat(formData.valor_unitario) || null;
    const motivo = formData.motivo?.trim() || null;

    // ── Transação: insert movimentação + update estoque ─────────
    try {
      const { data: movCriada, error: movError } = await supabase
        .from('movimentacoes_estoque')
        .insert({
          produto_id: formData.produto_id,
          tipo: formData.tipo,
          quantidade,
          valor_unitario: valorUnitario,
          motivo,
        })
        .select()
        .single();

      if (movError) {
        if (import.meta.env.DEV) console.error('Erro ao inserir movimentação:', movError);
        alert('Erro ao registrar movimentação. Nada foi alterado.');
        return;
      }

      const novoEstoque =
        formData.tipo === 'entrada'
          ? produto.estoque_atual + quantidade
          : produto.estoque_atual - quantidade;

      const { error: upError } = await supabase
        .from('produtos')
        .update({ estoque_atual: novoEstoque })
        .eq('id', produto.id);

      if (upError) {
        if (import.meta.env.DEV) console.error('Erro ao atualizar estoque do produto:', upError);
        alert('Erro ao atualizar estoque do produto. Revertendo movimentação...');
        const { error: rollbackError } = await supabase
          .from('movimentacoes_estoque')
          .delete()
          .eq('id', movCriada.id);
        if (rollbackError) {
          if (import.meta.env.DEV) console.error('Falha na reversão — movimentação órfã (ID:', movCriada.id, '):', rollbackError);
          alert('Erro crítico: movimentação foi registrada mas estoque não foi atualizado. Contate o suporte técnico.');
        } else {
          alert('Movimentação revertida com sucesso.');
        }
        return;
      }

      // ── Sucesso ──────────────────────────────────────────────
      setShowModal(false);
      setFormData({
        produto_id: '',
        tipo: 'entrada',
        quantidade: '',
        valor_unitario: '',
        motivo: '',
      });
      alert('Movimentação registrada com sucesso!');
      loadData();
    } catch (e) {
      if (import.meta.env.DEV) console.error('Erro inesperado ao registrar movimentação:', e);
      alert('Erro inesperado. Tente novamente.');
    }
  }

  const movimentacoesFiltradas = movimentacoes.filter((mov) => {
    const matchTipo = !tipoFiltro || mov.tipo === tipoFiltro;
    const matchSearch =
      !searchTerm ||
      mov.produtos?.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mov.motivo?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchTipo && matchSearch;
  });

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return '-';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (date: string) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Entrada e Saída</h2>
          <p className="text-gray-500 text-sm">Controle de movimentação de estoque</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowProdutosEstoque(!showProdutosEstoque)}
            className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg shadow-sm hover:shadow-md transition-all"
          >
            <Package className="w-4 h-4" />
            Ver Estoque
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-all"
          >
            <Plus className="w-4 h-4" />
            Nova Movimentação
          </button>
        </div>
      </div>

      {showProdutosEstoque && (
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg">Estoque Atual</h3>
            <button
              onClick={() => setShowProdutosEstoque(false)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-h-64 overflow-y-auto">
            {produtos.map((produto) => (
              <div
                key={produto.id}
                className={`p-4 rounded-lg border ${
                  produto.estoque_atual <= 0
                    ? 'bg-red-50 border-red-200'
                    : produto.estoque_atual < 10
                    ? 'bg-yellow-50 border-yellow-200'
                    : 'bg-green-50 border-green-200'
                }`}
              >
                <p className="font-medium text-gray-800">{produto.nome}</p>
                <p className="text-sm text-gray-500">{produto.categorias?.nome}</p>
                <p className="text-2xl font-bold mt-2">
                  {produto.estoque_atual} <span className="text-sm font-normal">{produto.unidade}</span>
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-md p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por produto ou motivo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <button
              onClick={() => setTipoFiltro('')}
              className={`px-3 py-2 rounded-lg text-sm ${
                !tipoFiltro
                  ? 'bg-gray-800 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setTipoFiltro('entrada')}
              className={`px-3 py-2 rounded-lg text-sm flex items-center gap-1 ${
                tipoFiltro === 'entrada'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <ArrowDownCircle className="w-4 h-4" />
              Entradas
            </button>
            <button
              onClick={() => setTipoFiltro('saida')}
              className={`px-3 py-2 rounded-lg text-sm flex items-center gap-1 ${
                tipoFiltro === 'saida'
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <ArrowUpCircle className="w-4 h-4" />
              Saídas
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Data</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Tipo</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Produto</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Qtd</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Valor Un.</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Motivo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {movimentacoesFiltradas.map((mov) => (
                <tr key={mov.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {formatDate(mov.created_at)}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                        mov.tipo === 'entrada'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {mov.tipo === 'entrada' ? (
                        <ArrowDownCircle className="w-3 h-3" />
                      ) : (
                        <ArrowUpCircle className="w-3 h-3" />
                      )}
                      {mov.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-800">{mov.produtos?.nome}</p>
                      <p className="text-xs text-gray-500">{mov.produtos?.categorias?.nome}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right font-medium">
                    {mov.quantidade} {mov.produtos?.unidade}
                  </td>
                  <td className="px-6 py-4 text-right text-sm text-gray-500">
                    {formatCurrency(mov.valor_unitario)}
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-gray-700">
                    {mov.valor_unitario
                      ? formatCurrency(mov.quantidade * mov.valor_unitario)
                      : '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                    {mov.motivo || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {movimentacoesFiltradas.length === 0 && (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Nenhuma movimentação encontrada</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="text-lg font-semibold">Nova Movimentação</h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Produto *</label>
                <select
                  required
                  value={formData.produto_id}
                  onChange={(e) => setFormData({ ...formData, produto_id: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Selecione...</option>
                  {produtos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome} (Estoque: {p.estoque_atual} {p.unidade})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, tipo: 'entrada' })}
                    className={`p-3 rounded-lg border-2 flex items-center justify-center gap-2 ${
                      formData.tipo === 'entrada'
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <ArrowDownCircle className="w-5 h-5" />
                    Entrada
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, tipo: 'saida' })}
                    className={`p-3 rounded-lg border-2 flex items-center justify-center gap-2 ${
                      formData.tipo === 'saida'
                        ? 'border-red-500 bg-red-50 text-red-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <ArrowUpCircle className="w-5 h-5" />
                    Saída
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantidade *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.quantidade}
                    onChange={(e) => setFormData({ ...formData, quantidade: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valor Unitário
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.valor_unitario}
                    onChange={(e) => setFormData({ ...formData, valor_unitario: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Motivo</label>
                <input
                  type="text"
                  value={formData.motivo}
                  onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                  placeholder="Ex: Compra de fornecedor, Perda, Ajuste..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:shadow-md"
                >
                  Registrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
