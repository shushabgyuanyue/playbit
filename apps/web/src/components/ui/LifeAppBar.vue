<script setup lang="ts">
import { ChevronLeft } from "lucide-vue-next";

defineProps<{
  title: string;
  backLabel?: string;
  showBack?: boolean;
}>();

const emit = defineEmits<{
  back: [];
}>();
</script>

<template>
  <header class="life-appbar">
    <button
      v-if="showBack"
      type="button"
      class="life-back-button"
      :aria-label="backLabel"
      @click="emit('back')"
    >
      <ChevronLeft :size="24" :stroke-width="2" />
    </button>
    <span v-else class="life-appbar-spacer" />

    <h1 class="life-appbar-title">{{ title }}</h1>

    <div class="life-appbar-action">
      <slot name="action" />
    </div>
  </header>
</template>
