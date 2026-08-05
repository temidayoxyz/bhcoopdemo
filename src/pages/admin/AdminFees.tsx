import { useEffect, useState } from 'react';
import { MoneyText } from '../../components/money/MoneyText';

export function AdminFees() {
  const [fees, setFees] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/admin/fees')
      .then((r) => r.json())
      .then((d) => setFees(d.fees || []));
  }, []);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-seed-950">Development fees</h1>
        <p className="text-ink-600 mt-1">
          Compulsory by 31 March each year — ₦6,000 resident / ₦12,000 non-resident. Unpaid after deadline → suspended.
        </p>
      </header>

      <div className="bg-white border border-ink-200 rounded-[14px] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-ink-50 text-xs uppercase text-ink-600">
            <tr>
              <th className="px-4 py-3 text-left">Member</th>
              <th className="px-4 py-3 text-left">Year</th>
              <th className="px-4 py-3 text-left">Residency</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {fees.map((f) => (
              <tr key={f.id}>
                <td className="px-4 py-3">
                  {f.member ? `${f.member.firstName} ${f.member.lastName}` : '—'}
                  <div className="text-xs font-mono text-ink-500">{f.member?.membershipNumber}</div>
                </td>
                <td className="px-4 py-3">{f.year}</td>
                <td className="px-4 py-3">{f.member?.residency || '—'}</td>
                <td className="px-4 py-3 text-right"><MoneyText kobo={f.amountKobo} /></td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      f.status === 'PAID' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
                    }`}
                  >
                    {f.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
