import "dotenv/config";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerLocalAuthRoutes } from "./server/_core/localAuth";
import { appRouter } from "./server/routers";
import { createContext } from "./server/_core/context";

/**
 * Vercel serverless entry point.
 * Static frontend files are served from dist/public by Vercel's CDN; this app owns
 * authentication and tRPC requests under /api.
 */
const app = express();
app.set("trust proxy", 1);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

registerLocalAuthRoutes(app);
app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

export default app;
