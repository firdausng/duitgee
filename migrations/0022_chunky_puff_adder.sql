CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`vault_id` text NOT NULL,
	`user_id` text,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`body` text,
	`link_url` text,
	`metadata` text,
	`read_at` text,
	`created_at` text,
	`created_by` text NOT NULL,
	FOREIGN KEY (`vault_id`) REFERENCES `vaults`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_notifications_unread` ON `notifications` (`vault_id`,`user_id`,`read_at`);--> statement-breakpoint
ALTER TABLE `expenses` ADD `status` text DEFAULT 'confirmed' NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_expenses_unidentified` ON `expenses` (`vault_id`,`status`,`amount`);