import { betSessions } from "./db/schema.js";
import { stakeSchema, type BetSession } from "@playbit/shared";
import { and, desc, eq, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

type SessionRow = typeof betSessions.$inferSelect;

export class SessionRevisionConflict extends Error {
  constructor() {
    super("SESSION_REVISION_CONFLICT");
  }
}

function toRow(session: BetSession): typeof betSessions.$inferInsert {
  return {
    id: session.id,
    ownerUserId: session.ownerUserId,
    title: session.title,
    source: session.source,
    participants: session.participants,
    boosts: session.boosts,
    challenge: session.challenge,
    judgmentRule: session.judgmentRule,
    stake: session.stake,
    cardId: session.cardId,
    status: session.status,
    winnerId: session.winnerId,
    loserId: session.loserId,
    shareCode: session.shareCode,
    revision: session.revision,
    updatedAt: new Date(session.updatedAt),
    settledAt: session.settledAt ? new Date(session.settledAt) : null,
    createdAt: new Date(session.createdAt)
  };
}

function fromRow(row: SessionRow): BetSession {
  return {
    id: row.id,
    ownerUserId: row.ownerUserId,
    title: row.title,
    source: row.source,
    participants: row.participants,
    boosts: row.boosts ?? [],
    challenge: row.challenge,
    judgmentRule: row.judgmentRule,
    stake: stakeSchema.parse(row.stake),
    cardId: row.cardId,
    status: row.status,
    winnerId: row.winnerId,
    loserId: row.loserId,
    shareCode: row.shareCode,
    revision: row.revision,
    updatedAt: row.updatedAt.toISOString(),
    settledAt: row.settledAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString()
  };
}

class MemorySessionRepository {
  private sessions = new Map<string, BetSession>();

  async create(session: BetSession): Promise<BetSession> {
    this.sessions.set(session.id, session);
    return session;
  }

  async list(userId: string | null = null): Promise<BetSession[]> {
    return Array.from(this.sessions.values())
      .filter((session) => !userId || session.participants.some((participant) => participant.userId === userId))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async findById(id: string): Promise<BetSession | null> {
    return this.sessions.get(id) ?? null;
  }

  async findByShareCode(shareCode: string): Promise<BetSession | null> {
    return Array.from(this.sessions.values()).find((session) => session.shareCode === shareCode) ?? null;
  }

  async update(session: BetSession, expectedRevision = session.revision): Promise<BetSession> {
    const current = this.sessions.get(session.id);
    if (!current || current.revision !== expectedRevision) {
      throw new SessionRevisionConflict();
    }
    const updated = {
      ...session,
      revision: current.revision + 1,
      updatedAt: new Date().toISOString()
    };
    this.sessions.set(session.id, updated);
    return updated;
  }
}

class PostgresSessionRepository {
  constructor(private readonly db: PostgresJsDatabase) {}

  async create(session: BetSession): Promise<BetSession> {
    const [row] = await this.db.insert(betSessions).values(toRow(session)).returning();
    return fromRow(row);
  }

  async list(userId: string | null = null): Promise<BetSession[]> {
    const rows = await this.db.select().from(betSessions).orderBy(desc(betSessions.createdAt));
    return rows
      .map(fromRow)
      .filter((session) => !userId || session.participants.some((participant) => participant.userId === userId));
  }

  async findById(id: string): Promise<BetSession | null> {
    const [row] = await this.db.select().from(betSessions).where(eq(betSessions.id, id)).limit(1);
    return row ? fromRow(row) : null;
  }

  async findByShareCode(shareCode: string): Promise<BetSession | null> {
    const [row] = await this.db
      .select()
      .from(betSessions)
      .where(eq(betSessions.shareCode, shareCode))
      .limit(1);
    return row ? fromRow(row) : null;
  }

  async update(session: BetSession, expectedRevision = session.revision): Promise<BetSession> {
    const [row] = await this.db
      .update(betSessions)
      .set({
        ownerUserId: session.ownerUserId,
        title: session.title,
        source: session.source,
        participants: session.participants,
        boosts: session.boosts,
        challenge: session.challenge,
        judgmentRule: session.judgmentRule,
        stake: session.stake,
        cardId: session.cardId,
        status: session.status,
        winnerId: session.winnerId,
        loserId: session.loserId,
        shareCode: session.shareCode,
        revision: sql`${betSessions.revision} + 1`,
        updatedAt: new Date(),
        settledAt: session.settledAt ? new Date(session.settledAt) : null
      })
      .where(and(eq(betSessions.id, session.id), eq(betSessions.revision, expectedRevision)))
      .returning();
    if (!row) {
      throw new SessionRevisionConflict();
    }
    return fromRow(row);
  }
}

export type SessionRepository = MemorySessionRepository | PostgresSessionRepository;

export function createSessionRepository(db: PostgresJsDatabase | null): SessionRepository {
  return db ? new PostgresSessionRepository(db) : new MemorySessionRepository();
}
