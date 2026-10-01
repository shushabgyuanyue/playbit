<script setup lang="ts">
import { X } from "lucide-vue-next";
import { reactive } from "vue";

export type CreateCardForm = {
  code: string;
  name: string;
  createL2: boolean;
  title: string;
  hook: string;
  rule: string;
  content: string;
  completionCondition: string;
  contentType: "prompt" | "truth" | "sequence" | "environment";
  mode: "together" | "versus";
  category: "challenge" | "rule" | "hidden";
  tone: "coral" | "blue" | "gold";
  minPlayers: number;
  maxPlayers: number;
  durationMinutes: number;
  l0Ids: string[];
  scenes: string;
  toolIds: string[];
  research: {
    sourceType: string;
    sourceRegion: string;
    sourceWork: string;
    sourceUrl: string;
    propsRequirement: string;
    movementLevel: string;
    l2Mode: string;
    l2Source: string;
    externalAiRequired: boolean;
    externalAiRole: string;
    informationStructure: string;
    controlStructure: string;
    editorialPriority: string;
    editorialNote: string;
  };
};

const props = defineProps<{
  visible: boolean;
  busy: boolean;
  l0s: Array<{ id: string; code: string; name: string }>;
  tools: Array<{ id: string; code: string; name: string }>;
}>();

const emit = defineEmits<{
  close: [];
  submit: [form: CreateCardForm];
}>();

const form = reactive<CreateCardForm>({
  code: "",
  name: "",
  createL2: true,
  title: "",
  hook: "",
  rule: "",
  content: "",
  completionCondition: "",
  contentType: "prompt",
  mode: "together",
  category: "challenge",
  tone: "blue",
  minPlayers: 2,
  maxPlayers: 2,
  durationMinutes: 5,
  l0Ids: ["l0-association"],
  scenes: "双人对局, 碎片时间",
  toolIds: ["timer"],
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

function submit() {
  if (!form.code.trim() || !form.name.trim() || !form.hook.trim() || !form.rule.trim() || !form.completionCondition.trim()) return;
  if (form.createL2 && (!form.title.trim() || !form.content.trim())) return;
  emit("submit", { ...form, l0Ids: [...form.l0Ids], toolIds: [...form.toolIds] });
}
</script>

<template>
  <div v-if="props.visible" class="studio-create-sheet-backdrop" @click.self="emit('close')">
    <section class="studio-create-sheet" role="dialog" aria-modal="true" aria-labelledby="create-card-title">
      <header class="studio-create-sheet-header"><div><span class="studio-eyebrow">NEW PLAYABLE CARD</span><h2 id="create-card-title">在实验室创建一张卡</h2><p>先定义玩法骨架，再决定是否挂一条具体内容。用户只会看到最终卡面。</p></div><button type="button" class="studio-icon-button" title="关闭" @click="emit('close')"><X :size="18" /></button></header>
      <form class="studio-create-sheet-form" @submit.prevent="submit">
        <div class="studio-create-group"><span class="studio-create-group-title">L1 玩法骨架与规则</span><div class="studio-create-grid"><label>玩法编码<input v-model="form.code" required placeholder="例如 word_chain" /></label><label>玩法名称<input v-model="form.name" required placeholder="例如 反向接话" /></label><label>适用人数<input v-model.number="form.minPlayers" min="1" type="number" /><small>最低人数</small></label><label>人数上限<input v-model.number="form.maxPlayers" min="1" type="number" /><small>多人可填 8</small></label><label>预计分钟<input v-model.number="form.durationMinutes" min="1" type="number" /></label><label>场景<input v-model="form.scenes" placeholder="双人对局, 碎片时间" /><small>用逗号分隔</small></label><label class="studio-create-wide">卡面 Hook<input v-model="form.hook" required placeholder="一句让人马上想开始的话" /></label><label class="studio-create-wide">主持人规则<textarea v-model="form.rule" required rows="3" placeholder="玩法如何开始、进行和推进" /></label><label class="studio-create-wide">结束条件<textarea v-model="form.completionCondition" required rows="2" placeholder="何时算完成或分出结果" /></label></div></div>
        <div class="studio-create-group"><span class="studio-create-group-title">核心机制 L0，可多选</span><div class="studio-check-grid"><label v-for="mechanism in props.l0s" :key="mechanism.id"><input v-model="form.l0Ids" type="checkbox" :value="mechanism.id" />{{ mechanism.code }} · {{ mechanism.name }}</label></div></div>
        <div class="studio-create-group"><span class="studio-create-group-title">关联管理工具</span><div class="studio-check-grid"><label v-for="tool in props.tools" :key="tool.id"><input v-model="form.toolIds" type="checkbox" :value="tool.code" />{{ tool.name }}</label></div></div>
        <div class="studio-create-group studio-create-optional"><span class="studio-create-group-title">研发元数据（可选）</span><p class="studio-create-help">用于内容运营、来源追踪和后续推荐分析，不会展示在用户卡面。</p><div class="studio-create-grid"><label>来源生态<input v-model="form.research.sourceType" placeholder="例如 民间游戏 / 综艺 / 桌游" /></label><label>来源地区<input v-model="form.research.sourceRegion" placeholder="例如 中国 / 日本 / 英语世界" /></label><label>来源作品<input v-model="form.research.sourceWork" placeholder="节目、作品或链接标题" /></label><label>来源 URL<input v-model="form.research.sourceUrl" placeholder="可留空" /></label><label>道具要求<select v-model="form.research.propsRequirement"><option value="NONE">无需道具</option><option value="COMMON_OBJECT">常见物品</option><option value="SPECIAL_PROP">特殊道具</option></select></label><label>动作强度<select v-model="form.research.movementLevel"><option value="LOW">低</option><option value="MEDIUM">中</option><option value="HIGH">高</option></select></label><label>L2 模式<select v-model="form.research.l2Mode"><option value="NONE">不需要 L2</option><option value="OPTIONAL">可选 L2</option><option value="REQUIRED">必须有 L2</option></select></label><label>L2 来源<select v-model="form.research.l2Source"><option value="SYSTEM">系统题库</option><option value="HUMAN">玩家/主持人</option><option value="ENVIRONMENT">现实环境</option><option value="EXTERNAL_AI">外部 AI</option><option value="HYBRID">混合</option></select></label><label>信息结构<input v-model="form.research.informationStructure" placeholder="公开, 逐步揭示" /></label><label>控制结构<input v-model="form.research.controlStructure" placeholder="轮流, 一方主持" /></label><div class="studio-create-field"><span>外部 AI 参与</span><label class="studio-create-inline-check"><input v-model="form.research.externalAiRequired" type="checkbox" />需要</label></div><label v-if="form.research.externalAiRequired">AI 角色<input v-model="form.research.externalAiRole" placeholder="猜测者 / 裁判 / 主持" /></label><label>编辑优先级<select v-model="form.research.editorialPriority"><option value="">未设置</option><option value="EXTREME">极高</option><option value="HIGH">高</option><option value="MEDIUM">中</option><option value="LOW">低</option></select></label><label class="studio-create-wide">编辑备注<textarea v-model="form.research.editorialNote" rows="2" placeholder="保留主观判断、试玩假设或合并线索" /></label></div></div>
        <div class="studio-create-group studio-create-optional"><div class="studio-create-group-heading"><span class="studio-create-group-title">L2 用户卡内容</span><label class="studio-create-toggle"><input v-model="form.createL2" type="checkbox" />同时创建第一张用户卡</label></div><p class="studio-create-help">没有具体题面时只保存 L1 玩法骨架，之后再补充 L2，不需要先填占位内容。</p><div v-if="form.createL2" class="studio-create-grid"><label>用户卡标题<input v-model="form.title" :required="form.createL2" placeholder="用户会看到的标题" /></label><label>内容类型<select v-model="form.contentType"><option value="prompt">提示题</option><option value="truth">真相题</option><option value="sequence">顺序题</option><option value="environment">现场生成</option></select></label><label>玩法模式<select v-model="form.mode"><option value="together">一起完成</option><option value="versus">双方对决</option></select></label><label>内容分类<select v-model="form.category"><option value="challenge">挑战</option><option value="rule">规则</option><option value="hidden">隐藏信息</option></select></label><label>卡面色调<select v-model="form.tone"><option value="coral">暖红</option><option value="blue">淡蓝</option><option value="gold">淡黄</option></select></label><label class="studio-create-wide">具体题面 / 内容<textarea v-model="form.content" :required="form.createL2" rows="3" placeholder="这一张用户卡具体要玩的内容" /></label></div></div>
        <footer class="studio-create-sheet-footer"><span>{{ form.createL2 ? "创建玩法和第一张用户卡，之后可分别审核。" : "只保存 L1 玩法骨架，暂不创建用户卡内容。" }}</span><div><button type="button" class="studio-button studio-button-light" @click="emit('close')">取消</button><button type="submit" class="studio-button studio-button-primary" :disabled="props.busy">{{ form.createL2 ? "创建草稿" : "保存玩法骨架" }}</button></div></footer>
      </form>
    </section>
  </div>
</template>
