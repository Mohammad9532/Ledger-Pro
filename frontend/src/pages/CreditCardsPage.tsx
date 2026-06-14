import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency } from '@/lib/utils';
import api from '@/lib/api';
import { CreditCard, DollarSign, Plus, Trash2 } from 'lucide-react';

export default function CreditCardsPage() {
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSettle, setShowSettle] = useState(false);
  const [selectedCard, setSelectedCard] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [settleForm, setSettleForm] = useState({ amount: '', date: new Date().toISOString().slice(0, 10) });
  const [paymentSources, setPaymentSources] = useState([{ account_id: '', amount: '' }]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/reports/credit-card-summary').then(res => { setCards(res.data); setLoading(false); });
    api.get('/accounts').then(res => setAccounts(res.data));
  }, []);

  const handleSettle = async () => {
    if (!selectedCard) return;
    
    const targetAmt = parseFloat(settleForm.amount) || 0;
    const totalSources = paymentSources.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);
    if (Math.abs(totalSources - targetAmt) > 0.001) {
      alert('Total sum of payment sources must equal the Payment Amount.');
      return;
    }

    const entries: any[] = [{ account_id: selectedCard.id, debit: targetAmt, credit: 0 }];
    for (const source of paymentSources) {
      const sAmt = parseFloat(source.amount);
      if (!source.account_id || isNaN(sAmt) || sAmt <= 0) {
        alert('All payment sources must have a valid account and amount greater than 0.');
        return;
      }
      entries.push({ account_id: parseInt(source.account_id), debit: 0, credit: sAmt });
    }

    setSaving(true);
    try {
      await api.post('/transactions', {
        type: 'credit_card_payment', date: settleForm.date,
        amount: targetAmt,
        description: `CC Payment - ${selectedCard.name}`,
        entries,
      });
      setShowSettle(false);
      setPaymentSources([{ account_id: '', amount: '' }]);
      api.get('/reports/credit-card-summary').then(res => setCards(res.data));
    } catch (err: any) { alert(err.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  };

  const transferrableAccounts = accounts.filter((a: any) => !['income', 'expense', 'system'].includes(a.type));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Credit Cards</h1>
        <p className="text-muted-foreground text-sm mt-1">Track outstanding balances and settle bills</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : cards.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">No credit cards found. Add credit card accounts first.</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((card: any, i: number) => (
            <Card key={card.id} className="card-hover animate-fade-in overflow-hidden" style={{ animationDelay: `${i * 50}ms` }}>
              <div className="h-2 bg-gradient-to-r from-orange-500 to-amber-500" />
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold">{card.name}</p>
                    <p className="text-xs text-muted-foreground">Credit Card</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Outstanding</span>
                    <span className="font-bold text-orange-500">{formatCurrency(card.outstanding)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Balance</span>
                    <span className="font-medium">{formatCurrency(card.balance)}</span>
                  </div>
                </div>
                <Button className="w-full mt-4" variant="outline" onClick={() => { setSelectedCard(card); setSettleForm({ ...settleForm, amount: card.outstanding }); setPaymentSources([{ account_id: '', amount: card.outstanding }]); setShowSettle(true); }}>
                  <DollarSign className="w-4 h-4 mr-2" /> Pay Bill
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showSettle} onOpenChange={setShowSettle}>
        <DialogContent><DialogHeader><DialogTitle>Pay Credit Card Bill</DialogTitle><DialogDescription>{selectedCard?.name}</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Target Amount</Label><Input type="number" step="0.01" value={settleForm.amount} onChange={e => setSettleForm({...settleForm, amount: e.target.value})} /></div>
              <div className="space-y-2"><Label>Date</Label><Input type="date" value={settleForm.date} onChange={e => setSettleForm({...settleForm, date: e.target.value})} /></div>
            </div>
            
            <div className="pt-2 border-t border-border mt-2">
              <div className="flex items-center justify-between mb-4">
                <Label className="font-semibold">Payment Sources</Label>
                <Button variant="outline" size="sm" onClick={() => setPaymentSources([...paymentSources, { account_id: '', amount: '' }])}>
                  <Plus className="w-4 h-4 mr-2" /> Add Source
                </Button>
              </div>
              
              <div className="space-y-3">
                {paymentSources.map((source, idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row items-start sm:items-end gap-2 bg-muted/30 p-2 rounded border border-border">
                    <div className="flex-1 w-full sm:w-auto space-y-1">
                      <Label className="text-xs">Account</Label>
                      <Select value={source.account_id} onValueChange={v => {
                        const newSources = [...paymentSources];
                        newSources[idx].account_id = v;
                        setPaymentSources(newSources);
                      }}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>{transferrableAccounts.map((a: any) => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1 w-full sm:w-auto space-y-1">
                      <Label className="text-xs">Amount</Label>
                      <Input type="number" step="0.01" value={source.amount} onChange={e => {
                        const newSources = [...paymentSources];
                        newSources[idx].amount = e.target.value;
                        setPaymentSources(newSources);
                      }} placeholder="0.00" />
                    </div>
                    {paymentSources.length > 1 && (
                      <Button variant="ghost" size="icon" className="text-rose-500 hover:bg-rose-500/10 mb-0.5" onClick={() => {
                        setPaymentSources(paymentSources.filter((_, i) => i !== idx));
                      }}><Trash2 className="w-4 h-4" /></Button>
                    )}
                  </div>
                ))}
              </div>

              {(() => {
                const total = paymentSources.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);
                const target = parseFloat(settleForm.amount) || 0;
                const isMatch = Math.abs(total - target) < 0.001;
                return target > 0 ? (
                  <div className="mt-4 p-2 rounded bg-card border text-sm flex justify-between">
                    <div>
                      <span className="text-muted-foreground">Total Paid: </span>
                      <span className={`font-bold ${isMatch ? 'text-emerald-500' : 'text-rose-500'}`}>{formatCurrency(total)}</span>
                    </div>
                    {!isMatch && <span className="text-rose-500 font-medium">Mismatch</span>}
                  </div>
                ) : null;
              })()}
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowSettle(false)}>Cancel</Button><Button onClick={handleSettle} disabled={saving}>{saving ? '...' : 'Pay Bill'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
