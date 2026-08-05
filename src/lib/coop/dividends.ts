/**
 * Share-capital weighted dividend distribution.
 * Always sums exactly to surplusKobo (remainder to largest shareholder).
 */

export interface DividendMember {
  id: string;
  membershipNumber: string;
  sharesBalanceKobo: number;
  status: string;
}

export interface DividendAllocation {
  memberId: string;
  membershipNumber: string;
  sharesBalanceKobo: number;
  amountKobo: number;
  weightShare: number; // 0–1 fraction of pool
}

/**
 * Allocate surplus pro-rata by share capital among ACTIVE members with shares > 0.
 */
export function allocateDividendsByShares(
  surplusKobo: number,
  members: DividendMember[],
): DividendAllocation[] {
  if (surplusKobo <= 0) return [];

  const pool = members
    .filter((m) => m.status === 'ACTIVE' && (m.sharesBalanceKobo || 0) > 0)
    .map((m) => ({
      memberId: m.id,
      membershipNumber: m.membershipNumber,
      sharesBalanceKobo: m.sharesBalanceKobo || 0,
    }))
    .sort((a, b) => {
      // Largest shareholder first for remainder; stable by membership number
      if (b.sharesBalanceKobo !== a.sharesBalanceKobo) {
        return b.sharesBalanceKobo - a.sharesBalanceKobo;
      }
      return a.membershipNumber.localeCompare(b.membershipNumber);
    });

  if (pool.length === 0) return [];

  const totalWeight = pool.reduce((s, m) => s + m.sharesBalanceKobo, 0);
  if (totalWeight <= 0) return [];

  const allocations: DividendAllocation[] = pool.map((m) => {
    const raw = Math.floor((surplusKobo * m.sharesBalanceKobo) / totalWeight);
    return {
      memberId: m.memberId,
      membershipNumber: m.membershipNumber,
      sharesBalanceKobo: m.sharesBalanceKobo,
      amountKobo: raw,
      weightShare: m.sharesBalanceKobo / totalWeight,
    };
  });

  const allocated = allocations.reduce((s, a) => s + a.amountKobo, 0);
  const remainder = surplusKobo - allocated;
  if (remainder > 0 && allocations.length > 0) {
    allocations[0].amountKobo += remainder;
  }

  return allocations;
}

export const DIVIDEND_FORMULA_COPY =
  'Each active member receives: (your share capital ÷ total share capital) × distributable surplus. Amounts are credited to the deposit wallet. Members with zero shares receive ₦0.';
