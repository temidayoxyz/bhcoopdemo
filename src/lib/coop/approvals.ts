/**
 * Triple approval chain for cooperative money-out:
 * Financial Secretary → Admin → Super Admin
 */

import type { MoneyOutStep } from './constants';
import type { AppRole } from '../roles';

export type ApprovalAction = 'approve' | 'reject';

export interface ApprovalStamp {
  byUserId: string | null;
  byName: string | null;
  at: number | null;
  note: string | null;
}

export interface MoneyOutApproval {
  step: MoneyOutStep;
  fs: ApprovalStamp;
  admin: ApprovalStamp;
  super: ApprovalStamp;
  rejectReason: string | null;
}

export function emptyApproval(now = 0): MoneyOutApproval {
  const blank: ApprovalStamp = { byUserId: null, byName: null, at: null, note: null };
  return {
    step: 'PENDING_FS',
    fs: { ...blank },
    admin: { ...blank },
    super: { ...blank },
    rejectReason: null,
  };
}

export function stamp(
  userId: string,
  name: string,
  at: number,
  note?: string | null,
): ApprovalStamp {
  return { byUserId: userId, byName: name, at, note: note || null };
}

/**
 * Which permission / role may act on the current step.
 * Super Admin may advance any pending step (records as that step's stamp) so demos can walk the chain alone.
 */
export function canActOnStep(role: string | undefined, step: MoneyOutStep): boolean {
  if (!role) return false;
  if (role === 'SUPER_ADMIN') {
    return step === 'PENDING_FS' || step === 'PENDING_ADMIN' || step === 'PENDING_SUPER';
  }
  if (step === 'PENDING_FS') return role === 'FINANCIAL_SECRETARY';
  if (step === 'PENDING_ADMIN') return role === 'ADMIN';
  if (step === 'PENDING_SUPER') return false; // only Super Admin
  return false;
}

export function stepLabel(step: MoneyOutStep): string {
  switch (step) {
    case 'PENDING_FS':
      return 'Awaiting Financial Secretary';
    case 'PENDING_ADMIN':
      return 'Awaiting Admin';
    case 'PENDING_SUPER':
      return 'Awaiting Super Admin';
    case 'APPROVED':
      return 'Approved';
    case 'REJECTED':
      return 'Rejected';
    default:
      return step;
  }
}

export function nextStepAfterApprove(step: MoneyOutStep): MoneyOutStep {
  if (step === 'PENDING_FS') return 'PENDING_ADMIN';
  if (step === 'PENDING_ADMIN') return 'PENDING_SUPER';
  if (step === 'PENDING_SUPER') return 'APPROVED';
  return step;
}

/**
 * Apply approve/reject to an approval object. Mutates and returns it.
 */
export function applyApprovalAction(
  approval: MoneyOutApproval,
  action: ApprovalAction,
  actor: { userId: string; name: string; role: AppRole | string },
  at: number,
  note?: string | null,
): { ok: boolean; error?: string; executed?: boolean } {
  if (approval.step === 'APPROVED' || approval.step === 'REJECTED') {
    return { ok: false, error: 'This item is already closed' };
  }
  if (!canActOnStep(actor.role, approval.step)) {
    return { ok: false, error: `Your role cannot act on step ${approval.step}` };
  }

  const s = stamp(actor.userId, actor.name, at, note);

  if (action === 'reject') {
    if (approval.step === 'PENDING_FS') approval.fs = s;
    else if (approval.step === 'PENDING_ADMIN') approval.admin = s;
    else approval.super = s;
    approval.step = 'REJECTED';
    approval.rejectReason = note || 'Rejected';
    return { ok: true, executed: false };
  }

  // approve
  if (approval.step === 'PENDING_FS') {
    approval.fs = s;
    approval.step = 'PENDING_ADMIN';
    return { ok: true, executed: false };
  }
  if (approval.step === 'PENDING_ADMIN') {
    approval.admin = s;
    approval.step = 'PENDING_SUPER';
    return { ok: true, executed: false };
  }
  if (approval.step === 'PENDING_SUPER') {
    approval.super = s;
    approval.step = 'APPROVED';
    return { ok: true, executed: true };
  }

  return { ok: false, error: 'Invalid step' };
}

export function approvalTimeline(approval: MoneyOutApproval) {
  return [
    {
      key: 'fs',
      label: 'Financial Secretary',
      stamp: approval.fs,
      state:
        approval.step === 'REJECTED' && !approval.admin.at && approval.fs.at
          ? 'rejected'
          : approval.fs.at
            ? 'done'
            : approval.step === 'PENDING_FS'
              ? 'current'
              : 'pending',
    },
    {
      key: 'admin',
      label: 'Admin',
      stamp: approval.admin,
      state:
        approval.step === 'REJECTED' && approval.admin.at && !approval.super.at
          ? 'rejected'
          : approval.admin.at
            ? 'done'
            : approval.step === 'PENDING_ADMIN'
              ? 'current'
              : 'pending',
    },
    {
      key: 'super',
      label: 'Super Admin',
      stamp: approval.super,
      state:
        approval.step === 'REJECTED' && approval.super.at
          ? 'rejected'
          : approval.super.at || approval.step === 'APPROVED'
            ? 'done'
            : approval.step === 'PENDING_SUPER'
              ? 'current'
              : 'pending',
    },
  ];
}
