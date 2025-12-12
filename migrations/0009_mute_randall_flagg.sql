CREATE TABLE `budgets` (
	`id` text PRIMARY KEY NOT NULL,
	`vault_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`amount` real NOT NULL,
	`period` text DEFAULT 'monthly' NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text,
	`category_name` text,
	`template_id` text,
	`user_id` text,
	`alert_threshold` integer DEFAULT 80,
	`alert_enabled` integer DEFAULT true,
	`is_active` integer DEFAULT true,
	`created_at` text,
	`created_by` text NOT NULL,
	`updated_at` text,
	`updated_by` text,
	`deleted_at` text,
	`deleted_by` text,
	FOREIGN KEY (`vault_id`) REFERENCES `vaults`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`template_id`) REFERENCES `expense_templates`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_budgets_vault` ON `budgets` (`vault_id`);--> statement-breakpoint
CREATE INDEX `idx_budgets_active` ON `budgets` (`vault_id`,`is_active`);