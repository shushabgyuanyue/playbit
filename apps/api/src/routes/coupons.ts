import type { AuthRepository } from "../authRepository.js";
import type { CouponRepository } from "../couponRepository.js";
import { requireCurrentUser } from "../http/auth.js";
import type { SessionRepository } from "../sessionRepository.js";
import { couponSchema } from "@playbit/shared";
import type { Hono } from "hono";

export function registerCouponRoutes(
  app: Hono,
  auth: AuthRepository,
  sessions: SessionRepository,
  coupons: CouponRepository
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
    if (coupon.status === "used") {
      return context.json({ message: "Coupon already used" }, 409);
    }

    const used = await coupons.markUsed(coupon.id);
    const session = await sessions.findById(coupon.sessionId);
    if (session && session.status === "settling") {
      await sessions.update({
        ...session,
        status: "fulfilled",
        stake: {
          ...session.stake,
          fulfilled: true
        }
      });
    }

    return context.json({ coupon: couponSchema.parse(used) });
  });
}
