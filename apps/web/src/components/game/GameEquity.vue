<script setup lang="ts">
import { copy } from "@playbit/content";
import type { Stake } from "@playbit/shared";
import MiniEquityTicket from "../ui/MiniEquityTicket.vue";
const props = defineProps<{ stake: Stake; title?: string; couponId?: string }>();
const emit = defineEmits<{ open: [id: string] }>();
</script>
<template>
  <div class="game-equity">
    <h2 class="life-section-title">{{ title ?? copy.game.stakeTitle }}</h2>
    <MiniEquityTicket :label="stake.label" :custom="stake.type === 'custom'" :status="stake.fulfilled ? 'used' : 'available'"
      :interactive="Boolean(couponId)" @click="couponId && emit('open', couponId)" />
    <details v-if="stake.label.length > 14" class="game-equity-detail">
      <summary>{{ copy.session.equityDetails }}</summary><p>{{ stake.label }}</p>
    </details>
  </div>
</template>
<style scoped>
.game-equity { min-width: 0; display: grid; gap: 10px; }
.game-equity > :deep(.voucher-ticket) { width: min(100%, 220px); }
.game-equity-detail { font-size: var(--pb-font-xs); color: var(--pb-text-2); line-height: 1.6; }
.game-equity-detail summary { cursor: pointer; }
.game-equity-detail p { margin: 6px 0 0; overflow-wrap: anywhere; }
</style>
