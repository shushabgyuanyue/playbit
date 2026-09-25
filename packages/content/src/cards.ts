import type { Card } from "@playbit/shared";

export const cardCatalog: Card[] = [
  {
    id: "turtle-soup-water",
    name: "海龟汤：那杯水",
    category: "challenge",
    mode: "together",
    participantMin: 2,
    participantMax: 8,
    durationMinutes: 5,
    content: "一个人走进酒吧，要了一杯水。酒保却拿枪指着他。他说了声谢谢，转身走了。为什么？选一人先看谜底，其余人只能问能用「是 / 不是 / 无关」回答的问题。",
    winCondition: "五分钟内猜出关键原因；没猜出来就揭晓。",
    reveal: "他在打嗝，想喝水止住。酒保用枪吓了他一跳，打嗝停了，所以他道谢离开。"
  },
  {
    id: "turtle-soup-elevator",
    name: "海龟汤：雨天直达",
    category: "challenge",
    mode: "together",
    participantMin: 2,
    participantMax: 8,
    durationMinutes: 5,
    content: "一个人住在十楼。晴天回家，他坐电梯到七楼再爬楼；下雨天却能直接坐到十楼。为什么？选一人先看谜底，其余人只能问能用「是 / 不是 / 无关」回答的问题。",
    winCondition: "五分钟内猜出关键原因；没猜出来就揭晓。",
    reveal: "他个子矮，平时够不到十楼按钮，只能按到七楼。下雨天带着伞，就能用伞尖按到十楼。"
  },
  {
    id: "twenty-one",
    name: "数到 21",
    category: "challenge",
    mode: "versus",
    participantMin: 2,
    participantMax: 2,
    durationMinutes: 3,
    content: "轮流从 1 往上报数，每次可以连续报 1、2 或 3 个数。比如对方报到 4，你可以报「5」，也可以报「5、6、7」。",
    winCondition: "谁被迫说出 21，谁输。"
  },
  {
    id: "two-truths-one-lie",
    name: "三句话，一句假的",
    category: "challenge",
    mode: "versus",
    participantMin: 2,
    participantMax: 2,
    durationMinutes: 5,
    content: "一人说三件关于自己的事，其中两件是真的，一件是编的。另一人最多追问两个问题，然后指出哪句是假的。想再玩一局，就交换角色。",
    winCondition: "猜对，猜的人赢；猜错，说的人赢。"
  },
  {
    id: "no-yes-no",
    name: "不能说是，也不能说不是",
    category: "challenge",
    mode: "versus",
    participantMin: 2,
    participantMax: 2,
    durationMinutes: 3,
    content: "一人连续提问，另一人必须回答，但不能说「是、不是、对、不对、嗯」，也不能点头或摇头。撑过一分钟就交换角色。",
    winCondition: "先说出禁词或做出禁动作的人输；两人都撑住就再来一轮，直到分出胜负。"
  },
  {
    id: "five-second-three",
    name: "五秒说三个",
    category: "challenge",
    mode: "versus",
    participantMin: 2,
    participantMax: 6,
    durationMinutes: 5,
    content: "轮流答题，每人五秒说出三个答案。先用这三题：听起来像编的迟到理由、最不适合出现在婚礼上的歌、可以当作暗号的菜名。之后由上一位现场出题。重复答案不算。",
    winCondition: "谁先超时、重复或说不出三个，谁输。"
  },
  {
    id: "wrong-answers-only",
    name: "只许答错",
    category: "challenge",
    mode: "versus",
    participantMin: 2,
    participantMax: 2,
    durationMinutes: 3,
    content: "一人连续问很简单的问题，另一人要在两秒内给出明显错误的答案。比如「冰箱是干什么的？」不能答「冷藏食物」，但可以答「给周末保鲜」。一分钟后交换角色。",
    winCondition: "谁先答对、重复答案或卡住，谁输；两人都撑住就继续问，直到有人失误。"
  },
  {
    id: "say-anything-but-whatever",
    name: "别说随便",
    category: "rule",
    mode: "together",
    participantMin: 2,
    participantMax: 6,
    durationMinutes: 5,
    content: "接下来五分钟照常聊天、做选择，但不能说出「随便」。被问到想吃什么、去哪儿，都得给个具体答案。",
    winCondition: "先说出「随便」的人输；五分钟没人说，就一起赢。"
  },
  {
    id: "eye-contact-no-smile",
    name: "谁先笑谁输",
    category: "challenge",
    mode: "versus",
    participantMin: 2,
    participantMax: 2,
    durationMinutes: 2,
    content: "面对面看着对方。可以说话、做表情、讲烂笑话，但不能碰对方。先别笑。",
    winCondition: "谁先笑出声，谁输。"
  },
  {
    id: "twenty-questions",
    name: "二十问",
    category: "challenge",
    mode: "together",
    participantMin: 2,
    participantMax: 8,
    durationMinutes: 5,
    content: "一人心里选一个大家都认识的人物，可以是真人也可以是虚构角色。其他人最多问 20 个只能回答「是 / 不是 / 不确定」的问题，随时可以猜。",
    winCondition: "20 个问题内猜中就过关；没猜中，出题人公布答案。"
  }
];
