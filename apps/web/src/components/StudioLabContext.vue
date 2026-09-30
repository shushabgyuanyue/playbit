<script setup lang="ts">
const props = defineProps<{
  visible: boolean;
  code: string;
  name: string;
  l0Ids: string[];
  l0s: Array<{ id: string; code: string; name: string }>;
  scenes: string[];
  tools: string[];
  toolDefinitions: Array<{ id: string; code: string; name: string }>;
  l2Title: string;
  hasL2: boolean;
}>();

function l0Label(id: string) {
  const mechanism = props.l0s.find((item) => item.id === id);
  return mechanism ? `${mechanism.code} · ${mechanism.name}` : id;
}

function toolLabel(code: string) {
  return props.toolDefinitions.find((item) => item.code === code || item.id === code)?.name ?? code;
}
</script>

<template>
  <section v-if="props.visible" class="studio-lab-context" :class="{ 'is-without-l2': !props.hasL2 }" aria-label="研发关系">
    <div class="studio-lab-context-level">
      <span>L0 · 核心机制</span>
      <strong>{{ props.l0Ids.length ? props.l0Ids.map(l0Label).join(" + ") : "未关联" }}</strong>
    </div>
    <div class="studio-lab-context-level is-primary">
      <span>L1 · 玩法骨架</span>
      <strong>{{ props.code }} · {{ props.name }}</strong>
      <small v-if="props.scenes.length">{{ props.scenes.join(" · ") }}</small>
    </div>
    <div v-if="props.hasL2" class="studio-lab-context-level">
      <span>L2 · 具体内容</span>
      <strong>{{ props.hasL2 ? props.l2Title : "未创建内容包" }}</strong>
      <small>{{ props.hasL2 ? "用户卡内容可单独审核和复用" : "先审玩法规则，之后再补充具体题面" }}</small>
    </div>
    <div v-else class="studio-lab-context-note">
      当前只维护 L1 玩法骨架，后续按需补充用户卡内容
    </div>
    <div class="studio-lab-context-tools" v-if="props.tools.length">
      <span>关联工具</span>
      <b v-for="tool in props.tools" :key="tool">{{ toolLabel(tool) }}</b>
    </div>
  </section>
</template>

<style scoped>
.studio-lab-context { display: grid; grid-template-columns: minmax(0, .85fr) minmax(0, 1.2fr) minmax(0, 1fr); gap: 1px; margin-bottom: 18px; border: 1px solid #e6ebf2; border-radius: 7px; background: #e6ebf2; overflow: hidden; }
.studio-lab-context.is-without-l2 { grid-template-columns: minmax(0, .85fr) minmax(0, 1.2fr); }
.studio-lab-context-level { min-height: 82px; background: #fff; padding: 14px 16px; }
.studio-lab-context-level.is-primary { background: #f7fbff; }
.studio-lab-context-level span, .studio-lab-context-level small { display: block; color: #92a0b0; font-size: 10px; }
.studio-lab-context-level strong { display: block; margin-top: 9px; color: #344b68; font-size: 12px; font-weight: 600; }
.studio-lab-context-level small { margin-top: 6px; color: #6783a0; line-height: 1.4; }
.studio-lab-context-note { display: flex; min-height: 82px; align-items: center; background: #fff; padding: 14px 16px; color: #92a0b0; font-size: 11px; line-height: 1.5; }
.studio-lab-context-tools { grid-column: 1 / -1; display: flex; align-items: center; flex-wrap: wrap; gap: 7px; background: #fff; border-top: 1px solid #edf1f5; padding: 10px 16px; color: #92a0b0; font-size: 10px; }
.studio-lab-context-tools b { border-radius: 3px; background: #edf4ff; color: #3874b1; padding: 4px 7px; font-size: 10px; font-weight: 500; }
@media (max-width: 680px) { .studio-lab-context, .studio-lab-context.is-without-l2 { grid-template-columns: 1fr; }.studio-lab-context-tools { grid-column: auto; } }
</style>
