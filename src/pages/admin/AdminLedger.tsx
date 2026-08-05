import { useEffect, useState } from 'react';
import { MoneyText } from '../../components/money/MoneyText';
import { CopyableRef } from '../../components/money/CopyableRef';

export function AdminLedger() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch('/api/admin/ledger').then((r) => r.json()).then(setData);
  }, []);

  if (!data) return <div>Loading ledger…</div>;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-seed-950">General Ledger</h1>
        <p className="text-ink-600 mt-1">Double-sided co-op treasury view. Credits grow the pool; debits reduce it.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-[12px] border border-ink-200">
          <p className="text-xs uppercase text-ink-500 font-semibold">Total credits</p>
          <p className="text-2xl font-bold text-success mt-1"><MoneyText kobo={data.pool.credits} /></p>
        </div>
        <div className="bg-white p-5 rounded-[12px] border border-ink-200">
          <p className="text-xs uppercase text-ink-500 font-semibold">Total debits</p>
          <p className="text-2xl font-bold text-danger mt-1"><MoneyText kobo={data.pool.debits} /></p>
        </div>
        <div className="bg-white p-5 rounded-[12px] border border-ink-200">
          <p className="text-xs uppercase text-ink-500 font-semibold">Net pool position</p>
          <p className="text-2xl font-bold text-seed-950 mt-1"><MoneyText kobo={data.pool.net} /></p>
        </div>
      </div>

      <div className="bg-white rounded-[14px] border border-ink-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-ink-50 text-xs uppercase text-ink-600">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Member</th>
                <th className="px-4 py-3 text-right">Debit</th>
                <th className="px-4 py-3 text-right">Credit</th>
                <th className="px-4 py-3 text-right">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {data.lines.map((line: any) => (
                <tr key={line.id} className="hover:bg-ivory-50">
                  <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">
                    {new Date(line.date * 1000).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3"><CopyableRef value={line.reference} /></td>
                  <td className="px-4 py-3 text-ink-700 max-w-xs">{line.description}</td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {line.member ? line.member.membershipNumber : '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-danger">
                    {line.debitKobo ? <MoneyText kobo={line.debitKobo} /> : '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-success">
                    {line.creditKobo ? <MoneyText kobo={line.creditKobo} /> : '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">
                    <MoneyText kobo={line.runningBalanceKobo} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
