# Playbit 数据生命周期与环境规范

这份文档解决两个问题：应用重新部署时什么数据会保留，以及开发/线上验证阶段如何清理旧数据而不误伤正式数据。

## 1. 三套环境

| 环境 | `PLAYBIT_DATA_ENV` | 用途 | 数据规则 |
| --- | --- | --- | --- |
| 本地 | `dev` | 日常开发、自动化测试 | 可随时重建；不得连接正式库 |
| 预览/验证 | `preview` | Vercel Preview 和线上流程验证 | 使用独立 PostgreSQL；允许批量清理测试数据 |
| 正式 | `prod` | 用户真实数据 | 只允许增量迁移和定向归档；禁止直接清库 |

推荐绑定方式：

- Railway `playbit-api-preview` -> `playbit-preview-db`。
- Railway `playbit-api-prod` -> `playbit-prod-db`。
- Vercel Preview 使用 preview API，Production 使用 prod API。
- 不要让本地 `.env`、Vercel Preview 或临时脚本读取 prod 的 `DATABASE_URL`。

环境名必须和数据库实例一起记录。环境变量本身不是安全边界，但能让启动日志、清理脚本和人工检查有明确的保险丝。

## 2. 推送和重新部署的安全边界

正常 `git push`、Railway API 重启、Vercel 前端重新部署都不会删除 PostgreSQL 数据。上线前后检查：

1. Railway PostgreSQL 服务仍是同一个服务，没有删除后重新创建。
2. API 的 `DATABASE_URL` 没有变化，且指向预期环境。
3. `PLAYBIT_DATA_ENV` 正确：正式为 `prod`，验证为 `preview`。
4. Railway 的启动命令先执行 `db:migrate`，再启动 API。
5. `/health` 返回正常后，再用一个已存在的测试账号验证一条历史记录。
6. 迁移失败时停止发布，不要通过删除迁移记录或重建数据库“修复”。

当前 API 已在 `prod`/`preview` 且缺少 `DATABASE_URL` 时拒绝启动，避免最危险的静默内存模式。

## 3. 备份和恢复

正式库至少保留两类备份：

- Railway PostgreSQL 的自动备份/时间点恢复能力。
- 发布前的逻辑备份，保存到受控的私有存储，不放进 Git。

逻辑备份示例（在有 `pg_dump` 的受控机器执行）：

```bash
pg_dump --format=custom --no-owner --no-acl "$DATABASE_URL" > playbit-prod-2026-10-01.dump
```

恢复只能先恢复到临时数据库，再做表级核对；不要直接覆盖正式库。至少核对 `users`、`agreements`、`coupons`、`game_results`、`certificates` 和迁移版本。

## 4. 清理策略

### 预览/验证环境

预览库可以清理，但要按批次、标记或明确时间范围清理。优先顺序：

1. 删除测试账号创建的业务数据（依赖外键级联或按依赖顺序删除）。
2. 删除导入批次对应的草稿和测试内容。
3. 清理事件明细和可重建分析聚合。
4. 保留迁移历史和系统字典，不用删表来“恢复干净”。

建议所有验证数据带有明显标记，例如测试账号邮箱使用 `@playbit.test`，内容导入批次使用 `test-YYYYMMDD`。清理条件必须是环境 + 标记/批次，禁止只按“最近几天”模糊删除。

### 正式环境

正式数据不做“恢复出厂”。内容和策略使用状态流转：`paused`、`retired`、`archived`，历史结果、证书、权益和审计记录默认保留。只有满足以下条件才允许物理删除：

- 已确认不是用户资产、履约证据或审计记录。
- 已完成备份并能在临时库恢复核验。
- 有明确的删除范围、原因和操作者记录。
- 先在 preview 执行同样的 SQL 并核对影响行数。

线上旧内容优先下架，不要删除已被展示、游玩、结算或引用的内容。发布版本采用追加新版本，历史卡片保存版本快照，避免修改历史数据后无法解释旧结果。

## 5. 当前必须正视的限制

合约、用户、权益、翻牌、赖皮券和结算相关 Repository 已接入 PostgreSQL。内容运营域当前仍由
`apps/api/src/contentRepository.ts` 的内存实现承载，以下内容在 API 重启后会丢失：

- 内容库新增/修改的草稿、审核状态和发布状态。
- 内容导入结果及运行时推荐状态。
- 收藏、曝光、游玩事件和内存分析聚合。

因此，当前版本可以保证协议域数据不因重新部署丢失，但不能宣称“整个 Playbit 数据都已持久化”。内容域数据库迁移是正式上线前的阻断项，至少需要落地 L1、L1 版本、L2、L2 版本、工具关联、事件幂等和日聚合表，再切换内容 API 的 Repository。

## 6. 发布前最小清单

- [ ] Preview 和 Production 使用不同 Railway PostgreSQL 服务。
- [ ] 两个 API 都设置正确的 `PLAYBIT_DATA_ENV` 和 `DATABASE_URL`。
- [ ] Railway PostgreSQL 自动备份已启用，并完成一次恢复演练。
- [ ] 发布只新增迁移，不删除旧迁移，不执行 `DROP`/`TRUNCATE`。
- [ ] 内容域持久化完成前，不把内容管理端当作正式数据源。
- [ ] 清理脚本默认只接受 `preview`，正式清理需要单独的人工确认流程。
