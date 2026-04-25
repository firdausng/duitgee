CREATE TABLE `attachments` (
	`id` text PRIMARY KEY NOT NULL,
	`vault_id` text NOT NULL,
	`file_name` text NOT NULL,
	`mime_type` text NOT NULL,
	`file_size` integer NOT NULL,
	`r2_key` text NOT NULL,
	`created_at` text,
	`created_by` text NOT NULL,
	`deleted_at` text,
	`deleted_by` text,
	FOREIGN KEY (`vault_id`) REFERENCES `vaults`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_attachments_vault` ON `attachments` (`vault_id`);--> statement-breakpoint
CREATE TABLE `expense_attachments` (
	`expense_id` text NOT NULL,
	`attachment_id` text NOT NULL,
	`created_at` text,
	`created_by` text NOT NULL,
	PRIMARY KEY(`expense_id`, `attachment_id`),
	FOREIGN KEY (`expense_id`) REFERENCES `expenses`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`attachment_id`) REFERENCES `attachments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_expense_attachments_attachment` ON `expense_attachments` (`attachment_id`);