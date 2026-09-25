import { agreements } from "./db/schema.js";
import { stakeSchema, type Agreement } from "@playbit/shared";
import { and, desc, eq, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

type AgreementRow = typeof agreements.$inferSelect;

export class AgreementRevisionConflict extends Error {
  constructor() {
    super("SESSION_REVISION_CONFLICT");
  }
}

function toRow(agreement: Agreement): typeof agreements.$inferInsert {
  return {
    id: agreement.id,
    ownerUserId: agreement.ownerUserId,
    title: agreement.title,
    source: agreement.source,
    participants: agreement.participants,
    boosts: agreement.boosts,
    challenge: agreement.challenge,
    stake: agreement.stake,
    cardId: agreement.cardId,
    status: agreement.status,
    winnerId: agreement.winnerId,
    loserId: agreement.loserId,
    resultRecorderUserId: agreement.resultRecorderUserId,
    fulfillmentRecorderUserId: agreement.fulfillmentRecorderUserId,
    shareCode: agreement.shareCode,
    revision: agreement.revision,
    updatedAt: new Date(agreement.updatedAt),
    resultRecordedAt: agreement.resultRecordedAt ? new Date(agreement.resultRecordedAt) : null,
    createdAt: new Date(agreement.createdAt)
  };
}

function fromRow(row: AgreementRow): Agreement {
  return {
    id: row.id,
    ownerUserId: row.ownerUserId,
    title: row.title,
    source: row.source,
    participants: row.participants,
    boosts: row.boosts ?? [],
    challenge: row.challenge,
    stake: stakeSchema.parse(row.stake),
    cardId: row.cardId,
    status: row.status,
    winnerId: row.winnerId,
    loserId: row.loserId,
    resultRecorderUserId: row.resultRecorderUserId,
    fulfillmentRecorderUserId: row.fulfillmentRecorderUserId,
    shareCode: row.shareCode,
    revision: row.revision,
    updatedAt: row.updatedAt.toISOString(),
    resultRecordedAt: row.resultRecordedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString()
  };
}

class MemoryAgreementRepository {
  private agreements = new Map<string, Agreement>();

  async create(agreement: Agreement): Promise<Agreement> {
    this.agreements.set(agreement.id, agreement);
    return agreement;
  }

  async list(userId: string | null = null): Promise<Agreement[]> {
    return Array.from(this.agreements.values())
      .filter((agreement) => !userId || agreement.participants.some((participant) => participant.userId === userId))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async findById(id: string): Promise<Agreement | null> {
    return this.agreements.get(id) ?? null;
  }

  async findByShareCode(shareCode: string): Promise<Agreement | null> {
    return Array.from(this.agreements.values()).find((agreement) => agreement.shareCode === shareCode) ?? null;
  }

  async update(agreement: Agreement, expectedRevision = agreement.revision): Promise<Agreement> {
    const current = this.agreements.get(agreement.id);
    if (!current || current.revision !== expectedRevision) {
      throw new AgreementRevisionConflict();
    }
    const updated = {
      ...agreement,
      revision: current.revision + 1,
      updatedAt: new Date().toISOString()
    };
    this.agreements.set(agreement.id, updated);
    return updated;
  }
}

class PostgresAgreementRepository {
  constructor(private readonly db: PostgresJsDatabase) {}

  async create(agreement: Agreement): Promise<Agreement> {
    const [row] = await this.db.insert(agreements).values(toRow(agreement)).returning();
    return fromRow(row);
  }

  async list(userId: string | null = null): Promise<Agreement[]> {
    const query = this.db.select().from(agreements);
    const rows = await (userId
      ? query.where(sql`exists (
          select 1
          from jsonb_array_elements(${agreements.participants}) as participant
          where participant->>'userId' = ${userId}
        )`).orderBy(desc(agreements.createdAt))
      : query.orderBy(desc(agreements.createdAt)));
    return rows.map(fromRow);
  }

  async findById(id: string): Promise<Agreement | null> {
    const [row] = await this.db.select().from(agreements).where(eq(agreements.id, id)).limit(1);
    return row ? fromRow(row) : null;
  }

  async findByShareCode(shareCode: string): Promise<Agreement | null> {
    const [row] = await this.db
      .select()
      .from(agreements)
      .where(eq(agreements.shareCode, shareCode))
      .limit(1);
    return row ? fromRow(row) : null;
  }

  async update(agreement: Agreement, expectedRevision = agreement.revision): Promise<Agreement> {
    const [row] = await this.db
      .update(agreements)
      .set({
        ownerUserId: agreement.ownerUserId,
        title: agreement.title,
        source: agreement.source,
        participants: agreement.participants,
        boosts: agreement.boosts,
        challenge: agreement.challenge,
        stake: agreement.stake,
        cardId: agreement.cardId,
        status: agreement.status,
        winnerId: agreement.winnerId,
        loserId: agreement.loserId,
        resultRecorderUserId: agreement.resultRecorderUserId,
        fulfillmentRecorderUserId: agreement.fulfillmentRecorderUserId,
        shareCode: agreement.shareCode,
        revision: sql`${agreements.revision} + 1`,
        updatedAt: new Date(),
        resultRecordedAt: agreement.resultRecordedAt ? new Date(agreement.resultRecordedAt) : null
      })
      .where(and(eq(agreements.id, agreement.id), eq(agreements.revision, expectedRevision)))
      .returning();
    if (!row) {
      throw new AgreementRevisionConflict();
    }
    return fromRow(row);
  }
}

export type AgreementRepository = MemoryAgreementRepository | PostgresAgreementRepository;

export function createAgreementRepository(db: PostgresJsDatabase | null): AgreementRepository {
  return db ? new PostgresAgreementRepository(db) : new MemoryAgreementRepository();
}
