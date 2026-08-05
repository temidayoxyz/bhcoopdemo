import { Check, Circle, X } from 'lucide-react';

type Stamp = {
  byName?: string | null;
  at?: number | null;
  note?: string | null;
};

type Step = {
  key: string;
  label: string;
  stamp?: Stamp;
  state: 'done' | 'current' | 'pending' | 'rejected';
};

export function ApprovalTimeline({
  approval,
}: {
  approval?: {
    step?: string;
    fs?: Stamp;
    admin?: Stamp;
    super?: Stamp;
    rejectReason?: string | null;
  } | null;
}) {
  if (!approval) {
    return (
      <p className="text-xs text-ink-500">No approval chain on this item yet.</p>
    );
  }

  const steps: Step[] = [
    {
      key: 'fs',
      label: 'Financial Secretary',
      stamp: approval.fs,
      state: stepState(approval, 'fs'),
    },
    {
      key: 'admin',
      label: 'Admin',
      stamp: approval.admin,
      state: stepState(approval, 'admin'),
    },
    {
      key: 'super',
      label: 'Super Admin',
      stamp: approval.super,
      state: stepState(approval, 'super'),
    },
  ];

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-ink-600 uppercase tracking-wide">Money-out approval</p>
      <ol className="space-y-2">
        {steps.map((s) => (
          <li key={s.key} className="flex items-start gap-2 text-sm">
            <span className="mt-0.5">
              {s.state === 'done' && <Check className="w-4 h-4 text-success" />}
              {s.state === 'rejected' && <X className="w-4 h-4 text-danger" />}
              {s.state === 'current' && <Circle className="w-4 h-4 text-gold-600 fill-gold-200" />}
              {s.state === 'pending' && <Circle className="w-4 h-4 text-ink-300" />}
            </span>
            <div>
              <div className="font-medium text-seed-950">{s.label}</div>
              {s.stamp?.at ? (
                <div className="text-xs text-ink-600">
                  {s.stamp.byName || 'Staff'} · {new Date(s.stamp.at * 1000).toLocaleString()}
                  {s.stamp.note ? ` — ${s.stamp.note}` : ''}
                </div>
              ) : s.state === 'current' ? (
                <div className="text-xs text-gold-700">Awaiting action</div>
              ) : (
                <div className="text-xs text-ink-400">Pending</div>
              )}
            </div>
          </li>
        ))}
      </ol>
      {approval.rejectReason && (
        <p className="text-xs text-danger mt-1">Rejected: {approval.rejectReason}</p>
      )}
    </div>
  );
}

function stepState(
  approval: { step?: string; fs?: Stamp; admin?: Stamp; super?: Stamp },
  key: 'fs' | 'admin' | 'super',
): Step['state'] {
  const step = approval.step || '';
  if (key === 'fs') {
    if (step === 'REJECTED' && approval.fs?.at && !approval.admin?.at) return 'rejected';
    if (approval.fs?.at) return 'done';
    if (step === 'PENDING_FS') return 'current';
    return 'pending';
  }
  if (key === 'admin') {
    if (step === 'REJECTED' && approval.admin?.at && !approval.super?.at) return 'rejected';
    if (approval.admin?.at) return 'done';
    if (step === 'PENDING_ADMIN') return 'current';
    return 'pending';
  }
  if (step === 'REJECTED' && approval.super?.at) return 'rejected';
  if (approval.super?.at || step === 'APPROVED') return 'done';
  if (step === 'PENDING_SUPER') return 'current';
  return 'pending';
}
