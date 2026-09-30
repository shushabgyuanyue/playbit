<script setup lang="ts">
import type { ContentAnalytics, ContentCardMetric } from "@playbit/shared";
import { ArrowUpRight, BarChart3, FlaskConical, Lightbulb, Target, Users, Wrench } from "lucide-vue-next";
import { computed } from "vue";

const props = defineProps<{
  analytics: ContentAnalytics | null;
  window: ContentAnalytics["window"];
  topCards: ContentCardMetric[];
  selectedMetric: ContentCardMetric | null;
  selectedRow: { id: string } | null;
}>();

const emit = defineEmits<{
  "update:window": [value: ContentAnalytics["window"]];
  "select-card": [l2Id: string];
  "open-card": [];
}>();

const windowLabels: Record<ContentAnalytics["window"], string> = {
  all: "全部运行数据",
  "7d": "近 7 天",
  "30d": "近 30 天"
};

const percent = (value: number) => `${Math.round(value * 100)}%`;
const barWidth = (value: number, maximum: number) => `${maximum ? Math.max(value ? 4 : 0, Math.min(100, value / maximum * 100)) : 0}%`;

const funnel = computed(() => {
  const data = props.analytics?.funnel;
  if (!data) return [];
  return [
    { key: "exposures", label: "展示", value: data.exposures, rate: 1 },
    { key: "starts", label: "开始", value: data.starts, rate: data.exposures ? data.starts / data.exposures : 0 },
    { key: "completes", label: "完成", value: data.completes, rate: data.starts ? data.completes / data.starts : 0 },
    { key: "abandons", label: "中途退出", value: data.abandons, rate: data.starts ? data.abandons / data.starts : 0 }
  ];
});

const selectedTitle = computed(() => props.selectedMetric?.l2Title ?? "未选择卡片");

const selectedHints = computed(() => {
  const metric = props.selectedMetric;
  if (!metric) return [{ title: "先从热榜选择一张卡", text: "选择卡片后，这里会给出基于曝光、开始、完成和跳过的下一步判断。" }];
  const hints: Array<{ title: string; text: string }> = [];
  if (metric.startRate < 0.35) hints.push({ title: "先检查开局 Hook", text: `曝光到开始只有 ${percent(metric.startRate)}，优先检查标题、第一句话和主持人是否能马上理解。` });
  if (metric.skipRate >= 0.3) hints.push({ title: "检查是否卡在进入门槛", text: `主动换卡占展示 ${percent(metric.skipRate)}，优先检查规则长度、场景是否匹配和第一步是否尴尬。` });
  if (metric.starts > 0 && metric.completionRate < 0.45) hints.push({ title: "拆解开始后的流失", text: `开始后的完成率为 ${percent(metric.completionRate)}，建议用真实试玩记录核对中段规则和结束条件。` });
  if (!hints.length) hints.push({ title: "保持现有结构，增加受控曝光", text: `这张卡的开始率 ${percent(metric.startRate)}、完成率 ${percent(metric.completionRate)}，可以扩大场景探索并观察是否稳定。` });
  return hints;
});

function changeWindow(event: Event) {
  emit("update:window", (event.target as HTMLSelectElement).value as ContentAnalytics["window"]);
}
</script>

<template>
  <section class="studio-distribution">
    <header class="studio-analytics-heading">
      <div><span class="studio-eyebrow">DISTRIBUTION & ANALYTICS</span><h2>让推荐有依据，也有退路</h2><p>从整体漏斗看到卡片热度，再下钻到场景、用户分群和工具使用。</p></div>
      <label class="studio-analytics-window">统计窗口<select :value="props.window" @change="changeWindow"><option value="all">全部运行数据</option><option value="7d">近 7 天</option><option value="30d">近 30 天</option></select></label>
    </header>

    <div v-if="!props.analytics" class="studio-analytics-empty"><BarChart3 :size="24" /><strong>暂时没有分析数据</strong><span>等有卡片展示或用户行为后，这里会自动出现可下钻的指标。</span></div>
    <template v-else>
      <div class="studio-analytics-kpis">
        <div><span>卡片展示</span><strong>{{ props.analytics.funnel.exposures }}</strong><small>{{ windowLabels[props.window] }}</small></div>
        <div><span>开始率</span><strong>{{ percent(props.analytics.funnel.exposures ? props.analytics.funnel.starts / props.analytics.funnel.exposures : 0) }}</strong><small>{{ props.analytics.funnel.starts }} 次开始</small></div>
        <div><span>完成率</span><strong>{{ percent(props.analytics.funnel.starts ? props.analytics.funnel.completes / props.analytics.funnel.starts : 0) }}</strong><small>{{ props.analytics.funnel.completes }} 次完成</small></div>
        <div><span>主动换卡</span><strong>{{ percent(props.analytics.funnel.exposures ? props.analytics.funnel.rerolls / props.analytics.funnel.exposures : 0) }}</strong><small>{{ props.analytics.funnel.rerolls }} 次换卡</small></div>
        <div class="studio-analytics-kpi-accent"><span>活跃用户</span><strong>{{ props.analytics.userSummary.activeActors }}</strong><small>{{ props.analytics.userSummary.newActors }} 新 · {{ props.analytics.userSummary.returningActors }} 回访</small></div>
      </div>

      <div class="studio-analytics-grid studio-analytics-grid-top">
        <section class="studio-panel studio-analytics-panel">
          <div class="studio-panel-heading"><div><span class="studio-eyebrow">FUNNEL</span><h3>从展示到完成</h3></div><Target :size="17" /></div>
          <div class="studio-funnel-list"><div v-for="item in funnel" :key="item.key"><div><strong>{{ item.label }}</strong><span>{{ item.value }} <em v-if="item.key !== 'exposures'">· {{ percent(item.rate) }}</em></span></div><i><b :style="{ width: barWidth(item.value, props.analytics.funnel.exposures) }" /></i></div></div>
        </section>
        <section class="studio-panel studio-analytics-panel studio-analytics-selected">
          <div class="studio-panel-heading"><div><span class="studio-eyebrow">CARD DRILL-DOWN</span><h3>{{ selectedTitle }}</h3></div><FlaskConical :size="17" /></div>
          <template v-if="props.selectedMetric"><div class="studio-selected-meta"><span>{{ props.selectedMetric.l1Name }}</span><b>热度 {{ props.selectedMetric.heatScore }}</b></div><div class="studio-selected-stats"><div><strong>{{ props.selectedMetric.exposures }}</strong><small>展示</small></div><div><strong>{{ percent(props.selectedMetric.startRate) }}</strong><small>开始率</small></div><div><strong>{{ percent(props.selectedMetric.completionRate) }}</strong><small>完成率</small></div><div><strong>{{ percent(props.selectedMetric.skipRate) }}</strong><small>换卡率</small></div></div><button v-if="props.selectedRow" type="button" class="studio-button studio-button-light" @click="emit('open-card')"><FlaskConical :size="15" />进入卡片实验室</button></template><p v-else class="studio-analytics-panel-empty">点击下方热榜任意卡片查看单卡表现。</p>
        </section>
      </div>

      <section class="studio-table-panel studio-analytics-table-panel">
        <div class="studio-table-heading"><div><span class="studio-eyebrow">TOP 20 · HEAT RANKING</span><h2>卡片热榜</h2></div><span class="studio-muted">热度由展示、开始、完成、收藏和换卡综合计算</span></div>
        <div class="studio-table-wrap"><table><thead><tr><th>#</th><th>卡片</th><th>玩法</th><th>场景</th><th>热度</th><th>开始率</th><th>完成率</th><th>换卡率</th></tr></thead><tbody><tr v-for="(card, index) in props.topCards" :key="card.l2Id" :class="{ selected: props.selectedMetric?.l2Id === card.l2Id }" tabindex="0" @click="emit('select-card', card.l2Id)" @keydown.enter="emit('select-card', card.l2Id)"><td><span class="studio-ranking-number" :class="{ 'is-top': index < 3 }">{{ index + 1 }}</span></td><td><strong class="studio-analytics-card-title">{{ card.l2Title }}</strong></td><td><span class="studio-tool-text">{{ card.l1Name }}</span></td><td><span class="studio-scene-list">{{ card.scenes.join(' · ') || '未标注' }}</span></td><td><strong class="studio-quality">{{ card.heatScore }}</strong></td><td>{{ percent(card.startRate) }}</td><td>{{ percent(card.completionRate) }}</td><td :class="{ 'studio-analytics-risk': card.skipRate >= .3 }">{{ percent(card.skipRate) }}</td></tr><tr v-if="!props.topCards.length"><td colspan="8" class="studio-empty-cell">当前窗口还没有卡片行为数据</td></tr></tbody></table></div>
      </section>

      <div class="studio-analytics-grid studio-analytics-grid-bottom">
        <section class="studio-panel studio-analytics-panel"><div class="studio-panel-heading"><div><span class="studio-eyebrow">SCENE PERFORMANCE</span><h3>场景表现</h3></div><BarChart3 :size="17" /></div><div class="studio-dimension-list"><div v-for="item in props.analytics.sceneMetrics" :key="item.key"><div><strong>{{ item.label }}</strong><span>{{ percent(item.startRate) }} 开始</span></div><i><b :style="{ width: barWidth(item.startRate, Math.max(...props.analytics.sceneMetrics.map((entry) => entry.startRate), .01)) }" /></i><small>{{ item.exposures }} 展示 · {{ percent(item.completionRate) }} 完成</small></div><p v-if="!props.analytics.sceneMetrics.length" class="studio-analytics-panel-empty">还没有可比较的场景数据。</p></div></section>
        <section class="studio-panel studio-analytics-panel"><div class="studio-panel-heading"><div><span class="studio-eyebrow">USER COHORTS</span><h3>用户分群</h3></div><Users :size="17" /></div><div class="studio-cohort-list"><div v-for="item in props.analytics.userSegments" :key="item.key"><span><strong>{{ item.label }}</strong><small>{{ item.actors }} 人</small></span><b>{{ percent(item.completionRate) }}</b><em>{{ item.starts }} 次开始</em></div><p v-if="!props.analytics.userSegments.length" class="studio-analytics-panel-empty">还没有可比较的用户数据。</p></div></section>
        <section class="studio-panel studio-analytics-panel"><div class="studio-panel-heading"><div><span class="studio-eyebrow">TOOL USAGE</span><h3>工具使用</h3></div><Wrench :size="17" /></div><div class="studio-tool-metric-list"><div v-for="item in props.analytics.toolMetrics" :key="item.toolId"><span><strong>{{ item.toolName }}</strong><small>{{ item.opens }} 次打开</small></span><b>{{ percent(item.openRate) }}</b></div></div></section>
      </div>

      <section class="studio-panel studio-analytics-insights"><div class="studio-panel-heading"><div><span class="studio-eyebrow">NEXT DECISION</span><h3>下一步怎么改</h3></div><Lightbulb :size="17" /></div><div class="studio-insight-list"><div v-for="hint in selectedHints" :key="hint.title"><ArrowUpRight :size="15" /><span><strong>{{ hint.title }}</strong><small>{{ hint.text }}</small></span></div></div></section>
    </template>
  </section>
</template>

<style scoped>
.studio-analytics-heading { display: flex; align-items: flex-end; justify-content: space-between; gap: 24px; margin-bottom: 20px; }
.studio-analytics-heading h2 { margin: 7px 0 5px; font-size: 22px; }
.studio-analytics-heading p { margin: 0; color: #8492a5; }
.studio-analytics-window { display: grid; gap: 6px; min-width: 142px; color: #7d8da1; font-size: 11px; }
.studio-analytics-window select { height: 36px; border: 1px solid #e2e8ef; border-radius: 5px; background: #fff; color: #526981; padding: 0 10px; font: inherit; }
.studio-analytics-empty { display: grid; min-height: 260px; place-items: center; align-content: center; gap: 9px; border: 1px solid #e8edf3; border-radius: 7px; background: #fff; color: #92a0b0; text-align: center; }
.studio-analytics-empty svg { color: #79a8d5; }.studio-analytics-empty strong { color: #526b87; font-size: 14px; }.studio-analytics-empty span { font-size: 11px; }
.studio-analytics-kpis { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); border: 1px solid #e8edf3; border-radius: 7px; background: #fff; }
.studio-analytics-kpis > div { min-height: 102px; border-right: 1px solid #edf1f5; padding: 16px 18px; }.studio-analytics-kpis > div:last-child { border-right: 0; }.studio-analytics-kpis span, .studio-analytics-kpis small { display: block; color: #8998ab; font-size: 10px; }.studio-analytics-kpis strong { display: block; margin: 8px 0 3px; color: #233d5d; font-family: var(--pb-font-numeric); font-size: 27px; font-weight: 500; }.studio-analytics-kpi-accent { background: #f5faff; }.studio-analytics-kpi-accent strong { color: #2876c3; }
.studio-analytics-grid { display: grid; gap: 16px; }.studio-analytics-grid-top { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); margin-top: 16px; }.studio-analytics-grid-bottom { grid-template-columns: repeat(3, minmax(0, 1fr)); margin-top: 16px; }.studio-analytics-panel { min-width: 0; }.studio-funnel-list, .studio-dimension-list, .studio-cohort-list, .studio-tool-metric-list { display: grid; gap: 15px; margin-top: 22px; }.studio-funnel-list > div > div, .studio-dimension-list > div > div { display: flex; justify-content: space-between; color: #7e8da1; font-size: 11px; }.studio-funnel-list strong, .studio-dimension-list strong { color: #435b76; font-weight: 600; }.studio-funnel-list em { color: #6aa178; font-style: normal; }.studio-funnel-list i, .studio-dimension-list i { display: block; height: 6px; margin-top: 7px; border-radius: 4px; background: #e9eef5; overflow: hidden; }.studio-funnel-list b, .studio-dimension-list b { display: block; height: 100%; border-radius: inherit; background: #72a6d9; }.studio-dimension-list small { display: block; margin-top: 5px; color: #a0aaba; font-size: 10px; }
.studio-selected-meta { display: flex; justify-content: space-between; gap: 12px; margin-top: 18px; color: #7e8da1; font-size: 11px; }.studio-selected-meta b { color: #c17a37; font-weight: 600; }.studio-selected-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 17px 0; }.studio-selected-stats div { border: 1px solid #edf1f5; border-radius: 4px; padding: 10px 8px; }.studio-selected-stats strong, .studio-selected-stats small { display: block; }.studio-selected-stats strong { color: #344b68; font-family: var(--pb-font-numeric); font-size: 17px; font-weight: 500; }.studio-selected-stats small { margin-top: 4px; color: #9aa7b8; font-size: 9px; }.studio-analytics-panel-empty { color: #9aa7b8; font-size: 11px; line-height: 1.6; }.studio-selected-meta + .studio-selected-stats + button { min-height: 32px; }
.studio-analytics-table-panel { margin-top: 16px; }.studio-ranking-number { display: grid; width: 22px; height: 22px; place-items: center; border-radius: 50%; background: #f1f4f8; color: #8493a5; font-family: var(--pb-font-numeric); font-size: 10px; }.studio-ranking-number.is-top { background: #fff0dc; color: #ba7935; }.studio-analytics-card-title { color: #344b68; font-size: 12px; font-weight: 600; }.studio-analytics-risk { color: #c5725d; font-weight: 600; }.studio-analytics-table-panel tbody tr { cursor: pointer; }.studio-analytics-table-panel tbody tr:focus { outline: 2px solid #8bb7df; outline-offset: -2px; }
.studio-cohort-list > div, .studio-tool-metric-list > div { display: flex; align-items: center; justify-content: space-between; gap: 10px; border-top: 1px solid #eef1f5; padding-top: 11px; color: #6f8197; font-size: 11px; }.studio-cohort-list > div:first-child, .studio-tool-metric-list > div:first-child { border-top: 0; padding-top: 0; }.studio-cohort-list span, .studio-tool-metric-list span { min-width: 0; }.studio-cohort-list strong, .studio-cohort-list small, .studio-tool-metric-list strong, .studio-tool-metric-list small { display: block; }.studio-cohort-list strong, .studio-tool-metric-list strong { color: #435b76; font-weight: 600; }.studio-cohort-list small, .studio-tool-metric-list small { margin-top: 4px; color: #a0aaba; font-size: 10px; }.studio-cohort-list b, .studio-tool-metric-list b { color: #5b9a75; font-family: var(--pb-font-numeric); font-size: 12px; font-weight: 500; }.studio-cohort-list em { color: #a0aaba; font-size: 10px; font-style: normal; white-space: nowrap; }
.studio-analytics-insights { margin-top: 16px; background: linear-gradient(145deg, #fff, #fffaf5); }.studio-insight-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-top: 16px; }.studio-insight-list > div { display: flex; gap: 9px; border-top: 1px solid #f0e9df; padding-top: 12px; color: #c48748; }.studio-insight-list span { min-width: 0; }.studio-insight-list strong, .studio-insight-list small { display: block; }.studio-insight-list strong { color: #765f48; font-size: 11px; }.studio-insight-list small { margin-top: 4px; color: #928475; font-size: 10px; line-height: 1.55; }
@media (max-width: 980px) { .studio-analytics-kpis { grid-template-columns: repeat(3, 1fr); }.studio-analytics-kpis > div:nth-child(3) { border-right: 0; }.studio-analytics-kpis > div:nth-child(n + 4) { border-top: 1px solid #edf1f5; }.studio-analytics-grid-top, .studio-analytics-grid-bottom { grid-template-columns: 1fr; } }
@media (max-width: 680px) { .studio-analytics-heading { align-items: stretch; flex-direction: column; gap: 14px; }.studio-analytics-window { min-width: 0; }.studio-analytics-kpis { grid-template-columns: repeat(2, 1fr); }.studio-analytics-kpis > div, .studio-analytics-kpis > div:nth-child(3) { border-right: 0; }.studio-analytics-kpis > div:nth-child(even) { border-left: 1px solid #edf1f5; }.studio-analytics-kpis > div:nth-child(n + 3) { border-top: 1px solid #edf1f5; }.studio-selected-stats { grid-template-columns: repeat(2, 1fr); }.studio-insight-list { grid-template-columns: 1fr; }.studio-analytics-table-panel .studio-table-wrap { overflow-x: auto; } }
</style>
