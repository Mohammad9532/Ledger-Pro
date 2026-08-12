import { useQuery } from '@tanstack/react-query';
import api from '../../../api/api';
import { DashboardResponse } from '../types/dashboard';

export const fetchDashboard = async (): Promise<DashboardResponse> => {
  const { data } = await api.get('/dashboard');
  return data;
};

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: fetchDashboard,
    staleTime: 1000 * 60 * 5, // Data is fresh for 5 minutes
    gcTime: 1000 * 60 * 60 * 24, // Keep cached data for 24 hours (offline awareness)
  });
}
