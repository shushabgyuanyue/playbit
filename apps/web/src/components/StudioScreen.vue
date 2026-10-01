<script setup lang="ts">
import { dailyCards } from "@playbit/cards";
import type { ContentAnalytics, ContentL1ListItem, ContentListItem, ContentOverview, ContentResearch } from "@playbit/shared";
import { Activity, Archive, BarChart3, Beaker, BookOpen, CheckCircle2, ChevronRight, FlaskConical, LayoutDashboard, Search, Send, Sparkles, TimerReset } from "lucide-vue-next";
import { computed, onMounted, ref, watch } from "vue";
import { api } from "../services/api";
import { parseContentWorkbook } from "../services/contentImport";
import StudioCreateCardSheet, { type CreateCardForm } from "./StudioCreateCardSheet.vue";
import StudioDataTransfer from "./StudioDataTransfer.vue";
import StudioAnalyticsDashboard from "./StudioAnalyticsDashboard.vue";
import StudioCardAnalyticsDashboard from "./StudioCardAnalyticsDashboard.vue";
import StudioLabContext from "./StudioLabContext.vue";
import StudioWorkflowActions from "./StudioWorkflowActions.vue";

type StudioSection = "overview" | "library" | "lab" | "distribution" | "cardAnalytics";
type StudioRow = {
  id: string;
  l1Id: string;
  l2Id: string | null;
  versionId: string | null;
  code: string;
  name: string;
  status: string;
  l2Status: string;
  version: string;
  rule: string;
  hook: string;
  completionCondition: string;
  failureCondition: string;
  players: string;
  duration: string;
  tools: string[];
  scenes: string[];
  l0Ids: string[];
  research?: ContentResearch;
  contentType: "prompt" | "truth" | "sequence" | "environment";
  payload: Record<string, unknown>;
  reusePolicy: { cooldownRounds: number; cooldownDays: number; permanentExhaustion: boolean; skipCooldownRounds: number };
  updatedAt: string;
  quality: number;
  starts: number;
  completes: number;
};

const sections: Array<{ id: StudioSection; label: string; icon: typeof LayoutDashboard }> = [
  { id: "overview", label: "总览", icon: LayoutDashboard },
  { id: "library", label: "内容库", icon: BookOpen },
  { id: "lab", label: "卡片实验室", icon: FlaskConical },
  { id: "distribution", label: "分发总览", icon: Activity },
  { id: "cardAnalytics", label: "卡片分析", icon: BarChart3 }
];

const activeSection = ref<StudioSection>("overview");
const search = ref("");
const filter = ref("all");
const loading = ref(true);
const connected = ref(false);
const workflowBusy = ref(false);
const workflowMessage = ref("");
const analytics = ref<ContentAnalytics | null>(null);
const analyticsWindow = ref<ContentAnalytics["window"]>("all");
const analyticsCardId = ref<string | null>(null);
const libraryPage = ref(1);
const libraryPageSize = 10;
const libraryTotal = ref(0);
const sceneFilter = ref("all");
const toolFilter = ref("all");
const l1OnlyRows = ref<StudioRow[]>([]);
const overview = ref<ContentOverview>({
  generatedAt: new Date().toISOString(),
  l0s: [
    { id: "l0-constraint", code: "L0-01", name: "约束冲突", definition: "本能想这么做，规则偏不让。", status: "formal" },
    { id: "l0-retrieval", code: "L0-02", name: "检索枯竭", definition: "给定范围轮流检索，越往后越难。", status: "formal" },
    { id: "l0-accumulation", code: "L0-03", name: "累积负荷", definition: "前面的内容不断累积并继续增加。", status: "formal" },
    { id: "l0-reveal", code: "L0-04", name: "信息缺口", definition: "不断取得线索，直到未知答案揭晓。", status: "formal" },
    { id: "l0-mind", code: "L0-05", name: "心智博弈", definition: "给出信号，判断对方是真是假。", status: "formal" },
    { id: "l0-self-disclosure", code: "L0-06", name: "自我揭示", definition: "抛出问题，暴露经历或态度。", status: "formal" },
    { id: "l0-association", code: "L0-07", name: "联想重构", definition: "把看似无关的东西连成合理答案。", status: "formal" },
    { id: "l0-relay", code: "L0-08", name: "共创接力", definition: "一方创造，另一方接住并继续。", status: "formal" },
    { id: "l0-sensory-action", code: "L0-09", name: "感知动作博弈", definition: "观察、预测并回应对方的动作。", status: "formal" }
  ],
  counts: { l0: 9, l1: dailyCards.length, l2: dailyCards.length, published: dailyCards.length, pendingReview: 3 },
  metrics: [],
  tools: [
    { id: "tool-timer", code: "timer", name: "计时器", runtimeKey: "timer", status: "published", versionNo: 1 },
    { id: "tool-counter", code: "counter", name: "计数器", runtimeKey: "counter", status: "published", versionNo: 1 },
    { id: "tool-scoreboard", code: "scoreboard", name: "记分牌", runtimeKey: "scoreboard", status: "published", versionNo: 1 }
  ]
});

const rows = ref<StudioRow[]>(dailyCards.map((card, index) => ({
  id: card.id,
  l1Id: card.id,
  l2Id: card.id,
  versionId: null,
  code: card.id,
  name: card.name,
  status: index < 3 ? "pending_review" : "published",
  l2Status: index < 3 ? "pending_review" : "published",
  version: `v${index < 3 ? 2 : 1}`,
  rule: card.content,
  hook: card.hook ?? card.name,
  completionCondition: card.winCondition,
  failureCondition: card.reveal ?? "",
  players: `${card.participantMin}-${card.participantMax} 人`,
  duration: card.durationMinutes ? `${card.durationMinutes} 分钟` : "不限时",
  tools: card.tools ?? (card.mode === "versus" ? ["counter"] : ["timer"]),
  scenes: card.participantMax > 2 ? ["多人聚会"] : ["双人对局"],
  l0Ids: [],
  contentType: "prompt",
  payload: { content: card.content, mode: card.mode, category: card.category, tone: card.tone },
  reusePolicy: { cooldownRounds: card.category === "hidden" ? 0 : 30, cooldownDays: 0, permanentExhaustion: card.category === "hidden", skipCooldownRounds: 1 },
  updatedAt: "",
  quality: 78 + (index % 5),
  starts: 120 - index * 7,
  completes: 82 - index * 4
})));

const selectedId = ref(rows.value[0]?.id ?? "");
const labRows = computed(() => [...rows.value, ...l1OnlyRows.value]);
const selected = computed(() => labRows.value.find((row) => row.id === selectedId.value) ?? labRows.value[0] ?? null);
const workflowMeta = computed(() => {
  const row = selected.value;
  if (!row) return "";
  const l0 = row.l0Ids.map((id) => overview.value.l0s.find((item) => item.id === id)?.code ?? id).join(" + ") || "未关联";
  const parts = [`L0 ${l0}`, `L1 ${row.code}`];
  if (row.l2Id) parts.push(`L2 ${row.name}`);
  const tools = row.tools.map((code) => overview.value.tools.find((item) => item.code === code || item.id === code)?.name ?? code).join(" · ");
  parts.push(row.scenes.join(" · ") || "未标注场景", tools || "无工具");
  return parts.join(" · ");
});
const draftForm = ref({ hook: "", rule: "", completionCondition: "", failureCondition: "", changeNote: "" });
const toolSelection = ref<string[]>([]);
const policyForm = ref({ cooldownRounds: 0, cooldownDays: 0, permanentExhaustion: false, skipCooldownRounds: 1 });
const l2Form = ref({ title: "", contentType: "prompt" as "prompt" | "truth" | "sequence" | "environment", content: "", mode: "together", category: "challenge", tone: "blue" });
const showCreateForm = ref(false);
const createForm = ref({
  code: "",
  name: "",
  createL2: true,
  title: "",
  hook: "",
  rule: "",
  content: "",
  completionCondition: "",
  contentType: "prompt" as "prompt" | "truth" | "sequence" | "environment",
  mode: "together" as "together" | "versus",
  category: "challenge" as "challenge" | "rule" | "hidden",
  tone: "blue" as "coral" | "blue" | "gold",
  minPlayers: 2,
  maxPlayers: 2,
  durationMinutes: 5,
  l0Ids: ["l0-association"] as string[],
  scenes: "双人对局, 碎片时间",
  toolIds: ["timer"] as string[],
  research: {
    sourceType: "",
    sourceRegion: "",
    sourceWork: "",
    sourceUrl: "",
    propsRequirement: "NONE",
    movementLevel: "LOW",
    l2Mode: "OPTIONAL",
    l2Source: "SYSTEM",
    externalAiRequired: false,
    externalAiRole: "",
    informationStructure: "",
    controlStructure: "",
    editorialPriority: "",
    editorialNote: ""
  }
});
const draftEditable = computed(() => Boolean(selected.value?.versionId) && ["draft", "changes_requested"].includes(selected.value?.status ?? ""));
const l2Editable = computed(() => ["draft", "changes_requested"].includes(selected.value?.l2Status ?? ""));
const filteredRows = computed(() => rows.value.filter((row) => {
  const matchesSearch = !search.value || `${row.name} ${row.hook} ${row.rule}`.toLowerCase().includes(search.value.toLowerCase());
  const matchesFilter = filter.value === "all" || row.status === filter.value || row.l2Status === filter.value;
  return matchesSearch && matchesFilter;
}));
const statusLabel = (status: string) => ({ draft: "草稿", pending_review: "待审核", published: "已发布", approved: "已通过", changes_requested: "待修改", paused: "已暂停", retired: "已淘汰" }[status] ?? status);
const statusClass = (status: string) => `studio-status-${status}`;
const reviewRows = computed(() => rows.value.filter((row) => row.status === "pending_review" || row.l2Status === "pending_review"));
const activeMetric = computed(() => analytics.value?.cardMetrics ?? []);
const topCards = computed(() => activeMetric.value.filter((metric) => metric.exposures || metric.starts || metric.completes || metric.rerolls || metric.toolOpens || metric.favoriteActors).slice(0, 20));
const selectedAnalyticsMetric = computed(() => {
  const cardId = analyticsCardId.value ?? selected.value?.l2Id;
  return activeMetric.value.find((metric) => metric.l2Id === cardId) ?? null;
});
const selectedAnalyticsRow = computed(() => {
  const cardId = selectedAnalyticsMetric.value?.l2Id;
  return rows.value.find((row) => row.l2Id === cardId) ?? null;
});

function syncDraftForm(row: StudioRow | null) {
  draftForm.value = {
    hook: row?.hook ?? "",
    rule: row?.rule ?? "",
    completionCondition: row?.completionCondition ?? "",
    failureCondition: row?.failureCondition ?? "",
    changeNote: ""
  };
  policyForm.value = { ...(row?.reusePolicy ?? { cooldownRounds: 0, cooldownDays: 0, permanentExhaustion: false, skipCooldownRounds: 1 }) };
  toolSelection.value = [...(row?.tools ?? [])];
  l2Form.value = {
    title: row?.name ?? "",
    contentType: row?.contentType ?? "prompt",
    content: typeof row?.payload.content === "string" ? row.payload.content : row?.rule ?? "",
    mode: typeof row?.payload.mode === "string" ? row.payload.mode : "together",
    category: typeof row?.payload.category === "string" ? row.payload.category : "challenge",
    tone: typeof row?.payload.tone === "string" ? row.payload.tone : "blue"
  };
}

watch(selected, (row) => syncDraftForm(row), { immediate: true });

function selectSection(section: StudioSection) {
  activeSection.value = section;
  if (section === "library") void fetchLibrary();
  if (section === "lab") void fetchL1Only();
  if (section === "distribution" || section === "cardAnalytics") void fetchAnalytics();
}

function applyContent(items: ContentListItem[], total = items.length) {
  rows.value = items.map(({ l1, version, l2 }) => ({
    id: `${version.id}:${l2.id}`,
    l1Id: l1.id,
    l2Id: l2.id,
    versionId: version.id,
    code: l1.code,
    name: l2.title,
    status: version.reviewStatus,
    l2Status: l2.status,
    version: `v${version.versionNo}`,
    rule: version.shortRule,
    hook: version.displayHook,
    completionCondition: version.completionCondition,
    failureCondition: version.failureCondition ?? "",
    players: `${l1.minPlayers}-${l1.maxPlayers ?? "多人"} 人`,
    duration: l1.durationMin ? `${l1.durationMin}${l1.durationMax && l1.durationMax !== l1.durationMin ? `-${l1.durationMax}` : ""} 分钟` : "不限时",
    tools: version.toolIds,
    scenes: l1.scenes,
    l0Ids: l1.l0Ids,
    research: l1.research,
    contentType: l2.contentType,
    payload: l2.payload,
    reusePolicy: l2.reusePolicy,
    updatedAt: l2.updatedAt,
    quality: l2.qualityTier,
    starts: 0,
    completes: 0
  }));
  libraryTotal.value = total;
  if (!rows.value.some((row) => row.id === selectedId.value) && !l1OnlyRows.value.some((row) => row.id === selectedId.value)) selectedId.value = rows.value[0]?.id ?? l1OnlyRows.value[0]?.id ?? "";
}

function applyL1Only(items: ContentL1ListItem[]) {
  l1OnlyRows.value = items.map(({ l1, version }) => ({
    id: `l1:${l1.id}`,
    l1Id: l1.id,
    l2Id: null,
    versionId: version?.id ?? null,
    code: l1.code,
    name: l1.name,
    status: version?.reviewStatus ?? l1.lifecycle,
    l2Status: "",
    version: version ? `v${version.versionNo}` : "未有版本",
    rule: version?.shortRule ?? "",
    hook: version?.displayHook ?? "",
    completionCondition: version?.completionCondition ?? "",
    failureCondition: version?.failureCondition ?? "",
    players: `${l1.minPlayers}-${l1.maxPlayers ?? "多人"} 人`,
    duration: l1.durationMin ? `${l1.durationMin}${l1.durationMax && l1.durationMax !== l1.durationMin ? `-${l1.durationMax}` : ""} 分钟` : "不限时",
    tools: version?.toolIds ?? [],
    scenes: l1.scenes,
    l0Ids: l1.l0Ids,
    research: l1.research,
    contentType: "prompt",
    payload: {},
    reusePolicy: { cooldownRounds: 0, cooldownDays: 0, permanentExhaustion: false, skipCooldownRounds: 1 },
    updatedAt: l1.updatedAt,
    quality: 0,
    starts: 0,
    completes: 0
  }));
  if (!selected.value && l1OnlyRows.value[0]) selectedId.value = l1OnlyRows.value[0].id;
}

async function fetchLibrary() {
  const response = await api.listStudioContent({
    search: search.value,
    status: filter.value,
    scene: sceneFilter.value,
    tool: toolFilter.value,
    page: libraryPage.value,
    pageSize: libraryPageSize
  });
  applyContent(response.items, response.total);
}

async function fetchL1Only() {
  const response = await api.listStudioL1({ withoutL2: true });
  applyL1Only(response.items);
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"' && quoted && next === '"') { cell += '"'; index += 1; continue; }
    if (char === '"') { quoted = !quoted; continue; }
    if (char === "," && !quoted) { row.push(cell); cell = ""; continue; }
    if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell); cell = "";
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      continue;
    }
    cell += char;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

function parseImportText(text: string) {
  const normalized = text.replace(/^\uFEFF/, "").trim();
  let sourceRows: unknown[];
  if (normalized.startsWith("[")) {
    sourceRows = JSON.parse(normalized) as unknown[];
  } else if (normalized.startsWith("{")) {
    const parsed = JSON.parse(normalized) as { rows?: unknown };
    if (!Array.isArray(parsed.rows)) throw new Error("JSON must contain a rows array");
    sourceRows = parsed.rows;
  } else {
    const rows = parseCsv(normalized);
    const headers = (rows.shift() ?? []).map((header) => header.replace(/^\uFEFF/, "").trim());
    sourceRows = rows.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])));
  }
  if (!sourceRows.length) throw new Error("No content rows");
  const list = (value: unknown) => Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean)
    : String(value ?? "").split("|").map((item) => item.trim()).filter(Boolean);
  const numberOrNull = (value: unknown) => value === null || value === undefined || String(value).trim() === "" ? null : Number(value);
  return sourceRows.map((source, index) => {
    if (!source || typeof source !== "object" || Array.isArray(source)) throw new Error(`第 ${index + 1} 行不是对象`);
    const record = source as Record<string, unknown>;
    const pick = (...keys: string[]) => keys.map((key) => record[key]).find((value) => value !== undefined && value !== null && String(value).trim() !== "");
    let payload: Record<string, unknown> = {};
    const rawPayload = pick("payload", "payloadJson", "payload_json");
    if (rawPayload && typeof rawPayload === "object" && !Array.isArray(rawPayload)) payload = rawPayload as Record<string, unknown>;
    else if (String(rawPayload ?? "").trim()) payload = JSON.parse(String(rawPayload));
    const playerRange = String(pick("playerCount", "player_count") ?? "").match(/\d+/g)?.map(Number) ?? [];
    const numberOrDefault = (value: unknown, fallback: number | null) => {
      const parsed = numberOrNull(value);
      return parsed === null || Number.isNaN(parsed) ? fallback : parsed;
    };
    return {
      code: String(pick("code", "l1Code", "l1_code", "sampleId", "sample_id") ?? "").trim(),
      name: String(pick("name", "l1Name", "l1_name", "sampleName", "sample_name") ?? "").trim(),
      title: String(pick("title", "l2Title", "l2_title") ?? "").trim(),
      l0Ids: list(pick("l0Ids", "l0_ids", "l0Codes", "l0_codes", "l0Primary", "l0_primary")),
      scenes: list(pick("scenes", "sceneTags", "scene_tags")),
      tags: list(pick("tags")),
      minPlayers: numberOrDefault(pick("minPlayers", "min_players"), playerRange[0] ?? 2),
      maxPlayers: numberOrDefault(pick("maxPlayers", "max_players"), playerRange[1] ?? playerRange[0] ?? null),
      durationMin: numberOrNull(pick("durationMin", "duration_min")),
      durationMax: numberOrNull(pick("durationMax", "duration_max")),
      outcomeModel: String(pick("outcomeModel", "outcome_model") || "shared_completion"),
      toolIds: list(pick("toolIds", "tool_ids")),
      contentType: String(pick("contentType", "content_type") || "prompt"),
      hook: String(pick("hook", "displayHook", "display_hook") ?? "").trim(),
      rule: String(pick("rule", "shortRule", "short_rule", "originalRule", "original_rule") ?? "").trim(),
      completionCondition: String(pick("completionCondition", "completion_condition") ?? "").trim(),
      failureCondition: String(pick("failureCondition", "failure_condition") ?? "").trim() || null,
      changeNote: String(pick("changeNote", "change_note") ?? "").trim() || null,
      payload,
      research: {
        sampleCode: String(pick("sampleCode", "sample_code", "sampleId", "sample_id") ?? "").trim() || undefined,
        sourceType: String(pick("sourceType", "source_type") ?? "").trim() || undefined,
        sourceRegion: String(pick("sourceRegion", "source_region", "region") ?? "").trim() || undefined,
        sourceWork: String(pick("sourceWork", "source_work", "workName", "work_name") ?? "").trim() || undefined,
        sourceUrl: String(pick("sourceUrl", "source_url") ?? "").trim() || undefined,
        sourceEvidence: String(pick("sourceEvidence", "source_evidence", "evidenceLevel", "evidence_level") ?? "").trim() || undefined,
        sourceOriginalRule: String(pick("sourceOriginalRule", "source_original_rule", "originalRule", "original_rule") ?? "").trim() || undefined,
        coreInteraction: String(pick("coreInteraction", "core_interaction") ?? "").trim() || undefined,
        informationStructure: list(pick("informationStructure", "information_structure")),
        controlStructure: list(pick("controlStructure", "control_structure")),
        propsRequirement: String(pick("propsRequirement", "props_requirement", "props") ?? "").trim() || undefined,
        movementLevel: String(pick("movementLevel", "movement_level") ?? "").trim() || undefined,
        l2Mode: String(pick("l2Mode", "l2_mode") ?? "").trim() || undefined,
        l2Source: String(pick("l2Source", "l2_source") ?? "").trim() || undefined,
        externalAiRequired: ["true", "1", "yes", "是"].includes(String(pick("externalAiRequired", "external_ai_required") ?? "").trim().toLowerCase()) || undefined,
        externalAiRole: String(pick("externalAiRole", "external_ai_role") ?? "").trim() || undefined,
        variantFamily: String(pick("variantFamily", "variant_family") ?? "").trim() || undefined,
        editorialPriority: String(pick("editorialPriority", "editorial_priority", "priority") ?? "").trim() || undefined,
        editorialNote: String(pick("editorialNote", "editorial_note", "editorialComment", "editorial_comment") ?? "").trim() || undefined
      }
    };
  });
}

async function handleImportFile(file: File) {
  workflowBusy.value = true;
  try {
    const rows = file.name.toLowerCase().endsWith(".xlsx")
      ? await parseContentWorkbook(file)
      : parseImportText(await file.text());
    const result = await api.importStudioContent(rows);
    await Promise.all([fetchLibrary(), api.getStudioOverview().then((value) => { overview.value = value; connected.value = true; })]);
    const errorHint = result.errors.length ? `，${result.errors.length} 条未导入：${result.errors.slice(0, 2).map((error) => `第 ${error.index + 1} 行 ${error.message}`).join("；")}` : "";
    workflowMessage.value = `已导入 ${result.createdCards} 张卡片、${result.createdL1} 个玩法${errorHint}`;
  } catch {
    workflowMessage.value = "模板导入失败，请检查文件格式和必填字段";
  } finally {
    workflowBusy.value = false;
  }
}

function downloadText(text: string, filename: string, type = "text/csv;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function csvCell(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function downloadTemplate() {
  const headers = ["code", "name", "title", "l0Ids", "scenes", "tags", "minPlayers", "maxPlayers", "durationMin", "durationMax", "outcomeModel", "toolIds", "contentType", "hook", "rule", "completionCondition", "failureCondition", "changeNote", "cooldownRounds", "cooldownDays", "permanentExhaustion", "skipCooldownRounds", "payloadJson", "sampleCode", "sourceType", "sourceRegion", "sourceWork", "sourceUrl", "sourceEvidence", "sourceOriginalRule", "coreInteraction", "informationStructure", "controlStructure", "propsRequirement", "movementLevel", "l2Mode", "l2Source", "externalAiRequired", "externalAiRole", "variantFamily", "editorialPriority", "editorialNote"];
  const example = ["example_word", "示例玩法", "示例卡片", "L0-01", "双人对局|碎片时间", "", 2, 2, 5, 5, "shared_completion", "timer", "prompt", "越认真越容易接错", "轮流完成三轮", "完成三轮", "", "Agent 来源或人工备注", 30, 0, false, 1, "{}", "S-DEMO", "party", "中国", "Agent 试玩", "", "USER_PROVIDED", "", "约束冲突导致失误", "公开", "轮流", "NONE", "LOW", "OPTIONAL", "SYSTEM", false, "", "", "HIGH", "导入后默认草稿，审核通过后再发布"];
  downloadText(`\uFEFF${[headers, example].map((row) => row.map(csvCell).join(",")).join("\n")}\n`, "playbit-content-template.csv");
}

async function exportFilteredContent() {
  workflowBusy.value = true;
  try {
    const blob = await api.exportStudioContent({ search: search.value, status: filter.value, scene: sceneFilter.value, tool: toolFilter.value });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "playbit-content-export.csv";
    link.click();
    URL.revokeObjectURL(url);
  } catch { workflowMessage.value = "导出失败，请稍后重试"; } finally { workflowBusy.value = false; }
}

async function fetchAnalytics(window = analyticsWindow.value) {
  try { analytics.value = await api.getStudioAnalytics(window); } catch { analytics.value = null; }
}

function openRow(row: StudioRow) {
  selectedId.value = row.id;
  activeSection.value = "lab";
}

function openRowAnalytics(row: StudioRow) {
  selectedId.value = row.id;
  analyticsCardId.value = row.l2Id;
  activeSection.value = "cardAnalytics";
  void fetchAnalytics();
}

function selectAnalyticsCard(l2Id: string) {
  analyticsCardId.value = l2Id;
  const row = rows.value.find((item) => item.l2Id === l2Id);
  if (row) selectedId.value = row.id;
}

function openSelectedAnalyticsCard() {
  if (selectedAnalyticsRow.value) openRow(selectedAnalyticsRow.value);
}

function openReviewQueue() {
  filter.value = "pending_review";
  activeSection.value = "library";
  libraryPage.value = 1;
  void fetchLibrary();
}

const totalPages = computed(() => Math.max(1, Math.ceil(libraryTotal.value / libraryPageSize)));

watch([search, filter, sceneFilter, toolFilter], () => {
  if (activeSection.value !== "library") return;
  libraryPage.value = 1;
  void fetchLibrary().catch(() => { workflowMessage.value = "内容库加载失败，请重试"; });
});
watch(libraryPage, () => {
  if (activeSection.value === "library") void fetchLibrary().catch(() => { workflowMessage.value = "内容库加载失败，请重试"; });
});
watch(analyticsWindow, () => {
  if (activeSection.value === "distribution" || activeSection.value === "cardAnalytics") void fetchAnalytics();
});

async function saveReusePolicy() {
  const row = selected.value;
  if (!row?.l2Id || workflowBusy.value) return;
  workflowBusy.value = true;
  try {
    await api.updateStudioReusePolicy(row.l2Id, policyForm.value);
    row.reusePolicy = { ...policyForm.value };
    workflowMessage.value = "L2 冻结策略已保存，并留下审计记录";
  } catch {
    workflowMessage.value = "冻结策略保存失败，请检查输入";
  } finally {
    workflowBusy.value = false;
  }
}

async function saveL2Draft() {
  const row = selected.value;
  if (!row?.l2Id || !l2Editable.value || workflowBusy.value) return;
  workflowBusy.value = true;
  try {
    const response = await api.updateStudioL2(row.l2Id, {
      title: l2Form.value.title.trim(),
      contentType: l2Form.value.contentType,
      payload: { ...row.payload, content: l2Form.value.content.trim(), mode: l2Form.value.mode, category: l2Form.value.category, tone: l2Form.value.tone }
    });
    row.name = response.l2.title;
    row.contentType = response.l2.contentType;
    row.payload = response.l2.payload;
    workflowMessage.value = "结构化 L2 草稿已保存";
  } catch {
    workflowMessage.value = "L2 草稿保存失败，请检查它是否已提交审核";
  } finally {
    workflowBusy.value = false;
  }
}

function updateSelectedVersion(version: { id: string; versionNo: number; reviewStatus: string }) {
  const row = rows.value.find((item) => item.id === selectedId.value);
  if (!row) return;
  row.versionId = version.id;
  row.version = `v${version.versionNo}`;
  row.status = version.reviewStatus;
  workflowMessage.value = "";
}

function updateSelectedL2(l2: { status: string }) {
  const row = rows.value.find((item) => item.id === selectedId.value);
  if (!row) return;
  row.l2Status = l2.status;
  workflowMessage.value = "";
}

async function submitSelectedL2() {
  if (!selected.value?.l2Id || workflowBusy.value || !["draft", "changes_requested"].includes(selected.value.l2Status)) return;
  workflowBusy.value = true;
  try { updateSelectedL2((await api.submitStudioL2(selected.value.l2Id)).l2); } catch { workflowMessage.value = "L2 提交失败，请稍后重试"; } finally { workflowBusy.value = false; }
}

async function reviewSelectedL2(decision: "approve" | "request_changes") {
  if (!selected.value?.l2Id || workflowBusy.value || selected.value.l2Status !== "pending_review") return;
  workflowBusy.value = true;
  try { updateSelectedL2((await api.reviewStudioL2(selected.value.l2Id, decision)).l2); } catch { workflowMessage.value = "L2 审核失败，请确认它仍在待审核状态"; } finally { workflowBusy.value = false; }
}

async function publishSelectedL2() {
  if (!selected.value?.l2Id || workflowBusy.value || selected.value.l2Status !== "approved") return;
  workflowBusy.value = true;
  try {
    updateSelectedL2((await api.publishStudioL2(selected.value.l2Id)).l2);
    workflowMessage.value = "整张卡已发布，用户端已同步可见";
  } catch { workflowMessage.value = "L2 发布失败，请先完成审核"; } finally { workflowBusy.value = false; }
}

function versionPayload() {
  return {
    shortRule: draftForm.value.rule.trim(),
    completionCondition: draftForm.value.completionCondition.trim(),
    failureCondition: draftForm.value.failureCondition.trim() || null,
    displayHook: draftForm.value.hook.trim(),
    toolIds: toolSelection.value,
    changeNote: draftForm.value.changeNote.trim() || null
  };
}

function resetCreateForm() {
  createForm.value = { code: "", name: "", createL2: true, title: "", hook: "", rule: "", content: "", completionCondition: "", contentType: "prompt", mode: "together", category: "challenge", tone: "blue", minPlayers: 2, maxPlayers: 2, durationMinutes: 5, l0Ids: ["l0-association"], scenes: "双人对局, 碎片时间", toolIds: ["timer"], research: { sourceType: "", sourceRegion: "", sourceWork: "", sourceUrl: "", propsRequirement: "NONE", movementLevel: "LOW", l2Mode: "OPTIONAL", l2Source: "SYSTEM", externalAiRequired: false, externalAiRole: "", informationStructure: "", controlStructure: "", editorialPriority: "", editorialNote: "" } };
}

async function createNewContent() {
  const form = createForm.value;
  if (workflowBusy.value || !form.code.trim() || !form.name.trim() || !form.hook.trim() || !form.rule.trim() || !form.completionCondition.trim()) return;
  if (form.createL2 && (!form.title.trim() || !form.content.trim())) return;
  workflowBusy.value = true;
  try {
    const research: ContentResearch = {
      ...form.research,
      informationStructure: form.research.informationStructure.split(",").map((item) => item.trim()).filter(Boolean),
      controlStructure: form.research.controlStructure.split(",").map((item) => item.trim()).filter(Boolean)
    };
    const l1 = await api.createStudioL1({
      code: form.code.trim(),
      name: form.name.trim(),
      l0Ids: form.l0Ids,
      minPlayers: Math.max(1, Number(form.minPlayers)),
      maxPlayers: Math.max(Number(form.minPlayers), Number(form.maxPlayers)),
      durationMin: Math.max(1, Number(form.durationMinutes)),
      durationMax: Math.max(1, Number(form.durationMinutes)),
      outcomeModel: form.mode === "versus" ? "self_reported_winner" : "shared_completion",
      tags: [form.mode === "versus" ? "对决" : "共创"],
      scenes: form.scenes.split(",").map((item) => item.trim()).filter(Boolean),
      research
    });
    const createdVersion = await api.createStudioVersion(l1.l1.id, {
      shortRule: form.rule.trim(),
      completionCondition: form.completionCondition.trim(),
      displayHook: form.hook.trim(),
      toolIds: form.toolIds,
      changeNote: "创建玩法时建立的初始版本"
    });
    let createdL2: Awaited<ReturnType<typeof api.createStudioL2>> | null = null;
    if (form.createL2) {
      createdL2 = await api.createStudioL2({
        l1Id: l1.l1.id,
        title: form.title.trim(),
        contentType: form.contentType,
        payload: { content: form.content.trim(), hook: form.hook.trim(), mode: form.mode, category: form.category, tone: form.tone },
        toolIds: form.toolIds,
        sourceMode: "human"
      });
    }
    if (createdL2) {
      libraryPage.value = 1;
      await fetchLibrary();
    }
    await fetchL1Only();
    const createdRow = createdL2
      ? rows.value.find((row) => row.l1Id === l1.l1.id && row.l2Id === createdL2?.l2.id)
      : l1OnlyRows.value.find((row) => row.l1Id === l1.l1.id);
    if (createdRow) selectedId.value = createdRow.id;
    if (!createdRow && !createdL2) selectedId.value = `l1:${l1.l1.id}`;
    showCreateForm.value = false;
    activeSection.value = "lab";
    workflowMessage.value = form.createL2 ? "新的玩法和内容包已创建为草稿，可以继续编辑并提交审核" : `玩法骨架已保存为草稿（${createdVersion.version.versionNo}），暂未创建 L2 内容包`;
    resetCreateForm();
  } catch {
    workflowMessage.value = "创建失败，请检查编码、名称和必填内容";
  } finally {
    workflowBusy.value = false;
  }
}

async function handleCreateCard(form: CreateCardForm) {
  createForm.value = form;
  showCreateForm.value = true;
  await createNewContent();
}

async function createDraftFromSelected() {
  if (!selected.value?.l1Id || workflowBusy.value) return;
  const source = selected.value;
  workflowBusy.value = true;
  try {
    const response = await api.createStudioVersion(source.l1Id, {
      shortRule: source.rule,
      completionCondition: source.completionCondition,
      failureCondition: source.failureCondition || null,
      displayHook: source.hook,
      toolIds: source.tools,
      changeNote: "基于已发布版本创建的新提案"
    });
    const version = response.version;
    const row: StudioRow = {
      ...source,
      id: `${version.id}:${source.l2Id}`,
      versionId: version.id,
      version: `v${version.versionNo}`,
      status: version.reviewStatus,
      rule: version.shortRule,
      hook: version.displayHook,
      completionCondition: version.completionCondition,
      failureCondition: version.failureCondition ?? ""
    };
    await fetchLibrary();
    selectedId.value = `${version.id}:${source.l2Id}`;
    activeSection.value = "lab";
    workflowMessage.value = "草稿已创建，可以继续编辑后提交审核";
  } catch {
    workflowMessage.value = "草稿创建失败，请稍后重试";
  } finally {
    workflowBusy.value = false;
  }
}

async function saveDraft() {
  const row = selected.value;
  if (!row?.versionId || !draftEditable.value) return true;
  const response = await api.updateStudioVersion(row.versionId, versionPayload());
  row.rule = response.version.shortRule;
  row.hook = response.version.displayHook;
  row.completionCondition = response.version.completionCondition;
  row.failureCondition = response.version.failureCondition ?? "";
  row.versionId = response.version.id;
  return true;
}

async function submitSelected() {
  if (!selected.value?.versionId || !draftEditable.value || workflowBusy.value) return;
  workflowBusy.value = true;
  try {
    await saveDraft();
    const response = await api.submitStudioVersion(selected.value.versionId);
    updateSelectedVersion(response.version);
  } catch {
    workflowMessage.value = "提交失败，请稍后重试";
  } finally {
    workflowBusy.value = false;
  }
}

async function reviewSelected(decision: "approve" | "request_changes") {
  if (!selected.value?.versionId || workflowBusy.value) return;
  workflowBusy.value = true;
  try {
    const response = await api.reviewStudioVersion(selected.value.versionId, decision);
    updateSelectedVersion(response.version);
  } catch {
    workflowMessage.value = "审核失败，请确认版本仍处于待审核状态";
  } finally {
    workflowBusy.value = false;
  }
}

async function publishSelected() {
  if (!selected.value?.versionId || workflowBusy.value) return;
  workflowBusy.value = true;
  try {
    const l2Id = selected.value.l2Id;
    const l2Ready = selected.value.l2Status === "approved";
    const response = await api.publishStudioVersion(selected.value.versionId);
    updateSelectedVersion(response.version);
    if (l2Id && l2Ready) {
      updateSelectedL2((await api.publishStudioL2(l2Id)).l2);
      workflowMessage.value = "整张卡已发布，用户端已同步可见";
    } else if (l2Id) {
      workflowMessage.value = "L1 已发布；L2 尚未发布，用户端暂不可见";
    }
  } catch {
    workflowMessage.value = "发布失败，请先完成审核";
  } finally {
    workflowBusy.value = false;
  }
}

onMounted(async () => {
  try {
    const [nextOverview, content, l1Only] = await Promise.all([
      Promise.race([api.getStudioOverview(), new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 800))]),
      Promise.race([api.listStudioContent(), new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 800))]),
      Promise.race([api.listStudioL1({ withoutL2: true }), new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 800))])
    ]);
    if (nextOverview) { overview.value = nextOverview; connected.value = true; }
    if (content) applyContent(content.items, content.total);
    if (l1Only) applyL1Only(l1Only.items);
  } catch {
    // The prototype remains useful when the API is not running locally.
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="studio-app">
    <aside class="studio-sidebar">
      <div class="studio-brand"><span class="studio-brand-mark">P</span><div><strong>playbit</strong><small>CONTENT STUDIO</small></div></div>
      <div class="studio-workspace"><span class="studio-workspace-dot" :class="{ connected }" />本地工作区</div>
      <nav class="studio-nav" aria-label="内容工作区">
        <button v-for="item in sections" :key="item.id" type="button" :class="{ active: activeSection === item.id }" @click="selectSection(item.id)">
          <component :is="item.icon" :size="17" stroke-width="1.8" /><span>{{ item.label }}</span>
        </button>
      </nav>
      <div class="studio-sidebar-bottom">
        <div class="studio-rule"><Sparkles :size="15" /><span>内容研发范式</span></div>
        <div class="studio-agent"><span class="studio-agent-avatar">A</span><span><strong>内容 Agent</strong><small>协作模式已开启</small></span></div>
       </div>
    </aside>

    <main class="studio-main">
      <header class="studio-topbar">
        <div><p class="studio-breadcrumb">内容运营 <ChevronRight :size="13" /> {{ sections.find((item) => item.id === activeSection)?.label }}</p><h1>{{ activeSection === 'overview' ? '今天，让下一局更好玩' : sections.find((item) => item.id === activeSection)?.label }}</h1></div>
        <div class="studio-top-actions"><span class="studio-sync"><span class="studio-sync-dot" />数据已同步</span></div>
      </header>

      <div class="studio-content" :class="[`studio-section-${activeSection}`, { 'studio-section-without-l2': activeSection === 'lab' && !selected?.l2Id }]">
        <section v-if="activeSection === 'overview'" class="studio-overview">
          <div class="studio-welcome"><div><span class="studio-eyebrow">CONTENT PULSE · 2026.09.30</span><h2>把好玩的玩法，<em>交给对的人。</em></h2><p>从 Agent 发现，到人工审核，再到每一局的复盘。内容库负责找卡，实验室负责把卡打磨到能发布。</p></div><div class="studio-welcome-actions"><button type="button" class="studio-button studio-button-primary" @click="selectSection('lab')"><Beaker :size="16" />进入卡片实验室</button><button type="button" class="studio-button studio-button-light" @click="openReviewQueue"><CheckCircle2 :size="16" />处理待审核</button></div></div>
          <div class="studio-section-heading"><div><span class="studio-eyebrow">CONTENT MAP</span><h2>内容池状态</h2></div><span class="studio-muted">刚刚更新</span></div>
          <div class="studio-stat-strip"><div><span>核心机制 L0</span><strong>{{ overview.counts.l0 }}</strong><small>已整理</small></div><div><span>玩法骨架 L1</span><strong>{{ overview.counts.l1 }}</strong><small>可继续研发</small></div><div><span>内容实例 L2</span><strong>{{ overview.counts.l2 }}</strong><small>当前版本</small></div><div class="studio-stat-highlight"><span>待人工判断</span><strong>{{ overview.counts.pendingReview }}</strong><small>需要你的决定</small></div></div>
          <div class="studio-grid-two"><section class="studio-panel"><div class="studio-panel-heading"><div><span class="studio-eyebrow">REVIEW QUEUE</span><h3>审核队列</h3></div><button type="button" class="studio-text-button" @click="openReviewQueue">查看全部 <ChevronRight :size="14" /></button></div><div class="studio-review-list"><button v-for="row in reviewRows.slice(0, 3)" :key="row.id" type="button" class="studio-review-item" @click="openRow(row)"><span class="studio-review-mark"><Archive :size="15" /></span><span><strong>{{ row.name }}</strong><small>{{ row.hook }}</small></span><span class="studio-status" :class="statusClass(row.status === 'pending_review' ? row.status : row.l2Status)">{{ row.status === 'pending_review' ? '版本 · ' : '卡片 · ' }}{{ statusLabel(row.status === 'pending_review' ? row.status : row.l2Status) }}</span><ChevronRight :size="15" /></button><div v-if="!reviewRows.length" class="studio-review-empty">当前页没有待你判断的卡片</div></div></section><section class="studio-panel studio-panel-blue"><div class="studio-panel-heading"><div><span class="studio-eyebrow">NEXT DECISION</span><h3>下一步判断</h3></div><BarChart3 :size="17" class="studio-panel-icon" /></div><div class="studio-health-score"><strong>{{ overview.counts.published }}</strong><span> 个玩法已发布</span><small>从内容库进入卡片详情，查看单卡表现和下一轮修改方向。</small></div><button type="button" class="studio-button studio-button-light" @click="selectSection('distribution')"><BarChart3 :size="15" />查看真实表现</button></section></div>
        </section>

        <section v-else-if="activeSection === 'library'" class="studio-library">
          <div class="studio-section-heading studio-library-heading"><div><span class="studio-eyebrow">CONTENT LIBRARY</span><h2>用户会看到的游戏卡</h2><p class="studio-muted">一条记录就是一张可展示卡片。按更新时间倒序，草稿也会排在最近编辑的位置。</p></div><span class="studio-muted">{{ libraryTotal }} 张卡片</span></div>
          <div class="studio-library-toolbar"><div class="studio-search"><Search :size="16" /><input v-model="search" placeholder="搜索标题、玩法或规则" /></div><select v-model="filter" aria-label="筛选内容状态"><option value="all">全部状态</option><option value="draft">草稿</option><option value="pending_review">待审核</option><option value="published">已发布</option><option value="paused">已暂停</option></select><select v-model="sceneFilter" aria-label="按场景筛选"><option value="all">全部场景</option><option value="双人对局">双人对局</option><option value="多人聚会">多人聚会</option><option value="碎片时间">碎片时间</option><option value="朋友聚会">朋友聚会</option><option value="安静推理">安静推理</option></select><select v-model="toolFilter" aria-label="按工具筛选"><option value="all">全部工具</option><option value="timer">计时器</option><option value="counter">计数器</option><option value="scoreboard">记分牌</option></select></div>
          <div class="studio-table-panel"><div class="studio-table-heading"><div><span class="studio-eyebrow">CARD DELIVERY</span><h2>卡片目录</h2></div><span class="studio-muted">第 {{ libraryPage }} / {{ totalPages }} 页 · 每页 10 条</span></div><div class="studio-table-wrap"><table><thead><tr><th>卡片</th><th>玩法 / 版本</th><th>状态</th><th>场景</th><th>工具</th><th>表现</th><th>动作</th></tr></thead><tbody><tr v-for="row in filteredRows" :key="row.id" :class="{ selected: selectedId === row.id }" @click="openRow(row)"><td><div class="studio-table-title"><span class="studio-table-dot" :class="row.status === 'published' ? 'is-live' : 'is-review'" /><span><strong>{{ row.name }}</strong><small>{{ row.hook }}</small></span></div></td><td><span class="studio-tool-text">{{ row.players }} · {{ row.version }}</span></td><td><div class="studio-status-stack"><span class="studio-status" :class="statusClass(row.status)">{{ statusLabel(row.status) }}</span><small v-if="row.l2Status !== row.status">内容 · {{ statusLabel(row.l2Status) }}</small></div></td><td><span class="studio-scene-list">{{ row.scenes.join(' · ') || '未标注' }}</span></td><td><span class="studio-tool-text">{{ row.tools.join(' · ') || '无' }}</span></td><td><span class="studio-quality">{{ row.starts ? `${Math.round(row.completes / row.starts * 100)}% 完成` : '暂无数据' }}</span></td><td><div class="studio-row-actions"><button type="button" class="studio-row-action" title="进入卡片实验室" @click.stop="openRow(row)"><FlaskConical :size="15" /></button><button type="button" class="studio-row-action" title="查看卡片分析" @click.stop="openRowAnalytics(row)"><BarChart3 :size="15" /></button></div></td></tr><tr v-if="!filteredRows.length"><td colspan="7" class="studio-empty-cell">没有符合条件的卡片</td></tr></tbody></table></div><div class="studio-pagination"><button type="button" class="studio-button studio-button-light" :disabled="libraryPage <= 1" @click="libraryPage -= 1">上一页</button><span>{{ libraryTotal ? `${(libraryPage - 1) * libraryPageSize + 1}-${Math.min(libraryPage * libraryPageSize, libraryTotal)}` : '0' }} / {{ libraryTotal }}</span><button type="button" class="studio-button studio-button-light" :disabled="libraryPage >= totalPages" @click="libraryPage += 1">下一页</button></div></div>
        </section>

        <section v-else-if="activeSection === 'lab'" class="studio-lab"><div class="studio-lab-heading"><div><span class="studio-eyebrow">PLAYABLE CARD LAB</span><h2>把一条内容，打磨成一局</h2><p>这里编辑的是后台版本，发布后生成不可变快照；用户端只会看到一张可以立即玩的卡。</p></div><button v-if="draftEditable" type="button" class="studio-button studio-button-primary" :disabled="workflowBusy" @click="submitSelected"><Send :size="16" />提交人工审核</button><button v-else-if="selected?.status === 'published'" type="button" class="studio-button studio-button-light" :disabled="workflowBusy" @click="createDraftFromSelected"><Sparkles :size="16" />基于此版本创建草稿</button></div><StudioLabContext :visible="Boolean(selected)" :code="selected?.code ?? ''" :name="selected?.name ?? ''" :l0-ids="selected?.l0Ids ?? []" :l0s="overview.l0s" :scenes="selected?.scenes ?? []" :tools="selected?.tools ?? []" :tool-definitions="overview.tools" :l2-title="selected?.l2Id ? selected?.name ?? '' : ''" :has-l2="Boolean(selected?.l2Id)" :research="selected?.research" /><div class="studio-lab-grid"><section class="studio-editor studio-panel"><div class="studio-panel-heading"><div><span class="studio-eyebrow">L1 VERSION · {{ selected?.version }}</span><h3>{{ selected?.name }}</h3></div><span class="studio-status" :class="statusClass(selected?.status ?? '')">{{ statusLabel(selected?.status ?? '') }}</span></div><label>卡面 Hook<input v-model="draftForm.hook" :readonly="!draftEditable" /></label><label>主持人规则<textarea v-model="draftForm.rule" :readonly="!draftEditable" rows="4" /></label><label>结束条件<input v-model="draftForm.completionCondition" :readonly="!draftEditable" /></label><div class="studio-editor-row"><label>适用人数<input :value="selected?.players" readonly /></label><label>预计时长<input :value="selected?.duration" readonly /></label></div><div class="studio-tool-chips"><span>关联工具</span><b v-for="tool in selected?.tools ?? []" :key="tool"><TimerReset :size="13" />{{ overview.tools.find((item) => item.code === tool || item.id === tool)?.name ?? tool }}</b></div><div v-if="selected?.l2Id" class="studio-policy-block"><div class="studio-policy-heading"><span>内容复用策略</span><small>L2 冻结规则</small></div><div class="studio-policy-grid"><label>冷却轮数<input v-model.number="policyForm.cooldownRounds" min="0" type="number" /></label><label>冷却天数<input v-model.number="policyForm.cooldownDays" min="0" type="number" /></label><label>跳过冷却<input v-model.number="policyForm.skipCooldownRounds" min="0" type="number" /></label><label class="studio-policy-check"><input v-model="policyForm.permanentExhaustion" type="checkbox" />玩过后不再展示</label></div><button type="button" class="studio-button studio-button-light" :disabled="workflowBusy" @click="saveReusePolicy"><CheckCircle2 :size="15" />保存冻结策略</button></div></section><section class="studio-card-preview"><div class="studio-preview-top"><span>用户端卡面</span></div><div class="studio-game-card"><span class="studio-card-kicker">{{ selected?.players }} · {{ selected?.duration }}</span><h3>{{ selected?.name }}</h3><p>{{ draftForm.hook }}</p><div class="studio-card-rule"><strong>怎么玩</strong><span>{{ draftForm.rule }}</span></div><div class="studio-card-footer"><span>结束条件</span><strong>{{ draftForm.completionCondition }}</strong></div></div><p class="studio-preview-note">完整卡面预览 · 不展示研发分层</p></section></div></section>

        <StudioAnalyticsDashboard
          v-else-if="activeSection === 'distribution'"
          :analytics="analytics"
          :window="analyticsWindow"
          :counts="overview.counts"
          @update:window="analyticsWindow = $event"
        />
        <StudioCardAnalyticsDashboard
          v-else
          :analytics="analytics"
          :window="analyticsWindow"
          :top-cards="topCards"
          :selected-metric="selectedAnalyticsMetric"
          :selected-row="selectedAnalyticsRow"
          @update:window="analyticsWindow = $event"
          @select-card="selectAnalyticsCard"
          @open-card="openSelectedAnalyticsCard"
        />
        <section v-if="activeSection === 'lab' && selected" class="studio-panel studio-l2-editor-full"><div class="studio-panel-heading"><div><span class="studio-eyebrow">L2 CONTENT PACKAGE</span><h3>结构化内容</h3></div><span class="studio-status" :class="statusClass(selected.l2Status)">{{ statusLabel(selected.l2Status) }}</span></div><div class="studio-l2-fields"><label>内容标题<input v-model="l2Form.title" :readonly="!l2Editable" /></label><label>内容类型<select v-model="l2Form.contentType" :disabled="!l2Editable"><option value="prompt">提示题</option><option value="truth">真相题</option><option value="sequence">顺序题</option><option value="environment">现场生成</option></select></label><label class="studio-l2-wide">题面内容<textarea v-model="l2Form.content" :readonly="!l2Editable" rows="3" /></label></div><button type="button" class="studio-button studio-button-light" :disabled="workflowBusy || !l2Editable" @click="saveL2Draft"><CheckCircle2 :size="15" />保存 L2 草稿</button></section>
      </div>
     </main>
  </div>
  <StudioDataTransfer
    v-if="activeSection === 'library'"
    :busy="workflowBusy"
    :message="workflowMessage"
    @import-file="handleImportFile"
    @export="exportFilteredContent"
    @template="downloadTemplate"
  />
  <StudioCreateCardSheet
    :visible="showCreateForm && activeSection === 'lab'"
    :busy="workflowBusy"
    :l0s="overview.l0s"
    :tools="overview.tools"
    @close="showCreateForm = false"
    @submit="handleCreateCard"
  />
  <StudioWorkflowActions
    :visible="activeSection === 'lab'"
    :name="selected?.name ?? ''"
     :status="selected?.versionId ? selected?.status ?? '' : ''"
    :l2-status="selected?.l2Status ?? ''"
    :busy="workflowBusy"
    :message="workflowMessage"
     :meta="workflowMeta"
    @submit="submitSelected"
    @approve="reviewSelected('approve')"
    @request-changes="reviewSelected('request_changes')"
    @publish="publishSelected"
    @create="createDraftFromSelected"
    @new-card="showCreateForm = true"
    @submit-l2="submitSelectedL2"
    @approve-l2="reviewSelectedL2('approve')"
    @request-l2-changes="reviewSelectedL2('request_changes')"
    @publish-l2="publishSelectedL2"
  />
</template>
