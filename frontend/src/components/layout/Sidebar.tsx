import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Wallet, Users, ArrowLeftRight, ShoppingBag,
  CreditCard, Receipt, TrendingUp, BarChart3, Scale, CalendarCheck, Moon, Sun,
  ChevronLeft, ChevronRight, LogOut, Clock, X,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { BrandMark } from './BrandMark';

type NavItem = { path: string; icon: React.ElementType; label: string };

const sections: { label: string; items: NavItem[] }[] = [
  {
    label: 'Overview',
    items: [{ path: '/', icon: LayoutDashboard, label: 'Dashboard' }],
  },
  {
    label: 'Ledger',
    items: [
      { path: '/accounts', icon: Wallet, label: 'Accounts' },
      { path: '/people', icon: Users, label: 'People' },
      { path: '/transactions', icon: ArrowLeftRight, label: 'Transactions' },
      { path: '/business', icon: ShoppingBag, label: 'Business' },
      { path: '/credit-cards', icon: CreditCard, label: 'Credit Cards' },
    ],
  },
  {
    label: 'Flows',
    items: [
      { path: '/expenses', icon: Receipt, label: 'Expenses' },
      { path: '/income', icon: TrendingUp, label: 'Income' },
    ],
  },
  {
    label: 'Close',
    items: [
      { path: '/reports', icon: BarChart3, label: 'Reports' },
      { path: '/reconciliation', icon: Scale, label: 'Reconciliation' },
      { path: '/cheques', icon: Clock, label: 'Cheque Reminders' },
      { path: '/month-closing', icon: CalendarCheck, label: 'Month Closing' },
    ],
  },
  // '/system' is platform-admin only; not linked from tenant navigation. Route still exists in App.tsx.
];

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (v: boolean) => void;
}

export default function Sidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen }: SidebarProps) {
  const location = useLocation();
  const { logout, user } = useAuth();
  const [darkMode, setDarkMode] = useState(() => document.documentElement.classList.contains('dark'));

  const toggleDark = () => {
    const next = !darkMode;
    document.documentElement.classList.toggle('dark', next);
    try { localStorage.setItem('theme', next ? 'dark' : 'light'); } catch { /* storage unavailable */ }
    setDarkMode(next);
  };

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  const initials = (user?.name ?? 'LP')
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-[#06100E]/60 backdrop-blur-[2px] lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full bg-rail text-rail-foreground border-r border-rail-border flex flex-col',
          'transition-[width,transform] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]',
          collapsed ? 'w-[68px]' : 'w-64',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        {/* Brand */}
        <div className={cn('flex items-center h-16 shrink-0 border-b border-rail-border', collapsed ? 'justify-center' : 'gap-3 px-4')}>
          <BrandMark className="w-8 h-8" />
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <span className="block font-display italic text-[1.35rem] leading-none text-rail-strong truncate">Ledger Pro</span>
              <span className="block eyebrow text-rail-foreground/60 mt-1.5 truncate">
                {user?.company?.company_name ?? 'Double-entry ledger'}
              </span>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={() => setMobileOpen(false)}
              className="lg:hidden p-1.5 rounded-md text-rail-foreground hover:bg-[var(--rail-hover)] hover:text-rail-strong transition-colors"
              aria-label="Close menu"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto rail-scroll py-3 px-2.5 space-y-4">
          {sections.map((section) => (
            <div key={section.label}>
              {collapsed ? (
                <div className="mx-2 mb-2 h-px bg-rail-border" />
              ) : (
                <p className="eyebrow text-rail-foreground/50 px-3 mb-1.5">{section.label}</p>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const active = isActive(item.path);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileOpen(false)}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        'group relative flex items-center gap-3 rounded-lg text-[13.5px] font-medium transition-colors duration-150',
                        collapsed ? 'justify-center h-10 w-10 mx-auto' : 'px-3 py-2',
                        active
                          ? 'bg-[var(--rail-active)] text-rail-strong'
                          : 'text-rail-foreground hover:bg-[var(--rail-hover)] hover:text-rail-strong',
                      )}
                    >
                      <span
                        className={cn(
                          'absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full bg-lime transition-all duration-200',
                          active ? 'h-5 opacity-100' : 'h-0 opacity-0',
                        )}
                      />
                      <item.icon
                        className={cn('w-[18px] h-[18px] shrink-0', active ? 'text-lime' : 'text-rail-foreground group-hover:text-rail-strong')}
                        strokeWidth={active ? 2.2 : 1.8}
                      />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="shrink-0 border-t border-rail-border p-2.5 space-y-1">
          <div className={cn('flex', collapsed ? 'flex-col items-center gap-1' : 'items-center gap-1')}>
            <button
              onClick={toggleDark}
              title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              className={cn(
                'flex items-center gap-3 rounded-lg text-[13px] text-rail-foreground hover:bg-[var(--rail-hover)] hover:text-rail-strong transition-colors',
                collapsed ? 'justify-center h-10 w-10' : 'flex-1 px-3 py-2',
              )}
            >
              {darkMode ? <Sun className="w-[18px] h-[18px]" strokeWidth={1.8} /> : <Moon className="w-[18px] h-[18px]" strokeWidth={1.8} />}
              {!collapsed && <span>{darkMode ? 'Light mode' : 'Dark mode'}</span>}
            </button>
            <button
              onClick={() => setCollapsed(!collapsed)}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="hidden lg:flex items-center justify-center rounded-lg h-10 w-10 text-rail-foreground hover:bg-[var(--rail-hover)] hover:text-rail-strong transition-colors"
            >
              {collapsed ? <ChevronRight className="w-[18px] h-[18px]" /> : <ChevronLeft className="w-[18px] h-[18px]" />}
            </button>
          </div>

          <div className={cn('flex items-center rounded-lg', collapsed ? 'justify-center py-1' : 'gap-3 px-2 py-2')}>
            <div
              className="w-8 h-8 rounded-full bg-lime text-lime-foreground font-display text-[15px] flex items-center justify-center shrink-0"
              title={user?.name}
            >
              {initials}
            </div>
            {!collapsed && (
              <>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-rail-strong truncate">{user?.name}</p>
                  <p className="text-[11px] text-rail-foreground/70 truncate">{user?.email}</p>
                </div>
                <button
                  onClick={logout}
                  title="Log out"
                  className="p-1.5 rounded-md text-rail-foreground hover:text-negative hover:bg-[var(--rail-hover)] transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
