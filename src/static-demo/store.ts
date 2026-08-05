import { createDefaultState, type CoopState } from '../data/defaultState';
import { isStaff } from '../lib/roles';

export type { CoopState };

// v4: staff names — Dan Segun / Ola Dayo / Tunde Bakare
// v5: member market — products, orders, order items + deposit wallet balances
// v6: Financial Secretary, shares min, trial loans, onboarding, triple approval, deposit withdrawals
// v7: referral = membership number (SA = BH-001), savings rename, live personas
// v8: leave cooperative, investment allocation, referrer display
// v9: monthly savings settings + auto obligations
const STORAGE_KEY = 'bhcoop-state-v1';
const SESSION_KEY = 'bhcoop-session-v1';

export type Session = { userId: string; portal: 'MEMBER' | 'ADMIN' };

export function loadState(): CoopState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as CoopState;
  } catch {
    /* fall through */
  }
  const seed = createDefaultState();
  saveState(seed);
  return seed;
}

export function saveState(state: CoopState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function resetState(): CoopState {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(SESSION_KEY);
  const seed = createDefaultState();
  saveState(seed);
  return seed;
}

export function getSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function setSession(session: Session | null) {
  if (!session) localStorage.removeItem(SESSION_KEY);
  else localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function getAuth(state: CoopState) {
  const session = getSession();
  if (!session) {
    return {
      user: null as any,
      member: null as any,
      portal: null as 'MEMBER' | 'ADMIN' | null,
      canSwitchToMember: false,
      canSwitchToAdmin: false,
    };
  }
  const user = state.users.find((u) => u.id === session.userId) || null;
  if (!user) {
    return {
      user: null,
      member: null,
      portal: null as 'MEMBER' | 'ADMIN' | null,
      canSwitchToMember: false,
      canSwitchToAdmin: false,
    };
  }
  // Staff are members first — always resolve linked member profile when present
  const member = state.members.find((m) => m.userId === user.id) || null;
  const application =
    (state.applications as any[] | undefined)?.find(
      (a) => a.userId === user.id || a.email === user.email,
    ) || null;
  const canSwitchToMember = isStaff(user.role) && !!member;
  const canSwitchToAdmin = isStaff(user.role);
  // Onboarding only while applicant has no active member profile yet
  const needsOnboarding =
    !member &&
    (user.role === 'APPLICANT' ||
      (!!application && !['APPROVED', 'REJECTED', 'EXPIRED'].includes(application.status)));
  return {
    user,
    member,
    application,
    needsOnboarding,
    portal: session.portal,
    canSwitchToMember,
    canSwitchToAdmin,
  };
}

/** Next BH-NNN from existing members */
export function nextMembershipNumber(state: CoopState): string {
  let max = 0;
  for (const m of state.members) {
    const n = parseInt(String(m.membershipNumber || '').replace(/\D/g, ''), 10);
    if (!Number.isNaN(n) && n > max) max = n;
  }
  return `BH-${String(max + 1).padStart(3, '0')}`;
}

/** Resolve who referred a member (by code / membership number). */
export function resolveReferrer(state: CoopState, referredByCode: string | null | undefined) {
  if (!referredByCode) return null;
  const code = String(referredByCode).trim().toUpperCase();
  const m = state.members.find(
    (x: any) =>
      String(x.referralCode || '').toUpperCase() === code ||
      String(x.membershipNumber || '').toUpperCase() === code,
  );
  if (!m) {
    return { code: referredByCode, name: null as string | null, membershipNumber: referredByCode };
  }
  return {
    code: m.membershipNumber,
    name: `${m.firstName} ${m.lastName}`,
    membershipNumber: m.membershipNumber,
  };
}

/** Live sign-in directory (includes newly approved members) */
export function buildPersonas(state: CoopState) {
  const staff = state.users
    .filter((u) => isStaff(u.role))
    .map((u) => {
      const m = state.members.find((x) => x.userId === u.id);
      return {
        email: u.email,
        role: u.role,
        label: m ? `${m.firstName} ${m.lastName}` : (u as any).displayName || u.email,
        subtitle: u.role,
        portal: 'ADMIN' as const,
        membershipNumber: m?.membershipNumber,
        tagline: m
          ? `Staff · also member ${m.membershipNumber} · referral ${m.referralCode || m.membershipNumber}`
          : 'Staff',
      };
    });

  const members = state.users
    .filter((u) => u.role === 'MEMBER')
    .map((u) => {
      const m = state.members.find(
        (x) => x.userId === u.id && x.status !== 'REMOVED' && x.status !== 'LEFT',
      );
      if (!m) return null;
      return {
        email: u.email,
        role: 'MEMBER',
        label: `${m.firstName} ${m.lastName}`,
        subtitle: m.membershipNumber,
        portal: 'MEMBER' as const,
        membershipNumber: m.membershipNumber,
        tagline: `Member · referral ${m.referralCode || m.membershipNumber}`,
      };
    })
    .filter(Boolean)
    .sort((a: any, b: any) =>
      String(a.membershipNumber).localeCompare(String(b.membershipNumber)),
    );

  return { staff, members };
}
