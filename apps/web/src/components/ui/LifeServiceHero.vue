<script setup lang="ts">
import { ChevronLeft } from "lucide-vue-next";

defineProps<{
  eyebrow?: string;
  title: string;
  showBack?: boolean;
  backLabel?: string;
  variant?: "page" | "home";
}>();

const emit = defineEmits<{
  back: [];
}>();
</script>

<template>
  <header class="life-service-hero" :class="`life-service-hero-${variant ?? 'page'}`">
    <div class="life-service-topline">
      <button
        v-if="showBack"
        type="button"
        class="life-service-back"
        :aria-label="backLabel"
        @click="emit('back')"
      >
        <ChevronLeft :size="24" :stroke-width="2" />
      </button>
      <div v-else class="life-service-back-spacer" />

      <div class="life-service-heading">
        <p v-if="variant === 'home' && eyebrow">{{ eyebrow }}</p>
        <h1>{{ title }}</h1>
      </div>

      <div class="life-service-actions"><slot name="action" /></div>
    </div>
    <div v-if="$slots.default" class="life-service-hero-extra"><slot /></div>
  </header>
</template>
