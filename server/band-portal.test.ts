import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@example.com",
    name: "顧問先生",
    loginMethod: "manus",
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
    openId: "member-user",
    email: "member@example.com",
    name: "部員A",
    loginMethod: "manus",
    role: "user",
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
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result?.name).toBe("顧問先生");
    expect(result?.role).toBe("admin");
  });

  it("returns null when not authenticated", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });
});

describe("RBAC - admin-only procedures", () => {
  it("admin can call users.list", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    // Should not throw FORBIDDEN
    await expect(caller.users.list()).resolves.toBeDefined();
  });

  it("member cannot call users.list", async () => {
    const ctx = createMemberContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.users.list()).rejects.toThrow();
  });
});

describe("absence request workflow", () => {
  it("member can create absence request (procedure is accessible)", async () => {
    const ctx = createMemberContext();
    const caller = appRouter.createCaller(ctx);
    // The procedure should be accessible to members (no FORBIDDEN error)
    // DB may not be available in test env so we just check it doesn't throw FORBIDDEN
    await expect(
      caller.absence.create({
        requestType: "absence",
        targetDate: "2026-04-01",
        reason: "体調不良のため",
      })
    ).resolves.not.toThrow();
  });

  it("member cannot approve section requests", async () => {
    const ctx = createMemberContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.absence.sectionApprove({ id: 999, approved: true })
    ).rejects.toThrow();
  });
});
