import { agreements, couponClaims, coupons } from "./db/schema.js";
import type { Agreement, Coupon, Participant } from "@playbit/shared";
import { getEffectiveStakeLabel, hasCouponEquity } from "@playbit/game-core";
import { and, desc, eq, isNull, lt, or, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { randomBytes } from "node:crypto";
import { agreementFromRow, agreementToRow, AgreementRevisionConflict, type AgreementRepository } from "./agreementRepository.js";

export type IndependentCouponInput = {
  gameResultId?: string | null;
  certificateId?: string | null;
  name: string;
  description: string;
  sourceLabel?: string | null;
  signatureDataUrl?: string | null;
  transferNote?: string | null;
  issuerUserId: string | null;
  issuerNickname: string;
  claimLimit?: number;
};

export type CouponListPage = {
  items: Coupon[];
  nextCursor: string | null;
};

export type CouponListOptions = {
  limit?: number;
  cursor?: string | null;
  ownedOnly?: boolean;
};

type CouponCursor = { createdAt: string; id: string };

const DEFAULT_LIST_LIMIT = 10;
const MAX_LIST_LIMIT = 50;

function normalizeListLimit(value?: number): number {
  return Math.max(1, Math.min(MAX_LIST_LIMIT, Math.floor(value ?? DEFAULT_LIST_LIMIT)));
}

function encodeCursor(cursor: CouponCursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

function decodeCursor(value?: string | null): CouponCursor | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Partial<CouponCursor>;
    if (typeof parsed.createdAt !== "string" || typeof parsed.id !== "string" || !parsed.id) return null;
    if (!Number.isFinite(Date.parse(parsed.createdAt))) return null;
    return { createdAt: parsed.createdAt, id: parsed.id };
  } catch {
    return null;
  }
}

function isAfterCursor<T extends { createdAt: string; id: string }>(item: T, cursor: CouponCursor | null): boolean {
  if (!cursor) return true;
  return item.createdAt < cursor.createdAt || (item.createdAt === cursor.createdAt && item.id < cursor.id);
}

function pageFromItems(items: Coupon[], options: CouponListOptions = {}): CouponListPage {
  const limit = normalizeListLimit(options.limit);
  const cursor = decodeCursor(options.cursor);
  const filtered = items
    .filter(item => isAfterCursor(item, cursor))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt) || right.id.localeCompare(left.id));
  const page = filtered.slice(0, limit);
  const last = page.at(-1);
  return {
    items: page,
    nextCursor: filtered.length > limit && last ? encodeCursor({ createdAt: last.createdAt, id: last.id }) : null
  };
}

type CouponRow = typeof coupons.$inferSelect;
type CouponClaimRow = typeof couponClaims.$inferSelect;
type MemoryCouponClaim = {
  id: string;
  couponId: string;
  holderUserId: string;
  holderNickname: string;
  status: "available" | "used";
  claimedAt: string;
  usedAt: string | null;
};

function makeId(prefix: string): string {
  return `${prefix}_${randomBytes(8).toString("hex")}`;
}

function fromRow(row: CouponRow): Coupon {
  const claimLimit = row.claimLimit ?? 1;
  const claimedCount = row.claimedCount ?? 0;
  return {
    id: row.id,
    claimId: null,
    parentCouponId: null,
    agreementId: row.agreementId,
    gameResultId: row.gameResultId,
    certificateId: row.certificateId,
    sourceFlipId: row.sourceFlipId,
    name: row.name,
    description: row.description,
    sourceLabel: row.sourceLabel || "手动签发",
    signatureDataUrl: row.signatureDataUrl,
    issuerUserId: row.issuerUserId,
    issuerNickname: row.issuerNickname,
    holderUserId: row.holderUserId,
    holderNickname: row.holderNickname,
    claimToken: row.claimToken,
    claimLimit,
    claimedCount,
    remainingClaims: Math.max(0, claimLimit - claimedCount),
    status: row.waivedAt ? "waived" : row.status,
    transferNote: row.transferNote,
    createdAt: row.createdAt.toISOString(),
    usedAt: row.usedAt?.toISOString() ?? null,
    waivedAt: row.waivedAt?.toISOString() ?? null
  };
}

function fromClaimRow(row: CouponRow | Coupon, claim: CouponClaimRow | MemoryCouponClaim): Coupon {
  const claimLimit = row.claimLimit ?? 1;
  const claimedCount = row.claimedCount ?? 0;
  return {
    id: claim.id,
    claimId: claim.id,
    parentCouponId: row.id,
    agreementId: row.agreementId,
    gameResultId: row.gameResultId,
    certificateId: row.certificateId,
    sourceFlipId: row.sourceFlipId,
    name: row.name,
    description: row.description,
    sourceLabel: row.sourceLabel || "手动签发",
    signatureDataUrl: row.signatureDataUrl,
    issuerUserId: row.issuerUserId,
    issuerNickname: row.issuerNickname,
    holderUserId: claim.holderUserId,
    holderNickname: claim.holderNickname,
    claimToken: null,
    claimLimit,
    claimedCount,
    remainingClaims: Math.max(0, claimLimit - claimedCount),
    status: claim.status,
    transferNote: row.transferNote,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
    usedAt: claim.usedAt instanceof Date ? claim.usedAt.toISOString() : claim.usedAt,
    waivedAt: row.waivedAt instanceof Date ? row.waivedAt.toISOString() : row.waivedAt
  };
}

function toRow(coupon: Coupon): typeof coupons.$inferInsert {
  return {
    id: coupon.id,
    agreementId: coupon.agreementId,
    gameResultId: coupon.gameResultId,
    certificateId: coupon.certificateId,
    sourceFlipId: coupon.sourceFlipId,
    issuerUserId: coupon.issuerUserId,
    holderUserId: coupon.holderUserId,
    name: coupon.name,
    description: coupon.description,
    sourceLabel: coupon.sourceLabel ?? "手动签发",
    signatureDataUrl: coupon.signatureDataUrl ?? null,
    issuerNickname: coupon.issuerNickname,
    holderNickname: coupon.holderNickname,
    claimToken: coupon.claimToken,
    claimLimit: coupon.claimLimit ?? 1,
    claimedCount: coupon.claimedCount ?? 0,
    status: coupon.status,
    transferNote: coupon.transferNote,
    waivedAt: coupon.waivedAt ? new Date(coupon.waivedAt) : null,
    usedAt: coupon.usedAt ? new Date(coupon.usedAt) : null,
    createdAt: new Date(coupon.createdAt)
  };
}

function findParticipant(agreement: Agreement, participantId: string | null): Participant | null {
  return agreement.participants.find((participant) => participant.id === participantId) ?? null;
}

export function couponFromRecordedAgreement(agreement: Agreement): Coupon | null {
  if (!hasCouponEquity(agreement) || !agreement.winnerId || !agreement.loserId) {
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
    claimId: null,
    parentCouponId: null,
    agreementId: agreement.id,
    gameResultId: null,
    certificateId: null,
    sourceFlipId: null,
    name: getEffectiveStakeLabel(agreement),
    description: agreement.title,
    sourceLabel: "赌约权益",
    signatureDataUrl: loser.signatureDataUrl ?? null,
    issuerUserId: loser.userId,
    issuerNickname: loser.nickname,
    holderUserId: winner.userId,
    holderNickname: winner.nickname,
    claimToken: null,
    claimLimit: 1,
    claimedCount: 1,
    remainingClaims: 0,
    status: agreement.stake.fulfilled ? "used" : "available",
    createdAt: agreement.resultRecordedAt ?? new Date().toISOString(),
    usedAt,
    waivedAt: null,
    transferNote: null
  };
}

class MemoryCouponRepository {
  private coupons = new Map<string, Coupon>();
  private claims = new Map<string, MemoryCouponClaim>();
  private deletedAgreements = new Set<string>();

  constructor(private readonly agreements: AgreementRepository) {
    if ("onDelete" in agreements) agreements.onDelete(id => {
      this.deletedAgreements.add(id);
      for (const [key, coupon] of this.coupons) if (coupon.agreementId === id) this.coupons.delete(key);
    });
  }

  async recordResult(agreement: Agreement, revision: number): Promise<Agreement> {
    const coupon = couponFromRecordedAgreement(agreement);
    const updated = await this.agreements.update(agreement, revision);
    if (this.deletedAgreements.has(agreement.id)) throw new AgreementRevisionConflict();
    if (coupon) this.coupons.set(coupon.id, coupon);
    return updated;
  }

  async upsertForAgreement(agreement: Agreement): Promise<Coupon | null> {
    const coupon = couponFromRecordedAgreement(agreement);
    if (!coupon) {
      return null;
    }

    const existing = await this.findByAgreementId(agreement.id);
    if (this.deletedAgreements.has(agreement.id)) throw new AgreementRevisionConflict();
    const next = existing ? { ...coupon, id: existing.id, createdAt: existing.createdAt } : coupon;
    this.coupons.set(next.id, next);
    return next;
  }

  async createIndependent(input: IndependentCouponInput): Promise<Coupon> {
    const claimLimit = Math.max(1, input.claimLimit ?? 1);
    const coupon: Coupon = {
      id: makeId("coupon"),
      claimId: null,
      parentCouponId: null,
      agreementId: null,
      gameResultId: input.gameResultId ?? null,
      certificateId: input.certificateId ?? null,
      sourceFlipId: null,
      name: input.name,
      description: input.description,
      sourceLabel: input.sourceLabel?.trim() || "手动签发",
      signatureDataUrl: input.signatureDataUrl ?? null,
      transferNote: input.transferNote ?? null,
      issuerUserId: input.issuerUserId,
      issuerNickname: input.issuerNickname,
      holderUserId: null,
      holderNickname: "待领取",
      claimToken: makeId("claim"),
      claimLimit,
      claimedCount: 0,
      remainingClaims: claimLimit,
      status: "available",
      createdAt: new Date().toISOString(),
      usedAt: null,
      waivedAt: null
    };
    this.coupons.set(coupon.id, coupon);
    return coupon;
  }

  async listByUser(userId: string): Promise<Coupon[]> {
    const items = new Map<string, Coupon>();
    for (const coupon of this.coupons.values()) {
      if (coupon.issuerUserId === userId || coupon.holderUserId === userId) items.set(coupon.id, coupon);
    }
    for (const claim of this.claims.values()) {
      if (claim.holderUserId !== userId) continue;
      const parent = this.coupons.get(claim.couponId);
      if (parent) items.set(claim.id, fromClaimRow(parent, claim));
    }
    return Array.from(items.values())
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async listPageByUser(userId: string, options: CouponListOptions = {}): Promise<CouponListPage> {
    const items = await this.listByUser(userId);
    return pageFromItems(options.ownedOnly ? items.filter(item => item.holderUserId === userId) : items, options);
  }

  async findById(id: string): Promise<Coupon | null> {
    const coupon = this.coupons.get(id);
    if (coupon) return coupon;
    const claim = this.claims.get(id);
    const parent = claim ? this.coupons.get(claim.couponId) : null;
    return parent && claim ? fromClaimRow(parent, claim) : null;
  }

  async findByClaimToken(token: string): Promise<Coupon | null> {
    return Array.from(this.coupons.values()).find((coupon) => coupon.claimToken === token) ?? null;
  }

  async claimByToken(token: string, holderUserId: string, holderNickname: string): Promise<Coupon | null> {
    const coupon = await this.findByClaimToken(token);
    if (!coupon || coupon.status !== "available" || coupon.claimedCount >= coupon.claimLimit) return null;
    if (Array.from(this.claims.values()).some((claim) => claim.couponId === coupon.id && claim.holderUserId === holderUserId)) return null;
    const claim: MemoryCouponClaim = {
      id: makeId("claim"),
      couponId: coupon.id,
      holderUserId,
      holderNickname,
      status: "available",
      claimedAt: new Date().toISOString(),
      usedAt: null
    };
    this.claims.set(claim.id, claim);
    const updated = { ...coupon, claimedCount: coupon.claimedCount + 1, remainingClaims: Math.max(0, coupon.claimLimit - coupon.claimedCount - 1) };
    this.coupons.set(coupon.id, updated);
    return fromClaimRow(updated, claim);
  }

  async deleteIndependent(id: string, issuerUserId: string): Promise<boolean> {
    const coupon = this.coupons.get(id);
    if (!coupon || coupon.agreementId || coupon.sourceFlipId || coupon.issuerUserId !== issuerUserId || coupon.holderUserId || coupon.claimedCount > 0 || coupon.status !== "available") {
      return false;
    }
    this.coupons.delete(id);
    return true;
  }

  async findByAgreementId(agreementId: string): Promise<Coupon | null> {
    return Array.from(this.coupons.values()).find((coupon) => coupon.agreementId === agreementId && !coupon.sourceFlipId) ?? null;
  }

  async findBySourceFlipId(flipId: string): Promise<Coupon | null> {
    return Array.from(this.coupons.values()).find((coupon) => coupon.sourceFlipId === flipId) ?? null;
  }

  async createFromFlip(source: Coupon, flipId: string): Promise<Coupon> {
    const existing = await this.findBySourceFlipId(flipId);
    if (source.agreementId && this.deletedAgreements.has(source.agreementId)) throw new AgreementRevisionConflict();
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
    const coupon = this.coupons.get(id);
    if (!coupon || coupon.status !== "available") {
      return null;
    }

    const next: Coupon = { ...coupon, status: "used", usedAt: new Date().toISOString() };
    this.coupons.set(id, next);
    return next;
  }

  async redeem(id: string, holderUserId: string, recorderUserId: string): Promise<Coupon | null> {
    const claim = this.claims.get(id);
    if (claim) {
      const parent = this.coupons.get(claim.couponId);
      if (!parent || claim.holderUserId !== holderUserId || claim.status !== "available") return null;
      const usedClaim = { ...claim, status: "used" as const, usedAt: new Date().toISOString() };
      this.claims.set(id, usedClaim);
      return fromClaimRow(parent, usedClaim);
    }
    const coupon = this.coupons.get(id);
    if (!coupon || coupon.status !== "available" || coupon.holderUserId !== holderUserId) return null;
    const used: Coupon = { ...coupon, status: "used", usedAt: new Date().toISOString() };
    this.coupons.set(id, used);
    try {
      if (!coupon.sourceFlipId && coupon.agreementId) {
        const agreement = await this.agreements.findById(coupon.agreementId);
        if (!agreement || agreement.status !== "result_recorded") throw new CouponRedemptionConflict();
        await this.agreements.update({
          ...agreement,
          status: "fulfilled",
          stake: { ...agreement.stake, fulfilled: true },
          fulfillmentRecorderUserId: recorderUserId
        }, agreement.revision);
      }
      if (coupon.agreementId && this.deletedAgreements.has(coupon.agreementId)) throw new CouponRedemptionConflict();
      return used;
    } catch {
      if (this.coupons.get(id) === used) this.coupons.set(id, coupon);
      throw new CouponRedemptionConflict();
    }
  }

  async markWaivedIfAvailable(id: string): Promise<Coupon | null> {
    const coupon = this.coupons.get(id);
    if (!coupon || coupon.status !== "reserved") return null;
    const next: Coupon = { ...coupon, status: "waived", waivedAt: new Date().toISOString() };
    this.coupons.set(id, next);
    return next;
  }

  async reserveIfAvailable(id: string): Promise<Coupon | null> {
    const coupon = this.coupons.get(id);
    if (!coupon || coupon.status !== "available") return null;
    const next: Coupon = { ...coupon, status: "reserved" };
    this.coupons.set(id, next);
    return next;
  }

  async releaseReservation(id: string): Promise<Coupon | null> {
    const coupon = this.coupons.get(id);
    if (!coupon || coupon.status !== "reserved") return null;
    const next: Coupon = { ...coupon, status: "available" };
    this.coupons.set(id, next);
    return next;
  }
}

class PostgresCouponRepository {
  constructor(private readonly db: PostgresJsDatabase) {}

  async recordResult(agreement: Agreement, revision: number): Promise<Agreement> {
    const coupon = couponFromRecordedAgreement(agreement);
    return this.db.transaction(async tx => {
      const [row] = await tx.update(agreements).set({
        ...agreementToRow(agreement), revision: revision + 1, updatedAt: new Date()
      }).where(and(eq(agreements.id, agreement.id), eq(agreements.revision, revision), eq(agreements.status, "active"))).returning();
      if (!row) throw new AgreementRevisionConflict();
      if (coupon) await tx.insert(coupons).values(toRow(coupon));
      return agreementFromRow(row);
    });
  }

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
          sourceLabel: coupon.sourceLabel,
          signatureDataUrl: coupon.signatureDataUrl,
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

  async createIndependent(input: IndependentCouponInput): Promise<Coupon> {
    const claimLimit = Math.max(1, input.claimLimit ?? 1);
    const coupon: Coupon = {
      id: makeId("coupon"),
      claimId: null,
      parentCouponId: null,
      agreementId: null,
      gameResultId: input.gameResultId ?? null,
      certificateId: input.certificateId ?? null,
      sourceFlipId: null,
      name: input.name,
      description: input.description,
      sourceLabel: input.sourceLabel?.trim() || "手动签发",
      signatureDataUrl: input.signatureDataUrl ?? null,
      transferNote: input.transferNote ?? null,
      issuerUserId: input.issuerUserId,
      issuerNickname: input.issuerNickname,
      holderUserId: null,
      holderNickname: "待领取",
      claimToken: makeId("claim"),
      claimLimit,
      claimedCount: 0,
      remainingClaims: claimLimit,
      status: "available",
      createdAt: new Date().toISOString(),
      usedAt: null,
      waivedAt: null
    };
    const [row] = await this.db.insert(coupons).values(toRow(coupon)).returning();
    return fromRow(row);
  }

  async listByUser(userId: string): Promise<Coupon[]> {
    const rows = await this.db.select().from(coupons).where(or(
      eq(coupons.holderUserId, userId),
      eq(coupons.issuerUserId, userId)
    )).orderBy(desc(coupons.createdAt));
    const claims = await this.db
      .select({ coupon: coupons, claim: couponClaims })
      .from(couponClaims)
      .innerJoin(coupons, eq(couponClaims.couponId, coupons.id))
      .where(eq(couponClaims.holderUserId, userId))
      .orderBy(desc(couponClaims.createdAt));
    return [...rows.map(fromRow), ...claims.map(({ coupon, claim }) => fromClaimRow(coupon, claim))]
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  async listPageByUser(userId: string, options: CouponListOptions = {}): Promise<CouponListPage> {
    const limit = normalizeListLimit(options.limit);
    const cursor = decodeCursor(options.cursor);
    const parentCursor = cursor
      ? or(
        lt(coupons.createdAt, new Date(cursor.createdAt)),
        and(eq(coupons.createdAt, new Date(cursor.createdAt)), lt(coupons.id, cursor.id))
      )
      : undefined;
    const claimCursor = cursor
      ? or(
        lt(couponClaims.createdAt, new Date(cursor.createdAt)),
        and(eq(couponClaims.createdAt, new Date(cursor.createdAt)), lt(couponClaims.id, cursor.id))
      )
      : undefined;

    const [rows, claims] = await Promise.all([
      this.db
        .select()
        .from(coupons)
        .where(and(options.ownedOnly ? eq(coupons.holderUserId, userId) : or(eq(coupons.holderUserId, userId), eq(coupons.issuerUserId, userId)), parentCursor))
        .orderBy(desc(coupons.createdAt), desc(coupons.id))
        .limit(limit + 1),
      this.db
        .select({ coupon: coupons, claim: couponClaims })
        .from(couponClaims)
        .innerJoin(coupons, eq(couponClaims.couponId, coupons.id))
        .where(and(eq(couponClaims.holderUserId, userId), claimCursor))
        .orderBy(desc(couponClaims.createdAt), desc(couponClaims.id))
        .limit(limit + 1)
    ]);

    const items = [...rows.map(fromRow), ...claims.map(({ coupon, claim }) => fromClaimRow(coupon, claim))]
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt) || right.id.localeCompare(left.id));
    const page = items.slice(0, limit);
    const last = page.at(-1);
    return {
      items: page,
      nextCursor: items.length > limit && last ? encodeCursor({ createdAt: last.createdAt, id: last.id }) : null
    };
  }

  async findById(id: string): Promise<Coupon | null> {
    const [row] = await this.db.select().from(coupons).where(eq(coupons.id, id)).limit(1);
    if (row) return fromRow(row);
    const [claim] = await this.db
      .select({ coupon: coupons, claim: couponClaims })
      .from(couponClaims)
      .innerJoin(coupons, eq(couponClaims.couponId, coupons.id))
      .where(eq(couponClaims.id, id))
      .limit(1);
    return claim ? fromClaimRow(claim.coupon, claim.claim) : null;
  }

  async findByClaimToken(token: string): Promise<Coupon | null> {
    const [row] = await this.db.select().from(coupons).where(eq(coupons.claimToken, token)).limit(1);
    return row ? fromRow(row) : null;
  }

  async claimByToken(token: string, holderUserId: string, holderNickname: string): Promise<Coupon | null> {
    return this.db.transaction(async (tx) => {
      const [parent] = await tx.select().from(coupons).where(eq(coupons.claimToken, token)).for("update");
      if (!parent || parent.status !== "available" || parent.claimedCount >= parent.claimLimit) return null;
      const [existing] = await tx
        .select({ id: couponClaims.id })
        .from(couponClaims)
        .where(and(eq(couponClaims.couponId, parent.id), eq(couponClaims.holderUserId, holderUserId)))
        .limit(1);
      if (existing) return null;
      const [claim] = await tx.insert(couponClaims).values({
        id: makeId("claim"),
        couponId: parent.id,
        holderUserId,
        holderNickname
      }).returning();
      const [updated] = await tx
        .update(coupons)
        .set({ claimedCount: sql`${coupons.claimedCount} + 1` })
        .where(eq(coupons.id, parent.id))
        .returning();
      return updated && claim ? fromClaimRow(updated, claim) : null;
    });
  }

  async deleteIndependent(id: string, issuerUserId: string): Promise<boolean> {
    const deleted = await this.db
      .delete(coupons)
      .where(and(
        eq(coupons.id, id),
        eq(coupons.issuerUserId, issuerUserId),
        isNull(coupons.agreementId),
        isNull(coupons.sourceFlipId),
        isNull(coupons.holderUserId),
        eq(coupons.claimedCount, 0),
        eq(coupons.status, "available")
      ))
      .returning({ id: coupons.id });
    return deleted.length > 0;
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
      const [claim] = await tx.select().from(couponClaims).where(eq(couponClaims.id, id)).limit(1);
      if (claim) {
        if (claim.holderUserId !== holderUserId || claim.status !== "available") return null;
        const [usedClaim] = await tx.update(couponClaims).set({ status: "used", usedAt: new Date() })
          .where(and(eq(couponClaims.id, id), eq(couponClaims.holderUserId, holderUserId), eq(couponClaims.status, "available")))
          .returning();
        if (!usedClaim) return null;
        const [parent] = await tx.select().from(coupons).where(eq(coupons.id, claim.couponId)).limit(1);
        return parent ? fromClaimRow(parent, usedClaim) : null;
      }
      const [current] = await tx.select().from(coupons).where(eq(coupons.id, id)).limit(1);
      if (!current || current.holderUserId !== holderUserId || current.status !== "available") return null;
      const [used] = await tx.update(coupons).set({ status: "used", usedAt: new Date() })
        .where(and(
          eq(coupons.id, id),
          eq(coupons.holderUserId, holderUserId),
          eq(coupons.status, "available")
        )).returning();
      if (!used) return null;
      if (!current.sourceFlipId && current.agreementId) {
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
