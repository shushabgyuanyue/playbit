import type { AuthRepository } from "../authRepository.js";
import { z } from "zod";
import { CouponRedemptionConflict, type CouponRepository } from "../couponRepository.js";
import { requireCurrentUser } from "../http/auth.js";
import type { AgreementRepository } from "../agreementRepository.js";
import type { AgreementRealtimeHub } from "../agreementRealtime.js";
import type { GraceRepository } from "../graceRepository.js";
import { grantGraceIfEligible } from "../graceRepository.js";
import { couponSchema } from "@playbit/shared";
import type { Hono } from "hono";

const independentCouponSchema = z.object({
  gameResultId: z.string().nullable().optional(),
  certificateId: z.string().nullable().optional(),
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().min(1).max(180),
  transferNote: z.string().trim().max(180).nullable().optional(),
  holderUserId: z.string().nullable().optional(),
  holderNickname: z.string().trim().min(1).max(20)
});

export function registerCouponRoutes(
  app: Hono,
  auth: AuthRepository,
  agreements: AgreementRepository,
  coupons: CouponRepository,
  realtime: AgreementRealtimeHub,
  grace: GraceRepository
) {
  app.get("/coupons", async (context) => {
    const currentUser = await requireCurrentUser(context, auth);
    if (currentUser instanceof Response) {
      return currentUser;
    }

    const items = await coupons.listByUser(currentUser.id);
    return context.json({ coupons: items.map((coupon) => couponSchema.parse(coupon)) });
  });

  app.post("/coupons/independent", async (context) => {
    const currentUser = await requireCurrentUser(context, auth);
    if (currentUser instanceof Response) return currentUser;
    const parsed = independentCouponSchema.safeParse(await context.req.json().catch(() => ({})));
    if (!parsed.success) return context.json({ message: "Invalid independent equity" }, 422);
    if (parsed.data.holderUserId && !(await auth.findUserById(parsed.data.holderUserId))) {
      return context.json({ message: "Holder account not found" }, 422);
    }
    const coupon = await coupons.createIndependent({
      ...parsed.data,
      issuerUserId: currentUser.id,
      issuerNickname: currentUser.nickname,
      holderUserId: parsed.data.holderUserId ?? null,
      transferNote: parsed.data.transferNote?.trim() || null
    });
    return context.json({ coupon: couponSchema.parse(coupon) }, 201);
  });

  app.patch("/coupons/:id/use", async (context) => {
    const currentUser = await requireCurrentUser(context, auth);
    if (currentUser instanceof Response) {
      return currentUser;
    }

    const coupon = await coupons.findById(context.req.param("id"));
    if (!coupon) {
      return context.json({ message: "Coupon not found" }, 404);
    }
    if (coupon.holderUserId !== currentUser.id) {
      return context.json({ message: "Forbidden" }, 403);
    }
    if (coupon.status !== "available") {
      return context.json({ message: "Coupon is not available" }, 409);
    }

    const agreement = coupon.agreementId ? await agreements.findById(coupon.agreementId) : null;
    if (coupon.agreementId && (!agreement || (!coupon.sourceFlipId && agreement.status !== "result_recorded"))) {
      return context.json({ message: "Agreement is not awaiting redemption" }, 409);
    }

    try {
      const used = await coupons.redeem(coupon.id, currentUser.id, currentUser.id);
      if (!used) {
        return context.json({ message: "Coupon is no longer available" }, 409);
      }
      const updated = agreement ? await agreements.findById(agreement.id) : null;
      if (!coupon.sourceFlipId && updated) realtime.publishAgreement(updated);
      const graceTicket = agreement && coupon.issuerUserId
        ? await grantGraceIfEligible(grace, agreements, coupons, coupon.issuerUserId)
        : null;
      return context.json({ coupon: couponSchema.parse(used), graceTickets: graceTicket });
    } catch (error) {
      if (error instanceof CouponRedemptionConflict) {
        return context.json({ message: "Agreement changed; redemption was rolled back" }, 409);
      }
      throw error;
    }
  });
}
