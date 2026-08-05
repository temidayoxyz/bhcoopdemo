import { MIN_SHARES_KOBO } from './constants';

/**
 * Minimum purchase required to reach share-capital floor.
 * After floor is met, any positive amount is allowed.
 */
export function minSharesPurchaseKobo(currentSharesKobo: number): number {
  const current = currentSharesKobo || 0;
  if (current >= MIN_SHARES_KOBO) return 1; // any positive top-up (caller still checks > 0)
  return MIN_SHARES_KOBO - current;
}

export function validateSharesPurchase(
  currentSharesKobo: number,
  purchaseKobo: number,
): { ok: boolean; error?: string; minRequired: number } {
  const minRequired = minSharesPurchaseKobo(currentSharesKobo);
  if (purchaseKobo <= 0) {
    return { ok: false, error: 'Share purchase must be greater than zero', minRequired };
  }
  if (currentSharesKobo < MIN_SHARES_KOBO && purchaseKobo < minRequired) {
    return {
      ok: false,
      error: `Minimum share capital is ₦${(MIN_SHARES_KOBO / 100).toLocaleString()}. Purchase at least ₦${(minRequired / 100).toLocaleString()} to meet the minimum.`,
      minRequired,
    };
  }
  return { ok: true, minRequired };
}

export function meetsShareMinimum(sharesKobo: number): boolean {
  return (sharesKobo || 0) >= MIN_SHARES_KOBO;
}
