import { defineConfig } from "drizzle-kit";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to run drizzle commands");
}

const connectionUrl = new URL(connectionString);
const useTls = process.env.DATABASE_SSL === "true" || connectionUrl.hostname.endsWith("tidbcloud.com");

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials: {
    ...(useTls
      ? {
          host: connectionUrl.hostname,
          port: Number(connectionUrl.port || 3306),
          user: decodeURIComponent(connectionUrl.username),
          password: decodeURIComponent(connectionUrl.password),
          database: decodeURIComponent(connectionUrl.pathname.replace(/^\//, "")),
          ssl: { minVersion: "TLSv1.2", rejectUnauthorized: true },
        }
      : { url: connectionString }),
  },
});
