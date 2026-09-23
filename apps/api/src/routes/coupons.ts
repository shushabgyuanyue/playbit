import type { AuthRepository } from "../authRepository.js";
import type { CouponRepository } from "../couponRepository.js";
import { requireCurrentUser } from "../http/auth.js";
import { SessionRevisionConflict, type SessionRepository } from "../sessionRepository.js";
import type { SessionRealtimeHub } from "../sessionRealtime.js";
import { couponSchema } from "@playbit/shared";
import type { Hono } from "hono";

export function registerCouponRoutes(
  app: Hono,
  auth: AuthRepository,
  sessions: SessionRepository,
  coupons: CouponRepository,
  realtime: SessionRealtimeHub
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

    const session = await sessions.findById(coupon.sessionId);
    if (!session || session.status !== "settling") {
      return context.json({ message: "Agreement is not awaiting redemption" }, 409);
    }

    try {
      const updated = await sessions.update(
        {
          ...session,
          status: "fulfilled",
          stake: {
            ...session.stake,
            fulfilled: true
          }
        },
        session.revision
      );
      const used = await coupons.markUsedIfAvailable(coupon.id);
      if (!used) {
        const latest = await sessions.findById(session.id);
        return context.json({ message: "Coupon already used", session: latest }, 409);
      }
      realtime.publishSession(updated);
      return context.json({ coupon: couponSchema.parse(used) });
    } catch (error) {
      if (error instanceof SessionRevisionConflict) {
        const latest = await sessions.findById(session.id);
        return context.json({ message: "Agreement changed, please refresh", session: latest }, 409);
      }
      throw error;
    }
  });
}
