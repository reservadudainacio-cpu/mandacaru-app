import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, BellOff, ShoppingCart, ChefHat, CheckCircle, XCircle, Clock, Phone, MapPin, User, RefreshCw, Volume2, Image as ImageIcon, Package } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Pedido, ItemPedido } from '../types';

export function PedidosOnlineTab() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [alarmeAtivo, setAlarmeAtivo] = useState(true);
  const [lastPedidoId, setLastPedidoId] = useState<string | null>(null);
  const [selectedPedido, setSelectedPedido] = useState<Pedido | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const PAGE_SIZE = 50;
  const audioContextRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const loadingRef = useRef(false);
  const pedidosRef = useRef<Pedido[]>([]);
  pedidosRef.current = pedidos;

  useEffect(() => {
    loadPedidos({ reset: true });
    startPolling();
    setupRealtime();
    return () => {
      stopPolling();
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  const tocarAlarme = useCallback(() => {
    if (!alarmeAtivo) return;

    try {
      if (!audioContextRef.current) {
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioContextRef.current = new AC();
      }

      const ctx = audioContextRef.current;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.value = 880;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.3;

      oscillator.start();
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      oscillator.stop(ctx.currentTime + 0.5);

      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.frequency.value = 880;
        osc2.type = 'sine';
        gain2.gain.value = 0.3;
        osc2.start();
        gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc2.stop(ctx.currentTime + 0.5);
      }, 600);

      setTimeout(() => {
        const osc3 = ctx.createOscillator();
        const gain3 = ctx.createGain();
        osc3.connect(gain3);
        gain3.connect(ctx.destination);
        osc3.frequency.value = 1100;
        osc3.type = 'sine';
        gain3.gain.value = 0.3;
        osc3.start();
        gain3.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);
        osc3.stop(ctx.currentTime + 0.8);
      }, 1200);
    } catch {
      if (import.meta.env.DEV) console.log('Audio not supported');
    }
  }, [alarmeAtivo]);

  async function loadPedidos({ reset = false } = {}) {
    if (loadingRef.current) return;
    loadingRef.current = true;

    try {
      if (reset) {
        setLoading(true);
        setLoadingMore(false);
      } else {
        setLoadingMore(true);
      }

      const start = reset ? 0 : pedidosRef.current.length;
      const end = start + PAGE_SIZE;

      const { data, error } = await supabase
        .from('pedidos')
        .select('*, itens_pedido(*, produtos(*))')
        .eq('tipo', 'online')
        .order('created_at', { ascending: false })
        .range(start, end);

      if (error) {
        if (import.meta.env.DEV) console.error('Erro ao buscar pedidos:', error);
        if (reset) setLoading(false);
        setLoadingMore(false);
        loadingRef.current = false;
        return;
      }

      if (!data || data.length === 0) {
        setHasMore(false);
        if (reset) setPedidos([]);
        if (reset) setLoading(false);
        setLoadingMore(false);
        loadingRef.current = false;
        return;
      }

      const hasMoreData = data.length > PAGE_SIZE;
      const slice = data.slice(0, PAGE_SIZE);
      const mapped = slice.map((p: Record<string, unknown>) => ({
        ...p,
        itens: (p as Record<string, unknown>).itens_pedido,
      })) as Pedido[];

      if (reset) {
        if (mapped.length > 0) {
          const novoPrimeiro = mapped[0].id;
          const isNewOrder = lastPedidoId && novoPrimeiro !== lastPedidoId;
          if (isNewOrder && (mapped[0].status === 'novo' || mapped[0].status === 'aberto')) {
            tocarAlarme();
          }
          setLastPedidoId(novoPrimeiro);
        }
        setPedidos(mapped);
      } else {
        const existingIds = new Set(pedidosRef.current.map(p => p.id));
        const novos = mapped.filter(p => !existingIds.has(p.id));
        if (novos.length > 0) {
          setPedidos(prev => [...prev, ...novos]);
        }
      }

      setHasMore(hasMoreData);
      if (reset) setLoading(false);
      setLoadingMore(false);
      loadingRef.current = false;
    } catch (err) {
      if (import.meta.env.DEV) console.error('Erro ao carregar pedidos:', err);
      alert('Erro ao carregar pedidos. Tente novamente.');
      if (reset) setLoading(false);
      setLoadingMore(false);
      loadingRef.current = false;
    }
  }

  function startPolling() {
    intervalRef.current = setInterval(() => {
      loadPedidos({ reset: true });
    }, 5000);
  }

  function stopPolling() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  }

  function setupRealtime() {
    channelRef.current = supabase
      .channel('pedidos-online-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'pedidos', filter: 'tipo=eq.online' },
        async (payload) => {
          const { data, error } = await supabase
            .from('pedidos')
            .select('*, itens_pedido(*, produtos(*))')
            .eq('id', (payload.new as Record<string, unknown>).id)
            .single();

          if (error || !data) return;

          const mapped = {
            ...data,
            itens: data.itens_pedido,
          } as Pedido;

          setPedidos(prev => {
            if (prev.some(p => p.id === mapped.id)) return prev;
            return [mapped, ...prev];
          });
          setLastPedidoId(mapped.id);

          if (mapped.status === 'novo' || mapped.status === 'aberto') {
            tocarAlarme();
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'pedidos', filter: 'tipo=eq.online' },
        (payload) => {
          setPedidos(prev => prev.map(p =>
            p.id === (payload.new as Record<string, unknown>).id
              ? { ...p, ...(payload.new as Record<string, unknown>) }
              : p
          ));
        }
      )
      .subscribe();
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

      if (error) {
        if (import.meta.env.DEV) console.error('Erro ao atualizar status do pedido:', error);
        alert('Erro ao atualizar status do pedido. Tente novamente.');
        return;
      }

      loadPedidos({ reset: true });
    } catch (err) {
      if (import.meta.env.DEV) console.error('Erro ao atualizar status do pedido:', err);
      alert('Erro ao atualizar status do pedido. Tente novamente.');
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (date: string) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  const formatDateFull = (date: string) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  const getStatusConfig = (status: Pedido['status']) => {
    const configs = {
      novo: { color: 'bg-yellow-400', textColor: 'text-yellow-700', bgColor: 'bg-yellow-50', icon: Clock, label: 'Novo Pedido!', pulse: true },
      aberto: { color: 'bg-yellow-400', textColor: 'text-yellow-700', bgColor: 'bg-yellow-50', icon: Clock, label: 'Novo Pedido!', pulse: true },
      em_preparo: { color: 'bg-blue-500', textColor: 'text-blue-700', bgColor: 'bg-blue-50', icon: ChefHat, label: 'Em Preparo', pulse: false },
      pronto: { color: 'bg-green-500', textColor: 'text-green-700', bgColor: 'bg-green-50', icon: CheckCircle, label: 'Pronto', pulse: false },
      entregue: { color: 'bg-gray-400', textColor: 'text-gray-700', bgColor: 'bg-gray-50', icon: CheckCircle, label: 'Entregue', pulse: false },
      cancelado: { color: 'bg-red-500', textColor: 'text-red-700', bgColor: 'bg-red-50', icon: XCircle, label: 'Cancelado', pulse: false },
    };
    return configs[status] || configs.novo;
  };

  const pedidosAtivos = pedidos.filter(p => p.status === 'novo' || p.status === 'aberto');

  function getItemDisplayName(item: ItemPedido): string {
    return item.product_name || item.produtos?.nome || 'Produto';
  }

  function getItemImageUrl(item: ItemPedido): string | null {
    return item.product_image_url || item.produtos?.imagem || null;
  }

  function getItemSubtotal(item: ItemPedido): number {
    if (item.subtotal != null) return Number(item.subtotal);
    return Number(item.quantidade) * Number(item.preco_unitario);
  }

  function getResumoItens(pedido: Pedido): string {
    if (!pedido.itens || pedido.itens.length === 0) return '';
    return pedido.itens.slice(0, 3).map(item =>
      `${item.quantidade}x ${getItemDisplayName(item)}`
    ).join(', ') + (pedido.itens.length > 3 ? ` +${pedido.itens.length - 3}` : '');
  }



  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {pedidosAtivos.length > 0 && alarmeAtivo && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 bg-gradient-to-r from-red-500 to-orange-500 text-white px-6 py-3 rounded-full shadow-lg animate-pulse flex items-center gap-3">
          <Bell className="w-6 h-6 animate-bounce" />
          <span className="font-bold">{pedidosAtivos.length} novo(s) pedido(s)!</span>
          <Volume2 className="w-5 h-5" />
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            Pedidos Online
            {pedidosAtivos.length > 0 && (
              <span className="bg-red-500 text-white text-sm px-2 py-1 rounded-full animate-pulse">
                {pedidosAtivos.length}
              </span>
            )}
          </h2>
          <p className="text-gray-500 text-sm">Cardápio Digital</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => loadPedidos({ reset: true })}
            className="flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Atualizar
          </button>
          <button
            onClick={() => setAlarmeAtivo(!alarmeAtivo)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              alarmeAtivo
                ? 'bg-red-500 text-white'
                : 'bg-gray-200 text-gray-600'
            }`}
          >
            {alarmeAtivo ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
            {alarmeAtivo ? 'Alarme ON' : 'Alarme OFF'}
          </button>
        </div>
      </div>

      {/* New Orders Section */}
      {pedidosAtivos.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-red-600 mb-4 flex items-center gap-2">
            <Bell className="w-5 h-5 animate-bounce" />
            Novos Pedidos ({pedidosAtivos.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pedidosAtivos.map((pedido) => {
              return (
                <div
                  key={pedido.id}
                  className="bg-white rounded-xl shadow-lg overflow-hidden border-2 border-red-400 ring-4 ring-red-100 animate-pulse cursor-pointer hover:shadow-xl transition-shadow"
                  onClick={() => setSelectedPedido(pedido)}
                >
                  <div className="bg-gradient-to-r from-red-500 to-orange-500 p-4 text-white">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ShoppingCart className="w-6 h-6 animate-bounce" />
                        <span className="font-bold text-lg">NOVO PEDIDO!</span>
                      </div>
                      <span className="text-2xl font-bold">
                        {formatDate(pedido.created_at)}
                      </span>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="space-y-2 mb-3">
                      <div className="flex items-center gap-2 text-gray-700">
                        <User className="w-4 h-4" />
                        <span className="font-semibold">{pedido.nome_cliente}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600 text-sm">
                        <Phone className="w-4 h-4" />
                        <span>{pedido.telefone}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600 text-sm">
                        <Package className="w-4 h-4" />
                        <span>{pedido.tipo_entrega === 'delivery' ? 'Entrega' : 'Retirada'}</span>
                      </div>
                      {pedido.endereco && (
                        <div className="flex items-start gap-2 text-gray-600 text-sm">
                          <MapPin className="w-4 h-4 mt-0.5" />
                          <span className="line-clamp-2">{pedido.endereco}</span>
                        </div>
                      )}
                    </div>
                    <div className="text-sm text-gray-500 mb-3">
                      {getResumoItens(pedido)}
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t">
                      <span className="font-medium">Total</span>
                      <span className="text-xl font-bold text-orange-600">{formatCurrency(pedido.total)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* All Orders */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {pedidos.filter(p => p.status !== 'novo' && p.status !== 'aberto').map((pedido) => {
          const statusConfig = getStatusConfig(pedido.status);
          const StatusIcon = statusConfig.icon;
          return (
            <div
              key={pedido.id}
              className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => setSelectedPedido(pedido)}
            >
              <div className={`${statusConfig.bgColor} p-4`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <StatusIcon className={`w-5 h-5 ${statusConfig.textColor}`} />
                    <span className={`font-medium ${statusConfig.textColor}`}>
                      {formatDate(pedido.created_at)}
                    </span>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.textColor}`}>
                    {statusConfig.label}
                  </span>
                </div>
              </div>
              <div className="p-4">
                <div className="space-y-1 mb-3 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="font-medium">{pedido.nome_cliente}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-500">
                    <Phone className="w-4 h-4" />
                    <span>{pedido.telefone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-500">
                    <Package className="w-4 h-4" />
                    <span>{pedido.tipo_entrega === 'delivery' ? 'Entrega' : 'Retirada'}</span>
                  </div>
                </div>
                <div className="text-sm text-gray-500 mb-3">
                  {getResumoItens(pedido)}
                </div>
                <div className="flex justify-between items-center pt-3 border-t">
                  <span className="text-sm text-gray-500">Total</span>
                  <span className="font-bold text-orange-600">{formatCurrency(pedido.total)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {hasMore && pedidos.length > 0 && (
        <div className="text-center mt-6">
          <button
            onClick={() => loadPedidos({ reset: false })}
            disabled={loadingMore}
            className="px-6 py-3 bg-white border-2 border-orange-500 text-orange-600 rounded-xl font-medium hover:bg-orange-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingMore ? (
              <span className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-500" />
                Carregando...
              </span>
            ) : (
              'Carregar mais'
            )}
          </button>
        </div>
      )}

      {pedidos.length === 0 && (
        <div className="text-center py-16 bg-white rounded-xl shadow-md">
          <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">Nenhum pedido online ainda</p>
          <p className="text-gray-400 text-sm mt-2">Os pedidos do cardápio digital aparecerão aqui</p>
        </div>
      )}

      {/* Order Detail Modal - Improved */}
      {selectedPedido && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className={`p-4 ${getStatusConfig(selectedPedido.status).bgColor} rounded-t-2xl sticky top-0`}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-bold">Pedido Online</h3>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  selectedPedido.status === 'novo' || selectedPedido.status === 'aberto'
                    ? 'bg-red-500 text-white animate-pulse'
                    : getStatusConfig(selectedPedido.status).bgColor + ' ' + getStatusConfig(selectedPedido.status).textColor
                }`}>
                  {getStatusConfig(selectedPedido.status).label}
                </span>
              </div>
              <p className="text-sm text-gray-500">
                {formatDateFull(selectedPedido.created_at)}
              </p>
            </div>

            <div className="p-4">
              {/* Customer Data */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <h4 className="font-medium text-gray-700 mb-3">Dados do Cliente</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <User className="w-5 h-5 text-gray-400" />
                    <span className="font-semibold">{selectedPedido.nome_cliente}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Phone className="w-5 h-5" />
                    <span>{selectedPedido.telefone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Package className="w-5 h-5" />
                    <span className="font-medium">
                      {selectedPedido.tipo_entrega === 'delivery' ? 'Entrega' : 'Retirada'}
                    </span>
                  </div>
                  {selectedPedido.endereco && (
                    <div className="flex items-start gap-2 text-gray-600">
                      <MapPin className="w-5 h-5 mt-0.5" />
                      <span>{selectedPedido.endereco}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Order Items */}
              <div className="mb-4">
                <h4 className="font-medium text-gray-700 mb-3">Itens do Pedido</h4>
                <div className="space-y-3">
                  {selectedPedido.itens?.map((item) => (
                    <div key={item.id} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-start gap-3">
                        {getItemImageUrl(item) ? (
                          <img
                            src={getItemImageUrl(item)!}
                            alt={getItemDisplayName(item)}
                            className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        ) : (
                          <div className="w-14 h-14 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                            <ImageIcon className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-gray-800">
                                {item.quantidade}x {getItemDisplayName(item)}
                              </p>
                              <p className="text-sm text-gray-500">
                                Preço unitário: {formatCurrency(item.preco_unitario)}
                              </p>
                            </div>
                            <span className="font-bold text-orange-600 whitespace-nowrap ml-2">
                              {formatCurrency(getItemSubtotal(item))}
                            </span>
                          </div>
                          {item.observacao && (
                            <p className="text-sm text-gray-500 mt-1 italic">
                              Obs: {item.observacao}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* General Notes */}
              {selectedPedido.observacoes && (
                <div className="bg-yellow-50 p-3 rounded-lg mb-4">
                  <p className="text-sm text-yellow-800">
                    <strong>Observações:</strong> {selectedPedido.observacoes}
                  </p>
                </div>
              )}

              {/* Summary */}
              <div className="border-t pt-4 mb-4 space-y-1">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="text-gray-700">{formatCurrency(selectedPedido.subtotal ?? (selectedPedido.total - (selectedPedido.taxa_entrega || 0)))}</span>
                </div>
                {selectedPedido.taxa_entrega > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">Taxa de entrega</span>
                    <span className="text-gray-700">{formatCurrency(selectedPedido.taxa_entrega)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                  <span className="font-medium text-lg">Total</span>
                  <span className="text-2xl font-bold text-orange-600">
                    {formatCurrency(selectedPedido.total)}
                  </span>
                </div>
                {selectedPedido.forma_pagamento && selectedPedido.forma_pagamento !== 'nao_informado' && (
                  <p className="text-sm text-gray-500 text-right">
                    Pagamento: {selectedPedido.forma_pagamento}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2">
                {(selectedPedido.status === 'novo' || selectedPedido.status === 'aberto') && (
                  <>
                    <button
                      onClick={() => {
                        atualizarStatusPedido(selectedPedido.id, 'em_preparo');
                        setSelectedPedido(null);
                      }}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center justify-center gap-2"
                    >
                      <ChefHat className="w-4 h-4" />
                      Iniciar Preparo
                    </button>
                    <button
                      onClick={() => {
                        atualizarStatusPedido(selectedPedido.id, 'cancelado');
                        setSelectedPedido(null);
                      }}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                    >
                      Cancelar
                    </button>
                  </>
                )}
                {selectedPedido.status === 'em_preparo' && (
                  <button
                    onClick={() => {
                      atualizarStatusPedido(selectedPedido.id, 'pronto');
                      setSelectedPedido(null);
                    }}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 col-span-2"
                  >
                    <CheckCircle className="w-4 h-4 inline mr-2" />
                    Marcar como Pronto
                  </button>
                )}
                {selectedPedido.status === 'pronto' && (
                  <button
                    onClick={() => {
                      atualizarStatusPedido(selectedPedido.id, 'entregue');
                      setSelectedPedido(null);
                    }}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 col-span-2"
                  >
                    Marcar como Entregue
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
