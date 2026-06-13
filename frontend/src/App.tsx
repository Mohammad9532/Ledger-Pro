import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import AppLayout from '@/components/layout/AppLayout';
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
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
          <Route path="/login" element={<LoginPage />} />
          <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardPage />} />
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
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
