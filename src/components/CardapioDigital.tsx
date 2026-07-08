import { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Minus, Trash2, Send, Store, Phone, MapPin, Clock, Image as ImageIcon, ClipboardList, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ProdutoCardapio, Categoria, ConfigCardapio } from '../types';
import { getConfigPublic, formatWhatsApp, formatPhone } from '../lib/config';
import { LogoMandacaru } from './LogoMandacaru';

interface CarrinhoItem {
  produto: ProdutoCardapio;
  quantidade: number;
  observacao: string;
}

export function CardapioDigital() {
  const [produtos, setProdutos] = useState<ProdutoCardapio[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [config, setConfig] = useState<ConfigCardapio | null>(null);
  const [loading, setLoading] = useState(true);
  const [categoriaAtiva, setCategoriaAtiva] = useState<string>('');
  const [carrinho, setCarrinho] = useState<CarrinhoItem[]>([]);
  const [showCarrinho, setShowCarrinho] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const [clienteData, setClienteData] = useState({
    nome: '',
    telefone: '',
    tipo_entrega: 'retirada' as 'retirada' | 'delivery',
    rua: '',
    numero: '',
    bairro: '',
    complemento: '',
    observacoes: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const { data: produtosData } = await supabase
        .from('vw_produtos_cardapio')
        .select('*, categorias(id, nome, ordem)')
        .eq('ativo', true)
        .order('nome');

      const { data: categoriasData } = await supabase
        .from('categorias')
        .select('*')
        .order('ordem');

      if (produtosData) setProdutos(produtosData);
      if (categoriasData) {
        setCategorias(categoriasData);
        if (categoriasData.length > 0) {
          setCategoriaAtiva(categoriasData[0].id);
        }
      }
      const cfg = await getConfigPublic();
      if (cfg) setConfig(cfg);
      setLoading(false);
    } catch (error) {
      if (import.meta.env.DEV) console.error('Erro ao carregar dados:', error);
      alert('Erro ao carregar o cardápio. Tente recarregar a página.');
      setLoading(false);
    }
  }

  function adicionarAoCarrinho(produto: ProdutoCardapio) {
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

  function atualizarQuantidade(produtoId: string, quantidade: number) {
    if (quantidade <= 0) {
      setCarrinho(carrinho.filter((item) => item.produto.id !== produtoId));
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

  function montarEnderecoCompleto(): string {
    const partes = [clienteData.rua, clienteData.numero, clienteData.bairro, clienteData.complemento].filter(Boolean);
    return partes.join(', ');
  }

  function limparCarrinho() {
    setCarrinho([]);
    setShowCarrinho(false);
    setClienteData({
      nome: '',
      telefone: '',
      tipo_entrega: 'retirada',
      rua: '',
      numero: '',
      bairro: '',
      complemento: '',
      observacoes: '',
    });
  }

  async function salvarPedidoNoBanco(): Promise<{ pedidoId: string } | null> {
    const enderecoCompleto = clienteData.tipo_entrega === 'delivery' ? montarEnderecoCompleto() : null;

    const itensPayload = carrinho.map(item => ({
      produto_id: item.produto.id,
      quantidade: item.quantidade,
      observacao: item.observacao || null,
    }));

    try {
      const edgeUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/receber-pedido`;
      const response = await fetch(edgeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          cliente_nome: clienteData.nome,
          cliente_telefone: clienteData.telefone,
          tipo_entrega: clienteData.tipo_entrega,
          endereco: enderecoCompleto,
          observacoes: clienteData.observacoes || null,
          itens: itensPayload,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        if (import.meta.env.DEV) console.error('Erro ao criar pedido:', data);
        alert('Erro ao criar pedido. Tente novamente.');
        return null;
      }

      return { pedidoId: data.pedido_id };
    } catch (err) {
      if (import.meta.env.DEV) console.error('Erro ao salvar pedido:', err);
      alert('Erro inesperado ao salvar pedido. Tente novamente.');
      return null;
    }
  }

  async function handleEnviarPedido() {
    if (!clienteData.nome || !clienteData.telefone || carrinho.length === 0) return;
    if (clienteData.tipo_entrega === 'delivery' && (!clienteData.rua || !clienteData.numero || !clienteData.bairro)) {
      alert('Informe rua, número e bairro para entrega.');
      return;
    }

    setEnviando(true);
    const result = await salvarPedidoNoBanco();
    setEnviando(false);

    if (result) {
      limparCarrinho();
      alert('Pedido enviado com sucesso!');
    } else {
      alert('Erro ao enviar pedido. Tente novamente.');
    }
  }

  async function handlePedirWhatsApp() {
    if (!clienteData.nome || !clienteData.telefone || carrinho.length === 0) return;
    if (clienteData.tipo_entrega === 'delivery' && (!clienteData.rua || !clienteData.numero || !clienteData.bairro)) {
      alert('Informe rua, número e bairro para entrega.');
      return;
    }

    try {
      setEnviando(true);
      const result = await salvarPedidoNoBanco();
      setEnviando(false);

      if (result) {
        const enderecoCompleto = clienteData.tipo_entrega === 'delivery' ? montarEnderecoCompleto() : null;
        const subtotalCalc = carrinho.reduce((sum, item) => sum + item.produto.preco * item.quantidade, 0);
        const deliveryFee = config?.taxa_entrega ?? 0;
        const taxaEntregaCalc = clienteData.tipo_entrega === 'delivery' ? deliveryFee : 0;
        const totalCalc = subtotalCalc + taxaEntregaCalc;

        let mensagem = `${config?.nome_empresa ?? ''} - Pedido #${result.pedidoId.slice(0, 8)}\n\n`;
        mensagem += `Cliente: ${clienteData.nome}\n`;
        mensagem += `Telefone: ${clienteData.telefone}\n`;
        mensagem += `Tipo: ${clienteData.tipo_entrega === 'retirada' ? 'Retirada' : 'Entrega'}\n`;
        if (clienteData.tipo_entrega === 'delivery') {
          mensagem += `Endereço: ${enderecoCompleto}\n`;
        }
        if (clienteData.observacoes) {
          mensagem += `Obs: ${clienteData.observacoes}\n`;
        }
        mensagem += `\nItens:\n`;
        carrinho.forEach(item => {
          mensagem += `${item.quantidade}x ${item.produto.nome} - R$ ${(item.produto.preco * item.quantidade).toFixed(2)}\n`;
          if (item.observacao) {
            mensagem += `   Obs: ${item.observacao}\n`;
          }
        });
        mensagem += `\nSubtotal: R$ ${subtotalCalc.toFixed(2)}\n`;
        if (taxaEntregaCalc > 0) {
          mensagem += `Taxa de entrega: R$ ${taxaEntregaCalc.toFixed(2)}\n`;
        }
        mensagem += `Total: R$ ${totalCalc.toFixed(2)}`;

        const whatsNumero = formatWhatsApp(config?.whatsapp_pedidos || '');
        const whatsappUrl = `https://wa.me/${whatsNumero}?text=${encodeURIComponent(mensagem)}`;
        window.open(whatsappUrl, '_blank');

        limparCarrinho();
        alert('Pedido enviado com sucesso!');
      } else {
        alert('Erro ao enviar pedido. Tente novamente.');
      }
    } catch (error) {
      setEnviando(false);
      if (import.meta.env.DEV) console.error('Erro ao enviar pedido pelo WhatsApp:', error);
      alert('Erro ao enviar pedido pelo WhatsApp. Tente novamente.');
    }
  }

  const produtosFiltrados = categoriaAtiva
    ? produtos.filter((p) => p.categoria_id === categoriaAtiva)
    : produtos;

  const subtotal = carrinho.reduce(
    (sum, item) => sum + item.produto.preco * item.quantidade,
    0
  );
  const deliveryFee = config?.taxa_entrega ?? 0;
  const taxaEntrega = clienteData.tipo_entrega === 'delivery' ? deliveryFee : 0;
  const total = subtotal + taxaEntrega;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const totalItensCarrinho = carrinho.reduce((sum, item) => sum + item.quantidade, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full border-4 border-orange-200" />
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-orange-500 animate-spin" />
          </div>
          <p className="text-gray-600 font-medium">Carregando cardápio...</p>
          <p className="text-gray-400 text-sm mt-1">Aguarde um momento</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 shadow-lg sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <LogoMandacaru size={40} className="rounded-xl" src={config?.logo_url} />
              <div>
                <h1 className="text-lg font-bold text-white leading-tight">{config?.nome_empresa ?? ''}</h1>
                <p className="text-[11px] text-amber-200/90 leading-tight">{config?.subtitulo ?? ''}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowCarrinho(!showCarrinho)}
                className="relative bg-white/20 backdrop-blur-sm p-2.5 rounded-xl hover:bg-white/30 transition-all active:scale-95"
              >
                <ShoppingCart className="w-5 h-5 text-white" />
                {totalItensCarrinho > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-lg ring-2 ring-red-600">
                    {totalItensCarrinho}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="max-w-6xl mx-auto px-4 pt-6 pb-2">
        <div className="bg-gradient-to-br from-white to-amber-50 rounded-2xl shadow-sm border border-amber-100 p-5 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${config?.aberto !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${config?.aberto !== false ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                  {config?.aberto !== false ? 'Aberto agora' : 'Fechado'}
                </span>
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-gray-800">Escolha seu pedido</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {config?.descricao ?? ''}
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-gray-500">
              <div className="flex items-center gap-1.5 bg-amber-50 px-3 py-2 rounded-lg">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>{config?.horario_funcionamento ?? ''}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-amber-50 px-3 py-2 rounded-lg">
                <Store className="w-3.5 h-3.5 text-amber-600" />
                <span>Retirada ou Delivery</span>
              </div>
              <div className="flex items-center gap-1.5 bg-amber-50 px-3 py-2 rounded-lg">
                <Phone className="w-3.5 h-3.5 text-amber-600" />
                <span>{formatPhone(config?.whatsapp_pedidos || '')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="sticky top-16 z-30 bg-gradient-to-b from-amber-50/95 to-amber-50/80 backdrop-blur-md border-b border-amber-100/50">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {categorias.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategoriaAtiva(cat.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full whitespace-nowrap transition-all duration-200 text-sm font-medium flex-shrink-0 ${
                  categoriaAtiva === cat.id
                    ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md shadow-orange-200'
                    : 'bg-white text-gray-600 border border-gray-200 hover:border-orange-300 hover:text-orange-600 shadow-sm'
                }`}
              >
                {cat.nome}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {produtosFiltrados.length === 0 ? (
          <div className="text-center py-16">
            <ImageIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg font-medium">Nenhum produto disponível</p>
            <p className="text-gray-400 text-sm mt-1">Tente selecionar outra categoria</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
            {produtosFiltrados.map((produto) => {
              const noCarrinho = carrinho.find((item) => item.produto.id === produto.id);
              return (
                <div
                  key={produto.id}
                  className="group bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg hover:border-orange-200 transition-all duration-300 flex flex-col"
                >
                  {/* Product Image */}
                  {produto.imagem ? (
                    <div className="relative h-32 sm:h-36 md:h-40 bg-gray-100 overflow-hidden">
                      <img
                        src={produto.imagem}
                        alt={produto.nome}
                        className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
                    </div>
                  ) : (
                    <div className="h-32 sm:h-36 md:h-40 bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center border-b border-amber-100/50">
                      <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                        <ImageIcon className="w-6 h-6 text-amber-400" />
                      </div>
                    </div>
                  )}

                  {/* Product Info */}
                  <div className="p-4 flex flex-col flex-1">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-semibold text-gray-800 text-sm md:text-base leading-tight">
                        {produto.nome}
                      </h3>
                      <span className="text-base md:text-lg font-bold text-orange-600 whitespace-nowrap flex-shrink-0">
                        {formatCurrency(produto.preco)}
                      </span>
                    </div>

                    {produto.descricao && (
                      <p className="text-xs md:text-sm text-gray-500 leading-relaxed mb-3 line-clamp-2">
                        {produto.descricao}
                      </p>
                    )}

                    {/* Spacer to push button to bottom */}
                    <div className="flex-1" />

                    {/* Add to Cart / Quantity Control */}
                    {noCarrinho ? (
                      <div className="flex items-center justify-between bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-1.5 border border-orange-200/60 mt-2">
                        <button
                          onClick={() => atualizarQuantidade(produto.id, noCarrinho.quantidade - 1)}
                          className="w-11 h-11 bg-white rounded-lg flex items-center justify-center shadow-sm hover:shadow-md transition-all active:scale-95 text-gray-600 hover:text-red-500"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="font-bold text-orange-700 text-base min-w-[2rem] text-center">
                          {noCarrinho.quantidade}
                        </span>
                        <button
                          onClick={() => atualizarQuantidade(produto.id, noCarrinho.quantidade + 1)}
                          className="w-11 h-11 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center shadow-sm hover:shadow-md transition-all active:scale-95 text-white"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => adicionarAoCarrinho(produto)}
                        className="w-full mt-2 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-medium hover:shadow-lg hover:from-orange-600 hover:to-red-600 transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-sm"
                      >
                        <Plus className="w-4 h-4" />
                        Adicionar
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Cart Drawer */}
      {showCarrinho && (
        <div className="fixed inset-0 bg-black/60 z-50 flex justify-end backdrop-blur-sm" onClick={() => setShowCarrinho(false)}>
          <div className="bg-white w-full max-w-md h-full flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {/* Cart Header */}
            <div className="px-5 py-4 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white flex items-center justify-between flex-shrink-0">
              <h2 className="text-lg font-bold flex items-center gap-2.5">
                <div className="bg-white/20 p-1.5 rounded-lg">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <span>Seu Carrinho</span>
                {totalItensCarrinho > 0 && (
                  <span className="bg-white/25 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {totalItensCarrinho} {totalItensCarrinho === 1 ? 'item' : 'itens'}
                  </span>
                )}
              </h2>
              <button
                onClick={() => setShowCarrinho(false)}
                className="p-2 hover:bg-white/20 rounded-xl transition-all active:scale-90"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cart Content - scrollável */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {carrinho.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <div className="w-20 h-20 rounded-full bg-amber-50 flex items-center justify-center mb-4">
                    <ShoppingCart className="w-10 h-10 text-amber-300" />
                  </div>
                  <p className="text-gray-500 font-medium">Seu carrinho está vazio</p>
                  <p className="text-gray-400 text-sm mt-1">Adicione produtos do cardápio</p>
                  <button
                    onClick={() => setShowCarrinho(false)}
                    className="mt-4 px-6 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl text-sm font-medium hover:shadow-lg transition-all"
                  >
                    Ver Cardápio
                  </button>
                </div>
              ) : (
                <>
                  {/* Itens do Carrinho */}
                  <div className="space-y-3 mb-6">
                    {carrinho.map((item) => (
                      <div key={item.produto.id} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                        <div className="flex items-center gap-3 mb-3">
                          {item.produto.imagem && (
                            <img
                              src={item.produto.imagem}
                              alt={item.produto.nome}
                              className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <span className="font-medium text-gray-800 text-sm truncate">{item.produto.nome}</span>
                              <span className="font-bold text-orange-600 text-sm whitespace-nowrap flex-shrink-0">
                                {formatCurrency(item.produto.preco * item.quantidade)}
                              </span>
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {formatCurrency(item.produto.preco)} un.
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => atualizarQuantidade(item.produto.id, item.quantidade - 1)}
                            className="w-11 h-11 bg-white rounded-xl flex items-center justify-center shadow-sm hover:shadow transition-all active:scale-95 text-gray-500 hover:text-red-500 border border-gray-200"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-10 text-center font-semibold text-gray-700">{item.quantidade}</span>
                          <button
                            onClick={() => atualizarQuantidade(item.produto.id, item.quantidade + 1)}
                            className="w-11 h-11 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center shadow-sm hover:shadow transition-all active:scale-95 text-white"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                          <input
                            type="text"
                            placeholder="Observação do item..."
                            value={item.observacao}
                            onChange={(e) => atualizarObservacao(item.produto.id, e.target.value)}
                            className="flex-1 ml-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
                          />
                          <button
                            onClick={() => atualizarQuantidade(item.produto.id, 0)}
                            className="w-11 h-11 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Dados do Cliente */}
                  <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
                    <h3 className="font-semibold text-gray-800 text-sm mb-4">Dados do Cliente</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Nome *</label>
                        <input
                          type="text"
                          placeholder="Seu nome"
                          value={clienteData.nome}
                          onChange={(e) => setClienteData({ ...clienteData, nome: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Telefone / WhatsApp *</label>
                        <input
                          type="tel"
                          placeholder="(65) 99999-9999"
                          value={clienteData.telefone}
                          onChange={(e) => setClienteData({ ...clienteData, telefone: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
                        />
                      </div>
                    </div>

                    {/* Tipo de Entrega */}
                    <div className="mt-4">
                      <label className="block text-xs font-medium text-gray-500 mb-2">Tipo do Pedido *</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setClienteData({ ...clienteData, tipo_entrega: 'retirada' })}
                          className={`flex flex-col items-center justify-center px-4 py-4 rounded-xl border-2 text-sm font-medium transition-all ${
                            clienteData.tipo_entrega === 'retirada'
                              ? 'border-orange-500 bg-orange-50 text-orange-700'
                              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                          }`}
                        >
                          <Store className={`w-5 h-5 mb-1 ${clienteData.tipo_entrega === 'retirada' ? 'text-orange-600' : 'text-gray-400'}`} />
                          <span className="font-semibold">Retirada</span>
                          <span className="text-[11px] text-gray-400 mt-0.5">Buscar no balcão</span>
                        </button>
                        <button
                          onClick={() => setClienteData({ ...clienteData, tipo_entrega: 'delivery' })}
                          className={`flex flex-col items-center justify-center px-4 py-4 rounded-xl border-2 text-sm font-medium transition-all ${
                            clienteData.tipo_entrega === 'delivery'
                              ? 'border-orange-500 bg-orange-50 text-orange-700'
                              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                          }`}
                        >
                          <svg className={`w-5 h-5 mb-1 ${clienteData.tipo_entrega === 'delivery' ? 'text-orange-600' : 'text-gray-400'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 17h14M5 17a2 2 0 1 1-4 0M5 17a2 2 0 1 0 4 0M19 17a2 2 0 1 1-4 0M19 17a2 2 0 1 0 4 0M9 3h6l3 4H6l3-4zM3 11h18v4H3z"/></svg>
                          <span className="font-semibold">Delivery</span>
                          <span className="text-[11px] text-gray-400 mt-0.5">Receber em casa</span>
                        </button>
                      </div>
                    </div>

                    {/* Endereço de Entrega */}
                    {clienteData.tipo_entrega === 'delivery' && (
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <label className="block text-xs font-medium text-gray-500 mb-3">Endereço de Entrega *</label>
                        <div className="space-y-3">
                          <div>
                            <input
                              type="text"
                              placeholder="Rua *"
                              value={clienteData.rua}
                              onChange={(e) => setClienteData({ ...clienteData, rua: e.target.value })}
                              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <input
                                type="text"
                                placeholder="Número *"
                                value={clienteData.numero}
                                onChange={(e) => setClienteData({ ...clienteData, numero: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
                              />
                            </div>
                            <div>
                              <input
                                type="text"
                                placeholder="Bairro *"
                                value={clienteData.bairro}
                                onChange={(e) => setClienteData({ ...clienteData, bairro: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
                              />
                            </div>
                          </div>
                          <div>
                            <input
                              type="text"
                              placeholder="Complemento / Referência (opcional)"
                              value={clienteData.complemento}
                              onChange={(e) => setClienteData({ ...clienteData, complemento: e.target.value })}
                              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {clienteData.tipo_entrega === 'retirada' && (
                      <div className="mt-3 p-3 bg-amber-50 rounded-xl text-xs text-amber-700 flex items-center gap-2">
                        <Store className="w-4 h-4 flex-shrink-0" />
                        Você retira seu pedido no balcão — {config?.endereco ? `${config.endereco}${config?.cidade ? `, ${config.cidade}` : ''}${config?.estado ? ` - ${config.estado}` : ''}` : 'Endereço não configurado'}
                      </div>
                    )}

                    {/* Observações */}
                    <div className="mt-4">
                      <label className="block text-xs font-medium text-gray-500 mb-1">Observações (opcional)</label>
                      <textarea
                        placeholder="Ex: tirar cebola, ponto da carne bem passado..."
                        value={clienteData.observacoes}
                        onChange={(e) => setClienteData({ ...clienteData, observacoes: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
                        rows={2}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Cart Footer - fixo */}
            {carrinho.length > 0 && (
              <div className="border-t border-gray-200 px-5 py-4 bg-white flex-shrink-0 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
                {/* Totals */}
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">Subtotal</span>
                    <span className="text-gray-700 font-medium">{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">Entrega</span>
                    <span className="text-gray-700 font-medium">
                      {clienteData.tipo_entrega === 'delivery' ? formatCurrency(deliveryFee) : formatCurrency(0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                    <span className="font-semibold text-gray-800">Total</span>
                    <span className="text-xl font-bold text-orange-600">{formatCurrency(total)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    onClick={handleEnviarPedido}
                    disabled={enviando || !clienteData.nome || !clienteData.telefone || (clienteData.tipo_entrega === 'delivery' && (!clienteData.rua || !clienteData.numero || !clienteData.bairro))}
                    className="w-full h-12 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:shadow-lg hover:from-orange-600 hover:to-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] text-base"
                  >
                    <ClipboardList className="w-5 h-5" />
                    {enviando ? 'Enviando...' : 'Enviar Pedido'}
                  </button>
                  <button
                    onClick={handlePedirWhatsApp}
                    disabled={enviando || !clienteData.nome || !clienteData.telefone || (clienteData.tipo_entrega === 'delivery' && (!clienteData.rua || !clienteData.numero || !clienteData.bairro))}
                    className="w-full h-12 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:shadow-lg hover:from-green-600 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] text-base"
                  >
                    <Send className="w-5 h-5" />
                    {enviando ? 'Enviando...' : 'Pedir pelo WhatsApp'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-amber-100 mt-8">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            <div className="flex items-center gap-3">
              <LogoMandacaru size={48} className="rounded-xl shadow-md" src={config?.logo_url} />
              <div>
                <p className="font-bold text-gray-800">{config?.nome_empresa ?? ''}</p>
                <p className="text-xs text-gray-400">{config?.subtitulo ?? ''}</p>
              </div>
            </div>

            <div className="flex flex-col gap-2.5 text-sm text-gray-600">
              <a href={`https://wa.me/${formatWhatsApp(config?.whatsapp_pedidos || '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 hover:text-orange-600 transition-colors group">
                <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center group-hover:bg-green-100 transition-colors">
                  <svg className="w-4 h-4 text-green-600" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                </div>
                <div>
                  <span className="font-medium">{formatPhone(config?.whatsapp_pedidos || '')}</span>
                  <p className="text-[11px] text-gray-400">WhatsApp</p>
                </div>
              </a>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <Phone className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <span className="font-medium">{formatPhone(config?.telefone_secundario || '')}</span>
                  <p className="text-[11px] text-gray-400">Telefone</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2.5 text-sm text-gray-600">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <span className="font-medium">{config?.endereco}, {config?.cidade} - {config?.estado}</span>
                  <p className="text-[11px] text-gray-400">Endereço</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${config?.aberto !== false ? 'bg-green-50' : 'bg-red-50'}`}>
                  <span className="relative flex h-2 w-2">
                    {config?.aberto !== false && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />}
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${config?.aberto !== false ? 'bg-green-500' : 'bg-red-500'}`} />
                  </span>
                </div>
                <div>
                  <span className={`font-medium ${config?.aberto !== false ? 'text-green-700' : 'text-red-700'}`}>
                    {config?.aberto !== false ? 'Aberto agora' : 'Fechado'}
                  </span>
                  <p className="text-[11px] text-gray-400">Status</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-400">
              &copy; {new Date().getFullYear()} {config?.nome_empresa ?? ''} {config?.subtitulo ?? ''}. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
