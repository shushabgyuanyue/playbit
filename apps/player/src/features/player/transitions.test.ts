import { describe, expect, it } from "vitest";
import { createInitialState } from "../../data/demo";
import { claimDirectBenefit, claimGameStake, issueDirectBenefit, issueGameStake, redeemCoupon, settleAgreement } from "./transitions";

describe("player transitions", () => {
  it("records one winner and creates an independent coupon", () => {
    const initial = createInitialState();
    const state = { ...initial, draft: { ...initial.draft, step: 2 as const, agreementId: "agreement-1", text: "谁洗碗", benefit: "请喝一杯" }, agreements: [{ id: "agreement-1", text: "谁洗碗", benefit: "请喝一杯", signatures: { a: [], b: [] }, createdAt: new Date().toISOString(), winner: null }] };
    const settled = settleAgreement(state, "b");
    expect(settled.draft.step).toBe(3);
    expect(settled.agreements[0]?.winner).toBe("b");
    expect(settled.coupons[0]).toMatchObject({ agreementId: "agreement-1", side: "won", source: "promise", tone: "dark-coupon", title: "请喝一杯" });
    expect(settleAgreement(settled, "a")).toEqual(settled);
  });

  it("only redeems an available won coupon", () => {
    const state = createInitialState();
    const redeemed = redeemCoupon(state, "sample-drink", "2026-01-01T00:00:00.000Z");
    expect(redeemed.coupons.find(c => c.id === "sample-drink")?.status).toBe("redeemed");
    expect(redeemed.coupons.find(c => c.id === "sample-drink")?.redeemedAt).toBe("2026-01-01T00:00:00.000Z");
    expect(redeemCoupon(redeemed, "sample-drink")).toEqual(redeemed);
  });

  it("issues a signed game stake and creates one owned coupon when claimed", () => {
    const signature = [[{ x: 0.1, y: 0.2 }]];
    const initial = createInitialState();
    const issued = issueGameStake({ ...initial, stakes: { truth: "输的人请喝一杯" }, stakeRecords: { truth: { cardId: "truth", title: "输的人请喝一杯", createdAt: "2026-01-01T00:00:00.000Z" } } }, "truth", "暧昧升温", "输的人请喝一杯", "主持人", signature, "2026-01-01T00:00:00.000Z");
    const issuance = issued.issuedStakes.truth;
    expect(issuance).toMatchObject({ status: "pending_claim", title: "输的人请喝一杯" });
    expect(issued.stakeRecords.truth).toBeUndefined();
    const claimed = claimGameStake(issued, issuance!.id, "获胜方", "2026-01-01T00:01:00.000Z");
    expect(claimed.coupons[0]).toMatchObject({ source: "game", tone: "coral-coupon", holderName: "获胜方", status: "available" });
    expect(claimed.issuedStakes.truth?.status).toBe("claimed");
    expect(claimGameStake(claimed, issuance!.id, "另一个人")).toEqual(claimed);
  });

  it("keeps a direct benefit pending until the recipient claims it", () => {
    const signature = [[{ x: 0.2, y: 0.4 }, { x: 0.7, y: 0.5 }]];
    const initial = createInitialState();
    expect(issueDirectBenefit(initial, "周末早餐", "主持人", [], "2026-01-01T00:00:00.000Z")).toEqual(initial);
    const issued = issueDirectBenefit(initial, "周末早餐", "主持人", signature, "来自线下约定", "2026-01-01T00:00:00.000Z", "benefit-test");
    expect(issued.issuedBenefits["benefit-test"]).toMatchObject({ status: "pending_claim", source: "direct", title: "周末早餐" });
    expect(issued.coupons).toHaveLength(initial.coupons.length);
    const claimed = claimDirectBenefit(issued, "benefit-test", "获胜方", "2026-01-01T00:01:00.000Z");
    expect(claimed.issuedBenefits["benefit-test"]?.status).toBe("claimed");
    expect(claimed.coupons[0]).toMatchObject({ source: "direct", tone: "debt-ticket", holderName: "获胜方", title: "周末早餐" });
    expect(claimDirectBenefit(claimed, "benefit-test", "另一个人")).toEqual(claimed);
  });

  it("uses a recorded voice as the signature for an audio benefit", () => {
    const voice = { id: "voice-1", assetId: "voice-asset-1", durationMs: 1800, storage: "indexeddb" as const };
    const initial = createInitialState();
    const issued = issueDirectBenefit(initial, "一句承诺", "主持人", [], "来自原声约定", "2026-01-01T00:00:00.000Z", "voice-benefit", "promise", voice);
    expect(issued.issuedBenefits["voice-benefit"]).toMatchObject({ status: "pending_claim", voice, signature: [] });
    const claimed = claimDirectBenefit(issued, "voice-benefit", "获胜方", "2026-01-01T00:01:00.000Z");
    expect(claimed.coupons[0]).toMatchObject({ source: "promise", voice, signature: [] });
  });
});
