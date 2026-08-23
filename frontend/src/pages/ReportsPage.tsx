import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency } from '@/lib/utils';
import api from '@/lib/api';
import { BarChart3, FileText, Download } from 'lucide-react';

// ── Strongly-typed interfaces matching Laravel DTOs ──────────────────

interface BalanceSheetRow {
  id: number | string;
  name: string;
  type: string;
  balance: string;
}

interface BalanceSheetResult {
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

interface ProfitAndLossRow {
  account_id: number;
  account_name: string;
  account_type: string;
  amount: string;
}

interface ProfitAndLossResult {
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

interface CashFlowRow {
  account_id: number;
  account_name: string;
  account_type: string;
  amount: string;
}

interface CashFlowResult {
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

interface ReceivablePayableRow {
  id: number;
  name: string;
  contact_id: number | null;
  balance: string;
}

interface ReceivablePayableResult {
  items: ReceivablePayableRow[];
  total: string;
  as_of: string;
  generated_at: string;
  currency: string;
  tenant: string;
  report_type: string;
}

interface ExpenseSummaryCategory {
  category_id: number | null;
  category_name: string | null;
  total: string;
  count: number;
}

interface ExpenseSummaryResult {
  period: { start: string; end: string };
  categories: ExpenseSummaryCategory[];
  grand_total: string;
}

interface IncomeSummaryItem {
  id: number;
  name: string;
  amount: string;
}

interface IncomeSummaryResult {
  period: { start: string; end: string };
  items: IncomeSummaryItem[];
  total: string;
}

interface CreditCardSummaryItem {
  id: number;
  name: string;
  balance: string;
  outstanding: string;
  credit_limit: string | null;
  available_balance: string | null;
  parent_account_id: number | null;
  parent_name: string | null;
}

type ReportData =
  | BalanceSheetResult
  | ProfitAndLossResult
  | CashFlowResult
  | ReceivablePayableResult
  | ExpenseSummaryResult
  | IncomeSummaryResult
  | CreditCardSummaryItem[];

// ── Report type configuration ───────────────────────────────────────

const reportTypes = [
  { value: 'balance-sheet', label: 'Balance Sheet', needsDates: false },
  { value: 'profit-loss', label: 'Profit & Loss', needsDates: true },
  { value: 'cash-flow', label: 'Cash Flow', needsDates: true },
  { value: 'receivable', label: 'Receivable Report', needsDates: false },
  { value: 'payable', label: 'Payable Report', needsDates: false },
  { value: 'expense-summary', label: 'Expense Summary', needsDates: true },
  { value: 'income-summary', label: 'Income Summary', needsDates: true },
  { value: 'credit-card-summary', label: 'Credit Card Summary', needsDates: false },
];

export default function ReportsPage() {
  const [reportType, setReportType] = useState('balance-sheet');
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);

  const selectedReport = reportTypes.find(r => r.value === reportType);

  const generateReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedReport?.needsDates) {
        params.set('start_date', startDate);
        params.set('end_date', endDate);
      }
      const res = await api.get(`/reports/${reportType}?${params}`);
      setData(res.data);
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to generate report';
      alert(message);
    }
    finally { setLoading(false); }
  };

  const handleExport = async (format: string) => {
    setExporting(format);
    try {
      const params = new URLSearchParams();
      params.set('format', format);
      if (selectedReport?.needsDates) {
        params.set('start_date', startDate);
        params.set('end_date', endDate);
      }
      
      const res = await api.get(`/reports/${reportType}/export?${params}`, {
        responseType: 'blob'
      });

      // If the backend returned JSON (e.g. error message), it will be a blob with type application/json
      if (res.data.type === 'application/json') {
        const text = await res.data.text();
        const json = JSON.parse(text);
        throw new Error(json.message || 'Export failed');
      }
      
      // Extract filename from Content-Disposition header if present
      const contentDisposition = res.headers['content-disposition'];
      let filename = `${reportType}-${Date.now()}.${format}`;
      if (contentDisposition && contentDisposition.includes('filename=')) {
        const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition);
        if (matches != null && matches[1]) {
          filename = matches[1].replace(/['"]/g, '');
        }
      }

      // Ensure proper MIME type mapping
      const mimeTypes: Record<string, string> = {
        'pdf': 'application/pdf',
        'csv': 'text/csv',
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      };

      const blob = new Blob([res.data], { type: mimeTypes[format] || (res.headers['content-type'] as string) });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) { 
      let errorMessage = 'Failed to export report';
      const axiosErr = err as { response?: { data?: Blob | { message?: string } }; message?: string };
      if (axiosErr.response?.data instanceof Blob) {
        try {
          const text = await axiosErr.response.data.text();
          const json = JSON.parse(text);
          errorMessage = json.message || errorMessage;
        } catch { /* blob parse failed, use default */ }
      } else if ((axiosErr.response?.data as { message?: string })?.message) {
        errorMessage = (axiosErr.response?.data as { message: string }).message;
      } else if (axiosErr.message) {
        errorMessage = axiosErr.message;
      }
      alert(errorMessage); 
    } finally { 
      setExporting(null); 
    }
  };

  // ── Helper to render a section of BalanceSheet rows ──────────────

  const renderBalanceSheetSection = (
    title: string,
    rows: BalanceSheetRow[],
    sectionTotal: string,
    colorClass: string
  ) => {
    if (rows.length === 0) return null;
    return (
      <div>
        <h4 className="text-sm font-medium text-muted-foreground mb-1">{title}</h4>
        <div className="overflow-x-auto"><table className="w-full text-sm"><tbody>
          {rows.map((a) => (
            <tr key={a.id} className="border-b hover:bg-accent/50">
              <td className="p-2">{a.name}</td>
              <td className="p-2 text-muted-foreground">{a.type}</td>
              <td className="p-2 text-right font-medium">{formatCurrency(a.balance)}</td>
            </tr>
          ))}
          <tr className={`${colorClass} font-bold`}>
            <td className="p-2" colSpan={2}>Total {title}</td>
            <td className="p-2 text-right">{formatCurrency(sectionTotal)}</td>
          </tr>
        </tbody></table></div>
      </div>
    );
  };

  // ── Helper to render a CashFlow activity section ─────────────────

  const renderCashFlowSection = (
    title: string,
    rows: CashFlowRow[],
    sectionTotal: string
  ) => {
    if (rows.length === 0) return null;
    return (
      <div>
        <h4 className="text-sm font-medium text-muted-foreground mb-1">{title}</h4>
        <div className="overflow-x-auto"><table className="w-full text-sm"><tbody>
          {rows.map((r) => {
            const amt = parseFloat(r.amount);
            return (
              <tr key={r.account_id} className="border-b hover:bg-accent/50">
                <td className="p-2">{r.account_name}</td>
                <td className={`p-2 text-right font-medium ${amt >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {amt >= 0 ? '+' : ''}{formatCurrency(r.amount)}
                </td>
              </tr>
            );
          })}
          <tr className="bg-muted/30 font-bold">
            <td className="p-2">Subtotal</td>
            <td className={`p-2 text-right ${parseFloat(sectionTotal) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {formatCurrency(sectionTotal)}
            </td>
          </tr>
        </tbody></table></div>
      </div>
    );
  };

  const renderReport = () => {
    if (!data) return null;

    switch (reportType) {
      case 'balance-sheet': {
        const bs = data as BalanceSheetResult;
        return (
          <div className="space-y-6">
            {/* Assets */}
            <div>
              <h3 className="font-semibold text-emerald-500 mb-2">Assets</h3>
              {renderBalanceSheetSection('Current Assets', bs.current_assets, bs.total_current_assets, 'bg-emerald-500/5 text-emerald-500')}
              {renderBalanceSheetSection('Non-Current Assets', bs.non_current_assets, bs.total_non_current_assets, 'bg-emerald-500/5 text-emerald-500')}
              <div className="overflow-x-auto"><table className="w-full text-sm"><tbody>
                <tr className="bg-emerald-500/10 font-bold">
                  <td className="p-2" colSpan={2}>Total Assets</td>
                  <td className="p-2 text-right text-emerald-500">{formatCurrency(bs.total_assets)}</td>
                </tr>
              </tbody></table></div>
            </div>

            {/* Liabilities */}
            <div>
              <h3 className="font-semibold text-rose-500 mb-2">Liabilities</h3>
              {renderBalanceSheetSection('Current Liabilities', bs.current_liabilities, bs.total_current_liabilities, 'bg-rose-500/5 text-rose-500')}
              {renderBalanceSheetSection('Non-Current Liabilities', bs.non_current_liabilities, bs.total_non_current_liabilities, 'bg-rose-500/5 text-rose-500')}
              <div className="overflow-x-auto"><table className="w-full text-sm"><tbody>
                <tr className="bg-rose-500/10 font-bold">
                  <td className="p-2" colSpan={2}>Total Liabilities</td>
                  <td className="p-2 text-right text-rose-500">{formatCurrency(Math.abs(parseFloat(bs.total_liabilities)))}</td>
                </tr>
              </tbody></table></div>
            </div>

            {/* Equity */}
            <div>
              <h3 className="font-semibold text-blue-500 mb-2">Equity</h3>
              {renderBalanceSheetSection('Equity', bs.equity, bs.total_equity, 'bg-blue-500/5 text-blue-500')}
            </div>

            {/* Balance check */}
            <div className={`p-4 rounded-lg text-center text-sm font-bold ${bs.is_balanced ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
              {bs.is_balanced
                ? '✓ Balance Sheet is balanced'
                : `⚠ Difference: ${formatCurrency(bs.difference)}`}
            </div>
          </div>
        );
      }

      case 'profit-loss': {
        const pl = data as ProfitAndLossResult;
        return (
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-emerald-500 mb-2">Income</h3>
              <div className="overflow-x-auto"><table className="w-full text-sm"><tbody>
                {pl.income?.map((i) => <tr key={i.account_id} className="border-b hover:bg-accent/50"><td className="p-2">{i.account_name}</td><td className="p-2 text-right">{formatCurrency(i.amount)}</td></tr>)}
                <tr className="bg-emerald-500/5 font-bold"><td className="p-2">Total Income</td><td className="p-2 text-right text-emerald-500">{formatCurrency(pl.total_income)}</td></tr>
              </tbody></table></div>
            </div>
            <div>
              <h3 className="font-semibold text-rose-500 mb-2">Expenses</h3>
              <div className="overflow-x-auto"><table className="w-full text-sm"><tbody>
                {pl.expenses?.map((e) => <tr key={e.account_id} className="border-b hover:bg-accent/50"><td className="p-2">{e.account_name}</td><td className="p-2 text-right">{formatCurrency(e.amount)}</td></tr>)}
                <tr className="bg-rose-500/5 font-bold"><td className="p-2">Total Expenses</td><td className="p-2 text-right text-rose-500">{formatCurrency(pl.total_expense)}</td></tr>
              </tbody></table></div>
            </div>
            <div className={`p-4 rounded-lg text-center text-lg font-bold ${parseFloat(pl.net_profit) >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
              Net Profit: {formatCurrency(pl.net_profit)}
            </div>
          </div>
        );
      }

      case 'cash-flow': {
        const cf = data as CashFlowResult;
        return (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <Card><CardContent className="p-5 text-center"><p className="text-sm text-muted-foreground mb-1">Opening Balance</p><p className="text-2xl font-bold">{formatCurrency(cf.opening_balance)}</p></CardContent></Card>
              <Card><CardContent className="p-5 text-center"><p className="text-sm text-muted-foreground mb-1">Operating</p><p className={`text-2xl font-bold ${parseFloat(cf.net_operating_cash_flow) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{formatCurrency(cf.net_operating_cash_flow)}</p></CardContent></Card>
              <Card><CardContent className="p-5 text-center"><p className="text-sm text-muted-foreground mb-1">Net Cash Flow</p><p className={`text-2xl font-bold ${parseFloat(cf.net_cash_flow) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{formatCurrency(cf.net_cash_flow)}</p></CardContent></Card>
              <Card><CardContent className="p-5 text-center"><p className="text-sm text-muted-foreground mb-1">Closing Balance</p><p className="text-2xl font-bold">{formatCurrency(cf.closing_balance)}</p></CardContent></Card>
            </div>

            {/* Activity Sections */}
            {renderCashFlowSection('Operating Activities', cf.operating_activities, cf.net_operating_cash_flow)}
            {renderCashFlowSection('Investing Activities', cf.investing_activities, cf.net_investing_cash_flow)}
            {renderCashFlowSection('Financing Activities', cf.financing_activities, cf.net_financing_cash_flow)}
          </div>
        );
      }

      case 'receivable':
      case 'payable': {
        const rp = data as ReceivablePayableResult;
        return (
          <div>
            <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b bg-muted/50"><th className="text-left p-3 font-medium">Name</th><th className="text-right p-3 font-medium">Balance</th></tr></thead><tbody>
              {rp.items?.map((i) => <tr key={i.id} className="border-b hover:bg-accent/50"><td className="p-3">{i.name}</td><td className={`p-3 text-right font-medium ${reportType === 'receivable' ? 'text-emerald-500' : 'text-rose-500'}`}>{formatCurrency(Math.abs(parseFloat(i.balance)))}</td></tr>)}
              {rp.items?.length === 0 && <tr><td colSpan={2} className="text-center p-6 text-muted-foreground">None</td></tr>}
            </tbody></table></div>
            <div className="p-3 border-t font-bold flex justify-between"><span>Total</span><span>{formatCurrency(Math.abs(parseFloat(rp.total)))}</span></div>
          </div>
        );
      }

      case 'expense-summary': {
        const es = data as ExpenseSummaryResult;
        return (
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b bg-muted/50"><th className="text-left p-3 font-medium">Category</th><th className="text-right p-3 font-medium">Count</th><th className="text-right p-3 font-medium">Total</th></tr></thead><tbody>
            {es.categories?.map((c, i) => <tr key={i} className="border-b hover:bg-accent/50"><td className="p-3">{c.category_name || 'Uncategorized'}</td><td className="p-3 text-right text-muted-foreground">{c.count}</td><td className="p-3 text-right font-medium text-rose-500">{formatCurrency(c.total)}</td></tr>)}
            <tr className="font-bold bg-muted/50"><td className="p-3">Total</td><td className="p-3"></td><td className="p-3 text-right text-rose-500">{formatCurrency(es.grand_total)}</td></tr>
          </tbody></table></div>
        );
      }

      case 'income-summary': {
        const is_ = data as IncomeSummaryResult;
        return (
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b bg-muted/50"><th className="text-left p-3 font-medium">Source</th><th className="text-right p-3 font-medium">Amount</th></tr></thead><tbody>
            {is_.items?.map((i) => <tr key={i.id} className="border-b hover:bg-accent/50"><td className="p-3">{i.name}</td><td className="p-3 text-right font-medium text-emerald-500">{formatCurrency(i.amount)}</td></tr>)}
            <tr className="font-bold bg-muted/50"><td className="p-3">Total</td><td className="p-3 text-right text-emerald-500">{formatCurrency(is_.total)}</td></tr>
          </tbody></table></div>
        );
      }

      case 'credit-card-summary': {
        const cards = data as CreditCardSummaryItem[];
        return (
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b bg-muted/50"><th className="text-left p-3 font-medium">Card</th><th className="text-right p-3 font-medium">Balance</th><th className="text-right p-3 font-medium">Outstanding</th></tr></thead><tbody>
            {cards.map?.((c) => <tr key={c.id} className="border-b hover:bg-accent/50"><td className="p-3">{c.name}</td><td className="p-3 text-right">{formatCurrency(c.balance)}</td><td className="p-3 text-right font-medium text-orange-500">{formatCurrency(c.outstanding)}</td></tr>)}
          </tbody></table></div>
        );
      }

      default: return <p>Select a report type</p>;
    }
  };

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Reports</h1><p className="text-muted-foreground text-sm mt-1">Financial reports and statements</p></div>

      <Card><CardContent className="p-4 flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-end gap-4">
        <div className="space-y-1 w-full sm:w-auto"><label className="text-sm text-muted-foreground">Report Type</label>
          <Select value={reportType} onValueChange={v => { setReportType(v); setData(null); }}>
            <SelectTrigger className="w-full sm:w-52"><SelectValue /></SelectTrigger>
            <SelectContent>{reportTypes.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        {selectedReport?.needsDates && (
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <div className="space-y-1 flex-1 sm:flex-none"><label className="text-sm text-muted-foreground">From</label><Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full sm:w-40" /></div>
            <div className="space-y-1 flex-1 sm:flex-none"><label className="text-sm text-muted-foreground">To</label><Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full sm:w-40" /></div>
          </div>
        )}
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button onClick={generateReport} disabled={loading} className="w-full sm:w-auto flex-1">
            {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" /> : <BarChart3 className="w-4 h-4 mr-2" />}
            Generate
          </Button>

          <div className="relative">
            <select
              className="h-10 w-full sm:w-auto px-8 py-2 rounded-md border border-input bg-background text-sm ring-offset-background appearance-none pr-8 cursor-pointer disabled:opacity-50"
              onChange={(e) => {
                if (e.target.value) { handleExport(e.target.value); e.target.value = ''; }
              }}
              disabled={exporting !== null}
            >
              <option value="" disabled selected hidden>{exporting ? `Exporting...` : `Export ▼`}</option>
              <option value="pdf">Export as PDF</option>
              <option value="xlsx">Export as Excel</option>
              <option value="csv">Export as CSV</option>
            </select>
            {!exporting && <Download className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />}
          </div>
        </div>
      </CardContent></Card>

      {data && (
        <Card className="animate-fade-in">
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><FileText className="w-5 h-5" />{selectedReport?.label}</CardTitle></CardHeader>
          <CardContent>{renderReport()}</CardContent>
        </Card>
      )}
    </div>
  );
}
