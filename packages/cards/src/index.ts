import type { Card } from "@playbit/shared";

export const dailyCards: Card[] = [
  {
    id: "rule-no-whatever",
    name: "随便禁止令",
    category: "rule",
    sceneTags: ["date", "walk", "meal"],
    participantMin: 2,
    participantMax: 8,
    durationMinutes: 10,
    content: "从现在开始 10 分钟内，谁先说出“随便”就触发本轮约定。",
    winCondition: "第一个说出禁词的人承担本轮权益；无人触发则平局或进入下一张。",
    mechanism: "禁词规则",
    enabled: true
  },
  {
    id: "hidden-jay",
    name: "暗线点歌",
    category: "hidden",
    sceneTags: ["date", "party", "walk"],
    participantMin: 2,
    participantMax: 4,
    durationMinutes: 20,
    content: "秘密任务：在 20 分钟内，让对方主动提到一位你指定的歌手。",
    winCondition: "对方主动说出歌手名，持有任务者达成本轮挑战。",
    mechanism: "隐藏任务",
    enabled: true
  },
  {
    id: "challenge-five-yuan-joy",
    name: "五元快乐",
    category: "challenge",
    sceneTags: ["walk", "travel", "date"],
    participantMin: 1,
    participantMax: 4,
    durationMinutes: 15,
    content: "去附近找到一个 5 元以内、但能让今天变快乐一点的小东西。",
    winCondition: "多人时，大家投票选出最让人快乐的选择；单人时完成即胜。",
    mechanism: "寻物挑战",
    enabled: true
  },
  {
    id: "magic-double-next",
    name: "下一局翻倍",
    category: "magic",
    sceneTags: ["party", "date", "family"],
    participantMin: 2,
    participantMax: 8,
    durationMinutes: null,
    content: "下一局的奖励或惩罚翻倍。所有人确认后生效。",
    winCondition: "这张卡改变下一局规则，本轮不直接产生结果。",
    mechanism: "奖励翻倍",
    enabled: true
  },
  {
    id: "challenge-phone-check",
    name: "别看手机",
    category: "challenge",
    sceneTags: ["meal", "date", "family"],
    participantMin: 2,
    participantMax: 6,
    durationMinutes: 10,
    content: "未来 10 分钟，谁先主动解锁手机就触发本轮约定。",
    winCondition: "第一个主动解锁手机的人承担本轮权益；紧急电话可由大家共同豁免。",
    mechanism: "限时自控",
    enabled: true
  },
  {
    id: "rule-decision-swap",
    name: "决定权交换",
    category: "rule",
    sceneTags: ["meal", "travel", "date"],
    participantMin: 2,
    participantMax: 4,
    durationMinutes: 15,
    content: "接下来一次需要做选择时，由平时更少做决定的人拍板。",
    winCondition: "选择被执行即完成；若对方反悔，对方承担本轮权益。",
    mechanism: "角色交换",
    enabled: true
  }
];

export function drawCard(previousIds: string[] = [], includeMagic = false): Card {
  const pool = dailyCards.filter(
    (card) => card.enabled && !previousIds.includes(card.id) && (includeMagic || card.category !== "magic")
  );
  const candidates = pool.length > 0 ? pool : dailyCards.filter((card) => card.enabled);
  return candidates[Math.floor(Math.random() * candidates.length)];
}
