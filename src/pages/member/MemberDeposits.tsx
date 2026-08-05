import { useOutletContext } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { MoneyText } from '../../components/money/MoneyText';
import { CopyableRef } from '../../components/money/CopyableRef';
import { ReceiptModal, type ReceiptData } from '../../components/money/ReceiptModal';
import { DepositAllocationModal } from '../../components/money/DepositAllocationModal';
import { nairaToKobo } from '../../lib/money';

export function MemberDeposits() {
  const { member, refreshMember } = useOutletContext<{ member: any; refreshMember?: () => void }>();
  const [requests, setRequests] = useState<any[]>([]);
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [isAllocationOpen, setIsAllocationOpen] = useState(false);

  const fetchRequests = () => {
    fetch('/api/members/funds').then((res) => res.json()).then((data) => {
      setRequests((data.requests || []).filter((r: any) => r.type === 'DEPOSIT'));
    });
  };

  useEffect(() => { fetchRequests(); }, []);

  const submit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    const amountKobo = nairaToKobo(parseFloat(amount));
    if (amountKobo <= 0) return toast.error('Enter a valid amount');
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/members/funds/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'DEPOSIT', amountKobo, notes: 'Member deposit to wallet' }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Deposit credited to your Deposit Wallet balance!');
        if (data.receipt) setReceipt(data.receipt);
        setAmount('');
        fetchRequests();
        refreshMember?.();
      } else toast.error(data.error || 'Failed');
    } catch {
      toast.error('Request failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20 md:pb-0">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-seed-950">Deposit Wallet</h1>
          <p className="text-ink-600 mt-1">
            Liquid Deposit Balance: <strong className="text-seed-900"><MoneyText kobo={member.depositBalanceKobo || 0} /></strong>
            {' · '}
            Thrift Savings: <strong><MoneyText kobo={member.totalContributionsKobo} /></strong>
          </p>
        </div>

        <button
          onClick={() => setIsAllocationOpen(true)}
          className="inline-flex items-center justify-center gap-2 bg-seed-800 text-white px-5 py-2.5 rounded-[10px] text-sm font-semibold hover:bg-seed-700 shadow-sm"
        >
          <span>💸</span> Allocate / Share Funds
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-[10px] border border-ink-200 shadow-sm p-6 h-fit">
          <h3 className="font-semibold text-seed-950 mb-1">Top Up Deposit Wallet</h3>
          <p className="text-xs text-ink-500 mb-4">Funds deposited here can be allocated to Savings, Share Capital, or Loan Repayments.</p>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Amount (₦)</label>
              <input
                type="number"
                required
                min="1"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 border border-ink-200 rounded-[8px] outline-none"
                placeholder="e.g. 50000"
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 bg-seed-800 text-white rounded-[8px] text-sm font-medium hover:bg-seed-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Processing…' : 'Credit Deposit Wallet'}
            </button>
          </form>
        </div>

        <div className="lg:col-span-2 bg-white rounded-[10px] border border-ink-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-ink-200 bg-ink-50 font-semibold flex justify-between items-center">
            <span>Deposit Funding History</span>
            <span className="text-xs text-ink-500 font-normal">All top ups to deposit wallet</span>
          </div>
          <div className="divide-y divide-ink-100">
            {requests.length === 0 ? (
              <div className="p-8 text-center text-ink-500">No deposits yet.</div>
            ) : requests.map((r) => (
              <div key={r.id} className="p-4 flex justify-between items-center">
                <div>
                  <CopyableRef value={r.reference} />
                  <p className="text-xs text-ink-500 mt-1">{new Date(r.requestedAt * 1000).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <MoneyText kobo={r.amountKobo} className="font-semibold" />
                  <p className="text-xs text-success mt-1">{r.status}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <ReceiptModal receipt={receipt} onClose={() => setReceipt(null)} />
      <DepositAllocationModal
        isOpen={isAllocationOpen}
        onClose={() => setIsAllocationOpen(false)}
        member={member}
        onSuccess={() => {
          fetchRequests();
          refreshMember?.();
        }}
      />
    </div>
  );
}

