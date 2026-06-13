import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency, formatDate } from '@/lib/utils';
import api from '@/lib/api';
import { Plus, ShoppingBag, TrendingUp, DollarSign, Package } from 'lucide-react';

export default function BusinessPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPurchase, setShowPurchase] = useState(false);
  const [showSale, setShowSale] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [profitData, setProfitData] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const [purchaseForm, setPurchaseForm] = useState({ description: '', purchase_cost: '', date: new Date().toISOString().slice(0, 10), payment_account_id: '', reference_number: '', is_credit: false, supplier_contact_id: '', immediate_payment_amount: '' });
  const [saleForm, setSaleForm] = useState({ sale_amount: '', buyer_contact_id: '', date: new Date().toISOString().slice(0, 10), payment_account_id: '', is_credit: false, reference_number: '' });

  const fetchItems = () => { api.get('/business-items').then(res => { setItems(res.data.data || []); setLoading(false); }); };
  const fetchProfit = () => { api.get('/business-profit').then(res => setProfitData(res.data)); };

  useEffect(() => {
    fetchItems(); fetchProfit();
    api.get('/accounts').then(res => setAccounts(res.data));
    api.get('/contacts').then(res => setContacts(res.data));
  }, []);

  const handlePurchase = async () => {
    setSaving(true);
    try {
      await api.post('/business-items', purchaseForm);
      setShowPurchase(false); fetchItems(); fetchProfit();
      setPurchaseForm({ description: '', purchase_cost: '', date: new Date().toISOString().slice(0, 10), payment_account_id: '', reference_number: '', is_credit: false, supplier_contact_id: '', immediate_payment_amount: '' });
    } catch (err: any) { alert(err.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleSale = async () => {
    if (!selectedItem) return;
    setSaving(true);
    try {
      await api.post(`/business-items/${selectedItem.id}/sell`, saleForm);
      setShowSale(false); fetchItems(); fetchProfit();
    } catch (err: any) { alert(err.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  };

  const paymentAccounts = accounts.filter((a: any) => ['cash', 'bank', 'credit_card', 'asset', 'liability'].includes(a.type));
  const receiveAccounts = accounts.filter((a: any) => ['cash', 'bank', 'asset'].includes(a.type));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Business Trading</h1>
          <p className="text-muted-foreground text-sm mt-1">Track purchases, sales, and profits</p>
        </div>
        <Button onClick={() => setShowPurchase(true)}><Plus className="w-4 h-4 mr-2" /> New Purchase</Button>
      </div>

      {/* Profit Summary */}
      {profitData && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="card-hover"><CardContent className="p-5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center"><ShoppingBag className="w-5 h-5 text-purple-500" /></div>
            <div><p className="text-xs text-muted-foreground">Total Purchases</p><p className="text-lg font-bold">{formatCurrency(profitData.total_purchase)}</p></div>
          </CardContent></Card>
          <Card className="card-hover"><CardContent className="p-5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center"><DollarSign className="w-5 h-5 text-blue-500" /></div>
            <div><p className="text-xs text-muted-foreground">Total Sales</p><p className="text-lg font-bold">{formatCurrency(profitData.total_sales)}</p></div>
          </CardContent></Card>
          <Card className="card-hover"><CardContent className="p-5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center"><TrendingUp className="w-5 h-5 text-emerald-500" /></div>
            <div><p className="text-xs text-muted-foreground">Total Profit</p><p className="text-lg font-bold text-emerald-500">{formatCurrency(profitData.total_profit)}</p></div>
          </CardContent></Card>
        </div>
      )}

      {/* Items List */}
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/50">
              <th className="text-left p-3 font-medium">Item</th>
              <th className="text-right p-3 font-medium">Cost</th>
              <th className="text-right p-3 font-medium">Sale</th>
              <th className="text-right p-3 font-medium">Profit</th>
              <th className="text-left p-3 font-medium">Buyer</th>
              <th className="text-left p-3 font-medium">Status</th>
              <th className="p-3"></th>
            </tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center p-8"><div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" /></td></tr>
              ) : items.map((item: any) => (
                <tr key={item.id} className="border-b hover:bg-accent/50 transition-colors">
                  <td className="p-3 font-medium">{item.description}</td>
                  <td className="p-3 text-right">{formatCurrency(item.purchase_cost)}</td>
                  <td className="p-3 text-right">{item.sale_amount ? formatCurrency(item.sale_amount) : '-'}</td>
                  <td className="p-3 text-right">{item.profit ? <span className="text-emerald-500">{formatCurrency(item.profit)}</span> : '-'}</td>
                  <td className="p-3">{item.buyer?.name || '-'}</td>
                  <td className="p-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${item.status === 'sold' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>{item.status}</span></td>
                  <td className="p-3">{item.status === 'purchased' && <Button size="sm" variant="outline" onClick={() => { setSelectedItem(item); setShowSale(true); }}>Sell</Button>}</td>
                </tr>
              ))}
              {!loading && items.length === 0 && <tr><td colSpan={7} className="text-center p-8 text-muted-foreground">No items</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Purchase Modal */}
      <Dialog open={showPurchase} onOpenChange={setShowPurchase}>
        <DialogContent><DialogHeader><DialogTitle>New Purchase</DialogTitle><DialogDescription>Record a business purchase</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Description</Label><Input value={purchaseForm.description} onChange={e => setPurchaseForm({...purchaseForm, description: e.target.value})} placeholder="e.g., Flight Ticket" /></div>
            
            <div className="space-y-2">
              <Label>Purchase Source</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="radio" name="source" checked={!purchaseForm.is_credit} onChange={() => setPurchaseForm({...purchaseForm, is_credit: false, supplier_contact_id: '', immediate_payment_amount: ''})} /> Direct Payment (Account)
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="radio" name="source" checked={purchaseForm.is_credit} onChange={() => setPurchaseForm({...purchaseForm, is_credit: true, payment_account_id: ''})} /> Person Supplier (Credit)
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Total Cost</Label><Input type="number" step="0.01" value={purchaseForm.purchase_cost} onChange={e => setPurchaseForm({...purchaseForm, purchase_cost: e.target.value})} /></div>
              <div className="space-y-2"><Label>Date</Label><Input type="date" value={purchaseForm.date} onChange={e => setPurchaseForm({...purchaseForm, date: e.target.value})} /></div>
            </div>

            {purchaseForm.is_credit ? (
              <>
                <div className="space-y-2"><Label>Supplier</Label>
                  <Select value={purchaseForm.supplier_contact_id} onValueChange={v => setPurchaseForm({...purchaseForm, supplier_contact_id: v})}>
                    <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                    <SelectContent>{contacts.map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="pt-4 border-t border-border mt-4">
                  <Label className="font-semibold text-primary mb-2 block">Optional Immediate Payment</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Amount Paid Now</Label>
                      <Input type="number" step="0.01" value={purchaseForm.immediate_payment_amount} onChange={e => setPurchaseForm({...purchaseForm, immediate_payment_amount: e.target.value})} placeholder="0.00" />
                    </div>
                    {parseFloat(purchaseForm.immediate_payment_amount || '0') > 0 && (
                      <div className="space-y-2"><Label>Payment Account</Label>
                        <Select value={purchaseForm.payment_account_id} onValueChange={v => setPurchaseForm({...purchaseForm, payment_account_id: v})}>
                          <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                          <SelectContent>{paymentAccounts.map((a: any) => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-2"><Label>Payment Account</Label>
                <Select value={purchaseForm.payment_account_id} onValueChange={v => setPurchaseForm({...purchaseForm, payment_account_id: v})}>
                  <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                  <SelectContent>{paymentAccounts.map((a: any) => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowPurchase(false)}>Cancel</Button><Button onClick={handlePurchase} disabled={saving}>{saving ? '...' : 'Record Purchase'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sale Modal */}
      <Dialog open={showSale} onOpenChange={setShowSale}>
        <DialogContent><DialogHeader><DialogTitle>Record Sale</DialogTitle><DialogDescription>Sell: {selectedItem?.description}</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Sale Amount</Label><Input type="number" step="0.01" value={saleForm.sale_amount} onChange={e => setSaleForm({...saleForm, sale_amount: e.target.value})} /></div>
              <div className="space-y-2"><Label>Date</Label><Input type="date" value={saleForm.date} onChange={e => setSaleForm({...saleForm, date: e.target.value})} /></div>
            </div>
            <div className="space-y-2"><Label>Buyer</Label>
              <Select value={saleForm.buyer_contact_id} onValueChange={v => setSaleForm({...saleForm, buyer_contact_id: v})}>
                <SelectTrigger><SelectValue placeholder="Select buyer" /></SelectTrigger>
                <SelectContent>{contacts.map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="isCredit" checked={saleForm.is_credit} onChange={e => setSaleForm({...saleForm, is_credit: e.target.checked})} className="rounded" />
              <label htmlFor="isCredit" className="text-sm">Credit Sale (buyer pays later)</label>
            </div>
            {!saleForm.is_credit && (
              <div className="space-y-2"><Label>Receive Into</Label>
                <Select value={saleForm.payment_account_id} onValueChange={v => setSaleForm({...saleForm, payment_account_id: v})}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{receiveAccounts.map((a: any) => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowSale(false)}>Cancel</Button><Button onClick={handleSale} disabled={saving}>{saving ? '...' : 'Record Sale'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
