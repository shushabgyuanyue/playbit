import type { Party, PlayerState, Signature } from "../../data/types";

export function createId(prefix: string) {
  return `${prefix}-${crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
}

export function settleAgreement(state: PlayerState, party: Party): PlayerState {
  const agreement = state.agreements.find(a => a.id === state.draft.agreementId);
  if (!agreement || agreement.winner) return state;
  const issuerParty: Party = party === "a" ? "b" : "a";
  return {
    ...state,
    draft: { ...state.draft, step: 3, winner: party },
    agreements: state.agreements.map(a => a.id === agreement.id ? { ...a, winner: party } : a),
    coupons: [{ id: `coupon-${agreement.id}`, displayNo: agreement.id.slice(-8).toUpperCase(), title: agreement.benefit, subtitle: agreement.text, side: "won", tone: "coral-coupon", status: "available", source: "promise", sourceNote: agreement.text, agreementId: agreement.id, issuerName: issuerParty === "a" ? "甲方" : "乙方", signature: agreement.signatures[issuerParty], issuedAt: new Date().toISOString(), holderName: party === "a" ? "甲方" : "乙方" }, ...state.coupons]
  };
}

export function issueGameStake(
  state: PlayerState,
  cardId: string,
  cardTitle: string,
  title: string,
  issuerName: string,
  signature: Signature,
  issuedAt = new Date().toISOString()
): PlayerState {
  if (!title.trim() || !signature.length || state.issuedStakes[cardId]) return state;
  const issuanceId = createId("stake");
  return {
    ...state,
    issuedStakes: {
      ...state.issuedStakes,
      [cardId]: {
        id: issuanceId,
        cardId,
        cardTitle,
        title: title.trim(),
        issuerName,
        signature,
        issuedAt,
        source: "game",
        status: "pending_claim"
      }
    }
  };
}

export function claimGameStake(
  state: PlayerState,
  issuanceId: string,
  holderName: string,
  claimedAt = new Date().toISOString()
): PlayerState {
  const issuance = Object.values(state.issuedStakes).find(item => item.id === issuanceId);
  if (!issuance || issuance.status === "claimed" || !holderName.trim()) return state;
  return {
    ...state,
    issuedStakes: {
      ...state.issuedStakes,
      [issuance.cardId]: { ...issuance, status: "claimed", claimedBy: holderName.trim(), claimedAt }
    },
    coupons: [{
      id: createId("coupon"),
      displayNo: String(state.coupons.length + 1).padStart(3, "0"),
      title: issuance.title,
      subtitle: `来自「${issuance.cardTitle}」 · ${issuance.issuerName}签发`,
      side: "won",
      tone: "coral-coupon",
      status: "available",
      source: "game",
      sourceNote: `来自「${issuance.cardTitle}」`,
      issuerName: issuance.issuerName,
      holderName: holderName.trim(),
      signature: issuance.signature,
      issuedAt: issuance.issuedAt,
      claimedAt
    }, ...state.coupons]
  };
}

export function issueDirectBenefit(
  state: PlayerState,
  title: string,
  issuerName: string,
  signature: Signature,
  sourceNote = "手动签发",
  issuedAt = new Date().toISOString(),
  issuanceId = createId("benefit")
): PlayerState {
  if (!title.trim() || !signature.length) return state;
  return {
    ...state,
    issuedBenefits: {
      ...state.issuedBenefits,
      [issuanceId]: {
        id: issuanceId,
        title: title.trim(),
        issuerName,
        signature,
        issuedAt,
        source: "direct",
        sourceNote: sourceNote.trim() || "手动签发",
        status: "pending_claim"
      }
    }
  };
}

export function claimDirectBenefit(
  state: PlayerState,
  issuanceId: string,
  holderName: string,
  claimedAt = new Date().toISOString()
): PlayerState {
  const issuance = state.issuedBenefits[issuanceId];
  if (!issuance || issuance.status === "claimed" || !holderName.trim()) return state;
  return {
    ...state,
    issuedBenefits: {
      ...state.issuedBenefits,
      [issuanceId]: { ...issuance, status: "claimed", claimedBy: holderName.trim(), claimedAt }
    },
    coupons: [{
      id: createId("coupon"),
      displayNo: String(state.coupons.length + 1).padStart(3, "0"),
      title: issuance.title,
      subtitle: `${issuance.issuerName}签发 · 独立权益`,
      side: "won",
      tone: "coral-coupon",
      status: "available",
      source: "direct",
      sourceNote: issuance.sourceNote,
      issuerName: issuance.issuerName,
      holderName: holderName.trim(),
      signature: issuance.signature,
      issuedAt: issuance.issuedAt,
      claimedAt
    }, ...state.coupons]
  };
}

export function redeemCoupon(state: PlayerState, couponId: string, redeemedAt = new Date().toISOString()): PlayerState {
  return { ...state, coupons: state.coupons.map(c => c.id === couponId && c.status === "available" ? { ...c, status: "redeemed", redeemedAt } : c) };
}
