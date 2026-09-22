<script setup lang="ts">
defineProps<{
  tone?: "contract" | "pending" | "redeem" | "success" | "archive" | "ink";
}>();
</script>

<template>
  <span
    :class="[
      'life-badge',
      tone === 'pending' && 'tone-pending',
      tone === 'redeem' && 'tone-redeem',
      tone === 'success' && 'tone-success',
      tone === 'archive' && 'tone-archive',
      tone === 'ink' && 'tone-ink',
      (!tone || tone === 'contract') && 'tone-contract'
    ]"
  >
    <slot />
  </span>
</template>
