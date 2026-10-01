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

// Research metadata stays on the L1 admin object so imported source evidence is
// not lost, while the playable L2 payload remains focused on the user card.
export const contentResearchSchema = z.object({
  sampleCode: z.string().optional(),
  sourceType: z.string().optional(),
  sourceRegion: z.string().optional(),
  sourceWork: z.string().optional(),
  sourceUrl: z.string().optional(),
  sourceEvidence: z.string().optional(),
  sourceOriginalRule: z.string().optional(),
  coreInteraction: z.string().optional(),
  informationStructure: z.array(z.string()).default([]),
  controlStructure: z.array(z.string()).default([]),
  propsRequirement: z.string().optional(),
  movementLevel: z.string().optional(),
  l2Mode: z.string().optional(),
  l2Source: z.string().optional(),
  externalAiRequired: z.boolean().optional(),
  externalAiRole: z.string().optional(),
  variantFamily: z.string().optional(),
  editorialPriority: z.string().optional(),
  editorialNote: z.string().optional()
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
  scenes: z.array(z.string()).default([]),
  research: contentResearchSchema.optional(),
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
  l2Id: z.string().optional(),
  l2Title: z.string().optional(),
  scenes: z.array(z.string()).default([]),
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

export const contentCardMetricSchema = z.object({
  l1Id: z.string(),
  l1Name: z.string(),
  l2Id: z.string(),
  l2Title: z.string(),
  scenes: z.array(z.string()).default([]),
  status: contentLifecycleSchema,
  exposures: z.number().int().nonnegative(),
  starts: z.number().int().nonnegative(),
  completes: z.number().int().nonnegative(),
  rerolls: z.number().int().nonnegative(),
  replays: z.number().int().nonnegative(),
  switches: z.number().int().nonnegative(),
  toolOpens: z.number().int().nonnegative(),
  abandons: z.number().int().nonnegative(),
  activeActors: z.number().int().nonnegative(),
  favoriteActors: z.number().int().nonnegative(),
  heatScore: z.number().int().nonnegative(),
  completionRate: z.number().nonnegative(),
  startRate: z.number().nonnegative(),
  skipRate: z.number().nonnegative()
});

export const contentAnalyticsDimensionSchema = z.object({
  key: z.string(),
  label: z.string(),
  exposures: z.number().int().nonnegative(),
  starts: z.number().int().nonnegative(),
  completes: z.number().int().nonnegative(),
  rerolls: z.number().int().nonnegative(),
  toolOpens: z.number().int().nonnegative().default(0),
  activeActors: z.number().int().nonnegative().default(0),
  completionRate: z.number().nonnegative(),
  startRate: z.number().nonnegative(),
  skipRate: z.number().nonnegative()
});

export const contentAnalyticsToolSchema = z.object({
  toolId: z.string(),
  toolName: z.string(),
  opens: z.number().int().nonnegative(),
  associatedExposures: z.number().int().nonnegative(),
  openRate: z.number().nonnegative()
});

export const contentAnalyticsUserSegmentSchema = z.object({
  key: z.enum(["new", "returning", "favorited"]),
  label: z.string(),
  actors: z.number().int().nonnegative(),
  exposures: z.number().int().nonnegative(),
  starts: z.number().int().nonnegative(),
  completes: z.number().int().nonnegative(),
  rerolls: z.number().int().nonnegative(),
  completionRate: z.number().nonnegative(),
  startRate: z.number().nonnegative()
});

export const contentAnalyticsSchema = z.object({
  generatedAt: z.string(),
  window: z.enum(["all", "7d", "30d"]),
  cardMetrics: z.array(contentCardMetricSchema),
  userSummary: z.object({
    activeActors: z.number().int().nonnegative(),
    returningActors: z.number().int().nonnegative(),
    favoriteActors: z.number().int().nonnegative(),
    newActors: z.number().int().nonnegative()
  }),
  funnel: z.object({
    exposures: z.number().int().nonnegative(),
    starts: z.number().int().nonnegative(),
    completes: z.number().int().nonnegative(),
    rerolls: z.number().int().nonnegative(),
    toolOpens: z.number().int().nonnegative(),
    abandons: z.number().int().nonnegative()
  }),
  sceneMetrics: z.array(contentAnalyticsDimensionSchema),
  userSegments: z.array(contentAnalyticsUserSegmentSchema),
  toolMetrics: z.array(contentAnalyticsToolSchema)
});

export const contentOverviewSchema = z.object({
  generatedAt: z.string(),
  l0s: z.array(l0MechanismSchema),
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

export const contentL1ListResponseSchema = z.object({
  items: z.array(z.object({ l1: l1GameSchema, version: l1GameVersionSchema.nullable(), l2Count: z.number().int().nonnegative() })),
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
export type ContentResearch = z.infer<typeof contentResearchSchema>;
export type L1Game = z.infer<typeof l1GameSchema>;
export type L1GameVersion = z.infer<typeof l1GameVersionSchema>;
export type L2Content = z.infer<typeof l2ContentSchema>;
export type ContentTool = z.infer<typeof contentToolSchema>;
export type ContentMetric = z.infer<typeof contentMetricSchema>;
export type ContentCardMetric = z.infer<typeof contentCardMetricSchema>;
export type ContentAnalyticsDimension = z.infer<typeof contentAnalyticsDimensionSchema>;
export type ContentAnalyticsTool = z.infer<typeof contentAnalyticsToolSchema>;
export type ContentAnalyticsUserSegment = z.infer<typeof contentAnalyticsUserSegmentSchema>;
export type ContentAnalytics = z.infer<typeof contentAnalyticsSchema>;
export type ContentOverview = z.infer<typeof contentOverviewSchema>;
export type ContentListItem = z.infer<typeof contentListResponseSchema>["items"][number];
export type ContentL1ListItem = z.infer<typeof contentL1ListResponseSchema>["items"][number];
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
