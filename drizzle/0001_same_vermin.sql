CREATE TABLE `cleanup_drives` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`organization_id` integer NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`location` text NOT NULL,
	`scheduled_date` text NOT NULL,
	`duration_hours` integer,
	`max_participants` integer,
	`current_participants` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'upcoming' NOT NULL,
	`created_by_user_id` integer NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `drive_participants` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`drive_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`status` text DEFAULT 'registered' NOT NULL,
	`joined_at` text NOT NULL,
	FOREIGN KEY (`drive_id`) REFERENCES `cleanup_drives`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`description` text,
	`contact_email` text NOT NULL,
	`contact_phone` text,
	`created_by_user_id` integer NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `reports` ADD `biodegradable` text NOT NULL;