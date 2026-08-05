export type StaffRole = 'SUPER_ADMIN' | 'ADMIN' | 'FINANCIAL_SECRETARY';
export type AppRole = StaffRole | 'MEMBER' | 'APPLICANT';

export const ROLE_LABELS: Record<AppRole, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  FINANCIAL_SECRETARY: 'Financial Secretary',
  MEMBER: 'Member',
  APPLICANT: 'Applicant',
};

export const ROLE_DUTIES: Record<StaffRole, string> = {
  SUPER_ADMIN: 'Full control — membership, final money-out approval, investments, dividends, settings, roles, and system reset',
  ADMIN: 'Governance — applications, member suspend, second money-out approval (no final treasury authority)',
  FINANCIAL_SECRETARY: 'Treasury ops — contributions, fees, first money-out approval, ledger visibility',
};

type Permission =
  | 'applications:write'
  | 'members:write'
  | 'members:suspend'
  | 'members:delete'
  | 'members:roles'
  | 'contributions:write'
  | 'funds:write'
  | 'loans:approve'
  | 'loans:disburse'
  | 'investments:write'
  | 'dividends:write'
  | 'money_out:first'
  | 'money_out:second'
  | 'money_out:final'
  | 'market:write'
  | 'settings:write'
  | 'reset:write'
  | 'ledger:read'
  | 'reports:read'
  | 'outbox:read';

/**
 * Three staff roles with clear separation of duties:
 * - Super Admin: everything including final money-out, delete members, role assignment
 * - Admin: governance + second money-out approval
 * - Financial Secretary: treasury first approval + fee/contribution ops
 */
const MATRIX: Record<StaffRole, Permission[]> = {
  SUPER_ADMIN: [
    'applications:write',
    'members:write',
    'members:suspend',
    'members:delete',
    'members:roles',
    'contributions:write',
    'funds:write',
    'loans:approve',
    'loans:disburse',
    'investments:write',
    'dividends:write',
    'money_out:first',
    'money_out:second',
    'money_out:final',
    'market:write',
    'settings:write',
    'reset:write',
    'ledger:read',
    'reports:read',
    'outbox:read',
  ],
  ADMIN: [
    'applications:write',
    'members:write',
    'members:suspend',
    'loans:approve',
    'money_out:second',
    'market:write',
    'ledger:read',
    'reports:read',
    'outbox:read',
  ],
  FINANCIAL_SECRETARY: [
    'contributions:write',
    'funds:write',
    'loans:disburse',
    'investments:write',
    'dividends:write',
    'money_out:first',
    'market:write',
    'ledger:read',
    'reports:read',
    'outbox:read',
  ],
};

/** Migrate legacy role id from older seeds */
export function normalizeRole(role: string | undefined): string {
  if (role === 'TREASURER') return 'FINANCIAL_SECRETARY';
  return role || '';
}

export function can(role: string | undefined, permission: Permission): boolean {
  const r = normalizeRole(role);
  if (!r || r === 'MEMBER' || r === 'APPLICANT') return false;
  const list = MATRIX[r as StaffRole];
  return !!list?.includes(permission);
}

export function isStaff(role: string | undefined): boolean {
  const r = normalizeRole(role);
  return r === 'SUPER_ADMIN' || r === 'ADMIN' || r === 'FINANCIAL_SECRETARY';
}

export type NavKey =
  | 'dashboard'
  | 'applications'
  | 'members'
  | 'contributions'
  | 'shares'
  | 'deposits'
  | 'withdrawals'
  | 'fees'
  | 'loans'
  | 'market'
  | 'marketOrders'
  | 'investments'
  | 'dividends'
  | 'ledger'
  | 'reports'
  | 'outbox'
  | 'profile'
  | 'settings';

export function adminNavForRole(role: string): NavKey[] {
  const r = normalizeRole(role);
  if (r === 'SUPER_ADMIN') {
    return [
      'dashboard', 'applications', 'members', 'contributions', 'shares', 'deposits', 'withdrawals', 'fees',
      'loans', 'market', 'marketOrders', 'investments', 'dividends', 'ledger', 'reports', 'outbox', 'profile', 'settings',
    ];
  }
  if (r === 'ADMIN') {
    return [
      'dashboard', 'applications', 'members', 'contributions', 'shares', 'deposits', 'withdrawals', 'fees',
      'loans', 'market', 'marketOrders', 'investments', 'dividends', 'ledger', 'reports', 'outbox', 'profile',
    ];
  }
  // Financial Secretary — money ops, no applications / settings
  return [
    'dashboard', 'members', 'contributions', 'shares', 'deposits', 'withdrawals', 'fees',
    'loans', 'market', 'marketOrders', 'investments', 'dividends', 'ledger', 'reports', 'outbox', 'profile',
  ];
}
