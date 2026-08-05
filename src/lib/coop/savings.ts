/**
 * Monthly savings obligations — amount set by admin (cooperative settings).
 */

export const DEFAULT_MONTHLY_SAVINGS_KOBO = 2_000_000; // ₦20,000

export function currentMonthPeriod(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/** Due date: 25th of the period month (local), end of day. */
export function obligationDueAt(monthPeriod: string): number {
  const [y, m] = monthPeriod.split('-').map(Number);
  const d = new Date(y, m - 1, 25, 23, 59, 59);
  return Math.floor(d.getTime() / 1000);
}

export type SavingsObligation = {
  id: string;
  memberId: string;
  monthPeriod: string;
  expectedAmountKobo: number;
  paidAmountKobo: number;
  status: string;
  dueDate: number;
};

export function monthlySavingsFromSettings(settings: { monthlySavingsKobo?: number } | null | undefined): number {
  const n = Number(settings?.monthlySavingsKobo);
  return n > 0 ? Math.round(n) : DEFAULT_MONTHLY_SAVINGS_KOBO;
}

/**
 * Ensure an obligation exists for this member + period.
 * Does not overwrite paid amounts on existing rows.
 */
export function ensureObligationForMember(
  obligations: SavingsObligation[],
  memberId: string,
  monthPeriod: string,
  expectedAmountKobo: number,
  makeId: () => string,
): SavingsObligation {
  let ob = obligations.find((o) => o.memberId === memberId && o.monthPeriod === monthPeriod);
  if (ob) return ob;

  const dueDate = obligationDueAt(monthPeriod);
  const nowSec = Math.floor(Date.now() / 1000);
  ob = {
    id: makeId(),
    memberId,
    monthPeriod,
    expectedAmountKobo,
    paidAmountKobo: 0,
    status: nowSec > dueDate ? 'OVERDUE' : 'UNPAID',
    dueDate,
  };
  obligations.push(ob);
  return ob;
}

/** Create current-month obligations for all active members missing one. */
export function ensureAllActiveMemberObligations(
  members: Array<{ id: string; status: string }>,
  obligations: SavingsObligation[],
  expectedAmountKobo: number,
  makeId: () => string,
  monthPeriod = currentMonthPeriod(),
): number {
  let created = 0;
  for (const m of members) {
    if (m.status !== 'ACTIVE' && m.status !== 'SUSPENDED') continue;
    const before = obligations.length;
    ensureObligationForMember(obligations, m.id, monthPeriod, expectedAmountKobo, makeId);
    if (obligations.length > before) created += 1;
  }
  return created;
}
