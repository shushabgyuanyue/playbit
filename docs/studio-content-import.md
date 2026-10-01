# 内容模板导入

管理端内容库的“导入模板”用于把 Agent 或人工整理后的内容批量放入内容研发链路。模板导入只创建草稿，不会自动审核或发布。

## 文件格式

- 首选下载管理端生成的 `playbit-content-template.csv`，按表头填写后上传。
- 也支持 JSON 数组，或 `{ "rows": [...] }` 结构。
- 支持直接上传 `.xlsx`；系统只读取带有 `code`、`l1_code`、`sample_id` 等识别字段的 sheet，自动跳过 README、标签、状态说明和仪表盘 sheet。
- 单次最多 500 行；合法行继续导入，错误行会返回行号和原因。
- 导出筛选结果使用同一组字段，包含研发元数据，便于修改后再次导入。

上传的研究工作簿可以直接作为导入来源，但多个研究 sheet 不会被机械当作用户卡：可识别的原始样本会进入 L1 草稿，说明性 sheet 会被跳过。

## 必填与分层

必填字段：`code`、`name`、`minPlayers`。`title` 有值时创建一张 L2 用户卡；没有 `title` 时只创建 L1 草稿，适合导入 `01_RAW_SAMPLES` 的原始玩法样本。

可使用下划线字段名，方便从研究表转换：`sample_id`、`sample_name`、`original_rule`、`l0_primary`、`scene_tags`、`player_count`、`source_type`、`source_region`、`evidence_level`、`editorial_priority`、`editorial_comment`。其中 `L0-01` 等 L0 编码会映射到系统内部 ID，未知值会保留并在实验室标记出来。

## 研发元数据

来源、原始规则、核心互动、信息结构、控制结构、道具要求、动作强度、L2 模式、L2 来源、AI 角色、变体族和编辑备注保存在 L1 的 `research` 元数据中。它们只供实验室、审核和后续推荐分析使用，不进入用户卡面，也不改变用户端推荐运行时。

## 状态与重复

导入的 L1、L1 版本和 L2 默认是草稿。相同 `code` 或 `name` 的行不会覆盖已有内容，会作为错误返回，避免 Agent 重试时静默改写已审核内容。需要修改时请在卡片实验室编辑草稿，或先使用新的编码。
