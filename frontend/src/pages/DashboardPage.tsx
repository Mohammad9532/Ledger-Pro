import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { cn, formatCurrency, formatDate, getTransactionTypeLabel } from '@/lib/utils';
import { useChartTheme } from '@/lib/theme';
import api from '@/lib/api';
import {
  Wallet, Building2, CreditCard, ArrowUpRight, ArrowDownLeft,
  TrendingUp, TrendingDown, Landmark, ArrowRight, Equal,
} from 'lucide-react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer,
} from 'recharts';

interface RecentTransaction {
  id: number;
  type: string;
  amount: string;
  date: string;
  description?: string | null;
  txn_number?: string | null;
  entries?: Array<{ account?: { name: string } }>;
}

interface DashboardData {
  summary: { cash: string; bank: string; credit_card: string; receivable: string; payable: string; surplus?: string; asset?: string; business?: string };
  monthly: {
    today: { income: string; expense: string; profit: string };
    this_month: { income: string; expense: string; profit: string };
  };
  charts: { monthly_breakdown: Array<{ month: number; month_name: string; income: string; expense: string; profit: string }> };
  recent_transactions?: RecentTransaction[];
}

type Tone = 'positive' | 'negative' | 'info' | 'violet' | 'orange' | 'teal';
type Range = '6m' | '12m';

const tones: Record<Tone, { icon: string; bar: string; text: string }> = {
  positive: { icon: 'bg-positive/10 text-positive', bar: 'bg-positive', text: 'text-positive' },
  negative: { icon: 'bg-negative/10 text-negative', bar: 'bg-negative', text: 'text-negative' },
  info:     { icon: 'bg-info/10 text-info',         bar: 'bg-info',     text: 'text-info' },
  violet:   { icon: 'bg-violet-500/10 text-violet-500', bar: 'bg-violet-500', text: 'text-violet-500' },
  orange:   { icon: 'bg-orange-500/10 text-orange-500', bar: 'bg-orange-500', text: 'text-orange-500' },
  teal:     { icon: 'bg-teal-500/10 text-teal-500', bar: 'bg-teal-500', text: 'text-teal-500' },
};

const INFLOW = ['income', 'receive_money', 'sale'];
const OUTFLOW = ['expense', 'give_money', 'purchase', 'credit_card_payment'];

const num = (v?: string | number | null) => parseFloat(String(v ?? '0')) || 0;

const compact = (v: number) => {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
  return String(v);
};

function MiniStat({ label, value, tone }: { label: string; value: string; tone: Tone }) {
  return (
    <div className="min-w-0">
      <p className="eyebrow truncate">{label}</p>
      <p className={cn('figure text-lg sm:text-xl mt-1.5 truncate', tones[tone].text)}>{formatCurrency(value)}</p>
    </div>
  );
}

function LedgerRow({ icon: Icon, label, value, tone, strong }: { icon: React.ElementType; label: string; value: string; tone: Tone; strong?: boolean }) {
  return (
    <div className="flex items-center gap-3 py-3">
      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', tones[tone].icon)}>
        <Icon className="w-4 h-4" strokeWidth={2} />
      </div>
      <span className={cn('flex-1 text-sm', strong ? 'font-semibold' : 'text-muted-foreground')}>{label}</span>
      <span className={cn('mono text-sm tabular', strong ? 'font-medium' : '', tones[tone].text)}>{formatCurrency(value)}</span>
    </div>
  );
}

function Swatch({ color, label, line }: { color: string; label: string; line?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      {line ? (
        <span className="relative w-4 h-2.5 flex items-center">
          <span className="w-4 h-[2px] rounded-full" style={{ backgroundColor: color }} />
          <span className="absolute left-1/2 -translate-x-1/2 w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
        </span>
      ) : (
        <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color }} />
      )}
      {label}
    </span>
  );
}

interface TipProps {
  active?: boolean;
  label?: string;
  payload?: Array<{ name?: string; value?: number | string; color?: string; stroke?: string }>;
}

function ChartTip({ active, label, payload }: TipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2.5 shadow-md text-xs min-w-[160px]">
      <p className="eyebrow mb-1.5">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center justify-between gap-4 py-0.5">
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: p.color ?? p.stroke }} />
            {p.name}
          </span>
          <span className={cn('mono tabular', Number(p.value ?? 0) < 0 ? 'text-negative' : 'text-foreground')}>
            {formatCurrency(Number(p.value ?? 0))}
          </span>
        </div>
      ))}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy>
      <div className="space-y-3">
        <div className="skeleton h-3 w-40 rounded" />
        <div className="skeleton h-9 w-56 rounded-md" />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className="skeleton xl:col-span-7 h-56 rounded-2xl" />
        <div className="skeleton xl:col-span-5 h-56 rounded-2xl" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-32 rounded-2xl" />)}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<Range>('6m');
  const chart = useChartTheme();

  useEffect(() => {
    api.get('/dashboard').then(res => {
      setData(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <DashboardSkeleton />;
  if (!data) return <p className="text-muted-foreground">Failed to load dashboard data</p>;

  const balances = data.summary;
  const today = data.monthly.today;
  const monthly = data.monthly.this_month;

  const surplus = num(balances.surplus);
  const totalAssets = num(balances.asset);
  const monthProfit = num(monthly.profit);
  const todayProfit = num(today.profit);

  const now = new Date();
  const monthIndex = now.getMonth() + 1;
  const monthLabel = now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const dayLabel = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  const tiles: Array<{ label: string; value: number; icon: React.ElementType; tone: Tone }> = [
    { label: 'Cash balance',    value: num(balances.cash),                 icon: Wallet,        tone: 'positive' },
    { label: 'Bank balance',    value: num(balances.bank),                 icon: Building2,     tone: 'info' },
    { label: 'Credit card due', value: Math.abs(num(balances.credit_card)), icon: CreditCard,   tone: 'orange' },
    { label: 'Receivable',      value: num(balances.receivable),           icon: ArrowDownLeft, tone: 'violet' },
    { label: 'Payable',         value: Math.abs(num(balances.payable)),    icon: ArrowUpRight,  tone: 'negative' },
    { label: 'Total assets',    value: totalAssets,                        icon: Landmark,      tone: 'teal' },
  ];

  const allMonths = (data.charts.monthly_breakdown || []).map(m => ({
    name: m.month_name.slice(0, 3),
    income: num(m.income),
    expense: num(m.expense),
    profit: num(m.profit),
  }));
  // Six months ending with the current one, or the whole year.
  const chartData = range === '6m'
    ? allMonths.slice(Math.max(0, monthIndex - 6), monthIndex)
    : allMonths;

  const recent = (data.recent_transactions ?? []).slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Title row */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <p className="eyebrow mb-2">Overview · {dayLabel}</p>
          <h1 className="page-title">Dashboard</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="stamp">{monthLabel}</span>
          <Link
            to="/transactions"
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-primary text-primary-foreground text-[13px] font-semibold hover:bg-primary-deep transition-colors"
          >
            New entry <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Hero: net position + today's entries */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <Card className="xl:col-span-7 ledger-sheet overflow-hidden animate-rise-in">
          <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-primary" aria-hidden />
          <CardContent className="p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="eyebrow">Net surplus</p>
                <p className={cn('figure text-[2.2rem] sm:text-[2.8rem] mt-3 truncate', surplus >= 0 ? 'text-foreground' : 'text-negative')}>
                  {formatCurrency(surplus)}
                </p>
                <p className="mt-3 text-sm text-muted-foreground">
                  Total assets <span className="font-medium text-foreground tabular">{formatCurrency(totalAssets)}</span>
                </p>
              </div>
              <div className={cn('stamp shrink-0', monthProfit >= 0 ? 'text-positive border-positive/40 bg-positive/10' : 'text-negative border-negative/40 bg-negative/10')}>
                {monthProfit >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {monthProfit >= 0 ? '+' : '−'}{formatCurrency(Math.abs(monthProfit))} this month
              </div>
            </div>
            <div className="mt-8 grid grid-cols-3 gap-4 border-t border-border pt-5">
              <MiniStat label="Income · month" value={monthly.income} tone="positive" />
              <MiniStat label="Expense · month" value={monthly.expense} tone="negative" />
              <MiniStat label="Profit · month" value={monthly.profit} tone={monthProfit >= 0 ? 'positive' : 'negative'} />
            </div>
          </CardContent>
        </Card>

        <Card className="xl:col-span-5 animate-rise-in" style={{ animationDelay: '80ms' }}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="eyebrow">Today's entries</p>
              <span className="mono text-xs text-faint">{now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
            </div>
            <div className="divide-y divide-border">
              <LedgerRow icon={TrendingUp} label="Income" value={today.income} tone="positive" />
              <LedgerRow icon={TrendingDown} label="Expense" value={today.expense} tone="negative" />
              <LedgerRow icon={Equal} label="Profit" value={today.profit} tone={todayProfit >= 0 ? 'positive' : 'negative'} strong />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Balance tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {tiles.map((tile, i) => (
          <Card key={tile.label} className="card-hover animate-fade-in overflow-hidden" style={{ animationDelay: `${140 + i * 50}ms` }}>
            <CardContent className="p-4 sm:p-5">
              <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center mb-4', tones[tile.tone].icon)}>
                <tile.icon className="w-4 h-4" strokeWidth={2} />
              </div>
              <p className="eyebrow truncate">{tile.label}</p>
              <p className="figure text-[1.3rem] sm:text-[1.45rem] mt-2 truncate">{formatCurrency(tile.value)}</p>
            </CardContent>
            <div className={cn('h-[3px]', tones[tile.tone].bar)} />
          </Card>
        ))}
      </div>

      {/* Monthly chart + recent entries */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <Card className="xl:col-span-7 animate-fade-in" style={{ animationDelay: '440ms' }}>
          <CardContent className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
              <div>
                <p className="eyebrow">Monthly summary</p>
                <h3 className="font-display text-2xl mt-1">Income vs expense</h3>
              </div>
              <div className="flex items-center gap-4">
                <div className="hidden sm:flex items-center gap-3">
                  <Swatch color={chart.positive} label="Income" />
                  <Swatch color={chart.negative} label="Expense" />
                  <Swatch color={chart.primary} label="Profit" line />
                </div>
                <div className="inline-flex rounded-lg bg-secondary p-0.5" role="group" aria-label="Chart range">
                  {(['6m', '12m'] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRange(r)}
                      aria-pressed={range === r}
                      className={cn(
                        'h-7 px-2.5 rounded-md mono text-[11px] uppercase tracking-wider transition-colors cursor-pointer',
                        range === r ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {r === '6m' ? '6 mo' : '12 mo'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} barGap={4} barCategoryGap="32%" margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={chart.grid} strokeDasharray="3 4" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: chart.axis, fontFamily: 'DM Mono' }} axisLine={false} tickLine={false} dy={6} />
                  <YAxis tick={{ fontSize: 11, fill: chart.axis, fontFamily: 'DM Mono' }} axisLine={false} tickLine={false} width={44} tickFormatter={compact} />
                  <ReferenceLine y={0} stroke={chart.axis} strokeOpacity={0.6} />
                  <Tooltip cursor={{ fill: chart.grid }} content={<ChartTip />} />
                  <Bar dataKey="income" name="Income" fill={chart.positive} radius={[5, 5, 0, 0]} maxBarSize={30} />
                  <Bar dataKey="expense" name="Expense" fill={chart.negative} radius={[5, 5, 0, 0]} maxBarSize={30} />
                  <Line
                    dataKey="profit"
                    name="Profit"
                    type="monotone"
                    stroke={chart.primary}
                    strokeWidth={2.5}
                    dot={{ r: 3.5, fill: chart.primary, strokeWidth: 0 }}
                    activeDot={{ r: 5, strokeWidth: 0 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="xl:col-span-5 animate-fade-in" style={{ animationDelay: '500ms' }}>
          <CardContent className="p-0">
            <div className="flex items-center justify-between px-6 pt-6 pb-3">
              <div>
                <p className="eyebrow">Journal</p>
                <h3 className="font-display text-2xl mt-1">Recent entries</h3>
              </div>
              <Link to="/transactions" className="text-[13px] font-medium text-primary hover:underline underline-offset-4">See all</Link>
            </div>
            {recent.length === 0 ? (
              <p className="px-6 pb-6 text-sm text-muted-foreground">No entries yet. Your latest transactions will appear here.</p>
            ) : (
              <ul className="divide-y divide-border">
                {recent.map((t) => {
                  const inflow = INFLOW.includes(t.type);
                  const outflow = OUTFLOW.includes(t.type);
                  return (
                    <li key={t.id} className="flex items-center gap-3 px-6 py-3">
                      <span className={cn('w-1 self-stretch rounded-full', inflow ? 'bg-positive' : outflow ? 'bg-negative' : 'bg-info')} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {getTransactionTypeLabel(t.type)}
                          <span className="text-muted-foreground font-normal"> · {t.description || t.entries?.[0]?.account?.name || '—'}</span>
                        </p>
                        <p className="mono text-[11px] text-faint mt-0.5">
                          {formatDate(t.date)}{t.txn_number ? ` · ${t.txn_number}` : ''}
                        </p>
                      </div>
                      <span className={cn('mono text-sm tabular shrink-0', inflow ? 'text-positive' : outflow ? 'text-negative' : 'text-foreground')}>
                        {inflow ? '+' : outflow ? '−' : ''}{formatCurrency(t.amount)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
