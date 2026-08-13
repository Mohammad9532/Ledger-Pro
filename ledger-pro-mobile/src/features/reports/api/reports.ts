import { useQuery } from '@tanstack/react-query';
import api from '../../../api/api';

export interface TrialBalanceRow {
  account_id: number;
  account_name: string;
  account_code: string | null;
  account_type: string;
  debit: string;
  credit: string;
}

export interface TrialBalanceResult {
  rows: TrialBalanceRow[];
  total_debit: string;
  total_credit: string;
  is_balanced: boolean;
  as_of: string;
  generated_at: string;
  currency: string;
  tenant: string;
}

export interface ProfitAndLossRow {
  account_id: number;
  account_name: string;
  account_type: string;
  amount: string;
}

export interface ProfitAndLossResult {
  income: ProfitAndLossRow[];
  expenses: ProfitAndLossRow[];
  total_income: string;
  total_expense: string;
  net_profit: string;
  period: { start: string; end: string };
  generated_at: string;
  currency: string;
  tenant: string;
}

export interface BalanceSheetRow {
  id: number | string;
  name: string;
  type: string;
  balance: string;
}

export interface BalanceSheetResult {
  current_assets: BalanceSheetRow[];
  non_current_assets: BalanceSheetRow[];
  current_liabilities: BalanceSheetRow[];
  non_current_liabilities: BalanceSheetRow[];
  equity: BalanceSheetRow[];
  total_current_assets: string;
  total_non_current_assets: string;
  total_current_liabilities: string;
  total_non_current_liabilities: string;
  total_assets: string;
  total_liabilities: string;
  total_equity: string;
  total_liabilities_and_equity: string;
  is_balanced: boolean;
  difference: string;
  as_of: string;
  generated_at: string;
  currency: string;
  tenant: string;
}

export interface CashFlowRow {
  account_id: number;
  account_name: string;
  account_type: string;
  amount: string;
}

export interface CashFlowResult {
  operating_activities: CashFlowRow[];
  investing_activities: CashFlowRow[];
  financing_activities: CashFlowRow[];
  net_operating_cash_flow: string;
  net_investing_cash_flow: string;
  net_financing_cash_flow: string;
  net_cash_flow: string;
  opening_balance: string;
  closing_balance: string;
  period: { start: string; end: string };
  generated_at: string;
  currency: string;
  tenant: string;
}

export const useTrialBalance = (date?: string) => {
  return useQuery({
    queryKey: ['trial-balance', date],
    queryFn: async (): Promise<TrialBalanceResult> => {
      const response = await api.get('/reports/trial-balance', {
        params: { date }
      });
      return response.data;
    }
  });
};

export const useProfitAndLoss = (startDate?: string, endDate?: string) => {
  return useQuery({
    queryKey: ['profit-loss', startDate, endDate],
    queryFn: async (): Promise<ProfitAndLossResult> => {
      const response = await api.get('/reports/profit-loss', {
        params: { start_date: startDate, end_date: endDate }
      });
      return response.data;
    }
  });
};

export const useBalanceSheet = (date?: string) => {
  return useQuery({
    queryKey: ['balance-sheet', date],
    queryFn: async (): Promise<BalanceSheetResult> => {
      const response = await api.get('/reports/balance-sheet', {
        params: { date }
      });
      return response.data;
    }
  });
};

export const useCashFlow = (startDate?: string, endDate?: string) => {
  return useQuery({
    queryKey: ['cash-flow', startDate, endDate],
    queryFn: async (): Promise<CashFlowResult> => {
      const response = await api.get('/reports/cash-flow', {
        params: { start_date: startDate, end_date: endDate }
      });
      return response.data;
    }
  });
};

export interface ExpenseSummaryCategory {
  category_name: string | null;
  count: number;
  total: string;
}

export interface ExpenseSummaryResult {
  categories: ExpenseSummaryCategory[];
  grand_total: string;
  period: { start: string; end: string };
}

export const useExpenseSummary = (startDate?: string, endDate?: string, includeBusiness = false) =>
  useQuery({
    queryKey: ['expense-summary', startDate, endDate, includeBusiness],
    queryFn: async (): Promise<ExpenseSummaryResult> => {
      const res = await api.get('/reports/expense-summary', {
        params: { start_date: startDate, end_date: endDate, include_business: includeBusiness },
      });
      return res.data;
    },
  });

export interface IncomeSummaryItem {
  id: number;
  name: string;
  amount: string;
}

export interface IncomeSummaryResult {
  items: IncomeSummaryItem[];
  total: string;
  period: { start: string; end: string };
}

export const useIncomeSummary = (startDate?: string, endDate?: string) =>
  useQuery({
    queryKey: ['income-summary', startDate, endDate],
    queryFn: async (): Promise<IncomeSummaryResult> => {
      const res = await api.get('/reports/income-summary', {
        params: { start_date: startDate, end_date: endDate },
      });
      return res.data;
    },
  });

export interface CreditCardSummaryItem {
  id: number;
  name: string;
  balance: string;
  outstanding: string;
  credit_limit: string | null;
  available_balance: string | null;
  parent_account_id: number | null;
  parent_name: string | null;
}

export const useCreditCardSummary = () =>
  useQuery({
    queryKey: ['credit-card-summary'],
    queryFn: async (): Promise<CreditCardSummaryItem[]> => {
      const res = await api.get('/reports/credit-card-summary');
      return res.data;
    },
  });

export interface AccountForCC {
  id: number;
  name: string;
  type: string;
}

export const useAccountsForCC = () =>
  useQuery({
    queryKey: ['accounts-for-cc'],
    queryFn: async (): Promise<AccountForCC[]> => {
      const res = await api.get('/accounts');
      return (res.data as AccountForCC[]).filter(
        (a) => !['income', 'expense', 'system'].includes(a.type)
      );
    },
  });
export interface ReceivablePayableRow {
  id: number;
  name: string;
  contact_id: number | null;
  balance: string;
}

export interface ReceivablePayableResult {
  items: ReceivablePayableRow[];
  total: string;
  as_of: string;
  generated_at: string;
  currency: string;
  tenant: string;
  report_type: string;
}

export const useReceivables = (date?: string) => {
  return useQuery({
    queryKey: ['receivables', date],
    queryFn: async (): Promise<ReceivablePayableResult> => {
      const response = await api.get('/reports/receivable', {
        params: { date }
      });
      return response.data;
    }
  });
};

export const usePayables = (date?: string) => {
  return useQuery({
    queryKey: ['payables', date],
    queryFn: async (): Promise<ReceivablePayableResult> => {
      const response = await api.get('/reports/payable', {
        params: { date }
      });
      return response.data;
    }
  });
};

