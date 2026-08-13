import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import api from '../../../api/api';

export interface Account {
  id: number;
  name: string;
  type: 'cash' | 'bank' | 'credit_card' | 'person' | 'expense' | 'income' | 'asset' | 'liability' | 'business' | 'equity' | string;
  is_active: boolean;
  is_system: boolean;
  computed_balance: string;
  opening_balance: string;
  credit_limit?: string | null;
  parent_account_id?: number | null;
}

// Types visible in the Accounts directory (matches web app filter)
export const VISIBLE_ACCOUNT_TYPES = ['cash', 'bank', 'credit_card', 'asset', 'liability', 'business', 'equity'];

export interface StatementEntry {
  transaction_id: number;
  date: string;
  description: string;
  type: string;
  reference_number: string | null;
  debit: string;
  credit: string;
  balance: string; // Running balance
}

export interface PaginatedStatement {
  current_page: number;
  data: StatementEntry[];
  last_page: number;
  next_page_url: string | null;
}

export const useAccounts = (type?: string) => {
  return useQuery({
    queryKey: ['accounts', type],
    queryFn: async () => {
      const response = await api.get<Account[]>('/accounts', {
        params: { type, is_active: true }
      });
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useAccountStatement = (accountId: number) => {
  return useInfiniteQuery({
    queryKey: ['account_statement', accountId],
    initialPageParam: 1,
    queryFn: async ({ pageParam = 1 }) => {
      const response = await api.get<{ account: Account; statement: PaginatedStatement }>(
        `/accounts/${accountId}/statement`,
        { params: { page: pageParam, per_page: 20 } }
      );
      return response.data;
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.statement.current_page < lastPage.statement.last_page) {
        return lastPage.statement.current_page + 1;
      }
      return undefined;
    },
  });
};
