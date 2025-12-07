CREATE TABLE `libraries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`uid` text NOT NULL,
	`name` text NOT NULL,
	`is_default` integer DEFAULT false,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `libraries_uid_unique` ON `libraries` (`uid`);--> statement-breakpoint
CREATE TABLE `media_assets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`uid` text NOT NULL,
	`library_id` integer NOT NULL,
	`name` text NOT NULL,
	`file_path` text NOT NULL,
	`type` text NOT NULL,
	`duration` integer,
	`created_at` integer,
	FOREIGN KEY (`library_id`) REFERENCES `libraries`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `media_assets_uid_unique` ON `media_assets` (`uid`);