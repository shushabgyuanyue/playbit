import { randomUUID } from "node:crypto";
import { dailyCards } from "@playbit/cards";
import type {
  Card,
  ContentMetric,
  ContentAnalytics,
  ContentOverview,
  ContentReviewDecision,
  ContentTool,
  DeliveredContentCard,
  GameEvent,
  L0Mechanism,
  L1Game,
  L1GameVersion,
  L2Content,
  L2ReusePolicy,
  ContentReuseAudit,
  L2ContentType,
  ContentLifecycle
} from "@playbit/shared";
import { contentReviewDecisionSchema, l2ReusePolicySchema } from "@playbit/shared";
import { curatedDraftSeeds } from "./contentSeeds.js";

type ContentRecord = { l1: L1Game; version: L1GameVersion; l2: L2Content; card: Card };
type ExposureState = {
  exposures: number;
  starts: number;
  completes: number;
  rerolls: number;
  replays: number;
  switches: number;
  toolOpens: number;
  abandons: number;
  toolOpensByTool: Record<string, number>;
  lastShownAt: number;
  lastDeliveredRound: number;
  cooldownUntilRound: number;
  exhausted: boolean;
  nextAvailableAt: number;
};

type AnalyticsEvent = {
  occurredAt: number;
  actorKey: string;
  l1Id: string;
  l2Id: string;
  eventName: GameEvent["eventName"];
  toolId?: string;
  action?: string;
};

type AnalyticsCounter = {
  exposures: number;
  starts: number;
  completes: number;
  rerolls: number;
  replays: number;
  switches: number;
  toolOpens: number;
  abandons: number;
  actors: Set<string>;
  toolOpensByTool: Map<string, number>;
};

const RUNTIME_STATE_TTL_MS = 24 * 60 * 60 * 1000;

export type ContentNextInput = {
  actorKey: string;
  previousCardIds?: string[];
  participantCount?: number;
  preferredL1Id?: string;
};

export type ContentSessionInput = {
  actorKey: string;
  cardId: string;
};

export type CompleteContentSessionInput = ContentSessionInput & {
  sessionId: string;
  payload?: Record<string, unknown>;
};

export type CreateVersionInput = {
  shortRule?: string;
  completionCondition?: string;
  failureCondition?: string | null;
  displayHook?: string;
  toolIds?: string[];
  changeNote?: string | null;
};

export type CreateL1Input = {
  code: string;
  name: string;
  l0Ids: string[];
  minPlayers: number;
  maxPlayers: number | null;
  durationMin: number | null;
  durationMax: number | null;
  outcomeModel: L1Game["outcomeModel"];
  certificateEligible?: boolean;
  tags?: string[];
  scenes?: string[];
};

export type ListContentOptions = {
  status?: ContentLifecycle;
  search?: string;
  scene?: string;
  tool?: string;
  page?: number;
  pageSize?: number;
};

export type ListL1Options = {
  status?: ContentLifecycle;
  search?: string;
  withoutL2?: boolean;
};

export type ImportContentRow = {
  code: string;
  name: string;
  l0Ids: string[];
  minPlayers: number;
  maxPlayers: number | null;
  durationMin: number | null;
  durationMax: number | null;
  outcomeModel: L1Game["outcomeModel"];
  scenes: string[];
  tags: string[];
  toolIds: string[];
  title?: string;
  contentType?: L2ContentType;
  payload?: Record<string, unknown>;
  hook?: string;
  displayHook?: string;
  rule?: string;
  shortRule?: string;
  completionCondition?: string;
  failureCondition?: string | null;
  changeNote?: string | null;
};

export type CreateL2Input = {
  l1Id: string;
  title: string;
  contentType: L2ContentType;
  payload: Record<string, unknown>;
  qualityTier?: number;
  reusePolicy?: L2ReusePolicy;
  sourceMode?: L2Content["sourceMode"];
  toolIds?: string[];
};

export type UpdateL2Input = Partial<Pick<CreateL2Input, "title" | "contentType" | "qualityTier" | "sourceMode">> & {
  payload?: Record<string, unknown>;
};

export interface ContentRepository {
  next(input: ContentNextInput): DeliveredContentCard | null;
  featured(limit?: number): Card[];
  startSession(input: ContentSessionInput): DeliveredContentCard | null;
  completeSession(input: CompleteContentSessionInput): number | null;
  ingestEvents(events: GameEvent[]): number;
  listContent(options?: ContentLifecycle | ListContentOptions): Array<{ l1: L1Game; version: L1GameVersion; l2: L2Content }>;
  listL1(options?: ListL1Options): Array<{ l1: L1Game; version: L1GameVersion | null; l2Count: number }>;
  overview(): ContentOverview;
  createL1(input: CreateL1Input): L1Game | null;
  updateL1(l1Id: string, input: Partial<Pick<CreateL1Input, "name" | "l0Ids" | "minPlayers" | "maxPlayers" | "durationMin" | "durationMax" | "outcomeModel" | "certificateEligible" | "tags" | "scenes">>): L1Game | null;
  createL2(input: CreateL2Input): L2Content | null;
  updateDraftL2(l2Id: string, input: UpdateL2Input): L2Content | null;
  createVersion(l1Id: string, input: CreateVersionInput): L1GameVersion | null;
  updateDraftVersion(versionId: string, input: CreateVersionInput): L1GameVersion | null;
  submitVersion(versionId: string): L1GameVersion | null;
  reviewVersion(versionId: string, decision: ContentReviewDecision): L1GameVersion | null;
  publishVersion(versionId: string): L1GameVersion | null;
  submitL2(l2Id: string): L2Content | null;
  reviewL2(l2Id: string, decision: ContentReviewDecision): L2Content | null;
  publishL2(l2Id: string): L2Content | null;
  metrics(): ContentMetric[];
  analytics(window?: "all" | "7d" | "30d"): ContentAnalytics;
  setFavorite(actorKey: string, l1Id: string, favorite: boolean): boolean;
  updateReusePolicy(l2Id: string, policy: L2ReusePolicy, actor?: string): ContentReuseAudit | null;
  listReuseAudits(l2Id: string): ContentReuseAudit[];
  rollbackReusePolicy(l2Id: string, auditId: string, actor?: string): ContentReuseAudit | null;
}

const l0Definitions: L0Mechanism[] = [
  { id: "l0-constraint", code: "L0-01", name: "约束冲突", definition: "本能想这么做，规则偏不让。", status: "formal" },
  { id: "l0-retrieval", code: "L0-02", name: "检索枯竭", definition: "给定范围轮流检索，越往后越难。", status: "formal" },
  { id: "l0-accumulation", code: "L0-03", name: "累积负荷", definition: "前面的内容不断累积，复现并继续增加，最终超载。", status: "formal" },
  { id: "l0-reveal", code: "L0-04", name: "信息缺口", definition: "不断取得线索，直到未知答案揭晓。", status: "formal" },
  { id: "l0-mind", code: "L0-05", name: "心智博弈", definition: "给出信号，判断对方是真是假。", status: "formal" },
  { id: "l0-self-disclosure", code: "L0-06", name: "自我揭示", definition: "抛出问题，暴露经历、态度或选择，彼此发现。", status: "formal" },
  { id: "l0-association", code: "L0-07", name: "联想重构", definition: "把看似无关的东西连成一个合理答案。", status: "formal" },
  { id: "l0-relay", code: "L0-08", name: "共创接力", definition: "一方创造一点，另一方接住，作品继续失控生长。", status: "formal" },
  { id: "l0-sensory-action", code: "L0-09", name: "感知动作博弈", definition: "观察、预测并回应对方的动作，获得即时反馈。", status: "formal" }
];

const defaultTools: ContentTool[] = [
  { id: "tool-timer", code: "timer", name: "计时器", runtimeKey: "timer", status: "published", versionNo: 1 },
  { id: "tool-counter", code: "counter", name: "计数器", runtimeKey: "counter", status: "published", versionNo: 1 },
  { id: "tool-scoreboard", code: "scoreboard", name: "记分牌", runtimeKey: "scoreboard", status: "published", versionNo: 1 }
];

function now() { return new Date().toISOString(); }

function inferL0Ids(card: Card) {
  if (card.id.includes("turtle") || card.category === "hidden") return ["l0-reveal"];
  if (card.id.includes("wrong")) return ["l0-constraint"];
  if (card.id.includes("truth") || card.mode === "versus") return ["l0-mind"];
  if (card.category === "challenge") return ["l0-retrieval"];
  return ["l0-association"];
}

function inferL1Id(card: Card) {
  return card.id.startsWith("turtle-soup-") ? "l1_turtle_soup" : `l1_${card.id}`;
}

function inferL1Name(card: Card) {
  return card.id.startsWith("turtle-soup-") ? "海龟汤" : card.name;
}

function inferTools(card: Card) {
  if (card.tools?.length) return card.tools;
  const tools: string[] = [];
  if (card.durationMinutes) tools.push("timer");
  if (card.mode === "versus") tools.push("counter");
  if (card.participantMax > 2) tools.push("scoreboard");
  return tools.length ? tools : ["timer"];
}

function inferOutcome(card: Card): L1Game["outcomeModel"] {
  if (card.outcomeModel) return card.outcomeModel;
  if (card.mode === "versus") return "self_reported_winner";
  return "shared_completion";
}

function inferScenes(card: Card) {
  const scenes = [card.participantMax > 2 ? "多人聚会" : "双人对局"];
  if (card.durationMinutes !== null) scenes.push(card.durationMinutes <= 3 ? "碎片时间" : "朋友聚会");
  if (card.category === "hidden") scenes.push("安静推理");
  return [...new Set(scenes)];
}

function cardFromContent(l1: L1Game, version: L1GameVersion, l2: L2Content, cardId = l2.id): Card {
  const payload = l2.payload;
  const category = payload.category === "rule" || payload.category === "hidden" ? payload.category : "challenge";
  const mode = payload.mode === "versus" ? "versus" : "together";
  const steps = Array.isArray(payload.steps) ? payload.steps.filter((item): item is string => typeof item === "string") : undefined;
  const tone = payload.tone === "coral" || payload.tone === "blue" || payload.tone === "gold" ? payload.tone : undefined;
  return {
    id: cardId,
    name: l2.title,
    category,
    mode,
    participantMin: l1.minPlayers,
    participantMax: l1.maxPlayers ?? Math.max(l1.minPlayers, 8),
    durationMinutes: l1.durationMin,
    content: typeof payload.content === "string" ? payload.content : version.shortRule,
    hook: version.displayHook,
    steps,
    tone,
    scenes: l1.scenes,
    winCondition: version.completionCondition,
    reveal: typeof payload.reveal === "string" ? payload.reveal : version.failureCondition ?? undefined,
    tools: version.toolIds as Card["tools"],
    outcomeModel: l1.outcomeModel
  };
}

function createRecord(card: Card): ContentRecord {
  const createdAt = now();
  const l1Id = inferL1Id(card);
  const versionId = `l1v_${card.id}_1`;
  const l2Id = `l2_${card.id}`;
  return {
    l1: {
      id: l1Id,
      code: card.id.toUpperCase(),
      name: inferL1Name(card),
      lifecycle: "published",
      l0Ids: inferL0Ids(card),
      minPlayers: card.participantMin,
      maxPlayers: card.participantMax,
      durationMin: card.durationMinutes,
      durationMax: card.durationMinutes,
      outcomeModel: inferOutcome(card),
      certificateEligible: true,
      favoriteCount: 0,
      tags: [card.category === "hidden" ? "推理" : card.mode === "versus" ? "对决" : "共创"],
      scenes: inferScenes(card),
      updatedAt: createdAt
    },
    version: {
      id: versionId,
      l1Id,
      versionNo: 1,
      shortRule: card.content,
      completionCondition: card.winCondition,
      failureCondition: card.reveal ?? null,
      displayHook: card.hook ?? card.name,
      reviewStatus: "published",
      toolIds: inferTools(card),
      changeNote: "从现有精选卡目录建立的首个内容快照",
      publishedAt: createdAt,
      createdAt
    },
    l2: {
      id: l2Id,
      l1Id,
      title: card.name,
      status: "published",
      qualityTier: 80,
      reusePolicy: {
        cooldownRounds: card.category === "hidden" ? 0 : 30,
        cooldownDays: 0,
        permanentExhaustion: card.category === "hidden",
        skipCooldownRounds: 1
      },
      contentType: card.category === "hidden" ? "truth" : "prompt",
      payload: {
        content: card.content,
        mode: card.mode,
        category: card.category,
        tone: card.tone,
        steps: card.steps,
        reveal: card.reveal
      },
      sourceMode: "system",
      versionNo: 1,
      updatedAt: createdAt
    },
    card
  };
}

export function createContentRepository(): ContentRepository {
  const records = new Map<string, ContentRecord>(dailyCards.map((card) => [card.id, createRecord(card)]));
  const l1s = new Map<string, L1Game>();
  const versions = new Map<string, L1GameVersion>();
  const publishedVersions = new Map<string, L1GameVersion>();
  const exposure = new Map<string, ExposureState>();
  const l1Exposure = new Map<string, { exposures: number; lastDeliveredRound: number; cooldownUntilRound: number }>();
  const seenEvents = new Map<string, number>();
  const favorites = new Map<string, Set<string>>();
  const actorsByL2 = new Map<string, Set<string>>();
  const recommendationRounds = new Map<string, number>();
  const actorLastSeen = new Map<string, number>();
  const analyticsEvents: AnalyticsEvent[] = [];
  const reuseAudits = new Map<string, ContentReuseAudit[]>();
  const sessions = new Map<string, {
    actorKey: string;
    cardId: string;
    completed: boolean;
    createdAt: number;
    completedAt: number | null;
  }>();

  function touchCardsForL1(l1Id: string, updatedAt: string) {
    for (const record of records.values()) {
      if (record.l1.id === l1Id) record.l2.updatedAt = updatedAt;
    }
  }

  for (const card of dailyCards) {
    const record = records.get(card.id)!;
    const version: L1GameVersion = {
      id: `l1v_${card.id}_1`,
      l1Id: record.l1.id,
      versionNo: 1,
      shortRule: card.content,
      completionCondition: card.winCondition,
      failureCondition: card.reveal ?? null,
      displayHook: card.hook ?? card.name,
      reviewStatus: "published",
      toolIds: inferTools(card),
      changeNote: "从现有精选卡目录建立的首个内容快照",
      publishedAt: record.l1.updatedAt,
      createdAt: record.l1.updatedAt
    };
    l1s.set(record.l1.id, record.l1);
    versions.set(version.id, version);
    publishedVersions.set(record.l1.id, version);
    record.version = version;
  }

  function stateKey(actorKey: string, l2Id: string) { return `${actorKey}:${l2Id}`; }
  function actorFavorites(actorKey: string) {
    const existing = favorites.get(actorKey);
    if (existing) return existing;
    const next = new Set<string>();
    favorites.set(actorKey, next);
    return next;
  }
  function getState(actorKey: string, l2Id: string): ExposureState {
    const key = stateKey(actorKey, l2Id);
    const existing = exposure.get(key);
    if (existing) return existing;
    const next = {
      exposures: 0,
      starts: 0,
      completes: 0,
      rerolls: 0,
      replays: 0,
      switches: 0,
      toolOpens: 0,
      abandons: 0,
      toolOpensByTool: {},
      lastShownAt: 0,
      lastDeliveredRound: 0,
      cooldownUntilRound: 0,
      exhausted: false,
      nextAvailableAt: 0
    };
    exposure.set(key, next);
    return next;
  }

  function recordAnalyticsEvent(event: AnalyticsEvent) {
    analyticsEvents.push(event);
    if (analyticsEvents.length > 100_000) analyticsEvents.splice(0, analyticsEvents.length - 100_000);
  }

  function getL1State(actorKey: string, l1Id: string) {
    const key = `${actorKey}:${l1Id}`;
    const existing = l1Exposure.get(key);
    if (existing) return existing;
    const next = { exposures: 0, lastDeliveredRound: 0, cooldownUntilRound: 0 };
    l1Exposure.set(key, next);
    return next;
  }

  function pruneRuntimeState(currentTime = Date.now()) {
    for (const [key, receivedAt] of seenEvents) {
      if (receivedAt + RUNTIME_STATE_TTL_MS <= currentTime) seenEvents.delete(key);
    }
    for (const [sessionId, session] of sessions) {
      const lastRelevantAt = session.completedAt ?? session.createdAt;
      if (lastRelevantAt + RUNTIME_STATE_TTL_MS <= currentTime) sessions.delete(sessionId);
    }
    for (const [actorKey, lastSeenAt] of actorLastSeen) {
      if (lastSeenAt + RUNTIME_STATE_TTL_MS > currentTime) continue;
      actorLastSeen.delete(actorKey);
      recommendationRounds.delete(actorKey);
      favorites.delete(actorKey);
      const prefix = `${actorKey}:`;
      for (const key of exposure.keys()) if (key.startsWith(prefix)) exposure.delete(key);
      for (const key of l1Exposure.keys()) if (key.startsWith(prefix)) l1Exposure.delete(key);
    }
  }

  function touchActor(actorKey: string) {
    actorLastSeen.set(actorKey, Date.now());
  }

  function touchCardActor(actorKey: string, l2Id: string) {
    const actors = actorsByL2.get(l2Id) ?? new Set<string>();
    actors.add(actorKey);
    actorsByL2.set(l2Id, actors);
  }

  function next(input: ContentNextInput) {
    pruneRuntimeState();
    touchActor(input.actorKey);
    const round = (recommendationRounds.get(input.actorKey) ?? 0) + 1;
    recommendationRounds.set(input.actorKey, round);
    const previousIds = new Set(input.previousCardIds ?? []);
    const candidates = [...records.values()].filter((record) => {
      const version = publishedVersions.get(record.l1.id);
      if (record.l1.lifecycle !== "published" || !version || record.l2.status !== "published") return false;
      if (input.preferredL1Id && record.l1.id !== input.preferredL1Id) return false;
      if (input.participantCount && (input.participantCount < record.l1.minPlayers || (record.l1.maxPlayers && input.participantCount > record.l1.maxPlayers))) return false;
      const item = getState(input.actorKey, record.l2.id);
      const l1Item = getL1State(input.actorKey, record.l1.id);
      const l1Ready = Boolean(input.preferredL1Id) || l1Item.cooldownUntilRound <= round;
      return l1Ready && !item.exhausted && item.cooldownUntilRound <= round && item.nextAvailableAt <= Date.now();
    });
    const fresh = candidates.filter((record) => !previousIds.has(record.card.id));
    const pool = fresh.length ? fresh : candidates;
    if (!pool.length) return null;
    const favoriteL1s = actorFavorites(input.actorKey);
    pool.sort((left, right) => {
      const leftState = getState(input.actorKey, left.l2.id);
      const rightState = getState(input.actorKey, right.l2.id);
      const leftScore = left.l2.qualityTier + (favoriteL1s.has(left.l1.id) ? 18 : 0) - leftState.exposures * 3 - leftState.rerolls * 8;
      const rightScore = right.l2.qualityTier + (favoriteL1s.has(right.l1.id) ? 18 : 0) - rightState.exposures * 3 - rightState.rerolls * 8;
      return rightScore - leftScore;
    });
    const selected = pool[0];
    const selectedVersion = publishedVersions.get(selected.l1.id)!;
    const state = getState(input.actorKey, selected.l2.id);
    touchCardActor(input.actorKey, selected.l2.id);
    const l1State = getL1State(input.actorKey, selected.l1.id);
    state.exposures += 1;
    state.lastShownAt = Date.now();
    state.lastDeliveredRound = round;
    recordAnalyticsEvent({
      occurredAt: Date.now(),
      actorKey: input.actorKey,
      l1Id: selected.l1.id,
      l2Id: selected.l2.id,
      eventName: "exposed"
    });
    l1State.exposures += 1;
    l1State.lastDeliveredRound = round;
    if (!input.preferredL1Id) l1State.cooldownUntilRound = round + 2;
    const delivered = {
      ...cardFromContent(selected.l1, selectedVersion, selected.l2, selected.card.id),
      deliveryId: `delivery_${randomUUID()}`,
      sessionId: `session_${randomUUID()}`,
      l1Id: selected.l1.id,
      l1VersionId: selectedVersion.id,
      l2Id: selected.l2.id,
      l2VersionId: `${selected.l2.id}_v${selected.l2.versionNo}`,
      reason: [
        "已发布",
        `${selected.l1.minPlayers}-${selected.l1.maxPlayers ?? "多人"}人适配`,
        favoriteL1s.has(selected.l1.id) ? "你收藏过的玩法" : "内容新鲜度优先",
        fresh.length ? "避开最近出现的卡" : "候选已恢复探索"
      ]
    } satisfies DeliveredContentCard;
    sessions.set(delivered.sessionId, {
      actorKey: input.actorKey,
      cardId: selected.card.id,
      completed: false,
      createdAt: Date.now(),
      completedAt: null
    });
    return delivered;
  }

  function featured(limit = 3) {
    const safeLimit = Math.min(12, Math.max(1, Math.floor(limit) || 3));
    return [...records.values()]
      .filter((record) => record.l1.lifecycle === "published" && record.version.reviewStatus === "published" && record.l2.status === "published")
      .sort((left, right) => {
        const rightUpdatedAt = Date.parse(right.l2.updatedAt) || 0;
        const leftUpdatedAt = Date.parse(left.l2.updatedAt) || 0;
        return rightUpdatedAt - leftUpdatedAt || right.l2.qualityTier - left.l2.qualityTier;
      })
      .slice(0, safeLimit)
      .map((record) => cardFromContent(record.l1, record.version, record.l2, record.card.id));
  }

  function startSession(input: ContentSessionInput) {
    pruneRuntimeState();
    touchActor(input.actorKey);
    const record = [...records.values()].find((candidate) =>
      candidate.card.id === input.cardId || candidate.l2.id === input.cardId
    );
    if (!record || record.l1.lifecycle !== "published" || record.l2.status !== "published") return null;
    const selectedVersion = publishedVersions.get(record.l1.id);
    if (!selectedVersion) return null;
    touchCardActor(input.actorKey, record.l2.id);
    const delivered = {
      ...cardFromContent(record.l1, selectedVersion, record.l2, record.card.id),
      deliveryId: `delivery_${randomUUID()}`,
      sessionId: `session_${randomUUID()}`,
      l1Id: record.l1.id,
      l1VersionId: selectedVersion.id,
      l2Id: record.l2.id,
      l2VersionId: `${record.l2.id}_v${record.l2.versionNo}`,
      reason: ["按指定卡创建临时局"]
    } satisfies DeliveredContentCard;
    sessions.set(delivered.sessionId, {
      actorKey: input.actorKey,
      cardId: record.card.id,
      completed: false,
      createdAt: Date.now(),
      completedAt: null
    });
    return delivered;
  }

  function completeSession(input: CompleteContentSessionInput) {
    pruneRuntimeState();
    touchActor(input.actorKey);
    const session = sessions.get(input.sessionId);
    if (!session || session.actorKey !== input.actorKey || session.cardId !== input.cardId) return null;
    if (session.completed) return 0;
    const accepted = ingestEvents([{
      clientEventId: `complete_${input.sessionId}`,
      actorKey: input.actorKey,
      sessionId: input.sessionId,
      cardId: input.cardId,
      eventName: "completed",
      occurredAt: now(),
      payload: input.payload
    }]);
    if (accepted > 0) {
      session.completed = true;
      session.completedAt = Date.now();
    }
    return accepted;
  }

  function ingestEvents(events: GameEvent[]) {
    pruneRuntimeState();
    let accepted = 0;
    for (const event of events) {
      touchActor(event.actorKey);
      const eventKey = `${event.actorKey}:${event.clientEventId}`;
      if (seenEvents.has(eventKey)) continue;
      const record = records.get(event.cardId);
      if (!record) continue;
      seenEvents.set(eventKey, Date.now());
      accepted += 1;
      const item = getState(event.actorKey, record.l2.id);
      recordAnalyticsEvent({
        occurredAt: Date.parse(event.occurredAt) || Date.now(),
        actorKey: event.actorKey,
        l1Id: record.l1.id,
        l2Id: record.l2.id,
        eventName: event.eventName,
        toolId: typeof event.payload?.tool === "string" ? event.payload.tool : undefined,
        action: typeof event.payload?.action === "string" ? event.payload.action : undefined
      });
      if (event.eventName === "started") item.starts += 1;
      if (event.eventName === "completed") {
        item.completes += 1;
        const session = sessions.get(event.sessionId);
        if (session && session.actorKey === event.actorKey && session.cardId === event.cardId) {
          session.completed = true;
          session.completedAt = Date.now();
        }
        if (record.l2.reusePolicy.permanentExhaustion) item.exhausted = true;
        if (record.l2.reusePolicy.cooldownRounds > 0) {
          item.cooldownUntilRound = Math.max(
            item.cooldownUntilRound,
            item.lastDeliveredRound + record.l2.reusePolicy.cooldownRounds + 1
          );
        }
        if (record.l2.reusePolicy.cooldownDays > 0) {
          item.nextAvailableAt = Math.max(
            item.nextAvailableAt,
            Date.now() + record.l2.reusePolicy.cooldownDays * 86_400_000
          );
        }
      }
      if (event.eventName === "rerolled") {
        item.rerolls += 1;
        item.cooldownUntilRound = Math.max(
          item.cooldownUntilRound,
          item.lastDeliveredRound + record.l2.reusePolicy.skipCooldownRounds + 1
        );
        const l1Item = getL1State(event.actorKey, record.l1.id);
        l1Item.cooldownUntilRound = Math.max(
          l1Item.cooldownUntilRound,
          (recommendationRounds.get(event.actorKey) ?? l1Item.lastDeliveredRound) + 2
        );
      }
      if (event.eventName === "exposed") {
        const action = typeof event.payload?.action === "string" ? event.payload.action : "";
        if (action === "replay_same_l1") item.replays += 1;
        if (action === "switch_l1") item.switches += 1;
      }
      if (event.eventName === "abandoned") item.abandons += 1;
      if (event.eventName === "tool_opened") {
        item.toolOpens += 1;
        const tool = typeof event.payload?.tool === "string" ? event.payload.tool : "unknown";
        item.toolOpensByTool[tool] = (item.toolOpensByTool[tool] ?? 0) + 1;
      }
    }
    return accepted;
  }

  function listContent(input?: ContentLifecycle | ListContentOptions) {
    const options: ListContentOptions = typeof input === "string" ? { status: input } : input ?? {};
    const normalizedSearch = options.search?.trim().toLowerCase();
    return [...records.values()]
      .filter((item) => {
        const statusMatches = !options.status || item.l1.lifecycle === options.status || item.version.reviewStatus === options.status || item.l2.status === options.status;
        const searchText = [item.l1.name, item.l1.code, item.l2.title, item.version.displayHook, item.version.shortRule, typeof item.l2.payload.content === "string" ? item.l2.payload.content : ""].join(" ").toLowerCase();
        const searchMatches = !normalizedSearch || searchText.includes(normalizedSearch);
        const sceneMatches = !options.scene || item.l1.scenes.includes(options.scene);
        const toolMatches = !options.tool || item.version.toolIds.includes(options.tool);
        return statusMatches && searchMatches && sceneMatches && toolMatches;
      })
      .sort((left, right) => {
        const rightUpdatedAt = Date.parse(right.l2.updatedAt) || 0;
        const leftUpdatedAt = Date.parse(left.l2.updatedAt) || 0;
        return rightUpdatedAt - leftUpdatedAt || right.l2.id.localeCompare(left.l2.id);
      })
      .map(({ l1, version, l2 }) => ({ l1, version, l2 }));
  }

  function listL1(options: ListL1Options = {}) {
    const normalizedSearch = options.search?.trim().toLowerCase();
    return [...l1s.values()]
      .map((l1) => {
        const versionsForL1 = [...versions.values()].filter((version) => version.l1Id === l1.id).sort((left, right) => right.versionNo - left.versionNo);
        const l2Count = [...records.values()].filter((record) => record.l1.id === l1.id).length;
        return { l1, version: versionsForL1[0] ?? null, l2Count };
      })
      .filter(({ l1, version, l2Count }) => {
        const statusMatches = !options.status || l1.lifecycle === options.status || version?.reviewStatus === options.status;
        const searchText = [l1.name, l1.code, ...l1.scenes].join(" ").toLowerCase();
        const searchMatches = !normalizedSearch || searchText.includes(normalizedSearch);
        const withoutL2Matches = !options.withoutL2 || l2Count === 0;
        return statusMatches && searchMatches && withoutL2Matches;
      })
      .sort((left, right) => {
        const rightUpdatedAt = Date.parse(right.l1.updatedAt) || 0;
        const leftUpdatedAt = Date.parse(left.l1.updatedAt) || 0;
        return rightUpdatedAt - leftUpdatedAt || right.l1.id.localeCompare(left.l1.id);
      });
  }

  function createL1(input: CreateL1Input) {
    if ([...l1s.values()].some((item) => item.code === input.code || item.name === input.name)) return null;
    const createdAt = now();
    const l1: L1Game = {
      id: `l1_${randomUUID()}`,
      code: input.code,
      name: input.name,
      lifecycle: "draft",
      l0Ids: input.l0Ids,
      minPlayers: input.minPlayers,
      maxPlayers: input.maxPlayers,
      durationMin: input.durationMin,
      durationMax: input.durationMax,
      outcomeModel: input.outcomeModel,
      certificateEligible: input.certificateEligible ?? true,
      favoriteCount: 0,
      tags: input.tags ?? [],
      scenes: input.scenes ?? [],
      updatedAt: createdAt
    };
    l1s.set(l1.id, l1);
    return l1;
  }

  function updateL1(l1Id: string, input: Partial<Pick<CreateL1Input, "name" | "l0Ids" | "minPlayers" | "maxPlayers" | "durationMin" | "durationMax" | "outcomeModel" | "certificateEligible" | "tags" | "scenes">>) {
    const l1 = l1s.get(l1Id);
    if (!l1 || !["draft", "changes_requested"].includes(l1.lifecycle)) return null;
    const updated = {
      ...l1,
      ...input,
      updatedAt: now()
    };
    l1s.set(l1Id, updated);
    for (const record of records.values()) if (record.l1.id === l1Id) record.l1 = updated;
    touchCardsForL1(l1Id, updated.updatedAt);
    return updated;
  }

  function createL2(input: CreateL2Input) {
    const l1 = l1s.get(input.l1Id);
    if (!l1) return null;
    let version = [...versions.values()].filter((item) => item.l1Id === input.l1Id).sort((a, b) => b.versionNo - a.versionNo)[0];
    if (!version) {
      version = {
        id: `l1v_${randomUUID()}`,
        l1Id: l1.id,
        versionNo: 1,
        shortRule: typeof input.payload.content === "string" ? input.payload.content : "主持人按卡面引导完成本局。",
        completionCondition: "主持人确认本局完成。",
        failureCondition: null,
        displayHook: input.title,
        reviewStatus: "draft",
        toolIds: input.toolIds ?? [],
        changeNote: "创建 L1 时自动生成的初始草稿",
        publishedAt: null,
        createdAt: now()
      };
      versions.set(version.id, version);
    }
    const createdAt = now();
    const l2: L2Content = {
      id: `l2_${randomUUID()}`,
      l1Id: input.l1Id,
      title: input.title,
      status: "draft",
      qualityTier: input.qualityTier ?? 60,
      reusePolicy: l2ReusePolicySchema.parse(input.reusePolicy ?? {}),
      contentType: input.contentType,
      payload: input.payload,
      sourceMode: input.sourceMode ?? "human",
      versionNo: 1,
      updatedAt: createdAt
    };
    records.set(l2.id, { l1, version, l2, card: cardFromContent(l1, version, l2) });
    return l2;
  }

  function createVersion(l1Id: string, input: CreateVersionInput) {
    const l1 = l1s.get(l1Id);
    if (!l1) return null;
    const current = [...versions.values()].filter((version) => version.l1Id === l1Id).sort((a, b) => b.versionNo - a.versionNo)[0];
    const createdAt = now();
    const version: L1GameVersion = {
      id: `l1v_${randomUUID()}`,
      l1Id,
      versionNo: (current?.versionNo ?? 0) + 1,
      shortRule: input.shortRule ?? current?.shortRule ?? "主持人按卡面引导完成本局。",
      completionCondition: input.completionCondition ?? current?.completionCondition ?? "主持人确认本局完成。",
      failureCondition: input.failureCondition === undefined ? current?.failureCondition ?? null : input.failureCondition,
      displayHook: input.displayHook ?? current?.displayHook ?? l1.name,
      toolIds: input.toolIds ?? current?.toolIds ?? [],
      changeNote: input.changeNote ?? null,
      reviewStatus: "draft",
      publishedAt: null,
      createdAt
    };
    versions.set(version.id, version);
    for (const record of records.values()) {
      if (record.l1.id === l1Id) {
        record.version = version;
        record.l2.updatedAt = createdAt;
      }
    }
    return version;
  }

  function updateVersion(version: L1GameVersion) {
    versions.set(version.id, version);
    const updatedAt = now();
    for (const record of records.values()) {
      if (record.l1.id === version.l1Id) {
        record.version = version;
        record.l2.updatedAt = updatedAt;
      }
    }
    return version;
  }

  function updateDraftVersion(versionId: string, input: CreateVersionInput) {
    const version = versions.get(versionId);
    if (!version || !["draft", "changes_requested"].includes(version.reviewStatus)) return null;
    return updateVersion({
      ...version,
      shortRule: input.shortRule ?? version.shortRule,
      completionCondition: input.completionCondition ?? version.completionCondition,
      failureCondition: input.failureCondition === undefined ? version.failureCondition : input.failureCondition,
      displayHook: input.displayHook ?? version.displayHook,
      toolIds: input.toolIds ?? version.toolIds,
      changeNote: input.changeNote === undefined ? version.changeNote : input.changeNote
    });
  }

  function reviewVersion(versionId: string, decision: ContentReviewDecision) {
    const parsed = contentReviewDecisionSchema.safeParse(decision);
    if (!parsed.success) return null;
    const version = versions.get(versionId);
    if (!version || version.reviewStatus !== "pending_review") return null;
    const status: ContentLifecycle = parsed.data === "approve" ? "approved" : parsed.data === "request_changes" ? "changes_requested" : parsed.data === "pause" ? "paused" : "retired";
    const updated = { ...version, reviewStatus: status };
    return updateVersion(updated);
  }

  function submitVersion(versionId: string) {
    const version = versions.get(versionId);
    if (!version || !["draft", "changes_requested"].includes(version.reviewStatus)) return null;
    const updated = { ...version, reviewStatus: "pending_review" as const };
    return updateVersion(updated);
  }

  function publishVersion(versionId: string) {
    const version = versions.get(versionId);
    if (!version || !["approved", "published"].includes(version.reviewStatus)) return null;
    const updated = { ...version, reviewStatus: "published" as const, publishedAt: now() };
    updateVersion(updated);
    publishedVersions.set(updated.l1Id, updated);
    const l1 = l1s.get(updated.l1Id);
    if (l1) {
      l1.lifecycle = "published";
      l1.updatedAt = updated.publishedAt;
    }
    return updated;
  }

  function updateL2(l2Id: string, update: (l2: L2Content) => L2Content) {
    const record = records.get(l2Id);
    if (!record) return null;
    record.l2 = update(record.l2);
    record.card = cardFromContent(record.l1, record.version, record.l2, record.card.id);
    return record.l2;
  }

  function updateDraftL2(l2Id: string, input: UpdateL2Input) {
    const record = records.get(l2Id);
    if (!record || !["draft", "changes_requested"].includes(record.l2.status)) return null;
    return updateL2(l2Id, (l2) => ({
      ...l2,
      title: input.title ?? l2.title,
      contentType: input.contentType ?? l2.contentType,
      payload: input.payload ?? l2.payload,
      qualityTier: input.qualityTier ?? l2.qualityTier,
      sourceMode: input.sourceMode ?? l2.sourceMode,
      updatedAt: now()
    }));
  }

  function submitL2(l2Id: string) {
    const record = records.get(l2Id);
    if (!record || !["draft", "changes_requested"].includes(record.l2.status)) return null;
    return updateL2(l2Id, (l2) => ({ ...l2, status: "pending_review", updatedAt: now() }));
  }

  function reviewL2(l2Id: string, decision: ContentReviewDecision) {
    const parsed = contentReviewDecisionSchema.safeParse(decision);
    const record = records.get(l2Id);
    if (!parsed.success || !record || record.l2.status !== "pending_review") return null;
    const status: ContentLifecycle = parsed.data === "approve" ? "approved" : parsed.data === "request_changes" ? "changes_requested" : parsed.data === "pause" ? "paused" : "retired";
    return updateL2(l2Id, (l2) => ({ ...l2, status, updatedAt: now() }));
  }

  function publishL2(l2Id: string) {
    const record = records.get(l2Id);
    if (!record || !["approved", "published"].includes(record.l2.status)) return null;
    return updateL2(l2Id, (l2) => ({ ...l2, status: "published", updatedAt: now() }));
  }

  function updateReusePolicy(l2Id: string, policy: L2ReusePolicy, actor = "studio") {
    const record = records.get(l2Id);
    const parsed = l2ReusePolicySchema.safeParse(policy);
    if (!record || !parsed.success) return null;
    const before = record.l2.reusePolicy;
    const after = parsed.data;
    updateL2(l2Id, (l2) => ({ ...l2, reusePolicy: after, updatedAt: now() }));
    const audit: ContentReuseAudit = { id: `reuse_${randomUUID()}`, l2Id, actor, action: "update", before, after, createdAt: now() };
    reuseAudits.set(l2Id, [...(reuseAudits.get(l2Id) ?? []), audit]);
    return audit;
  }

  function listReuseAudits(l2Id: string) {
    return reuseAudits.get(l2Id) ?? [];
  }

  function rollbackReusePolicy(l2Id: string, auditId: string, actor = "studio") {
    const record = records.get(l2Id);
    const source = reuseAudits.get(l2Id)?.find((item) => item.id === auditId);
    if (!record || !source) return null;
    const before = record.l2.reusePolicy;
    const after = source.before;
    updateL2(l2Id, (l2) => ({ ...l2, reusePolicy: after, updatedAt: now() }));
    const audit: ContentReuseAudit = { id: `reuse_${randomUUID()}`, l2Id, actor, action: "rollback", before, after, createdAt: now() };
    reuseAudits.set(l2Id, [...(reuseAudits.get(l2Id) ?? []), audit]);
    return audit;
  }

  function metrics() {
    const totalsByL1 = new Map<string, { l1Name: string; scenes: string[]; exposures: number; starts: number; completes: number; rerolls: number; replays: number; switches: number; toolOpens: number }>();
    const l1ByL2 = new Map<string, L1Game>();
    for (const record of records.values()) {
      l1ByL2.set(record.l2.id, record.l1);
      if (!totalsByL1.has(record.l1.id)) {
        totalsByL1.set(record.l1.id, {
          l1Name: record.l1.name,
          scenes: record.l1.scenes,
          exposures: 0,
          starts: 0,
          completes: 0,
          rerolls: 0,
          replays: 0,
          switches: 0,
          toolOpens: 0
        });
      }
    }
    for (const [key, item] of exposure.entries()) {
      const separator = key.lastIndexOf(":");
      const l1 = l1ByL2.get(key.slice(separator + 1));
      if (!l1) continue;
      const totals = totalsByL1.get(l1.id)!;
      totals.exposures += item.exposures;
      totals.starts += item.starts;
      totals.completes += item.completes;
      totals.rerolls += item.rerolls;
      totals.replays += item.replays;
      totals.switches += item.switches;
      totals.toolOpens += item.toolOpens;
    }
    return [...totalsByL1.entries()].map(([l1Id, totals]) => ({
      l1Id,
      ...totals,
      completionRate: totals.starts ? totals.completes / totals.starts : 0,
      startRate: totals.exposures ? totals.starts / totals.exposures : 0
    } satisfies ContentMetric));
  }

  function analytics(window: "all" | "7d" | "30d" = "all") {
    const cutoff = window === "all" ? 0 : Date.now() - (window === "7d" ? 7 : 30) * 86_400_000;
    const emptyCounter = (): AnalyticsCounter => ({
      exposures: 0,
      starts: 0,
      completes: 0,
      rerolls: 0,
      replays: 0,
      switches: 0,
      toolOpens: 0,
      abandons: 0,
      actors: new Set<string>(),
      toolOpensByTool: new Map<string, number>()
    });
    const counters = new Map<string, AnalyticsCounter>();
    for (const record of records.values()) counters.set(record.l2.id, emptyCounter());

    for (const event of analyticsEvents) {
      if (event.occurredAt < cutoff) continue;
      const counter = counters.get(event.l2Id);
      if (!counter) continue;
      counter.actors.add(event.actorKey);
      if (event.eventName === "exposed") counter.exposures += 1;
      if (event.eventName === "started") counter.starts += 1;
      if (event.eventName === "completed") counter.completes += 1;
      if (event.eventName === "rerolled") counter.rerolls += 1;
      if (event.eventName === "abandoned") counter.abandons += 1;
      if (event.eventName === "tool_opened") {
        counter.toolOpens += 1;
        if (event.toolId) counter.toolOpensByTool.set(event.toolId, (counter.toolOpensByTool.get(event.toolId) ?? 0) + 1);
      }
      if (event.action === "replay_same_l1") counter.replays += 1;
      if (event.action === "switch_l1") counter.switches += 1;
    }

    const favoriteActorsByL1 = new Map<string, Set<string>>();
    for (const [actorKey, l1Ids] of favorites) {
      for (const l1Id of l1Ids) {
        const actors = favoriteActorsByL1.get(l1Id) ?? new Set<string>();
        actors.add(actorKey);
        favoriteActorsByL1.set(l1Id, actors);
      }
    }
    const cardMetrics = [...records.values()].map((record) => {
      const totals = counters.get(record.l2.id) ?? emptyCounter();
      const favoriteActors = favoriteActorsByL1.get(record.l1.id)?.size ?? 0;
      const heatScore = Math.max(0, Math.round(
        totals.exposures * 0.5 +
        totals.starts * 1.5 +
        totals.completes * 2 +
        favoriteActors * 3 +
        totals.actors.size -
        totals.rerolls * 0.5
      ));
      return {
        l1Id: record.l1.id,
        l1Name: record.l1.name,
        l2Id: record.l2.id,
        l2Title: record.l2.title,
        scenes: record.l1.scenes,
        status: record.l2.status,
        exposures: totals.exposures,
        starts: totals.starts,
        completes: totals.completes,
        rerolls: totals.rerolls,
        replays: totals.replays,
        switches: totals.switches,
        toolOpens: totals.toolOpens,
        abandons: totals.abandons,
        activeActors: totals.actors.size,
        favoriteActors,
        heatScore,
        completionRate: totals.starts ? totals.completes / totals.starts : 0,
        startRate: totals.exposures ? totals.starts / totals.exposures : 0,
        skipRate: totals.exposures ? totals.rerolls / totals.exposures : 0
      };
    }).sort((left, right) => (right.heatScore - left.heatScore) || (right.completes - left.completes) || right.l2Title.localeCompare(left.l2Title));

    type DimensionTotal = { exposures: number; starts: number; completes: number; rerolls: number; toolOpens: number; activeActors: number };
    const emptyDimension = (): DimensionTotal => ({ exposures: 0, starts: 0, completes: 0, rerolls: 0, toolOpens: 0, activeActors: 0 });
    const addCardMetric = (target: DimensionTotal, source: typeof cardMetrics[number]) => {
      target.exposures += source.exposures;
      target.starts += source.starts;
      target.completes += source.completes;
      target.rerolls += source.rerolls;
      target.toolOpens += source.toolOpens;
      target.activeActors += source.activeActors;
    };
    const sceneTotals = new Map<string, DimensionTotal>();
    for (const metric of cardMetrics) {
      if (!metric.exposures && !metric.starts && !metric.completes && !metric.rerolls && !metric.toolOpens) continue;
      for (const scene of metric.scenes.length ? metric.scenes : ["未标注"]) {
        const totals = sceneTotals.get(scene) ?? emptyDimension();
        sceneTotals.set(scene, totals);
        addCardMetric(totals, metric);
      }
    }
    const toDimension = (key: string, totals: DimensionTotal) => ({
      key,
      label: key,
      ...totals,
      completionRate: totals.starts ? totals.completes / totals.starts : 0,
      startRate: totals.exposures ? totals.starts / totals.exposures : 0,
      skipRate: totals.exposures ? totals.rerolls / totals.exposures : 0
    });
    const sceneMetrics = [...sceneTotals.entries()]
      .map(([key, totals]) => toDimension(key, totals))
      .sort((left, right) => right.exposures - left.exposures);

    const actorTotals = new Map<string, { exposures: number; starts: number; completes: number; rerolls: number }>();
    for (const event of analyticsEvents) {
      if (event.occurredAt < cutoff) continue;
      const totals = actorTotals.get(event.actorKey) ?? { exposures: 0, starts: 0, completes: 0, rerolls: 0 };
      if (event.eventName === "exposed") totals.exposures += 1;
      if (event.eventName === "started") totals.starts += 1;
      if (event.eventName === "completed") totals.completes += 1;
      if (event.eventName === "rerolled") totals.rerolls += 1;
      actorTotals.set(event.actorKey, totals);
    }
    const segment = (key: "new" | "returning" | "favorited", label: string, predicate: (actorKey: string) => boolean) => {
      const totals = { actors: 0, exposures: 0, starts: 0, completes: 0, rerolls: 0 };
      for (const [actorKey, item] of actorTotals) {
        if (!predicate(actorKey)) continue;
        totals.actors += 1;
        totals.exposures += item.exposures;
        totals.starts += item.starts;
        totals.completes += item.completes;
        totals.rerolls += item.rerolls;
      }
      return {
        key,
        label,
        ...totals,
        completionRate: totals.starts ? totals.completes / totals.starts : 0,
        startRate: totals.exposures ? totals.starts / totals.exposures : 0
      };
    };
    const uniqueActors = new Set(actorTotals.keys());
    const favoriteActors = new Set([...favorites.entries()].filter(([, items]) => items.size > 0).map(([actorKey]) => actorKey));
    const userSegments = [
      segment("new", "新用户", (actorKey) => (recommendationRounds.get(actorKey) ?? 0) <= 1),
      segment("returning", "回访用户", (actorKey) => (recommendationRounds.get(actorKey) ?? 0) > 1),
      segment("favorited", "收藏用户", (actorKey) => favoriteActors.has(actorKey))
    ];

    const toolTotals = new Map<string, { opens: number; associatedExposures: number }>();
    for (const record of records.values()) {
      const totals = counters.get(record.l2.id) ?? emptyCounter();
      for (const toolId of record.version.toolIds) {
        const tool = toolTotals.get(toolId) ?? { opens: 0, associatedExposures: 0 };
        tool.opens += totals.toolOpensByTool.get(toolId) ?? 0;
        tool.associatedExposures += totals.exposures;
        toolTotals.set(toolId, tool);
      }
    }
    const toolMetrics = defaultTools.map((tool) => {
      const totals = toolTotals.get(tool.code) ?? { opens: 0, associatedExposures: 0 };
      return {
        toolId: tool.code,
        toolName: tool.name,
        ...totals,
        openRate: totals.associatedExposures ? totals.opens / totals.associatedExposures : 0
      };
    });
    const funnel = cardMetrics.reduce((sum, item) => ({
      exposures: sum.exposures + item.exposures,
      starts: sum.starts + item.starts,
      completes: sum.completes + item.completes,
      rerolls: sum.rerolls + item.rerolls,
      toolOpens: sum.toolOpens + item.toolOpens,
      abandons: sum.abandons + item.abandons
    }), { exposures: 0, starts: 0, completes: 0, rerolls: 0, toolOpens: 0, abandons: 0 });
    return {
      generatedAt: now(),
      window,
      cardMetrics,
      userSummary: {
        activeActors: uniqueActors.size,
        returningActors: userSegments.find((item) => item.key === "returning")?.actors ?? 0,
        favoriteActors: favoriteActors.size,
        newActors: userSegments.find((item) => item.key === "new")?.actors ?? 0
      },
      funnel,
      sceneMetrics,
      userSegments,
      toolMetrics
    } satisfies ContentAnalytics;
  }

  function setFavorite(actorKey: string, l1Id: string, favorite: boolean) {
    pruneRuntimeState();
    touchActor(actorKey);
    const record = [...records.values()].find((item) => item.l1.id === l1Id);
    if (!record) return false;
    const set = actorFavorites(actorKey);
    const canonicalL1 = l1s.get(l1Id) ?? record.l1;
    if (favorite && !set.has(l1Id)) {
      set.add(l1Id);
      canonicalL1.favoriteCount += 1;
      for (const item of records.values()) if (item.l1.id === l1Id) item.l1.favoriteCount = canonicalL1.favoriteCount;
    } else if (!favorite && set.has(l1Id)) {
      set.delete(l1Id);
      canonicalL1.favoriteCount = Math.max(0, canonicalL1.favoriteCount - 1);
      for (const item of records.values()) if (item.l1.id === l1Id) item.l1.favoriteCount = canonicalL1.favoriteCount;
    }
    return true;
  }

  for (const seed of curatedDraftSeeds) {
    const l1 = createL1(seed.l1) ?? [...l1s.values()].find((item) => item.name === seed.l1.name || item.code === seed.l1.code);
    if (!l1) continue;
    const l2 = createL2({ ...seed.l2, l1Id: l1.id });
    if (!l2) continue;
    const record = records.get(l2.id);
    if (!record) continue;
    updateDraftVersion(record.version.id, seed.version);
    updateL2(l2.id, (current) => ({ ...current }));
  }

  return {
    next,
    featured,
    startSession,
    completeSession,
    ingestEvents,
    listContent,
    listL1,
    createL1,
    updateL1,
    createL2,
    updateDraftL2,
    createVersion,
    submitVersion,
    updateDraftVersion,
    reviewVersion,
    publishVersion,
    submitL2,
    reviewL2,
    publishL2,
    metrics,
    analytics,
    setFavorite,
    updateReusePolicy,
    listReuseAudits,
    rollbackReusePolicy,
    overview: () => {
      const items = [...records.values()];
      return {
        generatedAt: now(),
        l0s: l0Definitions,
        counts: {
          l0: l0Definitions.length,
          l1: l1s.size,
          l2: items.length,
          published: new Set(items.filter((item) => item.l1.lifecycle === "published").map((item) => item.l1.id)).size,
          pendingReview: items.filter((item) => item.version.reviewStatus === "pending_review" || item.l2.status === "pending_review").length
        },
        metrics: metrics(),
        tools: defaultTools
      } satisfies ContentOverview;
    }
  } satisfies ContentRepository;
}
