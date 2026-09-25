import { and, desc, eq, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { randomBytes } from "node:crypto";
import type { Agreement, Coupon, Flip } from "@playbit/shared";
import { coupons, flips, agreements } from "./db/schema.js";
import type { AgreementRepository } from "./agreementRepository.js";
import type { CouponRepository } from "./couponRepository.js";

type FlipRow = typeof flips.$inferSelect;

function makeId() {
  return `flip_${randomBytes(8).toString("hex")}`;
}

function fromRow(row: FlipRow): Flip {
  return {
    id: row.id,
    agreementId: row.agreementId,
    couponId: row.couponId,
    applicantUserId: row.applicantUserId,
    inviteeUserId: row.inviteeUserId,
    card: row.card,
    status: row.status,
    winnerUserId: row.winnerUserId,
    resultRecorderUserId: row.resultRecorderUserId,
    outcome: row.outcome as Flip["outcome"],
    createdAt: row.createdAt.toISOString(),
    resolvedAt: row.resolvedAt?.toISOString() ?? null
  };
}

export class FlipConflict extends Error {
  constructor(message = "FLIP_STATE_CONFLICT") {
    super(message);
  }
}

class MemoryFlipRepository {
  private values = new Map<string, Flip>();
  private mutationQueue: Promise<void> = Promise.resolve();

  constructor(
    private readonly agreements: AgreementRepository,
    private readonly coupons: CouponRepository
  ) {}

  private async serialize<T>(operation: () => Promise<T>): Promise<T> {
    const previous = this.mutationQueue;
    let release!: () => void;
    this.mutationQueue = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;
    try {
      return await operation();
    } finally {
      release();
    }
  }

  async create(flip: Flip): Promise<Flip> {
    return this.serialize(async () => {
      const reserved = await this.coupons.reserveIfAvailable(flip.couponId);
      if (!reserved) throw new FlipConflict("EQUITY_NOT_AVAILABLE");
      this.values.set(flip.id, flip);
      return flip;
    });
  }

  async findById(id: string): Promise<Flip | null> {
    return this.values.get(id) ?? null;
  }

  async listByAgreement(agreementId: string): Promise<Flip[]> {
    return Array.from(this.values.values())
      .filter((flip) => flip.agreementId === agreementId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async findOpenByCoupon(couponId: string): Promise<Flip | null> {
    return Array.from(this.values.values()).find(
      (flip) => flip.couponId === couponId && ["pending_acceptance", "active"].includes(flip.status)
    ) ?? null;
  }

  async respond(flip: Flip, expectedStatus: Flip["status"]): Promise<Flip> {
    return this.serialize(async () => {
      const current = this.values.get(flip.id);
      if (!current || current.status !== expectedStatus) throw new FlipConflict();
      if (flip.status === "declined") {
        const released = await this.coupons.releaseReservation(flip.couponId);
        if (!released) throw new FlipConflict("EQUITY_RESERVATION_MISSING");
      }
      this.values.set(flip.id, flip);
      return flip;
    });
  }

  async resolve(flip: Flip, sourceCoupon: Coupon, expectedStatus: Flip["status"]): Promise<Flip> {
    return this.serialize(async () => {
      const current = this.values.get(flip.id);
      if (!current || current.status !== expectedStatus || expectedStatus !== "active") throw new FlipConflict();
      const coupon = await this.coupons.findById(flip.couponId);
      if (!coupon || coupon.status !== "reserved") throw new FlipConflict("EQUITY_RESERVATION_MISSING");

      if (flip.outcome === "applicant_won") {
        const waived = await this.coupons.markWaivedIfAvailable(flip.couponId);
        if (!waived) throw new FlipConflict("EQUITY_RESERVATION_MISSING");
        if (!sourceCoupon.sourceFlipId) {
          const agreement = await this.agreements.findById(flip.agreementId);
          if (!agreement || agreement.status !== "result_recorded") throw new FlipConflict("AGREEMENT_STATE_CONFLICT");
          await this.agreements.update({ ...agreement, status: "waived" }, agreement.revision);
        }
      } else {
        const released = await this.coupons.releaseReservation(flip.couponId);
        if (!released) throw new FlipConflict("EQUITY_RESERVATION_MISSING");
        await this.coupons.createFromFlip(sourceCoupon, flip.id);
      }
      this.values.set(flip.id, flip);
      return flip;
    });
  }
}

class PostgresFlipRepository {
  constructor(private readonly db: PostgresJsDatabase) {}

  async create(flip: Flip): Promise<Flip> {
    return this.db.transaction(async (tx) => {
      const [coupon] = await tx
        .update(coupons)
        .set({ status: "reserved" })
        .where(and(eq(coupons.id, flip.couponId), eq(coupons.status, "available")))
        .returning({ id: coupons.id });
      if (!coupon) throw new FlipConflict("EQUITY_NOT_AVAILABLE");
      const [row] = await tx.insert(flips).values({
        ...flip,
        createdAt: new Date(flip.createdAt),
        resolvedAt: null
      }).returning();
      return fromRow(row);
    });
  }

  async findById(id: string): Promise<Flip | null> {
    const [row] = await this.db.select().from(flips).where(eq(flips.id, id)).limit(1);
    return row ? fromRow(row) : null;
  }

  async listByAgreement(agreementId: string): Promise<Flip[]> {
    const rows = await this.db.select().from(flips)
      .where(eq(flips.agreementId, agreementId))
      .orderBy(desc(flips.createdAt));
    return rows.map(fromRow);
  }

  async findOpenByCoupon(couponId: string): Promise<Flip | null> {
    const [row] = await this.db.select().from(flips)
      .where(and(
        eq(flips.couponId, couponId),
        sql`${flips.status} in ('pending_acceptance', 'active')`
      ))
      .limit(1);
    return row ? fromRow(row) : null;
  }

  async respond(flip: Flip, expectedStatus: Flip["status"]): Promise<Flip> {
    return this.db.transaction(async (tx) => {
      const [row] = await tx.update(flips).set({ status: flip.status })
        .where(and(eq(flips.id, flip.id), eq(flips.status, expectedStatus)))
        .returning();
      if (!row) throw new FlipConflict();
      if (flip.status === "declined") {
        const [released] = await tx.update(coupons).set({ status: "available" })
          .where(and(eq(coupons.id, flip.couponId), eq(coupons.status, "reserved")))
          .returning({ id: coupons.id });
        if (!released) throw new FlipConflict("EQUITY_RESERVATION_MISSING");
      }
      return fromRow(row);
    });
  }

  async resolve(flip: Flip, _sourceCoupon: Coupon, expectedStatus: Flip["status"]): Promise<Flip> {
    return this.db.transaction(async (tx) => {
      const [source] = await tx.select().from(coupons).where(eq(coupons.id, flip.couponId)).limit(1);
      if (!source || source.status !== "reserved") throw new FlipConflict("EQUITY_RESERVATION_MISSING");

      const [row] = await tx.update(flips).set({
        status: "settled",
        winnerUserId: flip.winnerUserId,
        resultRecorderUserId: flip.resultRecorderUserId,
        outcome: flip.outcome,
        resolvedAt: new Date(flip.resolvedAt!)
      }).where(and(eq(flips.id, flip.id), eq(flips.status, expectedStatus))).returning();
      if (!row) throw new FlipConflict();

      if (flip.outcome === "applicant_won") {
        const [waived] = await tx.update(coupons).set({ status: "waived", waivedAt: new Date() })
          .where(and(eq(coupons.id, flip.couponId), eq(coupons.status, "reserved")))
          .returning({ agreementId: coupons.agreementId, sourceFlipId: coupons.sourceFlipId });
        if (!waived) throw new FlipConflict("EQUITY_RESERVATION_MISSING");
        if (!waived.sourceFlipId) {
          const [updatedAgreement] = await tx.update(agreements).set({
            status: "waived",
            revision: sql`${agreements.revision} + 1`,
            updatedAt: new Date()
          }).where(and(eq(agreements.id, waived.agreementId), eq(agreements.status, "result_recorded")))
            .returning({ id: agreements.id });
          if (!updatedAgreement) throw new FlipConflict("AGREEMENT_STATE_CONFLICT");
        }
      } else {
        const [released] = await tx.update(coupons).set({ status: "available" })
          .where(and(eq(coupons.id, flip.couponId), eq(coupons.status, "reserved")))
          .returning();
        if (!released) throw new FlipConflict("EQUITY_RESERVATION_MISSING");
        await tx.insert(coupons).values({
          id: `coupon_${randomBytes(8).toString("hex")}`,
          agreementId: source.agreementId,
          sourceFlipId: flip.id,
          issuerUserId: source.issuerUserId,
          issuerNickname: source.issuerNickname,
          holderUserId: source.holderUserId,
          holderNickname: source.holderNickname,
          name: source.name,
          description: source.description,
          status: "available"
        }).onConflictDoNothing();
      }
      return fromRow(row);
    });
  }
}

export type FlipRepository = MemoryFlipRepository | PostgresFlipRepository;

export function createFlipRepository(
  db: PostgresJsDatabase | null,
  agreements: AgreementRepository,
  coupons: CouponRepository
): FlipRepository {
  return db ? new PostgresFlipRepository(db) : new MemoryFlipRepository(agreements, coupons);
}
