CREATE TABLE `statistics_insights` (
	`id` text PRIMARY KEY NOT NULL,
	`vault_id` text NOT NULL,
	`period_start` text NOT NULL,
	`period_end` text NOT NULL,
	`cache_key` text NOT NULL,
	`payload` text NOT NULL,
	`input_token_count` integer,
	`output_token_count` integer,
	`model` text NOT NULL,
	`generated_at` text NOT NULL,
	`generated_by` text NOT NULL,
	FOREIGN KEY (`vault_id`) REFERENCES `vaults`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_insights_vault_range` ON `statistics_insights` (`vault_id`,`period_start`,`period_end`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_insights_cache_key` ON `statistics_insights` (`cache_key`);