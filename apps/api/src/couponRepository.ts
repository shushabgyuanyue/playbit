import { agreements, coupons } from "./db/schema.js";
import type { Agreement, Coupon, Participant } from "@playbit/shared";
import { getEffectiveStakeLabel } from "@playbit/game-core";
import { and, desc, eq, isNull, or, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { randomBytes } from "node:crypto";
import type { AgreementRepository } from "./agreementRepository.js";

type CouponRow = typeof coupons.$inferSelect;

function makeId(prefix: string): string {
  return `${prefix}_${randomBytes(8).toString("hex")}`;
}

function fromRow(row: CouponRow): Coupon {
  return {
    id: row.id,
    agreementId: row.agreementId,
    sourceFlipId: row.sourceFlipId,
    name: row.name,
    description: row.description,
    issuerUserId: row.issuerUserId,
    issuerNickname: row.issuerNickname,
    holderUserId: row.holderUserId,
    holderNickname: row.holderNickname,
    status: row.waivedAt ? "waived" : row.status,
    createdAt: row.createdAt.toISOString(),
    usedAt: row.usedAt?.toISOString() ?? null,
    waivedAt: row.waivedAt?.toISOString() ?? null
  };
}

function toRow(coupon: Coupon): typeof coupons.$inferInsert {
  return {
    id: coupon.id,
    agreementId: coupon.agreementId,
    sourceFlipId: coupon.sourceFlipId,
    issuerUserId: coupon.issuerUserId,
    holderUserId: coupon.holderUserId,
    name: coupon.name,
    description: coupon.description,
    issuerNickname: coupon.issuerNickname,
    holderNickname: coupon.holderNickname,
    status: coupon.status,
    waivedAt: coupon.waivedAt ? new Date(coupon.waivedAt) : null,
    usedAt: coupon.usedAt ? new Date(coupon.usedAt) : null,
    createdAt: new Date(coupon.createdAt)
  };
}

function findParticipant(agreement: Agreement, participantId: string | null): Participant | null {
  return agreement.participants.find((participant) => participant.id === participantId) ?? null;
}

export function couponFromRecordedAgreement(agreement: Agreement): Coupon | null {
  if (agreement.stake.type !== "coupon" || !agreement.winnerId || !agreement.loserId) {
    return null;
  }

  const winner = findParticipant(agreement, agreement.winnerId);
  const loser = findParticipant(agreement, agreement.loserId);
  if (!winner || !loser) {
    return null;
  }

  const usedAt = agreement.stake.fulfilled ? agreement.resultRecordedAt ?? new Date().toISOString() : null;

  return {
    id: makeId("coupon"),
    agreementId: agreement.id,
    sourceFlipId: null,
    name: getEffectiveStakeLabel(agreement),
    description: agreement.title,
    issuerUserId: loser.userId,
    issuerNickname: loser.nickname,
    holderUserId: winner.userId,
    holderNickname: winner.nickname,
    status: agreement.stake.fulfilled ? "used" : "available",
    createdAt: agreement.resultRecordedAt ?? new Date().toISOString(),
    usedAt,
    waivedAt: null
  };
}

class MemoryCouponRepository {
  private coupons = new Map<string, Coupon>();

  constructor(private readonly agreements: AgreementRepository) {}

  async upsertForAgreement(agreement: Agreement): Promise<Coupon | null> {
    const coupon = couponFromRecordedAgreement(agreement);
    if (!coupon) {
      return null;
    }

    const existing = await this.findByAgreementId(agreement.id);
    const next = existing ? { ...coupon, id: existing.id, createdAt: existing.createdAt } : coupon;
    this.coupons.set(next.id, next);
    return next;
  }

  async listByUser(userId: string): Promise<Coupon[]> {
    return Array.from(this.coupons.values())
      .filter((coupon) => coupon.holderUserId === userId || coupon.issuerUserId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async findById(id: string): Promise<Coupon | null> {
    return this.coupons.get(id) ?? null;
  }

  async findByAgreementId(agreementId: string): Promise<Coupon | null> {
    return Array.from(this.coupons.values()).find((coupon) => coupon.agreementId === agreementId && !coupon.sourceFlipId) ?? null;
  }

  async findBySourceFlipId(flipId: string): Promise<Coupon | null> {
    return Array.from(this.coupons.values()).find((coupon) => coupon.sourceFlipId === flipId) ?? null;
  }

  async createFromFlip(source: Coupon, flipId: string): Promise<Coupon> {
    const existing = await this.findBySourceFlipId(flipId);
    if (existing) return existing;
    const coupon: Coupon = {
      ...source,
      id: makeId("coupon"),
      sourceFlipId: flipId,
      status: "available",
      createdAt: new Date().toISOString(),
      usedAt: null,
      waivedAt: null
    };
    this.coupons.set(coupon.id, coupon);
    return coupon;
  }

  async markUsedIfAvailable(id: string): Promise<Coupon | null> {
    const coupon = await this.findById(id);
    if (!coupon || coupon.status !== "available") {
      return null;
    }

    const next: Coupon = { ...coupon, status: "used", usedAt: new Date().toISOString() };
    this.coupons.set(id, next);
    return next;
  }

  async redeem(id: string, holderUserId: string, recorderUserId: string): Promise<Coupon | null> {
    const coupon = await this.findById(id);
    if (!coupon || coupon.status !== "available" || coupon.holderUserId !== holderUserId) return null;
    if (!coupon.sourceFlipId) {
      const agreement = await this.agreements.findById(coupon.agreementId);
      if (!agreement || agreement.status !== "result_recorded") return null;
      await this.agreements.update({
        ...agreement,
        status: "fulfilled",
        stake: { ...agreement.stake, fulfilled: true },
        fulfillmentRecorderUserId: recorderUserId
      }, agreement.revision);
    }
    return this.markUsedIfAvailable(id);
  }

  async markWaivedIfAvailable(id: string): Promise<Coupon | null> {
    const coupon = await this.findById(id);
    if (!coupon || coupon.status !== "reserved") return null;
    const next: Coupon = { ...coupon, status: "waived", waivedAt: new Date().toISOString() };
    this.coupons.set(id, next);
    return next;
  }

  async reserveIfAvailable(id: string): Promise<Coupon | null> {
    const coupon = await this.findById(id);
    if (!coupon || coupon.status !== "available") return null;
    const next: Coupon = { ...coupon, status: "reserved" };
    this.coupons.set(id, next);
    return next;
  }

  async releaseReservation(id: string): Promise<Coupon | null> {
    const coupon = await this.findById(id);
    if (!coupon || coupon.status !== "reserved") return null;
    const next: Coupon = { ...coupon, status: "available" };
    this.coupons.set(id, next);
    return next;
  }
}

class PostgresCouponRepository {
  constructor(private readonly db: PostgresJsDatabase) {}

  async upsertForAgreement(agreement: Agreement): Promise<Coupon | null> {
    const coupon = couponFromRecordedAgreement(agreement);
    if (!coupon) {
      return null;
    }

    const existing = await this.findByAgreementId(agreement.id);
    const [row] = existing
      ? await this.db
          .update(coupons)
          .set({
          name: coupon.name,
          description: coupon.description,
          issuerUserId: coupon.issuerUserId,
          issuerNickname: coupon.issuerNickname,
          holderUserId: coupon.holderUserId,
          holderNickname: coupon.holderNickname,
          status: coupon.status,
          usedAt: coupon.usedAt ? new Date(coupon.usedAt) : null,
          waivedAt: null
          })
          .where(eq(coupons.id, existing.id))
          .returning()
      : await this.db.insert(coupons).values(toRow(coupon)).returning();
    return fromRow(row);
  }

  async listByUser(userId: string): Promise<Coupon[]> {
    const rows = await this.db.select().from(coupons).where(or(
      eq(coupons.holderUserId, userId),
      eq(coupons.issuerUserId, userId)
    )).orderBy(desc(coupons.createdAt));
    return rows.map(fromRow);
  }

  async findById(id: string): Promise<Coupon | null> {
    const [row] = await this.db.select().from(coupons).where(eq(coupons.id, id)).limit(1);
    return row ? fromRow(row) : null;
  }

  async findByAgreementId(agreementId: string): Promise<Coupon | null> {
    const [row] = await this.db
      .select()
      .from(coupons)
      .where(and(eq(coupons.agreementId, agreementId), isNull(coupons.sourceFlipId)))
      .limit(1);
    return row ? fromRow(row) : null;
  }

  async findBySourceFlipId(flipId: string): Promise<Coupon | null> {
    const [row] = await this.db.select().from(coupons).where(eq(coupons.sourceFlipId, flipId)).limit(1);
    return row ? fromRow(row) : null;
  }

  async createFromFlip(source: Coupon, flipId: string): Promise<Coupon> {
    const existing = await this.findBySourceFlipId(flipId);
    if (existing) return existing;
    const coupon: Coupon = {
      ...source,
      id: makeId("coupon"),
      sourceFlipId: flipId,
      status: "available",
      createdAt: new Date().toISOString(),
      usedAt: null,
      waivedAt: null
    };
    const [row] = await this.db
      .insert(coupons)
      .values(toRow(coupon))
      .onConflictDoNothing()
      .returning();
    return row ? fromRow(row) : (await this.findBySourceFlipId(flipId))!;
  }

  async markUsedIfAvailable(id: string): Promise<Coupon | null> {
    const [row] = await this.db
      .update(coupons)
      .set({ status: "used", usedAt: new Date() })
      .where(and(eq(coupons.id, id), eq(coupons.status, "available"), isNull(coupons.waivedAt)))
      .returning();
    return row ? fromRow(row) : null;
  }

  async redeem(id: string, holderUserId: string, recorderUserId: string): Promise<Coupon | null> {
    return this.db.transaction(async (tx) => {
      const [current] = await tx.select().from(coupons).where(eq(coupons.id, id)).limit(1);
      if (!current || current.holderUserId !== holderUserId || current.status !== "available") return null;
      const [used] = await tx.update(coupons).set({ status: "used", usedAt: new Date() })
        .where(and(
          eq(coupons.id, id),
          eq(coupons.holderUserId, holderUserId),
          eq(coupons.status, "available")
        )).returning();
      if (!used) return null;
      if (!current.sourceFlipId) {
        const [updated] = await tx.update(agreements).set({
          status: "fulfilled",
          stake: sql`jsonb_set(${agreements.stake}, '{fulfilled}', 'true'::jsonb)`,
          fulfillmentRecorderUserId: recorderUserId,
          revision: sql`${agreements.revision} + 1`,
          updatedAt: new Date()
        }).where(and(
          eq(agreements.id, current.agreementId),
          eq(agreements.status, "result_recorded")
        )).returning({ id: agreements.id });
        if (!updated) throw new CouponRedemptionConflict();
      }
      return fromRow(used);
    });
  }

  async markWaivedIfAvailable(id: string): Promise<Coupon | null> {
    const [row] = await this.db
      .update(coupons)
      .set({ status: "waived", waivedAt: new Date() })
      .where(and(eq(coupons.id, id), eq(coupons.status, "reserved"), isNull(coupons.waivedAt)))
      .returning();
    return row ? fromRow(row) : null;
  }

  async reserveIfAvailable(id: string): Promise<Coupon | null> {
    const [row] = await this.db
      .update(coupons)
      .set({ status: "reserved" })
      .where(and(eq(coupons.id, id), eq(coupons.status, "available")))
      .returning();
    return row ? fromRow(row) : null;
  }

  async releaseReservation(id: string): Promise<Coupon | null> {
    const [row] = await this.db
      .update(coupons)
      .set({ status: "available" })
      .where(and(eq(coupons.id, id), eq(coupons.status, "reserved")))
      .returning();
    return row ? fromRow(row) : null;
  }
}

export class CouponRedemptionConflict extends Error {
  constructor() {
    super("COUPON_REDEMPTION_CONFLICT");
  }
}

export type CouponRepository = MemoryCouponRepository | PostgresCouponRepository;

export function createCouponRepository(db: PostgresJsDatabase | null, agreements: AgreementRepository): CouponRepository {
  return db ? new PostgresCouponRepository(db) : new MemoryCouponRepository(agreements);
}
