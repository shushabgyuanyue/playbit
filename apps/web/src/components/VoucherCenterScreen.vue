<script setup lang="ts">
import { copy } from "@playbit/content";
import type { Agreement, Coupon, GraceTicket } from "@playbit/shared";
import { TicketCheck } from "lucide-vue-next";
import { computed, ref, watch } from "vue";
import LifeServiceHero from "./ui/LifeServiceHero.vue";
import { useVoucherAssets } from "../composables/useVoucherAssets";
import type { VoucherItem, VoucherStatusFilter, VoucherViewFilter } from "../types/voucher";
import VoucherSection from "./VoucherSection.vue";
import BaseBadge from "./ui/BaseBadge.vue";

const props = defineProps<{
  agreements: Agreement[];
  coupons: Coupon[];
  currentUserId: string | null;
  graceTickets: GraceTicket[];
}>();

const emit = defineEmits<{
  back: [];
  openAgreement: [agreementId: string];
  openVoucher: [voucherId: string];
}>();

const activeView = ref<VoucherViewFilter>("all");
const visibleCounts = ref<Record<VoucherStatusFilter, number>>({
  pending: 3,
  available: 3,
  used: 3
});

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
      class="service-flow-hero voucher-service-hero"
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

    <section class="grace-ticket-section" aria-labelledby="grace-ticket-heading">
      <div class="grace-ticket-heading">
        <div>
          <p>{{ copy.vouchers.graceTitle }}</p>
          <h2 id="grace-ticket-heading">{{ copy.vouchers.graceEarned }}</h2>
        </div>
        <TicketCheck :size="21" aria-hidden="true" />
      </div>
      <div v-if="props.graceTickets.length" class="grace-ticket-list">
        <article v-for="ticket in props.graceTickets" :key="ticket.id" class="grace-ticket-row">
          <span>{{ copy.vouchers.graceMilestonePrefix }}{{ ticket.earnedAtFulfillmentCount }}{{ copy.vouchers.graceMilestoneSuffix }}</span>
          <BaseBadge :tone="ticket.status === 'available' ? 'success' : ticket.status === 'reserved' ? 'pending' : 'archive'">
            {{ ticket.status === 'available' ? copy.vouchers.graceAvailable : ticket.status === 'reserved' ? copy.vouchers.graceReserved : copy.vouchers.graceUsed }}
          </BaseBadge>
        </article>
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

<style scoped>
.grace-ticket-section {
  margin: 0 var(--pb-page-x) 14px;
  padding: 13px 14px;
  border: 1px solid var(--pb-line);
  border-radius: var(--pb-radius-lg);
  background: var(--pb-fill-card);
}

.grace-ticket-heading,
.grace-ticket-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.grace-ticket-heading p,
.grace-ticket-heading h2,
.grace-ticket-empty {
  margin: 0;
}

.grace-ticket-heading p {
  color: var(--pb-text-3);
  font-size: var(--pb-font-sm);
}

.grace-ticket-heading h2 {
  margin-top: 4px;
  color: var(--pb-text-1);
  font-size: var(--pb-font-md);
  font-weight: var(--pb-weight-semibold);
}

.grace-ticket-heading > svg {
  flex: 0 0 auto;
  color: var(--pb-blue);
}

.grace-ticket-list {
  display: grid;
  gap: 8px;
  margin-top: 14px;
}

.grace-ticket-row {
  min-height: 38px;
  padding-top: 8px;
  border-top: 1px solid var(--pb-line);
}

.grace-ticket-row > span,
.grace-ticket-empty {
  color: var(--pb-text-3);
  font-size: var(--pb-font-sm);
}

.grace-ticket-empty {
  margin-top: 10px;
}
</style>
