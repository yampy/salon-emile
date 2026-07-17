CREATE TABLE `session_readings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_n` integer NOT NULL,
	`content` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`session_n`) REFERENCES `sessions`(`n`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_readings_session_n_unique` ON `session_readings` (`session_n`);