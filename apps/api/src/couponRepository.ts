import { coupons } from "./db/schema.js";
import type { BetSession, Coupon, Participant } from "@playbit/shared";
import { getEffectiveStakeLabel } from "@playbit/game-core";
import { and, desc, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { randomBytes } from "node:crypto";

type CouponRow = typeof coupons.$inferSelect;

function makeId(prefix: string): string {
  return `${prefix}_${randomBytes(8).toString("hex")}`;
}

function fromRow(row: CouponRow): Coupon {
  return {
    id: row.id,
    sessionId: row.sessionId,
    name: row.name,
    description: row.description,
    issuerUserId: row.issuerUserId,
    issuerNickname: row.issuerNickname,
    holderUserId: row.holderUserId,
    holderNickname: row.holderNickname,
    status: row.used ? "used" : "available",
    createdAt: row.createdAt.toISOString(),
    usedAt: row.usedAt?.toISOString() ?? null
  };
}

function toRow(coupon: Coupon): typeof coupons.$inferInsert {
  return {
    id: coupon.id,
    sessionId: coupon.sessionId,
    issuerUserId: coupon.issuerUserId,
    holderUserId: coupon.holderUserId,
    name: coupon.name,
    description: coupon.description,
    issuerNickname: coupon.issuerNickname,
    holderNickname: coupon.holderNickname,
    used: coupon.status === "used",
    usedAt: coupon.usedAt ? new Date(coupon.usedAt) : null,
    createdAt: new Date(coupon.createdAt)
  };
}

function findParticipant(session: BetSession, participantId: string | null): Participant | null {
  return session.participants.find((participant) => participant.id === participantId) ?? null;
}

export function couponFromSettledSession(session: BetSession): Coupon | null {
  if (session.stake.type !== "coupon" || !session.winnerId || !session.loserId) {
    return null;
  }

  const winner = findParticipant(session, session.winnerId);
  const loser = findParticipant(session, session.loserId);
  if (!winner || !loser) {
    return null;
  }

  const usedAt = session.stake.fulfilled ? session.settledAt ?? new Date().toISOString() : null;

  return {
    id: makeId("coupon"),
    sessionId: session.id,
    name: getEffectiveStakeLabel(session),
    description: session.title,
    issuerUserId: loser.userId,
    issuerNickname: loser.nickname,
    holderUserId: winner.userId,
    holderNickname: winner.nickname,
    status: session.stake.fulfilled ? "used" : "available",
    createdAt: session.settledAt ?? new Date().toISOString(),
    usedAt
  };
}

class MemoryCouponRepository {
  private coupons = new Map<string, Coupon>();

  async upsertForSession(session: BetSession): Promise<Coupon | null> {
    const coupon = couponFromSettledSession(session);
    if (!coupon) {
      return null;
    }

    const existing = await this.findBySessionId(session.id);
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

  async findBySessionId(sessionId: string): Promise<Coupon | null> {
    return Array.from(this.coupons.values()).find((coupon) => coupon.sessionId === sessionId) ?? null;
  }

  async markUsedIfAvailable(id: string): Promise<Coupon | null> {
    const coupon = await this.findById(id);
    if (!coupon || coupon.status === "used") {
      return null;
    }

    const next: Coupon = { ...coupon, status: "used", usedAt: new Date().toISOString() };
    this.coupons.set(id, next);
    return next;
  }
}

class PostgresCouponRepository {
  constructor(private readonly db: PostgresJsDatabase) {}

  async upsertForSession(session: BetSession): Promise<Coupon | null> {
    const coupon = couponFromSettledSession(session);
    if (!coupon) {
      return null;
    }

    const [row] = await this.db
      .insert(coupons)
      .values(toRow(coupon))
      .onConflictDoUpdate({
        target: coupons.sessionId,
        set: {
          name: coupon.name,
          description: coupon.description,
          issuerUserId: coupon.issuerUserId,
          issuerNickname: coupon.issuerNickname,
          holderUserId: coupon.holderUserId,
          holderNickname: coupon.holderNickname,
          used: coupon.status === "used",
          usedAt: coupon.usedAt ? new Date(coupon.usedAt) : null
        }
      })
      .returning();
    return fromRow(row);
  }

  async listByUser(userId: string): Promise<Coupon[]> {
    const rows = await this.db.select().from(coupons).orderBy(desc(coupons.createdAt));
    return rows
      .map(fromRow)
      .filter((coupon) => coupon.holderUserId === userId || coupon.issuerUserId === userId);
  }

  async findById(id: string): Promise<Coupon | null> {
    const [row] = await this.db.select().from(coupons).where(eq(coupons.id, id)).limit(1);
    return row ? fromRow(row) : null;
  }

  async findBySessionId(sessionId: string): Promise<Coupon | null> {
    const [row] = await this.db.select().from(coupons).where(eq(coupons.sessionId, sessionId)).limit(1);
    return row ? fromRow(row) : null;
  }

  async markUsedIfAvailable(id: string): Promise<Coupon | null> {
    const [row] = await this.db
      .update(coupons)
      .set({ used: true, usedAt: new Date() })
      .where(and(eq(coupons.id, id), eq(coupons.used, false)))
      .returning();
    return row ? fromRow(row) : null;
  }
}

export type CouponRepository = MemoryCouponRepository | PostgresCouponRepository;

export function createCouponRepository(db: PostgresJsDatabase | null): CouponRepository {
  return db ? new PostgresCouponRepository(db) : new MemoryCouponRepository();
}
