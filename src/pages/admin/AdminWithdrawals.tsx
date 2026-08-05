import { useEffect, useState } from 'react';
import { MoneyText } from '../../components/money/MoneyText';

export function AdminWithdrawals() {
  const [requests, setRequests] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/admin/funds')
      .then((res) => res.json())
      .then((data) => {
        setRequests((data.requests || []).filter((r: any) => r.type === 'WITHDRAWAL'));
      })
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <header>
        <h1 className="text-2xl font-bold text-seed-950">Member withdrawals</h1>
        <p className="text-ink-600 mt-1">
          Deposit-wallet cash-outs complete instantly — no approval queue. This is a full transaction history for oversight.
        </p>
      </header>

      <div className="bg-white rounded-[10px] border border-ink-200 shadow-sm overflow-hidden min-h-[400px] flex flex-col">
        <div className="px-6 py-4 border-b border-ink-200 bg-ink-50">
          <h3 className="font-semibold text-seed-950">Withdrawal ledger</h3>
        </div>
        <div className="overflow-y-auto flex-1 divide-y divide-ink-100">
          {requests.length === 0 ? (
            <div className="p-8 text-center text-ink-500 text-sm">No withdrawals recorded.</div>
          ) : (
            requests.map((req) => (
              <div
                key={req.id}
                className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-ivory-50 gap-4"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-semibold text-seed-950">
                      {req.member?.firstName} {req.member?.lastName}
                    </span>
                    <span className="text-xs font-mono text-ink-600">{req.member?.membershipNumber}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-ink-600 mb-2">
                    <span className="font-mono">{req.reference}</span>
                    <span>•</span>
                    <span>{new Date(req.requestedAt * 1000).toLocaleString()}</span>
                  </div>
                  {req.notes && (
                    <div className="bg-ink-100 text-ink-800 text-xs px-3 py-1.5 rounded-[6px] inline-block font-mono border border-ink-200">
                      {req.notes}
                    </div>
                  )}
                </div>
                <div className="sm:text-right">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-success/10 text-success">
                    {req.status}
                  </span>
                  <p className="font-semibold tabular-nums text-seed-950 mt-1">
                    <MoneyText kobo={req.amountKobo} />
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
