import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import api from '@/lib/api';
import {
  Lock, Unlock, CalendarCheck, ShieldCheck, AlertTriangle, Calendar
} from 'lucide-react';

interface MonthData {
  year: number;
  month: number;
  month_name: string;
  label: string;
  status: 'open' | 'closed';
  closed_at: string | null;
  closed_by: string | null;
  notes: string | null;
  is_current: boolean;
}

export default function MonthClosingPage() {
  const [months, setMonths] = useState<MonthData[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmModal, setConfirmModal] = useState<{ action: 'close' | 'reopen'; month: MonthData } | null>(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchData = () => {
    setLoading(true);
    api.get('/month-closings').then(res => {
      setMonths(res.data);
      setLoading(false);
    });
  };

  useEffect(() => { fetchData(); }, []);

  const handleClose = async () => {
    if (!confirmModal) return;
    setSaving(true);
    try {
      await api.post('/month-closings/close', {
        year: confirmModal.month.year,
        month: confirmModal.month.month,
        notes: notes || null,
      });
      setConfirmModal(null);
      setNotes('');
      fetchData();
    } catch (err: any) { alert(err.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleReopen = async () => {
    if (!confirmModal) return;
    setSaving(true);
    try {
      await api.post('/month-closings/reopen', {
        year: confirmModal.month.year,
        month: confirmModal.month.month,
      });
      setConfirmModal(null);
      fetchData();
    } catch (err: any) { alert(err.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  };

  const closedCount = months.filter(m => m.status === 'closed').length;
  const openCount = months.filter(m => m.status === 'open').length;

  if (loading) return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CalendarCheck className="w-6 h-6 text-primary" /> Month Closing
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Lock months to prevent edits, deletes, or backdated transactions
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card className="animate-fade-in">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Unlock className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-500">{openCount}</p>
              <p className="text-xs text-muted-foreground">Open Months</p>
            </div>
          </CardContent>
        </Card>
        <Card className="animate-fade-in" style={{ animationDelay: '60ms' }}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center">
              <Lock className="w-5 h-5 text-rose-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-rose-500">{closedCount}</p>
              <p className="text-xs text-muted-foreground">Closed Months</p>
            </div>
          </CardContent>
        </Card>
        <Card className="animate-fade-in" style={{ animationDelay: '120ms' }}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-500">{months.length}</p>
              <p className="text-xs text-muted-foreground">Total Periods</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Month Grid */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Monthly Periods</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">Period</th>
                  <th className="text-center p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Closed By</th>
                  <th className="text-left p-3 font-medium">Notes</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {months.map((m, i) => (
                  <tr key={`${m.year}-${m.month}`} className={`border-b transition-colors ${m.is_current ? 'bg-primary/5' : 'hover:bg-accent/50'}`}>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{m.label}</span>
                        {m.is_current && (
                          <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">CURRENT</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        m.status === 'closed'
                          ? 'bg-rose-500/10 text-rose-500'
                          : 'bg-emerald-500/10 text-emerald-500'
                      }`}>
                        {m.status === 'closed' ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                        {m.status === 'closed' ? 'Closed' : 'Open'}
                      </span>
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {m.closed_by || '—'}
                    </td>
                    <td className="p-3 text-muted-foreground text-xs max-w-xs truncate">
                      {m.notes || '—'}
                    </td>
                    <td className="p-3">
                      {m.is_current ? (
                        <span className="text-xs text-muted-foreground">Current month</span>
                      ) : m.status === 'open' ? (
                        <Button size="sm" variant="destructive"
                          onClick={() => { setConfirmModal({ action: 'close', month: m }); setNotes(''); }}>
                          <Lock className="w-3 h-3 mr-1" /> Close
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline"
                          onClick={() => setConfirmModal({ action: 'reopen', month: m })}>
                          <Unlock className="w-3 h-3 mr-1" /> Reopen
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Modal */}
      <Dialog open={!!confirmModal} onOpenChange={() => setConfirmModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {confirmModal?.action === 'close' ? (
                <><Lock className="w-5 h-5 text-rose-500" /> Close Month</>
              ) : (
                <><Unlock className="w-5 h-5 text-emerald-500" /> Reopen Month</>
              )}
            </DialogTitle>
            <DialogDescription>{confirmModal?.month.label}</DialogDescription>
          </DialogHeader>

          {confirmModal?.action === 'close' ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-rose-500/5 border-2 border-rose-500/20">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-rose-500 mt-0.5 shrink-0" />
                  <div className="text-sm">
                    <p className="font-semibold text-rose-500 mb-1">This will prevent:</p>
                    <ul className="text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Creating transactions dated in {confirmModal.month.label}</li>
                      <li>Editing transactions in {confirmModal.month.label}</li>
                      <li>Deleting transactions from {confirmModal.month.label}</li>
                    </ul>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Notes (optional)</label>
                <Input value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="e.g., Monthly review completed" />
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-amber-500/5 border-2 border-amber-500/20">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p className="font-semibold text-amber-500 mb-1">Are you sure?</p>
                  <p className="text-muted-foreground">
                    Reopening <strong>{confirmModal?.month.label}</strong> will allow edits, deletes, and new transactions in this period.
                  </p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmModal(null)}>Cancel</Button>
            {confirmModal?.action === 'close' ? (
              <Button variant="destructive" onClick={handleClose} disabled={saving}>
                {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Lock className="w-4 h-4 mr-1" /> Close Month</>}
              </Button>
            ) : (
              <Button onClick={handleReopen} disabled={saving}>
                {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Unlock className="w-4 h-4 mr-1" /> Reopen Month</>}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
