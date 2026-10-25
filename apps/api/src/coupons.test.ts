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
assert.equal(holderPage.coupons.length, 1);
assert.equal(holderPage.coupons[0]?.claimId, claimed.coupon.claimId);

console.log("Coupon pagination passed: cursor ordering, share claim and holder visibility.");
