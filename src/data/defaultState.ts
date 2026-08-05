/**
 * Canonical cooperative state for all surfaces (static site + server seed).
 * Money amounts are always integer kobo.
 */

import { sideForType } from '../lib/money';

const PASSWORD = 'seedcoop';

function uid(prefix: string, n: number) {
  return `${prefix}-${String(n).padStart(4, '0')}`;
}

function monthsAgo(n: number) {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return Math.floor(d.getTime() / 1000);
}

function daysFromNow(n: number) {
  return Math.floor(Date.now() / 1000) + n * 86400;
}

function periodOffset(monthDelta: number) {
  const d = new Date();
  d.setMonth(d.getMonth() + monthDelta);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export type CoopState = ReturnType<typeof createDefaultState>;

export function createDefaultState() {
  const t = Math.floor(Date.now() / 1000);
  const period0 = periodOffset(0);
  const period1 = periodOffset(-1);
  const period2 = periodOffset(-2);

  // Stable IDs so links stay consistent after reset
  const adminUserId = uid('user', 1);
  const treasurerUserId = uid('user', 2);
  const opsAdminUserId = uid('user', 3);

  // Staff first (SC-001 Super Admin). Referral code = membership number for everyone.
  const staffMembers = [
    { userId: adminUserId, memberId: uid('mem', 8), num: 'SC-001', first: 'Dan', middle: 'O.', last: 'Segun', email: 'admin@seedcoop.ng', phone: '+2348010000001', months: 36, savings: 72000000, shares: 10000000, residency: 'RESIDENT' as const, role: 'SUPER_ADMIN' as const },
    { userId: treasurerUserId, memberId: uid('mem', 9), num: 'SC-002', first: 'Tunde', middle: 'A.', last: 'Bakare', email: 'treasurer@seedcoop.ng', phone: '+2348010000002', months: 30, savings: 60000000, shares: 8000000, residency: 'RESIDENT' as const, role: 'FINANCIAL_SECRETARY' as const },
    { userId: opsAdminUserId, memberId: uid('mem', 10), num: 'SC-003', first: 'Ola', middle: 'K.', last: 'Dayo', email: 'ops@seedcoop.ng', phone: '+2348010000003', months: 24, savings: 48000000, shares: 6000000, residency: 'RESIDENT' as const, role: 'ADMIN' as const },
  ];

  const m = [
    { userId: uid('user', 11), memberId: uid('mem', 1), num: 'SC-004', first: 'Ada', middle: 'C.', last: 'Okonkwo', email: 'ada.okonkwo@seedcoop.ng', phone: '+2348010000004', months: 18, savings: 36000000, shares: 5000000, residency: 'RESIDENT' as const },
    { userId: uid('user', 12), memberId: uid('mem', 2), num: 'SC-005', first: 'Chidi', middle: 'E.', last: 'Okafor', email: 'chidi.okafor@seedcoop.ng', phone: '+2348010000005', months: 24, savings: 48000000, shares: 6000000, residency: 'RESIDENT' as const },
    { userId: uid('user', 13), memberId: uid('mem', 3), num: 'SC-006', first: 'Temidayo', middle: 'B.', last: 'Adebayo', email: 'temidayo.adebayo@seedcoop.ng', phone: '+2348010000006', months: 8, savings: 8000000, shares: 2000000, residency: 'RESIDENT' as const },
    { userId: uid('user', 14), memberId: uid('mem', 4), num: 'SC-007', first: 'Fatima', middle: 'A.', last: 'Bello', email: 'fatima.bello@seedcoop.ng', phone: '+2348010000007', months: 14, savings: 28000000, shares: 4000000, residency: 'NON_RESIDENT' as const },
    { userId: uid('user', 15), memberId: uid('mem', 5), num: 'SC-008', first: 'Emeka', middle: 'J.', last: 'Nwosu', email: 'emeka.nwosu@seedcoop.ng', phone: '+2348010000008', months: 10, savings: 20000000, shares: 3000000, residency: 'RESIDENT' as const },
    { userId: uid('user', 16), memberId: uid('mem', 6), num: 'SC-009', first: 'Ngozi', middle: 'I.', last: 'Eze', email: 'ngozi.eze@seedcoop.ng', phone: '+2348010000009', months: 12, savings: 24000000, shares: 3500000, residency: 'RESIDENT' as const },
    { userId: uid('user', 17), memberId: uid('mem', 7), num: 'SC-010', first: 'Ibrahim', middle: 'M.', last: 'Yusuf', email: 'ibrahim.yusuf@seedcoop.ng', phone: '+2348010000010', months: 2, savings: 4000000, shares: 0, residency: 'RESIDENT' as const },
  ];

  const users = [
    ...staffMembers.map((s) => ({
      id: s.userId,
      email: s.email,
      passwordHash: PASSWORD,
      role: s.role,
      displayName: `${s.first} ${s.last}`,
      createdAt: monthsAgo(s.months),
      updatedAt: t,
    })),
    ...m.map((x) => ({
      id: x.userId,
      email: x.email,
      passwordHash: PASSWORD,
      role: 'MEMBER',
      displayName: `${x.first} ${x.last}`,
      createdAt: monthsAgo(x.months),
      updatedAt: t,
    })),
  ];

  // Starter deposit-wallet balances (spendable in the member market)
  const walletByMember: Record<string, number> = {
    [uid('mem', 8)]: 12000000, // Dan
    [uid('mem', 9)]: 9000000,  // Tunde
    [uid('mem', 10)]: 7000000, // Ola
    [uid('mem', 1)]: 8300000,  // Ada — after seeded market purchase (10M top-up − 1.7M)
    [uid('mem', 2)]: 8000000,  // Chidi
    [uid('mem', 3)]: 1400000,  // Temidayo — after seeded market purchase
    [uid('mem', 4)]: 6000000,  // Fatima
    [uid('mem', 5)]: 4000000,  // Emeka
    [uid('mem', 6)]: 3000000,  // Ngozi
    [uid('mem', 7)]: 2500000,  // Ibrahim
  };

  const members = [
    ...staffMembers.map((s) => ({
      id: s.memberId,
      userId: s.userId,
      membershipNumber: s.num,
      firstName: s.first,
      middleName: s.middle,
      lastName: s.last,
      phoneNumber: s.phone,
      status: 'ACTIVE',
      residency: s.residency,
      referralCode: s.num, // referral code = member code
      referredByCode: null as string | null,
      totalContributionsKobo: s.savings,
      depositBalanceKobo: walletByMember[s.memberId] ?? 0,
      sharesBalanceKobo: s.shares,
      joinedAt: monthsAgo(s.months),
    })),
    ...m.map((x) => ({
      id: x.memberId,
      userId: x.userId,
      membershipNumber: x.num,
      firstName: x.first,
      middleName: x.middle,
      lastName: x.last,
      phoneNumber: x.phone,
      status: 'ACTIVE',
      residency: x.residency,
      referralCode: x.num, // referral code = member code
      referredByCode: 'SC-001' as string | null,
      totalContributionsKobo: x.savings,
      depositBalanceKobo: walletByMember[x.memberId] ?? 0,
      sharesBalanceKobo: x.shares,
      joinedAt: monthsAgo(x.months),
    })),
  ];

  const monthly = 2000000; // ₦20,000

  // Varied contribution states for current cycle
  const obligations = [
    // SC-001 fully paid this + prior months
    { id: uid('ob', 1), memberId: m[0].memberId, monthPeriod: period0, expectedAmountKobo: monthly, paidAmountKobo: monthly, status: 'PAID', dueDate: daysFromNow(5) },
    { id: uid('ob', 2), memberId: m[0].memberId, monthPeriod: period1, expectedAmountKobo: monthly, paidAmountKobo: monthly, status: 'PAID', dueDate: daysFromNow(-25) },
    // SC-002 partial current
    { id: uid('ob', 3), memberId: m[1].memberId, monthPeriod: period0, expectedAmountKobo: monthly, paidAmountKobo: 1000000, status: 'PARTIAL', dueDate: daysFromNow(5) },
    { id: uid('ob', 4), memberId: m[1].memberId, monthPeriod: period1, expectedAmountKobo: monthly, paidAmountKobo: monthly, status: 'PAID', dueDate: daysFromNow(-25) },
    // SC-003 unpaid / arrears
    { id: uid('ob', 5), memberId: m[2].memberId, monthPeriod: period0, expectedAmountKobo: monthly, paidAmountKobo: 0, status: 'UNPAID', dueDate: daysFromNow(5) },
    { id: uid('ob', 6), memberId: m[2].memberId, monthPeriod: period1, expectedAmountKobo: monthly, paidAmountKobo: 0, status: 'OVERDUE', dueDate: daysFromNow(-25) },
    // SC-004 paid
    { id: uid('ob', 7), memberId: m[3].memberId, monthPeriod: period0, expectedAmountKobo: monthly, paidAmountKobo: monthly, status: 'PAID', dueDate: daysFromNow(5) },
    // SC-005 paid
    { id: uid('ob', 8), memberId: m[4].memberId, monthPeriod: period0, expectedAmountKobo: monthly, paidAmountKobo: monthly, status: 'PAID', dueDate: daysFromNow(5) },
    // SC-006 paid
    { id: uid('ob', 9), memberId: m[5].memberId, monthPeriod: period0, expectedAmountKobo: monthly, paidAmountKobo: monthly, status: 'PAID', dueDate: daysFromNow(5) },
    // SC-007 new — first obligation unpaid
    { id: uid('ob', 10), memberId: m[6].memberId, monthPeriod: period0, expectedAmountKobo: monthly, paidAmountKobo: 0, status: 'UNPAID', dueDate: daysFromNow(5) },
    { id: uid('ob', 11), memberId: m[6].memberId, monthPeriod: period1, expectedAmountKobo: monthly, paidAmountKobo: monthly, status: 'PAID', dueDate: daysFromNow(-20) },
    // Staff members — paid thrift (they're members first)
    { id: uid('ob', 12), memberId: staffMembers[0].memberId, monthPeriod: period0, expectedAmountKobo: monthly, paidAmountKobo: monthly, status: 'PAID', dueDate: daysFromNow(5) },
    { id: uid('ob', 13), memberId: staffMembers[0].memberId, monthPeriod: period1, expectedAmountKobo: monthly, paidAmountKobo: monthly, status: 'PAID', dueDate: daysFromNow(-25) },
    { id: uid('ob', 14), memberId: staffMembers[1].memberId, monthPeriod: period0, expectedAmountKobo: monthly, paidAmountKobo: monthly, status: 'PAID', dueDate: daysFromNow(5) },
    { id: uid('ob', 15), memberId: staffMembers[1].memberId, monthPeriod: period1, expectedAmountKobo: monthly, paidAmountKobo: monthly, status: 'PAID', dueDate: daysFromNow(-25) },
    { id: uid('ob', 16), memberId: staffMembers[2].memberId, monthPeriod: period0, expectedAmountKobo: monthly, paidAmountKobo: monthly, status: 'PAID', dueDate: daysFromNow(5) },
    { id: uid('ob', 17), memberId: staffMembers[2].memberId, monthPeriod: period1, expectedAmountKobo: monthly, paidAmountKobo: monthly, status: 'PAID', dueDate: daysFromNow(-25) },
  ];

  const trialId = uid('prod', 1);
  const normalId = uid('prod', 2);
  const emergencyId = uid('prod', 3);

  const loanProducts = [
    { id: trialId, code: 'TRIAL', name: 'Trial Loan', minAmountKobo: 3000000, maxAmountKobo: 3000000, interestRate: 0.05, maxTermMonths: 3, termOptions: [3], requiredGuarantors: 0 },
    { id: normalId, code: 'NORMAL', name: 'Normal Loan', minAmountKobo: 5000000, maxAmountKobo: 500000000, interestRate: 0.05, maxTermMonths: 12, termOptions: [1, 3, 6, 12], requiredGuarantors: 1 },
    { id: emergencyId, code: 'EMERGENCY', name: 'Emergency Loan', minAmountKobo: 5000000, maxAmountKobo: 500000000, interestRate: 0.07, maxTermMonths: 12, termOptions: [1, 3, 6, 12], requiredGuarantors: 1 },
  ];

  // Completed trial loans for credit-clean members (Chidi, Fatima, Emeka)
  const trialChidiId = uid('loan', 10);
  const trialFatimaId = uid('loan', 11);
  const trialEmekaId = uid('loan', 12);
  // SC-002 active emergency mid-repayment
  const loanChidiId = uid('loan', 1);
  // SC-004 active normal nearly complete
  const loanFatimaId = uid('loan', 2);
  // SC-005 normal pending triple approval (FS step)
  const loanEmekaId = uid('loan', 3);

  const emptyApproval = (step: string) => ({
    step,
    fs: { byUserId: null as string | null, byName: null as string | null, at: null as number | null, note: null as string | null },
    admin: { byUserId: null as string | null, byName: null as string | null, at: null as number | null, note: null as string | null },
    super: { byUserId: null as string | null, byName: null as string | null, at: null as number | null, note: null as string | null },
    rejectReason: null as string | null,
  });

  const loans = [
    {
      id: trialChidiId,
      memberId: m[1].memberId,
      loanProductId: trialId,
      reference: 'LN-2025-1002',
      principalKobo: 3000000,
      interestKobo: 150000,
      totalDueKobo: 3150000,
      paidKobo: 3150000,
      status: 'COMPLETED',
      termMonths: 3,
      appliedAt: monthsAgo(14),
      disbursedAt: monthsAgo(14),
      approval: { ...emptyApproval('APPROVED'), fs: { byUserId: treasurerUserId, byName: 'Tunde Bakare', at: monthsAgo(14), note: null }, admin: { byUserId: opsAdminUserId, byName: 'Ola Dayo', at: monthsAgo(14), note: null }, super: { byUserId: adminUserId, byName: 'Dan Segun', at: monthsAgo(14), note: null } },
    },
    {
      id: trialFatimaId,
      memberId: m[3].memberId,
      loanProductId: trialId,
      reference: 'LN-2025-1004',
      principalKobo: 3000000,
      interestKobo: 150000,
      totalDueKobo: 3150000,
      paidKobo: 3150000,
      status: 'COMPLETED',
      termMonths: 3,
      appliedAt: monthsAgo(16),
      disbursedAt: monthsAgo(16),
      approval: { ...emptyApproval('APPROVED'), fs: { byUserId: treasurerUserId, byName: 'Tunde Bakare', at: monthsAgo(16), note: null }, admin: { byUserId: opsAdminUserId, byName: 'Ola Dayo', at: monthsAgo(16), note: null }, super: { byUserId: adminUserId, byName: 'Dan Segun', at: monthsAgo(16), note: null } },
    },
    {
      id: trialEmekaId,
      memberId: m[4].memberId,
      loanProductId: trialId,
      reference: 'LN-2025-1005',
      principalKobo: 3000000,
      interestKobo: 150000,
      totalDueKobo: 3150000,
      paidKobo: 3150000,
      status: 'COMPLETED',
      termMonths: 3,
      appliedAt: monthsAgo(8),
      disbursedAt: monthsAgo(8),
      approval: { ...emptyApproval('APPROVED'), fs: { byUserId: treasurerUserId, byName: 'Tunde Bakare', at: monthsAgo(8), note: null }, admin: { byUserId: opsAdminUserId, byName: 'Ola Dayo', at: monthsAgo(8), note: null }, super: { byUserId: adminUserId, byName: 'Dan Segun', at: monthsAgo(8), note: null } },
    },
    {
      id: loanChidiId,
      memberId: m[1].memberId,
      loanProductId: emergencyId,
      reference: 'LN-2026-2002',
      principalKobo: 20000000,
      interestKobo: 1400000,
      totalDueKobo: 21400000,
      paidKobo: 7000000,
      status: 'ACTIVE',
      termMonths: 6,
      appliedAt: monthsAgo(4),
      disbursedAt: monthsAgo(3),
      approval: { ...emptyApproval('APPROVED'), fs: { byUserId: treasurerUserId, byName: 'Tunde Bakare', at: monthsAgo(4), note: null }, admin: { byUserId: opsAdminUserId, byName: 'Ola Dayo', at: monthsAgo(4), note: null }, super: { byUserId: adminUserId, byName: 'Dan Segun', at: monthsAgo(3), note: 'Disbursed' } },
    },
    {
      id: loanFatimaId,
      memberId: m[3].memberId,
      loanProductId: normalId,
      reference: 'LN-2026-2004',
      principalKobo: 30000000,
      interestKobo: 1500000,
      totalDueKobo: 31500000,
      paidKobo: 28000000,
      status: 'ACTIVE',
      termMonths: 12,
      appliedAt: monthsAgo(10),
      disbursedAt: monthsAgo(9),
      approval: { ...emptyApproval('APPROVED'), fs: { byUserId: treasurerUserId, byName: 'Tunde Bakare', at: monthsAgo(10), note: null }, admin: { byUserId: opsAdminUserId, byName: 'Ola Dayo', at: monthsAgo(10), note: null }, super: { byUserId: adminUserId, byName: 'Dan Segun', at: monthsAgo(9), note: null } },
    },
    {
      id: loanEmekaId,
      memberId: m[4].memberId,
      loanProductId: normalId,
      reference: 'LN-2026-2005',
      principalKobo: 15000000,
      interestKobo: 750000,
      totalDueKobo: 15750000,
      paidKobo: 0,
      status: 'PENDING_FS',
      termMonths: 6,
      appliedAt: monthsAgo(0),
      disbursedAt: null as number | null,
      approval: emptyApproval('PENDING_FS'),
    },
  ];

  const guarantorRequests = [
    { id: uid('g', 1), loanId: loanChidiId, guarantorMemberId: m[0].memberId, status: 'ACCEPTED', comment: null, requestedAt: monthsAgo(4) },
    { id: uid('g', 2), loanId: loanFatimaId, guarantorMemberId: m[1].memberId, status: 'ACCEPTED', comment: null, requestedAt: monthsAgo(10) },
    { id: uid('g', 3), loanId: loanEmekaId, guarantorMemberId: m[0].memberId, status: 'ACCEPTED', comment: null, requestedAt: monthsAgo(0) },
  ];

  // Member market — coop shop (stock reflects the seeded orders below)
  const marketProducts = [
    { id: uid('mkt', 1), name: 'Improved Maize Seed', description: 'High-yield, drought-tolerant improved maize seed.', category: 'Seeds', unit: '10kg bag', priceKobo: 850000, stock: 38, isActive: 1, imageEmoji: '🌽', createdAt: monthsAgo(6), updatedAt: monthsAgo(6) },
    { id: uid('mkt', 2), name: 'Rice Seed (FARO 44)', description: 'Certified FARO 44 paddy rice seed for wetland planting.', category: 'Seeds', unit: '25kg bag', priceKobo: 1800000, stock: 25, isActive: 1, imageEmoji: '🌾', createdAt: monthsAgo(6), updatedAt: monthsAgo(6) },
    { id: uid('mkt', 3), name: 'NPK Fertilizer 20-10-10', description: 'Blended compound fertilizer for maize and rice.', category: 'Inputs', unit: '50kg bag', priceKobo: 3200000, stock: 30, isActive: 1, imageEmoji: '🧪', createdAt: monthsAgo(6), updatedAt: monthsAgo(6) },
    { id: uid('mkt', 4), name: 'Poultry Feed (Layer)', description: 'Balanced layer mash, bulk-bought by the cooperative.', category: 'Animal Feed', unit: '25kg bag', priceKobo: 1250000, stock: 20, isActive: 1, imageEmoji: '🐔', createdAt: monthsAgo(6), updatedAt: monthsAgo(6) },
    { id: uid('mkt', 5), name: 'Organic Manure', description: 'Composted organic manure for vegetable plots.', category: 'Inputs', unit: '20kg bag', priceKobo: 600000, stock: 49, isActive: 1, imageEmoji: '🌱', createdAt: monthsAgo(6), updatedAt: monthsAgo(6) },
    { id: uid('mkt', 6), name: 'Maize Grains (Pooled Harvest)', description: 'Cooperative pooled harvest, available to members first.', category: 'Harvest', unit: '100kg bag', priceKobo: 4500000, stock: 15, isActive: 1, imageEmoji: '🌽', createdAt: monthsAgo(6), updatedAt: monthsAgo(6) },
  ];

  // Seeded orders so staff and member portals open with live-looking market activity
  const orders = [
    {
      id: uid('ord', 1),
      memberId: m[0].memberId, // Ada SC-001
      reference: 'ORD-2026-1001',
      status: 'FULFILLED',
      totalKobo: 1700000,
      itemCount: 2,
      note: 'Wet season maize planting',
      placedAt: monthsAgo(1),
      updatedAt: daysFromNow(-20),
    },
    {
      id: uid('ord', 2),
      memberId: m[2].memberId, // Temidayo SC-003
      reference: 'ORD-2026-1002',
      status: 'PLACED',
      totalKobo: 600000,
      itemCount: 1,
      note: null as string | null,
      placedAt: daysFromNow(-1),
      updatedAt: daysFromNow(-1),
    },
  ];

  const orderItems = [
    { id: uid('oi', 1), orderId: uid('ord', 1), productId: uid('mkt', 1), productName: 'Improved Maize Seed', unitPriceKobo: 850000, quantity: 2 },
    { id: uid('oi', 2), orderId: uid('ord', 2), productId: uid('mkt', 5), productName: 'Organic Manure', unitPriceKobo: 600000, quantity: 1 },
  ];

  // SC-006 completed deposit-wallet withdrawal (instant — no staff approval)
  const fundRequests = [
    {
      id: uid('fund', 1),
      memberId: m[5].memberId,
      reference: 'WDL-2026-6001',
      type: 'WITHDRAWAL',
      amountKobo: 5000000,
      status: 'COMPLETED',
      requestedAt: daysFromNow(-2),
      processedAt: daysFromNow(-2),
      processedBy: null as string | null,
      notes: 'Bank: GTBank | Acct: 0123456789',
    },
    {
      id: uid('fund', 2),
      memberId: m[0].memberId,
      reference: 'DEP-2026-1001',
      type: 'DEPOSIT',
      amountKobo: 10000000,
      status: 'APPROVED',
      requestedAt: monthsAgo(2),
      processedAt: monthsAgo(2),
      processedBy: treasurerUserId,
      notes: 'Deposit wallet top-up',
    },
  ];

  // Adjust Ngozi wallet for seeded withdrawal (3M start − 50k withdrawal)
  // wallet seed already set; leave as-is for demo

  const applications = [
    {
      id: uid('app', 1),
      reference: 'APP-2026-3010',
      userId: null as string | null,
      firstName: 'Blessing',
      middleName: 'O.',
      lastName: 'Adeyemi',
      email: 'blessing.adeyemi@email.com',
      phoneNumber: '+2348099001122',
      referralCodeUsed: 'SC-001',
      status: 'PENDING_APPROVAL',
      regFeeDueAt: daysFromNow(4),
      regFeePaidAt: daysFromNow(-2),
      regFeePaymentRef: 'REG-2026-3010',
      kym: {
        legalName: 'Blessing O. Adeyemi',
        idType: 'NATIONAL_ID',
        idNumber: '12345678901',
        occupation: 'Civil servant',
        employer: 'Lagos State Civil Service',
        salaryRange: '1M_3M',
        nextOfKinName: 'Tolu Adeyemi',
        nextOfKinPhone: '+2348099001133',
        nextOfKinRelationship: 'Spouse',
        address: '14 Admiralty Way, Lekki, Lagos',
        residency: 'RESIDENT',
        documentName: 'national-id.pdf',
      },
      reviewNotes: null as string | null,
      submittedAt: daysFromNow(-3),
      submittedForApprovalAt: daysFromNow(-1),
    },
    {
      id: uid('app', 2),
      reference: 'APP-2026-3011',
      userId: null as string | null,
      firstName: 'Kemi',
      middleName: 'A.',
      lastName: 'Balogun',
      email: 'kemi.balogun@email.com',
      phoneNumber: '+2348088112233',
      referralCodeUsed: 'SC-004',
      status: 'AWAITING_KYM',
      regFeeDueAt: daysFromNow(5),
      regFeePaidAt: daysFromNow(-1),
      regFeePaymentRef: 'REG-2026-3011',
      kym: null as any,
      reviewNotes: null as string | null,
      submittedAt: daysFromNow(-1),
      submittedForApprovalAt: null as number | null,
    },
  ];

  const feeYear = new Date().getFullYear();
  const mar31 = Math.floor(new Date(feeYear, 2, 31, 23, 59, 59).getTime() / 1000);
  const developmentFees = [
    ...m.map((x, i) => ({
      id: uid('dfee', i + 1),
      memberId: x.memberId,
      year: feeYear,
      amountKobo: x.residency === 'NON_RESIDENT' ? 1200000 : 600000,
      status: i === 2 ? 'UNPAID' : 'PAID', // Temidayo unpaid
      dueAt: mar31,
      paidAt: i === 2 ? null as number | null : monthsAgo(2),
    })),
    ...staffMembers.map((s, i) => ({
      id: uid('dfee', 20 + i),
      memberId: s.memberId,
      year: feeYear,
      amountKobo: 600000,
      status: 'PAID',
      dueAt: mar31,
      paidAt: monthsAgo(3),
    })),
  ];

  function ledgerRow(
    id: string,
    reference: string,
    type: string,
    amountKobo: number,
    date: number,
    description: string,
    memberId: string | null,
  ) {
    return {
      id,
      reference,
      type,
      status: 'COMPLETED',
      description,
      amountKobo,
      date,
      memberId,
      side: sideForType(type),
    };
  }

  const ledger = [
    ledgerRow(uid('tx', 1), 'PAY-2026-1101', 'CONTRIBUTION_PAYMENT', monthly, monthsAgo(1), `Monthly savings ${period1} — SC-004`, m[0].memberId),
    ledgerRow(uid('tx', 2), 'PAY-2026-1102', 'CONTRIBUTION_PAYMENT', monthly, monthsAgo(1), `Monthly savings ${period1} — SC-005`, m[1].memberId),
    ledgerRow(uid('tx', 3), 'DEP-2026-1001', 'DEPOSIT', 10000000, monthsAgo(2), 'Deposit wallet top-up — SC-004', m[0].memberId),
    ledgerRow(uid('tx', 4), 'DISB-2026-2002', 'LOAN_DISBURSEMENT', 20000000, monthsAgo(3), 'Emergency loan disbursement — SC-005', m[1].memberId),
    ledgerRow(uid('tx', 5), 'REP-2026-2201', 'LOAN_REPAYMENT', 3500000, monthsAgo(2), 'Loan repayment LN-2026-2002 — SC-005', m[1].memberId),
    ledgerRow(uid('tx', 6), 'REP-2026-2202', 'LOAN_REPAYMENT', 3500000, monthsAgo(1), 'Loan repayment LN-2026-2002 — SC-005', m[1].memberId),
    ledgerRow(uid('tx', 7), 'DISB-2026-2004', 'LOAN_DISBURSEMENT', 30000000, monthsAgo(9), 'Normal loan disbursement — SC-007', m[3].memberId),
    ledgerRow(uid('tx', 15), 'WDL-2026-6001', 'DEPOSIT_WITHDRAWAL', 5000000, daysFromNow(-2), 'Deposit wallet withdrawal — SC-009', m[5].memberId),
    ledgerRow(uid('tx', 16), 'SHR-2026-0001', 'DEPOSIT_TO_SHARES', 5000000, monthsAgo(12), 'Share capital purchase — SC-004', m[0].memberId),
    ledgerRow(uid('tx', 8), 'REP-2026-2401', 'LOAN_REPAYMENT', 28000000, monthsAgo(1), 'Loan repayments (cumulative) — SC-007', m[3].memberId),
    ledgerRow(uid('tx', 9), 'PAY-2026-1107', 'CONTRIBUTION_PAYMENT', monthly, monthsAgo(1), `Monthly savings ${period1} — SC-010`, m[6].memberId),
    ledgerRow(uid('tx', 10), 'INV-2026-0101', 'INVESTMENT_PURCHASE', 50000000, monthsAgo(6), 'Treasury bill placement — FGN 91-day', null),
    ledgerRow(uid('tx', 11), 'INV-2026-0102', 'INVESTMENT_RETURN', 2500000, monthsAgo(3), 'Investment return — FGN 91-day', null),
    ledgerRow(uid('tx', 12), 'DIV-2025-0001', 'DIVIDEND_PAYOUT', 7000000, monthsAgo(4), '2025 surplus dividend allocation', null),
    ledgerRow(uid('tx', 13), 'MKT-2026-1001', 'MARKET_PURCHASE', 1700000, monthsAgo(1), 'Market purchase ORD-2026-1001 (2 items) — SC-004', m[0].memberId),
    ledgerRow(uid('tx', 14), 'MKT-2026-1002', 'MARKET_PURCHASE', 600000, daysFromNow(-1), 'Market purchase ORD-2026-1002 (1 item) — SC-006', m[2].memberId),
  ];

  const investments = [
    {
      id: uid('inv', 1),
      name: 'FGN Treasury Bill (91-day)',
      category: 'Fixed Income',
      principalKobo: 50000000,
      currentValueKobo: 52500000,
      expectedReturnRate: 0.05,
      status: 'ACTIVE',
      acquiredAt: monthsAgo(6),
      notes: 'Rolled once; coupon booked as investment return',
    },
    {
      id: uid('inv', 2),
      name: 'Co-op Agro Input Pool',
      category: 'Agriculture',
      principalKobo: 30000000,
      currentValueKobo: 31800000,
      expectedReturnRate: 0.12,
      status: 'ACTIVE',
      acquiredAt: monthsAgo(8),
      notes: 'Seasonal farm input financing with partner growers',
    },
    {
      id: uid('inv', 3),
      name: 'Commercial Paper — ABC Plc',
      category: 'Money Market',
      principalKobo: 20000000,
      currentValueKobo: 20000000,
      expectedReturnRate: 0.08,
      status: 'MATURED',
      acquiredAt: monthsAgo(14),
      notes: 'Matured and returned to co-op pool',
    },
  ];

  const dividendPeriods = [
    {
      id: uid('divp', 1),
      label: '2025 Financial Year Surplus',
      surplusKobo: 7000000,
      status: 'DISTRIBUTED',
      declaredAt: monthsAgo(4),
      distributedAt: monthsAgo(4),
      notes: 'Board-approved dividend from surplus, weighted by share capital',
      approval: { ...emptyApproval('APPROVED'), fs: { byUserId: treasurerUserId, byName: 'Tunde Bakare', at: monthsAgo(4), note: null }, admin: { byUserId: opsAdminUserId, byName: 'Ola Dayo', at: monthsAgo(4), note: null }, super: { byUserId: adminUserId, byName: 'Dan Segun', at: monthsAgo(4), note: null } },
    },
    {
      id: uid('divp', 2),
      label: '2026 Mid-Year Provisional',
      surplusKobo: 4500000,
      status: 'DECLARED',
      declaredAt: monthsAgo(0),
      distributedAt: null as number | null,
      notes: 'Awaiting triple approval then share-weighted distribution to deposit wallets',
      approval: emptyApproval('PENDING_FS'),
    },
  ];

  // 2025 dividend allocated pro-rata by savings at distribution time (simplified equal-ish weights)
  const dividendAllocations = [
    { id: uid('diva', 1), periodId: uid('divp', 1), memberId: m[0].memberId, amountKobo: 1500000, status: 'PAID', paidAt: monthsAgo(4) },
    { id: uid('diva', 2), periodId: uid('divp', 1), memberId: m[1].memberId, amountKobo: 1800000, status: 'PAID', paidAt: monthsAgo(4) },
    { id: uid('diva', 3), periodId: uid('divp', 1), memberId: m[2].memberId, amountKobo: 400000, status: 'PAID', paidAt: monthsAgo(4) },
    { id: uid('diva', 4), periodId: uid('divp', 1), memberId: m[3].memberId, amountKobo: 1200000, status: 'PAID', paidAt: monthsAgo(4) },
    { id: uid('diva', 5), periodId: uid('divp', 1), memberId: m[4].memberId, amountKobo: 900000, status: 'PAID', paidAt: monthsAgo(4) },
    { id: uid('diva', 6), periodId: uid('divp', 1), memberId: m[5].memberId, amountKobo: 1000000, status: 'PAID', paidAt: monthsAgo(4) },
    { id: uid('diva', 7), periodId: uid('divp', 1), memberId: m[6].memberId, amountKobo: 200000, status: 'PAID', paidAt: monthsAgo(4) },
  ];

  // Note: dividends already paid should be reflected in member savings for those who received them —
  // seed savings already include historical net positions; we don't double-add.

  const announcements = [
    {
      id: uid('ann', 1),
      title: 'Annual General Meeting',
      content: 'The AGM will hold on the 15th of next month at 10:00 AM. All active members are expected to attend. Dividend ratification is on the agenda.',
      audience: 'MEMBER',
      publishedAt: monthsAgo(1),
    },
    {
      id: uid('ann', 2),
      title: 'Contribution due date reminder',
      content: 'Monthly thrift contributions are due by the 25th of each month. Members with arrears should regularise to remain loan-eligible.',
      audience: 'MEMBER',
      publishedAt: daysFromNow(-5),
    },
    {
      id: uid('ann', 3),
      title: 'Welcome to SeedCoop',
      content: 'SeedCoop is a member-owned thrift and credit cooperative. Join to save, access fair credit, and share in collective growth.',
      audience: 'PUBLIC',
      publishedAt: monthsAgo(6),
    },
  ];

  const outbox = [
    {
      id: uid('mail', 1),
      recipient: m[0].email,
      template: 'WELCOME',
      subject: 'Welcome to SeedCoop — membership confirmed',
      payload: JSON.stringify({ name: 'Ada Okonkwo', membershipNumber: 'SC-004' }),
      body: 'Dear Ada, your membership SC-004 is active. Monthly savings is ₦20,000.',
      sentAt: monthsAgo(18),
    },
    {
      id: uid('mail', 2),
      recipient: m[1].email,
      template: 'LOAN_DISBURSED',
      subject: 'Loan LN-2026-2002 disbursed',
      payload: JSON.stringify({ reference: 'LN-2026-2002', amountKobo: 20000000 }),
      body: 'Dear Chidi, ₦200,000.00 has been disbursed for Emergency Loan LN-2026-2002.',
      sentAt: monthsAgo(3),
    },
    {
      id: uid('mail', 3),
      recipient: m[2].email,
      template: 'CONTRIBUTION_REMINDER',
      subject: 'Contribution reminder — outstanding dues',
      payload: JSON.stringify({ amountKobo: 4000000, periods: [period0, period1] }),
      body: 'Dear Temidayo, you have outstanding thrift obligations. Please pay to restore full standing.',
      sentAt: daysFromNow(-2),
    },
    {
      id: uid('mail', 4),
      recipient: m[4].email,
      template: 'LOAN_RECEIVED',
      subject: 'Loan application LN-2026-2005 received',
      payload: JSON.stringify({ reference: 'LN-2026-2005', amountKobo: 15000000 }),
      body: 'Dear Emeka, your loan application is under review by the cooperative board.',
      sentAt: daysFromNow(-1),
    },
    {
      id: uid('mail', 5),
      recipient: m[5].email,
      template: 'WITHDRAWAL_COMPLETED',
      subject: 'Withdrawal WDL-2026-6001 completed',
      payload: JSON.stringify({ reference: 'WDL-2026-6001', amountKobo: 5000000 }),
      body: 'Dear Ngozi, ₦50,000.00 has been withdrawn from your deposit wallet. Ref: WDL-2026-6001.',
      sentAt: daysFromNow(-2),
    },
    {
      id: uid('mail', 6),
      recipient: m[0].email,
      template: 'DIVIDEND_PAID',
      subject: '2025 surplus dividend credited',
      payload: JSON.stringify({ amountKobo: 1500000, period: '2025 Financial Year Surplus' }),
      body: 'Dear Ada, your dividend of ₦15,000.00 has been credited to your deposit wallet.',
      sentAt: monthsAgo(4),
    },
    {
      id: uid('mail', 7),
      recipient: 'blessing.adeyemi@email.com',
      template: 'APPLICATION_RECEIVED',
      subject: 'Membership application APP-2026-3010 received',
      payload: JSON.stringify({ reference: 'APP-2026-3010' }),
      body: 'Dear Blessing, registration fee received. Complete KYM and await board approval after background checks.',
      sentAt: daysFromNow(-3),
    },
  ];

  const auditLogs = [
    {
      id: uid('aud', 1),
      actorId: adminUserId,
      actorRole: 'SUPER_ADMIN',
      action: 'SYSTEM_INIT',
      entityType: 'COOPERATIVE',
      entityReference: 'SEEDCOOP',
      timestamp: monthsAgo(24),
      summary: 'Cooperative platform initialised',
    },
  ];

  return {
    password: PASSWORD,
    /** Cooperative-wide rules (admin-editable) */
    settings: {
      monthlySavingsKobo: monthly, // ₦20,000 — used for new monthly obligations
      loanThriftMultiplier: 2,
    },
    users,
    members,
    applications,
    obligations,
    ledger,
    loanProducts,
    loans,
    guarantorRequests,
    marketProducts,
    orders,
    orderItems,
    fundRequests,
    developmentFees,
    investments,
    dividendPeriods,
    dividendAllocations,
    announcements,
    outbox,
    auditLogs,
    /** Directory for login UI */
    // Personas rebuilt live in mockApi; seed keeps a snapshot for reference
    personas: {
      staff: [
        { email: 'admin@seedcoop.ng', role: 'SUPER_ADMIN', label: 'Dan Segun', subtitle: 'Super Admin', portal: 'ADMIN' as const, membershipNumber: 'SC-001', tagline: 'Staff · also member SC-001 · referral SC-001' },
        { email: 'ops@seedcoop.ng', role: 'ADMIN', label: 'Ola Dayo', subtitle: 'Admin', portal: 'ADMIN' as const, membershipNumber: 'SC-003', tagline: 'Staff · also member SC-003 · switch portals anytime' },
        { email: 'treasurer@seedcoop.ng', role: 'FINANCIAL_SECRETARY', label: 'Tunde Bakare', subtitle: 'Financial Secretary', portal: 'ADMIN' as const, membershipNumber: 'SC-002', tagline: 'Staff · also member SC-002 · switch portals anytime' },
      ],
      members: m.map((x) => ({
        email: x.email,
        role: 'MEMBER',
        label: `${x.first} ${x.last}`,
        subtitle: x.num,
        portal: 'MEMBER' as const,
        membershipNumber: x.num,
        tagline: memberTagline(x.num),
      })),
    },
  };
}

function memberTagline(num: string): string {
  switch (num) {
    case 'SC-001': return 'Super Admin · Strong thrift · Referral code SC-001';
    case 'SC-002': return 'Financial Secretary · Strong thrift';
    case 'SC-003': return 'Admin · Strong thrift';
    case 'SC-004': return 'Fully paid · Strong thrift · Shares met · No active loan';
    case 'SC-005': return 'Partial dues · Active emergency loan · Trial clean';
    case 'SC-006': return 'Arrears · Loan restricted · Dev fee unpaid';
    case 'SC-007': return 'Normal loan nearly complete · Non-resident';
    case 'SC-008': return 'Normal loan awaiting FS approval';
    case 'SC-009': return 'Recent deposit withdrawal';
    case 'SC-010': return 'New member · Needs minimum shares · Trial available';
    default: return 'Active member';
  }
}

export const DEFAULT_PASSWORD = PASSWORD;
