<script setup lang="ts">
import { copy } from "@playbit/content";
import { Eye } from "lucide-vue-next";
import { ref } from "vue";
import BaseButton from "./BaseButton.vue";

defineProps<{ answer: string; disabled?: boolean }>();

const visible = ref(false);
</script>

<template>
  <div class="card-reveal">
    <BaseButton variant="outline" :disabled="disabled" :aria-expanded="visible" @click="visible = !visible">
      <Eye :size="16" aria-hidden="true" />
      {{ copy.draw.reveal }}
    </BaseButton>
    <van-popup v-model:show="visible" position="bottom" round teleport="body" class="life-sheet-popup">
      <section class="card-reveal-sheet" role="region" :aria-label="copy.draw.reveal">
        <h2>{{ copy.draw.reveal }}</h2>
        <p>{{ answer }}</p>
        <BaseButton variant="outline" @click="visible = false">{{ copy.draw.hideReveal }}</BaseButton>
      </section>
    </van-popup>
  </div>
</template>

<style scoped>
.card-reveal {
  margin-top: 16px;
}

.card-reveal-sheet { padding: 24px 20px calc(20px + env(safe-area-inset-bottom)); max-height: 75dvh; overflow-y: auto; }
.card-reveal-sheet h2 { margin: 0; font-size: var(--pb-font-lg); color: var(--pb-text-1); }
.card-reveal-sheet p { margin: 18px 0 24px; color: var(--pb-text-1); font-size: var(--pb-font-md); line-height: 1.85; }
</style>
