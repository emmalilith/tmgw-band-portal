import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  createAnnouncement,
  createEvent,
  createLessonVisit,
  createPracticeSchedule,
  createSchedule,
  deleteAnnouncement,
  deleteEvent,
  deleteLessonVisit,
  deletePracticeSchedule,
  deleteSchedule,
  getAllAbsenceRequests,
  getAllUsers,
  getAnnouncements,
  getEvents,
  getFeaturedEvent,
  getLessonVisits,
  getPendingAbsenceRequests,
  getPracticeByDate,
  getSchedulesByMonth,
  getSchedulesByWeek,
  getUpcomingEvents,
  getUpcomingLessonVisits,
  updateAbsenceRequest,
  updateAnnouncement,
  updateEvent,
  updateLessonVisit,
  updatePracticeSchedule,
  updateSchedule,
  updateUserRole,
  createAbsenceRequest,
  getAbsenceRequestsByUser,
  getEnsembleAttendanceByDate,
  getEnsembleDatesWithAbsences,
} from "./db";

// ─── Role helpers ─────────────────────────────────────────────────────────────
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "管理者権限が必要です" });
  return next({ ctx });
});

const leaderOrAdminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin" && ctx.user.role !== "section_leader")
    throw new TRPCError({ code: "FORBIDDEN", message: "パートリーダー以上の権限が必要です" });
  return next({ ctx });
});

// ─── App Router ───────────────────────────────────────────────────────────────
export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Users ─────────────────────────────────────────────────────────────────
  users: router({
    list: adminProcedure.query(() => getAllUsers()),
    updateRole: adminProcedure
      .input(
        z.object({
          userId: z.number(),
          role: z.enum(["admin", "section_leader", "member"]),
          part: z.string().optional(),
        })
      )
      .mutation(({ input }) => updateUserRole(input.userId, input.role, input.part)),
  }),

  // ─── Announcements ─────────────────────────────────────────────────────────
  announcements: router({
    list: protectedProcedure.query(() => getAnnouncements()),
    create: leaderOrAdminProcedure
      .input(
        z.object({
          title: z.string().min(1),
          content: z.string().min(1),
          category: z.enum(["info", "warning", "important"]).default("info"),
          pinned: z.boolean().default(false),
        })
      )
      .mutation(({ ctx, input }) =>
        createAnnouncement({ ...input, authorId: ctx.user.id })
      ),
    update: leaderOrAdminProcedure
      .input(
        z.object({
          id: z.number(),
          title: z.string().min(1).optional(),
          content: z.string().min(1).optional(),
          category: z.enum(["info", "warning", "important"]).optional(),
          pinned: z.boolean().optional(),
        })
      )
      .mutation(({ input }) => {
        const { id, ...data } = input;
        return updateAnnouncement(id, data);
      }),
    delete: leaderOrAdminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteAnnouncement(input.id)),
  }),

  // ─── Schedules ─────────────────────────────────────────────────────────────
  schedules: router({
    byMonth: protectedProcedure
      .input(z.object({ year: z.number(), month: z.number() }))
      .query(({ input }) => getSchedulesByMonth(input.year, input.month)),
    byWeek: protectedProcedure
      .input(z.object({ startDate: z.string(), endDate: z.string() }))
      .query(({ input }) => getSchedulesByWeek(input.startDate, input.endDate)),
    create: leaderOrAdminProcedure
      .input(
        z.object({
          title: z.string().min(1),
          description: z.string().optional(),
          scheduleDate: z.string(),
          startTime: z.string().optional(),
          endTime: z.string().optional(),
          location: z.string().optional(),
          type: z.enum(["practice", "event", "lesson", "concert", "holiday"]).default("practice"),
        })
      )
      .mutation(({ ctx, input }) =>
        createSchedule({ ...input, createdById: ctx.user.id })
      ),
    update: leaderOrAdminProcedure
      .input(
        z.object({
          id: z.number(),
          title: z.string().min(1).optional(),
          description: z.string().optional(),
          scheduleDate: z.string().optional(),
          startTime: z.string().optional(),
          endTime: z.string().optional(),
          location: z.string().optional(),
          type: z.enum(["practice", "event", "lesson", "concert", "holiday"]).optional(),
        })
      )
      .mutation(({ input }) => {
        const { id, ...data } = input;
        return updateSchedule(id, data);
      }),
    delete: leaderOrAdminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteSchedule(input.id)),
  }),

  // ─── Lesson Visits ─────────────────────────────────────────────────────────
  lessonVisits: router({
    list: protectedProcedure.query(() => getLessonVisits()),
    upcoming: protectedProcedure.query(() => getUpcomingLessonVisits()),
    create: adminProcedure
      .input(
        z.object({
          instructorName: z.string().min(1),
          targetPart: z.string().optional(),
          visitDate: z.string(),
          startTime: z.string().optional(),
          endTime: z.string().optional(),
          location: z.string().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(({ ctx, input }) =>
        createLessonVisit({ ...input, createdById: ctx.user.id })
      ),
    update: adminProcedure
      .input(
        z.object({
          id: z.number(),
          instructorName: z.string().min(1).optional(),
          targetPart: z.string().optional(),
          visitDate: z.string().optional(),
          startTime: z.string().optional(),
          endTime: z.string().optional(),
          location: z.string().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(({ input }) => {
        const { id, ...data } = input;
        return updateLessonVisit(id, data);
      }),
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteLessonVisit(input.id)),
  }),

  // ─── Events / Countdown ────────────────────────────────────────────────────
  events: router({
    list: protectedProcedure.query(() => getEvents()),
    upcoming: protectedProcedure.query(() => getUpcomingEvents()),
    featured: protectedProcedure.query(() => getFeaturedEvent()),
    create: adminProcedure
      .input(
        z.object({
          title: z.string().min(1),
          description: z.string().optional(),
          eventDate: z.string(),
          venue: z.string().optional(),
          type: z.enum(["concert", "competition", "other"]).default("concert"),
          featured: z.boolean().default(false),
        })
      )
      .mutation(({ ctx, input }) =>
        createEvent({
          ...input,
          eventDate: new Date(input.eventDate),
          createdById: ctx.user.id,
        })
      ),
    update: adminProcedure
      .input(
        z.object({
          id: z.number(),
          title: z.string().min(1).optional(),
          description: z.string().optional(),
          eventDate: z.string().optional(),
          venue: z.string().optional(),
          type: z.enum(["concert", "competition", "other"]).optional(),
          featured: z.boolean().optional(),
        })
      )
      .mutation(({ input }) => {
        const { id, eventDate, ...rest } = input;
        return updateEvent(id, {
          ...rest,
          ...(eventDate ? { eventDate: new Date(eventDate) } : {}),
        });
      }),
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteEvent(input.id)),
  }),

  // ─── Practice Schedules ────────────────────────────────────────────────────
  practice: router({
    today: protectedProcedure.query(() => {
      const today = new Date().toISOString().split("T")[0];
      return getPracticeByDate(today);
    }),
    byDate: protectedProcedure
      .input(z.object({ date: z.string() }))
      .query(({ input }) => getPracticeByDate(input.date)),
    create: leaderOrAdminProcedure
      .input(
        z.object({
          practiceDate: z.string(),
          practiceType: z.enum(["ensemble", "individual", "section"]),
          repertoire: z.string().optional(),
          startTime: z.string().optional(),
          endTime: z.string().optional(),
          location: z.string().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(({ ctx, input }) =>
        createPracticeSchedule({ ...input, createdById: ctx.user.id })
      ),
    update: leaderOrAdminProcedure
      .input(
        z.object({
          id: z.number(),
          practiceDate: z.string().optional(),
          practiceType: z.enum(["ensemble", "individual", "section"]).optional(),
          repertoire: z.string().optional(),
          startTime: z.string().optional(),
          endTime: z.string().optional(),
          location: z.string().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(({ input }) => {
        const { id, ...data } = input;
        return updatePracticeSchedule(id, data);
      }),
    delete: leaderOrAdminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deletePracticeSchedule(input.id)),
  }),

  //  // ─── Ensemble Attendance Board ──────────────────────────────────────
  ensembleAttendance: router({
    byDate: protectedProcedure
      .input(z.object({ date: z.string() }))
      .query(({ input }) => getEnsembleAttendanceByDate(input.date)),
    datesInMonth: protectedProcedure
      .input(z.object({ yearMonth: z.string() }))
      .query(({ input }) => getEnsembleDatesWithAbsences(input.yearMonth)),
  }),

  // ─── Absence Requests ──────────────────────────────────────────────
  absence: router({
    myRequests: protectedProcedure.query(({ ctx }) =>
      getAbsenceRequestsByUser(ctx.user.id)
    ),
    pending: leaderOrAdminProcedure.query(() => getPendingAbsenceRequests()),
    all: adminProcedure.query(() => getAllAbsenceRequests()),
    create: protectedProcedure
      .input(
        z.object({
      requestType: z.enum(["absence", "late", "early_leave"]),
      targetDate: z.string(),
      arrivalTime: z.string().optional(),
      leaveTime: z.string().optional(),
      reason: z.string().min(1),
        })
      )
      .mutation(({ ctx, input }) =>
        createAbsenceRequest({
          ...input,
          requesterId: ctx.user.id,
        })
      ),
    /** パートリーダーが承認/却下 */
    sectionApprove: leaderOrAdminProcedure
      .input(
        z.object({
          id: z.number(),
          approved: z.boolean(),
          comment: z.string().optional(),
        })
      )
      .mutation(({ ctx, input }) => {
        if (input.approved) {
          return updateAbsenceRequest(input.id, {
            status: "section_approved",
            sectionLeaderApproverId: ctx.user.id,
            sectionLeaderApprovedAt: new Date(),
            sectionLeaderComment: input.comment ?? null,
          });
        } else {
          return updateAbsenceRequest(input.id, {
            status: "rejected",
            sectionLeaderApproverId: ctx.user.id,
            sectionLeaderApprovedAt: new Date(),
            sectionLeaderComment: input.comment ?? null,
          });
        }
      }),
    /** 先生が最終承認/却下 */
    teacherApprove: adminProcedure
      .input(
        z.object({
          id: z.number(),
          approved: z.boolean(),
          comment: z.string().optional(),
        })
      )
      .mutation(({ ctx, input }) => {
        if (input.approved) {
          return updateAbsenceRequest(input.id, {
            status: "teacher_approved",
            teacherApproverId: ctx.user.id,
            teacherApprovedAt: new Date(),
            teacherComment: input.comment ?? null,
          });
        } else {
          return updateAbsenceRequest(input.id, {
            status: "rejected",
            teacherApproverId: ctx.user.id,
            teacherApprovedAt: new Date(),
            teacherComment: input.comment ?? null,
          });
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
