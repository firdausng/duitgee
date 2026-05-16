ALTER TABLE `income_templates` ADD `previous_template_id` text;--> statement-breakpoint
ALTER TABLE `income_templates` ADD `ended_at` text;--> statement-breakpoint
CREATE INDEX `idx_income_templates_previous` ON `income_templates` (`previous_template_id`);