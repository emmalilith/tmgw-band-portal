import { and, desc, eq, gte, lte, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  AbsenceRequest,
  Announcement,
  Event,
  InsertAbsenceRequest,
  InsertAnnouncement,
  InsertEvent,
  InsertLessonVisit,
  InsertPracticeSchedule,
  InsertSchedule,
  InsertUser,
  LessonVisit,
  PracticeSchedule,
  Schedule,
  absenceRequests,
  announcements,
  events,
  lessonVisits,
  practiceSchedules,
  schedules,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};

  const textFields = ["name", "email", "loginMethod", "passwordHash", "part"] as const;
  for (const field of textFields) {
    const value = user[field];
    if (value === undefined) continue;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  }
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(users.name);
}

export async function updateUserRole(userId: number, role: "admin" | "section_leader" | "member", part?: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ role, part: part ?? null }).where(eq(users.id, userId));
}

// ─── Announcements ────────────────────────────────────────────────────────────
export async function getAnnouncements() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(announcements).orderBy(desc(announcements.pinned), desc(announcements.createdAt));
}

export async function createAnnouncement(data: InsertAnnouncement) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(announcements).values(data);
}

export async function updateAnnouncement(id: number, data: Partial<InsertAnnouncement>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(announcements).set(data).where(eq(announcements.id, id));
}

export async function deleteAnnouncement(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(announcements).where(eq(announcements.id, id));
}

// ─── Schedules ────────────────────────────────────────────────────────────────
export async function getSchedulesByMonth(year: number, month: number) {
  const db = await getDb();
  if (!db) return [];
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const end = `${year}-${String(month).padStart(2, "0")}-31`;
  return db
    .select()
    .from(schedules)
    .where(and(sql`${schedules.scheduleDate} >= ${start}`, sql`${schedules.scheduleDate} <= ${end}`))
    .orderBy(schedules.scheduleDate);
}

export async function getSchedulesByWeek(startDate: string, endDate: string) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(schedules)
    .where(and(sql`${schedules.scheduleDate} >= ${startDate}`, sql`${schedules.scheduleDate} <= ${endDate}`))
    .orderBy(schedules.scheduleDate, schedules.startTime);
}

export async function createSchedule(data: InsertSchedule) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(schedules).values(data);
}

export async function updateSchedule(id: number, data: Partial<InsertSchedule>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(schedules).set(data).where(eq(schedules.id, id));
}

export async function deleteSchedule(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(schedules).where(eq(schedules.id, id));
}

// ─── Lesson Visits ────────────────────────────────────────────────────────────
export async function getLessonVisits() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(lessonVisits).orderBy(lessonVisits.visitDate);
}

export async function getUpcomingLessonVisits() {
  const db = await getDb();
  if (!db) return [];
  const today = new Date().toISOString().split("T")[0];
  return db
    .select()
    .from(lessonVisits)
    .where(sql`${lessonVisits.visitDate} >= ${today}`)
    .orderBy(lessonVisits.visitDate);
}

export async function createLessonVisit(data: InsertLessonVisit) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(lessonVisits).values(data);
}

export async function updateLessonVisit(id: number, data: Partial<InsertLessonVisit>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(lessonVisits).set(data).where(eq(lessonVisits.id, id));
}

export async function deleteLessonVisit(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(lessonVisits).where(eq(lessonVisits.id, id));
}

// ─── Events ───────────────────────────────────────────────────────────────────
export async function getEvents() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(events).orderBy(events.eventDate);
}

export async function getUpcomingEvents() {
  const db = await getDb();
  if (!db) return [];
  const now = new Date();
  return db
    .select()
    .from(events)
    .where(gte(events.eventDate, now))
    .orderBy(events.eventDate);
}

export async function getFeaturedEvent() {
  const db = await getDb();
  if (!db) return null;
  const now = new Date();
  const result = await db
    .select()
    .from(events)
    .where(and(eq(events.featured, true), gte(events.eventDate, now)))
    .orderBy(events.eventDate)
    .limit(1);
  return result[0] ?? null;
}

export async function createEvent(data: InsertEvent) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(events).values(data);
}

export async function updateEvent(id: number, data: Partial<InsertEvent>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(events).set(data).where(eq(events.id, id));
}

export async function deleteEvent(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(events).where(eq(events.id, id));
}

// ─── Practice Schedules ───────────────────────────────────────────────────────
export async function getPracticeByDate(date: string) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(practiceSchedules)
    .where(sql`${practiceSchedules.practiceDate} = ${date}`)
    .orderBy(practiceSchedules.startTime);
}

export async function createPracticeSchedule(data: InsertPracticeSchedule) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(practiceSchedules).values(data);
}

export async function updatePracticeSchedule(id: number, data: Partial<InsertPracticeSchedule>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(practiceSchedules).set(data).where(eq(practiceSchedules.id, id));
}

export async function deletePracticeSchedule(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(practiceSchedules).where(eq(practiceSchedules.id, id));
}

// ─── Absence Requests ─────────────────────────────────────────────────────────
export async function getAbsenceRequestsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(absenceRequests)
    .where(eq(absenceRequests.requesterId, userId))
    .orderBy(desc(absenceRequests.createdAt));
}

export async function getPendingAbsenceRequests() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(absenceRequests)
    .where(or(eq(absenceRequests.status, "pending"), eq(absenceRequests.status, "section_approved")))
    .orderBy(desc(absenceRequests.createdAt));
}

export async function getAllAbsenceRequests() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(absenceRequests).orderBy(desc(absenceRequests.createdAt));
}

export async function createAbsenceRequest(data: InsertAbsenceRequest) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(absenceRequests).values(data);
}

export async function updateAbsenceRequest(id: number, data: Partial<AbsenceRequest>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(absenceRequests).set(data).where(eq(absenceRequests.id, id));
}

// ─── Ensemble Attendance Board ────────────────────────────────────────────────
/**
 * For a given ensemble practice date, returns:
 *   - the practice schedule entry (if type = ensemble)
 *   - all teacher_approved absence requests for that date with requester info
 */
export async function getEnsembleAttendanceByDate(date: string) {
  const db = await getDb();
  if (!db) return { practice: null, absences: [] };

  // Get the ensemble practice schedule for that date
  const practiceRows = await db
    .select()
    .from(practiceSchedules)
    .where(
      and(
        sql`${practiceSchedules.practiceDate} = ${date}`,
        eq(practiceSchedules.practiceType, "ensemble")
      )
    )
    .limit(1);

  const practice = practiceRows[0] ?? null;

  // Get all approved absence requests for that date (join with user info)
  const absenceRows = await db
    .select({
      id: absenceRequests.id,
      requestType: absenceRequests.requestType,
      targetDate: absenceRequests.targetDate,
      arrivalTime: absenceRequests.arrivalTime,
      leaveTime: absenceRequests.leaveTime,
      reason: absenceRequests.reason,
      status: absenceRequests.status,
      createdAt: absenceRequests.createdAt,
      requesterName: users.name,
      requesterPart: users.part,
      requesterId: users.id,
    })
    .from(absenceRequests)
    .innerJoin(users, eq(absenceRequests.requesterId, users.id))
    .where(
      and(
        sql`${absenceRequests.targetDate} = ${date}`,
        eq(absenceRequests.status, "teacher_approved")
      )
    )
    .orderBy(absenceRequests.requestType, users.part, users.name);

  return { practice, absences: absenceRows };
}

/**
 * Returns all ensemble practice dates that have at least one approved absence,
 * within a given month (YYYY-MM).
 */
export async function getEnsembleDatesWithAbsences(yearMonth: string) {
  const db = await getDb();
  if (!db) return [];

  const start = `${yearMonth}-01`;
  const end = `${yearMonth}-31`;

  // Get ensemble practice dates in the month
  const practiceRows = await db
    .select({ practiceDate: practiceSchedules.practiceDate })
    .from(practiceSchedules)
    .where(
      and(
        eq(practiceSchedules.practiceType, "ensemble"),
        sql`${practiceSchedules.practiceDate} >= ${start}`,
        sql`${practiceSchedules.practiceDate} <= ${end}`
      )
    )
    .orderBy(practiceSchedules.practiceDate);

  return practiceRows.map((r) => r.practiceDate);
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result[0];
}
