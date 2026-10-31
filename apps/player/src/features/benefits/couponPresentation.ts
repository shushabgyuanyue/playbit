import type { Coupon as ApiCoupon } from "@playbit/shared";
import type { Coupon, CouponSource, PlayerState } from "../../data/types";
import { couponTone } from "../player/transitions";

function sourceFor(label: string): CouponSource {
  if (label.includes("游戏")) return "game";
  if (label.includes("赌约") || label.includes("签约")) return "promise";
  return "direct";
}

export function toPlayerCoupon(coupon: ApiCoupon, state: Pick<PlayerState, "coupons" | "issuedBenefits" | "issuedStakes" | "agreements">): Coupon {
  const source = sourceFor(coupon.sourceLabel);
  // A claimed coupon has its own ID; its parent identifies the original recording.
  const issuanceId = coupon.parentCouponId ?? coupon.id;
  const local = state.coupons.find(item => item.id === coupon.id);
  const issuance = [
    ...Object.values(state.issuedBenefits),
    ...Object.values(state.issuedStakes)
  ].find(item => (item.remoteId ?? item.id) === issuanceId);
  const agreement = coupon.agreementId ? state.agreements.find(item => item.id === coupon.agreementId) : undefined;
  const voice = [local?.voice, issuance?.voice, agreement?.benefitVoice].find(item => item?.assetId);
  return {
    id: coupon.id,
    displayNo: coupon.id.slice(-8).toUpperCase(),
    title: coupon.name,
    subtitle: coupon.description,
    side: "won",
    tone: couponTone(source),
    status: coupon.status === "used" || coupon.status === "waived" ? "redeemed" : "available",
    source,
    sourceNote: coupon.sourceLabel,
    agreementId: coupon.agreementId ?? undefined,
    issuerName: coupon.issuerNickname,
    holderName: coupon.holderNickname,
    issuedAt: coupon.createdAt,
    redeemedAt: coupon.usedAt ?? undefined,
    signature: local?.signature ?? issuance?.signature,
    voice
  };
}
