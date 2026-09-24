import type {
  Card,
  CardCategory,
  CardIntensity,
  PlayTime,
  RelationTag
} from "@playbit/shared";

export type CardMechanismMotif = {
  id: string;
  name: string;
  family: string;
  sourceMechanisms: string[];
  coreTension: string;
  lifeTranslation: string;
  defaultDurationMinutes: number;
  suitableScenes: string[];
  suitableRelations: RelationTag[];
  aiRewriteHint: string;
};

type CardSeed = Omit<Card, "enabled">;

const relationSets = {
  close: ["couple", "family", "friends"] as RelationTag[],
  social: ["couple", "friends", "colleagues", "new_friends"] as RelationTag[],
  group: ["friends", "family", "colleagues", "new_friends"] as RelationTag[],
  solo: ["solo"] as RelationTag[]
};

type MotifRow = [
  string,
  string,
  string,
  string,
  string,
  string,
  number,
  string[],
  RelationTag[]
];

const motifRows: MotifRow[] = [
  ["hidden-information", "隐藏信息", "信息", "隐藏信息、秘密目标", "知道与不知道之间的落差", "把一个轻目标藏在日常对话里", 5, ["约会", "聚会"], relationSets.close],
  ["role-assignment", "身份分配", "信息", "身份、阵营", "不同身份带来不同目标", "为每个人分配一句只有本人知道的提示", 5, ["聚会", "破冰"], relationSets.group],
  ["majority-vote", "多数决定", "决策", "投票、多数表决", "个人偏好与群体决定的碰撞", "让大家同时选择，再按多数执行", 3, ["约会", "聚会"], relationSets.group],
  ["deduction", "有限信息推理", "信息", "推理、排除", "从有限线索中找出最合理解释", "给出一个生活线索，让对方猜测真实答案", 5, ["约会", "破冰"], relationSets.social],
  ["memory", "短时记忆", "观察", "记忆、回忆", "刚刚发生的细节是否被认真看见", "把刚刚看到或听到的内容变成一次小测验", 3, ["旅行", "散步"], relationSets.close],
  ["observation", "环境观察", "观察", "观察、发现", "熟悉环境里藏着多少被忽略的细节", "从眼前环境找出一个符合条件的对象", 5, ["旅行", "散步"], relationSets.social],
  ["simultaneous-choice", "同时选择", "决策", "同时行动、预测", "不沟通时能否做出一致选择", "双方同时写下选择，再一起揭晓", 3, ["约会", "破冰"], relationSets.close],
  ["prediction", "结果预测", "决策", "预测、概率", "对即将发生的小事做一个明确判断", "预测接下来几分钟里最可能发生的事情", 5, ["日常", "旅行"], relationSets.social],
  ["matching", "默契匹配", "关系", "配对、共识", "彼此理解是否足以得到同一个答案", "双方分别回答同一个生活问题", 5, ["约会", "朋友"], relationSets.close],
  ["forced-choice", "选择压力", "决策", "二选一、取舍", "每个选择都要放弃另一个选择", "在真实选项中快速做一个不回头的选择", 3, ["约会", "旅行"], relationSets.social],
  ["exchange", "资源交换", "交易", "交换、资源", "有限资源应该如何分配", "用时间、决定权或小权益交换一次行动", 5, ["约会", "聚会"], relationSets.close],
  ["auction", "报价竞合", "交易", "竞价、报价", "愿意为一个目标付出多少", "用生活中的小代价竞得一次选择权", 5, ["聚会", "约会"], relationSets.group],
  ["push-your-luck", "风险推进", "风险", "Push Your Luck、风险回报", "继续一步可能更好，也可能失去已有结果", "每完成一步都可以选择继续或收手", 5, ["聚会", "旅行"], relationSets.group],
  ["collection", "集合收集", "资源", "收集、套组", "凑齐一组小目标的满足感", "在当前环境中收集三个不同类别的对象", 8, ["旅行", "散步"], relationSets.social],
  ["pairing", "配对", "关系", "配对、互补", "两个看似不同的对象能否组成合理组合", "为两个人或两个物件找到一组解释", 5, ["约会", "聚会"], relationSets.close],
  ["ranking", "共同排序", "决策", "排序、偏好", "不同偏好如何形成一个共同顺序", "各自排序三个选项，再协商最终顺序", 5, ["约会", "朋友"], relationSets.close],
  ["route-choice", "路线选择", "空间", "路线、目的地", "把决定权交出去后的未知感", "由一个人给出目的地，另一个人选择路线", 8, ["散步", "旅行"], relationSets.close],
  ["communication-limit", "限制沟通", "沟通", "限制沟通、禁词", "表达变得困难后，理解是否仍然成立", "短时间内禁用一个常用词或表达方式", 5, ["约会", "聚会"], relationSets.social],
  ["cooperative-limit", "合作限制", "合作", "合作、限制", "共同目标与个人限制同时存在", "双方只能使用有限的表达完成一件小事", 5, ["破冰", "朋友"], relationSets.social],
  ["race", "轻竞速", "行动", "竞速、先手", "谁先完成一个清晰的小目标", "把一项本来就要完成的动作变成轻竞速", 3, ["聚会", "散步"], relationSets.group],
  ["reaction", "即时反应", "行动", "反应、先手", "注意力和反应速度的短暂较量", "出现约定信号时，最先完成动作的人获得结果", 3, ["聚会", "朋友"], relationSets.group],
  ["role-reversal", "角色互换", "关系", "角色交换、视角", "换一个位置看同一件小事", "双方交换一次决定权或表达方式", 5, ["约会", "家庭"], relationSets.close],
  ["persuasion", "有限说服", "沟通", "说服、论证", "一个选择能否被认真解释", "用三句话说服对方接受一个无害的小选择", 5, ["约会", "破冰"], relationSets.social],
  ["bluff", "真假判断", "信息", "虚张声势、真假", "听起来合理不代表一定真实", "说出两个事实和一个编造，让对方判断", 5, ["聚会", "破冰"], relationSets.group],
  ["story-association", "叙事联想", "表达", "联想、叙事", "一个词如何把人带回另一段记忆", "用眼前物件联想到一段简短故事", 5, ["约会", "朋友"], relationSets.close],
  ["imitation", "轻模仿", "表达", "模仿、表演", "熟悉的人是否能准确复现彼此的习惯", "模仿一个无负担的动作或口头禅", 3, ["聚会", "朋友"], relationSets.social],
  ["task-transfer", "任务转移", "规则", "目标转移、责任转移", "完成者与承担者可以不是同一个人", "把一个小行动交给更适合的人完成", 5, ["家庭", "聚会"], relationSets.close],
  ["double-reward", "奖励翻倍", "增强", "加倍、风险", "是否愿意为更高结果承担额外限制", "接受一个小限制，换取本轮权益提升", 5, ["聚会", "约会"], relationSets.group],
  ["rule-change", "临时规则", "增强", "规则改变、特殊规则", "熟悉流程被轻轻改变后的新鲜感", "为接下来几分钟增加一条明确规则", 5, ["日常", "聚会"], relationSets.social],
  ["private-answer", "延迟揭晓", "信息", "私密答案、同时揭晓", "答案先被保留，揭晓时才产生戏剧性", "双方先独立记录答案，再同时展示", 5, ["约会", "朋友"], relationSets.close],
  ["self-control", "限时自控", "自我挑战", "自控、持续时间", "能否克制一个下意识动作", "在短时间内克制一个常见习惯", 5, ["日常", "单人"], relationSets.solo],
  ["random-choice", "随机决定", "决策", "随机、决定权", "把一个小决定交给偶然", "从当前可行选项中随机选一个执行", 3, ["约会", "旅行"], relationSets.close],
  ["reversal", "结果反转", "增强", "反转、逆转", "已知结果仍可能被一个条件改变", "最后一个小条件可能改变本轮结果", 5, ["聚会", "朋友"], relationSets.group],
  ["milestone", "里程碑触发", "流程", "回合、里程碑", "生活节点成为下一次行动的信号", "到达一个现实节点后再决定是否继续", 5, ["旅行", "约会"], relationSets.social],
  ["solo-novelty", "惯性打破", "单人", "单人挑战、随机", "把一个普通决定交给未知", "今天做一件本来不会主动做的小事", 5, ["单人"], relationSets.solo]
];

export const cardMechanismMotifs: CardMechanismMotif[] = motifRows.map(([id, name, family, sourceMechanisms, coreTension, lifeTranslation, defaultDurationMinutes, suitableScenes, suitableRelations]) => ({
  id,
  name,
  family,
  sourceMechanisms: sourceMechanisms.split("、"),
  coreTension,
  lifeTranslation,
  defaultDurationMinutes,
  suitableScenes,
  suitableRelations,
  aiRewriteHint: `保持${name}的核心张力，用${lifeTranslation}改写为低负担日常挑战。`
}));

const motif = (id: string) => cardMechanismMotifs.find((item) => item.id === id)!;

function card(
  id: string,
  name: string,
  category: CardCategory,
  motifId: string,
  content: string,
  winCondition: string,
  options: Partial<Omit<CardSeed, "id" | "name" | "category" | "motifId" | "motifName" | "content" | "winCondition" | "mechanism" | "lifeHook" | "aiRewriteHint">> = {}
): CardSeed {
  const source = motif(motifId);
  const duration = options.durationMinutes ?? source.defaultDurationMinutes;
  return {
    id,
    name,
    category,
    motifId,
    motifName: source.name,
    sceneTags: options.sceneTags ?? source.suitableScenes,
    relationTags: options.relationTags ?? source.suitableRelations,
    participantMin: options.participantMin ?? 2,
    participantMax: options.participantMax ?? 2,
    durationMinutes: duration,
    playTime: options.playTime ?? (duration <= 3 ? "instant" : duration <= 5 ? "standard" : "extended"),
    intensity: options.intensity ?? "low",
    setupSeconds: options.setupSeconds ?? 15,
    content,
    winCondition,
    mechanism: source.family,
    lifeHook: source.lifeTranslation,
    aiRewriteHint: source.aiRewriteHint
  };
}

export const cardCatalog: Card[] = [
  card("rule-no-whatever", "暂时不要说“随便”", "rule", "communication-limit", "接下来 5 分钟，双方都不能说“随便”。需要表达选择时，必须给出一个具体答案。", "第一个说出“随便”的人承担本次权益。"),
  card("hidden-jay", "让对方想起一首歌", "hidden", "hidden-information", "在接下来 5 分钟里，悄悄引导对方主动提到一位歌手或一首歌，不要直接询问。", "先完成隐藏目标且不被识破的人达成挑战。", { relationTags: relationSets.close }),
  card("challenge-five-yuan-joy", "五元快乐提案", "challenge", "forced-choice", "在附近找一个 5 元以内、你觉得能让对方心情变好的东西，并说明理由。", "对方选择更喜欢的提案，提案被选中者达成挑战。", { durationMinutes: 8, sceneTags: ["散步", "旅行", "约会"] }),
  card("magic-double-next", "下一次权益加倍", "magic", "double-reward", "本轮接受一个额外的小限制，下一轮结算时权益效果翻倍。双方确认后生效。", "完成当前挑战并共同确认下一轮规则。"),
  card("challenge-phone-check", "谁先看手机", "challenge", "self-control", "把手机放在双方都看得见的位置，接下来 5 分钟内不要主动查看。", "第一个主动查看手机的人承担本次权益。"),
  card("rule-decision-swap", "把决定权交出去", "rule", "role-reversal", "接下来一个小决定由对方直接做主，执行者不得反复修改。", "双方完成决定并执行，发起交换的一方完成挑战。"),
  card("simultaneous-dessert", "同时写下想吃的", "challenge", "simultaneous-choice", "双方分别写下此刻最想吃的东西，倒数三秒后同时展示。", "答案相同或最接近的一方达成挑战。"),
  card("prediction-next-song", "下一首会是什么", "challenge", "prediction", "在播放下一首内容前，双方各自写下一个预测。", "更接近实际结果的一方达成挑战。", { sceneTags: ["日常", "约会"] }),
  card("matching-weekend", "周末想怎么过", "challenge", "matching", "双方分别写下周末最想做的一件小事，不提前讨论。", "答案一致则双方共同达成；不一致时，由更具体的一方获得决定权。"),
  card("majority-snack", "多数决定下一站", "rule", "majority-vote", "每个人同时在两个现实可行选项中做选择，按多数决定下一站。", "少数方接受结果并完成选择，发起投票的一方达成挑战。", { participantMax: 6, relationTags: relationSets.group, sceneTags: ["聚会", "旅行"] }),
  card("bluff-three-things", "三件事里有一件不是真的", "challenge", "bluff", "每个人说三件与自己有关的事，其中一件可以是临时编造的。", "其他人判断错误的人承担本次权益。", { participantMax: 6, relationTags: relationSets.group, sceneTags: ["聚会", "破冰"] }),
  card("memory-last-detail", "刚才那个细节", "challenge", "memory", "闭上眼回想刚才经过的地方，各自说出一个对环境的细节。", "说出可被现场验证细节的一方达成挑战。", { sceneTags: ["散步", "旅行"] }),
  card("observation-color", "找一个不常见的颜色", "challenge", "observation", "在接下来 5 分钟里，找到一个现场不常见但确实存在的颜色，并指出它。", "先找到并说明理由的人达成挑战。", { sceneTags: ["散步", "旅行"] }),
  card("ranking-three-places", "把三个地方排个序", "challenge", "ranking", "双方分别把眼前的三个可去地点按想去程度排序，再一起展示。", "排序更接近双方共同偏好的一方达成挑战。", { sceneTags: ["旅行", "约会"] }),
  card("route-without-question", "三分钟路线权", "rule", "route-choice", "由一方决定接下来三分钟的行走方向，另一方可以执行但不能追问目的。", "顺利走完三分钟且双方都愿意继续的一方达成挑战。", { durationMinutes: 5, sceneTags: ["散步", "旅行"] }),
  card("limited-three-sentences", "只用三句话说服", "challenge", "persuasion", "用不超过三句话说服对方接受一个无害的小选择。", "对方接受该选择的一方达成挑战。"),
  card("story-from-object", "给眼前物件一个故事", "challenge", "story-association", "从眼前任选一个物件，为它编一个不超过一分钟的小故事。", "对方选择更愿意继续听的故事，讲述者达成挑战。"),
  card("copy-a-small-habit", "复刻一个小习惯", "challenge", "imitation", "每个人选择对方一个无负担的小动作，准确复刻一次。", "被准确识别且本人确认的复刻达成挑战。", { sceneTags: ["约会", "朋友", "家庭"] }),
  card("cooperative-no-nouns", "不用名词完成一件事", "challenge", "cooperative-limit", "双方共同完成一个简单决定，但接下来 3 分钟不能说出具体人名、地名或物品名。", "顺利完成决定且没有触犯限制，双方共同达成挑战。", { durationMinutes: 5, sceneTags: ["约会", "聚会"] }),
  card("push-one-more", "再来一次还是收手", "challenge", "push-your-luck", "完成一个小目标后，可以选择立刻结束，也可以继续挑战一次更难的目标。", "选择继续并完成第二步的人获得更高结果；失败则本轮不计入。", { durationMinutes: 8, intensity: "medium" }),
  card("private-answer-food", "你觉得我想吃什么", "hidden", "private-answer", "双方分别写下“你觉得对方现在最想吃什么”，完成后同时揭晓。", "更接近对方真实想法的一方达成挑战。"),
  card("choice-without-backtrack", "三秒内做决定", "challenge", "forced-choice", "给对方两个都可行的小选项，倒数三秒内必须选定，选定后不反悔。", "更快做出明确决定的一方达成挑战。"),
  card("find-three-types", "收集三种生活线索", "challenge", "collection", "在当前环境中找到三种不同类别的线索，例如一个圆形物、一句文字和一种声音。", "先收集齐三种线索并说明它们的人达成挑战。", { durationMinutes: 8, sceneTags: ["散步", "旅行"], relationTags: relationSets.social }),
  card("random-next-choice", "把一个小决定交给随机", "rule", "random-choice", "把两个现实可行的小选项写下，用随机方式决定其中一个并执行。", "接受结果并完成执行，发起随机决定的一方达成挑战。"),
  card("solo-change-route", "给今天换一个小方向", "challenge", "solo-novelty", "如果当前安全且方便，选择一条平时不会走的可行路线，走五分钟后再决定是否返回。", "完成五分钟探索并记录一个新发现。", { participantMin: 1, participantMax: 1, relationTags: relationSets.solo, sceneTags: ["单人"] })
].map((item) => ({ ...item, enabled: true }));
