import { betSessions } from "./db/schema.js";
import type { BetSession } from "@playbit/shared";
import { desc, eq } from "drizzle-orm";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";

type SessionRow = typeof betSessions.$inferSelect;

function toRow(session: BetSession): typeof betSessions.$inferInsert {
  return {
    id: session.id,
    title: session.title,
    source: session.source,
    participants: session.participants,
    challenge: session.challenge,
    judgmentRule: session.judgmentRule,
    stake: session.stake,
    cardId: session.cardId,
    status: session.status,
    winnerId: session.winnerId,
    loserId: session.loserId,
    shareCode: session.shareCode,
    settledAt: session.settledAt ? new Date(session.settledAt) : null,
    createdAt: new Date(session.createdAt)
  };
}

function fromRow(row: SessionRow): BetSession {
  return {
    id: row.id,
    title: row.title,
    source: row.source,
    participants: row.participants,
    challenge: row.challenge,
    judgmentRule: row.judgmentRule,
    stake: row.stake,
    cardId: row.cardId,
    status: row.status,
    winnerId: row.winnerId,
    loserId: row.loserId,
    shareCode: row.shareCode,
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

  async list(): Promise<BetSession[]> {
    return Array.from(this.sessions.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async findById(id: string): Promise<BetSession | null> {
    return this.sessions.get(id) ?? null;
  }

  async findByShareCode(shareCode: string): Promise<BetSession | null> {
    return Array.from(this.sessions.values()).find((session) => session.shareCode === shareCode) ?? null;
  }

  async update(session: BetSession): Promise<BetSession> {
    this.sessions.set(session.id, session);
    return session;
  }
}

class PostgresSessionRepository {
  constructor(private readonly db: PostgresJsDatabase) {}

  async create(session: BetSession): Promise<BetSession> {
    const [row] = await this.db.insert(betSessions).values(toRow(session)).returning();
    return fromRow(row);
  }

  async list(): Promise<BetSession[]> {
    const rows = await this.db.select().from(betSessions).orderBy(desc(betSessions.createdAt));
    return rows.map(fromRow);
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

  async update(session: BetSession): Promise<BetSession> {
    const [row] = await this.db
      .update(betSessions)
      .set(toRow(session))
      .where(eq(betSessions.id, session.id))
      .returning();
    return fromRow(row);
  }
}

export type SessionRepository = MemorySessionRepository | PostgresSessionRepository;

export function createSessionRepository(): SessionRepository {
  if (!process.env.DATABASE_URL) {
    return new MemorySessionRepository();
  }

  const ssl = process.env.DATABASE_SSL === "false" ? false : "require";
  const sql = postgres(process.env.DATABASE_URL, { ssl });
  return new PostgresSessionRepository(drizzle(sql));
}
