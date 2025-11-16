import { integer, sqliteTable, text, real } from 'drizzle-orm/sqlite-core';
import { createId } from '@paralleldrive/cuid2';
import { UTCDate } from "@date-fns/utc";
import { formatISO } from "date-fns";

export const user = sqliteTable('user', {
	id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
	age: integer('age')
});

// Vaults - shared expense containers
export const vaults = sqliteTable('vaults', {
    id: text('id').primaryKey().$defaultFn(() => createId()),
    name: text('name').notNull(),
    description: text('description'),
    color: text('color').notNull().default('#3B82F6'),
    icon: text('icon').default('🏦'),
    iconType: text('icon_type').default('emoji'),
    creatorId: text('creator_id').notNull(),
    isPublic: integer('is_public', { mode: 'boolean' }).notNull().default(true), // false for shared vaults
    teamId: text('team_id'),
    organizationId: text('organization_id'),
    // Audit fields
    createdAt: text('created_at').$defaultFn(() => formatISO(new UTCDate())),
    createdBy: text('created_by').notNull(), // User ID as string, no FK constraint
    updatedAt: text('updated_at').$defaultFn(() => formatISO(new UTCDate())),
    updatedBy: text('updated_by'), // User ID as string, no FK constraint
    deletedAt: text('deleted_at'),
    deletedBy: text('deleted_by'), // User ID as string, no FK constraint
});

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
    defaultPaidBy: text('default_user_id'), // Who the expense should be assigned to: "__creator__", null (vault), or specific user ID
    defaultPaymentType: text('payment_type_id'),
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
    date: text('date').notNull().$defaultFn(() => formatISO(new UTCDate())), // ISO string format like audit fields
    paidBy: text('user_id'), // Optional - null means vault-level expense (e.g., family/shared expense)
    // related fields
    vaultId: text('vault_id').notNull().references(() => vaults.id, { onDelete: 'cascade' }), // required vault
    expenseTemplateId: text('expense_template_id').references(() => expenseTemplates.id, { onDelete: 'cascade' }), // required vault
    // Payment information - references to payment tables
    paymentType: text('payment_type_id'),
    // Audit fields
    createdAt: text('created_at').$defaultFn(() => formatISO(new UTCDate())),
    createdBy: text('created_by').notNull(), // User ID as string, no FK constraint - who created the record (different from userId which is who the expense is for)
    updatedAt: text('updated_at').$defaultFn(() => formatISO(new UTCDate())),
    updatedBy: text('updated_by'), // User ID as string, no FK constraint
    deletedAt: text('deleted_at'),
    deletedBy: text('deleted_by'), // User ID as string, no FK constraint
});
