CREATE TABLE `income_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`vault_id` text NOT NULL,
	`source_id` text NOT NULL,
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
	FOREIGN KEY (`vault_id`) REFERENCES `vaults`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_id`) REFERENCES `income_sources`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_income_templates_vault` ON `income_templates` (`vault_id`);--> statement-breakpoint
CREATE INDEX `idx_income_templates_source` ON `income_templates` (`source_id`);--> statement-breakpoint
ALTER TABLE `income_entries` ADD `template_id` text REFERENCES income_templates(id);--> statement-breakpoint
CREATE INDEX `idx_income_entries_vault_template` ON `income_entries` (`vault_id`,`template_id`);--> statement-breakpoint
ALTER TABLE `income_sources` DROP COLUMN `default_amount`;--> statement-breakpoint
ALTER TABLE `income_sources` DROP COLUMN `default_paid_to`;--> statement-breakpoint
ALTER TABLE `income_sources` DROP COLUMN `default_fund_id`;--> statement-breakpoint
ALTER TABLE `income_sources` DROP COLUMN `default_note`;--> statement-breakpoint
ALTER TABLE `income_sources` DROP COLUMN `usage_count`;--> statement-breakpoint
ALTER TABLE `income_sources` DROP COLUMN `last_used_at`;