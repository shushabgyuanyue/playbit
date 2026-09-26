<script setup lang="ts">
import { copy } from "@playbit/content";
import type { Agreement, Coupon, GraceTicket } from "@playbit/shared";
import type { VoucherUiStatus } from "../types/voucher";
import { computed, onUnmounted, ref, watch } from "vue";
import LifeServiceHero from "./ui/LifeServiceHero.vue";
import { useVoucherAssets } from "../composables/useVoucherAssets";
import type { VoucherItem, VoucherStatusFilter, VoucherViewFilter } from "../types/voucher";
import VoucherSection from "./VoucherSection.vue";
import VoucherTicket from "./ui/VoucherTicket.vue";

const props = defineProps<{
  agreements: Agreement[];
  coupons: Coupon[];
  currentUserId: string | null;
  graceTickets: GraceTicket[];
}>();

const emit = defineEmits<{
  back: [];
  home: [];
  openAgreement: [agreementId: string];
  openVoucher: [voucherId: string];
}>();

const activeView = ref<VoucherViewFilter>("all");
const visibleCounts = ref<Record<VoucherStatusFilter, number>>({
  pending: 3,
  available: 3,
  used: 3
});
const loadingStatus = ref<Record<VoucherStatusFilter, boolean>>({
  pending: false,
  available: false,
  used: false
});
const loadTimers = new Map<VoucherStatusFilter, number>();

const { statusCounts, totalCount, voucherSections } = useVoucherAssets(
  () => props.agreements,
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
  if (voucher.agreementId) {
    emit("openAgreement", voucher.agreementId);
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

function graceStatus(status: GraceTicket["status"]): VoucherUiStatus {
  return status === "available" ? "available" : status === "reserved" ? "pending" : "used";
}

function loadMore(status: VoucherStatusFilter) {
  const section = voucherSections.value.find((item) => item.status === status);
  if (!section || loadingStatus.value[status] || visibleCounts.value[status] >= section.items.length) {
    return;
  }

  loadingStatus.value = { ...loadingStatus.value, [status]: true };
  const timer = window.setTimeout(() => {
    visibleCounts.value = {
      ...visibleCounts.value,
      [status]: visibleCounts.value[status] + 3
    };
    loadingStatus.value = { ...loadingStatus.value, [status]: false };
    loadTimers.delete(status);
  }, 260);
  loadTimers.set(status, timer);
}

watch(activeView, () => {
  loadTimers.forEach((timer) => window.clearTimeout(timer));
  loadTimers.clear();
  visibleCounts.value = {
    pending: 3,
    available: 3,
    used: 3
  };
  loadingStatus.value = {
    pending: false,
    available: false,
    used: false
  };
});

onUnmounted(() => {
  loadTimers.forEach((timer) => window.clearTimeout(timer));
});
</script>

<template>
  <section class="life-page voucher-page">
    <LifeServiceHero
      class="service-flow-hero voucher-service-hero"
      :title="copy.vouchers.navTitle"
      :show-back="true"
      :show-home="true"
      :back-label="copy.common.back"
      :home-label="copy.common.home"
      @back="emit('back')"
      @home="emit('home')"
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

    <section class="grace-ticket-section" aria-labelledby="grace-ticket-heading">
      <div class="grace-ticket-heading">
        <div>
          <p>{{ copy.vouchers.graceTitle }}</p>
          <h2 id="grace-ticket-heading">{{ copy.vouchers.graceEarned }}</h2>
        </div>
      </div>
      <div v-if="props.graceTickets.length" class="grace-ticket-list">
        <VoucherTicket
          v-for="ticket in props.graceTickets"
          :key="ticket.id"
          kind="custom"
          variant="grace"
          :status="graceStatus(ticket.status)"
          watermark="none"
        >
          <template #value>
            <strong>{{ copy.vouchers.graceTitle }}</strong>
            <span>{{ copy.vouchers.graceMilestonePrefix }}{{ ticket.earnedAtFulfillmentCount }}{{ copy.vouchers.graceMilestoneSuffix }}</span>
          </template>
          <div class="voucher-ticket-copy">
            <div class="voucher-ticket-title-row">
              <strong>{{ copy.vouchers.graceTitle }}</strong>
            </div>
            <p class="voucher-ticket-time">
              {{ ticket.status === 'available' ? copy.vouchers.graceAvailable : ticket.status === 'reserved' ? copy.vouchers.graceReserved : copy.vouchers.graceUsed }}
            </p>
          </div>
        </VoucherTicket>
      </div>
      <p v-else class="grace-ticket-empty">{{ copy.vouchers.graceEmpty }}</p>
    </section>

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
        :loading="loadingStatus[section.status]"
        @open-agreement="openAgreement"
        @open-detail="emit('openVoucher', $event.id)"
        @open-rules="emit('openVoucher', $event.id)"
        @redeem="redeemVoucher"
        @load-more="loadMore(section.status)"
      />
    </div>

    <van-empty v-else class="life-empty" image-size="0" :description="copy.vouchers.emptyText">
      <strong>{{ copy.vouchers.emptyTitle }}</strong>
    </van-empty>
  </section>
</template>
