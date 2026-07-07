import { UtensilsCrossed, Package, Truck, ClipboardList, Home, Globe, Bell, DollarSign, Settings, LogOut, User } from 'lucide-react';
import { TabType } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { LogoMandacaru } from './LogoMandacaru';

interface HeaderProps {
  activeTab: TabType | 'home';
  onTabChange: (tab: TabType | 'home') => void;
  pedidosOnlineCount?: number;
  user?: { email: string } | null;
  logoSrc?: string | null;
}

const tabs = [
  { id: 'home' as const, label: 'Início', icon: Home },
  { id: 'atendimento' as TabType, label: 'Atendimento', icon: UtensilsCrossed },
  { id: 'delivery' as TabType, label: 'Delivery', icon: Truck },
  { id: 'pedidos-online' as TabType, label: 'Online', icon: Globe },
  { id: 'financeiro' as TabType, label: 'Financeiro', icon: DollarSign },
  { id: 'produtos' as TabType, label: 'Produtos', icon: Package },
  { id: 'estoque' as TabType, label: 'Entrada/Saída', icon: ClipboardList },
  { id: 'configuracoes' as TabType, label: 'Config', icon: Settings },
];

export function Header({ activeTab, onTabChange, pedidosOnlineCount = 0, logoSrc }: HeaderProps) {
  const { signOut } = useAuth();

  return (
    <header className="bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <LogoMandacaru size={40} className="rounded-lg" src={logoSrc} />
            <button
              onClick={() => onTabChange('home')}
              className="flex items-center gap-3 group"
            >
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold text-white">Mandacaru</h1>
                <p className="text-xs text-amber-100">Esfihas & Jantinha</p>
              </div>
            </button>
          </div>

          <nav className="flex gap-1 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const showBadge = tab.id === 'pedidos-online' && pedidosOnlineCount > 0;

              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id as TabType | 'home')}
                  className={`relative flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg font-medium transition-all duration-200 whitespace-nowrap ${
                    isActive
                      ? 'bg-white text-orange-600 shadow-md'
                      : 'text-white/90 hover:bg-white/20 hover:text-white'
                  }`}
                >
                  {showBadge && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center animate-pulse">
                      {pedidosOnlineCount}
                    </span>
                  )}
                  <Icon className="w-4 h-4" />
                  <span className="hidden md:inline">{tab.label}</span>
                  {tab.id === 'pedidos-online' && showBadge && (
                    <Bell className="w-3 h-3 absolute -top-2 left-1/2 -translate-x-1/2 text-red-500 animate-bounce" />
                  )}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 ml-2">
            <div className="hidden sm:flex items-center gap-1.5 text-white/80 text-xs">
              <User className="w-3.5 h-3.5" />
              <span className="font-medium">Yara e Neto</span>
            </div>
            <button
              onClick={signOut}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition-all text-xs font-medium"
              title="Sair"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
