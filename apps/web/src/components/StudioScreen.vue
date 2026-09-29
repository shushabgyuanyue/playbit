<script setup lang="ts">
import { dailyCards } from "@playbit/cards";
import type { ContentListItem, ContentOverview } from "@playbit/shared";
import { Archive, BarChart3, Beaker, BookOpen, CheckCircle2, ChevronRight, CircleHelp, FlaskConical, LayoutDashboard, MoreHorizontal, Play, Search, Send, Settings2, Sparkles, TimerReset, Workflow } from "lucide-vue-next";
import { computed, onMounted, ref, watch } from "vue";
import { api } from "../services/api";
import StudioWorkflowActions from "./StudioWorkflowActions.vue";

type StudioSection = "overview" | "library" | "lab" | "review" | "distribution";
type StudioRow = {
  id: string;
  l1Id: string;
  l2Id: string;
  versionId: string;
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
  contentType: "prompt" | "truth" | "sequence" | "environment";
  payload: Record<string, unknown>;
  reusePolicy: { cooldownRounds: number; cooldownDays: number; permanentExhaustion: boolean; skipCooldownRounds: number };
  quality: number;
  starts: number;
  completes: number;
};

const sections: Array<{ id: StudioSection; label: string; icon: typeof LayoutDashboard }> = [
  { id: "overview", label: "总览", icon: LayoutDashboard },
  { id: "library", label: "内容库", icon: BookOpen },
  { id: "lab", label: "卡片实验室", icon: FlaskConical },
  { id: "review", label: "审核与试玩", icon: CheckCircle2 },
  { id: "distribution", label: "分发与分析", icon: BarChart3 }
];

const activeSection = ref<StudioSection>("overview");
const search = ref("");
const filter = ref("all");
const loading = ref(true);
const connected = ref(false);
const workflowBusy = ref(false);
const workflowMessage = ref("");
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
  versionId: "",
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
  contentType: "prompt",
  payload: { content: card.content, mode: card.mode, category: card.category, tone: card.tone },
  reusePolicy: { cooldownRounds: card.category === "hidden" ? 0 : 30, cooldownDays: 0, permanentExhaustion: card.category === "hidden", skipCooldownRounds: 1 },
  quality: 78 + (index % 5),
  starts: 120 - index * 7,
  completes: 82 - index * 4
})));

const selectedId = ref(rows.value[0]?.id ?? "");
const selected = computed(() => rows.value.find((row) => row.id === selectedId.value) ?? rows.value[0] ?? null);
const draftForm = ref({ hook: "", rule: "", completionCondition: "", failureCondition: "", changeNote: "" });
const policyForm = ref({ cooldownRounds: 0, cooldownDays: 0, permanentExhaustion: false, skipCooldownRounds: 1 });
const l2Form = ref({ title: "", contentType: "prompt" as "prompt" | "truth" | "sequence" | "environment", content: "", mode: "together", category: "challenge", tone: "blue" });
const showCreateForm = ref(false);
const createForm = ref({
  code: "",
  name: "",
  title: "",
  hook: "",
  rule: "",
  completionCondition: "",
  contentType: "prompt" as "prompt" | "truth" | "sequence" | "environment",
  mode: "together" as "together" | "versus",
  category: "challenge" as "challenge" | "rule" | "hidden",
  tone: "blue" as "coral" | "blue" | "gold",
  minPlayers: 2,
  maxPlayers: 2,
  durationMinutes: 5,
  l0Id: "l0-association"
});
const draftEditable = computed(() => ["draft", "changes_requested"].includes(selected.value?.status ?? ""));
const l2Editable = computed(() => ["draft", "changes_requested"].includes(selected.value?.l2Status ?? ""));
const filteredRows = computed(() => rows.value.filter((row) => {
  const matchesSearch = !search.value || `${row.name} ${row.hook} ${row.rule}`.toLowerCase().includes(search.value.toLowerCase());
  const matchesFilter = filter.value === "all" || row.status === filter.value || row.l2Status === filter.value;
  return matchesSearch && matchesFilter;
}));
const statusLabel = (status: string) => ({ draft: "草稿", pending_review: "待审核", published: "已发布", approved: "已通过", changes_requested: "待修改", paused: "已暂停", retired: "已淘汰" }[status] ?? status);
const statusClass = (status: string) => `studio-status-${status}`;
const reviewRows = computed(() => rows.value.filter((row) => row.status === "pending_review" || row.l2Status === "pending_review"));
const activeMetric = computed(() => overview.value.metrics.length ? overview.value.metrics : rows.value.map((row) => ({
  l1Id: row.id,
  l1Name: row.name,
  exposures: Math.max(row.starts, 1) * 2,
  starts: row.starts,
  completes: row.completes,
  rerolls: 12 + row.id.length,
  toolOpens: 18 + row.id.length,
  completionRate: row.starts ? row.completes / row.starts : 0,
  startRate: 0.68
})));

function syncDraftForm(row: StudioRow | null) {
  draftForm.value = {
    hook: row?.hook ?? "",
    rule: row?.rule ?? "",
    completionCondition: row?.completionCondition ?? "",
    failureCondition: row?.failureCondition ?? "",
    changeNote: ""
  };
  policyForm.value = { ...(row?.reusePolicy ?? { cooldownRounds: 0, cooldownDays: 0, permanentExhaustion: false, skipCooldownRounds: 1 }) };
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
  if (section === "review") filter.value = "pending_review";
  else if (filter.value === "pending_review") filter.value = "all";
}

function applyContent(items: ContentListItem[]) {
  if (!items.length) return;
  rows.value = items.map(({ l1, version, l2 }) => ({
    id: `${version.id}:${l2.id}`,
    l1Id: l1.id,
    l2Id: l2.id,
    versionId: version.id,
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
    contentType: l2.contentType,
    payload: l2.payload,
    reusePolicy: l2.reusePolicy,
    quality: l2.qualityTier,
    starts: 0,
    completes: 0
  }));
  selectedId.value = rows.value[0]?.id ?? "";
}

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
  try { updateSelectedL2((await api.publishStudioL2(selected.value.l2Id)).l2); } catch { workflowMessage.value = "L2 发布失败，请先完成审核"; } finally { workflowBusy.value = false; }
}

function versionPayload() {
  return {
    shortRule: draftForm.value.rule.trim(),
    completionCondition: draftForm.value.completionCondition.trim(),
    failureCondition: draftForm.value.failureCondition.trim() || null,
    displayHook: draftForm.value.hook.trim(),
    changeNote: draftForm.value.changeNote.trim() || null
  };
}

function resetCreateForm() {
  createForm.value = { code: "", name: "", title: "", hook: "", rule: "", completionCondition: "", contentType: "prompt", mode: "together", category: "challenge", tone: "blue", minPlayers: 2, maxPlayers: 2, durationMinutes: 5, l0Id: "l0-association" };
}

async function createNewContent() {
  const form = createForm.value;
  if (workflowBusy.value || !form.code.trim() || !form.name.trim() || !form.title.trim() || !form.rule.trim() || !form.completionCondition.trim()) return;
  workflowBusy.value = true;
  try {
    const l1 = await api.createStudioL1({
      code: form.code.trim(),
      name: form.name.trim(),
      l0Ids: [form.l0Id],
      minPlayers: Math.max(1, Number(form.minPlayers)),
      maxPlayers: Math.max(Number(form.minPlayers), Number(form.maxPlayers)),
      durationMin: Math.max(1, Number(form.durationMinutes)),
      durationMax: Math.max(1, Number(form.durationMinutes)),
      outcomeModel: form.mode === "versus" ? "self_reported_winner" : "shared_completion",
      tags: [form.mode === "versus" ? "对决" : "共创"]
    });
    const createdL2 = await api.createStudioL2({
      l1Id: l1.l1.id,
      title: form.title.trim(),
      contentType: form.contentType,
      payload: { content: form.rule.trim(), hook: form.hook.trim(), mode: form.mode, category: form.category, tone: form.tone },
      sourceMode: "human"
    });
    const content = await api.listStudioContent();
    applyContent(content.items);
    const createdRow = rows.value.find((row) => row.l1Id === l1.l1.id && row.l2Id === createdL2.l2.id);
    if (createdRow) selectedId.value = createdRow.id;
    showCreateForm.value = false;
    activeSection.value = "lab";
    workflowMessage.value = "新的玩法和内容包已创建为草稿，可以继续编辑并提交审核";
    resetCreateForm();
  } catch {
    workflowMessage.value = "创建失败，请检查编码、名称和必填内容";
  } finally {
    workflowBusy.value = false;
  }
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
    rows.value.unshift(row);
    selectedId.value = row.id;
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
    const response = await api.publishStudioVersion(selected.value.versionId);
    updateSelectedVersion(response.version);
  } catch {
    workflowMessage.value = "发布失败，请先完成审核";
  } finally {
    workflowBusy.value = false;
  }
}

onMounted(async () => {
  try {
    const [nextOverview, content] = await Promise.all([
      Promise.race([api.getStudioOverview(), new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 800))]),
      Promise.race([api.listStudioContent(), new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 800))])
    ]);
    if (nextOverview) { overview.value = nextOverview; connected.value = true; }
    if (content) applyContent(content.items);
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
      <div class="studio-workspace"><span class="studio-workspace-dot" :class="{ connected }" />本地工作区 <span class="studio-workspace-chevron">⌄</span></div>
      <nav class="studio-nav" aria-label="内容工作区">
        <button v-for="item in sections" :key="item.id" type="button" :class="{ active: activeSection === item.id }" @click="selectSection(item.id)">
          <component :is="item.icon" :size="17" stroke-width="1.8" /><span>{{ item.label }}</span>
          <span v-if="item.id === 'review' && overview.counts.pendingReview" class="studio-nav-count">{{ overview.counts.pendingReview }}</span>
        </button>
      </nav>
      <div class="studio-sidebar-bottom">
        <div class="studio-rule"><Sparkles :size="15" /><span>内容研发范式</span><ChevronRight :size="14" /></div>
        <button type="button" class="studio-settings"><Settings2 :size="16" /> 工作区设置</button>
        <div class="studio-agent"><span class="studio-agent-avatar">A</span><span><strong>内容 Agent</strong><small>协作模式已开启</small></span><MoreHorizontal :size="17" /></div>
      </div>
    </aside>

    <main class="studio-main">
      <header class="studio-topbar">
        <div><p class="studio-breadcrumb">内容运营 <ChevronRight :size="13" /> {{ sections.find((item) => item.id === activeSection)?.label }}</p><h1>{{ activeSection === 'overview' ? '今天，让下一局更好玩' : sections.find((item) => item.id === activeSection)?.label }}</h1></div>
        <div class="studio-top-actions"><span class="studio-sync"><span class="studio-sync-dot" />数据已同步</span><button type="button" class="studio-icon-button" title="帮助"><CircleHelp :size="18" /></button><button type="button" class="studio-profile">L</button></div>
      </header>

      <div class="studio-content" :class="`studio-section-${activeSection}`">
        <section v-if="activeSection === 'overview'" class="studio-overview">
          <div class="studio-welcome"><div><span class="studio-eyebrow">CONTENT PULSE · 2026.09.30</span><h2>把好玩的玩法，<em>交给对的人。</em></h2><p>从 Agent 发现，到人工审核，再到每一局的复盘。今天先看看内容池在哪里，下一张卡该往哪里走。</p></div><div class="studio-welcome-actions"><button type="button" class="studio-button studio-button-primary" @click="selectSection('lab')"><Beaker :size="16" />进入卡片实验室</button><button type="button" class="studio-button studio-button-light" @click="selectSection('review')"><CheckCircle2 :size="16" />处理审核</button></div></div>
          <div class="studio-section-heading"><div><span class="studio-eyebrow">CONTENT MAP</span><h2>内容池状态</h2></div><span class="studio-muted">刚刚更新</span></div>
          <div class="studio-stat-strip"><div><span>核心机制 L0</span><strong>{{ overview.counts.l0 }}</strong><small>已整理</small></div><div><span>玩法骨架 L1</span><strong>{{ overview.counts.l1 }}</strong><small>可继续研发</small></div><div><span>内容实例 L2</span><strong>{{ overview.counts.l2 }}</strong><small>当前版本</small></div><div class="studio-stat-highlight"><span>待人工判断</span><strong>{{ overview.counts.pendingReview }}</strong><small>需要你的决定</small></div></div>
          <div class="studio-grid-two"><section class="studio-panel"><div class="studio-panel-heading"><div><span class="studio-eyebrow">REVIEW QUEUE</span><h3>审核队列</h3></div><button type="button" class="studio-text-button" @click="selectSection('review')">查看全部 <ChevronRight :size="14" /></button></div><div class="studio-review-list"><button v-for="row in reviewRows.slice(0, 3)" :key="row.id" type="button" class="studio-review-item" @click="selectedId = row.id; selectSection('review')"><span class="studio-review-mark"><Archive :size="15" /></span><span><strong>{{ row.name }}</strong><small>{{ row.hook }}</small></span><span class="studio-status" :class="statusClass(row.status === 'pending_review' ? row.status : row.l2Status)">{{ row.status === 'pending_review' ? 'L1 · ' : 'L2 · ' }}{{ statusLabel(row.status === 'pending_review' ? row.status : row.l2Status) }}</span><ChevronRight :size="15" /></button><div v-if="!reviewRows.length" class="studio-review-empty">当前没有待你判断的版本</div></div></section><section class="studio-panel studio-panel-blue"><div class="studio-panel-heading"><div><span class="studio-eyebrow">DISTRIBUTION HEALTH</span><h3>分发健康度</h3></div><BarChart3 :size="17" class="studio-panel-icon" /></div><div class="studio-health-score"><strong>84</strong><span>/ 100</span><small>内容供给稳定，继续补充 L0-02 的新鲜样本</small></div><div class="studio-health-bars"><div><span>内容新鲜度</span><i><b style="width: 78%" /></i><strong>78%</strong></div><div><span>可玩完成率</span><i><b style="width: 68%" /></i><strong>68%</strong></div><div><span>工具可用率</span><i><b style="width: 96%" /></i><strong>96%</strong></div></div></section></div>
        </section>

        <section v-else-if="activeSection === 'library' || activeSection === 'review'" class="studio-library">
          <div class="studio-create-strip"><div><span class="studio-eyebrow">NEW PLAYABLE</span><strong>从一个玩法骨架开始</strong><small>创建 L1 与第一条结构化内容，默认进入草稿</small></div><button type="button" class="studio-button studio-button-primary" @click="showCreateForm = !showCreateForm"><Sparkles :size="16" />{{ showCreateForm ? "收起" : "新建玩法" }}</button></div>
          <form v-if="showCreateForm" class="studio-create-form" @submit.prevent="createNewContent">
            <div class="studio-form-heading"><div><span class="studio-eyebrow">L1 + L2 DRAFT</span><h3>创建一张可玩的新卡</h3></div><span>发布前都可以继续编辑</span></div>
            <div class="studio-form-grid"><label>玩法编码<input v-model="createForm.code" required placeholder="例如 word_chain" /></label><label>玩法名称<input v-model="createForm.name" required placeholder="例如 反向接话" /></label><label>核心机制<select v-model="createForm.l0Id" required><option v-for="mechanism in overview.l0s" :key="mechanism.id" :value="mechanism.id">{{ mechanism.code }} · {{ mechanism.name }}</option></select></label><label>卡面标题<input v-model="createForm.title" required placeholder="用户会看到的内容标题" /></label><label>卡面 Hook<input v-model="createForm.hook" placeholder="一句让人想马上开始的话" /></label><label class="studio-form-wide">主持人规则<textarea v-model="createForm.rule" required rows="3" placeholder="现场如何开始和进行" /></label><label class="studio-form-wide">结束条件<textarea v-model="createForm.completionCondition" required rows="2" placeholder="何时算完成或分出结果" /></label><label>内容类型<select v-model="createForm.contentType"><option value="prompt">提示题</option><option value="truth">真相题</option><option value="sequence">顺序题</option><option value="environment">现场生成</option></select></label><label>模式<select v-model="createForm.mode"><option value="together">一起完成</option><option value="versus">双方对决</option></select></label><label>人数下限<input v-model.number="createForm.minPlayers" min="1" type="number" /></label><label>人数上限<input v-model.number="createForm.maxPlayers" min="1" type="number" /></label><label>预计分钟<input v-model.number="createForm.durationMinutes" min="1" type="number" /></label><label>卡面色调<select v-model="createForm.tone"><option value="coral">暖红</option><option value="blue">淡蓝</option><option value="gold">淡黄</option></select></label></div>
            <div class="studio-create-actions"><span>先选择核心机制，工具和复用策略可在卡片实验室继续调整</span><button type="submit" class="studio-button studio-button-primary" :disabled="workflowBusy"><Send :size="15" />创建草稿</button></div>
          </form>
          <div class="studio-library-toolbar"><div class="studio-search"><Search :size="16" /><input v-model="search" placeholder="搜索玩法、内容或规则" /></div><select v-model="filter" aria-label="筛选内容状态"><option value="all">全部状态</option><option value="draft">草稿</option><option value="pending_review">待审核</option><option value="published">已发布</option><option value="paused">已暂停</option></select><button type="button" class="studio-button studio-button-primary" :disabled="workflowBusy" @click="createDraftFromSelected"><Sparkles :size="16" />新建内容提案</button></div>
          <div class="studio-table-panel"><div class="studio-table-heading"><div><span class="studio-eyebrow">{{ activeSection === 'review' ? 'HUMAN GATE' : 'CONTENT LIBRARY' }}</span><h2>{{ activeSection === 'review' ? '待你判断的版本' : '全部游戏内容' }}</h2></div><span class="studio-muted">{{ filteredRows.length }} 个结果</span></div><div class="studio-table-wrap"><table><thead><tr><th>玩法卡</th><th>版本</th><th>状态</th><th>适用人数</th><th>工具</th><th>质量分</th><th></th></tr></thead><tbody><tr v-for="row in filteredRows" :key="row.id" :class="{ selected: selectedId === row.id }" @click="selectedId = row.id"><td><div class="studio-table-title"><span class="studio-table-dot" :class="row.status === 'published' ? 'is-live' : 'is-review'" /><span><strong>{{ row.name }}</strong><small>{{ row.hook }}</small></span></div></td><td class="studio-mono">{{ row.version }}</td><td><div class="studio-status-stack"><span class="studio-status" :class="statusClass(row.status)">L1 · {{ statusLabel(row.status) }}</span><small v-if="row.l2Status !== row.status">L2 · {{ statusLabel(row.l2Status) }}</small></div></td><td>{{ row.players }}</td><td><span class="studio-tool-text">{{ row.tools.join(' · ') }}</span></td><td><strong class="studio-quality">{{ row.quality }}</strong></td><td><button type="button" class="studio-row-action" title="打开详情"><ChevronRight :size="16" /></button></td></tr></tbody></table></div></div>
        </section>

        <section v-else-if="activeSection === 'lab'" class="studio-lab"><div class="studio-lab-heading"><div><span class="studio-eyebrow">PLAYABLE CARD LAB</span><h2>把一条内容，打磨成一局</h2><p>这里编辑的是后台版本，发布后生成不可变快照；用户端只会看到一张可以立即玩的卡。</p></div><button v-if="draftEditable" type="button" class="studio-button studio-button-primary" :disabled="workflowBusy" @click="submitSelected"><Send :size="16" />提交人工审核</button><button v-else-if="selected?.status === 'published'" type="button" class="studio-button studio-button-light" :disabled="workflowBusy" @click="createDraftFromSelected"><Sparkles :size="16" />基于此版本创建草稿</button></div><div class="studio-lab-grid"><section class="studio-editor studio-panel"><div class="studio-panel-heading"><div><span class="studio-eyebrow">L1 VERSION · {{ selected?.version }}</span><h3>{{ selected?.name }}</h3></div><span class="studio-status" :class="statusClass(selected?.status ?? '')">{{ statusLabel(selected?.status ?? '') }}</span></div><label>卡面 Hook<input v-model="draftForm.hook" :readonly="!draftEditable" /></label><label>主持人规则<textarea v-model="draftForm.rule" :readonly="!draftEditable" rows="4" /></label><label>结束条件<input v-model="draftForm.completionCondition" :readonly="!draftEditable" /></label><div class="studio-editor-row"><label>适用人数<input :value="selected?.players" readonly /></label><label>预计时长<input :value="selected?.duration" readonly /></label></div><div class="studio-tool-chips"><span>关联工具</span><b v-for="tool in selected?.tools ?? []" :key="tool"><TimerReset :size="13" />{{ tool }}</b></div><div class="studio-policy-block"><div class="studio-policy-heading"><span>内容复用策略</span><small>L2 冻结规则</small></div><div class="studio-policy-grid"><label>冷却轮数<input v-model.number="policyForm.cooldownRounds" min="0" type="number" /></label><label>冷却天数<input v-model.number="policyForm.cooldownDays" min="0" type="number" /></label><label>跳过冷却<input v-model.number="policyForm.skipCooldownRounds" min="0" type="number" /></label><label class="studio-policy-check"><input v-model="policyForm.permanentExhaustion" type="checkbox" />玩过后不再展示</label></div><button type="button" class="studio-button studio-button-light" :disabled="workflowBusy" @click="saveReusePolicy"><CheckCircle2 :size="15" />保存冻结策略</button></div></section><section class="studio-card-preview"><div class="studio-preview-top"><span>用户端卡面</span><button type="button" title="开始试玩"><Play :size="15" fill="currentColor" /></button></div><div class="studio-game-card"><span class="studio-card-kicker">{{ selected?.players }} · {{ selected?.duration }}</span><h3>{{ selected?.name }}</h3><p>{{ draftForm.hook }}</p><div class="studio-card-rule"><strong>怎么玩</strong><span>{{ draftForm.rule }}</span></div><div class="studio-card-footer"><span>结束条件</span><strong>{{ draftForm.completionCondition }}</strong></div></div><p class="studio-preview-note">完整卡面预览 · 不展示研发分层</p></section></div></section>

        <section v-else class="studio-distribution"><div class="studio-library-toolbar"><div><span class="studio-eyebrow">DISTRIBUTION & ANALYTICS</span><h2>让推荐有依据，也有退路</h2><p class="studio-muted">先用可解释规则过滤和排序，再让数据帮助内容变好。</p></div><button type="button" class="studio-button studio-button-light"><Workflow :size="16" />查看推荐规则</button></div><div class="studio-grid-two studio-distribution-grid"><section class="studio-table-panel"><div class="studio-table-heading"><div><span class="studio-eyebrow">L1 PERFORMANCE</span><h3>玩法表现</h3></div><span class="studio-muted">近 7 日</span></div><div class="studio-metric-list"><div v-for="metric in activeMetric.slice(0, 6)" :key="metric.l1Id"><div class="studio-metric-label"><strong>{{ metric.l1Name }}</strong><span>{{ Math.round(metric.completionRate * 100) }}% 完成</span></div><i><b :style="{ width: `${Math.max(8, metric.completionRate * 100)}%` }" /></i><small>{{ metric.starts }} 次开始 · {{ metric.rerolls }} 次换卡</small></div></div></section><section class="studio-panel studio-panel-warm"><div class="studio-panel-heading"><div><span class="studio-eyebrow">RECOMMENDATION GUARDRAILS</span><h3>推荐护栏</h3></div><Workflow :size="17" /></div><div class="studio-guardrail"><CheckCircle2 :size="17" /><span>审核通过版本</span><strong>已启用</strong></div><div class="studio-guardrail"><TimerReset :size="17" /><span>L2 内容冷却</span><strong>已启用</strong></div><div class="studio-guardrail"><Archive :size="17" /><span>永久消费内容</span><strong>不重复</strong></div><div class="studio-guardrail"><CircleHelp :size="17" /><span>候选为空时</span><strong>明确提示</strong></div></section></div></section>
        <section v-if="activeSection === 'lab' && selected" class="studio-panel studio-l2-editor-full"><div class="studio-panel-heading"><div><span class="studio-eyebrow">L2 CONTENT PACKAGE</span><h3>结构化内容</h3></div><span class="studio-status" :class="statusClass(selected.l2Status)">{{ statusLabel(selected.l2Status) }}</span></div><div class="studio-l2-fields"><label>内容标题<input v-model="l2Form.title" :readonly="!l2Editable" /></label><label>内容类型<select v-model="l2Form.contentType" :disabled="!l2Editable"><option value="prompt">提示题</option><option value="truth">真相题</option><option value="sequence">顺序题</option><option value="environment">现场生成</option></select></label><label class="studio-l2-wide">题面内容<textarea v-model="l2Form.content" :readonly="!l2Editable" rows="3" /></label></div><button type="button" class="studio-button studio-button-light" :disabled="workflowBusy || !l2Editable" @click="saveL2Draft"><CheckCircle2 :size="15" />保存 L2 草稿</button></section>
      </div>
    </main>
  </div>
  <StudioWorkflowActions
    :visible="activeSection === 'lab' || activeSection === 'review'"
    :name="selected?.name ?? ''"
    :status="selected?.status ?? ''"
    :l2-status="selected?.l2Status ?? ''"
    :busy="workflowBusy"
    :message="workflowMessage"
    @submit="submitSelected"
    @approve="reviewSelected('approve')"
    @request-changes="reviewSelected('request_changes')"
    @publish="publishSelected"
    @create="createDraftFromSelected"
    @submit-l2="submitSelectedL2"
    @approve-l2="reviewSelectedL2('approve')"
    @request-l2-changes="reviewSelectedL2('request_changes')"
    @publish-l2="publishSelectedL2"
  />
</template>
