CREATE TABLE `absence_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requesterId` int NOT NULL,
	`requestType` enum('absence','late') NOT NULL,
	`targetDate` date NOT NULL,
	`arrivalTime` time,
	`reason` text NOT NULL,
	`status` enum('pending','section_approved','teacher_approved','rejected') NOT NULL DEFAULT 'pending',
	`sectionLeaderApproverId` int,
	`sectionLeaderApprovedAt` timestamp,
	`sectionLeaderComment` text,
	`teacherApproverId` int,
	`teacherApprovedAt` timestamp,
	`teacherComment` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `absence_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `announcements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`authorId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`content` text NOT NULL,
	`category` enum('info','warning','important') NOT NULL DEFAULT 'info',
	`pinned` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `announcements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`eventDate` datetime NOT NULL,
	`venue` varchar(255),
	`type` enum('concert','competition','other') NOT NULL DEFAULT 'concert',
	`featured` boolean NOT NULL DEFAULT false,
	`createdById` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `lesson_visits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`instructorName` varchar(128) NOT NULL,
	`targetPart` varchar(128),
	`visitDate` date NOT NULL,
	`startTime` time,
	`endTime` time,
	`location` varchar(255),
	`notes` text,
	`createdById` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `lesson_visits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `practice_schedules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`practiceDate` date NOT NULL,
	`practiceType` enum('ensemble','individual','section') NOT NULL,
	`repertoire` text,
	`startTime` time,
	`endTime` time,
	`location` varchar(255),
	`notes` text,
	`createdById` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `practice_schedules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `schedules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`scheduleDate` date NOT NULL,
	`startTime` time,
	`endTime` time,
	`location` varchar(255),
	`type` enum('practice','event','lesson','concert','holiday') NOT NULL DEFAULT 'practice',
	`createdById` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `schedules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('admin','section_leader','member') NOT NULL DEFAULT 'member';--> statement-breakpoint
ALTER TABLE `users` ADD `part` varchar(64);