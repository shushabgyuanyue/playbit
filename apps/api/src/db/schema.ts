import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { Boost, Card, Participant, Stake } from "@playbit/shared";

export const agreementSource = pgEnum("agreement_source", ["custom", "card"]);
export const agreementStatus = pgEnum("agreement_status", [
  "pending_signature",
  "active",
  "result_recorded",
  "fulfilled",
  "waived"
]);
export const stakeType = pgEnum("stake_type", ["point", "coupon", "custom"]);
export const couponStatus = pgEnum("coupon_status", ["available", "reserved", "used", "waived"]);
export const flipStatus = pgEnum("flip_status", ["pending_acceptance", "active", "declined", "settled"]);
export const graceTicketStatus = pgEnum("grace_ticket_status", ["available", "reserved", "used"]);
export const graceWaiverStatus = pgEnum("grace_waiver_status", ["pending", "approved", "rejected"]);
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  nickname: text("nickname").notNull(),
  email: text("email").unique(),
  passwordHash: text("password_hash"),
  signatureDataUrl: text("signature_data_url"),
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

export const agreements = pgTable("agreements", {
  id: text("id").primaryKey(),
  ownerUserId: text("owner_user_id").references(() => users.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  source: agreementSource("source").notNull(),
  participants: jsonb("participants").$type<Participant[]>().notNull(),
  boosts: jsonb("boosts").$type<Boost[]>().default([]).notNull(),
  challenge: text("challenge").notNull(),
  stake: jsonb("stake").$type<Stake>().notNull(),
  cardId: text("card_id"),
  status: agreementStatus("status").notNull(),
  winnerId: text("winner_id"),
  loserId: text("loser_id"),
  resultRecorderUserId: text("result_recorder_user_id").references(() => users.id, { onDelete: "set null" }),
  fulfillmentRecorderUserId: text("fulfillment_recorder_user_id").references(() => users.id, { onDelete: "set null" }),
  shareCode: text("share_code").notNull().unique(),
  revision: integer("revision").default(1).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  resultRecordedAt: timestamp("result_recorded_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const flips = pgTable(
  "flips",
  {
    id: text("id").primaryKey(),
    agreementId: text("agreement_id")
      .notNull()
      .references(() => agreements.id, { onDelete: "cascade" }),
    couponId: text("coupon_id").notNull(),
    applicantUserId: text("applicant_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    inviteeUserId: text("invitee_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    card: jsonb("card").$type<Card>().notNull(),
    status: flipStatus("status").notNull(),
    winnerUserId: text("winner_user_id").references(() => users.id, { onDelete: "set null" }),
    resultRecorderUserId: text("result_recorder_user_id").references(() => users.id, { onDelete: "set null" }),
    outcome: text("outcome"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true })
  },
  (table) => ({
    agreementIdIndex: index("flips_agreement_id_idx").on(table.agreementId),
    couponIdIndex: index("flips_coupon_id_idx").on(table.couponId)
  })
);

export const coupons = pgTable(
  "coupons",
  {
    id: text("id").primaryKey(),
    agreementId: text("agreement_id")
      .notNull()
      .references(() => agreements.id, { onDelete: "cascade" }),
    sourceFlipId: text("source_flip_id"),
    issuerUserId: text("issuer_user_id").references(() => users.id, { onDelete: "set null" }),
    holderUserId: text("holder_user_id").references(() => users.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    description: text("description").notNull(),
    issuerNickname: text("issuer_nickname").notNull(),
    holderNickname: text("holder_nickname").notNull(),
    status: couponStatus("status").default("available").notNull(),
    waivedAt: timestamp("waived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    usedAt: timestamp("used_at", { withTimezone: true })
  },
  (table) => ({
    agreementIdIndex: index("coupons_agreement_id_idx").on(table.agreementId),
    sourceFlipUnique: uniqueIndex("coupons_source_flip_id_unique")
      .on(table.sourceFlipId)
      .where(sql`${table.sourceFlipId} is not null`)
  })
);

export const graceTickets = pgTable(
  "grace_tickets",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    earnedAtFulfillmentCount: integer("earned_at_fulfillment_count").notNull(),
    status: graceTicketStatus("status").default("available").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    usedAt: timestamp("used_at", { withTimezone: true })
  },
  (table) => ({
    userMilestoneUnique: uniqueIndex("grace_tickets_user_milestone_unique")
      .on(table.userId, table.earnedAtFulfillmentCount)
  })
);

export const graceWaivers = pgTable(
  "grace_waivers",
  {
    id: text("id").primaryKey(),
    ticketId: text("ticket_id")
      .notNull()
      .references(() => graceTickets.id, { onDelete: "cascade" }),
    couponId: text("coupon_id").notNull().references(() => coupons.id, { onDelete: "cascade" }),
    agreementId: text("agreement_id")
      .notNull()
      .references(() => agreements.id, { onDelete: "cascade" }),
    requesterUserId: text("requester_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: graceWaiverStatus("status").default("pending").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true })
  },
  (table) => ({
    ticketIdIndex: index("grace_waivers_ticket_id_idx").on(table.ticketId),
    agreementIdIndex: index("grace_waivers_agreement_id_idx").on(table.agreementId),
    pendingCouponUnique: uniqueIndex("grace_waivers_pending_coupon_unique")
      .on(table.couponId)
      .where(sql`${table.status} = 'pending'`)
  })
);
