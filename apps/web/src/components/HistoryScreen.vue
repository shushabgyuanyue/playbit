<script setup lang="ts">
import { copy } from "@playbit/content";
import type { BetSession } from "@playbit/shared";
import { ChevronRight } from "lucide-vue-next";
import BaseBadge from "./ui/BaseBadge.vue";
import LifeServiceHero from "./ui/LifeServiceHero.vue";
import {
  getCounterpartyName,
  getEffectiveStakeLabel,
  getSessionStatusLabel,
  getSessionStatusTone
} from "../utils/sessionDisplay";

defineProps<{
  sessions: BetSession[];
}>();

const emit = defineEmits<{
  back: [];
  open: [session: BetSession];
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
      :eyebrow="copy.home.docketLabel"
      :title="copy.history.title"
      :show-back="true"
      :back-label="copy.common.back"
      @back="emit('back')"
    />

    <div class="life-page-content service-flow-content">
      <section v-if="sessions.length === 0" class="life-panel">
        <BaseBadge tone="archive">{{ copy.history.emptyLabel }}</BaseBadge>
        <h2 class="life-section-title">{{ copy.history.emptyTitle }}</h2>
        <p class="life-section-caption">{{ copy.history.emptyContent }}</p>
      </section>

      <div v-else class="history-list">
        <button
          v-for="session in sessions"
          :key="session.id"
          type="button"
          class="history-item"
          @click="emit('open', session)"
        >
          <div class="history-item-header">
            <h2 class="history-item-title">{{ session.title }}</h2>
            <BaseBadge :tone="getSessionStatusTone(session.status)">
              {{ getSessionStatusLabel(session.status) }}
            </BaseBadge>
          </div>
          <div class="history-item-code">
            {{ copy.history.agreementNo }} {{ session.shareCode }}
          </div>
          <div class="history-item-meta-grid">
            <span>{{ copy.history.createdAt }}：{{ formatDate(session.createdAt) }}</span>
            <span>{{ copy.history.counterparty }}：{{ getCounterpartyName(session) }}</span>
            <span>{{ copy.history.stake }}：{{ getEffectiveStakeLabel(session) }}</span>
          </div>
          <ChevronRight :size="18" class="history-item-chevron" />
        </button>
      </div>
    </div>
  </section>
</template>
