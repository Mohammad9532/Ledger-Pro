import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import api from '@/lib/api';

interface User {
  id: number;
  name: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('auth_token'));
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

  const login = async (email: string, password: string) => {
    const res = await api.post('/login', { email, password });
    localStorage.setItem('auth_token', res.data.token);
    setToken(res.data.token);
    setUser(res.data.user);
  };

  const register = async (name: string, email: string, password: string) => {
    const res = await api.post('/register', { name, email, password, password_confirmation: password });
    localStorage.setItem('auth_token', res.data.token);
    setToken(res.data.token);
    setUser(res.data.user);
  };

  const logout = async () => {
    try {
      await api.post('/logout');
    } catch {}
    localStorage.removeItem('auth_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
