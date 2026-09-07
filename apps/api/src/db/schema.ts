import { boolean, jsonb, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";
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

export const betSessions = pgTable("bet_sessions", {
  id: text("id").primaryKey(),
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
  name: text("name").notNull(),
  description: text("description").notNull(),
  issuerNickname: text("issuer_nickname").notNull(),
  holderNickname: text("holder_nickname").notNull(),
  used: boolean("used").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  usedAt: timestamp("used_at", { withTimezone: true })
});

