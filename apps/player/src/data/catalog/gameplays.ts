// Research lineage stays outside the user-facing card model.
export const gameplays = {
  "hit-palm": { name: "打手心", l0: ["感知动作博弈"], source: "contentSeeds / hit-palm" },
  "wrong-answers": { name: "只许答错", l0: ["约束冲突"], source: "contentSeeds / wrong-answers-only-curated" },
  "category-relay": { name: "分类接龙", l0: ["检索枯竭"], source: "contentSeeds / category-retrieval-curated" },
  "three-words": { name: "只能说三个字", l0: ["约束冲突"], source: "contentSeeds / three-character-reply" },
  "one-lie": { name: "三句话一句假", l0: ["信息缺口", "自我揭示"], source: "contentSeeds / three-statements-one-lie" },
  "category-bid": { name: "我能说出更多", l0: ["心智博弈", "检索枯竭"], source: "contentSeeds / more-items-bid" },
  "memory-chain": { name: "记忆叠罗汉", l0: ["累积负荷"], source: "contentSeeds / memory-stacking" },
  "no-laugh": { name: "谁先笑谁输", l0: ["约束冲突", "自我揭示"], source: "cards.ts / 谁先笑谁输" },
  "reverse-command": { name: "反口令", l0: ["约束冲突", "感知动作博弈"], source: "游戏卡评分 / 5" },
  "no-keyword": { name: "禁字聊天", l0: ["约束冲突"], source: "游戏卡评分 / 15" },
  "same-answer": { name: "撞答案", l0: ["心智博弈", "自我揭示"], source: "游戏卡评分 / 17" },
  "one-word-clue": { name: "一个词猜答案", l0: ["信息缺口", "联想重构"], source: "游戏卡评分 / 24" },
  "sound-only": { name: "只准拟声", l0: ["约束冲突", "联想重构"], source: "游戏卡评分 / 27" },
  "common-ground": { name: "它们有什么共同点", l0: ["联想重构"], source: "游戏卡评分 / 38" },
  "story-relay": { name: "一句话接故事", l0: ["共创接力"], source: "游戏卡评分 / 44、45、46" },
  "visual-memory": { name: "看后回忆", l0: ["信息缺口", "累积负荷"], source: "记忆机制的图像与动态题面变体" },
  "sound-relay": { name: "听觉接力", l0: ["感知动作博弈", "累积负荷"], source: "记忆叠罗汉的听觉变体" },
  "picture-dub": { name: "看图配音", l0: ["联想重构", "共创接力"], source: "一句话接故事的图片变体" },
  "yes-no": { name: "是或不是", l0: ["信息缺口"], source: "contentSeeds / yes-no-person-mysteries" }
} as const;
export type GameplayId = keyof typeof gameplays;
