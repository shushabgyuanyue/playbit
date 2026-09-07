<script setup lang="ts">
defineProps<{
  tone?: "teal" | "gold" | "red" | "ink";
}>();
</script>

<template>
  <span
    :class="[
      'inline-flex min-h-6 items-center rounded-full px-2 text-xs font-bold',
      tone === 'gold' && 'bg-accent text-accent-foreground',
      tone === 'red' && 'bg-primary/10 text-primary',
      tone === 'ink' && 'bg-foreground text-primary-foreground',
      (!tone || tone === 'teal') && 'bg-secondary/10 text-secondary'
    ]"
  >
    <slot />
  </span>
</template>

