<script setup lang="ts">
import { LoaderCircle } from "lucide-vue-next";
import { computed } from "vue";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type ButtonSize = "md" | "lg" | "sm";

const props = defineProps<{
  type?: "button" | "submit";
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  class?: string;
}>();

const classes = computed(() => [
  "life-button",
  `life-button-${props.variant ?? "primary"}`,
  `life-button-${props.size ?? "md"}`,
  props.class
]);
</script>

<template>
  <button :type="props.type ?? 'button'" :class="classes" :disabled="disabled || loading" :aria-busy="loading">
    <LoaderCircle v-if="loading" class="life-button-spinner" :size="16" aria-hidden="true" />
    <slot />
  </button>
</template>
