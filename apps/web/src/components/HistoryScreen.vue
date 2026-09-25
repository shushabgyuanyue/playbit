<script setup lang="ts">
import { copy } from "@playbit/content";
import type { Agreement } from "@playbit/shared";
import { ChevronRight } from "lucide-vue-next";
import BaseBadge from "./ui/BaseBadge.vue";
import LifeServiceHero from "./ui/LifeServiceHero.vue";
import {
  getCounterpartyName,
  getEffectiveStakeLabel,
  getAgreementStatusLabel,
  getAgreementStatusTone
} from "../utils/sessionDisplay";

defineProps<{
  agreements: Agreement[];
}>();

const emit = defineEmits<{
  back: [];
  open: [agreement: Agreement];
}>();

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
}
</script>

<template>
  <section class="life-page service-flow-page">
    <LifeServiceHero
      class="service-flow-hero"
      :title="copy.history.title"
      :show-back="true"
      :back-label="copy.common.back"
      @back="emit('back')"
    />

    <div class="life-page-content service-flow-content">
      <section v-if="agreements.length === 0" class="life-panel">
        <BaseBadge tone="archive">{{ copy.history.emptyLabel }}</BaseBadge>
        <h2 class="life-section-title">{{ copy.history.emptyTitle }}</h2>
        <p class="life-section-caption">{{ copy.history.emptyContent }}</p>
      </section>

      <div v-else class="history-list">
        <button
          v-for="agreement in agreements"
          :key="agreement.id"
          type="button"
          class="history-item"
          @click="emit('open', agreement)"
        >
          <div class="history-item-header">
            <h2 class="history-item-title">{{ agreement.title }}</h2>
            <BaseBadge :tone="getAgreementStatusTone(agreement.status)">
              {{ getAgreementStatusLabel(agreement.status) }}
            </BaseBadge>
          </div>
          <div class="history-item-code">
            {{ copy.history.agreementNo }} {{ agreement.shareCode }}
          </div>
          <div class="history-item-meta-grid">
            <span>{{ copy.history.createdAt }}：{{ formatDate(agreement.createdAt) }}</span>
            <span>{{ copy.history.counterparty }}：{{ getCounterpartyName(agreement) }}</span>
            <span>{{ copy.history.stake }}：{{ getEffectiveStakeLabel(agreement) }}</span>
          </div>
          <ChevronRight :size="18" class="history-item-chevron" />
        </button>
      </div>
    </div>
  </section>
</template>
