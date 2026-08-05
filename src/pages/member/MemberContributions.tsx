import { Link, useOutletContext } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { MoneyText } from '../../components/money/MoneyText';
import { ReceiptModal, type ReceiptData } from '../../components/money/ReceiptModal';

export function MemberContributions() {
  const { member, refreshMember } = useOutletContext<{ member: any; refreshMember?: () => void }>();
  const [data, setData] = useState<any>(null);
  const [paying, setPaying] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  const load = () => fetch('/api/members/dashboard').then((r) => r.json()).then(setData);

  useEffect(() => {
    load();
  }, []);

  const pay = async (obligationId: string, outstanding: number) => {
    setPaying(obligationId);
    try {
      const res = await fetch('/api/members/contributions/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          obligationId,
          amountKobo: outstanding,
          source: 'DEPOSIT_WALLET',
        }),
      });
      const d = await res.json();
      if (d.success) {
        toast.success('Monthly savings paid from deposit wallet');
        if (d.receipt) setReceipt(d.receipt);
        load();
        refreshMember?.();
      } else toast.error(d.error || 'Payment failed');
    } catch {
      toast.error('Payment failed');
    } finally {
      setPaying(null);
    }
  };

  if (!data) return <div>Loading…</div>;

  const obligations = data.obligations || [];
  const depositKobo = data.member?.depositBalanceKobo ?? member?.depositBalanceKobo ?? 0;
  const monthly = data.settings?.monthlySavingsKobo ?? 2_000_000;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20 md:pb-0">
      <header>
        <h1 className="text-2xl font-bold text-seed-950">Savings</h1>
        <p className="text-ink-600 mt-1">
          Monthly savings obligations set by the cooperative (currently{' '}
          <strong>
            <MoneyText kobo={monthly} />
          </strong>
          /month). Pay from your deposit wallet.
        </p>
        <p className="text-sm text-ink-500 mt-1">
          Total savings:{' '}
          <strong>
            <MoneyText
              kobo={data.member?.totalContributionsKobo ?? member.totalContributionsKobo}
            />
          </strong>
          {' · '}Deposit available:{' '}
          <strong>
            <MoneyText kobo={depositKobo} />
          </strong>
          {' · '}
          <Link to="/member/deposits" className="text-seed-800 font-medium">
            Top up deposit
          </Link>
          {' · '}
          <Link to="/member/shares" className="text-seed-800 font-medium">
            Shares
          </Link>
        </p>
      </header>

      <div className="bg-white rounded-[14px] border border-ink-200 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-ink-200 bg-ink-50 font-semibold">
          Monthly savings obligations
        </div>
        <div className="divide-y divide-ink-100">
          {obligations.length === 0 ? (
            <div className="p-8 text-center text-ink-500 space-y-2">
              <p>No obligations found yet.</p>
              <p className="text-sm">
                Refresh the page — the current month is created automatically from the admin monthly
                savings amount.
              </p>
              <button
                type="button"
                onClick={load}
                className="text-seed-800 text-sm font-medium underline"
              >
                Refresh
              </button>
            </div>
          ) : (
            obligations.map((ob: any) => {
              const outstanding = Math.max(0, ob.expectedAmountKobo - ob.paidAmountKobo);
              return (
                <div
                  key={ob.id}
                  className="p-6 grid grid-cols-1 md:grid-cols-4 gap-4 items-center"
                >
                  <div>
                    <p className="font-medium text-seed-950">{ob.monthPeriod}</p>
                    <p className="text-xs text-ink-600 mt-1">
                      Due {new Date(ob.dueDate * 1000).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-ink-600 uppercase tracking-wider mb-1">Expected</p>
                    <p className="font-medium">
                      <MoneyText kobo={ob.expectedAmountKobo} />
                    </p>
                    <p className="text-xs text-ink-500 mt-1">
                      Paid <MoneyText kobo={ob.paidAmountKobo} />
                    </p>
                  </div>
                  <div>
                    <span
                      className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        ob.status === 'PAID'
                          ? 'bg-success/10 text-success'
                          : ob.status === 'PARTIAL'
                            ? 'bg-warning/10 text-warning'
                            : ob.status === 'OVERDUE'
                              ? 'bg-danger/10 text-danger'
                              : 'bg-ink-100 text-ink-600'
                      }`}
                    >
                      {ob.status}
                    </span>
                  </div>
                  <div className="text-right">
                    {outstanding > 0 ? (
                      <button
                        type="button"
                        disabled={paying === ob.id}
                        onClick={() => pay(ob.id, outstanding)}
                        className="bg-seed-800 text-white px-4 py-2 rounded-[8px] text-sm font-medium hover:bg-seed-700 disabled:opacity-50"
                      >
                        {paying === ob.id ? (
                          'Paying…'
                        ) : (
                          <>
                            Pay from deposit · <MoneyText kobo={outstanding} />
                          </>
                        )}
                      </button>
                    ) : (
                      <span className="text-sm font-medium text-success">Fully paid</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <ReceiptModal receipt={receipt} onClose={() => setReceipt(null)} />
    </div>
  );
}
