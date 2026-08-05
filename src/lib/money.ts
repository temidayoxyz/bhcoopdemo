/** All money is stored as integer kobo (1 NGN = 100 kobo). */

export function formatNaira(kobo: number, opts?: { signed?: boolean }): string {
  const n = Number(kobo) || 0;
  const abs = Math.abs(n) / 100;
  const formatted = abs.toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const sign = opts?.signed ? (n < 0 ? '−' : n > 0 ? '+' : '') : n < 0 ? '−' : '';
  return `₦${sign}${formatted}`;
}

export function nairaToKobo(naira: number): number {
  return Math.round(Number(naira) * 100);
}

export function koboToNaira(kobo: number): number {
  return (Number(kobo) || 0) / 100;
}

export function parseNairaInput(value: string): number {
  const cleaned = value.replace(/[₦,\s]/g, '');
  const n = parseFloat(cleaned);
  if (Number.isNaN(n)) return 0;
  return nairaToKobo(n);
}

export type LedgerSide = 'CREDIT' | 'DEBIT';

/** Co-op treasury view: credits increase pool, debits decrease pool. */
export function sideForType(type: string): LedgerSide {
  switch (type) {
    case 'CONTRIBUTION_PAYMENT':
    case 'DEPOSIT':
    case 'DEPOSIT_FUNDING':
    case 'LOAN_REPAYMENT':
    case 'DEPOSIT_TO_LOAN_REPAYMENT':
    case 'INVESTMENT_RETURN':
    case 'MARKET_PURCHASE':
    case 'REGISTRATION_FEE':
    case 'DEVELOPMENT_FEE':
    case 'DEPOSIT_TO_CONTRIBUTION':
    case 'DEPOSIT_TO_SHARES':
    case 'DEPOSIT_TO_INVESTMENT':
      return 'CREDIT';
    case 'LOAN_DISBURSEMENT':
    case 'WITHDRAWAL':
    case 'WITHDRAWAL_PAYMENT':
    case 'DEPOSIT_WITHDRAWAL':
    case 'DIVIDEND_PAYOUT':
    case 'INVESTMENT_PURCHASE':
    case 'MARKET_REFUND':
      return 'DEBIT';
    default:
      return 'CREDIT';
  }
}

export function makeReference(prefix: string): string {
  const y = new Date().getFullYear();
  const n = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${y}-${n}`;
}
