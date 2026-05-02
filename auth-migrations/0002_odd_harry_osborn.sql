PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`role` text,
	`banned` integer DEFAULT false,
	`ban_reason` text,
	`ban_expires` integer,
	`is_anonymous` integer DEFAULT false,
	`plan_id` text DEFAULT 'plan_free'
);
--> statement-breakpoint
INSERT INTO `__new_user`("id", "name", "email", "email_verified", "image", "created_at", "updated_at", "role", "banned", "ban_reason", "ban_expires", "is_anonymous", "plan_id") SELECT "id", "name", "email", "email_verified", "image", "created_at", "updated_at", "role", "banned", "ban_reason", "ban_expires", "is_anonymous", "plan_id" FROM `user`;--> statement-breakpoint
DROP TABLE `user`;--> statement-breakpoint
ALTER TABLE `__new_user` RENAME TO `user`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
--ALTER TABLE `invitation` ADD `created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL;--> statement-breakpoint
-- CREATE INDEX `invitation_organizationId_idx` ON `invitation` (`organization_id`);--> statement-breakpoint
-- CREATE INDEX `invitation_email_idx` ON `invitation` (`email`);--> statement-breakpoint
-- CREATE INDEX `account_userId_idx` ON `account` (`user_id`);--> statement-breakpoint
-- CREATE INDEX `member_organizationId_idx` ON `member` (`organization_id`);--> statement-breakpoint
-- CREATE INDEX `member_userId_idx` ON `member` (`user_id`);--> statement-breakpoint
-- CREATE INDEX `session_userId_idx` ON `session` (`user_id`);--> statement-breakpoint
-- CREATE INDEX `team_organizationId_idx` ON `team` (`organization_id`);--> statement-breakpoint
-- CREATE INDEX `teamMember_teamId_idx` ON `team_member` (`team_id`);--> statement-breakpoint
-- CREATE INDEX `teamMember_userId_idx` ON `team_member` (`user_id`);--> statement-breakpoint
-- CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);