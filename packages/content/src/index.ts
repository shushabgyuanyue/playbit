export const copy = {
  app: {
    name: "Playbit",
    tagline: "随时随地，开一局。",
    oneLiner: "把生活里的小赌约、小挑战、小奖励，变成一件值得记住的小事。"
  },
  home: {
    primaryAction: "立个赌约",
    secondaryAction: "开一局",
    historyAction: "我的赌约",
    couponsAction: "我的卡券",
    liveHint: "认真处理小事，生活就会多一点戏。"
  },
  auth: {
    guest: "临时身份",
    registered: "已保存账号",
    account: "账号与凭证",
    saveAccount: "保存账号",
    login: "登录已有账号",
    email: "邮箱",
    password: "密码",
    nickname: "称呼",
    saveHint: "保存后可跨设备找回协议、卡券和结案记录。"
  },
  create: {
    title: "发起一份生活约定",
    agreement: "赌约",
    agreementPlaceholder: "例如：谁先说“随便”谁输",
    judgment: "怎么算赢",
    judgmentPlaceholder: "例如：第一个说出口的人判负",
    stake: "赌注",
    generate: "生成签约链接"
  },
  sign: {
    title: "待你签约",
    nameLabel: "签署姓名",
    namePlaceholder: "填写你的称呼",
    action: "确认签约",
    signed: "双方已签约"
  },
  stakes: {
    title: "选择赌注",
    custom: "自定义",
    quantity: "数量",
    presets: [
      { type: "coupon", label: "洗碗券", description: "一次洗碗义务" },
      { type: "coupon", label: "奶茶券", description: "请对方喝一杯奶茶" },
      { type: "coupon", label: "做饭券", description: "负责一顿饭" },
      { type: "coupon", label: "周末决定权", description: "一次周末安排权" },
      { type: "point", label: "积分", description: "只记录关系内部战绩" },
      { type: "custom", label: "自定义赌注", description: "写下一个生活约定" }
    ]
  },
  contract: {
    titlePrefix: "关于",
    titleSuffix: "之友好约定",
    seal: "赌约正式成立",
    confirmA: "甲方确认",
    confirmB: "乙方确认",
    partyA: "甲方",
    partyB: "乙方",
    articles: {
      spirit: "双方本着公平、公正、愿赌服输之精神，就本次事项达成如下约定：",
      exception: "任何诸如“刚好”“本来”“差一点”等理由，原则上均不构成自动免责事由。",
      effective: "本约定自双方确认后正式生效。"
    }
  },
  session: {
    active: "本局进行中",
    settle: "结束并判定结果",
    boost: "敢不敢加码？",
    silverBullet: "使用银弹",
    reroll: "重抽",
    accept: "接受这张",
    fulfilled: "本案正式结案"
  },
  share: {
    contractCta: "复制签约链接",
    settlementTitle: "本局已结案",
    copyLink: "复制分享文案",
    screenshotHint: "这张页面适合直接截图分享。"
  }
} as const;

export type CopyKey = typeof copy;
