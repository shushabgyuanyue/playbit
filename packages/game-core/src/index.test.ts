import { strict as assert } from "node:assert";
import { addBoost, confirmBoost, createBetSession, settleBetSession, signCounterparty } from "./index";

const session = createBetSession(
  {
    source: "custom",
    creatorNickname: "甲方",
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
  },
  "user_a"
);

assert.equal(session.status, "pending_confirmation");
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

const settled = settleBetSession(confirmedBoost, signed.participants[1].id);
assert.equal(settled.status, "settling");
assert.equal(settled.winnerId, signed.participants[1].id);
assert.equal(settled.loserId, signed.participants[0].id);
assert.equal(settled.stake.fulfilled, false);

assert.throws(() => settleBetSession(signed, "missing"), /WINNER_NOT_IN_SESSION/);
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
