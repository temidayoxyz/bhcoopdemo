import { useOutletContext, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { MoneyText } from '../../components/money/MoneyText';
import { ReceiptModal, type ReceiptData } from '../../components/money/ReceiptModal';

export function MemberLoans() {
  const { member, refreshMember } = useOutletContext<{ member: any; refreshMember?: () => void }>();
  const [data, setData] = useState<any>(null);
  const [selectedLoan, setSelectedLoan] = useState<any>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [repayAmount, setRepayAmount] = useState('');
  const [repaying, setRepaying] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  const fetchDashboard = () => {
    fetch('/api/members/dashboard')
      .then((res) => res.json())
      .then((d) => {
        setData(d);
        if (d.loans && d.loans.length > 0) {
          if (selectedLoan) {
            const updated = d.loans.find((l: any) => l.id === selectedLoan.id);
            setSelectedLoan(updated || d.loans[0]);
          } else {
            setSelectedLoan(d.loans[0]);
          }
        } else {
          setSelectedLoan(null);
        }
      });
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  useEffect(() => {
    if (selectedLoan && selectedLoan.status === 'ACTIVE') {
      const outstanding = selectedLoan.totalDueKobo - selectedLoan.paidKobo;
      setRepayAmount(outstanding > 0 ? String(outstanding / 100) : '');
    } else {
      setRepayAmount('');
    }
  }, [selectedLoan?.id, selectedLoan?.paidKobo, selectedLoan?.status]);

  const handleCancelLoan = async (loanId: string) => {
    setIsCancelling(true);
    try {
      const res = await fetch(`/api/members/loans/${loanId}/cancel`, { method: 'POST' });
      const resData = await res.json();
      if (resData.success) {
        toast.success('Loan application cancelled successfully.');
        fetchDashboard();
      } else {
        toast.error(resData.error || 'Failed to cancel loan application');
      }
    } catch {
      toast.error('An error occurred during cancellation');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleRepay = async () => {
    if (!selectedLoan) return;
    const amountKobo = Math.round(parseFloat(repayAmount) * 100);
    if (!amountKobo || amountKobo <= 0) return toast.error('Enter a valid amount');
    setRepaying(true);
    try {
      const res = await fetch(`/api/members/loans/${selectedLoan.id}/repay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountKobo }),
      });
      const d = await res.json();
      if (d.success) {
        toast.success(`Repayment of ₦${(amountKobo / 100).toLocaleString()} recorded · ${d.reference}`);
        if (d.receipt) setReceipt(d.receipt);
        fetchDashboard();
        refreshMember?.();
      } else {
        toast.error(d.error || 'Repayment failed');
      }
    } catch {
      toast.error('Repayment failed');
    } finally {
      setRepaying(false);
    }
  };

  if (!data) return <div>Loading...</div>;

  const depositKobo = data.member?.depositBalanceKobo ?? member?.depositBalanceKobo ?? 0;
  const outstanding = selectedLoan
    ? Math.max(0, selectedLoan.totalDueKobo - selectedLoan.paidKobo)
    : 0;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20 md:pb-0">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-seed-950">Loans</h1>
          <p className="text-ink-600 mt-1">Manage your active loans and new applications.</p>
        </div>
        <Link
          to="/member/loans/apply"
          className="bg-seed-800 text-white px-5 py-2.5 rounded-[10px] font-medium hover:bg-seed-700 transition-colors text-sm"
        >
          Apply for loan
        </Link>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white rounded-[10px] border border-ink-200 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-200px)]">
          <div className="px-6 py-4 border-b border-ink-200 bg-ink-50">
            <h3 className="font-semibold text-seed-950">Active loans & history</h3>
          </div>
          <div className="overflow-y-auto flex-1 divide-y divide-ink-100">
            {data.loans.length === 0 ? (
              <div className="p-8 text-center text-ink-500 text-sm">No loans found.</div>
            ) : (
              data.loans.map((loan: any) => (
                <div
                  key={loan.id}
                  onClick={() => setSelectedLoan(loan)}
                  className={`p-4 cursor-pointer hover:bg-ivory-50 transition-colors ${
                    selectedLoan?.id === loan.id
                      ? 'bg-seed-50 border-l-4 border-seed-600'
                      : 'border-l-4 border-transparent'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-semibold text-seed-950 text-sm">{loan.reference}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        loan.status === 'ACTIVE'
                          ? 'bg-success/10 text-success'
                          : loan.status === 'COMPLETED'
                            ? 'bg-ink-100 text-ink-600'
                            : loan.status === 'CANCELLED' || loan.status === 'REJECTED'
                              ? 'bg-danger/10 text-danger'
                              : 'bg-warning/10 text-warning'
                      }`}
                    >
                      {loan.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="text-xs text-ink-600">
                    ₦{(loan.principalKobo / 100).toLocaleString()} · {loan.termMonths} months
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          {selectedLoan ? (
            <div className="bg-white rounded-[10px] border border-ink-200 shadow-sm overflow-hidden h-full flex flex-col">
              <div className="px-6 py-4 border-b border-ink-200 bg-ink-50 flex justify-between items-center">
                <h3 className="font-semibold text-seed-950">Loan details</h3>
                <span className="text-sm font-mono text-ink-600">{selectedLoan.reference}</span>
              </div>

              <div className="p-6 flex-1 overflow-y-auto space-y-8">
                <section>
                  <h4 className="text-sm font-semibold text-seed-800 uppercase tracking-wider mb-4 border-b border-ink-100 pb-2">
                    Financials
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-ink-600 mb-1">Principal</p>
                      <p className="font-medium tabular-nums">
                        <MoneyText kobo={selectedLoan.principalKobo} />
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-ink-600 mb-1">Total due</p>
                      <p className="font-medium tabular-nums">
                        <MoneyText kobo={selectedLoan.totalDueKobo} />
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-ink-600 mb-1">Paid</p>
                      <p className="font-medium tabular-nums text-success">
                        <MoneyText kobo={selectedLoan.paidKobo || 0} />
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-ink-600 mb-1">Outstanding</p>
                      <p className="font-medium tabular-nums text-seed-900">
                        <MoneyText kobo={outstanding} />
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-ink-500 mt-3">
                    Term: {selectedLoan.termMonths} months · Status:{' '}
                    {selectedLoan.status.replace(/_/g, ' ')}
                  </p>
                </section>

                {selectedLoan.status === 'ACTIVE' && outstanding > 0 && (
                  <section className="bg-seed-50 border border-seed-100 rounded-[12px] p-4 space-y-3">
                    <h4 className="text-sm font-semibold text-seed-950">Repay from deposit wallet</h4>
                    <p className="text-xs text-ink-600">
                      Available deposit:{' '}
                      <strong>
                        <MoneyText kobo={depositKobo} />
                      </strong>
                      . Top up under Deposits if needed.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 items-end">
                      <div className="flex-1 w-full">
                        <label className="block text-xs font-medium text-ink-600 mb-1">
                          Amount (₦)
                        </label>
                        <input
                          type="number"
                          min="1"
                          step="0.01"
                          value={repayAmount}
                          onChange={(e) => setRepayAmount(e.target.value)}
                          className="w-full px-3 py-2 border border-ink-200 rounded-[8px] text-sm bg-white"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setRepayAmount(String(outstanding / 100))}
                        className="text-xs text-seed-800 underline sm:mb-2"
                      >
                        Full balance
                      </button>
                      <button
                        type="button"
                        disabled={repaying}
                        onClick={handleRepay}
                        className="w-full sm:w-auto bg-seed-800 text-white px-5 py-2.5 rounded-[8px] text-sm font-medium hover:bg-seed-700 disabled:opacity-50"
                      >
                        {repaying ? 'Processing…' : 'Repay from deposit'}
                      </button>
                    </div>
                  </section>
                )}

                <section>
                  <h4 className="text-sm font-semibold text-seed-800 uppercase tracking-wider mb-4 border-b border-ink-100 pb-2">
                    Status & actions
                  </h4>
                  <div className="flex justify-between items-center bg-ivory-50 p-4 rounded-[8px] border border-ink-200 gap-3">
                    <p className="text-sm text-ink-800">
                      {['PENDING_FS', 'PENDING_ADMIN', 'PENDING_SUPER', 'PENDING_APPROVAL'].includes(
                        selectedLoan.status,
                      )
                        ? 'Your loan is in the approval chain (Financial Secretary → Admin → Super Admin).'
                        : selectedLoan.status === 'CANCELLED'
                          ? 'This loan application was cancelled.'
                          : selectedLoan.status === 'COMPLETED'
                            ? 'This loan is fully repaid.'
                            : `This loan is ${selectedLoan.status.toLowerCase().replace(/_/g, ' ')}.`}
                    </p>
                    {['PENDING_APPROVAL', 'PENDING_FS'].includes(selectedLoan.status) && (
                      <button
                        onClick={() => handleCancelLoan(selectedLoan.id)}
                        disabled={isCancelling}
                        className="px-4 py-2 text-xs font-semibold text-danger border border-danger/30 rounded-[8px] bg-white hover:bg-danger/5 transition-colors disabled:opacity-50 shrink-0"
                      >
                        {isCancelling ? 'Cancelling…' : 'Cancel application'}
                      </button>
                    )}
                  </div>
                </section>

                {selectedLoan.guarantors && selectedLoan.guarantors.length > 0 && (
                  <section>
                    <h4 className="text-sm font-semibold text-seed-800 uppercase tracking-wider mb-4 border-b border-ink-100 pb-2">
                      Guarantors
                    </h4>
                    <div className="space-y-3">
                      {selectedLoan.guarantors.map((g: any) => (
                        <div
                          key={g.id}
                          className="flex justify-between items-center bg-ivory-50 p-3 rounded-[8px] border border-ink-200"
                        >
                          <div>
                            <p className="text-sm font-medium text-seed-950">
                              {g.member?.firstName} {g.member?.lastName}
                            </p>
                            <p className="text-xs font-mono text-ink-600">
                              {g.member?.membershipNumber}
                            </p>
                          </div>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              g.status === 'ACCEPTED'
                                ? 'bg-success/10 text-success'
                                : 'bg-warning/10 text-warning'
                            }`}
                          >
                            {g.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center border-2 border-dashed border-ink-200 rounded-[10px] text-ink-500 min-h-[300px]">
              Select a loan to view details
            </div>
          )}
        </div>
      </div>
      <ReceiptModal receipt={receipt} onClose={() => setReceipt(null)} />
    </div>
  );
}
