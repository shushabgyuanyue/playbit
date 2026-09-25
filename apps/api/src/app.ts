import { Hono } from "hono";
import { cors } from "hono/cors";
import { createAuthRepository, type AuthRepository } from "./authRepository.js";
import { createCouponRepository, type CouponRepository } from "./couponRepository.js";
import type { AgreementRepository } from "./agreementRepository.js";
import { createAgreementRepository } from "./agreementRepository.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerCardRoutes } from "./routes/cards.js";
import { registerCouponRoutes } from "./routes/coupons.js";
import { registerAgreementRoutes } from "./routes/agreements.js";
import { AgreementRealtimeHub } from "./agreementRealtime.js";
import { createFlipRepository, type FlipRepository } from "./flipRepository.js";
import { registerFlipRoutes } from "./routes/flips.js";
import { createGraceRepository, type GraceRepository } from "./graceRepository.js";
import { registerGraceRoutes } from "./routes/grace.js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

export type AppRepositories = {
  auth: AuthRepository;
  agreements: AgreementRepository;
  coupons: CouponRepository;
  flips: FlipRepository;
  grace: GraceRepository;
  realtime: AgreementRealtimeHub;
};

export function createRepositories(db: PostgresJsDatabase | null): AppRepositories {
  const agreements = createAgreementRepository(db);
  const coupons = createCouponRepository(db, agreements);
  return {
    auth: createAuthRepository(db),
    agreements,
    coupons,
    flips: createFlipRepository(db, agreements, coupons),
    grace: createGraceRepository(db, agreements, coupons),
    realtime: new AgreementRealtimeHub()
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
  registerAgreementRoutes(
    app,
    repositories.auth,
    repositories.agreements,
    repositories.coupons,
    repositories.realtime
  );
  registerCouponRoutes(
    app,
    repositories.auth,
    repositories.agreements,
    repositories.coupons,
    repositories.realtime,
    repositories.grace
  );
  registerFlipRoutes(
    app,
    repositories.auth,
    repositories.agreements,
    repositories.coupons,
    repositories.flips,
    repositories.realtime
  );
  registerGraceRoutes(
    app,
    repositories.auth,
    repositories.agreements,
    repositories.coupons,
    repositories.grace,
    repositories.realtime
  );

  return app;
}
