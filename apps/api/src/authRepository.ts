import { authSessions, users } from "./db/schema.js";
import type { LoginInput, RegisterInput, User } from "@playbit/shared";
import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

type UserRow = typeof users.$inferSelect;
type AuthSessionRow = typeof authSessions.$inferSelect;

const sessionDays = 90;

function makeId(prefix: string): string {
  return `${prefix}_${randomBytes(8).toString("hex")}`;
}

function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) {
    return false;
  }

  const expected = Buffer.from(hash, "hex");
  const actual = scryptSync(password, salt, 64);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function sessionExpiry(): Date {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + sessionDays);
  return expiresAt;
}

function fromUserRow(row: UserRow): User {
  return {
    id: row.id,
    nickname: row.nickname,
    email: row.email,
    signatureDataUrl: row.signatureDataUrl,
    createdAt: row.createdAt.toISOString()
  };
}

export type AuthResult = {
  user: User;
  token: string;
};

export class AuthAccountNotFound extends Error {
  constructor() {
    super("ACCOUNT_NOT_FOUND");
  }
}

class MemoryAuthRepository {
  private users = new Map<string, UserRow>();
  private sessions = new Map<string, AuthSessionRow>();

  async register(input: RegisterInput): Promise<AuthResult> {
    const existing = Array.from(this.users.values()).find((user) => user.email === input.email);
    if (existing) {
      throw new Error("EMAIL_TAKEN");
    }

    const nextUser: UserRow = {
      id: makeId("user"),
      nickname: input.nickname,
      email: input.email,
      passwordHash: hashPassword(input.password),
      signatureDataUrl: null,
      createdAt: new Date()
    };
    this.users.set(nextUser.id, nextUser);
    return this.createAuthSessionForUser(nextUser);
  }

  async login(input: LoginInput): Promise<AuthResult | null> {
    const user = Array.from(this.users.values()).find((candidate) => candidate.email === input.email);
    if (!user) {
      throw new AuthAccountNotFound();
    }
    if (!user.passwordHash || !verifyPassword(input.password, user.passwordHash)) {
      return null;
    }
    return this.createAuthSessionForUser(user);
  }

  async findUserByToken(token: string): Promise<User | null> {
    const session = this.sessions.get(tokenHash(token));
    if (!session || session.expiresAt < new Date()) {
      return null;
    }
    const user = this.users.get(session.userId);
    return user ? fromUserRow(user) : null;
  }

  async updateSignature(userId: string, signatureDataUrl: string): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      this.users.set(userId, { ...user, signatureDataUrl });
    }
  }

  private async createAuthSessionForUser(user: UserRow): Promise<AuthResult> {
    const token = `pb_${randomBytes(32).toString("base64url")}`;
    this.sessions.set(tokenHash(token), {
      id: makeId("sess"),
      userId: user.id,
      tokenHash: tokenHash(token),
      expiresAt: sessionExpiry(),
      createdAt: new Date()
    });
    return { user: fromUserRow(user), token };
  }
}

class PostgresAuthRepository {
  constructor(private readonly db: PostgresJsDatabase) {}

  async register(input: RegisterInput): Promise<AuthResult> {
    const [existing] = await this.db.select().from(users).where(eq(users.email, input.email)).limit(1);
    if (existing) {
      throw new Error("EMAIL_TAKEN");
    }

    const passwordHash = hashPassword(input.password);
    const [user] = await this.db
      .insert(users)
      .values({
        id: makeId("user"),
        nickname: input.nickname,
        email: input.email,
        passwordHash,
        signatureDataUrl: null
      })
      .returning();

    return this.createAuthSessionForUser(user);
  }

  async login(input: LoginInput): Promise<AuthResult | null> {
    const [user] = await this.db.select().from(users).where(eq(users.email, input.email)).limit(1);
    if (!user) {
      throw new AuthAccountNotFound();
    }
    if (!user.passwordHash || !verifyPassword(input.password, user.passwordHash)) {
      return null;
    }
    return this.createAuthSessionForUser(user);
  }

  async findUserByToken(token: string): Promise<User | null> {
    const [session] = await this.db
      .select()
      .from(authSessions)
      .where(eq(authSessions.tokenHash, tokenHash(token)))
      .limit(1);

    if (!session || session.expiresAt < new Date()) {
      return null;
    }

    const [user] = await this.db.select().from(users).where(eq(users.id, session.userId)).limit(1);
    return user ? fromUserRow(user) : null;
  }

  async updateSignature(userId: string, signatureDataUrl: string): Promise<void> {
    await this.db.update(users).set({ signatureDataUrl }).where(eq(users.id, userId));
  }

  private async createAuthSessionForUser(user: UserRow): Promise<AuthResult> {
    const token = `pb_${randomBytes(32).toString("base64url")}`;
    await this.db.insert(authSessions).values({
      id: makeId("sess"),
      userId: user.id,
      tokenHash: tokenHash(token),
      expiresAt: sessionExpiry()
    });
    return { user: fromUserRow(user), token };
  }
}

export type AuthRepository = MemoryAuthRepository | PostgresAuthRepository;

export function createAuthRepository(db: PostgresJsDatabase | null): AuthRepository {
  return db ? new PostgresAuthRepository(db) : new MemoryAuthRepository();
}
