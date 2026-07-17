import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Wallet } from 'lucide-react';

// ─── Shared loading screen ─────────────────────────────────────────────────
// Shown while AuthContext resolves the token against GET /api/user.
// Prevents any page from rendering before auth state is known (eliminates flicker).
export function LoadingScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg animate-pulse">
        <Wallet className="w-6 h-6 text-white" />
      </div>
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
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
