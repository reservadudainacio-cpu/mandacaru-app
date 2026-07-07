import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';

type User = {
  email: string;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  signIn: (login: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signIn: async () => ({}),
  signOut: async () => {},
});

const ADMIN_LOGIN_MAP: Record<string, string> = {
  'Mandacura@neto@yara': 'admin@mandacaru.com',
};

function resolveEmail(login: string): string {
  return ADMIN_LOGIN_MAP[login] || login;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({ email: session.user.email ?? '' });
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({ email: session.user.email ?? '' });
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signIn(login: string, password: string): Promise<{ error?: string }> {
    const email = resolveEmail(login);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      if (error.message === 'Invalid login credentials') {
        return { error: 'Login ou senha inválidos.' };
      }
      if (import.meta.env.DEV) console.error('Erro de autenticação:', error);
      return { error: 'Erro ao conectar. Tente novamente.' };
    }

    return {};
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
