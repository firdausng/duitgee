ALTER TABLE `expenses` ADD `income_entry_id` text;--> statement-breakpoint
CREATE INDEX `idx_expenses_income_entry` ON `expenses` (`income_entry_id`);--> statement-breakpoint
ALTER TABLE `income_entries` ADD `base_amount` real;--> statement-breakpoint
ALTER TABLE `income_entries` ADD `allowances` text;--> statement-breakpoint
ALTER TABLE `income_entries` ADD `deductions` text;--> statement-breakpoint
ALTER TABLE `income_templates` ADD `default_allowances` text;--> statement-breakpoint
ALTER TABLE `income_templates` ADD `default_deductions` text;