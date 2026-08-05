import {
  DEV_FEE_DEADLINE_MONTH,
  DEV_FEE_NONRESIDENT_KOBO,
  DEV_FEE_RESIDENT_KOBO,
} from './constants';

export type ResidencyType = 'RESIDENT' | 'NON_RESIDENT';

export function developmentFeeAmount(residency: ResidencyType | string | null | undefined): number {
  return residency === 'NON_RESIDENT' ? DEV_FEE_NONRESIDENT_KOBO : DEV_FEE_RESIDENT_KOBO;
}

/** Unix seconds for 31 March 23:59:59 of the given year (local). */
export function developmentFeeDueAt(year: number): number {
  // Month is 0-indexed; March = 2, day 31 end of day
  const d = new Date(year, DEV_FEE_DEADLINE_MONTH - 1, 31, 23, 59, 59);
  return Math.floor(d.getTime() / 1000);
}

export function isPastDevelopmentFeeDeadline(year: number, nowSec = Math.floor(Date.now() / 1000)): boolean {
  return nowSec > developmentFeeDueAt(year);
}

export function currentFeeYear(now = new Date()): number {
  return now.getFullYear();
}
