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
});

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
    // Audit fields
    createdAt: text('created_at').$defaultFn(() => formatISO(new UTCDate())),
    createdBy: text('created_by').notNull(), // User ID as string, no FK constraint - who created the record (different from userId which is who the expense is for)
    updatedAt: text('updated_at').$defaultFn(() => formatISO(new UTCDate())),
    updatedBy: text('updated_by'), // User ID as string, no FK constraint
    deletedAt: text('deleted_at'),
    deletedBy: text('deleted_by'), // User ID as string, no FK constraint
});

export const budgets = sqliteTable('budgets', {
    id: text('id').primaryKey().$defaultFn(() => createId()),
    vaultId: text('vault_id').notNull().references(() => vaults.id, { onDelete: 'cascade' }),

    // Budget details
    name: text('name').notNull(), // e.g., "Monthly Food Budget"
    description: text('description'),
    amount: real('amount').notNull(), // Budget amount (uses vault's currency)

    // Period configuration
    period: text('period').notNull().default('monthly'), // 'weekly', 'monthly', 'custom'
    startDate: text('start_date').notNull(), // Start date of budget period
    endDate: text('end_date'), // End date (null for recurring weekly/monthly)

    // Scope filters (what this budget applies to) - supports multiple selections
    categoryNames: text('category_names', { mode: 'json' }).$type<string[] | null>(), // null or empty = all categories
    templateIds: text('template_ids', { mode: 'json' }).$type<string[] | null>(), // null or empty = all templates
    userIds: text('user_ids', { mode: 'json' }).$type<string[] | null>(), // null or empty = all members

    // Alert settings
    alertThreshold: integer('alert_threshold').default(80), // Alert when X% of budget is reached
    alertEnabled: integer('alert_enabled', { mode: 'boolean' }).default(true),

    // Status
    isActive: integer('is_active', { mode: 'boolean' }).default(true),

    // Audit fields
    createdAt: text('created_at').$defaultFn(() => formatISO(new UTCDate())),
    createdBy: text('created_by').notNull(),
    updatedAt: text('updated_at').$defaultFn(() => formatISO(new UTCDate())),
    updatedBy: text('updated_by'),
    deletedAt: text('deleted_at'),
    deletedBy: text('deleted_by'),
}, (table) => ({
    // Index for efficient budget queries by vault
    vaultIdx: index('idx_budgets_vault').on(table.vaultId),
    // Index for active budgets
    activeIdx: index('idx_budgets_active').on(table.vaultId, table.isActive),
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
});
