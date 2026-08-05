import { useOutletContext } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { MoneyText } from '../../components/money/MoneyText';

export function MemberWithdrawals() {
  const { member, refreshMember } = useOutletContext<{ member: any; refreshMember?: () => void }>();
  const [requests, setRequests] = useState<any[]>([]);
  const [amount, setAmount] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchRequests = () => {
    fetch('/api/members/funds').then((res) => res.json()).then((data) => {
      setRequests((data.requests || []).filter((r: any) => r.type === 'WITHDRAWAL'));
    }).catch(() => {});
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    const amountKobo = Math.round(parseFloat(amount) * 100);
    if (isNaN(amountKobo) || amountKobo <= 0) return toast.error('Invalid amount');
    const wallet = member.depositBalanceKobo || 0;
    if (amountKobo > wallet) return toast.error('Insufficient deposit wallet balance');
    if (!bankName.trim() || !accountNumber.trim()) {
      return toast.error('Please provide valid bank details');
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/members/funds/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'WITHDRAWAL',
          amountKobo,
          notes: `Bank: ${bankName} | Acct: ${accountNumber}`,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Withdrawal completed · ${data.reference}`);
        setAmount('');
        setBankName('');
        setAccountNumber('');
        fetchRequests();
        refreshMember?.();
      } else {
        toast.error(data.error || 'Failed to withdraw');
      }
    } catch {
      toast.error('An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20 md:pb-0">
      <header>
        <h1 className="text-2xl font-bold text-seed-950">Withdrawals</h1>
        <p className="text-ink-600 mt-1">
          Withdraw instantly from your <strong>deposit wallet</strong> only. Contributions and shares cannot be withdrawn.
          No staff approval is required — admins can still see every transaction.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white rounded-[10px] border border-ink-200 shadow-sm p-6 h-fit">
          <h3 className="font-semibold text-seed-950 mb-4">Withdraw to bank</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-ivory-50 p-4 rounded-[8px] border border-ink-200 mb-2">
              <p className="text-xs text-ink-600 uppercase tracking-wider mb-1">Deposit wallet balance</p>
              <p className="font-bold text-2xl text-seed-950 tabular-nums">
                <MoneyText kobo={member.depositBalanceKobo || 0} />
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-ink-950">Amount (₦)</label>
              <input
                type="number"
                required
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 border border-ink-200 rounded-[8px] outline-none focus:border-seed-600 focus:ring-1 focus:ring-seed-600 transition-all text-sm"
                placeholder="e.g. 50000"
              />
            </div>

            <div className="pt-2 border-t border-ink-100 space-y-3">
              <h4 className="text-sm font-semibold text-ink-950">Bank details</h4>
              <div>
                <label className="block text-xs font-medium text-ink-600 mb-1">Bank name</label>
                <input
                  type="text"
                  required
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full px-3 py-2 border border-ink-200 rounded-[8px] outline-none text-sm"
                  placeholder="e.g. GTBank"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-600 mb-1">Account number</label>
                <input
                  type="text"
                  required
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-ink-200 rounded-[8px] outline-none text-sm"
                  placeholder="e.g. 0123456789"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 bg-seed-800 text-white rounded-[8px] text-sm font-medium hover:bg-seed-700 transition-colors mt-4"
            >
              {isSubmitting ? 'Processing…' : 'Withdraw now'}
            </button>
          </form>
        </div>

        <div className="lg:col-span-2 bg-white rounded-[10px] border border-ink-200 shadow-sm overflow-hidden flex flex-col min-h-[400px]">
          <div className="px-6 py-4 border-b border-ink-200 bg-ink-50">
            <h3 className="font-semibold text-seed-950">Withdrawal history</h3>
          </div>
          <div className="overflow-y-auto flex-1 divide-y divide-ink-100">
            {requests.length === 0 ? (
              <div className="p-8 text-center text-ink-500 text-sm">No withdrawals yet.</div>
            ) : (
              requests.map((req) => (
                <div key={req.id} className="p-4 flex items-center justify-between hover:bg-ivory-50">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-seed-950 text-sm">{req.reference}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-success/10 text-success">
                        {req.status}
                      </span>
                    </div>
                    <span className="text-xs text-ink-600 block mb-1">
                      {new Date(req.requestedAt * 1000).toLocaleString()}
                    </span>
                    {req.notes && (
                      <span className="text-[11px] bg-ink-100 px-2 py-0.5 rounded text-ink-700 font-mono">
                        {req.notes}
                      </span>
                    )}
                  </div>
                  <p className="font-medium tabular-nums">
                    <MoneyText kobo={req.amountKobo} />
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
