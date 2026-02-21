CREATE TABLE `fund_cycles` (
	`id` text PRIMARY KEY NOT NULL,
	`fund_id` text NOT NULL,
	`period_start` text NOT NULL,
	`period_end` text NOT NULL,
	`opening_balance` real DEFAULT 0 NOT NULL,
	`top_up_amount` real DEFAULT 0 NOT NULL,
	`total_spent` real DEFAULT 0 NOT NULL,
	`total_reimbursed` real DEFAULT 0 NOT NULL,
	`closing_balance` real,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text,
	`created_by` text NOT NULL,
	`updated_at` text,
	`updated_by` text,
	FOREIGN KEY (`fund_id`) REFERENCES `funds`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_fund_cycles_fund` ON `fund_cycles` (`fund_id`);--> statement-breakpoint
CREATE INDEX `idx_fund_cycles_active` ON `fund_cycles` (`fund_id`,`status`);--> statement-breakpoint
CREATE TABLE `fund_policies` (
	`id` text PRIMARY KEY NOT NULL,
	`fund_id` text NOT NULL,
	`replenishment_type` text NOT NULL,
	`replenishment_amount` real,
	`ceiling_amount` real,
	`replenishment_schedule` text,
	`effective_from` text NOT NULL,
	`created_at` text,
	`created_by` text NOT NULL,
	`updated_at` text,
	`updated_by` text,
	FOREIGN KEY (`fund_id`) REFERENCES `funds`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_fund_policies_fund` ON `fund_policies` (`fund_id`);--> statement-breakpoint
CREATE TABLE `fund_transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`fund_id` text NOT NULL,
	`cycle_id` text NOT NULL,
	`type` text NOT NULL,
	`amount` real DEFAULT 0 NOT NULL,
	`expense_id` text,
	`fund_transfer_id` text,
	`reimbursed_at` text,
	`reimbursed_by` text,
	`note` text,
	`created_at` text,
	`created_by` text NOT NULL,
	`updated_at` text,
	`updated_by` text,
	FOREIGN KEY (`fund_id`) REFERENCES `funds`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`cycle_id`) REFERENCES `fund_cycles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`fund_transfer_id`) REFERENCES `fund_transfers`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_fund_transactions_fund` ON `fund_transactions` (`fund_id`);--> statement-breakpoint
CREATE INDEX `idx_fund_transactions_cycle` ON `fund_transactions` (`cycle_id`);--> statement-breakpoint
CREATE INDEX `idx_fund_transactions_type` ON `fund_transactions` (`fund_id`,`type`);--> statement-breakpoint
CREATE INDEX `idx_fund_transactions_expense` ON `fund_transactions` (`expense_id`);--> statement-breakpoint
CREATE TABLE `fund_transfers` (
	`id` text PRIMARY KEY NOT NULL,
	`vault_id` text NOT NULL,
	`from_fund_id` text NOT NULL,
	`to_fund_id` text NOT NULL,
	`amount` real NOT NULL,
	`note` text,
	`transferred_at` text NOT NULL,
	`transferred_by` text NOT NULL,
	`created_at` text,
	`created_by` text NOT NULL,
	`updated_at` text,
	`updated_by` text,
	FOREIGN KEY (`vault_id`) REFERENCES `vaults`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`from_fund_id`) REFERENCES `funds`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`to_fund_id`) REFERENCES `funds`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_fund_transfers_vault` ON `fund_transfers` (`vault_id`);--> statement-breakpoint
CREATE INDEX `idx_fund_transfers_from` ON `fund_transfers` (`from_fund_id`);--> statement-breakpoint
CREATE INDEX `idx_fund_transfers_to` ON `fund_transfers` (`to_fund_id`);--> statement-breakpoint
CREATE TABLE `funds` (
	`id` text PRIMARY KEY NOT NULL,
	`vault_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`color` text DEFAULT '#10B981' NOT NULL,
	`icon` text DEFAULT '💰',
	`icon_type` text DEFAULT 'emoji',
	`balance` real DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text,
	`created_by` text NOT NULL,
	`updated_at` text,
	`updated_by` text,
	`deleted_at` text,
	`deleted_by` text,
	FOREIGN KEY (`vault_id`) REFERENCES `vaults`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_funds_vault` ON `funds` (`vault_id`);--> statement-breakpoint
CREATE INDEX `idx_funds_status` ON `funds` (`vault_id`,`status`);--> statement-breakpoint
ALTER TABLE `expenses` ADD `fund_id` text;--> statement-breakpoint
ALTER TABLE `expenses` ADD `fund_payment_mode` text;--> statement-breakpoint
ALTER TABLE `expenses` ADD `fund_transaction_id` text;--> statement-breakpoint
CREATE INDEX `idx_expenses_fund` ON `expenses` (`fund_id`);--> statement-breakpoint
ALTER TABLE `vaults` ADD `plan_id` text DEFAULT 'plan_free' NOT NULL;