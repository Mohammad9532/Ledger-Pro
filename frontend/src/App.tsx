import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';

// Guards — single source of truth for routing decisions
import { PublicGuard, ProtectedGuard, OnboardingGuard } from '@/guards';

// Layouts
import AuthLayout from '@/layouts/AuthLayout';
import AppLayout from '@/components/layout/AppLayout';

// Auth pages
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import VerifyEmailPage from '@/pages/auth/VerifyEmailPage';
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage';

// Onboarding
import OnboardingPage from '@/pages/onboarding/OnboardingPage';

// App pages
import DashboardPage from '@/pages/DashboardPage';
import ProfilePage from '@/pages/ProfilePage';
import AccountsPage from '@/pages/AccountsPage';
import AccountStatementPage from '@/pages/AccountStatementPage';
import PeoplePage from '@/pages/PeoplePage';
import PersonLedgerPage from '@/pages/PersonLedgerPage';
import TransactionsPage from '@/pages/TransactionsPage';
import BusinessPage from '@/pages/BusinessPage';
import CreditCardsPage from '@/pages/CreditCardsPage';
import ExpensesPage from '@/pages/ExpensesPage';
import IncomePage from '@/pages/IncomePage';
import ReportsPage from '@/pages/ReportsPage';
import ReconciliationPage from '@/pages/ReconciliationPage';
import MonthClosingPage from '@/pages/MonthClosingPage';
import SystemPage from '@/pages/SystemPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>

          {/* ── Zone 1: Public (unauthenticated) ─────────────────────────────
              PublicGuard redirects authenticated users away before the layout
              or page even renders, eliminating all auth-flicker on these routes. */}
          <Route element={<PublicGuard />}>
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/verify-email" element={<VerifyEmailPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            </Route>
          </Route>

          {/* ── Zone 2: Onboarding ────────────────────────────────────────────
              OnboardingGuard allows entry only when:
                - authenticated, AND
                - onboarding not yet complete
              Prevents users from revisiting the wizard after finishing it. */}
          <Route element={<OnboardingGuard />}>
            <Route path="/onboarding" element={<OnboardingPage />} />
          </Route>

          {/* ── Zone 3: Protected application ────────────────────────────────
              ProtectedGuard requires:
                - authenticated, AND
                - onboarding complete
              Unauthenticated → /login
              Authenticated but not onboarded → /onboarding */}
          <Route element={<ProtectedGuard />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/accounts" element={<AccountsPage />} />
              <Route path="/accounts/:id" element={<AccountStatementPage />} />
              <Route path="/people" element={<PeoplePage />} />
              <Route path="/people/:id" element={<PersonLedgerPage />} />
              <Route path="/transactions" element={<TransactionsPage />} />
              <Route path="/business" element={<BusinessPage />} />
              <Route path="/credit-cards" element={<CreditCardsPage />} />
              <Route path="/expenses" element={<ExpensesPage />} />
              <Route path="/income" element={<IncomePage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/reconciliation" element={<ReconciliationPage />} />
              <Route path="/month-closing" element={<MonthClosingPage />} />
              <Route path="/system" element={<SystemPage />} />
            </Route>
          </Route>

          {/* ── Catch-all ─────────────────────────────────────────────────── */}
          <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
