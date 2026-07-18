import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { formatCurrency, formatDate, getTransactionTypeLabel } from '@/lib/utils';
import api from '@/lib/api';
import {
  ArrowLeft, Phone, FileText, ShoppingBag, DollarSign,
  TrendingUp, Banknote, AlertCircle, Package, ArrowDownLeft, ArrowUpRight, Download
} from 'lucide-react';

interface SummaryData {
  contact: any;
  total_purchases: number;
  total_sales: string;
  amount_received: string;
  total_given: string;
  outstanding: string;
  profit_generated: string;
  recent_transactions: any[];
  sold_items: any[];
}

export default function PersonLedgerPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activeTab, setActiveTab] = useState('summary');

  const fetchLedger = () => {
    const params = new URLSearchParams();
    if (startDate) params.set('start_date', startDate);
    if (endDate) params.set('end_date', endDate);
    api.get(`/contacts/${id}/ledger?${params}`).then(res => {
      setData(res.data);
    });
  };

  const fetchSummary = () => {
    api.get(`/contacts/${id}/summary`).then(res => {
      setSummary(res.data);
    });
  };

  const handleExport = async (format: string) => {
    try {
      const params = new URLSearchParams();
      params.set('format', format);
      params.set('account_id', contact.account.id.toString());
      if (startDate) params.set('start_date', startDate);
      if (endDate) params.set('end_date', endDate);
      
      const res = await api.get(`/reports/account-ledger/export?${params}`, {
        responseType: 'blob'
      });

      if (res.data.type === 'application/json') {
        const text = await res.data.text();
        const json = JSON.parse(text);
        throw new Error(json.message || 'Export failed');
      }
      
      const contentDisposition = res.headers['content-disposition'];
      let filename = `Ledger-${Date.now()}.${format}`;
      if (contentDisposition && contentDisposition.includes('filename=')) {
        const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition);
        if (matches != null && matches[1]) {
          filename = matches[1].replace(/['"]/g, '');
        }
      }

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
    } catch (err: any) { 
      alert(err.message || err.response?.data?.message || 'Failed to export report'); 
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get(`/contacts/${id}/ledger`),
      api.get(`/contacts/${id}/summary`),
    ]).then(([ledgerRes, summaryRes]) => {
      setData(ledgerRes.data);
      setSummary(summaryRes.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!data || !summary) return <p className="text-muted-foreground p-4">Not found</p>;

  const contact = data.contact;
  const statement = data.statement;
  const closingBal = parseFloat(statement.closing_balance);
  const outstanding = parseFloat(summary.outstanding);

  const summaryCards = [
    {
      label: 'Total Purchases',
      value: String(summary.total_purchases),
      isCurrency: false,
      icon: ShoppingBag,
      gradient: 'from-violet-500 to-purple-600',
      bg: 'bg-violet-500/10',
      text: 'text-violet-500',
    },
    {
      label: 'Total Sales',
      value: summary.total_sales,
      isCurrency: true,
      icon: DollarSign,
      gradient: 'from-blue-500 to-cyan-600',
      bg: 'bg-blue-500/10',
      text: 'text-blue-500',
    },
    {
      label: 'Amount Received',
      value: summary.amount_received,
      isCurrency: true,
      icon: Banknote,
      gradient: 'from-emerald-500 to-green-600',
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-500',
    },
    {
      label: 'Outstanding',
      value: summary.outstanding,
      isCurrency: true,
      icon: AlertCircle,
      gradient: outstanding > 0 ? 'from-amber-500 to-orange-600' : 'from-emerald-500 to-green-600',
      bg: outstanding > 0 ? 'bg-amber-500/10' : 'bg-emerald-500/10',
      text: outstanding > 0 ? 'text-amber-500' : 'text-emerald-500',
    },
    {
      label: 'Profit Generated',
      value: summary.profit_generated,
      isCurrency: true,
      icon: TrendingUp,
      gradient: 'from-emerald-500 to-teal-600',
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-500',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full">
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <Button variant="ghost" size="icon" onClick={() => navigate('/people')} className="shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shrink-0">
              {contact.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold truncate">{contact.name}</h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground mt-1">
                {contact.phone && <span className="flex items-center gap-1 shrink-0"><Phone className="w-3 h-3" />{contact.phone}</span>}
                {contact.notes && <span className="flex items-center gap-1 truncate"><FileText className="w-3 h-3 shrink-0" /><span className="truncate">{contact.notes}</span></span>}
              </div>
            </div>
          </div>
        </div>
        <div className="ml-0 sm:ml-auto text-left sm:text-right bg-muted/30 p-3 sm:p-0 rounded-lg w-full sm:w-auto border sm:border-transparent border-border">
          <div className="flex justify-between sm:block">
            <span className="text-sm text-muted-foreground">{closingBal > 0 ? 'They owe you' : closingBal < 0 ? 'You owe them' : 'Settled'}</span>
            <span className={`text-xl sm:text-2xl font-bold ${closingBal > 0 ? 'text-emerald-500' : closingBal < 0 ? 'text-rose-500' : 'text-muted-foreground'}`}>
              {formatCurrency(Math.abs(closingBal))}
            </span>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {summaryCards.map((card, i) => (
          <Card key={i} className="card-hover animate-fade-in overflow-hidden" style={{ animationDelay: `${i * 60}ms` }}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-muted-foreground font-medium leading-tight">{card.label}</span>
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${card.gradient} flex items-center justify-center shrink-0`}>
                  <card.icon className="w-4 h-4 text-white" />
                </div>
              </div>
              <p className={`text-xl font-bold ${card.text}`}>
                {card.isCurrency ? formatCurrency(card.value) : card.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs: Summary / Ledger */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="ledger">Ledger</TabsTrigger>
        </TabsList>

        {/* Summary Tab */}
        <TabsContent value="summary" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Transactions */}
            <Card className="animate-fade-in">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Recent Transactions</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {summary.recent_transactions.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No transactions yet</p>
                ) : (
                  <div className="divide-y">
                    {summary.recent_transactions.map((t: any, i: number) => (
                      <div key={i} className="px-5 py-3 flex items-center gap-3 hover:bg-accent/50 transition-colors">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${parseFloat(t.debit) > 0 ? 'bg-rose-500/10' : 'bg-emerald-500/10'}`}>
                          {parseFloat(t.debit) > 0
                            ? <ArrowUpRight className="w-4 h-4 text-rose-500" />
                            : <ArrowDownLeft className="w-4 h-4 text-emerald-500" />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{t.description || getTransactionTypeLabel(t.type)}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(t.date)}</p>
                        </div>
                        <div className="text-right shrink-0">
                          {parseFloat(t.debit) > 0 && <p className="text-sm font-semibold text-rose-500">+{formatCurrency(t.debit)}</p>}
                          {parseFloat(t.credit) > 0 && <p className="text-sm font-semibold text-emerald-500">-{formatCurrency(t.credit)}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Sold Items */}
            <Card className="animate-fade-in" style={{ animationDelay: '100ms' }}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Package className="w-4 h-4 text-muted-foreground" /> Items Sold
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {summary.sold_items.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No items sold to this customer</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left p-3 font-medium">Item</th>
                          <th className="text-right p-3 font-medium">Cost</th>
                          <th className="text-right p-3 font-medium">Sale</th>
                          <th className="text-right p-3 font-medium">Profit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {summary.sold_items.map((item: any) => (
                          <tr key={item.id} className="border-b hover:bg-accent/50 transition-colors">
                            <td className="p-3 font-medium">{item.description}</td>
                            <td className="p-3 text-right text-muted-foreground">{formatCurrency(item.purchase_cost)}</td>
                            <td className="p-3 text-right">{formatCurrency(item.sale_amount)}</td>
                            <td className="p-3 text-right">
                              <span className={parseFloat(item.profit) >= 0 ? 'text-emerald-500' : 'text-rose-500'}>
                                {formatCurrency(item.profit)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Ledger Tab */}
        <TabsContent value="ledger" className="space-y-4">
          <Card>
            <CardContent className="p-4 flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-end gap-4">
              <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                <div className="space-y-1 flex-1 sm:flex-none"><label className="text-sm text-muted-foreground">From</label><Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full sm:w-40" /></div>
                <div className="space-y-1 flex-1 sm:flex-none"><label className="text-sm text-muted-foreground">To</label><Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full sm:w-40" /></div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <Button onClick={fetchLedger} className="w-full sm:w-auto">Filter</Button>
                <Button variant="outline" onClick={() => handleExport('pdf')} className="w-full sm:w-auto flex gap-2">
                  <Download className="w-4 h-4" /> Export PDF
                </Button>
              </div>
              <div className="mt-4 sm:mt-0 sm:ml-auto flex flex-col sm:flex-row gap-2 sm:gap-4 text-sm w-full sm:w-auto bg-muted/50 p-3 rounded-lg sm:bg-transparent sm:p-0">
                <div className="flex justify-between sm:block"><span className="text-muted-foreground">Opening:</span> <span className="font-bold">{formatCurrency(statement.opening_balance)}</span></div>
                <div className="flex justify-between sm:block"><span className="text-muted-foreground">Closing:</span> <span className="font-bold">{formatCurrency(statement.closing_balance)}</span></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium">Date</th>
                      <th className="text-left p-3 font-medium">Description</th>
                      <th className="text-right p-3 font-medium">Debit</th>
                      <th className="text-right p-3 font-medium">Credit</th>
                      <th className="text-right p-3 font-medium">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b bg-muted/30">
                      <td className="p-3 font-medium" colSpan={4}>Opening Balance</td>
                      <td className="p-3 text-right font-medium">{formatCurrency(statement.opening_balance)}</td>
                    </tr>
                    {statement.entries.map((e: any, i: number) => (
                      <tr key={i} className="border-b hover:bg-accent/50 transition-colors">
                        <td className="p-3">{formatDate(e.date)}</td>
                        <td className="p-3">{e.description || '-'}</td>
                        <td className="p-3 text-right">{parseFloat(e.debit) > 0 ? <span className="text-emerald-500">{formatCurrency(e.debit)}</span> : '-'}</td>
                        <td className="p-3 text-right">{parseFloat(e.credit) > 0 ? <span className="text-rose-500">{formatCurrency(e.credit)}</span> : '-'}</td>
                        <td className={`p-3 text-right font-medium ${parseFloat(e.balance) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{formatCurrency(e.balance)}</td>
                      </tr>
                    ))}
                    {statement.entries.length === 0 && <tr><td colSpan={5} className="text-center p-8 text-muted-foreground">No transactions</td></tr>}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
