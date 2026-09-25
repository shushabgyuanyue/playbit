import { strict as assert } from "node:assert";
import {
  addBoost,
  confirmBoost,
  createAgreement,
  getEffectiveStakeLabel,
  beginFlip,
  recordFlipResult,
  recordAgreementResult,
  respondToFlip,
  signCounterparty
} from "./index";
import type { Card, Coupon } from "@playbit/shared";

const session = createAgreement(
  {
    source: "custom",
    creatorNickname: "甲方",
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
  },
  "user_a"
);

assert.equal(session.status, "pending_signature");
assert.equal(session.participants.length, 1);
assert.equal(session.participants[0].confirmed, true);

const signed = signCounterparty(session, "乙方", "user_b", "data:image/png;base64,counterparty-signature");
assert.equal(signed.status, "active");
assert.equal(signed.participants.length, 2);
assert.equal(signed.participants[1].role, "counterparty");
assert.equal(signed.participants[1].confirmed, true);
assert.equal(signed.participants[1].signatureDataUrl, "data:image/png;base64,counterparty-signature");

const boosted = addBoost(signed, signed.participants[0].id, "增加一张洗碗券");
assert.equal(boosted.boosts.length, 1);
assert.equal(boosted.boosts[0].confirmedBy.length, 1);
const confirmedBoost = confirmBoost(boosted, boosted.boosts[0].id, signed.participants[1].id);
assert.equal(confirmedBoost.boosts[0].confirmedBy.length, 2);
assert.equal(confirmedBoost.stake.additions.length, 1);

const secondBoost = addBoost(confirmedBoost, signed.participants[1].id, "extra benefit");
const confirmedSecondBoost = confirmBoost(
  secondBoost,
  secondBoost.boosts[1].id,
  signed.participants[0].id
);
assert.equal(confirmedSecondBoost.stake.additions.length, 2);
assert.equal(getEffectiveStakeLabel(confirmedSecondBoost).includes("extra benefit"), true);

const settled = recordAgreementResult(confirmedSecondBoost, signed.participants[1].id, "user_a");
assert.equal(settled.status, "result_recorded");
assert.equal(settled.winnerId, signed.participants[1].id);
assert.equal(settled.loserId, signed.participants[0].id);
assert.equal(settled.stake.fulfilled, false);

const flipCoupon: Coupon = {
  id: "coupon_test",
  agreementId: signed.id,
  sourceFlipId: null,
  name: "洗碗一次",
  description: signed.title,
  issuerUserId: "user_a",
  issuerNickname: "甲方",
  holderUserId: "user_b",
  holderNickname: "乙方",
  status: "available",
  createdAt: new Date().toISOString(),
  usedAt: null,
  waivedAt: null
};
const flipCard: Card = {
  id: "card_test",
  name: "不许说随便",
  category: "rule",
  mode: "versus",
  participantMin: 2,
  participantMax: 2,
  durationMinutes: 5,
  content: "接下来的五分钟，谁先说随便谁输。",
  winCondition: "第一个说出随便的人输。"
};
const pendingFlip = beginFlip({ ...settled, status: "result_recorded" }, flipCoupon, flipCard, "user_a", false);
assert.throws(() => beginFlip(settled, flipCoupon, { ...flipCard, mode: "together" }, "user_a", false), /FLIP_REQUIRES_VERSUS_CARD/);
assert.equal(pendingFlip.inviteeUserId, "user_b");
assert.equal(pendingFlip.status, "pending_acceptance");
const activeFlip = respondToFlip(pendingFlip, "user_b", true);
assert.equal(activeFlip.status, "active");
assert.equal(recordFlipResult(activeFlip, "user_a", "user_b").outcome, "applicant_won");
assert.equal(recordFlipResult(activeFlip, "user_b", "user_a").outcome, "applicant_lost");
assert.throws(() => respondToFlip(pendingFlip, "user_a", true), /FLIP_RESPONSE_FORBIDDEN/);

assert.throws(() => recordAgreementResult(signed, "missing", "user_a"), /WINNER_NOT_IN_AGREEMENT/);
assert.throws(() => recordAgreementResult(signed, signed.participants[0].id, "outsider"), /WINNER_NOT_IN_AGREEMENT/);
const boostFixture = (id: string) => ({
  id,
  label: "已确认权益",
  proposerId: signed.participants[0].id,
  confirmedBy: [signed.participants[0].id, signed.participants[1].id],
  createdAt: new Date().toISOString()
});
assert.throws(
  () =>
    addBoost(
      { ...signed, boosts: [boostFixture("one"), boostFixture("two"), boostFixture("three")] },
      signed.participants[0].id,
      "第四次加码"
    ),
  /BOOST_LIMIT_REACHED/
);
