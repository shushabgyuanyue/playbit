import type { CardDraft } from "./types";

const yesNoRule = "轮流提问，只能用“是”或“不是”回答，先猜中谜底的人获胜。";
const yesNoSteps: [string, string, string] = [
  "一人先记住谜底，其他人轮流提问。",
  "每次只能问一个能用“是”或“不是”回答的问题。",
  "有人猜中就翻开谜底，换下一张继续。"
];

export const mysteryCards: CardDraft[] = [
  {
    id: "mystery-common-person", l1: "yes-no", title: "你们都认识的那个人", scenes: [], tone: "violet",
    intro: "你们在这个世界上认识的人，\n查重率是 90%。", headline: "你认识这个人吗？", hook: "从“是现场的人吗”开始问，别急着报名字。",
    goal: yesNoRule, steps: yesNoSteps, players: [3, 8], seconds: 180,
    adaptation: "把共同认识的人变成低门槛人物谜案，问题由玩家现场生成，答案在社交关系里自然收敛。",
    media: { kind: "image", src: "/media/cards/mystery-common.svg", alt: "三个人物头像被一圈共同关系连接" },
    reveal: { question: "谜底：你们共同认识的谁？", answer: "谜底由出题人开局指定：可以是某位同学、同事或朋友。先约定好，避免争议。" }
  },
  {
    id: "mystery-forgotten-person", l1: "yes-no", title: "很离谱，你一定认识", scenes: [], tone: "coral",
    intro: "很离谱，\n你一定认识。", headline: "就是想不起来他是谁。", hook: "从记忆里捞一个人，看看谁先把名字捞上来。",
    goal: yesNoRule, steps: yesNoSteps, players: [2, 6], seconds: 150,
    adaptation: "用“见过但叫不出名字”的共同记忆做题面，答案不靠知识库，只靠追问关系和场景。",
    media: { kind: "image", src: "/media/cards/mystery-forgotten.svg", alt: "门口站着一个只露出轮廓的人影" },
    reveal: { question: "谜底：刚才想不起的那个人", answer: "出题人提前在心里选一个你们都见过的人；不能选完全没人认识的陌生人。" }
  },
  {
    id: "mystery-variety-guest", l1: "yes-no", title: "综艺看多的人先赢", scenes: [], tone: "lime",
    intro: "据说经常看综艺的人，\n不出五次就能猜到她。", headline: "她是谁？", hook: "问题只能问五次，答案却不能靠蒙。",
    goal: yesNoRule, steps: yesNoSteps, players: [2, 6], seconds: 120,
    adaptation: "把熟悉的综艺人物变成五问限制，熟悉感提供爽点，提问顺序决定谁真的会猜。",
    media: { kind: "image", src: "/media/cards/mystery-variety.svg", alt: "聚光灯下的综艺舞台与两位人物" },
    reveal: { question: "谜底：她是谁？", answer: "示例谜底：谢娜。出题人也可以换成你们最近一起看过的综艺人物。" }
  },
  {
    id: "mystery-holmes", l1: "yes-no", title: "福尔摩斯上场", scenes: [], tone: "violet",
    intro: "你是福尔摩斯，\n正在接近真相。", headline: "别让他先说出答案。", hook: "每个问题都要更接近那个人，而不是绕圈。",
    goal: yesNoRule, steps: yesNoSteps, players: [2, 6], seconds: 180,
    adaptation: "把“接近真相”变成连续缩小范围的提问节奏，适合朋友局里轮流当侦探。",
    media: { kind: "image", src: "/media/cards/mystery-holmes.svg", alt: "放大镜、线索卡片和交叉连接的调查现场" },
    reveal: { question: "谜底：你正在追的人", answer: "示例谜底：现场最早拿起手机的人。出题人先记住目标，再接受是或不是提问。" }
  },
  {
    id: "mystery-alive-dead", l1: "yes-no", title: "既活着又死了", scenes: [], tone: "coral",
    intro: "有这么一个人，\n他即活着又死了。", headline: "这不是文字游戏。", hook: "问清楚他活在哪里，又死在哪里。",
    goal: yesNoRule, steps: yesNoSteps, players: [2, 6], seconds: 180,
    adaptation: "用一句矛盾命题制造期待，再把解释权交给玩家的连续追问，形成反转型人物谜案。",
    media: { kind: "image", src: "/media/cards/mystery-living-dead.svg", alt: "一张被明暗切成两半的人脸" },
    reveal: { question: "谜底：他怎么会同时活着和死了？", answer: "示例谜底：照片里的人活着，但照片记录的那个瞬间已经死了。" }
  },
  {
    id: "mystery-age", l1: "yes-no", title: "别暴露你的年龄", scenes: [], tone: "lime",
    intro: "别暴露你的年龄。", headline: "你猜得到她是谁吗？", hook: "知道的人会笑，不知道的人先从年代问起。",
    goal: yesNoRule, steps: yesNoSteps, players: [2, 8], seconds: 150,
    adaptation: "把代际记忆藏进人物谜案，答案不是冷知识，而是一起长大的人才会秒懂的暗号。",
    media: { kind: "image", src: "/media/cards/mystery-age.svg", alt: "复古电视和几件带有年代感的小物件" },
    reveal: { question: "谜底：她是谁？", answer: "示例谜底：小虎队时代的苏有朋。也可以替换成你们共同知道的童年人物。" }
  }
];
