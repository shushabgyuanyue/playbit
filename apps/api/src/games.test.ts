import { strict as assert } from "node:assert";
import { randomUUID } from "node:crypto";
import { dailyCards } from "@playbit/cards";
import type { Agreement, Coupon, Flip, User } from "@playbit/shared";
import { createPlaybitApp, createRepositories } from "./app.js";

const repositories = createRepositories(null);
const app = createPlaybitApp(repositories);
async function request(path: string, method = "GET", token?: string, body?: unknown) {
  return app.request(path, { method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
}
async function json<T>(path: string, method = "GET", token?: string, body?: unknown): Promise<T> {
  const response = await request(path, method, token, body);
  assert.ok(response.ok, `${method} ${path}: ${response.status}`);
  return response.json() as Promise<T>;
}
const users = await Promise.all(["host", "friend", "other"].map(name => json<{ user: User; token: string }>("/auth/register", "POST", undefined, {
  email: `${name}@game.example`, password: "password123", nickname: name
})));
const [host, friend, other] = users;
const card = dailyCards.find(item => item.mode === "versus")!;
const together = dailyCards.find(item => item.mode === "together")!;
const input = { requestId: randomUUID(), cardId: card.id, stake: { type: "custom", label: "输了负责给对方拍十张好看的照片", fulfilled: true, additions: [{ label: "forged" }] } };
assert.equal((await request("/games", "POST", undefined, input)).status, 401);
assert.equal((await request("/games", "POST", host.token, { ...input, cardId: together.id })).status, 422);
assert.equal((await request("/games", "POST", host.token, { ...input, stake: { type: "point", label: "100" } })).status, 422);
assert.equal((await request("/games", "POST", host.token, { ...input, stake: { type: "custom", label: "  " } })).status, 422);

const duplicates = await Promise.all([json<{ agreement: Agreement }>("/games", "POST", host.token, input), json<{ agreement: Agreement }>("/games", "POST", host.token, input)]);
const game = duplicates[0].agreement;
assert.equal(game.id, duplicates[1].agreement.id);
assert.equal(game.shareCode, duplicates[1].agreement.shareCode);
assert.equal(game.status, "pending_confirmation");
assert.equal(game.source, "card");
assert.equal(game.stake.type, "coupon");
assert.equal(game.stake.fulfilled, false);
assert.deepEqual(game.stake.additions, []);
assert.deepEqual(game.gameCard, card);
assert.equal(game.participants[0].signatureDataUrl, null);
assert.equal((await json<{ user: User }>("/auth/me", "GET", host.token)).user.signatureDataUrl, null);
assert.equal((await request("/games", "POST", host.token, { ...input, stake: { type: "coupon", label: "changed" } })).status, 409);
assert.equal((await json<{ agreements: Agreement[] }>("/agreements", "GET", host.token)).agreements.length, 1);
assert.equal((await request(`/share/${game.shareCode}`)).status, 200);
assert.equal((await request(`/games/${game.shareCode}/join`, "POST", undefined, { revision: 1 })).status, 401);
assert.equal((await request(`/games/${game.shareCode}/join`, "POST", host.token, { revision: 1 })).status, 409);
assert.equal((await request(`/games/${game.shareCode}/join`, "POST", friend.token, { revision: 2 })).status, 409);
assert.equal((await request(`/agreements/${game.id}/result`, "PATCH", host.token, { winnerId: game.participants[0].id })).status, 409);
assert.equal((await request(`/share/${game.shareCode}/sign`, "POST", friend.token, { signatureDataUrl: "fake" })).status, 409);

const joins = await Promise.all([friend, other].map(person => request(`/games/${game.shareCode}/join`, "POST", person.token, { revision: game.revision })));
assert.deepEqual(joins.map(item => item.status).sort(), [200, 409]);
const joinedIndex = joins.findIndex(response => response.ok);
const joinedUser = [friend, other][joinedIndex];
const excludedUser = [friend, other][1 - joinedIndex];
const active = (await joins[joinedIndex].json() as { agreement: Agreement }).agreement;
assert.equal(active.status, "active");
assert.equal(active.participants.length, 2);
assert.ok(active.participants.every(person => person.signatureDataUrl === null && person.confirmed));
assert.equal((await request(`/games/${game.shareCode}/join`, "POST", joinedUser.token, { revision: 1 })).status, 200);
assert.equal((await request(`/share/${game.shareCode}`)).status, 403);
assert.equal((await request(`/share/${game.shareCode}`, "GET", excludedUser.token)).status, 403);
assert.equal((await json<{ agreements: Agreement[] }>("/agreements", "GET", joinedUser.token)).agreements[0].id, game.id);
const hostParticipant = active.participants.find(person => person.userId === host.user.id)!;
assert.equal((await request(`/agreements/${game.id}/result`, "PATCH", excludedUser.token, { winnerId: hostParticipant.id })).status, 403);
const results = await Promise.all([host, joinedUser].map(person => request(`/agreements/${game.id}/result`, "PATCH", person.token, { winnerId: hostParticipant.id })));
assert.deepEqual(results.map(response => response.status).sort(), [200, 409]);
const holderCoupons = (await json<{ coupons: Coupon[] }>("/coupons", "GET", host.token)).coupons;
assert.equal(holderCoupons.length, 1);
const coupon = holderCoupons[0];
assert.equal(coupon.holderUserId, host.user.id);
assert.equal(coupon.issuerUserId, joinedUser.user.id);
assert.equal(coupon.name, input.stake.label);
assert.equal((await json<{ coupons: Coupon[] }>("/coupons", "GET", joinedUser.token)).coupons[0].id, coupon.id);

const flip = (await json<{ flip: Flip }>(`/agreements/${game.id}/flips`, "POST", joinedUser.token, { couponId: coupon.id })).flip;
assert.equal((await request(`/coupons/${coupon.id}/use`, "PATCH", host.token)).status, 409);
assert.equal((await request(`/agreements/${game.id}/flips`, "POST", joinedUser.token, { couponId: coupon.id })).status, 409);
await json(`/flips/${flip.id}/response`, "PATCH", host.token, { accept: true });
const lost = await json<{ flip: Flip; issuedCoupon: Coupon }>(`/flips/${flip.id}/result`, "PATCH", joinedUser.token, { winnerUserId: host.user.id });
assert.equal(lost.flip.outcome, "applicant_lost");
assert.equal(lost.issuedCoupon.name, coupon.name);
assert.notEqual(lost.issuedCoupon.id, coupon.id);
assert.equal((await json<{ coupons: Coupon[] }>("/coupons", "GET", host.token)).coupons.length, 2);
await json(`/coupons/${coupon.id}/use`, "PATCH", host.token);
const bonusFlip = (await json<{ flip: Flip }>(`/agreements/${game.id}/flips`, "POST", joinedUser.token, { couponId: lost.issuedCoupon.id })).flip;
await json(`/flips/${bonusFlip.id}/response`, "PATCH", host.token, { accept: true });
const won = await json<{ flip: Flip; coupon: Coupon; agreement: Agreement }>(`/flips/${bonusFlip.id}/result`, "PATCH", host.token, { winnerUserId: joinedUser.user.id });
assert.equal(won.flip.outcome, "applicant_won");
assert.equal(won.coupon.status, "waived");
assert.equal(won.agreement.status, "fulfilled");
assert.equal((await json<{ coupons: Coupon[] }>("/coupons", "GET", host.token)).coupons.find(item => item.id === coupon.id)?.status, "used");
console.log("Game loop passed: guest preview, authenticated confirmation, idempotent creation, concurrent join/result, custom equity, redemption, flip loss/bonus/win.");
