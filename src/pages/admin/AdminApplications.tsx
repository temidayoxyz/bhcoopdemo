import { useOutletContext } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { can } from '../../lib/roles';
import { MoneyText } from '../../components/money/MoneyText';
import { REGISTRATION_FEE_KOBO } from '../../lib/coop/constants';

export function AdminApplications() {
  const { user } = useOutletContext<{ user: any }>();
  const [applications, setApplications] = useState<any[]>([]);
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const fetchApplications = () => {
    fetch('/api/admin/applications')
      .then((res) => res.json())
      .then((data) => {
        const apps = data.applications || [];
        setApplications(apps);
        if (apps.length > 0) {
          setSelectedApp((prev: any) => apps.find((a: any) => a.id === prev?.id) || apps[0]);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const handleApprove = async () => {
    if (!selectedApp) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/applications/${selectedApp.id}/approve`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        toast.success(
          `Approved · ${data.member.membershipNumber} · referral ${data.member.referralCode}`,
        );
        fetchApplications();
      } else toast.error(data.error || 'Failed to approve');
    } catch {
      toast.error('An error occurred');
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async () => {
    if (!selectedApp) return;
    const notes = window.prompt('Rejection notes (optional)') || 'Rejected after review';
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/applications/${selectedApp.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Application rejected');
        fetchApplications();
      } else toast.error(data.error || 'Failed');
    } catch {
      toast.error('An error occurred');
    } finally {
      setBusy(false);
    }
  };

  const writable = can(user?.role, 'applications:write');
  const statusColor = (s: string) => {
    if (s === 'PENDING_APPROVAL' || s === 'PENDING') return 'bg-warning/10 text-warning';
    if (s === 'APPROVED') return 'bg-success/10 text-success';
    if (s === 'REJECTED' || s === 'EXPIRED') return 'bg-danger/10 text-danger';
    return 'bg-ink-100 text-ink-700';
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-seed-950">Membership applications</h1>
        <p className="text-ink-600 mt-1">
          Pipeline: referral signup → registration fee → KYM → board approval (background checks).
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white rounded-[10px] border border-ink-200 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-200px)]">
          <div className="p-4 border-b border-ink-200 bg-ink-50 text-sm font-medium">Queue</div>
          <div className="overflow-y-auto flex-1 divide-y divide-ink-100">
            {applications.length === 0 ? (
              <div className="p-8 text-center text-ink-500 text-sm">No applications found.</div>
            ) : (
              applications.map((app) => (
                <div
                  key={app.id}
                  onClick={() => setSelectedApp(app)}
                  className={`p-4 cursor-pointer hover:bg-ivory-50 ${
                    selectedApp?.id === app.id ? 'bg-seed-50 border-l-4 border-seed-600' : 'border-l-4 border-transparent'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-semibold text-seed-950 text-sm">
                      {app.firstName} {app.lastName}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColor(app.status)}`}>
                      {app.status}
                    </span>
                  </div>
                  <div className="text-xs text-ink-600 font-mono">{app.reference}</div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          {selectedApp ? (
            <div className="bg-white rounded-[10px] border border-ink-200 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
              <div className="px-6 py-4 border-b border-ink-200 bg-ink-50 flex justify-between items-center">
                <h3 className="font-semibold text-seed-950">Application dossier</h3>
                <span className="text-sm font-mono text-ink-600">{selectedApp.reference}</span>
              </div>

              <div className="p-6 flex-1 overflow-y-auto space-y-6">
                <section className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-ink-600">Full name</p>
                    <p className="font-medium">
                      {selectedApp.firstName} {selectedApp.middleName || ''} {selectedApp.lastName}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-ink-600">Email</p>
                    <p className="font-medium">{selectedApp.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-ink-600">Phone</p>
                    <p className="font-medium">{selectedApp.phoneNumber}</p>
                  </div>
                  <div>
                    <p className="text-xs text-ink-600">Referral used</p>
                    <p className="font-mono font-medium">{selectedApp.referralCodeUsed || '—'}</p>
                  </div>
                </section>

                <section className="bg-ivory-50 border border-ink-200 rounded-[10px] p-4 text-sm space-y-1">
                  <p className="font-semibold text-seed-950">Registration fee</p>
                  <p>
                    Amount: <MoneyText kobo={REGISTRATION_FEE_KOBO} /> ·{' '}
                    {selectedApp.regFeePaidAt ? (
                      <span className="text-success font-medium">
                        Paid {new Date(selectedApp.regFeePaidAt * 1000).toLocaleString()}
                        {selectedApp.regFeePaymentRef ? ` · ${selectedApp.regFeePaymentRef}` : ''}
                      </span>
                    ) : (
                      <span className="text-warning font-medium">Unpaid</span>
                    )}
                  </p>
                  <p className="text-xs text-ink-600">
                    Payment guarantees onboarding; membership still subject to KYM and background checks.
                  </p>
                </section>

                <section>
                  <h4 className="text-sm font-semibold text-seed-800 uppercase tracking-wider mb-3">
                    Know Your Member
                  </h4>
                  {selectedApp.kym ? (
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-ink-600">Legal name</p>
                        <p className="font-medium">{selectedApp.kym.legalName}</p>
                      </div>
                      <div>
                        <p className="text-xs text-ink-600">ID</p>
                        <p className="font-medium">
                          {selectedApp.kym.idType}: {selectedApp.kym.idNumber}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-ink-600">Occupation</p>
                        <p className="font-medium">{selectedApp.kym.occupation}</p>
                      </div>
                      <div>
                        <p className="text-xs text-ink-600">Salary range</p>
                        <p className="font-medium">{selectedApp.kym.salaryRange}</p>
                      </div>
                      <div>
                        <p className="text-xs text-ink-600">Next of kin</p>
                        <p className="font-medium">
                          {selectedApp.kym.nextOfKinName} ({selectedApp.kym.nextOfKinRelationship}) ·{' '}
                          {selectedApp.kym.nextOfKinPhone}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-ink-600">Residency</p>
                        <p className="font-medium">{selectedApp.kym.residency}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-xs text-ink-600">Address</p>
                        <p className="font-medium">{selectedApp.kym.address}</p>
                      </div>
                      <div>
                        <p className="text-xs text-ink-600">Document</p>
                        <p className="font-mono text-xs">{selectedApp.kym.documentName || '—'}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-ink-500">KYM not submitted yet.</p>
                  )}
                </section>
              </div>

              {writable && selectedApp.status === 'PENDING_APPROVAL' && (
                <div className="px-6 py-4 border-t border-ink-200 bg-ivory-50 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleReject}
                    disabled={busy}
                    className="px-4 py-2 text-sm font-medium text-danger border border-danger/30 rounded-[8px]"
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    onClick={handleApprove}
                    disabled={busy}
                    className="px-6 py-2 text-sm font-medium text-white bg-seed-800 rounded-[8px] hover:bg-seed-700"
                  >
                    {busy ? 'Processing…' : 'Approve & create member'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center border-2 border-dashed border-ink-200 rounded-[10px] text-ink-500 min-h-[300px]">
              Select an application
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
