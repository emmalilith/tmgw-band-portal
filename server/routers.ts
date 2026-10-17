import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import type { User } from "../drizzle/schema";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  createAnnouncement,
  createEvent,
  createLessonVisit,
  createPracticeSchedule,
  createSchedule,
  createSchedules,
  deleteAnnouncement,
  deleteEvent,
  deleteLessonVisit,
  deletePracticeSchedule,
  deleteSchedule,
  getAllAbsenceRequests,
  getAbsenceRequestWithRequesterById,
  getAllUsers,
  getAttendanceStatsForAllUsers,
  getAttendanceStatsForUser,
  getOrganizerCount,
  getUserById,
  getAnnouncements,
  getEvents,
  getFeaturedEvent,
  getLessonVisits,
  getPendingAbsenceRequests,
  getPendingAbsenceRequestsForPart,
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
  deleteUserAccount,
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

/** First approval is reserved for the member's own section leader. */
const sectionLeaderProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "section_leader") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "一次承認は申請者と同じパートのパートリーダーだけが行えます",
    });
  }
  return next({ ctx });
});

function isSamePart(first: string | null | undefined, second: string | null | undefined) {
  return Boolean(
    first?.trim() &&
      second?.trim() &&
      first.trim().toLocaleLowerCase() === second.trim().toLocaleLowerCase()
  );
}

/** MySQL TIME fields reject an empty string; omit blank optional values on creation. */
function cleanScheduleForCreate<T extends {
  description?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
}>(input: T) {
  const { description, startTime, endTime, location, ...required } = input;
  const optional = {
    description: description?.trim(),
    startTime: startTime?.trim(),
    endTime: endTime?.trim(),
    location: location?.trim(),
  };
  return {
    ...required,
    ...(optional.description ? { description: optional.description } : {}),
    ...(optional.startTime ? { startTime: optional.startTime } : {}),
    ...(optional.endTime ? { endTime: optional.endTime } : {}),
    ...(optional.location ? { location: optional.location } : {}),
  };
}

/** Keep schedule edits capable of intentionally clearing an optional field. */
function cleanScheduleForUpdate<T extends {
  description?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
}>(input: T) {
  const { description, startTime, endTime, location, ...required } = input;
  const normalize = (value: string | undefined) => value === undefined ? undefined : value.trim() || null;
  return {
    ...required,
    ...(description !== undefined ? { description: normalize(description) } : {}),
    ...(startTime !== undefined ? { startTime: normalize(startTime) } : {}),
    ...(endTime !== undefined ? { endTime: normalize(endTime) } : {}),
    ...(location !== undefined ? { location: normalize(location) } : {}),
  };
}

function toClientUser(user: User) {
  const { passwordHash: _passwordHash, ...safeUser } = user;
  return safeUser;
}

// ─── App Router ───────────────────────────────────────────────────────────────
export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => (opts.ctx.user ? toClientUser(opts.ctx.user) : null)),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Users ─────────────────────────────────────────────────────────────────
  users: router({
    list: adminProcedure.query(async () => (await getAllUsers()).map(toClientUser)),
    updateRole: adminProcedure
      .input(
        z.object({
          userId: z.number(),
          role: z.enum(["admin", "section_leader", "member"]),
          part: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const target = await getUserById(input.userId);
        if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "アカウントが見つかりません" });
        if (target.role === "admin" && input.role !== "admin" && (await getOrganizerCount()) <= 1) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "最後のorganizerを部員またはパートリーダーへ変更することはできません",
          });
        }
        return updateUserRole(input.userId, input.role, input.part);
      }),
    remove: adminProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (input.userId === ctx.user.id) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "自分自身のアカウントは削除できません。別のorganizerに依頼してください。",
          });
        }

        const target = await getUserById(input.userId);
        if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "アカウントが見つかりません" });
        if (target.role === "admin" && (await getOrganizerCount()) <= 1) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "最後のorganizerアカウントは削除できません",
          });
        }

        await deleteUserAccount(input.userId);
        return { success: true } as const;
      }),
  }),

  // ─── Attendance totals ──────────────────────────────────────────────────────
  attendance: router({
    mine: protectedProcedure.query(({ ctx }) => getAttendanceStatsForUser(ctx.user.id)),
    all: adminProcedure.query(() => getAttendanceStatsForAllUsers()),
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
        createSchedule(cleanScheduleForCreate({ ...input, createdById: ctx.user.id }))
      ),
    importReviewed: adminProcedure
      .input(
        z.object({
          entries: z
            .array(
              z.object({
                title: z.string().min(1).max(255),
                description: z.string().optional(),
                scheduleDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
                startTime: z.string().optional(),
                endTime: z.string().optional(),
                location: z.string().optional(),
                type: z.enum(["practice", "event", "lesson", "concert", "holiday"]),
              })
            )
            .min(1)
            .max(100),
        })
      )
      .mutation(({ ctx, input }) =>
        createSchedules(input.entries.map((entry) => cleanScheduleForCreate({ ...entry, createdById: ctx.user.id })))
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
        return updateSchedule(id, cleanScheduleForUpdate(data));
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
    pending: leaderOrAdminProcedure.query(({ ctx }) =>
      ctx.user.role === "admin"
        ? getPendingAbsenceRequests()
        : getPendingAbsenceRequestsForPart(ctx.user.part)
    ),
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
      .mutation(({ ctx, input }) => {
        if (!ctx.user.part?.trim()) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "パートが未設定です。organizerにパート設定を依頼してから申請してください。",
          });
        }
        return createAbsenceRequest({
          ...input,
          requesterId: ctx.user.id,
        });
      }),
    /** The submitter's own part leader performs the first approval/rejection. */
    sectionApprove: sectionLeaderProcedure
      .input(
        z.object({
          id: z.number(),
          approved: z.boolean(),
          comment: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const request = await getAbsenceRequestWithRequesterById(input.id);
        if (!request) {
          throw new TRPCError({ code: "NOT_FOUND", message: "申請が見つかりません" });
        }
        if (request.status !== "pending") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "この申請は一次承認の対象ではありません",
          });
        }
        if (!isSamePart(ctx.user.part, request.requesterPart)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "自分と同じパートの部員の申請だけを承認できます",
          });
        }
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
    /** Organizer performs the final decision only after the part-leader gate. */
    teacherApprove: adminProcedure
      .input(
        z.object({
          id: z.number(),
          approved: z.boolean(),
          comment: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const request = await getAbsenceRequestWithRequesterById(input.id);
        if (!request) {
          throw new TRPCError({ code: "NOT_FOUND", message: "申請が見つかりません" });
        }
        if (request.status !== "section_approved") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "パートリーダーの一次承認後にorganizerが最終承認できます",
          });
        }
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
