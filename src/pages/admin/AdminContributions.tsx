import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Coins, Plus, Search, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { can } from '../../lib/roles';

export function AdminContributions() {
  const { user } = useOutletContext<{ user: any }>();
  const canWrite = can(user?.role, 'contributions:write');
  const [data, setData] = useState<{
    members: any[];
    ledger: any[];
    settings?: { monthlySavingsKobo: number };
    currentPeriod?: string;
  }>({ members: [], ledger: [] });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Record contribution modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [isRecording, setIsRecording] = useState(false);

  const fetchContributions = () => {
    fetch('/api/admin/contributions')
      .then(res => res.json())
      .then(d => {
        setData({
          members: d.members || [],
          ledger: d.ledger || [],
          settings: d.settings,
          currentPeriod: d.currentPeriod,
        });
        if (d.members && d.members.length > 0 && !selectedMemberId) {
          setSelectedMemberId(d.members[0].id);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchContributions();
  }, []);

  const handleRecordContribution = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountKobo = parseInt(amount) * 100;
    if (isNaN(amountKobo) || amountKobo <= 0) {
      toast.error('Please enter a valid savings amount');
      return;
    }
    if (!selectedMemberId) {
      toast.error('Please select a member');
      return;
    }

    setIsRecording(true);
    try {
      const res = await fetch('/api/admin/contributions/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: selectedMemberId,
          amountKobo,
          description: description || 'Monthly savings',
          // Target the current period so the member's obligation flips to PAID
          monthPeriod: data.currentPeriod,
        }),
      });
      const resData = await res.json();
      if (resData.success) {
        toast.success('Member savings recorded successfully.');
        setIsModalOpen(false);
        setAmount('');
        setDescription('');
        fetchContributions();
      } else {
        toast.error(resData.error || 'Failed to record contribution');
      }
    } catch (err) {
      toast.error('An error occurred');
    } finally {
      setIsRecording(false);
    }
  };

  const filteredMembers = data.members.filter(m => {
    const q = searchQuery.toLowerCase();
    const name = `${m.firstName} ${m.lastName}`.toLowerCase();
    const memNo = (m.membershipNumber || '').toLowerCase();
    return name.includes(q) || memNo.includes(q);
  });

  const totalCoopSavingsKobo = data.members.reduce((sum, m) => sum + (m.totalContributionsKobo || 0), 0);

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-seed-950 flex items-center gap-2">
            <Coins className="w-6 h-6 text-seed-800" /> Savings
          </h1>
          <p className="text-ink-600 mt-1">
            Monthly savings obligations (admin amount). Current period:{' '}
            <strong className="font-mono">{data.currentPeriod || '—'}</strong>
            {data.settings?.monthlySavingsKobo != null && (
              <>
                {' '}
                · ₦{(data.settings.monthlySavingsKobo / 100).toLocaleString()}/member
              </>
            )}
            . Share capital is under Shares.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white px-4 py-2.5 rounded-[10px] border border-ink-200 text-xs font-semibold text-seed-900 shadow-xs">
            Total savings:{' '}
            <span className="font-bold text-seed-950 text-base font-mono">
              ₦{(totalCoopSavingsKobo / 100).toLocaleString()}
            </span>
          </div>
          {canWrite && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-seed-800 text-white px-4 py-2.5 rounded-[10px] font-medium hover:bg-seed-700 transition-colors text-sm flex items-center gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4" /> Record savings
            </button>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Members Savings Ledger Summary */}
        <div className="lg:col-span-2 bg-white rounded-[14px] border border-ink-200 shadow-sm overflow-hidden flex flex-col min-h-[450px]">
          <div className="p-4 border-b border-ink-200 bg-ink-50 flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search member by name or ID..." 
                className="w-full pl-9 pr-4 py-2 text-sm border border-ink-200 rounded-[8px] focus:ring-2 focus:ring-seed-500 outline-none bg-white" 
              />
            </div>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-sm divide-y divide-ink-100">
              <thead className="bg-ink-50/70 text-ink-600 font-semibold text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Member</th>
                  <th className="px-6 py-3.5">Monthly Obligation</th>
                  <th className="px-6 py-3.5 text-right">Accumulated Savings</th>
                  <th className="px-6 py-3.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100 bg-white">
                {filteredMembers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-12 text-center text-ink-500">
                      No member records found.
                    </td>
                  </tr>
                ) : (
                  filteredMembers.map(m => (
                    <tr key={m.id} className="hover:bg-ivory-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-seed-950">{m.firstName} {m.lastName}</div>
                        <div className="text-xs font-mono text-seed-700 font-medium">{m.membershipNumber}</div>
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-ink-600">
                        ₦
                        {(
                          (m.monthlySavingsKobo || data.settings?.monthlySavingsKobo || 0) / 100
                        ).toLocaleString()}{' '}
                        / month
                        {m.currentObligation && (
                          <div className="text-[10px] text-ink-500 mt-0.5">
                            This period: ₦{(m.currentObligation.paidAmountKobo / 100).toLocaleString()}{' '}
                            / ₦{(m.currentObligation.expectedAmountKobo / 100).toLocaleString()}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right font-bold font-mono text-seed-950 text-base">
                        ₦{(m.totalContributionsKobo / 100).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {(() => {
                          const st = m.currentObligation?.status || 'UNPAID';
                          const ok = st === 'PAID';
                          return (
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                                ok
                                  ? 'bg-success/10 text-success border border-success/20'
                                  : st === 'PARTIAL'
                                    ? 'bg-warning/10 text-warning border border-warning/20'
                                    : 'bg-ink-100 text-ink-600 border border-ink-200'
                              }`}
                            >
                              {ok && <CheckCircle2 className="w-3 h-3" />}
                              {st}
                            </span>
                          );
                        })()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Ledger Audit Trail */}
        <div className="lg:col-span-1 bg-white rounded-[14px] border border-ink-200 shadow-sm overflow-hidden flex flex-col h-[500px]">
          <div className="px-6 py-4 border-b border-ink-200 bg-ink-50">
            <h3 className="font-semibold text-seed-950 text-sm">Recent Ledger Entries</h3>
          </div>
          <div className="overflow-y-auto flex-1 divide-y divide-ink-100 p-2">
            {data.ledger.length === 0 ? (
              <div className="p-8 text-center text-ink-500 text-sm">No ledger entries recorded yet.</div>
            ) : (
              data.ledger.map(entry => (
                <div key={entry.id} className="p-3 hover:bg-ivory-50 transition-colors rounded-[8px]">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-semibold text-seed-950 text-xs">{entry.member?.firstName} {entry.member?.lastName}</span>
                    <span className="text-xs font-bold font-mono text-success">
                      +₦{(entry.amountKobo / 100).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-[11px] text-ink-600 truncate mb-1">{entry.description || 'Monthly Contribution'}</div>
                  <div className="text-[10px] text-ink-400 font-mono">
                    {new Date((entry.date || entry.createdAt || 0) * 1000).toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Record Contribution Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-seed-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[14px] border border-ink-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-seed-950">Record member savings</h3>
            <form onSubmit={handleRecordContribution} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-ink-700 mb-1">Select Member</label>
                <select
                  value={selectedMemberId}
                  onChange={(e) => setSelectedMemberId(e.target.value)}
                  className="w-full px-3 py-2 border border-ink-200 rounded-[8px] text-sm focus:ring-2 focus:ring-seed-500 outline-none"
                  required
                >
                  {data.members.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.firstName} {m.lastName} ({m.membershipNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-700 mb-1">Amount (₦)</label>
                <input 
                  type="number" 
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 25000"
                  className="w-full px-3 py-2 border border-ink-200 rounded-[8px] text-sm focus:ring-2 focus:ring-seed-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-700 mb-1">Description / Narration</label>
                <input 
                  type="text" 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. July 2026 monthly savings"
                  className="w-full px-3 py-2 border border-ink-200 rounded-[8px] text-sm focus:ring-2 focus:ring-seed-500 outline-none"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-ink-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2 text-sm font-medium text-ink-700 bg-ink-100 hover:bg-ink-200 rounded-[8px] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRecording}
                  className="flex-1 py-2 text-sm font-medium text-white bg-seed-800 hover:bg-seed-700 rounded-[8px] transition-colors disabled:opacity-50"
                >
                  {isRecording ? 'Recording...' : 'Save savings'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
