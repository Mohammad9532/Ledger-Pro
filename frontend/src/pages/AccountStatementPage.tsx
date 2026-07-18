import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCurrency, formatDate } from '@/lib/utils';
import api from '@/lib/api';
import { ArrowLeft, Download } from 'lucide-react';

interface StatementEntry {
  transaction_id: number; date: string; description: string;
  type: string; reference_number: string | null;
  debit: string; credit: string; balance: string;
}

export default function AccountStatementPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchStatement = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (startDate) params.set('start_date', startDate);
    if (endDate) params.set('end_date', endDate);
    api.get(`/accounts/${id}/statement?${params}`).then(res => {
      setData(res.data); setLoading(false);
    }).catch(() => setLoading(false));
  };

  const handleExport = async (format: string) => {
    try {
      const params = new URLSearchParams();
      params.set('format', format);
      params.set('account_id', data.account.id.toString());
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

  useEffect(() => { fetchStatement(); }, [id]);

  if (loading) return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!data) return <p>Account not found</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5" /></Button>
        <div>
          <h1 className="text-2xl font-bold">{data.account.name}</h1>
          <p className="text-muted-foreground text-sm">Account Statement</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-end gap-4">
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              <div className="space-y-1 flex-1 sm:flex-none">
                <label className="text-sm text-muted-foreground">From</label>
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full sm:w-40" />
              </div>
              <div className="space-y-1 flex-1 sm:flex-none">
                <label className="text-sm text-muted-foreground">To</label>
                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full sm:w-40" />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Button onClick={fetchStatement} className="w-full sm:w-auto">Filter</Button>
              <Button variant="outline" onClick={() => handleExport('pdf')} className="w-full sm:w-auto flex gap-2">
                <Download className="w-4 h-4" /> Export PDF
              </Button>
            </div>
            <div className="mt-4 sm:mt-0 sm:ml-auto flex flex-col sm:flex-row gap-2 sm:gap-4 text-sm w-full sm:w-auto bg-muted/50 p-3 rounded-lg sm:bg-transparent sm:p-0">
              <div className="flex justify-between sm:block"><span className="text-muted-foreground">Opening:</span> <span className="font-bold">{formatCurrency(data.opening_balance)}</span></div>
              <div className="flex justify-between sm:block"><span className="text-muted-foreground">Closing:</span> <span className="font-bold">{formatCurrency(data.closing_balance)}</span></div>
            </div>
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
                  <th className="text-left p-3 font-medium">Ref</th>
                  <th className="text-right p-3 font-medium">Debit</th>
                  <th className="text-right p-3 font-medium">Credit</th>
                  <th className="text-right p-3 font-medium">Balance</th>
                </tr>
              </thead>
              <tbody>
                {data.entries.length === 0 ? (
                  <tr><td colSpan={6} className="text-center p-8 text-muted-foreground">No entries found</td></tr>
                ) : data.entries.map((e: StatementEntry, i: number) => (
                  <tr key={i} className="border-b hover:bg-accent/50 transition-colors cursor-pointer" onClick={() => navigate(`/transactions?highlight=${e.transaction_id}`)}>
                    <td className="p-3">{formatDate(e.date)}</td>
                    <td className="p-3">{e.description || '-'}</td>
                    <td className="p-3 text-muted-foreground">{e.reference_number || '-'}</td>
                    <td className="p-3 text-right">{parseFloat(e.debit) > 0 ? <span className="text-emerald-500">{formatCurrency(e.debit)}</span> : '-'}</td>
                    <td className="p-3 text-right">{parseFloat(e.credit) > 0 ? <span className="text-rose-500">{formatCurrency(e.credit)}</span> : '-'}</td>
                    <td className={`p-3 text-right font-medium ${parseFloat(e.balance) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{formatCurrency(e.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
