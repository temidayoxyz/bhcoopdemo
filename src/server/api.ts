import { Router } from "express";
import { db } from "../db/db";
import * as schema from "../db/schema";
import { eq, desc } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { getUnixTime } from "date-fns";
import { isStaff, ROLE_LABELS } from "../lib/roles";
import { resetDatabase } from "../db/initDb";

export const apiRouter = Router();

function requireStaffUser(req: any) {
  const user = req.user;
  if (!user || !isStaff(user.role) || req.portal !== 'ADMIN') return null;
  return user;
}

// Demo auth middleware — portal cookies; staff may also hold a member profile
apiRouter.use(async (req, res, next) => {
  const memberToken = req.cookies['bhcoop-member-demo-session'];
  const adminToken = req.cookies['bhcoop-admin-demo-session'];

  if (memberToken) {
    const user = await db.query.users.findFirst({ where: eq(schema.users.id, memberToken) });
    if (user) {
      const member = await db.query.members.findFirst({ where: eq(schema.members.userId, user.id) });
      // Pure members or staff dual-identity in member portal
      if (member && (user.role === 'MEMBER' || isStaff(user.role))) {
        (req as any).user = user;
        (req as any).member = member;
        (req as any).portal = 'MEMBER';
      }
    }
  }

  if (!((req as any).user) && adminToken) {
    const user = await db.query.users.findFirst({ where: eq(schema.users.id, adminToken) });
    if (user && isStaff(user.role)) {
      const member = await db.query.members.findFirst({ where: eq(schema.members.userId, user.id) });
      (req as any).user = user;
      (req as any).member = member || null;
      (req as any).portal = 'ADMIN';
    }
  }
  next();
});

// Sign-in directory for the login page, built from the live database
apiRouter.get('/auth/personas', async (req, res) => {
  const usersList = await db.query.users.findMany();
  const membersList = await db.query.members.findMany();
  const membersByUser = Object.fromEntries(membersList.map((m) => [String(m.userId), m]));

  const staff = usersList.filter((u) => isStaff(String(u.role))).map((u) => {
    const m = membersByUser[String(u.id)];
    return {
      email: u.email,
      role: u.role,
      label: m ? `${m.firstName} ${m.lastName}` : u.email,
      subtitle: ROLE_LABELS[u.role as keyof typeof ROLE_LABELS] || u.role,
      portal: 'ADMIN',
      membershipNumber: m?.membershipNumber,
      tagline: 'Staff · also a member · switch portals anytime',
    };
  });

  const members = usersList.filter((u) => u.role === 'MEMBER').map((u) => {
    const m = membersByUser[String(u.id)];
    return {
      email: u.email,
      role: 'MEMBER',
      label: m ? `${m.firstName} ${m.lastName}` : u.email,
      subtitle: m?.membershipNumber,
      portal: 'MEMBER',
      membershipNumber: m?.membershipNumber,
      tagline: 'Member · deposits, contributions, loans, market',
    };
  });

  res.json({ personas: { staff, members }, passwordHint: 'blessedhands' });
});

apiRouter.post('/system/reset', async (req, res) => {
  await resetDatabase();
  res.json({ success: true });
});

apiRouter.post('/auth/login', async (req, res) => {
  const { email, password, portal } = req.body; // portal: 'MEMBER' | 'ADMIN'
  const user = await db.query.users.findFirst({ where: eq(schema.users.email, email) });

  if (!user || user.passwordHash !== password) {
    return res.status(401).json({ error: 'Invalid demo credentials' });
  }

  const member = await db.query.members.findFirst({ where: eq(schema.members.userId, user.id) });

  if (portal === 'MEMBER') {
    if (!member) {
      return res.status(403).json({ error: 'No member profile linked to this account' });
    }
    res.cookie('bhcoop-member-demo-session', user.id, { httpOnly: true });
    res.clearCookie('bhcoop-admin-demo-session', { httpOnly: true });
  } else if (portal === 'ADMIN') {
    if (!isStaff(user.role)) {
      return res.status(403).json({ error: 'Not a staff account' });
    }
    res.cookie('bhcoop-admin-demo-session', user.id, { httpOnly: true });
    res.clearCookie('bhcoop-member-demo-session', { httpOnly: true });
  } else {
    return res.status(400).json({ error: 'Invalid portal' });
  }

  res.json({
    success: true,
    user,
    member: member || null,
    portal,
    canSwitchToMember: isStaff(user.role) && !!member,
    canSwitchToAdmin: isStaff(user.role),
  });
});

apiRouter.post('/auth/switch-portal', async (req, res) => {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: 'Not signed in' });

  const member = await db.query.members.findFirst({ where: eq(schema.members.userId, user.id) });
  const portal = req.body.portal as 'MEMBER' | 'ADMIN';

  if (portal === 'MEMBER') {
    if (!isStaff(user.role) || !member) {
      return res.status(403).json({ error: 'Cannot switch to member view' });
    }
    res.cookie('bhcoop-member-demo-session', user.id, { httpOnly: true });
    res.clearCookie('bhcoop-admin-demo-session', { httpOnly: true });
  } else if (portal === 'ADMIN') {
    if (!isStaff(user.role)) {
      return res.status(403).json({ error: 'Cannot switch to staff view' });
    }
    res.cookie('bhcoop-admin-demo-session', user.id, { httpOnly: true });
    res.clearCookie('bhcoop-member-demo-session', { httpOnly: true });
  } else {
    return res.status(400).json({ error: 'Invalid portal' });
  }

  res.json({
    success: true,
    user,
    member: member || null,
    portal,
    canSwitchToMember: isStaff(user.role) && !!member,
    canSwitchToAdmin: isStaff(user.role),
  });
});

apiRouter.post('/auth/logout', (req, res) => {
  const { portal } = req.body;
  const cookieName = portal === 'MEMBER' ? 'bhcoop-member-demo-session' : 'bhcoop-admin-demo-session';
  res.clearCookie(cookieName, { httpOnly: true, secure: true, sameSite: 'none' });
  res.json({ success: true });
});

apiRouter.get('/auth/me', async (req, res) => {
  const user = (req as any).user;
  if (!user) return res.json({ user: null });
  const freshMember = await db.query.members.findFirst({ where: eq(schema.members.userId, user.id) });
  const portal = (req as any).portal || null;
  res.json({
    user,
    member: freshMember || null,
    portal,
    canSwitchToMember: isStaff(user.role) && !!freshMember,
    canSwitchToAdmin: isStaff(user.role),
  });
});

// Member Routes
apiRouter.get('/members/dashboard', async (req, res) => {
  const member = (req as any).member;
  if (!member) return res.status(401).json({ error: 'Unauthorized' });

  // Always fetch fresh member from DB so deposit balance and shares update instantly
  const freshMember = await db.query.members.findFirst({ where: eq(schema.members.id, member.id) });

  const loans = await db.query.loans.findMany({
    where: eq(schema.loans.memberId, member.id),
    orderBy: [desc(schema.loans.appliedAt)]
  });

  const enrichedLoans = await Promise.all(loans.map(async (loan) => {
    const guarantorsReqs = await db.select({
      id: schema.guarantorRequests.id,
      status: schema.guarantorRequests.status,
      member: {
        id: schema.members.id,
        firstName: schema.members.firstName,
        lastName: schema.members.lastName,
        membershipNumber: schema.members.membershipNumber,
      }
    }).from(schema.guarantorRequests)
      .leftJoin(schema.members, eq(schema.guarantorRequests.guarantorMemberId, schema.members.id))
      .where(eq(schema.guarantorRequests.loanId, loan.id));
      
    return { ...loan, guarantors: guarantorsReqs };
  }));

  const obligations = await db.query.contributionObligations.findMany({
    where: eq(schema.contributionObligations.memberId, member.id),
    orderBy: [desc(schema.contributionObligations.dueDate)]
  });

  res.json({
    member: freshMember || member,
    loans: enrichedLoans,
    obligations
  });
});

// Admin Routes
apiRouter.get('/admin/dashboard', async (req, res) => {
  const user = (req as any).user;
  if (!requireStaffUser(req)) return res.status(403).json({ error: 'Unauthorized' });

  const activeMembers = await db.query.members.findMany({ where: eq(schema.members.status, 'ACTIVE') });
  const pendingApplications = await db.query.membershipApplications.findMany({ where: eq(schema.membershipApplications.status, 'PENDING') });
  const allMembers = await db.query.members.findMany();
  const totalContributions = allMembers.reduce((acc: number, curr: any) => acc + curr.totalContributionsKobo, 0);
  const totalDepositWalletBalance = allMembers.reduce((acc: number, curr: any) => acc + (curr.depositBalanceKobo || 0), 0);
  const totalShareCapital = allMembers.reduce((acc: number, curr: any) => acc + (curr.sharesBalanceKobo || 0), 0);
  
  const activeLoans = await db.query.loans.findMany({ where: eq(schema.loans.status, 'ACTIVE') });
  const activeLoanPortfolio = activeLoans.reduce((acc: number, curr: any) => acc + (curr.totalDueKobo - curr.paidKobo), 0);

  const recentApplications = await db.query.membershipApplications.findMany({
    orderBy: [desc(schema.membershipApplications.submittedAt)],
    limit: 5
  });

  const recentTransactions = await db.query.ledgerTransactions.findMany({
    orderBy: [desc(schema.ledgerTransactions.date)],
    limit: 10
  });

  const recentDeposits = await db.query.fundRequests.findMany({
    where: eq(schema.fundRequests.type, 'DEPOSIT'),
    orderBy: [desc(schema.fundRequests.requestedAt)],
    limit: 5
  });

  const membersMap = Object.fromEntries(allMembers.map(m => [m.id, m]));
  const enrichedRecentDeposits = recentDeposits.map(d => ({
    ...d,
    member: membersMap[d.memberId]
  }));

  res.json({
    activeMembers: activeMembers.length,
    pendingApplications: pendingApplications.length,
    totalContributions,
    totalDepositWalletBalance,
    totalShareCapital,
    activeLoanPortfolio,
    recentApplications,
    recentTransactions,
    recentDeposits: enrichedRecentDeposits
  });
});

apiRouter.post('/members/contributions/simulate-payment', async (req, res) => {
  const member = (req as any).member;
  if (!member) return res.status(401).json({ error: 'Unauthorized' });

  const { obligationId, result } = req.body;
  const obligation = await db.query.contributionObligations.findFirst({
    where: eq(schema.contributionObligations.id, obligationId)
  });

  if (!obligation || obligation.memberId !== member.id) {
    return res.status(404).json({ error: 'Obligation not found' });
  }

  if (result === 'FAILED') {
    return res.json({ success: true, message: 'Simulated payment failed' });
  }

  const amountToPay = obligation.expectedAmountKobo - obligation.paidAmountKobo;
  if (amountToPay <= 0) {
    return res.status(400).json({ error: 'Obligation already paid' });
  }

  const now = getUnixTime(new Date());
  const ref = `DEMO-PAY-${Math.floor(10000 + Math.random() * 90000)}`;

  await db.update(schema.contributionObligations)
    .set({ 
      paidAmountKobo: obligation.paidAmountKobo + amountToPay,
      status: 'PAID'
    })
    .where(eq(schema.contributionObligations.id, obligationId));

  await db.update(schema.members)
    .set({
      totalContributionsKobo: member.totalContributionsKobo + amountToPay
    })
    .where(eq(schema.members.id, member.id));

  await db.insert(schema.ledgerTransactions).values({
    id: uuidv4(),
    reference: ref,
    type: 'CONTRIBUTION_PAYMENT',
    paymentSource: 'PAYSTACK',
    status: 'COMPLETED',
    description: `Direct payment (Paystack) for ${obligation.monthPeriod}`,
    amountKobo: amountToPay,
    date: now
  });

  await db.insert(schema.auditLogs).values({
    id: uuidv4(),
    actorId: member.userId,
    actorRole: 'MEMBER',
    action: 'SIMULATE_PAYMENT',
    entityType: 'CONTRIBUTION_OBLIGATION',
    entityReference: obligationId,
    timestamp: now,
    summary: `Simulated payment of ₦${amountToPay / 100} for obligation ${obligationId}`
  });

  await db.insert(schema.demoEmailOutbox).values({
    id: uuidv4(),
    recipient: (req as any).user.email,
    template: 'CONTRIBUTION_RECEIPT',
    subject: 'Contribution Receipt',
    payload: JSON.stringify({ amount: amountToPay, reference: ref }),
    sentAt: now
  });

  res.json({ success: true, reference: ref });
});

apiRouter.get('/members/loans/metadata', async (req, res) => {
  const member = (req as any).member;
  if (!member) return res.status(401).json({ error: 'Unauthorized' });

  const products = await db.query.loanProducts.findMany();
  const eligibleGuarantors = await db.query.members.findMany({
    where: eq(schema.members.status, 'ACTIVE') // In reality, more complex check
  });

  res.json({ products, eligibleGuarantors });
});

apiRouter.post('/members/loans/apply', async (req, res) => {
  const member = (req as any).member;
  if (!member) return res.status(401).json({ error: 'Unauthorized' });

  const { productId, amountKobo, termMonths, guarantors } = req.body;
  const loanId = uuidv4();
  const reference = `LN-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

  const product = await db.query.loanProducts.findFirst({ where: eq(schema.loanProducts.id, productId) });
  if (!product) return res.status(400).json({ error: 'Invalid product' });

  const interestKobo = Math.round(amountKobo * product.interestRate);

  const now = getUnixTime(new Date());

  await db.insert(schema.loans).values({
    id: loanId,
    memberId: member.id,
    loanProductId: productId,
    reference,
    principalKobo: amountKobo,
    interestKobo,
    totalDueKobo: amountKobo + interestKobo,
    termMonths,
    status: 'PENDING_APPROVAL',
    appliedAt: now
  });

  for (const gid of guarantors) {
    await db.insert(schema.guarantorRequests).values({
      id: uuidv4(),
      loanId,
      guarantorMemberId: gid,
      status: 'ACCEPTED', // Demo requirement: guarantors do not need manual approval
      requestedAt: now
    });
  }

  await db.insert(schema.auditLogs).values({
    id: uuidv4(),
    actorId: member.userId,
    actorRole: 'MEMBER',
    action: 'APPLY_LOAN',
    entityType: 'LOAN',
    entityReference: loanId,
    timestamp: now,
    summary: `Applied for loan ${reference}`
  });

  res.json({ success: true, reference });
});

apiRouter.get('/admin/loans', async (req, res) => {
  const user = (req as any).user;
  if (!requireStaffUser(req)) return res.status(403).json({ error: 'Unauthorized' });

  const loans = await db.query.loans.findMany({
    orderBy: [desc(schema.loans.appliedAt)]
  });

  const enrichedLoans = await Promise.all(loans.map(async (loan) => {
    const member = await db.query.members.findFirst({ where: eq(schema.members.id, loan.memberId) });
    
    const guarantorsReqs = await db.select({
      id: schema.guarantorRequests.id,
      status: schema.guarantorRequests.status,
      member: {
        id: schema.members.id,
        firstName: schema.members.firstName,
        lastName: schema.members.lastName,
        membershipNumber: schema.members.membershipNumber,
      }
    }).from(schema.guarantorRequests)
      .leftJoin(schema.members, eq(schema.guarantorRequests.guarantorMemberId, schema.members.id))
      .where(eq(schema.guarantorRequests.loanId, loan.id));

    return { ...loan, member, guarantors: guarantorsReqs };
  }));

  res.json({ loans: enrichedLoans });
});

apiRouter.post('/admin/loans/:id/approve', async (req, res) => {
  const user = requireStaffUser(req);
  if (!user || !['SUPER_ADMIN', 'ADMIN'].includes(user.role)) return res.status(403).json({ error: 'Unauthorized' });

  const { id } = req.params;
  const now = getUnixTime(new Date());

  await db.update(schema.loans)
    .set({ status: 'APPROVED' })
    .where(eq(schema.loans.id, id));

  await db.insert(schema.auditLogs).values({
    id: uuidv4(),
    actorId: user.id,
    actorRole: user.role,
    action: 'APPROVE_LOAN',
    entityType: 'LOAN',
    entityReference: id,
    timestamp: now,
    summary: `Approved loan ${id}`
  });

  res.json({ success: true });
});

apiRouter.post('/admin/loans/:id/disburse', async (req, res) => {
  const user = requireStaffUser(req);
  if (!user || !['SUPER_ADMIN', 'TREASURER'].includes(user.role)) return res.status(403).json({ error: 'Unauthorized' });

  const { id } = req.params;
  const now = getUnixTime(new Date());

  const loan = await db.query.loans.findFirst({ where: eq(schema.loans.id, id) });
  if (!loan) return res.status(404).json({ error: 'Loan not found' });

  await db.update(schema.loans)
    .set({ status: 'ACTIVE', disbursedAt: now })
    .where(eq(schema.loans.id, id));

  await db.insert(schema.ledgerTransactions).values({
    id: uuidv4(),
    reference: `DISB-${Math.floor(1000 + Math.random() * 9000)}`,
    type: 'LOAN_DISBURSEMENT',
    status: 'COMPLETED',
    description: `Disbursement for loan ${loan.reference}`,
    amountKobo: loan.principalKobo,
    date: now
  });

  await db.insert(schema.auditLogs).values({
    id: uuidv4(),
    actorId: user.id,
    actorRole: user.role,
    action: 'DISBURSE_LOAN',
    entityType: 'LOAN',
    entityReference: id,
    timestamp: now,
    summary: `Simulated disbursement for loan ${loan.reference}`
  });

  res.json({ success: true });
});

apiRouter.get('/admin/applications', async (req, res) => {
  const user = (req as any).user;
  if (!requireStaffUser(req)) return res.status(403).json({ error: 'Unauthorized' });

  const applications = await db.query.membershipApplications.findMany({
    orderBy: [desc(schema.membershipApplications.submittedAt)]
  });

  res.json({ applications });
});

apiRouter.post('/admin/applications/:id/approve', async (req, res) => {
  const user = (req as any).user;
  if (!requireStaffUser(req)) return res.status(403).json({ error: 'Unauthorized' });

  const { id } = req.params;
  const application = await db.query.membershipApplications.findFirst({
    where: eq(schema.membershipApplications.id, id)
  });

  if (!application) return res.status(404).json({ error: 'Application not found' });
  if (application.status !== 'PENDING') return res.status(400).json({ error: 'Application is not pending' });

  const now = getUnixTime(new Date());
  const membershipNumber = `BH-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const userId = uuidv4();
  const memberId = uuidv4();

  // Create User
  await db.insert(schema.users).values({
    id: userId,
    email: application.email,
    passwordHash: 'blessedhands',
    role: 'MEMBER',
    createdAt: now,
    updatedAt: now
  });

  // Create Member
  await db.insert(schema.members).values({
    id: memberId,
    userId: userId,
    membershipNumber,
    firstName: application.firstName,
    lastName: application.lastName,
    phoneNumber: application.phoneNumber,
    status: 'ACTIVE',
    totalContributionsKobo: 0,
    joinedAt: now
  });

  // Update Application
  await db.update(schema.membershipApplications)
    .set({ status: 'APPROVED' })
    .where(eq(schema.membershipApplications.id, id));

  // Audit Log
  await db.insert(schema.auditLogs).values({
    id: uuidv4(),
    actorId: user.id,
    actorRole: user.role,
    action: 'APPROVE_MEMBERSHIP',
    entityType: 'MEMBER',
    entityReference: memberId,
    timestamp: now,
    summary: `Approved application ${application.reference} and created member ${membershipNumber}`
  });

  // Demo Email
  await db.insert(schema.demoEmailOutbox).values({
    id: uuidv4(),
    recipient: application.email,
    template: 'MEMBERSHIP_APPROVED',
    subject: 'Welcome to Blessed Hands',
    payload: JSON.stringify({ membershipNumber }),
    sentAt: now
  });

  res.json({ success: true, member: { membershipNumber } });
});

// --- Funds ---
apiRouter.get('/members/funds', async (req, res) => {
  const member = (req as any).member;
  if (!member) return res.status(401).json({ error: 'Unauthorized' });
  const requests = await db.query.fundRequests.findMany({
    where: eq(schema.fundRequests.memberId, member.id),
    orderBy: (reqs, { desc }) => [desc(reqs.requestedAt)]
  });
  res.json({ requests });
});

apiRouter.post('/members/funds/request', async (req, res) => {
  const member = (req as any).member;
  if (!member) return res.status(401).json({ error: 'Unauthorized' });
  const { type, amountKobo, notes } = req.body;
  if (!['DEPOSIT', 'WITHDRAWAL'].includes(type) || amountKobo <= 0) {
    return res.status(400).json({ error: 'Invalid request' });
  }

  if (type === 'WITHDRAWAL' && amountKobo > member.totalContributionsKobo) {
    return res.status(400).json({ error: 'Insufficient funds' });
  }

  const id = uuidv4();
  const reference = `${type === 'DEPOSIT' ? 'DEP' : 'WDL'}-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`;
  const now = getUnixTime(new Date());

  if (type === 'DEPOSIT') {
    // Deposits do not need approval; auto-approve and credit deposit balance directly
    await db.insert(schema.fundRequests).values({
      id,
      memberId: member.id,
      reference,
      type,
      amountKobo,
      status: 'APPROVED',
      requestedAt: now,
      processedAt: now,
      notes,
    });

    const newDepositBalance = (member.depositBalanceKobo || 0) + amountKobo;
    await db.update(schema.members).set({ depositBalanceKobo: newDepositBalance }).where(eq(schema.members.id, member.id));

    await db.insert(schema.ledgerTransactions).values({
      id: uuidv4(),
      reference: `TXN-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`,
      type: 'DEPOSIT_FUNDING',
      paymentSource: 'PAYSTACK',
      status: 'COMPLETED',
      description: `Member Deposit Wallet Top-Up - ${reference}`,
      amountKobo,
      date: now,
    });
  } else {
    // Withdrawal stays pending approval
    await db.insert(schema.fundRequests).values({
      id,
      memberId: member.id,
      reference,
      type,
      amountKobo,
      status: 'PENDING',
      requestedAt: now,
      notes,
    });
  }

  res.json({ success: true });
});

// Member Deposit Allocation Endpoint
apiRouter.post('/members/deposits/allocate', async (req, res) => {
  const member = (req as any).member;
  if (!member) return res.status(401).json({ error: 'Unauthorized' });

  const { contributionKobo = 0, sharesKobo = 0, loanRepaymentKobo = 0, loanId } = req.body;
  const cKobo = Math.max(0, Number(contributionKobo) || 0);
  const sKobo = Math.max(0, Number(sharesKobo) || 0);
  const lKobo = Math.max(0, Number(loanRepaymentKobo) || 0);
  const totalAllocation = cKobo + sKobo + lKobo;

  if (totalAllocation <= 0) {
    return res.status(400).json({ error: 'Allocation amount must be greater than zero' });
  }

  const freshMember = await db.query.members.findFirst({ where: eq(schema.members.id, member.id) });
  if (!freshMember) return res.status(404).json({ error: 'Member profile not found' });

  if (totalAllocation > (freshMember.depositBalanceKobo || 0)) {
    return res.status(400).json({ error: 'Insufficient funds in Deposit Balance' });
  }

  let loanToUpdate: any = null;
  if (lKobo > 0) {
    if (!loanId) return res.status(400).json({ error: 'Loan target required for loan repayment' });
    loanToUpdate = await db.query.loans.findFirst({ where: eq(schema.loans.id, loanId) });
    if (!loanToUpdate || loanToUpdate.memberId !== freshMember.id) {
      return res.status(400).json({ error: 'Invalid active loan specified' });
    }
    const outstandingKobo = loanToUpdate.totalDueKobo - loanToUpdate.paidKobo;
    if (lKobo > outstandingKobo) {
      return res.status(400).json({ error: `Loan repayment amount exceeds outstanding loan balance` });
    }
  }

  const now = getUnixTime(new Date());
  let newDepositBalance = (freshMember.depositBalanceKobo || 0) - totalAllocation;
  let newContributionsBalance = freshMember.totalContributionsKobo;
  let newSharesBalance = freshMember.sharesBalanceKobo || 0;

  if (cKobo > 0) {
    newContributionsBalance += cKobo;
    const obligations = await db.query.contributionObligations.findMany({
      where: eq(schema.contributionObligations.memberId, freshMember.id),
      orderBy: (obs, { asc }) => [asc(obs.dueDate)]
    });

    let remainingForObligations = cKobo;
    for (const ob of obligations) {
      if (remainingForObligations <= 0) break;
      const owed = ob.expectedAmountKobo - ob.paidAmountKobo;
      if (owed > 0) {
        const payAmount = Math.min(owed, remainingForObligations);
        const newPaid = ob.paidAmountKobo + payAmount;
        const newStatus = newPaid >= ob.expectedAmountKobo ? 'PAID' : 'PARTIAL';
        await db.update(schema.contributionObligations)
          .set({ paidAmountKobo: newPaid, status: newStatus })
          .where(eq(schema.contributionObligations.id, ob.id));
        remainingForObligations -= payAmount;
      }
    }

    await db.insert(schema.ledgerTransactions).values({
      id: uuidv4(),
      reference: `ALLOC-SAV-${Math.floor(10000 + Math.random() * 90000)}`,
      type: 'DEPOSIT_TO_CONTRIBUTION',
      paymentSource: 'DEPOSIT_WALLET',
      status: 'COMPLETED',
      description: 'Allocation from Deposit Fund to Savings/Contributions',
      amountKobo: cKobo,
      date: now
    });
  }

  if (sKobo > 0) {
    newSharesBalance += sKobo;
    await db.insert(schema.ledgerTransactions).values({
      id: uuidv4(),
      reference: `ALLOC-SHR-${Math.floor(10000 + Math.random() * 90000)}`,
      type: 'DEPOSIT_TO_SHARES',
      paymentSource: 'DEPOSIT_WALLET',
      status: 'COMPLETED',
      description: 'Allocation from Deposit Fund to Share Capital',
      amountKobo: sKobo,
      date: now
    });
  }

  if (lKobo > 0 && loanToUpdate) {
    const newPaidKobo = loanToUpdate.paidKobo + lKobo;
    const isCompleted = newPaidKobo >= loanToUpdate.totalDueKobo;
    await db.update(schema.loans)
      .set({
        paidKobo: newPaidKobo,
        status: isCompleted ? 'COMPLETED' : loanToUpdate.status
      })
      .where(eq(schema.loans.id, loanToUpdate.id));

    await db.insert(schema.ledgerTransactions).values({
      id: uuidv4(),
      reference: `ALLOC-LN-${Math.floor(10000 + Math.random() * 90000)}`,
      type: 'DEPOSIT_TO_LOAN_REPAYMENT',
      paymentSource: 'DEPOSIT_WALLET',
      status: 'COMPLETED',
      description: `Allocation from Deposit Fund to Loan Repayment (${loanToUpdate.reference})`,
      amountKobo: lKobo,
      date: now
    });
  }

  await db.update(schema.members).set({
    depositBalanceKobo: newDepositBalance,
    totalContributionsKobo: newContributionsBalance,
    sharesBalanceKobo: newSharesBalance,
  }).where(eq(schema.members.id, freshMember.id));

  await db.insert(schema.auditLogs).values({
    id: uuidv4(),
    actorId: freshMember.userId,
    actorRole: 'MEMBER',
    action: 'ALLOCATE_DEPOSIT',
    entityType: 'DEPOSIT_FUND',
    entityReference: freshMember.id,
    timestamp: now,
    summary: `Allocated ₦${(totalAllocation / 100).toLocaleString()} from deposit fund (Savings: ₦${cKobo/100}, Shares: ₦${sKobo/100}, Loan: ₦${lKobo/100})`
  });

  res.json({
    success: true,
    balances: {
      depositBalanceKobo: newDepositBalance,
      totalContributionsKobo: newContributionsBalance,
      sharesBalanceKobo: newSharesBalance
    }
  });
});

// Member cancels withdrawal fund request
apiRouter.post('/members/funds/:id/cancel', async (req, res) => {
  const member = (req as any).member;
  if (!member) return res.status(401).json({ error: 'Unauthorized' });
  const { id } = req.params;

  const request = await db.query.fundRequests.findFirst({ where: eq(schema.fundRequests.id, id) });
  if (!request) return res.status(404).json({ error: 'Request not found' });
  if (request.memberId !== member.id) return res.status(403).json({ error: 'Unauthorized' });
  if (request.status !== 'PENDING') return res.status(400).json({ error: 'Only pending requests can be cancelled' });

  await db.update(schema.fundRequests).set({
    status: 'CANCELLED',
    processedAt: getUnixTime(new Date())
  }).where(eq(schema.fundRequests.id, id));

  res.json({ success: true });
});

// Member cancels loan application
apiRouter.post('/members/loans/:id/cancel', async (req, res) => {
  const member = (req as any).member;
  if (!member) return res.status(401).json({ error: 'Unauthorized' });
  const { id } = req.params;

  const loan = await db.query.loans.findFirst({ where: eq(schema.loans.id, id) });
  if (!loan) return res.status(404).json({ error: 'Loan not found' });
  if (loan.memberId !== member.id) return res.status(403).json({ error: 'Unauthorized' });
  if (loan.status !== 'PENDING_APPROVAL') return res.status(400).json({ error: 'Only pending applications can be cancelled' });

  await db.update(schema.loans).set({
    status: 'CANCELLED'
  }).where(eq(schema.loans.id, id));

  res.json({ success: true });
});

// Admin Members Directory Endpoints
apiRouter.get('/admin/members', async (req, res) => {
  const user = (req as any).user;
  if (!requireStaffUser(req)) return res.status(403).json({ error: 'Unauthorized' });

  const membersList = await db.query.members.findMany({
    orderBy: [desc(schema.members.joinedAt)]
  });

  const usersList = await db.query.users.findMany();
  const usersMap = Object.fromEntries(usersList.map(u => [u.id, u]));

  const enrichedMembers = membersList.map(m => ({
    ...m,
    email: m.userId ? usersMap[m.userId]?.email : 'N/A'
  }));

  res.json({ members: enrichedMembers });
});

apiRouter.post('/admin/members/:id/status', async (req, res) => {
  const user = (req as any).user;
  if (!requireStaffUser(req)) return res.status(403).json({ error: 'Unauthorized' });
  const { id } = req.params;
  const { status } = req.body;

  if (!['ACTIVE', 'SUSPENDED'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  await db.update(schema.members).set({ status }).where(eq(schema.members.id, id));
  res.json({ success: true });
});

// Admin Contributions Endpoints
apiRouter.get('/admin/contributions', async (req, res) => {
  const user = (req as any).user;
  if (!requireStaffUser(req)) return res.status(403).json({ error: 'Unauthorized' });

  const obligations = await db.query.contributionObligations.findMany({
    orderBy: [desc(schema.contributionObligations.dueDate)]
  });

  const membersList = await db.query.members.findMany();
  const membersMap = Object.fromEntries(membersList.map(m => [m.id, m]));

  const enrichedObligations = obligations.map(o => ({
    ...o,
    member: membersMap[o.memberId]
  }));

  const ledger = await db.query.ledgerTransactions.findMany({
    orderBy: [desc(schema.ledgerTransactions.date)]
  });

  res.json({ obligations: enrichedObligations, ledger, members: membersList });
});

apiRouter.post('/admin/contributions/record', async (req, res) => {
  const user = (req as any).user;
  if (!requireStaffUser(req)) return res.status(403).json({ error: 'Unauthorized' });

  const { memberId, monthPeriod, amountKobo, description } = req.body;
  const member = await db.query.members.findFirst({ where: eq(schema.members.id, memberId) });
  if (!member) return res.status(404).json({ error: 'Member not found' });

  const now = getUnixTime(new Date());
  const ref = `CONT-ADM-${Math.floor(10000 + Math.random() * 90000)}`;

  // Update total contributions
  await db.update(schema.members)
    .set({ totalContributionsKobo: member.totalContributionsKobo + amountKobo })
    .where(eq(schema.members.id, memberId));

  // Add ledger transaction
  await db.insert(schema.ledgerTransactions).values({
    id: uuidv4(),
    reference: ref,
    type: 'CONTRIBUTION_PAYMENT',
    status: 'COMPLETED',
    description: description || `Manual admin record for ${monthPeriod}`,
    amountKobo,
    date: now
  });

  res.json({ success: true, reference: ref });
});

// Admin Email Outbox Endpoint
apiRouter.get('/admin/outbox', async (req, res) => {
  const user = (req as any).user;
  if (!requireStaffUser(req)) return res.status(403).json({ error: 'Unauthorized' });

  const messages = await db.query.demoEmailOutbox.findMany({
    orderBy: [desc(schema.demoEmailOutbox.sentAt)]
  });

  res.json({ messages });
});

// Member Notifications Endpoint
apiRouter.get('/members/notifications', async (req, res) => {
  const user = (req as any).user;
  const member = (req as any).member;
  if (!user || !member) return res.status(401).json({ error: 'Unauthorized' });

  const announcementsList = await db.query.announcements.findMany({
    orderBy: [desc(schema.announcements.publishedAt)]
  });

  const outboxMessages = await db.query.demoEmailOutbox.findMany({
    where: eq(schema.demoEmailOutbox.recipient, user.email),
    orderBy: [desc(schema.demoEmailOutbox.sentAt)]
  });

  res.json({
    announcements: announcementsList,
    emails: outboxMessages
  });
});

// Profile update endpoints
apiRouter.post('/members/profile/update', async (req, res) => {
  const member = (req as any).member;
  if (!member) return res.status(401).json({ error: 'Unauthorized' });

  const { phoneNumber, firstName, lastName } = req.body;
  await db.update(schema.members).set({
    phoneNumber: phoneNumber || member.phoneNumber,
    firstName: firstName || member.firstName,
    lastName: lastName || member.lastName
  }).where(eq(schema.members.id, member.id));

  res.json({ success: true });
});

apiRouter.post('/admin/profile/update', async (req, res) => {
  const user = (req as any).user;
  if (!requireStaffUser(req)) return res.status(403).json({ error: 'Unauthorized' });

  const { newPassword } = req.body;
  if (newPassword) {
    await db.update(schema.users).set({ passwordHash: newPassword }).where(eq(schema.users.id, user.id));
  }

  res.json({ success: true });
});

// --- Market: cooperative shop for members ---
apiRouter.get('/members/market/products', async (req, res) => {
  const member = (req as any).member;
  if (!member) return res.status(401).json({ error: 'Unauthorized' });

  const products = await db.query.products.findMany({
    where: eq(schema.products.isActive, 1),
    orderBy: [desc(schema.products.createdAt)]
  });

  res.json({ products });
});

apiRouter.post('/members/market/orders', async (req, res) => {
  const member = (req as any).member;
  if (!member) return res.status(401).json({ error: 'Unauthorized' });

  const freshMember = await db.query.members.findFirst({ where: eq(schema.members.id, member.id) });
  if (!freshMember || freshMember.status !== 'ACTIVE') {
    return res.status(403).json({ error: 'Only active members can shop the market' });
  }

  const { items, note } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Cart is empty' });
  }

  // Validate each line against the catalog, snapshot name/price at order time
  const lines = [];
  for (const line of items) {
    const quantity = Math.max(1, Math.floor(Number(line.quantity) || 0));
    const product = await db.query.products.findFirst({ where: eq(schema.products.id, line.productId) });
    if (!product || !product.isActive) return res.status(400).json({ error: 'A product in your cart is no longer available' });
    if (quantity > product.stock) return res.status(400).json({ error: `Only ${product.stock} × ${product.name} in stock` });
    lines.push({ product, quantity });
  }

  const totalKobo = lines.reduce((sum, l) => sum + l.product.priceKobo * l.quantity, 0);
  const itemCount = lines.reduce((sum, l) => sum + l.quantity, 0);

  if (totalKobo > (freshMember.depositBalanceKobo || 0)) {
    return res.status(400).json({ error: 'Insufficient Deposit Balance — top up your wallet first' });
  }

  const now = getUnixTime(new Date());
  const orderId = uuidv4();
  const reference = `ORD-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

  await db.insert(schema.orders).values({
    id: orderId,
    memberId: freshMember.id,
    reference,
    status: 'PLACED',
    totalKobo,
    itemCount,
    note: (note || '').trim().slice(0, 200) || null,
    placedAt: now,
    updatedAt: now,
  });

  for (const l of lines) {
    await db.insert(schema.orderItems).values({
      id: uuidv4(),
      orderId,
      productId: l.product.id,
      productName: l.product.name,
      unitPriceKobo: l.product.priceKobo,
      quantity: l.quantity,
    });
    // Decrement stock
    await db.update(schema.products)
      .set({ stock: l.product.stock - l.quantity, updatedAt: now })
      .where(eq(schema.products.id, l.product.id));
  }

  // Debit member's deposit wallet
  const newBalance = (freshMember.depositBalanceKobo || 0) - totalKobo;
  await db.update(schema.members)
    .set({ depositBalanceKobo: newBalance })
    .where(eq(schema.members.id, freshMember.id));

  await db.insert(schema.ledgerTransactions).values({
    id: uuidv4(),
    reference: `MKT-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
    type: 'MARKET_PURCHASE',
    paymentSource: 'DEPOSIT_WALLET',
    status: 'COMPLETED',
    description: `Market purchase ${reference} (${itemCount} item${itemCount === 1 ? '' : 's'})`,
    amountKobo: totalKobo,
    date: now,
  });

  await db.insert(schema.auditLogs).values({
    id: uuidv4(),
    actorId: freshMember.userId,
    actorRole: 'MEMBER',
    action: 'PLACE_ORDER',
    entityType: 'ORDER',
    entityReference: orderId,
    timestamp: now,
    summary: `Placed market order ${reference} for ₦${(totalKobo / 100).toLocaleString()}`,
  });

  await db.insert(schema.demoEmailOutbox).values({
    id: uuidv4(),
    recipient: (req as any).user.email,
    template: 'ORDER_CONFIRMATION',
    subject: `Order ${reference} confirmed — ${itemCount} item${itemCount === 1 ? '' : 's'}`,
    payload: JSON.stringify({ orderReference: reference, totalKobo, itemCount }),
    sentAt: now,
  });

  res.json({
    success: true,
    order: { id: orderId, reference, status: 'PLACED', totalKobo, itemCount },
    depositBalanceKobo: newBalance,
  });
});

apiRouter.get('/members/market/orders', async (req, res) => {
  const member = (req as any).member;
  if (!member) return res.status(401).json({ error: 'Unauthorized' });

  const orders = await db.query.orders.findMany({
    where: eq(schema.orders.memberId, member.id),
    orderBy: [desc(schema.orders.placedAt)]
  });

  const enriched = await Promise.all(orders.map(async (order) => {
    const items = await db.query.orderItems.findMany({
      where: eq(schema.orderItems.orderId, order.id)
    });
    return { ...order, items };
  }));

  res.json({ orders: enriched });
});

apiRouter.get('/admin/market/products', async (req, res) => {
  if (!requireStaffUser(req)) return res.status(403).json({ error: 'Unauthorized' });

  const products = await db.query.products.findMany({
    orderBy: [desc(schema.products.createdAt)]
  });

  // Units sold per product for the ops view (cancelled orders don't count as sales)
  const allOrders = await db.query.orders.findMany();
  const cancelledOrderIds = new Set(allOrders.filter(o => o.status === 'CANCELLED').map(o => o.id));
  const soldItems = await db.query.orderItems.findMany();
  const soldMap: Record<string, number> = {};
  for (const item of soldItems) {
    if (cancelledOrderIds.has(String(item.orderId))) continue;
    const productId = String(item.productId);
    soldMap[productId] = (soldMap[productId] || 0) + Number(item.quantity);
  }

  res.json({ products: products.map(p => ({ ...p, soldCount: soldMap[p.id] || 0 })) });
});

apiRouter.post('/admin/market/products', async (req, res) => {
  const user = requireStaffUser(req);
  if (!user) return res.status(403).json({ error: 'Unauthorized' });

  const { name, description, category, unit, priceKobo, stock, imageEmoji } = req.body;
  if (!name || !category || !unit || !priceKobo || priceKobo <= 0) {
    return res.status(400).json({ error: 'Name, category, unit and a positive price are required' });
  }

  const now = getUnixTime(new Date());
  const id = uuidv4();
  await db.insert(schema.products).values({
    id,
    name: String(name).trim().slice(0, 120),
    description: String(description || '').trim().slice(0, 300) || null,
    category: String(category).trim().slice(0, 60),
    unit: String(unit).trim().slice(0, 60),
    priceKobo: Math.round(priceKobo),
    stock: Math.max(0, Math.floor(Number(stock) || 0)),
    isActive: 1,
    imageEmoji: String(imageEmoji || '📦').trim().slice(0, 8) || '📦',
    createdAt: now,
    updatedAt: now,
  });

  await db.insert(schema.auditLogs).values({
    id: uuidv4(),
    actorId: user.id,
    actorRole: user.role,
    action: 'CREATE_PRODUCT',
    entityType: 'PRODUCT',
    entityReference: id,
    timestamp: now,
    summary: `Created market product "${name}"`,
  });

  res.json({ success: true, id });
});

apiRouter.put('/admin/market/products/:id', async (req, res) => {
  const user = requireStaffUser(req);
  if (!user) return res.status(403).json({ error: 'Unauthorized' });

  const { id } = req.params;
  const product = await db.query.products.findFirst({ where: eq(schema.products.id, id) });
  if (!product) return res.status(404).json({ error: 'Product not found' });

  const { name, description, category, unit, priceKobo, stock, isActive, imageEmoji } = req.body;
  const now = getUnixTime(new Date());

  await db.update(schema.products).set({
    name: name != null ? String(name).trim().slice(0, 120) : product.name,
    description: description != null ? String(description).trim().slice(0, 300) || null : product.description,
    category: category != null ? String(category).trim().slice(0, 60) : product.category,
    unit: unit != null ? String(unit).trim().slice(0, 60) : product.unit,
    priceKobo: priceKobo != null ? Math.max(1, Math.round(priceKobo)) : product.priceKobo,
    stock: stock != null ? Math.max(0, Math.floor(Number(stock) || 0)) : product.stock,
    isActive: isActive != null ? (isActive ? 1 : 0) : product.isActive,
    imageEmoji: imageEmoji != null ? String(imageEmoji).trim().slice(0, 8) || '📦' : product.imageEmoji,
    updatedAt: now,
  }).where(eq(schema.products.id, id));

  await db.insert(schema.auditLogs).values({
    id: uuidv4(),
    actorId: user.id,
    actorRole: user.role,
    action: 'UPDATE_PRODUCT',
    entityType: 'PRODUCT',
    entityReference: id,
    timestamp: now,
    summary: `Updated market product "${name || product.name}"`,
  });

  res.json({ success: true });
});

apiRouter.get('/admin/market/orders', async (req, res) => {
  if (!requireStaffUser(req)) return res.status(403).json({ error: 'Unauthorized' });

  const orders = await db.query.orders.findMany({
    orderBy: [desc(schema.orders.placedAt)]
  });

  const membersList = await db.query.members.findMany();
  const membersMap = Object.fromEntries(membersList.map(m => [m.id, m]));

  const enriched = await Promise.all(orders.map(async (order) => {
    const items = await db.query.orderItems.findMany({
      where: eq(schema.orderItems.orderId, order.id)
    });
    return { ...order, items, member: membersMap[order.memberId] };
  }));

  res.json({ orders: enriched });
});

apiRouter.post('/admin/market/orders/:id/status', async (req, res) => {
  const user = requireStaffUser(req);
  if (!user) return res.status(403).json({ error: 'Unauthorized' });

  const { id } = req.params;
  const { status } = req.body;
  const VALID = ['PLACED', 'PACKED', 'FULFILLED', 'CANCELLED'];

  const order = await db.query.orders.findFirst({ where: eq(schema.orders.id, id) });
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (!VALID.includes(status)) return res.status(400).json({ error: 'Invalid status' });

  // Lifecycle: PLACED → PACKED → FULFILLED; either non-final stage can be CANCELLED
  if (status === order.status) return res.status(400).json({ error: 'Order is already in that status' });
  if (['FULFILLED', 'CANCELLED'].includes(order.status)) {
    return res.status(400).json({ error: 'Order is already final' });
  }
  if (order.status === 'PACKED' && status !== 'FULFILLED' && status !== 'CANCELLED') {
    return res.status(400).json({ error: 'Packed orders can only be fulfilled or cancelled' });
  }
  if (order.status === 'PLACED' && !['PACKED', 'CANCELLED'].includes(status)) {
    return res.status(400).json({ error: 'Placed orders can only be packed or cancelled' });
  }

  const now = getUnixTime(new Date());

  if (status === 'CANCELLED') {
    // Restore stock and refund the member's deposit wallet
    const items = await db.query.orderItems.findMany({ where: eq(schema.orderItems.orderId, order.id) });
    for (const item of items) {
      const product = await db.query.products.findFirst({ where: eq(schema.products.id, item.productId) });
      if (product) {
        await db.update(schema.products)
          .set({ stock: product.stock + item.quantity, updatedAt: now })
          .where(eq(schema.products.id, item.productId));
      }
    }
    const memberRow = await db.query.members.findFirst({ where: eq(schema.members.id, order.memberId) });
    if (memberRow) {
      const newBalance = (memberRow.depositBalanceKobo || 0) + order.totalKobo;
      await db.update(schema.members)
        .set({ depositBalanceKobo: newBalance })
        .where(eq(schema.members.id, memberRow.id));
    }
    await db.insert(schema.ledgerTransactions).values({
      id: uuidv4(),
      reference: `MKT-REF-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
      type: 'MARKET_REFUND',
      paymentSource: 'DEPOSIT_WALLET',
      status: 'COMPLETED',
      description: `Refund for cancelled order ${order.reference}`,
      amountKobo: order.totalKobo,
      date: now,
    });
  }

  await db.update(schema.orders)
    .set({ status, updatedAt: now })
    .where(eq(schema.orders.id, id));

  await db.insert(schema.auditLogs).values({
    id: uuidv4(),
    actorId: user.id,
    actorRole: user.role,
    action: `ORDER_${status}`,
    entityType: 'ORDER',
    entityReference: id,
    timestamp: now,
    summary: `Order ${order.reference} marked ${status}`,
  });

  res.json({ success: true });
});

apiRouter.get('/admin/funds', async (req, res) => {
  const user = (req as any).user;
  if (!requireStaffUser(req)) return res.status(401).json({ error: 'Unauthorized' });
  
  const requests = await db.query.fundRequests.findMany({
    orderBy: (reqs, { desc }) => [desc(reqs.requestedAt)]
  });

  // Since relation is not in schema.ts, let's fetch members manually
  const membersList = await db.query.members.findMany();
  const membersMap = Object.fromEntries(membersList.map(m => [m.id, m]));

  const enrichedRequests = requests.map(r => ({
    ...r,
    member: membersMap[r.memberId]
  }));

  res.json({ requests: enrichedRequests });
});

apiRouter.post('/admin/funds/:id/:action', async (req, res) => {
  const user = (req as any).user;
  if (!requireStaffUser(req)) return res.status(401).json({ error: 'Unauthorized' });
  const { id, action } = req.params; // action = approve | reject
  
  const request = await db.query.fundRequests.findFirst({ where: eq(schema.fundRequests.id, id) });
  if (!request) return res.status(404).json({ error: 'Not found' });
  if (request.status !== 'PENDING') return res.status(400).json({ error: 'Already processed' });

  const member = await db.query.members.findFirst({ where: eq(schema.members.id, request.memberId) });
  if (!member) return res.status(404).json({ error: 'Member not found' });

  if (action === 'approve') {
    if (request.type === 'WITHDRAWAL' && request.amountKobo > member.totalContributionsKobo) {
      return res.status(400).json({ error: 'Member has insufficient funds' });
    }

    const newBalance = request.type === 'DEPOSIT' 
      ? member.totalContributionsKobo + request.amountKobo 
      : member.totalContributionsKobo - request.amountKobo;

    await db.update(schema.members).set({ totalContributionsKobo: newBalance }).where(eq(schema.members.id, member.id));
    
    await db.insert(schema.ledgerTransactions).values({
      id: uuidv4(),
      reference: `TXN-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`,
      type: request.type === 'DEPOSIT' ? 'CONTRIBUTION_PAYMENT' : 'WITHDRAWAL_PAYMENT',
      status: 'COMPLETED',
      amountKobo: request.amountKobo,
      date: getUnixTime(new Date()),
    });
  }

  await db.update(schema.fundRequests).set({
    status: action === 'approve' ? 'APPROVED' : 'REJECTED',
    processedAt: getUnixTime(new Date()),
    processedBy: user.id
  }).where(eq(schema.fundRequests.id, id));

  res.json({ success: true });
});
