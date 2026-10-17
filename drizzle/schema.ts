import {
  boolean,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  datetime,
} from "drizzle-orm/mysql-core";

// ─── Users ────────────────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 384 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }).unique(),
  loginMethod: varchar("loginMethod", { length: 64 }),
  /** メール/パスワード認証用 bcryptハッシュ */
  passwordHash: varchar("passwordHash", { length: 255 }),
  /** Legacy single-role value retained for compatibility with existing accounts. */
  role: mysqlEnum("role", ["admin", "section_leader", "member"]).default("member").notNull(),
  /** 所属パート (e.g. Flute, Clarinet, Trumpet …) */
  part: varchar("part", { length: 64 }),
  /** These responsibilities can be combined on the same account. */
  isTeacher: boolean("isTeacher").default(false).notNull(),
  isPresident: boolean("isPresident").default(false).notNull(),
  isSectionLeader: boolean("isSectionLeader").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Announcements (連絡事項) ──────────────────────────────────────────────────
export const announcements = mysqlTable("announcements", {
  id: int("id").autoincrement().primaryKey(),
  authorId: int("authorId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  /** info | warning | important */
  category: mysqlEnum("category", ["info", "warning", "important"]).default("info").notNull(),
  pinned: boolean("pinned").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Announcement = typeof announcements.$inferSelect;
export type InsertAnnouncement = typeof announcements.$inferInsert;

// ─── Schedules (月間・週間スケジュール) ────────────────────────────────────────
export const schedules = mysqlTable("schedules", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  scheduleDate: varchar("scheduleDate", { length: 10 }).notNull(),
  startTime: varchar("startTime", { length: 8 }),
  endTime: varchar("endTime", { length: 8 }),
  location: varchar("location", { length: 255 }),
  /** practice | event | lesson | concert | holiday */
  type: mysqlEnum("type", ["practice", "event", "lesson", "concert", "holiday"]).default("practice").notNull(),
  createdById: int("createdById").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Schedule = typeof schedules.$inferSelect;
export type InsertSchedule = typeof schedules.$inferInsert;

// ─── Lesson Visits (レッスン講師来訪) ─────────────────────────────────────────
export const lessonVisits = mysqlTable("lesson_visits", {
  id: int("id").autoincrement().primaryKey(),
  instructorName: varchar("instructorName", { length: 128 }).notNull(),
  /** 担当パート */
  targetPart: varchar("targetPart", { length: 128 }),
  visitDate: varchar("visitDate", { length: 10 }).notNull(),
  startTime: varchar("startTime", { length: 8 }),
  endTime: varchar("endTime", { length: 8 }),
  location: varchar("location", { length: 255 }),
  notes: text("notes"),
  createdById: int("createdById").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LessonVisit = typeof lessonVisits.$inferSelect;
export type InsertLessonVisit = typeof lessonVisits.$inferInsert;

// ─── Events / Concerts (演奏会・イベント) ─────────────────────────────────────
export const events = mysqlTable("events", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  eventDate: datetime("eventDate").notNull(),
  venue: varchar("venue", { length: 255 }),
  /** concert | competition | other */
  type: mysqlEnum("type", ["concert", "competition", "other"]).default("concert").notNull(),
  featured: boolean("featured").default(false).notNull(),
  createdById: int("createdById").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Event = typeof events.$inferSelect;
export type InsertEvent = typeof events.$inferInsert;

// ─── Today's Practice (本日の練習予定) ────────────────────────────────────────
export const practiceSchedules = mysqlTable("practice_schedules", {
  id: int("id").autoincrement().primaryKey(),
  practiceDate: varchar("practiceDate", { length: 10 }).notNull(),
  practiceType: mysqlEnum("practiceType", ["ensemble", "individual", "section"]).notNull(),
  /** 合奏の場合の曲目 */
  repertoire: text("repertoire"),
  startTime: varchar("startTime", { length: 8 }),
  endTime: varchar("endTime", { length: 8 }),
  location: varchar("location", { length: 255 }),
  notes: text("notes"),
  createdById: int("createdById").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PracticeSchedule = typeof practiceSchedules.$inferSelect;
export type InsertPracticeSchedule = typeof practiceSchedules.$inferInsert;

// ─── Absence Requests (遅刻・欠席申請) ────────────────────────────────────────
export const absenceRequests = mysqlTable("absence_requests", {
  id: int("id").autoincrement().primaryKey(),
  requesterId: int("requesterId").notNull(),
  /** absence | late | early_leave | unexcused */
  requestType: mysqlEnum("requestType", ["absence", "late", "early_leave", "unexcused"]).notNull(),
  targetDate: varchar("targetDate", { length: 10 }).notNull(),
  /** 遅刻の場合の到着予定時刻 */
  arrivalTime: varchar("arrivalTime", { length: 8 }),
  /** 早退の場合の退出予定時刻 */
  leaveTime: varchar("leaveTime", { length: 8 }),
  reason: text("reason").notNull(),
  /** pending | section_approved | president_approved | teacher_approved | rejected */
  status: mysqlEnum("status", ["pending", "section_approved", "president_approved", "teacher_approved", "rejected"]).default("pending").notNull(),
  /** パートリーダーの承認者ID */
  sectionLeaderApproverId: int("sectionLeaderApproverId"),
  sectionLeaderApprovedAt: timestamp("sectionLeaderApprovedAt"),
  sectionLeaderComment: text("sectionLeaderComment"),
  /** 部長の二次承認 */
  presidentApproverId: int("presidentApproverId"),
  presidentApprovedAt: timestamp("presidentApprovedAt"),
  presidentComment: text("presidentComment"),
  /** 先生の承認者ID */
  teacherApproverId: int("teacherApproverId"),
  teacherApprovedAt: timestamp("teacherApprovedAt"),
  teacherComment: text("teacherComment"),
  /** True when a president/teacher logs an attendance issue on a member's behalf. */
  isManualRecord: boolean("isManualRecord").default(false).notNull(),
  /** The management account that entered a manual record, if applicable. */
  recordedById: int("recordedById"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AbsenceRequest = typeof absenceRequests.$inferSelect;
export type InsertAbsenceRequest = typeof absenceRequests.$inferInsert;
