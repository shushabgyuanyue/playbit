import { serve } from "@hono/node-server";
import { createPlaybitApp, createRepositories } from "./app.js";
import { createDbClient } from "./db/client.js";

type DataEnvironment = "dev" | "preview" | "prod";

function resolveDataEnvironment(): DataEnvironment {
  const configured = process.env.PLAYBIT_DATA_ENV;
  if (configured === "dev" || configured === "preview" || configured === "prod") {
    return configured;
  }

  return process.env.NODE_ENV === "production" ? "prod" : "dev";
}

const dataEnvironment = resolveDataEnvironment();
if (dataEnvironment === "prod" && !process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is required when PLAYBIT_DATA_ENV=prod (or NODE_ENV=production). Refusing to start in in-memory mode."
  );
}

const db = createDbClient();
const repositories = createRepositories(db);
if (!db && dataEnvironment !== "dev") {
  throw new Error(
    `DATABASE_URL is required for PLAYBIT_DATA_ENV=${dataEnvironment}. Preview and production data must never use in-memory repositories.`
  );
}

if (db) {
  console.log(`Playbit data environment: ${dataEnvironment}; PostgreSQL persistence enabled.`);
}

const defaultWebOrigins =
  process.env.NODE_ENV === "production"
    ? "*"
    : "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174";
const webOrigins = (process.env.WEB_ORIGIN ?? defaultWebOrigins)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const app = createPlaybitApp(repositories, webOrigins);
const defaultPort = process.env.NODE_ENV === "production" ? 8080 : 8787;
const port = Number(process.env.PORT ?? defaultPort);

serve(
  {
    fetch: app.fetch,
    hostname: "0.0.0.0",
    port
  },
  (info) => {
    console.log(`Playbit API listening on http://localhost:${info.port}`);
  }
);
