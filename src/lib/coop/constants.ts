/**
 * Cooperative policy constants — single source of truth for demo rules.
 * All money values are integer kobo.
 */

export const REGISTRATION_FEE_KOBO = 200_000; // ₦2,000
export const REG_FEE_DEADLINE_DAYS = 7;

export const MIN_SHARES_KOBO = 2_000_000; // ₦20,000

export const TRIAL_LOAN_PRINCIPAL_KOBO = 3_000_000; // ₦30,000
export const TRIAL_LOAN_RATE = 0.05;
export const TRIAL_LOAN_TERM_MONTHS = 3;

export const NORMAL_LOAN_RATE = 0.05;
export const EMERGENCY_LOAN_RATE = 0.07;

/** Allowed term options for Normal and Emergency loans */
export const LOAN_TERM_OPTIONS = [1, 3, 6, 12] as const;

export const NORMAL_LOAN_MIN_KOBO = 5_000_000; // ₦50,000
export const NORMAL_LOAN_MAX_KOBO = 500_000_000; // ₦5,000,000
export const EMERGENCY_LOAN_MIN_KOBO = 5_000_000;
export const EMERGENCY_LOAN_MAX_KOBO = 500_000_000;

export const DEV_FEE_RESIDENT_KOBO = 600_000; // ₦6,000
export const DEV_FEE_NONRESIDENT_KOBO = 1_200_000; // ₦12,000
/** Development fee must be paid by end of this month (1-indexed March = 3) */
export const DEV_FEE_DEADLINE_MONTH = 3;

/** Super Admin membership number doubles as the cold-start referral code */
export const SUPER_ADMIN_REFERRAL_CODE = 'BH-001';

export const SALARY_RANGES = [
  { value: 'UNDER_500K', label: 'Under ₦500,000' },
  { value: '500K_1M', label: '₦500,000 – ₦1,000,000' },
  { value: '1M_3M', label: '₦1,000,000 – ₦3,000,000' },
  { value: '3M_5M', label: '₦3,000,000 – ₦5,000,000' },
  { value: 'OVER_5M', label: 'Over ₦5,000,000' },
] as const;

export const ID_TYPES = [
  { value: 'NATIONAL_ID', label: 'National ID (NIN)' },
  { value: 'DRIVERS_LICENSE', label: "Driver's Licence" },
  { value: 'VOTERS_CARD', label: "Voter's Card" },
  { value: 'PASSPORT', label: 'International Passport' },
] as const;

export const APPLICATION_STATUSES = [
  'AWAITING_PAYMENT',
  'AWAITING_KYM',
  'PENDING_APPROVAL',
  'APPROVED',
  'REJECTED',
  'EXPIRED',
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const MONEY_OUT_STEPS = ['PENDING_FS', 'PENDING_ADMIN', 'PENDING_SUPER', 'APPROVED', 'REJECTED'] as const;
export type MoneyOutStep = (typeof MONEY_OUT_STEPS)[number];
