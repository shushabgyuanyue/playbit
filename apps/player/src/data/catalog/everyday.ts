import type { CardDraft } from "./types";

export const everydayCards: CardDraft[] = [
  {
    id: "wait-bid", l1: "category-bid", title: "车还没来，嘴先跑了", scenes: ["wait", "friends"], tone: "lime",
    intro: "我能说出 3 个\n听起来很忙、其实没干活的词。", headline: "你能比我更多？", hook: "“在对齐”“拉个会”“我跟一下”。你加几个？",
    goal: "轮流报能说出的数量，吹大了就得现场兑现。",
    steps: ["主题固定：听起来在忙、其实没说干了什么的职场话。先从 3 个开始报。", "对方加 1 个，或喊“那你说”；最多报到 8 个。", "被叫的人在 20 秒内说满，不重复。说满就赢，没说满就输，只挑战一次。"],
    note: "有争议的词当场一起决定；车来了就暂停，不追着玩。", players: [2, 6], seconds: 90,
    adaptation: "心理叫价配一个具体而可发散的通勤题面，设 8 个上限和单次挑战，适合等车间隙。"
  },
  {
    id: "wait-wrong", l1: "wrong-answers", title: "脑子在等车，嘴先下班", scenes: ["wait", "friends"], tone: "coral",
    intro: "今天太阳从哪边出来？\n你现在有几条腿？", headline: "懂得越多，\n越容易输。", hook: "反应快不算本事，忍住正确答案才算。",
    goal: "接下来五个问题，只许答错。",
    steps: ["一人提问：在等车吗？太阳哪边升？猫有几条腿？用什么走路？现在在地球吗？", "另一人每题 3 秒内回答，答案必须明显错误，不能每题都答同一句。", "答对或超时就输；五题都答错就赢，然后换人再来。"],
    players: [2, 4], seconds: 90, adaptation: "给只许答错提供五个拿来就问的通勤题，不把出题压力留给用户。"
  },
  {
    id: "wait-cups", l1: "visual-memory", title: "别让眼神跟着下班", scenes: ["wait", "friends"], tone: "violet",
    intro: "先盯住那颗小黄球。", headline: "杯子会装，\n你别看丢。", hook: "看完再翻。答案先别说出口。",
    media: { kind: "video", src: "/media/cards/cup-shuffle.mp4", poster: "/media/cards/cup-shuffle.webp", title: "小黄球藏在哪只杯子里" },
    goal: "看完换位，一起指认藏着小黄球的杯子。",
    steps: ["一起看完这段换杯视频；第一遍先不暂停、不拖动。", "翻面后倒数三声，各指向左、中、右其中一只，不能看别人再改。", "先锁定答案，再展开下方揭晓；答对就赢。平局可重播一次。"],
    reveal: { question: "都选好了，揭晓位置", answer: "中间。小黄球随杯子依次走过：左 → 中 → 右 → 左 → 中。" },
    players: [2, 6], seconds: 60, adaptation: "把记忆从文字搬到原创动态题面；卡背呈现观察任务，规则面隐藏正确答案。"
  },
  {
    id: "wait-common", l1: "common-ground", title: "公交站和冰箱，是亲戚？", scenes: ["wait", "hello"], tone: "lime",
    intro: "一个等车，一个等饭。", headline: "公交站和冰箱，\n还能有什么共同点？", hook: "越离谱，越要说得通。",
    goal: "轮流找共同点，谁先接不上谁输。",
    steps: ["对象固定为“公交站”和“冰箱”。例如：都可能有人贴小广告。", "轮流给一个新的共同点，再补一句为什么成立；不能重复。", "5 秒想不到就输，最多六个答案；说不通的答案由在场人一起决定。"],
    players: [2, 6], seconds: 90, adaptation: "等车现场变成联想对象，提供一个示范但保留发散空间，避免专业知识门槛。"
  },
  {
    id: "wait-beat", l1: "sound-relay", title: "大脑请排队，手先上车", scenes: ["wait", "friends"], tone: "coral",
    intro: "这段声音，\n你的手比脑子更懂。", headline: "听一遍，\n给它回个消息。", hook: "不用说话，也能玩一轮。",
    media: { kind: "audio", src: "/media/cards/knock-pattern.m4a", title: "四组短短的敲击", duration: "0:06" },
    goal: "复刻刚听到的四组节奏，漏一组就换人。",
    steps: ["一起听一遍，把四组停顿和敲击数记在心里。", "翻面后依次轻敲自己的掌心，其他人听，不需要系统判定。", "都敲完再展开节奏核对；完整复刻的人赢，相同就各自加一组互相挑战。"],
    reveal: { question: "敲完了，核对节奏", answer: "一下 / 两下 / 一下 / 三下。组间停一拍，组内连着敲。" },
    note: "公共场合轻敲掌心，不拍打站台或陌生人的物品。", players: [2, 6], seconds: 60,
    adaptation: "原创敲击作为听觉记忆 L2，轻敲自己的手掌即可完成，适配不便说话的等候空间。"
  },
  {
    id: "dishes-taboo", l1: "no-keyword", title: "洗碗岗，正在内招", scenes: ["dishes", "date", "family"], tone: "coral",
    intro: "饭是一起吃的，\n碗正在寻找它的有缘人。", headline: "谁先提“碗”，\n谁就很可疑。", hook: "谈一谈刚才这顿饭，但别把自己谈进去。",
    goal: "聊六句话，谁先说出“碗”“洗”“我”谁输。",
    steps: ["大家轮流评价这顿饭，每次必须是完整一句，不许只报菜名。", "禁用“碗”“洗”“我”三个字。说“菜挺好吃”可以，说“我吃饱了”不行。", "谁先说禁字或停顿超过 5 秒谁输；六句都躲过，就一起收桌。"],
    note: "要不要用结果决定谁洗碗，开局前你们说好。", players: [2, 4], seconds: 90,
    adaptation: "禁词与饭后分工的真实张力绑定，给定禁字、合法例句和六句结束条件。"
  },
  {
    id: "dishes-three-words", l1: "three-words", title: "谁洗碗？请三字作答", scenes: ["dishes", "date"], tone: "lime",
    intro: "“我不洗”\n也是三个字。", headline: "很好，\n继续狡辩。", hook: "把一场家务辩论，压缩到三个字。",
    goal: "围绕谁来洗碗问答，先不合字数的人输。",
    steps: ["从“谁洗碗”开始，问和答都必须恰好三个汉字。", "不能重复自己说过的句子，不能说无关的话。例：“你先来”“凭什么”。", "停顿超过 3 秒或字数不对就输；最多八句话，没失误就一起分工。"],
    players: [2, 2], seconds: 60, adaptation: "同一 L1 换成洗碗争执的情境与现成开场，把日常嘴硬变成内容，而非重新包装泛聊天。"
  },
  {
    id: "dishes-reverse", l1: "reverse-command", title: "手很诚实，嘴别指挥", scenes: ["dishes", "family"], tone: "violet",
    intro: "洗碗之前，\n先检查一下身体的叛逆程度。", headline: "我说左，\n你偏要往右。", hook: "指令越简单，身体越容易背叛你。",
    goal: "十个反口令，先做成同向动作的人输。",
    steps: ["先放下餐具。一个人只喊“左、右、上、下”，另一个用手指向相反方向。", "一秒一条，喊十条；喊“左”要指右，喊“上”要指下。", "做同向或没反应就输；十条都对算过关，再交换角色。"],
    note: "坐稳再玩，不端着碗，也不在水槽边突然转身。", players: [2, 4], seconds: 60,
    adaptation: "反口令缩为坐着指方向，去掉大动作，适配饭后厨房的安全与时间限制。"
  },
  {
    id: "dishes-bid", l1: "category-bid", title: "好消息，借口也能参赛", scenes: ["dishes", "friends"], tone: "coral",
    intro: "我能说出 3 个\n今天不用洗碗的理由。", headline: "来，\n看谁更会编。", hook: "嘴上先赢一次，水槽那边另说。",
    goal: "报出你能编的借口数量，对方可以随时叫你兑现。",
    steps: ["从“3 个不洗碗的离谱理由”开始轮流加 1，最多报 8 个。", "对方可不加价，改喊“那你说”；被叫的人有 20 秒说完。", "理由不能重复，也不能针对别人身材或身体情况。说够赢，卡住输。"],
    players: [2, 6], seconds: 90, adaptation: "把分类叫价转为饭后借口大会，提供内容限制与数量上限，笑点不依赖强迫履约。"
  },
  {
    id: "home-fridge", l1: "visual-memory", title: "看过，不代表脑子收到了", scenes: ["family", "dishes", "wait"], tone: "lime",
    intro: "给你 5 秒，\n看一眼这台冰箱。", headline: "别截图，\n考的是刚才的你。", hook: "翻过来，会问一件你以为记得的小事。",
    media: { kind: "image", src: "/media/cards/fridge-notes.webp", alt: "十二枚冰箱贴：三颗草莓、两杯咖啡、两片柠檬、三朵花、一只猫和一个鸡蛋" },
    goal: "不翻回去看：刚才有几颗草莓、几杯咖啡？",
    steps: ["看图五秒后翻面，先别回去，也别把答案说出来。", "每个人同时伸手比数字：先报草莓数，再报咖啡数。", "都锁定后展开答案，两项都对算记忆过关。想继续可换一个人出图中细节题。"],
    reveal: { question: "都记好了，查看答案", answer: "3 颗草莓，2 杯咖啡。一共 12 枚冰箱贴。" },
    players: [2, 6], seconds: 60, adaptation: "原创冰箱贴实物式图面提供可核对的视觉事实，翻面才提问，形成观看到回忆的反转。"
  }
];
