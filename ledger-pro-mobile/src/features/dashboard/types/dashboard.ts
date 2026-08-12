export interface DashboardSummary {
  cash: string;
  bank: string;
  credit_card: string;
  receivable: string;
  payable: string;
  asset: string;
  liability: string;
  business: string;
  surplus: string;
}

export interface PeriodSummary {
  income: string;
  expense: string;
  profit: string;
}

export interface MonthlyBreakdown {
  month: number;
  month_name: string;
  income: string;
  expense: string;
  profit: string;
}

export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  route: string;
}

export interface RecentTransaction {
  id: number;
  date: string;
  description: string;
  amount: string;
  type: string;
  reference_number: string | null;
  entries: any[];
  expense_category?: any;
  business_item?: any;
}

export interface DashboardResponse {
  summary: DashboardSummary;
  monthly: {
    today: PeriodSummary;
    this_month: PeriodSummary;
  };
  charts: {
    monthly_breakdown: MonthlyBreakdown[];
  };
  quick_actions: QuickAction[];
  recent_transactions: RecentTransaction[];
  notifications: any[];
}
