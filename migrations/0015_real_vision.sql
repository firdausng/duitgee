CREATE TABLE `pending_recurring_occurrences` (
	`id` text PRIMARY KEY NOT NULL,
	`vault_id` text NOT NULL,
	`recurring_expense_id` text NOT NULL,
	`due_date` text NOT NULL,
	`suggested_amount` real NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`approved_expense_id` text,
	`created_at` text,
	`created_by` text NOT NULL,
	`updated_at` text,
	`updated_by` text,
	FOREIGN KEY (`vault_id`) REFERENCES `vaults`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`recurring_expense_id`) REFERENCES `recurring_expenses`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_pending_occurrences_vault` ON `pending_recurring_occurrences` (`vault_id`);--> statement-breakpoint
CREATE INDEX `idx_pending_occurrences_rule` ON `pending_recurring_occurrences` (`recurring_expense_id`);--> statement-breakpoint
CREATE INDEX `idx_pending_occurrences_status` ON `pending_recurring_occurrences` (`vault_id`,`status`);--> statement-breakpoint
CREATE TABLE `recurring_expenses` (
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
	`end_after_count` integer,
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
	FOREIGN KEY (`template_id`) REFERENCES `expense_templates`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_recurring_expenses_vault` ON `recurring_expenses` (`vault_id`);--> statement-breakpoint
CREATE INDEX `idx_recurring_expenses_template` ON `recurring_expenses` (`template_id`);--> statement-breakpoint
CREATE INDEX `idx_recurring_expenses_scan` ON `recurring_expenses` (`status`,`next_occurrence_at`);--> statement-breakpoint
ALTER TABLE `expenses` ADD `recurring_expense_id` text;--> statement-breakpoint
CREATE INDEX `idx_expenses_recurring` ON `expenses` (`recurring_expense_id`);