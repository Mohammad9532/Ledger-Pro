import { Outlet } from 'react-router-dom';
import { Wallet } from 'lucide-react';

// Pure layout — all auth/redirect decisions are handled by PublicGuard.
export default function AuthLayout() {
  return (
    <div className="min-h-screen flex bg-background">

      {/* Left decorative panel — hidden on mobile */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 flex-col justify-between p-12 overflow-hidden">
        {/* Ambient orbs */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-white/10 blur-3xl animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-white/5 blur-3xl" />
        <div className="absolute top-[40%] left-[60%] w-[30%] h-[30%] rounded-full bg-indigo-400/20 blur-2xl" />

        {/* Brand */}
        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
            <Wallet className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-bold text-xl tracking-tight">Ledger Pro</span>
        </div>

        {/* Tagline */}
        <div className="relative space-y-4">
          <h2 className="text-4xl font-bold text-white leading-tight">
            Professional accounting for growing businesses.
          </h2>
          <p className="text-blue-100/80 text-lg leading-relaxed">
            Multi-currency. Multi-tenant. Built for the way you work.
          </p>
          <div className="mt-8 space-y-3">
            {[
              'Full double-entry bookkeeping',
              'Multi-currency support',
              'Real-time financial reports',
              'Team access & roles',
            ].map(f => (
              <div key={f} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-white/80 text-sm">{f}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-blue-200/60 text-xs">
          © {new Date().getFullYear()} Ledger Pro · Built for modern businesses
        </p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 lg:p-12 overflow-y-auto">
        {/* Mobile brand */}
        <div className="lg:hidden flex items-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg">Ledger Pro</span>
        </div>

        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
