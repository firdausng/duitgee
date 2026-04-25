ALTER TABLE `expenses` ADD `import_batch_id` text;--> statement-breakpoint
CREATE INDEX `idx_expenses_import_batch` ON `expenses` (`vault_id`,`import_batch_id`);