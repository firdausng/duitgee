CREATE TABLE `income_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`vault_id` text NOT NULL,
	`source_id` text,
	`amount` real NOT NULL,
	`date` text NOT NULL,
	`paid_to` text,
	`note` text,
	`fund_id` text,
	`fund_transaction_id` text,
	`recurring_income_id` text,
	`import_batch_id` text,
	`created_at` text,
	`created_by` text NOT NULL,
	`updated_at` text,
	`updated_by` text,
	`deleted_at` text,
	`deleted_by` text,
	FOREIGN KEY (`vault_id`) REFERENCES `vaults`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_id`) REFERENCES `income_sources`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_income_entries_vault` ON `income_entries` (`vault_id`);--> statement-breakpoint
CREATE INDEX `idx_income_entries_vault_date` ON `income_entries` (`vault_id`,`date`);--> statement-breakpoint
CREATE INDEX `idx_income_entries_vault_source` ON `income_entries` (`vault_id`,`source_id`);--> statement-breakpoint
CREATE INDEX `idx_income_entries_fund` ON `income_entries` (`fund_id`);--> statement-breakpoint
CREATE INDEX `idx_income_entries_recurring` ON `income_entries` (`recurring_income_id`);--> statement-breakpoint
CREATE TABLE `income_sources` (
	`id` text PRIMARY KEY NOT NULL,
	`vault_id` text NOT NULL,
	`name` text NOT NULL,
	`icon` text DEFAULT '💰',
	`icon_type` text DEFAULT 'emoji',
	`default_amount` real,
	`default_paid_to` text,
	`default_fund_id` text,
	`default_note` text,
	`usage_count` integer DEFAULT 0 NOT NULL,
	`last_used_at` text,
	`created_at` text,
	`created_by` text NOT NULL,
	`updated_at` text,
	`updated_by` text,
	`deleted_at` text,
	`deleted_by` text,
	FOREIGN KEY (`vault_id`) REFERENCES `vaults`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_income_sources_vault` ON `income_sources` (`vault_id`);