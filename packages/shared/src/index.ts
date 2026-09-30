import { z } from "zod";

export const inputLimits = {
  nickname: 20,
  agreementTitle: 50,
  customEquity: 20
} as const;

export const participantSchema = z.object({
  id: z.string(),
  nickname: z.string().min(1).max(inputLimits.nickname),
  role: z.enum(["initiator", "counterparty"]),
  userId: z.string().nullable().default(null),
  confirmed: z.boolean().default(false),
  signatureDataUrl: z.string().max(50000).nullable().default(null)
});

export const avatarDataUrlSchema = z.string().max(50000)
  .regex(/^data:image\/jpeg;base64,\/9j\/[A-Za-z0-9+/]*={0,2}$/);

export const userSchema = z.object({
  id: z.string(),
  nickname: z.string().min(1).max(inputLimits.nickname),
  email: z.string().email().nullable(),
  avatarDataUrl: avatarDataUrlSchema.nullable().default(null),
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
}).superRefine((value, context) => {
  if (value.type === "custom" && Array.from(value.label).length > inputLimits.customEquity) {
    context.addIssue({ code: z.ZodIssueCode.too_big, origin: "string", maximum: inputLimits.customEquity, inclusive: true, message: "Custom equity is too long" });
  }
});

export const couponSchema = z.object({
  id: z.string(),
  agreementId: z.string().nullable().default(null),
  gameResultId: z.string().nullable().default(null),
  certificateId: z.string().nullable().default(null),
  sourceFlipId: z.string().nullable().default(null),
  name: z.string().min(1).max(323),
  description: z.string().min(1).max(180),
  issuerUserId: z.string().nullable(),
  issuerNickname: z.string(),
  holderUserId: z.string().nullable(),
  holderNickname: z.string(),
  status: z.enum(["available", "reserved", "used", "waived"]),
  transferNote: z.string().max(180).nullable().default(null),
  createdAt: z.string(),
  usedAt: z.string().nullable(),
  waivedAt: z.string().nullable().default(null)
});

export const cardCategorySchema = z.enum(["challenge", "rule", "hidden"]);
export const cardToolIdSchema = z.enum(["timer", "counter", "scoreboard"]);
export const gameEventNameSchema = z.enum([
  "exposed",
  "rerolled",
  "started",
  "tool_opened",
  "completed",
  "abandoned"
]);
export const gameEventSchema = z.object({
  clientEventId: z.string().min(1),
  actorKey: z.string().min(1),
  sessionId: z.string().min(1),
  cardId: z.string().min(1),
  eventName: gameEventNameSchema,
  occurredAt: z.string().datetime(),
  payload: z.record(z.string(), z.unknown()).optional()
});

export const cardSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: cardCategorySchema,
  mode: z.enum(["versus", "together"]),
  participantMin: z.number().int().positive(),
  participantMax: z.number().int().positive(),
  durationMinutes: z.number().int().positive().nullable(),
  content: z.string(),
  hook: z.string().optional(),
  steps: z.array(z.string()).optional(),
  tone: z.enum(["coral", "blue", "gold"]).optional(),
  winCondition: z.string(),
  reveal: z.string().optional(),
  scenes: z.array(z.string()).optional(),
  tools: z.array(cardToolIdSchema).optional(),
  outcomeModel: z.enum(["no_winner", "self_reported_winner", "ranked_result", "shared_completion"]).optional()
});

export const agreementStatusSchema = z.enum([
  "pending_signature",
  "pending_confirmation",
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
  title: z.string().max(inputLimits.agreementTitle),
  source: z.enum(["custom", "card"]),
  participants: z.array(participantSchema).min(1),
  challenge: z.string(),
  stake: stakeSchema,
  cardId: z.string().nullable(),
  gameCard: cardSchema.nullable().default(null),
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
    }
  | {
      type: "agreement.deleted";
      agreementId: string;
    };

export const createAgreementSchema = z.object({
  source: z.enum(["custom", "card"]),
  creatorNickname: z.string().min(1).max(inputLimits.nickname).optional(),
  creatorSignatureDataUrl: z.string().min(1).max(50000),
  title: z.string().trim().min(1).max(inputLimits.agreementTitle),
  challenge: z.string().trim().min(1).max(180).optional(),
  stake: stakeSchema.refine(value => !value.fulfilled && value.additions.length === 0,
    "New stakes cannot include fulfillment or confirmed amendments"),
  cardId: z.string().nullable().optional()
});

// Draft edits keep the same validated shape as creation, but have a separate
// contract so callers cannot accidentally treat an update as a new record.
export const createAgreementRequestSchema = createAgreementSchema.extend({ requestId: z.string().uuid() });
export const updateAgreementSchema = createAgreementSchema.extend({ revision: z.number().int().positive() });

export const createGameSchema = z.object({
  requestId: z.string().uuid(),
  cardId: z.string().min(1),
  stake: z.object({ type: z.enum(["coupon", "custom"]), label: z.string().trim().min(1).max(80) }).superRefine((value, context) => {
    if (value.type === "custom" && Array.from(value.label).length > inputLimits.customEquity) {
      context.addIssue({ code: z.ZodIssueCode.too_big, origin: "string", maximum: inputLimits.customEquity, inclusive: true, message: "Custom equity is too long" });
    }
  })
});
export const joinGameSchema = z.object({ revision: z.number().int().positive() });
export type CreateGameInput = z.infer<typeof createGameSchema>;

export const signAgreementSchema = z.object({
  revision: z.number().int().positive(),
  signatureDataUrl: z.string().min(1).max(50000)
});

export const createBoostSchema = z.object({
  label: z.string().trim().min(1).max(80)
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
  nickname: z.string().min(1).max(inputLimits.nickname)
});

export const updateProfileSchema = z.object({
  nickname: z.string().trim().min(1).max(inputLimits.nickname),
  avatarDataUrl: avatarDataUrlSchema.nullable().optional()
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
export type CardToolId = z.infer<typeof cardToolIdSchema>;
export type GameEventName = z.infer<typeof gameEventNameSchema>;
export type GameEvent = z.infer<typeof gameEventSchema>;
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

export * from "./content.js";
