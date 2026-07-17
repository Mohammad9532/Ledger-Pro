import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { COUNTRIES, CURRENCIES } from '@/lib/countries';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Building2, ImageIcon, MapPin, Calculator, Receipt,
  CheckCircle2, ChevronRight, ChevronLeft, Loader2,
  Upload, X, Wallet, Search, Pencil,
} from 'lucide-react';

// ─── Step definitions ──────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: 'Company',   icon: Building2,   heading: 'What\'s your company name?',      sub: 'This will appear on your reports and invoices.' },
  { id: 2, label: 'Logo',      icon: ImageIcon,   heading: 'Add your company logo',           sub: 'Optional — you can change this at any time from settings.' },
  { id: 3, label: 'Location',  icon: MapPin,      heading: 'Where is your business based?',   sub: 'We\'ll automatically set your currency and timezone.' },
  { id: 4, label: 'Financial', icon: Calculator,  heading: 'Set your financial year',         sub: 'This determines the period for your annual reports.' },
  { id: 5, label: 'Tax',       icon: Receipt,     heading: 'Configure tax settings',          sub: 'You can always update tax rates later in your settings.' },
  { id: 6, label: 'Review',    icon: CheckCircle2, heading: 'You\'re all set!',              sub: 'Review your configuration below and click Finish to start using Ledger Pro.' },
];

// ─── Financial year presets ────────────────────────────────────────────────
const FY_PRESETS = [
  { label: 'Jan – Dec', start: '01-01', end: '12-31' },
  { label: 'Apr – Mar', start: '04-01', end: '03-31' },
  { label: 'Jul – Jun', start: '07-01', end: '06-30' },
  { label: 'Oct – Sep', start: '10-01', end: '09-30' },
];

// ─── Searchable country combobox ───────────────────────────────────────────
function CountryCombobox({
  value, onChange,
}: { value: string; onChange: (code: string) => void }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = COUNTRIES.find(c => c.code === value);
  const filtered = COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(query.toLowerCase()) ||
    c.code.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => { setOpen(o => !o); setQuery(''); }}
        className="w-full flex items-center justify-between px-3 py-2 rounded-md border border-border bg-background text-sm hover:border-primary/50 transition-colors"
      >
        <span className={selected ? 'text-foreground' : 'text-muted-foreground'}>
          {selected ? selected.name : 'Select a country...'}
        </span>
        <Search className="w-4 h-4 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-lg">
          <div className="p-2 border-b border-border">
            <Input
              autoFocus
              placeholder="Search countries..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <div className="max-h-48 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-sm text-muted-foreground">No results.</p>
            ) : filtered.map(c => (
              <button
                key={c.code}
                type="button"
                onClick={() => { onChange(c.code); setOpen(false); }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors flex items-center gap-2 ${value === c.code ? 'bg-primary/10 text-primary font-medium' : ''}`}
              >
                <span className="w-6 text-xs text-muted-foreground">{c.code}</span>
                {c.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Review row ────────────────────────────────────────────────────────────
function ReviewRow({ label, value, onEdit }: { label: string; value: string; onEdit?: () => void }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-right">{value || '—'}</span>
        {onEdit && (
          <button type="button" onClick={onEdit} className="text-muted-foreground hover:text-primary transition-colors">
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────
export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    company_name: '',
    logo: null as File | null,
    country_code: '',
    timezone: '',
    currency_code: '',
    financial_year_start: '01-01',
    financial_year_end: '12-31',
    tax_enabled: false,
    tax_rate: 0,
  });

  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pre-fill company name from authenticated user
  useEffect(() => {
    if (user?.company?.company_name && !formData.company_name) {
      setFormData(p => ({ ...p, company_name: user.company!.company_name }));
    }
  }, [user]);

  const set = <K extends keyof typeof formData>(key: K, value: typeof formData[K]) => {
    setError(null);
    setFormData(p => ({ ...p, [key]: value }));
  };

  const handleCountryChange = (code: string) => {
    const country = COUNTRIES.find(c => c.code === code);
    if (country) {
      setError(null);
      setFormData(p => ({
        ...p,
        country_code: country.code,
        currency_code: country.currencyCode,
        timezone: country.defaultTimezone,
      }));
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFormData(p => ({ ...p, logo: file }));
    const reader = new FileReader();
    reader.onloadend = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    setFormData(p => ({ ...p, logo: null }));
    setLogoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const validateStep = (): boolean => {
    setError(null);
    if (currentStep === 1 && !formData.company_name.trim()) {
      setError('Please enter your company name to continue.');
      return false;
    }
    if (currentStep === 3) {
      if (!formData.country_code) { setError('Please select a country.'); return false; }
      if (!formData.currency_code) { setError('Please select a currency.'); return false; }
      if (!formData.timezone.trim()) { setError('Please enter a timezone.'); return false; }
    }
    return true;
  };

  const next = () => { if (validateStep()) setCurrentStep(s => Math.min(s + 1, STEPS.length)); };
  const prev = () => { setError(null); setCurrentStep(s => Math.max(s - 1, 1)); };
  const jumpTo = (step: number) => { setError(null); setCurrentStep(step); };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const payload = new FormData();
      payload.append('company_name', formData.company_name);
      payload.append('country_code', formData.country_code);
      payload.append('currency_code', formData.currency_code);
      payload.append('timezone', formData.timezone);
      payload.append('financial_year_start', formData.financial_year_start);
      payload.append('financial_year_end', formData.financial_year_end);
      payload.append('tax_enabled', formData.tax_enabled ? '1' : '0');
      payload.append('tax_rate', String(formData.tax_rate));
      if (formData.logo) payload.append('logo', formData.logo);

      await api.post('/company/profile', payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
        params: { _method: 'PUT' },
      });
      await refreshUser();
      navigate('/', { replace: true });
    } catch (err: any) {
      const status = err.response?.status;
      if (!err.response || status === 0) {
        setError('Unable to connect to the server. Please check your connection.');
      } else if (status >= 500) {
        setError('A server error occurred. Please try again in a moment.');
      } else {
        setError(err.response?.data?.message || 'Failed to save company profile. Please try again.');
      }
      setIsSubmitting(false);
    }
  };

  const step = STEPS[currentStep - 1];
  const progressPct = (currentStep - 1) / (STEPS.length - 1) * 100;

  const renderContent = () => {
    switch (currentStep) {

      // ── Step 1: Company Name ──────────────────────────────────────────
      case 1:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company_name">Legal company name</Label>
              <Input
                id="company_name"
                value={formData.company_name}
                onChange={e => set('company_name', e.target.value)}
                placeholder="e.g. Acme Corporation"
                autoFocus
                onKeyDown={e => e.key === 'Enter' && next()}
              />
            </div>
          </div>
        );

      // ── Step 2: Logo ──────────────────────────────────────────────────
      case 2:
        return (
          <div className="flex flex-col items-center gap-5">
            <div
              className="relative group w-36 h-36 rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center overflow-hidden bg-muted/20 cursor-pointer hover:border-primary/50 hover:bg-muted/40 transition-all"
              onClick={() => !logoPreview && fileInputRef.current?.click()}
            >
              {logoPreview ? (
                <>
                  <img src={logoPreview} alt="Logo preview" className="w-full h-full object-contain p-2" />
                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center">
                    <span className="text-white text-xs font-medium">Change</span>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Upload className="w-8 h-8" />
                  <span className="text-xs text-center px-2">Click to upload<br />PNG, JPG, SVG</span>
                </div>
              )}
            </div>

            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleLogoChange} />

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                {logoPreview ? 'Replace logo' : 'Upload logo'}
              </Button>
              {logoPreview && (
                <Button variant="ghost" size="sm" onClick={removeLogo} className="text-destructive hover:text-destructive">
                  <X className="w-4 h-4 mr-1" /> Remove
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">This step is optional. You can skip it and add a logo later.</p>
          </div>
        );

      // ── Step 3: Location ──────────────────────────────────────────────
      case 3:
        return (
          <div className="space-y-5">
            <div className="space-y-2">
              <Label>Country of operation</Label>
              <CountryCombobox value={formData.country_code} onChange={handleCountryChange} />
              <p className="text-xs text-muted-foreground">Selecting a country automatically sets your currency and timezone.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Reporting currency</Label>
                <select
                  value={formData.currency_code}
                  onChange={e => set('currency_code', e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">Select currency...</option>
                  {CURRENCIES.map(c => (
                    <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Input
                  id="timezone"
                  value={formData.timezone}
                  onChange={e => set('timezone', e.target.value)}
                  placeholder="e.g. Asia/Dubai"
                />
              </div>
            </div>

            {formData.country_code && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-primary/5 border border-primary/10 text-sm text-primary">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>Auto-configured: <strong>{formData.currency_code}</strong> · <strong>{formData.timezone}</strong></span>
              </div>
            )}
          </div>
        );

      // ── Step 4: Financial Year ─────────────────────────────────────────
      case 4:
        return (
          <div className="space-y-5">
            <div className="space-y-2">
              <Label>Common presets</Label>
              <div className="grid grid-cols-2 gap-2">
                {FY_PRESETS.map(p => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, financial_year_start: p.start, financial_year_end: p.end }))}
                    className={[
                      'px-3 py-2 rounded-lg border text-sm text-left transition-all',
                      formData.financial_year_start === p.start
                        ? 'border-primary bg-primary/10 text-primary font-medium'
                        : 'border-border hover:border-primary/40 hover:bg-muted/40',
                    ].join(' ')}
                  >
                    <div className="font-medium">{p.label}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{p.start} → {p.end}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fy_start">Custom start (MM-DD)</Label>
                <Input
                  id="fy_start"
                  value={formData.financial_year_start}
                  onChange={e => set('financial_year_start', e.target.value)}
                  placeholder="01-01"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fy_end">Custom end (MM-DD)</Label>
                <Input
                  id="fy_end"
                  value={formData.financial_year_end}
                  onChange={e => set('financial_year_end', e.target.value)}
                  placeholder="12-31"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">This defines the boundaries for your annual reports and closing cycles.</p>
          </div>
        );

      // ── Step 5: Tax ────────────────────────────────────────────────────
      case 5:
        return (
          <div className="space-y-5">
            <div className="flex items-center justify-between rounded-xl border border-border p-4 bg-muted/10">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">Enable tax tracking</p>
                <p className="text-xs text-muted-foreground">Apply tax calculations to invoices and bills.</p>
              </div>
              <Switch
                checked={formData.tax_enabled}
                onCheckedChange={(v: boolean) => set('tax_enabled', v)}
              />
            </div>

            {formData.tax_enabled && (
              <div className="space-y-2 animate-fade-in">
                <Label htmlFor="tax_rate">Default tax rate (%)</Label>
                <div className="relative">
                  <Input
                    id="tax_rate"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={formData.tax_rate}
                    onChange={e => set('tax_rate', parseFloat(e.target.value) || 0)}
                    className="pr-8"
                    autoFocus
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                </div>
                <p className="text-xs text-muted-foreground">Common rates: VAT 5% (UAE), GST 18% (India), VAT 20% (UK)</p>
              </div>
            )}
          </div>
        );

      // ── Step 6: Review ─────────────────────────────────────────────────
      case 6: {
        const countryName = COUNTRIES.find(c => c.code === formData.country_code)?.name ?? 'Not set';
        return (
          <div className="space-y-5">
            {/* Logo preview in review */}
            {logoPreview && (
              <div className="flex items-center gap-4 p-4 rounded-xl border border-border bg-muted/10">
                <img src={logoPreview} alt="Company logo" className="w-14 h-14 rounded-xl object-contain bg-white p-1 border border-border" />
                <div>
                  <p className="font-medium text-sm">{formData.company_name}</p>
                  <p className="text-xs text-muted-foreground">Company logo uploaded</p>
                </div>
              </div>
            )}

            <div className="rounded-xl border border-border bg-muted/5 divide-y divide-border/50 overflow-hidden">
              <div className="px-4 py-2 bg-muted/20">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Company</p>
              </div>
              <div className="px-4 py-1">
                <ReviewRow label="Company Name" value={formData.company_name} onEdit={() => jumpTo(1)} />
                <ReviewRow label="Logo" value={formData.logo ? formData.logo.name : 'None'} onEdit={() => jumpTo(2)} />
              </div>
              <div className="px-4 py-2 bg-muted/20">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Location & Currency</p>
              </div>
              <div className="px-4 py-1">
                <ReviewRow label="Country" value={countryName} onEdit={() => jumpTo(3)} />
                <ReviewRow label="Currency" value={formData.currency_code} onEdit={() => jumpTo(3)} />
                <ReviewRow label="Timezone" value={formData.timezone} onEdit={() => jumpTo(3)} />
              </div>
              <div className="px-4 py-2 bg-muted/20">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Accounting</p>
              </div>
              <div className="px-4 py-1">
                <ReviewRow label="Financial Year" value={`${formData.financial_year_start} → ${formData.financial_year_end}`} onEdit={() => jumpTo(4)} />
                <ReviewRow label="Taxes" value={formData.tax_enabled ? `Enabled at ${formData.tax_rate}%` : 'Disabled'} onEdit={() => jumpTo(5)} />
              </div>
            </div>
          </div>
        );
      }
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute -top-1/3 -left-1/4 w-3/4 h-3/4 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute top-2/3 -right-1/4 w-2/3 h-2/3 rounded-full bg-blue-500/5 blur-3xl" />
      </div>

      <div className="w-full max-w-xl space-y-6">

        {/* Brand + welcome header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
              <Wallet className="w-6 h-6 text-white" />
            </div>
          </div>
          {currentStep === 1 ? (
            <>
              <h1 className="text-3xl font-bold tracking-tight">Welcome to Ledger Pro</h1>
              <p className="text-muted-foreground">Let's configure your company in just a few steps.</p>
            </>
          ) : currentStep === STEPS.length ? (
            <>
              <h1 className="text-3xl font-bold tracking-tight">You're all set!</h1>
              <p className="text-muted-foreground">Review your configuration below and click <strong>Finish</strong> to start using Ledger Pro.</p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold tracking-tight">{step.heading}</h1>
              <p className="text-muted-foreground text-sm">{step.sub}</p>
            </>
          )}
        </div>

        {/* Progress stepper */}
        <div className="flex items-start gap-0 relative">
          {/* Progress line */}
          <div className="absolute top-4 left-4 right-4 h-0.5 bg-border -z-10" />
          <div
            className="absolute top-4 left-4 h-0.5 bg-primary transition-all duration-500 -z-10"
            style={{ width: `calc(${progressPct}% * (100% - 2rem) / 100)` }}
          />
          {STEPS.map(s => {
            const Icon = s.icon;
            const isActive = s.id === currentStep;
            const isDone = s.id < currentStep;
            return (
              <div key={s.id} className="flex-1 flex flex-col items-center gap-1.5">
                <div
                  className={[
                    'w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300',
                    isActive ? 'bg-primary border-primary text-white scale-110 shadow-md shadow-primary/30' :
                    isDone ? 'bg-primary border-primary text-white' :
                    'bg-background border-border text-muted-foreground',
                  ].join(' ')}
                >
                  {isDone ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-3.5 h-3.5" />}
                </div>
                <span className={`text-[10px] hidden sm:block font-medium text-center leading-tight transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-card shadow-xl">
          {/* Card body */}
          <div className="p-6 min-h-[260px]">
            {error && (
              <div className="mb-5 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm animate-fade-in">
                {error}
              </div>
            )}
            <div className="animate-fade-in" key={currentStep}>
              {renderContent()}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-border bg-muted/5 rounded-b-2xl flex items-center justify-between gap-3">
            <Button
              variant="outline"
              onClick={prev}
              disabled={currentStep === 1 || isSubmitting}
              className="gap-1.5"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </Button>

            <span className="text-xs text-muted-foreground">
              Step {currentStep} of {STEPS.length}
            </span>

            {currentStep < STEPS.length ? (
              <Button onClick={next} className="gap-1.5">
                Continue
                <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="gap-1.5 min-w-[130px] bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 border-0"
              >
                {isSubmitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />Saving...</>
                ) : (
                  <><CheckCircle2 className="w-4 h-4" />Start using Ledger Pro</>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
