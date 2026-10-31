const playerCopyBase = {
  brand: "Playbit",
  close: "关闭",
  back: "返回",
  cancel: "取消",
  confirm: "确认",
  save: "保存",
  sharing: { opened: "已打开系统分享", copied: "领取链接已复制", failed: "分享未完成，请重试", unavailable: "这份权益尚未生成领取链接，暂时无法分享", linkLabel: "领取链接", pendingTitle: "待领取的签发", resume: "继续分享", issuing: "正在签发…", claiming: "正在领取…" },
  nav: { benefits: "权益", play: "Playbit", me: "我的", label: "主导航", toPlay: "切换到游戏模式", toPromise: "切换到赌约模式" },
  play: {
    scene: "场景", ai: "AI 组局", author: "Playbit", justNow: "刚刚", happening: "正在发生",
    turn: "现在轮到你回答", payoff: "这张卡可能带来", quote: "“把它发给那个你想听到答案的人。”",
    answers: "2,481 人收藏", stake: "添个彩头", stakeVoice: "彩头原声", stakeVoiceHint: "说一句，之后交给赢家。", stakeVoiceRecord: "点击录下这句", stakeVoiceReady: "这句彩头已留好", stakeAdded: "本局彩头", stakeEdit: "修改彩头", anticipation: "加一点期待",
    defaultStake: "输的人请喝一杯", swipe: "上滑，发现下一张", next: "下一张", previous: "上一张",
    mediaPlay: "播放", mediaPause: "暂停", mediaResume: "继续播放", mediaFailed: "这段内容没加载好，点此重试",
    gestureGuide: "按住，等它翻", collectHint: "继续按住，收进卡组", liked: "已喜欢", unliked: "取消喜欢", sharedCard: "卡片内容已复制", comment: "评论", share: "分享", socialLabel: "卡片操作", commentUnavailable: "评论入口将在创作模块开放", howToPlay: "HOW TO PLAY · 这轮怎么玩", clockStart: "开始倒计时", countdownRemaining: "还剩", countdownSeconds: "秒", countdownResult: "时间到，按你们的约定确认结果。",
    serious: "现在，认真玩", rules: "HOW TO PLAY · 这轮怎么玩", putDown: "，然后把手机放下。",
    returnHint: "彩头只能结算 · 上滑换题", typeModeEntryHint: "左滑同类玩法 · 上下换题", typeModeHint: "上下换题 · 右滑退出同类", sameType: (name: string) => `同类玩法 · ${name}`, typeModeEntered: (name: string) => `已进入「${name}」同类玩法`, typeModeExited: "已退出同类玩法", collect: "收藏到卡组", removeCollection: "取消收藏",
    stakeTitle: "给这一局留句原声", stakeHint: "说一句彩头，之后交给赢家。", stakePlaceholder: "例如：输的人请喝一杯", stakeConfirm: "记下这句", removeStake: "移除彩头", stakeRemoved: "已移除彩头", stakeSaved: "彩头原声已记下", stakeNavHoldHint: "长按录下彩头", stakeNavRecording: "松手保存", stakeNavSettlement: "彩头结算", stakeNavShare: "分享权益",
    issueStake: "签发并分享", issueStakeTitle: "把彩头交给赢家", issueStakeHint: "这段原声会留在权益卡背面。", issueStakeVoice: "彩头原声", issueStakeVoiceHint: "已录好的原声可以直接签发。", issueStakeAction: "签发并分享", issueStakeSigned: "彩头已签发", issueStakePending: "等待获胜方领取", issueStakeShare: "分享给获胜方", issueStakeSelfClaim: "我来领取", issueStakeShared: "已打开系统分享；跨设备领取将在接入账户后生效", issueStakeClaimed: "已领取到本机权益", issueStakeNudge: "彩头已记下", issueStakeNudgeAction: "交给赢家",
    stakeRecords: "彩头记录", stakeRecordsEyebrow: "STAKE NOTES", stakeRecordsHint: "先记着，之后随时可以交给赢家。", stakeRecordsEmpty: "还没有待交出的彩头", stakeRecordsEmptyHint: "在卡片上添个彩头，之后交给赢家。", stakeRecordsClear: "清空", stakeRecordsClearTitle: "清空全部彩头记录？", stakeRecordsClearHint: "清空后会同时移除这些卡片上的彩头原声，之后需要重新录入。", stakeRecordsClearConfirm: "确认清空", stakeRecordsCleared: "彩头记录已清空", stakeTranscriptionUnavailable: "彩头语音已保存，文字暂未生成", stakeRecordsLoadMore: (count: number) => `上滑继续 · 还有 ${count} 条`, stakeRecordsAllLoaded: "已经到底了", stakeRecordIssue: "交给赢家", stakeRecordExpires: (hours: number) => `${hours} 小时内有效`, stakeRecordDelete: "删除彩头记录", stakeRecordDeleteTitle: "删除这条彩头记录？", stakeRecordDeleteHint: "删除后会同时移除这张卡上的彩头原声，之后需要重新录入。", stakeRecordDeleteConfirm: "确认删除", stakeRecordDeleted: "彩头记录已删除"
  },
  scenes: {
    eyebrow: "PLAY IN REAL LIFE", title: "现在，什么局？", hint: "就从眼前的这几分钟开始。", official: "此刻的场景", explore: "探索全部", mine: "我的场景卡组", create: "新建卡组", createTitle: "给卡组起个名字", name: "卡组名称", namePlaceholder: "例如：下班后玩一会儿", empty: "还没有收藏卡片", add: "新建", custom: "自定义场景", count: (n: number) => `${n} 张卡片`, switched: (name: string) => `已切换到「${name}」`, duplicate: "已有同名卡组", emptyDeck: "这个卡组还没有卡片，先去收藏喜欢的内容", created: "卡组已创建", deleteTitle: "删除这个场景卡组？", deleteHint: "卡组里的收藏会一起移除，但原来的游戏卡片不会受影响。", deleteAction: "删除卡组", deleted: "场景卡组已删除"
  },
  ai: { eyebrow: "PLAYBIT AI", title: "说说现在的气氛", hint: "先从现有卡片里，找一个更适合此刻的场景。", placeholder: "例如：还要等车五分钟，两个人，想找点乐子…", suggestions: ["等车5分钟", "谁来洗碗", "店里整点活动"], send: "选择适合的场景" },
  collection: { eyebrow: "SAVE TO SCENE", title: "收藏到场景卡组", create: "新建场景卡组 ＋", newHint: "自定义名称与场景", saved: (name: string) => `已收藏到「${name}」`, removed: (name: string) => `已从「${name}」取消收藏`, already: "已经在这个卡组里了" },
  promise: {
    steps: ["合约创建", "合约签订", "权益发放"], eyebrow: "AGREEMENT CREATION", title: "建立一份", titleEnd: "双方认可的合约。",
    hint: "明确约定事项与权益内容，确认后将生成协议。", label: "我们赌——", placeholder: "例如：这周谁先熬夜超过 12 点…", benefit: "约定权益", options: ["周末早餐", "请喝一杯", "一次无条件答应"], custom: "自定义一份权益…", create: "生成协议并进入签署", edit: "修改约定", signStep: "第二步 · 合约签订", signTitle: "请双方核对条款并亲笔签署", lab: "PLAYBIT · RELATIONSHIP LAB", document: "社交赌约协议", intro: "双方本着自愿、有趣且愿赌服输的原则，郑重约定：", terms: (benefit: string) => `本协议唯一权益为：${benefit}。结果由双方现场确认，再交给实际获得方。`, a: "甲方", b: "乙方", signA: "甲方签字", signB: "乙方签字", signed: "已签署", unsigned: "待签署", signArea: "手写签名区域", resign: "重签", signHere: "请在这里签名", signHint: "需要甲乙双方亲笔签署，才算正式立约。", signReady: "双方签字完成，可以落印生效。", seal: "签字完成，盖章生效", stamping: "正在落印…", sealed: "印章已落，合约正式生效", sealText: "见证", resultStep: "第三步 · 权益发放", resultTitle: "把约定交给对方", settlementHint: "协议已经生效，签发后交给实际获得方。", settlementActionHint: "留下签发原声后，分享给实际获得方登录领取，也可以由自己领取。", settlementIssuedHint: "签发原声已留存，接下来可以分享或由自己领取。", active: "协议有效", resultLabel: "BENEFIT ISSUANCE", winnerTitle: "确认权益获得方", winnerHint: "请根据实际结果选择一方。确认后，权益将自动签发。", or: "或", selected: "已选择为权益获得方", select: (party: string) => `选择${party}`, confirmWinner: (party: string) => `确认${party}获胜`, awaiting: "等待选择获胜方", issueBenefit: "签发这份权益", issueBenefitTitle: "把约定权益交给对方", issueBenefitHint: "留下这段原声，分享给实际获得方登录领取。", issueBenefitSigned: "权益已签发", issueBenefitPending: "等待对方登录领取", issueBenefitShare: "分享给对方领取", issueBenefitSelfClaim: "我来领取", issueBenefitShared: "已打开系统分享；跨设备领取将在接入账户后生效", issueBenefitClaimed: "已领取到本机权益", issuedToast: "权益已签发", issuedEyebrow: "BENEFIT ISSUED", issuedTitle: "权益已签发", issuedTitleEnd: "现在可以领取。", issuedClaimedTitle: "权益已领取", issuedClaimedTitleEnd: "已经放进权益中心。", issuedHint: (party: string) => `这份约定权益已经交给${party}。`, issuedType: "赌约权益 · 已发放", viewWallet: "查看权益中心", issued: "权益已发放", proof: "权益已安全送达", proofHint: "可在「权益」中查看与核销", viewDocument: "查看正式合约", detailHint: "合约详情可用于社交分享", another: "再发起一份赌约", records: "签约的协约", noRecords: "还没有约定记录", recordEmpty: "有想认真记下的约定，再来这里。", newPromise: "发起约定", documentTitle: "社交赌约协议书", authority: "CONTRACT RECORD", number: "合约编号：", initiator: "甲方（发起方）", counterparty: "乙方（参与方）", documentIntro: "甲乙双方基于真实意愿，就以下事项达成一致，并自愿记录本次约定。", clause1: "第一条　赌约事项", clause2: "第二条　约定权益", clause3: "第三条　履约约定", fulfillment: "双方以真诚、有趣、尊重彼此为原则完成履约。Playbit 记录双方约定，不核实现场结果。", result: (party: string) => `登记的获胜方为${party}。`, date: "签订日期：", sealName: "约定记录专用章", share: "分享", shareDocument: "分享这份约定", download: "保存约定图片", sharing: "正在生成…", shared: "已打开系统分享", downloaded: "约定图片已下载", shareFailed: "暂时无法生成图片，请重试", missing: "这份约定暂时找不到了", returnRecords: "返回约定记录"
  },
  auth: {
    loginTitle: "登录后继续",
    registerTitle: "创建 Playbit 账户",
    loginHint: "权益会放进你的账户，换设备也能继续查看。",
    registerHint: "只需要一个昵称、邮箱和密码。",
    email: "邮箱",
    emailPlaceholder: "name@example.com",
    emailHint: "支持 QQ、163、Gmail 等常用邮箱",
    password: "密码",
    passwordPlaceholder: "至少 8 位",
    nickname: "昵称",
    nicknamePlaceholder: "怎么称呼你？",
    login: "登录",
    register: "创建账户",
    switchToRegister: "还没有账户？创建一个",
    switchToLogin: "已有账户？直接登录",
    requiredTitle: "登录后查看你的权益",
    requiredHint: "签发可以直接完成；登录后，领取的权益才会保存到你的权益夹。",
    required: "这一步需要登录，权益才能归属到你。",
    failed: "登录信息不正确，请再试一次。",
    network: "暂时连不上权益服务，请稍后再试。"
  },
  wallet: {
    eyebrow: "MY BENEFITS", title: ["赢来的，", "都在这里。"], available: "可核销", label: "我的权益", game: "游戏彩头", promise: "签约权益", direct: "主动签发", redeem: "确认核销", redeemed: "已核销", redeemTitle: "确认这份权益已核销？", redeemHint: "请在对方实际履约后确认核销，这份记录会保留在权益夹。", redeemConfirm: "确认核销", redeemedToast: "已记下这次核销", used: "已核销", empty: "还没有权益，先去好好玩一局。", source: "来自双方的约定", localNotice: "由你们自行约定与核销", flipHint: "点击看签发信息", number: "权益编号", issuer: "签发人", issuedAt: "签发时间", redeemedAt: "核销时间", backHint: "点击返回卡面", signatureMissing: "暂无原声", issueTitle: "签发权益", issueHint: "录下这段原声，签发后分享给对方登录领取。", issueVoiceTitle: "一段原声", issueVoiceDescription: "由签发方留下的一段原声权益。", issueSource: "卡券来源", issueSourceOptions: { manual: "手动签发", game: "游戏彩头", promise: "赌约权益", custom: "自定义来源" }, issueVoice: "签发原声", issueVoiceRecord: "点击录音", issueVoiceHint: (name: string) => `${name}的声音会留在这张权益卡背面。`, issueAction: "录音并生成权益卡", issueIssuedLabel: "待领取权益", issuePending: "等待对方登录领取", issueShare: "分享给对方领取", issueSelfClaim: "在本机领取（演示）", issueShared: "已打开系统分享；跨设备领取将在接入账户后生效", issueClaimed: "已领取到本机权益",
    claimEyebrow: "A BENEFIT FOR YOU", claimTitle: "有人把一份权益交给你。", claimHint: "登录后，这份权益会进入你的权益夹。", claimIssuer: (name: string) => `${name}签发`, claimRemaining: (count: number) => `还可以领取 ${count} 次`, claimAction: "领取到我的权益", claimLogin: "登录后领取", claimLoading: "正在打开这份权益…", claimUnavailable: "这份权益已经被领取完了。", claimError: "这份权益暂时无法打开，请稍后再试。", claimSuccess: "权益已领取，已放进你的权益夹"
  },
  profile: {
    eyebrow: "PLAYBIT ID · 0826", defaultName: "今晚也要好好玩", tagline: "和喜欢的人，留下一点有意思的时刻", edit: "编辑", editTitle: "想怎么称呼你？", name: "昵称", decks: "我的场景卡组", decksHint: "把喜欢的内容收进自己的场景，下次直接打开。", all: "查看全部", services: "服务与设置", recordsHint: (n: number) => `${n} 份约定记录`, notificationTitle: "系统通知", notificationHint: "活动与状态更新", notifications: "暂时没有新的通知", notificationIntro: "这里会显示权益领取、彩头签发和约定状态的更新。", notificationEmpty: "暂时没有新的通知", notificationItems: [{ title: "Playbit，随时开一局", body: "打开应用就能开始一张游戏卡，喜欢的内容可以收进自己的场景卡组。", meta: "PLAYBIT · 产品消息" }, { title: "权益会留在你的权益夹", body: "签发、领取和核销都会留下清楚的记录，双方按自己的约定完成履约。", meta: "PLAYBIT · 权益更新" }, { title: "现场结果由你们确认", body: "Playbit 不在现场裁判，只替你们记录已经确认的结果。", meta: "PLAYBIT · 使用提醒" }], accountTitle: "账户管理", accountHint: "资料与隐私", accountIntro: "管理你的 Playbit 名称和本机体验数据。", accountLocalTitle: "本机体验", accountLocalHint: "当前原型把卡组、彩头和约定保存在这台设备上。", announcementTitle: "公告及声明", announcementHint: "了解 Playbit 的记录边界", announcementIntro: "Playbit 让线下相处更好玩，也替你记下一些值得记住的结果。", announcementItems: [{ title: "关于约定的说明", body: "Playbit 用于记录双方自愿达成的娱乐性约定。页面中的签署与结案是产品仪式，不替代正式法律文书，也不提供强制履约服务。" }, { title: "关于隐私与分享", body: "待签署链接的持有者可以查看约定内容，请只分享给预期参与者。双方签署后，合约内容仅参与双方可查看。" }, { title: "关于结果登记", body: "至于现场发生了什么，我们没在现场。结果由参与者自行登记；Playbit 不核实事实，也不裁判争议。" }], announcementFooter: "请勿在约定、签名或分享内容中填写不希望对方看到的敏感信息。", version: "PLAYBIT 1.0 · OPEN AND PLAY", resetTitle: "清除本机记录？", resetHint: "会清除新页面保存的卡组、彩头和演示约定，无法恢复。", reset: "清除本机记录", resetDone: "本机记录已清除", saved: "资料已保存", localHint: "收藏与约定保存在这台设备上。"
  },
  error: { title: "页面暂时没有打开", hint: "先返回游戏，已保存的记录会保留。", retry: "重新打开", storage: "无法保存到浏览器，当前内容可继续使用，但刷新后可能丢失。" }
} as const;

const promiseVoiceCopy = {
  voice: {
    play: "播放原声",
    playing: "正在播放",
    empty: "暂无原声",
    record: "录一段原声",
    recordShort: "开录",
    recordAgain: "重新录音",
    recording: "正在录音，点击结束",
    stopRecording: "说好了，保存",
    cancelRecording: "取消录音，保留原有原声",
    recorder: "留下这句话",
    live: "正在录音",
    requesting: "正在等待麦克风…",
    interrupted: "录音中断，请重新录制",
    stopPlaying: "停止播放",
    playError: "原声暂时无法播放，请重试",
    saving: "保存原声…",
    unavailable: "当前设备不支持录音",
    microphone: "需要允许麦克风后才能录音",
    saveError: "原声暂时无法保存，请重试",
    challengeLabel: "怎么分胜负",
    benefitLabel: "赢了拿什么",
    creationTitle: "说好了，不许赖。",
    challengeStep: "说个约定",
    benefitStep: "添个彩头",
    exampleLabel: "比如这样说",
    challengeExample: "谁先笑出声，谁就输。",
    benefitExamplesTitle: "彩头没想好？",
    benefitExamples: [
      { label: "请喝一杯", text: "输了的人，请喝一杯。" },
      { label: "包揽家务", text: "今天的碗，输的人洗。" },
      { label: "周末早餐", text: "下次的早餐，我来安排。" }
    ],
    creationNote: "把话说定，把声音留下。",
    challengePrompt: "谁和谁比，怎样才算赢。",
    benefitPrompt: "赢家拿什么，由谁来兑现。",
    recordChallenge: "录下约定",
    recordBenefit: "录下彩头",
    nextBenefit: "下一步，添个彩头",
    backToChallenge: "继续录下约定",
    benefitReminder: "也可以是周末早餐、包揽家务。",
    challengeHint: "说说你们的约定，怎样才算赢？",
    benefitHint: "说说赢家能得到什么，谁来兑现？",
    contractHint: "这份合约保留双方当时说出口的原声，结果由现场确认。",
    voiceSignature: "这份权益保留了签发原声",
    issueHint: "保留这段承诺原声，签发后分享给对方登录领取，也可以自己领取。",
    localShareHint: "原声目前仅保存在本设备，跨设备领取暂不能回放。"
  },
  shareCard: {
    eyebrow: "PLAYBIT AGREEMENT",
    signed: "已签署 ✓",
    deadline: "期限由双方自行约定",
    challengeVoice: "你们的约定",
    benefitVoice: "隐藏权益",
    revealHint: "紫色封条内，藏着这份约定的权益",
    promiseTitle: "说好了，不许赖。",
    promiseEyebrow: "这次玩真的",
    signing: "等待双人签署",
    readyToSeal: "双人签字完成",
    sealedBenefit: "神秘彩头",
    tearAction: "撕开封条，揭晓彩头",
    tearShort: "撕开听听",
    tearHint: "撕开紫色封条，听听赢了拿什么",
    revealed: "彩头已揭晓",
    listenChallenge: "听听约定",
    listenBenefit: "听听彩头",
    voiceAgreement: "以你们说出口的约定为准",
    noVoice: "未附录音",
    audioLoading: "正在加载…",
    initiator: "发起人",
    counterparty: "参与人",
    signedStatus: "已签署",
    openPlaybit: "打开 Playbit 查看完整约定",
    enterPlaybit: "进入 Playbit",
    loading: "正在打开这份约定…",
    unavailable: "这份约定暂时无法打开",
    restricted: "这份约定目前仅签约方可查看",
    loginToView: "签约方登录后查看"
  },
  download: "复制约定链接",
  downloaded: "约定链接已复制",
  shareFailed: "暂时无法分享链接，请重试",
} as const;

export const playerCopy = {
  ...playerCopyBase,
  sharing: { ...playerCopyBase.sharing, copied: "分享链接已复制", localCopied: "本地预览链接已复制，仅限当前设备打开", closed: "已结束领取" },
  play: { ...playerCopyBase.play, issueStakeClaimed: "权益已领取" },
  wallet: { ...playerCopyBase.wallet, issueSelfClaim: "我来领取", issueClaimed: "已放入权益中心" },
  promise: {
    ...playerCopyBase.promise,
    ...promiseVoiceCopy,
    issueBenefitClaimed: "权益已领取",
    steps: ["合约创建", "合约签订", "合约结算", "权益发放"], restart: "重新签约", restartTitle: "重新签约？", restartHint: "将清空本次草稿并回到创建页，已保存的合约和权益仍会保留。", restartConfirm: "确认重新签约",
    resultStep: "第三步 · 合约结算",
    resultTitle: "确认本次结果",
    settlementHint: "合约已经生效，请确认本次结果。",
    settlementActionHint: "确认后进入权益发放。",
    goToIssuance: "进入权益发放",
    issueBenefitTitleEnd: "现在发放。"
  }
} as const;

export const profileInfoLabels = {
  notificationsEyebrow: "PLAYBIT UPDATES",
  announcementsEyebrow: "PLAYBIT NOTE",
  announcementMeta: "PLAYBIT · 记录边界"
} as const;

export const offlinePromiseTerms = (benefit: string) => `本协议记录双方约定的权益：${benefit}。结果由现场确认，签发方将权益交给实际获得方。`;

