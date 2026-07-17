import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import api from '@/lib/api';

interface User {
  id: number;
  name: string;
  email: string;
  company?: {
    company_name: string;
    onboarding_completed_at: string | null;
  };
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;        // true once user is resolved and non-null
  isOnboardingComplete: boolean;   // true when company.onboarding_completed_at is set
  login: (email: string, password: string, rememberMe?: boolean) => Promise<'onboarding' | 'dashboard'>;
  register: (data: { name: string; email: string; password: string; company_name: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  // Check both: localStorage (remember me) and sessionStorage (tab session)
  const [token, setToken] = useState<string | null>(
    localStorage.getItem('auth_token') ?? sessionStorage.getItem('auth_token')
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (token) {
      api.get('/user')
        .then(res => {
          setUser(res.data);
        })
        .catch(() => {
          localStorage.removeItem('auth_token');
          setToken(null);
          setUser(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [token]);

  const login = async (email: string, password: string, rememberMe = false): Promise<'onboarding' | 'dashboard'> => {
    const res = await api.post('/login', { email, password });
    const token = res.data.token;
    // rememberMe: persist across browser sessions (localStorage) vs. tab-only (sessionStorage)
    if (rememberMe) {
      localStorage.setItem('auth_token', token);
    } else {
      sessionStorage.setItem('auth_token', token);
      localStorage.removeItem('auth_token'); // clear any previous persistent token
    }
    setToken(token);
    setUser(res.data.user);
    return res.data.user?.company?.onboarding_completed_at ? 'dashboard' : 'onboarding';
  };

  const register = async (data: { name: string; email: string; password: string; company_name: string }) => {
    await api.post('/register', { ...data, password_confirmation: data.password });
    // Do NOT log the user in after register — they must verify email first.
    // Caller holds the email to prefill the verify page.
  };

  const logout = async () => {
    try {
      await api.post('/logout');
    } catch {}
    localStorage.removeItem('auth_token');
    sessionStorage.removeItem('auth_token');
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const res = await api.get('/user');
      setUser(res.data);
    } catch {
      setUser(null);
    }
  };

  const isAuthenticated = !!user;
  const isOnboardingComplete = !!user?.company?.onboarding_completed_at;

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated, isOnboardingComplete, login, register, logout, refreshUser, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
