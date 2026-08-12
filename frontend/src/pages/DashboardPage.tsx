import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import api from '@/lib/api';
import {
  Wallet, Building2, CreditCard, ArrowUpRight, ArrowDownLeft,
  TrendingUp, TrendingDown, DollarSign, Calendar
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, AreaChart, Area
} from 'recharts';

interface DashboardData {
  summary: { cash: string; bank: string; credit_card: string; receivable: string; payable: string; surplus?: string; asset?: string; business?: string };
  monthly: {
    today: { income: string; expense: string; profit: string };
    this_month: { income: string; expense: string; profit: string };
  };
  charts: { monthly_breakdown: Array<{ month: number; month_name: string; income: string; expense: string; profit: string }> };
  recent_transactions: any[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard').then(res => {
      setData(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) return <p className="text-muted-foreground">Failed to load dashboard data</p>;

  const balances = data.summary;
  const today    = data.monthly.today;
  const monthly  = data.monthly.this_month;

  const kpiCards = [
    { label: 'Net Surplus', value: balances.surplus || '0', icon: DollarSign, color: parseFloat(balances.surplus || '0') >= 0 ? 'from-indigo-500 to-indigo-600' : 'from-rose-500 to-rose-600', textColor: parseFloat(balances.surplus || '0') >= 0 ? 'text-indigo-500' : 'text-rose-500' },
    { label: 'Total Assets', value: balances.asset || '0', icon: Wallet, color: 'from-teal-500 to-teal-600', textColor: 'text-teal-500' },
    { label: 'Cash Balance', value: balances.cash, icon: Wallet, color: 'from-emerald-500 to-emerald-600', textColor: 'text-emerald-500' },
    { label: 'Bank Balance', value: balances.bank, icon: Building2, color: 'from-blue-500 to-blue-600', textColor: 'text-blue-500' },
    { label: 'Credit Card Due', value: balances.credit_card, icon: CreditCard, color: 'from-orange-500 to-orange-600', textColor: 'text-orange-500', invert: true },
    { label: 'Total Receivable', value: balances.receivable, icon: ArrowDownLeft, color: 'from-purple-500 to-purple-600', textColor: 'text-purple-500' },
    { label: 'Total Payable', value: balances.payable, icon: ArrowUpRight, color: 'from-rose-500 to-rose-600', textColor: 'text-rose-500', invert: true },
  ];

  const todayCards = [
    { label: "Today's Income",  value: today.income,  icon: TrendingUp,   color: 'text-emerald-500' },
    { label: "Today's Expense", value: today.expense, icon: TrendingDown,  color: 'text-rose-500' },
    { label: "Today's Profit",  value: today.profit,  icon: DollarSign,   color: parseFloat(today.profit) >= 0 ? 'text-emerald-500' : 'text-rose-500' },
  ];

  const chartData = (data.charts.monthly_breakdown || []).map(m => ({
    name: m.month_name,
    income: parseFloat(m.income),
    expense: parseFloat(m.expense),
    profit: parseFloat(m.profit),
  }));


  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Financial overview at a glance</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {kpiCards.map((card, i) => (
          <Card key={i} className="card-hover animate-fade-in overflow-hidden" style={{ animationDelay: `${i * 50}ms` }}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground font-medium">{card.label}</span>
                <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${card.color} flex items-center justify-center`}>
                  <card.icon className="w-4 h-4 text-white" />
                </div>
              </div>
              <p className={`text-xl font-bold ${card.textColor}`}>
                {card.invert ? formatCurrency(Math.abs(parseFloat(card.value))) : formatCurrency(card.value)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Today's Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {todayCards.map((card, i) => (
          <Card key={i} className="card-hover animate-fade-in" style={{ animationDelay: `${(i + 5) * 50}ms` }}>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                  <card.icon className={`w-5 h-5 ${card.color}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{card.label}</p>
                  <p className={`text-lg font-bold ${card.color}`}>{formatCurrency(card.value)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Monthly Summary Card */}
      <Card className="animate-fade-in" style={{ animationDelay: '400ms' }}>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-lg">Monthly Summary</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Income: {formatCurrency(monthly.income)} | Expense: {formatCurrency(monthly.expense)} | Profit: <span className={parseFloat(monthly.profit) >= 0 ? 'text-emerald-500' : 'text-rose-500'}>{formatCurrency(monthly.profit)}</span>
            </p>
          </div>
          <Calendar className="w-5 h-5 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '13px',
                  }}
                  formatter={(value: any) => formatCurrency(Number(value))}
                />
                <Legend />
                <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} name="Income" />
                <Bar dataKey="expense" fill="#f43f5e" radius={[4, 4, 0, 0]} name="Expense" />
                <Bar dataKey="profit" fill="#6366f1" radius={[4, 4, 0, 0]} name="Profit" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
