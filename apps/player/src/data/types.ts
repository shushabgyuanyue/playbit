export type CardTone = "coral" | "violet" | "lime";
export type CardGameplayId = string;
export type CardMedia =
  | { kind: "image"; src: string; alt: string }
  | { kind: "audio"; src: string; title: string; duration: string }
  | { kind: "video"; src: string; poster: string; title: string };
export interface CardFlow {
  countdownSeconds?: number;
  result?: string;
}
export interface CardSponsor { name: string; disclosure: "活动示例" | "广告示例"; note: string }
export interface GameCard {
  id: string;
  gameplayId?: CardGameplayId;
  label: string;
  prompt: string;
  kicker: string;
  rule: string;
  time: string;
  color: CardTone;
  moment: string;
  payoff: string;
  action: string;
  sceneIds: string[];
  textStyle?: "quote";
  media?: CardMedia;
  flow?: CardFlow;
  steps?: string[];
  note?: string;
  reveal?: { question: string; answer: string };
  sponsor?: CardSponsor;
}
export interface Scene { id: string; title: string; icon: "date" | "friends" | "hello" | "moon" | "home" | "clock" | "utensils" | "store" | "spark" | "question" }
export interface Deck { id: string; name: string; cardIds: string[] }
export type Point = { x: number; y: number };
export type Signature = Point[][];
export type Party = "a" | "b";
export type CouponSource = "game" | "promise" | "direct";
export type CouponStatus = "available" | "redeemed";

export interface VoiceNote {
  id: string;
  durationMs: number;
  storage: "demo" | "indexeddb";
  assetId?: string;
  mimeType?: string;
  byteLength?: number;
}

export interface StakeRecord {
  cardId: string;
  title: string;
  createdAt: string;
}

export interface BenefitIssuance {
  id: string;
  title: string;
  issuerName: string;
  signature: Signature;
  voice?: VoiceNote;
  issuedAt: string;
  source: CouponSource;
  sourceNote?: string;
  status: "pending_claim" | "claimed" | "unavailable";
  claimedBy?: string;
  claimedAt?: string;
  claimToken?: string;
  remoteId?: string;
}

export interface GameStakeIssuance extends BenefitIssuance {
  id: string;
  cardId: string;
  cardTitle: string;
  source: "game";
}
export interface Agreement {
  id: string;
  text: string;
  benefit: string;
  challengeVoice?: VoiceNote;
  benefitVoice?: VoiceNote;
  signatures: Record<Party, Signature>;
  createdAt: string;
  winner: Party | null;
  shareCode?: string;
}
export interface Coupon {
  id: string;
  displayNo?: string;
  title: string;
  subtitle: string;
  side: "won";
  tone: "coral-coupon" | "dark-coupon" | "debt-ticket" | "violet-ticket";
  status: CouponStatus;
  source: CouponSource;
  sourceNote?: string;
  agreementId?: string;
  issuerName?: string;
  holderName?: string;
  signature?: Signature;
  voice?: VoiceNote;
  issuedAt?: string;
  claimedAt?: string;
  redeemedAt?: string;
}
export interface PromiseDraft {
  text: string;
  benefit: string;
  challengeVoice: VoiceNote;
  benefitVoice: VoiceNote;
  signatures: Record<Party, Signature>;
  step: 0 | 1 | 2 | 3;
  agreementId: string | null;
  winner: Party | null;
}
export interface PlayerState {
  version: 1;
  profileName: string;
  sceneId: string;
  deckId: string | null;
  cardId: string;
  decks: Deck[];
  stakes: Record<string, string>;
  stakeVoices: Record<string, VoiceNote>;
  stakeRecords: Record<string, StakeRecord>;
  issuedStakes: Record<string, GameStakeIssuance>;
  issuedBenefits: Record<string, BenefitIssuance>;
  draft: PromiseDraft;
  agreements: Agreement[];
  coupons: Coupon[];
}
