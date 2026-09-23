<script setup lang="ts">
import { copy } from "@playbit/content";
import type { BetSession } from "@playbit/shared";
import { computed } from "vue";

const props = defineProps<{
  session: BetSession;
}>();

const steps = computed(() => [
  { key: "signing", label: copy.contract.progress.signing },
  { key: "running", label: copy.contract.progress.running },
  { key: "closing", label: copy.contract.progress.closing },
  { key: "archived", label: copy.contract.progress.archived }
]);

const activeIndex = computed(() => {
  if (props.session.status === "pending_confirmation") {
    return 0;
  }
  if (props.session.status === "active") {
    return 1;
  }
  if (props.session.status === "settling") {
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
