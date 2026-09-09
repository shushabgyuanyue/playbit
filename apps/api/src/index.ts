import { serve } from "@hono/node-server";
import { dailyCards, drawCard } from "@playbit/cards";
import { createBetSession, settleBetSession, signCounterparty } from "@playbit/game-core";
import {
  betSessionSchema,
  createSessionSchema,
  signSessionSchema,
  settleSessionSchema
} from "@playbit/shared";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { createSessionRepository } from "./sessionRepository.js";

const app = new Hono();
const sessions = createSessionRepository();
const webOrigins = (process.env.WEB_ORIGIN ?? "http://localhost:5173,http://127.0.0.1:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  "*",
  cors({
    origin: webOrigins,
    allowMethods: ["GET", "POST", "PATCH", "OPTIONS"]
  })
);

app.get("/health", (context) =>
  context.json({
    ok: true,
    service: "playbit-api"
  })
);

app.get("/cards", (context) => context.json({ cards: dailyCards }));

app.post("/cards/draw", async (context) => {
  const body = await context.req.json().catch(() => ({ previousIds: [] }));
  const previousIds = Array.isArray(body.previousIds) ? body.previousIds : [];
  return context.json({ card: drawCard(previousIds, Boolean(body.includeMagic)) });
});

app.post("/sessions", async (context) => {
  const payload = createSessionSchema.parse(await context.req.json());
  const session = createBetSession(payload);
  const created = await sessions.create(session);
  return context.json({ session: betSessionSchema.parse(created) }, 201);
});

app.get("/sessions", (context) =>
  sessions.list().then((items) => context.json({ sessions: items }))
);

app.get("/sessions/:id", async (context) => {
  const session = await sessions.findById(context.req.param("id"));
  if (!session) {
    return context.json({ message: "Session not found" }, 404);
  }
  return context.json({ session });
});

app.get("/share/:shareCode", async (context) => {
  const session = await sessions.findByShareCode(context.req.param("shareCode"));
  if (!session) {
    return context.json({ message: "Share page not found" }, 404);
  }
  return context.json({ session });
});

app.post("/share/:shareCode/sign", async (context) => {
  const session = await sessions.findByShareCode(context.req.param("shareCode"));
  if (!session) {
    return context.json({ message: "Share page not found" }, 404);
  }

  const payload = signSessionSchema.parse(await context.req.json());
  const signed = signCounterparty(session, payload.nickname);
  await sessions.update(signed);
  return context.json({ session: signed });
});

app.patch("/sessions/:id/settle", async (context) => {
  const session = await sessions.findById(context.req.param("id"));
  if (!session) {
    return context.json({ message: "Session not found" }, 404);
  }

  const payload = settleSessionSchema.parse(await context.req.json());
  const settled = settleBetSession(session, payload.winnerId, payload.fulfilled);
  await sessions.update(settled);
  return context.json({ session: settled });
});

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
