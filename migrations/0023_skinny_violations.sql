CREATE TABLE `vault_plan_coverage` (
	`user_id` text NOT NULL,
	`vault_id` text NOT NULL,
	`created_at` text,
	PRIMARY KEY(`user_id`, `vault_id`),
	FOREIGN KEY (`vault_id`) REFERENCES `vaults`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_plan_coverage_user` ON `vault_plan_coverage` (`user_id`);--> statement-breakpoint
ALTER TABLE `vaults` DROP COLUMN `plan_id`;