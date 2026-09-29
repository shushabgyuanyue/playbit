import type { CreateL1Input, CreateL2Input, CreateVersionInput } from "./contentRepository.js";

type CuratedDraftSeed = {
  l1: CreateL1Input;
  l2: Omit<CreateL2Input, "l1Id">;
  version: CreateVersionInput;
};

const source = "playbit_cards_rating_curated_v4.xlsx / 游戏卡评分";

export const curatedDraftSeeds: CuratedDraftSeed[] = [
  {
    l1: { code: "hit-palm", name: "打手心", l0Ids: ["l0-sensory-action"], minPlayers: 2, maxPlayers: 2, durationMin: 2, durationMax: 3, outcomeModel: "self_reported_winner", tags: ["动作", "对战"] },
    l2: { title: "打手心", contentType: "prompt", qualityTier: 86, sourceMode: "human", reusePolicy: { cooldownRounds: 30, cooldownDays: 0, permanentExhaustion: false, skipCooldownRounds: 1 }, payload: { content: "一人手掌朝上，另一人把手盖在上面。下面的人突然翻手向上打，上面的人及时躲开；打中得 1 分，轮换角色。", mode: "versus", category: "challenge", tone: "coral", source, sourceRow: 7, sourceNote: "无需内容和道具，动作反馈直接，适合短局对战。" } },
    version: { shortRule: "一人手掌朝上，另一人把手盖在上面。下面的人突然翻手向上打，上面的人及时躲开；打中得 1 分，轮换角色。", completionCondition: "三局两胜，或先得到 3 分者获胜。", failureCondition: "未及时躲开并被打中。", displayHook: "你躲得开，还是先挨一下？", toolIds: [], changeNote: `首批表格导入；来源行 7。` }
  },
  {
    l1: { code: "wrong-answers-only-curated", name: "只许答错", l0Ids: ["l0-constraint"], minPlayers: 2, maxPlayers: 2, durationMin: 2, durationMax: 3, outcomeModel: "self_reported_winner", tags: ["语言", "对战"] },
    l2: { title: "只许答错", contentType: "prompt", qualityTier: 86, sourceMode: "human", reusePolicy: { cooldownRounds: 30, cooldownDays: 0, permanentExhaustion: false, skipCooldownRounds: 1 }, payload: { content: "连续回答对方的问题，但绝对不能答对；答对或停顿超过 3 秒就输。", mode: "versus", category: "challenge", tone: "coral", source, sourceRow: 8, sourceNote: "规则一秒懂，题目可由玩家现场提供，失误反馈清楚。" } },
    version: { shortRule: "连续回答对方的问题，但绝对不能答对；答对或停顿超过 3 秒就输。", completionCondition: "一方先答对、停顿或重复答案即结束。", failureCondition: "答对、停顿超过 3 秒，或重复之前的错误答案。", displayHook: "知道答案，也不能说对。", toolIds: ["tool-timer"], changeNote: "首批表格导入；来源行 8。" }
  },
  {
    l1: { code: "category-retrieval-curated", name: "说不上来就输", l0Ids: ["l0-retrieval"], minPlayers: 2, maxPlayers: 6, durationMin: 3, durationMax: 5, outcomeModel: "self_reported_winner", tags: ["检索", "对战"] },
    l2: { title: "说不上来就输", contentType: "prompt", qualityTier: 86, sourceMode: "human", reusePolicy: { cooldownRounds: 30, cooldownDays: 0, permanentExhaustion: false, skipCooldownRounds: 1 }, payload: { content: "轮流说出符合条件的答案，3 秒内说不上来、重复或说错就输。类别可以现场约定，例如三个字的明星、火锅里能煮的东西。", mode: "versus", category: "challenge", tone: "gold", source, sourceRow: 9, sourceNote: "轻量、胜负明确；题目质量是内容增强项，不是开局前置条件。" } },
    version: { shortRule: "轮流说出符合条件的答案，3 秒内说不上来、重复或说错就输。", completionCondition: "一方超时、重复或说错时结束。", failureCondition: "3 秒内没有给出符合类别且未重复的答案。", displayHook: "明明知道，偏偏这次想不起来。", toolIds: ["tool-timer"], changeNote: "首批表格导入；来源行 9。" }
  },
  {
    l1: { code: "three-character-reply", name: "只能说三个字", l0Ids: ["l0-constraint"], minPlayers: 2, maxPlayers: 2, durationMin: 3, durationMax: 5, outcomeModel: "self_reported_winner", tags: ["语言", "纯玩"] },
    l2: { title: "只能说三个字", contentType: "prompt", qualityTier: 84, sourceMode: "human", reusePolicy: { cooldownRounds: 30, cooldownDays: 0, permanentExhaustion: false, skipCooldownRounds: 1 }, payload: { content: "接下来所有回答必须刚好三个字，多一个、少一个都算输。", mode: "versus", category: "rule", tone: "blue", source, sourceRow: 12, sourceNote: "无需辅助，笑点来自自然失误；需要约定回合数避免无限进行。" } },
    version: { shortRule: "接下来所有回答必须刚好三个字，多一个、少一个都算输。", completionCondition: "完成约定回合，或一方说出不是三个字的回答。", failureCondition: "回答超过或少于三个字。", displayHook: "今天，每句话都得刚刚好。", toolIds: [], changeNote: "首批表格导入；来源行 12。" }
  },
  {
    l1: { code: "three-statements-one-lie", name: "三句话，一句假的", l0Ids: ["l0-mind"], minPlayers: 2, maxPlayers: 2, durationMin: 4, durationMax: 6, outcomeModel: "self_reported_winner", tags: ["判断", "社交"] },
    l2: { title: "三句话，一句假的", contentType: "prompt", qualityTier: 88, sourceMode: "human", reusePolicy: { cooldownRounds: 30, cooldownDays: 0, permanentExhaustion: false, skipCooldownRounds: 1 }, payload: { content: "说三件关于自己的事，其中两件是真的、一件是编的；对方只能猜一次。", mode: "versus", category: "challenge", tone: "blue", source, sourceRow: 22, sourceNote: "结构简单，人与人的差异直接成为内容；复玩依赖新的个人经历。" } },
    version: { shortRule: "说三件关于自己的事，其中两件是真的、一件是编的；对方只能猜一次。", completionCondition: "双方各完成一次出题和猜测，按猜中次数记录结果。", failureCondition: null, displayHook: "本人提供，未必属实。", toolIds: [], changeNote: "首批表格导入；来源行 22。" }
  },
  {
    l1: { code: "more-items-bid", name: "我能说出更多", l0Ids: ["l0-retrieval"], minPlayers: 2, maxPlayers: 2, durationMin: 3, durationMax: 5, outcomeModel: "self_reported_winner", tags: ["竞价", "对战"] },
    l2: { title: "我能说出更多", contentType: "prompt", qualityTier: 87, sourceMode: "human", reusePolicy: { cooldownRounds: 30, cooldownDays: 0, permanentExhaustion: false, skipCooldownRounds: 1 }, payload: { content: "围绕一个主题轮流加价“我能说出 N 个”，对方随时可以喊“那你说”；被挑战的一方必须在现场说满自己的数字。", mode: "versus", category: "challenge", tone: "gold", source, sourceRow: 42, sourceNote: "互动和压力都强；题目可由玩家约定，不依赖系统题库。" } },
    version: { shortRule: "围绕一个主题轮流加价“我能说出 N 个”，对方随时可以喊“那你说”。", completionCondition: "被挑战的一方说不满所报数量时结束，挑战成功者获胜。", failureCondition: "在约定时间内无法说出自己报出的数量。", displayHook: "你说你能？那现在就说。", toolIds: [], changeNote: "首批表格导入；来源行 42。" }
  },
  {
    l1: { code: "memory-stacking", name: "记忆叠罗汉", l0Ids: ["l0-accumulation"], minPlayers: 2, maxPlayers: 6, durationMin: 3, durationMax: 5, outcomeModel: "self_reported_winner", tags: ["记忆", "对战"] },
    l2: { title: "记忆叠罗汉", contentType: "sequence", qualityTier: 88, sourceMode: "human", reusePolicy: { cooldownRounds: 30, cooldownDays: 0, permanentExhaustion: false, skipCooldownRounds: 1 }, payload: { content: "第一人说一个词，下一人必须完整重复前面所有词，再加一个新的；忘记、顺序错或重复就输。", mode: "versus", category: "challenge", tone: "blue", source, sourceRow: 43, sourceNote: "累积难度自然增长，反馈即时；建议限制长度以控制疲劳。" } },
    version: { shortRule: "第一人说一个词，下一人必须完整重复前面所有词，再加一个新的。", completionCondition: "一方忘记、顺序错误或重复时结束。", failureCondition: "不能完整复述已有词语，或加入已经出现过的词。", displayHook: "记得住前面的，才接得住下一句。", toolIds: [], changeNote: "首批表格导入；来源行 43。" }
  }
];
