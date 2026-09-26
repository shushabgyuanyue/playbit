<script setup lang="ts">
import { copy } from "@playbit/content";
import { ChevronLeft, House } from "lucide-vue-next";
import { computed, inject, type ComputedRef } from "vue";

const authenticated = inject<ComputedRef<boolean>>(
  "playbit-authenticated",
  computed(() => false)
);

defineProps<{
  eyebrow?: string;
  title: string;
  showBack?: boolean;
  backLabel?: string;
  showHome?: boolean;
  homeLabel?: string;
  variant?: "page" | "home";
}>();

const emit = defineEmits<{
  back: [];
  home: [];
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
        <div class="life-service-title-row">
          <h1>{{ title }}</h1>
          <span
            class="life-auth-status-dot"
            :class="{ active: authenticated }"
            :title="authenticated ? copy.auth.statusSignedIn : copy.auth.statusGuest"
            :aria-label="authenticated ? copy.auth.statusSignedIn : copy.auth.statusGuest"
          />
        </div>
      </div>

      <div class="life-service-actions">
        <slot name="action" />
        <button
          v-if="showHome"
          type="button"
          class="life-service-action"
          :aria-label="homeLabel"
          @click="emit('home')"
        >
          <House :size="18" :stroke-width="2.2" aria-hidden="true" />
        </button>
      </div>
    </div>
    <div v-if="$slots.default" class="life-service-hero-extra"><slot /></div>
  </header>
</template>
