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
    contractCta: "发给对方确认",
    settlementTitle: "本局已结案",
    copyLink: "复制分享文案",
    screenshotHint: "这张页面适合直接截图分享。"
  }
} as const;

export type CopyKey = typeof copy;

