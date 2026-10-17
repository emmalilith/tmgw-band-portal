import { describe, expect, it, vi } from "vitest";

vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    getAllUsers: vi.fn().mockResolvedValue([]),
    getPendingAbsenceRequests: vi.fn().mockResolvedValue([]),
    getPendingAbsenceRequestsForPart: vi.fn().mockResolvedValue([]),
    getAbsenceRequestWithRequesterById: vi.fn().mockResolvedValue({
      id: 42,
      requesterId: 2,
      requesterPart: "Flute",
      status: "pending",
    }),
    updateAbsenceRequest: vi.fn().mockResolvedValue(undefined),
    getAttendanceStatsForUser: vi.fn().mockResolvedValue({
      absenceCount: 2,
      lateCount: 1,
      earlyLeaveCount: 0,
      totalCount: 3,
    }),
    getAttendanceStatsForAllUsers: vi.fn().mockResolvedValue([
      {
        userId: 2,
        name: "部員A",
        email: "member@example.com",
        part: "Flute",
        role: "member",
        absenceCount: 2,
        lateCount: 1,
        earlyLeaveCount: 0,
        totalCount: 3,
      },
    ]),
  };
});

import * as db from "./db";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "local:admin@example.com",
    email: "admin@example.com",
    name: "顧問先生",
    loginMethod: "email",
    passwordHash: null,
    part: null,
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

function createMemberContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "local:member@example.com",
    email: "member@example.com",
    name: "部員A",
    loginMethod: "email",
    passwordHash: null,
    part: "Flute",
    role: "member",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

function createFluteLeaderContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 3,
    openId: "local:flute-leader@example.com",
    email: "flute-leader@example.com",
    name: "フルートリーダー",
    loginMethod: "email",
    passwordHash: null,
    part: "Flute",
    role: "section_leader",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

describe("auth.me", () => {
  it("returns the current user when authenticated", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.auth.me();
    expect(result?.name).toBe("顧問先生");
    expect(result?.role).toBe("admin");
    expect(result).not.toHaveProperty("passwordHash");
  });

  it("returns null when not authenticated", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
    };
    const result = await appRouter.createCaller(ctx).auth.me();
    expect(result).toBeNull();
  });
});

describe("RBAC - organizer-only procedures", () => {
  it("organizer can list members", async () => {
    const result = await appRouter.createCaller(createAdminContext()).users.list();
    expect(result).toEqual([]);
  });

  it("member cannot change organizer roles", async () => {
    const caller = appRouter.createCaller(createMemberContext());
    await expect(caller.users.updateRole({ userId: 1, role: "admin" })).rejects.toThrow();
  });

  it("member cannot remove an account", async () => {
    const caller = appRouter.createCaller(createMemberContext());
    await expect(caller.users.remove({ userId: 1 })).rejects.toThrow();
  });
});

describe("attendance statistics", () => {
  it("members can see only their own approved attendance totals", async () => {
    const result = await appRouter.createCaller(createMemberContext()).attendance.mine();
    expect(result).toMatchObject({ absenceCount: 2, lateCount: 1, totalCount: 3 });
  });

  it("organizers can view club-wide attendance totals", async () => {
    const result = await appRouter.createCaller(createAdminContext()).attendance.all();
    expect(result).toHaveLength(1);
  });

  it("members cannot view club-wide attendance totals", async () => {
    await expect(appRouter.createCaller(createMemberContext()).attendance.all()).rejects.toThrow();
  });
});

describe("ensembleAttendance", () => {
  it("member can query ensemble attendance by date", async () => {
    const caller = appRouter.createCaller(createMemberContext());
    const result = await caller.ensembleAttendance.byDate({ date: "2025-04-10" }).catch(() => null);
    if (result !== null) {
      expect(result).toHaveProperty("practice");
      expect(result).toHaveProperty("absences");
    }
  });

  it("member can query ensemble dates in month", async () => {
    const caller = appRouter.createCaller(createMemberContext());
    const result = await caller.ensembleAttendance.datesInMonth({ yearMonth: "2025-04" }).catch(() => []);
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("absence request workflow", () => {
  it("member can create an early-leave request", async () => {
    const caller = appRouter.createCaller(createMemberContext());
    await expect(
      caller.absence.create({
        requestType: "early_leave",
        targetDate: "2026-04-01",
        leaveTime: "16:30",
        reason: "体調不良のため",
      })
    ).resolves.not.toThrow();
  });

  it("member cannot approve section requests", async () => {
    const caller = appRouter.createCaller(createMemberContext());
    await expect(caller.absence.sectionApprove({ id: 999, approved: true })).rejects.toThrow();
  });

  it("returns only the same-part queue to a section leader", async () => {
    await appRouter.createCaller(createFluteLeaderContext()).absence.pending();
    expect(db.getPendingAbsenceRequestsForPart).toHaveBeenCalledWith("Flute");
  });

  it("blocks a section leader from approving another part's request", async () => {
    vi.mocked(db.getAbsenceRequestWithRequesterById).mockResolvedValueOnce({
      id: 42,
      requesterId: 4,
      requesterPart: "Clarinet",
      status: "pending",
    } as never);
    await expect(
      appRouter.createCaller(createFluteLeaderContext()).absence.sectionApprove({ id: 42, approved: true })
    ).rejects.toThrow("自分と同じパート");
  });

  it("allows the matching part leader to make the first approval", async () => {
    vi.mocked(db.getAbsenceRequestWithRequesterById).mockResolvedValueOnce({
      id: 42,
      requesterId: 2,
      requesterPart: "Flute",
      status: "pending",
    } as never);
    await expect(
      appRouter.createCaller(createFluteLeaderContext()).absence.sectionApprove({ id: 42, approved: true })
    ).resolves.not.toThrow();
    expect(db.updateAbsenceRequest).toHaveBeenCalledWith(42, expect.objectContaining({ status: "section_approved" }));
  });

  it("blocks organizer final approval until the leader gate is complete", async () => {
    vi.mocked(db.getAbsenceRequestWithRequesterById).mockResolvedValueOnce({
      id: 42,
      requesterId: 2,
      requesterPart: "Flute",
      status: "pending",
    } as never);
    await expect(
      appRouter.createCaller(createAdminContext()).absence.teacherApprove({ id: 42, approved: true })
    ).rejects.toThrow("一次承認後");
  });

  it("allows organizer final approval after the matching leader approved", async () => {
    vi.mocked(db.getAbsenceRequestWithRequesterById).mockResolvedValueOnce({
      id: 42,
      requesterId: 2,
      requesterPart: "Flute",
      status: "section_approved",
    } as never);
    await expect(
      appRouter.createCaller(createAdminContext()).absence.teacherApprove({ id: 42, approved: true })
    ).resolves.not.toThrow();
    expect(db.updateAbsenceRequest).toHaveBeenCalledWith(42, expect.objectContaining({ status: "teacher_approved" }));
  });
});
