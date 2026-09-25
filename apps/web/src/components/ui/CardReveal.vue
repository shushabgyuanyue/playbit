<script setup lang="ts">
import { copy } from "@playbit/content";
import { Eye, EyeOff } from "lucide-vue-next";
import { ref } from "vue";
import BaseButton from "./BaseButton.vue";

defineProps<{ answer: string }>();

const visible = ref(false);
</script>

<template>
  <div class="card-reveal">
    <BaseButton variant="outline" @click="visible = !visible">
      <EyeOff v-if="visible" :size="16" aria-hidden="true" />
      <Eye v-else :size="16" aria-hidden="true" />
      {{ visible ? copy.draw.hideReveal : copy.draw.reveal }}
    </BaseButton>
    <p v-if="visible" class="card-reveal-answer">{{ answer }}</p>
  </div>
</template>

<style scoped>
.card-reveal {
  margin-top: 16px;
}

.card-reveal-answer {
  margin: 14px 0 0;
  padding: 14px 16px;
  border-left: 3px solid var(--pb-blue);
  background: var(--pb-fill-soft);
  font-size: var(--pb-font-md);
  line-height: 1.65;
  color: var(--pb-text-1);
}
</style>
