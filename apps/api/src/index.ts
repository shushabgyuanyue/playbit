import { serve } from "@hono/node-server";
import { createPlaybitApp, createRepositories } from "./app.js";
import { createDbClient } from "./db/client.js";

const db = createDbClient();
const repositories = createRepositories(db);
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
