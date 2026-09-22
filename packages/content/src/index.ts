export const copy = {
  common: {
    back: "返回",
    pending: "待定",
    view: "查看",
    loading: "处理中",
    unavailable: "暂不可用",
    me: "我",
    initiator: "发起方",
    change: "更换",
    selected: "已选"
  },
  app: {
    name: "Playbit",
    tagline: "随时随地，开一局。",
    oneLiner: "把生活里的小约定、小挑战、小奖励，变成一件值得记住的小事。"
  },
  home: {
    primaryAction: "发起约定",
    secondaryAction: "开一局",
    historyAction: "我的约定",
    couponsAction: "我的卡券",
    accountAction: "账号",
    liveHint: "认真处理小事，生活就会多一点戏。",
    docketLabel: "生活合约服务",
    docketTitle: "把一句临时约定，变成可签署、可结算、可留存的生活协议。",
    heroSubtitle: "轻量签署 | 权益记录 | 履约留存",
    overviewTitle: "合约管理",
    quickTitle: "常用功能",
    stats: {
      pending: "待签约",
      active: "进行中",
      fulfilled: "已结案"
    },
    shortcuts: {
      create: "发起合约",
      draw: "抽卡开局",
      history: "合约记录",
      vouchers: "履约卡券"
    }
  },
  auth: {
    guest: "未登录",
    registered: "已登录",
    account: "账号与凭证",
    saveAccount: "注册并登录",
    login: "登录已有账号",
    email: "邮箱",
    password: "密码",
    nickname: "称呼",
    localUser: "未登录",
    emailPlaceholder: "name@example.com",
    passwordPlaceholder: "至少 8 位",
    saveHint: "登录后可发起合约、签署协议、管理权益卡券和结案记录。",
    requiredTitle: "请先登录或注册",
    requiredHint: "为了保护合约、签名和权益卡券，当前操作需要账号身份。",
    saveFailed: "注册失败，请稍后再试",
    loginFailed: "登录失败，请检查邮箱和密码"
  },
  create: {
    navTitle: "立约",
    title: "发起一份生活合约",
    subtitle: "只填写约定、判定和权益，对方通过链接签署后自动成为乙方。",
    agreement: "约定事项",
    agreementPlaceholder: "例如：谁先说“随便”就承担本次权益",
    judgment: "如何判定",
    judgmentPlaceholder: "例如：第一个说出口的人承担本次权益",
    stake: "权益",
    generate: "生成签约链接",
    signature: "甲方签名"
  },
  draw: {
    navTitle: "开一局",
    eyebrow: "现实挑战服务",
    title: "抽一张生活挑战",
    readyLabel: "现实挑战卡",
    emptyLabel: "开一局",
    emptyTitle: "抽一张，让现实动一下",
    emptyContent: "卡片会给当前生活加一条临时规则。",
    winCondition: "判定",
    accept: "接受",
    createSession: "创建本局",
    reroll: "重抽"
  },
  sign: {
    title: "待你签约",
    nameLabel: "签署姓名",
    namePlaceholder: "填写你的称呼",
    action: "确认签约",
    decline: "暂不签署",
    signed: "双方已签约",
    missingLabel: "未找到",
    missingTitle: "这份签约链接暂时不可用",
    missingContent: "可能是链接错误，或后端服务尚未连接数据库。",
    summary: {
      challenge: "约定事项",
      judgment: "结果判定",
      stake: "履约凭证"
    }
  },
  stakes: {
    title: "选择权益",
    selected: "已选权益",
    choose: "选择权益",
    custom: "自定义",
    assetHint: "履约凭证",
    customLabel: "自定义内容",
    customPlaceholder: "例如：明天负责接孩子",
    presets: [
      { type: "coupon", label: "洗碗一次", description: "一次明确的家务履约" },
      { type: "coupon", label: "请奶茶一杯", description: "请对方喝一杯奶茶" },
      { type: "coupon", label: "做饭一次", description: "负责一顿饭" },
      { type: "coupon", label: "周末安排权一次", description: "一次周末安排权" },
      { type: "point", label: "积分", description: "只记录关系内部结果" },
      { type: "custom", label: "自定义权益", description: "写下一个生活约定" }
    ]
  },
  contract: {
    navTitle: "合约",
    agreementNo: "协议编号",
    titlePrefix: "关于",
    titleSuffix: "之友好约定",
    seal: "合约正式成立",
    pendingSeal: "待对方签署",
    confirmA: "甲方确认",
    confirmB: "乙方确认",
    signaturePending: "待签名",
    partyA: "甲方",
    partyB: "乙方",
    fallbackInitiator: "发起方",
    fallbackCounterparty: "待签约",
    waiting: "等待对方签约",
    refreshing: "正在更新签署状态",
    signFailed: "签署失败，请确认不是发起人本人打开了签约链接",
    enterSession: "进入本局",
    articleLabels: {
      first: "第一条",
      second: "第二条",
      third: "第三条",
      fourth: "第四条",
      fifth: "第五条"
    },
    stakePrefix: "未达成方应承担",
    stakeSuffix: "一项。",
    articles: {
      spirit: "双方本着公平、公正、友好确认之精神，就本次事项达成如下约定：",
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
    stake: "权益",
    chooseWinnerPrefix: "判定",
    chooseWinnerSuffix: "达成",
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
    agreement: "约定",
    winner: "权益获得方",
    loser: "权益提供方",
    stake: "权益",
    status: "状态",
    pending: "已发放",
    fulfilled: "已核销",
    voucherIssued: "权益卡券已发放",
    voucherIssuedHint: "该权益已进入卡券中心，可在卡券详情中核销。",
    customRecorded: "权益已记录",
    customRecordedHint: "自定义权益已写入本次结算书，后续由双方线下完成。",
    openVouchers: "查看权益卡券",
    backHome: "回到首页"
  },
  history: {
    navTitle: "历史",
    title: "我的约定",
    emptyLabel: "暂无记录",
    emptyTitle: "第一局还没开始",
    emptyContent: "生活里下一次临时约定，就可以记在这里。",
    stake: "权益",
    createdAt: "创建"
  },
  share: {
    contractCta: "复制签约链接",
    openPanel: "分享",
    panelTitle: "分享合约",
    panelHint: "网页环境会先尝试系统分享；在微信、QQ、微博里可复制文案发给对方。",
    nativeShare: "系统分享",
    copied: "分享文案已复制",
    settlementTitle: "本次已结案",
    copyLink: "复制分享文案",
    screenshotHint: "这张页面适合直接截图分享。",
    channelHint: "当前网页暂不能强制拉起应用，已为你复制分享文案。",
    channels: {
      wechat: "微信",
      moments: "朋友圈",
      qq: "QQ",
      weibo: "微博",
      copy: "复制"
    },
    labels: {
      agreement: "约定",
      challenge: "约定事项",
      judgment: "判定",
      winner: "达成方",
      stake: "权益",
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
    emptyText: "结算含卡券权益的合约后，这里会生成可核销的履约凭证。",
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
    overviewTitle: "卡券管理"
  },
  signature: {
    clear: "重写",
    hint: "请在框内手写签名",
    required: "请先完成手写签名"
  }
} as const;

export type CopyKey = typeof copy;
