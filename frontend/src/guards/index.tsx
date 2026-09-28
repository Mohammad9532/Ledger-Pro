import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { BrandMark } from '@/components/layout/BrandMark';

// ─── Shared loading screen ─────────────────────────────────────────────────
// Shown while AuthContext resolves the token against GET /api/user.
// Prevents any page from rendering before auth state is known (eliminates flicker).
export function LoadingScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-5">
      <div className="flex items-center gap-3 animate-fade-in">
        <BrandMark className="w-11 h-11 rounded-xl animate-pulse-glow" />
        <span className="font-display italic text-3xl">Ledger Pro</span>
      </div>
      <div className="w-6 h-6 border-2 border-primary/25 border-t-primary rounded-full animate-spin" />
    </div>
  );
}

// ─── PublicGuard ──────────────────────────────────────────────────────────
// Wraps: /login, /register, /verify-email
//
// Rules:
//   isLoading              → show LoadingScreen (no flicker)
//   authenticated + onboarded  → /  (already in the app)
//   authenticated + not onboarded → /onboarding (must finish wizard first)
//   not authenticated      → render the auth page normally
export function PublicGuard() {
  const { isLoading, isAuthenticated, isOnboardingComplete } = useAuth();

  if (isLoading) return <LoadingScreen />;

  if (isAuthenticated) {
    return <Navigate to={isOnboardingComplete ? '/' : '/onboarding'} replace />;
  }

  return <Outlet />;
}

// ─── ProtectedGuard ───────────────────────────────────────────────────────
// Wraps: all main application routes (dashboard, accounts, etc.)
//
// Rules:
//   isLoading              → show LoadingScreen
//   not authenticated      → /login
//   authenticated + not onboarded → /onboarding (backend also enforces this via 403)
//   authenticated + onboarded     → render the page normally
export function ProtectedGuard() {
  const { isLoading, isAuthenticated, isOnboardingComplete } = useAuth();

  if (isLoading) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isOnboardingComplete) return <Navigate to="/onboarding" replace />;

  return <Outlet />;
}

// ─── OnboardingGuard ──────────────────────────────────────────────────────
// Wraps: /onboarding
//
// Rules:
//   isLoading              → show LoadingScreen
//   not authenticated      → /login (can't configure without an account)
//   authenticated + onboarding already complete → / (don't re-show the wizard)
//   authenticated + onboarding pending → render the wizard normally
export function OnboardingGuard() {
  const { isLoading, isAuthenticated, isOnboardingComplete } = useAuth();

  if (isLoading) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (isOnboardingComplete) return <Navigate to="/" replace />;

  return <Outlet />;
}
