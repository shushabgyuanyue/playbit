<script setup lang="ts">
import { copy } from "@playbit/content";
import { Archive, BadgeCheck, Clock3 } from "lucide-vue-next";
import { computed } from "vue";
import type { VoucherItem, VoucherSection } from "../types/voucher";
import VoucherCard from "./VoucherCard.vue";

const props = defineProps<{
  section: VoucherSection;
  visibleCount: number;
}>();

const emit = defineEmits<{
  openAgreement: [voucher: VoucherItem];
  openDetail: [voucher: VoucherItem];
  openRules: [voucher: VoucherItem];
  redeem: [voucher: VoucherItem];
  showMore: [];
}>();

const statusIcons = {
  pending: Clock3,
  available: BadgeCheck,
  used: Archive
};

const visibleItems = computed(() => props.section.items.slice(0, props.visibleCount));
const remainingCount = computed(() => Math.max(0, props.section.items.length - props.visibleCount));
const hasMore = computed(() => remainingCount.value > 0);
const expandLabel = computed(
  () => `${copy.vouchers.expand}(${remainingCount.value}${copy.vouchers.itemUnit})`
);
</script>

<template>
  <section class="voucher-section" :class="`status-${props.section.status}`">
    <header class="voucher-section-header">
      <span class="voucher-section-icon">
        <component :is="statusIcons[props.section.status]" :size="14" />
      </span>
      <strong>{{ props.section.title }}</strong>
      <span>{{ props.section.count }}</span>
    </header>

    <div class="voucher-section-stack">
      <VoucherCard
        v-for="voucher in visibleItems"
        :key="voucher.id"
        :voucher="voucher"
        @open-agreement="emit('openAgreement', voucher)"
        @open-detail="emit('openDetail', voucher)"
        @open-rules="emit('openRules', voucher)"
        @redeem="emit('redeem', voucher)"
      />
    </div>

    <button v-if="hasMore" type="button" class="voucher-section-more" @click="emit('showMore')">
      {{ expandLabel }}
    </button>
  </section>
</template>
