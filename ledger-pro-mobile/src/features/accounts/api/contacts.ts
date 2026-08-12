import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import api from '../../../api/api';
import { Account, PaginatedStatement } from './accounts';

export interface Contact {
  id: number;
  name: string;
  phone: string | null;
  notes: string | null;
  account_id: number;
  account?: Account;
  computed_balance: string;
  opening_balance: string;
  opening_balance_type: 'receivable' | 'payable';
}

export interface ContactSummary {
  contact: Contact;
  total_purchases: number;
  total_sales: string;
  amount_received: string;
  total_given: string;
  outstanding: string;
  profit_generated: string;
  recent_transactions: any[];
  sold_items: any[];
}

export const useContacts = () => {
  return useQuery({
    queryKey: ['contacts'],
    queryFn: async () => {
      const response = await api.get<Contact[]>('/contacts');
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useContactSummary = (contactId: number) => {
  return useQuery({
    queryKey: ['contact_summary', contactId],
    queryFn: async () => {
      const response = await api.get<ContactSummary>(`/contacts/${contactId}/summary`);
      return response.data;
    },
  });
};

export const useContactLedger = (contactId: number) => {
  return useInfiniteQuery({
    queryKey: ['contact_ledger', contactId],
    initialPageParam: 1,
    queryFn: async ({ pageParam = 1 }) => {
      const response = await api.get<{ contact: Contact; statement: PaginatedStatement }>(
        `/contacts/${contactId}/ledger`,
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
