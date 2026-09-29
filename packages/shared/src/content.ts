import { z } from "zod";
import type { Card, GameEvent } from "./index.js";

export const contentLifecycleSchema = z.enum([
  "draft",
  "pending_review",
  "changes_requested",
  "approved",
  "published",
  "paused",
  "retired"
]);
export const outcomeModelSchema = z.enum([
  "no_winner",
  "self_reported_winner",
  "ranked_result",
  "shared_completion"
]);
export const contentReviewDecisionSchema = z.enum([
  "approve",
  "request_changes",
  "pause",
  "retire"
]);
export const contentToolRequirementSchema = z.enum(["required", "optional"]);
export const contentToolStatusSchema = z.enum(["draft", "published", "paused", "retired"]);
export const l2ReusePolicySchema = z.object({
  cooldownRounds: z.number().int().nonnegative().default(0),
  cooldownDays: z.number().int().nonnegative().default(0),
  permanentExhaustion: z.boolean().default(false),
  skipCooldownRounds: z.number().int().nonnegative().default(1)
});

export const l2ContentTypeSchema = z.enum(["prompt", "truth", "sequence", "environment"]);

export const l0MechanismSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  definition: z.string(),
  status: z.enum(["candidate", "formal", "provisional", "retired"])
});

export const l1GameSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  lifecycle: contentLifecycleSchema,
  l0Ids: z.array(z.string()),
  minPlayers: z.number().int().positive(),
  maxPlayers: z.number().int().positive().nullable(),
  durationMin: z.number().int().positive().nullable(),
  durationMax: z.number().int().positive().nullable(),
  outcomeModel: outcomeModelSchema,
  certificateEligible: z.boolean(),
  favoriteCount: z.number().int().nonnegative().default(0),
  tags: z.array(z.string()).default([]),
  updatedAt: z.string()
});

export const l1GameVersionSchema = z.object({
  id: z.string(),
  l1Id: z.string(),
  versionNo: z.number().int().positive(),
  shortRule: z.string(),
  completionCondition: z.string(),
  failureCondition: z.string().nullable(),
  displayHook: z.string(),
  reviewStatus: contentLifecycleSchema,
  toolIds: z.array(z.string()),
  changeNote: z.string().nullable(),
  publishedAt: z.string().nullable(),
  createdAt: z.string()
});

export const l2ContentSchema = z.object({
  id: z.string(),
  l1Id: z.string(),
  title: z.string(),
  status: contentLifecycleSchema,
  qualityTier: z.number().int().min(0).max(100),
  reusePolicy: l2ReusePolicySchema,
  contentType: l2ContentTypeSchema,
  payload: z.record(z.string(), z.unknown()),
  sourceMode: z.enum(["system", "human", "environment", "external_ai", "hybrid"]),
  versionNo: z.number().int().positive(),
  updatedAt: z.string()
});

export const contentToolSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  runtimeKey: z.string(),
  status: contentToolStatusSchema,
  versionNo: z.number().int().positive()
});

export const contentMetricSchema = z.object({
  l1Id: z.string(),
  l1Name: z.string(),
  exposures: z.number().int().nonnegative(),
  starts: z.number().int().nonnegative(),
  completes: z.number().int().nonnegative(),
  rerolls: z.number().int().nonnegative(),
  replays: z.number().int().nonnegative(),
  switches: z.number().int().nonnegative(),
  toolOpens: z.number().int().nonnegative(),
  completionRate: z.number().nonnegative(),
  startRate: z.number().nonnegative()
});

export const contentOverviewSchema = z.object({
  generatedAt: z.string(),
  counts: z.object({
    l0: z.number().int().nonnegative(),
    l1: z.number().int().nonnegative(),
    l2: z.number().int().nonnegative(),
    published: z.number().int().nonnegative(),
    pendingReview: z.number().int().nonnegative()
  }),
  metrics: z.array(contentMetricSchema),
  tools: z.array(contentToolSchema)
});

export const contentListResponseSchema = z.object({
  items: z.array(z.object({ l1: l1GameSchema, version: l1GameVersionSchema, l2: l2ContentSchema })),
  total: z.number().int().nonnegative()
});

export const contentReuseAuditSchema = z.object({
  id: z.string(),
  l2Id: z.string(),
  actor: z.string(),
  action: z.enum(["update", "rollback"]),
  before: l2ReusePolicySchema,
  after: l2ReusePolicySchema,
  createdAt: z.string()
});

export const contentEventBatchSchema = z.object({
  events: z.array(z.custom<GameEvent>()).min(1).max(50)
});

export type ContentLifecycle = z.infer<typeof contentLifecycleSchema>;
export type OutcomeModel = z.infer<typeof outcomeModelSchema>;
export type ContentReviewDecision = z.infer<typeof contentReviewDecisionSchema>;
export type L2ReusePolicy = z.infer<typeof l2ReusePolicySchema>;
export type L2ContentType = z.infer<typeof l2ContentTypeSchema>;
export type L0Mechanism = z.infer<typeof l0MechanismSchema>;
export type L1Game = z.infer<typeof l1GameSchema>;
export type L1GameVersion = z.infer<typeof l1GameVersionSchema>;
export type L2Content = z.infer<typeof l2ContentSchema>;
export type ContentTool = z.infer<typeof contentToolSchema>;
export type ContentMetric = z.infer<typeof contentMetricSchema>;
export type ContentOverview = z.infer<typeof contentOverviewSchema>;
export type ContentListItem = z.infer<typeof contentListResponseSchema>["items"][number];
export type ContentReuseAudit = z.infer<typeof contentReuseAuditSchema>;
export type DeliveredContentCard = Card & {
  deliveryId: string;
  sessionId: string;
  l1Id: string;
  l1VersionId: string;
  l2Id: string;
  l2VersionId: string;
  reason: string[];
};
