export const copy = {
  common: {
    back: "返回",
    pending: "待定",
    view: "查看",
    loading: "处理中",
    unavailable: "暂不可用"
  },
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
    accountAction: "账号",
    liveHint: "认真处理小事，生活就会多一点戏。",
    docketLabel: "生活合约服务",
    docketTitle: "把一句“赌不赌”，变成可签署、可结算、可留存的生活协议。",
    stats: {
      contract: "合约",
      voucher: "卡券",
      settlement: "结案"
    }
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
    localUser: "临时用户",
    emailPlaceholder: "name@example.com",
    passwordPlaceholder: "至少 8 位",
    saveHint: "保存后可跨设备找回协议、卡券和结案记录。"
  },
  create: {
    navTitle: "立约",
    title: "发起一份生活合约",
    subtitle: "只填写赌约、判定和赌注，对方通过链接签署后自动成为乙方。",
    agreement: "赌约",
    agreementPlaceholder: "例如：谁先说“随便”谁输",
    judgment: "怎么算赢",
    judgmentPlaceholder: "例如：第一个说出口的人判负",
    stake: "赌注",
    generate: "生成签约链接"
  },
  draw: {
    navTitle: "开一局",
    readyLabel: "现实挑战卡",
    emptyLabel: "开一局",
    emptyTitle: "抽一张，让现实动一下",
    emptyContent: "卡片会给当前生活加一条临时规则。",
    winCondition: "胜负",
    accept: "接受",
    reroll: "重抽"
  },
  sign: {
    title: "待你签约",
    nameLabel: "签署姓名",
    namePlaceholder: "填写你的称呼",
    action: "确认签约",
    signed: "双方已签约",
    missingLabel: "未找到",
    missingTitle: "这份签约链接暂时不可用",
    missingContent: "可能是链接错误，或后端服务尚未连接数据库。",
    summary: {
      challenge: "约定事项",
      judgment: "胜负判定",
      stake: "履约凭证"
    }
  },
  stakes: {
    title: "选择赌注",
    custom: "自定义",
    assetHint: "履约凭证",
    customLabel: "自定义内容",
    customPlaceholder: "例如：明天负责接孩子",
    presets: [
      { type: "coupon", label: "洗碗一次", description: "一次明确的家务履约" },
      { type: "coupon", label: "请奶茶一杯", description: "请对方喝一杯奶茶" },
      { type: "coupon", label: "做饭一次", description: "负责一顿饭" },
      { type: "coupon", label: "周末安排权一次", description: "一次周末安排权" },
      { type: "point", label: "积分", description: "只记录关系内部战绩" },
      { type: "custom", label: "自定义赌注", description: "写下一个生活约定" }
    ]
  },
  contract: {
    navTitle: "合约",
    agreementNo: "协议编号",
    titlePrefix: "关于",
    titleSuffix: "之友好约定",
    seal: "赌约正式成立",
    pendingSeal: "待对方签署",
    confirmA: "甲方确认",
    confirmB: "乙方确认",
    partyA: "甲方",
    partyB: "乙方",
    fallbackInitiator: "发起方",
    fallbackCounterparty: "待签约",
    waiting: "等待对方签约",
    enterSession: "进入本局",
    articleLabels: {
      first: "第一条",
      second: "第二条",
      third: "第三条",
      fourth: "第四条",
      fifth: "第五条"
    },
    stakePrefix: "败方应承担",
    stakeSuffix: "一项。",
    articles: {
      spirit: "双方本着公平、公正、愿赌服输之精神，就本次事项达成如下约定：",
      exception: "任何诸如“刚好”“本来”“差一点”等理由，原则上均不构成自动免责事由。",
      effective: "本约定自双方确认后正式生效。"
    }
  },
  session: {
    navTitle: "进行中",
    active: "本局进行中",
    settle: "结束并判定结果",
    boost: "加码",
    boostHint: "双方确认后生效",
    silverBullet: "银弹",
    silverHint: "每人每局一次",
    reroll: "重抽",
    accept: "接受这张",
    fulfilled: "本案正式结案",
    challenge: "挑战",
    judgment: "判定",
    stake: "赌注",
    chooseWinnerPrefix: "判定",
    chooseWinnerSuffix: "获胜",
    enhancementTitle: "局内增强",
    statuses: {
      draft: "草稿",
      pending_confirmation: "待签约",
      active: "进行中",
      settling: "待履约",
      fulfilled: "已履约",
      finished: "已结束"
    }
  },
  settlement: {
    navTitle: "结算",
    agreement: "赌局",
    winner: "胜方",
    loser: "败方",
    stake: "赌注",
    status: "状态",
    pending: "待履约",
    fulfilled: "已履约",
    confirmFulfill: "确认履约",
    backHome: "回到首页"
  },
  history: {
    navTitle: "历史",
    title: "我的赌约",
    emptyLabel: "暂无记录",
    emptyTitle: "第一局还没开始",
    emptyContent: "生活里下一次“赌不赌”，就可以记在这里。",
    stake: "赌注",
    createdAt: "创建"
  },
  share: {
    contractCta: "复制签约链接",
    settlementTitle: "本局已结案",
    copyLink: "复制分享文案",
    screenshotHint: "这张页面适合直接截图分享。",
    labels: {
      agreement: "赌局",
      challenge: "赌约",
      judgment: "判定",
      winner: "胜方",
      stake: "赌注",
      signLink: "签约链接",
      pending: "待签约"
    }
  },
  vouchers: {
    navTitle: "我的卡券",
    detailTitle: "卡券详情",
    aria: {
      back: "返回",
      categoryTabs: "卡券状态"
    },
    punctuation: {
      labelSeparator: "："
    },
    date: {
      month: "月",
      day: "日"
    },
    statusTabs: {
      all: "全部",
      pending: "待履约",
      available: "待核销",
      used: "已完结"
    },
    rule: "规则",
    viewAgreement: "查看合约",
    redeem: "去核销",
    confirmRedeem: "确认核销",
    demoRedeemHint: "演示卡券不可核销",
    redeemed: "已核销",
    received: "到账",
    pendingAction: "待履约",
    archivedAction: "查看",
    ticketCaption: "履约凭证",
    benefitSubtitles: {
      cup: "请一杯",
      once: "一次",
      choiceRight: "选择权",
      decisionRight: "决定权",
      routeRight: "路线权"
    },
    expand: "展开",
    itemUnit: "张",
    confirmRedeemTitle: "确认核销卡券",
    confirmRedeemText: "核销后会同步更新关联合约，本案进入已结案状态。",
    redeemSuccess: "卡券已核销",
    redeemFailed: "核销失败，请稍后再试",
    openFailed: "暂时无法打开关联合约",
    agreementNo: "协议编号",
    relatedAgreement: "关联合约",
    judgmentRule: "判定规则",
    issuer: "出券方",
    holder: "持有人",
    emptyTitle: "暂无卡券",
    emptyText: "结算含卡券赌注的合约后，这里会生成可核销的履约凭证。",
    emptyMark: "券",
    detail: {
      credential: "履约凭证",
      agreement: "关联合约",
      rule: "履约规则",
      parties: "相关人员",
      issuer: "出券方",
      holder: "持有人",
      time: "时间状态"
    },
    sources: {
      signing: "Playbit签约",
      agreement: "生活协议",
      archive: "结案归档"
    },
    pending: "签约后待履约",
    fulfilled: "已履约",
    holderPending: "待结算",
    sessionStatuses: {
      draft: "草稿",
      pending_confirmation: "待签约",
      active: "进行中",
      settling: "待履约",
      fulfilled: "已履约",
      finished: "已结束"
    },
    demoHint: "演示",
    demos: [
      {
        id: "demo-milk-tea",
        benefitLabel: "请奶茶一杯",
        agreementTitle: "谁下次约会迟到谁输",
        agreementCode: "PB-2026-0910",
        ruleText: "约定时间后 10 分钟仍未到达的一方判负",
        issuerName: "迟到方",
        holderName: "守时方",
        timeText: "09月10日 21:40 到账",
        status: "available",
        kind: "treat"
      },
      {
        id: "demo-housework",
        benefitLabel: "洗碗一次",
        agreementTitle: "谁先说随便谁输",
        agreementCode: "PB-2026-0909",
        ruleText: "未来 10 分钟内第一个说出口的人判负",
        issuerName: "败方",
        holderName: "胜方",
        timeText: "明天23:59前待履约",
        status: "pending",
        kind: "housework"
      },
      {
        id: "demo-decision",
        benefitLabel: "晚饭决定权",
        agreementTitle: "谁猜错歌词谁输",
        agreementCode: "PB-2026-0908",
        ruleText: "以现场搜索到的歌词为最终判定",
        issuerName: "小李",
        holderName: "小王",
        timeText: "09月08日 18:30 已核销",
        status: "used",
        kind: "decision"
      },
      {
        id: "demo-breakfast",
        benefitLabel: "做饭一次",
        agreementTitle: "明天谁赖床谁输",
        agreementCode: "PB-2026-0907",
        ruleText: "超过约定起床时间 15 分钟仍未起床的一方判负",
        issuerName: "赖床方",
        holderName: "胜方",
        timeText: "09月07日 08:30 到账",
        status: "available",
        kind: "housework"
      },
      {
        id: "demo-movie",
        benefitLabel: "电影选择权",
        agreementTitle: "谁先刷到短视频谁输",
        agreementCode: "PB-2026-0906",
        ruleText: "未来 20 分钟内第一位主动打开短视频应用的人判负",
        issuerName: "败方",
        holderName: "胜方",
        timeText: "09月06日 20:15 到账",
        status: "available",
        kind: "decision"
      },
      {
        id: "demo-walk",
        benefitLabel: "散步路线权",
        agreementTitle: "谁先说都行谁输",
        agreementCode: "PB-2026-0905",
        ruleText: "未来 10 分钟内第一个说出“都行”的人判负",
        issuerName: "败方",
        holderName: "胜方",
        timeText: "09月05日 19:20 到账",
        status: "available",
        kind: "decision"
      }
    ]
  }
} as const;

export type CopyKey = typeof copy;
