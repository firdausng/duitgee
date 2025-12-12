PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_budgets` (
	`id` text PRIMARY KEY NOT NULL,
	`vault_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`amount` real NOT NULL,
	`period` text DEFAULT 'monthly' NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text,
	`category_names` text,
	`template_ids` text,
	`user_ids` text,
	`alert_threshold` integer DEFAULT 80,
	`alert_enabled` integer DEFAULT true,
	`is_active` integer DEFAULT true,
	`created_at` text,
	`created_by` text NOT NULL,
	`updated_at` text,
	`updated_by` text,
	`deleted_at` text,
	`deleted_by` text,
	FOREIGN KEY (`vault_id`) REFERENCES `vaults`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_budgets`("id", "vault_id", "name", "description", "amount", "period", "start_date", "end_date", "category_names", "template_ids", "user_ids", "alert_threshold", "alert_enabled", "is_active", "created_at", "created_by", "updated_at", "updated_by", "deleted_at", "deleted_by") SELECT "id", "vault_id", "name", "description", "amount", "period", "start_date", "end_date", "category_names", "template_ids", "user_ids", "alert_threshold", "alert_enabled", "is_active", "created_at", "created_by", "updated_at", "updated_by", "deleted_at", "deleted_by" FROM `budgets`;--> statement-breakpoint
DROP TABLE `budgets`;--> statement-breakpoint
ALTER TABLE `__new_budgets` RENAME TO `budgets`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `idx_budgets_vault` ON `budgets` (`vault_id`);--> statement-breakpoint
CREATE INDEX `idx_budgets_active` ON `budgets` (`vault_id`,`is_active`);