ALTER TABLE `absence_requests` MODIFY COLUMN `status` enum('pending','section_approved','president_approved','teacher_approved','rejected') NOT NULL DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE `absence_requests` ADD `presidentApproverId` int;--> statement-breakpoint
ALTER TABLE `absence_requests` ADD `presidentApprovedAt` timestamp;--> statement-breakpoint
ALTER TABLE `absence_requests` ADD `presidentComment` text;--> statement-breakpoint
ALTER TABLE `users` ADD `isTeacher` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `isPresident` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `isSectionLeader` boolean DEFAULT false NOT NULL;--> statement-breakpoint
UPDATE `users` SET `isPresident` = true WHERE `role` = 'admin';--> statement-breakpoint
UPDATE `users` SET `isSectionLeader` = true WHERE `role` = 'section_leader';
