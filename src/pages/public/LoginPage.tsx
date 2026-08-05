import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ROLE_DUTIES, ROLE_LABELS } from '../../lib/roles';
import { RotateCcw, Shield, Users, LogIn } from 'lucide-react';

type Persona = {
  email: string;
  role: string;
  label: string;
  subtitle: string;
  portal: 'MEMBER' | 'ADMIN';
  membershipNumber?: string;
  tagline?: string;
};

export function LoginPage() {
  const navigate = useNavigate();
  const [staff, setStaff] = useState<Persona[]>([]);
  const [members, setMembers] = useState<Persona[]>([]);
  const [password, setPassword] = useState('seedcoop');
  const [loadingEmail, setLoadingEmail] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [emailLogin, setEmailLogin] = useState({ email: '', password: '', portal: 'MEMBER' as 'MEMBER' | 'ADMIN' });
  const [emailBusy, setEmailBusy] = useState(false);

  const loadPersonas = () =>
    fetch('/api/auth/personas')
      .then((r) => r.json())
      .then((d) => {
        setStaff(d.personas?.staff || []);
        setMembers(d.personas?.members || []);
        if (d.passwordHint) setPassword(d.passwordHint);
      })
      .catch(() => toast.error('Could not load sign-in directory'));

  useEffect(() => {
    loadPersonas();
  }, []);

  const finishLogin = (data: any, label: string, portal: 'MEMBER' | 'ADMIN') => {
    if (!data.success) {
      toast.error(data.error || 'Sign-in failed');
      return;
    }
    toast.success(`Signed in as ${label}`);
    const dest =
      data.redirectTo ||
      (data.needsOnboarding || data.onboarding
        ? '/member/onboarding'
        : portal === 'ADMIN'
          ? '/admin/dashboard'
          : '/member/dashboard');
    navigate(dest);
  };

  const continueAs = async (p: Persona) => {
    setLoadingEmail(p.email);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: p.email, password, portal: p.portal }),
      });
      const data = await res.json();
      finishLogin(data, p.label, p.portal);
    } catch {
      toast.error('Sign-in failed');
    } finally {
      setLoadingEmail(null);
    }
  };

  const submitEmailLogin = async (e: FormEvent) => {
    e.preventDefault();
    setEmailBusy(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailLogin.email.trim(),
          password: emailLogin.password,
          portal: emailLogin.portal,
        }),
      });
      const data = await res.json();
      const label =
        data.member
          ? `${data.member.firstName} ${data.member.lastName}`
          : data.user?.displayName || emailLogin.email;
      finishLogin(data, label, emailLogin.portal);
    } catch {
      toast.error('Sign-in failed');
    } finally {
      setEmailBusy(false);
    }
  };

  const resetData = async () => {
    if (
      !confirm(
        'Restore all cooperative data to the default opening state? Current balances and requests on this device will be replaced.',
      )
    ) {
      return;
    }
    setResetting(true);
    try {
      const res = await fetch('/api/system/reset', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        toast.success('Data restored to default state');
        await loadPersonas();
      } else {
        toast.error(data.error || 'Reset failed');
      }
    } catch {
      toast.error('Reset failed');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] py-12 px-4 sm:px-6 lg:px-8 bg-ivory-50">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-seed-950">Sign in to SeedCoop</h1>
          <p className="mt-2 text-ink-600 max-w-xl mx-auto">
            Use a demo profile, or sign in with the email and password you chose when you joined.
          </p>
          <p className="mt-2 text-sm text-ink-500">
            Seeded accounts password: <span className="font-mono font-semibold text-seed-800">{password}</span>
          </p>
          <p className="mt-1 text-sm">
            New here?{' '}
            <Link to="/join" className="text-seed-800 font-semibold hover:underline">
              Join free with a referral code
            </Link>
          </p>
        </div>

        {/* Email / password for fresh members */}
        <section className="bg-white rounded-[16px] border border-ink-200 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <LogIn className="w-5 h-5 text-seed-700" />
            <div>
              <h2 className="font-bold text-seed-950">Email & password</h2>
              <p className="text-xs text-ink-600">
                For newly approved members — use the credentials from signup (not the demo password).
              </p>
            </div>
          </div>
          <form onSubmit={submitEmailLogin} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="email"
              required
              placeholder="Email"
              value={emailLogin.email}
              onChange={(e) => setEmailLogin({ ...emailLogin, email: e.target.value })}
              className="px-3 py-2 border border-ink-200 rounded-[8px] text-sm"
            />
            <input
              type="password"
              required
              placeholder="Password"
              value={emailLogin.password}
              onChange={(e) => setEmailLogin({ ...emailLogin, password: e.target.value })}
              className="px-3 py-2 border border-ink-200 rounded-[8px] text-sm"
            />
            <select
              value={emailLogin.portal}
              onChange={(e) =>
                setEmailLogin({ ...emailLogin, portal: e.target.value as 'MEMBER' | 'ADMIN' })
              }
              className="px-3 py-2 border border-ink-200 rounded-[8px] text-sm"
            >
              <option value="MEMBER">Member portal</option>
              <option value="ADMIN">Staff portal</option>
            </select>
            <button
              type="submit"
              disabled={emailBusy}
              className="bg-seed-800 text-white rounded-[8px] text-sm font-medium hover:bg-seed-700 disabled:opacity-50"
            >
              {emailBusy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </section>

        <section className="bg-white rounded-[16px] border border-ink-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-ink-100 bg-seed-50 flex items-center gap-2">
            <Shield className="w-5 h-5 text-seed-700" />
            <div>
              <h2 className="font-bold text-seed-950">Staff</h2>
              <p className="text-xs text-ink-600">
                Super Admin, Admin, and Financial Secretary — each is also a member.
              </p>
            </div>
          </div>
          <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            {staff.map((p) => (
              <button
                key={p.email}
                type="button"
                disabled={!!loadingEmail}
                onClick={() => continueAs(p)}
                className="text-left p-4 rounded-[12px] border border-ink-200 hover:border-seed-400 hover:bg-seed-50/50 transition-colors disabled:opacity-50"
              >
                <div className="font-semibold text-seed-950">{p.label}</div>
                <div className="text-xs font-medium text-gold-600 mt-0.5">
                  {ROLE_LABELS[p.role as keyof typeof ROLE_LABELS] || p.subtitle}
                  {p.membershipNumber ? (
                    <span className="text-ink-500 font-mono font-normal"> · {p.membershipNumber}</span>
                  ) : null}
                </div>
                <p className="text-xs text-ink-600 mt-2 leading-relaxed">
                  {ROLE_DUTIES[p.role as keyof typeof ROLE_DUTIES] || p.subtitle}
                </p>
                {p.tagline && <p className="text-[11px] text-seed-700 mt-2">{p.tagline}</p>}
                <div className="mt-3 text-sm font-medium text-seed-800">
                  {loadingEmail === p.email ? 'Signing in…' : 'Continue as staff'}
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="bg-white rounded-[16px] border border-ink-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-ink-100 bg-ivory-50 flex items-center gap-2">
            <Users className="w-5 h-5 text-seed-700" />
            <div>
              <h2 className="font-bold text-seed-950">Members</h2>
              <p className="text-xs text-ink-600">
                Live directory — includes newly approved members (demo password for seeded accounts)
              </p>
            </div>
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {members.length === 0 ? (
              <p className="text-sm text-ink-500 col-span-2 p-4">No members yet.</p>
            ) : (
              members.map((p) => (
                <button
                  key={p.email}
                  type="button"
                  disabled={!!loadingEmail}
                  onClick={() => continueAs(p)}
                  className="text-left p-4 rounded-[12px] border border-ink-200 hover:border-seed-400 hover:bg-seed-50/50 transition-colors disabled:opacity-50"
                >
                  <div className="font-semibold text-seed-950">{p.label}</div>
                  <div className="text-xs font-mono text-seed-700 mt-0.5">{p.membershipNumber || p.subtitle}</div>
                  {p.tagline && <p className="text-[11px] text-ink-600 mt-2">{p.tagline}</p>}
                  <div className="mt-3 text-sm font-medium text-seed-800">
                    {loadingEmail === p.email ? 'Signing in…' : 'Continue as member'}
                  </div>
                </button>
              ))
            )}
          </div>
        </section>

        <div className="text-center">
          <button
            type="button"
            onClick={resetData}
            disabled={resetting}
            className="inline-flex items-center gap-2 text-sm text-ink-600 hover:text-seed-800"
          >
            <RotateCcw className="w-4 h-4" />
            {resetting ? 'Restoring…' : 'Restore default cooperative data'}
          </button>
        </div>
      </div>
    </div>
  );
}
