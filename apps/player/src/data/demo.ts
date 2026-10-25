import { playerCopy as copy } from "@playbit/content/player";
import type { GameCard, PlayerState, PromiseDraft, Scene } from "./types";

export const cards: GameCard[] = [
  { id: "truth", label: "暧昧升温", prompt: "如果今晚只能对我说一句真话——", kicker: "你敢说哪句？", rule: "轮流直视对方 10 秒，然后说出此刻最想让对方知道的一件事。也可以选择换个问题。", time: "3 MIN", color: "coral", moment: "两个人 · 气氛刚刚好", payoff: "让一句没说出口的话，被认真听见", action: "先安静对视 10 秒", sceneIds: ["date", "night"] },
  { id: "point", label: "朋友局", prompt: "在场谁最可能", kicker: "偷偷谈恋爱不官宣？", rule: "倒数三秒后所有人同时指向一个人。票数最高的人，可以分享最近一次心动瞬间。", time: "5 MIN", color: "violet", moment: "三人以上 · 开始有点放不开", payoff: "用一次集体起哄，快速拉近距离", action: "所有人同时指向一个人", sceneIds: ["friends", "hello", "family"] },
  { id: "memory", label: "默契测试", prompt: "闭上眼睛，", kicker: "同时说出第一次见面的印象。", rule: "两人背对背，在倒数后同时回答。答案相似就击掌，不同则各自追问一个细节。", time: "4 MIN", color: "lime", moment: "熟悉彼此 · 想验证默契", payoff: "重新发现你们记忆里的同一刻", action: "背对背准备，同时回答", sceneIds: ["date", "friends", "night", "family"] }
];
export const scenes: Scene[] = [
  { id: "date", title: "情侣约会", icon: "date" },
  { id: "friends", title: "朋友聚会", icon: "friends" },
  { id: "hello", title: "初次见面", icon: "hello" },
  { id: "night", title: "深夜聊天", icon: "moon" },
  { id: "family", title: "家庭聚餐", icon: "home" }
];
export const emptyDraft = (): PromiseDraft => ({ text: "", benefit: "", signatures: { a: [], b: [] }, step: 0, agreementId: null, winner: null });
const sampleSignature = [[{ x: 0.08, y: 0.62 }, { x: 0.24, y: 0.3 }, { x: 0.38, y: 0.65 }, { x: 0.54, y: 0.34 }, { x: 0.72, y: 0.58 }]];
export const createInitialState = (): PlayerState => ({
  version: 1, profileName: copy.profile.defaultName, sceneId: "date", deckId: null, cardId: "truth",
  decks: [{ id: "date-deck", name: "约会灵感", cardIds: ["truth"] }, { id: "friend-deck", name: "不尴尬破冰", cardIds: ["point"] }],
  stakes: {}, issuedStakes: {}, issuedBenefits: {}, draft: emptyDraft(), agreements: [],
  coupons: [
    { id: "sample-drink", displayNo: "677A4DF7", title: "一杯你选的饮料", subtitle: "来自「谁更懂谁」挑战", side: "won", tone: "coral-coupon", status: "available", source: "game", sourceNote: "「谁更懂谁」挑战", issuerName: "林", signature: sampleSignature, issuedAt: "2026-10-25T10:20:00.000Z" },
    { id: "sample-breakfast", displayNo: "8A12D903", title: "周末早餐券", subtitle: "赌约双方已签订", side: "won", tone: "dark-coupon", status: "available", source: "promise", sourceNote: "线下签署的赌约", issuerName: "J", signature: sampleSignature, issuedAt: "2026-10-24T15:40:00.000Z" },
    { id: "sample-hug", displayNo: "C0FFEE04", title: "无条件拥抱 30 秒", subtitle: "留下一次拥抱的记录", side: "won", tone: "dark-coupon", status: "redeemed", source: "promise", sourceNote: "「谁先笑」赌约", issuerName: "林", signature: sampleSignature, issuedAt: "2026-10-20T12:10:00.000Z", redeemedAt: "2026-10-21T18:30:00.000Z" }
  ]
});
