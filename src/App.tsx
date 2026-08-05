import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';

// Public Pages
import { PublicLayout } from './pages/public/PublicLayout';
import { HomePage } from './pages/public/HomePage';
import { LoginPage } from './pages/public/LoginPage';
import { AboutPage } from './pages/public/AboutPage';
import { MembershipPage } from './pages/public/MembershipPage';
import { JoinPage } from './pages/public/JoinPage';
import { LoansPage } from './pages/public/LoansPage';
import { TermsPage } from './pages/public/TermsPage';
import { PrivacyPage } from './pages/public/PrivacyPage';
import { BylawsPage } from './pages/public/BylawsPage';
import { GenericPage } from './pages/public/GenericPage';

// Member Pages
import { MemberLayout } from './pages/member/MemberLayout';
import { MemberDashboard } from './pages/member/MemberDashboard';
import { MemberContributions } from './pages/member/MemberContributions';
import { MemberLoans } from './pages/member/MemberLoans';
import { MemberLoanApply } from './pages/member/MemberLoanApply';
import { MemberStatements } from './pages/member/MemberStatements';
import { MemberNotifications } from './pages/member/MemberNotifications';
import { MemberDeposits } from './pages/member/MemberDeposits';
import { MemberWithdrawals } from './pages/member/MemberWithdrawals';
import { MemberShares } from './pages/member/MemberShares';
import { MemberFees } from './pages/member/MemberFees';
import { MemberOnboarding } from './pages/member/MemberOnboarding';
import { MemberProfile } from './pages/member/MemberProfile';
import { MemberMarket } from './pages/member/MemberMarket';
import { MemberMarketOrders } from './pages/member/MemberMarketOrders';

// Admin Pages
import { AdminLayout } from './pages/admin/AdminLayout';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminApplications } from './pages/admin/AdminApplications';
import { AdminLoans } from './pages/admin/AdminLoans';
import { AdminMembers } from './pages/admin/AdminMembers';
import { AdminContributions } from './pages/admin/AdminContributions';
import { AdminReports } from './pages/admin/AdminReports';
import { AdminOutbox } from './pages/admin/AdminOutbox';
import { AdminSettings } from './pages/admin/AdminSettings';
import { AdminDeposits } from './pages/admin/AdminDeposits';
import { AdminWithdrawals } from './pages/admin/AdminWithdrawals';
import { AdminShares } from './pages/admin/AdminShares';
import { AdminFees } from './pages/admin/AdminFees';
import { AdminProfile } from './pages/admin/AdminProfile';
import { AdminLedger } from './pages/admin/AdminLedger';
import { AdminInvestments } from './pages/admin/AdminInvestments';
import { AdminDividends } from './pages/admin/AdminDividends';
import { AdminMarket } from './pages/admin/AdminMarket';
import { AdminMarketOrders } from './pages/admin/AdminMarketOrders';
import { MemberDividends } from './pages/member/MemberDividends';

// Vite BASE_URL is e.g. "/bhcoopdemo/" on GitHub Pages
const routerBasename = ((import.meta as any).env?.BASE_URL || '/').replace(/\/$/, '') || undefined;

export default function App() {
  return (
    <Router basename={routerBasename}>
      <Toaster position="top-right" richColors />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<PublicLayout />}>
          <Route index element={<HomePage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="membership" element={<MembershipPage />} />
          <Route path="join" element={<JoinPage />} />
          <Route path="loans" element={<LoansPage />} />
          <Route path="terms" element={<TermsPage />} />
          <Route path="privacy" element={<PrivacyPage />} />
          <Route path="bylaws" element={<BylawsPage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="*" element={<GenericPage />} />
        </Route>

        {/* Onboarding (applicant) — outside full member shell */}
        <Route path="/member/onboarding" element={<MemberOnboarding />} />

        {/* Member Routes */}
        <Route path="/member" element={<MemberLayout />}>
          <Route index element={<Navigate to="/member/dashboard" replace />} />
          <Route path="dashboard" element={<MemberDashboard />} />
          <Route path="contributions" element={<Navigate to="/member/savings" replace />} />
          <Route path="savings" element={<MemberContributions />} />
          <Route path="shares" element={<MemberShares />} />
          <Route path="fees" element={<MemberFees />} />
          <Route path="loans" element={<MemberLoans />} />
          <Route path="loans/apply" element={<MemberLoanApply />} />
          <Route path="deposits" element={<MemberDeposits />} />
          <Route path="withdrawals" element={<MemberWithdrawals />} />
          <Route path="market" element={<MemberMarket />} />
          <Route path="market/orders" element={<MemberMarketOrders />} />
          <Route path="statements" element={<MemberStatements />} />
          <Route path="dividends" element={<MemberDividends />} />
          <Route path="notifications" element={<MemberNotifications />} />
          <Route path="profile" element={<MemberProfile />} />
        </Route>

        {/* Admin Routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="applications" element={<AdminApplications />} />
          <Route path="members" element={<AdminMembers />} />
          <Route path="contributions" element={<Navigate to="/admin/savings" replace />} />
          <Route path="savings" element={<AdminContributions />} />
          <Route path="shares" element={<AdminShares />} />
          <Route path="fees" element={<AdminFees />} />
          <Route path="loans" element={<AdminLoans />} />
          <Route path="market" element={<AdminMarket />} />
          <Route path="market/orders" element={<AdminMarketOrders />} />
          <Route path="deposits" element={<AdminDeposits />} />
          <Route path="withdrawals" element={<AdminWithdrawals />} />
          <Route path="investments" element={<AdminInvestments />} />
          <Route path="dividends" element={<AdminDividends />} />
          <Route path="ledger" element={<AdminLedger />} />
          <Route path="reports" element={<AdminReports />} />
          <Route path="outbox" element={<AdminOutbox />} />
          <Route path="profile" element={<AdminProfile />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>
      </Routes>
    </Router>
  );
}
