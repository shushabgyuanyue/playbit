<script setup lang="ts">
import type { ContentAnalytics, ContentCardMetric } from "@playbit/shared";
import { ArrowUpRight, BarChart3, FlaskConical } from "lucide-vue-next";
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

const percent = (value: number) => `${Math.round(value * 100)}%`;

const selectedHasData = computed(() => {
  const metric = props.selectedMetric;
  return Boolean(metric && (metric.exposures || metric.starts || metric.completes || metric.rerolls || metric.abandons || metric.toolOpens || metric.favoriteActors));
});

const selectedHints = computed(() => {
  const metric = props.selectedMetric;
  if (!metric) return [{ title: "先从热榜选择一张卡", text: "这里会把分发信号翻译成下一步内容或玩法判断。" }];
  if (!selectedHasData.value) return [{ title: "先积累真实样本", text: "当前窗口还没有这张卡的去重行为数据，暂不把 0% 解释成内容问题。" }];
  const hints: Array<{ title: string; text: string }> = [];
  if (metric.exposures < 10) {
    hints.push({ title: "样本偏少，先不要改规则", text: `当前只有 ${metric.exposures} 次展示，先完成一轮受控曝光，再根据稳定信号调整题面或分发场景。` });
  }
  if (metric.startRate < 0.35) {
    hints.push({ title: "先检查开局 Hook", text: `曝光到开始只有 ${percent(metric.startRate)}，先改标题、第一句话和主持人第一步，不要先改推荐权重。` });
  }
  if (metric.skipRate >= 0.3) {
    hints.push({ title: "检查场景和进入门槛", text: `主动换卡占展示 ${percent(metric.skipRate)}，优先核对场景、人数组合和规则长度，避免把一次跳过当成永久不喜欢。` });
  }
  if (metric.starts > 0 && metric.completionRate < 0.45) {
    hints.push({ title: "回到中段规则试玩", text: `开始后的完成率为 ${percent(metric.completionRate)}，建议记录真人试玩中的卡顿、尴尬点和结束条件是否清楚。` });
  }
  if (!hints.length) {
    hints.push({ title: "保持结构，扩大受控曝光", text: `开始率 ${percent(metric.startRate)}、完成率 ${percent(metric.completionRate)}，可以扩大适配场景或测试新的 L2 内容。` });
  }
  return hints;
});

const selectedTitle = computed(() => props.selectedMetric?.l2Title ?? "未选择卡片");

function changeWindow(event: Event) {
  emit("update:window", (event.target as HTMLSelectElement).value as ContentAnalytics["window"]);
}
</script>

<template>
  <section class="studio-card-analytics">
    <header class="studio-analytics-heading">
      <div>
        <span class="studio-eyebrow">CARD ANALYTICS</span>
        <h2>卡片分析</h2>
        <p>从一张用户卡出发，判断是题面、玩法还是分发场景需要调整。</p>
      </div>
      <label class="studio-analytics-window">统计窗口<select :value="props.window" @change="changeWindow"><option value="all">全部运行数据</option><option value="7d">近 7 天</option><option value="30d">近 30 天</option></select></label>
    </header>

    <div v-if="!props.analytics" class="studio-analytics-empty"><BarChart3 :size="24" /><strong>暂时没有卡片分析数据</strong><span>等卡片产生真实行为后，这里会出现热榜和单卡判断。</span></div>
    <template v-else>
      <div class="studio-card-analytics-summary">
        <div><span>有行为数据的卡片</span><strong>{{ props.topCards.length }}</strong><small>当前窗口进入热榜的样本</small></div>
        <div><span>分析总展示</span><strong>{{ props.analytics.funnel.exposures }}</strong><small>不把预加载算作展示</small></div>
        <div><span>当前选中</span><strong class="studio-card-analytics-summary-title">{{ selectedTitle }}</strong><small>{{ props.selectedMetric ? `${props.selectedMetric.l1Name} · ${props.selectedMetric.scenes.join(' · ') || '未标注场景'}` : '点击热榜查看' }}</small></div>
      </div>

      <div class="studio-card-analytics-layout">
        <section class="studio-table-panel studio-analytics-table-panel">
          <div class="studio-table-heading"><div><span class="studio-eyebrow">TOP 20 · CARD SIGNALS</span><h2>卡片热榜</h2></div><span class="studio-muted">热度只用于发现样本，不作为唯一发布依据</span></div>
          <div class="studio-table-wrap"><table><thead><tr><th>#</th><th>卡片</th><th>玩法</th><th>场景</th><th>展示</th><th>开始率</th><th>完成率</th><th>换卡率</th></tr></thead><tbody><tr v-for="(card, index) in props.topCards" :key="card.l2Id" :class="{ selected: props.selectedMetric?.l2Id === card.l2Id }" tabindex="0" @click="emit('select-card', card.l2Id)" @keydown.enter="emit('select-card', card.l2Id)"><td><span class="studio-ranking-number" :class="{ 'is-top': index < 3 }">{{ index + 1 }}</span></td><td><strong class="studio-analytics-card-title">{{ card.l2Title }}</strong></td><td><span class="studio-tool-text">{{ card.l1Name }}</span></td><td><span class="studio-scene-list">{{ card.scenes.join(' · ') || '未标注' }}</span></td><td>{{ card.exposures }}</td><td>{{ percent(card.startRate) }}</td><td>{{ percent(card.completionRate) }}</td><td :class="{ 'studio-analytics-risk': card.skipRate >= .3 }">{{ percent(card.skipRate) }}</td></tr><tr v-if="!props.topCards.length"><td colspan="8" class="studio-empty-cell">当前窗口还没有卡片行为数据</td></tr></tbody></table></div>
        </section>

        <section class="studio-panel studio-card-analytics-detail">
          <div class="studio-panel-heading"><div><span class="studio-eyebrow">SELECTED CARD</span><h3>{{ selectedTitle }}</h3></div><FlaskConical :size="17" /></div>
          <template v-if="props.selectedMetric">
            <div class="studio-selected-meta"><span>{{ props.selectedMetric.l1Name }}</span><b>{{ selectedHasData ? `热度参考 ${props.selectedMetric.heatScore}` : '尚无行为数据' }}</b></div>
            <div v-if="!selectedHasData" class="studio-selected-no-data">当前窗口还没有这张卡的真实展示或游玩记录。它可以继续编辑和发布，但不要依据 0% 指标修改内容。</div>
            <div v-else class="studio-selected-stats"><div><strong>{{ props.selectedMetric.exposures }}</strong><small>展示</small></div><div><strong>{{ percent(props.selectedMetric.startRate) }}</strong><small>开始率</small></div><div><strong>{{ percent(props.selectedMetric.completionRate) }}</strong><small>完成率</small></div><div><strong>{{ percent(props.selectedMetric.skipRate) }}</strong><small>换卡率</small></div></div>
            <div class="studio-card-analytics-context"><span>适配场景</span><strong>{{ props.selectedMetric.scenes.join(' · ') || '未标注' }}</strong></div>
            <button v-if="props.selectedRow" type="button" class="studio-button studio-button-light" @click="emit('open-card')"><FlaskConical :size="15" />进入卡片实验室</button>
          </template>
          <p v-else class="studio-analytics-panel-empty">点击左侧热榜卡片查看单卡表现和研发建议。</p>
        </section>
      </div>

      <section class="studio-panel studio-analytics-insights"><div class="studio-panel-heading"><div><span class="studio-eyebrow">CONTENT DECISION</span><h3>下一步怎么改</h3></div><ArrowUpRight :size="17" /></div><div class="studio-insight-list"><div v-for="hint in selectedHints" :key="hint.title"><ArrowUpRight :size="15" /><span><strong>{{ hint.title }}</strong><small>{{ hint.text }}</small></span></div></div></section>
    </template>
  </section>
</template>

<style scoped>
.studio-analytics-heading { display: flex; align-items: flex-end; justify-content: space-between; gap: 24px; margin-bottom: 20px; }.studio-analytics-heading h2 { margin: 7px 0 5px; font-size: 22px; }.studio-analytics-heading p { margin: 0; color: #8492a5; }.studio-analytics-window { display: grid; gap: 6px; min-width: 142px; color: #7d8da1; font-size: 11px; }.studio-analytics-window select { height: 36px; border: 1px solid #e2e8ef; border-radius: 5px; background: #fff; color: #526981; padding: 0 10px; font: inherit; }
.studio-analytics-empty { display: grid; min-height: 260px; place-items: center; align-content: center; gap: 9px; border: 1px solid #e8edf3; border-radius: 7px; background: #fff; color: #92a0b0; text-align: center; }.studio-analytics-empty svg { color: #79a8d5; }.studio-analytics-empty strong { color: #526b87; font-size: 14px; }.studio-analytics-empty span { font-size: 11px; }
.studio-card-analytics-summary { display: grid; grid-template-columns: .9fr .9fr 1.4fr; border: 1px solid #e8edf3; border-radius: 7px; background: #fff; }.studio-card-analytics-summary > div { min-height: 94px; border-right: 1px solid #edf1f5; padding: 16px 18px; }.studio-card-analytics-summary > div:last-child { border-right: 0; background: #f8fbff; }.studio-card-analytics-summary span, .studio-card-analytics-summary small { display: block; color: #8998ab; font-size: 10px; }.studio-card-analytics-summary strong { display: block; margin: 8px 0 3px; color: #233d5d; font-family: var(--pb-font-numeric); font-size: 27px; font-weight: 500; }.studio-card-analytics-summary-title { overflow: hidden; font-family: var(--pb-font-sans) !important; font-size: 15px !important; text-overflow: ellipsis; white-space: nowrap; }
.studio-card-analytics-layout { display: grid; grid-template-columns: minmax(0, 1.45fr) minmax(300px, .75fr); gap: 16px; margin-top: 16px; }.studio-analytics-table-panel { min-width: 0; }.studio-table-panel { padding: 22px 0 0; }.studio-table-heading { display: flex; align-items: center; justify-content: space-between; padding: 0 22px 18px; }.studio-table-heading h2 { margin: 5px 0 0; font-size: 18px; }.studio-table-wrap { overflow-x: auto; border-top: 1px solid #edf1f5; }.studio-table-wrap table { width: 100%; border-collapse: collapse; text-align: left; }.studio-table-wrap th { color: #9aa7b8; font-size: 10px; font-weight: 600; letter-spacing: .05em; }.studio-table-wrap th, .studio-table-wrap td { padding: 13px 10px; }.studio-table-wrap th:first-child, .studio-table-wrap td:first-child { padding-left: 22px; }.studio-table-wrap th:last-child, .studio-table-wrap td:last-child { padding-right: 22px; }.studio-table-wrap tr { border-bottom: 1px solid #eef1f5; }.studio-table-wrap tbody tr { color: #718196; font-size: 11px; cursor: pointer; }.studio-table-wrap tbody tr:hover, .studio-table-wrap tbody tr.selected { background: #f9fbfe; }.studio-table-wrap tbody tr:focus { outline: 2px solid #8bb7df; outline-offset: -2px; }.studio-ranking-number { display: grid; width: 22px; height: 22px; place-items: center; border-radius: 50%; background: #f1f4f8; color: #8493a5; font-family: var(--pb-font-numeric); font-size: 10px; }.studio-ranking-number.is-top { background: #fff0dc; color: #ba7935; }.studio-analytics-card-title { color: #344b68; font-size: 12px; font-weight: 600; }.studio-analytics-risk { color: #c5725d; font-weight: 600; }.studio-empty-cell { padding: 28px !important; color: #9aa7b8; text-align: center; }
.studio-card-analytics-detail { min-width: 0; }.studio-card-analytics-detail h3 { max-width: 210px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.studio-selected-meta { display: flex; justify-content: space-between; gap: 12px; margin-top: 18px; color: #7e8da1; font-size: 11px; }.studio-selected-meta b { color: #c17a37; font-weight: 600; }.studio-selected-stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin: 17px 0; }.studio-selected-stats div { border: 1px solid #edf1f5; border-radius: 4px; padding: 10px 8px; }.studio-selected-stats strong, .studio-selected-stats small { display: block; }.studio-selected-stats strong { color: #344b68; font-family: var(--pb-font-numeric); font-size: 17px; font-weight: 500; }.studio-selected-stats small { margin-top: 4px; color: #9aa7b8; font-size: 9px; }.studio-card-analytics-context { display: grid; gap: 5px; margin: 2px 0 16px; border-top: 1px solid #eef1f5; padding-top: 12px; }.studio-card-analytics-context span { color: #9aa7b8; font-size: 10px; }.studio-card-analytics-context strong { color: #526b87; font-size: 11px; font-weight: 500; }.studio-analytics-panel-empty { color: #9aa7b8; font-size: 11px; line-height: 1.6; }
.studio-selected-no-data { margin: 16px 0; border: 1px dashed #dfe8f2; border-radius: 5px; background: #fafcff; padding: 12px; color: #8392a5; font-size: 10px; line-height: 1.6; }
.studio-analytics-insights { margin-top: 16px; background: linear-gradient(145deg, #fff, #fffaf5); }.studio-insight-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-top: 16px; }.studio-insight-list > div { display: flex; gap: 9px; border-top: 1px solid #f0e9df; padding-top: 12px; color: #c48748; }.studio-insight-list span { min-width: 0; }.studio-insight-list strong, .studio-insight-list small { display: block; }.studio-insight-list strong { color: #765f48; font-size: 11px; }.studio-insight-list small { margin-top: 4px; color: #928475; font-size: 10px; line-height: 1.55; }
@media (max-width: 980px) { .studio-card-analytics-layout { grid-template-columns: 1fr; }.studio-card-analytics-detail { order: -1; } }
@media (max-width: 680px) { .studio-analytics-heading { align-items: stretch; flex-direction: column; gap: 14px; }.studio-analytics-window { min-width: 0; }.studio-card-analytics-summary { grid-template-columns: repeat(2, 1fr); }.studio-card-analytics-summary > div:nth-child(2) { border-right: 0; }.studio-card-analytics-summary > div:last-child { grid-column: 1 / -1; border-top: 1px solid #edf1f5; }.studio-insight-list { grid-template-columns: 1fr; }.studio-table-heading { align-items: flex-start; gap: 8px; padding: 0 16px 14px; }.studio-table-heading > .studio-muted { text-align: right; }.studio-table-wrap { -webkit-overflow-scrolling: touch; }.studio-table-wrap table { min-width: 800px; } }
</style>
