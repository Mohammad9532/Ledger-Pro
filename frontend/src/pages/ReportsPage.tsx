import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency } from '@/lib/utils';
import api from '@/lib/api';
import { BarChart3, FileText, Download } from 'lucide-react';

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
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

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
    } catch (err: any) { alert(err.response?.data?.message || 'Failed to generate report'); }
    finally { setLoading(false); }
  };

  const renderReport = () => {
    if (!data) return null;

    switch (reportType) {
      case 'balance-sheet':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-emerald-500 mb-2">Assets</h3>
              <table className="w-full text-sm"><tbody>
                {data.assets?.map((a: any) => <tr key={a.id} className="border-b hover:bg-accent/50"><td className="p-2">{a.name}</td><td className="p-2 text-muted-foreground">{a.type}</td><td className="p-2 text-right font-medium">{formatCurrency(a.balance)}</td></tr>)}
                <tr className="bg-emerald-500/5 font-bold"><td className="p-2" colSpan={2}>Total Assets</td><td className="p-2 text-right text-emerald-500">{formatCurrency(data.total_assets)}</td></tr>
              </tbody></table>
            </div>
            <div>
              <h3 className="font-semibold text-rose-500 mb-2">Liabilities</h3>
              <table className="w-full text-sm"><tbody>
                {data.liabilities?.map((a: any) => <tr key={a.id} className="border-b hover:bg-accent/50"><td className="p-2">{a.name}</td><td className="p-2 text-muted-foreground">{a.type}</td><td className="p-2 text-right font-medium">{formatCurrency(Math.abs(parseFloat(a.balance)))}</td></tr>)}
                <tr className="bg-rose-500/5 font-bold"><td className="p-2" colSpan={2}>Total Liabilities</td><td className="p-2 text-right text-rose-500">{formatCurrency(Math.abs(parseFloat(data.total_liabilities)))}</td></tr>
              </tbody></table>
            </div>
          </div>
        );

      case 'profit-loss':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-emerald-500 mb-2">Income</h3>
              <table className="w-full text-sm"><tbody>
                {data.income?.map((i: any) => <tr key={i.id} className="border-b hover:bg-accent/50"><td className="p-2">{i.name}</td><td className="p-2 text-right">{formatCurrency(i.amount)}</td></tr>)}
                <tr className="bg-emerald-500/5 font-bold"><td className="p-2">Total Income</td><td className="p-2 text-right text-emerald-500">{formatCurrency(data.total_income)}</td></tr>
              </tbody></table>
            </div>
            <div>
              <h3 className="font-semibold text-rose-500 mb-2">Expenses</h3>
              <table className="w-full text-sm"><tbody>
                {data.expenses?.map((e: any) => <tr key={e.id} className="border-b hover:bg-accent/50"><td className="p-2">{e.name}</td><td className="p-2 text-right">{formatCurrency(e.amount)}</td></tr>)}
                <tr className="bg-rose-500/5 font-bold"><td className="p-2">Total Expenses</td><td className="p-2 text-right text-rose-500">{formatCurrency(data.total_expense)}</td></tr>
              </tbody></table>
            </div>
            <div className={`p-4 rounded-lg text-center text-lg font-bold ${parseFloat(data.net_profit) >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
              Net Profit: {formatCurrency(data.net_profit)}
            </div>
          </div>
        );

      case 'cash-flow':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card><CardContent className="p-5 text-center"><p className="text-sm text-muted-foreground mb-1">Inflows</p><p className="text-2xl font-bold text-emerald-500">{formatCurrency(data.inflows)}</p></CardContent></Card>
            <Card><CardContent className="p-5 text-center"><p className="text-sm text-muted-foreground mb-1">Outflows</p><p className="text-2xl font-bold text-rose-500">{formatCurrency(data.outflows)}</p></CardContent></Card>
            <Card><CardContent className="p-5 text-center"><p className="text-sm text-muted-foreground mb-1">Net Flow</p><p className={`text-2xl font-bold ${parseFloat(data.net_flow) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{formatCurrency(data.net_flow)}</p></CardContent></Card>
          </div>
        );

      case 'receivable':
      case 'payable':
        return (
          <div>
            <table className="w-full text-sm"><thead><tr className="border-b bg-muted/50"><th className="text-left p-3 font-medium">Name</th><th className="text-right p-3 font-medium">Balance</th></tr></thead><tbody>
              {data.items?.map((i: any) => <tr key={i.id} className="border-b hover:bg-accent/50"><td className="p-3">{i.name}</td><td className={`p-3 text-right font-medium ${reportType === 'receivable' ? 'text-emerald-500' : 'text-rose-500'}`}>{formatCurrency(Math.abs(parseFloat(i.balance)))}</td></tr>)}
              {data.items?.length === 0 && <tr><td colSpan={2} className="text-center p-6 text-muted-foreground">None</td></tr>}
            </tbody></table>
            <div className="p-3 border-t font-bold flex justify-between"><span>Total</span><span>{formatCurrency(Math.abs(parseFloat(data.total)))}</span></div>
          </div>
        );

      case 'expense-summary':
        return (
          <table className="w-full text-sm"><thead><tr className="border-b bg-muted/50"><th className="text-left p-3 font-medium">Category</th><th className="text-right p-3 font-medium">Count</th><th className="text-right p-3 font-medium">Total</th></tr></thead><tbody>
            {data.categories?.map((c: any, i: number) => <tr key={i} className="border-b hover:bg-accent/50"><td className="p-3">{c.category_name || 'Uncategorized'}</td><td className="p-3 text-right text-muted-foreground">{c.count}</td><td className="p-3 text-right font-medium text-rose-500">{formatCurrency(c.total)}</td></tr>)}
            <tr className="font-bold bg-muted/50"><td className="p-3">Total</td><td className="p-3"></td><td className="p-3 text-right text-rose-500">{formatCurrency(data.grand_total)}</td></tr>
          </tbody></table>
        );

      case 'income-summary':
        return (
          <table className="w-full text-sm"><thead><tr className="border-b bg-muted/50"><th className="text-left p-3 font-medium">Source</th><th className="text-right p-3 font-medium">Amount</th></tr></thead><tbody>
            {data.items?.map((i: any) => <tr key={i.id} className="border-b hover:bg-accent/50"><td className="p-3">{i.name}</td><td className="p-3 text-right font-medium text-emerald-500">{formatCurrency(i.amount)}</td></tr>)}
            <tr className="font-bold bg-muted/50"><td className="p-3">Total</td><td className="p-3 text-right text-emerald-500">{formatCurrency(data.total)}</td></tr>
          </tbody></table>
        );

      case 'credit-card-summary':
        return (
          <table className="w-full text-sm"><thead><tr className="border-b bg-muted/50"><th className="text-left p-3 font-medium">Card</th><th className="text-right p-3 font-medium">Balance</th><th className="text-right p-3 font-medium">Outstanding</th></tr></thead><tbody>
            {data.map?.((c: any) => <tr key={c.id} className="border-b hover:bg-accent/50"><td className="p-3">{c.name}</td><td className="p-3 text-right">{formatCurrency(c.balance)}</td><td className="p-3 text-right font-medium text-orange-500">{formatCurrency(c.outstanding)}</td></tr>)}
          </tbody></table>
        );

      default: return <p>Select a report type</p>;
    }
  };

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Reports</h1><p className="text-muted-foreground text-sm mt-1">Financial reports and statements</p></div>

      <Card><CardContent className="p-4 flex flex-wrap items-end gap-4">
        <div className="space-y-1"><label className="text-sm text-muted-foreground">Report Type</label>
          <Select value={reportType} onValueChange={v => { setReportType(v); setData(null); }}>
            <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
            <SelectContent>{reportTypes.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        {selectedReport?.needsDates && (
          <>
            <div className="space-y-1"><label className="text-sm text-muted-foreground">From</label><Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-40" /></div>
            <div className="space-y-1"><label className="text-sm text-muted-foreground">To</label><Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-40" /></div>
          </>
        )}
        <Button onClick={generateReport} disabled={loading}>{loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><BarChart3 className="w-4 h-4 mr-2" />Generate</>}</Button>
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
