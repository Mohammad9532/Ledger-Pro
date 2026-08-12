import { useMutation, useQueryClient } from '@tanstack/react-query';
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
    },
  });
};
