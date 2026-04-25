CREATE TABLE `expense_tag_assignments` (
	`expense_id` text NOT NULL,
	`tag_id` text NOT NULL,
	`created_at` text,
	`created_by` text NOT NULL,
	PRIMARY KEY(`expense_id`, `tag_id`),
	FOREIGN KEY (`expense_id`) REFERENCES `expenses`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `expense_tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_expense_tag_assignments_tag` ON `expense_tag_assignments` (`tag_id`);--> statement-breakpoint
CREATE TABLE `expense_tags` (
	`id` text PRIMARY KEY NOT NULL,
	`vault_id` text NOT NULL,
	`name` text NOT NULL,
	`color` text,
	`is_system` integer DEFAULT false NOT NULL,
	`created_at` text,
	`created_by` text NOT NULL,
	`updated_at` text,
	`updated_by` text,
	`deleted_at` text,
	`deleted_by` text,
	FOREIGN KEY (`vault_id`) REFERENCES `vaults`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_expense_tags_vault` ON `expense_tags` (`vault_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_expense_tags_unique_name` ON `expense_tags` (`vault_id`,`name`) WHERE "expense_tags"."deleted_at" IS NULL;--> statement-breakpoint
ALTER TABLE `expense_templates` ADD `default_tag_ids` text;