# Playbit 游戏内容与分发系统开发计划

## 0. 目标与边界

本计划把 Playbit 的游戏内容做成一个可以持续研发、审核、分发和复盘的系统，同时保持用户侧足够轻：用户看到的是一张抽出来就能玩的卡，不看到 L0/L1/L2 等研发语言。

### 用户侧的产品承诺

- 主持人打开「来一局」，抽到卡后可以立即开始；不要求登录，不创建房间，不邀请加入，不要求参与者进入 Playbit。
- 计时器、计数器、记分牌是可复用的现场工具，只有被当前卡声明或推断需要时展示。
- 游戏结束后，主持人可以本地记录双人胜负或多人排名，也可以只记录“本局完成”。结果登记、证书分享、独立权益结算是三个可选动作，不互相强制。
- 游戏卡不会自动创建合约、下注或共享权益。正式签约仍走原有合约流程；游戏结果需要权益时，从独立结算入口发起。

### 暂不做

- 游戏房间、实时同步、参与者加入页、游戏卡分享链接。
- 游戏内下注、加注、平台判定、真实货币和全局排名。
- 面向用户展示 L0/L1/L2、推荐分数、冻结次数和展示次数。
- 先迁移现有 Agreement/Coupon 数据模型。现有 `/games` 是兼容路径和迁移债务，不再添加能力。

## 1. 开发阶段与优先级

| 阶段 | 交付 | 优先级 | 验收重点 |
| --- | --- | --- | --- |
| P0 | 边界、状态和数据契约冻结 | 已完成 | 新游戏流不依赖 Agreement/Coupon |
| P1 | 用户端轻量游戏闭环（前端 mock） | 已完成 | 首页进入、抽卡、工具、结果、证书预览可走通 |
| P2 | 用户端复盘与可观察性 | 已完成 | 展示、开始、完成、放弃、重抽、工具使用和收藏事件具备幂等上报与本地重试 |
| P3 | PC 管理端 `/studio` 原型 | 已完成 | 内容库、实验室、真实草稿编辑、审核、发布、分发与分析入口可操作 |
| P4 | 内容与工具后端 | 已完成（内存实现 + DDL） | L1/L2 版本、发布快照、工具声明、审核工作流和规则接口可追溯；PostgreSQL 迁移边界已形成 |
| P5 | 推荐与统计 | 已完成（规则版） | L1/L2 冷却、收藏偏好、曝光/开始/完成分离、L1 聚合指标和推荐超时前端降级已接入 |
| P6 | 权益域接入 | 已完成（兼容层） | 独立结算可选关联游戏结果/证书，Coupon 可独立成立；生产迁移 SQL 待数据库环境执行 |

## 2. P1 用户端实现契约

### 2.1 状态机

```text
PLAYING -> RESULT
   |          |
   +--REROLL--+--PLAY_AGAIN--> PLAYING
```

- 抽到卡即进入 `PLAYING`：完整卡面直接可带玩，允许换一张；不需要额外的“开始”确认，也不触发持久化。
- `PLAYING`：卡面仍可查看，打开工具抽屉；工具状态仅在当前浏览器内存中存在。
- `RESULT`：主持人记录结果。双人卡选择 A/B/平局，多人卡使用本地记分牌；没有胜负的卡只记录完成。
- 刷新页面或离开页面默认丢弃未保存的游戏状态；这是轻量游戏，不伪装成可恢复房间。

### 2.2 工具运行协议

卡片未来由具体 `l1_game_version` 声明 `REQUIRED` 或 `OPTIONAL` 工具。P1 暂用前端推断兼容现有卡，后端接入后必须以已发布版本快照为准。

```ts
type ToolId = "timer" | "counter" | "scoreboard";
type ToolRequirement = "REQUIRED" | "OPTIONAL";
```

- 必需工具不可用时，卡片不能进入候选；可选工具不可用时回退到口头玩法。
- 工具在卡内嵌面板或底部抽屉打开，不跳独立页面，不覆盖规则正文。
- 工具的开始、暂停、加一、改分等状态不形成全局积分、权益或用户资产。
- 记分牌预留多人模式：当前只保存本地玩家标签和分数，未来结果提交时可映射为 `participant_snapshot`。

### 2.3 Mock 数据结构

```ts
type LocalPlaySession = {
  id: string;
  cardId: string;
  cardSnapshot: Card;
  phase: "ready" | "playing" | "result";
  toolState: Record<string, unknown>;
  result: {
    kind: "winner" | "ranking" | "completed";
    winnerLabel?: string;
    ranking?: Array<{ label: string; score: number }>;
    note?: string;
  } | null;
  startedAt: string | null;
  completedAt: string | null;
};
```

P1 的 `cardSnapshot` 是为了验证版本冻结意识；P4 才将它转成服务端 `game_card_instances`。不允许用当前 catalog 的实时对象替代已经开始的卡。

## 3. P2 用户端事件与复盘

事件最小集合：`exposed`、`rerolled`、`started`、`tool_opened`、`completed`、`abandoned`。曝光和开始必须分开，不能用抽卡次数替代真实游玩次数。

- 匿名阶段使用服务端签发的 `actor_key` 和客户端 `client_event_id`，不能使用 IP/UA 去重。
- 事件上报失败不阻塞开始游戏；本地短队列可重试，重复事件必须幂等。
- 收藏记录 L1 偏好，不改变 L2 冻结与永久消耗规则。

### 3.1 客户端事件接口

```ts
type GameEventName =
  | "exposed"
  | "rerolled"
  | "started"
  | "tool_opened"
  | "completed"
  | "abandoned";

type GameEvent = {
  clientEventId: string;
  actorKey: string;
  sessionId: string;
  cardId: string;
  eventName: GameEventName;
  occurredAt: string;
  payload?: Record<string, unknown>;
};
```

P2 先在前端实现可替换的事件队列和接口适配器。没有后端时事件保存在当前浏览器的短队列中；后端可用时批量发送并在成功后删除。队列不是游戏状态恢复机制，刷新不恢复卡片。

## 4. P3 PC 管理端 `/studio`

首版固定本地入口：`http://localhost:5173/studio`，暂不登录，仅用于内部观察。生产配置必须通过环境变量关闭免登录并接入角色权限。

### 工作区

1. **总览**：今日曝光、开始率、完成率、跳过率、工具使用率、异常内容。
2. **内容库**：按 L1 玩法骨架、状态、来源、版本和标签筛选；用户端只显示内容标题，不显示内部层级。
3. **卡片实验室**：编辑 L2 内容、声明工具、预览完整卡面、模拟主持人流程。
4. **审核与试玩**：Agent 草稿 → 待审核 → 退回修改 → 已发布 → 暂停/淘汰；审核对象必须是具体版本。
5. **分发与分析**：冻结策略、展示次数、内容冷却、分群推荐和发布影响。

### 协作规则

- Agent 负责检索、改写候选和结构化提案；人工审核标题、规则可玩性、文化风险、重复度和发布版本。
- 发布后版本不可原地修改；修订生成新版本，已经开始的游戏永远读旧快照。
- 淘汰是内容状态，不是删除历史；暂停只影响新分发。

## 5. P4 后端接口契约（先定义，后实现）

```text
GET  /content/cards/next
POST /content/play-sessions
POST /content/play-sessions/:id/events
POST /content/play-sessions/:id/complete
POST /content/events                         # 客户端批量上报兼容入口
GET  /studio/content
POST /studio/l1                             # 创建 L1 草稿
POST /studio/l2                             # 创建结构化 L2 草稿
PATCH /studio/l2/:id                        # 编辑草稿态结构化字段
POST /studio/l1/:id/versions
POST /studio/l2/:id/submit
POST /studio/l2/:id/review
POST /studio/l2/:id/publish
POST /studio/versions/:id/review
POST /studio/versions/:id/publish
PATCH /studio/l2/:id/reuse-policy            # 修改冻结策略并写审计
GET  /studio/l2/:id/reuse-policy/audits
POST /studio/l2/:id/reuse-policy/rollback
GET  /studio/analytics/content
POST /content/preferences                    # 收藏/取消收藏 L1
POST /coupons/independent                   # 登录主持人发放独立权益
```

所有写接口需要 `request_id` 或 `client_event_id`；响应必须返回内容版本快照和可恢复的实例 ID。推荐服务超时返回最近一次审核通过的基础分发结果，不能让用户卡在抽卡页。

## 6. 数据库落地顺序与性能原则

现有 `docs/game-content-ops-schema.sql` 作为方向稿，不在 P1 直接迁移。正式实施时按以下顺序：

1. 内容实体与版本：`l1_games`、`l1_game_versions`、`l2_contents`、`l2_content_versions`、`content_tools`。
2. 发布快照与卡片实例：`content_publications`、`game_card_instances`。
3. 事件流水：按月或按周分区的 append-only `game_events`，聚合表承载推荐读取。
4. 用户聚合：`user_l1_exposures`、`user_l2_exposures`、`user_l1_preferences`。
5. 推荐结果缓存和审核审计。

性能底线：高频事件不和内容主表 join；事件明细与聚合读写分离；所有事件批量写入并以 `(actor_key, client_event_id)` 幂等；候选查询只读发布版本和聚合状态；索引围绕 `actor_key + next_available_at`、`l1_id + status`、`published_at` 设计。没有拿稳的分库分表策略不提前写死，先以单库分区和可重建聚合表验证规模。

## 7. 每阶段验收

### P1

- 首页「开一局」进入新轻量流，不经过 `/games`、登录、签约或下注。
- 卡片完整展示，重抽有克制动效；计时器、计数器、记分牌在卡内面板可用。
- 双人胜负、多人排名和无胜负完成均有明确结果页；刷新不声称可恢复。
- 结果预览可分享/保存的接口位置明确，但不伪造服务端证书或权益。
- `pnpm --filter @playbit/web check`、测试、构建通过，移动端无横向滚动。

### P3/P4/P5/P6

每阶段必须分别通过版本快照、审核状态、事件幂等、推荐降级、权益来源可空和历史不可变检查后再进入下一阶段。

## 8. 当前实现与生产门槛

- `apps/api/src/contentRepository.ts` 是可替换的内存实现，用于验证业务状态、推荐规则和 API 契约；它不会被误认为生产持久化。
- 当前原型已完成 L1/L2 创建与分离审核发布：L1 版本决定玩法规则快照，L2 使用 `contentType + payload` 保存可扩展内容字段；用户分发只读取已发布的 L1 版本与 L2。
- L1 与 L2 冷却分别聚合：L1 防止连续抽到同类玩法，L2 按永久消耗或轮次/日期策略决定内容是否再次出现；收藏只影响 L1 排序，不绕过 L2 消耗。
- 冻结策略修改通过 `/studio/l2/:id/reuse-policy` 写入审计记录，并可以按审计点回滚；当前 Studio 已提供编辑入口，生产仍需接入操作者权限。
- `docs/game-content-ops-schema.sql` 已覆盖内容、版本、工具、曝光聚合、事件幂等、推荐切片和审计边界，但仍需在真实 PostgreSQL 环境执行迁移、回填和并发压测。
- `/studio` 当前为无登录内部原型。生产上线前必须接入角色权限、审核理由、审计操作者和策略回滚权限；开发阶段不把隐藏按钮当作权限控制。
- 独立权益兼容层已支持 `agreement_id` 为空；赖皮券和 Flip 仍只属于正式合约链路，独立游戏结算不得直接复用它们，直到权益域迁移补齐全部约束。
- 正式证书、独立游戏结果持久化和跨设备恢复需要在产品确认 Game Result / Certificate 的生产存储职责后接入；当前用户端完成的是现场结果和证书预览，不伪造已经落库的比赛资产。

## 9. 技术债登记

- 旧 `useGameFlow` 和 `Agreement(source="card")` 继续保留为兼容路径，但不得被新首页入口调用。
- 现有 `Card` 先增加可选工具声明；在内容后端上线前，前端用保守推断，避免把推断当成数据库事实。
- 结果证书 P1 只做本地预览；正式证书和权益发放必须等 P6 明确来源、权限和审计字段后接入。
