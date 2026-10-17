// server/vercel.ts
import "dotenv/config";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// server/_core/localAuth.ts
import bcrypt from "bcryptjs";

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";

// server/_core/localAuth.ts
import { SignJWT, jwtVerify } from "jose";

// server/db.ts
import { and, desc, eq, gte, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { createPool } from "mysql2/promise";

// drizzle/schema.ts
import {
  boolean,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  datetime
} from "drizzle-orm/mysql-core";
var users = mysqlTable("users", {
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
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull()
});
var announcements = mysqlTable("announcements", {
  id: int("id").autoincrement().primaryKey(),
  authorId: int("authorId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  /** info | warning | important */
  category: mysqlEnum("category", ["info", "warning", "important"]).default("info").notNull(),
  pinned: boolean("pinned").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var schedules = mysqlTable("schedules", {
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var lessonVisits = mysqlTable("lesson_visits", {
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var events = mysqlTable("events", {
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var practiceSchedules = mysqlTable("practice_schedules", {
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var absenceRequests = mysqlTable("absence_requests", {
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});

// server/_core/env.ts
var ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  adminEmail: (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase(),
  databaseUrl: process.env.DATABASE_URL ?? "",
  databaseSsl: process.env.DATABASE_SSL === "true",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? ""
};

// server/db.ts
var _db = null;
function needsTls(databaseUrl) {
  const hostname = new URL(databaseUrl).hostname;
  return ENV.databaseSsl || hostname.endsWith("tidbcloud.com");
}
async function getDb() {
  if (!_db && ENV.databaseUrl) {
    try {
      const url = new URL(ENV.databaseUrl);
      const pool = createPool({
        host: url.hostname,
        port: Number(url.port || 3306),
        user: decodeURIComponent(url.username),
        password: decodeURIComponent(url.password),
        database: decodeURIComponent(url.pathname.replace(/^\//, "")),
        waitForConnections: true,
        connectionLimit: 5,
        ssl: needsTls(ENV.databaseUrl) ? { minVersion: "TLSv1.2", rejectUnauthorized: true } : void 0
      });
      _db = drizzle({ client: pool });
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}
async function upsertUser(user) {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values = { openId: user.openId };
  const updateSet = {};
  const textFields = ["name", "email", "loginMethod", "passwordHash", "part"];
  for (const field of textFields) {
    const value = user[field];
    if (value === void 0) continue;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  }
  if (user.lastSignedIn !== void 0) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== void 0) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  const responsibilityFields = ["isTeacher", "isPresident", "isSectionLeader"];
  for (const field of responsibilityFields) {
    if (user[field] === void 0) continue;
    values[field] = user[field];
    updateSet[field] = user[field];
  }
  if (!values.lastSignedIn) values.lastSignedIn = /* @__PURE__ */ new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = /* @__PURE__ */ new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}
async function getUserByOpenId(openId) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}
async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(users.name);
}
async function updateUserPart(userId, part) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ part: part?.trim() || null }).where(eq(users.id, userId));
}
async function getUserById(userId) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return result[0];
}
async function getOrganizerCount() {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql`count(*)` }).from(users).where(eq(users.isPresident, true));
  return Number(result[0]?.count ?? 0);
}
async function updateUserResponsibilities(userId, responsibilities) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set(responsibilities).where(eq(users.id, userId));
}
async function deleteUserAccount(userId) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(absenceRequests).where(eq(absenceRequests.requesterId, userId));
  await db.delete(users).where(eq(users.id, userId));
}
var approvedStatus = sql`'teacher_approved'`;
var absenceTotal = sql`COALESCE(SUM(CASE WHEN ${absenceRequests.status} = ${approvedStatus} AND ${absenceRequests.requestType} IN ('absence', 'unexcused') THEN 1 ELSE 0 END), 0)`;
var lateTotal = sql`COALESCE(SUM(CASE WHEN ${absenceRequests.status} = ${approvedStatus} AND ${absenceRequests.requestType} = 'late' THEN 1 ELSE 0 END), 0)`;
var earlyLeaveTotal = sql`COALESCE(SUM(CASE WHEN ${absenceRequests.status} = ${approvedStatus} AND ${absenceRequests.requestType} = 'early_leave' THEN 1 ELSE 0 END), 0)`;
var unexcusedTotal = sql`COALESCE(SUM(CASE WHEN ${absenceRequests.status} = ${approvedStatus} AND ${absenceRequests.requestType} = 'unexcused' THEN 1 ELSE 0 END), 0)`;
var attendanceTotal = sql`COALESCE(SUM(CASE WHEN ${absenceRequests.status} = ${approvedStatus} THEN 1 ELSE 0 END), 0)`;
async function getAttendanceStatsForUser(userId) {
  const db = await getDb();
  if (!db) return { absenceCount: 0, lateCount: 0, earlyLeaveCount: 0, unexcusedCount: 0, totalCount: 0 };
  const result = await db.select({
    absenceCount: absenceTotal,
    lateCount: lateTotal,
    earlyLeaveCount: earlyLeaveTotal,
    unexcusedCount: unexcusedTotal,
    totalCount: attendanceTotal
  }).from(absenceRequests).where(eq(absenceRequests.requesterId, userId));
  const stats = result[0];
  return {
    absenceCount: Number(stats?.absenceCount ?? 0),
    lateCount: Number(stats?.lateCount ?? 0),
    earlyLeaveCount: Number(stats?.earlyLeaveCount ?? 0),
    unexcusedCount: Number(stats?.unexcusedCount ?? 0),
    totalCount: Number(stats?.totalCount ?? 0)
  };
}
async function getAttendanceStatsForAllUsers() {
  const db = await getDb();
  if (!db) return [];
  const result = await db.select({
    userId: users.id,
    name: users.name,
    email: users.email,
    part: users.part,
    role: users.role,
    absenceCount: absenceTotal,
    lateCount: lateTotal,
    earlyLeaveCount: earlyLeaveTotal,
    unexcusedCount: unexcusedTotal,
    totalCount: attendanceTotal
  }).from(users).leftJoin(absenceRequests, eq(absenceRequests.requesterId, users.id)).groupBy(users.id, users.name, users.email, users.part, users.role).orderBy(desc(attendanceTotal), users.name);
  return result.map((stats) => ({
    ...stats,
    absenceCount: Number(stats.absenceCount ?? 0),
    lateCount: Number(stats.lateCount ?? 0),
    earlyLeaveCount: Number(stats.earlyLeaveCount ?? 0),
    unexcusedCount: Number(stats.unexcusedCount ?? 0),
    totalCount: Number(stats.totalCount ?? 0)
  }));
}
async function getAnnouncements() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(announcements).orderBy(desc(announcements.pinned), desc(announcements.createdAt));
}
async function createAnnouncement(data) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(announcements).values(data);
}
async function updateAnnouncement(id, data) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(announcements).set(data).where(eq(announcements.id, id));
}
async function deleteAnnouncement(id) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(announcements).where(eq(announcements.id, id));
}
async function getSchedulesByMonth(year, month) {
  const db = await getDb();
  if (!db) return [];
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const end = `${year}-${String(month).padStart(2, "0")}-31`;
  return db.select().from(schedules).where(and(sql`${schedules.scheduleDate} >= ${start}`, sql`${schedules.scheduleDate} <= ${end}`)).orderBy(schedules.scheduleDate);
}
async function getSchedulesByWeek(startDate, endDate) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(schedules).where(and(sql`${schedules.scheduleDate} >= ${startDate}`, sql`${schedules.scheduleDate} <= ${endDate}`)).orderBy(schedules.scheduleDate, schedules.startTime);
}
async function createSchedule(data) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(schedules).values(data);
}
async function createSchedules(data) {
  if (data.length === 0) return;
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(schedules).values(data);
}
async function updateSchedule(id, data) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(schedules).set(data).where(eq(schedules.id, id));
}
async function deleteSchedule(id) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(schedules).where(eq(schedules.id, id));
}
async function getLessonVisits() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(lessonVisits).orderBy(lessonVisits.visitDate);
}
async function getUpcomingLessonVisits() {
  const db = await getDb();
  if (!db) return [];
  const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  return db.select().from(lessonVisits).where(sql`${lessonVisits.visitDate} >= ${today}`).orderBy(lessonVisits.visitDate);
}
async function createLessonVisit(data) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(lessonVisits).values(data);
}
async function updateLessonVisit(id, data) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(lessonVisits).set(data).where(eq(lessonVisits.id, id));
}
async function deleteLessonVisit(id) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(lessonVisits).where(eq(lessonVisits.id, id));
}
async function getEvents() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(events).orderBy(events.eventDate);
}
async function getUpcomingEvents() {
  const db = await getDb();
  if (!db) return [];
  const now = /* @__PURE__ */ new Date();
  return db.select().from(events).where(gte(events.eventDate, now)).orderBy(events.eventDate);
}
async function getFeaturedEvent() {
  const db = await getDb();
  if (!db) return null;
  const now = /* @__PURE__ */ new Date();
  const result = await db.select().from(events).where(and(eq(events.featured, true), gte(events.eventDate, now))).orderBy(events.eventDate).limit(1);
  return result[0] ?? null;
}
async function createEvent(data) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(events).values(data);
}
async function updateEvent(id, data) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(events).set(data).where(eq(events.id, id));
}
async function deleteEvent(id) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(events).where(eq(events.id, id));
}
async function getPracticeByDate(date) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(practiceSchedules).where(sql`${practiceSchedules.practiceDate} = ${date}`).orderBy(practiceSchedules.startTime);
}
async function createPracticeSchedule(data) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(practiceSchedules).values(data);
}
async function updatePracticeSchedule(id, data) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(practiceSchedules).set(data).where(eq(practiceSchedules.id, id));
}
async function deletePracticeSchedule(id) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(practiceSchedules).where(eq(practiceSchedules.id, id));
}
async function getAbsenceRequestsByUser(userId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(absenceRequests).where(eq(absenceRequests.requesterId, userId)).orderBy(desc(absenceRequests.createdAt));
}
var absenceRequestWithMemberFields = {
  id: absenceRequests.id,
  requesterId: absenceRequests.requesterId,
  requestType: absenceRequests.requestType,
  targetDate: absenceRequests.targetDate,
  arrivalTime: absenceRequests.arrivalTime,
  leaveTime: absenceRequests.leaveTime,
  reason: absenceRequests.reason,
  status: absenceRequests.status,
  sectionLeaderApproverId: absenceRequests.sectionLeaderApproverId,
  sectionLeaderApprovedAt: absenceRequests.sectionLeaderApprovedAt,
  sectionLeaderComment: absenceRequests.sectionLeaderComment,
  presidentApproverId: absenceRequests.presidentApproverId,
  presidentApprovedAt: absenceRequests.presidentApprovedAt,
  presidentComment: absenceRequests.presidentComment,
  teacherApproverId: absenceRequests.teacherApproverId,
  teacherApprovedAt: absenceRequests.teacherApprovedAt,
  teacherComment: absenceRequests.teacherComment,
  isManualRecord: absenceRequests.isManualRecord,
  recordedById: absenceRequests.recordedById,
  createdAt: absenceRequests.createdAt,
  updatedAt: absenceRequests.updatedAt,
  requesterName: users.name,
  requesterEmail: users.email,
  requesterPart: users.part
};
async function getPendingAbsenceRequestsForPart(part) {
  const normalizedPart = part?.trim();
  if (!normalizedPart) return [];
  const db = await getDb();
  if (!db) return [];
  return db.select(absenceRequestWithMemberFields).from(absenceRequests).innerJoin(users, eq(absenceRequests.requesterId, users.id)).where(and(eq(absenceRequests.status, "pending"), eq(users.part, normalizedPart))).orderBy(desc(absenceRequests.createdAt));
}
async function getPendingAbsenceRequestsForPresident() {
  const db = await getDb();
  if (!db) return [];
  return db.select(absenceRequestWithMemberFields).from(absenceRequests).innerJoin(users, eq(absenceRequests.requesterId, users.id)).where(eq(absenceRequests.status, "section_approved")).orderBy(desc(absenceRequests.createdAt));
}
async function getPendingAbsenceRequestsForTeacher() {
  const db = await getDb();
  if (!db) return [];
  return db.select(absenceRequestWithMemberFields).from(absenceRequests).innerJoin(users, eq(absenceRequests.requesterId, users.id)).where(eq(absenceRequests.status, "president_approved")).orderBy(desc(absenceRequests.createdAt));
}
async function getAllAbsenceRequests() {
  const db = await getDb();
  if (!db) return [];
  return db.select(absenceRequestWithMemberFields).from(absenceRequests).innerJoin(users, eq(absenceRequests.requesterId, users.id)).orderBy(desc(absenceRequests.createdAt));
}
async function getAbsenceRequestWithRequesterById(id) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select(absenceRequestWithMemberFields).from(absenceRequests).innerJoin(users, eq(absenceRequests.requesterId, users.id)).where(eq(absenceRequests.id, id)).limit(1);
  return result[0];
}
async function createAbsenceRequest(data) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(absenceRequests).values(data);
}
async function createManualAttendanceRecord(data) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(absenceRequests).values({
    ...data,
    status: "teacher_approved",
    isManualRecord: true
  });
}
async function getAvailabilityByMonth(year, month) {
  const db = await getDb();
  if (!db) return [];
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const endExclusive = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const records = await db.select({
    id: absenceRequests.id,
    requesterId: absenceRequests.requesterId,
    requestType: absenceRequests.requestType,
    targetDate: absenceRequests.targetDate,
    arrivalTime: absenceRequests.arrivalTime,
    leaveTime: absenceRequests.leaveTime,
    reason: absenceRequests.reason,
    status: absenceRequests.status,
    isManualRecord: absenceRequests.isManualRecord,
    recordedById: absenceRequests.recordedById,
    requesterName: users.name,
    requesterPart: users.part
  }).from(absenceRequests).innerJoin(users, eq(absenceRequests.requesterId, users.id)).where(and(
    or(
      eq(absenceRequests.status, "pending"),
      eq(absenceRequests.status, "section_approved"),
      eq(absenceRequests.status, "president_approved"),
      eq(absenceRequests.status, "teacher_approved")
    ),
    sql`${absenceRequests.targetDate} >= ${start}`,
    sql`${absenceRequests.targetDate} < ${endExclusive}`
  )).orderBy(absenceRequests.targetDate, absenceRequests.requestType, users.part, users.name);
  const grouped = /* @__PURE__ */ new Map();
  for (const record of records) {
    const current = grouped.get(record.targetDate) ?? [];
    current.push(record);
    grouped.set(record.targetDate, current);
  }
  return Array.from(grouped, ([date, dayRecords]) => ({
    date,
    unavailableCount: new Set(dayRecords.map((record) => record.requesterId)).size,
    absenceCount: dayRecords.filter((record) => record.requestType === "absence" || record.requestType === "unexcused").length,
    unexcusedCount: dayRecords.filter((record) => record.requestType === "unexcused").length,
    lateCount: dayRecords.filter((record) => record.requestType === "late").length,
    earlyLeaveCount: dayRecords.filter((record) => record.requestType === "early_leave").length,
    records: dayRecords
  }));
}
async function updateAbsenceRequest(id, data) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(absenceRequests).set(data).where(eq(absenceRequests.id, id));
}
async function getEnsembleAttendanceByDate(date) {
  const db = await getDb();
  if (!db) return { practice: null, absences: [] };
  const practiceRows = await db.select().from(practiceSchedules).where(
    and(
      sql`${practiceSchedules.practiceDate} = ${date}`,
      eq(practiceSchedules.practiceType, "ensemble")
    )
  ).limit(1);
  const practice = practiceRows[0] ?? null;
  if (!practice) return { practice: null, absences: [] };
  const absenceRows = await db.select({
    id: absenceRequests.id,
    requestType: absenceRequests.requestType,
    targetDate: absenceRequests.targetDate,
    arrivalTime: absenceRequests.arrivalTime,
    leaveTime: absenceRequests.leaveTime,
    reason: absenceRequests.reason,
    status: absenceRequests.status,
    isManualRecord: absenceRequests.isManualRecord,
    createdAt: absenceRequests.createdAt,
    requesterName: users.name,
    requesterPart: users.part,
    requesterId: users.id
  }).from(absenceRequests).innerJoin(users, eq(absenceRequests.requesterId, users.id)).where(
    and(
      sql`${absenceRequests.targetDate} = ${date}`,
      eq(absenceRequests.status, "teacher_approved")
    )
  ).orderBy(absenceRequests.requestType, users.part, users.name);
  return { practice, absences: absenceRows };
}
async function getEnsembleDatesWithAbsences(yearMonth) {
  const db = await getDb();
  if (!db) return [];
  const start = `${yearMonth}-01`;
  const end = `${yearMonth}-31`;
  const practiceRows = await db.select({ practiceDate: practiceSchedules.practiceDate }).from(practiceSchedules).where(
    and(
      eq(practiceSchedules.practiceType, "ensemble"),
      sql`${practiceSchedules.practiceDate} >= ${start}`,
      sql`${practiceSchedules.practiceDate} <= ${end}`
    )
  ).orderBy(practiceSchedules.practiceDate);
  return practiceRows.map((r) => r.practiceDate);
}
async function getUserByEmail(email) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result[0];
}

// server/_core/cookies.ts
function isSecureRequest(req) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}
function getSessionCookieOptions(req) {
  return {
    httpOnly: true,
    path: "/",
    // The client and API are served by the same Express origin in development
    // and production. Lax works over local HTTP and protects against CSRF.
    sameSite: "lax",
    secure: isSecureRequest(req)
  };
}

// server/_core/localAuth.ts
import { parse as parseCookieHeader } from "cookie";
function getSecret() {
  if (!ENV.cookieSecret) {
    throw new Error("JWT_SECRET must be set before local authentication can be used");
  }
  return new TextEncoder().encode(ENV.cookieSecret);
}
async function signSession(openId, name) {
  const expiresAt = Math.floor((Date.now() + ONE_YEAR_MS) / 1e3);
  return new SignJWT({ openId, appId: ENV.appId || "band-portal", name }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime(expiresAt).sign(getSecret());
}
async function verifySession(cookieValue) {
  if (!cookieValue) return null;
  try {
    const { payload } = await jwtVerify(cookieValue, getSecret(), { algorithms: ["HS256"] });
    const openId = payload.openId;
    if (!openId) return null;
    return { openId };
  } catch {
    return null;
  }
}
async function authenticateRequest(req) {
  const cookies = parseCookieHeader(req.headers.cookie ?? "");
  const sessionCookie = cookies[COOKIE_NAME];
  const session = await verifySession(sessionCookie);
  if (!session) throw new Error("Invalid session");
  const user = await getUserByOpenId(session.openId);
  if (!user) throw new Error("User not found");
  return user;
}
function registerLocalAuthRoutes(app2) {
  app2.post("/api/auth/register", async (req, res) => {
    const { name, email, password, part } = req.body ?? {};
    const normalizedName = typeof name === "string" ? name.trim() : "";
    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    if (!normalizedName || !normalizedEmail || typeof password !== "string") {
      res.status(400).json({ error: "name, email and password are required" });
      return;
    }
    if (password.length < 8) {
      res.status(400).json({ error: "\u30D1\u30B9\u30EF\u30FC\u30C9\u306F8\u6587\u5B57\u4EE5\u4E0A\u3067\u8A2D\u5B9A\u3057\u3066\u304F\u3060\u3055\u3044" });
      return;
    }
    try {
      const allUsers = await getAllUsers();
      const isFirstUser = allUsers.length === 0;
      const existing = await getUserByEmail(normalizedEmail);
      if (existing) {
        res.status(409).json({ error: "\u3053\u306E\u30E1\u30FC\u30EB\u30A2\u30C9\u30EC\u30B9\u306F\u3059\u3067\u306B\u767B\u9332\u3055\u308C\u3066\u3044\u307E\u3059" });
        return;
      }
      const passwordHash = await bcrypt.hash(password, 12);
      const openId = `local:${normalizedEmail}`;
      const role = ENV.adminEmail === normalizedEmail || !ENV.adminEmail && isFirstUser ? "admin" : "member";
      const isInitialManager = role === "admin";
      await upsertUser({
        openId,
        name: normalizedName,
        email: normalizedEmail,
        loginMethod: "email",
        passwordHash,
        part: part ?? null,
        role,
        isPresident: isInitialManager,
        lastSignedIn: /* @__PURE__ */ new Date()
      });
      const user = await getUserByOpenId(openId);
      if (!user) {
        res.status(500).json({ error: "\u30E6\u30FC\u30B6\u30FC\u4F5C\u6210\u306B\u5931\u6557\u3057\u307E\u3057\u305F" });
        return;
      }
      const token = await signSession(openId, normalizedName);
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.json({ success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    } catch (error) {
      console.error("[LocalAuth] Register failed", error);
      res.status(500).json({ error: "\u767B\u9332\u306B\u5931\u6557\u3057\u307E\u3057\u305F" });
    }
  });
  app2.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body ?? {};
    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    if (!normalizedEmail || typeof password !== "string") {
      res.status(400).json({ error: "email and password are required" });
      return;
    }
    try {
      const user = await getUserByEmail(normalizedEmail);
      if (!user || !user.passwordHash) {
        res.status(401).json({ error: "\u30E1\u30FC\u30EB\u30A2\u30C9\u30EC\u30B9\u307E\u305F\u306F\u30D1\u30B9\u30EF\u30FC\u30C9\u304C\u6B63\u3057\u304F\u3042\u308A\u307E\u305B\u3093" });
        return;
      }
      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        res.status(401).json({ error: "\u30E1\u30FC\u30EB\u30A2\u30C9\u30EC\u30B9\u307E\u305F\u306F\u30D1\u30B9\u30EF\u30FC\u30C9\u304C\u6B63\u3057\u304F\u3042\u308A\u307E\u305B\u3093" });
        return;
      }
      const token = await signSession(user.openId, user.name ?? "");
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.json({ success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    } catch (error) {
      console.error("[LocalAuth] Login failed", error);
      res.status(500).json({ error: "\u30ED\u30B0\u30A4\u30F3\u306B\u5931\u6557\u3057\u307E\u3057\u305F" });
    }
  });
}

// server/routers.ts
import { TRPCError as TRPCError3 } from "@trpc/server";
import { z as z2 } from "zod";

// server/_core/systemRouter.ts
import { z } from "zod";

// server/_core/notification.ts
import { TRPCError } from "@trpc/server";
var TITLE_MAX_LENGTH = 1200;
var CONTENT_MAX_LENGTH = 2e4;
var trimValue = (value) => value.trim();
var isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;
var buildEndpointUrl = (baseUrl) => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(
    "webdevtoken.v1.WebDevService/SendNotification",
    normalizedBase
  ).toString();
};
var validatePayload = (input) => {
  if (!isNonEmptyString(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required."
    });
  }
  if (!isNonEmptyString(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required."
    });
  }
  const title = trimValue(input.title);
  const content = trimValue(input.content);
  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
    });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
    });
  }
  return { title, content };
};
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  if (!ENV.forgeApiUrl) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service URL is not configured."
    });
  }
  if (!ENV.forgeApiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service API key is not configured."
    });
  }
  const endpoint = buildEndpointUrl(ENV.forgeApiUrl);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1"
      },
      body: JSON.stringify({ title, content })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Notification] Failed to notify owner (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Error calling notification service:", error);
    return false;
  }
}

// server/_core/trpc.ts
import { initTRPC, TRPCError as TRPCError2 } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError2({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || !ctx.user.isPresident && !ctx.user.isTeacher) {
      throw new TRPCError2({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(
    z.object({
      timestamp: z.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
  notifyOwner: adminProcedure.input(
    z.object({
      title: z.string().min(1, "title is required"),
      content: z.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    const delivered = await notifyOwner(input);
    return {
      success: delivered
    };
  })
});

// server/routers.ts
var managementProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!ctx.user.isPresident && !ctx.user.isTeacher) {
    throw new TRPCError3({ code: "FORBIDDEN", message: "\u90E8\u9577\u307E\u305F\u306F\u9867\u554F\u306E\u6A29\u9650\u304C\u5FC5\u8981\u3067\u3059" });
  }
  return next({ ctx });
});
var leaderOrManagementProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!ctx.user.isSectionLeader && !ctx.user.isPresident && !ctx.user.isTeacher) {
    throw new TRPCError3({ code: "FORBIDDEN", message: "\u30D1\u30FC\u30C8\u30EA\u30FC\u30C0\u30FC\u3001\u90E8\u9577\u3001\u307E\u305F\u306F\u9867\u554F\u306E\u6A29\u9650\u304C\u5FC5\u8981\u3067\u3059" });
  }
  return next({ ctx });
});
var sectionLeaderProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!ctx.user.isSectionLeader) {
    throw new TRPCError3({
      code: "FORBIDDEN",
      message: "\u4E00\u6B21\u627F\u8A8D\u306F\u7533\u8ACB\u8005\u3068\u540C\u3058\u30D1\u30FC\u30C8\u306E\u30D1\u30FC\u30C8\u30EA\u30FC\u30C0\u30FC\u3060\u3051\u304C\u884C\u3048\u307E\u3059"
    });
  }
  return next({ ctx });
});
var presidentProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!ctx.user.isPresident) {
    throw new TRPCError3({ code: "FORBIDDEN", message: "\u4E8C\u6B21\u627F\u8A8D\u306F\u90E8\u9577\u3060\u3051\u304C\u884C\u3048\u307E\u3059" });
  }
  return next({ ctx });
});
var teacherProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!ctx.user.isTeacher) {
    throw new TRPCError3({ code: "FORBIDDEN", message: "\u6700\u7D42\u627F\u8A8D\u306F\u9867\u554F\u3060\u3051\u304C\u884C\u3048\u307E\u3059" });
  }
  return next({ ctx });
});
var adminProcedure2 = managementProcedure;
var leaderOrAdminProcedure = leaderOrManagementProcedure;
function isSamePart(first, second) {
  return Boolean(
    first?.trim() && second?.trim() && first.trim().toLocaleLowerCase() === second.trim().toLocaleLowerCase()
  );
}
function cleanScheduleForCreate(input) {
  const { description, startTime, endTime, location, ...required } = input;
  const optional = {
    description: description?.trim(),
    startTime: startTime?.trim(),
    endTime: endTime?.trim(),
    location: location?.trim()
  };
  return {
    ...required,
    ...optional.description ? { description: optional.description } : {},
    ...optional.startTime ? { startTime: optional.startTime } : {},
    ...optional.endTime ? { endTime: optional.endTime } : {},
    ...optional.location ? { location: optional.location } : {}
  };
}
function cleanScheduleForUpdate(input) {
  const { description, startTime, endTime, location, ...required } = input;
  const normalize = (value) => value === void 0 ? void 0 : value.trim() || null;
  return {
    ...required,
    ...description !== void 0 ? { description: normalize(description) } : {},
    ...startTime !== void 0 ? { startTime: normalize(startTime) } : {},
    ...endTime !== void 0 ? { endTime: normalize(endTime) } : {},
    ...location !== void 0 ? { location: normalize(location) } : {}
  };
}
function toClientUser(user) {
  const { passwordHash: _passwordHash, ...safeUser } = user;
  return safeUser;
}
var appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user ? toClientUser(opts.ctx.user) : null),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true };
    })
  }),
  // ─── Users ─────────────────────────────────────────────────────────────────
  users: router({
    list: adminProcedure2.query(async () => (await getAllUsers()).map(toClientUser)),
    updateRole: adminProcedure2.input(
      z2.object({
        userId: z2.number(),
        role: z2.enum(["admin", "section_leader", "member"]),
        part: z2.string().optional()
      })
    ).mutation(async ({ input }) => {
      const target = await getUserById(input.userId);
      if (!target) throw new TRPCError3({ code: "NOT_FOUND", message: "\u30A2\u30AB\u30A6\u30F3\u30C8\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093" });
      if (target.isPresident && input.role !== "admin" && await getOrganizerCount() <= 1) {
        throw new TRPCError3({
          code: "BAD_REQUEST",
          message: "\u6700\u5F8C\u306Eorganizer\u3092\u90E8\u54E1\u307E\u305F\u306F\u30D1\u30FC\u30C8\u30EA\u30FC\u30C0\u30FC\u3078\u5909\u66F4\u3059\u308B\u3053\u3068\u306F\u3067\u304D\u307E\u305B\u3093"
        });
      }
      return updateUserResponsibilities(input.userId, {
        isTeacher: target.isTeacher,
        isPresident: input.role === "admin",
        isSectionLeader: input.role === "section_leader"
      });
    }),
    updatePart: adminProcedure2.input(z2.object({ userId: z2.number(), part: z2.string().max(128).optional() })).mutation(async ({ input }) => {
      const target = await getUserById(input.userId);
      if (!target) throw new TRPCError3({ code: "NOT_FOUND", message: "\u30A2\u30AB\u30A6\u30F3\u30C8\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093" });
      return updateUserPart(input.userId, input.part?.trim() || null);
    }),
    updateResponsibilities: managementProcedure.input(z2.object({
      userId: z2.number(),
      isTeacher: z2.boolean(),
      isPresident: z2.boolean(),
      isSectionLeader: z2.boolean()
    })).mutation(async ({ input }) => {
      const target = await getUserById(input.userId);
      if (!target) throw new TRPCError3({ code: "NOT_FOUND", message: "\u30A2\u30AB\u30A6\u30F3\u30C8\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093" });
      if (target.isPresident && !input.isPresident && await getOrganizerCount() <= 1) {
        throw new TRPCError3({ code: "BAD_REQUEST", message: "\u6700\u5F8C\u306E\u90E8\u9577\u3092\u5916\u3059\u3053\u3068\u306F\u3067\u304D\u307E\u305B\u3093" });
      }
      return updateUserResponsibilities(input.userId, {
        isTeacher: input.isTeacher,
        isPresident: input.isPresident,
        isSectionLeader: input.isSectionLeader
      });
    }),
    remove: adminProcedure2.input(z2.object({ userId: z2.number() })).mutation(async ({ ctx, input }) => {
      if (input.userId === ctx.user.id) {
        throw new TRPCError3({
          code: "BAD_REQUEST",
          message: "\u81EA\u5206\u81EA\u8EAB\u306E\u30A2\u30AB\u30A6\u30F3\u30C8\u306F\u524A\u9664\u3067\u304D\u307E\u305B\u3093\u3002\u5225\u306Eorganizer\u306B\u4F9D\u983C\u3057\u3066\u304F\u3060\u3055\u3044\u3002"
        });
      }
      const target = await getUserById(input.userId);
      if (!target) throw new TRPCError3({ code: "NOT_FOUND", message: "\u30A2\u30AB\u30A6\u30F3\u30C8\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093" });
      if (target.isPresident && await getOrganizerCount() <= 1) {
        throw new TRPCError3({
          code: "BAD_REQUEST",
          message: "\u6700\u5F8C\u306E\u90E8\u9577\u30A2\u30AB\u30A6\u30F3\u30C8\u306F\u524A\u9664\u3067\u304D\u307E\u305B\u3093"
        });
      }
      await deleteUserAccount(input.userId);
      return { success: true };
    })
  }),
  // ─── Attendance totals ──────────────────────────────────────────────────────
  attendance: router({
    mine: protectedProcedure.query(({ ctx }) => getAttendanceStatsForUser(ctx.user.id)),
    all: adminProcedure2.query(() => getAttendanceStatsForAllUsers()),
    availabilityByMonth: managementProcedure.input(z2.object({ year: z2.number().int().min(2020).max(2100), month: z2.number().int().min(1).max(12) })).query(({ input }) => getAvailabilityByMonth(input.year, input.month))
  }),
  // ─── Announcements ─────────────────────────────────────────────────────────
  announcements: router({
    list: protectedProcedure.query(() => getAnnouncements()),
    create: leaderOrAdminProcedure.input(
      z2.object({
        title: z2.string().min(1),
        content: z2.string().min(1),
        category: z2.enum(["info", "warning", "important"]).default("info"),
        pinned: z2.boolean().default(false)
      })
    ).mutation(
      ({ ctx, input }) => createAnnouncement({ ...input, authorId: ctx.user.id })
    ),
    update: leaderOrAdminProcedure.input(
      z2.object({
        id: z2.number(),
        title: z2.string().min(1).optional(),
        content: z2.string().min(1).optional(),
        category: z2.enum(["info", "warning", "important"]).optional(),
        pinned: z2.boolean().optional()
      })
    ).mutation(({ input }) => {
      const { id, ...data } = input;
      return updateAnnouncement(id, data);
    }),
    delete: leaderOrAdminProcedure.input(z2.object({ id: z2.number() })).mutation(({ input }) => deleteAnnouncement(input.id))
  }),
  // ─── Schedules ─────────────────────────────────────────────────────────────
  schedules: router({
    byMonth: protectedProcedure.input(z2.object({ year: z2.number(), month: z2.number() })).query(({ input }) => getSchedulesByMonth(input.year, input.month)),
    byWeek: protectedProcedure.input(z2.object({ startDate: z2.string(), endDate: z2.string() })).query(({ input }) => getSchedulesByWeek(input.startDate, input.endDate)),
    create: leaderOrAdminProcedure.input(
      z2.object({
        title: z2.string().min(1),
        description: z2.string().optional(),
        scheduleDate: z2.string(),
        startTime: z2.string().optional(),
        endTime: z2.string().optional(),
        location: z2.string().optional(),
        type: z2.enum(["practice", "event", "lesson", "concert", "holiday"]).default("practice")
      })
    ).mutation(
      ({ ctx, input }) => createSchedule(cleanScheduleForCreate({ ...input, createdById: ctx.user.id }))
    ),
    importReviewed: adminProcedure2.input(
      z2.object({
        entries: z2.array(
          z2.object({
            title: z2.string().min(1).max(255),
            description: z2.string().optional(),
            scheduleDate: z2.string().regex(/^\d{4}-\d{2}-\d{2}$/),
            startTime: z2.string().optional(),
            endTime: z2.string().optional(),
            location: z2.string().optional(),
            type: z2.enum(["practice", "event", "lesson", "concert", "holiday"])
          })
        ).min(1).max(100)
      })
    ).mutation(
      ({ ctx, input }) => createSchedules(input.entries.map((entry) => cleanScheduleForCreate({ ...entry, createdById: ctx.user.id })))
    ),
    update: leaderOrAdminProcedure.input(
      z2.object({
        id: z2.number(),
        title: z2.string().min(1).optional(),
        description: z2.string().optional(),
        scheduleDate: z2.string().optional(),
        startTime: z2.string().optional(),
        endTime: z2.string().optional(),
        location: z2.string().optional(),
        type: z2.enum(["practice", "event", "lesson", "concert", "holiday"]).optional()
      })
    ).mutation(({ input }) => {
      const { id, ...data } = input;
      return updateSchedule(id, cleanScheduleForUpdate(data));
    }),
    delete: leaderOrAdminProcedure.input(z2.object({ id: z2.number() })).mutation(({ input }) => deleteSchedule(input.id))
  }),
  // ─── Lesson Visits ─────────────────────────────────────────────────────────
  lessonVisits: router({
    list: protectedProcedure.query(() => getLessonVisits()),
    upcoming: protectedProcedure.query(() => getUpcomingLessonVisits()),
    create: adminProcedure2.input(
      z2.object({
        instructorName: z2.string().min(1),
        targetPart: z2.string().optional(),
        visitDate: z2.string(),
        startTime: z2.string().optional(),
        endTime: z2.string().optional(),
        location: z2.string().optional(),
        notes: z2.string().optional()
      })
    ).mutation(
      ({ ctx, input }) => createLessonVisit({ ...input, createdById: ctx.user.id })
    ),
    update: adminProcedure2.input(
      z2.object({
        id: z2.number(),
        instructorName: z2.string().min(1).optional(),
        targetPart: z2.string().optional(),
        visitDate: z2.string().optional(),
        startTime: z2.string().optional(),
        endTime: z2.string().optional(),
        location: z2.string().optional(),
        notes: z2.string().optional()
      })
    ).mutation(({ input }) => {
      const { id, ...data } = input;
      return updateLessonVisit(id, data);
    }),
    delete: adminProcedure2.input(z2.object({ id: z2.number() })).mutation(({ input }) => deleteLessonVisit(input.id))
  }),
  // ─── Events / Countdown ────────────────────────────────────────────────────
  events: router({
    list: protectedProcedure.query(() => getEvents()),
    upcoming: protectedProcedure.query(() => getUpcomingEvents()),
    featured: protectedProcedure.query(() => getFeaturedEvent()),
    create: adminProcedure2.input(
      z2.object({
        title: z2.string().min(1),
        description: z2.string().optional(),
        eventDate: z2.string(),
        venue: z2.string().optional(),
        type: z2.enum(["concert", "competition", "other"]).default("concert"),
        featured: z2.boolean().default(false)
      })
    ).mutation(
      ({ ctx, input }) => createEvent({
        ...input,
        eventDate: new Date(input.eventDate),
        createdById: ctx.user.id
      })
    ),
    update: adminProcedure2.input(
      z2.object({
        id: z2.number(),
        title: z2.string().min(1).optional(),
        description: z2.string().optional(),
        eventDate: z2.string().optional(),
        venue: z2.string().optional(),
        type: z2.enum(["concert", "competition", "other"]).optional(),
        featured: z2.boolean().optional()
      })
    ).mutation(({ input }) => {
      const { id, eventDate, ...rest } = input;
      return updateEvent(id, {
        ...rest,
        ...eventDate ? { eventDate: new Date(eventDate) } : {}
      });
    }),
    delete: adminProcedure2.input(z2.object({ id: z2.number() })).mutation(({ input }) => deleteEvent(input.id))
  }),
  // ─── Practice Schedules ────────────────────────────────────────────────────
  practice: router({
    today: protectedProcedure.query(() => {
      const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      return getPracticeByDate(today);
    }),
    byDate: protectedProcedure.input(z2.object({ date: z2.string() })).query(({ input }) => getPracticeByDate(input.date)),
    create: leaderOrAdminProcedure.input(
      z2.object({
        practiceDate: z2.string(),
        practiceType: z2.enum(["ensemble", "individual", "section"]),
        repertoire: z2.string().optional(),
        startTime: z2.string().optional(),
        endTime: z2.string().optional(),
        location: z2.string().optional(),
        notes: z2.string().optional()
      })
    ).mutation(
      ({ ctx, input }) => createPracticeSchedule({ ...input, createdById: ctx.user.id })
    ),
    update: leaderOrAdminProcedure.input(
      z2.object({
        id: z2.number(),
        practiceDate: z2.string().optional(),
        practiceType: z2.enum(["ensemble", "individual", "section"]).optional(),
        repertoire: z2.string().optional(),
        startTime: z2.string().optional(),
        endTime: z2.string().optional(),
        location: z2.string().optional(),
        notes: z2.string().optional()
      })
    ).mutation(({ input }) => {
      const { id, ...data } = input;
      return updatePracticeSchedule(id, data);
    }),
    delete: leaderOrAdminProcedure.input(z2.object({ id: z2.number() })).mutation(({ input }) => deletePracticeSchedule(input.id))
  }),
  //  // ─── Ensemble Attendance Board ──────────────────────────────────────
  ensembleAttendance: router({
    byDate: protectedProcedure.input(z2.object({ date: z2.string() })).query(({ input }) => getEnsembleAttendanceByDate(input.date)),
    datesInMonth: protectedProcedure.input(z2.object({ yearMonth: z2.string() })).query(({ input }) => getEnsembleDatesWithAbsences(input.yearMonth))
  }),
  // ─── Absence Requests ──────────────────────────────────────────────
  absence: router({
    myRequests: protectedProcedure.query(
      ({ ctx }) => getAbsenceRequestsByUser(ctx.user.id)
    ),
    pending: leaderOrManagementProcedure.query(async ({ ctx }) => {
      const queues = await Promise.all([
        ctx.user.isSectionLeader ? getPendingAbsenceRequestsForPart(ctx.user.part) : Promise.resolve([]),
        ctx.user.isPresident ? getPendingAbsenceRequestsForPresident() : Promise.resolve([]),
        ctx.user.isTeacher ? getPendingAbsenceRequestsForTeacher() : Promise.resolve([])
      ]);
      return Array.from(new Map(queues.flat().map((request) => [request.id, request])).values());
    }),
    all: managementProcedure.query(() => getAllAbsenceRequests()),
    create: protectedProcedure.input(
      z2.object({
        requestType: z2.enum(["absence", "late", "early_leave"]),
        targetDate: z2.string(),
        arrivalTime: z2.string().optional(),
        leaveTime: z2.string().optional(),
        reason: z2.string().min(1)
      })
    ).mutation(({ ctx, input }) => {
      if (!ctx.user.part?.trim()) {
        throw new TRPCError3({
          code: "BAD_REQUEST",
          message: "\u30D1\u30FC\u30C8\u304C\u672A\u8A2D\u5B9A\u3067\u3059\u3002organizer\u306B\u30D1\u30FC\u30C8\u8A2D\u5B9A\u3092\u4F9D\u983C\u3057\u3066\u304B\u3089\u7533\u8ACB\u3057\u3066\u304F\u3060\u3055\u3044\u3002"
        });
      }
      return createAbsenceRequest({
        ...input,
        requesterId: ctx.user.id
      });
    }),
    /** Management can record an already-confirmed attendance issue for a member. */
    createManual: managementProcedure.input(
      z2.object({
        requesterId: z2.number().int().positive(),
        requestType: z2.enum(["absence", "late", "early_leave", "unexcused"]),
        targetDate: z2.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        arrivalTime: z2.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
        leaveTime: z2.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
        reason: z2.string().trim().min(1).max(2e3)
      })
    ).mutation(async ({ ctx, input }) => {
      const member = await getUserById(input.requesterId);
      if (!member) throw new TRPCError3({ code: "NOT_FOUND", message: "\u90E8\u54E1\u30A2\u30AB\u30A6\u30F3\u30C8\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093" });
      if (input.requestType === "late" && !input.arrivalTime) {
        throw new TRPCError3({ code: "BAD_REQUEST", message: "\u9045\u523B\u306F\u5230\u7740\u4E88\u5B9A\u6642\u523B\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044" });
      }
      if (input.requestType === "early_leave" && !input.leaveTime) {
        throw new TRPCError3({ code: "BAD_REQUEST", message: "\u65E9\u9000\u306F\u9000\u51FA\u4E88\u5B9A\u6642\u523B\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044" });
      }
      return createManualAttendanceRecord({
        requesterId: input.requesterId,
        requestType: input.requestType,
        targetDate: input.targetDate,
        arrivalTime: input.requestType === "late" ? input.arrivalTime ?? null : null,
        leaveTime: input.requestType === "early_leave" ? input.leaveTime ?? null : null,
        reason: input.reason.trim(),
        recordedById: ctx.user.id
      });
    }),
    /** The submitter's own part leader performs the first approval/rejection. */
    sectionApprove: sectionLeaderProcedure.input(
      z2.object({
        id: z2.number(),
        approved: z2.boolean(),
        comment: z2.string().optional()
      })
    ).mutation(async ({ ctx, input }) => {
      const request = await getAbsenceRequestWithRequesterById(input.id);
      if (!request) {
        throw new TRPCError3({ code: "NOT_FOUND", message: "\u7533\u8ACB\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093" });
      }
      if (request.status !== "pending") {
        throw new TRPCError3({
          code: "BAD_REQUEST",
          message: "\u3053\u306E\u7533\u8ACB\u306F\u4E00\u6B21\u627F\u8A8D\u306E\u5BFE\u8C61\u3067\u306F\u3042\u308A\u307E\u305B\u3093"
        });
      }
      if (!isSamePart(ctx.user.part, request.requesterPart)) {
        throw new TRPCError3({
          code: "FORBIDDEN",
          message: "\u81EA\u5206\u3068\u540C\u3058\u30D1\u30FC\u30C8\u306E\u90E8\u54E1\u306E\u7533\u8ACB\u3060\u3051\u3092\u627F\u8A8D\u3067\u304D\u307E\u3059"
        });
      }
      if (input.approved) {
        return updateAbsenceRequest(input.id, {
          status: "section_approved",
          sectionLeaderApproverId: ctx.user.id,
          sectionLeaderApprovedAt: /* @__PURE__ */ new Date(),
          sectionLeaderComment: input.comment ?? null
        });
      } else {
        return updateAbsenceRequest(input.id, {
          status: "rejected",
          sectionLeaderApproverId: ctx.user.id,
          sectionLeaderApprovedAt: /* @__PURE__ */ new Date(),
          sectionLeaderComment: input.comment ?? null
        });
      }
    }),
    /** The club president performs the second decision after the part-leader gate. */
    presidentApprove: presidentProcedure.input(
      z2.object({
        id: z2.number(),
        approved: z2.boolean(),
        comment: z2.string().optional()
      })
    ).mutation(async ({ ctx, input }) => {
      const request = await getAbsenceRequestWithRequesterById(input.id);
      if (!request) {
        throw new TRPCError3({ code: "NOT_FOUND", message: "\u7533\u8ACB\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093" });
      }
      if (request.status !== "section_approved") {
        throw new TRPCError3({
          code: "BAD_REQUEST",
          message: "\u30D1\u30FC\u30C8\u30EA\u30FC\u30C0\u30FC\u306E\u4E00\u6B21\u627F\u8A8D\u5F8C\u306B\u90E8\u9577\u304C\u4E8C\u6B21\u627F\u8A8D\u3067\u304D\u307E\u3059"
        });
      }
      if (input.approved) {
        return updateAbsenceRequest(input.id, {
          status: "president_approved",
          presidentApproverId: ctx.user.id,
          presidentApprovedAt: /* @__PURE__ */ new Date(),
          presidentComment: input.comment ?? null
        });
      } else {
        return updateAbsenceRequest(input.id, {
          status: "rejected",
          presidentApproverId: ctx.user.id,
          presidentApprovedAt: /* @__PURE__ */ new Date(),
          presidentComment: input.comment ?? null
        });
      }
    }),
    /** The teacher gives the final decision after the president gate. */
    teacherApprove: teacherProcedure.input(
      z2.object({
        id: z2.number(),
        approved: z2.boolean(),
        comment: z2.string().optional()
      })
    ).mutation(async ({ ctx, input }) => {
      const request = await getAbsenceRequestWithRequesterById(input.id);
      if (!request) {
        throw new TRPCError3({ code: "NOT_FOUND", message: "\u7533\u8ACB\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093" });
      }
      if (request.status !== "president_approved") {
        throw new TRPCError3({
          code: "BAD_REQUEST",
          message: "\u90E8\u9577\u306E\u4E8C\u6B21\u627F\u8A8D\u5F8C\u306B\u9867\u554F\u304C\u6700\u7D42\u627F\u8A8D\u3067\u304D\u307E\u3059"
        });
      }
      if (input.approved) {
        return updateAbsenceRequest(input.id, {
          status: "teacher_approved",
          teacherApproverId: ctx.user.id,
          teacherApprovedAt: /* @__PURE__ */ new Date(),
          teacherComment: input.comment ?? null
        });
      } else {
        return updateAbsenceRequest(input.id, {
          status: "rejected",
          teacherApproverId: ctx.user.id,
          teacherApprovedAt: /* @__PURE__ */ new Date(),
          teacherComment: input.comment ?? null
        });
      }
    })
  })
});

// server/_core/context.ts
async function createContext(opts) {
  let user = null;
  try {
    user = await authenticateRequest(opts.req);
  } catch (error) {
    user = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user
  };
}

// server/vercel.ts
var app = express();
app.set("trust proxy", 1);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
registerLocalAuthRoutes(app);
app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext
  })
);
var vercel_default = app;
export {
  vercel_default as default
};
