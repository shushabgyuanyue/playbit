<script setup lang="ts">
import { copy } from "@playbit/content";
import type { BetSession, Coupon } from "@playbit/shared";
import { computed, ref, watch } from "vue";
import LifeServiceHero from "./ui/LifeServiceHero.vue";
import { useVoucherAssets } from "../composables/useVoucherAssets";
import type { VoucherItem, VoucherStatusFilter, VoucherViewFilter } from "../types/voucher";
import VoucherSection from "./VoucherSection.vue";

const props = defineProps<{
  sessions: BetSession[];
  coupons: Coupon[];
  currentUserId: string | null;
}>();

const emit = defineEmits<{
  back: [];
  openAgreement: [sessionId: string];
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
  activeView,
  () => props.currentUserId
);

const statusOptions = computed(() => [
  { key: "all" as const, label: copy.vouchers.statusTabs.all, count: totalCount.value },
  { key: "pending" as const, label: copy.vouchers.statusTabs.pending, count: statusCounts.value.pending },
  { key: "available" as const, label: copy.vouchers.statusTabs.available, count: statusCounts.value.available },
  { key: "used" as const, label: copy.vouchers.statusTabs.used, count: statusCounts.value.used }
]);

function openAgreement(voucher: VoucherItem) {
  if (voucher.sessionId) {
    emit("openAgreement", voucher.sessionId);
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
    <LifeServiceHero
      class="voucher-service-hero"
      :eyebrow="copy.home.heroSubtitle"
      :title="copy.vouchers.navTitle"
      :show-back="true"
      :back-label="copy.common.back"
      @back="emit('back')"
    />

    <div class="voucher-overview-wrap">
      <section class="life-summary-card">
        <header>
          <strong>{{ copy.vouchers.overviewTitle }}</strong>
        </header>
        <div class="life-metric-row">
          <span>
            <strong>{{ statusCounts.pending }}</strong>
            {{ copy.vouchers.statusTabs.pending }}
          </span>
          <span>
            <strong>{{ statusCounts.available }}</strong>
            {{ copy.vouchers.statusTabs.available }}
          </span>
          <span>
            <strong>{{ statusCounts.used }}</strong>
            {{ copy.vouchers.statusTabs.used }}
          </span>
        </div>
      </section>
    </div>

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

    <van-empty v-else class="life-empty" image-size="0" :description="copy.vouchers.emptyText">
      <strong>{{ copy.vouchers.emptyTitle }}</strong>
    </van-empty>
  </section>
</template>
