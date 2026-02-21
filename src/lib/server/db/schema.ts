import { integer, sqliteTable, text, real, index  } from 'drizzle-orm/sqlite-core';
import { createId } from '@paralleldrive/cuid2';
import { UTCDate } from "@date-fns/utc";
import { formatISO } from "date-fns";
import {sql} from "drizzle-orm";

// Vaults - shared expense containers
export const vaults = sqliteTable('vaults', {
    id: text('id').primaryKey().$defaultFn(() => createId()),
    name: text('name').notNull(),
    description: text('description'),
    color: text('color').notNull().default('#3B82F6'),
    icon: text('icon').default('🏦'),
    iconType: text('icon_type').default('emoji'),
    organizationId: text('organization_id'),
    isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
    // Localization settings
    locale: text('locale').notNull().default('en-US'), // BCP 47 language tag (e.g., en-US, ja-JP, id-ID)
    currency: text('currency').default('USD'), // ISO 4217 currency code (e.g., USD, JPY, IDR)
    // Plan - references plan config (no FK constraint, can migrate to table later)
    planId: text('plan_id').notNull().default('plan_free'),
    // Audit fields
    createdAt: text('created_at').$defaultFn(() => formatISO(new UTCDate())),
    createdBy: text('created_by').notNull(), // User ID as string, no FK constraint
    updatedAt: text('updated_at').$defaultFn(() => formatISO(new UTCDate())),
    updatedBy: text('updated_by'), // User ID as string, no FK constraint
    deletedAt: text('deleted_at'),
    deletedBy: text('deleted_by'), // User ID as string, no FK constraint
}, (table) => ({
    uniqueDefaultPerUser: index('idx_one_default_vault_per_user')
        .on(table.createdBy)
        .where(sql`${table.isDefault} = 1`),
}));

export const vaultMembers = sqliteTable('vault_members', {
    id: text('id').primaryKey().$defaultFn(() => createId()),
    vaultId: text('vault_id').notNull().references(() => vaults.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull(),
    displayName: text('display_name'),
    role: text('role').notNull().default('member'), // 'owner', 'admin', 'member'
    invitedBy: text('invited_by'),
    status: text('status').notNull().default('pending'), // 'pending', 'active', 'declined', 'removed'
    isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
    invitedAt: text('created_at').$defaultFn(() => formatISO(new Date())),
    joinedAt: text('created_at'),
    updatedAt: text('updated_at').$defaultFn(() => formatISO(new Date())),
    deletedAt: text('updated_at'),
}, (table) => ({
    vaultIdIdx: index('idx_member_vault').on(table.vaultId),
    uniqueDefaultPerUser: index('idx_one_default_vault_per_user_member')
        .on(table.userId)
        .where(sql`${table.isDefault} = 1`),
}));

export const expenseTemplates = sqliteTable('expense_templates', {
    id: text('id').primaryKey().$defaultFn(() => createId()),
    userId: text('user_id').notNull(), // Template creator/owner - never null
    vaultId: text('vault_id').notNull().references(() => vaults.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    icon: text('icon').default('📝'),
    iconType: text('icon_type').default('emoji'),
    // expense fields
    defaultNote: text('note'),
    defaultAmount: real('default_amount'),
    defaultCategoryName: text('category_id'),
    defaultPaymentType: text('default_payment_type').default('cash'), // Default payment method
    defaultPaidBy: text('default_user_id'), // Who the expense should be assigned to: "__creator__", null (vault), or specific user ID
    // Usage tracking
    usageCount: integer('usage_count').notNull().default(0),
    lastUsedAt: text('last_used_at'),
    // Audit fields
    createdAt: text('created_at').$defaultFn(() => formatISO(new UTCDate())),
    createdBy: text('created_by').notNull(),
    updatedAt: text('updated_at').$defaultFn(() => formatISO(new UTCDate())),
    updatedBy: text('updated_by'),
    deletedAt: text('deleted_at'),
    deletedBy: text('deleted_by'),
}, (table)=>({
    vaultIdIdx: index('idx_expense_templates_vault').on(table.vaultId),
}));

export const expenses = sqliteTable('expenses', {
    id: text('id').primaryKey().$defaultFn(() => createId()),
    note: text('description'),
    amount: real('amount').notNull(),
    categoryName: text('category_id').notNull(),
    paymentType: text('payment_type').notNull().default('cash'), // Payment method: cash, debit, credit, transfer, ewallet, etc.
    date: text('date').notNull().$defaultFn(() => formatISO(new UTCDate())), // ISO string format like audit fields
    paidBy: text('user_id'), // Optional - null means vault-level expense (e.g., family/shared expense)
    // related fields
    vaultId: text('vault_id').notNull().references(() => vaults.id, { onDelete: 'cascade' }), // required vault
    expenseTemplateId: text('expense_template_id').references(() => expenseTemplates.id, { onDelete: 'cascade' }), // required vault
    // Fund integration - all nullable, no FK constraints (circular ref with fundTransactions)
    fundId: text('fund_id'), // No FK - soft reference to funds.id
    fundPaymentMode: text('fund_payment_mode'), // 'paid_by_fund' | 'pending_reimbursement'
    fundTransactionId: text('fund_transaction_id'), // No FK - soft reference to fundTransactions.id
    // Audit fields
    createdAt: text('created_at').$defaultFn(() => formatISO(new UTCDate())),
    createdBy: text('created_by').notNull(), // User ID as string, no FK constraint - who created the record (different from userId which is who the expense is for)
    updatedAt: text('updated_at').$defaultFn(() => formatISO(new UTCDate())),
    updatedBy: text('updated_by'), // User ID as string, no FK constraint
    deletedAt: text('deleted_at'),
    deletedBy: text('deleted_by'), // User ID as string, no FK constraint
}, (table)=>({
    vaultIdIdx: index('idx_expenses_vault').on(table.vaultId),
    fundIdIdx: index('idx_expenses_fund').on(table.fundId),
}));

export const invitation = sqliteTable("invitation", {
    id: text("id").primaryKey(),
    vaultId: text("vault_id")
        .notNull()
        .references(() => vaults.id, { onDelete: "cascade" }),
    role: text("role"),
    status: text("status").default("pending").notNull(),
    inviterId: text('inviter_id'),
    inviteeId: text('invitee_id'),
}, (table)=>({
    vaultIdIdx: index('idx_invitation_vault').on(table.vaultId),
}));

// Funds - real money containers within a vault
export const funds = sqliteTable('funds', {
    id: text('id').primaryKey().$defaultFn(() => createId()),
    vaultId: text('vault_id').notNull().references(() => vaults.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    color: text('color').notNull().default('#10B981'),
    icon: text('icon').default('💰'),
    iconType: text('icon_type').default('emoji'),
    balance: real('balance').notNull().default(0), // Cached balance - source of truth is fundTransactions sum
    status: text('status').notNull().default('active'), // 'active' | 'archived'
    // Audit fields
    createdAt: text('created_at').$defaultFn(() => formatISO(new UTCDate())),
    createdBy: text('created_by').notNull(),
    updatedAt: text('updated_at').$defaultFn(() => formatISO(new UTCDate())),
    updatedBy: text('updated_by'),
    deletedAt: text('deleted_at'),
    deletedBy: text('deleted_by'),
}, (table) => ({
    vaultIdIdx: index('idx_funds_vault').on(table.vaultId),
    statusIdx: index('idx_funds_status').on(table.vaultId, table.status),
}));

// FundPolicies - replenishment policy per fund (one per fund, immutable after creation at app layer)
export const fundPolicies = sqliteTable('fund_policies', {
    id: text('id').primaryKey().$defaultFn(() => createId()),
    fundId: text('fund_id').notNull().references(() => funds.id, { onDelete: 'cascade' }),
    replenishmentType: text('replenishment_type').notNull(), // 'manual' | 'fixed_amount' | 'top_to_ceiling'
    replenishmentAmount: real('replenishment_amount'), // For 'fixed_amount': how much to add each cycle
    ceilingAmount: real('ceiling_amount'), // For 'top_to_ceiling': max balance to restore to
    replenishmentSchedule: text('replenishment_schedule'), // 'monthly' | 'biweekly' | 'weekly' | null for manual
    effectiveFrom: text('effective_from').notNull().$defaultFn(() => formatISO(new UTCDate())),
    // Audit fields
    createdAt: text('created_at').$defaultFn(() => formatISO(new UTCDate())),
    createdBy: text('created_by').notNull(),
    updatedAt: text('updated_at').$defaultFn(() => formatISO(new UTCDate())),
    updatedBy: text('updated_by'),
}, (table) => ({
    fundIdIdx: index('idx_fund_policies_fund').on(table.fundId),
}));

// FundCycles - period snapshots per fund
export const fundCycles = sqliteTable('fund_cycles', {
    id: text('id').primaryKey().$defaultFn(() => createId()),
    fundId: text('fund_id').notNull().references(() => funds.id, { onDelete: 'cascade' }),
    periodStart: text('period_start').notNull(), // UTC ISO string
    periodEnd: text('period_end').notNull(),     // UTC ISO string
    openingBalance: real('opening_balance').notNull().default(0),
    topUpAmount: real('top_up_amount').notNull().default(0),
    totalSpent: real('total_spent').notNull().default(0),
    totalReimbursed: real('total_reimbursed').notNull().default(0),
    closingBalance: real('closing_balance'), // null while active, set on close
    status: text('status').notNull().default('active'), // 'active' | 'closed'
    // Audit fields
    createdAt: text('created_at').$defaultFn(() => formatISO(new UTCDate())),
    createdBy: text('created_by').notNull(),
    updatedAt: text('updated_at').$defaultFn(() => formatISO(new UTCDate())),
    updatedBy: text('updated_by'),
}, (table) => ({
    fundIdIdx: index('idx_fund_cycles_fund').on(table.fundId),
    activeIdx: index('idx_fund_cycles_active').on(table.fundId, table.status),
}));

// FundTransfers - first-class entity for balance transfers between funds (declared before fundTransactions)
export const fundTransfers = sqliteTable('fund_transfers', {
    id: text('id').primaryKey().$defaultFn(() => createId()),
    vaultId: text('vault_id').notNull().references(() => vaults.id, { onDelete: 'cascade' }),
    fromFundId: text('from_fund_id').notNull().references(() => funds.id, { onDelete: 'cascade' }),
    toFundId: text('to_fund_id').notNull().references(() => funds.id, { onDelete: 'cascade' }),
    amount: real('amount').notNull(),
    note: text('note'),
    transferredAt: text('transferred_at').notNull().$defaultFn(() => formatISO(new UTCDate())),
    transferredBy: text('transferred_by').notNull(), // User ID string, no FK constraint
    // Audit fields
    createdAt: text('created_at').$defaultFn(() => formatISO(new UTCDate())),
    createdBy: text('created_by').notNull(),
    updatedAt: text('updated_at').$defaultFn(() => formatISO(new UTCDate())),
    updatedBy: text('updated_by'),
}, (table) => ({
    vaultIdIdx: index('idx_fund_transfers_vault').on(table.vaultId),
    fromFundIdx: index('idx_fund_transfers_from').on(table.fromFundId),
    toFundIdx: index('idx_fund_transfers_to').on(table.toFundId),
}));

// FundTransactions - single source of truth for all fund balance events
export const fundTransactions = sqliteTable('fund_transactions', {
    id: text('id').primaryKey().$defaultFn(() => createId()),
    fundId: text('fund_id').notNull().references(() => funds.id, { onDelete: 'cascade' }),
    cycleId: text('cycle_id').notNull().references(() => fundCycles.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    // 'top_up' | 'expense_paid' | 'pending_reimbursement' | 'reimbursement' |
    // 'expense_reversal' | 'reimbursement_reversal' | 'transfer_in' | 'transfer_out'
    amount: real('amount').notNull().default(0), // 0 for pending_reimbursement placeholder
    expenseId: text('expense_id'), // No FK - soft reference to expenses.id (circular ref)
    fundTransferId: text('fund_transfer_id').references(() => fundTransfers.id, { onDelete: 'set null' }),
    reimbursedAt: text('reimbursed_at'), // Set when type transitions from pending_reimbursement to reimbursement
    reimbursedBy: text('reimbursed_by'), // User ID string, no FK constraint
    note: text('note'),
    // Audit fields
    createdAt: text('created_at').$defaultFn(() => formatISO(new UTCDate())),
    createdBy: text('created_by').notNull(),
    updatedAt: text('updated_at').$defaultFn(() => formatISO(new UTCDate())),
    updatedBy: text('updated_by'),
}, (table) => ({
    fundIdIdx: index('idx_fund_transactions_fund').on(table.fundId),
    cycleIdIdx: index('idx_fund_transactions_cycle').on(table.cycleId),
    typeIdx: index('idx_fund_transactions_type').on(table.fundId, table.type),
    expenseIdIdx: index('idx_fund_transactions_expense').on(table.expenseId),
}));
