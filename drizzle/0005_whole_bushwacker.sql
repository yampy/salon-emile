DROP TABLE `messages`;--> statement-breakpoint
DROP TABLE `lesson_runs`;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_attempts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kind` text NOT NULL,
	`exercise_kind` text,
	`session_n` integer NOT NULL,
	`notion_id` text,
	`question` text NOT NULL,
	`answer` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`session_n`) REFERENCES `sessions`(`n`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`notion_id`) REFERENCES `notions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_attempts`("id", "kind", "exercise_kind", "session_n", "notion_id", "question", "answer", "created_at") SELECT "id", "kind", "exercise_kind", "session_n", "notion_id", "question", "answer", "created_at" FROM `attempts`;--> statement-breakpoint
DROP TABLE `attempts`;--> statement-breakpoint
ALTER TABLE `__new_attempts` RENAME TO `attempts`;--> statement-breakpoint
PRAGMA foreign_keys=ON;