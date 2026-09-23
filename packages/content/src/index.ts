import type { CardCategory } from "@playbit/shared";

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
    todoTitle: "待处理约定",
    todoAction: "查看处理",
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
    login: "登录或注册",
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
    loginFailed: "登录失败，请检查邮箱和密码",
    logout: "退出登录",
    accountReady: "账号已登录",
    accountEmail: "登录邮箱",
    signatureStatus: "签名状态",
    signatureSaved: "已保存，可在签署时重签",
    signaturePending: "尚未保存",
    loginTitle: "登录后继续",
    registerTitle: "创建账号",
    loginHint: "登录后继续处理你的合约与权益记录。",
    registerHint: "这个邮箱还没有账号，补充一个称呼即可完成注册。",
    accountNotFound: "未找到该邮箱对应的账号，请补充称呼完成注册。",
    completeRegisterTitle: "完成注册",
    completeRegister: "完成注册并继续",
    nicknamePlaceholder: "例如：小王",
    invalidEmail: "请输入有效的邮箱地址",
    passwordRule: "密码至少 8 位",
    securityHint: "账号只用于保存你的合约与权益，不涉及支付。",
    close: "关闭",
    switchToRegister: "没有账号？注册",
    switchToLogin: "已有账号？登录"
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
    accept: "接受挑战",
    accepted: "挑战已开始",
    acceptedHint: "先去完成这条现实规则；如果想增加权益，再回来生成签署链接。",
    addAgreement: "添加权益并签署",
    agreementHint: "想让这次挑战留下正式记录，再添加一项权益并邀请对方签署。",
    createSession: "生成签署链接",
    reroll: "重抽"
  },
  sign: {
    title: "待你签约",
    nameLabel: "签署称呼",
    namePlaceholder: "例如：小王",
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
    progressTitle: "办理进度",
    progress: {
      signing: "双方签署",
      running: "约定进行",
      closing: "结果结算",
      archived: "完成归档"
    },
    agreementNo: "协议编号",
    titlePrefix: "关于",
    titleSuffix: "之友好约定",
    signedDate: "签约日期",
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
    clauseTitles: {
      subject: "约定事项",
      judgment: "结果判定",
      stake: "权益与履约",
      exception: "免责说明",
      effective: "生效条件"
    },
    clauseSentences: {
      subjectPrefix: "双方确认，本次约定事项为",
      subjectSuffix: "。",
      judgmentPrefix: "本次结果以",
      judgmentSuffix: "作为判定依据。"
    },
    summaryTable: {
      item: "项目",
      content: "具体内容",
      note: "备注",
      subjectNote: "以双方签署内容为准",
      judgmentNote: "结算时作为判定依据",
      stakeNote: "结算后进入权益记录",
      statusNote: "由系统同步留存",
      status: "当前状态"
    },
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
    boostCount: "已加码",
    boostLimit: "最多 3 次",
    boostPlaceholder: "例如：增加一张洗碗券",
    boostSubmit: "提交加码",
    boostConfirm: "确认这次加码",
    boostPending: "等待对方确认",
    boostConfirmed: "双方已确认",
    boostFailed: "加码暂时未提交，请稍后再试",
    stateSyncFailed: "合约状态暂未同步，请稍后重试",
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
    title: "本次结算凭证",
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
    createdAt: "创建",
    agreementNo: "协议编号",
    counterparty: "对方"
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
      routeRight: "路线权",
      additions: "含权益变更"
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
    hint: "建议使用昵称或称呼，不必填写真实姓名",
    required: "请先完成手写签名"
  }
} as const;

export const cardCatalog: Array<{
  id: string;
  name: string;
  category: CardCategory;
  sceneTags: string[];
  participantMin: number;
  participantMax: number;
  durationMinutes: number | null;
  content: string;
  winCondition: string;
  mechanism: string;
}> = [
  {
    id: "rule-no-whatever",
    name: "随便禁止令",
    category: "rule",
    sceneTags: ["date", "walk", "meal"],
    participantMin: 2,
    participantMax: 8,
    durationMinutes: 10,
    content: "从现在开始 10 分钟内，谁先说出“随便”就触发本轮约定。",
    winCondition: "第一个说出禁词的人承担本轮权益；无人触发则平局或进入下一张。",
    mechanism: "禁词规则"
  },
  {
    id: "hidden-jay",
    name: "暗线点歌",
    category: "hidden",
    sceneTags: ["date", "party", "walk"],
    participantMin: 2,
    participantMax: 4,
    durationMinutes: 20,
    content: "秘密任务：在 20 分钟内，让对方主动提到一位你指定的歌手。",
    winCondition: "对方主动说出歌手名，持有任务者达成本轮挑战。",
    mechanism: "隐藏任务"
  },
  {
    id: "challenge-five-yuan-joy",
    name: "五元快乐",
    category: "challenge",
    sceneTags: ["walk", "travel", "date"],
    participantMin: 1,
    participantMax: 4,
    durationMinutes: 15,
    content: "去附近找到一个 5 元以内、但能让今天变快乐一点的小东西。",
    winCondition: "多人时，大家投票选出最让人快乐的选择；单人时完成即胜。",
    mechanism: "寻物挑战"
  },
  {
    id: "magic-double-next",
    name: "下一局翻倍",
    category: "magic",
    sceneTags: ["party", "date", "family"],
    participantMin: 2,
    participantMax: 8,
    durationMinutes: null,
    content: "下一局的奖励或承担事项翻倍。所有人确认后生效。",
    winCondition: "这张卡改变下一局规则，本轮不直接产生结果。",
    mechanism: "权益翻倍"
  },
  {
    id: "challenge-phone-check",
    name: "别看手机",
    category: "challenge",
    sceneTags: ["meal", "date", "family"],
    participantMin: 2,
    participantMax: 6,
    durationMinutes: 10,
    content: "未来 10 分钟，谁先主动解锁手机就触发本轮约定。",
    winCondition: "第一个主动解锁手机的人承担本轮权益；紧急电话可由大家共同豁免。",
    mechanism: "限时自控"
  },
  {
    id: "rule-decision-swap",
    name: "决定权交换",
    category: "rule",
    sceneTags: ["meal", "travel", "date"],
    participantMin: 2,
    participantMax: 4,
    durationMinutes: 15,
    content: "接下来一次需要做选择时，由平时更少做决定的人拍板。",
    winCondition: "选择被执行即完成；若对方反悔，对方承担本轮权益。",
    mechanism: "角色交换"
  }
];

export type CopyKey = typeof copy;
