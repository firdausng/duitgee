ALTER TABLE `fund_policies` ADD `carry_over_balance` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `fund_policies` ADD `carry_over_fund_id` text REFERENCES funds(id);