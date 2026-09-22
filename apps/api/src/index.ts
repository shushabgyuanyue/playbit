import { serve } from "@hono/node-server";
import { createPlaybitApp, createRepositories } from "./app.js";
import { createDbClient } from "./db/client.js";

const db = createDbClient();
const repositories = createRepositories(db);
const webOrigins = (
  process.env.WEB_ORIGIN ??
  "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const app = createPlaybitApp(repositories, webOrigins);
const port = Number(process.env.PORT ?? 8787);

serve(
  {
    fetch: app.fetch,
    port
  },
  (info) => {
    console.log(`Playbit API listening on http://localhost:${info.port}`);
  }
);
