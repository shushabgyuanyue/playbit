import type { AuthRepository } from "../authRepository.js";
import { dailyCards } from "@playbit/cards";
import type { CouponRepository } from "../couponRepository.js";
import { canViewAgreement, isParticipant, agreementParticipantIds, requireCurrentUser, requireAgreementParticipant } from "../http/auth.js";
import { AgreementRevisionConflict, type AgreementRepository } from "../agreementRepository.js";
import type { AgreementRealtimeHub } from "../agreementRealtime.js";
import {
  addBoost,
  confirmBoost,
  createAgreement,
  recordAgreementResult,
  signCounterparty,
  updateAgreementDraft
} from "@playbit/game-core";
import {
  agreementSchema,
  createBoostSchema,
  createAgreementSchema,
  signAgreementSchema,
  recordResultSchema,
  updateAgreementSchema
} from "@playbit/shared";
import type { AgreementRealtimeEvent } from "@playbit/shared";
import type { Context, Hono } from "hono";

export function registerAgreementRoutes(
  app: Hono,
  auth: AuthRepository,
  agreements: AgreementRepository,
  coupons: CouponRepository,
  realtime: AgreementRealtimeHub
) {
  const noStore = (context: Context) => {
    context.header("Cache-Control", "no-store, max-age=0");
  };

  app.post("/agreements", async (context) => {
    const currentUser = await requireCurrentUser(context, auth);
    if (currentUser instanceof Response) {
      return currentUser;
    }
    const payload = createAgreementSchema.parse(await context.req.json());
    if (payload.source === "card" && !dailyCards.some((card) => card.id === payload.cardId && card.mode === "versus")) {
      return context.json({ message: "This card cannot be used for an agreement" }, 422);
    }
    const agreement = createAgreement(
      {
        ...payload,
        creatorNickname: payload.creatorNickname ?? currentUser.nickname
      },
      currentUser.id
    );
    await auth.updateSignature(currentUser.id, payload.creatorSignatureDataUrl);
    const created = await agreements.create(agreement);
    return context.json({ agreement: agreementSchema.parse(created) }, 201);
  });

  app.get("/agreements", async (context) => {
    noStore(context);
    const currentUser = await requireCurrentUser(context, auth);
    if (currentUser instanceof Response) {
      return currentUser;
    }

    const items = await agreements.list(currentUser.id);
    return context.json({ agreements: items });
  });

  app.get("/agreements/:id", async (context) => {
    noStore(context);
    const currentUser = await requireCurrentUser(context, auth);
    if (currentUser instanceof Response) {
      return currentUser;
    }

    const agreement = await agreements.findById(context.req.param("id"));
    if (!agreement) {
      return context.json({ message: "Session not found" }, 404);
    }
    const accessError = requireAgreementParticipant(context, agreement, currentUser);
    if (accessError) {
      return accessError;
    }

    return context.json({ agreement });
  });

  app.patch("/agreements/:id", async (context) => {
    const currentUser = await requireCurrentUser(context, auth);
    if (currentUser instanceof Response) {
      return currentUser;
    }

    const agreement = await agreements.findById(context.req.param("id"));
    if (!agreement) {
      return context.json({ message: "Session not found" }, 404);
    }
    const accessError = requireAgreementParticipant(context, agreement, currentUser);
    if (accessError) {
      return accessError;
    }

    const payload = updateAgreementSchema.parse(await context.req.json());
    if (payload.source === "card" && !dailyCards.some((card) => card.id === payload.cardId && card.mode === "versus")) {
      return context.json({ message: "This card cannot be used for an agreement" }, 422);
    }

    try {
      const draft = updateAgreementDraft(
        agreement,
        { ...payload, creatorNickname: currentUser.nickname },
        currentUser.id
      );
      await auth.updateSignature(currentUser.id, payload.creatorSignatureDataUrl);
      const updated = await agreements.update(draft, agreement.revision);
      realtime.publishAgreement(updated);
      return context.json({ agreement: agreementSchema.parse(updated) });
    } catch (error) {
      if (error instanceof Error && error.message === "AGREEMENT_DRAFT_NOT_EDITABLE") {
        return context.json({ message: "Only unsigned drafts can be edited" }, 409);
      }
      if (error instanceof Error && error.message === "AGREEMENT_DRAFT_FORBIDDEN") {
        return context.json({ message: "Only the initiator can edit this draft" }, 403);
      }
      if (error instanceof AgreementRevisionConflict) {
        const latest = await agreements.findById(agreement.id);
        return context.json({ message: "Agreement changed, please refresh", agreement: latest }, 409);
      }
      throw error;
    }
  });

  app.delete("/agreements/:id", async (context) => {
    const currentUser = await requireCurrentUser(context, auth);
    if (currentUser instanceof Response) {
      return currentUser;
    }

    const agreement = await agreements.findById(context.req.param("id"));
    if (!agreement) {
      return context.json({ message: "Session not found" }, 404);
    }

    const isInitiator = agreement.participants.some(
      (participant) => participant.role === "initiator" && participant.userId === currentUser.id
    );
    if (agreement.ownerUserId !== currentUser.id || !isInitiator) {
      return context.json({ message: "Only the initiator can delete this agreement" }, 403);
    }
    if (agreement.status === "fulfilled" || agreement.status === "waived") {
      return context.json({ message: "Completed agreements cannot be deleted" }, 409);
    }

    const deleted = await agreements.delete(agreement.id);
    if (!deleted) {
      return context.json({ message: "Session not found" }, 404);
    }
    return context.body(null, 204);
  });

  app.get("/agreements/:id/sync", async (context) => {
    noStore(context);
    const currentUser = await requireCurrentUser(context, auth);
    if (currentUser instanceof Response) {
      return currentUser;
    }

    const agreement = await agreements.findById(context.req.param("id"));
    if (!agreement) {
      return context.json({ message: "Session not found" }, 404);
    }
    const accessError = requireAgreementParticipant(context, agreement, currentUser);
    if (accessError) {
      return accessError;
    }

    return context.json({ agreement });
  });

  app.get("/agreements/:id/events", async (context) => {
    const token = context.req.query("token");
    const currentUser = token ? await auth.findUserByToken(token) : null;
    if (!currentUser) {
      return context.json({ message: "Authentication required" }, 401);
    }

    const agreement = await agreements.findById(context.req.param("id"));
    if (!agreement) {
      return context.json({ message: "Session not found" }, 404);
    }
    const accessError = requireAgreementParticipant(context, agreement, currentUser);
    if (accessError) {
      return accessError;
    }

    const encoder = new TextEncoder();
    let closed = false;
    let unsubscribe: () => void = () => undefined;
    let keepAlive: ReturnType<typeof setInterval> | undefined;
    let controllerRef: ReadableStreamDefaultController<Uint8Array> | null = null;

    const close = () => {
      if (closed) {
        return;
      }
      closed = true;
      if (keepAlive) {
        clearInterval(keepAlive);
      }
      unsubscribe();
      try {
        controllerRef?.close();
      } catch {
        // The client may already have closed the stream.
      }
    };

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controllerRef = controller;
        const send = (event: AgreementRealtimeEvent) => {
          if (closed) {
            return;
          }
          controller.enqueue(
            encoder.encode(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`)
          );
        };
        unsubscribe = realtime.subscribe(agreement, send);
        keepAlive = setInterval(() => {
          if (!closed) {
            controller.enqueue(encoder.encode(": keep-alive\n\n"));
          }
        }, 15_000);
        context.req.raw.signal.addEventListener("abort", close, { once: true });
      },
      cancel() {
        close();
      }
    });

    return new Response(stream, {
      headers: {
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "Content-Type": "text/event-stream",
        "X-Accel-Buffering": "no"
      }
    });
  });

  app.get("/share/:shareCode", async (context) => {
    noStore(context);
    const agreement = await agreements.findByShareCode(context.req.param("shareCode"));
    if (!agreement) {
      return context.json({ message: "Share page not found" }, 404);
    }
    const token = context.req.header("Authorization")?.replace(/^Bearer /, "");
    const currentUser = token ? await auth.findUserByToken(token) : null;
    if (!canViewAgreement(agreement, currentUser?.id ?? null)) {
      return context.json({ message: "Forbidden" }, 403);
    }
    return context.json({ agreement });
  });

  app.post("/share/:shareCode/sign", async (context) => {
    const currentUser = await requireCurrentUser(context, auth);
    if (currentUser instanceof Response) {
      return currentUser;
    }

    const agreement = await agreements.findByShareCode(context.req.param("shareCode"));
    if (!agreement) {
      return context.json({ message: "Share page not found" }, 404);
    }

    const payload = signAgreementSchema.parse(await context.req.json());
    const initiator = agreement.participants.find((participant) => participant.role === "initiator");
    const counterparty = agreement.participants.find((participant) => participant.role === "counterparty");
    if (initiator?.userId === currentUser.id) {
      return context.json({ message: "Initiator cannot sign as counterparty" }, 409);
    }
    if (counterparty) {
      if (counterparty.userId === currentUser.id) {
        return context.json({ agreement });
      }
      return context.json({ message: "Agreement already signed" }, 409);
    }
    if (agreement.status !== "pending_signature") {
      return context.json({ message: "Agreement is not open for signing" }, 409);
    }

    const signed = signCounterparty(agreement, currentUser.nickname, currentUser.id, payload.signatureDataUrl);
    await auth.updateSignature(currentUser.id, payload.signatureDataUrl);
    try {
      const updated = await agreements.update(signed, agreement.revision);
      realtime.publishAgreement(updated);
      return context.json({ agreement: updated });
    } catch (error) {
      if (error instanceof AgreementRevisionConflict) {
        const latest = await agreements.findByShareCode(context.req.param("shareCode"));
      return context.json({ message: "Agreement changed, please refresh", agreement: latest }, 409);
      }
      throw error;
    }
  });

  app.patch("/agreements/:id/result", async (context) => {
    const currentUser = await requireCurrentUser(context, auth);
    if (currentUser instanceof Response) {
      return currentUser;
    }

    const agreement = await agreements.findById(context.req.param("id"));
    if (!agreement) {
      return context.json({ message: "Session not found" }, 404);
    }
    const accessError = requireAgreementParticipant(context, agreement, currentUser);
    if (accessError) {
      return accessError;
    }
    if (agreement.status !== "active") {
      return context.json({ message: "Only active agreements can be settled" }, 409);
    }

    const payload = recordResultSchema.parse(await context.req.json());
    if (!agreementParticipantIds(agreement).includes(payload.winnerId)) {
      return context.json({ message: "Winner must be a participant" }, 422);
    }

    const settled = recordAgreementResult(agreement, payload.winnerId, currentUser.id);
    try {
      const updated = await agreements.update(settled, agreement.revision);
      await coupons.upsertForAgreement(updated);
      realtime.publishAgreement(updated);
      return context.json({ agreement: updated });
    } catch (error) {
      if (error instanceof AgreementRevisionConflict) {
        const latest = await agreements.findById(agreement.id);
        return context.json({ message: "Agreement changed, please refresh", agreement: latest }, 409);
      }
      throw error;
    }
  });

  app.post("/agreements/:id/boost", async (context) => {
    const currentUser = await requireCurrentUser(context, auth);
    if (currentUser instanceof Response) {
      return currentUser;
    }

    const agreement = await agreements.findById(context.req.param("id"));
    if (!agreement) {
      return context.json({ message: "Session not found" }, 404);
    }
    const accessError = requireAgreementParticipant(context, agreement, currentUser);
    if (accessError) {
      return accessError;
    }
    const participant = agreement.participants.find((candidate) => candidate.userId === currentUser.id);
    if (!participant) {
      return context.json({ message: "Forbidden" }, 403);
    }

    const payload = createBoostSchema.parse(await context.req.json());
    try {
      const boosted = addBoost(agreement, participant.id, payload.label);
      const updated = await agreements.update(boosted, agreement.revision);
      realtime.publishAgreement(updated);
      return context.json({ agreement: agreementSchema.parse(updated) }, 201);
    } catch (error) {
      if (error instanceof Error && error.message === "BOOST_LIMIT_REACHED") {
        return context.json({ message: "Boost limit reached" }, 409);
      }
      if (error instanceof AgreementRevisionConflict) {
        const latest = await agreements.findById(agreement.id);
        return context.json({ message: "Agreement changed, please refresh", agreement: latest }, 409);
      }
      throw error;
    }
  });

  app.post("/agreements/:id/boost/:boostId/confirm", async (context) => {
    const currentUser = await requireCurrentUser(context, auth);
    if (currentUser instanceof Response) {
      return currentUser;
    }

    const agreement = await agreements.findById(context.req.param("id"));
    if (!agreement) {
      return context.json({ message: "Session not found" }, 404);
    }
    const participant = agreement.participants.find((candidate) => candidate.userId === currentUser.id);
    if (!participant) {
      return context.json({ message: "Forbidden" }, 403);
    }

    try {
      const confirmed = confirmBoost(agreement, context.req.param("boostId"), participant.id);
      const updated = await agreements.update(confirmed, agreement.revision);
      realtime.publishAgreement(updated);
      return context.json({ agreement: agreementSchema.parse(updated) });
    } catch (error) {
      if (error instanceof Error && error.message === "BOOST_NOT_FOUND") {
        return context.json({ message: "Boost not found" }, 404);
      }
      if (error instanceof AgreementRevisionConflict) {
        const latest = await agreements.findById(agreement.id);
        return context.json({ message: "Agreement changed, please refresh", agreement: latest }, 409);
      }
      throw error;
    }
  });
}
