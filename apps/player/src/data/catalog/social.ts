import type { CardDraft } from "./types";

export const socialCards: CardDraft[] = [
  {
    id: "friends-cat-dub", l1: "picture-dub", title: "这猫，像不像周一的你", scenes: ["friends", "wait", "night"], tone: "violet",
    intro: "表情已经给了，\n工位也给了。", headline: "它现在\n最想说什么？", hook: "请用它的表情，说一句你不敢说的人话。",
    media: { kind: "image", src: "/media/cards/monday-cat.webp", alt: "一只面无表情的橘猫坐在小办公桌后，旁边是没喝完的咖啡和一摞文件" },
    goal: "轮流替这只猫配一句台词，最后一起选最贴脸的。",
    steps: ["每人想 5 秒，再用这只猫的口气说一句话，不能直接骂人。", "下一人必须接住上一句，变成猫和老板的对话，猫、老板交替出演。", "每人说两句就停。一起选一句当这张图的标题，不强行分输赢。"],
    players: [2, 6], seconds: 120, adaptation: "图片不是气氛背景，而是共用角色和表情约束；台词接力让在场人共同生成内容。"
  },
  {
    id: "friends-press-conference", l1: "no-laugh", title: "为你的迟到开个发布会", scenes: ["friends", "hello"], tone: "coral",
    intro: "各位媒体朋友，\n关于我刚才吃掉最后一块肉……", headline: "本人有\n几点说明。", hook: "小事大办，看看谁先绷不住。",
    goal: "用发布会的语气解释一件小事，先笑的人输。",
    steps: ["选一件无伤大雅的小事：迟到、抢最后一口、忘带充电线。", "一人当发言人，其他人各问一个问题；发言人必须用“关于这个问题”开头回答。", "问答双方都不能笑或做人身攻击；两轮提问后收场，先笑的人输。"],
    players: [2, 6], seconds: 120, adaptation: "给憋笑一个现场可取材的新闻发布会结构，提问方和回答方共同承担喜剧。"
  },
  {
    id: "family-who-knows", l1: "same-answer", title: "一家人，口味未必一家", scenes: ["family", "friends"], tone: "lime",
    intro: "香菜、糖醋、最后那块肉。", headline: "吃了这么多顿，\n你真的懂我？", hook: "先别替对方回答，等三秒一起说。",
    goal: "替同桌的人猜口味，三题里猜中两题就过关。",
    steps: ["指定一个人，三道题只问 TA：香菜加不加？豆花甜还是咸？夜宵面还是粥？", "每题 TA 和其他人先想好答案，倒数三声同时说。", "猜中两题算懂饭搭子；答不同不用辩，最后让 TA 说一道最想一起吃的菜。"],
    players: [2, 6], seconds: 90, adaptation: "固定生活题和明确被猜对象，免去抽象关系测试，差异能自然延伸成餐桌话题。"
  },
  {
    id: "family-shopping-memory", l1: "memory-chain", title: "妈，我真记住了", scenes: ["family", "friends"], tone: "coral",
    intro: "下楼买个东西，很简单。\n鸡蛋、葱、纸巾，还有……", headline: "别急，\n清单还在长。", hook: "上一秒答应，下一秒大脑撤回。",
    goal: "完整复述购物清单，再加一项，先漏掉的人输。",
    steps: ["从“鸡蛋、葱、纸巾”开始，第一人原样复述，再加一样超市能买到的东西。", "每人必须从头按顺序说完整，不能加已出现的东西。", "漏项、顺序错或停顿超过 5 秒就输；清单到十样时全员通关。"],
    players: [2, 6], seconds: 120, adaptation: "记忆叠罗汉提供真实购物开场和十样上限，家庭成员都能带入，不需要题库工具。"
  },
  {
    id: "night-story-keywords", l1: "story-relay", title: "今晚这故事，猫先辞职", scenes: ["night", "friends"], tone: "violet",
    intro: "开头已经有了：\n“凌晨两点，猫递来一封辞职信。”", headline: "接下来，\n轮到你负责离谱。", hook: "下一句必须带：外卖、月亮或老板。",
    goal: "用三个指定词，接出六句睡不着的故事。",
    steps: ["从卡上的开头接，每次只说一句话，必须含“外卖”“月亮”“老板”中的一个。", "下个人不能用上个人刚用过的关键词，但必须接住剧情。", "接满六句就停，最后一句负责收尾；一起给故事起个离谱片名。"],
    players: [2, 6], seconds: 120, adaptation: "强制词故事给定开头、三词和轮次，让用户创造中间的笑点，而不是面对空白出题。"
  },
  {
    id: "hello-one-word", l1: "one-word-clue", title: "你这一个词，信息量挺大", scenes: ["hello", "friends", "wait"], tone: "lime",
    intro: "不用自我介绍。\n先看看我们是不是一条网线上的。", headline: "只给一个词，\n你接得上吗？", hook: "这一面大家看，翻面先交给出题的人。",
    goal: "只说一个词，让对方猜中你看到的目标词。",
    steps: ["出题人独自展开下方目标词，其他人先移开视线。", "出题人只说一个不含答案原字的词，猜的人最多猜三次，不能再补充解释。", "猜中就一起赢，三次没中就揭晓。这张卡只猜一轮；继续玩可由下一人另想一个熟悉的词。"],
    reveal: { question: "仅出题人查看目标词", answer: "目标词：摸鱼。可给的一个线索例如“工位”，但不要把示范也读出去。" },
    players: [2, 6], seconds: 90, adaptation: "把一个词猜答案的目标词定为常见网络语，前后面划分公开预告与出题人信息。"
  }
];
