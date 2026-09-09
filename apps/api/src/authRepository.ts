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
    authLevel: row.authLevel,
    createdAt: row.createdAt.toISOString()
  };
}

export type AuthResult = {
  user: User;
  token: string;
};

class MemoryAuthRepository {
  private users = new Map<string, UserRow>();
  private sessions = new Map<string, AuthSessionRow>();

  async createGuest(nickname = "我"): Promise<AuthResult> {
    const now = new Date();
    const user: UserRow = {
      id: makeId("user"),
      nickname,
      email: null,
      passwordHash: null,
      authLevel: "guest",
      createdAt: now
    };
    this.users.set(user.id, user);
    return this.createSessionForUser(user);
  }

  async register(input: RegisterInput, currentUserId: string | null): Promise<AuthResult> {
    const existing = Array.from(this.users.values()).find((user) => user.email === input.email);
    if (existing && existing.id !== currentUserId) {
      throw new Error("EMAIL_TAKEN");
    }

    const user = currentUserId ? this.users.get(currentUserId) : null;
    const nextUser: UserRow = {
      id: user?.id ?? makeId("user"),
      nickname: input.nickname,
      email: input.email,
      passwordHash: hashPassword(input.password),
      authLevel: "registered",
      createdAt: user?.createdAt ?? new Date()
    };
    this.users.set(nextUser.id, nextUser);
    return this.createSessionForUser(nextUser);
  }

  async login(input: LoginInput): Promise<AuthResult | null> {
    const user = Array.from(this.users.values()).find((candidate) => candidate.email === input.email);
    if (!user?.passwordHash || !verifyPassword(input.password, user.passwordHash)) {
      return null;
    }
    return this.createSessionForUser(user);
  }

  async findUserByToken(token: string): Promise<User | null> {
    const session = this.sessions.get(tokenHash(token));
    if (!session || session.expiresAt < new Date()) {
      return null;
    }
    const user = this.users.get(session.userId);
    return user ? fromUserRow(user) : null;
  }

  private async createSessionForUser(user: UserRow): Promise<AuthResult> {
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

  async createGuest(nickname = "我"): Promise<AuthResult> {
    const [user] = await this.db
      .insert(users)
      .values({
        id: makeId("user"),
        nickname,
        authLevel: "guest"
      })
      .returning();
    return this.createSessionForUser(user);
  }

  async register(input: RegisterInput, currentUserId: string | null): Promise<AuthResult> {
    const [existing] = await this.db.select().from(users).where(eq(users.email, input.email)).limit(1);
    if (existing && existing.id !== currentUserId) {
      throw new Error("EMAIL_TAKEN");
    }

    const passwordHash = hashPassword(input.password);
    const [user] = currentUserId
      ? await this.db
          .update(users)
          .set({
            nickname: input.nickname,
            email: input.email,
            passwordHash,
            authLevel: "registered"
          })
          .where(eq(users.id, currentUserId))
          .returning()
      : await this.db
          .insert(users)
          .values({
            id: makeId("user"),
            nickname: input.nickname,
            email: input.email,
            passwordHash,
            authLevel: "registered"
          })
          .returning();

    return this.createSessionForUser(user);
  }

  async login(input: LoginInput): Promise<AuthResult | null> {
    const [user] = await this.db.select().from(users).where(eq(users.email, input.email)).limit(1);
    if (!user?.passwordHash || !verifyPassword(input.password, user.passwordHash)) {
      return null;
    }
    return this.createSessionForUser(user);
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

  private async createSessionForUser(user: UserRow): Promise<AuthResult> {
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

