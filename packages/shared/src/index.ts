import { z } from "zod";

export const participantSchema = z.object({
  id: z.string(),
  nickname: z.string().min(1).max(24),
  confirmed: z.boolean().default(false)
});

export const stakeSchema = z.object({
  type: z.enum(["point", "coupon", "custom"]),
  label: z.string().min(1).max(80),
  quantity: z.number().int().positive().default(1),
  fulfilled: z.boolean().default(false)
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
  partyA: z.string().min(1).max(24),
  partyB: z.string().min(1).max(24),
  title: z.string().min(1).max(48),
  challenge: z.string().min(1).max(180),
  judgmentRule: z.string().min(1).max(180),
  stake: stakeSchema,
  cardId: z.string().nullable().optional()
});

export const settleSessionSchema = z.object({
  winnerId: z.string().min(1),
  fulfilled: z.boolean().default(false)
});

export type Participant = z.infer<typeof participantSchema>;
export type Stake = z.infer<typeof stakeSchema>;
export type CardCategory = z.infer<typeof cardCategorySchema>;
export type Card = z.infer<typeof cardSchema>;
export type SessionStatus = z.infer<typeof sessionStatusSchema>;
export type BetSession = z.infer<typeof betSessionSchema>;
export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type SettleSessionInput = z.infer<typeof settleSessionSchema>;

