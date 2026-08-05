import { db } from './db';
import * as schema from './schema';
import { sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { subMonths, addMonths, startOfMonth, endOfMonth, getUnixTime } from 'date-fns';

async function clearDb() {
  console.log('Clearing database...');
  await db.delete(schema.auditLogs);
  await db.delete(schema.orderItems);
  await db.delete(schema.orders);
  await db.delete(schema.products);
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
}

async function seed() {
  try {
    await clearDb();

    console.log('Seeding users and members...');
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

    console.log('Seeding loan products...');
    const emergencyLoanId = uuidv4();
    const developmentLoanId = uuidv4();
    const schoolFeesLoanId = uuidv4();

    await db.insert(schema.loanProducts).values([
      { id: emergencyLoanId, name: 'Emergency Loan', minAmountKobo: 5000000, maxAmountKobo: 50000000, interestRate: 0.05, maxTermMonths: 6, requiredGuarantors: 1 },
      { id: developmentLoanId, name: 'Development Loan', minAmountKobo: 100000000, maxAmountKobo: 1000000000, interestRate: 0.10, maxTermMonths: 24, requiredGuarantors: 2 },
      { id: schoolFeesLoanId, name: 'School Fees Loan', minAmountKobo: 20000000, maxAmountKobo: 200000000, interestRate: 0.07, maxTermMonths: 12, requiredGuarantors: 1 }
    ]);

    console.log('Seeding market products...');
    await db.insert(schema.products).values([
      { id: uuidv4(), name: 'Improved Maize Seed', description: 'High-yield, drought-tolerant improved maize seed.', category: 'Seeds', unit: '10kg bag', priceKobo: 850000, stock: 40, isActive: 1, imageEmoji: '🌽', createdAt: now, updatedAt: now },
      { id: uuidv4(), name: 'Rice Seed (FARO 44)', description: 'Certified FARO 44 paddy rice seed for wetland planting.', category: 'Seeds', unit: '25kg bag', priceKobo: 1800000, stock: 25, isActive: 1, imageEmoji: '🌾', createdAt: now, updatedAt: now },
      { id: uuidv4(), name: 'NPK Fertilizer 20-10-10', description: 'Blended compound fertilizer for maize and rice.', category: 'Inputs', unit: '50kg bag', priceKobo: 3200000, stock: 30, isActive: 1, imageEmoji: '🧪', createdAt: now, updatedAt: now },
      { id: uuidv4(), name: 'Poultry Feed (Layer)', description: 'Balanced layer mash, bulk-bought by the cooperative.', category: 'Animal Feed', unit: '25kg bag', priceKobo: 1250000, stock: 20, isActive: 1, imageEmoji: '🐔', createdAt: now, updatedAt: now },
      { id: uuidv4(), name: 'Organic Manure', description: 'Composted organic manure for vegetable plots.', category: 'Inputs', unit: '20kg bag', priceKobo: 600000, stock: 50, isActive: 1, imageEmoji: '🌱', createdAt: now, updatedAt: now },
      { id: uuidv4(), name: 'Maize Grains (Pooled Harvest)', description: 'Cooperative pooled harvest, available to members first.', category: 'Harvest', unit: '100kg bag', priceKobo: 4500000, stock: 15, isActive: 1, imageEmoji: '🌽', createdAt: now, updatedAt: now },
    ]);

    console.log('Seeding announcements...');
    await db.insert(schema.announcements).values([
      { id: uuidv4(), title: 'Annual General Meeting', content: 'Our upcoming AGM will hold on the 15th of next month. All active members are expected.', audience: 'MEMBER', publishedAt: getUnixTime(subMonths(new Date(now * 1000), 1)) },
      { id: uuidv4(), title: 'Welcome to Blessed Hands', content: 'We are excited to launch our new digital cooperative platform.', audience: 'PUBLIC', publishedAt: getUnixTime(subMonths(new Date(now * 1000), 2)) }
    ]);

    console.log('Database seeded successfully.');
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}

seed();
