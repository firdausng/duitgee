CREATE TABLE `pending_recurring_income_occurrences` (
	`id` text PRIMARY KEY NOT NULL,
	`vault_id` text NOT NULL,
	`recurring_income_id` text NOT NULL,
	`due_date` text NOT NULL,
	`suggested_amount` real NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`approved_entry_id` text,
	`created_at` text,
	`created_by` text NOT NULL,
	`updated_at` text,
	`updated_by` text,
	FOREIGN KEY (`vault_id`) REFERENCES `vaults`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`recurring_income_id`) REFERENCES `recurring_income`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_pending_income_vault` ON `pending_recurring_income_occurrences` (`vault_id`);--> statement-breakpoint
CREATE INDEX `idx_pending_income_rule` ON `pending_recurring_income_occurrences` (`recurring_income_id`);--> statement-breakpoint
CREATE INDEX `idx_pending_income_status` ON `pending_recurring_income_occurrences` (`vault_id`,`status`);--> statement-breakpoint
CREATE TABLE `recurring_income` (
	`id` text PRIMARY KEY NOT NULL,
	`vault_id` text NOT NULL,
	`template_id` text NOT NULL,
	`name` text,
	`amount_override` real,
	`schedule_unit` text NOT NULL,
	`schedule_interval` integer DEFAULT 1 NOT NULL,
	`anchor_date` text NOT NULL,
	`generation_mode` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`end_date` text,
	`next_occurrence_at` text,
	`last_generated_at` text,
	`occurrence_count` integer DEFAULT 0 NOT NULL,
	`created_at` text,
	`created_by` text NOT NULL,
	`updated_at` text,
	`updated_by` text,
	`deleted_at` text,
	`deleted_by` text,
	FOREIGN KEY (`vault_id`) REFERENCES `vaults`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`template_id`) REFERENCES `income_templates`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_recurring_income_vault` ON `recurring_income` (`vault_id`);--> statement-breakpoint
CREATE INDEX `idx_recurring_income_template` ON `recurring_income` (`template_id`);--> statement-breakpoint
CREATE INDEX `idx_recurring_income_scan` ON `recurring_income` (`status`,`next_occurrence_at`);