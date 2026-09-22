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

async function register(nickname: string, email: string) {
  return json<{ user: User; token: string }>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ nickname, email, password: "password123" })
  });
}

function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}

const health = await json<{ ok: boolean }>("/health");
assert.equal(health.ok, true);

const initiator = await register("甲方", "initiator@example.com");
const created = await json<{ session: BetSession }>("/sessions", {
  method: "POST",
  headers: auth(initiator.token),
  body: JSON.stringify({
    source: "custom",
    creatorSignatureDataUrl: "data:image/png;base64,initiator-signature",
    title: "随便触发约定",
    challenge: "未来 10 分钟内第一个说随便的人承担本次权益",
    judgmentRule: "第一个说出口的人承担本次权益",
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

const selfSign = await app.request(`/share/${created.session.shareCode}/sign`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    ...auth(initiator.token)
  },
  body: JSON.stringify({ nickname: "甲方", signatureDataUrl: "data:image/png;base64,self-signature" })
});
assert.equal(selfSign.status, 409);

const counterparty = await register("乙方", "counterparty@example.com");
const signed = await json<{ session: BetSession }>(`/share/${created.session.shareCode}/sign`, {
  method: "POST",
  headers: auth(counterparty.token),
  body: JSON.stringify({ nickname: "乙方", signatureDataUrl: "data:image/png;base64,counterparty-signature" })
});

assert.equal(signed.session.status, "active");
assert.equal(signed.session.participants.length, 2);

const initiatorAfterSign = await json<{ session: BetSession }>(`/sessions/${signed.session.id}`, {
  headers: auth(initiator.token)
});
assert.equal(initiatorAfterSign.session.status, "active");

const winnerId = signed.session.participants.find((participant) => participant.role === "counterparty")?.id;
assert.ok(winnerId);

const outsider = await register("路人", "outsider@example.com");
const outsiderView = await app.request(`/sessions/${signed.session.id}`, {
  headers: auth(outsider.token)
});
assert.equal(outsiderView.status, 403);

const outsiderSettle = await app.request(`/sessions/${signed.session.id}/settle`, {
  method: "PATCH",
  headers: {
    "Content-Type": "application/json",
    ...auth(outsider.token)
  },
  body: JSON.stringify({ winnerId, fulfilled: false })
});
assert.equal(outsiderSettle.status, 403);

const anonymousCouponList = await app.request("/coupons");
assert.equal(anonymousCouponList.status, 401);

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

const outsiderUseCoupon = await app.request(`/coupons/${couponList.coupons[0].id}/use`, {
  method: "PATCH",
  headers: auth(outsider.token)
});
assert.equal(outsiderUseCoupon.status, 403);

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
