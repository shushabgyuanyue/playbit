import type { AuthRepository } from "../authRepository.js";
import { CouponRedemptionConflict, type CouponRepository } from "../couponRepository.js";
import { requireCurrentUser } from "../http/auth.js";
import type { AgreementRepository } from "../agreementRepository.js";
import type { AgreementRealtimeHub } from "../agreementRealtime.js";
import type { GraceRepository } from "../graceRepository.js";
import { grantGraceIfEligible } from "../graceRepository.js";
import { couponSchema } from "@playbit/shared";
import type { Hono } from "hono";

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

    const agreement = await agreements.findById(coupon.agreementId);
    if (!agreement || (!coupon.sourceFlipId && agreement.status !== "result_recorded")) {
      return context.json({ message: "Agreement is not awaiting redemption" }, 409);
    }

    try {
      const used = await coupons.redeem(coupon.id, currentUser.id, currentUser.id);
      if (!used) {
        return context.json({ message: "Coupon is no longer available" }, 409);
      }
      const updated = await agreements.findById(agreement.id);
      if (!coupon.sourceFlipId && updated) realtime.publishAgreement(updated);
      const graceTicket = coupon.issuerUserId
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
