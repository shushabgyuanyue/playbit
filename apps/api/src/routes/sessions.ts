import type { AuthRepository } from "../authRepository.js";
import type { CouponRepository } from "../couponRepository.js";
import { getCurrentUser, isParticipant, participantIds, requireCurrentUser } from "../http/auth.js";
import type { SessionRepository } from "../sessionRepository.js";
import { createBetSession, settleBetSession, signCounterparty } from "@playbit/game-core";
import {
  betSessionSchema,
  createSessionSchema,
  signSessionSchema,
  settleSessionSchema
} from "@playbit/shared";
import type { Hono } from "hono";

export function registerSessionRoutes(
  app: Hono,
  auth: AuthRepository,
  sessions: SessionRepository,
  coupons: CouponRepository
) {
  app.post("/sessions", async (context) => {
    const currentUser = await getCurrentUser(context, auth);
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
    const currentUser = await getCurrentUser(context, auth);
    if (!currentUser) {
      return context.json({ sessions: [] });
    }

    const items = await sessions.list(currentUser.id);
    return context.json({ sessions: items });
  });

  app.get("/sessions/:id", async (context) => {
    const currentUser = await requireCurrentUser(context, auth);
    if (currentUser instanceof Response) {
      return currentUser;
    }

    const session = await sessions.findById(context.req.param("id"));
    if (!session) {
      return context.json({ message: "Session not found" }, 404);
    }
    if (!isParticipant(session, currentUser.id)) {
      return context.json({ message: "Forbidden" }, 403);
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
    const currentUser = await requireCurrentUser(context, auth);
    if (currentUser instanceof Response) {
      return currentUser;
    }

    const session = await sessions.findByShareCode(context.req.param("shareCode"));
    if (!session) {
      return context.json({ message: "Share page not found" }, 404);
    }

    const payload = signSessionSchema.parse(await context.req.json());
    const initiator = session.participants.find((participant) => participant.role === "initiator");
    const counterparty = session.participants.find((participant) => participant.role === "counterparty");
    if (initiator?.userId === currentUser.id) {
      return context.json({ message: "Initiator cannot sign as counterparty" }, 409);
    }
    if (counterparty) {
      if (counterparty.userId === currentUser.id) {
        return context.json({ session });
      }
      return context.json({ message: "Agreement already signed" }, 409);
    }
    if (session.status !== "pending_confirmation") {
      return context.json({ message: "Agreement is not open for signing" }, 409);
    }

    const signed = signCounterparty(session, payload.nickname, currentUser.id);
    await sessions.update(signed);
    return context.json({ session: signed });
  });

  app.patch("/sessions/:id/settle", async (context) => {
    const currentUser = await requireCurrentUser(context, auth);
    if (currentUser instanceof Response) {
      return currentUser;
    }

    const session = await sessions.findById(context.req.param("id"));
    if (!session) {
      return context.json({ message: "Session not found" }, 404);
    }
    if (!isParticipant(session, currentUser.id)) {
      return context.json({ message: "Forbidden" }, 403);
    }
    if (session.status !== "active") {
      return context.json({ message: "Only active agreements can be settled" }, 409);
    }

    const payload = settleSessionSchema.parse(await context.req.json());
    if (!participantIds(session).includes(payload.winnerId)) {
      return context.json({ message: "Winner must be a participant" }, 422);
    }

    const settled = settleBetSession(session, payload.winnerId, payload.fulfilled);
    await sessions.update(settled);
    await coupons.upsertForSession(settled);
    return context.json({ session: settled });
  });

  app.patch("/sessions/:id/fulfill", async (context) => {
    const currentUser = await requireCurrentUser(context, auth);
    if (currentUser instanceof Response) {
      return currentUser;
    }

    const session = await sessions.findById(context.req.param("id"));
    if (!session) {
      return context.json({ message: "Session not found" }, 404);
    }
    if (!isParticipant(session, currentUser.id)) {
      return context.json({ message: "Forbidden" }, 403);
    }
    if (session.status !== "settling" || !session.winnerId) {
      return context.json({ message: "Only settling agreements can be fulfilled" }, 409);
    }

    const fulfilled = {
      ...session,
      status: "fulfilled" as const,
      stake: {
        ...session.stake,
        fulfilled: true
      }
    };
    await sessions.update(fulfilled);
    await coupons.markSessionUsed(fulfilled.id);
    return context.json({ session: betSessionSchema.parse(fulfilled) });
  });
}
