import { Hono } from "hono";
import { cors } from "hono/cors";
import { createAuthRepository, type AuthRepository } from "./authRepository.js";
import { createCouponRepository, type CouponRepository } from "./couponRepository.js";
import type { SessionRepository } from "./sessionRepository.js";
import { createSessionRepository } from "./sessionRepository.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerCardRoutes } from "./routes/cards.js";
import { registerCouponRoutes } from "./routes/coupons.js";
import { registerSessionRoutes } from "./routes/sessions.js";
import { SessionRealtimeHub } from "./sessionRealtime.js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

export type AppRepositories = {
  auth: AuthRepository;
  sessions: SessionRepository;
  coupons: CouponRepository;
  realtime: SessionRealtimeHub;
};

export function createRepositories(db: PostgresJsDatabase | null): AppRepositories {
  return {
    auth: createAuthRepository(db),
    sessions: createSessionRepository(db),
    coupons: createCouponRepository(db),
    realtime: new SessionRealtimeHub()
  };
}

export function createPlaybitApp(repositories: AppRepositories, webOrigins: string[] = []) {
  const app = new Hono();

  if (webOrigins.length > 0) {
    const origin = webOrigins.includes("*") ? "*" : webOrigins;
    app.use(
      "*",
      cors({
        origin,
        allowMethods: ["GET", "POST", "PATCH", "OPTIONS"],
        allowHeaders: ["Content-Type", "Authorization"]
      })
    );
  }

  app.get("/health", (context) =>
    context.json({
      ok: true,
      service: "playbit-api"
    })
  );

  registerAuthRoutes(app, repositories.auth);
  registerCardRoutes(app);
  registerSessionRoutes(
    app,
    repositories.auth,
    repositories.sessions,
    repositories.coupons,
    repositories.realtime
  );
  registerCouponRoutes(
    app,
    repositories.auth,
    repositories.sessions,
    repositories.coupons,
    repositories.realtime
  );

  return app;
}
