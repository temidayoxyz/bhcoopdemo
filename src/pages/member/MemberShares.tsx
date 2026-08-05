import { useOutletContext } from 'react-router-dom';
import { useEffect, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { MoneyText } from '../../components/money/MoneyText';
import { MIN_SHARES_KOBO } from '../../lib/coop/constants';

export function MemberShares() {
  const { member, refreshMember } = useOutletContext<{ member: any; refreshMember?: () => void }>();
  const [data, setData] = useState<any>(null);
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => fetch('/api/members/shares').then((r) => r.json()).then(setData);
  useEffect(() => { load(); }, []);

  const buy = async (e: FormEvent) => {
    e.preventDefault();
    const amountKobo = Math.round(parseFloat(amount) * 100);
    if (!amountKobo || amountKobo <= 0) return toast.error('Enter a valid amount');
    setBusy(true);
    try {
      const res = await fetch('/api/members/shares/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountKobo }),
      });
      const d = await res.json();
      if (d.success) {
        toast.success(`Shares purchased · ${d.reference}`);
        setAmount('');
        load();
        refreshMember?.();
      } else toast.error(d.error || 'Failed');
    } catch {
      toast.error('Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  if (!data) return <div>Loading…</div>;

  const current = data.sharesBalanceKobo || 0;
  const minNeeded = Math.max(0, MIN_SHARES_KOBO - current);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 md:pb-0">
      <header>
        <h1 className="text-2xl font-bold text-seed-950">Share Capital</h1>
        <p className="text-ink-600 mt-1">
          Ownership equity in the cooperative. Minimum holding is <MoneyText kobo={MIN_SHARES_KOBO} />.
          Shares are not withdrawable and determine your dividend weight.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-ink-200 rounded-[14px] p-5">
          <p className="text-xs uppercase text-ink-500 tracking-wide">Your shares</p>
          <p className="text-2xl font-bold text-seed-950 mt-1"><MoneyText kobo={current} /></p>
          {!data.meetsMinimum && (
            <p className="text-xs text-warning mt-2">Below minimum — buy at least <MoneyText kobo={minNeeded} /></p>
          )}
          {data.meetsMinimum && (
            <p className="text-xs text-success mt-2">Minimum share capital met</p>
          )}
        </div>
        <div className="bg-white border border-ink-200 rounded-[14px] p-5">
          <p className="text-xs uppercase text-ink-500 tracking-wide">Deposit wallet</p>
          <p className="text-2xl font-bold text-seed-950 mt-1"><MoneyText kobo={data.depositBalanceKobo} /></p>
          <p className="text-xs text-ink-500 mt-2">Fund shares from your deposit wallet</p>
        </div>
        <div className="bg-white border border-ink-200 rounded-[14px] p-5">
          <p className="text-xs uppercase text-ink-500 tracking-wide">Your referral code</p>
          <p className="text-lg font-mono font-bold text-seed-800 mt-1">
            {data.referralCode || member?.referralCode || member?.membershipNumber || '—'}
          </p>
          <p className="text-xs text-ink-500 mt-2">Same as your member number — share it so others can join free</p>
        </div>
      </div>

      <form onSubmit={buy} className="bg-white border border-ink-200 rounded-[14px] p-6 space-y-4 max-w-md">
        <h2 className="font-semibold text-seed-950">Buy shares</h2>
        <div>
          <label className="block text-sm font-medium mb-1">Amount (₦)</label>
          <input
            type="number"
            min={minNeeded > 0 ? minNeeded / 100 : 1}
            step="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-3 py-2 border border-ink-200 rounded-[8px] outline-none focus:ring-2 focus:ring-seed-500"
            placeholder={minNeeded > 0 ? String(minNeeded / 100) : '10000'}
          />
          {minNeeded > 0 && (
            <p className="text-xs text-ink-500 mt-1">First purchase must reach the ₦20,000 minimum.</p>
          )}
        </div>
        <button
          type="submit"
          disabled={busy}
          className="bg-seed-800 text-white px-4 py-2.5 rounded-[8px] text-sm font-medium hover:bg-seed-700 disabled:opacity-50"
        >
          {busy ? 'Processing…' : 'Buy from deposit wallet'}
        </button>
      </form>

      <div className="bg-white border border-ink-200 rounded-[14px] overflow-hidden">
        <div className="px-6 py-4 border-b border-ink-100 font-semibold">Purchase history</div>
        {(!data.history || data.history.length === 0) ? (
          <p className="p-6 text-sm text-ink-500">No share purchases yet.</p>
        ) : (
          <ul className="divide-y divide-ink-100">
            {data.history.map((h: any) => (
              <li key={h.id} className="px-6 py-3 flex justify-between text-sm">
                <div>
                  <span className="font-mono text-xs text-ink-500">{h.reference}</span>
                  <div className="text-ink-600">{new Date(h.date * 1000).toLocaleString()}</div>
                </div>
                <MoneyText kobo={h.amountKobo} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
