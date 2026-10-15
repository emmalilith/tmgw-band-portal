/**
 * Local email/password authentication — replaces Manus OAuth for external deployment.
 * Uses bcryptjs for password hashing and jose for JWT session tokens.
 * Session cookie format is identical to the existing SDK so context.ts needs no changes.
 */
import bcrypt from "bcryptjs";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import { SignJWT, jwtVerify } from "jose";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { ENV } from "./env";
import { parse as parseCookieHeader } from "cookie";
import type { User } from "../../drizzle/schema";

// ─── JWT helpers ──────────────────────────────────────────────────────────────
function getSecret() {
  if (!ENV.cookieSecret) {
    throw new Error("JWT_SECRET must be set before local authentication can be used");
  }
  return new TextEncoder().encode(ENV.cookieSecret);
}

export async function signSession(openId: string, name: string): Promise<string> {
  const expiresAt = Math.floor((Date.now() + ONE_YEAR_MS) / 1000);
  return new SignJWT({ openId, appId: ENV.appId || "band-portal", name })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(expiresAt)
    .sign(getSecret());
}

export async function verifySession(
  cookieValue: string | undefined | null
): Promise<{ openId: string } | null> {
  if (!cookieValue) return null;
  try {
    const { payload } = await jwtVerify(cookieValue, getSecret(), { algorithms: ["HS256"] });
    const openId = payload.openId as string | undefined;
    if (!openId) return null;
    return { openId };
  } catch {
    return null;
  }
}

// ─── Request authenticator (replaces sdk.authenticateRequest) ─────────────────
export async function authenticateRequest(req: Request): Promise<User> {
  const cookies = parseCookieHeader(req.headers.cookie ?? "");
  const sessionCookie = cookies[COOKIE_NAME];
  const session = await verifySession(sessionCookie);

  if (!session) throw new Error("Invalid session");

  const user = await db.getUserByOpenId(session.openId);
  if (!user) throw new Error("User not found");

  return user;
}

// ─── Express routes ───────────────────────────────────────────────────────────
export function registerLocalAuthRoutes(app: Express) {
  /**
   * POST /api/auth/register
   * Body: { name, email, password, part? }
   * ADMIN_EMAIL is the recommended deterministic administrator bootstrap.
   * If it is absent, the first registered account is promoted as a fallback.
   */
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    const { name, email, password, part } = req.body ?? {};
    const normalizedName = typeof name === "string" ? name.trim() : "";
    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    if (!normalizedName || !normalizedEmail || typeof password !== "string") {
      res.status(400).json({ error: "name, email and password are required" });
      return;
    }
    if (password.length < 8) {
      res.status(400).json({ error: "パスワードは8文字以上で設定してください" });
      return;
    }

    try {
      const allUsers = await db.getAllUsers();
      const isFirstUser = allUsers.length === 0;

      // Check if email already exists
      const existing = await db.getUserByEmail(normalizedEmail);
      if (existing) {
        res.status(409).json({ error: "このメールアドレスはすでに登録されています" });
        return;
      }

      const passwordHash = await bcrypt.hash(password, 12);
      const openId = `local:${normalizedEmail}`;
      const role = ENV.adminEmail === normalizedEmail || (!ENV.adminEmail && isFirstUser)
        ? "admin"
        : "member";

      await db.upsertUser({
        openId,
        name: normalizedName,
        email: normalizedEmail,
        loginMethod: "email",
        passwordHash,
        part: part ?? null,
        role,
        lastSignedIn: new Date(),
      });

      const user = await db.getUserByOpenId(openId);
      if (!user) {
        res.status(500).json({ error: "ユーザー作成に失敗しました" });
        return;
      }

      const token = await signSession(openId, normalizedName);
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.json({ success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    } catch (error) {
      console.error("[LocalAuth] Register failed", error);
      res.status(500).json({ error: "登録に失敗しました" });
    }
  });

  /**
   * POST /api/auth/login
   * Body: { email, password }
   */
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    const { email, password } = req.body ?? {};
    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    if (!normalizedEmail || typeof password !== "string") {
      res.status(400).json({ error: "email and password are required" });
      return;
    }

    try {
      const user = await db.getUserByEmail(normalizedEmail);
      if (!user || !user.passwordHash) {
        res.status(401).json({ error: "メールアドレスまたはパスワードが正しくありません" });
        return;
      }

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        res.status(401).json({ error: "メールアドレスまたはパスワードが正しくありません" });
        return;
      }

      const token = await signSession(user.openId, user.name ?? "");
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.json({ success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    } catch (error) {
      console.error("[LocalAuth] Login failed", error);
      res.status(500).json({ error: "ログインに失敗しました" });
    }
  });
}
