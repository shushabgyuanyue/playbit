import { serve } from "@hono/node-server";
import { createPlaybitApp, createRepositories } from "../src/app.js";

// Explicitly isolated repositories: this runner never creates a database client.
const app = createPlaybitApp(createRepositories(null), ["http://127.0.0.1:5179", "http://localhost:5179"]);
const server = serve({ fetch: app.fetch, hostname: "127.0.0.1", port: 8799 }, () => {
  console.log("Disposable player flow API: http://127.0.0.1:8799 (memory only)");
});
const stop = () => server.close(() => process.exit(0));
process.once("SIGINT", stop);
process.once("SIGTERM", stop);
setTimeout(stop, 30 * 60 * 1000).unref();
