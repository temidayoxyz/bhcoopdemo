import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  LogOut, LayoutDashboard, Users, FileSignature, Coins, Landmark, FileBarChart,
  Settings, Mail, ArrowDownCircle, ArrowUpCircle, User, Menu, X, BookOpen, TrendingUp, PiggyBank,
  ArrowLeftRight, Store, PackageCheck, Receipt,
} from 'lucide-react';
import { toast } from 'sonner';
import { useEffect, useMemo, useState } from 'react';
import { adminNavForRole, normalizeRole, ROLE_DUTIES, ROLE_LABELS, type NavKey } from '../../lib/roles';

const NAV_META: Record<NavKey, { name: string; path: string; icon: any }> = {
  dashboard: { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
  applications: { name: 'Applications', path: '/admin/applications', icon: FileSignature },
  members: { name: 'Members', path: '/admin/members', icon: Users },
  contributions: { name: 'Savings', path: '/admin/savings', icon: Coins },
  shares: { name: 'Shares', path: '/admin/shares', icon: Landmark },
  deposits: { name: 'Deposits', path: '/admin/deposits', icon: ArrowDownCircle },
  withdrawals: { name: 'Withdrawals', path: '/admin/withdrawals', icon: ArrowUpCircle },
  fees: { name: 'Fees', path: '/admin/fees', icon: Receipt },
  loans: { name: 'Loans', path: '/admin/loans', icon: Landmark },
  market: { name: 'Market', path: '/admin/market', icon: Store },
  marketOrders: { name: 'Market Orders', path: '/admin/market/orders', icon: PackageCheck },
  investments: { name: 'Investments', path: '/admin/investments', icon: TrendingUp },
  dividends: { name: 'Dividends', path: '/admin/dividends', icon: PiggyBank },
  ledger: { name: 'Ledger', path: '/admin/ledger', icon: BookOpen },
  reports: { name: 'Reports', path: '/admin/reports', icon: FileBarChart },
  outbox: { name: 'Outbox', path: '/admin/outbox', icon: Mail },
  profile: { name: 'Profile', path: '/admin/profile', icon: User },
  settings: { name: 'Settings', path: '/admin/settings', icon: Settings },
};

export function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<any>(null);
  const [member, setMember] = useState<any>(null);
  const [canSwitchToMember, setCanSwitchToMember] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me').then((res) => res.json()).then((data) => {
      const role = normalizeRole(data.user?.role);
      if (!data.user || data.portal !== 'ADMIN' || data.user.role === 'MEMBER' || data.user.role === 'APPLICANT') {
        navigate('/login');
      } else {
        setUser({ ...data.user, role });
        setMember(data.member || null);
        setCanSwitchToMember(!!data.canSwitchToMember);
      }
    }).catch(() => navigate('/login'));
  }, [navigate]);

  useEffect(() => { setIsMobileOpen(false); }, [location.pathname]);

  const navItems = useMemo(() => {
    if (!user) return [];
    return adminNavForRole(user.role).map((k) => NAV_META[k]);
  }, [user]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ portal: 'ADMIN' }),
    });
    toast.success('Signed out');
    navigate('/login');
  };

  const handleSwitchToMember = async () => {
    setSwitching(true);
    try {
      const res = await fetch('/api/auth/switch-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portal: 'MEMBER' }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Switched to member view');
        navigate('/member/dashboard');
      } else {
        toast.error(data.error || 'Could not switch view');
      }
    } catch {
      toast.error('Could not switch view');
    } finally {
      setSwitching(false);
    }
  };

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center bg-ink-100">Loading…</div>;
  }

  const roleLabel = ROLE_LABELS[user.role as keyof typeof ROLE_LABELS] || user.role;
  const duty = ROLE_DUTIES[user.role as keyof typeof ROLE_DUTIES] || '';
  const isActivePath = (path: string) => path === '/admin/market'
    ? location.pathname === '/admin/market'
    : location.pathname.startsWith(path);
  const currentNav = navItems.find((i) => isActivePath(i.path))?.name || 'Dashboard';

  const NavLinks = ({ onNavigate }: { onNavigate?: () => void }) => (
    <>
      {navItems.map((item) => {
        const isActive = isActivePath(item.path);
        return (
          <Link
            key={item.name}
            to={item.path}
            onClick={onNavigate}
            className={`flex items-center gap-3 px-3 py-2 rounded-[6px] text-sm font-medium transition-colors ${
              isActive ? 'bg-seed-800 text-white' : 'text-seed-200 hover:bg-seed-900 hover:text-white'
            }`}
          >
            <item.icon className={`w-4 h-4 ${isActive ? 'text-gold-500' : 'text-seed-400'}`} />
            {item.name}
          </Link>
        );
      })}
    </>
  );

  return (
    <div className="min-h-screen flex bg-ink-100 text-ink-950 font-sans relative">
      <aside className="w-64 bg-seed-950 text-white hidden md:flex flex-col flex-shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-seed-800">
          <Link to="/admin/dashboard" className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-ivory-50 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-seed-950" />
            </div>
            <span className="font-semibold tracking-tight">SeedCoop Staff</span>
          </Link>
        </div>
        <div className="p-4 border-b border-seed-800">
          <div className="font-medium text-sm text-seed-100 truncate">{user.displayName || user.email}</div>
          <div className="text-xs text-gold-500 font-semibold mt-1">{roleLabel}</div>
          {member?.membershipNumber && (
            <div className="text-[11px] font-mono text-seed-400 mt-1">{member.membershipNumber}</div>
          )}
          <p className="text-[11px] text-seed-300 mt-2 leading-snug">{duty}</p>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <NavLinks />
        </nav>
        <div className="p-4 border-t border-seed-800 space-y-1">
          {canSwitchToMember && (
            <button
              type="button"
              onClick={handleSwitchToMember}
              disabled={switching}
              className="flex items-center gap-3 w-full px-3 py-2 rounded-[6px] text-sm font-medium text-gold-400 hover:bg-seed-900 disabled:opacity-50"
            >
              <ArrowLeftRight className="w-4 h-4" />
              {switching ? 'Switching…' : 'Switch to member view'}
            </button>
          )}
          <button type="button" onClick={handleLogout} className="flex items-center gap-3 w-full px-3 py-2 rounded-[6px] text-sm font-medium text-seed-200 hover:bg-seed-900">
            <LogOut className="w-4 h-4 text-seed-400" /> Sign out
          </button>
        </div>
      </aside>

      {isMobileOpen && (
        <div onClick={() => setIsMobileOpen(false)} className="fixed inset-0 bg-seed-950/60 z-40 md:hidden" />
      )}

      <aside className={`fixed top-0 bottom-0 left-0 w-72 bg-seed-950 text-white z-50 transform transition-transform md:hidden flex flex-col ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-16 flex items-center justify-between px-6 border-b border-seed-800">
          <span className="font-semibold">SeedCoop Staff</span>
          <button type="button" onClick={() => setIsMobileOpen(false)}><X className="w-6 h-6" /></button>
        </div>
        <div className="p-4 border-b border-seed-800">
          <div className="text-sm">{user.displayName || user.email}</div>
          <div className="text-xs text-gold-500">{roleLabel}</div>
          {member?.membershipNumber && (
            <div className="text-[11px] font-mono text-seed-400 mt-1">{member.membershipNumber}</div>
          )}
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <NavLinks onNavigate={() => setIsMobileOpen(false)} />
        </nav>
        <div className="p-4 border-t border-seed-800 space-y-1">
          {canSwitchToMember && (
            <button
              type="button"
              onClick={handleSwitchToMember}
              disabled={switching}
              className="flex items-center gap-3 w-full px-3 py-2 rounded-[6px] text-sm font-medium text-gold-400 hover:bg-seed-900 disabled:opacity-50"
            >
              <ArrowLeftRight className="w-4 h-4" />
              Switch to member view
            </button>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-[6px] text-sm font-medium text-seed-200 hover:bg-seed-900"
          >
            <LogOut className="w-4 h-4 text-seed-400" /> Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-white border-b border-ink-200 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setIsMobileOpen(true)} className="p-2 md:hidden">
              <Menu className="w-6 h-6" />
            </button>
            <h2 className="font-semibold text-lg text-seed-950">{currentNav}</h2>
          </div>
          <div className="flex items-center gap-2">
            {canSwitchToMember && (
              <button
                type="button"
                onClick={handleSwitchToMember}
                disabled={switching}
                className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-gold-50 text-gold-800 border border-gold-200 hover:bg-gold-100 disabled:opacity-50"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
                Member view
              </button>
            )}
            <span className="text-xs font-medium px-3 py-1.5 rounded-full bg-seed-50 text-seed-800 border border-seed-200">
              {roleLabel}
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="md:hidden inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-full text-ink-600 border border-ink-200 hover:bg-ink-50"
              aria-label="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign out
            </button>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet context={{ user }} />
        </div>
      </main>
    </div>
  );
}
