import { useEffect, useState } from 'react';
import { ArrowDownCircle, Search } from 'lucide-react';

export function AdminDeposits() {
  const [requests, setRequests] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchRequests = () => {
    fetch('/api/admin/funds').then(res => res.json()).then(data => {
      setRequests((data.requests || []).filter((r: any) => r.type === 'DEPOSIT'));
    }).catch(() => {});
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const filteredRequests = requests.filter(req => {
    const q = searchQuery.toLowerCase();
    const name = `${req.member?.firstName || ''} ${req.member?.lastName || ''}`.toLowerCase();
    const memNo = (req.member?.membershipNumber || '').toLowerCase();
    const ref = (req.reference || '').toLowerCase();
    return name.includes(q) || memNo.includes(q) || ref.includes(q);
  });

  const totalDepositsKobo = filteredRequests
    .filter(r => r.status === 'APPROVED')
    .reduce((sum, r) => sum + (r.amountKobo || 0), 0);

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-seed-950 flex items-center gap-2">
            <ArrowDownCircle className="w-6 h-6 text-seed-800" /> Deposit Logs & History
          </h1>
          <p className="text-ink-600 mt-1">Audit log of member deposits (automatically processed upon payment).</p>
        </div>
        <div className="bg-white px-4 py-3 rounded-[10px] border border-ink-200 shadow-xs flex items-center gap-3">
          <span className="text-xs font-medium text-ink-600 uppercase tracking-wider">Total Filtered Deposits:</span>
          <span className="text-lg font-bold text-seed-950 font-mono">₦{(totalDepositsKobo / 100).toLocaleString()}</span>
        </div>
      </header>

      <div className="bg-white rounded-[10px] border border-ink-200 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
        <div className="p-4 border-b border-ink-200 bg-ink-50 flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by member name, ID, or reference..." 
              className="w-full pl-9 pr-4 py-2 text-sm border border-ink-200 rounded-[8px] focus:ring-2 focus:ring-seed-500 outline-none bg-white" 
            />
          </div>
        </div>

        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-sm divide-y divide-ink-100">
            <thead className="bg-ink-50/70 text-ink-600 font-semibold text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Member</th>
                <th className="px-6 py-3.5">Reference</th>
                <th className="px-6 py-3.5">Date & Time</th>
                <th className="px-6 py-3.5">Notes / Channel</th>
                <th className="px-6 py-3.5 text-right">Amount (₦)</th>
                <th className="px-6 py-3.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100 bg-white">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-ink-500">
                    No deposit logs found.
                  </td>
                </tr>
              ) : (
                filteredRequests.map(req => (
                  <tr key={req.id} className="hover:bg-ivory-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-seed-950">{req.member?.firstName} {req.member?.lastName}</div>
                      <div className="text-xs font-mono text-ink-500">{req.member?.membershipNumber}</div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-ink-700">
                      {req.reference}
                    </td>
                    <td className="px-6 py-4 text-xs text-ink-600">
                      {new Date(req.requestedAt * 1000).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-xs text-ink-600">
                      <span className="inline-flex items-center gap-1 font-semibold text-[11px] bg-emerald-100 text-emerald-900 border border-emerald-300 px-2 py-0.5 rounded-full">
                        ⚡ Paystack / Direct
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-semibold font-mono text-seed-950">
                      ₦{(req.amountKobo / 100).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-success/10 text-success border border-success/20">
                        {req.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
