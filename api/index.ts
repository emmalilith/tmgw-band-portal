import "dotenv/config";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerLocalAuthRoutes } from "../server/_core/localAuth";
import { appRouter } from "../server/routers";
import { createContext } from "../server/_core/context";

/**
 * Vercel serverless API entry point. The frontend is hosted from /public, while
 * every /api/* request is rewritten here by vercel.json.
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
