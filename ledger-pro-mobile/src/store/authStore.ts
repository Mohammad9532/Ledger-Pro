import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export interface User {
  id: number;
  name: string;
  email: string;
  avatar?: string;
  currency_code?: string;
}

export interface AuthState {
  token: string | null;
  user: User | null;
  company: any | null;
  tenant: any | null;
  isLoading: boolean;
  setAuth: (token: string, user: User, company?: any, tenant?: any) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  company: null,
  tenant: null,
  isLoading: true,

  setAuth: async (token, user, company = null, tenant = null) => {
    if (Platform.OS === 'web') {
      localStorage.setItem('auth_token', token);
      localStorage.setItem('auth_user', JSON.stringify(user));
      if (company) localStorage.setItem('auth_company', JSON.stringify(company));
      if (tenant) localStorage.setItem('auth_tenant', JSON.stringify(tenant));
    } else {
      await SecureStore.setItemAsync('auth_token', token);
      await SecureStore.setItemAsync('auth_user', JSON.stringify(user));
      if (company) await SecureStore.setItemAsync('auth_company', JSON.stringify(company));
      if (tenant) await SecureStore.setItemAsync('auth_tenant', JSON.stringify(tenant));
    }
    set({ token, user, company, tenant });
  },

  logout: async () => {
    if (Platform.OS === 'web') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      localStorage.removeItem('auth_company');
      localStorage.removeItem('auth_tenant');
    } else {
      await SecureStore.deleteItemAsync('auth_token');
      await SecureStore.deleteItemAsync('auth_user');
      await SecureStore.deleteItemAsync('auth_company');
      await SecureStore.deleteItemAsync('auth_tenant');
    }
    set({ token: null, user: null, company: null, tenant: null });
  },

  restoreSession: async () => {
    try {
      let token, userStr, companyStr, tenantStr;
      
      if (Platform.OS === 'web') {
        token = localStorage.getItem('auth_token');
        userStr = localStorage.getItem('auth_user');
        companyStr = localStorage.getItem('auth_company');
        tenantStr = localStorage.getItem('auth_tenant');
      } else {
        token = await SecureStore.getItemAsync('auth_token');
        userStr = await SecureStore.getItemAsync('auth_user');
        companyStr = await SecureStore.getItemAsync('auth_company');
        tenantStr = await SecureStore.getItemAsync('auth_tenant');
      }

      if (token && userStr) {
        set({
          token,
          user: JSON.parse(userStr),
          company: companyStr ? JSON.parse(companyStr) : null,
          tenant: tenantStr ? JSON.parse(tenantStr) : null,
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },
}));
