CREATE TABLE `attempts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kind` text NOT NULL,
	`exercise_kind` text,
	`session_n` integer NOT NULL,
	`notion_id` text,
	`lesson_run_id` integer,
	`question` text NOT NULL,
	`answer` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`session_n`) REFERENCES `sessions`(`n`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`notion_id`) REFERENCES `notions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`lesson_run_id`) REFERENCES `lesson_runs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `cards` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`source_id` text NOT NULL,
	`prompt` text,
	`due` integer NOT NULL,
	`stability` real NOT NULL,
	`difficulty` real NOT NULL,
	`elapsed_days` real NOT NULL,
	`scheduled_days` real NOT NULL,
	`reps` integer NOT NULL,
	`lapses` integer NOT NULL,
	`learning_steps` integer NOT NULL,
	`state` integer NOT NULL,
	`last_review` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `curriculum_meta` (
	`id` text PRIMARY KEY NOT NULL,
	`version` text NOT NULL,
	`locale` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`generated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `evaluations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`attempt_id` integer NOT NULL,
	`scores` text NOT NULL,
	`evidence` text NOT NULL,
	`feedback` text NOT NULL,
	`missing_reperes` text NOT NULL,
	`missing_theses` text NOT NULL,
	`average_score` real NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`attempt_id`) REFERENCES `attempts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `final_essay_questions` (
	`id` text PRIMARY KEY NOT NULL,
	`position` integer NOT NULL,
	`question` text NOT NULL,
	`notion_id` text NOT NULL,
	FOREIGN KEY (`notion_id`) REFERENCES `notions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `lesson_runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_n` integer NOT NULL,
	`step` text DEFAULT 'intuition' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`completed_at` integer,
	FOREIGN KEY (`session_n`) REFERENCES `sessions`(`n`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `llm_usage` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`role` text NOT NULL,
	`model` text NOT NULL,
	`input_tokens` integer NOT NULL,
	`output_tokens` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `mastery` (
	`notion_id` text NOT NULL,
	`criterion` text NOT NULL,
	`value` real NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`notion_id`, `criterion`),
	FOREIGN KEY (`notion_id`) REFERENCES `notions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`lesson_run_id` integer NOT NULL,
	`role` text NOT NULL,
	`step` text NOT NULL,
	`content` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`lesson_run_id`) REFERENCES `lesson_runs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `notions` (
	`id` text PRIMARY KEY NOT NULL,
	`ja` text NOT NULL,
	`fr` text NOT NULL,
	`session` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `reperes` (
	`id` text PRIMARY KEY NOT NULL,
	`fr` text NOT NULL,
	`ja` text NOT NULL,
	`sessions` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `review_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`card_id` text NOT NULL,
	`answer` text NOT NULL,
	`score` real NOT NULL,
	`comment` text NOT NULL,
	`rating` integer NOT NULL,
	`reviewed_at` integer NOT NULL,
	FOREIGN KEY (`card_id`) REFERENCES `cards`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `rubric_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`focus` text NOT NULL,
	`position` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`n` integer PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`fr` text NOT NULL,
	`phase` text NOT NULL,
	`goal` text NOT NULL,
	`intro` text NOT NULL,
	`notes` text NOT NULL,
	`notion_ids` text NOT NULL,
	`questions` text NOT NULL,
	`core` text,
	`method` text,
	`exercise` text,
	`reperes_note` text,
	`bridge` text
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `theses` (
	`id` text PRIMARY KEY NOT NULL,
	`session_n` integer NOT NULL,
	`position` integer NOT NULL,
	`philosopher` text NOT NULL,
	`claim` text NOT NULL,
	FOREIGN KEY (`session_n`) REFERENCES `sessions`(`n`) ON UPDATE no action ON DELETE no action
);
