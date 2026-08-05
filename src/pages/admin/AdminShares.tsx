import { useEffect, useState } from 'react';
import { MoneyText } from '../../components/money/MoneyText';

export function AdminShares() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch('/api/admin/shares').then((r) => r.json()).then(setData);
  }, []);

  if (!data) return <div>Loading…</div>;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-seed-950">Share capital</h1>
        <p className="text-ink-600 mt-1">
          Minimum holding <MoneyText kobo={data.minSharesKobo} />. Dividends are weighted by share capital.
        </p>
      </header>

      <div className="bg-white border border-ink-200 rounded-[14px] p-6">
        <p className="text-xs uppercase text-ink-500">Total share capital</p>
        <p className="text-3xl font-bold text-seed-950 mt-1">
          <MoneyText kobo={data.totalShareCapitalKobo} />
        </p>
      </div>

      <div className="bg-white border border-ink-200 rounded-[14px] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-ink-50 text-xs uppercase text-ink-600">
            <tr>
              <th className="px-4 py-3 text-left">Member</th>
              <th className="px-4 py-3 text-right">Shares</th>
              <th className="px-4 py-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {data.members.map((m: any) => (
              <tr key={m.id}>
                <td className="px-4 py-3">
                  {m.name}
                  <div className="text-xs font-mono text-ink-500">{m.membershipNumber}</div>
                </td>
                <td className="px-4 py-3 text-right font-medium">
                  <MoneyText kobo={m.sharesBalanceKobo} />
                </td>
                <td className="px-4 py-3">
                  {m.belowMinimum ? (
                    <span className="text-xs text-warning font-medium">Below minimum</span>
                  ) : (
                    <span className="text-xs text-success font-medium">OK</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
