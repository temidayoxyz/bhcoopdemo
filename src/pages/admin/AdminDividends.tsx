import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { toast } from 'sonner';
import { can, normalizeRole } from '../../lib/roles';
import { MoneyText } from '../../components/money/MoneyText';
import { ApprovalTimeline } from '../../components/money/ApprovalTimeline';
import { canActOnStep } from '../../lib/coop/approvals';

export function AdminDividends() {
  const { user } = useOutletContext<{ user: any }>();
  const [data, setData] = useState<any>(null);
  const [preview, setPreview] = useState<any[] | null>(null);

  const load = () => fetch('/api/admin/dividends').then((r) => r.json()).then(setData);
  useEffect(() => {
    load();
  }, []);

  const loadPreview = async (periodId: string) => {
    const res = await fetch('/api/admin/dividends/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ periodId }),
    });
    const d = await res.json();
    setPreview(d.allocations || []);
  };

  const approve = async (periodId: string) => {
    const res = await fetch(`/api/admin/dividends/${periodId}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const d = await res.json();
    if (d.success) {
      toast.success(d.executed ? `Distributed · ${d.reference}` : `Advanced to ${d.step}`);
      load();
      setPreview(null);
    } else toast.error(d.error || 'Failed');
  };

  if (!data) return <div>Loading…</div>;

  const role = normalizeRole(user?.role);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-seed-950">Dividends & surplus</h1>
        <p className="text-ink-600 mt-1">{data.formula}</p>
      </header>

      <div className="space-y-4">
        {data.periods.map((p: any) => {
          const step = p.approval?.step || (p.status === 'DECLARED' ? 'PENDING_FS' : p.status);
          const canAct =
            p.status !== 'DISTRIBUTED' &&
            p.status !== 'REJECTED' &&
            canActOnStep(role, step === 'DECLARED' ? 'PENDING_FS' : step);

          return (
            <div key={p.id} className="bg-white p-6 rounded-[14px] border border-ink-200 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-seed-950 text-lg">{p.label}</h3>
                  <p className="text-sm text-ink-600 mt-1">{p.notes}</p>
                  <div className="mt-2 flex flex-wrap gap-3 text-sm">
                    <span>
                      Surplus: <strong><MoneyText kobo={p.surplusKobo} /></strong>
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        p.status === 'DISTRIBUTED' ? 'bg-success/10 text-success' : 'bg-gold-100 text-gold-700'
                      }`}
                    >
                      {p.status}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {p.status !== 'DISTRIBUTED' && (
                    <button
                      type="button"
                      onClick={() => loadPreview(p.id)}
                      className="border border-ink-200 px-3 py-2 rounded-[8px] text-sm hover:bg-ink-50"
                    >
                      Preview by shares
                    </button>
                  )}
                  {canAct && (
                    <button
                      type="button"
                      onClick={() => approve(p.id)}
                      className="bg-seed-800 text-white px-4 py-2 rounded-[8px] text-sm font-medium hover:bg-seed-700"
                    >
                      {step === 'PENDING_SUPER' ? 'Final approve & distribute' : 'Approve this step'}
                    </button>
                  )}
                </div>
              </div>
              {p.approval && <ApprovalTimeline approval={p.approval} />}
            </div>
          );
        })}
      </div>

      {preview && (
        <div className="bg-white rounded-[14px] border border-ink-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-ink-100 font-semibold">Share-weighted preview</div>
          <table className="w-full text-sm">
            <thead className="bg-ink-50 text-xs uppercase text-ink-600">
              <tr>
                <th className="px-4 py-3 text-left">Member</th>
                <th className="px-4 py-3 text-right">Shares</th>
                <th className="px-4 py-3 text-right">Weight</th>
                <th className="px-4 py-3 text-right">Dividend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {preview.map((a) => (
                <tr key={a.memberId}>
                  <td className="px-4 py-3 font-mono text-xs">{a.membershipNumber}</td>
                  <td className="px-4 py-3 text-right"><MoneyText kobo={a.sharesBalanceKobo} /></td>
                  <td className="px-4 py-3 text-right">{(a.weightShare * 100).toFixed(1)}%</td>
                  <td className="px-4 py-3 text-right font-medium"><MoneyText kobo={a.amountKobo} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="bg-white rounded-[14px] border border-ink-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-ink-100 font-semibold">Paid allocations</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-ink-50 text-xs uppercase text-ink-600">
              <tr>
                <th className="px-4 py-3 text-left">Member</th>
                <th className="px-4 py-3 text-left">Period</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {data.allocations.map((a: any) => (
                <tr key={a.id}>
                  <td className="px-4 py-3">
                    {a.member ? `${a.member.firstName} ${a.member.lastName}` : '—'}
                    <div className="text-xs font-mono text-ink-500">{a.member?.membershipNumber}</div>
                  </td>
                  <td className="px-4 py-3">{a.period?.label}</td>
                  <td className="px-4 py-3 text-right font-medium"><MoneyText kobo={a.amountKobo} /></td>
                  <td className="px-4 py-3">{a.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
