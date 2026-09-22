<script setup lang="ts">
import { copy } from "@playbit/content";
import type { BetSession, Coupon } from "@playbit/shared";
import { computed, ref, watch } from "vue";
import { useVoucherAssets } from "../composables/useVoucherAssets";
import type { VoucherItem, VoucherStatusFilter, VoucherViewFilter } from "../types/voucher";
import VoucherSection from "./VoucherSection.vue";

const props = defineProps<{
  sessions: BetSession[];
  coupons: Coupon[];
}>();

const emit = defineEmits<{
  back: [];
  openSession: [sessionId: string];
  openVoucher: [voucherId: string];
}>();

const activeView = ref<VoucherViewFilter>("all");
const visibleCounts = ref<Record<VoucherStatusFilter, number>>({
  pending: 3,
  available: 3,
  used: 3
});

const { statusCounts, totalCount, voucherSections } = useVoucherAssets(
  () => props.sessions,
  () => props.coupons,
  activeView
);

const statusOptions = computed(() => [
  { key: "all" as const, label: copy.vouchers.statusTabs.all, count: totalCount.value },
  { key: "pending" as const, label: copy.vouchers.statusTabs.pending, count: statusCounts.value.pending },
  { key: "available" as const, label: copy.vouchers.statusTabs.available, count: statusCounts.value.available },
  { key: "used" as const, label: copy.vouchers.statusTabs.used, count: statusCounts.value.used }
]);

function openAgreement(voucher: VoucherItem) {
  if (voucher.sessionId) {
    emit("openSession", voucher.sessionId);
    return;
  }
  emit("openVoucher", voucher.id);
}

function selectStatus(status: VoucherViewFilter) {
  activeView.value = status;
}

function redeemVoucher(voucher: VoucherItem) {
  emit("openVoucher", voucher.id);
}

function showMore(status: VoucherStatusFilter) {
  visibleCounts.value = {
    ...visibleCounts.value,
    [status]: visibleCounts.value[status] + 3
  };
}

watch(activeView, () => {
  visibleCounts.value = {
    pending: 3,
    available: 3,
    used: 3
  };
});
</script>

<template>
  <section class="life-page voucher-page">
    <header class="life-appbar">
      <button type="button" class="life-back-button" :aria-label="copy.vouchers.aria.back" @click="emit('back')">
        <span />
      </button>

      <h1 class="life-appbar-title">{{ copy.vouchers.navTitle }}</h1>
    </header>

    <nav class="life-status-tabs" :aria-label="copy.vouchers.aria.categoryTabs">
      <button
        v-for="status in statusOptions"
        :key="status.key"
        type="button"
        :class="{ active: activeView === status.key }"
        @click="selectStatus(status.key)"
      >
        {{ status.label }}<span>{{ status.count }}</span>
      </button>
    </nav>

    <div v-if="voucherSections.length > 0" class="voucher-list-shell">
      <VoucherSection
        v-for="section in voucherSections"
        :key="section.status"
        :section="section"
        :visible-count="visibleCounts[section.status]"
        @open-agreement="openAgreement"
        @open-detail="emit('openVoucher', $event.id)"
        @open-rules="emit('openVoucher', $event.id)"
        @redeem="redeemVoucher"
        @show-more="showMore(section.status)"
      />
    </div>

    <van-empty v-else class="life-empty" :description="copy.vouchers.emptyText">
      <template #image>
        <div class="voucher-empty-mark">{{ copy.vouchers.emptyMark }}</div>
      </template>
      <strong>{{ copy.vouchers.emptyTitle }}</strong>
    </van-empty>
  </section>
</template>
