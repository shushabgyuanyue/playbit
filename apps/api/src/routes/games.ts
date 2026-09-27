import { createHash } from "node:crypto";
import { dailyCards } from "@playbit/cards";
import { createGame, joinGame } from "@playbit/game-core";
import { createGameSchema, joinGameSchema } from "@playbit/shared";
import type { Hono } from "hono";
import type { AppRepositories } from "../app.js";
import { AgreementRevisionConflict } from "../agreementRepository.js";
import { requireCurrentUser } from "../http/auth.js";

export function registerGameRoutes(app: Hono, { auth, agreements, realtime }: AppRepositories) {
  app.post("/games", async context => {
    const user = await requireCurrentUser(context, auth);
    if (user instanceof Response) return user;
    const parsed = createGameSchema.safeParse(await context.req.json());
    if (!parsed.success) return context.json({ message: "Invalid game stakes" }, 422);
    const input = parsed.data;
    const card = dailyCards.find(item => item.id === input.cardId && item.mode === "versus");
    if (!card) return context.json({ message: "This card cannot have stakes" }, 422);
    // The request identity survives network retries; it never doubles as an invitation code.
    const id = `game_${createHash("sha256").update(`${user.id}:${input.requestId}`).digest("hex").slice(0, 32)}`;
    const existing = await agreements.findById(id);
    if (existing) {
      if (existing.cardId !== input.cardId || existing.stake.label !== input.stake.label) {
        return context.json({ message: "Request already used for another game" }, 409);
      }
      return context.json({ agreement: existing });
    }
    try {
      const agreement = await agreements.create({ ...createGame(input, card, user), id });
      return context.json({ agreement }, 201);
    } catch (error) {
      const saved = await agreements.findById(id);
      if (saved && saved.cardId === input.cardId && saved.stake.label === input.stake.label) {
        return context.json({ agreement: saved });
      }
      if (saved) return context.json({ message: "Request already used for another game" }, 409);
      throw error;
    }
  });

  app.post("/games/:shareCode/join", async context => {
    const user = await requireCurrentUser(context, auth);
    if (user instanceof Response) return user;
    const agreement = await agreements.findByShareCode(context.req.param("shareCode"));
    if (!agreement || agreement.source !== "card") return context.json({ message: "Game not found" }, 404);
    if (agreement.ownerUserId === user.id) return context.json({ message: "Cannot join your own invitation" }, 409);
    if (agreement.participants.some(person => person.userId === user.id)) return context.json({ agreement });
    const parsed = joinGameSchema.safeParse(await context.req.json());
    if (!parsed.success) return context.json({ message: "Confirmation revision required" }, 422);
    if (agreement.status !== "pending_confirmation" || agreement.revision !== parsed.data.revision) {
      return context.json({ message: "Invitation changed or already accepted" }, 409);
    }
    try {
      const updated = await agreements.update(joinGame(agreement, user), agreement.revision);
      realtime.publishAgreement(updated);
      return context.json({ agreement: updated });
    } catch (error) {
      if (error instanceof AgreementRevisionConflict) return context.json({ message: "Invitation already accepted" }, 409);
      throw error;
    }
  });
}
