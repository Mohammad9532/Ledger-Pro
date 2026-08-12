import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import api from '../../../api/api';

export interface Account {
  id: number;
  name: string;
  type: 'cash' | 'bank' | 'credit_card' | 'person' | 'expense' | 'income' | 'asset' | 'liability' | 'business' | 'equity';
  is_active: boolean;
  computed_balance: string;
  opening_balance: string;
}

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
