CREATE TABLE `assets` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`user_id` text NOT NULL,
	`kind` text DEFAULT 'client_upload' NOT NULL,
	`file_key` text NOT NULL,
	`file_name` text NOT NULL,
	`content_type` text,
	`size` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text,
	`business_name` text,
	`role` text DEFAULT 'client' NOT NULL,
	`brand_json` text DEFAULT '{}' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`business_name` text NOT NULL,
	`title` text NOT NULL,
	`service` text NOT NULL,
	`status` text DEFAULT 'awaiting_payment' NOT NULL,
	`payment_status` text DEFAULT 'pending' NOT NULL,
	`amount_cents` integer,
	`brief_json` text DEFAULT '{}' NOT NULL,
	`due_start` text,
	`due_end` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
