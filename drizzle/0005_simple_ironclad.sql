ALTER TABLE `absence_requests` MODIFY COLUMN `requestType` enum('absence','late','early_leave','unexcused') NOT NULL;--> statement-breakpoint
ALTER TABLE `absence_requests` ADD `isManualRecord` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `absence_requests` ADD `recordedById` int;