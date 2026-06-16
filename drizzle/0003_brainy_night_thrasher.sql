CREATE TABLE `municipality_teams` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`service_area` text NOT NULL,
	`ward_numbers` text NOT NULL,
	`contact_phone` text,
	`contact_email` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
DROP INDEX "users_email_unique";--> statement-breakpoint
ALTER TABLE `reports` ALTER COLUMN "status" TO "status" text NOT NULL DEFAULT 'pending';--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
ALTER TABLE `reports` ADD `assigned_team_id` integer REFERENCES municipality_teams(id);--> statement-breakpoint
ALTER TABLE `reports` ADD `assigned_by` integer REFERENCES users(id);--> statement-breakpoint
ALTER TABLE `reports` ADD `assignment_date` text;--> statement-breakpoint
ALTER TABLE `reports` ADD `ward_number` integer;--> statement-breakpoint
ALTER TABLE `reports` ADD `estimated_weight` real;--> statement-breakpoint
ALTER TABLE `users` ADD `admin_code` text;--> statement-breakpoint
ALTER TABLE `users` ADD `team_id` integer REFERENCES municipality_teams(id);