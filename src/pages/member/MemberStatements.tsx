import { useEffect, useState } from 'react';
import { FileText } from 'lucide-react';
import { MoneyText } from '../../components/money/MoneyText';
import { CopyableRef } from '../../components/money/CopyableRef';

export function MemberStatements() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch('/api/members/statements').then((r) => r.json()).then(setData);
  }, []);

  if (!data) return <div>Loading statement…</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 md:pb-0">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-seed-950">Account statement</h1>
          <p className="text-ink-600 mt-1">
            {data.member.firstName} {data.member.lastName} · {data.member.membershipNumber}
          </p>
        </div>
        <div className="bg-white border border-ink-200 rounded-[12px] px-5 py-3">
          <p className="text-xs uppercase text-ink-500 font-semibold">Thrift balance</p>
          <p className="text-2xl font-bold"><MoneyText kobo={data.balanceKobo} /></p>
        </div>
      </header>

      <div className="bg-white rounded-[14px] border border-ink-200 overflow-hidden shadow-sm">
        <div className="px-5 py-3 border-b border-ink-100 flex items-center gap-2 bg-ink-50 font-semibold text-sm">
          <FileText className="w-4 h-4 text-seed-700" /> Transaction history
        </div>
        {data.lines.length === 0 ? (
          <div className="p-12 text-center text-ink-500">No transactions yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-ink-500 bg-ivory-50">
                <tr>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Reference</th>
                  <th className="px-4 py-3 text-left">Description</th>
                  <th className="px-4 py-3 text-right">Amount</th>
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
                    <td className="px-4 py-3 text-ink-700">{line.description || line.type.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3 text-right font-medium">
                      <MoneyText kobo={line.amountKobo} />
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      <MoneyText kobo={line.runningBalanceKobo} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
