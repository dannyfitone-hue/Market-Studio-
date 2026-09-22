CREATE INDEX `idx_assets_project` ON `assets` (`project_id`);--> statement-breakpoint
CREATE INDEX `idx_projects_user_created` ON `projects` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_projects_status` ON `projects` (`status`);