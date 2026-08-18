import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { formatCurrency, formatDate } from '@/lib/utils';
import api from '@/lib/api';
import { Plus, ShoppingBag, TrendingUp, DollarSign, Package, FileText, Download, MoreHorizontal, Ban, Share, Wrench } from 'lucide-react';
import { AIRPORTS, AIRLINES } from '@/lib/travelData';
import { Autocomplete } from '@/components/ui/autocomplete';

export default function BusinessPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPurchase, setShowPurchase] = useState(false);
  const [showSale, setShowSale] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [showDocModal, setShowDocModal] = useState(false);
  const [showService, setShowService] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [profitData, setProfitData] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const [incomeCategories, setIncomeCategories] = useState<any[]>([]);
  const [cashbackAmount, setCashbackAmount] = useState('');
  const [cashbackAccountId, setCashbackAccountId] = useState('');
  const [cashbackIncomeId, setCashbackIncomeId] = useState('');

  const [purchaseForm, setPurchaseForm] = useState({ description: '', purchase_cost: '', date: new Date().toISOString().slice(0, 10), payment_account_id: '', reference_number: '', is_credit: false, supplier_contact_id: '', immediate_payment_amount: '' });
  const [saleForm, setSaleForm] = useState({ sale_amount: '', buyer_contact_id: '', date: new Date().toISOString().slice(0, 10), payment_account_id: '', is_credit: false, reference_number: '' });
  const [cancelForm, setCancelForm] = useState({ date: new Date().toISOString().slice(0, 10), supplier_refund_amount: '', customer_refund_amount: '', refund_account_id: '', notes: '' });
  const [serviceForm, setServiceForm] = useState({ description: '', amount: '', date: new Date().toISOString().slice(0, 10), contact_id: '', is_credit: true, payment_account_id: '', reference_number: '', notes: '', has_expense: false, expense_amount: '', expense_payment_account_id: '', expense_description: '' });

  const defaultSegment = () => ({ airline: '', flight_number: '', pnr: '', ticket_number: '', class: 'Economy', seat: '', baggage: '30 Kg', cabin_baggage: '7 Kg', from: '', to: '', departure: '', arrival: '', terminal: '', gate: '', same_as_first: false });

  const [docForm, setDocForm] = useState({
    document_type: 'flight',
    passengers: [{ title: 'Mr', first_name: '', last_name: '', passport: '' }],
    segments: [defaultSegment()] as any[],
    status: 'Confirmed',
    booking_date: new Date().toISOString().slice(0, 10),
    fare: ''
  });
  const [generatingDoc, setGeneratingDoc] = useState(false);

  const fetchItems = () => { api.get('/business-items').then(res => { setItems(res.data.data || []); setLoading(false); }); };
  const fetchProfit = () => { api.get('/business-profit').then(res => setProfitData(res.data)); };

  useEffect(() => {
    fetchItems(); fetchProfit();
    api.get('/accounts').then(res => setAccounts(res.data));
    api.get('/contacts').then(res => setContacts(res.data));
    api.get('/income-categories').then(res => setIncomeCategories(res.data));
  }, []);

  const handlePurchase = async () => {
    const cbAmt = parseFloat(cashbackAmount) || 0;
    if (cbAmt > 0 && !cashbackAccountId) {
      alert('Please select a Cashback Wallet Asset for the cashback.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...purchaseForm,
        ...(cbAmt > 0 ? {
          cashback_amount: cbAmt,
          cashback_account_id: cashbackAccountId
        } : {})
      };
      await api.post('/business-items', payload);
      setShowPurchase(false); fetchItems(); fetchProfit();
      setPurchaseForm({ description: '', purchase_cost: '', date: new Date().toISOString().slice(0, 10), payment_account_id: '', reference_number: '', is_credit: false, supplier_contact_id: '', immediate_payment_amount: '' });
      setCashbackAmount(''); setCashbackAccountId(''); setCashbackIncomeId('');
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

  const handleOpenCancel = (item: any) => {
    setSelectedItem(item);
    setCancelForm({
      date: new Date().toISOString().slice(0, 10),
      supplier_refund_amount: '',
      customer_refund_amount: '',
      refund_account_id: '',
      notes: '',
    });
    setShowCancel(true);
  };

  const handleCancel = async () => {
    if (!selectedItem) return;
    setSaving(true);
    try {
      await api.post(`/business-items/${selectedItem.id}/cancel`, cancelForm);
      setShowCancel(false); fetchItems(); fetchProfit();
    } catch (err: any) { alert(err.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  };

  // Derived values for the cancel dialog
  const supplierFee = selectedItem
    ? Math.max(0, parseFloat(selectedItem.purchase_cost || 0) - parseFloat(cancelForm.supplier_refund_amount || '0'))
    : 0;
  const yourCharge = selectedItem
    ? Math.max(0, parseFloat(selectedItem.sale_amount || 0) - parseFloat(cancelForm.customer_refund_amount || '0'))
    : 0;
  const netProfit = yourCharge - supplierFee;

  const handleOpenDocModal = (item: any) => {
    setSelectedItem(item);
    if (item.metadata && item.metadata.document_type === 'flight') {
      const m = item.metadata;
      const passengers = m.passengers || (m.passenger ? [m.passenger] : [{ title: 'Mr', first_name: '', last_name: '', passport: '' }]);
      let segments: any[];
      if (m.segments && Array.isArray(m.segments) && m.segments.length > 0) {
        segments = m.segments.map((s: any) => ({ ...defaultSegment(), ...s }));
      } else {
        // Legacy: convert single flight+journey into one segment
        const seg = defaultSegment();
        if (m.flight) { Object.assign(seg, { airline: m.flight.airline || '', flight_number: m.flight.flight_number || '', pnr: m.flight.pnr || '', ticket_number: m.flight.ticket_number || '', class: m.flight.class || 'Economy', seat: m.flight.seat || '', baggage: m.flight.baggage || '30 Kg', cabin_baggage: m.flight.cabin_baggage || '7 Kg' }); }
        if (m.journey) { Object.assign(seg, { from: m.journey.from || '', to: m.journey.to || '', departure: m.journey.departure || '', arrival: m.journey.arrival || '', terminal: m.journey.terminal || '', gate: m.journey.gate || '' }); }
        segments = [seg];
      }
      setDocForm({
        document_type: 'flight',
        passengers,
        segments,
        status: m.status || m.flight?.status || 'Confirmed',
        booking_date: m.booking_date || m.journey?.booking_date || new Date().toISOString().slice(0, 10),
        fare: m.fare || m.flight?.fare || ''
      });
    } else {
      setDocForm({
        document_type: 'flight',
        passengers: [{ title: 'Mr', first_name: '', last_name: '', passport: '' }],
        segments: [defaultSegment()],
        status: 'Confirmed',
        booking_date: new Date().toISOString().slice(0, 10),
        fare: ''
      });
    }
    setShowDocModal(true);
  };

  const handleGenerateDoc = async () => {
    if (!selectedItem) return;
    setGeneratingDoc(true);
    try {
      const res = await api.post(`/business-items/${selectedItem.id}/documents`, {
        document_type: docForm.document_type,
        data: docForm
      }, { responseType: 'blob' });
      
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      const firstPax = docForm.passengers && docForm.passengers.length > 0 ? docForm.passengers[0].first_name : 'Ticket';
      link.setAttribute('download', `Flight_Itinerary_${firstPax || 'Ticket'}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      
      setShowDocModal(false);
      fetchItems();
    } catch (err: any) {
      alert('Failed to generate document');
    } finally {
      setGeneratingDoc(false);
    }
  };

  const handleServiceCharge = async () => {
    setSaving(true);
    try {
      await api.post('/service-charges', serviceForm);
      setShowService(false);
      setServiceForm({ description: '', amount: '', date: new Date().toISOString().slice(0, 10), contact_id: '', is_credit: true, payment_account_id: '', reference_number: '', notes: '', has_expense: false, expense_amount: '', expense_payment_account_id: '', expense_description: '' });
      fetchItems(); fetchProfit();
    } catch (err: any) { alert(err.response?.data?.error || 'Failed to record service charge'); }
    finally { setSaving(false); }
  };

  const paymentAccounts = accounts.filter((a: any) => ['cash', 'bank', 'credit_card', 'asset', 'liability'].includes(a.type));
  const receiveAccounts = accounts.filter((a: any) => ['cash', 'bank', 'asset', 'credit_card', 'person'].includes(a.type));
  const assetAccounts = accounts.filter((a: any) => ['asset', 'bank', 'cash'].includes(a.type));

  const selectedPaymentAccount = accounts.find((a: any) => String(a.id) === purchaseForm.payment_account_id);
  const isCreditCardSelected = selectedPaymentAccount?.type === 'credit_card';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Business Trading</h1>
          <p className="text-muted-foreground text-sm mt-1">Track purchases, sales, and profits</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setServiceForm({ description: '', amount: '', date: new Date().toISOString().slice(0, 10), contact_id: '', is_credit: true, payment_account_id: '', reference_number: '', notes: '', has_expense: false, expense_amount: '', expense_payment_account_id: '', expense_description: '' }); setShowService(true); }}><Wrench className="w-4 h-4 mr-2" /> Service Charge</Button>
          <Button onClick={() => setShowPurchase(true)}><Plus className="w-4 h-4 mr-2" /> New Purchase</Button>
        </div>
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
          <div className="overflow-x-auto">
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
                  <td className="p-3 text-right">
                    {item.status === 'cancelled' 
                      ? (() => {
                          const net = (parseFloat(item.your_cancellation_charge) || 0) - (parseFloat(item.supplier_cancellation_fee) || 0);
                          return <span className={net >= 0 ? "text-emerald-500" : "text-red-500"}>{formatCurrency(net)}</span>;
                        })()
                      : item.profit ? <span className="text-emerald-500">{formatCurrency(item.profit)}</span> : '-'
                    }
                  </td>
                  <td className="p-3">{item.buyer?.name || '-'}</td>
                  <td className="p-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    item.status === 'sold' ? 'bg-emerald-500/10 text-emerald-500' :
                    item.status === 'cancelled' ? 'bg-red-500/10 text-red-500' :
                    'bg-amber-500/10 text-amber-500'
                  }`}>{item.status}</span></td>
                  <td className="p-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium hover:bg-accent hover:text-accent-foreground h-8 w-8 p-0 outline-none">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {item.status === 'purchased' && (
                          <DropdownMenuItem onClick={() => { setSelectedItem(item); setShowSale(true); }} className="cursor-pointer">
                            <Share className="mr-2 h-4 w-4" /> Record Sale
                          </DropdownMenuItem>
                        )}
                        {item.status === 'sold' && (
                          <DropdownMenuItem onClick={() => handleOpenCancel(item)} className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-100 dark:focus:bg-red-900/20">
                            <Ban className="mr-2 h-4 w-4" /> Cancel Ticket
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => handleOpenDocModal(item)} className="cursor-pointer">
                          <FileText className="mr-2 h-4 w-4 text-blue-500" /> Generate Document
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
              {!loading && items.length === 0 && <tr><td colSpan={7} className="text-center p-8 text-muted-foreground">No items</td></tr>}
            </tbody>
          </table>
          </div>
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

            {isCreditCardSelected && (
              <div className="pt-4 border-t border-border mt-4">
                <Label className="font-semibold text-primary mb-2 block">Cashback (Optional)</Label>
                <div className="space-y-4 bg-muted/30 p-4 rounded-lg border border-border">
                  <div className="space-y-2">
                    <Label>Cashback Amount</Label>
                    <Input type="number" step="0.01" value={cashbackAmount} onChange={e => setCashbackAmount(e.target.value)} placeholder="0.00" />
                  </div>
                  {parseFloat(cashbackAmount) > 0 && (
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div className="space-y-2">
                        <Label>Cashback Wallet Asset</Label>
                        <Select value={cashbackAccountId} onValueChange={setCashbackAccountId}>
                          <SelectTrigger><SelectValue placeholder="Select wallet" /></SelectTrigger>
                          <SelectContent>
                            {assetAccounts.map(a => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>
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

      {/* Cancel & Refund Modal */}
      <Dialog open={showCancel} onOpenChange={setShowCancel}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel & Refund</DialogTitle>
            <DialogDescription>
              Cancelling: <strong>{selectedItem?.description}</strong>
              {' '}— Sold for {selectedItem ? formatCurrency(selectedItem.sale_amount) : ''}, Cost {selectedItem ? formatCurrency(selectedItem.purchase_cost) : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">

            {/* Date */}
            <div className="space-y-2">
              <Label>Cancellation Date</Label>
              <Input type="date" value={cancelForm.date} onChange={e => setCancelForm({...cancelForm, date: e.target.value})} />
            </div>

            {/* Supplier section */}
            <div className="bg-muted/30 p-4 rounded-lg border border-border space-y-3">
              <p className="text-sm font-semibold text-muted-foreground">Airline / Supplier</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Refund Received from Airline</Label>
                  <Input
                    type="number" step="0.01"
                    placeholder={`Max: ${selectedItem ? formatCurrency(selectedItem.purchase_cost) : '0'}`}
                    value={cancelForm.supplier_refund_amount}
                    onChange={e => setCancelForm({...cancelForm, supplier_refund_amount: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Airline's Cancellation Fee</Label>
                  <div className="h-10 flex items-center px-3 rounded-md border border-border bg-muted text-sm font-medium text-orange-500">
                    {formatCurrency(supplierFee)}
                  </div>
                  <p className="text-xs text-muted-foreground">Auto: Cost − Refund</p>
                </div>
              </div>
            </div>

            {/* Customer section */}
            <div className="bg-muted/30 p-4 rounded-lg border border-border space-y-3">
              <p className="text-sm font-semibold text-muted-foreground">Customer</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Refund to Customer</Label>
                  <Input
                    type="number" step="0.01"
                    placeholder={`Max: ${selectedItem ? formatCurrency(selectedItem.sale_amount) : '0'}`}
                    value={cancelForm.customer_refund_amount}
                    onChange={e => setCancelForm({...cancelForm, customer_refund_amount: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Your Cancellation Charge</Label>
                  <div className="h-10 flex items-center px-3 rounded-md border border-border bg-muted text-sm font-medium text-emerald-500">
                    {formatCurrency(yourCharge)}
                  </div>
                  <p className="text-xs text-muted-foreground">Auto: Sale − Refund</p>
                </div>
              </div>
            </div>

            {/* Refund account */}
            <div className="space-y-2">
              <Label>Refund Bank / Cash Account</Label>
              <Select value={cancelForm.refund_account_id} onValueChange={v => setCancelForm({...cancelForm, refund_account_id: v})}>
                <SelectTrigger><SelectValue placeholder="Select account (airline refund in / customer refund out)" /></SelectTrigger>
                <SelectContent>{receiveAccounts.map((a: any) => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            {/* Net profit summary box */}
            <div className={`p-3 rounded-lg border text-sm font-medium flex justify-between items-center ${netProfit >= 0 ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' : 'bg-red-500/10 border-red-500/30 text-red-500'}`}>
              <span>Net Profit on Cancellation</span>
              <span>{formatCurrency(netProfit)}</span>
            </div>
            <p className="text-xs text-muted-foreground -mt-2">= Your Charge ({formatCurrency(yourCharge)}) − Airline Fee ({formatCurrency(supplierFee)})</p>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Input placeholder="e.g. Customer cancelled due to visa denial" value={cancelForm.notes} onChange={e => setCancelForm({...cancelForm, notes: e.target.value})} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancel(false)}>Back</Button>
            <Button variant="destructive" onClick={handleCancel} disabled={saving}>
              {saving ? 'Processing...' : 'Confirm Cancellation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Service Charge Modal */}
      <Dialog open={showService} onOpenChange={setShowService}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Service Charge</DialogTitle>
            <DialogDescription>Charge a party for a service you provided</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Service Description</Label><Input value={serviceForm.description} onChange={e => setServiceForm({...serviceForm, description: e.target.value})} placeholder="e.g., App Development, Visa Processing" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Amount</Label><Input type="number" step="0.01" value={serviceForm.amount} onChange={e => setServiceForm({...serviceForm, amount: e.target.value})} placeholder="0.00" /></div>
              <div className="space-y-2"><Label>Date</Label><Input type="date" value={serviceForm.date} onChange={e => setServiceForm({...serviceForm, date: e.target.value})} /></div>
            </div>
            <div className="space-y-2"><Label>Party (Client)</Label>
              <Select value={serviceForm.contact_id} onValueChange={v => setServiceForm({...serviceForm, contact_id: v})}>
                <SelectTrigger><SelectValue placeholder="Select party" /></SelectTrigger>
                <SelectContent>{contacts.map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Payment Mode</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="radio" name="servicePayMode" checked={serviceForm.is_credit} onChange={() => setServiceForm({...serviceForm, is_credit: true, payment_account_id: ''})} /> Credit (Party pays later)
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="radio" name="servicePayMode" checked={!serviceForm.is_credit} onChange={() => setServiceForm({...serviceForm, is_credit: false})} /> Paid Now
                </label>
              </div>
            </div>

            {!serviceForm.is_credit && (
              <div className="space-y-2"><Label>Receive Into</Label>
                <Select value={serviceForm.payment_account_id} onValueChange={v => setServiceForm({...serviceForm, payment_account_id: v})}>
                  <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                  <SelectContent>{receiveAccounts.map((a: any) => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2"><Label>Notes (Optional)</Label><Input value={serviceForm.notes} onChange={e => setServiceForm({...serviceForm, notes: e.target.value})} placeholder="Any additional details" /></div>

            {/* Direct Expense Section */}
            <div className="pt-2 border-t space-y-3">
              <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={serviceForm.has_expense} 
                  onChange={e => setServiceForm({...serviceForm, has_expense: e.target.checked})} 
                  className="rounded"
                />
                Include direct expense for this service? (e.g. domain purchase, API fee)
              </label>

              {serviceForm.has_expense && (
                <div className="p-3 border rounded-lg bg-muted/20 space-y-3">
                  <div className="space-y-2">
                    <Label>Expense Description (Optional)</Label>
                    <Input 
                      value={serviceForm.expense_description} 
                      onChange={e => setServiceForm({...serviceForm, expense_description: e.target.value})} 
                      placeholder="e.g., Domain purchase from Namecheap" 
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Expense Cost</Label>
                      <Input 
                        type="number" 
                        step="0.01" 
                        value={serviceForm.expense_amount} 
                        onChange={e => setServiceForm({...serviceForm, expense_amount: e.target.value})} 
                        placeholder="0.00" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Paid From Account</Label>
                      <Select 
                        value={serviceForm.expense_payment_account_id} 
                        onValueChange={v => setServiceForm({...serviceForm, expense_payment_account_id: v})}
                      >
                        <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                        <SelectContent>{paymentAccounts.map((a: any) => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Summary Box */}
            {serviceForm.amount && (
              <div className="p-3 rounded-lg border bg-amber-500/10 border-amber-500/30 text-sm space-y-1">
                {serviceForm.is_credit && serviceForm.contact_id && (
                  <div className="text-amber-500 font-medium">
                    → {formatCurrency(parseFloat(serviceForm.amount) || 0)} will be added to {contacts.find((c: any) => String(c.id) === serviceForm.contact_id)?.name || 'party'}'s account as receivable
                  </div>
                )}
                {serviceForm.has_expense && serviceForm.expense_amount && (
                  <div className="text-xs text-muted-foreground pt-1 border-t border-amber-500/20 flex justify-between">
                    <span>Income: {formatCurrency(parseFloat(serviceForm.amount) || 0)}</span>
                    <span>Cost: {formatCurrency(parseFloat(serviceForm.expense_amount) || 0)}</span>
                    <span className="font-bold text-emerald-500">
                      Profit: {formatCurrency((parseFloat(serviceForm.amount) || 0) - (parseFloat(serviceForm.expense_amount) || 0))}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowService(false)}>Cancel</Button>
            <Button onClick={handleServiceCharge} disabled={saving}>{saving ? 'Recording...' : 'Record Service'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Modal */}

      <Dialog open={showDocModal} onOpenChange={setShowDocModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Generate Travel Document</DialogTitle>
            <DialogDescription>Create a branded PDF document for {selectedItem?.description}</DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Document Type</Label>
              <Select value={docForm.document_type} onValueChange={v => setDocForm({...docForm, document_type: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="flight">Flight Itinerary / E-Ticket</SelectItem></SelectContent>
              </Select>
            </div>

            {docForm.document_type === 'flight' && (
              <>
                <div className="border border-border p-4 rounded-lg space-y-4">
                  <div className="flex justify-between items-center border-b pb-2">
                    <h3 className="font-semibold">Passenger Information</h3>
                    <Button variant="outline" size="sm" onClick={() => setDocForm({...docForm, passengers: [...docForm.passengers, {title: 'Mr', first_name: '', last_name: '', passport: ''}]})}>
                      <Plus className="w-4 h-4 mr-1" /> Add Passenger
                    </Button>
                  </div>
                  
                  {docForm.passengers.map((pax: any, idx: number) => (
                    <div key={idx} className="relative p-3 border border-border rounded bg-muted/20">
                      {docForm.passengers.length > 1 && (
                        <button type="button" className="absolute top-2 right-2 text-red-500 text-xs font-bold" onClick={() => setDocForm({...docForm, passengers: docForm.passengers.filter((_: any, i: number) => i !== idx)})}>
                          ✕ Remove
                        </button>
                      )}
                      <h4 className="text-xs font-bold mb-3 text-muted-foreground">PASSENGER {idx + 1}</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                        <div className="space-y-2"><Label>Title</Label><Input value={pax.title} onChange={e => { const newPax = [...docForm.passengers]; newPax[idx].title = e.target.value; setDocForm({...docForm, passengers: newPax}); }} placeholder="Mr/Ms" /></div>
                        <div className="space-y-2 sm:col-span-2"><Label>First Name</Label><Input value={pax.first_name} onChange={e => { const newPax = [...docForm.passengers]; newPax[idx].first_name = e.target.value; setDocForm({...docForm, passengers: newPax}); }} /></div>
                        <div className="space-y-2"><Label>Last Name</Label><Input value={pax.last_name} onChange={e => { const newPax = [...docForm.passengers]; newPax[idx].last_name = e.target.value; setDocForm({...docForm, passengers: newPax}); }} /></div>
                      </div>
                      <div className="space-y-2 mt-2"><Label>Passport Number (Optional)</Label><Input value={pax.passport} onChange={e => { const newPax = [...docForm.passengers]; newPax[idx].passport = e.target.value; setDocForm({...docForm, passengers: newPax}); }} /></div>
                    </div>
                  ))}
                </div>

                {/* Booking Info (shared) */}
                <div className="border border-border p-4 rounded-lg space-y-4">
                  <h3 className="font-semibold border-b pb-2">Booking Info</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div className="space-y-2"><Label>Status</Label><Input value={docForm.status} onChange={e => setDocForm({...docForm, status: e.target.value})} placeholder="Confirmed" /></div>
                    <div className="space-y-2"><Label>Booking Date</Label><Input type="date" value={docForm.booking_date} onChange={e => setDocForm({...docForm, booking_date: e.target.value})} /></div>
                    <div className="space-y-2"><Label>Fare (Optional)</Label><Input value={docForm.fare} onChange={e => setDocForm({...docForm, fare: e.target.value})} placeholder="e.g. 12500" /></div>
                  </div>
                </div>

                {/* Flight Segments */}
                <div className="border border-border p-4 rounded-lg space-y-4">
                  <div className="flex justify-between items-center border-b pb-2">
                    <h3 className="font-semibold">Flight Segments</h3>
                    <Button variant="outline" size="sm" onClick={() => setDocForm({...docForm, segments: [...docForm.segments, defaultSegment()]})}>
                      <Plus className="w-4 h-4 mr-1" /> Add Segment (Via)
                    </Button>
                  </div>

                  {docForm.segments.map((seg: any, sIdx: number) => {
                    const updateSeg = (field: string, val: any) => {
                      const newSegs = [...docForm.segments];
                      newSegs[sIdx] = { ...newSegs[sIdx], [field]: val };
                      setDocForm({...docForm, segments: newSegs});
                    };
                    const isFirst = sIdx === 0;
                    const firstSeg = docForm.segments[0];
                    const isSame = seg.same_as_first && !isFirst;

                    return (
                      <div key={sIdx} className="relative p-4 border border-border rounded-lg bg-muted/10 space-y-4">
                        <div className="flex justify-between items-center">
                          <h4 className="text-sm font-bold text-primary">SEGMENT {sIdx + 1}{seg.from && seg.to ? `: ${seg.from.match(/\(([^)]+)\)/)?.[1] || seg.from} → ${seg.to.match(/\(([^)]+)\)/)?.[1] || seg.to}` : ''}</h4>
                          <div className="flex items-center gap-2">
                            {!isFirst && (
                              <label className="flex items-center gap-1.5 text-xs cursor-pointer bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20">
                                <input type="checkbox" checked={!!seg.same_as_first} onChange={e => {
                                  const newSegs = [...docForm.segments];
                                  const checked = e.target.checked;
                                  newSegs[sIdx] = checked
                                    ? { ...newSegs[sIdx], same_as_first: true, airline: firstSeg.airline, pnr: firstSeg.pnr, ticket_number: firstSeg.ticket_number, class: firstSeg.class, baggage: firstSeg.baggage, cabin_baggage: firstSeg.cabin_baggage }
                                    : { ...newSegs[sIdx], same_as_first: false };
                                  setDocForm({...docForm, segments: newSegs});
                                }} className="rounded" />
                                <span className="text-blue-600 dark:text-blue-400 font-medium">Same as Seg 1</span>
                              </label>
                            )}
                            {docForm.segments.length > 1 && (
                              <button type="button" className="text-red-500 text-xs font-bold px-2 py-1 border border-red-500/20 rounded bg-red-500/10" onClick={() => setDocForm({...docForm, segments: docForm.segments.filter((_: any, i: number) => i !== sIdx)})}>
                                ✕ Remove
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          <div className="space-y-2">
                            <Label>Airline</Label>
                            <Autocomplete
                              value={isSame ? firstSeg.airline : seg.airline}
                              onChange={(val) => updateSeg('airline', val)}
                              placeholder="e.g. Air India (AI)"
                              options={AIRLINES.map(a => ({ label: a.name, value: `${a.name} (${a.iata})`, logoUrl: `https://pics.avs.io/150/40/${a.iata}.png`, subLabel: `IATA: ${a.iata}` }))}
                            />
                          </div>
                          <div className="space-y-2"><Label>Flight No.</Label><Input value={seg.flight_number} onChange={e => updateSeg('flight_number', e.target.value)} placeholder="e.g. EK501" /></div>
                          <div className="space-y-2"><Label>PNR</Label><Input value={isSame ? firstSeg.pnr : seg.pnr} onChange={e => updateSeg('pnr', e.target.value)} placeholder="Booking Ref" disabled={isSame} /></div>
                          <div className="space-y-2"><Label>Ticket No.</Label><Input value={isSame ? firstSeg.ticket_number : seg.ticket_number} onChange={e => updateSeg('ticket_number', e.target.value)} disabled={isSame} /></div>
                          <div className="space-y-2"><Label>Class</Label><Input value={isSame ? firstSeg.class : seg.class} onChange={e => updateSeg('class', e.target.value)} placeholder="Economy" disabled={isSame} /></div>
                          <div className="space-y-2"><Label>Seat</Label><Input value={seg.seat} onChange={e => updateSeg('seat', e.target.value)} /></div>
                          <div className="space-y-2"><Label>Check-in Bag</Label><Input value={isSame ? firstSeg.baggage : seg.baggage} onChange={e => updateSeg('baggage', e.target.value)} placeholder="30 Kg" disabled={isSame} /></div>
                          <div className="space-y-2"><Label>Cabin Bag</Label><Input value={isSame ? firstSeg.cabin_baggage : seg.cabin_baggage} onChange={e => updateSeg('cabin_baggage', e.target.value)} placeholder="7 Kg" disabled={isSame} /></div>
                        </div>

                        {/* Journey for this segment */}
                        <div className="border-t border-border pt-3 mt-3">
                          <h5 className="text-xs font-bold text-muted-foreground mb-3">ROUTE & SCHEDULE</h5>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <Label>From</Label>
                              <Autocomplete
                                value={seg.from}
                                onChange={(val) => updateSeg('from', val)}
                                placeholder="Origin Airport"
                                options={AIRPORTS.map(a => ({ label: `${a.name} (${a.iata})`, value: `${a.name} (${a.iata})`, subLabel: a.country }))}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>To</Label>
                              <Autocomplete
                                value={seg.to}
                                onChange={(val) => updateSeg('to', val)}
                                placeholder="Destination Airport"
                                options={AIRPORTS.map(a => ({ label: `${a.name} (${a.iata})`, value: `${a.name} (${a.iata})`, subLabel: a.country }))}
                              />
                            </div>
                            <div className="space-y-2"><Label>Departure</Label><Input type="datetime-local" value={seg.departure} onChange={e => updateSeg('departure', e.target.value)} /></div>
                            <div className="space-y-2"><Label>Arrival</Label><Input type="datetime-local" value={seg.arrival} onChange={e => updateSeg('arrival', e.target.value)} /></div>
                            <div className="space-y-2"><Label>Terminal</Label><Input value={seg.terminal} onChange={e => updateSeg('terminal', e.target.value)} /></div>
                            <div className="space-y-2"><Label>Gate</Label><Input value={seg.gate} onChange={e => updateSeg('gate', e.target.value)} /></div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDocModal(false)}>Cancel</Button>
            <Button onClick={handleGenerateDoc} disabled={generatingDoc}>
              {generatingDoc ? 'Generating...' : <><Download className="w-4 h-4 mr-2" /> Download PDF</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
