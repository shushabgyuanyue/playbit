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
const favoriteItems = await json<{ items: Array<{ l1: { id: string; favoriteCount: number } }> }>("/studio/content");
const favoriteRecords = favoriteItems.items.filter((item) => item.l1.id === next.card.l1Id);
assert.ok(favoriteRecords.length >= 1);
assert.equal(new Set(favoriteRecords.map((item) => item.l1.favoriteCount)).size, 1);
assert.equal(favoriteRecords[0].l1.favoriteCount, 1);
const unfavorite = await json<{ ok: boolean }>("/content/preferences", {
  method: "POST",
  body: JSON.stringify({ actorKey: "actor-test", l1Id: next.card.l1Id, isFavorite: false })
});
assert.equal(unfavorite.ok, true);
const unfavoriteItems = await json<{ items: Array<{ l1: { id: string; favoriteCount: number } }> }>("/studio/content");
assert.equal(new Set(unfavoriteItems.items.filter((item) => item.l1.id === next.card.l1Id).map((item) => item.l1.favoriteCount)).size, 1);
assert.equal(unfavoriteItems.items.find((item) => item.l1.id === next.card.l1Id)?.l1.favoriteCount, 0);

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
  body: JSON.stringify({ gameResultId: "result_invalid_holder", name: "无效绑定", description: "不能绑定不存在的账号", holderUserId: "user_missing", holderNickname: "不存在" })
})).status, 422);
const independent = await json<{ coupon: { agreementId: string | null; gameResultId: string | null; transferNote: string | null } }>("/coupons/independent", {
  method: "POST",
  headers: { Authorization: `Bearer ${identity.token}` },
  body: JSON.stringify({ gameResultId: "result_local_1", name: "请喝一杯", description: "现场结算权益", transferNote: null, holderNickname: "现场朋友" })
});
assert.equal(independent.coupon.agreementId, null);
assert.equal(independent.coupon.gameResultId, "result_local_1");
assert.equal(independent.coupon.transferNote, null);
const boundIndependent = await json<{ coupon: { id: string; transferNote: string | null } }>("/coupons/independent", {
  method: "POST",
  headers: { Authorization: `Bearer ${identity.token}` },
  body: JSON.stringify({ gameResultId: "result_local_2", name: "请喝一杯", description: "绑定到账号的权益", transferNote: "   ", holderUserId: receiver.user.id, holderNickname: receiver.user.nickname })
});
assert.equal(boundIndependent.coupon.transferNote, null);
assert.equal((await json<{ coupons: Array<{ id: string }> }>("/coupons", { headers: { Authorization: `Bearer ${receiver.token}` } })).coupons.some(item => item.id === boundIndependent.coupon.id), true);
assert.equal((await app.request(`/coupons/${boundIndependent.coupon.id}/use`, { method: "PATCH", headers: { Authorization: `Bearer ${identity.token}` } })).status, 403);
assert.equal((await app.request(`/coupons/${boundIndependent.coupon.id}/use`, { method: "PATCH", headers: { Authorization: `Bearer ${outsider.token}` } })).status, 403);
assert.equal((await app.request(`/coupons/${boundIndependent.coupon.id}/use`, { method: "PATCH", headers: { Authorization: `Bearer ${receiver.token}` } })).status, 200);
assert.equal((await app.request(`/coupons/${boundIndependent.coupon.id}/use`, { method: "PATCH", headers: { Authorization: `Bearer ${receiver.token}` } })).status, 409);
console.log("Independent equity passed: agreement-free issuance contract.");
