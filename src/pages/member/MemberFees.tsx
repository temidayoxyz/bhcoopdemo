import { useOutletContext } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { MoneyText } from '../../components/money/MoneyText';

export function MemberFees() {
  const { refreshMember } = useOutletContext<{ refreshMember?: () => void }>();
  const [data, setData] = useState<any>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = () => fetch('/api/members/fees').then((r) => r.json()).then(setData);
  useEffect(() => { load(); }, []);

  const pay = async (feeId: string) => {
    setBusy(feeId);
    try {
      const res = await fetch('/api/members/fees/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feeId }),
      });
      const d = await res.json();
      if (d.success) {
        toast.success(`Development fee paid · ${d.reference}`);
        load();
        refreshMember?.();
      } else toast.error(d.error || 'Payment failed');
    } catch {
      toast.error('Something went wrong');
    } finally {
      setBusy(null);
    }
  };

  if (!data) return <div>Loading…</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20 md:pb-0">
      <header>
        <h1 className="text-2xl font-bold text-seed-950">Fees</h1>
        <p className="text-ink-600 mt-1">
          Annual development fee is compulsory by 31 March. Residents pay ₦6,000; non-residents / diaspora pay ₦12,000.
          Non-payment after the deadline suspends membership.
        </p>
      </header>

      <div className="bg-ivory-50 border border-ink-200 rounded-[10px] px-4 py-3 text-sm">
        Your residency class:{' '}
        <strong>{data.residency === 'NON_RESIDENT' ? 'Non-resident' : 'Resident'}</strong>
      </div>

      <div className="bg-white border border-ink-200 rounded-[14px] overflow-hidden">
        <div className="px-6 py-4 border-b border-ink-100 font-semibold">Development fee obligations</div>
        {(!data.fees || data.fees.length === 0) ? (
          <p className="p-6 text-sm text-ink-500">No fee records yet.</p>
        ) : (
          <ul className="divide-y divide-ink-100">
            {data.fees.map((f: any) => (
              <li key={f.id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="font-medium text-seed-950">{f.year} Development Fee</div>
                  <div className="text-sm text-ink-600">
                    Due {new Date(f.dueAt * 1000).toLocaleDateString()} · <MoneyText kobo={f.amountKobo} />
                  </div>
                  <span className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    f.status === 'PAID' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
                  }`}>{f.status}</span>
                </div>
                {f.status === 'UNPAID' && (
                  <button
                    type="button"
                    disabled={busy === f.id}
                    onClick={() => pay(f.id)}
                    className="bg-seed-800 text-white px-4 py-2 rounded-[8px] text-sm font-medium hover:bg-seed-700 disabled:opacity-50"
                  >
                    {busy === f.id ? 'Paying…' : 'Pay from deposit wallet'}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
