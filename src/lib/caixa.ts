import { supabase } from './supabase';
import { Caixa } from '../types';

export async function buscarCaixaAberto(): Promise<Caixa | null> {
  const { data, error } = await supabase
    .from('caixas')
    .select('*')
    .is('fechado_em', null)
    .order('aberto_em', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;
  return data;
}

export async function registrarVendaPedido(pedidoId: string): Promise<void> {
  const caixa = await buscarCaixaAberto();
  if (!caixa) return;

  const { data: pedido, error: pedError } = await supabase
    .from('pedidos')
    .select('*')
    .eq('id', pedidoId)
    .single();

  if (pedError || !pedido) return;

  const { data: existente } = await supabase
    .from('movimentacoes_caixa')
    .select('id')
    .eq('pedido_id', pedidoId)
    .eq('tipo', 'venda')
    .maybeSingle();

  if (existente) return;

  const { error } = await supabase.from('movimentacoes_caixa').insert({
    tipo: 'venda',
    valor: Number(pedido.total),
    descricao: `Venda #${pedidoId.slice(0, 8)}${pedido.nome_cliente ? ` - ${pedido.nome_cliente}` : pedido.mesa ? ` - Mesa ${pedido.mesa}` : ''}`,
    categoria: 'Venda de pedido',
    forma_pagamento: pedido.forma_pagamento || 'nao_informado',
    data_movimentacao: new Date().toISOString().split('T')[0],
    pedido_id: pedidoId,
    caixa_id: caixa.id,
  });

  if (error && import.meta.env.DEV) {
    console.error('Erro ao registrar venda no caixa:', error);
  }
}
