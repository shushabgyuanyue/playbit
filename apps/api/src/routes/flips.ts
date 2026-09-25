import { drawCard } from "@playbit/cards";
import { beginFlip, recordFlipResult, respondToFlip } from "@playbit/game-core";
import {
  createFlipSchema,
  flipSchema,
  flipResponseSchema,
  recordFlipResultSchema
} from "@playbit/shared";
import type { Hono } from "hono";
import type { AuthRepository } from "../authRepository.js";
import type { AgreementRepository } from "../agreementRepository.js";
import type { CouponRepository } from "../couponRepository.js";
import { FlipConflict, type FlipRepository } from "../flipRepository.js";
import type { AgreementRealtimeHub } from "../agreementRealtime.js";
import { requireCurrentUser, requireAgreementParticipant } from "../http/auth.js";

export function registerFlipRoutes(
  app: Hono,
  auth: AuthRepository,
  agreements: AgreementRepository,
  coupons: CouponRepository,
  flips: FlipRepository,
  realtime: AgreementRealtimeHub
) {
  app.get("/agreements/:id/flips", async (context) => {
    const user = await requireCurrentUser(context, auth);
    if (user instanceof Response) return user;
    const agreement = await agreements.findById(context.req.param("id"));
    if (!agreement) return context.json({ message: "Agreement not found" }, 404);
    const forbidden = requireAgreementParticipant(context, agreement, user);
    if (forbidden) return forbidden;
    return context.json({ flips: await flips.listByAgreement(agreement.id) });
  });

  app.post("/agreements/:id/flips", async (context) => {
    const user = await requireCurrentUser(context, auth);
    if (user instanceof Response) return user;
    const agreement = await agreements.findById(context.req.param("id"));
    if (!agreement) return context.json({ message: "Agreement not found" }, 404);
    const forbidden = requireAgreementParticipant(context, agreement, user);
    if (forbidden) return forbidden;
    if (!agreement.winnerId || !agreement.loserId) {
      return context.json({ message: "Agreement has no open equity to flip" }, 409);
    }

    const payload = createFlipSchema.parse(await context.req.json());
    const coupon = await coupons.findById(payload.couponId);
    if (!coupon || coupon.agreementId !== agreement.id) {
      return context.json({ message: "Equity not found" }, 404);
    }
    const openFlip = await flips.findOpenByCoupon(coupon.id);
    let flip;
    try {
      flip = beginFlip(agreement, coupon, drawCard([], "versus"), user.id, Boolean(openFlip));
      const created = await flips.create(flip);
      return context.json({ flip: flipSchema.parse(created) }, 201);
    } catch (error) {
      if (error instanceof FlipConflict) {
        return context.json({ message: "Equity is already being handled" }, 409);
      }
      if (error instanceof Error && error.message.startsWith("FLIP_")) {
        return context.json({ message: error.message }, 409);
      }
      throw error;
    }
  });

  app.get("/flips/:id", async (context) => {
    const user = await requireCurrentUser(context, auth);
    if (user instanceof Response) return user;
    const flip = await flips.findById(context.req.param("id"));
    if (!flip) return context.json({ message: "Flip not found" }, 404);
    if (![flip.applicantUserId, flip.inviteeUserId].includes(user.id)) {
      return context.json({ message: "Forbidden" }, 403);
    }
    return context.json({ flip });
  });

  app.patch("/flips/:id/response", async (context) => {
    const user = await requireCurrentUser(context, auth);
    if (user instanceof Response) return user;
    const current = await flips.findById(context.req.param("id"));
    if (!current) return context.json({ message: "Flip not found" }, 404);
    const payload = flipResponseSchema.parse(await context.req.json());
    try {
      const next = respondToFlip(current, user.id, payload.accept);
      const updated = await flips.respond(next, current.status);
      return context.json({ flip: updated });
    } catch (error) {
      if (error instanceof FlipConflict) return context.json({ message: "Flip state changed" }, 409);
      if (error instanceof Error && error.message.startsWith("FLIP_")) {
        return context.json({ message: "Only the invited participant can respond" }, 403);
      }
      throw error;
    }
  });

  app.patch("/flips/:id/result", async (context) => {
    const user = await requireCurrentUser(context, auth);
    if (user instanceof Response) return user;
    const current = await flips.findById(context.req.param("id"));
    if (!current) return context.json({ message: "Flip not found" }, 404);
    const payload = recordFlipResultSchema.parse(await context.req.json());
    const sourceCoupon = await coupons.findById(current.couponId);
    if (!sourceCoupon) return context.json({ message: "Equity not found" }, 404);
    try {
      const next = recordFlipResult(current, payload.winnerUserId, user.id);
      const updatedFlip = await flips.resolve(next, sourceCoupon, current.status);
      const agreement = await agreements.findById(current.agreementId);
      if (agreement) realtime.publishAgreement(agreement);
      const [coupon, issuedCoupon] = await Promise.all([
        coupons.findById(updatedFlip.couponId),
        updatedFlip.outcome === "applicant_lost"
          ? coupons.findBySourceFlipId(updatedFlip.id)
          : Promise.resolve(null)
      ]);
      return context.json({ flip: updatedFlip, agreement, coupon, issuedCoupon });
    } catch (error) {
      if (error instanceof FlipConflict) return context.json({ message: "Flip or equity state changed" }, 409);
      if (error instanceof Error && error.message.startsWith("FLIP_")) {
        return context.json({ message: "Only flip participants can record its result" }, 403);
      }
      throw error;
    }
  });
}
