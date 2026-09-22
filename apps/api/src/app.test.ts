import { strict as assert } from "node:assert";
import { createPlaybitApp, createRepositories } from "./app.js";
import type { BetSession, Coupon, User } from "@playbit/shared";

const app = createPlaybitApp(createRepositories(null));

async function json<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await app.request(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers
    }
  });

  assert.ok(response.ok, `${path} expected ok, got ${response.status}`);
  return response.json() as Promise<T>;
}

async function guest(nickname: string) {
  return json<{ user: User; token: string }>("/auth/guest", {
    method: "POST",
    body: JSON.stringify({ nickname })
  });
}

function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}

const health = await json<{ ok: boolean }>("/health");
assert.equal(health.ok, true);

const initiator = await guest("甲方");
const created = await json<{ session: BetSession }>("/sessions", {
  method: "POST",
  headers: auth(initiator.token),
  body: JSON.stringify({
    source: "custom",
    title: "谁先说随便谁输",
    challenge: "未来 10 分钟内谁先说随便谁输",
    judgmentRule: "第一个说出口的人判负",
    stake: {
      type: "coupon",
      label: "洗碗一次",
      fulfilled: false
    },
    cardId: null
  })
});

assert.equal(created.session.status, "pending_confirmation");
assert.equal(created.session.participants.length, 1);

const share = await json<{ session: BetSession }>(`/share/${created.session.shareCode}`);
assert.equal(share.session.id, created.session.id);

const counterparty = await guest("乙方");
const signed = await json<{ session: BetSession }>(`/share/${created.session.shareCode}/sign`, {
  method: "POST",
  headers: auth(counterparty.token),
  body: JSON.stringify({ nickname: "乙方" })
});

assert.equal(signed.session.status, "active");
assert.equal(signed.session.participants.length, 2);

const winnerId = signed.session.participants.find((participant) => participant.role === "counterparty")?.id;
assert.ok(winnerId);

const settled = await json<{ session: BetSession }>(`/sessions/${signed.session.id}/settle`, {
  method: "PATCH",
  headers: auth(counterparty.token),
  body: JSON.stringify({ winnerId, fulfilled: false })
});

assert.equal(settled.session.status, "settling");
assert.equal(settled.session.stake.fulfilled, false);

const couponList = await json<{ coupons: Coupon[] }>("/coupons", {
  headers: auth(counterparty.token)
});

assert.equal(couponList.coupons.length, 1);
assert.equal(couponList.coupons[0].name, "洗碗一次");
assert.equal(couponList.coupons[0].status, "available");

const used = await json<{ coupon: Coupon }>(`/coupons/${couponList.coupons[0].id}/use`, {
  method: "PATCH",
  headers: auth(counterparty.token)
});

assert.equal(used.coupon.status, "used");

const fulfilled = await json<{ session: BetSession }>(`/sessions/${signed.session.id}`, {
  headers: auth(counterparty.token)
});

assert.equal(fulfilled.session.status, "fulfilled");
assert.equal(fulfilled.session.stake.fulfilled, true);
