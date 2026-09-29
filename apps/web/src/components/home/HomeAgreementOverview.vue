<script setup lang="ts">
import { computed } from "vue";
import { copy } from "@playbit/content";
import type { Agreement } from "@playbit/shared";
import { LoaderCircle, RefreshCw } from "lucide-vue-next";
import { getAgreementStatusLabel } from "../../utils/sessionDisplay";
import BrandSeal from "../ui/BrandSeal.vue";
import SectionHeading from "../ui/SectionHeading.vue";

const props = defineProps<{
  agreements: Agreement[];
  currentUserId: string | null;
  loading: boolean;
  error: string | null;
}>();

const emit = defineEmits<{
  create: [];
  history: [];
  open: [agreement: Agreement];
  refresh: [];
}>();

const isFinished = (agreement: Agreement) =>
  agreement.status === "fulfilled" || agreement.status === "waived";

const overviewItems = computed(() => [
  { key: "pending", label: copy.home.overview.pending, count: props.agreements.filter((item) => ["pending_signature", "pending_confirmation"].includes(item.status)).length },
  { key: "active", label: copy.home.overview.active, count: props.agreements.filter((item) => item.status === "active").length },
  { key: "settling", label: copy.home.overview.settling, count: props.agreements.filter((item) => item.status === "result_recorded").length },
  { key: "finished", label: copy.home.overview.finished, count: props.agreements.filter(isFinished).length }
]);

const latestAgreement = computed(() => {
  const pending = props.agreements.filter((item) => !isFinished(item));
  const candidates = pending.length ? pending : props.agreements;
  return candidates.reduce<Agreement | null>((latest, item) =>
    !latest || Date.parse(item.createdAt) > Date.parse(latest.createdAt) ? item : latest, null);
});

const partnerName = computed(() => {
  const participants = latestAgreement.value?.participants ?? [];
  const partner = props.currentUserId
    ? participants.find((participant) => participant.userId !== props.currentUserId)
    : participants.find((participant) => participant.role === "counterparty");
  return partner ? copy.home.latestWith(partner.nickname) : latestAgreement.value?.source === "card" ? copy.game.opponent : copy.contract.fallbackCounterparty;
});
</script>

<template>
  <section class="home-overview-section" aria-labelledby="home-overview-title">
    <SectionHeading :title="copy.home.overviewTitle" title-id="home-overview-title" :action-label="copy.home.viewAll" @action="emit('history')" />
    <div v-if="(props.loading || props.error) && props.agreements.length > 0" class="home-overview-inline-state" :class="{ 'is-loading': props.loading }" role="status" :aria-busy="props.loading" :aria-label="props.loading ? copy.home.overviewLoading : copy.home.overviewLoadFailed">
      <LoaderCircle v-if="props.loading" class="is-spinning" :size="13" aria-hidden="true" />
      <span v-else>{{ copy.home.overviewLoadFailed }}</span>
      <button v-if="props.error && !props.loading" type="button" @click="emit('refresh')">{{ copy.home.retryOverview }}</button>
    </div>
    <div v-if="props.loading && props.agreements.length === 0" class="home-overview-content home-overview-skeleton" data-state="loading" role="status" aria-busy="true" :aria-label="copy.home.overviewLoading">
      <div class="home-overview-skeleton-stats" aria-hidden="true">
        <span v-for="index in 4" :key="index" class="home-overview-skeleton-stat">
          <i class="home-overview-skeleton-line home-overview-skeleton-line-short" />
          <i class="home-overview-skeleton-line home-overview-skeleton-line-number" />
        </span>
      </div>
      <div class="home-overview-skeleton-record" aria-hidden="true">
        <i class="home-overview-skeleton-line home-overview-skeleton-line-meta" />
        <i class="home-overview-skeleton-line home-overview-skeleton-line-title" />
        <i class="home-overview-skeleton-line home-overview-skeleton-line-footer" />
      </div>
    </div>
    <div v-else-if="props.error && props.agreements.length === 0" class="home-overview-content home-overview-state" data-state="error" role="alert">
      <span class="home-overview-state-title">{{ copy.home.overviewLoadFailed }}</span>
      <span class="home-overview-state-note">{{ props.error }}</span>
      <button type="button" class="home-overview-state-action" :disabled="props.loading" @click="emit('refresh')">
        <RefreshCw :size="14" :class="{ 'is-spinning': props.loading }" aria-hidden="true" />
        {{ copy.home.retryOverview }}
      </button>
    </div>
    <div v-else class="home-overview-content" :aria-busy="props.loading">
      <BrandSeal class="home-overview-watermark" />
      <button
        type="button"
        class="home-overview-stats pb-pressable"
        :aria-label="copy.home.viewAll"
        @click="emit('history')"
      >
        <div v-for="item in overviewItems" :key="item.key" class="home-overview-stat" :data-tone="item.key">
          <span class="home-overview-stat-label">{{ item.label }}</span>
          <strong :title="String(item.count)">{{ copy.home.overviewCount(item.count) }}</strong>
        </div>
      </button>
      <button
        v-if="latestAgreement"
        type="button"
        class="home-overview-record pb-pressable"
        :data-status="latestAgreement.status"
        @click="emit('open', latestAgreement)"
      >
        <span class="home-overview-record-heading">
          <span>{{ isFinished(latestAgreement) ? copy.home.latestFinished : copy.home.latestPending }}</span>
          <span class="home-overview-status">{{ getAgreementStatusLabel(latestAgreement.status) }}</span>
        </span>
        <strong class="home-overview-record-title">{{ latestAgreement.title }}</strong>
        <span class="home-overview-record-footer">
          <span class="home-overview-partner">{{ partnerName }}</span>
          <span class="home-overview-action">{{ copy.home.viewAgreement }}</span>
        </span>
      </button>
      <button v-else type="button" class="home-overview-record home-overview-empty pb-pressable" data-status="empty" @click="emit('create')">
        <strong class="home-overview-record-title">{{ copy.home.latestEmptyTitle }}</strong>
        <span class="home-overview-empty-note">{{ copy.app.tagline }}</span>
        <span class="home-overview-action">{{ copy.home.latestEmptyAction }}</span>
      </button>
    </div>
  </section>
</template>
