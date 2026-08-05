import { useOutletContext, useNavigate } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { User, Phone, ShieldCheck, Save, LogOut, UserPlus } from 'lucide-react';

export function MemberProfile() {
  const navigate = useNavigate();
  const { member, user, refreshMember } = useOutletContext<{
    member: any;
    user?: any;
    refreshMember?: () => void;
  }>();
  const [phoneNumber, setPhoneNumber] = useState(member?.phoneNumber || '');
  const [firstName, setFirstName] = useState(member?.firstName || '');
  const [lastName, setLastName] = useState(member?.lastName || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [leaveInfo, setLeaveInfo] = useState<{ canLeave: boolean; reason: string | null } | null>(
    null,
  );
  const [leaving, setLeaving] = useState(false);
  const [referrer, setReferrer] = useState<any>(member?.referrer || null);

  useEffect(() => {
    if (member) {
      setPhoneNumber(member.phoneNumber || '');
      setFirstName(member.firstName || '');
      setLastName(member.lastName || '');
      setReferrer(member.referrer || null);
    }
  }, [member]);

  useEffect(() => {
    // Enrich referrer from /api/auth/me if not on outlet member
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        if (d.member?.referrer) setReferrer(d.member.referrer);
      })
      .catch(() => {});
    fetch('/api/members/leave/eligibility')
      .then((r) => r.json())
      .then((d) => setLeaveInfo({ canLeave: !!d.canLeave, reason: d.reason || null }))
      .catch(() => {});
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      const res = await fetch('/api/members/profile/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber, firstName, lastName }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Profile updated successfully.');
        refreshMember?.();
      } else {
        toast.error(data.error || 'Failed to update profile');
      }
    } catch {
      toast.error('An error occurred');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleLeave = async () => {
    if (
      !confirm(
        'Leave Blessed Hands permanently? Your ledger history stays with the cooperative. You will be signed out.',
      )
    ) {
      return;
    }
    setLeaving(true);
    try {
      const res = await fetch('/api/members/leave', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        toast.success('You have left the cooperative');
        navigate('/login', { replace: true });
      } else {
        toast.error(data.error || 'Could not leave');
      }
    } catch {
      toast.error('Could not leave');
    } finally {
      setLeaving(false);
    }
  };

  if (!member) return null;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-seed-950">Profile settings</h1>
        <p className="text-ink-600 mt-1">
          Manage your personal information and cooperative membership.
        </p>
      </header>

      <div className="bg-white rounded-[14px] border border-ink-200 shadow-sm p-6 space-y-6">
        <div className="flex items-center gap-6 border-b border-ink-100 pb-6">
          <div className="w-20 h-20 rounded-full bg-seed-100 text-seed-800 flex items-center justify-center text-2xl font-bold shadow-inner">
            {member.firstName?.[0]}
            {member.lastName?.[0]}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-seed-950">
              {member.firstName} {member.lastName}
            </h2>
            <p className="text-ink-600 font-medium mt-1">
              Member ID:{' '}
              <span className="font-mono text-seed-800 font-semibold">
                {member.membershipNumber}
              </span>
            </p>
            <p className="text-ink-600 font-medium mt-1">
              Referral code:{' '}
              <span className="font-mono text-seed-800 font-semibold">
                {member.referralCode || member.membershipNumber}
              </span>
              <span className="text-xs text-ink-500 ml-2">Same as member number — share to invite</span>
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-success/10 text-success border border-success/20">
                <ShieldCheck className="w-3.5 h-3.5" />
                {member.status === 'ACTIVE' ? 'Active member' : member.status}
              </span>
              <span className="text-xs text-ink-500">
                Joined {new Date(member.joinedAt * 1000).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        {/* Referred by */}
        <div className="bg-ivory-50 border border-ink-200 rounded-[12px] p-4 flex items-start gap-3">
          <UserPlus className="w-5 h-5 text-seed-700 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Referred by</p>
            {referrer?.name ? (
              <p className="text-seed-950 font-medium mt-0.5">
                {referrer.name}{' '}
                <span className="font-mono text-sm text-seed-700">
                  ({referrer.membershipNumber})
                </span>
              </p>
            ) : member.referredByCode ? (
              <p className="font-mono text-seed-800 mt-0.5">{member.referredByCode}</p>
            ) : (
              <p className="text-ink-500 text-sm mt-0.5">No referrer on file (founding / staff seed)</p>
            )}
          </div>
        </div>

        <form onSubmit={handleUpdate} className="space-y-6">
          <h3 className="text-lg font-semibold text-seed-950 flex items-center gap-2">
            <User className="w-5 h-5 text-seed-700" /> Contact & personal details
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-medium text-ink-700 mb-1">First name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-3.5 py-2 border border-ink-200 rounded-[8px] focus:ring-2 focus:ring-seed-500 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-700 mb-1">Last name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-3.5 py-2 border border-ink-200 rounded-[8px] focus:ring-2 focus:ring-seed-500 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-700 mb-1">Membership ID</label>
              <input
                type="text"
                value={member.membershipNumber}
                disabled
                className="w-full px-3.5 py-2 border border-ink-200 rounded-[8px] bg-ink-50 text-ink-500 font-mono text-sm cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-700 mb-1 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-ink-500" /> Phone number
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full px-3.5 py-2 border border-ink-200 rounded-[8px] focus:ring-2 focus:ring-seed-500 outline-none text-sm"
              />
            </div>
          </div>

          <div className="pt-6 border-t border-ink-100 flex justify-end">
            <button
              type="submit"
              disabled={isUpdating}
              className="bg-seed-800 text-white px-6 py-2.5 rounded-[8px] font-medium hover:bg-seed-700 transition-colors disabled:opacity-50 flex items-center gap-2 text-sm"
            >
              <Save className="w-4 h-4" />
              {isUpdating ? 'Saving…' : 'Update profile'}
            </button>
          </div>
        </form>
      </div>

      {/* Leave cooperative */}
      <div className="bg-white rounded-[14px] border border-danger/20 shadow-sm p-6 space-y-3">
        <h3 className="text-lg font-semibold text-seed-950 flex items-center gap-2">
          <LogOut className="w-5 h-5 text-danger" /> Leave the cooperative
        </h3>
        <p className="text-sm text-ink-600">
          Members, admins, and super admins can exit. Your financial history remains on the
          cooperative ledger. Super Admin cannot leave if they are the only Super Admin.
        </p>
        {leaveInfo && !leaveInfo.canLeave && leaveInfo.reason && (
          <p className="text-sm text-warning bg-warning/10 border border-warning/20 rounded-[8px] px-3 py-2">
            {leaveInfo.reason}
          </p>
        )}
        <button
          type="button"
          disabled={leaving || leaveInfo?.canLeave === false}
          onClick={handleLeave}
          className="px-4 py-2.5 rounded-[8px] text-sm font-medium border border-danger/40 text-danger hover:bg-danger/5 disabled:opacity-50"
        >
          {leaving ? 'Leaving…' : 'Leave Blessed Hands'}
        </button>
        {user?.role && user.role !== 'MEMBER' && (
          <p className="text-xs text-ink-500">
            Your staff role ({user.role.replace(/_/g, ' ')}) will end when you leave.
          </p>
        )}
      </div>
    </div>
  );
}
