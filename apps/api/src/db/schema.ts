import { boolean, index, jsonb, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import type { Participant, Stake } from "@playbit/shared";

export const sessionSource = pgEnum("session_source", ["custom", "card"]);
export const sessionStatus = pgEnum("session_status", [
  "draft",
  "pending_confirmation",
  "active",
  "settling",
  "fulfilled",
  "finished"
]);
export const stakeType = pgEnum("stake_type", ["point", "coupon", "custom"]);
export const authLevel = pgEnum("auth_level", ["guest", "registered"]);

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  nickname: text("nickname").notNull(),
  email: text("email").unique(),
  passwordHash: text("password_hash"),
  authLevel: authLevel("auth_level").default("guest").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const authSessions = pgTable(
  "auth_sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    userIdIndex: index("auth_sessions_user_id_idx").on(table.userId)
  })
);

export const betSessions = pgTable("bet_sessions", {
  id: text("id").primaryKey(),
  ownerUserId: text("owner_user_id").references(() => users.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  source: sessionSource("source").notNull(),
  participants: jsonb("participants").$type<Participant[]>().notNull(),
  challenge: text("challenge").notNull(),
  judgmentRule: text("judgment_rule").notNull(),
  stake: jsonb("stake").$type<Stake>().notNull(),
  cardId: text("card_id"),
  status: sessionStatus("status").notNull(),
  winnerId: text("winner_id"),
  loserId: text("loser_id"),
  shareCode: text("share_code").notNull().unique(),
  settledAt: timestamp("settled_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const coupons = pgTable("coupons", {
  id: text("id").primaryKey(),
  sessionId: text("session_id")
    .notNull()
    .references(() => betSessions.id, { onDelete: "cascade" }),
  issuerUserId: text("issuer_user_id").references(() => users.id, { onDelete: "set null" }),
  holderUserId: text("holder_user_id").references(() => users.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  description: text("description").notNull(),
  issuerNickname: text("issuer_nickname").notNull(),
  holderNickname: text("holder_nickname").notNull(),
  used: boolean("used").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  usedAt: timestamp("used_at", { withTimezone: true })
});
