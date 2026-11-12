import assert from "node:assert/strict";
import type { Coupon, User } from "@playbit/shared";
import { createPlaybitApp, createRepositories } from "./app.js";

const app = createPlaybitApp(createRepositories(null));

async function json<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await app.request(path, init);
  assert.ok(response.ok, `${path}: ${response.status} ${await response.clone().text()}`);
  return response.json() as Promise<T>;
}

async function register(label: string) {
  return json<{ user: User; token: string }>("/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      nickname: label,
      email: `${label}@pagination.example.com`,
      password: "password123"
    })
  });
}

const issuer = await register(`issuer-${Date.now()}`);
const holder = await register(`holder-${Date.now()}`);
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

const publicIssued = await json<{ coupon: Coupon }>("/coupons/public", {
  method: "POST",
  body: JSON.stringify({
    name: "现场主持人的彩头",
    description: "赢家领取后生效",
    issuerNickname: "现场主持人",
    sourceLabel: "游戏彩头",
    claimLimit: 1
  })
});
assert.equal(publicIssued.coupon.issuerUserId, null);
assert.equal(publicIssued.coupon.issuerNickname, "现场主持人");
assert.ok(publicIssued.coupon.claimToken);
assert.equal((await app.request(`/coupons/share/${publicIssued.coupon.claimToken}/claim`, { method: "POST" })).status, 401);
const publicClaimed = await json<{ coupon: Coupon }>(`/coupons/share/${publicIssued.coupon.claimToken}/claim`, {
  method: "POST",
  headers: auth(holder.token)
});
assert.equal(publicClaimed.coupon.holderUserId, holder.user.id);

for (let index = 0; index < 3; index += 1) {
  await json<{ coupon: Coupon }>("/coupons/independent", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...auth(issuer.token) },
    body: JSON.stringify({
      name: `分页权益 ${index}`,
      description: "用于验证权益列表游标分页",
      sourceLabel: "游戏彩头",
      claimLimit: 1
    })
  });
}

const first = await json<{ coupons: Coupon[]; nextCursor: string | null; hasMore: boolean }>("/coupons?limit=2", {
  headers: auth(issuer.token)
});
assert.equal(first.coupons.length, 2);
assert.equal(first.hasMore, true);
assert.ok(first.nextCursor);

const second = await json<{ coupons: Coupon[]; nextCursor: string | null; hasMore: boolean }>(`/coupons?limit=2&cursor=${encodeURIComponent(first.nextCursor!)}`, {
  headers: auth(issuer.token)
});
assert.equal(second.coupons.length, 1);
assert.equal(second.hasMore, false);
assert.equal(new Set([...first.coupons, ...second.coupons].map(item => item.id)).size, 3);

const issued = first.coupons[0]!;
const issuerOwned = await json<{ coupons: Coupon[] }>("/coupons?limit=10&owned=1", { headers: auth(issuer.token) });
assert.equal(issuerOwned.coupons.length, 0, "issued coupons do not belong in the issuer's owned wallet");
const pendingGameCoupon = await json<{ coupon: Coupon }>("/coupons/independent", {
  method: "POST",
  headers: { "Content-Type": "application/json", ...auth(issuer.token) },
  body: JSON.stringify({
    name: "游戏彩头待领取",
    description: "分享后仍留在签发人的待领取列表",
    sourceLabel: "游戏彩头",
    claimLimit: 1
  })
});
const promiseIssueRequest = {
  requestId: "promise-agreement-retry-test",
  name: "自动签发约定权益",
  description: "结算页进入后自动签发",
  sourceLabel: "赌约权益",
  claimLimit: 1
};
const firstPromiseIssue = await json<{ coupon: Coupon }>("/coupons/independent", {
  method: "POST",
  headers: { "Content-Type": "application/json", ...auth(issuer.token) },
  body: JSON.stringify(promiseIssueRequest)
});
const retriedPromiseIssue = await json<{ coupon: Coupon }>("/coupons/independent", {
  method: "POST",
  headers: { "Content-Type": "application/json", ...auth(issuer.token) },
  body: JSON.stringify(promiseIssueRequest)
});
assert.equal(retriedPromiseIssue.coupon.id, firstPromiseIssue.coupon.id, "retries keep the same automatic issuance");
assert.equal(retriedPromiseIssue.coupon.claimToken, firstPromiseIssue.coupon.claimToken, "retries keep the original share link");
const pendingIssuerPage = await json<{ coupons: Coupon[]; hasMore: boolean }>("/coupons?pending=1", { headers: auth(issuer.token) });
assert.ok(pendingIssuerPage.coupons.some(item => item.id === pendingGameCoupon.coupon.id));
assert.equal(pendingIssuerPage.coupons.every(item => item.issuerUserId === issuer.user.id && item.holderUserId === null && item.remainingClaims > 0), true);
const holderClaimsGameCoupon = await json<{ coupon: Coupon }>(`/coupons/share/${pendingGameCoupon.coupon.claimToken}/claim`, {
  method: "POST",
  headers: auth(holder.token)
});
assert.equal(holderClaimsGameCoupon.coupon.holderUserId, holder.user.id);
const pendingAfterRecipientClaim = await json<{ coupons: Coupon[] }>("/coupons?pending=1", { headers: auth(issuer.token) });
assert.equal(pendingAfterRecipientClaim.coupons.some(item => item.id === pendingGameCoupon.coupon.id), false, "claimed coupon leaves the issuer's pending queue");
const recipientOwned = await json<{ coupons: Coupon[] }>("/coupons?limit=10&owned=1", { headers: auth(holder.token) });
assert.ok(recipientOwned.coupons.some(item => item.claimId === holderClaimsGameCoupon.coupon.claimId));
const selfIssued = await json<{ coupon: Coupon }>("/coupons/independent", {
  method: "POST",
  headers: { "Content-Type": "application/json", ...auth(issuer.token) },
  body: JSON.stringify({
    name: "游戏签发人自领测试",
    description: "验证游戏彩头由签发人自领",
    sourceLabel: "游戏彩头",
    claimLimit: 1
  })
});
assert.equal((await app.request(`/coupons/share/${selfIssued.coupon.claimToken}/claim`, {
  method: "POST",
  headers: auth(issuer.token)
})).status, 409, "the public share endpoint still rejects the issuer");
const selfClaimed = await json<{ coupon: Coupon }>(`/coupons/${selfIssued.coupon.id}/claim-self`, {
  method: "POST",
  headers: auth(issuer.token)
});
assert.equal(selfClaimed.coupon.claimId !== null, true);
assert.equal(selfClaimed.coupon.holderUserId, issuer.user.id);
const issuerOwnedAfterSelfClaim = await json<{ coupons: Coupon[] }>("/coupons?limit=10&owned=1", { headers: auth(issuer.token) });
assert.equal(issuerOwnedAfterSelfClaim.coupons.some(item => item.claimId === selfClaimed.coupon.claimId), true);
const pendingAfterSelfClaim = await json<{ coupons: Coupon[] }>("/coupons?pending=1", { headers: auth(issuer.token) });
assert.equal(pendingAfterSelfClaim.coupons.some(item => item.id === selfIssued.coupon.id), false, "self-claimed coupon leaves the pending queue");
const share = await json<{ coupon: Coupon }>(`/coupons/share/${issued.claimToken}`);
assert.equal(share.coupon.remainingClaims, 1);
const claimed = await json<{ coupon: Coupon }>(`/coupons/share/${issued.claimToken}/claim`, {
  method: "POST",
  headers: auth(holder.token)
});
assert.equal(claimed.coupon.holderUserId, holder.user.id);

const holderPage = await json<{ coupons: Coupon[]; nextCursor: string | null }>("/coupons?limit=10", {
  headers: auth(holder.token)
});
assert.equal(holderPage.coupons.length, 3);
assert.equal(holderPage.coupons.some(item => item.claimId === claimed.coupon.claimId), true);
assert.equal(holderPage.coupons.some(item => item.claimId === holderClaimsGameCoupon.coupon.claimId), true);

const secondHolder = await register(`holder2-${Date.now().toString().slice(-6)}`);
const contested = await json<{ coupon: Coupon }>("/coupons/independent", {
  method: "POST",
  headers: { "Content-Type": "application/json", ...auth(issuer.token) },
  body: JSON.stringify({ name: "只可领取一次", description: "并发争抢最后一个领取名额", sourceLabel: "游戏彩头", claimLimit: 1 })
});
const concurrentClaims = await Promise.all([holder, secondHolder].map(account => app.request(`/coupons/share/${contested.coupon.claimToken}/claim`, {
  method: "POST",
  headers: auth(account.token)
})));
assert.equal(concurrentClaims.filter(response => response.ok).length, 1, "only one holder can win the final claim slot");
assert.equal(concurrentClaims.filter(response => response.status === 410).length, 1);
assert.equal((await app.request(`/coupons/share/${contested.coupon.claimToken}`)).status, 410);

console.log("Coupon pagination passed: cursor ordering, share claim and holder visibility.");
