import { useOutletContext } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Users, Search, UserCheck, UserX, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { can } from '../../lib/roles';

export function AdminMembers() {
  const { user } = useOutletContext<{ user: any }>();
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const canSuspend = can(user?.role, 'members:suspend');
  const canDelete = can(user?.role, 'members:delete');
  const canRoles = can(user?.role, 'members:roles');

  const fetchMembers = () => {
    fetch('/api/admin/members')
      .then((res) => res.json())
      .then((data) => setMembers(data.members || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const handleToggleStatus = async (memberId: string, currentStatus: string) => {
    if (!canSuspend) return toast.error('You cannot suspend members');
    if (currentStatus === 'REMOVED') return;
    const newStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    setUpdatingId(memberId);
    try {
      const res = await fetch(`/api/admin/members/${memberId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Member status updated to ${newStatus}`);
        fetchMembers();
      } else toast.error(data.error || 'Failed');
    } catch {
      toast.error('An error occurred');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (memberId: string, label: string) => {
    if (!canDelete) return;
    if (!confirm(`Remove ${label} from the cooperative? Ledger history is kept (soft delete).`)) return;
    setUpdatingId(memberId);
    try {
      const res = await fetch(`/api/admin/members/${memberId}/delete`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        toast.success('Member removed');
        fetchMembers();
      } else toast.error(data.error || 'Failed');
    } catch {
      toast.error('An error occurred');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRole = async (memberId: string, role: string) => {
    if (!canRoles) return;
    setUpdatingId(memberId);
    try {
      const res = await fetch(`/api/admin/members/${memberId}/role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Role set to ${role}`);
        fetchMembers();
      } else toast.error(data.error || 'Failed');
    } catch {
      toast.error('An error occurred');
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredMembers = members.filter((m) => {
    const q = searchQuery.toLowerCase();
    const name = `${m.firstName} ${m.lastName}`.toLowerCase();
    return (
      name.includes(q) ||
      (m.membershipNumber || '').toLowerCase().includes(q) ||
      (m.email || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <header>
        <h1 className="text-2xl font-bold text-seed-950 flex items-center gap-2">
          <Users className="w-6 h-6 text-seed-800" /> Members
        </h1>
        <p className="text-ink-600 mt-1">
          Admin can suspend. Super Admin can remove members and assign staff roles.
        </p>
      </header>

      <div className="bg-white rounded-[14px] border border-ink-200 shadow-sm overflow-hidden min-h-[500px] flex flex-col">
        <div className="p-4 border-b border-ink-200 bg-ink-50">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search members…"
              className="w-full pl-9 pr-4 py-2 text-sm border border-ink-200 rounded-[8px] focus:ring-2 focus:ring-seed-500 outline-none"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-ink-500">Loading…</div>
        ) : (
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-sm">
              <thead className="bg-ink-50/70 text-ink-600 font-semibold text-xs uppercase">
                <tr>
                  <th className="px-4 py-3">Member</th>
                  <th className="px-4 py-3">Their code</th>
                  <th className="px-4 py-3">Referred by</th>
                  <th className="px-4 py-3 text-right">Shares</th>
                  <th className="px-4 py-3 text-right">Deposit</th>
                  <th className="px-4 py-3 text-right">Savings</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {filteredMembers.map((m) => (
                  <tr key={m.id} className="hover:bg-ivory-50/80">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-seed-950">
                        {m.firstName} {m.middleName || ''} {m.lastName}
                      </div>
                      <div className="text-xs font-mono text-seed-700">{m.membershipNumber}</div>
                      <div className="text-xs text-ink-500">{m.email}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{m.referralCode || m.membershipNumber || '—'}</td>
                    <td className="px-4 py-3 text-xs">
                      {m.referrer?.name ? (
                        <div>
                          <div className="font-medium text-seed-950">{m.referrer.name}</div>
                          <div className="font-mono text-ink-500">{m.referrer.membershipNumber}</div>
                        </div>
                      ) : m.referredByCode ? (
                        <span className="font-mono text-ink-600">{m.referredByCode}</span>
                      ) : (
                        <span className="text-ink-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      ₦{((m.sharesBalanceKobo || 0) / 100).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      ₦{((m.depositBalanceKobo || 0) / 100).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      ₦{((m.totalContributionsKobo || 0) / 100).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                          m.status === 'ACTIVE'
                            ? 'bg-success/10 text-success'
                            : m.status === 'REMOVED' || m.status === 'LEFT'
                              ? 'bg-ink-100 text-ink-600'
                              : 'bg-danger/10 text-danger'
                        }`}
                      >
                        {m.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-wrap justify-end gap-1.5">
                        {canSuspend && m.status !== 'REMOVED' && m.status !== 'LEFT' && (
                          <button
                            onClick={() => handleToggleStatus(m.id, m.status)}
                            disabled={updatingId === m.id}
                            className="px-2 py-1 rounded text-xs border border-ink-200 hover:bg-ink-50 inline-flex items-center gap-1"
                          >
                            {m.status === 'ACTIVE' ? (
                              <>
                                <UserX className="w-3 h-3" /> Suspend
                              </>
                            ) : (
                              <>
                                <UserCheck className="w-3 h-3" /> Reinstate
                              </>
                            )}
                          </button>
                        )}
                        {canRoles && m.status === 'ACTIVE' && m.status !== 'LEFT' && (
                          <>
                            <select
                              className="text-xs border border-ink-200 rounded px-1 py-1"
                              defaultValue=""
                              title="Assign a staff role (Member is the default)"
                              onChange={(e) => {
                                if (e.target.value) handleRole(m.id, e.target.value);
                                e.target.value = '';
                              }}
                            >
                              <option value="" disabled>
                                Assign staff role…
                              </option>
                              <option value="FINANCIAL_SECRETARY">Financial Secretary</option>
                              <option value="ADMIN">Admin</option>
                              <option value="SUPER_ADMIN">Super Admin</option>
                            </select>
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm('Remove staff powers? They remain a normal member.')) {
                                  // Demote via allowDemote flag
                                  setUpdatingId(m.id);
                                  fetch(`/api/admin/members/${m.id}/role`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ role: 'MEMBER', allowDemote: true }),
                                  })
                                    .then((r) => r.json())
                                    .then((d) => {
                                      if (d.success) {
                                        toast.success('Staff role removed — back to Member');
                                        fetchMembers();
                                      } else toast.error(d.error || 'Failed');
                                    })
                                    .finally(() => setUpdatingId(null));
                                }
                              }}
                              className="px-2 py-1 rounded text-xs border border-ink-200 hover:bg-ink-50"
                            >
                              Remove staff role
                            </button>
                          </>
                        )}
                        {canDelete && m.status !== 'REMOVED' && (
                          <button
                            onClick={() =>
                              handleDelete(m.id, `${m.firstName} ${m.lastName}`)
                            }
                            disabled={updatingId === m.id}
                            className="px-2 py-1 rounded text-xs border border-danger/30 text-danger hover:bg-danger/5 inline-flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" /> Remove
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
