CREATE INDEX `idx_expenses_vault_date` ON `expenses` (`vault_id`,`date`);--> statement-breakpoint
CREATE INDEX `idx_expenses_vault_paid_by` ON `expenses` (`vault_id`,`user_id`);