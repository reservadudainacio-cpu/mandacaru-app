import { useState, useEffect } from 'react';
import { Plus, Truck, Trash2, ChefHat, CheckCircle, XCircle, Clock, Phone, MapPin, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Produto, Pedido, Categoria } from '../types';
import { registrarVendaPedido } from '../lib/caixa';

export function DeliveryTab() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNovoPedido, setShowNovoPedido] = useState(false);
  const [categoriaAtiva, setCategoriaAtiva] = useState<string>('');
  const [carrinho, setCarrinho] = useState<{ produto: Produto; quantidade: number; observacao: string }[]>([]);

  const [clienteData, setClienteData] = useState({
    nome: '',
    telefone: '',
    endereco: '',
    taxa_entrega: '',
    desconto: '',
    observacoes: '',
  });

  const [selectedPedido, setSelectedPedido] = useState<Pedido | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [produtosRes, categoriasRes, pedidosRes] = await Promise.all([
        supabase.from('produtos').select('*, categorias(*)').eq('ativo', true).order('nome'),
        supabase.from('categorias').select('*').order('ordem'),
        supabase
          .from('pedidos')
          .select('*, itens_pedido(*, produtos(*))')
          .eq('tipo', 'delivery')
          .order('created_at', { ascending: false }),
      ]);

      if (produtosRes.data) setProdutos(produtosRes.data);
      if (categoriasRes.data) {
        setCategorias(categoriasRes.data);
        if (categoriasRes.data.length > 0) {
          setCategoriaAtiva(categoriasRes.data[0].id);
        }
      }
      setPedidos((pedidosRes.data || []).map(p => ({ ...p, itens: (p as Record<string, unknown>).itens_pedido })) as Pedido[]);
    } catch (error) {
      if (import.meta.env.DEV) console.error('Erro ao carregar dados:', error);
      window.alert('Erro ao carregar dados. Tente novamente.');
    }
    setLoading(false);
  }

  function adicionarAoCarrinho(produto: Produto) {
    const existente = carrinho.find((item) => item.produto.id === produto.id);
    if (existente) {
      setCarrinho(
        carrinho.map((item) =>
          item.produto.id === produto.id
            ? { ...item, quantidade: item.quantidade + 1 }
            : item
        )
      );
    } else {
      setCarrinho([...carrinho, { produto, quantidade: 1, observacao: '' }]);
    }
  }

  function removerDoCarrinho(produtoId: string) {
    setCarrinho(carrinho.filter((item) => item.produto.id !== produtoId));
  }

  function atualizarQuantidade(produtoId: string, quantidade: number) {
    if (quantidade <= 0) {
      removerDoCarrinho(produtoId);
    } else {
      setCarrinho(
        carrinho.map((item) =>
          item.produto.id === produtoId ? { ...item, quantidade } : item
        )
      );
    }
  }

  function atualizarObservacao(produtoId: string, observacao: string) {
    setCarrinho(
      carrinho.map((item) =>
        item.produto.id === produtoId ? { ...item, observacao } : item
      )
    );
  }

  async function finalizarPedido() {
    if (carrinho.length === 0 || !clienteData.nome || !clienteData.telefone || !clienteData.endereco) return;

    const subtotal = carrinho.reduce(
      (sum, item) => sum + item.produto.preco * item.quantidade,
      0
    );
    const taxaEntrega = parseFloat(clienteData.taxa_entrega) || 0;
    const desconto = parseFloat(clienteData.desconto) || 0;
    const total = subtotal + taxaEntrega - desconto;

    const itensPayload = carrinho.map(item => ({
      produto_id: item.produto.id,
      quantidade: item.quantidade,
      preco_unitario: item.produto.preco,
      subtotal: item.produto.preco * item.quantidade,
      observacao: item.observacao || null,
      product_name: item.produto.nome,
      product_image_url: item.produto.imagem || null,
      custo_unitario: item.produto.custo || 0,
      custo_total: (item.produto.custo || 0) * item.quantidade,
      lucro_item: (item.produto.preco - (item.produto.custo || 0)) * item.quantidade,
    }));

    try {
      const { data, error } = await supabase.rpc('criar_pedido_completo', {
        p_pedido: {
          tipo: 'delivery',
          status: 'aberto',
          nome_cliente: clienteData.nome,
          telefone: clienteData.telefone,
          endereco: clienteData.endereco,
          tipo_entrega: 'delivery',
          taxa_entrega: taxaEntrega,
          desconto: desconto,
          subtotal,
          total,
          observacoes: clienteData.observacoes || null,
        },
        p_itens: itensPayload,
      });

      if (error || !data?.ok) {
        if (import.meta.env.DEV) console.error('Erro ao criar pedido:', error || data);
        window.alert('Erro ao criar pedido. Tente novamente.');
        return;
      }
    } catch (err) {
      if (import.meta.env.DEV) console.error('Erro ao finalizar pedido:', err);
      window.alert('Erro ao finalizar pedido. Tente novamente.');
      return;
    }

    setCarrinho([]);
    setClienteData({
      nome: '',
      telefone: '',
      endereco: '',
      taxa_entrega: '',
      desconto: '',
      observacoes: '',
    });
    setShowNovoPedido(false);
    loadData();
  }

  async function atualizarStatusPedido(pedidoId: string, novoStatus: Pedido['status']) {
    try {
      const { error } = await supabase
        .from('pedidos')
        .update({
          status: novoStatus,
          ...(novoStatus === 'pronto' || novoStatus === 'entregue' ? { fechado_at: new Date().toISOString() } : {}),
        })
        .eq('id', pedidoId);
      if (error) throw error;
      if (novoStatus === 'pronto' || novoStatus === 'entregue') {
        registrarVendaPedido(pedidoId);
      }
    } catch (error) {
      if (import.meta.env.DEV) console.error('Erro ao atualizar status do pedido:', error);
      window.alert('Erro ao atualizar status do pedido. Tente novamente.');
    }
    loadData();
  }

  const produtosFiltrados = produtos
    .filter((p) => p.categoria_id === categoriaAtiva)
    .sort((a, b) => a.nome.localeCompare(b.nome));

  const subtotal = carrinho.reduce(
    (sum, item) => sum + item.produto.preco * item.quantidade,
    0
  );
  const taxaEntrega = parseFloat(clienteData.taxa_entrega) || 0;
  const desconto = parseFloat(clienteData.desconto) || 0;
  const total = subtotal + taxaEntrega - desconto;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getStatusConfig = (status: Pedido['status']) => {
    const configs = {
      novo: { color: 'bg-yellow-100 text-yellow-700', icon: Clock, label: 'Novo' },
      aberto: { color: 'bg-yellow-100 text-yellow-700', icon: Clock, label: 'Aberto' },
      em_preparo: { color: 'bg-blue-100 text-blue-700', icon: ChefHat, label: 'Em Preparo' },
      pronto: { color: 'bg-green-100 text-green-700', icon: CheckCircle, label: 'Pronto' },
      entregue: { color: 'bg-gray-100 text-gray-700', icon: CheckCircle, label: 'Entregue' },
      cancelado: { color: 'bg-red-100 text-red-700', icon: XCircle, label: 'Cancelado' },
    };
    return configs[status];
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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Delivery</h2>
          <p className="text-gray-500 text-sm">Pedidos para entrega</p>
        </div>
        <button
          onClick={() => setShowNovoPedido(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-all"
        >
          <Plus className="w-4 h-4" />
          Novo Pedido
        </button>
      </div>

      {!showNovoPedido ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pedidos.map((pedido) => {
            const statusConfig = getStatusConfig(pedido.status);
            return (
              <div
                key={pedido.id}
                className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => setSelectedPedido(pedido)}
              >
                <div className={`p-4 ${statusConfig.color.split(' ')[0]}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Truck className="w-5 h-5" />
                      <span className="font-bold">{pedido.nome_cliente}</span>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}>
                      {statusConfig.label}
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  <div className="space-y-1 mb-3 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      <span>{pedido.telefone}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 mt-0.5" />
                      <span className="line-clamp-2">{pedido.endereco}</span>
                    </div>
                  </div>
                  <div className="space-y-2 mb-4">
                    {pedido.itens?.slice(0, 3).map((item) => (
                      <div key={item.id} className="flex justify-between text-sm items-center gap-2">
                        {item.produtos?.imagem && (
                          <img src={item.produtos.imagem} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0" />
                        )}
                        <span className="flex-1">
                          {item.quantidade}x {item.product_name || item.produtos?.nome}
                        </span>
                        <span className="text-gray-500">{formatCurrency(item.preco_unitario)}</span>
                      </div>
                    ))}
                    {(pedido.itens?.length || 0) > 3 && (
                      <p className="text-xs text-gray-400">
                        +{(pedido.itens?.length || 0) - 3} itens
                      </p>
                    )}
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t">
                    <span className="text-sm text-gray-500">Total</span>
                    <span className="font-bold text-orange-600">{formatCurrency(pedido.total)}</span>
                  </div>
                </div>
              </div>
            );
          })}

          {pedidos.length === 0 && (
            <div className="col-span-full text-center py-12">
              <Truck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Nenhum pedido de delivery</p>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-xl shadow-md">
            <div className="p-4 border-b">
              <div className="flex gap-2 overflow-x-auto pb-2">
                {categorias.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setCategoriaAtiva(cat.id)}
                    className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                      categoriaAtiva === cat.id
                        ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {cat.nome}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[50vh] overflow-y-auto">
              {produtosFiltrados.map((produto) => (
                <button
                  key={produto.id}
                  onClick={() => adicionarAoCarrinho(produto)}
                  className="bg-gradient-to-br from-amber-50 to-orange-50 p-3 rounded-lg text-left hover:shadow-md transition-shadow border border-amber-100"
                >
                  {produto.imagem && (
                    <img
                      src={produto.imagem}
                      alt={produto.nome}
                      className="w-full h-24 object-cover object-center rounded-lg mb-2"
                    />
                  )}
                  <p className="font-medium text-gray-800 text-sm">{produto.nome}</p>
                  <p className="text-orange-600 font-bold text-sm mt-1">
                    {formatCurrency(produto.preco)}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md h-fit">
            <div className="p-4 border-b bg-gradient-to-r from-orange-500 to-red-500 rounded-t-xl">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Truck className="w-5 h-5" />
                Novo Delivery
              </h3>
            </div>

            <div className="p-4">
              <div className="space-y-3 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <User className="w-4 h-4 inline mr-1" />
                    Nome *
                  </label>
                  <input
                    type="text"
                    required
                    value={clienteData.nome}
                    onChange={(e) => setClienteData({ ...clienteData, nome: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Phone className="w-4 h-4 inline mr-1" />
                    Telefone *
                  </label>
                  <input
                    type="tel"
                    required
                    value={clienteData.telefone}
                    onChange={(e) => setClienteData({ ...clienteData, telefone: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                    placeholder="(00) 00000-0000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <MapPin className="w-4 h-4 inline mr-1" />
                    Endereço *
                  </label>
                  <textarea
                    required
                    value={clienteData.endereco}
                    onChange={(e) => setClienteData({ ...clienteData, endereco: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                    rows={2}
                  />
                </div>
              </div>

              <div className="space-y-3 max-h-[30vh] overflow-y-auto">
                {carrinho.map((item) => (
                  <div key={item.produto.id} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        {item.produto.imagem && (
                          <img src={item.produto.imagem} alt="" className="w-8 h-8 rounded object-cover" />
                        )}
                        <p className="font-medium text-sm">{item.produto.nome}</p>
                      </div>
                      <button
                        onClick={() => removerDoCarrinho(item.produto.id)}
                        className="text-red-500 hover:bg-red-50 p-1 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <button
                        onClick={() => atualizarQuantidade(item.produto.id, item.quantidade - 1)}
                        className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center hover:bg-gray-300"
                      >
                        -
                      </button>
                      <span className="w-8 text-center font-medium">{item.quantidade}</span>
                      <button
                        onClick={() => atualizarQuantidade(item.produto.id, item.quantidade + 1)}
                        className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center hover:bg-gray-300"
                      >
                        +
                      </button>
                      <span className="ml-auto font-bold text-orange-600">
                        {formatCurrency(item.produto.preco * item.quantidade)}
                      </span>
                    </div>
                    <input
                      type="text"
                      placeholder="Observação..."
                      value={item.observacao}
                      onChange={(e) => atualizarObservacao(item.produto.id, e.target.value)}
                      className="w-full px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-orange-500"
                    />
                  </div>
                ))}

                {carrinho.length === 0 && (
                  <p className="text-center text-gray-400 py-4">Carrinho vazio</p>
                )}
              </div>

              <div className="mt-4 pt-4 border-t space-y-2">
                <textarea
                  placeholder="Observações..."
                  value={clienteData.observacoes}
                  onChange={(e) => setClienteData({ ...clienteData, observacoes: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                  rows={2}
                />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Taxa Entrega</label>
                    <input
                      type="number"
                      step="0.01"
                      value={clienteData.taxa_entrega}
                      onChange={(e) => setClienteData({ ...clienteData, taxa_entrega: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Desconto</label>
                    <input
                      type="number"
                      step="0.01"
                      value={clienteData.desconto}
                      onChange={(e) => setClienteData({ ...clienteData, desconto: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>

                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Subtotal</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  {taxaEntrega > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Taxa Entrega</span>
                      <span>{formatCurrency(taxaEntrega)}</span>
                    </div>
                  )}
                  {desconto > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Desconto</span>
                      <span>-{formatCurrency(desconto)}</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center py-2">
                  <span className="font-medium">Total</span>
                  <span className="text-2xl font-bold text-orange-600">
                    {formatCurrency(total)}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setShowNovoPedido(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={finalizarPedido}
                  disabled={carrinho.length === 0 || !clienteData.nome || !clienteData.telefone || !clienteData.endereco}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Finalizar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedPedido && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
            <div className="p-4 border-b">
              <h3 className="text-lg font-bold">Delivery - {selectedPedido.nome_cliente}</h3>
              <div className="text-sm text-gray-600 mt-1">
                <p className="flex items-center gap-2"><Phone className="w-4 h-4" />{selectedPedido.telefone}</p>
                <p className="flex items-start gap-2 mt-1"><MapPin className="w-4 h-4 mt-0.5" />{selectedPedido.endereco}</p>
              </div>
            </div>
            <div className="p-4">
              <div className="space-y-2 mb-4">
                {selectedPedido.itens?.map((item) => (
                  <div key={item.id} className="flex justify-between items-center gap-2">
                    {item.produtos?.imagem && (
                      <img src={item.produtos.imagem} alt="" className="w-10 h-10 rounded object-cover flex-shrink-0" />
                    )}
                    <span className="flex-1">
                      {item.quantidade}x {item.product_name || item.produtos?.nome}
                    </span>
                    <span className="text-gray-500">{formatCurrency(item.preco_unitario)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between pt-4 border-t mb-4">
                <span className="font-medium">Total</span>
                <span className="font-bold text-orange-600">{formatCurrency(selectedPedido.total)}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(selectedPedido.status === 'novo' || selectedPedido.status === 'aberto') && (
                  <button
                    onClick={() => {
                      atualizarStatusPedido(selectedPedido.id, 'em_preparo');
                      setSelectedPedido(null);
                    }}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 col-span-2"
                  >
                    Em Preparo
                  </button>
                )}
                {selectedPedido.status === 'em_preparo' && (
                  <button
                    onClick={() => {
                      atualizarStatusPedido(selectedPedido.id, 'pronto');
                      setSelectedPedido(null);
                    }}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 col-span-2"
                  >
                    Pronto
                  </button>
                )}
                {selectedPedido.status === 'pronto' && (
                  <button
                    onClick={() => {
                      atualizarStatusPedido(selectedPedido.id, 'entregue');
                      setSelectedPedido(null);
                    }}
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 col-span-2"
                  >
                    Entregue
                  </button>
                )}
                {selectedPedido.status !== 'cancelado' && selectedPedido.status !== 'entregue' && selectedPedido.status !== 'pronto' && (
                  <button
                    onClick={() => {
                      atualizarStatusPedido(selectedPedido.id, 'cancelado');
                      setSelectedPedido(null);
                    }}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                  >
                    Cancelar
                  </button>
                )}
              </div>
              <button
                onClick={() => setSelectedPedido(null)}
                className="w-full mt-4 px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
