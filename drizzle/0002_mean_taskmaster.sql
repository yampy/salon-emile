CREATE TABLE `model_answers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_n` integer NOT NULL,
	`question` text NOT NULL,
	`problematique` text NOT NULL,
	`these` text NOT NULL,
	`antithese` text NOT NULL,
	`depassement` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`session_n`) REFERENCES `sessions`(`n`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `model_answers_session_n_question_unique` ON `model_answers` (`session_n`,`question`);