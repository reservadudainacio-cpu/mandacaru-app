import { useState, useEffect } from 'react';
import { UtensilsCrossed, Truck, Package, ArrowRightCircle, Store, ChefHat, Star, Clock, Phone, MapPin, Globe, QrCode, Copy, Check } from 'lucide-react';
import { EmpresaConfig } from '../types';
import { getConfig, formatPhone } from '../lib/config';
import { LogoMandacaru } from './LogoMandacaru';

interface HomePageProps {
  onNavigate: (tab: 'atendimento' | 'delivery' | 'produtos' | 'estoque' | 'pedidos-online') => void;
  pedidosOnlineCount?: number;
  user?: { email: string } | null;
}

export function HomePage({ onNavigate, pedidosOnlineCount = 0, user }: HomePageProps) {
  const [animated, setAnimated] = useState(false);
  const [copied, setCopied] = useState(false);
  const [config, setConfig] = useState<EmpresaConfig | null>(null);

  useEffect(() => {
    setTimeout(() => setAnimated(true), 100);
    getConfig().then(setConfig);
  }, []);

  const horaAtual = new Date().getHours();

  const cardapioUrl = `${window.location.origin}?cardapio=true`;

  const copiarLinkCardapio = () => {
    try { navigator.clipboard.writeText(cardapioUrl); } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const saudacao = horaAtual < 12 ? 'Bom dia' : horaAtual < 18 ? 'Boa tarde' : 'Boa noite';

  return (
    <div className="min-h-[calc(100vh-64px)] relative overflow-hidden">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-amber-500 via-orange-500 to-red-600 py-16 px-4">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-yellow-400/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-red-400/20 rounded-full blur-3xl" />
        </div>

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className={`inline-flex items-center justify-center mb-6 transform transition-all duration-700 ${animated ? 'scale-100 rotate-0' : 'scale-50 rotate-12'}`}>
            <LogoMandacaru size={96} src={config?.logo_url} />
          </div>

          <h1 className={`text-4xl md:text-6xl font-bold text-white mb-2 transform transition-all duration-700 delay-100 ${animated ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
            {config?.nome_empresa ?? ''}
          </h1>
          <p className={`text-xl md:text-2xl text-amber-100 font-medium mb-4 transform transition-all duration-700 delay-200 ${animated ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
            {config?.subtitulo ?? ''}
          </p>
          <p className={`text-amber-200 mb-8 transform transition-all duration-700 delay-300 ${animated ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
            {saudacao}! {config?.descricao ?? ''}
          </p>

          <div className={`flex flex-wrap justify-center gap-4 transform transition-all duration-700 delay-400 ${animated ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
            <button
              onClick={() => onNavigate('atendimento')}
              className="group flex items-center gap-3 bg-white text-orange-600 px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all"
            >
              <UtensilsCrossed className="w-5 h-5" />
              <span>Atendimento</span>
              <ArrowRightCircle className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => onNavigate('delivery')}
              className="group flex items-center gap-3 bg-amber-100 text-amber-700 px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all"
            >
              <Truck className="w-5 h-5" />
              <span>Delivery</span>
              <ArrowRightCircle className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>

      {/* Welcome Message for Yara e Neto */}
      {user && (
        <div className="max-w-6xl mx-auto px-4 mt-8 relative z-20">
          <div className="bg-gradient-to-r from-orange-500/10 via-red-500/10 to-amber-500/10 rounded-2xl border border-orange-500/20 p-6 md:p-8 backdrop-blur-sm">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-orange-500/20 flex-shrink-0">
                <Store className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Bem-vindos, Yara e Neto!</h2>
                <p className="text-gray-600 leading-relaxed max-w-2xl">
                  Aqui vocês poderão administrar seus negócios com praticidade, acompanhar pedidos, controlar produtos, gerenciar estoque, analisar o financeiro e manter tudo organizado em um só lugar.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="max-w-6xl mx-auto px-4 -mt-8 relative z-20">
        <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 transform transition-all duration-700 delay-500 ${animated ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
          <div className="bg-white rounded-2xl shadow-lg p-6 text-center hover:shadow-xl transition-shadow">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-xl mb-3">
              <ChefHat className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-gray-800">Tradição</p>
            <p className="text-gray-500 text-sm">Receitas autênticas</p>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6 text-center hover:shadow-xl transition-shadow">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-orange-100 rounded-xl mb-3">
              <Star className="w-6 h-6 text-orange-600" />
            </div>
            <p className="text-2xl font-bold text-gray-800">Qualidade</p>
            <p className="text-gray-500 text-sm">Ingredientes selecionados</p>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6 text-center hover:shadow-xl transition-shadow">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-xl mb-3">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-800">Agilidade</p>
            <p className="text-gray-500 text-sm">Atendimento rápido</p>
          </div>
        </div>
      </div>

      {/* Quick Access */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        <h2 className={`text-2xl font-bold text-gray-800 mb-6 text-center transform transition-all duration-700 delay-600 ${animated ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
          Acesso Rápido
        </h2>
        <div className={`grid grid-cols-2 md:grid-cols-5 gap-4 transform transition-all duration-700 delay-700 ${animated ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
          <button
            onClick={() => onNavigate('pedidos-online')}
            className="group bg-gradient-to-br from-red-50 to-orange-50 border-2 border-red-200 rounded-2xl p-6 text-center hover:border-red-400 hover:shadow-lg transition-all relative"
          >
            <div className="inline-flex items-center justify-center w-14 h-14 bg-red-100 rounded-xl mb-3 group-hover:bg-red-200 transition-colors relative">
              <Globe className="w-7 h-7 text-red-600" />
              {pedidosOnlineCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center animate-pulse shadow-lg ring-2 ring-white">
                  {pedidosOnlineCount}
                </span>
              )}
            </div>
            <p className="font-semibold text-gray-800">Pedidos Online</p>
            <p className="text-sm text-gray-500 mt-1">{pedidosOnlineCount > 0 ? `${pedidosOnlineCount} pendente(s)` : 'Cardápio digital'}</p>
          </button>

          <button
            onClick={() => onNavigate('atendimento')}
            className="group bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl p-6 text-center hover:border-orange-400 hover:shadow-lg transition-all"
          >
            <div className="inline-flex items-center justify-center w-14 h-14 bg-amber-100 rounded-xl mb-3 group-hover:bg-amber-200 transition-colors">
              <UtensilsCrossed className="w-7 h-7 text-amber-600" />
            </div>
            <p className="font-semibold text-gray-800">Atendimento</p>
            <p className="text-sm text-gray-500 mt-1">Pedidos no salão</p>
          </button>

          <button
            onClick={() => onNavigate('delivery')}
            className="group bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-6 text-center hover:border-green-400 hover:shadow-lg transition-all"
          >
            <div className="inline-flex items-center justify-center w-14 h-14 bg-green-100 rounded-xl mb-3 group-hover:bg-green-200 transition-colors">
              <Truck className="w-7 h-7 text-green-600" />
            </div>
            <p className="font-semibold text-gray-800">Delivery</p>
            <p className="text-sm text-gray-500 mt-1">Pedidos delivery</p>
          </button>

          <button
            onClick={() => onNavigate('produtos')}
            className="group bg-gradient-to-br from-purple-50 to-violet-50 border-2 border-purple-200 rounded-2xl p-6 text-center hover:border-purple-400 hover:shadow-lg transition-all"
          >
            <div className="inline-flex items-center justify-center w-14 h-14 bg-purple-100 rounded-xl mb-3 group-hover:bg-purple-200 transition-colors">
              <Package className="w-7 h-7 text-purple-600" />
            </div>
            <p className="font-semibold text-gray-800">Produtos</p>
            <p className="text-sm text-gray-500 mt-1">Cardápio e preços</p>
          </button>

          <button
            onClick={() => onNavigate('estoque')}
            className="group bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-2xl p-6 text-center hover:border-blue-400 hover:shadow-lg transition-all"
          >
            <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-100 rounded-xl mb-3 group-hover:bg-blue-200 transition-colors">
              <ArrowRightCircle className="w-7 h-7 text-blue-600 rotate-90" />
            </div>
            <p className="font-semibold text-gray-800">Estoque</p>
            <p className="text-sm text-gray-500 mt-1">Entrada e saída</p>
          </button>
        </div>
      </div>

      {/* Cardápio Digital Section */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className={`bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl shadow-lg p-6 md:p-8 text-white transform transition-all duration-700 delay-800 ${animated ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="bg-white/20 p-3 rounded-xl">
                <Globe className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Cardápio Digital</h3>
                <p className="text-green-100 text-sm">Compartilhe para receber pedidos online</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <button
                onClick={copiarLinkCardapio}
                className="flex items-center justify-center gap-2 bg-white text-green-600 px-4 py-2 rounded-lg font-medium hover:bg-green-50 transition-colors"
              >
                {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                {copied ? 'Copiado!' : 'Copiar Link'}
              </button>
              <button
                onClick={() => window.open(cardapioUrl, '_blank')}
                className="flex items-center justify-center gap-2 bg-white/20 px-4 py-2 rounded-lg font-medium hover:bg-white/30 transition-colors"
              >
                <QrCode className="w-5 h-5" />
                Abrir Cardápio
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Info Section */}
      <div className="bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className={`bg-white rounded-2xl shadow-lg p-6 md:p-8 transform transition-all duration-700 delay-800 ${animated ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="flex-shrink-0">
                <div className="w-32 h-32 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg">
                  <Store className="w-16 h-16 text-white" />
                </div>
              </div>
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-2xl font-bold text-gray-800 mb-2">{config?.nome_empresa ?? ''} {config?.subtitulo ?? ''}</h3>
                <p className="text-gray-600 mb-4">
                  {config?.descricao ?? ''}
                </p>
                <div className="flex flex-wrap justify-center md:justify-start gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-orange-500" />
                    <span>{formatPhone(config?.whatsapp_pedidos || '')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-orange-500" />
                    <span>{config?.endereco || ''}{config?.cidade ? `, ${config.cidade}` : ''}{config?.estado ? ` - ${config.estado}` : ''}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-orange-500" />
                    <span>{config?.aberto !== false ? 'Aberto agora' : 'Fechado'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative cactus elements */}
      <div className="fixed bottom-4 right-4 opacity-10 pointer-events-none">
        <svg width="120" height="200" viewBox="0 0 120 200" fill="none">
          <path d="M60 200V120M60 120C60 80 20 60 20 30C20 0 40 0 40 0" stroke="currentColor" strokeWidth="8" className="text-green-600" />
          <path d="M60 120C60 80 100 60 100 30C100 0 80 0 80 0" stroke="currentColor" strokeWidth="8" className="text-green-600" />
          <path d="M60 80C60 60 30 50 30 20" stroke="currentColor" strokeWidth="6" className="text-green-600" />
        </svg>
      </div>
    </div>
  );
}
