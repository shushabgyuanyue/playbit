<script setup lang="ts">
import { computed } from "vue";
import { copy } from "@playbit/content";
import type { Agreement } from "@playbit/shared";
import { getAgreementStatusLabel } from "../../utils/sessionDisplay";

const props = defineProps<{
  agreements: Agreement[];
  currentUserId: string | null;
}>();

const emit = defineEmits<{
  create: [];
  history: [];
  open: [agreement: Agreement];
}>();

const isFinished = (agreement: Agreement) =>
  agreement.status === "fulfilled" || agreement.status === "waived";

const overviewItems = computed(() => [
  { label: copy.home.overview.pending, count: props.agreements.filter((item) => item.status === "pending_signature").length },
  { label: copy.home.overview.active, count: props.agreements.filter((item) => item.status === "active").length },
  { label: copy.home.overview.settling, count: props.agreements.filter((item) => item.status === "result_recorded").length },
  { label: copy.home.overview.finished, count: props.agreements.filter(isFinished).length }
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
  return partner ? copy.home.latestWith(partner.nickname) : copy.contract.fallbackCounterparty;
});
</script>

<template>
  <section class="home-overview-section" aria-labelledby="home-overview-title">
    <div class="home-section-heading">
      <h2 id="home-overview-title" class="home-section-title">{{ copy.home.overviewTitle }}</h2>
      <button type="button" class="home-section-link" @click="emit('history')">
        {{ copy.home.viewAll }}
      </button>
    </div>
    <div class="home-overview-content">
      <span class="home-overview-watermark" aria-hidden="true">{{ copy.app.name }}</span>
      <dl class="home-overview-stats">
        <div v-for="item in overviewItems" :key="item.label" class="home-overview-stat">
          <dt>{{ item.label }}</dt>
          <dd :title="String(item.count)">{{ copy.home.overviewCount(item.count) }}</dd>
        </div>
      </dl>
      <button
        v-if="latestAgreement"
        type="button"
        class="home-overview-record"
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
      <button v-else type="button" class="home-overview-record home-overview-empty" @click="emit('create')">
        <strong class="home-overview-record-title">{{ copy.home.latestEmptyTitle }}</strong>
        <span class="home-overview-empty-note">{{ copy.app.tagline }}</span>
        <span class="home-overview-action">{{ copy.home.latestEmptyAction }}</span>
      </button>
    </div>
  </section>
</template>
