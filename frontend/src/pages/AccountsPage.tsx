import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency, getAccountTypeLabel, getAccountTypeColor } from '@/lib/utils';
import api from '@/lib/api';
import { Plus, Wallet, Building2, CreditCard, User, TrendingDown, TrendingUp, Box, Scale, Briefcase, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const typeIcons: Record<string, any> = {
  cash: Wallet, bank: Building2, credit_card: CreditCard, person: User,
  expense: TrendingDown, income: TrendingUp, asset: Box, liability: Scale, business: Briefcase,
};

interface Account {
  id: number; name: string; type: string; opening_balance: string;
  is_active: boolean; computed_balance: string; is_system: boolean;
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showSystem, setShowSystem] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [form, setForm] = useState({ name: '', type: 'cash', opening_balance: '0' });
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const navigate = useNavigate();

  const fetchAccounts = () => {
    const params = filterType !== 'all' ? `?type=${filterType}` : '';
    api.get(`/accounts${params}`).then(res => { setAccounts(res.data); setLoading(false); });
  };

  useEffect(() => { fetchAccounts(); }, [filterType]);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editId) {
        await api.put(`/accounts/${editId}`, form);
      } else {
        await api.post('/accounts', form);
      }
      setShowModal(false); setForm({ name: '', type: 'cash', opening_balance: '0' }); setEditId(null);
      fetchAccounts();
    } catch (err: any) {
      alert(err.response?.data?.message || err.response?.data?.error || 'Failed to save');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!editId) return;
    if (!confirm('Are you sure you want to delete this account?')) return;
    
    setSaving(true);
    try {
      await api.delete(`/accounts/${editId}`);
      setShowModal(false);
      fetchAccounts();
    } catch (err: any) {
      alert(err.response?.data?.message || err.response?.data?.error || 'Failed to delete account');
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (a: Account) => {
    // Pre-fill opening_balance with the dynamic opening_balance field from the API.
    // The backend now calculates the true opening balance from the ledger.
    setForm({ name: a.name, type: a.type, opening_balance: a.opening_balance ?? '0' });
    setEditId(a.id); setShowModal(true);
  };

  const grouped = accounts.reduce((acc, a) => {
    acc[a.type] = acc[a.type] || [];
    acc[a.type].push(a);
    return acc;
  }, {} as Record<string, Account[]>);

  const accountTypes = ['cash', 'bank', 'credit_card', 'asset', 'liability', 'business', 'equity'];

  const visibleAccounts = accounts.filter(a => {
    if (showSystem) return true;
    if (a.is_system) return false;
    if (!accountTypes.includes(a.type)) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Accounts</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your chart of accounts</p>
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex gap-2 justify-end">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {accountTypes.map(t => <SelectItem key={t} value={t}>{getAccountTypeLabel(t)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={() => { setEditId(null); setForm({ name: '', type: 'cash', opening_balance: '0' }); setShowModal(true); }}>
              <Plus className="w-4 h-4 mr-2" /> Add Account
            </Button>
          </div>
          <div className="flex items-center justify-end gap-2">
            <input type="checkbox" id="showSys" checked={showSystem} onChange={e => setShowSystem(e.target.checked)} className="rounded border-gray-300" />
            <label htmlFor="showSys" className="text-sm text-muted-foreground cursor-pointer">Show System & Internal Accounts</label>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {visibleAccounts.map((a, i) => {
            const Icon = typeIcons[a.type] || Wallet;
            const bal = parseFloat(a.computed_balance);
            return (
              <Card key={a.id} className="card-hover animate-fade-in cursor-pointer group" style={{ animationDelay: `${i * 30}ms` }} onClick={() => openEdit(a)}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg bg-accent flex items-center justify-center ${getAccountTypeColor(a.type)}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm">{a.name}</p>
                          {Boolean(a.is_system) && <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">System</span>}
                        </div>
                        <p className="text-xs text-muted-foreground">{getAccountTypeLabel(a.type)}</p>
                      </div>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); navigate(`/accounts/${a.id}`); }} className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md hover:bg-accent">
                      <Eye className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                  <p className={`text-lg font-bold ${bal >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {formatCurrency(a.computed_balance)}
                  </p>
                  {!a.is_active && <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full mt-2 inline-block">Inactive</span>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? 'Edit Account' : 'New Account'}</DialogTitle>
            <DialogDescription>
              {editId ? 'Update account details' : 'Create a new account in your chart of accounts'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Account Name</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g., HDFC Bank" />
            </div>
            <div className="space-y-2">
              <Label>Account Type</Label>
              <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })} disabled={editId !== null && accounts.find(a => a.id === editId)?.is_system}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {/* If editing a system account, we must include its type in the options so the Select displays it correctly */}
                  {editId && accounts.find(a => a.id === editId)?.is_system && !accountTypes.includes(form.type) && (
                    <SelectItem value={form.type}>{getAccountTypeLabel(form.type)}</SelectItem>
                  )}
                  {accountTypes.map(t => <SelectItem key={t} value={t}>{getAccountTypeLabel(t)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Opening Balance</Label>
              <Input type="number" step="0.01" value={form.opening_balance} onChange={e => setForm({ ...form, opening_balance: e.target.value })} />
              {editId && (
                <p className="text-xs text-muted-foreground">
                  This is stored as a ledger transaction (Opening Balance Equity). Set to <strong>0</strong> to remove it.
                </p>
              )}
            </div>
          </div>
          <DialogFooter className="flex justify-between items-center sm:justify-between w-full">
            {editId && !accounts.find(a => a.id === editId)?.is_system ? (
              <Button type="button" variant="destructive" onClick={handleDelete} disabled={saving}>
                Delete
              </Button>
            ) : (
              <div /> // Spacer for flex-between
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : editId ? 'Update' : 'Create'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
