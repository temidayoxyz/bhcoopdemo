import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  LogOut, Home, PieChart, CreditCard, FileText, Bell, User,
  ArrowDownCircle, ArrowUpCircle, Menu, X, PiggyBank, ArrowLeftRight, Shield,
  Store, PackageCheck, Landmark, Receipt,
} from 'lucide-react';
import { toast } from 'sonner';
import { useCallback, useEffect, useState } from 'react';
import { ROLE_LABELS } from '../../lib/roles';

export function MemberLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [member, setMember] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [canSwitchToAdmin, setCanSwitchToAdmin] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  const refreshMember = useCallback(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.portal !== 'MEMBER' || !data.user) {
          navigate('/login');
          return;
        }
        if (data.needsOnboarding || data.user.role === 'APPLICANT') {
          navigate('/member/onboarding');
          return;
        }
        if (!data.member) {
          navigate('/login');
          return;
        }
        if (data.member?.status === 'LEFT' || data.member?.status === 'REMOVED') {
          toast.error('This membership is closed');
          navigate('/login');
          return;
        }
        setMember(data.member);
        setUser(data.user || null);
        setCanSwitchToAdmin(!!data.canSwitchToAdmin);
      })
      .catch(() => navigate('/login'));
  }, [navigate]);

  useEffect(() => {
    refreshMember();
  }, [refreshMember]);

  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ portal: 'MEMBER' }),
    });
    toast.success('Signed out');
    navigate('/login');
  };

  const handleSwitchToAdmin = async () => {
    setSwitching(true);
    try {
      const res = await fetch('/api/auth/switch-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portal: 'ADMIN' }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Switched to staff view');
        navigate('/admin/dashboard');
      } else {
        toast.error(data.error || 'Could not switch view');
      }
    } catch {
      toast.error('Could not switch view');
    } finally {
      setSwitching(false);
    }
  };

  const navItems = [
    { name: 'Dashboard', path: '/member/dashboard', icon: Home },
    { name: 'Savings', path: '/member/savings', icon: PieChart },
    { name: 'Shares', path: '/member/shares', icon: Landmark },
    { name: 'Deposits', path: '/member/deposits', icon: ArrowDownCircle },
    { name: 'Withdrawals', path: '/member/withdrawals', icon: ArrowUpCircle },
    { name: 'Fees', path: '/member/fees', icon: Receipt },
    { name: 'Loans', path: '/member/loans', icon: CreditCard },
    { name: 'Market', path: '/member/market', icon: Store },
    { name: 'My Orders', path: '/member/market/orders', icon: PackageCheck },
    { name: 'Dividends', path: '/member/dividends', icon: PiggyBank },
    { name: 'Statements', path: '/member/statements', icon: FileText },
    { name: 'Notifications', path: '/member/notifications', icon: Bell },
    { name: 'Profile', path: '/member/profile', icon: User },
  ];

  if (!member) {
    return <div className="min-h-screen flex items-center justify-center bg-ivory-50">Loading…</div>;
  }

  const staffRoleLabel = user && user.role !== 'MEMBER'
    ? ROLE_LABELS[user.role as keyof typeof ROLE_LABELS] || user.role
    : null;

  return (
    <div className="min-h-screen flex bg-ivory-50 text-ink-950 font-sans relative">
      <aside className="w-64 bg-white border-r border-ink-200 hidden md:flex flex-col flex-shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-ink-200">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-seed-800 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-ivory-50" />
            </div>
            <span className="font-semibold tracking-tight text-seed-950">SeedCoop Member</span>
          </Link>
        </div>
        <div className="p-4 border-b border-ink-200">
          <div className="font-medium text-sm text-seed-950">{member.firstName} {member.lastName}</div>
          <div className="text-xs font-mono text-seed-700 mt-1">{member.membershipNumber}</div>
          {staffRoleLabel && (
            <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-gold-700 bg-gold-50 border border-gold-200 px-2 py-0.5 rounded-full">
              <Shield className="w-3 h-3" />
              Also {staffRoleLabel}
            </div>
          )}
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = item.path === '/member/market'
              ? location.pathname === '/member/market'
              : location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-[6px] text-sm font-medium transition-colors ${
                  isActive ? 'bg-seed-50 text-seed-900' : 'text-ink-600 hover:bg-ink-50'
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.name}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-ink-200 space-y-1">
          {canSwitchToAdmin && (
            <button
              type="button"
              onClick={handleSwitchToAdmin}
              disabled={switching}
              className="flex items-center gap-3 w-full px-3 py-2 rounded-[6px] text-sm font-medium text-seed-800 hover:bg-seed-50 disabled:opacity-50"
            >
              <ArrowLeftRight className="w-4 h-4" />
              {switching ? 'Switching…' : 'Switch to staff view'}
            </button>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-[6px] text-sm font-medium text-ink-600 hover:bg-ink-50"
          >
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      </aside>

      {isMobileOpen && (
        <div onClick={() => setIsMobileOpen(false)} className="fixed inset-0 bg-seed-950/40 z-40 md:hidden" />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 w-72 bg-white z-50 transform transition-transform md:hidden flex flex-col border-r border-ink-200 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-16 flex items-center justify-between px-6 border-b border-ink-200">
          <span className="font-semibold">Member</span>
          <button type="button" onClick={() => setIsMobileOpen(false)}><X className="w-6 h-6" /></button>
        </div>
        <div className="p-4 border-b border-ink-200">
          <div className="font-medium text-sm">{member.firstName} {member.lastName}</div>
          <div className="text-xs font-mono text-seed-700">{member.membershipNumber}</div>
          {staffRoleLabel && (
            <div className="mt-2 text-[11px] font-medium text-gold-700">Also {staffRoleLabel}</div>
          )}
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.name}
              to={item.path}
              onClick={() => setIsMobileOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-[6px] text-sm font-medium text-ink-700 hover:bg-ink-50"
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-ink-200 space-y-1">
          {canSwitchToAdmin && (
            <button
              type="button"
              onClick={handleSwitchToAdmin}
              disabled={switching}
              className="flex items-center gap-3 w-full px-3 py-2 rounded-[6px] text-sm font-medium text-seed-800 hover:bg-seed-50 disabled:opacity-50"
            >
              <ArrowLeftRight className="w-4 h-4" />
              Switch to staff view
            </button>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-[6px] text-sm font-medium text-ink-600 hover:bg-ink-50"
          >
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-white border-b border-ink-200 flex items-center justify-between px-4 md:hidden sticky top-0 z-30">
          <div className="flex items-center min-w-0">
            <button type="button" onClick={() => setIsMobileOpen(true)} className="p-2 shrink-0">
              <Menu className="w-6 h-6" />
            </button>
            <span className="ml-1 font-semibold text-seed-950 truncate">{member.membershipNumber}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {canSwitchToAdmin && (
              <button
                type="button"
                onClick={handleSwitchToAdmin}
                disabled={switching}
                className="text-xs font-medium px-2.5 py-1 rounded-full bg-seed-50 text-seed-800 border border-seed-200"
              >
                Staff view
              </button>
            )}
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full text-ink-600 border border-ink-200 hover:bg-ink-50"
              aria-label="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign out
            </button>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet context={{ member, user, refreshMember }} />
        </div>
      </main>
    </div>
  );
}
