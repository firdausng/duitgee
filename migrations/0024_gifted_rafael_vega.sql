ALTER TABLE `recurring_expenses` ADD `previous_rule_id` text;--> statement-breakpoint
CREATE INDEX `idx_recurring_expenses_previous` ON `recurring_expenses` (`previous_rule_id`);