/**
 * Loan product rules and trial-credit eligibility.
 */

import {
  EMERGENCY_LOAN_MAX_KOBO,
  EMERGENCY_LOAN_MIN_KOBO,
  EMERGENCY_LOAN_RATE,
  LOAN_TERM_OPTIONS,
  NORMAL_LOAN_MAX_KOBO,
  NORMAL_LOAN_MIN_KOBO,
  NORMAL_LOAN_RATE,
  TRIAL_LOAN_PRINCIPAL_KOBO,
  TRIAL_LOAN_RATE,
  TRIAL_LOAN_TERM_MONTHS,
} from './constants';

export type LoanProductCode = 'TRIAL' | 'NORMAL' | 'EMERGENCY';

export type TrialCreditStatus =
  | 'TRIAL_NOT_STARTED'
  | 'TRIAL_ACTIVE'
  | 'TRIAL_CLEAN'
  | 'TRIAL_DEFAULTED';

export interface LoanProductDef {
  code: LoanProductCode;
  name: string;
  minAmountKobo: number;
  maxAmountKobo: number;
  interestRate: number;
  termOptions: number[];
  fixedAmount?: boolean;
  fixedTerm?: boolean;
  requiredGuarantors: number;
  description: string;
}

export const LOAN_PRODUCT_DEFS: LoanProductDef[] = [
  {
    code: 'TRIAL',
    name: 'Trial Loan',
    minAmountKobo: TRIAL_LOAN_PRINCIPAL_KOBO,
    maxAmountKobo: TRIAL_LOAN_PRINCIPAL_KOBO,
    interestRate: TRIAL_LOAN_RATE,
    termOptions: [TRIAL_LOAN_TERM_MONTHS],
    fixedAmount: true,
    fixedTerm: true,
    requiredGuarantors: 0,
    description: 'Compulsory credit test for every member — ₦30,000 at 5% for 3 months.',
  },
  {
    code: 'NORMAL',
    name: 'Normal Loan',
    minAmountKobo: NORMAL_LOAN_MIN_KOBO,
    maxAmountKobo: NORMAL_LOAN_MAX_KOBO,
    interestRate: NORMAL_LOAN_RATE,
    termOptions: [...LOAN_TERM_OPTIONS],
    requiredGuarantors: 1,
    description: 'Standard cooperative loan after a clean Trial Loan — 5% interest.',
  },
  {
    code: 'EMERGENCY',
    name: 'Emergency Loan',
    minAmountKobo: EMERGENCY_LOAN_MIN_KOBO,
    maxAmountKobo: EMERGENCY_LOAN_MAX_KOBO,
    interestRate: EMERGENCY_LOAN_RATE,
    termOptions: [...LOAN_TERM_OPTIONS],
    requiredGuarantors: 1,
    description: 'Emergency support after a clean Trial Loan — 7% interest.',
  },
];

export function flatInterest(principalKobo: number, rate: number): number {
  return Math.round(principalKobo * rate);
}

export function productCodeFromName(name: string): LoanProductCode | null {
  const n = (name || '').toLowerCase();
  if (n.includes('trial')) return 'TRIAL';
  if (n.includes('emergency')) return 'EMERGENCY';
  if (n.includes('normal')) return 'NORMAL';
  return null;
}

export function deriveTrialCreditStatus(loans: Array<{
  loanProductId: string;
  status: string;
  productCode?: string;
  productName?: string;
}> , products: Array<{ id: string; name: string; code?: string }>): TrialCreditStatus {
  const trialProductIds = new Set(
    products
      .filter((p) => p.code === 'TRIAL' || productCodeFromName(p.name) === 'TRIAL')
      .map((p) => p.id),
  );

  const trialLoans = loans.filter((l) => {
    if (l.productCode === 'TRIAL') return true;
    if (l.productName && productCodeFromName(l.productName) === 'TRIAL') return true;
    return trialProductIds.has(l.loanProductId);
  });

  if (trialLoans.length === 0) return 'TRIAL_NOT_STARTED';

  if (trialLoans.some((l) => l.status === 'DEFAULTED' || l.status === 'WRITTEN_OFF')) {
    return 'TRIAL_DEFAULTED';
  }

  if (trialLoans.some((l) => ['ACTIVE', 'APPROVED', 'PENDING_APPROVAL', 'PENDING_FS', 'PENDING_ADMIN', 'PENDING_SUPER'].includes(l.status))) {
    return 'TRIAL_ACTIVE';
  }

  if (trialLoans.some((l) => l.status === 'COMPLETED')) return 'TRIAL_CLEAN';

  return 'TRIAL_NOT_STARTED';
}

export function canApplyForProduct(
  code: LoanProductCode,
  trialStatus: TrialCreditStatus,
  hasOpenLoan: boolean,
  memberStatus: string,
): { ok: boolean; reason?: string } {
  if (memberStatus !== 'ACTIVE') {
    return { ok: false, reason: 'Only active members can apply for loans' };
  }
  if (hasOpenLoan) {
    return { ok: false, reason: 'You already have an open loan application or active loan' };
  }
  if (code === 'TRIAL') {
    if (trialStatus === 'TRIAL_CLEAN') {
      return { ok: false, reason: 'You have already completed your Trial Loan' };
    }
    if (trialStatus === 'TRIAL_ACTIVE') {
      return { ok: false, reason: 'Your Trial Loan is still open' };
    }
    if (trialStatus === 'TRIAL_DEFAULTED') {
      return { ok: false, reason: 'Clear your defaulted Trial Loan before applying again' };
    }
    return { ok: true };
  }
  // Normal / Emergency
  if (trialStatus !== 'TRIAL_CLEAN') {
    return {
      ok: false,
      reason: 'Complete your Trial Loan (pay in full on time) to unlock Normal and Emergency loans',
    };
  }
  return { ok: true };
}

export function trialStatusLabel(status: TrialCreditStatus): string {
  switch (status) {
    case 'TRIAL_CLEAN':
      return 'Credit verified';
    case 'TRIAL_ACTIVE':
      return 'Trial loan in progress';
    case 'TRIAL_DEFAULTED':
      return 'Trial defaulted';
    default:
      return 'Trial loan not started';
  }
}
