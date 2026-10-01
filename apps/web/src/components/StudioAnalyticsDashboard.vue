<script setup lang="ts">
import type { ContentAnalytics, ContentOverview } from "@playbit/shared";
import { Activity, ArrowUpRight, Target } from "lucide-vue-next";
import { computed } from "vue";

const props = defineProps<{
  analytics: ContentAnalytics | null;
  window: ContentAnalytics["window"];
  counts: ContentOverview["counts"];
}>();

const emit = defineEmits<{
  "update:window": [value: ContentAnalytics["window"]];
}>();

const percent = (value: number) => `${Math.round(value * 100)}%`;
const barWidth = (value: number, maximum: number) => `${maximum ? Math.max(value ? 4 : 0, Math.min(100, value / maximum * 100)) : 0}%`;

const distributionRates = computed(() => {
  const funnel = props.analytics?.funnel;
  if (!funnel) return { start: 0, completion: 0, reroll: 0, abandon: 0 };
  return {
    start: funnel.exposures ? funnel.starts / funnel.exposures : 0,
    completion: funnel.starts ? funnel.completes / funnel.starts : 0,
    reroll: funnel.exposures ? funnel.rerolls / funnel.exposures : 0,
    abandon: funnel.starts ? funnel.abandons / funnel.starts : 0
  };
});

const funnel = computed(() => {
  const data = props.analytics?.funnel;
  if (!data) return [];
  return [
    { key: "exposures", label: "展示", value: data.exposures, rate: 1 },
    { key: "starts", label: "开始", value: data.starts, rate: distributionRates.value.start },
    { key: "completes", label: "完成", value: data.completes, rate: distributionRates.value.completion },
    { key: "rerolls", label: "主动换卡", value: data.rerolls, rate: distributionRates.value.reroll },
    { key: "abandons", label: "中途退出", value: data.abandons, rate: distributionRates.value.abandon }
  ];
});

const sceneRows = computed(() => [...(props.analytics?.sceneMetrics ?? [])]
  .sort((left, right) => right.exposures - left.exposures)
  .slice(0, 6));

const sceneSignal = (scene: (typeof sceneRows.value)[number]) => {
  if (scene.exposures < 10) return "样本偏少";
  if (scene.startRate < 0.35) return "检查开局适配";
  if (scene.skipRate >= 0.3) return "检查场景匹配";
  if (scene.completionRate < 0.45) return "回看中段规则";
  return "可继续探索";
};

const signals = computed(() => {
  const rates = distributionRates.value;
  if (!props.analytics || !props.analytics.funnel.exposures) {
    return [{ title: "先积累真实分发数据", text: "当前没有足够的卡片行为，暂不对内容质量和推荐方向下结论。" }];
  }
  const items: Array<{ title: string; text: string }> = [];
  if (rates.start < 0.35) {
    items.push({ title: "开局阻力偏高", text: `展示到开始为 ${percent(rates.start)}，先检查推荐场景、卡片标题和第一步规则是否足够直接。` });
  }
  if (rates.completion < 0.45) {
    items.push({ title: "开始后的完成偏低", text: `开始到完成为 ${percent(rates.completion)}，优先回到卡片分析判断是具体题面还是玩法骨架造成流失。` });
  }
  if (rates.reroll >= 0.3) {
    items.push({ title: "换卡信号明显", text: `主动换卡占展示 ${percent(rates.reroll)}，先检查场景匹配和内容供给，不把一次跳过当成永久不喜欢。` });
  }
  if (!items.length) {
    items.push({ title: "整体分发稳定", text: `当前开始率 ${percent(rates.start)}、完成率 ${percent(rates.completion)}，可以在受控范围内扩大新内容探索。` });
  }
  return items;
});

function changeWindow(event: Event) {
  emit("update:window", (event.target as HTMLSelectElement).value as ContentAnalytics["window"]);
}
</script>

<template>
  <section class="studio-distribution studio-distribution-overview">
    <header class="studio-analytics-heading">
      <div>
        <span class="studio-eyebrow">DISTRIBUTION OVERVIEW</span>
        <h2>项目分发总览</h2>
        <p>只看内容池和整体分发是否健康；具体卡片判断进入「卡片分析」。</p>
      </div>
      <label class="studio-analytics-window">统计窗口<select :value="props.window" @change="changeWindow"><option value="all">全部运行数据</option><option value="7d">近 7 天</option><option value="30d">近 30 天</option></select></label>
    </header>

    <div class="studio-analytics-kpis studio-analytics-content-kpis">
      <div><span>玩法骨架 L1</span><strong>{{ props.counts.l1 }}</strong><small>可继续研发</small></div>
      <div><span>用户卡 L2</span><strong>{{ props.counts.l2 }}</strong><small>当前内容实例</small></div>
      <div><span>已发布玩法</span><strong>{{ props.counts.published }}</strong><small>进入分发池</small></div>
      <div class="studio-analytics-kpi-accent"><span>待人工判断</span><strong>{{ props.counts.pendingReview }}</strong><small>审核或内容处理</small></div>
    </div>

    <div v-if="!props.analytics" class="studio-analytics-empty"><Activity :size="24" /><strong>暂时没有整体分析数据</strong><span>等有卡片真实展示后，这里会出现分发漏斗和决策信号。</span></div>
    <template v-else>
      <div class="studio-analytics-kpis studio-analytics-distribution-kpis">
        <div><span>卡片展示</span><strong>{{ props.analytics.funnel.exposures }}</strong><small>当前窗口</small></div>
        <div><span>开始率</span><strong>{{ percent(distributionRates.start) }}</strong><small>{{ props.analytics.funnel.starts }} 次开始</small></div>
        <div><span>完成率</span><strong>{{ percent(distributionRates.completion) }}</strong><small>{{ props.analytics.funnel.completes }} 次完成</small></div>
        <div><span>主动换卡</span><strong>{{ percent(distributionRates.reroll) }}</strong><small>{{ props.analytics.funnel.rerolls }} 次换卡</small></div>
        <div><span>中途退出</span><strong>{{ percent(distributionRates.abandon) }}</strong><small>{{ props.analytics.funnel.abandons }} 次退出</small></div>
      </div>

      <div class="studio-analytics-grid studio-analytics-grid-top">
        <section class="studio-panel studio-analytics-panel">
          <div class="studio-panel-heading"><div><span class="studio-eyebrow">DISTRIBUTION FUNNEL</span><h3>从展示到结果</h3></div><Target :size="17" /></div>
          <div class="studio-funnel-list"><div v-for="item in funnel" :key="item.key"><div><strong>{{ item.label }}</strong><span>{{ item.value }} <em v-if="item.key !== 'exposures'">· {{ percent(item.rate) }}</em></span></div><i><b :style="{ width: barWidth(item.value, props.analytics.funnel.exposures) }" /></i></div></div>
        </section>
        <section class="studio-panel studio-analytics-panel studio-analytics-signal-panel">
          <div class="studio-panel-heading"><div><span class="studio-eyebrow">NEXT DECISION</span><h3>整体下一步</h3></div><ArrowUpRight :size="17" /></div>
          <div class="studio-insight-list"><div v-for="signal in signals" :key="signal.title"><ArrowUpRight :size="15" /><span><strong>{{ signal.title }}</strong><small>{{ signal.text }}</small></span></div></div>
        </section>
      </div>

      <section class="studio-panel studio-scene-overview">
        <div class="studio-panel-heading"><div><span class="studio-eyebrow">SCENE FIT</span><h3>场景适配</h3></div><span class="studio-muted">用于调整推荐场景，不代表用户画像</span></div>
        <div v-if="sceneRows.length" class="studio-scene-table-wrap"><table class="studio-scene-table"><thead><tr><th>场景</th><th>展示</th><th>开始率</th><th>完成率</th><th>换卡率</th><th>下一步</th></tr></thead><tbody><tr v-for="scene in sceneRows" :key="scene.key"><td><strong>{{ scene.label }}</strong></td><td>{{ scene.exposures }}</td><td>{{ percent(scene.startRate) }}</td><td>{{ percent(scene.completionRate) }}</td><td :class="{ 'studio-analytics-risk': scene.skipRate >= .3 }">{{ percent(scene.skipRate) }}</td><td><span class="studio-scene-signal">{{ sceneSignal(scene) }}</span></td></tr></tbody></table></div>
        <p v-else class="studio-analytics-panel-empty">当前窗口还没有足够的场景行为数据。</p>
      </section>

      <section class="studio-panel studio-analytics-method-panel">
        <div class="studio-panel-heading"><div><span class="studio-eyebrow">READING RULES</span><h3>这页如何使用</h3></div></div>
        <div class="studio-analytics-method-grid"><p><strong>总览只做判断入口</strong><span>发现整体异常后，去卡片分析定位具体 L2 或 L1，不在这里展开单卡热榜。</span></p><p><strong>推荐不追求单一热度</strong><span>开始、完成、换卡和退出要一起看；高完成率不能单独证明内容质量。</span></p><p><strong>工具不作为分析维度</strong><span>工具是运行辅助，只有在具体卡片出现体验异常时才回到实验室排查。</span></p></div>
      </section>
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
.studio-analytics-kpis { display: grid; border: 1px solid #e8edf3; border-radius: 7px; background: #fff; }
.studio-analytics-kpis > div { min-height: 94px; border-right: 1px solid #edf1f5; padding: 16px 18px; }.studio-analytics-kpis > div:last-child { border-right: 0; }.studio-analytics-kpis span, .studio-analytics-kpis small { display: block; color: #8998ab; font-size: 10px; }.studio-analytics-kpis strong { display: block; margin: 8px 0 3px; color: #233d5d; font-family: var(--pb-font-numeric); font-size: 27px; font-weight: 500; }.studio-analytics-kpi-accent { background: #f5faff; }.studio-analytics-kpi-accent strong { color: #2876c3; }
.studio-analytics-content-kpis { grid-template-columns: repeat(4, minmax(0, 1fr)); margin-bottom: 16px; }.studio-analytics-distribution-kpis { grid-template-columns: repeat(5, minmax(0, 1fr)); }
.studio-analytics-grid { display: grid; gap: 16px; }.studio-analytics-grid-top { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); margin-top: 16px; }.studio-analytics-panel { min-width: 0; }
.studio-funnel-list { display: grid; gap: 15px; margin-top: 22px; }.studio-funnel-list > div > div { display: flex; justify-content: space-between; color: #7e8da1; font-size: 11px; }.studio-funnel-list strong { color: #435b76; font-weight: 600; }.studio-funnel-list em { color: #6aa178; font-style: normal; }.studio-funnel-list i { display: block; height: 6px; margin-top: 7px; border-radius: 4px; background: #e9eef5; overflow: hidden; }.studio-funnel-list b { display: block; height: 100%; border-radius: inherit; background: #72a6d9; }
.studio-insight-list { display: grid; gap: 12px; margin-top: 16px; }.studio-insight-list > div { display: flex; gap: 9px; border-top: 1px solid #f0e9df; padding-top: 12px; color: #c48748; }.studio-insight-list > div:first-child { border-top: 0; padding-top: 0; }.studio-insight-list span { min-width: 0; }.studio-insight-list strong, .studio-insight-list small { display: block; }.studio-insight-list strong { color: #765f48; font-size: 11px; }.studio-insight-list small { margin-top: 4px; color: #928475; font-size: 10px; line-height: 1.55; }
.studio-scene-overview { margin-top: 16px; }.studio-scene-table-wrap { margin-top: 16px; overflow-x: auto; }.studio-scene-table { width: 100%; border-collapse: collapse; text-align: left; }.studio-scene-table th, .studio-scene-table td { border-top: 1px solid #edf1f5; padding: 11px 10px; color: #718196; font-size: 11px; white-space: nowrap; }.studio-scene-table th { color: #9aa7b8; font-size: 10px; font-weight: 600; }.studio-scene-table th:first-child, .studio-scene-table td:first-child { padding-left: 0; }.studio-scene-table th:last-child, .studio-scene-table td:last-child { padding-right: 0; }.studio-scene-table strong { color: #435b76; font-weight: 600; }.studio-scene-signal { color: #6b8b75; }.studio-scene-table .studio-analytics-risk { color: #c5725d; font-weight: 600; }
.studio-analytics-method-panel { margin-top: 16px; background: linear-gradient(145deg, #fff, #f8fbff); }.studio-analytics-method-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; margin-top: 16px; }.studio-analytics-method-grid p { display: grid; gap: 6px; border-top: 1px solid #e9eff5; padding-top: 12px; margin: 0; }.studio-analytics-method-grid strong { color: #435b76; font-size: 11px; }.studio-analytics-method-grid span { color: #8593a5; font-size: 10px; line-height: 1.55; }
@media (max-width: 980px) { .studio-analytics-content-kpis, .studio-analytics-distribution-kpis { grid-template-columns: repeat(3, 1fr); }.studio-analytics-kpis > div:nth-child(3) { border-right: 0; }.studio-analytics-kpis > div:nth-child(n + 4) { border-top: 1px solid #edf1f5; }.studio-analytics-grid-top, .studio-analytics-method-grid { grid-template-columns: 1fr; } }
@media (max-width: 680px) { .studio-analytics-heading { align-items: stretch; flex-direction: column; gap: 14px; }.studio-analytics-window { min-width: 0; }.studio-analytics-content-kpis, .studio-analytics-distribution-kpis { grid-template-columns: repeat(2, 1fr); }.studio-analytics-kpis > div, .studio-analytics-kpis > div:nth-child(3) { border-right: 0; }.studio-analytics-kpis > div:nth-child(even) { border-left: 1px solid #edf1f5; }.studio-analytics-kpis > div:nth-child(n + 3) { border-top: 1px solid #edf1f5; } }
</style>
