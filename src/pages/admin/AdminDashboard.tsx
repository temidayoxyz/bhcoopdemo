import { useOutletContext, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { MoneyText } from '../../components/money/MoneyText';
import { CopyableRef } from '../../components/money/CopyableRef';
import { ROLE_LABELS, ROLE_DUTIES } from '../../lib/roles';

function PaymentSourceBadge({ source }: { source?: string }) {
  if (source === 'DEPOSIT_WALLET') {
    return <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-seed-100 text-seed-900 border border-seed-300 px-2 py-0.5 rounded-full">💳 Deposit Wallet</span>;
  }
  if (source === 'PAYSTACK' || source === 'DIRECT_PAYMENT') {
    return <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-emerald-100 text-emerald-900 border border-emerald-300 px-2 py-0.5 rounded-full">⚡ Direct / Paystack</span>;
  }
  if (source === 'ADMIN_RECORD') {
    return <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full">🏛️ Admin Manual</span>;
  }
  return <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-ink-100 text-ink-700 px-2 py-0.5 rounded-full">System</span>;
}

export function AdminDashboard() {
  const { user } = useOutletContext<{ user: any }>();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch('/api/admin/dashboard').then((res) => res.json()).then(setData);
  }, []);

  if (!data) return <div>Loading…</div>;

  const roleLabel = ROLE_LABELS[user.role as keyof typeof ROLE_LABELS] || user.role;

  return (
    <div className="space-y-6">
      <div className="bg-seed-950 text-white rounded-[14px] p-6">
        <p className="text-seed-200 text-sm">Signed in as</p>
        <h1 className="text-2xl font-bold mt-1">{user.displayName || user.email}</h1>
        <p className="text-gold-400 font-semibold text-sm mt-1">{roleLabel}</p>
        <p className="text-seed-200 text-sm mt-2 max-w-2xl">{ROLE_DUTIES[user.role as keyof typeof ROLE_DUTIES]}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active members', value: data.activeMembers },
          { label: 'Pending applications', value: data.pendingApplications },
          { label: 'Pending loans', value: data.pendingLoans || 0 },
          { label: 'Pending withdrawals', value: data.pendingWithdrawals || 0 },
        ].map((c) => (
          <div key={c.label} className="bg-white p-5 rounded-[12px] border border-ink-200">
            <p className="text-xs uppercase text-ink-500 font-semibold">{c.label}</p>
            <p className="text-3xl font-bold text-seed-950 mt-1 tabular-nums">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Financial Capital Pools */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-linear-to-br from-seed-900 to-seed-800 text-white p-5 rounded-[12px] shadow-sm">
          <p className="text-xs uppercase font-semibold text-seed-200">Member Deposit Wallets</p>
          <p className="text-2xl font-extrabold text-white mt-1">
            <MoneyText kobo={data.totalDepositWalletBalance || 0} />
          </p>
          <p className="text-[11px] text-seed-200 mt-1">Liquid unallocated funds across all members</p>
        </div>

        <div className="bg-white p-5 rounded-[12px] border border-ink-200">
          <p className="text-xs uppercase text-ink-500 font-semibold">Total Savings / Thrift</p>
          <p className="text-2xl font-bold mt-1 text-seed-950">
            <MoneyText kobo={data.totalContributions} />
          </p>
          <p className="text-[11px] text-ink-500 mt-1">Accumulated member contributions</p>
        </div>

        <div className="bg-white p-5 rounded-[12px] border border-ink-200">
          <p className="text-xs uppercase text-ink-500 font-semibold">Total Share Capital</p>
          <p className="text-2xl font-bold mt-1 text-seed-950">
            <MoneyText kobo={data.totalShareCapital || 0} />
          </p>
          <p className="text-[11px] text-ink-500 mt-1">Member co-op equity holdings</p>
        </div>

        <div className="bg-white p-5 rounded-[12px] border border-ink-200">
          <p className="text-xs uppercase text-ink-500 font-semibold">Active Loan Book</p>
          <p className="text-2xl font-bold mt-1 text-seed-950">
            <MoneyText kobo={data.activeLoanPortfolio} />
          </p>
          <p className="text-[11px] text-ink-500 mt-1">Outstanding loan principal + interest</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Member Deposits Feed */}
        <div className="bg-white rounded-[12px] border border-ink-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-ink-100 font-semibold bg-ink-50 flex justify-between items-center">
            <span>Recent Member Deposits / Top-ups</span>
            <Link to="/admin/deposits" className="text-xs text-seed-700 font-medium">View All →</Link>
          </div>
          <div className="divide-y divide-ink-100">
            {!data.recentDeposits || data.recentDeposits.length === 0 ? (
              <div className="p-6 text-ink-400 text-center">No recent deposits</div>
            ) : data.recentDeposits.map((dep: any) => (
              <div key={dep.id} className="px-5 py-3 flex justify-between items-center">
                <div>
                  <p className="font-semibold text-sm text-seed-950">
                    {dep.member ? `${dep.member.firstName} ${dep.member.lastName}` : 'Member'}
                    {dep.member?.membershipNumber && (
                      <span className="text-xs font-mono text-seed-700 ml-2 font-normal">({dep.member.membershipNumber})</span>
                    )}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <CopyableRef value={dep.reference} />
                    <span className="text-[10px] text-ink-500">
                      {new Date(dep.requestedAt * 1000).toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-sm text-seed-950">
                    <MoneyText kobo={dep.amountKobo} />
                  </p>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    {dep.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Ledger Entries with Payment Source */}
        <div className="bg-white rounded-[12px] border border-ink-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-ink-100 font-semibold bg-ink-50 flex justify-between items-center">
            <span>Recent Transactions & Payment Channels</span>
            <Link to="/admin/ledger" className="text-xs text-seed-700 font-medium">Full Audit Ledger →</Link>
          </div>
          <div className="divide-y divide-ink-100">
            {data.recentTransactions.map((tx: any) => (
              <div key={tx.id} className="px-5 py-3 flex justify-between items-center gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-medium text-sm truncate text-seed-950">{tx.description || tx.type.replace(/_/g, ' ')}</p>
                    <PaymentSourceBadge source={tx.paymentSource} />
                  </div>
                  <CopyableRef value={tx.reference} />
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-sm text-seed-900">
                    <MoneyText kobo={tx.amountKobo} />
                  </p>
                  <p className="text-[10px] text-ink-500">{new Date(tx.date * 1000).toLocaleTimeString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

