import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { MoneyText } from './MoneyText';
import { nairaToKobo } from '../../lib/money';

interface DepositAllocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: any;
  onSuccess: () => void;
}

export function DepositAllocationModal({
  isOpen,
  onClose,
  member,
  onSuccess,
}: DepositAllocationModalProps) {
  const [contributionNaira, setContributionNaira] = useState('');
  const [loanRepaymentNaira, setLoanRepaymentNaira] = useState('');
  const [investmentNaira, setInvestmentNaira] = useState('');
  const [selectedLoanId, setSelectedLoanId] = useState('');
  const [selectedInvestmentId, setSelectedInvestmentId] = useState('');
  const [activeLoans, setActiveLoans] = useState<any[]>([]);
  const [investments, setInvestments] = useState<any[]>([]);
  const [unpaidObligations, setUnpaidObligations] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const availableDepositKobo = member?.depositBalanceKobo || 0;

  useEffect(() => {
    if (isOpen) {
      fetch('/api/members/dashboard')
        .then((res) => res.json())
        .then((data) => {
          if (data.loans) {
            const active = data.loans.filter(
              (l: any) => l.status === 'ACTIVE' || l.status === 'APPROVED',
            );
            setActiveLoans(active);
            if (active.length > 0) setSelectedLoanId(active[0].id);
          }
          if (data.obligations) {
            setUnpaidObligations(data.obligations.filter((o: any) => o.status !== 'PAID'));
          }
          if (data.investments) {
            setInvestments(data.investments);
            if (data.investments.length > 0) setSelectedInvestmentId(data.investments[0].id);
          }
        })
        .catch(console.error);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const cKobo = nairaToKobo(parseFloat(contributionNaira) || 0);
  const lKobo = nairaToKobo(parseFloat(loanRepaymentNaira) || 0);
  const iKobo = nairaToKobo(parseFloat(investmentNaira) || 0);
  const totalAllocatedKobo = cKobo + lKobo + iKobo;
  const remainingDepositKobo = availableDepositKobo - totalAllocatedKobo;

  const totalOwedObligationsKobo = unpaidObligations.reduce(
    (acc, o) => acc + (o.expectedAmountKobo - o.paidAmountKobo),
    0,
  );

  const selectedLoan = activeLoans.find((l) => l.id === selectedLoanId);
  const loanOutstandingKobo = selectedLoan
    ? selectedLoan.totalDueKobo - selectedLoan.paidKobo
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (totalAllocatedKobo <= 0) {
      return toast.error('Please enter an amount to allocate');
    }
    if (totalAllocatedKobo > availableDepositKobo) {
      return toast.error('Total allocation exceeds available Deposit Balance');
    }
    if (lKobo > 0 && !selectedLoanId) {
      return toast.error('Please select an active loan for repayment');
    }
    if (lKobo > loanOutstandingKobo) {
      return toast.error('Loan repayment exceeds loan outstanding balance');
    }
    if (iKobo > 0 && investments.length === 0) {
      return toast.error('No active cooperative investments available');
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/members/deposits/allocate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contributionKobo: cKobo,
          sharesKobo: 0,
          loanRepaymentKobo: lKobo,
          investmentKobo: iKobo,
          loanId: selectedLoanId || undefined,
          investmentId: selectedInvestmentId || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success('Funds allocated successfully');
        setContributionNaira('');
        setLoanRepaymentNaira('');
        setInvestmentNaira('');
        onSuccess();
        onClose();
      } else {
        toast.error(data.error || 'Allocation failed');
      }
    } catch {
      toast.error('An error occurred while allocating funds');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="bg-white rounded-[16px] max-w-lg w-full p-6 shadow-xl border border-ink-200 space-y-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b border-ink-100 pb-4">
          <div>
            <h2 className="text-xl font-bold text-seed-950">Allocate deposit funds</h2>
            <p className="text-xs text-ink-600 mt-0.5">
              Move deposit wallet money into savings, loan repayment, or cooperative investments.
              Buy shares under the Shares tab.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-ink-400 hover:text-ink-700 text-lg font-bold p-1 rounded-full hover:bg-ink-100"
          >
            ✕
          </button>
        </div>

        <div className="bg-seed-50 rounded-[12px] p-4 border border-seed-200 flex justify-between items-center">
          <div>
            <p className="text-xs font-semibold text-seed-800 uppercase tracking-wider">
              Deposit Wallet
            </p>
            <p className="text-2xl font-bold text-seed-950">
              <MoneyText kobo={availableDepositKobo} />
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-medium text-ink-600">Remaining after allocation</p>
            <p
              className={`text-lg font-semibold ${
                remainingDepositKobo < 0 ? 'text-danger font-bold' : 'text-seed-900'
              }`}
            >
              <MoneyText kobo={remainingDepositKobo} />
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-4 bg-ink-50/60 rounded-[12px] border border-ink-200 space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-semibold text-seed-950 flex items-center gap-1.5">
                <span>🌱</span> Savings
              </label>
              {totalOwedObligationsKobo > 0 && (
                <span className="text-[11px] font-medium text-warning bg-warning/10 px-2 py-0.5 rounded-full">
                  Due: <MoneyText kobo={totalOwedObligationsKobo} />
                </span>
              )}
            </div>
            <p className="text-xs text-ink-600">
              Transfers money into your savings and settles pending monthly obligations.
            </p>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-sm font-medium text-ink-400">₦</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={contributionNaira}
                onChange={(e) => setContributionNaira(e.target.value)}
                placeholder="0.00"
                className="w-full pl-8 pr-3 py-2 text-sm bg-white border border-ink-200 rounded-[8px] focus:ring-2 focus:ring-seed-600 outline-none"
              />
            </div>
          </div>

          <div className="p-4 bg-ink-50/60 rounded-[12px] border border-ink-200 space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-sm font-semibold text-seed-950 flex items-center gap-1.5">
                <span>💳</span> Loan repayment
              </label>
              {selectedLoan && (
                <span className="text-[11px] font-medium text-seed-800 bg-seed-100 px-2 py-0.5 rounded-full">
                  Owed: <MoneyText kobo={loanOutstandingKobo} />
                </span>
              )}
            </div>

            {activeLoans.length > 0 ? (
              <>
                <div>
                  <label className="block text-xs font-medium text-ink-600 mb-1">
                    Select active loan
                  </label>
                  <select
                    value={selectedLoanId}
                    onChange={(e) => setSelectedLoanId(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-ink-200 rounded-[8px] outline-none"
                  >
                    {activeLoans.map((loan) => (
                      <option key={loan.id} value={loan.id}>
                        {loan.reference} - Outstanding: ₦
                        {((loan.totalDueKobo - loan.paidKobo) / 100).toLocaleString()}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-sm font-medium text-ink-400">₦</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={loanRepaymentNaira}
                    onChange={(e) => setLoanRepaymentNaira(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-8 pr-3 py-2 text-sm bg-white border border-ink-200 rounded-[8px] focus:ring-2 focus:ring-seed-600 outline-none"
                  />
                </div>
              </>
            ) : (
              <p className="text-xs text-ink-500 italic">No active loan repayments required.</p>
            )}
          </div>

          <div className="p-4 bg-ink-50/60 rounded-[12px] border border-ink-200 space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-sm font-semibold text-seed-950 flex items-center gap-1.5">
                <span>📈</span> Investments
              </label>
              <span className="text-[11px] text-ink-500">
                Your stake:{' '}
                <MoneyText kobo={member?.investmentBalanceKobo || 0} />
              </span>
            </div>
            <p className="text-xs text-ink-600">
              Fund an active cooperative investment from your deposit wallet.
            </p>
            {investments.length > 0 ? (
              <>
                <div>
                  <label className="block text-xs font-medium text-ink-600 mb-1">
                    Select investment
                  </label>
                  <select
                    value={selectedInvestmentId}
                    onChange={(e) => setSelectedInvestmentId(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-ink-200 rounded-[8px] outline-none"
                  >
                    {investments.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.name}
                        {inv.expectedReturnRate
                          ? ` · ~${(inv.expectedReturnRate * 100).toFixed(0)}%`
                          : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-sm font-medium text-ink-400">₦</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={investmentNaira}
                    onChange={(e) => setInvestmentNaira(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-8 pr-3 py-2 text-sm bg-white border border-ink-200 rounded-[8px] focus:ring-2 focus:ring-seed-600 outline-none"
                  />
                </div>
              </>
            ) : (
              <p className="text-xs text-ink-500 italic">
                No active cooperative investments open for member funding right now.
              </p>
            )}
          </div>

          <div className="pt-2">
            <div className="flex justify-between text-sm font-semibold text-seed-950 mb-3 px-1">
              <span>Total to allocate:</span>
              <MoneyText kobo={totalAllocatedKobo} className="text-base font-bold text-seed-900" />
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 border border-ink-200 rounded-[8px] text-sm font-medium text-ink-700 hover:bg-ink-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || totalAllocatedKobo <= 0 || remainingDepositKobo < 0}
                className="flex-1 py-2.5 bg-seed-800 text-white rounded-[8px] text-sm font-medium hover:bg-seed-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Allocating…' : 'Confirm allocation'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
