import { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { cn } from '@/lib/utils';

// Pure layout — all auth/redirect decisions are handled by ProtectedGuard.
// The only responsibility kept here is the mid-session onboarding_required
// event, which fires when the API returns 403 ONBOARDING_REQUIRED after the
// user is already inside the app (e.g. their onboarding was somehow reverted).
export default function AppLayout() {
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handler = () => navigate('/onboarding', { replace: true });
    window.addEventListener('onboarding_required', handler);
    return () => window.removeEventListener('onboarding_required', handler);
  }, [navigate]);

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      <Sidebar
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />
      <div className={cn(
        'flex-1 flex flex-col transition-all duration-300 overflow-hidden',
        sidebarCollapsed ? 'lg:ml-[68px]' : 'lg:ml-64',
      )}>
        <Header onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
