import { Outlet } from 'react-router-dom';
import { BrandMark } from '@/components/layout/BrandMark';

const JOURNAL_ROWS = [
  { account: 'Bank · HDFC Current', debit: '12,500.00', credit: '' },
  { account: 'Receivable · A. Khan', debit: '', credit: '12,500.00' },
  { account: 'Office Expenses', debit: '1,840.00', credit: '' },
  { account: 'Cash on Hand', debit: '', credit: '1,840.00' },
];

const FEATURES = [
  'Full double-entry bookkeeping',
  'Multi-currency support',
  'Real-time financial reports',
  'Team access & roles',
];

// Pure layout — all auth/redirect decisions are handled by PublicGuard.
export default function AuthLayout() {
  return (
    <div className="min-h-screen flex bg-background">

      {/* Left: the ledger panel — hidden on mobile */}
      <div className="hidden lg:flex lg:w-[46%] xl:w-1/2 relative bg-rail text-rail-foreground flex-col justify-between p-12 overflow-hidden">
        {/* Ruled paper, margin line and two soft lights */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ backgroundImage: 'repeating-linear-gradient(to bottom, transparent 0 35px, rgba(255,255,255,0.045) 35px 36px)' }}
        />
        <div aria-hidden className="absolute top-0 bottom-0 left-12 w-px bg-lime/40" />
        <div aria-hidden className="absolute -top-40 -right-40 w-[520px] h-[520px] rounded-full bg-lime/10 blur-3xl" />
        <div aria-hidden className="absolute -bottom-52 -left-20 w-[480px] h-[480px] rounded-full bg-[#0F5C53]/40 blur-3xl" />

        {/* Brand */}
        <div className="relative flex items-center gap-3 pl-6 animate-fade-in">
          <BrandMark className="w-10 h-10 rounded-xl" />
          <span className="font-display italic text-2xl text-rail-strong">Ledger Pro</span>
        </div>

        {/* Headline + mini journal */}
        <div className="relative pl-6 space-y-6 max-w-xl">
          <p className="eyebrow text-lime animate-fade-in" style={{ animationDelay: '80ms' }}>
            Double-entry · Multi-currency · Multi-tenant
          </p>
          <h2 className="font-display text-[3.4rem] xl:text-[4rem] leading-[1.02] text-rail-strong tracking-tight animate-fade-in" style={{ animationDelay: '140ms' }}>
            Every entry,<br />
            <span className="italic text-lime">balanced.</span>
          </h2>
          <p className="text-rail-foreground text-base leading-relaxed max-w-md animate-fade-in" style={{ animationDelay: '200ms' }}>
            Professional bookkeeping for growing businesses, with real-time reports and a ledger you can trust.
          </p>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-sm p-4 max-w-md shadow-lg animate-rise-in" style={{ animationDelay: '260ms' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="eyebrow text-rail-foreground/70">Journal · Today</span>
              <span className="stamp border-lime/40 text-lime bg-lime/10">Balanced</span>
            </div>
            <div className="grid grid-cols-[1fr_auto_auto] gap-4 pb-1.5 border-b border-white/10 eyebrow text-rail-foreground/50">
              <span>Account</span>
              <span className="w-20 text-right">Debit</span>
              <span className="w-20 text-right">Credit</span>
            </div>
            <div className="divide-y divide-white/10">
              {JOURNAL_ROWS.map((row, i) => (
                <div
                  key={row.account}
                  className="grid grid-cols-[1fr_auto_auto] gap-4 py-2 text-[13px] animate-fade-in"
                  style={{ animationDelay: `${420 + i * 110}ms` }}
                >
                  <span className="text-rail-strong truncate">{row.account}</span>
                  <span className="mono text-[#3DD68C] w-20 text-right">{row.debit}</span>
                  <span className="mono text-[#FF6B81] w-20 text-right">{row.credit}</span>
                </div>
              ))}
            </div>
          </div>

          <ul className="space-y-2.5 pt-1">
            {FEATURES.map((f, i) => (
              <li key={f} className="flex items-center gap-3 text-sm text-rail-foreground animate-fade-in" style={{ animationDelay: `${700 + i * 70}ms` }}>
                <span className="w-5 h-5 rounded-full bg-lime/15 border border-lime/40 text-lime flex items-center justify-center shrink-0">
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                {f}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative pl-6 eyebrow text-rail-foreground/50">
          © {new Date().getFullYear()} Ledger Pro · Built for modern businesses
        </p>
      </div>

      {/* Right: form panel */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 lg:p-12 overflow-y-auto">
        {/* Mobile brand */}
        <div className="lg:hidden flex items-center gap-2.5 mb-8">
          <BrandMark className="w-9 h-9 rounded-xl" />
          <span className="font-display italic text-2xl">Ledger Pro</span>
        </div>

        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
