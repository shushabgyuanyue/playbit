<script setup lang="ts">
import { copy } from "@playbit/content";
import type { Agreement } from "@playbit/shared";
import { computed } from "vue";

const props = defineProps<{
  agreement: Agreement;
}>();

const steps = computed(() => [
  { key: "signing", label: copy.contract.progress.signing },
  { key: "running", label: copy.contract.progress.running },
  { key: "closing", label: copy.contract.progress.closing },
  { key: "archived", label: copy.contract.progress.archived }
]);

const activeIndex = computed(() => {
  if (props.agreement.status === "pending_signature") {
    return 0;
  }
  if (props.agreement.status === "active") {
    return 1;
  }
  if (props.agreement.status === "result_recorded") {
    return 2;
  }
  return 3;
});
const progressText = computed(() => `${String(activeIndex.value + 1).padStart(2, "0")} / 04`);
</script>

<template>
  <section class="agreement-progress">
    <header class="agreement-progress-header">
      <span>{{ copy.contract.progressTitle }}</span>
      <strong>{{ progressText }}</strong>
    </header>
    <ol class="agreement-progress-steps">
      <li
        v-for="(step, index) in steps"
        :key="step.key"
        :class="{
          active: index === activeIndex,
          complete: index < activeIndex
        }"
      >
        <span class="agreement-progress-dot" aria-hidden="true"></span>
        <span>{{ step.label }}</span>
      </li>
    </ol>
  </section>
</template>
