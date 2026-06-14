import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { formatCurrency } from '@/lib/utils';
import api from '@/lib/api';
import { Plus, User, Phone, FileText } from 'lucide-react';

interface Contact {
  id: number; name: string; phone: string | null; notes: string | null;
  account_id: number | null; computed_balance: string;
}

export default function PeoplePage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const fetchContacts = () => {
    api.get('/contacts').then(res => { setContacts(res.data); setLoading(false); });
  };

  useEffect(() => { fetchContacts(); }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editId) {
        await api.put(`/contacts/${editId}`, form);
      } else {
        await api.post('/contacts', form);
      }
      setShowModal(false); setForm({ name: '', phone: '', notes: '' }); setEditId(null);
      fetchContacts();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!editId) return;
    if (!confirm('Are you sure you want to delete this person? This will also delete their ledger account.')) return;
    
    setSaving(true);
    try {
      await api.delete(`/contacts/${editId}`);
      setShowModal(false);
      fetchContacts();
    } catch (err: any) {
      alert(err.response?.data?.message || err.response?.data?.error || 'Failed to delete');
    } finally {
      setSaving(false);
    }
  };

  const filtered = contacts.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">People</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage contacts and view person ledgers</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Input placeholder="Search people..." value={search} onChange={e => setSearch(e.target.value)} className="w-full sm:w-48" />
          <Button className="w-full sm:w-auto" onClick={() => { setEditId(null); setForm({ name: '', phone: '', notes: '' }); setShowModal(true); }}>
            <Plus className="w-4 h-4 mr-2" /> Add Person
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c, i) => {
            const bal = parseFloat(c.computed_balance);
            return (
              <Card key={c.id} className="card-hover animate-fade-in cursor-pointer" style={{ animationDelay: `${i * 30}ms` }}
                onClick={() => navigate(`/people/${c.id}`)}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold">{c.name}</p>
                        {c.phone && <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" />{c.phone}</p>}
                      </div>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); setForm({ name: c.name, phone: c.phone || '', notes: c.notes || '' }); setEditId(c.id); setShowModal(true); }}
                      className="p-1.5 rounded-md hover:bg-accent text-muted-foreground">
                      <FileText className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="mt-4 pt-3 border-t border-border">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{bal > 0 ? 'They owe you' : bal < 0 ? 'You owe them' : 'Settled'}</span>
                      <span className={`text-lg font-bold ${bal > 0 ? 'text-emerald-500' : bal < 0 ? 'text-rose-500' : 'text-muted-foreground'}`}>
                        {formatCurrency(Math.abs(bal))}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {filtered.length === 0 && <p className="text-muted-foreground col-span-full text-center py-8">No contacts found</p>}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? 'Edit Person' : 'Add Person'}</DialogTitle>
            <DialogDescription>
              {editId ? 'Update contact details' : 'A ledger account will be auto-created for this person'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Person name" /></div>
            <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="Phone number" /></div>
            <div className="space-y-2"><Label>Notes</Label><Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes" /></div>
          </div>
          <DialogFooter className="flex flex-col-reverse sm:flex-row justify-between items-center sm:justify-between w-full gap-4 sm:gap-0 mt-4">
            {editId ? (
              <Button type="button" variant="destructive" onClick={handleDelete} disabled={saving}>
                Delete
              </Button>
            ) : (
              <div /> // Spacer for flex layout
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
