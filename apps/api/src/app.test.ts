import { strict as assert } from "node:assert";
import { dailyCards, drawCard } from "@playbit/cards";
import { createPlaybitApp, createRepositories } from "./app.js";
import { cardSchema, type Agreement, type Coupon, type User } from "@playbit/shared";

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

assert.equal(new Set(dailyCards.map((card) => card.id)).size, dailyCards.length);
assert.ok(dailyCards.some((card) => card.mode === "together" && card.reveal));
assert.ok(dailyCards.some((card) => card.mode === "versus"));
for (const card of dailyCards) cardSchema.parse(card);
for (const card of dailyCards) {
  assert.notEqual(drawCard([card.id], "versus").mode, "together");
}

const anonymousCard = await json<{ card: { id: string; content: string; winCondition: string } }>("/cards/draw", {
  method: "POST",
  body: JSON.stringify({ previousIds: [] })
});
assert.ok(anonymousCard.card.id);
assert.ok(anonymousCard.card.content);
assert.ok(anonymousCard.card.winCondition);

const initiator = await register("甲方", "initiator@example.com");
const profileUser = await register("资料用户", "profile@example.com");
const profileUpdate = await app.request("/auth/me", {
  method: "PATCH",
  headers: { "Content-Type": "application/json", ...auth(profileUser.token) },
  body: JSON.stringify({ nickname: "花花" })
});
assert.equal(profileUpdate.status, 200);
assert.equal((await profileUpdate.json() as { user: User }).user.nickname, "花花");
const togetherCard = dailyCards.find((card) => card.mode === "together");
assert.ok(togetherCard);
const invalidCardAgreement = await app.request("/agreements", {
  method: "POST",
  headers: { "Content-Type": "application/json", ...auth(initiator.token) },
  body: JSON.stringify({
    source: "card",
    cardId: togetherCard.id,
    creatorSignatureDataUrl: "data:image/png;base64,signature",
    title: togetherCard.name,
    challenge: togetherCard.content,
    stake: { type: "coupon", label: "洗碗一次", fulfilled: false, additions: [] }
  })
});
assert.equal(invalidCardAgreement.status, 422);
const unknownLogin = await app.request("/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "new@example.com", password: "password123" })
});
assert.equal(unknownLogin.status, 404);
assert.deepEqual(await unknownLogin.json(), {
  code: "ACCOUNT_NOT_FOUND",
  message: "Account not found"
});

const invalidLogin = await app.request("/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "initiator@example.com", password: "wrongpass" })
});
assert.equal(invalidLogin.status, 401);

const created = await json<{ agreement: Agreement }>("/agreements", {
  method: "POST",
  headers: auth(initiator.token),
  body: JSON.stringify({
    source: "custom",
    creatorSignatureDataUrl: "data:image/png;base64,initiator-signature",
    title: "随便触发约定",
    challenge: "未来 10 分钟内第一个说随便的人承担本次权益",
    stake: {
      type: "coupon",
      label: "洗碗一次",
      fulfilled: false,
      additions: []
    },
    cardId: null
  })
});

assert.equal(created.agreement.status, "pending_signature");
assert.equal(created.agreement.participants.length, 1);

const share = await json<{ agreement: Agreement }>(`/share/${created.agreement.shareCode}`);
assert.equal(share.agreement.id, created.agreement.id);

const selfSign = await app.request(`/share/${created.agreement.shareCode}/sign`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    ...auth(initiator.token)
  },
  body: JSON.stringify({ signatureDataUrl: "data:image/png;base64,self-signature" })
});
assert.equal(selfSign.status, 409);

const counterparty = await register("乙方", "counterparty@example.com");
const signed = await json<{ agreement: Agreement }>(`/share/${created.agreement.shareCode}/sign`, {
  method: "POST",
  headers: auth(counterparty.token),
  body: JSON.stringify({ nickname: "伪造的签署人", signatureDataUrl: "data:image/png;base64,counterparty-signature" })
});

assert.equal(signed.agreement.status, "active");
assert.equal(signed.agreement.participants.length, 2);
assert.equal(signed.agreement.participants.find((participant) => participant.role === "counterparty")?.nickname, counterparty.user.nickname);

const signedOutsiderShare = await app.request(`/share/${created.agreement.shareCode}`, {
  headers: auth((await register("旁观者", "share-outsider@example.com")).token)
});
assert.equal(signedOutsiderShare.status, 403);

const initiatorAfterSign = await json<{ agreement: Agreement }>(`/agreements/${signed.agreement.id}`, {
  headers: auth(initiator.token)
});
assert.equal(initiatorAfterSign.agreement.status, "active");

const initiatorMe = await json<{ user: User }>("/auth/me", {
  headers: auth(initiator.token)
});
assert.equal(initiatorMe.user.signatureDataUrl, "data:image/png;base64,initiator-signature");

const boost = await json<{ agreement: Agreement }>(`/agreements/${signed.agreement.id}/boost`, {
  method: "POST",
  headers: auth(initiator.token),
  body: JSON.stringify({ label: "增加一次路线决定权" })
});
assert.equal(boost.agreement.boosts.length, 1);
assert.equal(boost.agreement.boosts[0].confirmedBy.length, 1);

const confirmedBoost = await json<{ agreement: Agreement }>(
  `/agreements/${signed.agreement.id}/boost/${boost.agreement.boosts[0].id}/confirm`,
  {
    method: "POST",
    headers: auth(counterparty.token)
  }
);
assert.equal(confirmedBoost.agreement.boosts[0].confirmedBy.length, 2);

const secondBoost = await json<{ agreement: Agreement }>(`/agreements/${signed.agreement.id}/boost`, {
  method: "POST",
  headers: auth(counterparty.token),
  body: JSON.stringify({ label: "extra benefit" })
});
const confirmedSecondBoost = await json<{ agreement: Agreement }>(
  `/agreements/${signed.agreement.id}/boost/${secondBoost.agreement.boosts[1].id}/confirm`,
  {
    method: "POST",
    headers: auth(initiator.token)
  }
);
assert.equal(confirmedSecondBoost.agreement.stake.additions.length, 2);

const winnerId = signed.agreement.participants.find((participant) => participant.role === "counterparty")?.id;
assert.ok(winnerId);

const outsider = await register("路人", "outsider@example.com");
const outsiderView = await app.request(`/agreements/${signed.agreement.id}`, {
  headers: auth(outsider.token)
});
assert.equal(outsiderView.status, 403);

const outsiderSettle = await app.request(`/agreements/${signed.agreement.id}/result`, {
  method: "PATCH",
  headers: {
    "Content-Type": "application/json",
    ...auth(outsider.token)
  },
  body: JSON.stringify({ winnerId })
});
assert.equal(outsiderSettle.status, 403);

const anonymousCouponList = await app.request("/coupons");
assert.equal(anonymousCouponList.status, 401);

const settled = await json<{ agreement: Agreement }>(`/agreements/${signed.agreement.id}/result`, {
  method: "PATCH",
  headers: auth(counterparty.token),
  body: JSON.stringify({ winnerId })
});

assert.equal(settled.agreement.status, "result_recorded");
assert.equal(settled.agreement.stake.fulfilled, false);
assert.equal(settled.agreement.resultRecorderUserId, counterparty.user.id);

const initialCouponList = await json<{ coupons: Coupon[] }>("/coupons", {
  headers: auth(counterparty.token)
});

assert.equal(initialCouponList.coupons.length, 1);
assert.equal(initialCouponList.coupons[0].agreementId, signed.agreement.id);
assert.equal(initialCouponList.coupons[0].name.includes("extra benefit"), true);
assert.equal(initialCouponList.coupons[0].status, "available");

const issuerCouponList = await json<{ coupons: Coupon[] }>("/coupons", {
  headers: auth(initiator.token)
});
assert.equal(issuerCouponList.coupons.length, 1);
assert.equal(issuerCouponList.coupons[0].status, "available");

const issuerUseCoupon = await app.request(`/coupons/${initialCouponList.coupons[0].id}/use`, {
  method: "PATCH",
  headers: auth(initiator.token)
});
assert.equal(issuerUseCoupon.status, 403);

const outsiderUseCoupon = await app.request(`/coupons/${initialCouponList.coupons[0].id}/use`, {
  method: "PATCH",
  headers: auth(outsider.token)
});
assert.equal(outsiderUseCoupon.status, 403);

const firstFlipResponse = await app.request(`/agreements/${signed.agreement.id}/flips`, {
  method: "POST",
  headers: { "Content-Type": "application/json", ...auth(initiator.token) },
  body: JSON.stringify({ couponId: initialCouponList.coupons[0].id })
});
assert.equal(firstFlipResponse.status, 201);
const firstFlip = (await firstFlipResponse.json() as { flip: { id: string; card: { mode: string } } }).flip;
assert.equal(firstFlip.card.mode, "versus");
const outsiderFlip = await app.request(`/flips/${firstFlip.id}`, { headers: auth(outsider.token) });
assert.equal(outsiderFlip.status, 403);
const outsiderFlipList = await app.request(`/agreements/${signed.agreement.id}/flips`, { headers: auth(outsider.token) });
assert.equal(outsiderFlipList.status, 403);

const declinedFlip = await json<{ flip: { status: string } }>(`/flips/${firstFlip.id}/response`, {
  method: "PATCH",
  headers: auth(counterparty.token),
  body: JSON.stringify({ accept: false })
});
assert.equal(declinedFlip.flip.status, "declined");
const declinedHistory = await json<{ flips: Array<{ id: string; status: string }> }>(`/agreements/${signed.agreement.id}/flips`, {
  headers: auth(initiator.token)
});
assert.equal(declinedHistory.flips[0]?.id, firstFlip.id);
assert.equal(declinedHistory.flips[0]?.status, "declined");
const couponReleasedAfterDecline = await json<{ coupons: Coupon[] }>("/coupons", {
  headers: auth(initiator.token)
});
assert.equal(couponReleasedAfterDecline.coupons[0].status, "available");

const flipResponse = await app.request(`/agreements/${signed.agreement.id}/flips`, {
  method: "POST",
  headers: { "Content-Type": "application/json", ...auth(initiator.token) },
  body: JSON.stringify({ couponId: initialCouponList.coupons[0].id })
});
assert.equal(flipResponse.status, 201);
const flip = (await flipResponse.json() as { flip: { id: string } }).flip;
const acceptedFlip = await json<{ flip: { status: string } }>(`/flips/${flip.id}/response`, {
  method: "PATCH",
  headers: auth(counterparty.token),
  body: JSON.stringify({ accept: true })
});
assert.equal(acceptedFlip.flip.status, "active");
const activeHistory = await json<{ flips: Array<{ id: string; status: string }> }>(`/agreements/${signed.agreement.id}/flips`, {
  headers: auth(counterparty.token)
});
assert.equal(activeHistory.flips[0]?.id, flip.id);
assert.equal(activeHistory.flips[0]?.status, "active");

const lostFlip = await json<{ flip: { status: string; outcome: string }; coupon: Coupon; issuedCoupon: Coupon }>(`/flips/${flip.id}/result`, {
  method: "PATCH",
  headers: auth(initiator.token),
  body: JSON.stringify({ winnerUserId: counterparty.user.id })
});
assert.equal(lostFlip.flip.status, "settled");
assert.equal(lostFlip.flip.outcome, "applicant_lost");
assert.equal(lostFlip.coupon.id, initialCouponList.coupons[0].id);
assert.equal(lostFlip.coupon.status, "available");
assert.equal(lostFlip.issuedCoupon.sourceFlipId, flip.id);
assert.equal(lostFlip.issuedCoupon.status, "available");

const couponsAfterFlip = await json<{ coupons: Coupon[] }>("/coupons", {
  headers: auth(counterparty.token)
});
assert.equal(couponsAfterFlip.coupons.length, 2);
const originalCoupon = couponsAfterFlip.coupons.find((coupon) => coupon.sourceFlipId === null);
const additionalCoupon = couponsAfterFlip.coupons.find((coupon) => coupon.sourceFlipId === flip.id);
assert.ok(originalCoupon);
assert.ok(additionalCoupon);
assert.equal(originalCoupon.status, "available");
assert.equal(additionalCoupon.status, "available");

const winAgreementCreated = await json<{ agreement: Agreement }>("/agreements", {
  method: "POST",
  headers: auth(initiator.token),
  body: JSON.stringify({
    source: "custom",
    creatorSignatureDataUrl: "data:image/png;base64,initiator-signature",
    title: "翻盘胜利测试约定",
    challenge: "本局结束后登记结果",
    stake: { type: "coupon", label: "免做一次家务", fulfilled: false, additions: [] }
  })
});
const winAgreementSigned = await json<{ agreement: Agreement }>(`/share/${winAgreementCreated.agreement.shareCode}/sign`, {
  method: "POST",
  headers: auth(counterparty.token),
  body: JSON.stringify({ signatureDataUrl: "data:image/png;base64,counterparty-signature" })
});
const winAgreementWinner = winAgreementSigned.agreement.participants.find((participant) => participant.userId === counterparty.user.id);
assert.ok(winAgreementWinner);
await json<{ agreement: Agreement }>(`/agreements/${winAgreementSigned.agreement.id}/result`, {
  method: "PATCH",
  headers: auth(initiator.token),
  body: JSON.stringify({ winnerId: winAgreementWinner.id })
});
const winAgreementIssuerCoupons = await json<{ coupons: Coupon[] }>("/coupons", { headers: auth(initiator.token) });
const winAgreementCoupon = winAgreementIssuerCoupons.coupons.find((coupon) => coupon.agreementId === winAgreementSigned.agreement.id);
assert.ok(winAgreementCoupon);
const applicantWinFlip = await app.request(`/agreements/${winAgreementSigned.agreement.id}/flips`, {
  method: "POST",
  headers: { "Content-Type": "application/json", ...auth(initiator.token) },
  body: JSON.stringify({ couponId: winAgreementCoupon.id })
});
assert.equal(applicantWinFlip.status, 201);
const applicantWinFlipId = (await applicantWinFlip.json() as { flip: { id: string } }).flip.id;
await json<{ flip: { status: string } }>(`/flips/${applicantWinFlipId}/response`, {
  method: "PATCH",
  headers: auth(counterparty.token),
  body: JSON.stringify({ accept: true })
});
const applicantWon = await json<{ flip: { outcome: string }; agreement: Agreement; coupon: Coupon; issuedCoupon: Coupon | null }>(`/flips/${applicantWinFlipId}/result`, {
  method: "PATCH",
  headers: auth(counterparty.token),
  body: JSON.stringify({ winnerUserId: initiator.user.id })
});
assert.equal(applicantWon.flip.outcome, "applicant_won");
assert.equal(applicantWon.agreement.status, "waived");
assert.equal(applicantWon.coupon.status, "waived");
assert.equal(applicantWon.issuedCoupon, null);
assert.equal((await json<{ coupons: Coupon[] }>("/coupons", { headers: auth(counterparty.token) })).coupons
  .filter((coupon) => coupon.agreementId === winAgreementSigned.agreement.id).length, 1);

const used = await json<{ coupon: Coupon }>(`/coupons/${originalCoupon.id}/use`, {
  method: "PATCH",
  headers: auth(counterparty.token)
});

assert.equal(used.coupon.status, "used");

const fulfilled = await json<{ agreement: Agreement }>(`/agreements/${signed.agreement.id}`, {
  headers: auth(counterparty.token)
});

assert.equal(fulfilled.agreement.status, "fulfilled");
assert.equal(fulfilled.agreement.stake.fulfilled, true);

const additionalFlipResponse = await app.request(`/agreements/${signed.agreement.id}/flips`, {
  method: "POST",
  headers: { "Content-Type": "application/json", ...auth(initiator.token) },
  body: JSON.stringify({ couponId: additionalCoupon.id })
});
assert.equal(additionalFlipResponse.status, 201);
const additionalFlipId = (await additionalFlipResponse.json() as { flip: { id: string } }).flip.id;
const additionalDeclined = await json<{ flip: { status: string } }>(`/flips/${additionalFlipId}/response`, {
  method: "PATCH",
  headers: auth(counterparty.token),
  body: JSON.stringify({ accept: false })
});
assert.equal(additionalDeclined.flip.status, "declined");
assert.equal((await json<{ coupons: Coupon[] }>("/coupons", {
  headers: auth(initiator.token)
})).coupons.find((coupon) => coupon.id === additionalCoupon.id)?.status, "available");
assert.equal((await json<{ agreement: Agreement }>(`/agreements/${signed.agreement.id}`, {
  headers: auth(initiator.token)
})).agreement.status, "fulfilled");

const secondUse = await app.request(`/coupons/${originalCoupon.id}/use`, {
  method: "PATCH",
  headers: auth(counterparty.token)
});
assert.equal(secondUse.status, 409);

async function recordCustomFulfillment(index: number) {
  const createdCustom = await json<{ agreement: Agreement }>("/agreements", {
    method: "POST",
    headers: auth(initiator.token),
    body: JSON.stringify({
      source: "custom",
      creatorSignatureDataUrl: "data:image/png;base64,initiator-signature",
      title: `生活约定 ${index}`,
      challenge: "双方按当时约定完成事项",
      stake: { type: "custom", label: "完成一次约定事项", fulfilled: false, additions: [] }
    })
  });
  const signedCustom = await json<{ agreement: Agreement }>(`/share/${createdCustom.agreement.shareCode}/sign`, {
    method: "POST",
    headers: auth(counterparty.token),
    body: JSON.stringify({ signatureDataUrl: "data:image/png;base64,counterparty-signature" })
  });
  const customWinner = signedCustom.agreement.participants.find((participant) => participant.userId === counterparty.user.id);
  assert.ok(customWinner);
  const result = await json<{ agreement: Agreement }>(`/agreements/${signedCustom.agreement.id}/result`, {
    method: "PATCH",
    headers: auth(initiator.token),
    body: JSON.stringify({ winnerId: customWinner.id })
  });
  assert.equal(result.agreement.status, "result_recorded");
  const completed = await json<{ agreement: Agreement; graceTickets: unknown[] }>(`/agreements/${result.agreement.id}/fulfill`, {
    method: "POST",
    headers: auth(initiator.token)
  });
  assert.equal(completed.agreement.status, "fulfilled");
}

for (let index = 1; index <= 9; index += 1) {
  await recordCustomFulfillment(index);
}

const graceBeforeRequest = await json<{ tickets: Array<{ id: string; earnedAtFulfillmentCount: number; status: string }> }>("/grace", {
  headers: auth(initiator.token)
});
assert.equal(graceBeforeRequest.tickets.length, 1);
assert.equal(graceBeforeRequest.tickets[0].earnedAtFulfillmentCount, 10);
const graceTicketId = graceBeforeRequest.tickets[0].id;

const waiverRequest = await json<{ waiver: { id: string; status: string } }>(`/grace/${graceTicketId}/waivers`, {
  method: "POST",
  headers: auth(initiator.token),
  body: JSON.stringify({ couponId: additionalCoupon.id })
});
assert.equal(waiverRequest.waiver.status, "pending");
const rejectedWaiver = await json<{ waiver: { status: string } }>(`/grace/waivers/${waiverRequest.waiver.id}`, {
  method: "PATCH",
  headers: auth(counterparty.token),
  body: JSON.stringify({ accept: false })
});
assert.equal(rejectedWaiver.waiver.status, "rejected");

const graceAfterReject = await json<{ tickets: Array<{ id: string; status: string }> }>("/grace", {
  headers: auth(initiator.token)
});
assert.equal(graceAfterReject.tickets[0].status, "available");
const availableBonus = await json<{ coupons: Coupon[] }>("/coupons", { headers: auth(counterparty.token) });
assert.equal(availableBonus.coupons.find((coupon) => coupon.id === additionalCoupon.id)?.status, "available");

const approvedRequest = await json<{ waiver: { id: string } }>(`/grace/${graceTicketId}/waivers`, {
  method: "POST",
  headers: auth(initiator.token),
  body: JSON.stringify({ couponId: additionalCoupon.id })
});
const approvedWaiver = await json<{ waiver: { status: string }; agreement: Agreement }>(`/grace/waivers/${approvedRequest.waiver.id}`, {
  method: "PATCH",
  headers: auth(counterparty.token),
  body: JSON.stringify({ accept: true })
});
assert.equal(approvedWaiver.waiver.status, "approved");
assert.equal(approvedWaiver.agreement.status, "fulfilled");
const graceAfterApproval = await json<{ tickets: Array<{ status: string }>; waivers: Array<{ status: string }> }>("/grace", {
  headers: auth(initiator.token)
});
assert.equal(graceAfterApproval.tickets[0].status, "used");
assert.deepEqual(graceAfterApproval.waivers.map((waiver) => waiver.status).sort(), ["approved", "rejected"]);

for (let index = 10; index <= 19; index += 1) {
  await recordCustomFulfillment(index);
}
const graceAfterTwenty = await json<{ tickets: Array<{ earnedAtFulfillmentCount: number; status: string }> }>("/grace", {
  headers: auth(initiator.token)
});
assert.deepEqual(graceAfterTwenty.tickets.map((ticket) => ticket.earnedAtFulfillmentCount).sort(), [10, 20]);
assert.equal(graceAfterTwenty.tickets.length, 2);
