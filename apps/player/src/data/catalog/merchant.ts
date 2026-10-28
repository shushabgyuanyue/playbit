import type { CardDraft } from "./types";

const coffee = { name: "转角咖啡", disclosure: "活动示例" as const, note: "虚构门店活动样例，无真实奖品或优惠承诺。" };
const bakery = { name: "今天出炉", disclosure: "活动示例" as const, note: "虚构烘焙店活动样例，参与不要求下单或晒朋友圈。" };
const bookshop = { name: "慢一页书店", disclosure: "活动示例" as const, note: "虚构书店活动样例，体验与购买分开。" };

export const merchantCards: CardDraft[] = [
  {
    id: "shop-coffee-name", l1: "picture-dub", title: "这杯咖啡，不想叫美式了", scenes: ["shop"], tone: "coral", sponsor: coffee,
    intro: "美式、拿铁、橙气泡。\n今天菜单想过点别的生活。", headline: "给你的精神状态，\n点一杯。", hook: "先起名字，再说这杯为什么像你。",
    media: { kind: "image", src: "/media/cards/coffee-menu.webp", alt: "示例菜单上的三杯饮品：冰美式、冰拿铁、橙子气泡水" },
    goal: "每人选一杯，起个八字以内的离谱名字。",
    steps: ["选一杯最像今天自己的饮品，不必真的购买。", "起一个不超过八个字的名字，再用一句话解释。比如美式叫“开机失败”。", "同桌一起选最贴切的一杯。门店可把好名字做成客人自愿投稿的当日菜单。"],
    players: [2, 6], seconds: 120, adaptation: "商品成为配音式创作的共同素材；门店获得可选投稿，用户不用先消费就有完整玩法。"
  },
  {
    id: "shop-bakery-three", l1: "three-words", title: "这家店的面包，只听三字话", scenes: ["shop"], tone: "lime", sponsor: bakery,
    intro: "“刚出炉”“别抢啊”“留一个”。", headline: "如果面包\n也会回消息。", hook: "路过一家面包店，先演一段碳水聊天记录。",
    goal: "一人演面包，一人演顾客，所有话都只有三个字。",
    steps: ["顾客先说“刚出炉”，面包用三个字接话，比如“快抱我”。", "轮流接，每句恰好三个汉字，不能重复自己说过的话。", "先多字少字或停顿超过 3 秒的人输；六句都过关就一起给面包起名字。"],
    players: [2, 4], seconds: 90, adaptation: "商品人格化叠加三个字限制，品牌进入语言素材，无导流和购买前置。"
  },
  {
    id: "shop-book-clue", l1: "one-word-clue", title: "书名失踪了，店长请破案", scenes: ["shop"], tone: "violet", sponsor: bookshop,
    intro: "只剩三张封面，\n和一个不太靠谱的店长。", headline: "不读书名，\n也能猜到哪本？", hook: "用一个词，让同伴找到你心里的那张封面。",
    media: { kind: "image", src: "/media/cards/book-window.webp", alt: "三张原创虚构封面：左边是月亮，中间是橙子，右边是雨伞" },
    goal: "出题人心选一张封面，只给一个词让大家猜。",
    steps: ["出题人默选左、中、右一张，再说一个联想到的词，不能直接说位置或封面图案。", "其他人一起倒数三声，指向心里的那张封面，不能跟着别人改。", "出题人公开选择，猜中算默契；各当一次店长就结束，也可在店内用真实封面再玩。"],
    players: [2, 6], seconds: 120, adaptation: "门店陈列转成联想猜图，不依赖书籍知识；素材均为原创虚构封面，不冒充出版物。"
  },
  {
    id: "shop-restaurant-taboo", l1: "no-keyword", title: "今日招牌：说不出菜名", scenes: ["shop"], tone: "coral",
    sponsor: { name: "邻里小馆", disclosure: "活动示例", note: "虚构餐厅活动样例，不自动发券；奖励如有须由实际门店另行公示。" },
    intro: "一份番茄炒蛋，\n突然不许说番茄和蛋。", headline: "你会怎么\n把它卖出去？", hook: "当十秒店员，介绍得越认真越好笑。",
    goal: "用一句话介绍番茄炒蛋，但不能说五个禁字。",
    steps: ["禁用“番、茄、炒、鸡、蛋”，也不能直接用英文菜名替代。", "轮流用一句完整的话把这道菜介绍给同桌。不能重复前面的卖点。", "先说禁字或停顿超过 5 秒的人输，最多介绍六次；一起选最想点单的一句。"],
    players: [2, 6], seconds: 90, adaptation: "产品卖点成为禁词描述的 L2，保留真实商品认知但不把活动做成抽奖入口。"
  },
  {
    id: "ad-cup-count", l1: "visual-memory", title: "广告只占八秒，你能记住吗", scenes: ["shop"], tone: "lime",
    sponsor: { name: "Playbit · 演示品牌位", disclosure: "广告示例", note: "展示广告可如何成为互动题面，未接广告投放、点击追踪或领取奖励。" },
    intro: "这八秒里，\n有东西一直在换位置。", headline: "你盯着小球，\n还是数了换位？", hook: "看完再翻，这次问的不是球在哪。",
    media: { kind: "video", src: "/media/cards/cup-shuffle.mp4", poster: "/media/cards/cup-shuffle.webp", title: "八秒换杯观察题" },
    goal: "一起回忆：刚才一共交换过几次杯子？",
    steps: ["看完视频，先不重播；每个人把换位次数记在心里。", "翻面后倒数三声，一起用手指报次数，锁定后不修改。", "展开答案核对，猜对算过关。想再挑战，就重播追踪小球最后的位置。"],
    reveal: { question: "都报数了，揭晓次数", answer: "4 次换位。依次为左中、中右、左右、左中。" },
    players: [2, 6], seconds: 60, adaptation: "广告位保留明确标识，动态素材本身可玩；同一视觉资产换提问形成另一 L2，不强迫点击。"
  },
  {
    id: "ad-tea-common", l1: "common-ground", title: "奶茶和周五，是同一家公司", scenes: ["shop"], tone: "violet",
    sponsor: { name: "这杯有戏", disclosure: "广告示例", note: "虚构茶饮品牌创意样例，没有真实优惠或到店要求。" },
    intro: "一个让人续命，\n一个让人等命。", headline: "奶茶和周五，\n还有什么共同点？", hook: "给品牌一句文案，先给同桌一个笑点。",
    goal: "轮流说出奶茶与周五的共同点，谁先接不上谁输。",
    steps: ["从“都经常被说成快乐的来源”这个示范之后开始。", "每人说一个新共同点，再用一句话讲通，不能重复前面用过的理由。", "5 秒接不上就输，最多六轮；最后选一句最适合印在杯套上的话。"],
    players: [2, 6], seconds: 90, adaptation: "品牌类别作为联想对象，产出来自社交接力；广告不额外阻挡翻面或游戏。"
  }
];
