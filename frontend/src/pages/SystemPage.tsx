import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import api from '@/lib/api';
import { format } from 'date-fns';
import { Download, RefreshCcw, Database, ShieldAlert, CheckCircle, Server, HardDrive, FileTerminal } from 'lucide-react';

export default function SystemPage() {
  const [health, setHealth] = useState<any>(null);
  const [backups, setBackups] = useState<any[]>([]);
  const [readiness, setReadiness] = useState<any>(null);
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState(false);
  const [showRestore, setShowRestore] = useState(false);
  const [restoreFile, setRestoreFile] = useState<string | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [hRes, bRes, rRes, sRes] = await Promise.all([
        api.get('/system/health'),
        api.get('/system/backups'),
        api.get('/system/readiness'),
        api.get('/system/status')
      ]);
      setHealth(hRes.data);
      setBackups(bRes.data);
      setReadiness(rRes.data);
      setStatus(sRes.data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const handleCreateBackup = async () => {
    setActioning(true);
    try {
      await api.post('/system/backups');
      fetchAll();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create backup');
    } finally {
      setActioning(false);
    }
  };

  const handleDownload = (filename: string) => {
    window.open(`${import.meta.env.VITE_API_URL}/system/backups/${filename}/download`, '_blank');
  };

  const confirmRestore = (filename: string) => {
    setRestoreFile(filename);
    setShowRestore(true);
  };

  const handleRestore = async () => {
    if (!restoreFile) return;
    setActioning(true);
    try {
      await api.post(`/system/backups/${restoreFile}/restore`);
      alert('Database restored successfully! The page will now reload.');
      window.location.reload();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to restore backup');
    } finally {
      setActioning(false);
      setShowRestore(false);
    }
  };

  const formatBytes = (bytes: number, decimals = 2) => {
    if (!+bytes) return '0 Bytes';
    const k = 1024, dm = decimals < 0 ? 0 : decimals, sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">System & Backups</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage database integrity, backups, and deployments</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-6 animate-fade-in">

          {/* System Health Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Server className="w-5 h-5 text-indigo-500" /> System Health
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="p-4 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-2">Application</p>
                  <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${status?.application_status === 'OK' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
                    {status?.application_status === 'OK' ? <CheckCircle className="w-3 h-3 mr-1" /> : <ShieldAlert className="w-3 h-3 mr-1" />}
                    {status?.application_status || 'Unknown'}
                  </div>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-2">Database</p>
                  <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${status?.database_status === 'OK' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
                    {status?.database_status === 'OK' ? <CheckCircle className="w-3 h-3 mr-1" /> : <ShieldAlert className="w-3 h-3 mr-1" />}
                    {status?.database_status || 'Unknown'}
                  </div>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Git Commit</p>
                  <p className="font-mono text-sm">{status?.current_git_commit || 'N/A'}</p>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Server Time</p>
                  <p className="font-semibold text-sm">{status?.server_time ? format(new Date(status.server_time), 'PPp') : 'N/A'}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-semibold mb-3">Storage Usage</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{status?.total_storage_gb && status?.free_storage_gb ? (status.total_storage_gb - status.free_storage_gb).toFixed(2) : 0} GB Used</span>
                      <span className="text-muted-foreground">{status?.free_storage_gb || 0} GB Free of {status?.total_storage_gb || 0} GB</span>
                    </div>
                    <div className="h-3 w-full bg-secondary rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${status?.disk_usage_percentage > 90 ? 'bg-red-500' : status?.disk_usage_percentage > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                        style={{ width: `${Math.min(100, Math.max(0, status?.disk_usage_percentage || 0))}%` }}
                      />
                    </div>
                    <p className="text-xs text-right text-muted-foreground">{status?.disk_usage_percentage || 0}% Capacity</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-semibold mb-2">System Info & Backups</h4>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div className="text-muted-foreground">PHP Version</div>
                    <div className="text-right font-mono">{status?.php_version || 'N/A'}</div>
                    
                    <div className="text-muted-foreground">Laravel Version</div>
                    <div className="text-right font-mono">{status?.laravel_version || 'N/A'}</div>
                    
                    <div className="text-muted-foreground">Last Local Backup</div>
                    <div className="text-right">{status?.last_backup_local ? format(new Date(status.last_backup_local), 'PPp') : 'None'}</div>
                    
                    <div className="text-muted-foreground">Last Cloud Backup</div>
                    <div className="text-right">{status?.last_backup_google_drive ? format(new Date(status.last_backup_google_drive), 'PPp') : 'None'}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Health & Deployment Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2"><Database className="w-5 h-5 text-blue-500" /> Database Health</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Server className="w-3 h-3" /> Engine</p>
                    <p className="font-semibold">{health?.engine}</p>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><HardDrive className="w-3 h-3" /> Size</p>
                    <p className="font-semibold">{health?.size_mb} MB</p>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><FileTerminal className="w-3 h-3" /> Tables</p>
                    <p className="font-semibold">{health?.table_count}</p>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><ShieldAlert className="w-3 h-3" /> Environment</p>
                    <p className="font-semibold capitalize">{health?.environment}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Server className="w-5 h-5 text-indigo-500" /> Deployment Readiness
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`p-4 rounded-lg mb-4 flex items-start gap-3 ${readiness?.status === 'Ready' ? 'bg-emerald-500/10 text-emerald-700' : 'bg-amber-500/10 text-amber-700'}`}>
                  {readiness?.status === 'Ready' ? <CheckCircle className="w-5 h-5 mt-0.5" /> : <ShieldAlert className="w-5 h-5 mt-0.5" />}
                  <div>
                    <p className="font-bold">{readiness?.status === 'Ready' ? 'PostgreSQL Compatible' : 'PostgreSQL Incompatibilities Detected'}</p>
                    <p className="text-sm mt-1">
                      {readiness?.status === 'Ready' 
                        ? 'No MySQL-specific schema issues found. Safe for PGSQL migration.'
                        : 'The codebase contains raw MySQL statements or ENUMs that will break during PostgreSQL deployment.'}
                    </p>
                  </div>
                </div>
                {readiness?.issues?.length > 0 && (
                  <ul className="text-xs text-amber-700 space-y-2 list-disc pl-5">
                    {readiness.issues.map((issue: string, i: number) => <li key={i}>{issue}</li>)}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Backups List */}
          <Card>
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <CardTitle className="text-lg">Database Backups</CardTitle>
              <Button onClick={handleCreateBackup} disabled={actioning} className="w-full sm:w-auto">
                {actioning ? 'Processing...' : 'Create Backup'}
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-4 font-medium">Filename</th>
                    <th className="text-left p-4 font-medium">Size</th>
                    <th className="text-left p-4 font-medium">Created At</th>
                    <th className="text-right p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {backups.length === 0 ? (
                    <tr><td colSpan={4} className="text-center p-8 text-muted-foreground">No backups found</td></tr>
                  ) : backups.map((b) => (
                    <tr key={b.filename} className="border-b hover:bg-accent/50 transition-colors">
                      <td className="p-4 font-mono text-xs">{b.filename}</td>
                      <td className="p-4">{formatBytes(b.size_bytes)}</td>
                      <td className="p-4">{format(new Date(b.created_at), 'PPpp')}</td>
                      <td className="p-4 text-right flex items-center justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleDownload(b.filename)}>
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => confirmRestore(b.filename)}>
                          <RefreshCcw className="w-4 h-4 mr-2" /> Restore
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Restore Warning Dialog */}
      <Dialog open={showRestore} onOpenChange={setShowRestore}>
        <DialogContent className="sm:max-w-md border-rose-500/50">
          <DialogHeader>
            <DialogTitle className="text-rose-500 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5" /> Critical Warning
            </DialogTitle>
            <DialogDescription className="pt-2 text-foreground">
              You are about to restore the database from <strong>{restoreFile}</strong>.
              <br/><br/>
              This will <strong>OVERWRITE</strong> the current database entirely. Any data created after this backup will be permanently lost. This action is irreversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowRestore(false)} disabled={actioning}>Cancel</Button>
            <Button variant="destructive" onClick={handleRestore} disabled={actioning}>
              {actioning ? 'Restoring...' : 'Yes, Overwrite Database'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
