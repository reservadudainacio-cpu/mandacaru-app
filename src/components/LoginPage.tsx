import { useState, useRef, useEffect } from 'react';
import { Store, ShoppingBag, TrendingUp, Package, Globe, Lock, Eye, EyeOff, AlertCircle, Loader2, ChefHat } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function LoginPage() {
  const { signIn } = useAuth();
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [tentativas, setTentativas] = useState(0);
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (cooldown > 0) {
      cooldownRef.current = setInterval(() => {
        setCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(cooldownRef.current);
            setTentativas(0);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(cooldownRef.current);
    }
  }, [cooldown]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!login.trim() || !senha) {
      setErro('Preencha login e senha.');
      return;
    }

    if (cooldown > 0) {
      setErro(`Muitas tentativas. Aguarde ${cooldown}s.`);
      return;
    }

    setLoading(true);
    setErro('');

    const result = await signIn(login.trim(), senha);

    if (result.error) {
      const novasTentativas = tentativas + 1;
      setTentativas(novasTentativas);
      if (novasTentativas >= 5) {
        setCooldown(60);
        setErro('Muitas tentativas. Aguarde 60 segundos.');
      } else {
        setErro(result.error);
      }
      setLoading(false);
    }
  }

  const beneficios = [
    { icon: ShoppingBag, label: 'Pedidos em tempo real', desc: 'Acompanhe pedidos ao vivo' },
    { icon: TrendingUp, label: 'Controle financeiro', desc: 'Receitas, custos e lucros' },
    { icon: Package, label: 'Gestão de produtos', desc: 'Cardápio e estoque' },
    { icon: Globe, label: 'Cardápio digital', desc: 'Integrado e automático' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-slate-900 to-gray-950 relative overflow-hidden flex items-center justify-center p-4">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-red-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/4 right-1/4 w-2 h-2 bg-orange-400/40 rounded-full" />
        <div className="absolute bottom-1/3 left-1/3 w-1.5 h-1.5 bg-amber-400/30 rounded-full" />
        <div className="absolute top-1/3 left-1/2 w-1 h-1 bg-red-400/20 rounded-full" />
      </div>

      <div className="w-full max-w-5xl flex flex-col lg:flex-row items-center gap-8 lg:gap-12 relative z-10">
        {/* Left Side — Benefits */}
        <div className="flex-1 hidden lg:block">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-orange-500/30">
                <Store className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Mandacaru</h1>
                <p className="text-sm text-orange-300/80">Painel Administrativo</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {beneficios.map((b, i) => (
              <div key={i} className="group flex items-start gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-orange-500/20 transition-all duration-300">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-500/20 to-red-500/20 flex items-center justify-center flex-shrink-0 group-hover:from-orange-500/30 group-hover:to-red-500/30 transition-colors">
                  <b.icon className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-200">{b.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 p-4 rounded-2xl bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/20">
            <p className="text-xs text-orange-300/70 leading-relaxed">
              "Aqui você gerencia seu negócio com praticidade, acompanha pedidos em tempo real, controla produtos, estoque, finanças e muito mais."
            </p>
          </div>
        </div>

        {/* Right Side — Login Card */}
        <div className="w-full max-w-md">
          <div className="relative">
            {/* Glow behind card */}
            <div className="absolute -inset-1 bg-gradient-to-r from-orange-500/20 via-red-500/20 to-amber-500/20 rounded-3xl blur-xl" />

            <div className="relative bg-white/[0.04] backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-8 shadow-2xl">
              {/* Mobile logo */}
              <div className="lg:hidden flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
                  <Store className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-white">Mandacaru</h1>
                  <p className="text-xs text-orange-300/70">Painel Administrativo</p>
                </div>
              </div>

              <div className="mb-6">
                <h2 className="text-2xl font-bold text-white">Bem-vindo</h2>
                <p className="text-sm text-gray-400 mt-1">Ao controle do seu negócio.</p>
                <p className="text-xs text-gray-600 mt-1">Acesse para gerenciar pedidos, produtos, estoque, financeiro e configurações.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Login</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="text"
                      placeholder="Digite seu login"
                      value={login}
                      onChange={(e) => setLogin(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-white/[0.06] border border-white/[0.1] rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all"
                      autoComplete="username"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Senha</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type={mostrarSenha ? 'text' : 'password'}
                      placeholder="Digite sua senha"
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      className="w-full pl-10 pr-10 py-3 bg-white/[0.06] border border-white/[0.1] rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarSenha(!mostrarSenha)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                    >
                      {mostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {erro && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <p className="text-sm text-red-300">{erro}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || cooldown > 0}
                  className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-medium text-sm hover:from-orange-600 hover:to-red-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20"
                >
                  {cooldown > 0 ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Aguarde {cooldown}s</>
                  ) : loading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Entrando...</>
                  ) : (
                    <><Lock className="w-4 h-4" /> Entrar</>
                  )}
                </button>
              </form>

              <div className="mt-6 pt-6 border-t border-white/[0.06] text-center">
                <div className="flex items-center justify-center gap-2 text-gray-600">
                  <ChefHat className="w-3.5 h-3.5" />
                  <p className="text-xs">Mandacaru &mdash; Esfihas &amp; Jantinha</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
