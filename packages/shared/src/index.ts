import { z } from "zod";

export const participantSchema = z.object({
  id: z.string(),
  nickname: z.string().min(1).max(24),
  role: z.enum(["initiator", "counterparty"]),
  userId: z.string().nullable().default(null),
  confirmed: z.boolean().default(false),
  signatureDataUrl: z.string().max(50000).nullable().default(null)
});

export const userSchema = z.object({
  id: z.string(),
  nickname: z.string().min(1).max(24),
  email: z.string().email().nullable(),
  signatureDataUrl: z.string().max(50000).nullable().default(null),
  createdAt: z.string()
});

export const boostSchema = z.object({
  id: z.string(),
  label: z.string().min(1).max(80),
  proposerId: z.string(),
  confirmedBy: z.array(z.string()).min(1),
  createdAt: z.string()
});

export const stakeAdditionSchema = z.object({
  boostId: z.string(),
  label: z.string().min(1).max(80),
  createdAt: z.string()
});

export const stakeSchema = z.object({
  type: z.enum(["point", "coupon", "custom"]),
  label: z.string().trim().min(1).max(80),
  fulfilled: z.boolean().default(false),
  additions: z.array(stakeAdditionSchema).default([])
});

export const couponSchema = z.object({
  id: z.string(),
  agreementId: z.string(),
  sourceFlipId: z.string().nullable().default(null),
  name: z.string().min(1).max(80),
  description: z.string().min(1).max(180),
  issuerUserId: z.string().nullable(),
  issuerNickname: z.string(),
  holderUserId: z.string().nullable(),
  holderNickname: z.string(),
  status: z.enum(["available", "reserved", "used", "waived"]),
  createdAt: z.string(),
  usedAt: z.string().nullable(),
  waivedAt: z.string().nullable().default(null)
});

export const cardCategorySchema = z.enum(["challenge", "rule", "hidden"]);

export const cardSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: cardCategorySchema,
  mode: z.enum(["versus", "together"]),
  participantMin: z.number().int().positive(),
  participantMax: z.number().int().positive(),
  durationMinutes: z.number().int().positive().nullable(),
  content: z.string(),
  winCondition: z.string(),
  reveal: z.string().optional()
});

export const agreementStatusSchema = z.enum([
  "pending_signature",
  "active",
  "result_recorded",
  "fulfilled",
  "waived"
]);

export const flipStatusSchema = z.enum(["pending_acceptance", "active", "declined", "settled"]);
export const flipSchema = z.object({
  id: z.string(),
  agreementId: z.string(),
  couponId: z.string(),
  applicantUserId: z.string(),
  inviteeUserId: z.string(),
  card: cardSchema,
  status: flipStatusSchema,
  winnerUserId: z.string().nullable(),
  resultRecorderUserId: z.string().nullable(),
  outcome: z.enum(["applicant_won", "applicant_lost"]).nullable(),
  createdAt: z.string(),
  resolvedAt: z.string().nullable()
});

export const graceTicketSchema = z.object({
  id: z.string(),
  userId: z.string(),
  earnedAtFulfillmentCount: z.number().int().positive(),
  status: z.enum(["available", "reserved", "used"]),
  createdAt: z.string(),
  usedAt: z.string().nullable()
});

export const graceWaiverSchema = z.object({
  id: z.string(),
  ticketId: z.string(),
  couponId: z.string(),
  agreementId: z.string(),
  requesterUserId: z.string(),
  status: z.enum(["pending", "approved", "rejected"]),
  createdAt: z.string(),
  resolvedAt: z.string().nullable()
});

export const createFlipSchema = z.object({ couponId: z.string().min(1) });
export const flipResponseSchema = z.object({ accept: z.boolean() });
export const recordFlipResultSchema = z.object({ winnerUserId: z.string().min(1) });

export const agreementSchema = z.object({
  id: z.string(),
  ownerUserId: z.string().nullable().default(null),
  title: z.string(),
  source: z.enum(["custom", "card"]),
  participants: z.array(participantSchema).min(1),
  challenge: z.string(),
  stake: stakeSchema,
  cardId: z.string().nullable(),
  status: agreementStatusSchema,
  winnerId: z.string().nullable(),
  loserId: z.string().nullable(),
  resultRecorderUserId: z.string().nullable(),
  fulfillmentRecorderUserId: z.string().nullable().default(null),
  boosts: z.array(boostSchema).default([]),
  revision: z.number().int().positive(),
  createdAt: z.string(),
  updatedAt: z.string(),
  resultRecordedAt: z.string().nullable(),
  shareCode: z.string()
});

export type AgreementRealtimeEvent =
  | {
      type: "agreement.updated";
      agreement: z.infer<typeof agreementSchema>;
    };

export const createAgreementSchema = z.object({
  source: z.enum(["custom", "card"]),
  creatorNickname: z.string().min(1).max(24).optional(),
  creatorSignatureDataUrl: z.string().min(1).max(50000),
  title: z.string().trim().min(1).max(48),
  challenge: z.string().trim().min(1).max(180).optional(),
  stake: stakeSchema,
  cardId: z.string().nullable().optional()
});

// Draft edits keep the same validated shape as creation, but have a separate
// contract so callers cannot accidentally treat an update as a new record.
export const updateAgreementSchema = createAgreementSchema;

export const signAgreementSchema = z.object({
  signatureDataUrl: z.string().min(1).max(50000)
});

export const createBoostSchema = z.object({
  label: z.string().min(1).max(80)
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
  nickname: z.string().min(1).max(24)
});

export const updateProfileSchema = z.object({
  nickname: z.string().trim().min(1).max(24)
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72)
});

export const recordResultSchema = z.object({
  winnerId: z.string().min(1)
});

export type Participant = z.infer<typeof participantSchema>;
export type User = z.infer<typeof userSchema>;
export type Boost = z.infer<typeof boostSchema>;
export type StakeAddition = z.infer<typeof stakeAdditionSchema>;
export type Stake = z.infer<typeof stakeSchema>;
export type Coupon = z.infer<typeof couponSchema>;
export type Flip = z.infer<typeof flipSchema>;
export type GraceTicket = z.infer<typeof graceTicketSchema>;
export type GraceWaiver = z.infer<typeof graceWaiverSchema>;
export type CreateFlipInput = z.infer<typeof createFlipSchema>;
export type CardCategory = z.infer<typeof cardCategorySchema>;
export type Card = z.infer<typeof cardSchema>;
export type AgreementStatus = z.infer<typeof agreementStatusSchema>;
export type Agreement = z.infer<typeof agreementSchema>;
export type CreateAgreementInput = z.infer<typeof createAgreementSchema>;
export type UpdateAgreementInput = z.infer<typeof updateAgreementSchema>;
export type SignAgreementInput = z.infer<typeof signAgreementSchema>;
export type CreateBoostInput = z.infer<typeof createBoostSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RecordResultInput = z.infer<typeof recordResultSchema>;
