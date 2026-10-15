import "dotenv/config";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerLocalAuthRoutes } from "./_core/localAuth";
import { appRouter } from "./routers";
import { createContext } from "./_core/context";

/**
 * Standalone application used to build Vercel's bundled serverless function.
 * The frontend is served as static files, and all API routes are handled here.
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
