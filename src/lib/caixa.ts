import { supabase } from './supabase';
import { Caixa } from '../types';

export async function buscarCaixaAberto(): Promise<Caixa | null> {
  try {
    const { data, error } = await supabase
      .from('caixas')
      .select('*')
      .is('fechado_em', null)
      .order('aberto_em', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;
    return data;
  } catch {
    return null;
  }
}

export async function registrarVendaPedido(pedidoId: string): Promise<void> {
  const { error } = await supabase.rpc('registrar_venda_caixa', {
    p_pedido_id: pedidoId,
  });

  if (error && import.meta.env.DEV) {
    console.error('Erro ao registrar venda no caixa:', error);
  }
}

export async function sincronizarVendasCaixa(): Promise<{ ok: boolean; sincronizadas?: number; erro?: string }> {
  const { data, error } = await supabase.rpc('sincronizar_vendas_caixa');

  if (error) {
    if (import.meta.env.DEV) console.error('Erro ao sincronizar vendas:', error);
    return { ok: false, erro: error.message };
  }

  return data as { ok: boolean; sincronizadas?: number; erro?: string };
}
