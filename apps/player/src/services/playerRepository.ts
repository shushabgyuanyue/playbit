import { cards, createInitialState, demoVoice } from "../data/demo";
import { EXPLORE_SCENE_ID } from "../data/catalog";
import type { PlayerState } from "../data/types";

export const STORAGE_KEY = "playbit:player:prototype:v1";

function normalizeStakeRecords(value: PlayerState) {
  const records = value.stakeRecords && typeof value.stakeRecords === "object" ? value.stakeRecords : {};
  const valid = Object.fromEntries(Object.entries(records).filter(([cardId, record]) => record && record.cardId === cardId && typeof record.title === "string" && Number.isFinite(Date.parse(record.createdAt))));
  const createdAt = new Date().toISOString();
  return Object.fromEntries(Object.entries(value.stakes).filter(([, title]) => typeof title === "string" && title.trim()).map(([cardId, title]) => [cardId, valid[cardId] ?? { cardId, title, createdAt }]));
}

export function decodeState(raw: string | null): PlayerState {
  if (!raw) return createInitialState();
  try {
    const value = JSON.parse(raw) as PlayerState;
    if (value.version !== 1 || !Array.isArray(value.decks) || !Array.isArray(value.agreements) || !Array.isArray(value.coupons)) return createInitialState();
    if (typeof value.profileName !== "string" || typeof value.sceneId !== "string" || !cards.some(c => c.id === value.cardId)) return createInitialState();
    const draftStep = value.draft?.step;
    if (!value.draft || ![0, 1, 2, 3].includes(draftStep) || typeof value.draft.text !== "string" || typeof value.draft.benefit !== "string") return createInitialState();
    if (![value.draft.signatures?.a, value.draft.signatures?.b].every(Array.isArray) || !value.stakes || typeof value.stakes !== "object" || Object.values(value.stakes).some(title => typeof title !== "string")) return createInitialState();
    if (value.decks.some(d => !d || typeof d.id !== "string" || typeof d.name !== "string" || !Array.isArray(d.cardIds) || d.cardIds.some(id => typeof id !== "string"))) return createInitialState();
    if (value.coupons.some(c => !c || typeof c.id !== "string" || typeof c.title !== "string" || c.side !== "won" || !["available", "redeemed"].includes(c.status))) return createInitialState();
    if (value.issuedBenefits && (typeof value.issuedBenefits !== "object" || Object.values(value.issuedBenefits).some(item => !item || typeof item.id !== "string" || typeof item.title !== "string" || typeof item.issuerName !== "string" || !Array.isArray(item.signature) || !["direct", "promise", "game"].includes(item.source) || !["pending_claim", "claimed", "unavailable"].includes(item.status)))) return createInitialState();
    if (value.agreements.some(a => !a || typeof a.id !== "string" || typeof a.text !== "string" || typeof a.benefit !== "string" || !Number.isFinite(Date.parse(a.createdAt)) || !Array.isArray(a.signatures?.a) || !Array.isArray(a.signatures?.b))) return createInitialState();
    if (value.draft.step >= 2 && !value.agreements.some(a => a.id === value.draft.agreementId)) return createInitialState();
    return {
      ...value,
      sceneId: value.sceneId === "mystery" ? EXPLORE_SCENE_ID : value.sceneId,
      // Step 3 is benefit issuance. Older saved sessions already used this step
      // after issuance, so keep it and render the issuance page.
      draft: {
        ...value.draft,
        step: draftStep as PlayerState["draft"]["step"],
        challengeVoice: value.draft.challengeVoice ?? demoVoice(value.draft.text, "challenge"),
        benefitVoice: value.draft.benefitVoice ?? demoVoice(value.draft.benefit, "benefit")
      },
      agreements: value.agreements.map(agreement => ({
        ...agreement,
        challengeVoice: agreement.challengeVoice ?? demoVoice(agreement.text, "challenge"),
        benefitVoice: agreement.benefitVoice ?? demoVoice(agreement.benefit, "benefit")
      })),
      stakeVoices: value.stakeVoices && typeof value.stakeVoices === "object" ? value.stakeVoices : {},
      stakeRecords: normalizeStakeRecords(value),
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
