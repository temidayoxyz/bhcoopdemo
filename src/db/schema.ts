import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull(), // 'MEMBER', 'SUPER_ADMIN', 'ADMIN', 'TREASURER'
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const members = sqliteTable('members', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id).unique(), // Can be null if application pending? No, members table is for approved members
  membershipNumber: text('membership_number').notNull().unique(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  phoneNumber: text('phone_number').notNull(),
  status: text('status').notNull(), // 'ACTIVE', 'SUSPENDED'
  totalContributionsKobo: integer('total_contributions_kobo').notNull().default(0),
  depositBalanceKobo: integer('deposit_balance_kobo').notNull().default(0),
  sharesBalanceKobo: integer('shares_balance_kobo').notNull().default(0),
  joinedAt: integer('joined_at').notNull(),
});

export const membershipApplications = sqliteTable('membership_applications', {
  id: text('id').primaryKey(),
  reference: text('reference').notNull().unique(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  email: text('email').notNull(),
  phoneNumber: text('phone_number').notNull(),
  employment: text('employment').notNull(),
  status: text('status').notNull(), // 'PENDING', 'APPROVED', 'REJECTED'
  reviewNotes: text('review_notes'),
  submittedAt: integer('submitted_at').notNull(),
});

export const contributionObligations = sqliteTable('contribution_obligations', {
  id: text('id').primaryKey(),
  memberId: text('member_id').references(() => members.id).notNull(),
  monthPeriod: text('month_period').notNull(), // '2026-07'
  expectedAmountKobo: integer('expected_amount_kobo').notNull(),
  paidAmountKobo: integer('paid_amount_kobo').notNull().default(0),
  status: text('status').notNull(), // 'UNPAID', 'PARTIAL', 'PAID', 'OVERDUE'
  dueDate: integer('due_date').notNull(),
});

export const ledgerTransactions = sqliteTable('ledger_transactions', {
  id: text('id').primaryKey(),
  reference: text('reference').notNull().unique(),
  type: text('type').notNull(), // 'CONTRIBUTION_PAYMENT', 'LOAN_DISBURSEMENT', 'LOAN_REPAYMENT', 'DEPOSIT_FUNDING', 'DEPOSIT_TO_CONTRIBUTION', 'DEPOSIT_TO_SHARES', 'DEPOSIT_TO_LOAN_REPAYMENT'
  paymentSource: text('payment_source'), // 'DEPOSIT_WALLET', 'PAYSTACK', 'DIRECT_PAYMENT', 'BANK_TRANSFER', 'ADMIN_RECORD'
  status: text('status').notNull(), // 'COMPLETED', 'REVERSED'
  description: text('description'),
  amountKobo: integer('amount_kobo').notNull(),
  date: integer('date').notNull(),
});

export const loanProducts = sqliteTable('loan_products', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  minAmountKobo: integer('min_amount_kobo').notNull(),
  maxAmountKobo: integer('max_amount_kobo').notNull(),
  interestRate: real('interest_rate').notNull(), // 0.05 for 5%
  maxTermMonths: integer('max_term_months').notNull(),
  requiredGuarantors: integer('required_guarantors').notNull(),
});

export const loans = sqliteTable('loans', {
  id: text('id').primaryKey(),
  memberId: text('member_id').references(() => members.id).notNull(),
  loanProductId: text('loan_product_id').references(() => loanProducts.id).notNull(),
  reference: text('reference').notNull().unique(),
  principalKobo: integer('principal_kobo').notNull(),
  interestKobo: integer('interest_kobo').notNull(),
  totalDueKobo: integer('total_due_kobo').notNull(),
  paidKobo: integer('paid_kobo').notNull().default(0),
  status: text('status').notNull(), // 'PENDING_APPROVAL', 'APPROVED', 'ACTIVE', 'COMPLETED', 'REJECTED'
  termMonths: integer('term_months').notNull(),
  appliedAt: integer('applied_at').notNull(),
  disbursedAt: integer('disbursed_at'),
});

export const guarantorRequests = sqliteTable('guarantor_requests', {
  id: text('id').primaryKey(),
  loanId: text('loan_id').references(() => loans.id).notNull(),
  guarantorMemberId: text('guarantor_member_id').references(() => members.id).notNull(),
  status: text('status').notNull(), // 'PENDING', 'ACCEPTED', 'DECLINED'
  comment: text('comment'),
  requestedAt: integer('requested_at').notNull(),
});

export const repaymentSchedules = sqliteTable('repayment_schedules', {
  id: text('id').primaryKey(),
  loanId: text('loan_id').references(() => loans.id).notNull(),
  dueDate: integer('due_date').notNull(),
  expectedAmountKobo: integer('expected_amount_kobo').notNull(),
  paidAmountKobo: integer('paid_amount_kobo').notNull().default(0),
  status: text('status').notNull(), // 'PENDING', 'PAID', 'OVERDUE'
});

export const demoEmailOutbox = sqliteTable('demo_email_outbox', {
  id: text('id').primaryKey(),
  recipient: text('recipient').notNull(),
  template: text('template').notNull(),
  subject: text('subject').notNull(),
  payload: text('payload').notNull(), // JSON string
  sentAt: integer('sent_at').notNull(),
});

export const announcements = sqliteTable('announcements', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  audience: text('audience').notNull(), // 'PUBLIC', 'MEMBER'
  publishedAt: integer('published_at').notNull(),
});

export const auditLogs = sqliteTable('audit_logs', {
  id: text('id').primaryKey(),
  actorId: text('actor_id'), // can be null for public actions like application
  actorRole: text('actor_role'),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityReference: text('entity_reference').notNull(),
  timestamp: integer('timestamp').notNull(),
  summary: text('summary').notNull(),
});

export const products = sqliteTable('products', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  category: text('category').notNull(),
  unit: text('unit').notNull(), // 'bag', 'kg', 'pack', 'litre'
  priceKobo: integer('price_kobo').notNull(),
  stock: integer('stock').notNull().default(0),
  isActive: integer('is_active').notNull().default(1), // 1 = active, 0 = hidden
  imageEmoji: text('image_emoji'), // placeholder artwork
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const orders = sqliteTable('orders', {
  id: text('id').primaryKey(),
  memberId: text('member_id').references(() => members.id).notNull(),
  reference: text('reference').notNull().unique(),
  status: text('status').notNull(), // 'PLACED', 'PACKED', 'FULFILLED', 'CANCELLED'
  totalKobo: integer('total_kobo').notNull(),
  itemCount: integer('item_count').notNull(),
  note: text('note'),
  placedAt: integer('placed_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const orderItems = sqliteTable('order_items', {
  id: text('id').primaryKey(),
  orderId: text('order_id').references(() => orders.id).notNull(),
  productId: text('product_id').references(() => products.id).notNull(),
  productName: text('product_name').notNull(), // snapshot at order time
  unitPriceKobo: integer('unit_price_kobo').notNull(), // snapshot at order time
  quantity: integer('quantity').notNull(),
});

export const fundRequests = sqliteTable('fund_requests', {
  id: text('id').primaryKey(),
  memberId: text('member_id').references(() => members.id).notNull(),
  reference: text('reference').notNull().unique(),
  type: text('type').notNull(), // 'DEPOSIT', 'WITHDRAWAL'
  amountKobo: integer('amount_kobo').notNull(),
  status: text('status').notNull(), // 'PENDING', 'APPROVED', 'REJECTED'
  requestedAt: integer('requested_at').notNull(),
  processedAt: integer('processed_at'),
  processedBy: text('processed_by').references(() => users.id),
  notes: text('notes'),
});
