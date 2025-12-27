CREATE TABLE `content_manifest` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`manifest_url` text NOT NULL,
	`content_hash` text NOT NULL,
	`version` text,
	`last_checked_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `content_manifest_manifest_url_unique` ON `content_manifest` (`manifest_url`);--> statement-breakpoint
CREATE TABLE `media_content` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`uid` text NOT NULL,
	`url` text NOT NULL,
	`type` text NOT NULL,
	`category` text NOT NULL,
	`tags` text DEFAULT '[]',
	`name` text,
	`size` integer,
	`local_path` text,
	`downloaded_at` integer,
	`metadata` text,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `media_content_uid_unique` ON `media_content` (`uid`);--> statement-breakpoint
CREATE UNIQUE INDEX `media_content_url_unique` ON `media_content` (`url`);
