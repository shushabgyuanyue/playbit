import { cards, createInitialState } from "../data/demo";
import type { PlayerState } from "../data/types";

export const STORAGE_KEY = "playbit:player:prototype:v1";

export function decodeState(raw: string | null): PlayerState {
  if (!raw) return createInitialState();
  try {
    const value = JSON.parse(raw) as PlayerState;
    if (value.version !== 1 || !Array.isArray(value.decks) || !Array.isArray(value.agreements) || !Array.isArray(value.coupons)) return createInitialState();
    if (typeof value.profileName !== "string" || typeof value.sceneId !== "string" || !cards.some(c => c.id === value.cardId)) return createInitialState();
    if (!value.draft || ![0, 1, 2, 3].includes(value.draft.step) || typeof value.draft.text !== "string" || typeof value.draft.benefit !== "string") return createInitialState();
    if (![value.draft.signatures?.a, value.draft.signatures?.b].every(Array.isArray) || !value.stakes || typeof value.stakes !== "object") return createInitialState();
    if (value.decks.some(d => !d || typeof d.id !== "string" || typeof d.name !== "string" || !Array.isArray(d.cardIds) || d.cardIds.some(id => typeof id !== "string"))) return createInitialState();
    if (value.coupons.some(c => !c || typeof c.id !== "string" || typeof c.title !== "string" || c.side !== "won" || !["available", "redeemed"].includes(c.status))) return createInitialState();
    if (value.issuedBenefits && (typeof value.issuedBenefits !== "object" || Object.values(value.issuedBenefits).some(item => !item || typeof item.id !== "string" || typeof item.title !== "string" || typeof item.issuerName !== "string" || !Array.isArray(item.signature) || !["direct", "promise", "game"].includes(item.source) || !["pending_claim", "claimed"].includes(item.status)))) return createInitialState();
    if (value.agreements.some(a => !a || typeof a.id !== "string" || typeof a.text !== "string" || typeof a.benefit !== "string" || !Number.isFinite(Date.parse(a.createdAt)) || !Array.isArray(a.signatures?.a) || !Array.isArray(a.signatures?.b))) return createInitialState();
    if (value.draft.step >= 2 && !value.agreements.some(a => a.id === value.draft.agreementId)) return createInitialState();
    return {
      ...value,
      issuedStakes: value.issuedStakes && typeof value.issuedStakes === "object" ? Object.fromEntries(Object.entries(value.issuedStakes).map(([cardId, issuance]) => [cardId, { ...issuance, source: "game" }])) : {},
      issuedBenefits: value.issuedBenefits && typeof value.issuedBenefits === "object" ? value.issuedBenefits : {},
      coupons: value.coupons
        .filter(coupon => coupon.side === "won")
        .map(coupon => ({
          ...coupon,
          source: coupon.source ?? (coupon.agreementId ? "promise" : "game")
        }))
    };
  } catch { return createInitialState(); }
}

export function readState(): PlayerState {
  try { return decodeState(localStorage.getItem(STORAGE_KEY)); }
  catch { return createInitialState(); }
}

export function writeState(state: PlayerState): boolean {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); return true; }
  catch { return false; }
}
