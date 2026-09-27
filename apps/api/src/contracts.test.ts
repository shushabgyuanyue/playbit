import { strict as assert } from "node:assert";
import { randomUUID } from "node:crypto";
import type { Agreement, Coupon, User } from "@playbit/shared";
import { createPlaybitApp, createRepositories } from "./app.js";

const repositories = createRepositories(null);
const app = createPlaybitApp(repositories);
function request(path: string, method: string, token?: string, payload?: unknown) {
  return app.request(path, { method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: payload === undefined ? undefined : JSON.stringify(payload) });
}
async function json<T>(path: string, method: string, token?: string, payload?: unknown): Promise<T> {
  const response = await request(path, method, token, payload);
  assert.ok(response.ok, `${path}: ${response.status} ${await response.clone().text()}`);
  return response.json() as Promise<T>;
}
async function register(name: string) {
  return json<{ user: User; token: string }>("/auth/register", "POST", undefined,
    { nickname: name, email: `${name}@example.com`, password: "password123" });
}
const [owner, visitor, outsider] = await Promise.all([register("owner"), register("visitor"), register("outsider")]);
const input = { requestId: randomUUID(), source: "custom", title: "A small promise", challenge: "First to laugh buys tea",
  creatorSignatureDataUrl: "data:image/png;base64,owner", stake: { type: "coupon", label: "x".repeat(80), fulfilled: false, additions: [] } };

const creates = await Promise.all([1, 2].map(() => json<{ agreement: Agreement }>("/agreements", "POST", owner.token, input)));
assert.equal(creates[0].agreement.id, creates[1].agreement.id, "creation retries must not duplicate agreements");
assert.equal((await json<{ agreements: Agreement[] }>("/agreements", "GET", owner.token)).agreements.length, 1);
assert.equal((await request("/agreements", "POST", owner.token, { ...input, title: "Changed payload" })).status, 409);
for (const invalid of [
  { ...input, requestId: randomUUID(), title: " " },
  { ...input, requestId: randomUUID(), stake: { ...input.stake, fulfilled: true } },
  { ...input, requestId: randomUUID(), stake: { ...input.stake, additions: [{ boostId: "fake", label: "Unapproved", createdAt: new Date().toISOString() }] } }
]) assert.equal((await request("/agreements", "POST", owner.token, invalid)).status, 422);

let agreement = creates[0].agreement;
const signature = { signatureDataUrl: "data:image/png;base64,visitor", revision: agreement.revision };
const edit = { ...input, title: "Reviewed version two", revision: agreement.revision };
agreement = (await json<{ agreement: Agreement }>(`/agreements/${agreement.id}`, "PATCH", owner.token, edit)).agreement;
assert.equal((await request(`/agreements/${agreement.id}`, "PATCH", owner.token, edit)).status, 409, "stale draft cannot overwrite new terms");
assert.equal((await request(`/share/${agreement.shareCode}/sign`, "POST", visitor.token, signature)).status, 409, "sign only the terms actually reviewed");
assert.equal((await request(`/share/${agreement.shareCode}/sign`, "POST", owner.token, { ...signature, revision: agreement.revision })).status, 409);
assert.equal((await request(`/agreements/${agreement.id}/boost`, "POST", owner.token, { label: "Too early" })).status, 409);

// Force both visitors to read the same unsigned revision before either update commits.
const originalFind = repositories.agreements.findByShareCode.bind(repositories.agreements);
let arrived = 0;
let release!: () => void;
const barrier = new Promise<void>(resolve => { release = resolve; });
repositories.agreements.findByShareCode = async code => {
  const snapshot = await originalFind(code);
  if (++arrived === 2) release();
  await barrier;
  return snapshot;
};
const contenders = [visitor, outsider];
const signs = await Promise.all(contenders.map(person => request(`/share/${agreement.shareCode}/sign`, "POST", person.token,
  { ...signature, revision: agreement.revision })));
repositories.agreements.findByShareCode = originalFind;
assert.deepEqual(signs.map(response => response.status).sort(), [200, 409]);
const accepted = signs.findIndex(response => response.status === 200);
const rejected = 1 - accepted;
assert.equal("agreement" in await signs[rejected].json(), false, "conflict must not leak another visitor's signed agreement");
assert.equal((await json<{ user: User }>("/auth/me", "GET", contenders[rejected].token)).user.signatureDataUrl, null);
agreement = (await signs[accepted].json() as { agreement: Agreement }).agreement;
const friend = contenders[accepted];
assert.equal((await request(`/share/${agreement.shareCode}/sign`, "POST", friend.token, signature)).status, 200, "successful signature retry stays idempotent");
assert.equal((await request(`/share/${agreement.shareCode}`, "GET", contenders[rejected].token)).status, 403);
assert.equal((await request(`/agreements/${agreement.id}/boost`, "POST", owner.token, { label: " " })).status, 422);
for (let index = 0; index < 3; index++) {
  const proposed = (await json<{ agreement: Agreement }>(`/agreements/${agreement.id}/boost`, "POST", owner.token, { label: String(index).repeat(80) })).agreement;
  agreement = (await json<{ agreement: Agreement }>(`/agreements/${agreement.id}/boost/${proposed.boosts[index].id}/confirm`, "POST", friend.token)).agreement;
}
const winnerId = agreement.participants.find(person => person.userId === friend.user.id)!.id;
assert.equal((await request(`/agreements/${agreement.id}/result`, "PATCH", owner.token, { winnerId: "missing" })).status, 422);
await json(`/agreements/${agreement.id}/result`, "PATCH", owner.token, { winnerId });
assert.equal((await request(`/agreements/${agreement.id}`, "DELETE", owner.token)).status, 409, "settlement is already protected before redemption");
const coupons = (await json<{ coupons: Coupon[] }>("/coupons", "GET", friend.token)).coupons;
assert.equal(coupons.length, 1);
assert.equal(coupons[0].name.length, 323, "all three long confirmed amendments must survive coupon serialization");
assert.equal((await request(`/agreements/${agreement.id}/boost`, "POST", owner.token, { label: "Too late" })).status, 409);
assert.equal((await request(`/agreements/${agreement.id}/boost/${agreement.boosts[0].id}/confirm`, "POST", friend.token)).status, 409);
await json(`/coupons/${coupons[0].id}/use`, "PATCH", friend.token);
assert.equal((await request(`/agreements/${agreement.id}`, "DELETE", owner.token)).status, 409);
console.log("Contract regression passed: retry identity, reviewed revisions, concurrent signing privacy, validated stakes, long amendments and terminal states.");

async function makeUnfulfilled(type: "custom" | "coupon" = "coupon") {
  const stakeLabel = type === "custom" ? "一份自定义权益" : input.stake.label;
  const created = (await json<{ agreement: Agreement }>("/agreements", "POST", owner.token, { ...input, requestId: randomUUID(), stake: { ...input.stake, type, label: stakeLabel } })).agreement;
  const signed = (await json<{ agreement: Agreement }>(`/share/${created.shareCode}/sign`, "POST", visitor.token,
    { ...signature, revision: created.revision })).agreement;
  const settled = (await json<{ agreement: Agreement }>(`/agreements/${signed.id}/result`, "PATCH", visitor.token,
    { winnerId: signed.participants.find(person => person.userId === visitor.user.id)!.id })).agreement;
  const coupon = (await json<{ coupons: Coupon[] }>("/coupons", "GET", visitor.token)).coupons.find(item => item.agreementId === signed.id)!;
  return { settled, coupon, stakeLabel };
}
const toRemove = await makeUnfulfilled();
const [ticket] = await repositories.grace.ensureEarned(owner.user.id, 10);
await json(`/grace/${ticket.id}/waivers`, "POST", owner.token, { couponId: toRemove.coupon.id });
const deletionEvents: string[] = [];
const stop = repositories.realtime.subscribe(toRemove.settled, event => { deletionEvents.push(event.type); });
assert.equal((await request(`/agreements/${toRemove.settled.id}`, "DELETE", owner.token)).status, 409);
stop();
assert.equal(deletionEvents.includes("agreement.deleted"), false);
assert.equal((await repositories.coupons.findById(toRemove.coupon.id))?.status, "reserved");
assert.equal((await repositories.grace.listByUser(owner.user.id))[0].status, "reserved", "a blocked deletion must not change a pending waiver");
assert.equal((await repositories.grace.listWaiversForUser(owner.user.id)).length, 1);
const withFlip = await makeUnfulfilled();
await json(`/agreements/${withFlip.settled.id}/flips`, "POST", owner.token, { couponId: withFlip.coupon.id });
assert.equal((await request(`/agreements/${withFlip.settled.id}`, "DELETE", owner.token)).status, 409);
assert.equal((await repositories.flips.listByAgreement(withFlip.settled.id)).length, 1);
assert.ok(await repositories.coupons.findById(withFlip.coupon.id));

const race = await makeUnfulfilled();
await json(`/coupons/${race.coupon.id}/use`, "PATCH", visitor.token);
await assert.rejects(() => repositories.agreements.delete(race.settled.id, race.settled.revision), /REVISION_CONFLICT/);
assert.equal((await repositories.agreements.findById(race.settled.id))?.status, "fulfilled");
console.log("Deletion regression passed: settled records, reserved tickets and flip assets are protected.");

const contested = await makeUnfulfilled();
const competingActions = await Promise.all([
  request(`/coupons/${contested.coupon.id}/use`, "PATCH", visitor.token),
  request(`/agreements/${contested.settled.id}/flips`, "POST", owner.token, { couponId: contested.coupon.id })
]);
assert.equal(competingActions.filter(response => response.ok).length, 1, "redemption and flip must not both acquire the same coupon");
const contestedCoupon = await repositories.coupons.findById(contested.coupon.id);
const contestedAgreement = await repositories.agreements.findById(contested.settled.id);
assert.equal(contestedAgreement?.status, contestedCoupon?.status === "used" ? "fulfilled" : "result_recorded");

const custom = await makeUnfulfilled("custom");
assert.ok(custom.coupon);
assert.equal(custom.coupon.name, custom.stakeLabel);
assert.equal(custom.coupon.holderUserId, visitor.user.id);
assert.equal(custom.coupon.issuerUserId, owner.user.id);
assert.equal((await request(`/agreements/${custom.settled.id}/fulfill`, "POST", owner.token)).status, 409, "custom coupons cannot bypass redemption");
assert.equal((await request(`/agreements/${custom.settled.id}/result`, "PATCH", owner.token, { winnerId: custom.settled.winnerId })).status, 409);
assert.equal((await repositories.coupons.listByUser(visitor.user.id)).filter(coupon => coupon.agreementId === custom.settled.id).length, 1);
await json(`/coupons/${custom.coupon.id}/use`, "PATCH", visitor.token);
assert.equal((await repositories.agreements.findById(custom.settled.id))?.status, "fulfilled");
const customFlip = await makeUnfulfilled("custom");
assert.equal((await request(`/agreements/${customFlip.settled.id}/flips`, "POST", owner.token, { couponId: customFlip.coupon.id })).status, 201);
const customWaiver = await makeUnfulfilled("custom");
const tickets = await repositories.grace.ensureEarned(owner.user.id, 20);
const availableTicket = tickets.find(item => item.status === "available")!;
assert.ok(availableTicket);
assert.equal((await request(`/grace/${availableTicket.id}/waivers`, "POST", owner.token, { couponId: customWaiver.coupon.id })).status, 201);

const pending = (await json<{ agreement: Agreement }>("/agreements", "POST", owner.token, { ...input, requestId: randomUUID() })).agreement;
let amendable = (await json<{ agreement: Agreement }>(`/share/${pending.shareCode}/sign`, "POST", visitor.token,
  { ...signature, revision: pending.revision })).agreement;
for (let index = 0; index < 3; index++) {
  amendable = (await json<{ agreement: Agreement }>(`/agreements/${amendable.id}/boost`, "POST", owner.token, { label: `Extra ${index}` })).agreement;
}
const target = amendable.boosts[0].id;
const withdrawPath = `/agreements/${amendable.id}/boost/${target}`;
assert.equal((await request(withdrawPath, "DELETE", outsider.token)).status, 403);
assert.equal((await request(withdrawPath, "DELETE", visitor.token)).status, 403);
amendable = (await json<{ agreement: Agreement }>(withdrawPath, "DELETE", owner.token)).agreement;
assert.equal(amendable.boosts.length, 2);
assert.equal(amendable.stake.additions.length, 0);
assert.equal((await request(withdrawPath, "DELETE", owner.token)).status, 404);
amendable = (await json<{ agreement: Agreement }>(`/agreements/${amendable.id}/boost`, "POST", owner.token, { label: "Restored slot" })).agreement;
const confirmedId = amendable.boosts[0].id;
amendable = (await json<{ agreement: Agreement }>(`/agreements/${amendable.id}/boost/${confirmedId}/confirm`, "POST", visitor.token)).agreement;
assert.equal((await request(`/agreements/${amendable.id}/boost/${confirmedId}`, "DELETE", owner.token)).status, 409);
assert.equal(amendable.stake.additions.length, 1);

const concurrentId = amendable.boosts[1].id;
const outcomes = await Promise.all([
  request(`/agreements/${amendable.id}/boost/${concurrentId}`, "DELETE", owner.token),
  request(`/agreements/${amendable.id}/boost/${concurrentId}/confirm`, "POST", visitor.token)
]);
assert.equal(outcomes.filter(result => result.ok).length, 1);
const concurrentResult = (await repositories.agreements.findById(amendable.id))!;
assert.equal(concurrentResult.boosts.some(boost => boost.id === concurrentId), concurrentResult.stake.additions.some(addition => addition.boostId === concurrentId));
await json(`/agreements/${amendable.id}/result`, "PATCH", owner.token, { winnerId: amendable.participants[0].id });
assert.equal((await request(`/agreements/${amendable.id}/boost/${amendable.boosts[2].id}`, "DELETE", owner.token)).status, 409);

const deletable = (await json<{ agreement: Agreement }>("/agreements", "POST", owner.token, { ...input, requestId: randomUUID() })).agreement;
const notifications: string[] = [];
const unsubscribe = repositories.realtime.subscribe(deletable, event => notifications.push(event.type));
assert.equal((await request(`/agreements/${deletable.id}`, "DELETE", owner.token)).status, 204);
unsubscribe();
assert.equal(notifications.at(-1), "agreement.deleted");
console.log("Product rules passed: custom equity issuance/redemption/flip/waiver, pending-only withdrawal, restored quota and concurrent confirmation.");
