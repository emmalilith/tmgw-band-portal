ALTER TABLE `users` MODIFY COLUMN `openId` varchar(384) NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_email_unique` UNIQUE(`email`);