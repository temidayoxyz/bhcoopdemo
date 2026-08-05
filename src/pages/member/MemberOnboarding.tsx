import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { MoneyText } from '../../components/money/MoneyText';
import { ID_TYPES, SALARY_RANGES } from '../../lib/coop/constants';

export function MemberOnboarding() {
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [kym, setKym] = useState({
    legalName: '',
    idType: 'NATIONAL_ID',
    idNumber: '',
    occupation: '',
    employer: '',
    salaryRange: '1M_3M',
    nextOfKinName: '',
    nextOfKinPhone: '',
    nextOfKinRelationship: 'Spouse',
    address: '',
    residency: 'RESIDENT',
    documentName: 'id-scan.pdf',
  });

  const applyPayload = (d: any) => {
    setData(d);
    if (d.application) {
      setKym((prev) => ({
        ...prev,
        legalName: `${d.application.firstName} ${d.application.middleName || ''} ${d.application.lastName}`
          .replace(/\s+/g, ' ')
          .trim(),
      }));
    }
  };

  const load = () =>
    fetch('/api/members/onboarding')
      .then((r) => r.json())
      .then((d) => applyPayload(d))
      .catch(() => toast.error('Could not load onboarding status'));

  useEffect(() => {
    load();
    const id = window.setInterval(() => {
      fetch('/api/members/onboarding')
        .then((r) => r.json())
        .then((d) => applyPayload(d))
        .catch(() => {});
    }, 4000);
    return () => window.clearInterval(id);
  }, []);

  const goDashboard = () => {
    const dest = data?.redirectTo || '/member/dashboard';
    toast.success(
      data?.member?.membershipNumber
        ? `Welcome — ${data.member.membershipNumber}`
        : 'Opening your member dashboard…',
    );
    navigate(dest, { replace: true });
  };

  const payFee = async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/members/onboarding/pay-fee', { method: 'POST' });
      const d = await res.json();
      if (d.success) {
        toast.success(`Registration fee paid · ${d.reference}`);
        load();
      } else toast.error(d.error || 'Payment failed');
    } catch {
      toast.error('Payment failed');
    } finally {
      setBusy(false);
    }
  };

  const submitKym = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch('/api/members/onboarding/kym', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kym }),
      });
      const d = await res.json();
      if (d.success) {
        toast.success('KYM submitted for membership approval');
        load();
      } else toast.error(d.error || 'Could not submit');
    } catch {
      toast.error('Could not submit');
    } finally {
      setBusy(false);
    }
  };

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ivory-50">
        Loading onboarding…
      </div>
    );
  }

  const app = data.application;
  const steps = [
    { id: 'payment', label: 'Registration fee' },
    { id: 'kym', label: 'Know Your Member' },
    { id: 'waiting', label: 'Approval' },
    { id: 'complete', label: 'Done' },
  ];
  // Map complete / waiting / payment / kym
  const visualStep =
    data.complete || data.step === 'complete'
      ? 'complete'
      : data.step || 'payment';
  const stepIndex = Math.max(
    0,
    steps.findIndex((s) => s.id === visualStep),
  );

  return (
    <div className="min-h-screen bg-ivory-50 py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-8">
        <header className="text-center">
          <h1 className="text-3xl font-bold text-seed-950">Membership onboarding</h1>
          <p className="text-ink-600 mt-2">Complete these steps to become an active SeedCoop member.</p>
          {app && <p className="text-sm font-mono text-seed-700 mt-2">{app.reference}</p>}
        </header>

        <ol className="flex flex-wrap gap-2 justify-center">
          {steps.map((s, i) => (
            <li
              key={s.id}
              className={`text-xs sm:text-sm px-3 py-1.5 rounded-full border ${
                i <= stepIndex
                  ? 'bg-seed-800 text-white border-seed-800'
                  : 'bg-white text-ink-500 border-ink-200'
              }`}
            >
              {i + 1}. {s.label}
            </li>
          ))}
        </ol>

        {data.step === 'payment' && !data.complete && (
          <div className="bg-white border border-ink-200 rounded-[14px] p-6 space-y-4">
            <h2 className="text-xl font-semibold text-seed-950">Pay registration fee</h2>
            <p className="text-3xl font-bold text-seed-800">
              <MoneyText kobo={data.registrationFeeKobo} />
            </p>
            {app?.regFeeDueAt && (
              <p className="text-sm text-ink-600">
                Pay by {new Date(app.regFeeDueAt * 1000).toLocaleString()} (7 days from signup).
              </p>
            )}
            <div className="bg-gold-50 border border-gold-200 rounded-[10px] p-4 text-sm text-ink-800">
              {data.disclaimer}
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={payFee}
              className="w-full bg-seed-800 text-white py-3 rounded-[10px] font-medium hover:bg-seed-700 disabled:opacity-50"
            >
              {busy ? 'Processing…' : 'Pay registration fee (demo)'}
            </button>
          </div>
        )}

        {data.step === 'kym' && !data.complete && (
          <form
            onSubmit={submitKym}
            className="bg-white border border-ink-200 rounded-[14px] p-6 space-y-4"
          >
            <h2 className="text-xl font-semibold text-seed-950">Know Your Member (KYM)</h2>
            <p className="text-sm text-ink-600">Background-check details for board review. No additional fee.</p>

            {(
              [
                ['legalName', 'Legal name'],
                ['idNumber', 'ID number'],
                ['occupation', 'Occupation'],
                ['employer', 'Employer (optional)'],
                ['nextOfKinName', 'Next of kin name'],
                ['nextOfKinPhone', 'Next of kin phone'],
                ['nextOfKinRelationship', 'Relationship'],
                ['address', 'Residential address'],
              ] as const
            ).map(([key, label]) => (
              <div key={key}>
                <label className="block text-sm font-medium mb-1">{label}</label>
                <input
                  required={key !== 'employer'}
                  value={(kym as any)[key]}
                  onChange={(e) => setKym({ ...kym, [key]: e.target.value })}
                  className="w-full px-3 py-2 border border-ink-200 rounded-[8px] outline-none focus:ring-2 focus:ring-seed-500"
                />
              </div>
            ))}

            <div>
              <label className="block text-sm font-medium mb-1">ID type</label>
              <select
                value={kym.idType}
                onChange={(e) => setKym({ ...kym, idType: e.target.value })}
                className="w-full px-3 py-2 border border-ink-200 rounded-[8px]"
              >
                {ID_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Annual salary range</label>
              <select
                value={kym.salaryRange}
                onChange={(e) => setKym({ ...kym, salaryRange: e.target.value })}
                className="w-full px-3 py-2 border border-ink-200 rounded-[8px]"
              >
                {SALARY_RANGES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Residency</label>
              <select
                value={kym.residency}
                onChange={(e) => setKym({ ...kym, residency: e.target.value })}
                className="w-full px-3 py-2 border border-ink-200 rounded-[8px]"
              >
                <option value="RESIDENT">Resident (attends meetings regularly)</option>
                <option value="NON_RESIDENT">Non-resident / diaspora</option>
              </select>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" required defaultChecked />
              I attach a scan of my ID document (demo: {kym.documentName})
            </label>

            <button
              type="submit"
              disabled={busy}
              className="w-full bg-seed-800 text-white py-3 rounded-[10px] font-medium hover:bg-seed-700 disabled:opacity-50"
            >
              {busy ? 'Submitting…' : 'Submit for membership approval'}
            </button>
          </form>
        )}

        {data.step === 'waiting' && !data.complete && (
          <div className="bg-white border border-ink-200 rounded-[14px] p-8 text-center space-y-3">
            <h2 className="text-xl font-semibold text-seed-950">Awaiting board approval</h2>
            <p className="text-ink-600">
              Your registration fee is paid and KYM is complete. An Admin or Super Admin will review
              your background checks and approve membership. This page refreshes automatically.
            </p>
            <p className="text-sm text-ink-500">
              You can also sign out and sign in later with <strong>{app?.email}</strong> and the
              password you chose.
            </p>
            <button
              type="button"
              onClick={load}
              className="text-seed-800 font-medium text-sm underline"
            >
              Refresh status now
            </button>
          </div>
        )}

        {(data.complete || data.step === 'complete') && (
          <div className="bg-white border border-success/30 rounded-[14px] p-8 text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-success/10 text-success flex items-center justify-center text-2xl font-bold">
              ✓
            </div>
            <h2 className="text-xl font-semibold text-seed-950">Membership approved</h2>
            <p className="text-ink-600">
              {data.member ? (
                <>
                  Welcome to SeedCoop. Your member number is{' '}
                  <strong className="font-mono text-seed-800">{data.member.membershipNumber}</strong>
                  . That number is also your referral code.
                </>
              ) : (
                data.message ||
                'Your membership was approved. Open your dashboard to continue.'
              )}
            </p>
            <button
              type="button"
              onClick={goDashboard}
              className="w-full sm:w-auto bg-seed-800 text-white px-8 py-3 rounded-[10px] font-semibold hover:bg-seed-700"
            >
              Go to dashboard
            </button>
            <p className="text-xs text-ink-500">
              Or sign in anytime from the login page with your email and password.
            </p>
          </div>
        )}

        {(data.step === 'rejected' || data.step === 'expired') && (
          <div className="bg-white border border-danger/30 rounded-[14px] p-8 text-center">
            <h2 className="text-xl font-semibold text-danger capitalize">{data.step}</h2>
            <p className="text-ink-600 mt-2">
              {data.step === 'expired'
                ? 'Registration fee was not paid within 7 days.'
                : app?.reviewNotes || 'Your application was not approved.'}
            </p>
          </div>
        )}

        {/* Fallback if step is unknown — never leave blank */}
        {!data.complete &&
          data.step &&
          !['payment', 'kym', 'waiting', 'complete', 'rejected', 'expired'].includes(data.step) && (
            <div className="bg-white border border-ink-200 rounded-[14px] p-8 text-center space-y-3">
              <p className="text-ink-600">Status: {data.step}</p>
              <button
                type="button"
                onClick={load}
                className="text-seed-800 font-medium text-sm underline"
              >
                Refresh
              </button>
            </div>
          )}
      </div>
    </div>
  );
}
