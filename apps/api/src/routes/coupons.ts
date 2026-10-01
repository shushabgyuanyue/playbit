import type { AuthRepository } from "../authRepository.js";
import { z } from "zod";
import { CouponRedemptionConflict, type CouponRepository } from "../couponRepository.js";
import { requireCurrentUser } from "../http/auth.js";
import type { AgreementRepository } from "../agreementRepository.js";
import type { AgreementRealtimeHub } from "../agreementRealtime.js";
import type { GraceRepository } from "../graceRepository.js";
import { grantGraceIfEligible } from "../graceRepository.js";
import { couponSchema, inputLimits } from "@playbit/shared";
import type { Hono } from "hono";

const independentCouponSchema = z.object({
  gameResultId: z.string().nullable().optional(),
  certificateId: z.string().nullable().optional(),
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().min(1).max(inputLimits.customEquity),
  transferNote: z.string().trim().max(180).nullable().optional(),
  claimLimit: z.number().int().min(1).max(999).default(1)
});

const publicCouponSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  issuerNickname: z.string(),
  transferNote: z.string().nullable(),
  status: z.enum(["available", "reserved", "used", "waived"]),
  createdAt: z.string(),
  claimLimit: z.number().int(),
  claimedCount: z.number().int(),
  remainingClaims: z.number().int()
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
    const coupon = await coupons.createIndependent({
      ...parsed.data,
      issuerUserId: currentUser.id,
      issuerNickname: currentUser.nickname,
      claimLimit: parsed.data.claimLimit,
      transferNote: parsed.data.transferNote?.trim() || null
    });
    return context.json({ coupon: couponSchema.parse(coupon) }, 201);
  });

  app.get("/coupons/share/:token", async (context) => {
    const coupon = await coupons.findByClaimToken(context.req.param("token"));
    if (!coupon || coupon.status !== "available" || coupon.remainingClaims <= 0) {
      return context.json({ message: "Coupon is no longer available" }, 410);
    }
    return context.json({ coupon: publicCouponSchema.parse(coupon) });
  });

  app.post("/coupons/share/:token/claim", async (context) => {
    const currentUser = await requireCurrentUser(context, auth);
    if (currentUser instanceof Response) return currentUser;
    const coupon = await coupons.findByClaimToken(context.req.param("token"));
    if (!coupon) return context.json({ message: "Coupon is no longer available" }, 410);
    if (coupon.remainingClaims <= 0) return context.json({ message: "Coupon is no longer available" }, 410);
    if (coupon.issuerUserId === currentUser.id) {
      return context.json({ message: "Issuer cannot claim own coupon" }, 409);
    }
    const claimed = await coupons.claimByToken(context.req.param("token"), currentUser.id, currentUser.nickname);
    if (!claimed) {
      const latest = await coupons.findByClaimToken(context.req.param("token"));
      return latest && latest.remainingClaims <= 0
        ? context.json({ message: "Coupon is no longer available" }, 410)
        : context.json({ message: "Coupon was already claimed" }, 409);
    }
    return context.json({ coupon: couponSchema.parse(claimed) });
  });

  app.delete("/coupons/:id", async (context) => {
    const currentUser = await requireCurrentUser(context, auth);
    if (currentUser instanceof Response) return currentUser;
    const deleted = await coupons.deleteIndependent(context.req.param("id"), currentUser.id);
    if (!deleted) return context.json({ message: "Coupon cannot be deleted" }, 409);
    return context.body(null, 204);
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
