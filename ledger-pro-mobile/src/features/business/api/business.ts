import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../api/api';

export interface BusinessItem {
  id: number;
  description: string;
  metadata?: any;
  buyer?: { id: number; name: string };
  status: 'purchased' | 'sold' | 'cancelled';
  created_at: string;
  updated_at: string;
  purchase_cost: string;
  sale_amount: string | null;
  profit: string | null;
  cancellation_date: string | null;
}

export interface BusinessListResponse {
  data: BusinessItem[];
  current_page: number;
  last_page: number;
}

export const useBusinessItems = (page: number = 1, searchQuery?: string, statusFilter?: string) => {
  return useQuery({
    queryKey: ['business-items', page, searchQuery, statusFilter],
    queryFn: async (): Promise<BusinessListResponse> => {
      const response = await api.get('/business-items', {
        params: { 
          page, 
          search: searchQuery,
          status: statusFilter !== 'all' ? statusFilter : undefined
        }
      });
      return response.data;
    }
  });
};

export const useBusinessProfit = () => {
  return useQuery({
    queryKey: ['business-profit'],
    queryFn: async () => {
      const response = await api.get('/business-profit');
      return response.data; // { total_purchases, total_sales, total_profit }
    }
  });
};

export const useCreateBusinessItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/business-items', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-items'] });
      queryClient.invalidateQueries({ queryKey: ['business-profit'] });
      queryClient.invalidateQueries({ queryKey: ['account_statement'] });
    }
  });
};

export const useSellBusinessItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await api.post(`/business-items/${id}/sell`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-items'] });
      queryClient.invalidateQueries({ queryKey: ['business-profit'] });
      queryClient.invalidateQueries({ queryKey: ['account_statement'] });
    }
  });
};

export const useCancelBusinessItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await api.post(`/business-items/${id}/cancel`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-items'] });
      queryClient.invalidateQueries({ queryKey: ['business-profit'] });
      queryClient.invalidateQueries({ queryKey: ['account_statement'] });
    }
  });
};

export const useGenerateDocument = () => {
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      // Return blob so we can read binary data natively
      const response = await api.post(`/business-items/${id}/documents`, data, {
        responseType: 'blob'
      });
      return response.data;
    }
  });
};
