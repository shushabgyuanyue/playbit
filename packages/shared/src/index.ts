import { z } from "zod";

export const participantSchema = z.object({
  id: z.string(),
  nickname: z.string().min(1).max(24),
  role: z.enum(["initiator", "counterparty"]),
  userId: z.string().nullable().default(null),
  confirmed: z.boolean().default(false)
});

export const userSchema = z.object({
  id: z.string(),
  nickname: z.string().min(1).max(24),
  email: z.string().email().nullable(),
  authLevel: z.enum(["guest", "registered"]),
  createdAt: z.string()
});

export const stakeSchema = z.object({
  type: z.enum(["point", "coupon", "custom"]),
  label: z.string().min(1).max(80),
  fulfilled: z.boolean().default(false)
});

export const couponSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  name: z.string().min(1).max(80),
  description: z.string().min(1).max(180),
  issuerUserId: z.string().nullable(),
  issuerNickname: z.string(),
  holderUserId: z.string().nullable(),
  holderNickname: z.string(),
  status: z.enum(["available", "used"]),
  createdAt: z.string(),
  usedAt: z.string().nullable()
});

export const cardCategorySchema = z.enum(["challenge", "rule", "hidden", "magic"]);

export const cardSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: cardCategorySchema,
  sceneTags: z.array(z.string()),
  participantMin: z.number().int().positive(),
  participantMax: z.number().int().positive(),
  durationMinutes: z.number().int().positive().nullable(),
  content: z.string(),
  winCondition: z.string(),
  mechanism: z.string(),
  enabled: z.boolean()
});

export const sessionStatusSchema = z.enum([
  "draft",
  "pending_confirmation",
  "active",
  "settling",
  "fulfilled",
  "finished"
]);

export const betSessionSchema = z.object({
  id: z.string(),
  ownerUserId: z.string().nullable().default(null),
  title: z.string(),
  source: z.enum(["custom", "card"]),
  participants: z.array(participantSchema).min(1),
  challenge: z.string(),
  judgmentRule: z.string(),
  stake: stakeSchema,
  cardId: z.string().nullable(),
  status: sessionStatusSchema,
  winnerId: z.string().nullable(),
  loserId: z.string().nullable(),
  createdAt: z.string(),
  settledAt: z.string().nullable(),
  shareCode: z.string()
});

export const createSessionSchema = z.object({
  source: z.enum(["custom", "card"]),
  creatorNickname: z.string().min(1).max(24).optional(),
  title: z.string().min(1).max(48),
  challenge: z.string().min(1).max(180).optional(),
  judgmentRule: z.string().min(1).max(180),
  stake: stakeSchema,
  cardId: z.string().nullable().optional()
});

export const signSessionSchema = z.object({
  nickname: z.string().min(1).max(24)
});

export const guestAuthSchema = z.object({
  nickname: z.string().min(1).max(24).optional()
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
  nickname: z.string().min(1).max(24)
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(72)
});

export const settleSessionSchema = z.object({
  winnerId: z.string().min(1),
  fulfilled: z.boolean().default(false)
});

export type Participant = z.infer<typeof participantSchema>;
export type User = z.infer<typeof userSchema>;
export type Stake = z.infer<typeof stakeSchema>;
export type Coupon = z.infer<typeof couponSchema>;
export type CardCategory = z.infer<typeof cardCategorySchema>;
export type Card = z.infer<typeof cardSchema>;
export type SessionStatus = z.infer<typeof sessionStatusSchema>;
export type BetSession = z.infer<typeof betSessionSchema>;
export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type SignSessionInput = z.infer<typeof signSessionSchema>;
export type GuestAuthInput = z.infer<typeof guestAuthSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type SettleSessionInput = z.infer<typeof settleSessionSchema>;
