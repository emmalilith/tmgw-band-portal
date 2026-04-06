ALTER TABLE `absence_requests` MODIFY COLUMN `requestType` enum('absence','late','early_leave') NOT NULL;--> statement-breakpoint
ALTER TABLE `absence_requests` MODIFY COLUMN `targetDate` varchar(10) NOT NULL;--> statement-breakpoint
ALTER TABLE `absence_requests` MODIFY COLUMN `arrivalTime` varchar(8);--> statement-breakpoint
ALTER TABLE `lesson_visits` MODIFY COLUMN `visitDate` varchar(10) NOT NULL;--> statement-breakpoint
ALTER TABLE `lesson_visits` MODIFY COLUMN `startTime` varchar(8);--> statement-breakpoint
ALTER TABLE `lesson_visits` MODIFY COLUMN `endTime` varchar(8);--> statement-breakpoint
ALTER TABLE `practice_schedules` MODIFY COLUMN `practiceDate` varchar(10) NOT NULL;--> statement-breakpoint
ALTER TABLE `practice_schedules` MODIFY COLUMN `startTime` varchar(8);--> statement-breakpoint
ALTER TABLE `practice_schedules` MODIFY COLUMN `endTime` varchar(8);--> statement-breakpoint
ALTER TABLE `schedules` MODIFY COLUMN `scheduleDate` varchar(10) NOT NULL;--> statement-breakpoint
ALTER TABLE `schedules` MODIFY COLUMN `startTime` varchar(8);--> statement-breakpoint
ALTER TABLE `schedules` MODIFY COLUMN `endTime` varchar(8);--> statement-breakpoint
ALTER TABLE `absence_requests` ADD `leaveTime` varchar(8);--> statement-breakpoint
ALTER TABLE `users` ADD `passwordHash` varchar(255);