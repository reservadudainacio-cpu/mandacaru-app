import { useState, useEffect } from 'react';
import {
  Settings, Phone, Save, Loader2, CheckCircle, AlertTriangle,
  Store, MapPin, Clock, DollarSign, Smartphone, Upload, X,
} from 'lucide-react';
import { getConfig, updateConfig, formatWhatsApp, formatPhone } from '../lib/config';
import { supabase } from '../lib/supabase';

export function ConfiguracoesTab() {
  const [form, setForm] = useState({
    nome_empresa: 'Mandacaru',
    subtitulo: 'Esfihas & Jantinha',
    descricao: '',
    whatsapp_pedidos: '5565993625869',
    telefone_principal: '5565993625869',
    telefone_secundario: '5565992208419',
    endereco: 'Centro',
    cidade: 'Japaratinga',
    estado: 'AL',
    taxa_entrega: 5,
    pedido_minimo: 0,
    horario_funcionamento: '15-25 min',
    aberto: true,
    logo_url: '',
  });
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [mensagem, setMensagem] = useState<{ texto: string; tipo: 'sucesso' | 'erro' } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const config = await getConfig();
        if (config) {
          setForm({
            nome_empresa: config.nome_empresa,
            subtitulo: config.subtitulo,
            descricao: config.descricao,
            whatsapp_pedidos: config.whatsapp_pedidos,
            telefone_principal: config.telefone_principal,
            telefone_secundario: config.telefone_secundario,
            endereco: config.endereco,
            cidade: config.cidade,
            estado: config.estado,
            taxa_entrega: config.taxa_entrega,
            pedido_minimo: config.pedido_minimo,
            horario_funcionamento: config.horario_funcionamento,
            aberto: config.aberto,
            logo_url: config.logo_url || '',
          });
        }
      } catch (error) {
        if (import.meta.env.DEV) console.error('Erro ao carregar configurações:', error);
        alert('Erro ao carregar configurações. Tente novamente.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleLogoUpload(file: File) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      alert('Formato não permitido. Use JPG, PNG ou WebP.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Imagem muito grande. Máximo de 5MB.');
      return;
    }

    setLogoUploading(true);
    try {
      if (form.logo_url) {
        const pathMatch = form.logo_url.match(/\/product-images\/(.+)$/);
        if (pathMatch) {
          await supabase.storage.from('product-images').remove([pathMatch[1]]);
        }
      }

      const ext = file.name.split('.').pop();
      const fileName = `logos/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);

      if (urlData) {
        setForm({ ...form, logo_url: urlData.publicUrl });
      }
    } catch (e) {
      if (import.meta.env.DEV) console.error('Logo upload error:', e);
      alert('Erro ao fazer upload do logo. Tente novamente.');
    }
    setLogoUploading(false);
  }

  async function handleSalvar() {
    const whats = formatWhatsApp(form.whatsapp_pedidos);
    if (!whats) {
      setMensagem({ texto: 'WhatsApp para pedidos é obrigatório.', tipo: 'erro' });
      return;
    }

    setSalvando(true);
    setMensagem(null);

    try {
      const result = await updateConfig({ ...form, whatsapp_pedidos: whats });

      if (result.error) {
        setMensagem({ texto: 'Erro ao salvar: ' + result.error, tipo: 'erro' });
      } else {
        setMensagem({ texto: 'Configurações salvas com sucesso!', tipo: 'sucesso' });
      }
    } catch (error) {
      if (import.meta.env.DEV) console.error('Erro ao salvar configurações:', error);
      alert('Ocorreu um erro ao salvar as configurações. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
    </div>
  );

  const inputClass = 'w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500';
  const labelClass = 'block text-xs font-medium text-gray-500 mb-1';

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Settings className="w-6 h-6 text-gray-500" />
          Configurações da Empresa
        </h2>
        <p className="text-gray-500 text-sm">Informações que aparecem no cardápio digital</p>
      </div>

      <form onSubmit={e => { e.preventDefault(); handleSalvar(); }} className="space-y-6">
        {/* Dados da Empresa */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-4">
            <Store className="w-5 h-5 text-orange-500" /> Dados da Empresa
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Nome da Empresa</label>
              <input type="text" value={form.nome_empresa} onChange={e => setForm({ ...form, nome_empresa: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Subtítulo</label>
              <input type="text" value={form.subtitulo} onChange={e => setForm({ ...form, subtitulo: e.target.value })} className={inputClass} />
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>Descrição</label>
              <textarea rows={2} value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} className={inputClass} />
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>Logo da Empresa</label>
              <div className="flex items-center gap-4">
                {form.logo_url ? (
                  <div className="relative w-20 h-20 rounded-xl overflow-hidden border flex-shrink-0">
                    <img src={form.logo_url} alt="Logo" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, logo_url: '' })}
                      className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-xl bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center flex-shrink-0">
                    <Store className="w-8 h-8 text-gray-300" />
                  </div>
                )}
                <label className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition-colors">
                  <Upload className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">{logoUploading ? 'Enviando...' : 'Upload Logo'}</span>
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" disabled={logoUploading} onChange={e => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f); }} />
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Contato */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-4">
            <Phone className="w-5 h-5 text-green-500" /> Contato
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>WhatsApp para Pedidos *</label>
              <input type="text" value={form.whatsapp_pedidos} onChange={e => setForm({ ...form, whatsapp_pedidos: e.target.value })} placeholder="5565993625869" className={inputClass} />
              <p className="text-xs text-gray-400 mt-1">Código do país + DDD + número (só dígitos)</p>
            </div>
            <div>
              <label className={labelClass}>Telefone Principal</label>
              <input type="text" value={form.telefone_principal} onChange={e => setForm({ ...form, telefone_principal: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Telefone Secundário</label>
              <input type="text" value={form.telefone_secundario} onChange={e => setForm({ ...form, telefone_secundario: e.target.value })} className={inputClass} />
            </div>
          </div>
        </div>

        {/* Endereço */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-4">
            <MapPin className="w-5 h-5 text-blue-500" /> Endereço
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Endereço (Rua/Bairro)</label>
              <input type="text" value={form.endereco} onChange={e => setForm({ ...form, endereco: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Cidade</label>
              <input type="text" value={form.cidade} onChange={e => setForm({ ...form, cidade: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Estado</label>
              <input type="text" value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })} className={inputClass} />
            </div>
          </div>
        </div>

        {/* Pedidos */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-4">
            <DollarSign className="w-5 h-5 text-emerald-500" /> Pedidos
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Taxa de Entrega (R$)</label>
              <input type="number" step="0.01" min="0" value={form.taxa_entrega} onChange={e => setForm({ ...form, taxa_entrega: parseFloat(e.target.value) || 0 })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Pedido Mínimo (R$)</label>
              <input type="number" step="0.01" min="0" value={form.pedido_minimo} onChange={e => setForm({ ...form, pedido_minimo: parseFloat(e.target.value) || 0 })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Tempo Estimado</label>
              <input type="text" value={form.horario_funcionamento} onChange={e => setForm({ ...form, horario_funcionamento: e.target.value })} className={inputClass} />
            </div>
          </div>
          <div className="mt-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={form.aberto} onChange={e => setForm({ ...form, aberto: e.target.checked })} className="w-5 h-5 text-orange-500 rounded" />
              <div>
                <span className="text-sm font-medium text-gray-700">Estabelecimento aberto</span>
                <p className="text-xs text-gray-400">Se desligado, o cardápio mostra "Fechado"</p>
              </div>
            </label>
          </div>
        </div>

        {/* Preview */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-6 border border-amber-200">
          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Smartphone className="w-4 h-4" /> Preview — como aparece no cardápio digital
          </h4>
          <div className="bg-white rounded-lg p-4 shadow-sm text-sm space-y-2">
            <p className="font-bold text-gray-800">{form.nome_empresa} <span className="font-normal text-gray-500">{form.subtitulo}</span></p>
            <p className="text-gray-500">{form.descricao}</p>
            <div className="flex flex-wrap gap-3 text-xs">
              {form.aberto
                ? <span className="text-green-600 font-medium">🟢 Aberto agora</span>
                : <span className="text-red-600 font-medium">🔴 Fechado</span>}
              <span className="text-gray-500">📞 {formatPhone(form.whatsapp_pedidos || form.telefone_principal)}</span>
              <span className="text-gray-500">📍 {form.endereco}, {form.cidade} - {form.estado}</span>
              <span className="text-gray-500">⏱ {form.horario_funcionamento}</span>
              <span className="text-gray-500">🚚 Taxa: R$ {form.taxa_entrega.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Botão Salvar */}
        <div className="flex justify-end">
          <button type="submit" disabled={salvando}
            className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl text-sm font-medium hover:shadow-lg transition-all disabled:opacity-50">
            {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {salvando ? 'Salvando...' : 'Salvar Configurações'}
          </button>
        </div>

        {mensagem && (
          <div className={`flex items-center gap-2 p-3 rounded-xl text-sm ${
            mensagem.tipo === 'sucesso'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {mensagem.tipo === 'sucesso' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            {mensagem.texto}
          </div>
        )}
      </form>
    </div>
  );
}
