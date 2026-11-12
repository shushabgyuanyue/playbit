import { describe, expect, it } from "vitest";
import { couponSchema } from "@playbit/shared";
import { createInitialState } from "../../data/demo";
import { toPendingBenefitIssuance, toPlayerCoupon } from "./couponPresentation";

const voice = { id: "voice", assetId: "recorded-voice", durationMs: 3000, storage: "indexeddb" as const };
const remote = couponSchema.parse({ id: "claim-1", parentCouponId: "issued-1", name: "请喝一杯", description: "一份彩头", sourceLabel: "赌约权益", issuerUserId: null, issuerNickname: "签发人", holderUserId: "holder", holderNickname: "领取人", status: "used", createdAt: "2026-10-28T08:00:00Z", usedAt: "2026-10-28T09:00:00Z" });

describe("coupon presentation", () => {
  it("restores voice from the original issuance when the claim has a different ID", () => {
    const state = createInitialState();
    state.issuedBenefits.local = { id: "local", remoteId: "issued-1", title: remote.name, source: "promise", issuerName: "签发人", signature: [], voice, status: "claimed", issuedAt: remote.createdAt };
    expect(toPlayerCoupon(remote, state)).toMatchObject({ id: "claim-1", voice, signature: [], status: "redeemed", redeemedAt: remote.usedAt });
  });

  it("restores older agreement-linked recordings", () => {
    const state = createInitialState();
    state.agreements = [{ id: "agreement-1", text: "约定", benefit: remote.name, voice, signatures: { a: [], b: [] }, createdAt: remote.createdAt, winner: null }];
    expect(toPlayerCoupon({ ...remote, agreementId: "agreement-1" }, state).voice).toEqual(voice);
  });

  it("does not attach a same-title recording to a different coupon", () => {
    const state = createInitialState();
    state.issuedBenefits.other = { id: "other", remoteId: "different-issuance", title: remote.name, source: "promise", issuerName: "签发人", signature: [], voice, status: "claimed", issuedAt: remote.createdAt };
    expect(toPlayerCoupon(remote, state).voice).toBeUndefined();
  });

  it("preserves the exact coupon's existing local recording", () => {
    const state = createInitialState();
    state.coupons = [{ ...state.coupons[0]!, id: remote.id, voice }];
    expect(toPlayerCoupon(remote, state).voice).toEqual(voice);
  });

  it("restores a pending game issuance from the API and keeps its local audio", () => {
    const state = createInitialState();
    state.issuedStakes.truth = { id: "issued-1", remoteId: "issued-1", claimToken: "share-token", cardId: "truth", cardTitle: "谜题", title: "请喝一杯", issuerName: "签发人", signature: [], voice, issuedAt: remote.createdAt, source: "game", status: "pending_claim" };
    const pending = couponSchema.parse({ id: "issued-1", name: "请喝一杯", description: "说一句彩头", sourceLabel: "游戏彩头", issuerUserId: "issuer", issuerNickname: "签发人", holderUserId: null, holderNickname: "待领取", claimToken: "share-token", claimLimit: 1, claimedCount: 0, remainingClaims: 1, status: "available", createdAt: remote.createdAt, usedAt: null });
    expect(toPendingBenefitIssuance(pending, state)).toMatchObject({ id: "issued-1", remoteId: "issued-1", claimToken: "share-token", source: "game", status: "pending_claim", voice });
  });
});
