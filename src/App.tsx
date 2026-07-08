import { useState, useEffect, lazy, Suspense } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Layout } from './components/Layout';
import { Header } from './components/Header';
import { HomePage } from './components/HomePage';
import { LoginPage } from './components/LoginPage';
import { CardapioDigital } from './components/CardapioDigital';
import { TabType, EmpresaConfig } from './types';
import { supabase } from './lib/supabase';

const AtendimentoTab = lazy(() => import('./components/AtendimentoTab').then(m => ({ default: m.AtendimentoTab })));
const DeliveryTab = lazy(() => import('./components/DeliveryTab').then(m => ({ default: m.DeliveryTab })));
const ProdutosTab = lazy(() => import('./components/ProdutosTab').then(m => ({ default: m.ProdutosTab })));
const EstoqueTab = lazy(() => import('./components/EstoqueTab').then(m => ({ default: m.EstoqueTab })));
const PedidosOnlineTab = lazy(() => import('./components/PedidosOnlineTab').then(m => ({ default: m.PedidosOnlineTab })));
const FinanceiroTab = lazy(() => import('./components/FinanceiroTab').then(m => ({ default: m.FinanceiroTab })));
const ConfiguracoesTab = lazy(() => import('./components/ConfiguracoesTab').then(m => ({ default: m.ConfiguracoesTab })));

function TabFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
    </div>
  );
}

function AppContent() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType | 'home'>('home');
  const [pedidosOnlineCount, setPedidosOnlineCount] = useState(0);
  const [modoCardapio, setModoCardapio] = useState(false);
  const [config, setConfig] = useState<EmpresaConfig | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('cardapio') === 'true') {
      setModoCardapio(true);
    }
  }, []);

  useEffect(() => {
    if (modoCardapio) return;

    supabase.from('configuracoes_empresa').select('*').limit(1).maybeSingle().then(({ data }) => setConfig(data));

    async function countPedidosOnline() {
      const { count } = await supabase
        .from('pedidos')
        .select('*', { count: 'exact', head: true })
        .eq('tipo', 'online')
        .in('status', ['novo', 'aberto']);
      setPedidosOnlineCount(count || 0);
    }

    countPedidosOnline();
    const interval = setInterval(countPedidosOnline, 10000);
    return () => clearInterval(interval);
  }, [modoCardapio]);

  // Cardapio digital público — sempre acessível sem login
  if (modoCardapio) {
    return <CardapioDigital />;
  }

  // Enquanto verifica sessão, mostra loading
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
      </div>
    );
  }

  // Não logado → tela de login
  if (!user) {
    return <LoginPage />;
  }

  const handleNavigate = (tab: TabType | 'home') => {
    setActiveTab(tab);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return <HomePage onNavigate={handleNavigate} pedidosOnlineCount={pedidosOnlineCount} user={user} />;
      case 'atendimento':
        return <AtendimentoTab />;
      case 'delivery':
        return <DeliveryTab />;
      case 'pedidos-online':
        return <PedidosOnlineTab />;
      case 'financeiro':
        return <FinanceiroTab />;
      case 'produtos':
        return <ProdutosTab />;
      case 'estoque':
        return <EstoqueTab />;
      case 'configuracoes':
        return <ConfiguracoesTab />;
      default:
        return <HomePage onNavigate={handleNavigate} />;
    }
  };

  return (
    <Layout>
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        pedidosOnlineCount={pedidosOnlineCount}
        user={user}
        logoSrc={config?.logo_url}
      />
      <main>
        <Suspense fallback={<TabFallback />}>{renderContent()}</Suspense>
      </main>
    </Layout>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
