import { and, desc, eq, or, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { randomBytes } from "node:crypto";
import type { Agreement, Coupon, GraceTicket, GraceWaiver } from "@playbit/shared";
import { agreements as agreementTable, coupons, graceTickets, graceWaivers } from "./db/schema.js";
import type { AgreementRepository } from "./agreementRepository.js";
import type { CouponRepository } from "./couponRepository.js";

type TicketRow = typeof graceTickets.$inferSelect;
type WaiverRow = typeof graceWaivers.$inferSelect;

function id(prefix: string) {
  return `${prefix}_${randomBytes(8).toString("hex")}`;
}

function ticketFromRow(row: TicketRow): GraceTicket {
  return {
    id: row.id,
    userId: row.userId,
    earnedAtFulfillmentCount: row.earnedAtFulfillmentCount,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    usedAt: row.usedAt?.toISOString() ?? null
  };
}

function waiverFromRow(row: WaiverRow): GraceWaiver {
  return {
    id: row.id,
    ticketId: row.ticketId,
    couponId: row.couponId,
    agreementId: row.agreementId,
    requesterUserId: row.requesterUserId,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    resolvedAt: row.resolvedAt?.toISOString() ?? null
  };
}

export class GraceConflict extends Error {
  constructor(message = "GRACE_STATE_CONFLICT") {
    super(message);
  }
}

class MemoryGraceRepository {
  private tickets = new Map<string, GraceTicket>();
  private waivers = new Map<string, GraceWaiver>();
  private mutationQueue: Promise<void> = Promise.resolve();

  constructor(
    private readonly agreements: AgreementRepository,
    private readonly coupons: CouponRepository
  ) {}

  private async serialize<T>(operation: () => Promise<T>): Promise<T> {
    const previous = this.mutationQueue;
    let release!: () => void;
    this.mutationQueue = new Promise<void>((resolve) => { release = resolve; });
    await previous;
    try {
      return await operation();
    } finally {
      release();
    }
  }

  async ensureEarned(userId: string, completedCount: number): Promise<GraceTicket[]> {
    const earned: GraceTicket[] = [];
    for (let milestone = 10; milestone <= completedCount; milestone += 10) {
      const existing = Array.from(this.tickets.values()).find(
        (ticket) => ticket.userId === userId && ticket.earnedAtFulfillmentCount === milestone
      );
      if (existing) continue;
      const ticket: GraceTicket = {
        id: id("grace"), userId, earnedAtFulfillmentCount: milestone,
        status: "available", createdAt: new Date().toISOString(), usedAt: null
      };
      this.tickets.set(ticket.id, ticket);
      earned.push(ticket);
    }
    return earned;
  }

  async listByUser(userId: string): Promise<GraceTicket[]> {
    return Array.from(this.tickets.values()).filter((ticket) => ticket.userId === userId);
  }

  async listWaiversForUser(userId: string): Promise<GraceWaiver[]> {
    const requests = Array.from(this.waivers.values());
    const visible: GraceWaiver[] = [];
    for (const request of requests) {
      const coupon = await this.coupons.findById(request.couponId);
      if (request.requesterUserId === userId || coupon?.holderUserId === userId) visible.push(request);
    }
    return visible.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async createWaiver(ticketId: string, coupon: Coupon, agreement: Agreement, requesterUserId: string): Promise<GraceWaiver> {
    return this.serialize(async () => {
      const ticket = this.tickets.get(ticketId);
      if (!ticket || ticket.userId !== requesterUserId || ticket.status !== "available") {
        throw new GraceConflict("GRACE_TICKET_UNAVAILABLE");
      }
      if (coupon.agreementId !== agreement.id || coupon.status !== "available" || coupon.issuerUserId !== requesterUserId) {
        throw new GraceConflict("EQUITY_NOT_AVAILABLE_FOR_WAIVER");
      }
      if (!coupon.sourceFlipId && agreement.status !== "result_recorded") {
        throw new GraceConflict("AGREEMENT_STATE_CONFLICT");
      }
      const reservedCoupon = await this.coupons.reserveIfAvailable(coupon.id);
      if (!reservedCoupon) throw new GraceConflict("EQUITY_NOT_AVAILABLE_FOR_WAIVER");
      const request: GraceWaiver = {
        id: id("waiver"), ticketId, couponId: coupon.id, agreementId: agreement.id,
        requesterUserId, status: "pending", createdAt: new Date().toISOString(), resolvedAt: null
      };
      this.tickets.set(ticketId, { ...ticket, status: "reserved" });
      this.waivers.set(request.id, request);
      return request;
    });
  }

  async resolveWaiver(requestId: string, actorUserId: string, accept: boolean): Promise<GraceWaiver> {
    return this.serialize(async () => {
      const request = this.waivers.get(requestId);
      if (!request || request.status !== "pending") throw new GraceConflict();
      const coupon = await this.coupons.findById(request.couponId);
      const ticket = this.tickets.get(request.ticketId);
      if (!coupon || request.requesterUserId === actorUserId || coupon.holderUserId !== actorUserId || coupon.status !== "reserved" || !ticket) {
        throw new GraceConflict("WAIVER_RESPONSE_FORBIDDEN");
      }

      const agreement = await this.agreements.findById(request.agreementId);
      if (accept && !coupon.sourceFlipId && (!agreement || agreement.status !== "result_recorded")) {
        throw new GraceConflict("AGREEMENT_STATE_CONFLICT");
      }
      if (accept && !coupon.sourceFlipId && agreement) {
        await this.agreements.update({ ...agreement, status: "waived" }, agreement.revision);
      }
      const changedCoupon = accept
        ? await this.coupons.markWaivedIfAvailable(coupon.id)
        : await this.coupons.releaseReservation(coupon.id);
      if (!changedCoupon) throw new GraceConflict("EQUITY_STATE_CONFLICT");
      const resolved: GraceWaiver = {
        ...request,
        status: accept ? "approved" : "rejected",
        resolvedAt: new Date().toISOString()
      };
      this.waivers.set(request.id, resolved);
      this.tickets.set(ticket.id, {
        ...ticket,
        status: accept ? "used" : "available",
        usedAt: accept ? resolved.resolvedAt : null
      });
      return resolved;
    });
  }
}

class PostgresGraceRepository {
  constructor(private readonly db: PostgresJsDatabase) {}

  async ensureEarned(userId: string, completedCount: number): Promise<GraceTicket[]> {
    const earned: GraceTicket[] = [];
    for (let milestone = 10; milestone <= completedCount; milestone += 10) {
      const [row] = await this.db.insert(graceTickets).values({
        id: id("grace"), userId, earnedAtFulfillmentCount: milestone
      }).onConflictDoNothing().returning();
      if (row) earned.push(ticketFromRow(row));
    }
    return earned;
  }

  async listByUser(userId: string): Promise<GraceTicket[]> {
    const rows = await this.db.select().from(graceTickets)
      .where(eq(graceTickets.userId, userId)).orderBy(desc(graceTickets.createdAt));
    return rows.map(ticketFromRow);
  }

  async listWaiversForUser(userId: string): Promise<GraceWaiver[]> {
    const rows = await this.db.select({ waiver: graceWaivers }).from(graceWaivers)
      .innerJoin(coupons, eq(coupons.id, graceWaivers.couponId))
      .where(or(eq(graceWaivers.requesterUserId, userId), eq(coupons.holderUserId, userId)))
      .orderBy(desc(graceWaivers.createdAt));
    return rows.map(({ waiver }) => waiverFromRow(waiver));
  }

  async createWaiver(ticketId: string, coupon: Coupon, agreement: Agreement, requesterUserId: string): Promise<GraceWaiver> {
    return this.db.transaction(async (tx) => {
      const [currentAgreement] = await tx.select().from(agreementTable)
        .where(eq(agreementTable.id, agreement.id)).limit(1);
      if (!currentAgreement || (!coupon.sourceFlipId && currentAgreement.status !== "result_recorded")) {
        throw new GraceConflict("AGREEMENT_STATE_CONFLICT");
      }
      const [ticket] = await tx.select().from(graceTickets).where(eq(graceTickets.id, ticketId)).limit(1);
      if (!ticket || ticket.userId !== requesterUserId || ticket.status !== "available") {
        throw new GraceConflict("GRACE_TICKET_UNAVAILABLE");
      }
      const [reservedCoupon] = await tx.update(coupons).set({ status: "reserved" })
        .where(and(
          eq(coupons.id, coupon.id),
          eq(coupons.issuerUserId, requesterUserId),
          eq(coupons.status, "available")
        )).returning({ id: coupons.id });
      if (!reservedCoupon) throw new GraceConflict("EQUITY_NOT_AVAILABLE_FOR_WAIVER");
      const [reservedTicket] = await tx.update(graceTickets).set({ status: "reserved" })
        .where(and(eq(graceTickets.id, ticketId), eq(graceTickets.status, "available")))
        .returning({ id: graceTickets.id });
      if (!reservedTicket) throw new GraceConflict("GRACE_TICKET_UNAVAILABLE");
      const [row] = await tx.insert(graceWaivers).values({
        id: id("waiver"), ticketId, couponId: coupon.id, agreementId: agreement.id, requesterUserId
      }).returning();
      return waiverFromRow(row);
    });
  }

  async resolveWaiver(requestId: string, actorUserId: string, accept: boolean): Promise<GraceWaiver> {
    return this.db.transaction(async (tx) => {
      const [request] = await tx.select().from(graceWaivers).where(eq(graceWaivers.id, requestId)).limit(1);
      if (!request || request.status !== "pending") throw new GraceConflict();
      const [coupon] = await tx.select().from(coupons).where(eq(coupons.id, request.couponId)).limit(1);
      const [ticket] = await tx.select().from(graceTickets).where(eq(graceTickets.id, request.ticketId)).limit(1);
      if (!coupon || request.requesterUserId === actorUserId || coupon.holderUserId !== actorUserId || coupon.status !== "reserved" || !ticket) {
        throw new GraceConflict("WAIVER_RESPONSE_FORBIDDEN");
      }
      const now = new Date();
      const [resolved] = await tx.update(graceWaivers).set({
        status: accept ? "approved" : "rejected", resolvedAt: now
      }).where(and(eq(graceWaivers.id, requestId), eq(graceWaivers.status, "pending"))).returning();
      if (!resolved) throw new GraceConflict();
      const [changedCoupon] = await tx.update(coupons).set(accept
        ? { status: "waived", waivedAt: now }
        : { status: "available" }
      ).where(and(eq(coupons.id, coupon.id), eq(coupons.status, "reserved"))).returning({ id: coupons.id });
      if (!changedCoupon) throw new GraceConflict("EQUITY_STATE_CONFLICT");
      const [changedTicket] = await tx.update(graceTickets).set({
        status: accept ? "used" : "available", usedAt: accept ? now : null
      }).where(and(eq(graceTickets.id, ticket.id), eq(graceTickets.status, "reserved"))).returning({ id: graceTickets.id });
      if (!changedTicket) throw new GraceConflict("GRACE_TICKET_UNAVAILABLE");
      if (accept && !coupon.sourceFlipId) {
        const [updatedAgreement] = await tx.update(agreementTable).set({
          status: "waived", revision: sql`${agreementTable.revision} + 1`, updatedAt: now
        }).where(and(
          eq(agreementTable.id, request.agreementId),
          eq(agreementTable.status, "result_recorded")
        )).returning({ id: agreementTable.id });
        if (!updatedAgreement) throw new GraceConflict("AGREEMENT_STATE_CONFLICT");
      }
      return waiverFromRow(resolved);
    });
  }
}

export type GraceRepository = MemoryGraceRepository | PostgresGraceRepository;

export function createGraceRepository(
  db: PostgresJsDatabase | null,
  agreements: AgreementRepository,
  coupons: CouponRepository
): GraceRepository {
  return db ? new PostgresGraceRepository(db) : new MemoryGraceRepository(agreements, coupons);
}

export async function grantGraceIfEligible(
  grace: GraceRepository,
  agreements: AgreementRepository,
  coupons: CouponRepository,
  userId: string
) {
  const [userAgreements, ownedCoupons] = await Promise.all([agreements.list(userId), coupons.listByUser(userId)]);
  const couponFulfillments = ownedCoupons.filter(
    (coupon) => coupon.issuerUserId === userId && coupon.status === "used"
  ).length;
  const recordedFulfillments = userAgreements.filter((agreement) => {
    if (agreement.status !== "fulfilled" || agreement.stake.type === "coupon") return false;
    const owingParticipant = agreement.participants.find((participant) => participant.id === agreement.loserId);
    return owingParticipant?.userId === userId;
  }).length;
  return grace.ensureEarned(userId, couponFulfillments + recordedFulfillments);
}
