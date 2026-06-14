import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency, formatDate } from '@/lib/utils';
import api from '@/lib/api';
import {
  Scale, CheckCircle2, AlertTriangle, Wrench,
  Wallet, Landmark, CreditCard, TrendingDown, TrendingUp, Equal
} from 'lucide-react';

const typeIcons: Record<string, any> = { cash: Wallet, bank: Landmark, credit_card: CreditCard };
const typeGradients: Record<string, string> = {
  cash: 'from-emerald-500 to-green-600',
  bank: 'from-blue-500 to-indigo-600',
  credit_card: 'from-orange-500 to-amber-600',
};

export default function ReconciliationPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReconcile, setShowReconcile] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [actualBalance, setActualBalance] = useState('');
  const [reconDate, setReconDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [adjusting, setAdjusting] = useState<number | null>(null);
  const [filterAccount, setFilterAccount] = useState('all');

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      api.get('/reconciliation/accounts'),
      api.get('/reconciliation/history'),
    ]).then(([accRes, histRes]) => {
      setAccounts(accRes.data);
      setHistory(histRes.data);
      setLoading(false);
    });
  };

  useEffect(() => { fetchData(); }, []);

  const handleReconcile = async () => {
    if (!selectedAccount) return;
    setSaving(true);
    try {
      await api.post('/reconciliation/reconcile', {
        account_id: selectedAccount.id,
        actual_balance: parseFloat(actualBalance),
        reconciliation_date: reconDate,
        notes: notes || null,
      });
      setShowReconcile(false);
      setActualBalance('');
      setNotes('');
      fetchData();
    } catch (err: any) { alert(err.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleAdjust = async (reconId: number) => {
    if (!confirm('Create an adjustment transaction to correct this difference?')) return;
    setAdjusting(reconId);
    try {
      const res = await api.post(`/reconciliation/${reconId}/adjust`);
      alert(`Adjustment created: ${res.data.transaction.txn_number}`);
      fetchData();
    } catch (err: any) { alert(err.response?.data?.error || 'Failed'); }
    finally { setAdjusting(null); }
  };

  const openReconcileModal = (account: any) => {
    setSelectedAccount(account);
    setActualBalance('');
    setReconDate(new Date().toISOString().slice(0, 10));
    setNotes('');
    setShowReconcile(true);
  };

  const filteredHistory = filterAccount === 'all'
    ? history
    : history.filter((h: any) => String(h.account_id) === filterAccount);

  if (loading) return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Scale className="w-6 h-6 text-primary" /> Reconciliation</h1>
        <p className="text-muted-foreground text-sm mt-1">Compare system balances against physical counts and bank statements</p>
      </div>

      {/* Account Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.map((acc, i) => {
          const Icon = typeIcons[acc.type] || Wallet;
          const gradient = typeGradients[acc.type] || 'from-gray-500 to-gray-600';
          const bal = parseFloat(acc.system_balance);
          const lastRecon = acc.last_reconciliation;

          return (
            <Card key={acc.id} className="card-hover animate-fade-in overflow-hidden" style={{ animationDelay: `${i * 60}ms` }}>
              <div className={`h-1.5 bg-gradient-to-r ${gradient}`} />
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{acc.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{acc.type.replace('_', ' ')}</p>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">System Balance</span>
                    <span className={`text-lg font-bold ${bal >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{formatCurrency(Math.abs(bal))}</span>
                  </div>
                  {lastRecon && (
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">Last reconciled: {formatDate(lastRecon.date)}</span>
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                        lastRecon.status === 'matched' ? 'bg-emerald-500/10 text-emerald-500' :
                        lastRecon.status === 'adjusted' ? 'bg-blue-500/10 text-blue-500' :
                        'bg-amber-500/10 text-amber-500'
                      }`}>{lastRecon.status}</span>
                    </div>
                  )}
                </div>

                <Button className="w-full" onClick={() => openReconcileModal(acc)}>
                  <Scale className="w-4 h-4 mr-2" /> Reconcile
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* History */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-lg">Reconciliation History</CardTitle>
            <Select value={filterAccount} onValueChange={setFilterAccount}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Accounts</SelectItem>
                {accounts.map(a => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">Date</th>
                  <th className="text-left p-3 font-medium">Account</th>
                  <th className="text-right p-3 font-medium">System</th>
                  <th className="text-right p-3 font-medium">Actual</th>
                  <th className="text-right p-3 font-medium">Difference</th>
                  <th className="text-center p-3 font-medium">Status</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.length === 0 ? (
                  <tr><td colSpan={7} className="text-center p-8 text-muted-foreground">No reconciliations yet. Select an account above to start.</td></tr>
                ) : filteredHistory.map((r: any) => {
                  const diff = parseFloat(r.difference);
                  const DiffIcon = diff === 0 ? Equal : diff < 0 ? TrendingDown : TrendingUp;
                  return (
                    <tr key={r.id} className="border-b hover:bg-accent/50 transition-colors">
                      <td className="p-3">{formatDate(r.reconciliation_date)}</td>
                      <td className="p-3 font-medium">{r.account?.name}</td>
                      <td className="p-3 text-right">{formatCurrency(r.system_balance)}</td>
                      <td className="p-3 text-right">{formatCurrency(r.actual_balance)}</td>
                      <td className="p-3 text-right">
                        <span className={`inline-flex items-center gap-1 font-semibold ${
                          diff === 0 ? 'text-emerald-500' : diff < 0 ? 'text-rose-500' : 'text-blue-500'
                        }`}>
                          <DiffIcon className="w-3.5 h-3.5" />
                          {diff === 0 ? '₹0.00' : (diff > 0 ? '+' : '') + formatCurrency(diff)}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          r.status === 'matched' ? 'bg-emerald-500/10 text-emerald-500' :
                          r.status === 'adjusted' ? 'bg-blue-500/10 text-blue-500' :
                          'bg-amber-500/10 text-amber-500'
                        }`}>
                          {r.status === 'matched' && <CheckCircle2 className="w-3 h-3" />}
                          {r.status === 'unmatched' && <AlertTriangle className="w-3 h-3" />}
                          {r.status === 'adjusted' && <Wrench className="w-3 h-3" />}
                          {r.status}
                        </span>
                      </td>
                      <td className="p-3">
                        {r.status === 'unmatched' && diff !== 0 && (
                          <Button size="sm" variant="outline" onClick={() => handleAdjust(r.id)}
                            disabled={adjusting === r.id}>
                            {adjusting === r.id ? '...' : <><Wrench className="w-3 h-3 mr-1" /> Adjust</>}
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Reconcile Modal */}
      <Dialog open={showReconcile} onOpenChange={setShowReconcile}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-primary" /> Reconcile Account
            </DialogTitle>
            <DialogDescription>{selectedAccount?.name} — {selectedAccount?.type?.replace('_', ' ')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* System Balance Display */}
            <div className="p-4 rounded-xl bg-muted/50 border">
              <p className="text-sm text-muted-foreground mb-1">System Balance (from ledger)</p>
              <p className="text-2xl font-bold text-primary">{selectedAccount && formatCurrency(selectedAccount.system_balance)}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Physical / Statement Balance</Label>
                <Input type="number" step="0.01" value={actualBalance} onChange={e => setActualBalance(e.target.value)}
                  placeholder="Enter actual balance" autoFocus />
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={reconDate} onChange={e => setReconDate(e.target.value)} />
              </div>
            </div>

            {/* Live Difference Preview */}
            {actualBalance && selectedAccount && (() => {
              const diff = parseFloat(actualBalance) - parseFloat(selectedAccount.system_balance);
              return (
                <div className={`p-4 rounded-xl border-2 ${
                  diff === 0 ? 'border-emerald-500/30 bg-emerald-500/5' :
                  diff < 0 ? 'border-rose-500/30 bg-rose-500/5' :
                  'border-blue-500/30 bg-blue-500/5'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Difference</span>
                    <span className={`text-xl font-bold ${
                      diff === 0 ? 'text-emerald-500' : diff < 0 ? 'text-rose-500' : 'text-blue-500'
                    }`}>
                      {diff === 0 ? '✓ Matched' : (diff > 0 ? '+' : '') + formatCurrency(diff)}
                    </span>
                  </div>
                  {diff !== 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {diff < 0 ? '⚠ Shortage — Physical count is less than system' : 'ℹ Surplus — Physical count is more than system'}
                    </p>
                  )}
                </div>
              );
            })()}

            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g., Monthly cash count" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReconcile(false)}>Cancel</Button>
            <Button onClick={handleReconcile} disabled={saving || !actualBalance}>
              {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Record Reconciliation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
