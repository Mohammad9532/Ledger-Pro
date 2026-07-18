import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency, formatDate } from '@/lib/utils';
import api from '@/lib/api';
import { Plus, ShoppingBag, TrendingUp, DollarSign, Package, FileText, Download } from 'lucide-react';
import { AIRPORTS, AIRLINES } from '@/lib/travelData';
import { Autocomplete } from '@/components/ui/autocomplete';

export default function BusinessPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPurchase, setShowPurchase] = useState(false);
  const [showSale, setShowSale] = useState(false);
  const [showDocModal, setShowDocModal] = useState(false);
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

  const [docForm, setDocForm] = useState({
    document_type: 'flight',
    passengers: [{ title: 'Mr', first_name: '', last_name: '', passport: '' }],
    flight: { airline: '', flight_number: '', pnr: '', ticket_number: '', class: 'Economy', seat: '', baggage: '', cabin_baggage: '', status: 'Confirmed', booking_agent: '', fare: '' },
    journey: { from: '', to: '', departure: '', arrival: '', terminal: '', gate: '', booking_date: new Date().toISOString().slice(0, 10) }
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
    if (cbAmt > 0 && (!cashbackAccountId || !cashbackIncomeId)) {
      alert('Please select both Cashback Wallet and Income Category for the cashback.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...purchaseForm,
        cashback_amount: cbAmt,
        cashback_account_id: cashbackAccountId,
        cashback_income_account_id: incomeCategories.find(c => String(c.id) === cashbackIncomeId)?.account_id || null
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

  const handleOpenDocModal = (item: any) => {
    setSelectedItem(item);
    if (item.metadata && item.metadata.document_type === 'flight') {
      const passengers = item.metadata.passengers || (item.metadata.passenger ? [item.metadata.passenger] : [{ title: 'Mr', first_name: '', last_name: '', passport: '' }]);
      setDocForm({
        document_type: 'flight',
        passengers: passengers,
        flight: { airline: '', flight_number: '', pnr: '', ticket_number: '', class: 'Economy', seat: '', baggage: '', cabin_baggage: '', status: 'Confirmed', booking_agent: '', fare: '', ...item.metadata.flight },
        journey: { from: '', to: '', departure: '', arrival: '', terminal: '', gate: '', booking_date: new Date().toISOString().slice(0, 10), ...item.metadata.journey }
      });
    } else {
      setDocForm({
        document_type: 'flight',
        passengers: [{ title: 'Mr', first_name: '', last_name: '', passport: '' }],
        flight: { airline: '', flight_number: '', pnr: '', ticket_number: '', class: 'Economy', seat: '', baggage: '', cabin_baggage: '', status: 'Confirmed', booking_agent: '', fare: '' },
        journey: { from: '', to: '', departure: '', arrival: '', terminal: '', gate: '', booking_date: new Date().toISOString().slice(0, 10) }
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

  const paymentAccounts = accounts.filter((a: any) => ['cash', 'bank', 'credit_card', 'asset', 'liability'].includes(a.type));
  const receiveAccounts = accounts.filter((a: any) => ['cash', 'bank', 'asset'].includes(a.type));
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
                  <td className="p-3 text-right">{item.profit ? <span className="text-emerald-500">{formatCurrency(item.profit)}</span> : '-'}</td>
                  <td className="p-3">{item.buyer?.name || '-'}</td>
                  <td className="p-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${item.status === 'sold' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>{item.status}</span></td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      {item.status === 'purchased' && <Button size="sm" variant="outline" onClick={() => { setSelectedItem(item); setShowSale(true); }}>Sell</Button>}
                      <Button size="sm" variant="ghost" onClick={() => handleOpenDocModal(item)} title="Generate Document"><FileText className="w-4 h-4 text-blue-500" /></Button>
                    </div>
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Cashback Wallet Asset</Label>
                        <Select value={cashbackAccountId} onValueChange={setCashbackAccountId}>
                          <SelectTrigger><SelectValue placeholder="Select wallet" /></SelectTrigger>
                          <SelectContent>{assetAccounts.map((a: any) => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Income Category</Label>
                        <Select value={cashbackIncomeId} onValueChange={setCashbackIncomeId}>
                          <SelectTrigger><SelectValue placeholder="Select income" /></SelectTrigger>
                          <SelectContent>{incomeCategories.map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
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
                  
                  {docForm.passengers.map((pax, idx) => (
                    <div key={idx} className="relative p-3 border border-border rounded bg-muted/20">
                      {docForm.passengers.length > 1 && (
                        <button type="button" className="absolute top-2 right-2 text-red-500 text-xs font-bold" onClick={() => setDocForm({...docForm, passengers: docForm.passengers.filter((_, i) => i !== idx)})}>
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

                <div className="border border-border p-4 rounded-lg space-y-4">
                  <h3 className="font-semibold border-b pb-2">Flight Details</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Airline</Label>
                      <Autocomplete
                        value={docForm.flight.airline}
                        onChange={(val) => setDocForm({...docForm, flight: {...docForm.flight, airline: val}})}
                        placeholder="e.g. Air India (AI)"
                        options={AIRLINES.map(a => ({
                          label: a.name,
                          value: `${a.name} (${a.iata})`,
                          logoUrl: `https://pics.avs.io/150/40/${a.iata}.png`,
                          subLabel: `IATA: ${a.iata}`
                        }))}
                      />
                    </div>
                    <div className="space-y-2"><Label>Flight No.</Label><Input value={docForm.flight.flight_number} onChange={e => setDocForm({...docForm, flight: {...docForm.flight, flight_number: e.target.value}})} placeholder="e.g. EK501" /></div>
                    <div className="space-y-2"><Label>PNR</Label><Input value={docForm.flight.pnr} onChange={e => setDocForm({...docForm, flight: {...docForm.flight, pnr: e.target.value}})} placeholder="Booking Ref" /></div>
                    <div className="space-y-2"><Label>Ticket No.</Label><Input value={docForm.flight.ticket_number} onChange={e => setDocForm({...docForm, flight: {...docForm.flight, ticket_number: e.target.value}})} /></div>
                    <div className="space-y-2"><Label>Class</Label><Input value={docForm.flight.class} onChange={e => setDocForm({...docForm, flight: {...docForm.flight, class: e.target.value}})} placeholder="Economy" /></div>
                    <div className="space-y-2"><Label>Seat</Label><Input value={docForm.flight.seat} onChange={e => setDocForm({...docForm, flight: {...docForm.flight, seat: e.target.value}})} /></div>
                    <div className="space-y-2"><Label>Status</Label><Input value={docForm.flight.status} onChange={e => setDocForm({...docForm, flight: {...docForm.flight, status: e.target.value}})} placeholder="Confirmed" /></div>
                    <div className="space-y-2"><Label>Check-in Bag</Label><Input value={docForm.flight.baggage} onChange={e => setDocForm({...docForm, flight: {...docForm.flight, baggage: e.target.value}})} placeholder="e.g. 30 Kg" /></div>
                    <div className="space-y-2"><Label>Cabin Bag</Label><Input value={docForm.flight.cabin_baggage} onChange={e => setDocForm({...docForm, flight: {...docForm.flight, cabin_baggage: e.target.value}})} placeholder="e.g. 7 Kg" /></div>
                  </div>
                </div>

                <div className="border border-border p-4 rounded-lg space-y-4">
                  <h3 className="font-semibold border-b pb-2">Journey Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>From</Label>
                      <Autocomplete
                        value={docForm.journey.from}
                        onChange={(val) => setDocForm({...docForm, journey: {...docForm.journey, from: val}})}
                        placeholder="Origin Airport"
                        options={AIRPORTS.map(a => ({
                          label: `${a.name} (${a.iata})`,
                          value: `${a.name} (${a.iata})`,
                          subLabel: a.country
                        }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>To</Label>
                      <Autocomplete
                        value={docForm.journey.to}
                        onChange={(val) => setDocForm({...docForm, journey: {...docForm.journey, to: val}})}
                        placeholder="Destination Airport"
                        options={AIRPORTS.map(a => ({
                          label: `${a.name} (${a.iata})`,
                          value: `${a.name} (${a.iata})`,
                          subLabel: a.country
                        }))}
                      />
                    </div>
                    <div className="space-y-2"><Label>Departure Time</Label><Input type="datetime-local" value={docForm.journey.departure} onChange={e => setDocForm({...docForm, journey: {...docForm.journey, departure: e.target.value}})} /></div>
                    <div className="space-y-2"><Label>Arrival Time</Label><Input type="datetime-local" value={docForm.journey.arrival} onChange={e => setDocForm({...docForm, journey: {...docForm.journey, arrival: e.target.value}})} /></div>
                    <div className="space-y-2"><Label>Terminal</Label><Input value={docForm.journey.terminal} onChange={e => setDocForm({...docForm, journey: {...docForm.journey, terminal: e.target.value}})} /></div>
                    <div className="space-y-2"><Label>Gate</Label><Input value={docForm.journey.gate} onChange={e => setDocForm({...docForm, journey: {...docForm.journey, gate: e.target.value}})} /></div>
                  </div>
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
