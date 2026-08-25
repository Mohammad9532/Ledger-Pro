import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency, formatDate } from '@/lib/utils';
import api from '@/lib/api';
import { Plus, CheckCircle2, XCircle, Clock, Banknote, Edit, Trash, X } from 'lucide-react';

interface Contact {
  id: number;
  name: string;
}

interface Cheque {
  id: number;
  type: 'receivable' | 'payable';
  cheque_number: string;
  bank_name: string;
  amount: string;
  due_date: string;
  status: 'pending' | 'cleared' | 'bounced' | 'cancelled';
  notes: string;
  contact_id: number | null;
  contact?: Contact;
}

export default function ChequesPage() {
  const [cheques, setCheques] = useState<Cheque[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [form, setForm] = useState({
    type: 'receivable',
    cheque_number: '',
    bank_name: '',
    amount: '',
    due_date: '',
    contact_id: 'none',
    notes: ''
  });
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  const fetchCheques = () => {
    const params = filterStatus !== 'all' ? `?status=${filterStatus}` : '';
    api.get(`/cheques${params}`).then(res => { setCheques(res.data); setLoading(false); });
  };

  const fetchContacts = () => {
    api.get('/contacts').then(res => setContacts(res.data));
  };

  useEffect(() => { 
    fetchCheques(); 
    fetchContacts();
  }, [filterStatus]);

  const handleSave = async () => {
    setSaving(true);
    const payload = {
        ...form,
        contact_id: form.contact_id === 'none' ? null : form.contact_id
    };

    try {
      if (editId) {
        await api.put(`/cheques/${editId}`, payload);
      } else {
        await api.post('/cheques', payload);
      }
      setShowModal(false); 
      resetForm();
      fetchCheques();
    } catch (err: any) {
      alert(err.response?.data?.message || err.response?.data?.error || 'Failed to save');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!editId) return;
    if (!confirm('Are you sure you want to delete this cheque? Note: You cannot delete a cheque that has already sent reminders.')) return;
    
    setSaving(true);
    try {
      await api.delete(`/cheques/${editId}`);
      setShowModal(false);
      fetchCheques();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete cheque');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (id: number, status: string) => {
      try {
          await api.patch(`/cheques/${id}/status`, { status });
          fetchCheques();
      } catch (err: any) {
          alert(err.response?.data?.message || 'Failed to update status');
      }
  };

  const openEdit = (c: Cheque) => {
    setForm({ 
        type: c.type, 
        cheque_number: c.cheque_number, 
        bank_name: c.bank_name, 
        amount: c.amount, 
        due_date: c.due_date, 
        contact_id: c.contact_id ? String(c.contact_id) : 'none', 
        notes: c.notes || '' 
    });
    setEditId(c.id); 
    setShowModal(true);
  };

  const resetForm = () => {
      setForm({ type: 'receivable', cheque_number: '', bank_name: '', amount: '', due_date: '', contact_id: 'none', notes: '' });
      setEditId(null);
  };

  const getStatusIcon = (status: string) => {
      switch(status) {
          case 'pending': return <Clock className="w-4 h-4 text-amber-500" />;
          case 'cleared': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
          case 'bounced': return <XCircle className="w-4 h-4 text-rose-500" />;
          case 'cancelled': return <X className="w-4 h-4 text-slate-500" />;
          default: return null;
      }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Cheque Reminders</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage pending cheques and automated email alerts</p>
        </div>
        <div className="flex gap-2">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="cleared">Cleared</SelectItem>
              <SelectItem value="bounced">Bounced</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => { resetForm(); setShowModal(true); }}>
            <Plus className="w-4 h-4 mr-2" /> Add Cheque
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {cheques.map((c, i) => (
            <Card key={c.id} className="card-hover animate-fade-in group" style={{ animationDelay: `${i * 30}ms` }}>
              <CardContent className="p-5 relative">
                  <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-2">
                          <Banknote className={`w-5 h-5 ${c.type === 'receivable' ? 'text-emerald-500' : 'text-rose-500'}`} />
                          <h3 className="font-semibold text-lg">#{c.cheque_number}</h3>
                      </div>
                      <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-full text-xs font-medium uppercase tracking-wider">
                          {getStatusIcon(c.status)}
                          <span className="ml-1">{c.status}</span>
                      </div>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                          <span className="text-muted-foreground">Bank:</span>
                          <span className="font-medium">{c.bank_name}</span>
                      </div>
                      {c.contact && (
                          <div className="flex justify-between">
                              <span className="text-muted-foreground">Contact:</span>
                              <span className="font-medium">{c.contact.name}</span>
                          </div>
                      )}
                      <div className="flex justify-between">
                          <span className="text-muted-foreground">Due Date:</span>
                          <span className="font-medium">{formatDate(c.due_date)}</span>
                      </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                      <p className={`text-xl font-bold ${c.type === 'receivable' ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {c.type === 'payable' ? '-' : ''}{formatCurrency(c.amount)}
                      </p>

                      <div className="flex gap-2">
                          {c.status === 'pending' && (
                              <>
                                  <Button variant="outline" size="icon" className="w-8 h-8 rounded-full text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" onClick={() => handleStatusChange(c.id, 'cleared')} title="Mark as Cleared">
                                      <CheckCircle2 className="w-4 h-4" />
                                  </Button>
                                  <Button variant="outline" size="icon" className="w-8 h-8 rounded-full text-rose-600 hover:text-rose-700 hover:bg-rose-50" onClick={() => handleStatusChange(c.id, 'bounced')} title="Mark as Bounced">
                                      <XCircle className="w-4 h-4" />
                                  </Button>
                                  <Button variant="outline" size="icon" className="w-8 h-8 rounded-full text-slate-500 hover:text-slate-600 hover:bg-slate-100" onClick={() => handleStatusChange(c.id, 'cancelled')} title="Cancel Cheque">
                                      <X className="w-4 h-4" />
                                  </Button>
                                  <Button variant="outline" size="icon" className="w-8 h-8 rounded-full" onClick={() => openEdit(c)} title="Edit">
                                      <Edit className="w-4 h-4" />
                                  </Button>
                              </>
                          )}
                          {c.status !== 'pending' && (
                              <Button variant="outline" size="sm" onClick={() => handleStatusChange(c.id, 'pending')}>
                                  Revert to Pending
                              </Button>
                          )}
                      </div>
                  </div>
              </CardContent>
            </Card>
          ))}
          {cheques.length === 0 && (
              <div className="col-span-full py-12 text-center text-muted-foreground">
                  No cheques found.
              </div>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? 'Edit Cheque' : 'Add Cheque'}</DialogTitle>
            <DialogDescription>
              {editId ? 'Update cheque details' : 'Register a cheque to receive automated daily reminders.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })} disabled={editId !== null}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="receivable">Receivable (To Receive)</SelectItem>
                  <SelectItem value="payable">Payable (To Pay)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Cheque Number</Label>
                    <Input value={form.cheque_number} onChange={e => setForm({ ...form, cheque_number: e.target.value })} />
                </div>
                <div className="space-y-2">
                    <Label>Bank Name</Label>
                    <Input value={form.bank_name} onChange={e => setForm({ ...form, bank_name: e.target.value })} />
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Amount</Label>
                    <Input type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
                </div>
                <div className="space-y-2">
                    <Label>Due Date</Label>
                    <Input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} />
                </div>
            </div>
            <div className="space-y-2">
              <Label>Contact (Optional)</Label>
              <Select value={form.contact_id} onValueChange={v => setForm({ ...form, contact_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select a contact" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Contact</SelectItem>
                  {contacts.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter className="flex justify-between items-center w-full mt-4">
            {editId ? (
              <Button type="button" variant="ghost" className="text-rose-500 hover:text-rose-600 hover:bg-rose-50" onClick={handleDelete} disabled={saving}>
                <Trash className="w-4 h-4 mr-2" /> Delete
              </Button>
            ) : (
              <div /> 
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : editId ? 'Update' : 'Save Cheque'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
