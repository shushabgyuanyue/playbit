<script setup lang="ts">
import { computed } from "vue";
import { copy } from "@playbit/content";
import type { VoucherUiStatus } from "../../types/voucher";
import { formatVoucherBenefit, inferVoucherKind } from "../../utils/voucherDisplay";
import VoucherTicket from "./VoucherTicket.vue";
const props = defineProps<{ label: string; custom?: boolean; status?: VoucherUiStatus; interactive?: boolean }>();
const emit = defineEmits<{ click: [] }>();
const isCustom = computed(() => props.custom || !copy.stakes.presets.some(p => p.type === "coupon" && p.label === props.label));
const benefit = computed(() => isCustom.value ? { title: copy.stakes.customTicket, subtitle: copy.stakes.assetHint } : formatVoucherBenefit(props.label));
</script>
<template>
  <VoucherTicket :kind="isCustom ? 'custom' : inferVoucherKind(label)" :status="status ?? 'pending'" size="mini" watermark="panda"
    :interactive="interactive" :aria-label="label" @click="emit('click')">
    <template #value><strong>{{ benefit.title }}</strong><span>{{ benefit.subtitle }}</span></template>
    <div class="mini-equity-copy"><strong :title="label">{{ label }}</strong></div>
  </VoucherTicket>
</template>
<style scoped>
.mini-equity-copy { min-width: 0; text-align: left; }
.mini-equity-copy strong { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; overflow-wrap: anywhere; color: var(--pb-text-1); font-size: var(--pb-font-sm); font-weight: 600; line-height: 1.45; }
</style>
