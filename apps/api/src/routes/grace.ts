import { z } from "zod";
import { agreementSchema, graceTicketSchema, graceWaiverSchema } from "@playbit/shared";
import type { Hono } from "hono";
import type { AuthRepository } from "../authRepository.js";
import type { AgreementRepository } from "../agreementRepository.js";
import { AgreementRevisionConflict } from "../agreementRepository.js";
import type { CouponRepository } from "../couponRepository.js";
import { GraceConflict, type GraceRepository } from "../graceRepository.js";
import { grantGraceIfEligible } from "../graceRepository.js";
import type { AgreementRealtimeHub } from "../agreementRealtime.js";
import { requireCurrentUser, requireAgreementParticipant } from "../http/auth.js";

const requestSchema = z.object({ couponId: z.string().min(1) });
const decisionSchema = z.object({ accept: z.boolean() });

export function registerGraceRoutes(
  app: Hono,
  auth: AuthRepository,
  agreements: AgreementRepository,
  coupons: CouponRepository,
  grace: GraceRepository,
  realtime: AgreementRealtimeHub
) {
  app.get("/grace", async (context) => {
    const user = await requireCurrentUser(context, auth);
    if (user instanceof Response) return user;
    await grantGraceIfEligible(grace, agreements, coupons, user.id);
    const [tickets, waivers] = await Promise.all([
      grace.listByUser(user.id),
      grace.listWaiversForUser(user.id)
    ]);
    return context.json({
      tickets: tickets.map((ticket) => graceTicketSchema.parse(ticket)),
      waivers: waivers.map((waiver) => graceWaiverSchema.parse(waiver))
    });
  });

  app.post("/agreements/:agreementId/fulfill", async (context) => {
    const user = await requireCurrentUser(context, auth);
    if (user instanceof Response) return user;
    const agreement = await agreements.findById(context.req.param("agreementId"));
    if (!agreement) return context.json({ message: "Agreement not found" }, 404);
    const forbidden = requireAgreementParticipant(context, agreement, user);
    if (forbidden) return forbidden;
    if (agreement.status !== "result_recorded" || agreement.stake.type === "coupon") {
      return context.json({ message: "This agreement cannot be recorded as completed here" }, 409);
    }

    let updated;
    try {
      updated = await agreements.update({
        ...agreement,
        status: "fulfilled",
        stake: { ...agreement.stake, fulfilled: true },
        fulfillmentRecorderUserId: user.id
      }, agreement.revision);
    } catch (error) {
      if (error instanceof AgreementRevisionConflict) {
        return context.json({ message: "Agreement state changed; refresh and try again" }, 409);
      }
      throw error;
    }
    realtime.publishAgreement(updated);
    const ticket = await grantGraceIfEligible(grace, agreements, coupons,
      updated.participants.find((participant) => participant.id === updated.loserId)?.userId ?? user.id);
    return context.json({ agreement: agreementSchema.parse(updated), graceTickets: ticket });
  });

  app.post("/grace/:ticketId/waivers", async (context) => {
    const user = await requireCurrentUser(context, auth);
    if (user instanceof Response) return user;
    const { couponId } = requestSchema.parse(await context.req.json());
    const coupon = await coupons.findById(couponId);
    if (!coupon) return context.json({ message: "Equity not found" }, 404);
    const agreement = await agreements.findById(coupon.agreementId);
    if (!agreement) return context.json({ message: "Agreement not found" }, 404);
    const forbidden = requireAgreementParticipant(context, agreement, user);
    if (forbidden) return forbidden;
    try {
      const waiver = await grace.createWaiver(context.req.param("ticketId"), coupon, agreement, user.id);
      return context.json({ waiver: graceWaiverSchema.parse(waiver) }, 201);
    } catch (error) {
      if (error instanceof GraceConflict) return context.json({ message: error.message }, 409);
      throw error;
    }
  });

  app.patch("/grace/waivers/:id", async (context) => {
    const user = await requireCurrentUser(context, auth);
    if (user instanceof Response) return user;
    const { accept } = decisionSchema.parse(await context.req.json());
    try {
      const waiver = await grace.resolveWaiver(context.req.param("id"), user.id, accept);
      const agreement = await agreements.findById(waiver.agreementId);
      if (agreement) realtime.publishAgreement(agreement);
      return context.json({ waiver: graceWaiverSchema.parse(waiver), agreement });
    } catch (error) {
      if (error instanceof GraceConflict) {
        const status = error.message === "WAIVER_RESPONSE_FORBIDDEN" ? 403 : 409;
        return context.json({ message: error.message }, status);
      }
      throw error;
    }
  });
}
