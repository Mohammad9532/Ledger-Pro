import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency, formatDate, getTransactionTypeLabel } from '@/lib/utils';
import api from '@/lib/api';
import { Plus, ArrowUpRight, ArrowDownLeft, Receipt, TrendingUp, ArrowLeftRight, ShoppingBag, Tag, CreditCard, Landmark, Trash2 } from 'lucide-react';

const typeIcons: Record<string, any> = {
  give_money: ArrowUpRight, receive_money: ArrowDownLeft, expense: Receipt, income: TrendingUp,
  transfer: ArrowLeftRight, purchase: ShoppingBag, sale: Tag, credit_card_payment: CreditCard,
  opening_balance: Landmark,
};
const typeColors: Record<string, string> = {
  give_money: 'text-orange-500', receive_money: 'text-emerald-500', expense: 'text-rose-500', income: 'text-emerald-500',
  transfer: 'text-blue-500', purchase: 'text-purple-500', sale: 'text-indigo-500', credit_card_payment: 'text-amber-500',
  opening_balance: 'text-slate-500',
};

interface Account { id: number; name: string; type: string; }
interface Contact { id: number; name: string; account?: { id: number }; }
interface ExpenseCategory { id: number; name: string; account_id: number | null; }
interface IncomeCategory { id: number; name: string; account_id: number | null; }

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [incomeCategories, setIncomeCategories] = useState<IncomeCategory[]>([]);
  const [filterType, setFilterType] = useState('all');
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Form state
  const [txType, setTxType] = useState('expense');
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), amount: '', description: '', reference_number: '', from_account: '', to_account: '', person_id: '', category_id: '' });
  const [cashbackAmount, setCashbackAmount] = useState('');
  const [applyCashbackToCustomer, setApplyCashbackToCustomer] = useState(false);
  const [cashbackAccountId, setCashbackAccountId] = useState('');
  const [cashbackIncomeId, setCashbackIncomeId] = useState('');
  const [investmentChargeAmount, setInvestmentChargeAmount] = useState('');
  const [investmentChargeCategoryId, setInvestmentChargeCategoryId] = useState('');
  const [ccPaymentSources, setCcPaymentSources] = useState([{ account_id: '', amount: '' }]);

  const fetchTransactions = () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), per_page: '15' });
    if (filterType !== 'all') params.set('type', filterType);
    if (startDate) params.set('start_date', startDate);
    if (endDate) params.set('end_date', endDate);
    api.get(`/transactions?${params}`).then(res => {
      setTransactions(res.data.data || []);
      setTotalPages(res.data.last_page || 1);
      setLoading(false);
    });
  };

  useEffect(() => { fetchTransactions(); }, [filterType, page, startDate, endDate]);

  useEffect(() => {
    api.get('/accounts').then(res => setAccounts(res.data));
    api.get('/contacts').then(res => setContacts(res.data));
    api.get('/expense-categories').then(res => setCategories(res.data));
    api.get('/income-categories').then(res => setIncomeCategories(res.data));
  }, []);

  const buildEntries = () => {
    const amt = parseFloat(form.amount);
    if (isNaN(amt) || amt <= 0) return null;

    switch (txType) {
      case 'give_money': {
        const person = contacts.find(c => String(c.id) === form.person_id);
        if (!person?.account?.id || !form.from_account) return null;
        
        let entries = [
          { account_id: person.account.id, debit: amt, credit: 0 },
          { account_id: parseInt(form.from_account), debit: 0, credit: amt },
        ];

        const cbAmt = parseFloat(cashbackAmount);
        if (!isNaN(cbAmt) && cbAmt > 0) {
          if (!cashbackAccountId) return null;
          
          if (applyCashbackToCustomer) {
            // Customer owes Amt - cbAmt. Bank pays Amt. Wallet gets cbAmt.
            entries[0].debit = amt - cbAmt;
            entries.push({ account_id: parseInt(cashbackAccountId), debit: cbAmt, credit: 0 });
          } else {
            // Keep cashback: Customer owes Amt. Bank pays Amt. Wallet gets cbAmt. Income gets cbAmt.
            if (!cashbackIncomeId) return null;
            const incCat = incomeCategories.find(c => String(c.id) === cashbackIncomeId);
            if (!incCat?.account_id) return null;

            entries.push({ account_id: parseInt(cashbackAccountId), debit: cbAmt, credit: 0 });
            entries.push({ account_id: incCat.account_id, debit: 0, credit: cbAmt });
          }
        }
        return entries;
      }
      case 'receive_money': {
        const person = contacts.find(c => String(c.id) === form.person_id);
        if (!person?.account?.id || !form.to_account) return null;
        return [
          { account_id: parseInt(form.to_account), debit: amt, credit: 0 },
          { account_id: person.account.id, debit: 0, credit: amt },
        ];
      }
      case 'expense': {
        const cat = categories.find(c => String(c.id) === form.category_id);
        if (!cat?.account_id || !form.from_account) return null;
        return [
          { account_id: cat.account_id, debit: amt, credit: 0 },
          { account_id: parseInt(form.from_account), debit: 0, credit: amt },
        ];
      }
      case 'income': {
        if (!form.to_account || !form.from_account) return null;
        return [
          { account_id: parseInt(form.to_account), debit: amt, credit: 0 },
          { account_id: parseInt(form.from_account), debit: 0, credit: amt },
        ];
      }
      case 'transfer': {
        if (!form.from_account || !form.to_account) return null;
        if (form.from_account === form.to_account) {
          alert('Source and destination accounts must be different');
          return null;
        }

        const toAccount = accounts.find(a => String(a.id) === form.to_account);
        const invCharge = parseFloat(investmentChargeAmount);

        if (toAccount?.type === 'asset' && !isNaN(invCharge) && invCharge > 0) {
          if (!investmentChargeCategoryId) return null;
          const cat = categories.find(c => String(c.id) === investmentChargeCategoryId);
          if (!cat?.account_id) return null;
          
          if (invCharge >= amt) {
            alert('Investment charges must be less than the transfer amount.');
            return null;
          }

          return [
            { account_id: parseInt(form.to_account), debit: amt - invCharge, credit: 0 },
            { account_id: cat.account_id, debit: invCharge, credit: 0 },
            { account_id: parseInt(form.from_account), debit: 0, credit: amt },
          ];
        }

        return [
          { account_id: parseInt(form.to_account), debit: amt, credit: 0 },
          { account_id: parseInt(form.from_account), debit: 0, credit: amt },
        ];
      }
      case 'credit_card_payment': {
        if (!form.to_account) return null;
        
        const totalSources = ccPaymentSources.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);
        if (Math.abs(totalSources - amt) > 0.001) {
          alert('Total sum of payment sources must equal the Payment Amount.');
          return null;
        }

        const entries: any[] = [
          { account_id: parseInt(form.to_account), debit: amt, credit: 0 }
        ];

        for (const source of ccPaymentSources) {
          const sAmt = parseFloat(source.amount);
          if (!source.account_id || isNaN(sAmt) || sAmt <= 0) {
             alert('All payment sources must have a valid account and amount greater than 0.');
             return null;
          }
          entries.push({ account_id: parseInt(source.account_id), debit: 0, credit: sAmt });
        }

        return entries;
      }
      default: return null;
    }
  };

  const handleSave = async () => {
    const entries = buildEntries();
    if (!entries) { alert('Please fill all required fields'); return; }
    setSaving(true);
    try {
      await api.post('/transactions', {
        type: txType, date: form.date, amount: parseFloat(form.amount),
        description: form.description, reference_number: form.reference_number,
        expense_category_id: form.category_id ? parseInt(form.category_id) : null,
        entries,
      });
      setShowModal(false);
      setForm({ date: new Date().toISOString().slice(0, 10), amount: '', description: '', reference_number: '', from_account: '', to_account: '', person_id: '', category_id: '' });
      setCashbackAmount(''); setApplyCashbackToCustomer(false); setCashbackAccountId(''); setCashbackIncomeId('');
      setInvestmentChargeAmount(''); setInvestmentChargeCategoryId('');
      setCcPaymentSources([{ account_id: '', amount: '' }]);
      fetchTransactions();
    } catch (err: any) {
      alert(err.response?.data?.error || err.response?.data?.message || 'Failed to create transaction');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: number, type: string) => {
    if (type === 'opening_balance') {
      alert('Opening balance transactions cannot be deleted directly. Edit the account to change the opening balance.');
      return;
    }
    if (!confirm('Delete this transaction? This is a soft delete — entries remain in the audit trail.')) return;
    try {
      await api.delete(`/transactions/${id}`);
      fetchTransactions();
    } catch (err: any) {
      alert(err.response?.data?.error || err.response?.data?.message || 'Failed to delete transaction.');
    }
  };

  const cashBankAccounts = accounts.filter(a => ['cash', 'bank'].includes(a.type));
  const incomeAccounts = accounts.filter(a => a.type === 'income');
  const ccAccounts = accounts.filter(a => a.type === 'credit_card');
  const assetAccounts = accounts.filter(a => a.type === 'asset');
  const transferrableAccounts = accounts.filter(a => ['cash', 'bank', 'credit_card', 'asset', 'liability', 'business'].includes(a.type));

  const transactionTypes = ['all', 'give_money', 'receive_money', 'expense', 'income', 'transfer', 'purchase', 'sale', 'credit_card_payment'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Transactions</h1>
          <p className="text-muted-foreground text-sm mt-1">All financial transactions with double-entry ledger</p>
        </div>
        <Button onClick={() => setShowModal(true)}><Plus className="w-4 h-4 mr-2" /> New Transaction</Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row flex-wrap items-start sm:items-end gap-4">
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <div className="space-y-1 flex-1 sm:flex-none"><label className="text-sm text-muted-foreground">From</label><Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full sm:w-40" /></div>
            <div className="space-y-1 flex-1 sm:flex-none"><label className="text-sm text-muted-foreground">To</label><Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full sm:w-40" /></div>
          </div>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            {transactionTypes.map(t => (
              <Button key={t} variant={filterType === t ? 'default' : 'outline'} size="sm" onClick={() => { setFilterType(t); setPage(1); }}>
                {t === 'all' ? 'All' : getTransactionTypeLabel(t)}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Transaction List */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto hidden md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">TXN #</th>
                  <th className="text-left p-3 font-medium">Date</th>
                  <th className="text-left p-3 font-medium">Type</th>
                  <th className="text-left p-3 font-medium">Description</th>
                  <th className="text-right p-3 font-medium">Amount</th>
                  <th className="text-left p-3 font-medium">Entries</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="text-center p-8"><div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" /></td></tr>
                ) : transactions.length === 0 ? (
                  <tr><td colSpan={7} className="text-center p-8 text-muted-foreground">No transactions</td></tr>
                ) : transactions.map((t: any) => {
                  const Icon = typeIcons[t.type] || Receipt;
                  return (
                    <tr key={t.id} className="border-b hover:bg-accent/50 transition-colors">
                      <td className="p-3"><span className="font-mono text-xs text-primary bg-primary/5 px-2 py-0.5 rounded">{t.txn_number || `#${t.id}`}</span></td>
                      <td className="p-3">{formatDate(t.date)}</td>
                      <td className="p-3">
                        <span className={`flex items-center gap-1.5 ${typeColors[t.type] || ''}`}>
                          <Icon className="w-4 h-4" />
                          {getTransactionTypeLabel(t.type)}
                        </span>
                      </td>
                      <td className="p-3 max-w-xs truncate">{t.description || '-'}</td>
                      <td className="p-3 text-right font-medium">{formatCurrency(t.amount)}</td>
                      <td className="p-3">
                        <div className="text-xs space-y-0.5">
                          {t.entries?.map((e: any, i: number) => (
                            <div key={i} className="flex gap-2">
                              <span className="text-muted-foreground">{e.account?.name}</span>
                              {parseFloat(e.debit) > 0 && <span className="text-emerald-500">Dr {formatCurrency(e.debit)}</span>}
                              {parseFloat(e.credit) > 0 && <span className="text-rose-500">Cr {formatCurrency(e.credit)}</span>}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="p-3">
                        {t.type === 'opening_balance' ? (
                          <Button variant="ghost" size="icon" className="text-muted-foreground/30 cursor-not-allowed" disabled title="Edit the account to change opening balance">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        ) : (
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(t.id, t.type)} className="text-muted-foreground hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-border">
            {loading ? (
              <div className="p-8"><div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" /></div>
            ) : transactions.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No transactions</div>
            ) : transactions.map((t: any) => {
              const Icon = typeIcons[t.type] || Receipt;
              return (
                <div key={t.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs text-primary bg-primary/5 px-2 py-0.5 rounded">{t.txn_number || `#${t.id}`}</span>
                        <span className="text-xs text-muted-foreground">{formatDate(t.date)}</span>
                      </div>
                      <span className={`flex items-center gap-1.5 text-sm font-medium ${typeColors[t.type] || ''}`}>
                        <Icon className="w-4 h-4" />
                        {getTransactionTypeLabel(t.type)}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{formatCurrency(t.amount)}</p>
                    </div>
                  </div>
                  
                  {t.description && <p className="text-sm text-muted-foreground">{t.description}</p>}
                  
                  <div className="bg-muted/30 p-2 rounded-lg text-xs space-y-1">
                    {t.entries?.map((e: any, i: number) => (
                      <div key={i} className="flex justify-between gap-2">
                        <span className="text-muted-foreground truncate">{e.account?.name}</span>
                        <div className="shrink-0">
                          {parseFloat(e.debit) > 0 && <span className="text-emerald-500 font-medium">Dr {formatCurrency(e.debit)}</span>}
                          {parseFloat(e.credit) > 0 && <span className="text-rose-500 font-medium">Cr {formatCurrency(e.credit)}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex justify-end pt-1">
                    {t.type === 'opening_balance' ? (
                      <Button variant="ghost" size="sm" className="text-muted-foreground/30 cursor-not-allowed h-8" disabled>
                        <Trash2 className="w-4 h-4 mr-2" /> Cannot Delete
                      </Button>
                    ) : (
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(t.id, t.type)} className="text-muted-foreground hover:text-destructive h-8">
                        <Trash2 className="w-4 h-4 mr-2" /> Delete
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 p-4 border-t">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
              <span className="text-sm text-muted-foreground flex items-center">Page {page} of {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* New Transaction Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Transaction</DialogTitle>
            <DialogDescription>Create a double-entry transaction</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Transaction Type</Label>
              <Select value={txType} onValueChange={setTxType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['give_money','receive_money','expense','income','transfer','credit_card_payment'].map(t => (
                    <SelectItem key={t} value={t}>{getTransactionTypeLabel(t)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Date</Label><Input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} /></div>
              <div className="space-y-2"><Label>Amount</Label><Input type="number" step="0.01" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} placeholder="0.00" /></div>
            </div>

            {/* Dynamic fields based on type */}
            {(txType === 'give_money' || txType === 'receive_money') && (
              <div className="space-y-2">
                <Label>Person</Label>
                <Select value={form.person_id} onValueChange={v => setForm({...form, person_id: v})}>
                  <SelectTrigger><SelectValue placeholder="Select person" /></SelectTrigger>
                  <SelectContent>{contacts.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}

            {txType === 'give_money' && (
              <>
                <div className="space-y-2">
                  <Label>Pay From</Label>
                  <Select value={form.from_account} onValueChange={v => setForm({...form, from_account: v})}>
                    <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                    <SelectContent>{[...cashBankAccounts, ...ccAccounts].map(a => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="pt-4 border-t border-border mt-4">
                  <div className="flex items-center justify-between mb-4">
                    <Label className="font-semibold text-primary">Cashback (Optional)</Label>
                  </div>
                  <div className="space-y-4 bg-muted/30 p-4 rounded-lg border border-border">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Cashback Amount</Label>
                        <Input type="number" step="0.01" value={cashbackAmount} onChange={e => setCashbackAmount(e.target.value)} placeholder="0.00" />
                      </div>
                      {parseFloat(cashbackAmount) > 0 && (
                        <div className="space-y-2">
                          <Label>Apply To Customer</Label>
                          <Select value={applyCashbackToCustomer ? 'yes' : 'no'} onValueChange={v => setApplyCashbackToCustomer(v === 'yes')}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="yes">Yes (Reduce Receivable)</SelectItem>
                              <SelectItem value="no">No (Keep as Profit)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                    {parseFloat(cashbackAmount) > 0 && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Cashback Wallet Asset</Label>
                          <Select value={cashbackAccountId} onValueChange={setCashbackAccountId}>
                            <SelectTrigger><SelectValue placeholder="Select wallet" /></SelectTrigger>
                            <SelectContent>{assetAccounts.map(a => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        {!applyCashbackToCustomer && (
                          <div className="space-y-2">
                            <Label>Income Category</Label>
                            <Select value={cashbackIncomeId} onValueChange={setCashbackIncomeId}>
                              <SelectTrigger><SelectValue placeholder="Select income" /></SelectTrigger>
                              <SelectContent>{incomeCategories.map(a => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    )}
                    {parseFloat(cashbackAmount) > 0 && parseFloat(form.amount) > 0 && (
                      <div className="pt-2 border-t border-border/50 text-sm">
                        {applyCashbackToCustomer ? (
                          <p className="text-emerald-500 font-medium">Customer will only owe {formatCurrency(parseFloat(form.amount) - parseFloat(cashbackAmount))}</p>
                        ) : (
                          <p className="text-emerald-500 font-medium">Customer owes full {formatCurrency(form.amount)} & you earn {formatCurrency(cashbackAmount)} profit</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {txType === 'receive_money' && (
              <div className="space-y-2">
                <Label>Receive Into</Label>
                <Select value={form.to_account} onValueChange={v => setForm({...form, to_account: v})}>
                  <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                  <SelectContent>{cashBankAccounts.map(a => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}

            {txType === 'expense' && (
              <>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={form.category_id} onValueChange={v => setForm({...form, category_id: v})}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>{categories.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Pay From</Label>
                  <Select value={form.from_account} onValueChange={v => setForm({...form, from_account: v})}>
                    <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                    <SelectContent>
                      {cashBankAccounts.map(a => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)}
                      {ccAccounts.map(a => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)}
                      {assetAccounts.map(a => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)}
                      {contacts.filter(c => c.account?.id).map(c => <SelectItem key={`p-${c.id}`} value={String(c.account!.id)}>{c.name} (Person)</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {txType === 'income' && (
              <>
                <div className="space-y-2">
                  <Label>Income Source</Label>
                  <Select value={form.from_account} onValueChange={v => setForm({...form, from_account: v})}>
                    <SelectTrigger><SelectValue placeholder="Select income account" /></SelectTrigger>
                    <SelectContent>{incomeAccounts.map(a => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Receive Into</Label>
                  <Select value={form.to_account} onValueChange={v => setForm({...form, to_account: v})}>
                    <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                    <SelectContent>{[...cashBankAccounts, ...assetAccounts].map(a => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </>
            )}

            {txType === 'transfer' && (() => {
              const toAccount = accounts.find(a => String(a.id) === form.to_account);
              const invCharge = parseFloat(investmentChargeAmount);
              return (
                <>
                  <div className="space-y-2">
                    <Label>From Account</Label>
                    <Select value={form.from_account} onValueChange={v => setForm({...form, from_account: v})}>
                      <SelectTrigger><SelectValue placeholder="Source" /></SelectTrigger>
                      <SelectContent>{transferrableAccounts.map(a => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>To Account</Label>
                    <Select value={form.to_account} onValueChange={v => setForm({...form, to_account: v})}>
                      <SelectTrigger><SelectValue placeholder="Destination" /></SelectTrigger>
                      <SelectContent>{transferrableAccounts.map(a => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  {toAccount?.type === 'asset' && (
                    <div className="pt-4 border-t border-border mt-4">
                      <div className="flex items-center justify-between mb-4">
                        <Label className="font-semibold text-primary">Investment Charges (Optional)</Label>
                      </div>
                      <div className="space-y-4 bg-muted/30 p-4 rounded-lg border border-border">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Charge Amount</Label>
                            <Input type="number" step="0.01" value={investmentChargeAmount} onChange={e => setInvestmentChargeAmount(e.target.value)} placeholder="0.00" />
                          </div>
                          {!isNaN(invCharge) && invCharge > 0 && (
                            <div className="space-y-2">
                              <Label>Expense Category</Label>
                              <Select value={investmentChargeCategoryId} onValueChange={setInvestmentChargeCategoryId}>
                                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                                <SelectContent>{categories.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>
                        {!isNaN(invCharge) && invCharge > 0 && parseFloat(form.amount) > 0 && (
                          <div className="pt-2 border-t border-border/50 text-sm">
                            <p className="text-emerald-500 font-medium">
                              Amount Paid: {formatCurrency(form.amount)} <br/>
                              Charges: {formatCurrency(invCharge)} <br/>
                              Asset Received: {formatCurrency(parseFloat(form.amount) - invCharge)}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}

            {txType === 'credit_card_payment' && (() => {
              const totalSources = ccPaymentSources.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);
              const targetAmt = parseFloat(form.amount) || 0;
              const isMatch = Math.abs(totalSources - targetAmt) < 0.001;
              return (
              <>
                <div className="space-y-2">
                  <Label>Credit Card</Label>
                  <Select value={form.to_account} onValueChange={v => setForm({...form, to_account: v})}>
                    <SelectTrigger><SelectValue placeholder="Select card" /></SelectTrigger>
                    <SelectContent>{ccAccounts.map(a => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>

                <div className="pt-4 border-t border-border mt-4">
                  <div className="flex items-center justify-between mb-4">
                    <Label className="font-semibold text-primary">Payment Sources</Label>
                    <Button variant="outline" size="sm" onClick={() => setCcPaymentSources([...ccPaymentSources, { account_id: '', amount: '' }])}>
                      <Plus className="w-4 h-4 mr-2" /> Add Source
                    </Button>
                  </div>
                  
                  <div className="space-y-4">
                    {ccPaymentSources.map((source, idx) => (
                      <div key={idx} className="flex flex-col sm:flex-row items-start sm:items-end gap-2 bg-muted/30 p-3 rounded-lg border border-border">
                        <div className="flex-1 space-y-2 w-full sm:w-auto">
                          <Label>Account</Label>
                          <Select value={source.account_id} onValueChange={v => {
                            const newSources = [...ccPaymentSources];
                            newSources[idx].account_id = v;
                            setCcPaymentSources(newSources);
                          }}>
                            <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                            <SelectContent>{transferrableAccounts.map(a => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div className="flex-1 space-y-2 w-full sm:w-auto">
                          <Label>Amount</Label>
                          <Input type="number" step="0.01" value={source.amount} onChange={e => {
                            const newSources = [...ccPaymentSources];
                            newSources[idx].amount = e.target.value;
                            setCcPaymentSources(newSources);
                          }} placeholder="0.00" />
                        </div>
                        {ccPaymentSources.length > 1 && (
                          <Button variant="ghost" size="icon" className="text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 mb-0.5" onClick={() => {
                            const newSources = ccPaymentSources.filter((_, i) => i !== idx);
                            setCcPaymentSources(newSources);
                          }}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>

                  {targetAmt > 0 && (
                    <div className="mt-4 p-3 rounded-lg border border-border/50 text-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0 bg-card">
                      <div>
                        <span className="text-muted-foreground">Total Paid: </span>
                        <span className={`font-bold ${isMatch ? 'text-emerald-500' : 'text-rose-500'}`}>{formatCurrency(totalSources)}</span>
                        <span className="text-muted-foreground mx-2">/</span>
                        <span className="text-muted-foreground">Target: </span>
                        <span className="font-bold">{formatCurrency(targetAmt)}</span>
                      </div>
                      {!isMatch && <span className="text-rose-500 font-medium">Amount mismatch</span>}
                    </div>
                  )}
                </div>
              </>
              );
            })()}

            <div className="space-y-2"><Label>Description</Label><Input value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Transaction description" /></div>
            <div className="space-y-2"><Label>Reference #</Label><Input value={form.reference_number} onChange={e => setForm({...form, reference_number: e.target.value})} placeholder="Optional" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Create Transaction'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
