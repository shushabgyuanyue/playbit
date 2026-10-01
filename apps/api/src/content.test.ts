import { strict as assert } from "node:assert";
import { dailyCards } from "@playbit/cards";
import { createPlaybitApp, createRepositories } from "./app.js";
import { curatedDraftSeeds } from "./contentSeeds.js";

const app = createPlaybitApp(createRepositories(null));

async function json<T>(path: string, init?: RequestInit) {
  const response = await app.request(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers }
  });
  assert.ok(response.ok, `${path}: ${response.status}`);
  return response.json() as Promise<T>;
}

type StudioContentPage = { items: Array<{ l1: { id: string; favoriteCount: number } }>; total: number; pageSize: number };

async function allStudioItems() {
  const first = await json<StudioContentPage>("/studio/content?page=1&pageSize=10");
  const pageCount = Math.ceil(first.total / first.pageSize);
  const rest = await Promise.all(Array.from({ length: Math.max(0, pageCount - 1) }, (_, index) =>
    json<StudioContentPage>(`/studio/content?page=${index + 2}&pageSize=10`)
  ));
  return [first, ...rest].flatMap((page) => page.items);
}

const next = await json<{ card: { id: string; deliveryId: string; l1Id: string; l2Id: string } }>(
  `/content/cards/next?actorKey=actor-test&previousIds=${encodeURIComponent(JSON.stringify([]))}`
);
assert.ok(next.card.deliveryId);
assert.ok(next.card.l1Id);
assert.ok(next.card.l2Id);
const startedSession = await json<{ sessionId: string; card: { id: string; l1Id: string } }>("/content/play-sessions", {
  method: "POST",
  body: JSON.stringify({ actorKey: "actor-test", cardId: next.card.id })
});
assert.equal(startedSession.card.id, next.card.id);
assert.equal(startedSession.card.l1Id, next.card.l1Id);
assert.notEqual(startedSession.sessionId, next.card.deliveryId);
assert.equal((await app.request("/content/play-sessions", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ actorKey: "actor-test", cardId: "missing-card" })
})).status, 404);
const favorite = await json<{ ok: boolean }>("/content/preferences", {
  method: "POST",
  body: JSON.stringify({ actorKey: "actor-test", l1Id: next.card.l1Id, isFavorite: true })
});
assert.equal(favorite.ok, true);
const favoriteItems = await allStudioItems();
const favoriteRecords = favoriteItems.filter((item) => item.l1.id === next.card.l1Id);
assert.ok(favoriteRecords.length >= 1);
assert.equal(new Set(favoriteRecords.map((item) => item.l1.favoriteCount)).size, 1);
assert.equal(favoriteRecords[0].l1.favoriteCount, 1);
const unfavorite = await json<{ ok: boolean }>("/content/preferences", {
  method: "POST",
  body: JSON.stringify({ actorKey: "actor-test", l1Id: next.card.l1Id, isFavorite: false })
});
assert.equal(unfavorite.ok, true);
const unfavoriteItems = await allStudioItems();
assert.equal(new Set(unfavoriteItems.filter((item) => item.l1.id === next.card.l1Id).map((item) => item.l1.favoriteCount)).size, 1);
assert.equal(unfavoriteItems.find((item) => item.l1.id === next.card.l1Id)?.l1.favoriteCount, 0);

const event = {
  clientEventId: "client-event-1",
  actorKey: "actor-test",
  sessionId: next.card.deliveryId,
  cardId: next.card.id,
  eventName: "started",
  occurredAt: new Date().toISOString()
};
const firstEvents = await json<{ accepted: number }>("/content/events", { method: "POST", body: JSON.stringify({ events: [event, event] }) });
assert.equal(firstEvents.accepted, 1);
const secondEvents = await json<{ accepted: number }>("/content/events", { method: "POST", body: JSON.stringify({ events: [event] }) });
assert.equal(secondEvents.accepted, 0);
const scopedEvent = { ...event, clientEventId: "scoped-event-1", sessionId: "route-session" };
assert.equal((await app.request("/content/play-sessions/other-session/events", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ events: [scopedEvent] })
})).status, 422);
assert.equal((await json<{ accepted: number }>("/content/play-sessions/route-session/events", {
  method: "POST",
  body: JSON.stringify({ events: [scopedEvent] })
})).accepted, 1);
const sameClientIdFromAnotherActor = await json<{ accepted: number }>("/content/events", {
  method: "POST",
  body: JSON.stringify({ events: [{ ...event, actorKey: "another-actor" }] })
});
assert.equal(sameClientIdFromAnotherActor.accepted, 1);

const completedEvent = { ...event, clientEventId: "client-event-2", eventName: "completed" };
const completed = await json<{ accepted: number }>("/content/events", { method: "POST", body: JSON.stringify({ events: [completedEvent] }) });
assert.equal(completed.accepted, 1);
const completionCard = await json<{ card: { id: string } }>("/content/cards/next?actorKey=session-actor");
const completionSession = await json<{ sessionId: string }>("/content/play-sessions", {
  method: "POST",
  body: JSON.stringify({ actorKey: "session-actor", cardId: completionCard.card.id })
});
const completion = await json<{ accepted: number }>(`/content/play-sessions/${completionSession.sessionId}/complete`, {
  method: "POST",
  body: JSON.stringify({ actorKey: "session-actor", cardId: completionCard.card.id, payload: { kind: "completed" } })
});
assert.equal(completion.accepted, 1);
const duplicateCompletion = await json<{ accepted: number }>(`/content/play-sessions/${completionSession.sessionId}/complete`, {
  method: "POST",
  body: JSON.stringify({ actorKey: "session-actor", cardId: completionCard.card.id })
});
assert.equal(duplicateCompletion.accepted, 0);
assert.equal((await app.request(`/content/play-sessions/${completionSession.sessionId}/complete`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ actorKey: "other-actor", cardId: completionCard.card.id })
})).status, 404);
const afterCompletion = await json<{ card: { id: string; l1Id: string } }>(
  `/content/cards/next?actorKey=actor-test&previousIds=${encodeURIComponent(JSON.stringify([]))}`
);
assert.notEqual(afterCompletion.card.id, next.card.id);
assert.notEqual(afterCompletion.card.l1Id, next.card.l1Id);

const overview = await json<{ counts: { l1: number; l2: number }; metrics: Array<{ starts: number; l1Id: string }> }>("/studio/overview");
assert.equal(overview.counts.l1, new Set([
  ...dailyCards.map((card) => card.id.startsWith("turtle-soup-") ? "海龟汤" : card.name),
  ...curatedDraftSeeds.map((seed) => seed.l1.name)
]).size);
assert.equal(overview.counts.l2, dailyCards.length + curatedDraftSeeds.length);
assert.equal(new Set(overview.metrics.map((metric) => metric.l1Id)).size, overview.counts.l1);
assert.ok(overview.metrics.some((metric) => metric.starts > 0));
const analytics = await json<{
  window: string;
  cardMetrics: Array<{ heatScore: number; favoriteActors: number; abandons: number }>;
  sceneMetrics: Array<{ label: string }>;
  userSegments: Array<{ key: string }>;
  toolMetrics: Array<{ toolId: string }>;
  funnel: { exposures: number; starts: number; completes: number; abandons: number };
}>("/studio/analytics/content?window=7d");
assert.equal(analytics.window, "7d");
assert.ok(analytics.cardMetrics.some((metric) => metric.heatScore >= 0 && metric.favoriteActors >= 0 && metric.abandons >= 0));
assert.ok(Array.isArray(analytics.sceneMetrics));
assert.ok(analytics.userSegments.some((segment) => segment.key === "new"));
assert.ok(analytics.toolMetrics.some((metric) => metric.toolId === "timer"));
assert.ok(analytics.funnel.exposures >= analytics.funnel.starts);

const content = await json<{ items: Array<{ l1: { id: string; name: string; l0Ids: string[] }; version: { id: string; reviewStatus: string }; l2: { status: string; payload: { source?: string } } }> }>("/studio/content");
const wrongAnswers = content.items.find((item) => item.l1.name === "只许答错");
assert.equal(wrongAnswers?.l1.l0Ids[0], "l0-constraint");
const imported = content.items.filter((item) => item.l2.payload.source === "playbit_cards_rating_curated_v4.xlsx / 游戏卡评分");
assert.equal(imported.length, curatedDraftSeeds.length);
assert.ok(imported.every((item) => item.l2.status === "draft"));
const first = content.items[0];
const created = await json<{ version: { id: string; reviewStatus: string } }>(`/studio/l1/${first.l1.id}/versions`, {
  method: "POST",
  body: JSON.stringify({ changeNote: "测试版本" })
});
assert.equal(created.version.reviewStatus, "draft");
const updated = await json<{ version: { displayHook: string; reviewStatus: string } }>(`/studio/versions/${created.version.id}`, {
  method: "PATCH",
  body: JSON.stringify({ displayHook: "可编辑的草稿 Hook", changeNote: "测试编辑" })
});
assert.equal(updated.version.displayHook, "可编辑的草稿 Hook");
assert.equal(updated.version.reviewStatus, "draft");
const submitted = await json<{ version: { id: string; reviewStatus: string } }>(`/studio/versions/${created.version.id}/submit`, { method: "POST" });
assert.equal(submitted.version.reviewStatus, "pending_review");
const reviewed = await json<{ version: { id: string; reviewStatus: string } }>(`/studio/versions/${created.version.id}/review`, {
  method: "POST",
  body: JSON.stringify({ decision: "approve" })
});
assert.equal(reviewed.version.reviewStatus, "approved");
const published = await json<{ version: { reviewStatus: string; publishedAt: string | null } }>(`/studio/versions/${created.version.id}/publish`, { method: "POST" });
assert.equal(published.version.reviewStatus, "published");
assert.ok(published.version.publishedAt);

const importedTemplate = await json<{ createdL1: number; createdCards: number; errors: Array<{ index: number }> }>("/studio/import", {
  method: "POST",
  body: JSON.stringify({
    rows: [
      {
        code: "import_template_word",
        name: "导入模板玩法",
        title: "导入一张卡",
        l0Ids: ["l0-constraint"],
        scenes: ["双人对局"],
        tags: ["模板"],
        minPlayers: 2,
        maxPlayers: 2,
        durationMin: 3,
        durationMax: 5,
        outcomeModel: "shared_completion",
        toolIds: ["timer"],
        contentType: "prompt",
        hook: "越认真，越容易接错。",
        rule: "轮流接住上一句，但不能重复关键词。",
        completionCondition: "连续完成三轮。",
        failureCondition: "重复关键词或停顿超过三秒。",
        changeNote: "来自 Agent 模板",
        payload: { content: "模板题面", mode: "together", category: "challenge", tone: "blue" }
      },
      { code: "", name: "无效行", minPlayers: 2, l0Ids: [] }
    ]
  })
});
assert.equal(importedTemplate.createdL1, 1);
assert.equal(importedTemplate.createdCards, 1);
assert.equal(importedTemplate.errors.length, 1);
const importedTemplateItems = await json<{ items: Array<{ l1: { code: string; scenes: string[]; tags: string[] }; version: { displayHook: string; shortRule: string; completionCondition: string; failureCondition: string | null; toolIds: string[]; changeNote: string | null }; l2: { title: string; payload: { content: string } } }> }>("/studio/content?search=import_template_word");
assert.equal(importedTemplateItems.items.length, 1);
assert.equal(importedTemplateItems.items[0].l1.code, "import_template_word");
assert.equal(importedTemplateItems.items[0].version.displayHook, "越认真，越容易接错。");
assert.equal(importedTemplateItems.items[0].version.shortRule, "轮流接住上一句，但不能重复关键词。");
assert.equal(importedTemplateItems.items[0].version.completionCondition, "连续完成三轮。");
assert.equal(importedTemplateItems.items[0].version.failureCondition, "重复关键词或停顿超过三秒。");
assert.deepEqual(importedTemplateItems.items[0].version.toolIds, ["timer"]);
assert.equal(importedTemplateItems.items[0].l2.payload.content, "模板题面");
const exportedTemplate = await app.request("/studio/content/export?search=import_template_word");
assert.equal(exportedTemplate.status, 200);
const exportedTemplateBytes = new Uint8Array(await exportedTemplate.arrayBuffer());
assert.deepEqual([...exportedTemplateBytes.slice(0, 3)], [0xef, 0xbb, 0xbf]);
const exportedTemplateText = new TextDecoder().decode(exportedTemplateBytes);
assert.ok(exportedTemplateText.includes("import_template_word"));
assert.ok(exportedTemplateText.includes("越认真，越容易接错。"));

const rawSampleImport = await json<{ createdL1: number; createdCards: number; errors: Array<{ index: number }> }>("/studio/import", {
  method: "POST",
  body: JSON.stringify({
    rows: [{
      sample_id: "S_TEST_RAW",
      sample_name: "原始样本导入",
      original_rule: "两人轮流做出动作，另一人判断并回应。",
      l0_primary: "L0-09",
      scene_tags: "双人碎片|现实环境",
      player_count: "2",
      source_type: "民间游戏",
      source_region: "中国",
      evidence_level: "USER_PROVIDED",
      editorial_priority: "HIGH",
      editorial_comment: "保留原始样本，后续再做 Playbit 化。"
    }]
  })
});
assert.equal(rawSampleImport.createdL1, 1);
assert.equal(rawSampleImport.createdCards, 0);
assert.equal(rawSampleImport.errors.length, 0);
const rawSampleL1 = await json<{ items: Array<{ l1: { code: string; l0Ids: string[]; scenes: string[]; research?: { sourceType?: string; editorialPriority?: string } }; version: { shortRule: string } | null }> }>("/studio/l1?search=S_TEST_RAW&withoutL2=true");
assert.equal(rawSampleL1.items[0]?.l1.code, "S_TEST_RAW");
assert.deepEqual(rawSampleL1.items[0]?.l1.l0Ids, ["l0-sensory-action"]);
assert.equal(rawSampleL1.items[0]?.l1.research?.sourceType, "民间游戏");
assert.equal(rawSampleL1.items[0]?.l1.research?.editorialPriority, "HIGH");

console.log("Content system passed: delivery, event idempotency, metrics, review and publish.");

const createdL1 = await json<{ l1: { id: string; lifecycle: string } }>("/studio/l1", {
  method: "POST",
  body: JSON.stringify({
    code: "test_reverse_reply",
    name: "反向接话",
    l0Ids: ["l0-constraint"],
    minPlayers: 2,
    maxPlayers: 4,
    durationMin: 3,
    durationMax: 5,
    outcomeModel: "shared_completion",
    tags: ["test"]
  })
});
assert.equal(createdL1.l1.lifecycle, "draft");
const l1Only = await json<{ items: Array<{ l1: { id: string }; version: { id: string } | null; l2Count: number }> }>("/studio/l1?withoutL2=true");
const l1OnlyItem = l1Only.items.find((item) => item.l1.id === createdL1.l1.id);
assert.ok(l1OnlyItem);
assert.equal(l1OnlyItem.version, null);
assert.equal(l1OnlyItem.l2Count, 0);
const createdL2 = await json<{ l2: { id: string; status: string; contentType: string; payload: { content: string } } }>("/studio/l2", {
  method: "POST",
  body: JSON.stringify({
    l1Id: createdL1.l1.id,
    title: "今天只能接反话",
    contentType: "prompt",
    payload: { content: "轮流接一句反话，不能直接重复对方的关键词。", mode: "together", category: "rule", tone: "blue" },
    sourceMode: "human"
  })
});
assert.equal(createdL2.l2.status, "draft");
assert.equal(createdL2.l2.contentType, "prompt");
assert.equal(createdL2.l2.payload.content, "轮流接一句反话，不能直接重复对方的关键词。");
const updatedL2 = await json<{ l2: { title: string; payload: { content: string }; status: string } }>(`/studio/l2/${createdL2.l2.id}`, {
  method: "PATCH",
  body: JSON.stringify({ title: "今天只能接住反话", payload: { content: "轮流接住上一句反话，不能直接重复关键词。", mode: "together", category: "rule", tone: "blue" } })
});
assert.equal(updatedL2.l2.title, "今天只能接住反话");
assert.equal(updatedL2.l2.payload.content, "轮流接住上一句反话，不能直接重复关键词。");
assert.equal(updatedL2.l2.status, "draft");

const newVersion = await json<{ version: { id: string; reviewStatus: string } }>(`/studio/l1/${createdL1.l1.id}/versions`, {
  method: "POST",
  body: JSON.stringify({ shortRule: "轮流接住上一句反话。", completionCondition: "连续完成三轮。", displayHook: "越认真，越容易接错。" })
});
assert.equal(newVersion.version.reviewStatus, "draft");
await json(`/studio/versions/${newVersion.version.id}/submit`, { method: "POST" });
await json(`/studio/versions/${newVersion.version.id}/review`, { method: "POST", body: JSON.stringify({ decision: "approve" }) });
const publishedNewVersion = await json<{ version: { reviewStatus: string } }>(`/studio/versions/${newVersion.version.id}/publish`, { method: "POST" });
assert.equal(publishedNewVersion.version.reviewStatus, "published");
await json(`/studio/l2/${createdL2.l2.id}/submit`, { method: "POST" });
await json(`/studio/l2/${createdL2.l2.id}/review`, { method: "POST", body: JSON.stringify({ decision: "approve" }) });
const publishedNewL2 = await json<{ l2: { status: string } }>(`/studio/l2/${createdL2.l2.id}/publish`, { method: "POST" });
assert.equal(publishedNewL2.l2.status, "published");
const newCard = await json<{ card: { id: string; l1Id: string; content: string } }>(`/content/cards/next?actorKey=new-content-actor&l1Id=${encodeURIComponent(createdL1.l1.id)}`);
assert.equal(newCard.card.l1Id, createdL1.l1.id);
assert.equal(newCard.card.content, "轮流接住上一句反话，不能直接重复关键词。");
const featured = await json<{ cards: Array<{ id: string; name: string; content: string }> }>("/content/cards/featured?limit=12");
assert.ok(featured.cards.some((card) => card.name === "今天只能接住反话"));
assert.equal(featured.cards.find((card) => card.name === "今天只能接住反话")?.content, "轮流接住上一句反话，不能直接重复关键词。");

const policy = await json<{ audit: { id: string } }>(`/studio/l2/${createdL2.l2.id}/reuse-policy`, {
  method: "PATCH",
  body: JSON.stringify({ policy: { cooldownRounds: 12, cooldownDays: 2, permanentExhaustion: false, skipCooldownRounds: 2 }, actor: "qa" })
});
const audits = await json<{ audits: Array<{ id: string }> }>(`/studio/l2/${createdL2.l2.id}/reuse-policy/audits`);
assert.ok(audits.audits.some((audit) => audit.id === policy.audit.id));
const rollback = await json<{ audit: { action: string; after: { cooldownRounds: number } } }>(`/studio/l2/${createdL2.l2.id}/reuse-policy/rollback`, {
  method: "POST",
  body: JSON.stringify({ auditId: policy.audit.id, actor: "qa" })
});
assert.equal(rollback.audit.action, "rollback");
assert.equal(rollback.audit.after.cooldownRounds, 0);

const firstRound = await json<{ card: { l1Id: string } }>("/content/cards/next?actorKey=l1-cooldown-actor");
const secondRound = await json<{ card: { l1Id: string } }>("/content/cards/next?actorKey=l1-cooldown-actor");
assert.notEqual(firstRound.card.l1Id, secondRound.card.l1Id);
const replayRound = await json<{ card: { l1Id: string } }>(`/content/cards/next?actorKey=l1-cooldown-actor&l1Id=${encodeURIComponent(firstRound.card.l1Id)}`);
assert.equal(replayRound.card.l1Id, firstRound.card.l1Id);
console.log("Content authoring passed: L1/L2 creation, independent review, policy audit and L1 cooldown.");

const identity = await json<{ user: { id: string }; token: string }>("/auth/register", {
  method: "POST",
  body: JSON.stringify({ nickname: "主持人", email: "content-host@example.com", password: "password123" })
});
const receiver = await json<{ user: { id: string; nickname: string }; token: string }>("/auth/register", {
  method: "POST",
  body: JSON.stringify({ nickname: "权益领取人", email: "content-receiver@example.com", password: "password123" })
});
const outsider = await json<{ token: string }>("/auth/register", {
  method: "POST",
  body: JSON.stringify({ nickname: "无关用户", email: "content-outsider@example.com", password: "password123" })
});
assert.equal((await app.request("/coupons/independent", {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${identity.token}` },
  body: JSON.stringify({ name: "额度无效", description: "次数必须大于零", claimLimit: 0 })
})).status, 422);
const independent = await json<{ coupon: { id: string; agreementId: string | null; gameResultId: string | null; transferNote: string | null; claimToken: string | null; claimLimit: number; claimedCount: number; remainingClaims: number } }>("/coupons/independent", {
  method: "POST",
  headers: { Authorization: `Bearer ${identity.token}` },
  body: JSON.stringify({ gameResultId: "result_local_1", name: "请喝一杯", description: "请喝一杯", transferNote: null, claimLimit: 2 })
});
assert.equal(independent.coupon.agreementId, null);
assert.equal(independent.coupon.gameResultId, "result_local_1");
assert.equal(independent.coupon.transferNote, null);
assert.ok(independent.coupon.claimToken);
assert.equal(independent.coupon.claimLimit, 2);
assert.equal(independent.coupon.claimedCount, 0);
assert.equal(independent.coupon.remainingClaims, 2);
const publicCoupon = await json<{ coupon: { id: string; issuerNickname: string; remainingClaims: number } }>(`/coupons/share/${independent.coupon.claimToken}`);
assert.equal(publicCoupon.coupon.id, independent.coupon.id);
assert.equal(publicCoupon.coupon.issuerNickname, "主持人");
assert.equal(publicCoupon.coupon.remainingClaims, 2);
const claimed = await json<{ coupon: { id: string; claimId: string | null; parentCouponId: string | null; holderUserId: string | null; holderNickname: string; claimToken: string | null; remainingClaims: number } }>(`/coupons/share/${independent.coupon.claimToken}/claim`, {
  method: "POST",
  headers: { Authorization: `Bearer ${receiver.token}` }
});
assert.equal(claimed.coupon.holderUserId, receiver.user.id);
assert.equal(claimed.coupon.holderNickname, receiver.user.nickname);
assert.equal(claimed.coupon.claimId, claimed.coupon.id);
assert.equal(claimed.coupon.parentCouponId, independent.coupon.id);
assert.equal(claimed.coupon.remainingClaims, 1);
assert.equal(claimed.coupon.claimToken, null);
assert.equal((await app.request(`/coupons/share/${independent.coupon.claimToken}/claim`, {
  method: "POST",
  headers: { Authorization: `Bearer ${receiver.token}` }
})).status, 409, "one account may claim a voucher only once");
const secondClaim = await json<{ coupon: { id: string; remainingClaims: number } }>(`/coupons/share/${independent.coupon.claimToken}/claim`, {
  method: "POST",
  headers: { Authorization: `Bearer ${outsider.token}` }
});
assert.notEqual(secondClaim.coupon.id, claimed.coupon.id);
assert.equal(secondClaim.coupon.remainingClaims, 0);
assert.equal((await app.request(`/coupons/share/${independent.coupon.claimToken}`)).status, 410, "share preview closes when capacity is exhausted");
assert.equal((await json<{ coupons: Array<{ id: string }> }>(`/coupons`, { headers: { Authorization: `Bearer ${receiver.token}` } })).coupons.some(item => item.id === claimed.coupon.id), true);
assert.equal((await app.request(`/coupons/${claimed.coupon.id}/use`, { method: "PATCH", headers: { Authorization: `Bearer ${receiver.token}` } })).status, 200);
assert.equal((await app.request(`/coupons/${secondClaim.coupon.id}/use`, { method: "PATCH", headers: { Authorization: `Bearer ${outsider.token}` } })).status, 200, "each recipient redeems their own claim instance");
assert.equal((await app.request(`/coupons/${independent.coupon.id}`, {
  method: "DELETE",
  headers: { Authorization: `Bearer ${identity.token}` }
})).status, 409);
const deletable = await json<{ coupon: { id: string; claimToken: string; claimLimit: number } }>("/coupons/independent", {
  method: "POST",
  headers: { Authorization: `Bearer ${identity.token}` },
  body: JSON.stringify({ name: "待删除权益", description: "对方领取前可以删除" })
});
assert.equal(deletable.coupon.claimLimit, 1, "claim limit defaults to one");
assert.equal((await app.request(`/coupons/${deletable.coupon.id}`, {
  method: "DELETE",
  headers: { Authorization: `Bearer ${identity.token}` }
})).status, 204);
assert.equal((await app.request(`/coupons/share/${deletable.coupon.claimToken}`)).status, 410);
const boundIndependent = await json<{ coupon: { id: string; transferNote: string | null } }>("/coupons/independent", {
  method: "POST",
  headers: { Authorization: `Bearer ${identity.token}` },
  body: JSON.stringify({ gameResultId: "result_local_2", name: "请喝一杯", description: "请喝一杯", transferNote: "   ", claimLimit: 2 })
});
assert.equal(boundIndependent.coupon.transferNote, null);
const latestIssuerCoupons = await json<{ coupons: Array<{ id: string; claimToken: string | null; name: string }> }>(`/coupons`, { headers: { Authorization: `Bearer ${identity.token}` } });
const boundRecord = latestIssuerCoupons.coupons.find(item => item.id === boundIndependent.coupon.id)!;
assert.ok(boundRecord.claimToken);
const boundClaim = await json<{ coupon: { id: string } }>(`/coupons/share/${boundRecord.claimToken}/claim`, { method: "POST", headers: { Authorization: `Bearer ${receiver.token}` } });
assert.equal((await json<{ coupons: Array<{ id: string }> }>("/coupons", { headers: { Authorization: `Bearer ${receiver.token}` } })).coupons.some(item => item.id === boundClaim.coupon.id), true);
assert.equal((await app.request(`/coupons/${boundIndependent.coupon.id}/use`, { method: "PATCH", headers: { Authorization: `Bearer ${identity.token}` } })).status, 403);
assert.equal((await app.request(`/coupons/${boundClaim.coupon.id}/use`, { method: "PATCH", headers: { Authorization: `Bearer ${outsider.token}` } })).status, 403);
assert.equal((await app.request(`/coupons/${boundClaim.coupon.id}/use`, { method: "PATCH", headers: { Authorization: `Bearer ${receiver.token}` } })).status, 200);
assert.equal((await app.request(`/coupons/${boundClaim.coupon.id}/use`, { method: "PATCH", headers: { Authorization: `Bearer ${receiver.token}` } })).status, 409);
console.log("Independent equity passed: agreement-free issuance contract.");
