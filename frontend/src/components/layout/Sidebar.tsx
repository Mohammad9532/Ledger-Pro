import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Wallet, Users, ArrowLeftRight, ShoppingBag,
  CreditCard, Receipt, TrendingUp, BarChart3, Scale, CalendarCheck, Search, Shield, Moon, Sun,
  ChevronLeft, ChevronRight, LogOut, Menu, Settings
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/accounts', icon: Wallet, label: 'Accounts' },
  { path: '/people', icon: Users, label: 'People' },
  { path: '/transactions', icon: ArrowLeftRight, label: 'Transactions' },
  { path: '/business', icon: ShoppingBag, label: 'Business' },
  { path: '/credit-cards', icon: CreditCard, label: 'Credit Cards' },
  { path: '/expenses', icon: Receipt, label: 'Expenses' },
  { path: '/income', icon: TrendingUp, label: 'Income' },
  { path: '/reports', icon: BarChart3, label: 'Reports' },
  { path: '/reconciliation', icon: Scale, label: 'Reconciliation' },
  { path: '/month-closing', icon: CalendarCheck, label: 'Month Closing' },
  { path: '/system', icon: Settings, label: 'System & Backups' },
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
    document.documentElement.classList.toggle('dark');
    setDarkMode(!darkMode);
  };

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside className={cn(
        "fixed top-0 left-0 z-50 h-full bg-card border-r border-border flex flex-col transition-all duration-300 ease-in-out",
        collapsed ? "w-[68px]" : "w-64",
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 h-16 border-b border-border shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0">
            <Wallet className="w-4 h-4 text-white" />
          </div>
          {!collapsed && (
            <span className="font-bold text-lg bg-gradient-to-r from-blue-500 to-indigo-600 bg-clip-text text-transparent truncate">
              Ledger Pro
            </span>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = item.path === '/' 
              ? location.pathname === '/' 
              : location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary/10 text-primary shadow-sm"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <item.icon className={cn("w-5 h-5 shrink-0", isActive && "text-primary")} />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Bottom actions */}
        <div className="px-2 py-3 border-t border-border space-y-1 shrink-0">
          <button onClick={toggleDark} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-accent hover:text-foreground w-full transition-colors">
            {darkMode ? <Sun className="w-5 h-5 shrink-0" /> : <Moon className="w-5 h-5 shrink-0" />}
            {!collapsed && <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>}
          </button>
          <button onClick={logout} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-destructive hover:bg-destructive/10 w-full transition-colors">
            <LogOut className="w-5 h-5 shrink-0" />
            {!collapsed && <span>Logout</span>}
          </button>
          <button onClick={() => setCollapsed(!collapsed)} className="hidden lg:flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-accent w-full transition-colors">
            {collapsed ? <ChevronRight className="w-5 h-5 shrink-0" /> : <ChevronLeft className="w-5 h-5 shrink-0" />}
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
