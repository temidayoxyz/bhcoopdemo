import { useOutletContext, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { MoneyText } from '../../components/money/MoneyText';
import { CopyableRef } from '../../components/money/CopyableRef';
import { DepositAllocationModal } from '../../components/money/DepositAllocationModal';

export function MemberDashboard() {
  const { member, refreshMember } = useOutletContext<{ member: any; refreshMember?: () => void }>();
  const [data, setData] = useState<any>(null);
  const [isAllocationOpen, setIsAllocationOpen] = useState(false);

  const loadDashboard = () => {
    fetch('/api/members/dashboard').then((res) => res.json()).then(setData);
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  if (!data) return <div>Loading dashboard…</div>;

  const m = data.member || member;
  const currentMonthObligation = data.obligations[0] || { expectedAmountKobo: 0, paidAmountKobo: 0 };
  const percentPaid =
    currentMonthObligation.expectedAmountKobo > 0
      ? (currentMonthObligation.paidAmountKobo / currentMonthObligation.expectedAmountKobo) * 100
      : 0;
  const strokeDasharray = 2 * Math.PI * 40;
  const strokeDashoffset = strokeDasharray - (percentPaid / 100) * strokeDasharray;

  const handleAllocationSuccess = () => {
    loadDashboard();
    refreshMember?.();
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20 md:pb-0">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-seed-950">Welcome back, {m.firstName}</h1>
          <p className="text-ink-600 mt-1">
            Membership <span className="font-mono font-semibold text-seed-800">{m.membershipNumber}</span>
            {' · '}
            {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
          </p>
        </div>

        <button
          onClick={() => setIsAllocationOpen(true)}
          className="inline-flex items-center justify-center gap-2 bg-seed-800 text-white px-5 py-2.5 rounded-[10px] text-sm font-semibold hover:bg-seed-700 shadow-sm"
        >
          <span>💸</span> Allocate Deposit Funds
        </button>
      </header>

      {/* Main Balances Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Deposit Wallet Card */}
        <div className="bg-linear-to-br from-seed-900 to-seed-800 text-white rounded-[14px] p-6 shadow-md flex flex-col justify-between relative overflow-hidden">
          <div className="absolute right-[-10px] bottom-[-10px] opacity-10 text-8xl font-black select-none">
            💳
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs uppercase font-semibold text-seed-200 tracking-wider">Deposit Wallet</span>
              <span className="text-[10px] bg-seed-700/80 px-2 py-0.5 rounded-full text-seed-100 font-medium">Liquid</span>
            </div>
            <p className="text-3xl font-extrabold text-white mt-1">
              <MoneyText kobo={m.depositBalanceKobo || 0} />
            </p>
            <p className="text-xs text-seed-200 mt-1">Unallocated funds ready for distribution</p>
          </div>

          <div className="flex gap-2 mt-4 pt-4 border-t border-seed-700/60">
            <Link
              to="/member/deposits"
              className="flex-1 text-center py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-[6px] transition-colors"
            >
              + Top Up
            </Link>
            <button
              onClick={() => setIsAllocationOpen(true)}
              className="flex-1 py-1.5 bg-white text-seed-900 hover:bg-seed-50 text-xs font-semibold rounded-[6px] transition-colors"
            >
              Allocate funds
            </button>
          </div>
        </div>

        {/* Savings Card */}
        <div className="bg-white rounded-[14px] p-6 border border-ink-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-medium text-ink-600 uppercase tracking-wider">Total savings</span>
              <span className="text-[10px] bg-success/10 text-success px-2 py-0.5 rounded-full font-medium">Accumulating</span>
            </div>
            <p className="text-3xl font-bold text-seed-950 mt-1">
              <MoneyText kobo={m.totalContributionsKobo} />
            </p>
          </div>
          <Link to="/member/savings" className="text-xs text-seed-800 font-medium mt-3 hover:underline">
            View savings →
          </Link>
        </div>

        {/* Share Capital Card — links to Shares flow only */}
        <div className="bg-white rounded-[14px] p-6 border border-ink-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-medium text-ink-600 uppercase tracking-wider">Share capital</span>
              <span className="text-[10px] bg-seed-100 text-seed-800 px-2 py-0.5 rounded-full font-medium">Equity</span>
            </div>
            <p className="text-3xl font-bold text-seed-950 mt-1">
              <MoneyText kobo={m.sharesBalanceKobo || 0} />
            </p>
          </div>
          <Link to="/member/shares" className="text-xs text-seed-800 font-medium mt-3 hover:underline">
            Buy or manage shares →
          </Link>
        </div>
      </div>

      {/* Cycle savings & progress */}
      <div className="bg-white rounded-[14px] p-6 border border-ink-200 shadow-sm flex flex-col sm:flex-row items-center gap-8">
        <div className="relative w-28 h-28 flex-shrink-0">
          <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
            <circle cx="50" cy="50" r="40" stroke="var(--color-ink-100)" strokeWidth="8" fill="none" />
            <motion.circle
              cx="50" cy="50" r="40"
              stroke="var(--color-seed-600)"
              strokeWidth="8"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={strokeDasharray}
              initial={{ strokeDashoffset: strokeDasharray }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-bold text-seed-950">{Math.round(percentPaid)}%</span>
          </div>
        </div>
        <div className="flex-1 text-center sm:text-left">
          <h2 className="text-lg font-semibold text-seed-950 mb-2">Current monthly savings obligation</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-xs text-ink-600 uppercase tracking-wider mb-1">Expected</p>
              <p className="text-xl font-semibold"><MoneyText kobo={currentMonthObligation.expectedAmountKobo} /></p>
            </div>
            <div>
              <p className="text-xs text-ink-600 uppercase tracking-wider mb-1">Paid</p>
              <p className="text-xl font-semibold text-success"><MoneyText kobo={currentMonthObligation.paidAmountKobo} /></p>
            </div>
          </div>
          {currentMonthObligation.expectedAmountKobo > currentMonthObligation.paidAmountKobo ? (
            <div className="flex flex-wrap gap-2">
              <Link to="/member/savings" className="inline-flex bg-seed-800 text-white px-4 py-2 rounded-[8px] text-sm font-medium hover:bg-seed-700">
                Pay savings
              </Link>
              <button
                onClick={() => setIsAllocationOpen(true)}
                className="inline-flex bg-seed-100 text-seed-900 border border-seed-300 px-4 py-2 rounded-[8px] text-sm font-medium hover:bg-seed-200"
              >
                Pay from deposit wallet
              </button>
            </div>
          ) : (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success">
              Fully paid for {currentMonthObligation.monthPeriod}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-[14px] p-6 border border-ink-200 shadow-sm">
          <h3 className="font-semibold text-seed-950 mb-4">Loans</h3>
          {data.loans.length > 0 ? (
            <div className="space-y-4">
              {data.loans.map((loan: any) => (
                <div key={loan.id} className="border border-ink-100 rounded-[10px] p-4">
                  <div className="flex justify-between items-start mb-2">
                    <CopyableRef value={loan.reference} />
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-ink-100">{loan.status.replace(/_/g, ' ')}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-2">
                    <span className="text-ink-600">Principal</span>
                    <MoneyText kobo={loan.principalKobo} className="font-semibold" />
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-ink-600">Outstanding</span>
                    <MoneyText kobo={loan.totalDueKobo - loan.paidKobo} className="font-semibold text-seed-900" />
                  </div>
                  {loan.status === 'ACTIVE' && loan.totalDueKobo - loan.paidKobo > 0 && (
                    <button
                      onClick={() => setIsAllocationOpen(true)}
                      className="mt-3 w-full py-1.5 bg-seed-50 hover:bg-seed-100 border border-seed-200 text-seed-800 text-xs font-semibold rounded-[6px] transition-colors"
                    >
                      Repay from Deposit Wallet
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-ink-500 text-sm">No loans. <Link className="text-seed-700 font-medium" to="/member/loans/apply">Apply for a loan</Link></p>
          )}
        </div>

        <div className="bg-white rounded-[14px] p-6 border border-ink-200 shadow-sm space-y-4">
          <h3 className="font-semibold text-seed-950">Your dividends</h3>
          {data.dividends?.length ? (
            data.dividends.slice(0, 3).map((d: any) => (
              <div key={d.id} className="flex justify-between text-sm">
                <span className="text-ink-600">{d.period?.label || 'Dividend'}</span>
                <MoneyText kobo={d.amountKobo} className="font-semibold text-success" />
              </div>
            ))
          ) : (
            <p className="text-sm text-ink-500">No dividends yet.</p>
          )}
          <Link to="/member/dividends" className="text-sm font-medium text-seed-700">View all dividends →</Link>

          <div className="pt-4 border-t border-ink-100">
            <h3 className="font-semibold text-seed-950 mb-2">Co-op investments</h3>
            <p className="text-sm text-ink-600">
              {data.investmentsSummary?.activeCount || 0} active placements · portfolio{' '}
              <MoneyText kobo={data.investmentsSummary?.totalValueKobo || 0} className="font-semibold" />
            </p>
          </div>
        </div>
      </div>

      <DepositAllocationModal
        isOpen={isAllocationOpen}
        onClose={() => setIsAllocationOpen(false)}
        member={m}
        onSuccess={handleAllocationSuccess}
      />
    </div>
  );
}

