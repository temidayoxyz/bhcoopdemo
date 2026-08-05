import { db } from './db';
import { sql } from 'drizzle-orm';
import * as schema from './schema';
import { v4 as uuidv4 } from 'uuid';
import { subMonths, getUnixTime } from 'date-fns';

export async function initDb() {
  try {
    await db.run(sql`CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );`);

    await db.run(sql`CREATE TABLE IF NOT EXISTS members (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE,
      membership_number TEXT NOT NULL UNIQUE,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      phone_number TEXT NOT NULL,
      status TEXT NOT NULL,
      total_contributions_kobo INTEGER NOT NULL DEFAULT 0,
      deposit_balance_kobo INTEGER NOT NULL DEFAULT 0,
      shares_balance_kobo INTEGER NOT NULL DEFAULT 0,
      joined_at INTEGER NOT NULL
    );`);

    try {
      await db.run(sql`ALTER TABLE members ADD COLUMN deposit_balance_kobo INTEGER NOT NULL DEFAULT 0;`);
    } catch (e) {}

    try {
      await db.run(sql`ALTER TABLE members ADD COLUMN shares_balance_kobo INTEGER NOT NULL DEFAULT 0;`);
    } catch (e) {}

    await db.run(sql`CREATE TABLE IF NOT EXISTS membership_applications (
      id TEXT PRIMARY KEY,
      reference TEXT NOT NULL UNIQUE,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone_number TEXT NOT NULL,
      employment TEXT NOT NULL,
      status TEXT NOT NULL,
      review_notes TEXT,
      submitted_at INTEGER NOT NULL
    );`);

    await db.run(sql`CREATE TABLE IF NOT EXISTS contribution_obligations (
      id TEXT PRIMARY KEY,
      member_id TEXT NOT NULL,
      month_period TEXT NOT NULL,
      expected_amount_kobo INTEGER NOT NULL,
      paid_amount_kobo INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL,
      due_date INTEGER NOT NULL
    );`);

    await db.run(sql`CREATE TABLE IF NOT EXISTS ledger_transactions (
      id TEXT PRIMARY KEY,
      reference TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL,
      payment_source TEXT,
      status TEXT NOT NULL,
      description TEXT,
      amount_kobo INTEGER NOT NULL,
      date INTEGER NOT NULL
    );`);

    try {
      await db.run(sql`ALTER TABLE ledger_transactions ADD COLUMN payment_source TEXT;`);
    } catch (e) {}

    await db.run(sql`CREATE TABLE IF NOT EXISTS loan_products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      min_amount_kobo INTEGER NOT NULL,
      max_amount_kobo INTEGER NOT NULL,
      interest_rate REAL NOT NULL,
      max_term_months INTEGER NOT NULL,
      required_guarantors INTEGER NOT NULL
    );`);

    await db.run(sql`CREATE TABLE IF NOT EXISTS loans (
      id TEXT PRIMARY KEY,
      member_id TEXT NOT NULL,
      loan_product_id TEXT NOT NULL,
      reference TEXT NOT NULL UNIQUE,
      principal_kobo INTEGER NOT NULL,
      interest_kobo INTEGER NOT NULL,
      total_due_kobo INTEGER NOT NULL,
      paid_kobo INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL,
      term_months INTEGER NOT NULL,
      applied_at INTEGER NOT NULL,
      disbursed_at INTEGER
    );`);

    await db.run(sql`CREATE TABLE IF NOT EXISTS guarantor_requests (
      id TEXT PRIMARY KEY,
      loan_id TEXT NOT NULL,
      guarantor_member_id TEXT NOT NULL,
      status TEXT NOT NULL,
      comment TEXT,
      requested_at INTEGER NOT NULL
    );`);

    await db.run(sql`CREATE TABLE IF NOT EXISTS repayment_schedules (
      id TEXT PRIMARY KEY,
      loan_id TEXT NOT NULL,
      due_date INTEGER NOT NULL,
      expected_amount_kobo INTEGER NOT NULL,
      paid_amount_kobo INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL
    );`);

    await db.run(sql`CREATE TABLE IF NOT EXISTS demo_email_outbox (
      id TEXT PRIMARY KEY,
      recipient TEXT NOT NULL,
      template TEXT NOT NULL,
      subject TEXT NOT NULL,
      payload TEXT NOT NULL,
      sent_at INTEGER NOT NULL
    );`);

    await db.run(sql`CREATE TABLE IF NOT EXISTS announcements (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      audience TEXT NOT NULL,
      published_at INTEGER NOT NULL
    );`);

    await db.run(sql`CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      actor_id TEXT,
      actor_role TEXT,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_reference TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      summary TEXT NOT NULL
    );`);

    await db.run(sql`CREATE TABLE IF NOT EXISTS fund_requests (
      id TEXT PRIMARY KEY,
      member_id TEXT NOT NULL,
      reference TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL,
      amount_kobo INTEGER NOT NULL,
      status TEXT NOT NULL,
      requested_at INTEGER NOT NULL,
      processed_at INTEGER,
      processed_by TEXT,
      notes TEXT
    );`);

    await db.run(sql`CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL,
      unit TEXT NOT NULL,
      price_kobo INTEGER NOT NULL,
      stock INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      image_emoji TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );`);

    await db.run(sql`CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      member_id TEXT NOT NULL,
      reference TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL,
      total_kobo INTEGER NOT NULL,
      item_count INTEGER NOT NULL,
      note TEXT,
      placed_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );`);

    await db.run(sql`CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      product_name TEXT NOT NULL,
      unit_price_kobo INTEGER NOT NULL,
      quantity INTEGER NOT NULL
    );`);

    // Check if seeded
    const existingUsers = await db.query.users.findMany();
    if (existingUsers.length === 0) {
      await seedDefaultData();
    }
  } catch (err) {
    console.error('Database initialization error:', err);
  }
}

/** Wipe all rows and restore the demo opening state (used by the login page reset button). */
export async function resetDatabase() {
  await db.delete(schema.orderItems);
  await db.delete(schema.orders);
  await db.delete(schema.products);
  await db.delete(schema.auditLogs);
  await db.delete(schema.announcements);
  await db.delete(schema.demoEmailOutbox);
  await db.delete(schema.repaymentSchedules);
  await db.delete(schema.guarantorRequests);
  await db.delete(schema.loans);
  await db.delete(schema.loanProducts);
  await db.delete(schema.ledgerTransactions);
  await db.delete(schema.contributionObligations);
  await db.delete(schema.membershipApplications);
  await db.delete(schema.members);
  await db.delete(schema.users);
  await seedDefaultData();
}

export async function seedDefaultData() {
  const now = getUnixTime(new Date());

  const adminId = uuidv4();
  const treasurerId = uuidv4();
  const opsAdminId = uuidv4();
  const demoPassword = 'blessedhands';

  await db.insert(schema.users).values([
    { id: adminId, email: 'admin@blessedhands.ng', passwordHash: demoPassword, role: 'SUPER_ADMIN', createdAt: now, updatedAt: now },
    { id: treasurerId, email: 'treasurer@blessedhands.ng', passwordHash: demoPassword, role: 'FINANCIAL_SECRETARY', createdAt: now, updatedAt: now },
    { id: opsAdminId, email: 'ops@blessedhands.ng', passwordHash: demoPassword, role: 'ADMIN', createdAt: now, updatedAt: now },
  ]);

  const adaUserId = uuidv4();
  const chidiUserId = uuidv4();
  const temidayoUserId = uuidv4();

  await db.insert(schema.users).values([
    { id: adaUserId, email: 'ada.okonkwo@blessedhands.ng', passwordHash: demoPassword, role: 'MEMBER', createdAt: now, updatedAt: now },
    { id: chidiUserId, email: 'chidi.okafor@blessedhands.ng', passwordHash: demoPassword, role: 'MEMBER', createdAt: now, updatedAt: now },
    { id: temidayoUserId, email: 'temidayo.adebayo@blessedhands.ng', passwordHash: demoPassword, role: 'MEMBER', createdAt: now, updatedAt: now },
  ]);

  const adaMemberId = uuidv4();
  const chidiMemberId = uuidv4();
  const temidayoMemberId = uuidv4();

  // Staff dual-identity member profiles + pure members (BH-001… membership numbers)
  await db.insert(schema.members).values([
    {
      id: uuidv4(), userId: adminId, membershipNumber: 'BH-001', firstName: 'Dan', lastName: 'Segun', phoneNumber: '+2348010000001',
      status: 'ACTIVE', totalContributionsKobo: 72000000, joinedAt: getUnixTime(subMonths(new Date(now * 1000), 36))
    },
    {
      id: uuidv4(), userId: treasurerId, membershipNumber: 'BH-002', firstName: 'Tunde', lastName: 'Bakare', phoneNumber: '+2348010000002',
      status: 'ACTIVE', totalContributionsKobo: 60000000, joinedAt: getUnixTime(subMonths(new Date(now * 1000), 30))
    },
    {
      id: uuidv4(), userId: opsAdminId, membershipNumber: 'BH-003', firstName: 'Ola', lastName: 'Dayo', phoneNumber: '+2348010000003',
      status: 'ACTIVE', totalContributionsKobo: 48000000, joinedAt: getUnixTime(subMonths(new Date(now * 1000), 24))
    },
    {
      id: adaMemberId, userId: adaUserId, membershipNumber: 'BH-004', firstName: 'Ada', lastName: 'Okonkwo', phoneNumber: '+2348010000004',
      status: 'ACTIVE', totalContributionsKobo: 36000000, joinedAt: getUnixTime(subMonths(new Date(now * 1000), 18))
    },
    {
      id: chidiMemberId, userId: chidiUserId, membershipNumber: 'BH-005', firstName: 'Chidi', lastName: 'Okafor', phoneNumber: '+2348010000005',
      status: 'ACTIVE', totalContributionsKobo: 48000000, joinedAt: getUnixTime(subMonths(new Date(now * 1000), 24))
    },
    {
      id: temidayoMemberId, userId: temidayoUserId, membershipNumber: 'BH-006', firstName: 'Temidayo', lastName: 'Adebayo', phoneNumber: '+2348010000006',
      status: 'ACTIVE', totalContributionsKobo: 8000000, joinedAt: getUnixTime(subMonths(new Date(now * 1000), 8))
    }
  ]);

  const emergencyLoanId = uuidv4();
  const developmentLoanId = uuidv4();
  const schoolFeesLoanId = uuidv4();

  await db.insert(schema.loanProducts).values([
    { id: emergencyLoanId, name: 'Emergency Loan', minAmountKobo: 5000000, maxAmountKobo: 50000000, interestRate: 0.05, maxTermMonths: 6, requiredGuarantors: 1 },
    { id: developmentLoanId, name: 'Development Loan', minAmountKobo: 100000000, maxAmountKobo: 1000000000, interestRate: 0.10, maxTermMonths: 24, requiredGuarantors: 2 },
    { id: schoolFeesLoanId, name: 'School Fees Loan', minAmountKobo: 20000000, maxAmountKobo: 200000000, interestRate: 0.07, maxTermMonths: 12, requiredGuarantors: 1 }
  ]);

  await db.insert(schema.products).values([
    { id: uuidv4(), name: 'Improved Maize Seed', description: 'High-yield, drought-tolerant improved maize seed.', category: 'Seeds', unit: '10kg bag', priceKobo: 850000, stock: 40, isActive: 1, imageEmoji: '🌽', createdAt: now, updatedAt: now },
    { id: uuidv4(), name: 'Rice Seed (FARO 44)', description: 'Certified FARO 44 paddy rice seed for wetland planting.', category: 'Seeds', unit: '25kg bag', priceKobo: 1800000, stock: 25, isActive: 1, imageEmoji: '🌾', createdAt: now, updatedAt: now },
    { id: uuidv4(), name: 'NPK Fertilizer 20-10-10', description: 'Blended compound fertilizer for maize and rice.', category: 'Inputs', unit: '50kg bag', priceKobo: 3200000, stock: 30, isActive: 1, imageEmoji: '🧪', createdAt: now, updatedAt: now },
    { id: uuidv4(), name: 'Poultry Feed (Layer)', description: 'Balanced layer mash, bulk-bought by the cooperative.', category: 'Animal Feed', unit: '25kg bag', priceKobo: 1250000, stock: 20, isActive: 1, imageEmoji: '🐔', createdAt: now, updatedAt: now },
    { id: uuidv4(), name: 'Organic Manure', description: 'Composted organic manure for vegetable plots.', category: 'Inputs', unit: '20kg bag', priceKobo: 600000, stock: 50, isActive: 1, imageEmoji: '🌱', createdAt: now, updatedAt: now },
    { id: uuidv4(), name: 'Maize Grains (Pooled Harvest)', description: 'Cooperative pooled harvest, available to members first.', category: 'Harvest', unit: '100kg bag', priceKobo: 4500000, stock: 15, isActive: 1, imageEmoji: '🌽', createdAt: now, updatedAt: now },
  ]);

  await db.insert(schema.announcements).values([
    { id: uuidv4(), title: 'Annual General Meeting', content: 'Our upcoming AGM will hold on the 15th of next month. All active members are expected.', audience: 'MEMBER', publishedAt: getUnixTime(subMonths(new Date(now * 1000), 1)) },
    { id: uuidv4(), title: 'Welcome to Blessed Hands', content: 'We are excited to launch our new digital cooperative platform.', audience: 'PUBLIC', publishedAt: getUnixTime(subMonths(new Date(now * 1000), 2)) }
  ]);

  // Contribution obligations for Ada Okonkwo (BH-004)
  await db.insert(schema.contributionObligations).values([
    { id: uuidv4(), memberId: adaMemberId, monthPeriod: '2026-07', expectedAmountKobo: 2000000, paidAmountKobo: 0, status: 'UNPAID', dueDate: now + 86400 * 7 },
    { id: uuidv4(), memberId: adaMemberId, monthPeriod: '2026-06', expectedAmountKobo: 2000000, paidAmountKobo: 2000000, status: 'PAID', dueDate: now - 86400 * 25 },
    { id: uuidv4(), memberId: adaMemberId, monthPeriod: '2026-05', expectedAmountKobo: 2000000, paidAmountKobo: 2000000, status: 'PAID', dueDate: now - 86400 * 55 },
  ]);

  // Demo email outbox records
  await db.insert(schema.demoEmailOutbox).values([
    { id: uuidv4(), recipient: 'ada.okonkwo@blessedhands.ng', template: 'WELCOME', subject: 'Welcome to Blessed Hands', payload: JSON.stringify({ name: 'Ada Okonkwo', membershipNumber: 'BH-004' }), sentAt: now - 86400 * 30 },
    { id: uuidv4(), recipient: 'ada.okonkwo@blessedhands.ng', template: 'CONTRIBUTION_DUE', subject: 'July 2026 Monthly Savings Reminder', payload: JSON.stringify({ amountKobo: 2000000 }), sentAt: now - 86400 * 3 }
  ]);
}
