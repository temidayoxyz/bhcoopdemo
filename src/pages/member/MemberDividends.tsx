import { useEffect, useState } from 'react';
import { MoneyText } from '../../components/money/MoneyText';

export function MemberDividends() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch('/api/members/dividends').then((r) => r.json()).then(setData);
  }, []);

  if (!data) return <div>Loading…</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 md:pb-0">
      <header>
        <h1 className="text-2xl font-bold text-seed-950">Dividends</h1>
        <p className="text-ink-600 mt-1">Your share of cooperative surplus distributions.</p>
      </header>

      <div className="bg-white rounded-[14px] border border-ink-200 overflow-hidden">
        {data.allocations.length === 0 ? (
          <div className="p-12 text-center text-ink-500">No dividend allocations yet.</div>
        ) : (
          <div className="divide-y divide-ink-100">
            {data.allocations.map((a: any) => (
              <div key={a.id} className="p-5 flex justify-between items-center gap-4">
                <div>
                  <p className="font-semibold text-seed-950">{a.period?.label || 'Dividend'}</p>
                  <p className="text-xs text-ink-500 mt-1">
                    {a.paidAt ? new Date(a.paidAt * 1000).toLocaleDateString() : '—'} · {a.status}
                  </p>
                </div>
                <p className="text-lg font-bold text-success"><MoneyText kobo={a.amountKobo} /></p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-ivory-50 border border-ink-200 rounded-[12px] p-5">
        <h3 className="font-semibold text-seed-950 mb-2">Open surplus periods</h3>
        <ul className="space-y-2 text-sm text-ink-700">
          {data.periods.map((p: any) => (
            <li key={p.id} className="flex justify-between">
              <span>{p.label}</span>
              <span className="font-medium">{p.status} · <MoneyText kobo={p.surplusKobo} /></span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
