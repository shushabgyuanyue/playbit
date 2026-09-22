<script setup lang="ts">
import { ChevronLeft } from "lucide-vue-next";

defineProps<{
  eyebrow: string;
  title: string;
  identity?: string;
  showBack?: boolean;
  backLabel?: string;
}>();

const emit = defineEmits<{
  back: [];
  identityClick: [];
}>();
</script>

<template>
  <section class="life-service-hero">
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
      <span v-else />

      <slot name="action" />
    </div>
    <div>
      <p>{{ eyebrow }}</p>
      <h1>{{ title }}</h1>
    </div>
    <button
      v-if="identity"
      type="button"
      class="life-hero-identity"
      @click="emit('identityClick')"
    >
      {{ identity }}
    </button>
  </section>
</template>
