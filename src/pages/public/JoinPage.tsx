import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { SUPER_ADMIN_REFERRAL_CODE } from '../../lib/coop/constants';

export function JoinPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    password: '',
    phoneNumber: '',
    referralCode: params.get('ref') || SUPER_ADMIN_REFERRAL_CODE,
  });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch('/api/public/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Account created — continue onboarding');
        navigate('/member/onboarding');
      } else {
        toast.error(data.error || 'Could not join');
      }
    } catch {
      toast.error('Could not join');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen pt-16">
      <section className="bg-seed-950 text-white py-16">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold mb-4">Join SeedCoop — free with a referral</h1>
          <p className="text-seed-200 text-lg">
            Create your account with a member referral code. Then pay the ₦2,000 registration fee,
            complete Know Your Member (KYM), and await board approval.
          </p>
        </div>
      </section>

      <section className="flex-grow bg-ivory-50 py-12">
        <form
          onSubmit={submit}
          className="max-w-lg mx-auto bg-white border border-ink-200 rounded-[14px] p-6 sm:p-8 space-y-4 shadow-sm"
        >
          <div className="bg-seed-50 border border-seed-100 rounded-[10px] p-3 text-sm text-seed-900">
            Referral code is a member number (e.g. <strong className="font-mono">{SUPER_ADMIN_REFERRAL_CODE}</strong> for Super Admin).
            After approval your own code is your new SC- number.
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1">
              <label className="block text-sm font-medium mb-1">First name</label>
              <input required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className="w-full px-3 py-2 border border-ink-200 rounded-[8px]" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Middle</label>
              <input value={form.middleName} onChange={(e) => setForm({ ...form, middleName: e.target.value })} className="w-full px-3 py-2 border border-ink-200 rounded-[8px]" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Last name</label>
              <input required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} className="w-full px-3 py-2 border border-ink-200 rounded-[8px]" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2 border border-ink-200 rounded-[8px]" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Phone</label>
            <input value={form.phoneNumber} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })} className="w-full px-3 py-2 border border-ink-200 rounded-[8px]" placeholder="+234…" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input type="password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full px-3 py-2 border border-ink-200 rounded-[8px]" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Referral code</label>
            <input required value={form.referralCode} onChange={(e) => setForm({ ...form, referralCode: e.target.value.toUpperCase() })} className="w-full px-3 py-2 border border-ink-200 rounded-[8px] font-mono" />
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full bg-seed-800 text-white py-3 rounded-[10px] font-semibold hover:bg-seed-700 disabled:opacity-50"
          >
            {busy ? 'Creating account…' : 'Create free account'}
          </button>

          <p className="text-center text-sm text-ink-600">
            Already have an account? <Link to="/login" className="text-seed-800 font-medium">Sign in</Link>
          </p>
        </form>
      </section>
    </div>
  );
}
