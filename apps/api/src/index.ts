import { serve } from "@hono/node-server";
import { dailyCards, drawCard } from "@playbit/cards";
import { createBetSession, settleBetSession, signCounterparty } from "@playbit/game-core";
import {
  betSessionSchema,
  createSessionSchema,
  guestAuthSchema,
  loginSchema,
  registerSchema,
  signSessionSchema,
  settleSessionSchema,
  type User
} from "@playbit/shared";
import { Hono } from "hono";
import type { Context } from "hono";
import { cors } from "hono/cors";
import { createAuthRepository } from "./authRepository.js";
import { createDbClient } from "./db/client.js";
import { createSessionRepository } from "./sessionRepository.js";

const app = new Hono();
const db = createDbClient();
const auth = createAuthRepository(db);
const sessions = createSessionRepository(db);
const webOrigins = (process.env.WEB_ORIGIN ?? "http://localhost:5173,http://127.0.0.1:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  "*",
  cors({
    origin: webOrigins,
    allowMethods: ["GET", "POST", "PATCH", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"]
  })
);

async function getCurrentUser(context: Context): Promise<User | null> {
  const header = context.req.header("Authorization");
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;
  return token ? auth.findUserByToken(token) : null;
}

app.get("/health", (context) =>
  context.json({
    ok: true,
    service: "playbit-api"
  })
);

app.get("/cards", (context) => context.json({ cards: dailyCards }));

app.post("/auth/guest", async (context) => {
  const payload = guestAuthSchema.parse(await context.req.json().catch(() => ({})));
  const result = await auth.createGuest(payload.nickname);
  return context.json(result, 201);
});

app.post("/auth/register", async (context) => {
  const currentUser = await getCurrentUser(context);
  const payload = registerSchema.parse(await context.req.json());

  try {
    const result = await auth.register(payload, currentUser?.id ?? null);
    return context.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "EMAIL_TAKEN") {
      return context.json({ message: "Email already registered" }, 409);
    }
    throw error;
  }
});

app.post("/auth/login", async (context) => {
  const payload = loginSchema.parse(await context.req.json());
  const result = await auth.login(payload);
  if (!result) {
    return context.json({ message: "Invalid email or password" }, 401);
  }
  return context.json(result);
});

app.get("/auth/me", async (context) => {
  const user = await getCurrentUser(context);
  if (!user) {
    return context.json({ user: null });
  }
  return context.json({ user });
});

app.post("/cards/draw", async (context) => {
  const body = await context.req.json().catch(() => ({ previousIds: [] }));
  const previousIds = Array.isArray(body.previousIds) ? body.previousIds : [];
  return context.json({ card: drawCard(previousIds, Boolean(body.includeMagic)) });
});

app.post("/sessions", async (context) => {
  const currentUser = await getCurrentUser(context);
  const payload = createSessionSchema.parse(await context.req.json());
  const session = createBetSession(
    {
      ...payload,
      creatorNickname: payload.creatorNickname ?? currentUser?.nickname ?? "发起方"
    },
    currentUser?.id ?? null
  );
  const created = await sessions.create(session);
  return context.json({ session: betSessionSchema.parse(created) }, 201);
});

app.get("/sessions", async (context) => {
  const currentUser = await getCurrentUser(context);
  if (!currentUser) {
    return context.json({ sessions: [] });
  }

  const items = await sessions.list(currentUser.id);
  return context.json({ sessions: items });
});

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
  const currentUser = await getCurrentUser(context);
  const signed = signCounterparty(session, payload.nickname, currentUser?.id ?? null);
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
