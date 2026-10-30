import type { CardDraft } from "./types";

export const relationshipCards: CardDraft[] = [
  {
    id: "almost-touch", l1: "hit-palm", title: "想触碰，又收回手", scenes: ["date"], tone: "coral", textStyle: "quote",
    intro: "爱你才是最重要的事，莱斯特小姐。\n有人认为爱是性，是婚姻，是清晨六点的吻，是一堆孩子，也许真是这样的，莱斯特小姐。\n但你知道我怎么想吗？",
    headline: "我觉得爱是\n想触碰又收回手。", hook: "这张卡会让你们亲密接触。",
    goal: "打手板心。先轻碰到对方手背 3 次的人赢。",
    steps: ["一人掌心朝上，另一人把手轻放在上面。", "下面的人突然翻手轻碰，上面的人可以随时抽走。碰到得 1 分。", "每次尝试后交换上下位置，先到 3 分就收手。"],
    flow: { countdownSeconds: 3, result: "三秒到了，换手开始。碰到三次的人赢。" },
    note: "只轻碰，不用力；任何一方不想接触就换张卡。", players: [2, 2], seconds: 90,
    adaptation: "用户提供的文学预告制造克制的亲密期待，翻面由真实的伸手与躲手兑现。文案不附未经核实的作者归属。"
  },
  {
    id: "metal-bird", l1: "picture-dub", title: "这只鸟，替你们保守一个秘密", scenes: ["date", "friends", "wait"], tone: "violet",
    intro: "它停在你的手指上，\n好像已经听见了。", headline: "先别翻，\n猜它想要什么。", hook: "答案不在图里，在你们下一句话里。",
    media: { kind: "image", src: "/media/cards/metal-bird.jpg", alt: "一只停在手指上的金属鸟，胸口有一枚发光的蓝色眼睛" },
    goal: "轮流给这只鸟一句指令，最后一句必须让两个人都想做。",
    steps: ["一起看图 5 秒，各自在心里给金属鸟一个名字。", "轮流说一句它听见就会执行的指令，不能超过 10 个字。", "选出最想执行的一句，立刻一起做；如果意见不同，就由鸟的名字决定。"],
    players: [2, 4], seconds: 90, adaptation: "用一张有明确视线和触感的图做共同角色，先让用户猜，再把答案交给在场人的一句话。"
  },
  {
    id: "date-deadpan", l1: "no-laugh", title: "请严肃地喜欢我", scenes: ["date", "night"], tone: "violet",
    intro: "你先别笑。\n我这次是认真的。", headline: "喜欢你这件事，\n我有三点汇报。", hook: "听起来像告白，执行起来像答辩。",
    goal: "绷住脸听完三句夸奖，先笑的人输。",
    steps: ["一人面无表情，另一个人用工作汇报的语气夸 TA 三句。", "每句必须说具体细节，不能重复，也不能碰对方。", "说的人和听的人都不能笑；谁先笑谁输，都没笑就交换一次。"],
    players: [2, 2], seconds: 90, adaptation: "憋笑的素材改成对在场伴侣的真实观察，笑点来自公文语气与情绪的反差。"
  },
  {
    id: "date-three-words", l1: "three-words", title: "嘴硬请限三个字", scenes: ["date", "hello"], tone: "lime",
    intro: "今晚的聊天额度：", headline: "每次，只能\n说三个字。", hook: "“想你了”刚好，“谁想你了”超支。",
    goal: "聊完六次问答，谁先字数不对谁输。",
    steps: ["从“想我吗”开始，提问和回答都必须恰好三个汉字。", "轮流问答，不能连续重复同一句，也不能只报数字。", "说错字数或停顿超过 3 秒就输；六次都过关，就一起赢。"],
    players: [2, 2], seconds: 60, adaptation: "三个字限制叠加约会语境与固定开局，六次问答为碎片局设置明确结束。"
  },
  {
    id: "date-same-order", l1: "same-answer", title: "别对答案，先对暗号", scenes: ["date", "hello"], tone: "coral",
    intro: "你们很有默契这件事，", headline: "外卖软件\n可能先知道。", hook: "不用考纪念日，考点更真实的。",
    goal: "三个问题同时答，有两题撞上就算默契过关。",
    steps: ["逐题读：夜宵第一选择？火锅必点的一样？今天最想喝什么？", "每题各想 3 秒，然后一起说，只能报一个具体答案。", "两题相同就互相击掌；没撞上，下一顿各选一个去试。"],
    players: [2, 2], seconds: 90, adaptation: "把抽象的默契测试缩成真实外卖习惯，无需生日纪念日记忆，也不惩罚差异。"
  },
  {
    id: "date-hum", l1: "sound-relay", title: "给我们编个片头曲", scenes: ["date", "night"], tone: "violet",
    intro: "如果我们是一部剧，", headline: "片头曲\n先别找别人。", hook: "没有歌词也没关系，你接得上就行。",
    media: { kind: "audio", src: "/media/cards/little-theme.m4a", title: "一段还没有名字的旋律", duration: "0:08" },
    goal: "听一遍，再把这段旋律接成你们自己的暗号。",
    steps: ["一起听一遍，翻面后先别重播。", "一人哼出记得的开头，另一人接两拍；忘了就现编。", "交换接一次，最后一起哼一遍，给这首歌起个只有你们懂的名字。"],
    players: [2, 2], seconds: 120, adaptation: "用原创旋律作为共同素材，把累积记忆转成低压力的共同创作，不判断唱功。"
  },
  {
    id: "night-unlucky", l1: "story-relay", title: "今晚别正常入睡", scenes: ["night", "date"], tone: "lime",
    intro: "幸运的是，明天不用上班。", headline: "不幸的是，\n床先请假了。", hook: "你负责幸运，我负责把它搞砸。",
    goal: "一人幸运，一人不幸，接满六句就收工。",
    steps: ["接着卡上的故事，一人每句以“幸运的是”开头，另一人用“不幸的是”。", "新句必须接住上一句的事，不能直接说“都结束了”。", "每人接三句，最后一起给这场睡前事故起个片名。"],
    players: [2, 2], seconds: 120, adaptation: "将已有幸运/不幸故事接力落在睡前状态，给出两个开场句和六句收尾，免去现场出题。"
  },
  {
    id: "hello-fake-resume", l1: "one-lie", title: "这份简历，有点水分", scenes: ["hello", "date", "friends"], tone: "coral",
    intro: "曾任全家遥控器管理员，\n拥有多年已读不回经验。", headline: "请介绍你\n不太正式的履历。", hook: "不用聊工作，也能认识本人。",
    goal: "说两段真经历和一段编的，对方找出那句假的。",
    steps: ["只说生活里的小经历：离谱兼职、奇怪技能、童年乌龙。两真一假。", "听的人可追问一个细节，然后指出哪一句是假话。", "公布答案并换人，各说一轮；不想讲的经历可以直接跳过。"],
    players: [2, 6], seconds: 180, adaptation: "三句话一句假的 L2 限定为非正式个人履历，避开查户口式破冰，提供即用素材方向。"
  },
  {
    id: "date-questions-only", l1: "no-keyword", title: "今天禁止说随便", scenes: ["date", "night"], tone: "lime",
    intro: "吃什么？都行。\n去哪儿？随便。", headline: "今晚把选择权\n还给你本人。", hook: "这一次，“随便”真的会输。",
    goal: "聊出一个今晚能做的小计划，禁止说“随便”和“都行”。",
    steps: ["从“下次见面先去哪里”开始，轮流提一个具体提议或追问。", "不能说“随便”“都行”“不知道”，也不能重复上句话。", "谁先说禁词或停顿 5 秒谁输；聊满六句就选一个双方喜欢的计划。"],
    players: [2, 2], seconds: 90, adaptation: "禁词围绕真实约会决策，局内有轻博弈，局后自然留下一个可行动的选择。"
  }
];
