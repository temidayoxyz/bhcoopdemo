import { useEffect, useState } from 'react';
import { FileBarChart, Download } from 'lucide-react';
import { toast } from 'sonner';
import { MoneyText } from '../../components/money/MoneyText';

type ReportData = {
  generatedAt: number;
  monthlyFinancials: {
    totalContributionsKobo: number;
    totalDepositBalanceKobo: number;
    totalShareCapitalKobo: number;
    totalDevelopmentFeesKobo: number;
    coOpNetKobo: number;
  };
  loanPortfolio: {
    activeCount: number;
    outstandingKobo: number;
    completedCount: number;
    rejectedCount: number;
  };
  membershipGrowth: {
    activeCount: number;
    pendingApplications: number;
    joinedThisYear: number;
    removedCount: number;
  };
  dividendProjection: {
    periodLabel: string;
    surplusKobo: number;
    projectedPayoutKobo: number;
  };
};

function naira(kobo: number) {
  return `₦${(kobo / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
}

export function AdminReports() {
  const [data, setData] = useState<ReportData | null>(null);

  useEffect(() => {
    fetch('/api/admin/reports')
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, []);

  const download = (filename: string, lines: string[]) => {
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${filename} downloaded`);
  };

  const reports = [
    {
      name: 'Monthly Financials',
      detail: data ? `${naira(data.monthlyFinancials.totalContributionsKobo)} thrift · ${naira(data.monthlyFinancials.coOpNetKobo)} pool` : '…',
      action: () =>
        data &&
        download('bhcoop-monthly-financials.txt', [
          'Blessed Hands Co-op — Monthly Financials',
          `Generated: ${new Date(data.generatedAt * 1000).toLocaleString()}`,
          '',
          `Total thrift savings: ${naira(data.monthlyFinancials.totalContributionsKobo)}`,
          `Member deposit wallets: ${naira(data.monthlyFinancials.totalDepositBalanceKobo)}`,
          `Total share capital: ${naira(data.monthlyFinancials.totalShareCapitalKobo)}`,
          `Development fees collected: ${naira(data.monthlyFinancials.totalDevelopmentFeesKobo)}`,
          `Co-op pool (net): ${naira(data.monthlyFinancials.coOpNetKobo)}`,
        ]),
    },
    {
      name: 'Loan Portfolio Health',
      detail: data ? `${data.loanPortfolio.activeCount} active · ${naira(data.loanPortfolio.outstandingKobo)} outstanding` : '…',
      action: () =>
        data &&
        download('bhcoop-loan-portfolio.txt', [
          'Blessed Hands Co-op — Loan Portfolio Health',
          `Generated: ${new Date(data.generatedAt * 1000).toLocaleString()}`,
          '',
          `Active loans: ${data.loanPortfolio.activeCount}`,
          `Outstanding balance: ${naira(data.loanPortfolio.outstandingKobo)}`,
          `Completed loans: ${data.loanPortfolio.completedCount}`,
          `Rejected applications: ${data.loanPortfolio.rejectedCount}`,
        ]),
    },
    {
      name: 'Membership Growth',
      detail: data ? `${data.membershipGrowth.activeCount} active · ${data.membershipGrowth.pendingApplications} pending` : '…',
      action: () =>
        data &&
        download('bhcoop-membership-growth.txt', [
          'Blessed Hands Co-op — Membership Growth',
          `Generated: ${new Date(data.generatedAt * 1000).toLocaleString()}`,
          '',
          `Active members: ${data.membershipGrowth.activeCount}`,
          `Pending applications: ${data.membershipGrowth.pendingApplications}`,
          `Joined this year: ${data.membershipGrowth.joinedThisYear}`,
          `Removed memberships: ${data.membershipGrowth.removedCount}`,
        ]),
    },
    {
      name: 'Dividend Projections',
      detail: data ? `${data.dividendProjection.periodLabel} · ${naira(data.dividendProjection.projectedPayoutKobo)}` : '…',
      action: () =>
        data &&
        download('bhcoop-dividend-projection.txt', [
          'Blessed Hands Co-op — Dividend Projections',
          `Generated: ${new Date(data.generatedAt * 1000).toLocaleString()}`,
          '',
          `Period: ${data.dividendProjection.periodLabel}`,
          `Surplus: ${naira(data.dividendProjection.surplusKobo)}`,
          `Projected share-weighted payout: ${naira(data.dividendProjection.projectedPayoutKobo)}`,
        ]),
    },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-seed-950">Reports</h1>
        <p className="text-ink-600 mt-1">
          Financial and operational summaries, computed live from the demo ledger.
        </p>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {reports.map((r) => (
          <div key={r.name} className="bg-white p-6 rounded-[14px] border border-ink-200 shadow-sm flex items-start justify-between gap-3">
            <div className="flex items-start gap-4 min-w-0">
              <div className="w-10 h-10 rounded-[8px] bg-seed-50 flex items-center justify-center text-seed-700 flex-shrink-0">
                <FileBarChart className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-seed-950">{r.name}</h3>
                <p className="text-sm text-ink-600 mt-1 break-words">{r.detail}</p>
              </div>
            </div>
            <button
              type="button"
              disabled={!data}
              onClick={r.action}
              title="Download report"
              className="p-2 text-ink-400 hover:text-seed-700 hover:bg-seed-50 rounded-lg transition-colors disabled:opacity-40 shrink-0"
            >
              <Download className="w-5 h-5" />
            </button>
          </div>
        ))}
      </div>
      {!data && (
        <p className="text-sm text-ink-500">Loading live report data…</p>
      )}
    </div>
  );
}
