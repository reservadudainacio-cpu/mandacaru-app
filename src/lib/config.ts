import { supabase } from './supabase';
import { EmpresaConfig, ConfigCardapio } from '../types';

export async function getConfig(): Promise<EmpresaConfig | null> {
  const { data } = await supabase
    .from('configuracoes_empresa')
    .select('*')
    .limit(1)
    .maybeSingle();
  return data;
}

export async function getConfigPublic(): Promise<ConfigCardapio | null> {
  const { data } = await supabase
    .from('vw_configuracoes_cardapio')
    .select('*')
    .limit(1)
    .maybeSingle();
  return data;
}

export async function updateConfig(data: Partial<EmpresaConfig>): Promise<{ error?: string }> {
  const atual = await getConfig();
  if (atual) {
    const { error } = await supabase.from('configuracoes_empresa').update(data).eq('id', atual.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from('configuracoes_empresa').insert(data);
    if (error) return { error: error.message };
  }
  return {};
}

export function formatWhatsApp(numero: string): string {
  return numero.replace(/\D/g, '');
}

export function formatPhone(phone: string): string {
  const d = phone.replace(/\D/g, '');
  if (d.length === 13) return `(${d.slice(2, 4)}) ${d.slice(4, 9)}-${d.slice(9)}`;
  if (d.length === 12) return `(${d.slice(2, 4)}) ${d.slice(4, 8)}-${d.slice(8)}`;
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return phone;
}
