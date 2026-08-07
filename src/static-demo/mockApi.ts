import { createDefaultState } from '../data/defaultState';
import { can, isStaff, normalizeRole, ROLE_LABELS } from '../lib/roles';
import { makeReference, sideForType } from '../lib/money';
import {
  buildPersonas,
  getAuth,
  getSession,
  loadState,
  nextMembershipNumber,
  resetState,
  resolveReferrer,
  saveState,
  setSession,
  type CoopState,
} from './store';
import {
  REGISTRATION_FEE_KOBO,
  REG_FEE_DEADLINE_DAYS,
  SUPER_ADMIN_REFERRAL_CODE,
} from '../lib/coop/constants';
import {
  canApplyForProduct,
  deriveTrialCreditStatus,
  flatInterest,
  productCodeFromName,
  type LoanProductCode,
} from '../lib/coop/loans';
import { validateSharesPurchase } from '../lib/coop/shares';
import { allocateDividendsByShares, DIVIDEND_FORMULA_COPY } from '../lib/coop/dividends';
import {
  applyApprovalAction,
  emptyApproval,
} from '../lib/coop/approvals';
import { developmentFeeAmount, developmentFeeDueAt, currentFeeYear } from '../lib/coop/fees';
import {
  currentMonthPeriod,
  ensureAllActiveMemberObligations,
  ensureObligationForMember,
  monthlySavingsFromSettings,
} from '../lib/coop/savings';

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function pathOf(url: string): string {
  try {
    const u = new URL(url, window.location.origin);
    return u.pathname.replace(/\/+$/, '') || '/';
  } catch {
    return url.split('?')[0];
  }
}

function queryOf(url: string): URLSearchParams {
  try {
    const u = new URL(url, window.location.origin);
    return u.searchParams;
  } catch {
    return new URLSearchParams();
  }
}

function now() {
  return Math.floor(Date.now() / 1000);
}

function uid() {
  return crypto.randomUUID();
}

async function readBody(init?: RequestInit): Promise<any> {
  if (!init?.body) return {};
  if (typeof init.body === 'string') {
    try {
      return JSON.parse(init.body);
    } catch {
      return {};
    }
  }
  return {};
}

function requireMember(state: CoopState) {
  const { user, member, portal } = getAuth(state);
  // Member portal only — staff dual-identity uses portal switch, not role demotion
  if (!user || !member || portal !== 'MEMBER') return null;
  return { user, member };
}

function requireStaff(state: CoopState) {
  const { user, portal } = getAuth(state);
  if (!user || !isStaff(user.role) || portal !== 'ADMIN') return null;
  return user;
}

function pushLedger(
  state: CoopState,
  opts: {
    reference: string;
    type: string;
    amountKobo: number;
    description: string;
    memberId: string | null;
  },
) {
  state.ledger.unshift({
    id: uid(),
    reference: opts.reference,
    type: opts.type,
    status: 'COMPLETED',
    description: opts.description,
    amountKobo: opts.amountKobo,
    date: now(),
    memberId: opts.memberId,
    side: sideForType(opts.type),
  });
}

function pushMail(
  state: CoopState,
  recipient: string,
  template: string,
  subject: string,
  payload: object,
  body: string,
) {
  state.outbox.unshift({
    id: uid(),
    recipient,
    template,
    subject,
    payload: JSON.stringify(payload),
    body,
    sentAt: now(),
  });
}

function enrichGuarantors(state: CoopState, loanId: string) {
  return state.guarantorRequests
    .filter((g) => g.loanId === loanId)
    .map((g) => {
      const m = state.members.find((x) => x.id === g.guarantorMemberId);
      return {
        id: g.id,
        status: g.status,
        member: m
          ? {
              id: m.id,
              firstName: m.firstName,
              lastName: m.lastName,
              membershipNumber: m.membershipNumber,
            }
          : null,
      };
    });
}

function memberStatements(state: CoopState, memberId: string) {
  const rows = state.ledger
    .filter((l) => l.memberId === memberId)
    .sort((a, b) => a.date - b.date);

  let balance = 0;
  const lines = rows.map((r) => {
    // Member thrift balance view: contributions/deposits/dividends increase; withdrawals decrease
    if (['CONTRIBUTION_PAYMENT', 'DEPOSIT', 'DIVIDEND_PAYOUT'].includes(r.type) && r.memberId === memberId) {
      // Dividend was co-op debit but credit to member savings
      if (r.type === 'DIVIDEND_PAYOUT') balance += r.amountKobo;
      else balance += r.amountKobo;
    } else if (r.type === 'WITHDRAWAL' || r.type === 'WITHDRAWAL_PAYMENT') {
      balance -= r.amountKobo;
    }
    // Loan disbursement/repayment tracked separately for statement display
    return {
      ...r,
      runningBalanceKobo: balance,
    };
  });

  // Align opening so final balance matches member.totalContributionsKobo
  const member = state.members.find((m) => m.id === memberId)!;
  const last = lines[lines.length - 1]?.runningBalanceKobo ?? 0;
  const delta = member.totalContributionsKobo - last;
  if (delta !== 0 && lines.length) {
    for (const line of lines) line.runningBalanceKobo += delta;
  }

  return lines.reverse();
}

function coOpPoolTotals(state: CoopState) {
  let credits = 0;
  let debits = 0;
  for (const l of state.ledger) {
    if (l.side === 'CREDIT') credits += l.amountKobo;
    else debits += l.amountKobo;
  }
  return { credits, debits, net: credits - debits };
}

export async function handleMockApi(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const method = (init?.method || 'GET').toUpperCase();
  const path = pathOf(url);
  const apiPath = path.includes('/api/') ? path.slice(path.indexOf('/api/')) : path;
  let state = loadState();
  const body = method !== 'GET' && method !== 'HEAD' ? await readBody(init) : {};

  // —— Public / auth ——
  if (apiPath === '/api/health') return json({ status: 'ok' });

  if (apiPath === '/api/auth/personas' && method === 'GET') {
    const personas = buildPersonas(state);
    // Keep snapshot in state for any UI that still reads it
    (state as any).personas = personas;
    saveState(state);
    return json({
      personas,
      passwordHint: state.password,
      note: 'Seeded accounts use the shared password. Newly joined members use the password they chose at signup.',
    });
  }

  if (apiPath === '/api/auth/login' && method === 'POST') {
    const user = state.users.find((u) => u.email === body.email);
    if (!user || user.passwordHash !== body.password) {
      return json({ error: 'Invalid credentials' }, 401);
    }
    const member = state.members.find((m) => m.userId === user.id) || null;
    const portal = body.portal as 'MEMBER' | 'ADMIN';

    if (portal === 'MEMBER') {
      // Applicants onboard without a member row yet; approved members + staff dual-identity
      if (!member && user.role !== 'APPLICANT') {
        return json({ error: 'No member profile linked to this account' }, 403);
      }
      if (member?.status === 'REMOVED') {
        return json({ error: 'This membership has been removed' }, 403);
      }
    } else if (portal === 'ADMIN') {
      if (!isStaff(user.role)) {
        return json({ error: 'Not a staff account' }, 403);
      }
    } else {
      return json({ error: 'Invalid portal' }, 400);
    }

    setSession({ userId: user.id, portal });
    const auth = getAuth(state);
    // Just-approved members see the welcome (congrats) page once before the
    // dashboard — tracked via application.welcomeSeenAt
    const application = auth.application as any;
    const needsWelcome =
      !!auth.member &&
      !!application &&
      application.status === 'APPROVED' &&
      !application.welcomeSeenAt;
    return json({
      success: true,
      ...auth,
      onboarding: !!auth.needsOnboarding || needsWelcome,
      // Client can route: onboarding → /member/onboarding, else dashboard
      redirectTo: auth.needsOnboarding || needsWelcome
        ? '/member/onboarding'
        : portal === 'ADMIN'
          ? '/admin/dashboard'
          : '/member/dashboard',
    });
  }

  if (apiPath === '/api/auth/switch-portal' && method === 'POST') {
    const session = getSession();
    if (!session) return json({ error: 'Not signed in' }, 401);
    const user = state.users.find((u) => u.id === session.userId);
    if (!user) return json({ error: 'Not signed in' }, 401);
    const member = state.members.find((m) => m.userId === user.id) || null;
    const portal = body.portal as 'MEMBER' | 'ADMIN';

    if (portal === 'MEMBER') {
      if (!isStaff(user.role) || !member) {
        return json({ error: 'Cannot switch to member view' }, 403);
      }
    } else if (portal === 'ADMIN') {
      if (!isStaff(user.role)) {
        return json({ error: 'Cannot switch to staff view' }, 403);
      }
    } else {
      return json({ error: 'Invalid portal' }, 400);
    }

    setSession({ userId: user.id, portal });
    return json({ success: true, ...getAuth(state) });
  }

  if (apiPath === '/api/auth/logout' && method === 'POST') {
    setSession(null);
    return json({ success: true });
  }

  if (apiPath === '/api/auth/me' && method === 'GET') {
    const auth = getAuth(state);
    if (auth.member) {
      const referrer = resolveReferrer(state, (auth.member as any).referredByCode);
      return json({
        ...auth,
        member: {
          ...auth.member,
          investmentBalanceKobo: (auth.member as any).investmentBalanceKobo || 0,
          referrer,
        },
      });
    }
    return json(auth);
  }

  if (apiPath === '/api/system/reset' && method === 'POST') {
    // Available from sign-in and staff settings so walkthroughs can restore a clean state
    state = resetState();
    return json({ success: true, message: 'Cooperative data restored to default state' });
  }

  // —— Member ——
  if (apiPath === '/api/members/dashboard' && method === 'GET') {
    const auth = requireMember(state);
    if (!auth) return json({ error: 'Unauthorized' }, 401);
    const member = state.members.find((m) => m.id === auth.member.id)!;
    // Ensure monthly savings obligation exists (amount from admin settings)
    if (!state.obligations) (state as any).obligations = [];
    if (!(state as any).settings) {
      (state as any).settings = { monthlySavingsKobo: 2_000_000, loanThriftMultiplier: 2 };
    }
    const monthlyAmt = monthlySavingsFromSettings((state as any).settings);
    ensureObligationForMember(
      state.obligations as any,
      member.id,
      currentMonthPeriod(),
      monthlyAmt,
      uid,
    );
    saveState(state);
    const loans = state.loans
      .filter((l) => l.memberId === member.id)
      .sort((a, b) => b.appliedAt - a.appliedAt)
      .map((loan) => ({ ...loan, guarantors: enrichGuarantors(state, loan.id) }));
    const obligations = state.obligations
      .filter((o) => o.memberId === member.id)
      .sort((a, b) => b.dueDate - a.dueDate);
    const dividends = state.dividendAllocations
      .filter((d) => d.memberId === member.id)
      .map((d) => ({
        ...d,
        period: state.dividendPeriods.find((p) => p.id === d.periodId),
      }));
    const pool = coOpPoolTotals(state);
    const referrer = resolveReferrer(state, (member as any).referredByCode);
    return json({
      member: {
        ...member,
        investmentBalanceKobo: (member as any).investmentBalanceKobo || 0,
        referrer,
      },
      loans,
      obligations,
      dividends,
      investments: state.investments
        .filter((i: any) => i.status === 'ACTIVE')
        .map((i: any) => ({
          id: i.id,
          name: i.name,
          category: i.category,
          currentValueKobo: i.currentValueKobo,
          expectedReturnRate: i.expectedReturnRate,
        })),
      investmentsSummary: {
        activeCount: state.investments.filter((i) => i.status === 'ACTIVE').length,
        totalValueKobo: state.investments.reduce((s, i) => s + i.currentValueKobo, 0),
        memberInvestmentKobo: (member as any).investmentBalanceKobo || 0,
      },
      coOpNetKobo: pool.net,
      settings: {
        monthlySavingsKobo: monthlySavingsFromSettings((state as any).settings),
      },
    });
  }

  if (apiPath === '/api/members/contributions/pay' && method === 'POST') {
    const auth = requireMember(state);
    if (!auth) return json({ error: 'Unauthorized' }, 401);
    const obligation = state.obligations.find((o) => o.id === body.obligationId);
    if (!obligation || obligation.memberId !== auth.member.id) {
      return json({ error: 'Obligation not found' }, 404);
    }
    const outstanding = obligation.expectedAmountKobo - obligation.paidAmountKobo;
    if (outstanding <= 0) return json({ error: 'Obligation already paid' }, 400);
    // Optional partial; default pay remaining
    let amountToPay = body.amountKobo != null ? Math.round(Number(body.amountKobo)) : outstanding;
    if (amountToPay <= 0) return json({ error: 'Invalid amount' }, 400);
    if (amountToPay > outstanding) amountToPay = outstanding;

    const member = state.members.find((m) => m.id === auth.member.id)!;
    const wallet = member.depositBalanceKobo || 0;
    // Prefer deposit wallet; allow body.source = 'EXTERNAL' for demo card/transfer
    const source = body.source === 'EXTERNAL' ? 'EXTERNAL' : 'DEPOSIT_WALLET';
    if (source === 'DEPOSIT_WALLET') {
      if (amountToPay > wallet) {
        return json({
          error: `Insufficient deposit wallet (₦${(wallet / 100).toLocaleString()}). Top up deposits first, or allocate from deposit.`,
        }, 400);
      }
      member.depositBalanceKobo = wallet - amountToPay;
    }

    obligation.paidAmountKobo += amountToPay;
    obligation.status =
      obligation.paidAmountKobo >= obligation.expectedAmountKobo
        ? 'PAID'
        : obligation.paidAmountKobo > 0
          ? 'PARTIAL'
          : obligation.status;
    member.totalContributionsKobo += amountToPay;
    const ref = makeReference('PAY');
    pushLedger(state, {
      reference: ref,
      type: source === 'DEPOSIT_WALLET' ? 'DEPOSIT_TO_CONTRIBUTION' : 'CONTRIBUTION_PAYMENT',
      amountKobo: amountToPay,
      description: `Monthly savings ${obligation.monthPeriod} — ${member.membershipNumber}`,
      memberId: member.id,
    });
    pushMail(
      state,
      auth.user.email,
      'SAVINGS_RECEIPT',
      `Savings receipt ${ref}`,
      { amountKobo: amountToPay, reference: ref, period: obligation.monthPeriod },
      `Payment of ₦${(amountToPay / 100).toFixed(2)} for ${obligation.monthPeriod} monthly savings. Ref: ${ref}`,
    );
    saveState(state);
    return json({
      success: true,
      reference: ref,
      amountKobo: amountToPay,
      balances: {
        depositBalanceKobo: member.depositBalanceKobo,
        totalContributionsKobo: member.totalContributionsKobo,
      },
      receipt: {
        title: 'Monthly savings receipt',
        reference: ref,
        amountKobo: amountToPay,
        memberName: `${member.firstName} ${member.lastName}`,
        membershipNumber: member.membershipNumber,
        description: `Monthly savings for ${obligation.monthPeriod}`,
        typeLabel: source === 'DEPOSIT_WALLET' ? 'Paid from deposit wallet' : 'External payment',
        date: now(),
      },
    });
  }

  // Loan repayment from deposit wallet
  const loanRepay = apiPath.match(/^\/api\/members\/loans\/([^/]+)\/repay$/);
  if (loanRepay && method === 'POST') {
    const auth = requireMember(state);
    if (!auth) return json({ error: 'Unauthorized' }, 401);
    const loan = state.loans.find((l) => l.id === loanRepay[1]);
    if (!loan || loan.memberId !== auth.member.id) return json({ error: 'Loan not found' }, 404);
    if (loan.status !== 'ACTIVE') {
      return json({ error: 'Only active loans can be repaid' }, 400);
    }
    const outstanding = loan.totalDueKobo - loan.paidKobo;
    if (outstanding <= 0) return json({ error: 'Loan is already fully paid' }, 400);
    let amountKobo = body.amountKobo != null ? Math.round(Number(body.amountKobo)) : outstanding;
    if (amountKobo <= 0) return json({ error: 'Invalid amount' }, 400);
    if (amountKobo > outstanding) amountKobo = outstanding;
    const member = state.members.find((m) => m.id === auth.member.id)!;
    const wallet = member.depositBalanceKobo || 0;
    if (amountKobo > wallet) {
      return json({
        error: `Insufficient deposit wallet (₦${(wallet / 100).toLocaleString()}). Top up deposits first.`,
      }, 400);
    }
    member.depositBalanceKobo = wallet - amountKobo;
    loan.paidKobo += amountKobo;
    if (loan.paidKobo >= loan.totalDueKobo) loan.status = 'COMPLETED';
    const ref = makeReference('REP');
    pushLedger(state, {
      reference: ref,
      type: 'DEPOSIT_TO_LOAN_REPAYMENT',
      amountKobo,
      description: `Loan repayment ${loan.reference} from deposit — ${member.membershipNumber}`,
      memberId: member.id,
    });
    pushMail(
      state,
      auth.user.email,
      'LOAN_REPAYMENT',
      `Loan repayment ${ref}`,
      { amountKobo, reference: ref, loanReference: loan.reference },
      `₦${(amountKobo / 100).toFixed(2)} repaid on ${loan.reference} from your deposit wallet.`,
    );
    saveState(state);
    return json({
      success: true,
      reference: ref,
      amountKobo,
      loan: {
        id: loan.id,
        paidKobo: loan.paidKobo,
        totalDueKobo: loan.totalDueKobo,
        status: loan.status,
        outstandingKobo: Math.max(0, loan.totalDueKobo - loan.paidKobo),
      },
      balances: { depositBalanceKobo: member.depositBalanceKobo },
      receipt: {
        title: 'Loan repayment receipt',
        reference: ref,
        amountKobo,
        memberName: `${member.firstName} ${member.lastName}`,
        membershipNumber: member.membershipNumber,
        description: `Repayment on ${loan.reference}`,
        typeLabel: 'Paid from deposit wallet',
        date: now(),
      },
    });
  }

  // Back-compat alias
  if (apiPath === '/api/members/contributions/simulate-payment' && method === 'POST') {
    return handleMockApi('/api/members/contributions/pay', {
      method: 'POST',
      body: JSON.stringify({ obligationId: body.obligationId }),
    });
  }

  if (apiPath === '/api/members/loans/metadata' && method === 'GET') {
    const auth = requireMember(state);
    if (!auth) return json({ error: 'Unauthorized' }, 401);
    const member = state.members.find((m) => m.id === auth.member.id)!;
    const unpaid = state.obligations.some(
      (o) => o.memberId === member.id && (o.status === 'UNPAID' || o.status === 'OVERDUE' || o.status === 'PARTIAL'),
    );
    const openStatuses = ['ACTIVE', 'PENDING_APPROVAL', 'APPROVED', 'PENDING_FS', 'PENDING_ADMIN', 'PENDING_SUPER'];
    const hasOpenLoan = state.loans.some((l) => l.memberId === member.id && openStatuses.includes(l.status));
    const trialStatus = deriveTrialCreditStatus(
      state.loans.filter((l) => l.memberId === member.id),
      state.loanProducts as any,
    );
    const products = state.loanProducts.map((p: any) => {
      const code = (p.code || productCodeFromName(p.name) || 'NORMAL') as LoanProductCode;
      const gate = canApplyForProduct(code, trialStatus, hasOpenLoan, member.status);
      const contribBlock = unpaid ? { ok: false, reason: 'Settle outstanding contributions first' } : { ok: true };
      const ok = gate.ok && contribBlock.ok && member.status === 'ACTIVE';
      return {
        ...p,
        code,
        termOptions: p.termOptions || [p.maxTermMonths],
        canApply: ok,
        blockReason: !ok ? (gate.reason || contribBlock.reason || 'Not eligible') : null,
      };
    });
    return json({
      products,
      eligibleGuarantors: state.members.filter((m) => m.status === 'ACTIVE' && m.id !== member.id),
      trialCreditStatus: trialStatus,
      eligibility: {
        eligible: products.some((p: any) => p.canApply),
        hasOpenLoan,
        unpaidContributions: unpaid,
        reasons: [
          member.status !== 'ACTIVE' ? 'Membership is not active' : null,
          unpaid ? 'Settle outstanding contributions first' : null,
          hasOpenLoan ? 'You already have an open loan application or active loan' : null,
          trialStatus !== 'TRIAL_CLEAN' && trialStatus !== 'TRIAL_NOT_STARTED'
            ? null
            : trialStatus === 'TRIAL_NOT_STARTED'
              ? 'Take the Trial Loan to unlock Normal and Emergency loans'
              : null,
        ].filter(Boolean),
      },
    });
  }

  if (apiPath === '/api/members/loans/apply' && method === 'POST') {
    const auth = requireMember(state);
    if (!auth) return json({ error: 'Unauthorized' }, 401);
    const member = state.members.find((m) => m.id === auth.member.id)!;
    const product = state.loanProducts.find((p: any) => p.id === body.productId) as any;
    if (!product) return json({ error: 'Invalid product' }, 400);
    const code = (product.code || productCodeFromName(product.name) || 'NORMAL') as LoanProductCode;
    const openStatuses = ['ACTIVE', 'PENDING_APPROVAL', 'APPROVED', 'PENDING_FS', 'PENDING_ADMIN', 'PENDING_SUPER'];
    const hasOpenLoan = state.loans.some((l) => l.memberId === member.id && openStatuses.includes(l.status));
    const trialStatus = deriveTrialCreditStatus(
      state.loans.filter((l) => l.memberId === member.id),
      state.loanProducts as any,
    );
    const gate = canApplyForProduct(code, trialStatus, hasOpenLoan, member.status);
    if (!gate.ok) return json({ error: gate.reason }, 400);

    let amountKobo = Math.round(Number(body.amountKobo) || 0);
    let termMonths = Math.round(Number(body.termMonths) || 0);
    if (code === 'TRIAL') {
      amountKobo = product.minAmountKobo;
      termMonths = product.maxTermMonths || 3;
    }
    if (amountKobo < product.minAmountKobo || amountKobo > product.maxAmountKobo) {
      return json({ error: 'Amount is outside the allowed range for this product' }, 400);
    }
    const termOptions: number[] = product.termOptions || [product.maxTermMonths];
    if (!termOptions.includes(termMonths)) {
      return json({ error: `Term must be one of: ${termOptions.join(', ')} months` }, 400);
    }
    const guarantors: string[] = body.guarantors || [];
    if (guarantors.length < (product.requiredGuarantors || 0)) {
      return json({ error: `This loan requires ${product.requiredGuarantors} guarantor(s)` }, 400);
    }

    const loanId = uid();
    const reference = makeReference('LN');
    const interestKobo = flatInterest(amountKobo, product.interestRate);
    const approval = emptyApproval();
    state.loans.unshift({
      id: loanId,
      memberId: member.id,
      loanProductId: body.productId,
      reference,
      principalKobo: amountKobo,
      interestKobo,
      totalDueKobo: amountKobo + interestKobo,
      paidKobo: 0,
      termMonths,
      status: 'PENDING_FS',
      appliedAt: now(),
      disbursedAt: null,
      approval,
    } as any);
    for (const gid of guarantors) {
      state.guarantorRequests.push({
        id: uid(),
        loanId,
        guarantorMemberId: gid,
        status: 'ACCEPTED',
        comment: null,
        requestedAt: now(),
      });
    }
    pushMail(
      state,
      auth.user.email,
      'LOAN_RECEIVED',
      `Loan application ${reference} received`,
      { reference, amountKobo },
      `Your ${product.name} application ${reference} is in the approval queue (Financial Secretary → Admin → Super Admin).`,
    );
    saveState(state);
    return json({ success: true, reference });
  }

  const memberLoanCancel = apiPath.match(/^\/api\/members\/loans\/([^/]+)\/cancel$/);
  if (memberLoanCancel && method === 'POST') {
    const auth = requireMember(state);
    if (!auth) return json({ error: 'Unauthorized' }, 401);
    const loan = state.loans.find((l) => l.id === memberLoanCancel[1]);
    if (!loan || loan.memberId !== auth.member.id) return json({ error: 'Not found' }, 404);
    if (!['PENDING_APPROVAL', 'PENDING_FS'].includes(loan.status)) {
      return json({ error: 'Only early-stage applications can be cancelled' }, 400);
    }
    loan.status = 'CANCELLED';
    saveState(state);
    return json({ success: true });
  }

  if (apiPath === '/api/members/funds' && method === 'GET') {
    const auth = requireMember(state);
    if (!auth) return json({ error: 'Unauthorized' }, 401);
    return json({
      requests: state.fundRequests
        .filter((r) => r.memberId === auth.member.id)
        .sort((a, b) => b.requestedAt - a.requestedAt),
    });
  }

  if (apiPath === '/api/members/funds/request' && method === 'POST') {
    const auth = requireMember(state);
    if (!auth) return json({ error: 'Unauthorized' }, 401);
    const { type, amountKobo, notes } = body;
    if (!['DEPOSIT', 'WITHDRAWAL'].includes(type) || amountKobo <= 0) {
      return json({ error: 'Invalid request' }, 400);
    }
    const member = state.members.find((m) => m.id === auth.member.id)!;
    const reference = makeReference(type === 'DEPOSIT' ? 'DEP' : 'WDL');
    const id = uid();
    const t = now();
    if (type === 'DEPOSIT') {
      state.fundRequests.unshift({
        id, memberId: member.id, reference, type, amountKobo,
        status: 'APPROVED', requestedAt: t, processedAt: t, processedBy: null, notes,
      });
      member.depositBalanceKobo = (member.depositBalanceKobo || 0) + amountKobo;
      pushLedger(state, {
        reference,
        type: 'DEPOSIT_FUNDING',
        amountKobo,
        description: `Member Deposit Wallet Top-Up — ${member.membershipNumber}`,
        memberId: member.id,
      });
      pushMail(state, auth.user.email, 'DEPOSIT_RECEIPT', `Deposit receipt ${reference}`, { amountKobo, reference }, `Deposit of ₦${(amountKobo / 100).toFixed(2)} credited to deposit wallet. Ref: ${reference}`);
      saveState(state);
      return json({
        success: true,
        reference,
        receipt: {
          title: 'Deposit Receipt',
          reference,
          amountKobo,
          memberName: `${member.firstName} ${member.lastName}`,
          membershipNumber: member.membershipNumber,
          description: notes || 'Deposit Wallet Top-Up',
          typeLabel: 'Deposit Top-Up',
          date: t,
        },
      });
    }
    // Instant deposit-wallet withdrawal — no staff approval
    const wallet = member.depositBalanceKobo || 0;
    if (amountKobo > wallet) {
      return json({ error: 'Insufficient deposit wallet balance. Withdrawals are only from your deposit wallet, not contributions or shares.' }, 400);
    }
    member.depositBalanceKobo = wallet - amountKobo;
    state.fundRequests.unshift({
      id, memberId: member.id, reference, type, amountKobo,
      status: 'COMPLETED', requestedAt: t, processedAt: t, processedBy: null, notes,
    });
    pushLedger(state, {
      reference,
      type: 'DEPOSIT_WITHDRAWAL',
      amountKobo,
      description: `Deposit wallet withdrawal — ${member.membershipNumber}`,
      memberId: member.id,
    });
    pushMail(
      state,
      auth.user.email,
      'WITHDRAWAL_COMPLETED',
      `Withdrawal ${reference} completed`,
      { amountKobo, reference },
      `₦${(amountKobo / 100).toFixed(2)} withdrawn from your deposit wallet. Ref: ${reference}.`,
    );
    saveState(state);
    return json({
      success: true,
      reference,
      instant: true,
      balances: { depositBalanceKobo: member.depositBalanceKobo },
      receipt: {
        title: 'Withdrawal Receipt',
        reference,
        amountKobo,
        memberName: `${member.firstName} ${member.lastName}`,
        membershipNumber: member.membershipNumber,
        description: notes || 'Deposit wallet withdrawal',
        typeLabel: 'Deposit withdrawal',
        date: t,
      },
    });
  }

  if (apiPath === '/api/members/deposits/allocate' && method === 'POST') {
    const auth = requireMember(state);
    if (!auth) return json({ error: 'Unauthorized' }, 401);

    const {
      contributionKobo = 0,
      sharesKobo = 0,
      loanRepaymentKobo = 0,
      investmentKobo = 0,
      loanId,
      investmentId,
    } = body;
    const cKobo = Math.max(0, Number(contributionKobo) || 0);
    const sKobo = Math.max(0, Number(sharesKobo) || 0);
    const lKobo = Math.max(0, Number(loanRepaymentKobo) || 0);
    const iKobo = Math.max(0, Number(investmentKobo) || 0);
    const totalAllocation = cKobo + sKobo + lKobo + iKobo;

    if (totalAllocation <= 0) {
      return json({ error: 'Allocation amount must be greater than zero' }, 400);
    }

    const member = state.members.find((m) => m.id === auth.member.id) as any;
    if (!member) return json({ error: 'Member profile not found' }, 404);
    if (member.status === 'LEFT' || member.status === 'REMOVED') {
      return json({ error: 'You have left the cooperative' }, 403);
    }

    const availableDeposit = member.depositBalanceKobo || 0;
    if (totalAllocation > availableDeposit) {
      return json({ error: 'Insufficient funds in Deposit Balance' }, 400);
    }

    let loanToUpdate: any = null;
    if (lKobo > 0) {
      if (!loanId) return json({ error: 'Loan target required for loan repayment' }, 400);
      loanToUpdate = state.loans.find((l) => l.id === loanId);
      if (!loanToUpdate || loanToUpdate.memberId !== member.id) {
        return json({ error: 'Invalid active loan specified' }, 400);
      }
      const outstanding = loanToUpdate.totalDueKobo - loanToUpdate.paidKobo;
      if (lKobo > outstanding) {
        return json({ error: 'Loan repayment amount exceeds outstanding loan balance' }, 400);
      }
    }

    let invTarget: any = null;
    if (iKobo > 0) {
      const openInvs = state.investments.filter((inv: any) => inv.status === 'ACTIVE');
      if (openInvs.length === 0) {
        return json({ error: 'No active cooperative investments to fund right now' }, 400);
      }
      invTarget = investmentId
        ? state.investments.find((inv: any) => inv.id === investmentId)
        : openInvs[0];
      if (!invTarget || invTarget.status !== 'ACTIVE') {
        return json({ error: 'Invalid investment selected' }, 400);
      }
    }

    member.depositBalanceKobo = availableDeposit - totalAllocation;

    if (cKobo > 0) {
      member.totalContributionsKobo += cKobo;
      const memberObs = state.obligations
        .filter((o) => o.memberId === member.id && o.status !== 'PAID')
        .sort((a, b) => a.dueDate - b.dueDate);

      let remaining = cKobo;
      for (const ob of memberObs) {
        if (remaining <= 0) break;
        const owed = ob.expectedAmountKobo - ob.paidAmountKobo;
        if (owed > 0) {
          const pay = Math.min(owed, remaining);
          ob.paidAmountKobo += pay;
          ob.status = ob.paidAmountKobo >= ob.expectedAmountKobo ? 'PAID' : 'PARTIAL';
          remaining -= pay;
        }
      }

      pushLedger(state, {
        reference: makeReference('ALLOC-SAV'),
        type: 'DEPOSIT_TO_CONTRIBUTION',
        amountKobo: cKobo,
        description: `Allocation from Deposit Fund to Savings — ${member.membershipNumber}`,
        memberId: member.id,
      });
    }

    if (sKobo > 0) {
      const shareCheck = validateSharesPurchase(member.sharesBalanceKobo || 0, sKobo);
      if (!shareCheck.ok) return json({ error: shareCheck.error }, 400);
      member.sharesBalanceKobo = (member.sharesBalanceKobo || 0) + sKobo;
      pushLedger(state, {
        reference: makeReference('ALLOC-SHR'),
        type: 'DEPOSIT_TO_SHARES',
        amountKobo: sKobo,
        description: `Allocation from Deposit Fund to Share Capital — ${member.membershipNumber}`,
        memberId: member.id,
      });
    }

    if (lKobo > 0 && loanToUpdate) {
      loanToUpdate.paidKobo += lKobo;
      if (loanToUpdate.paidKobo >= loanToUpdate.totalDueKobo) {
        loanToUpdate.status = 'COMPLETED';
      }
      pushLedger(state, {
        reference: makeReference('ALLOC-LN'),
        type: 'DEPOSIT_TO_LOAN_REPAYMENT',
        amountKobo: lKobo,
        description: `Allocation from Deposit Fund to Loan ${loanToUpdate.reference} — ${member.membershipNumber}`,
        memberId: member.id,
      });
    }

    if (iKobo > 0 && invTarget) {
      member.investmentBalanceKobo = (member.investmentBalanceKobo || 0) + iKobo;
      invTarget.principalKobo = (invTarget.principalKobo || 0) + iKobo;
      invTarget.currentValueKobo = (invTarget.currentValueKobo || 0) + iKobo;
      pushLedger(state, {
        reference: makeReference('ALLOC-INV'),
        type: 'DEPOSIT_TO_INVESTMENT',
        amountKobo: iKobo,
        description: `Member investment into ${invTarget.name} — ${member.membershipNumber}`,
        memberId: member.id,
      });
    }

    saveState(state);
    return json({
      success: true,
      balances: {
        depositBalanceKobo: member.depositBalanceKobo,
        totalContributionsKobo: member.totalContributionsKobo,
        sharesBalanceKobo: member.sharesBalanceKobo || 0,
        investmentBalanceKobo: member.investmentBalanceKobo || 0,
      },
    });
  }

  // —— Leave cooperative ——
  if (apiPath === '/api/members/leave' && method === 'POST') {
    const auth = requireMember(state);
    if (!auth) return json({ error: 'Unauthorized' }, 401);
    const member = state.members.find((m) => m.id === auth.member.id) as any;
    if (!member) return json({ error: 'Member not found' }, 404);
    if (member.status === 'LEFT' || member.status === 'REMOVED') {
      return json({ error: 'You have already left the cooperative' }, 400);
    }

    const role = normalizeRole(auth.user.role);
    if (role === 'SUPER_ADMIN') {
      const otherSuperAdmins = state.users.filter(
        (u) => u.id !== auth.user.id && normalizeRole(u.role) === 'SUPER_ADMIN',
      );
      if (otherSuperAdmins.length === 0) {
        return json({
          error:
            'You are the only Super Admin. Appoint another Super Admin before leaving the cooperative.',
        }, 400);
      }
    }

    // Soft-exit: keep ledger history
    member.status = 'LEFT';
    member.leftAt = now();
    if (auth.user) {
      // Staff powers end with membership exit
      auth.user.role = 'MEMBER';
      auth.user.updatedAt = now();
    }
    state.auditLogs.unshift({
      id: uid(),
      actorId: auth.user.id,
      actorRole: role,
      action: 'MEMBER_LEFT',
      entityType: 'MEMBER',
      entityReference: member.membershipNumber,
      timestamp: now(),
      summary: `${member.firstName} ${member.lastName} (${member.membershipNumber}) left the cooperative`,
    });
    pushMail(
      state,
      auth.user.email,
      'MEMBERSHIP_LEFT',
      'You have left Blessed Hands',
      { membershipNumber: member.membershipNumber },
      `Your membership ${member.membershipNumber} is closed. Ledger history is retained by the cooperative.`,
    );
    (state as any).personas = buildPersonas(state);
    saveState(state);
    setSession(null);
    return json({ success: true, message: 'You have left the cooperative' });
  }

  if (apiPath === '/api/members/leave/eligibility' && method === 'GET') {
    const auth = requireMember(state);
    if (!auth) return json({ error: 'Unauthorized' }, 401);
    const role = normalizeRole(auth.user.role);
    let canLeave = true;
    let reason: string | null = null;
    if (role === 'SUPER_ADMIN') {
      const otherSuperAdmins = state.users.filter(
        (u) => u.id !== auth.user.id && normalizeRole(u.role) === 'SUPER_ADMIN',
      );
      if (otherSuperAdmins.length === 0) {
        canLeave = false;
        reason =
          'You are the only Super Admin. Appoint another Super Admin before you can leave.';
      }
    }
    return json({ canLeave, reason, role });
  }

  const fundCancel = apiPath.match(/^\/api\/members\/funds\/([^/]+)\/cancel$/);
  if (fundCancel && method === 'POST') {
    const auth = requireMember(state);
    if (!auth) return json({ error: 'Unauthorized' }, 401);
    const request = state.fundRequests.find((r) => r.id === fundCancel[1]);
    if (!request || request.memberId !== auth.member.id) return json({ error: 'Not found' }, 404);
    if (request.status !== 'PENDING') return json({ error: 'Only pending requests can be cancelled' }, 400);
    request.status = 'CANCELLED';
    request.processedAt = now();
    saveState(state);
    return json({ success: true });
  }

  // —— Market: cooperative shop (member side) ——
  if (apiPath === '/api/members/market/products' && method === 'GET') {
    const auth = requireMember(state);
    if (!auth) return json({ error: 'Unauthorized' }, 401);
    return json({
      products: state.marketProducts
        .filter((p) => p.isActive)
        .sort((a, b) => b.createdAt - a.createdAt),
    });
  }

  if (apiPath === '/api/members/market/orders' && method === 'GET') {
    const auth = requireMember(state);
    if (!auth) return json({ error: 'Unauthorized' }, 401);
    return json({
      orders: state.orders
        .filter((o) => o.memberId === auth.member.id)
        .sort((a, b) => b.placedAt - a.placedAt)
        .map((o) => ({ ...o, items: state.orderItems.filter((i) => i.orderId === o.id) })),
    });
  }

  if (apiPath === '/api/members/market/orders' && method === 'POST') {
    const auth = requireMember(state);
    if (!auth) return json({ error: 'Unauthorized' }, 401);
    const member = state.members.find((m) => m.id === auth.member.id)!;
    if (member.status !== 'ACTIVE') return json({ error: 'Only active members can shop the market' }, 403);
    const { items } = body;
    if (!Array.isArray(items) || items.length === 0) return json({ error: 'Cart is empty' }, 400);

    const lines: { product: (typeof state.marketProducts)[number]; quantity: number }[] = [];
    for (const line of items) {
      const quantity = Math.max(1, Math.floor(Number(line.quantity) || 0));
      const product = state.marketProducts.find((p) => p.id === line.productId);
      if (!product || !product.isActive) return json({ error: 'A product in your cart is no longer available' }, 400);
      if (quantity > product.stock) return json({ error: `Only ${product.stock} × ${product.name} in stock` }, 400);
      lines.push({ product, quantity });
    }
    const totalKobo = lines.reduce((s, l) => s + l.product.priceKobo * l.quantity, 0);
    const itemCount = lines.reduce((s, l) => s + l.quantity, 0);
    if (totalKobo > (member.depositBalanceKobo || 0)) {
      return json({ error: 'Insufficient Deposit Balance — top up your wallet first' }, 400);
    }

    const reference = makeReference('ORD');
    const t = now();
    const orderId = uid();
    state.orders.unshift({
      id: orderId,
      memberId: member.id,
      reference,
      status: 'PLACED',
      totalKobo,
      itemCount,
      note: (body.note || '').trim().slice(0, 200) || null,
      placedAt: t,
      updatedAt: t,
    });
    for (const l of lines) {
      state.orderItems.push({
        id: uid(),
        orderId,
        productId: l.product.id,
        productName: l.product.name,
        unitPriceKobo: l.product.priceKobo,
        quantity: l.quantity,
      });
      l.product.stock -= l.quantity;
      l.product.updatedAt = t;
    }
    member.depositBalanceKobo = (member.depositBalanceKobo || 0) - totalKobo;
    pushLedger(state, {
      reference: makeReference('MKT'),
      type: 'MARKET_PURCHASE',
      amountKobo: totalKobo,
      description: `Market purchase ${reference} (${itemCount} item${itemCount === 1 ? '' : 's'}) — ${member.membershipNumber}`,
      memberId: member.id,
    });
    pushMail(
      state,
      auth.user.email,
      'ORDER_CONFIRMATION',
      `Order ${reference} confirmed — ${itemCount} item${itemCount === 1 ? '' : 's'}`,
      { orderReference: reference, totalKobo, itemCount },
      `Your market order ${reference} is confirmed. ${itemCount} item(s) will be packed for collection.`,
    );
    saveState(state);
    return json({
      success: true,
      order: { id: orderId, reference, status: 'PLACED', totalKobo, itemCount },
      depositBalanceKobo: member.depositBalanceKobo,
    });
  }

  if (apiPath === '/api/members/statements' && method === 'GET') {
    const auth = requireMember(state);
    if (!auth) return json({ error: 'Unauthorized' }, 401);
    const member = state.members.find((m) => m.id === auth.member.id)!;
    return json({
      member,
      lines: memberStatements(state, member.id),
      balanceKobo: member.totalContributionsKobo,
    });
  }

  if (apiPath === '/api/members/notifications' && method === 'GET') {
    const auth = requireMember(state);
    if (!auth) return json({ error: 'Unauthorized' }, 401);
    return json({
      announcements: state.announcements
        .filter((a) => a.audience === 'MEMBER' || a.audience === 'PUBLIC')
        .sort((a, b) => b.publishedAt - a.publishedAt),
      emails: state.outbox
        .filter((m) => m.recipient === auth.user.email)
        .sort((a, b) => b.sentAt - a.sentAt),
    });
  }

  if (apiPath === '/api/members/dividends' && method === 'GET') {
    const auth = requireMember(state);
    if (!auth) return json({ error: 'Unauthorized' }, 401);
    return json({
      allocations: state.dividendAllocations
        .filter((d) => d.memberId === auth.member.id)
        .map((d) => ({
          ...d,
          period: state.dividendPeriods.find((p) => p.id === d.periodId),
        })),
      periods: state.dividendPeriods,
    });
  }

  if (apiPath === '/api/members/investments' && method === 'GET') {
    const auth = requireMember(state);
    if (!auth) return json({ error: 'Unauthorized' }, 401);
    return json({
      investments: state.investments,
      totalValueKobo: state.investments.reduce((s, i) => s + i.currentValueKobo, 0),
    });
  }

  if (apiPath === '/api/members/profile/update' && method === 'POST') {
    const auth = requireMember(state);
    if (!auth) return json({ error: 'Unauthorized' }, 401);
    const member = state.members.find((m) => m.id === auth.member.id)!;
    member.phoneNumber = body.phoneNumber || member.phoneNumber;
    member.firstName = body.firstName || member.firstName;
    member.lastName = body.lastName || member.lastName;
    saveState(state);
    return json({ success: true });
  }

  // —— Admin ——
  if (apiPath === '/api/admin/dashboard' && method === 'GET') {
    const user = requireStaff(state);
    if (!user) return json({ error: 'Unauthorized' }, 403);
    const activeMembers = state.members.filter((m) => m.status === 'ACTIVE');
    const pendingApplications = state.applications.filter((a) =>
      ['PENDING', 'PENDING_APPROVAL', 'AWAITING_PAYMENT', 'AWAITING_KYM'].includes(a.status),
    );
    const totalContributions = state.members.reduce((s, m) => s + m.totalContributionsKobo, 0);
    const totalDepositWalletBalance = state.members.reduce((s, m) => s + (m.depositBalanceKobo || 0), 0);
    const totalShareCapital = state.members.reduce((s, m) => s + (m.sharesBalanceKobo || 0), 0);
    const activeLoans = state.loans.filter((l) => l.status === 'ACTIVE');
    const activeLoanPortfolio = activeLoans.reduce((s, l) => s + (l.totalDueKobo - l.paidKobo), 0);
    const pendingWithdrawals = state.fundRequests.filter((r) => r.type === 'WITHDRAWAL' && r.status === 'PENDING');
    const pendingLoans = state.loans.filter((l) =>
      ['PENDING_APPROVAL', 'PENDING_FS', 'PENDING_ADMIN', 'PENDING_SUPER', 'APPROVED'].includes(l.status),
    );
    const pool = coOpPoolTotals(state);
    // current period compliance
    const periods = [...new Set(state.obligations.map((o) => o.monthPeriod))].sort().reverse();
    const currentPeriod = periods[0];
    const currentObs = state.obligations.filter((o) => o.monthPeriod === currentPeriod);
    const paidCount = currentObs.filter((o) => o.status === 'PAID').length;
    // Payment-channel label per ledger type (mirrors real server fields)
    const paymentSourceForType = (type: string) => {
      if (type === 'CONTRIBUTION_PAYMENT' || type === 'ADMIN_CONTRIBUTION') return 'ADMIN_RECORD';
      if (type === 'REGISTRATION_FEE') return 'PAYSTACK';
      if (type.includes('DEPOSIT_TO') || type === 'DEPOSIT_FUNDING' || type === 'DEVELOPMENT_FEE') {
        return 'DEPOSIT_WALLET';
      }
      return 'SYSTEM';
    };
    const membersMap = Object.fromEntries(state.members.map((m) => [m.id, m]));
    const recentDeposits = state.fundRequests
      .filter((r) => r.type === 'DEPOSIT')
      .sort((a, b) => b.requestedAt - a.requestedAt)
      .slice(0, 5)
      .map((r) => ({ ...r, member: membersMap[r.memberId] || null }));

    return json({
      activeMembers: activeMembers.length,
      pendingApplications: pendingApplications.length,
      totalContributions,
      totalDepositWalletBalance,
      totalShareCapital,
      activeLoanPortfolio,
      pendingWithdrawals: pendingWithdrawals.length,
      pendingLoans: pendingLoans.length,
      investmentValueKobo: state.investments.reduce((s, i) => s + i.currentValueKobo, 0),
      pool,
      contributionCompliance: currentObs.length ? Math.round((paidCount / currentObs.length) * 100) : 100,
      recentApplications: [...state.applications].sort((a, b) => b.submittedAt - a.submittedAt).slice(0, 5),
      recentTransactions: [...state.ledger]
        .sort((a, b) => b.date - a.date)
        .slice(0, 8)
        .map((l) => ({ ...l, paymentSource: paymentSourceForType(l.type) })),
      recentDeposits,
      role: user.role,
    });
  }

  if (apiPath === '/api/admin/applications' && method === 'GET') {
    if (!requireStaff(state)) return json({ error: 'Unauthorized' }, 403);
    return json({ applications: [...state.applications].sort((a, b) => b.submittedAt - a.submittedAt) });
  }

  const appApprove = apiPath.match(/^\/api\/admin\/applications\/([^/]+)\/approve$/);
  if (appApprove && method === 'POST') {
    const user = requireStaff(state);
    if (!user || !can(user.role, 'applications:write')) return json({ error: 'Only Super Admin or Admin can approve memberships' }, 403);
    const application = state.applications.find((a: any) => a.id === appApprove[1]) as any;
    if (!application) return json({ error: 'Not found' }, 404);
    if (!['PENDING_APPROVAL', 'PENDING'].includes(application.status)) {
      return json({ error: 'Application is not awaiting approval' }, 400);
    }
    // Avoid duplicate member if already approved once
    const already = state.members.find(
      (m) => m.userId === application.userId || (m as any).email === application.email,
    );
    if (already) {
      application.status = 'APPROVED';
      const u = state.users.find((x) => x.id === already.userId);
      if (u) u.role = 'MEMBER';
      saveState(state);
      return json({
        success: true,
        member: {
          membershipNumber: already.membershipNumber,
          referralCode: already.referralCode || already.membershipNumber,
        },
      });
    }

    const membershipNumber = nextMembershipNumber(state);
    const referralCode = membershipNumber; // referral code = member code
    const t = now();
    let userId = application.userId;
    if (userId) {
      const existing = state.users.find((u) => u.id === userId);
      if (existing) {
        existing.role = 'MEMBER';
        existing.updatedAt = t;
        existing.displayName = `${application.firstName} ${application.lastName}`;
        // Keep the password they chose at signup
      } else {
        userId = uid();
        state.users.push({
          id: userId,
          email: application.email,
          passwordHash: state.password,
          role: 'MEMBER',
          displayName: `${application.firstName} ${application.lastName}`,
          createdAt: t,
          updatedAt: t,
        });
        application.userId = userId;
      }
    } else {
      // Match by email if user was created at join
      const byEmail = state.users.find(
        (u) => u.email.toLowerCase() === String(application.email).toLowerCase(),
      );
      if (byEmail) {
        userId = byEmail.id;
        byEmail.role = 'MEMBER';
        byEmail.updatedAt = t;
        byEmail.displayName = `${application.firstName} ${application.lastName}`;
        application.userId = userId;
      } else {
        userId = uid();
        state.users.push({
          id: userId,
          email: application.email,
          passwordHash: state.password,
          role: 'MEMBER',
          displayName: `${application.firstName} ${application.lastName}`,
          createdAt: t,
          updatedAt: t,
        });
        application.userId = userId;
      }
    }
    const memberId = uid();
    const residency = application.kym?.residency || 'RESIDENT';
    state.members.push({
      id: memberId,
      userId,
      membershipNumber,
      firstName: application.firstName,
      middleName: application.middleName || '',
      lastName: application.lastName,
      phoneNumber: application.phoneNumber,
      status: 'ACTIVE',
      residency,
      referralCode,
      referredByCode: application.referralCodeUsed || null,
      totalContributionsKobo: 0,
      depositBalanceKobo: 0,
      sharesBalanceKobo: 0,
      joinedAt: t,
    } as any);
    const year = currentFeeYear();
    if (!(state as any).developmentFees) (state as any).developmentFees = [];
    (state as any).developmentFees.push({
      id: uid(),
      memberId,
      year,
      amountKobo: developmentFeeAmount(residency),
      status: 'UNPAID',
      dueAt: developmentFeeDueAt(year),
      paidAt: null,
    });
    application.status = 'APPROVED';
    application.reviewNotes = body.notes || null;
    // First monthly savings obligation from admin-configured amount
    if (!state.obligations) (state as any).obligations = [];
    if (!(state as any).settings) {
      (state as any).settings = { monthlySavingsKobo: 2_000_000, loanThriftMultiplier: 2 };
    }
    ensureObligationForMember(
      state.obligations as any,
      memberId,
      currentMonthPeriod(),
      monthlySavingsFromSettings((state as any).settings),
      uid,
    );
    (state as any).personas = buildPersonas(state);
    pushMail(
      state,
      application.email,
      'MEMBERSHIP_APPROVED',
      'Welcome to Blessed Hands — membership approved',
      { membershipNumber, referralCode },
      `Your membership number and referral code is ${membershipNumber}. Sign in with your email and the password you chose at signup. Buy minimum ₦20,000 share capital under Shares. Your monthly savings obligation is now active.`,
    );
    saveState(state);
    return json({ success: true, member: { membershipNumber, referralCode, email: application.email } });
  }

  const appReject = apiPath.match(/^\/api\/admin\/applications\/([^/]+)\/reject$/);
  if (appReject && method === 'POST') {
    const user = requireStaff(state);
    if (!user || !can(user.role, 'applications:write')) return json({ error: 'Forbidden' }, 403);
    const application = state.applications.find((a: any) => a.id === appReject[1]) as any;
    if (!application) return json({ error: 'Not found' }, 404);
    application.status = 'REJECTED';
    application.reviewNotes = body.notes || 'Rejected after review';
    if (application.userId) {
      const u = state.users.find((x) => x.id === application.userId);
      if (u && u.role === 'APPLICANT') u.role = 'APPLICANT';
    }
    pushMail(state, application.email, 'MEMBERSHIP_REJECTED', 'Membership application update', {}, application.reviewNotes);
    saveState(state);
    return json({ success: true });
  }

  if (apiPath === '/api/admin/loans' && method === 'GET') {
    if (!requireStaff(state)) return json({ error: 'Unauthorized' }, 403);
    const loans = [...state.loans]
      .sort((a, b) => b.appliedAt - a.appliedAt)
      .map((loan) => ({
        ...loan,
        member: state.members.find((m) => m.id === loan.memberId) || null,
        guarantors: enrichGuarantors(state, loan.id),
      }));
    return json({ loans });
  }

  // Triple approval for loans: FS → Admin → Super (final auto-disburses)
  const loanChainAction = apiPath.match(/^\/api\/admin\/loans\/([^/]+)\/(approve|reject)$/);
  if (loanChainAction && method === 'POST') {
    const user = requireStaff(state);
    if (!user) return json({ error: 'Unauthorized' }, 403);
    const loan = state.loans.find((l) => l.id === loanChainAction[1]) as any;
    if (!loan) return json({ error: 'Not found' }, 404);

    // Legacy PENDING_APPROVAL → map into chain
    if (loan.status === 'PENDING_APPROVAL') {
      loan.status = 'PENDING_FS';
      if (!loan.approval) loan.approval = emptyApproval();
    }
    if (!loan.approval) {
      loan.approval = emptyApproval();
      if (['PENDING_FS', 'PENDING_ADMIN', 'PENDING_SUPER'].includes(loan.status)) {
        loan.approval.step = loan.status;
      }
    }

    const action = loanChainAction[2] as 'approve' | 'reject';
    const actorName = (() => {
      const m = state.members.find((x) => x.userId === user.id);
      return m ? `${m.firstName} ${m.lastName}` : user.email;
    })();
    const role = normalizeRole(user.role);
    const result = applyApprovalAction(
      loan.approval,
      action,
      { userId: user.id, name: actorName, role },
      now(),
      body.note || null,
    );
    if (!result.ok) return json({ error: result.error }, 403);

    if (action === 'reject') {
      loan.status = 'REJECTED';
      saveState(state);
      return json({ success: true, step: loan.approval.step });
    }

    loan.status = loan.approval.step === 'APPROVED' ? 'APPROVED' : loan.approval.step;

    // Final Super Admin approval = disburse
    if (result.executed) {
      loan.status = 'ACTIVE';
      loan.disbursedAt = now();
      const ref = makeReference('DISB');
      const member = state.members.find((m) => m.id === loan.memberId)!;
      pushLedger(state, {
        reference: ref,
        type: 'LOAN_DISBURSEMENT',
        amountKobo: loan.principalKobo,
        description: `Loan disbursement ${loan.reference} — ${member.membershipNumber}`,
        memberId: member.id,
      });
      const u = state.users.find((x) => x.id === member.userId);
      if (u) {
        pushMail(
          state,
          u.email,
          'LOAN_DISBURSED',
          `Loan ${loan.reference} disbursed`,
          { reference: loan.reference, amountKobo: loan.principalKobo },
          `₦${(loan.principalKobo / 100).toFixed(2)} disbursed after full approval chain.`,
        );
      }
      saveState(state);
      return json({
        success: true,
        disbursed: true,
        step: 'APPROVED',
        receipt: {
          title: 'Loan Disbursement Receipt',
          reference: ref,
          amountKobo: loan.principalKobo,
          memberName: `${member.firstName} ${member.lastName}`,
          membershipNumber: member.membershipNumber,
          description: `Disbursement of ${loan.reference}`,
          typeLabel: 'Loan disbursement',
          date: now(),
        },
      });
    }

    saveState(state);
    return json({ success: true, step: loan.approval.step, disbursed: false });
  }

  // Keep disburse endpoint as alias for final step when already fully approved but not active (safety)
  const loanDisburse = apiPath.match(/^\/api\/admin\/loans\/([^/]+)\/disburse$/);
  if (loanDisburse && method === 'POST') {
    const user = requireStaff(state);
    if (!user || !can(user.role, 'money_out:final')) return json({ error: 'Only Super Admin can finalise disbursement' }, 403);
    const loan = state.loans.find((l) => l.id === loanDisburse[1]) as any;
    if (!loan) return json({ error: 'Not found' }, 404);
    if (loan.status !== 'APPROVED' && loan.approval?.step !== 'APPROVED') {
      return json({ error: 'Loan must complete the full approval chain first' }, 400);
    }
    loan.status = 'ACTIVE';
    loan.disbursedAt = now();
    const ref = makeReference('DISB');
    const member = state.members.find((m) => m.id === loan.memberId)!;
    pushLedger(state, {
      reference: ref,
      type: 'LOAN_DISBURSEMENT',
      amountKobo: loan.principalKobo,
      description: `Loan disbursement ${loan.reference} — ${member.membershipNumber}`,
      memberId: member.id,
    });
    saveState(state);
    return json({ success: true, receipt: { title: 'Loan Disbursement Receipt', reference: ref, amountKobo: loan.principalKobo, memberName: `${member.firstName} ${member.lastName}`, membershipNumber: member.membershipNumber, description: `Disbursement of ${loan.reference}`, typeLabel: 'Loan disbursement', date: now() } });
  }

  if (apiPath === '/api/admin/members' && method === 'GET') {
    if (!requireStaff(state)) return json({ error: 'Unauthorized' }, 403);
    const usersMap = Object.fromEntries(state.users.map((u) => [u.id, u]));
    return json({
      members: [...state.members]
        .sort((a, b) => a.membershipNumber.localeCompare(b.membershipNumber))
        .map((m) => {
          const referrer = resolveReferrer(state, (m as any).referredByCode);
          return {
            ...m,
            email: m.userId ? usersMap[m.userId]?.email : 'N/A',
            role: m.userId ? usersMap[m.userId]?.role : 'MEMBER',
            referrer,
            referredByCode: (m as any).referredByCode || null,
          };
        }),
    });
  }

  const memberStatus = apiPath.match(/^\/api\/admin\/members\/([^/]+)\/status$/);
  if (memberStatus && method === 'POST') {
    const user = requireStaff(state);
    if (!user || !can(user.role, 'members:suspend')) return json({ error: 'Only Super Admin or Admin can suspend members' }, 403);
    const member = state.members.find((m) => m.id === memberStatus[1]);
    if (!member) return json({ error: 'Not found' }, 404);
    if (body.status === 'REMOVED') {
      if (!can(user.role, 'members:delete')) return json({ error: 'Only Super Admin can remove members' }, 403);
    }
    member.status = body.status;
    saveState(state);
    return json({ success: true });
  }

  const memberRole = apiPath.match(/^\/api\/admin\/members\/([^/]+)\/role$/);
  if (memberRole && method === 'POST') {
    const user = requireStaff(state);
    if (!user || !can(user.role, 'members:roles')) return json({ error: 'Only Super Admin can change staff roles' }, 403);
    const member = state.members.find((m) => m.id === memberRole[1]);
    if (!member || !member.userId) return json({ error: 'Not found' }, 404);
    const target = state.users.find((u) => u.id === member.userId);
    if (!target) return json({ error: 'User not found' }, 404);
    const nextRole = body.role;
    // Super Admin assigns staff roles only; MEMBER is the default (use removeStaffRole)
    const allowed = ['ADMIN', 'FINANCIAL_SECRETARY', 'SUPER_ADMIN', 'MEMBER'];
    if (!allowed.includes(nextRole)) return json({ error: 'Invalid role' }, 400);
    if (nextRole === 'MEMBER' && !body.allowDemote) {
      return json({
        error: 'Members default to the Member role. Assign a staff role only, or use Remove staff role to demote.',
      }, 400);
    }
    if (target.id === user.id && nextRole !== 'SUPER_ADMIN') {
      return json({ error: 'You cannot demote yourself' }, 400);
    }
    target.role = nextRole;
    target.updatedAt = now();
    (state as any).personas = buildPersonas(state);
    state.auditLogs.unshift({
      id: uid(),
      actorId: user.id,
      actorRole: user.role,
      action: 'ROLE_CHANGE',
      entityType: 'USER',
      entityReference: target.email,
      timestamp: now(),
      summary: `Role set to ${nextRole} for ${target.email}`,
    });
    saveState(state);
    return json({ success: true, role: nextRole });
  }

  const memberDelete = apiPath.match(/^\/api\/admin\/members\/([^/]+)\/delete$/);
  if (memberDelete && method === 'POST') {
    const user = requireStaff(state);
    if (!user || !can(user.role, 'members:delete')) return json({ error: 'Only Super Admin can remove members' }, 403);
    const member = state.members.find((m) => m.id === memberDelete[1]);
    if (!member) return json({ error: 'Not found' }, 404);
    member.status = 'REMOVED';
    if (member.userId) {
      const u = state.users.find((x) => x.id === member.userId);
      if (u) {
        u.role = 'MEMBER';
        u.email = `removed+${member.membershipNumber.toLowerCase()}@blessedhands.invalid`;
        u.updatedAt = now();
      }
    }
    state.auditLogs.unshift({
      id: uid(),
      actorId: user.id,
      actorRole: user.role,
      action: 'MEMBER_REMOVED',
      entityType: 'MEMBER',
      entityReference: member.membershipNumber,
      timestamp: now(),
      summary: `Member ${member.membershipNumber} removed from cooperative`,
    });
    saveState(state);
    return json({ success: true });
  }

  if (apiPath === '/api/admin/contributions' && method === 'GET') {
    if (!requireStaff(state)) return json({ error: 'Unauthorized' }, 403);
    if (!state.obligations) (state as any).obligations = [];
    if (!(state as any).settings) {
      (state as any).settings = { monthlySavingsKobo: 2_000_000, loanThriftMultiplier: 2 };
    }
    const monthlyAmt = monthlySavingsFromSettings((state as any).settings);
    ensureAllActiveMemberObligations(
      state.members as any,
      state.obligations as any,
      monthlyAmt,
      uid,
    );
    saveState(state);
    const membersMap = Object.fromEntries(state.members.map((m) => [m.id, m]));
    const period = currentMonthPeriod();
    return json({
      settings: { monthlySavingsKobo: monthlyAmt },
      currentPeriod: period,
      obligations: [...state.obligations]
        .sort((a, b) => b.dueDate - a.dueDate)
        .map((o) => ({ ...o, member: membersMap[o.memberId] })),
      ledger: [...state.ledger]
        .filter((l) =>
          ['CONTRIBUTION_PAYMENT', 'DEPOSIT_TO_CONTRIBUTION'].includes(l.type),
        )
        .sort((a, b) => b.date - a.date)
        .map((l) => ({ ...l, member: membersMap[l.memberId as string] || null })),
      members: state.members.map((m) => ({
        ...m,
        monthlySavingsKobo: monthlyAmt,
        currentObligation: state.obligations.find(
          (o) => o.memberId === m.id && o.monthPeriod === period,
        ),
      })),
    });
  }

  if (apiPath === '/api/admin/settings' && method === 'GET') {
    if (!requireStaff(state)) return json({ error: 'Unauthorized' }, 403);
    if (!(state as any).settings) {
      (state as any).settings = { monthlySavingsKobo: 2_000_000, loanThriftMultiplier: 2 };
    }
    return json({ settings: (state as any).settings });
  }

  if (apiPath === '/api/admin/settings' && method === 'POST') {
    const user = requireStaff(state);
    if (!user || !can(user.role, 'settings:write')) return json({ error: 'Only Super Admin can change settings' }, 403);
    if (!(state as any).settings) {
      (state as any).settings = { monthlySavingsKobo: 2_000_000, loanThriftMultiplier: 2 };
    }
    if (body.monthlySavingsKobo != null) {
      const v = Math.round(Number(body.monthlySavingsKobo));
      if (v < 100) return json({ error: 'Monthly savings must be at least ₦1' }, 400);
      (state as any).settings.monthlySavingsKobo = v;
    }
    if (body.loanThriftMultiplier != null) {
      (state as any).settings.loanThriftMultiplier = Number(body.loanThriftMultiplier) || 2;
    }
    // Create missing current-period obligations at the new amount (existing rows unchanged)
    if (!state.obligations) (state as any).obligations = [];
    const created = ensureAllActiveMemberObligations(
      state.members as any,
      state.obligations as any,
      monthlySavingsFromSettings((state as any).settings),
      uid,
    );
    saveState(state);
    return json({ success: true, settings: (state as any).settings, obligationsCreated: created });
  }

  if (apiPath === '/api/admin/savings/generate-period' && method === 'POST') {
    const user = requireStaff(state);
    if (!user || !can(user.role, 'contributions:write')) return json({ error: 'Forbidden' }, 403);
    const period = body.monthPeriod || currentMonthPeriod();
    const amount =
      body.amountKobo != null
        ? Math.round(Number(body.amountKobo))
        : monthlySavingsFromSettings((state as any).settings);
    if (!state.obligations) (state as any).obligations = [];
    const created = ensureAllActiveMemberObligations(
      state.members as any,
      state.obligations as any,
      amount,
      uid,
      period,
    );
    saveState(state);
    return json({ success: true, period, amountKobo: amount, created });
  }

  if (apiPath === '/api/admin/contributions/record' && method === 'POST') {
    const user = requireStaff(state);
    if (!user || !can(user.role, 'contributions:write')) return json({ error: 'Forbidden' }, 403);
    const member = state.members.find((m) => m.id === body.memberId);
    if (!member) return json({ error: 'Member not found' }, 404);
    const ref = makeReference('CONT');
    member.totalContributionsKobo += body.amountKobo;
    // Update obligation if matching period
    if (body.monthPeriod) {
      const ob = state.obligations.find((o) => o.memberId === member.id && o.monthPeriod === body.monthPeriod);
      if (ob) {
        ob.paidAmountKobo = Math.min(ob.expectedAmountKobo, ob.paidAmountKobo + body.amountKobo);
        ob.status = ob.paidAmountKobo >= ob.expectedAmountKobo ? 'PAID' : 'PARTIAL';
      }
    }
    pushLedger(state, {
      reference: ref,
      type: 'CONTRIBUTION_PAYMENT',
      amountKobo: body.amountKobo,
      description: body.description || `Contribution recorded — ${member.membershipNumber}`,
      memberId: member.id,
    });
    saveState(state);
    return json({
      success: true,
      reference: ref,
      receipt: {
        title: 'Contribution Receipt',
        reference: ref,
        amountKobo: body.amountKobo,
        memberName: `${member.firstName} ${member.lastName}`,
        membershipNumber: member.membershipNumber,
        description: body.description || body.monthPeriod,
        typeLabel: 'Contribution (staff recorded)',
        date: now(),
      },
    });
  }

  if (apiPath === '/api/admin/ledger' && method === 'GET') {
    if (!requireStaff(state)) return json({ error: 'Unauthorized' }, 403);
    const sorted = [...state.ledger].sort((a, b) => a.date - b.date);
    let running = 0;
    const lines = sorted.map((row) => {
      if (row.side === 'CREDIT') running += row.amountKobo;
      else running -= row.amountKobo;
      const member = row.memberId ? state.members.find((m) => m.id === row.memberId) : null;
      return {
        ...row,
        member,
        creditKobo: row.side === 'CREDIT' ? row.amountKobo : 0,
        debitKobo: row.side === 'DEBIT' ? row.amountKobo : 0,
        runningBalanceKobo: running,
      };
    });
    const pool = coOpPoolTotals(state);
    return json({ lines: lines.reverse(), pool });
  }

  if (apiPath === '/api/admin/outbox' && method === 'GET') {
    if (!requireStaff(state)) return json({ error: 'Unauthorized' }, 403);
    return json({ messages: [...state.outbox].sort((a, b) => b.sentAt - a.sentAt) });
  }

  if (apiPath === '/api/admin/funds' && method === 'GET') {
    if (!requireStaff(state)) return json({ error: 'Unauthorized' }, 401);
    const membersMap = Object.fromEntries(state.members.map((m) => [m.id, m]));
    return json({
      requests: [...state.fundRequests]
        .sort((a, b) => b.requestedAt - a.requestedAt)
        .map((r) => ({ ...r, member: membersMap[r.memberId] })),
    });
  }

  // Legacy fund approve/reject kept for deposits only; withdrawals are instant
  const fundAction = apiPath.match(/^\/api\/admin\/funds\/([^/]+)\/(approve|reject)$/);
  if (fundAction && method === 'POST') {
    return json({ error: 'Deposit-wallet withdrawals complete instantly and do not require staff approval. View history only.' }, 400);
  }

  // —— Market: cooperative shop (admin side) ——
  if (apiPath === '/api/admin/market/products' && method === 'GET') {
    if (!requireStaff(state)) return json({ error: 'Unauthorized' }, 403);
    const cancelledIds = new Set(state.orders.filter((o) => o.status === 'CANCELLED').map((o) => o.id));
    const soldMap: Record<string, number> = {};
    for (const i of state.orderItems) {
      if (cancelledIds.has(i.orderId)) continue;
      soldMap[i.productId] = (soldMap[i.productId] || 0) + i.quantity;
    }
    return json({
      products: [...state.marketProducts]
        .sort((a, b) => b.createdAt - a.createdAt)
        .map((p) => ({ ...p, soldCount: soldMap[p.id] || 0 })),
    });
  }

  if (apiPath === '/api/admin/market/products' && method === 'POST') {
    const user = requireStaff(state);
    if (!user || !can(user.role, 'market:write')) return json({ error: 'Forbidden' }, 403);
    if (!body.name || !body.category || !body.unit || !body.priceKobo || body.priceKobo <= 0) {
      return json({ error: 'Name, category, unit and a positive price are required' }, 400);
    }
    const t = now();
    const product = {
      id: uid(),
      name: String(body.name).trim().slice(0, 120),
      description: String(body.description || '').trim().slice(0, 300) || null,
      category: String(body.category).trim().slice(0, 60),
      unit: String(body.unit).trim().slice(0, 60),
      priceKobo: Math.round(body.priceKobo),
      stock: Math.max(0, Math.floor(Number(body.stock) || 0)),
      isActive: 1,
      imageEmoji: String(body.imageEmoji || '📦').trim().slice(0, 8) || '📦',
      createdAt: t,
      updatedAt: t,
    };
    state.marketProducts.unshift(product);
    saveState(state);
    return json({ success: true, id: product.id });
  }

  const marketProductUpdate = apiPath.match(/^\/api\/admin\/market\/products\/([^/]+)$/);
  if (marketProductUpdate && method === 'PUT') {
    const user = requireStaff(state);
    if (!user || !can(user.role, 'market:write')) return json({ error: 'Forbidden' }, 403);
    const product = state.marketProducts.find((p) => p.id === marketProductUpdate[1]);
    if (!product) return json({ error: 'Product not found' }, 404);
    if (body.name != null) product.name = String(body.name).trim().slice(0, 120);
    if (body.description != null) product.description = String(body.description).trim().slice(0, 300) || null;
    if (body.category != null) product.category = String(body.category).trim().slice(0, 60);
    if (body.unit != null) product.unit = String(body.unit).trim().slice(0, 60);
    if (body.priceKobo != null) product.priceKobo = Math.max(1, Math.round(body.priceKobo));
    if (body.stock != null) product.stock = Math.max(0, Math.floor(Number(body.stock) || 0));
    if (body.isActive != null) product.isActive = body.isActive ? 1 : 0;
    if (body.imageEmoji != null) product.imageEmoji = String(body.imageEmoji).trim().slice(0, 8) || '📦';
    product.updatedAt = now();
    saveState(state);
    return json({ success: true });
  }

  if (apiPath === '/api/admin/market/orders' && method === 'GET') {
    if (!requireStaff(state)) return json({ error: 'Unauthorized' }, 403);
    const membersMap = Object.fromEntries(state.members.map((m) => [m.id, m]));
    return json({
      orders: [...state.orders]
        .sort((a, b) => b.placedAt - a.placedAt)
        .map((o) => ({
          ...o,
          items: state.orderItems.filter((i) => i.orderId === o.id),
          member: membersMap[o.memberId],
        })),
    });
  }

  const marketOrderStatus = apiPath.match(/^\/api\/admin\/market\/orders\/([^/]+)\/status$/);
  if (marketOrderStatus && method === 'POST') {
    const user = requireStaff(state);
    if (!user || !can(user.role, 'market:write')) return json({ error: 'Forbidden' }, 403);
    const order = state.orders.find((o) => o.id === marketOrderStatus[1]);
    if (!order) return json({ error: 'Order not found' }, 404);
    const { status } = body;
    const VALID = ['PLACED', 'PACKED', 'FULFILLED', 'CANCELLED'];
    if (!VALID.includes(status)) return json({ error: 'Invalid status' }, 400);
    if (status === order.status) return json({ error: 'Order is already in that status' }, 400);
    if (['FULFILLED', 'CANCELLED'].includes(order.status)) return json({ error: 'Order is already final' }, 400);
    if (order.status === 'PACKED' && !['FULFILLED', 'CANCELLED'].includes(status)) {
      return json({ error: 'Packed orders can only be fulfilled or cancelled' }, 400);
    }
    if (order.status === 'PLACED' && !['PACKED', 'CANCELLED'].includes(status)) {
      return json({ error: 'Placed orders can only be packed or cancelled' }, 400);
    }

    const t = now();
    if (status === 'CANCELLED') {
      const items = state.orderItems.filter((i) => i.orderId === order.id);
      for (const item of items) {
        const product = state.marketProducts.find((p) => p.id === item.productId);
        if (product) product.stock += item.quantity;
      }
      const member = state.members.find((m) => m.id === order.memberId);
      if (member) member.depositBalanceKobo = (member.depositBalanceKobo || 0) + order.totalKobo;
      pushLedger(state, {
        reference: makeReference('MKT-REF'),
        type: 'MARKET_REFUND',
        amountKobo: order.totalKobo,
        description: `Refund for cancelled order ${order.reference} — ${member?.membershipNumber || ''}`,
        memberId: order.memberId,
      });
      const u = state.users.find((x) => x.id === member?.userId);
      if (u) {
        pushMail(
          state,
          u.email,
          'ORDER_CANCELLED',
          `Order ${order.reference} cancelled — refund issued`,
          { orderReference: order.reference, amountKobo: order.totalKobo },
          `Your order ${order.reference} was cancelled and ₦${(order.totalKobo / 100).toFixed(2)} refunded to your deposit wallet.`,
        );
      }
    }
    order.status = status;
    order.updatedAt = t;
    saveState(state);
    return json({ success: true });
  }

  // —— Shares summary (admin) ——
  if (apiPath === '/api/admin/shares' && method === 'GET') {
    if (!requireStaff(state)) return json({ error: 'Unauthorized' }, 403);
    const rows = state.members
      .filter((m: any) => m.status !== 'REMOVED')
      .map((m: any) => ({
        id: m.id,
        membershipNumber: m.membershipNumber,
        name: `${m.firstName} ${m.lastName}`,
        sharesBalanceKobo: m.sharesBalanceKobo || 0,
        belowMinimum: (m.sharesBalanceKobo || 0) < 2_000_000,
      }));
    return json({
      totalShareCapitalKobo: rows.reduce((s, r) => s + r.sharesBalanceKobo, 0),
      members: rows,
      minSharesKobo: 2_000_000,
    });
  }

  // —— Development fees ——
  if (apiPath === '/api/admin/fees' && method === 'GET') {
    if (!requireStaff(state)) return json({ error: 'Unauthorized' }, 403);
    const fees = ((state as any).developmentFees || []) as any[];
    const membersMap = Object.fromEntries(state.members.map((m) => [m.id, m]));
    return json({
      fees: fees
        .map((f) => ({ ...f, member: membersMap[f.memberId] }))
        .sort((a, b) => (a.status === 'UNPAID' ? -1 : 1)),
    });
  }

  if (apiPath === '/api/members/fees' && method === 'GET') {
    const auth = requireMember(state);
    if (!auth) return json({ error: 'Unauthorized' }, 401);
    const fees = ((state as any).developmentFees || []).filter((f: any) => f.memberId === auth.member.id);
    return json({ fees, residency: (auth.member as any).residency || 'RESIDENT' });
  }

  if (apiPath === '/api/members/fees/pay' && method === 'POST') {
    const auth = requireMember(state);
    if (!auth) return json({ error: 'Unauthorized' }, 401);
    const member = state.members.find((m) => m.id === auth.member.id)!;
    const fee = ((state as any).developmentFees || []).find((f: any) => f.id === body.feeId && f.memberId === member.id);
    if (!fee) return json({ error: 'Fee not found' }, 404);
    if (fee.status === 'PAID') return json({ error: 'Already paid' }, 400);
    const wallet = member.depositBalanceKobo || 0;
    if (fee.amountKobo > wallet) return json({ error: 'Insufficient deposit wallet balance' }, 400);
    member.depositBalanceKobo = wallet - fee.amountKobo;
    fee.status = 'PAID';
    fee.paidAt = now();
    if (member.status === 'SUSPENDED') member.status = 'ACTIVE';
    const ref = makeReference('DFEE');
    pushLedger(state, {
      reference: ref,
      type: 'DEVELOPMENT_FEE',
      amountKobo: fee.amountKobo,
      description: `Development fee ${fee.year} — ${member.membershipNumber}`,
      memberId: member.id,
    });
    saveState(state);
    return json({ success: true, reference: ref, depositBalanceKobo: member.depositBalanceKobo });
  }

  if (apiPath === '/api/members/shares' && method === 'GET') {
    const auth = requireMember(state);
    if (!auth) return json({ error: 'Unauthorized' }, 401);
    const member = state.members.find((m) => m.id === auth.member.id)!;
    const history = state.ledger
      .filter((l) => l.memberId === member.id && l.type === 'DEPOSIT_TO_SHARES')
      .sort((a, b) => b.date - a.date);
    return json({
      sharesBalanceKobo: member.sharesBalanceKobo || 0,
      depositBalanceKobo: member.depositBalanceKobo || 0,
      minSharesKobo: 2_000_000,
      meetsMinimum: (member.sharesBalanceKobo || 0) >= 2_000_000,
      history,
      referralCode: (member as any).referralCode || null,
    });
  }

  if (apiPath === '/api/members/shares/buy' && method === 'POST') {
    const auth = requireMember(state);
    if (!auth) return json({ error: 'Unauthorized' }, 401);
    const member = state.members.find((m) => m.id === auth.member.id)!;
    const amountKobo = Math.round(Number(body.amountKobo) || 0);
    const check = validateSharesPurchase(member.sharesBalanceKobo || 0, amountKobo);
    if (!check.ok) return json({ error: check.error }, 400);
    const wallet = member.depositBalanceKobo || 0;
    if (amountKobo > wallet) return json({ error: 'Insufficient deposit wallet balance' }, 400);
    member.depositBalanceKobo = wallet - amountKobo;
    member.sharesBalanceKobo = (member.sharesBalanceKobo || 0) + amountKobo;
    const ref = makeReference('ALLOC-SHR');
    pushLedger(state, {
      reference: ref,
      type: 'DEPOSIT_TO_SHARES',
      amountKobo,
      description: `Share capital purchase — ${member.membershipNumber}`,
      memberId: member.id,
    });
    saveState(state);
    return json({
      success: true,
      reference: ref,
      balances: {
        depositBalanceKobo: member.depositBalanceKobo,
        sharesBalanceKobo: member.sharesBalanceKobo,
      },
    });
  }

  // —— Public join + onboarding ——
  if (apiPath === '/api/public/join/validate-referral' && method === 'POST') {
    const code = String(body.code || '').trim().toUpperCase();
    if (!code) return json({ error: 'Referral code required' }, 400);
    // Referral code = membership number (e.g. BH-001)
    const referrer = state.members.find(
      (m: any) =>
        m.status === 'ACTIVE' &&
        (String(m.referralCode || '').toUpperCase() === code ||
          String(m.membershipNumber || '').toUpperCase() === code),
    );
    if (!referrer) return json({ valid: false, error: 'Invalid or inactive referral code (use a member code like BH-001)' }, 400);
    return json({
      valid: true,
      referrer: `${referrer.firstName} ${referrer.lastName}`,
      membershipNumber: referrer.membershipNumber,
    });
  }

  if (apiPath === '/api/public/join' && method === 'POST') {
    const {
      firstName, middleName, lastName, email, password, referralCode, phoneNumber,
    } = body;
    if (!firstName || !lastName || !email || !password || !referralCode) {
      return json({ error: 'First name, last name, email, password, and referral code are required' }, 400);
    }
    if (state.users.some((u) => u.email.toLowerCase() === String(email).toLowerCase())) {
      return json({ error: 'An account with this email already exists' }, 400);
    }
    const code = String(referralCode).trim().toUpperCase();
    const referrer = state.members.find(
      (m: any) =>
        m.status === 'ACTIVE' &&
        (String(m.referralCode || '').toUpperCase() === code ||
          String(m.membershipNumber || '').toUpperCase() === code),
    );
    if (!referrer) return json({ error: 'Invalid referral code — use a member code like BH-001' }, 400);

    const t = now();
    const userId = uid();
    const appId = uid();
    const reference = makeReference('APP');
    state.users.push({
      id: userId,
      email: String(email).trim().toLowerCase(),
      passwordHash: String(password),
      role: 'APPLICANT',
      displayName: `${firstName} ${lastName}`,
      createdAt: t,
      updatedAt: t,
    });
    state.applications.unshift({
      id: appId,
      reference,
      userId,
      firstName: String(firstName).trim(),
      middleName: String(middleName || '').trim(),
      lastName: String(lastName).trim(),
      email: String(email).trim().toLowerCase(),
      phoneNumber: String(phoneNumber || '').trim() || '+2348000000000',
      referralCodeUsed: code,
      status: 'AWAITING_PAYMENT',
      regFeeDueAt: t + REG_FEE_DEADLINE_DAYS * 86400,
      regFeePaidAt: null,
      regFeePaymentRef: null,
      kym: null,
      reviewNotes: null,
      submittedAt: t,
      submittedForApprovalAt: null,
    } as any);
    pushMail(
      state,
      email,
      'APPLICATION_RECEIVED',
      `Welcome — complete onboarding (${reference})`,
      { reference },
      `Pay the ₦2,000 registration fee within 7 days to continue. Payment guarantees onboarding; membership approval is subject to KYM and background checks.`,
    );
    setSession({ userId, portal: 'MEMBER' });
    saveState(state);
    return json({ success: true, reference, applicationId: appId, onboarding: true });
  }

  if (apiPath === '/api/members/onboarding' && method === 'GET') {
    // The onboarding tab keeps polling while staff sign in on this device
    // (shared localStorage session), so resolve the applicant whose status
    // this tab tracks: the member-portal session, or the applicantId captured
    // when the page first loaded.
    const { user, portal } = getAuth(state);
    const params = queryOf(url);
    const applicantId =
      user && portal === 'MEMBER' ? user.id : params.get('applicantId');
    const applicant = applicantId
      ? state.users.find((u) => u.id === applicantId)
      : null;
    if (!applicant) return json({ error: 'Unauthorized' }, 401);
    const signedInAsApplicant = !!user && portal === 'MEMBER' && user.id === applicant.id;
    const application = (state.applications as any[]).find(
      (a) => a.userId === applicant.id || a.email === applicant.email,
    );
    const member = state.members.find(
      (m) => m.userId === applicant.id && m.status !== 'REMOVED' && m.status !== 'LEFT',
    );
    const base = {
      applicantId: applicant.id,
      registrationFeeKobo: REGISTRATION_FEE_KOBO,
      disclaimer:
        'Payment of the registration fee guarantees you may continue onboarding. Membership approval remains subject to Know Your Member (KYM) verification and background checks by the cooperative.',
    };
    // Fully approved member — show complete step (UI has Go to dashboard)
    if (member && (member.status === 'ACTIVE' || member.status === 'SUSPENDED')) {
      if (signedInAsApplicant && applicant.role === 'APPLICANT') {
        applicant.role = 'MEMBER';
        saveState(state);
      }
      return json({
        complete: true,
        step: 'complete',
        member,
        application: application || null,
        redirectTo: '/member/dashboard',
        signedInAsApplicant,
        ...base,
      });
    }
    if (!application) {
      return json({ complete: false, application: null, step: null, signedInAsApplicant, ...base });
    }
    if (
      application.status === 'AWAITING_PAYMENT' &&
      application.regFeeDueAt &&
      now() > application.regFeeDueAt
    ) {
      application.status = 'EXPIRED';
      saveState(state);
    }
    // Approved application but member row not linked yet — still treat as complete for UX
    if (application.status === 'APPROVED') {
      return json({
        complete: true,
        step: 'complete',
        application,
        member: null,
        redirectTo: '/member/dashboard',
        signedInAsApplicant,
        message:
          'Your membership was approved. Open your dashboard, or sign in again with your email and password if needed.',
        ...base,
      });
    }
    let step = 'payment';
    if (application.status === 'AWAITING_KYM') step = 'kym';
    else if (application.status === 'PENDING_APPROVAL') step = 'waiting';
    else if (application.status === 'REJECTED' || application.status === 'EXPIRED') {
      step = application.status.toLowerCase();
    }
    return json({ complete: false, application, step, signedInAsApplicant, ...base });
  }

  if (apiPath === '/api/members/onboarding/welcome-seen' && method === 'POST') {
    // Mark the approval welcome as seen so future sign-ins go straight to the
    // dashboard. Accepts applicantId (member tab may be tracking an applicant
    // while a staff session is active on this device).
    const { user, portal } = getAuth(state);
    const applicantId =
      (user && portal === 'MEMBER' ? user.id : null) ||
      body.applicantId ||
      queryOf(url).get('applicantId');
    if (!applicantId) return json({ error: 'Not found' }, 404);
    const application = (state.applications as any[]).find(
      (a) => a.userId === applicantId || a.email === applicantId,
    );
    if (!application) return json({ error: 'Not found' }, 404);
    application.welcomeSeenAt = now();
    saveState(state);
    return json({ success: true });
  }

  if (apiPath === '/api/members/onboarding/pay-fee' && method === 'POST') {
    const { user, portal } = getAuth(state);
    if (!user || portal !== 'MEMBER') return json({ error: 'Unauthorized' }, 401);
    const application = (state.applications as any[]).find((a) => a.userId === user.id || a.email === user.email);
    if (!application) return json({ error: 'No application found' }, 404);
    if (application.status !== 'AWAITING_PAYMENT') return json({ error: 'Fee already paid or application closed' }, 400);
    if (application.regFeeDueAt && now() > application.regFeeDueAt) {
      application.status = 'EXPIRED';
      saveState(state);
      return json({ error: 'Registration fee deadline has passed (7 days)' }, 400);
    }
    const ref = makeReference('REG');
    application.regFeePaidAt = now();
    application.regFeePaymentRef = ref;
    application.status = 'AWAITING_KYM';
    pushLedger(state, {
      reference: ref,
      type: 'REGISTRATION_FEE',
      amountKobo: REGISTRATION_FEE_KOBO,
      description: `Registration fee — ${application.reference}`,
      memberId: null,
    });
    saveState(state);
    return json({ success: true, reference: ref, nextStep: 'kym' });
  }

  if (apiPath === '/api/members/onboarding/kym' && method === 'POST') {
    const { user, portal } = getAuth(state);
    if (!user || portal !== 'MEMBER') return json({ error: 'Unauthorized' }, 401);
    const application = (state.applications as any[]).find((a) => a.userId === user.id || a.email === user.email);
    if (!application) return json({ error: 'No application found' }, 404);
    if (application.status !== 'AWAITING_KYM') return json({ error: 'KYM not available at this stage' }, 400);
    const kym = body.kym || body;
    if (!kym.idType || !kym.idNumber || !kym.occupation || !kym.nextOfKinName || !kym.nextOfKinPhone || !kym.address) {
      return json({ error: 'Complete all required KYM fields' }, 400);
    }
    application.kym = {
      legalName: kym.legalName || `${application.firstName} ${application.middleName || ''} ${application.lastName}`.replace(/\s+/g, ' ').trim(),
      idType: kym.idType,
      idNumber: kym.idNumber,
      occupation: kym.occupation,
      employer: kym.employer || '',
      salaryRange: kym.salaryRange || 'UNDER_500K',
      nextOfKinName: kym.nextOfKinName,
      nextOfKinPhone: kym.nextOfKinPhone,
      nextOfKinRelationship: kym.nextOfKinRelationship || 'Relative',
      address: kym.address,
      residency: kym.residency === 'NON_RESIDENT' ? 'NON_RESIDENT' : 'RESIDENT',
      documentName: kym.documentName || 'id-document.pdf',
    };
    application.status = 'PENDING_APPROVAL';
    application.submittedForApprovalAt = now();
    pushMail(
      state,
      application.email,
      'KYM_SUBMITTED',
      'KYM submitted — awaiting membership approval',
      { reference: application.reference },
      'Your Know Your Member details are with the board for background checks.',
    );
    saveState(state);
    return json({ success: true, nextStep: 'waiting' });
  }

  // Investments (money-out: enter approval chain)
  if (apiPath === '/api/admin/investments' && method === 'GET') {
    if (!requireStaff(state)) return json({ error: 'Unauthorized' }, 403);
    return json({
      investments: state.investments,
      totalValueKobo: state.investments.reduce((s, i: any) => s + (i.currentValueKobo || 0), 0),
    });
  }

  if (apiPath === '/api/admin/investments' && method === 'POST') {
    const user = requireStaff(state);
    if (!user || !can(user.role, 'investments:write')) return json({ error: 'Forbidden' }, 403);
    const inv = {
      id: uid(),
      name: body.name,
      category: body.category || 'General',
      principalKobo: body.principalKobo,
      currentValueKobo: body.currentValueKobo ?? body.principalKobo,
      expectedReturnRate: body.expectedReturnRate || 0,
      status: 'PENDING_FS',
      acquiredAt: now(),
      notes: body.notes || '',
      approval: emptyApproval(),
    };
    state.investments.unshift(inv as any);
    saveState(state);
    return json({ success: true, investment: inv, message: 'Investment proposed — awaits FS → Admin → Super Admin approval' });
  }

  const invApprove = apiPath.match(/^\/api\/admin\/investments\/([^/]+)\/(approve|reject)$/);
  if (invApprove && method === 'POST') {
    const user = requireStaff(state);
    if (!user) return json({ error: 'Unauthorized' }, 403);
    const inv = state.investments.find((i: any) => i.id === invApprove[1]) as any;
    if (!inv) return json({ error: 'Not found' }, 404);
    if (!inv.approval) inv.approval = emptyApproval();
    if (inv.status === 'ACTIVE') return json({ error: 'Already active' }, 400);
    const actorName = (() => {
      const m = state.members.find((x) => x.userId === user.id);
      return m ? `${m.firstName} ${m.lastName}` : user.email;
    })();
    const result = applyApprovalAction(
      inv.approval,
      invApprove[2] as 'approve' | 'reject',
      { userId: user.id, name: actorName, role: normalizeRole(user.role) },
      now(),
      body.note || null,
    );
    if (!result.ok) return json({ error: result.error }, 403);
    if (invApprove[2] === 'reject') {
      inv.status = 'REJECTED';
      saveState(state);
      return json({ success: true });
    }
    inv.status = inv.approval.step === 'APPROVED' ? 'ACTIVE' : inv.approval.step;
    if (result.executed) {
      inv.status = 'ACTIVE';
      const ref = makeReference('INV');
      pushLedger(state, {
        reference: ref,
        type: 'INVESTMENT_PURCHASE',
        amountKobo: inv.principalKobo,
        description: `Investment purchase — ${inv.name}`,
        memberId: null,
      });
      saveState(state);
      return json({ success: true, executed: true, reference: ref });
    }
    saveState(state);
    return json({ success: true, step: inv.approval.step });
  }

  // Dividends — share-weighted; distribution runs after triple approval
  if (apiPath === '/api/admin/dividends' && method === 'GET') {
    if (!requireStaff(state)) return json({ error: 'Unauthorized' }, 403);
    const preview = allocateDividendsByShares(
      4_500_000,
      state.members.map((m: any) => ({
        id: m.id,
        membershipNumber: m.membershipNumber,
        sharesBalanceKobo: m.sharesBalanceKobo || 0,
        status: m.status,
      })),
    );
    return json({
      periods: state.dividendPeriods,
      allocations: state.dividendAllocations.map((a) => ({
        ...a,
        member: state.members.find((m) => m.id === a.memberId),
        period: state.dividendPeriods.find((p) => p.id === a.periodId),
      })),
      formula: DIVIDEND_FORMULA_COPY,
      previewSample: preview.slice(0, 5),
    });
  }

  if (apiPath === '/api/admin/dividends/preview' && method === 'POST') {
    if (!requireStaff(state)) return json({ error: 'Unauthorized' }, 403);
    const period = state.dividendPeriods.find((p) => p.id === body.periodId);
    if (!period) return json({ error: 'Period not found' }, 404);
    const allocations = allocateDividendsByShares(
      period.surplusKobo,
      state.members.map((m: any) => ({
        id: m.id,
        membershipNumber: m.membershipNumber,
        sharesBalanceKobo: m.sharesBalanceKobo || 0,
        status: m.status,
      })),
    );
    return json({ allocations, formula: DIVIDEND_FORMULA_COPY });
  }

  const divApprove = apiPath.match(/^\/api\/admin\/dividends\/([^/]+)\/(approve|reject)$/);
  if (divApprove && method === 'POST') {
    const user = requireStaff(state);
    if (!user) return json({ error: 'Unauthorized' }, 403);
    const period = state.dividendPeriods.find((p: any) => p.id === divApprove[1]) as any;
    if (!period) return json({ error: 'Not found' }, 404);
    if (period.status === 'DISTRIBUTED') return json({ error: 'Already distributed' }, 400);
    if (!period.approval) period.approval = emptyApproval();
    const actorName = (() => {
      const m = state.members.find((x) => x.userId === user.id);
      return m ? `${m.firstName} ${m.lastName}` : user.email;
    })();
    const result = applyApprovalAction(
      period.approval,
      divApprove[2] as 'approve' | 'reject',
      { userId: user.id, name: actorName, role: normalizeRole(user.role) },
      now(),
      body.note || null,
    );
    if (!result.ok) return json({ error: result.error }, 403);
    if (divApprove[2] === 'reject') {
      period.status = 'REJECTED';
      saveState(state);
      return json({ success: true });
    }
    if (!result.executed) {
      period.status = 'IN_APPROVAL';
      saveState(state);
      return json({ success: true, step: period.approval.step });
    }

    // Execute share-weighted distribution to deposit wallets
    const allocations = allocateDividendsByShares(
      period.surplusKobo,
      state.members.map((m: any) => ({
        id: m.id,
        membershipNumber: m.membershipNumber,
        sharesBalanceKobo: m.sharesBalanceKobo || 0,
        status: m.status,
      })),
    );
    for (const a of allocations) {
      if (a.amountKobo <= 0) continue;
      const m = state.members.find((x) => x.id === a.memberId)!;
      m.depositBalanceKobo = (m.depositBalanceKobo || 0) + a.amountKobo;
      state.dividendAllocations.push({
        id: uid(),
        periodId: period.id,
        memberId: m.id,
        amountKobo: a.amountKobo,
        status: 'PAID',
        paidAt: now(),
      });
      const u = state.users.find((x) => x.id === m.userId);
      if (u) {
        pushMail(
          state,
          u.email,
          'DIVIDEND_PAID',
          `Dividend credited — ${period.label}`,
          { amountKobo: a.amountKobo, period: period.label },
          `₦${(a.amountKobo / 100).toFixed(2)} dividend credited to your deposit wallet (share-weighted).`,
        );
      }
    }
    const ref = makeReference('DIV');
    pushLedger(state, {
      reference: ref,
      type: 'DIVIDEND_PAYOUT',
      amountKobo: period.surplusKobo,
      description: `Dividend distribution (share-weighted) — ${period.label}`,
      memberId: null,
    });
    period.status = 'DISTRIBUTED';
    period.distributedAt = now();
    saveState(state);
    return json({ success: true, reference: ref, executed: true });
  }

  // Back-compat: distribute button kicks off / continues as Super final if already ready
  if (apiPath === '/api/admin/dividends/distribute' && method === 'POST') {
    const user = requireStaff(state);
    if (!user) return json({ error: 'Unauthorized' }, 403);
    // Re-route to approval chain: if Super Admin and PENDING_SUPER or first propose
    const period = state.dividendPeriods.find((p: any) => p.id === body.periodId) as any;
    if (!period) return json({ error: 'Period not found' }, 404);
    if (period.status === 'DISTRIBUTED') return json({ error: 'Already distributed' }, 400);
    if (!period.approval) period.approval = emptyApproval();
    // If still at start, only FS can first-approve via this shortcut when they have money_out:first
    return handleMockApi(`/api/admin/dividends/${period.id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ note: body.note || 'Approval step' }),
    });
  }

  if (apiPath === '/api/admin/profile/update' && method === 'POST') {
    const user = requireStaff(state);
    if (!user) return json({ error: 'Unauthorized' }, 403);
    if (body.newPassword) {
      const u = state.users.find((x) => x.id === user.id)!;
      u.passwordHash = body.newPassword;
      saveState(state);
    }
    return json({ success: true });
  }

  if (apiPath === '/api/admin/announcements' && method === 'GET') {
    if (!requireStaff(state)) return json({ error: 'Unauthorized' }, 403);
    return json({ announcements: state.announcements });
  }

  if (apiPath === '/api/admin/reports' && method === 'GET') {
    if (!requireStaff(state)) return json({ error: 'Unauthorized' }, 403);
    const t = now();
    const yearStart = Math.floor(new Date(new Date().getFullYear(), 0, 1).getTime() / 1000);
    const active = state.members.filter((m) => m.status === 'ACTIVE');
    const pool = coOpPoolTotals(state);
    const activeLoans = state.loans.filter((l) => l.status === 'ACTIVE');
    const completedLoans = state.loans.filter((l) => l.status === 'COMPLETED');
    const latestPeriod =
      [...state.dividendPeriods].sort((a: any, b: any) => (b.declaredAt || 0) - (a.declaredAt || 0))[0] ||
      null;
    const projection = latestPeriod
      ? allocateDividendsByShares(
          latestPeriod.surplusKobo,
          state.members.map((m: any) => ({
            id: m.id,
            membershipNumber: m.membershipNumber,
            sharesBalanceKobo: m.sharesBalanceKobo || 0,
            status: m.status,
          })),
        )
      : [];
    return json({
      generatedAt: t,
      monthlyFinancials: {
        totalContributionsKobo: state.members.reduce((s, m) => s + m.totalContributionsKobo, 0),
        totalDepositBalanceKobo: state.members.reduce((s, m) => s + (m.depositBalanceKobo || 0), 0),
        totalShareCapitalKobo: state.members.reduce((s, m) => s + (m.sharesBalanceKobo || 0), 0),
        totalDevelopmentFeesKobo: ((state as any).developmentFees || []).reduce(
          (s: number, f: any) => s + (f.paidAt ? f.amountKobo : 0),
          0,
        ),
        coOpNetKobo: pool.net,
      },
      loanPortfolio: {
        activeCount: activeLoans.length,
        outstandingKobo: activeLoans.reduce((s, l) => s + (l.totalDueKobo - l.paidKobo), 0),
        completedCount: completedLoans.length,
        rejectedCount: state.loans.filter((l) => l.status === 'REJECTED').length,
      },
      membershipGrowth: {
        activeCount: active.length,
        pendingApplications: state.applications.filter((a) =>
          ['PENDING', 'PENDING_APPROVAL', 'AWAITING_PAYMENT', 'AWAITING_KYM'].includes(a.status),
        ).length,
        joinedThisYear: state.members.filter((m) => m.joinedAt >= yearStart).length,
        removedCount: state.members.filter((m) => m.status === 'REMOVED').length,
      },
      dividendProjection: {
        periodLabel: latestPeriod?.label || 'None',
        surplusKobo: latestPeriod?.surplusKobo || 0,
        projectedPayoutKobo: projection.reduce((s, a) => s + a.amountKobo, 0),
      },
    });
  }

  console.warn('[api] unhandled', method, apiPath, getSession());
  return json({ error: `Unhandled ${method} ${apiPath}` }, 404);
}

// ensure createDefaultState is tree-shaken friendly
void createDefaultState;
