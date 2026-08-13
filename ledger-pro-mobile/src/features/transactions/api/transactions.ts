import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../../api/api';

export interface TransactionPayload {
  type: 'expense' | 'income' | 'transfer' | 'journal'; // simplified for frontend, mapped to backend types if needed
  date: string;
  amount: number;
  description?: string;
  entries: Array<{
    account_id: number;
    debit?: number;
    credit?: number;
  }>;
}

export const useCreateTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: TransactionPayload) => {
      const response = await api.post('/transactions', payload);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate relevant queries to fetch fresh data
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
};

export interface TransactionListResponse {
  data: Array<{
    id: number;
    reference: string;
    date: string;
    type: string;
    description: string;
    amount: string;
    entries: Array<{
      account_id: number;
      account_name: string;
      debit: string;
      credit: string;
    }>;
  }>;
  current_page: number;
  last_page: number;
}

export const useTransactions = (page: number = 1, searchQuery?: string) => {
  return useQuery({
    queryKey: ['transactions', page, searchQuery],
    queryFn: async (): Promise<TransactionListResponse> => {
      const response = await api.get('/transactions', {
        params: { page, search: searchQuery }
      });
      return response.data;
    }
  });
};
