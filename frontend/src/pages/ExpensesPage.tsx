import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { formatCurrency } from '@/lib/utils';
import api from '@/lib/api';
import { Plus, Receipt } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const COLORS = ['#f43f5e', '#6366f1', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'];

export default function ExpensesPage() {
  const [summary, setSummary] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [includeBusiness, setIncludeBusiness] = useState(false);
  const [showAddCat, setShowAddCat] = useState(false);
  const [catName, setCatName] = useState('');

  const fetchData = () => {
    setLoading(true);
    api.get(`/reports/expense-summary?start_date=${startDate}&end_date=${endDate}&include_business=${includeBusiness}`).then(res => { setSummary(res.data); setLoading(false); });
    api.get('/expense-categories').then(res => setCategories(res.data));
  };

  useEffect(() => { fetchData(); }, []);

  const handleAddCategory = async () => {
    try {
      await api.post('/expense-categories', { name: catName });
      setCatName(''); setShowAddCat(false); fetchData();
    } catch (err: any) { alert(err.response?.data?.message || 'Failed'); }
  };

  const chartData = summary?.categories?.map((c: any, i: number) => ({
    name: c.category_name || 'Uncategorized', value: parseFloat(c.total), count: c.count,
  })) || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Expense Management</h1>
          <p className="text-muted-foreground text-sm mt-1">Category-wise expense tracking and analysis</p>
        </div>
        <Button onClick={() => setShowAddCat(true)} variant="outline"><Plus className="w-4 h-4 mr-2" /> Add Category</Button>
      </div>

      {/* Date Filter */}
      <Card><CardContent className="p-4 flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-end gap-4">
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <div className="space-y-1 flex-1 sm:flex-none"><label className="text-sm text-muted-foreground">From</label><Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full sm:w-40" /></div>
          <div className="space-y-1 flex-1 sm:flex-none"><label className="text-sm text-muted-foreground">To</label><Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full sm:w-40" /></div>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <input type="checkbox" id="incBusExp" checked={includeBusiness} onChange={e => setIncludeBusiness(e.target.checked)} className="rounded border-gray-300" />
            <label htmlFor="incBusExp" className="text-sm text-muted-foreground cursor-pointer">Include Business Expenses</label>
          </div>
          <Button onClick={fetchData} className="w-full sm:w-auto">Apply</Button>
        </div>
        {summary && <div className="mt-4 sm:mt-0 sm:ml-auto w-full sm:w-auto bg-muted/50 p-3 rounded-lg sm:bg-transparent sm:p-0 flex justify-between sm:block"><span className="text-muted-foreground text-sm">Total: </span><span className="text-lg font-bold text-rose-500">{formatCurrency(summary.grand_total)}</span></div>}
      </CardContent></Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Expense Breakdown</CardTitle></CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}>
                      {chartData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: any) => formatCurrency(Number(v))} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : <p className="text-center text-muted-foreground py-8">No expenses in this period</p>}
          </CardContent>
        </Card>

        {/* Category List */}
        <Card>
          <CardHeader><CardTitle className="text-lg">By Category</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/50">
                <th className="text-left p-3 font-medium">Category</th>
                <th className="text-right p-3 font-medium">Count</th>
                <th className="text-right p-3 font-medium">Total</th>
              </tr></thead>
              <tbody>
                {summary?.categories?.map((c: any, i: number) => (
                  <tr key={i} className="border-b hover:bg-accent/50 transition-colors">
                    <td className="p-3 flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      {c.category_name || 'Uncategorized'}
                    </td>
                    <td className="p-3 text-right text-muted-foreground">{c.count}</td>
                    <td className="p-3 text-right font-medium text-rose-500">{formatCurrency(c.total)}</td>
                  </tr>
                ))}
                {(!summary?.categories || summary.categories.length === 0) && <tr><td colSpan={3} className="text-center p-6 text-muted-foreground">No data</td></tr>}
              </tbody>
            </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Categories management */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Expense Categories</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {categories.map((c: any) => (
              <span key={c.id} className="px-3 py-1.5 rounded-lg bg-accent text-sm font-medium flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-muted-foreground" />{c.name}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showAddCat} onOpenChange={setShowAddCat}>
        <DialogContent><DialogHeader><DialogTitle>Add Category</DialogTitle><DialogDescription>Create a new expense category</DialogDescription></DialogHeader>
          <div className="space-y-2"><Label>Category Name</Label><Input value={catName} onChange={e => setCatName(e.target.value)} placeholder="e.g., Food" /></div>
          <DialogFooter><Button variant="outline" onClick={() => setShowAddCat(false)}>Cancel</Button><Button onClick={handleAddCategory}>Create</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
