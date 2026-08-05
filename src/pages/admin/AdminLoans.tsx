import { useOutletContext } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { can, normalizeRole } from '../../lib/roles';
import { MoneyText } from '../../components/money/MoneyText';
import { CopyableRef } from '../../components/money/CopyableRef';
import { ReceiptModal, type ReceiptData } from '../../components/money/ReceiptModal';
import { ApprovalTimeline } from '../../components/money/ApprovalTimeline';
import { canActOnStep } from '../../lib/coop/approvals';

export function AdminLoans() {
  const { user } = useOutletContext<{ user: any }>();
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [loans, setLoans] = useState<any[]>([]);
  const [selectedLoan, setSelectedLoan] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchLoans = () => {
    fetch('/api/admin/loans').then((res) => res.json()).then((data) => {
      const fetchedLoans = data.loans || [];
      setLoans(fetchedLoans);
      if (selectedLoan) {
        const updated = fetchedLoans.find((l: any) => l.id === selectedLoan.id);
        setSelectedLoan(updated || fetchedLoans[0] || null);
      } else if (fetchedLoans.length > 0) {
        setSelectedLoan(fetchedLoans[0]);
      }
    }).catch(() => {});
  };

  useEffect(() => {
    fetchLoans();
  }, []);

  const chainStep = (loan: any) => {
    if (loan.approval?.step) return loan.approval.step;
    if (loan.status === 'PENDING_APPROVAL') return 'PENDING_FS';
    return loan.status;
  };

  const handleChain = async (action: 'approve' | 'reject') => {
    if (!selectedLoan) return;
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/admin/loans/${selectedLoan.id}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: action === 'reject' ? 'Rejected in review' : null }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.disbursed) toast.success('Loan fully approved and disbursed');
        else if (action === 'reject') toast.success('Loan rejected');
        else toast.success(`Advanced to ${data.step}`);
        if (data.receipt) setReceipt(data.receipt);
        fetchLoans();
      } else {
        toast.error(data.error || 'Action failed');
      }
    } catch {
      toast.error('An error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  const role = normalizeRole(user?.role);
  const pendingSteps = ['PENDING_FS', 'PENDING_ADMIN', 'PENDING_SUPER', 'PENDING_APPROVAL'];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-seed-950">Loan Administration</h1>
        <p className="text-ink-600 mt-1">
          Money-out chain: Financial Secretary → Admin → Super Admin (final approval disburses).
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white rounded-[10px] border border-ink-200 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-200px)]">
          <div className="p-4 border-b border-ink-200 bg-ink-50 text-sm font-medium text-ink-700">
            All loans
          </div>
          <div className="overflow-y-auto flex-1 divide-y divide-ink-100">
            {loans.length === 0 ? (
              <div className="p-8 text-center text-ink-500 text-sm">No loans found.</div>
            ) : (
              loans.map((loan) => (
                <div
                  key={loan.id}
                  onClick={() => setSelectedLoan(loan)}
                  className={`p-4 cursor-pointer hover:bg-ivory-50 transition-colors ${
                    selectedLoan?.id === loan.id ? 'bg-seed-50 border-l-4 border-seed-600' : 'border-l-4 border-transparent'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-semibold text-seed-950 text-sm">{loan.reference}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-ink-100 text-ink-700">
                      {loan.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="text-xs text-ink-600 mt-1">
                    {loan.member?.firstName} {loan.member?.lastName} · {loan.member?.membershipNumber}
                  </div>
                  <div className="text-xs text-ink-600">
                    <MoneyText kobo={loan.principalKobo} />
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
                <div>
                  <h3 className="font-semibold text-seed-950">Loan details</h3>
                  <p className="text-xs text-ink-600 mt-1">
                    {selectedLoan.member?.firstName} {selectedLoan.member?.lastName} ·{' '}
                    {selectedLoan.member?.membershipNumber}
                  </p>
                </div>
                <CopyableRef value={selectedLoan.reference} />
              </div>

              <div className="p-6 flex-1 overflow-y-auto space-y-8">
                <section>
                  <h4 className="text-sm font-semibold text-seed-800 uppercase tracking-wider mb-4 border-b border-ink-100 pb-2">
                    Financials
                  </h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-ink-600 mb-1">Principal</p>
                      <p className="font-medium">
                        <MoneyText kobo={selectedLoan.principalKobo} />
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-ink-600 mb-1">Total due</p>
                      <p className="font-medium">
                        <MoneyText kobo={selectedLoan.totalDueKobo} />
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-ink-600 mb-1">Term</p>
                      <p className="font-medium">{selectedLoan.termMonths} months</p>
                    </div>
                  </div>
                </section>

                <section>
                  <ApprovalTimeline approval={selectedLoan.approval || { step: chainStep(selectedLoan) }} />
                </section>

                <section>
                  <h4 className="text-sm font-semibold text-seed-800 uppercase tracking-wider mb-4 border-b border-ink-100 pb-2">
                    Guarantors
                  </h4>
                  {selectedLoan.guarantors && selectedLoan.guarantors.length > 0 ? (
                    <div className="space-y-3">
                      {selectedLoan.guarantors.map((g: any, i: number) => (
                        <div key={i} className="flex justify-between items-center p-3 border border-ink-200 rounded-[8px]">
                          <div>
                            <p className="text-sm font-medium">
                              {g.member?.firstName} {g.member?.lastName}
                            </p>
                            <p className="text-xs text-ink-600">{g.member?.membershipNumber}</p>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-success/10 text-success">
                            {g.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-ink-500">No guarantors required or recorded.</p>
                  )}
                </section>
              </div>

              {pendingSteps.includes(selectedLoan.status) &&
                canActOnStep(role, chainStep(selectedLoan) as any) && (
                  <div className="px-6 py-4 border-t border-ink-200 bg-ivory-50 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => handleChain('reject')}
                      disabled={isProcessing}
                      className="px-4 py-2 text-sm font-medium text-danger border border-danger/30 rounded-[8px] hover:bg-danger/5"
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      onClick={() => handleChain('approve')}
                      disabled={isProcessing}
                      className="px-6 py-2 text-sm font-medium text-white bg-seed-800 rounded-[8px] hover:bg-seed-700"
                    >
                      {isProcessing
                        ? 'Processing…'
                        : chainStep(selectedLoan) === 'PENDING_SUPER'
                          ? 'Final approve & disburse'
                          : 'Approve this step'}
                    </button>
                  </div>
                )}

              {pendingSteps.includes(selectedLoan.status) &&
                !canActOnStep(role, chainStep(selectedLoan) as any) && (
                  <div className="px-6 py-3 border-t border-ink-200 bg-ink-50 text-xs text-ink-600">
                    Waiting on the next role in the chain. Super Admin may advance any pending step for demos.
                  </div>
                )}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center border-2 border-dashed border-ink-200 rounded-[10px] text-ink-500">
              Select a loan to manage
            </div>
          )}
        </div>
      </div>
      <ReceiptModal receipt={receipt} onClose={() => setReceipt(null)} />
    </div>
  );
}
