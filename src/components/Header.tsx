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
    <header className="glass sticky top-0 z-50 border-b border-orange-100/50 shadow-soft">
      <div className="gradient-primary absolute inset-0 opacity-90" />
      
      <div className="max-w-7xl mx-auto px-4 relative z-10">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Brand */}
          <div className="flex items-center gap-3">
            <div className="relative group">
              <div className="absolute inset-0 bg-white/30 rounded-xl blur-md group-hover:bg-white/40 transition-all" />
              <LogoMandacaru size={44} className="rounded-xl relative shadow-lg" src={logoSrc} />
            </div>
            <button
              onClick={() => onTabChange('home')}
              className="flex items-center gap-3 group"
            >
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold text-white drop-shadow-sm">Mandacaru</h1>
                <p className="text-xs text-amber-100/90 font-medium">Esfihas & Jantinha</p>
              </div>
            </button>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex gap-1 overflow-x-auto scrollbar-hide px-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const showBadge = tab.id === 'pedidos-online' && pedidosOnlineCount > 0;

              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id as TabType | 'home')}
                  className={`relative flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl font-semibold transition-all duration-300 whitespace-nowrap group ${
                    isActive
                      ? 'bg-white text-orange-600 shadow-soft scale-105'
                      : 'text-white/90 hover:bg-white/20 hover:text-white hover:scale-105'
                  }`}
                >
                  {showBadge && (
                    <>
                      <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center animate-bounce shadow-lg ring-2 ring-white z-10">
                        {pedidosOnlineCount}
                      </span>
                      <Bell className="w-3 h-3 absolute -top-3 left-1/2 -translate-x-1/2 text-yellow-300 animate-bounce" />
                    </>
                  )}
                  <Icon className={`w-4 h-4 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                  <span className="hidden md:inline text-sm">{tab.label}</span>
                  {isActive && (
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-1 bg-orange-600 rounded-t-full" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* User Actions */}
          <div className="flex items-center gap-2 ml-2">
            <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-white/10 backdrop-blur-sm rounded-xl text-white/90 text-xs border border-white/20">
              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                <User className="w-3.5 h-3.5" />
              </div>
              <span className="font-semibold">Yara e Neto</span>
            </div>
            <button
              onClick={signOut}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-white/90 hover:text-white hover:bg-white/20 transition-all text-xs font-semibold backdrop-blur-sm border border-white/10 hover:border-white/30 hover:scale-105 active:scale-95"
              title="Sair"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom glow effect */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />
    </header>
  );
}
