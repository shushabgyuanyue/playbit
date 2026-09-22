import { strict as assert } from "node:assert";
import { createBetSession, settleBetSession, signCounterparty } from "./index";

const session = createBetSession(
  {
    source: "custom",
    creatorNickname: "甲方",
    title: "谁先说随便谁输",
    challenge: "未来 10 分钟内谁先说随便谁输",
    judgmentRule: "第一个说出口的人判负",
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

const signed = signCounterparty(session, "乙方", "user_b");
assert.equal(signed.status, "active");
assert.equal(signed.participants.length, 2);
assert.equal(signed.participants[1].role, "counterparty");
assert.equal(signed.participants[1].confirmed, true);

const settled = settleBetSession(signed, signed.participants[1].id, false);
assert.equal(settled.status, "settling");
assert.equal(settled.winnerId, signed.participants[1].id);
assert.equal(settled.loserId, signed.participants[0].id);
assert.equal(settled.stake.fulfilled, false);

const fulfilled = settleBetSession(signed, signed.participants[0].id, true);
assert.equal(fulfilled.status, "fulfilled");
assert.equal(fulfilled.stake.fulfilled, true);

assert.throws(() => settleBetSession(signed, "missing", false), /WINNER_NOT_IN_SESSION/);
