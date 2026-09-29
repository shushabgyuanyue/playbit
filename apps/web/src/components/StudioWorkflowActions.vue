<script setup lang="ts">
import { Check, FileCheck2, Send, X } from "lucide-vue-next";

const props = defineProps<{
  visible: boolean;
  name: string;
  status: string;
  l2Status: string;
  busy: boolean;
  message: string;
}>();

const emit = defineEmits<{
  submit: [];
  approve: [];
  requestChanges: [];
  publish: [];
  create: [];
  submitL2: [];
  approveL2: [];
  requestL2Changes: [];
  publishL2: [];
}>();

const labels: Record<string, string> = {
  draft: "草稿",
  changes_requested: "待修改",
  pending_review: "待人工审核",
  approved: "已通过",
  published: "已发布",
  paused: "已暂停",
  retired: "已淘汰"
};
</script>

<template>
  <section v-if="props.visible" class="studio-workflow-actions" aria-live="polite">
    <div class="studio-workflow-context">
      <span>当前版本</span>
      <strong>{{ props.name || "未选择内容" }}</strong>
      <small>{{ labels[props.status] ?? props.status }}</small>
    </div>
    <p v-if="props.message" class="studio-workflow-message">{{ props.message }}</p>
    <div class="studio-workflow-buttons">
      <button v-if="['draft', 'changes_requested'].includes(props.status)" type="button" class="studio-button studio-button-primary" :disabled="props.busy" @click="emit('submit')">
        <Send :size="15" />提交人工审核
      </button>
      <template v-else-if="props.status === 'pending_review'">
        <button type="button" class="studio-button studio-button-light" :disabled="props.busy" @click="emit('requestChanges')"><X :size="15" />退回修改</button>
        <button type="button" class="studio-button studio-button-primary" :disabled="props.busy" @click="emit('approve')"><Check :size="15" />审核通过</button>
      </template>
      <button v-else-if="props.status === 'approved'" type="button" class="studio-button studio-button-primary" :disabled="props.busy" @click="emit('publish')">
        <FileCheck2 :size="15" />发布版本
      </button>
      <button v-else-if="props.status === 'published'" type="button" class="studio-button studio-button-light" :disabled="props.busy" @click="emit('create')">
        <FileCheck2 :size="15" />基于此版本创建草稿
      </button>
      <span v-else class="studio-workflow-note">此版本暂时不需要操作</span>
    </div>
    <div class="studio-l2-workflow">
      <small>L2 内容 · {{ labels[props.l2Status] ?? props.l2Status }}</small>
      <button v-if="['draft', 'changes_requested'].includes(props.l2Status)" type="button" class="studio-button studio-button-light" :disabled="props.busy" @click="emit('submitL2')"><Send :size="14" />提交 L2</button>
      <template v-else-if="props.l2Status === 'pending_review'">
        <button type="button" class="studio-button studio-button-light" :disabled="props.busy" @click="emit('requestL2Changes')"><X :size="14" />退回 L2</button>
        <button type="button" class="studio-button studio-button-primary" :disabled="props.busy" @click="emit('approveL2')"><Check :size="14" />通过 L2</button>
      </template>
      <button v-else-if="props.l2Status === 'approved'" type="button" class="studio-button studio-button-primary" :disabled="props.busy" @click="emit('publishL2')"><FileCheck2 :size="14" />发布 L2</button>
    </div>
  </section>
</template>

<style scoped>
.studio-workflow-actions { position: fixed; right: 0; bottom: 0; left: 236px; z-index: 5; display: flex; min-height: 66px; align-items: center; justify-content: space-between; gap: 18px; border-top: 1px solid #e4eaf1; background: rgba(255, 255, 255, .96); box-shadow: 0 -8px 24px rgba(30, 54, 84, .06); padding: 10px 28px; backdrop-filter: blur(12px); }
.studio-workflow-context { display: flex; min-width: 0; align-items: baseline; gap: 9px; color: #96a4b5; font-size: 11px; }
.studio-workflow-context strong { max-width: 280px; overflow: hidden; color: #344b68; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; }
.studio-workflow-context small { color: #4d8d70; }
.studio-workflow-message { margin: 0 auto 0 0; color: #c57c62; font-size: 11px; }
.studio-workflow-buttons { display: flex; align-items: center; gap: 8px; }
.studio-workflow-buttons button { min-height: 34px; }
.studio-workflow-note { color: #9aa7b8; font-size: 11px; }
.studio-l2-workflow { display: flex; align-items: center; gap: 7px; border-left: 1px solid #e4eaf1; padding-left: 16px; }
.studio-l2-workflow small { color: #8292a6; white-space: nowrap; }
@media (max-width: 980px) { .studio-workflow-actions { left: 190px; padding: 10px 20px; } }
@media (max-width: 680px) { .studio-workflow-actions { left: 0; flex-wrap: wrap; gap: 8px; } .studio-workflow-buttons { margin-left: auto; } }
</style>
