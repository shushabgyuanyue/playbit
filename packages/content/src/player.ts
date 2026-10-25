export const playerCopy = {
  brand: "Playbit",
  close: "关闭",
  back: "返回",
  cancel: "取消",
  confirm: "确认",
  save: "保存",
  nav: { benefits: "权益", play: "Playbit", me: "我的", label: "主导航", toPlay: "切换到游戏模式", toPromise: "切换到赌约模式" },
  play: {
    scene: "场景", ai: "AI 组局", author: "Playbit 关系实验室", justNow: "刚刚", happening: "正在发生",
    turn: "现在轮到你回答", payoff: "这张卡可能带来", quote: "“把它发给那个你想听到答案的人。”",
    answers: "2,481 人回答过", stake: "添个彩头", stakeAdded: "本局彩头", anticipation: "加一点期待",
    defaultStake: "输的人请喝一杯", flip: "翻开开始", swipe: "↑ 上滑换一张", next: "下一张", previous: "上一张",
    serious: "现在，认真玩", rules: "HOW TO PLAY · 这轮怎么玩", putDown: "，然后把手机放下。",
    returnHint: "轻触空白处返回 · 上滑换题", collect: "收藏到卡组", backToPreview: "返回卡片预告",
    stakeTitle: "给这一局，加一点期待", stakeHint: "彩头由你们自行约定，玩游戏不需要签约。", stakePlaceholder: "例如：输的人请喝一杯", stakeConfirm: "就这个彩头", removeStake: "移除彩头", stakeRemoved: "已移除彩头", stakeSaved: "已记下本局彩头",
    issueStake: "签发这份彩头", issueStakeTitle: "把彩头交给赢家", issueStakeHint: "主持人签名后，分享给获胜方登录领取。", issueStakeSign: "主持人手写签名", issueStakeSignHint: "签名会留在这张权益卡上", issueStakeAction: "签发并生成权益卡", issueStakeSigned: "彩头已签发", issueStakePending: "等待获胜方领取", issueStakeShare: "分享给获胜方", issueStakeSelfClaim: "我来领取", issueStakeShared: "已打开系统分享；跨设备领取将在接入账户后生效", issueStakeClaimed: "已领取到本机权益", issueStakeNudge: "这局彩头还没交给赢家", issueStakeNudgeAction: "去签发", issueStakeNudgeIgnore: "先跳过", issueStakeNoSignature: "请先完成主持人签名"
  },
  scenes: {
    eyebrow: "PLAY IN REAL LIFE", title: "今晚，什么局？", hint: "选择现实场景，找到刚刚好的尺度。", official: "官方场景", mine: "我的场景卡组", create: "新建卡组", createTitle: "给卡组起个名字", name: "卡组名称", namePlaceholder: "例如：下班后玩一会儿", empty: "还没有收藏卡片", add: "新建", custom: "自定义场景", count: (n: number) => `${n} 张卡片`, switched: (name: string) => `已切换到「${name}」`, duplicate: "已有同名卡组", emptyDeck: "这个卡组还没有卡片，先去收藏喜欢的内容", created: "卡组已创建"
  },
  ai: { eyebrow: "PLAYBIT AI", title: "说说现在的气氛", hint: "先从现有卡片里，找一个更适合此刻的场景。", placeholder: "例如：第一次约会，有点害羞，想自然地拉近距离…", suggestions: ["更暧昧一点", "适合四个人", "不要太尴尬"], send: "选择适合的场景" },
  collection: { eyebrow: "SAVE TO SCENE", title: "收藏到场景卡组", create: "新建场景卡组 ＋", newHint: "自定义名称与场景", saved: (name: string) => `已收藏到「${name}」`, already: "已经在这个卡组里了" },
  promise: {
    steps: ["合约创建", "合约签订", "合约结算", "权益发放"], eyebrow: "AGREEMENT CREATION", title: "建立一份", titleEnd: "双方认可的合约。",
    hint: "明确约定事项与权益内容，确认后将生成协议。", label: "我们赌——", placeholder: "例如：这周谁先熬夜超过 12 点…", benefit: "赢家权益", options: ["周末早餐", "请喝一杯", "一次无条件答应"], custom: "自定义一份权益…", create: "生成协议并进入签署", edit: "修改约定", signStep: "第二步 · 合约签订", signTitle: "请双方核对条款并亲笔签署", lab: "PLAYBIT · RELATIONSHIP LAB", document: "社交赌约协议", intro: "双方本着自愿、有趣且愿赌服输的原则，郑重约定：", terms: (benefit: string) => `本协议唯一权益为：${benefit}。结果确认后，由胜方向败方核销。`, a: "甲方", b: "乙方", signA: "甲方签字", signB: "乙方签字", signed: "已签署", unsigned: "待签署", signArea: "手写签名区域", resign: "重签", signHere: "请在这里签名", signHint: "需要甲乙双方亲笔签署，才算正式立约。", signReady: "双方签字完成，可以落印生效。", seal: "签字完成，盖章生效", stamping: "正在落印…", sealed: "印章已落，合约正式生效", sealText: "见证", resultStep: "第三步 · 合约结算", resultTitle: "登记履约结果并确认权益归属", active: "协议有效", resultLabel: "SETTLEMENT RESULT", winnerTitle: "确认权益获得方", winnerHint: "请根据实际结果选择一方。确认后，权益将自动签发。", or: "或", selected: "已选择为权益获得方", select: (party: string) => `选择${party}`, confirmWinner: (party: string) => `确认 ${party} 获胜`, awaiting: "等待选择获胜方", issuedToast: "权益已签发", issuedEyebrow: "BENEFIT ISSUED", issuedTitle: "胜者权益，", issuedTitleEnd: "现在签发。", issuedHint: (party: string) => `恭喜${party}。这份赢来的期待，已经放进权益夹。`, issuedType: "赌约权益 · 已发放", viewWallet: "点击前往权益夹查看", issued: "权益已发放", proof: "权益已安全送达", proofHint: "可在「权益」中查看与核销", viewDocument: "查看正式合约", detailHint: "合约详情可用于社交分享", another: "再发起一份赌约", records: "签约的协约", noRecords: "还没有约定记录", recordEmpty: "有想认真记下的约定，再来这里。", newPromise: "发起约定", documentTitle: "社交赌约协议书", authority: "CONTRACT RECORD", number: "合约编号：", initiator: "甲方（发起方）", counterparty: "乙方（参与方）", documentIntro: "甲乙双方基于真实意愿，就以下事项达成一致，并自愿记录本次约定。", clause1: "第一条　赌约事项", clause2: "第二条　约定权益", clause3: "第三条　履约约定", fulfillment: "双方以真诚、有趣、尊重彼此为原则完成履约。Playbit 记录双方约定，不核实现场结果。", result: (party: string) => `登记的获胜方为${party}。`, date: "签订日期：", sealName: "约定记录专用章", share: "分享", shareDocument: "分享这份约定", download: "保存约定图片", sharing: "正在生成…", shared: "已打开系统分享", downloaded: "约定图片已下载", shareFailed: "暂时无法生成图片，请重试", missing: "这份约定暂时找不到了", returnRecords: "返回约定记录"
  },
  wallet: {
    eyebrow: "MY BENEFITS", title: ["赢来的，", "都在这里。"], available: "可核销", label: "我的权益", game: "游戏彩头", promise: "签约权益", direct: "主动签发", redeem: "确认核销", redeemed: "已核销", redeemTitle: "确认这份权益已核销？", redeemHint: "请在对方实际履约后确认核销，这份记录会保留在权益夹。", redeemConfirm: "确认核销", redeemedToast: "已记下这次核销", used: "已核销", empty: "还没有权益，先去好好玩一局。", source: "来自双方的约定", localNotice: "由你们自行约定与核销", flipHint: "点击看签发信息", backTitle: "签发证明", number: "权益编号", issuer: "签发人", issuedAt: "签发时间", redeemedAt: "核销时间", backHint: "点击返回卡面", signatureMissing: "暂未留存手写签名", issueTitle: "手动签发", issueHint: "填写权益并留下签名，分享给对方登录领取。", issueContent: "卡券内容", issueSource: "卡券来源", issueSourceOptions: { manual: "手动签发", game: "游戏彩头", promise: "赌约权益", custom: "自定义来源" }, issueSourcePlaceholder: "例如：朋友间的约定", issueSign: "签发方手写签名", issueSignHint: (name: string) => `${name}签名后，这份权益才会生成。`, issueAction: "签名并生成权益卡", issueCreated: "权益卡已生成", issueIssuedLabel: "待领取权益", issuePending: "等待对方登录领取", issueShare: "分享给对方领取", issueSelfClaim: "在本机领取（演示）", issueShared: "已打开系统分享；跨设备领取将在接入账户后生效", issueClaimed: "已领取到本机权益"
  },
  profile: {
    eyebrow: "PLAYBIT ID · 0826", defaultName: "今晚也要好好玩", tagline: "和喜欢的人，留下一点有意思的时刻", edit: "编辑", editTitle: "想怎么称呼你？", name: "昵称", decks: "我的场景卡组", all: "查看全部", services: "服务与设置", recordsHint: (n: number) => `${n} 份约定记录`, notificationTitle: "系统通知", notificationHint: "1 条未读", notifications: "暂时没有新的通知", accountTitle: "账户管理", accountHint: "资料与隐私", securityTitle: "安全设置", securityHint: "设备与权限", version: "PLAYBIT 1.0 · OPEN AND PLAY", resetTitle: "清除本机记录？", resetHint: "会清除新页面保存的卡组、彩头和演示约定，无法恢复。", reset: "清除本机记录", resetDone: "本机记录已清除", saved: "资料已保存", localHint: "收藏与约定保存在这台设备上。"
  },
  error: { title: "页面暂时没有打开", hint: "先返回游戏，已保存的记录会保留。", retry: "重新打开", storage: "无法保存到浏览器，当前内容可继续使用，但刷新后可能丢失。" }
} as const;

