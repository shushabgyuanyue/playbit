<script setup lang="ts">
import { copy } from "@playbit/content";
import type { Agreement, AgreementStatus } from "@playbit/shared";
import { ChevronRight, Trash2 } from "lucide-vue-next";
import { computed, onUnmounted, ref, watch } from "vue";
import BaseBadge from "./ui/BaseBadge.vue";
import BrandSeal from "./ui/BrandSeal.vue";
import LifeServiceHero from "./ui/LifeServiceHero.vue";
import {
  getEffectiveStakeLabel,
  getAgreementStatusLabel,
  getAgreementStatusTone
} from "../utils/sessionDisplay";

const props = defineProps<{
  agreements: Agreement[];
  currentUserId: string | null;
}>();

const emit = defineEmits<{
  back: [];
  home: [];
  open: [agreement: Agreement];
  delete: [agreement: Agreement];
}>();

type HistoryFilter = "all" | AgreementStatus | "finished";

const activeFilter = ref<HistoryFilter>("all");
const visibleCount = ref(6);
const listLoading = ref(false);
let loadTimer: number | undefined;

const filterOptions = computed(() => [
  { key: "all" as const, label: copy.history.statusTabs.all, count: props.agreements.length },
  { key: "pending_signature" as const, label: copy.history.statusTabs.pending, count: countByStatus("pending_signature") },
  { key: "active" as const, label: copy.history.statusTabs.active, count: countByStatus("active") },
  { key: "result_recorded" as const, label: copy.history.statusTabs.result, count: countByStatus("result_recorded") },
  { key: "finished" as const, label: copy.history.statusTabs.finished, count: props.agreements.filter(isFinished).length }
]);

const filteredAgreements = computed(() => props.agreements
  .filter((agreement) => matchesFilter(agreement, activeFilter.value))
  .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt)));

const visibleAgreements = computed(() => filteredAgreements.value.slice(0, visibleCount.value));
const hasMore = computed(() => visibleCount.value < filteredAgreements.value.length);
const recordGroups = computed(() => {
  const groups = new Map<string, Agreement[]>();
  for (const agreement of visibleAgreements.value) {
    const key = monthKey(agreement.createdAt);
    const group = groups.get(key) ?? [];
    group.push(agreement);
    groups.set(key, group);
  }
  return [...groups.entries()].map(([key, agreements]) => ({
    key,
    label: monthLabel(key),
    count: agreements.length,
    agreements
  }));
});

const summaryText = computed(() => copy.history.summary(visibleAgreements.value.length, filteredAgreements.value.length));

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
}

function countByStatus(status: AgreementStatus) {
  return props.agreements.filter((agreement) => agreement.status === status).length;
}

function isFinished(agreement: Agreement) {
  return agreement.status === "fulfilled" || agreement.status === "waived";
}

function matchesFilter(agreement: Agreement, filter: HistoryFilter) {
  return filter === "all" || filter === "finished"
    ? filter === "all" || isFinished(agreement)
    : agreement.status === filter;
}

function monthKey(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 7);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string) {
  const [year, month] = key.split("-");
  return copy.history.monthLabel(year ?? key, month ?? "");
}

function getCounterparty(agreement: Agreement) {
  const other = props.currentUserId
    ? agreement.participants.find((participant) => participant.userId !== props.currentUserId)
    : agreement.participants.find((participant) => participant.role === "counterparty");
  return other?.nickname ?? copy.contract.fallbackCounterparty;
}

function canDelete(agreement: Agreement) {
  return agreement.ownerUserId === props.currentUserId &&
    agreement.participants.some((participant) => participant.role === "initiator" && participant.userId === props.currentUserId) &&
    agreement.status !== "fulfilled" && agreement.status !== "waived";
}

function loadMore() {
  if (!hasMore.value || listLoading.value) return;
  listLoading.value = true;
  loadTimer = window.setTimeout(() => {
    visibleCount.value += 6;
    listLoading.value = false;
    loadTimer = undefined;
  }, 280);
}

watch(activeFilter, () => {
  if (loadTimer) {
    window.clearTimeout(loadTimer);
    loadTimer = undefined;
  }
  visibleCount.value = 6;
  listLoading.value = false;
});

onUnmounted(() => {
  if (loadTimer) window.clearTimeout(loadTimer);
});
</script>

<template>
  <section class="life-page service-flow-page">
    <LifeServiceHero
      class="service-flow-hero"
      :title="copy.history.title"
      :show-back="true"
      :show-home="true"
      :back-label="copy.common.back"
      :home-label="copy.common.home"
      @back="emit('back')"
      @home="emit('home')"
    />

    <div class="life-page-content service-flow-content">
      <section v-if="agreements.length === 0" class="life-panel">
        <BaseBadge tone="archive">{{ copy.history.emptyLabel }}</BaseBadge>
        <h2 class="life-section-title">{{ copy.history.emptyTitle }}</h2>
        <p class="life-section-caption">{{ copy.history.emptyContent }}</p>
      </section>

      <div v-else class="history-ledger">
        <section class="history-summary-card" aria-labelledby="history-summary-title">
          <div class="history-summary-main">
            <span class="history-summary-eyebrow">{{ copy.history.summaryTitle }}</span>
            <strong id="history-summary-title">{{ filteredAgreements.length }}</strong>
            <span>{{ summaryText }}</span>
          </div>
          <BrandSeal class="history-summary-seal" />
        </section>

        <nav class="history-status-tabs" :aria-label="copy.history.statusTabsLabel">
          <button
            v-for="option in filterOptions"
            :key="option.key"
            type="button"
            :class="{ active: activeFilter === option.key }"
            @click="activeFilter = option.key"
          >
            <span>{{ option.label }}</span>
            <strong>{{ option.count }}</strong>
          </button>
        </nav>

        <van-list
          v-if="filteredAgreements.length"
          v-model:loading="listLoading"
          class="history-record-list"
          :finished="!hasMore"
          :finished-text="''"
          :immediate-check="false"
          :loading-text="copy.history.loadingMore"
          @load="loadMore"
        >
          <section v-for="group in recordGroups" :key="group.key" class="history-month-group">
            <header class="history-month-heading">
              <h2>{{ group.label }}</h2>
              <span>{{ copy.history.monthCount(group.count) }}</span>
            </header>
            <div class="history-list">
              <div
                v-for="agreement in group.agreements"
                :key="agreement.id"
                class="history-item pb-pressable"
                :class="{ 'has-delete': canDelete(agreement) }"
                :data-status="agreement.status"
              >
                <button type="button" class="history-item-open" @click="emit('open', agreement)">
                  <span class="history-item-mark" aria-hidden="true">
                    <span />
                  </span>
                  <div class="history-item-main">
                    <div class="history-item-header">
                      <h3 class="history-item-title">{{ agreement.title }}</h3>
                      <BaseBadge :tone="getAgreementStatusTone(agreement.status)">
                        {{ getAgreementStatusLabel(agreement.status) }}
                      </BaseBadge>
                    </div>
                    <div class="history-item-subline">
                      <span>{{ copy.history.counterparty }} · {{ getCounterparty(agreement) }}</span>
                      <span>{{ getEffectiveStakeLabel(agreement) }}</span>
                    </div>
                    <div class="history-item-footer">
                      <span>{{ copy.history.agreementNo }} {{ agreement.shareCode }}</span>
                      <time :datetime="agreement.createdAt">{{ formatDate(agreement.createdAt) }}</time>
                    </div>
                  </div>
                  <ChevronRight :size="17" class="history-item-chevron" aria-hidden="true" />
                </button>
                <button
                  v-if="canDelete(agreement)"
                  type="button"
                  class="history-item-delete"
                  :aria-label="copy.history.deleteAction"
                  @click="emit('delete', agreement)"
                >
                  <Trash2 :size="15" aria-hidden="true" />
                </button>
              </div>
            </div>
          </section>
        </van-list>

        <section v-else class="history-filter-empty life-panel">
          <BaseBadge tone="archive">{{ copy.history.emptyLabel }}</BaseBadge>
          <h2 class="life-section-title">{{ copy.history.filterEmptyTitle }}</h2>
          <p class="life-section-caption">{{ copy.history.filterEmptyContent }}</p>
        </section>

      </div>
    </div>
  </section>
</template>
