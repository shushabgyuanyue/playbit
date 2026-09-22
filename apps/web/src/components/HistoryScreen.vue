<script setup lang="ts">
import { copy } from "@playbit/content";
import type { BetSession } from "@playbit/shared";
import { ChevronRight } from "lucide-vue-next";
import BaseBadge from "./ui/BaseBadge.vue";
import LifeAppBar from "./ui/LifeAppBar.vue";
import { getSessionStatusLabel, getSessionStatusTone } from "../utils/sessionDisplay";

defineProps<{
  sessions: BetSession[];
}>();

const emit = defineEmits<{
  back: [];
  open: [session: BetSession];
}>();
</script>

<template>
  <section class="life-page">
    <LifeAppBar :title="copy.history.navTitle" :show-back="true" :back-label="copy.common.back" @back="emit('back')" />

    <div class="life-page-content">
      <div class="life-section-title">
        <span>{{ copy.history.title }}</span>
      </div>

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
            <ChevronRight :size="18" class="life-muted" />
          </div>
          <div class="history-item-meta">
            <BaseBadge :tone="getSessionStatusTone(session.status)">
              {{ getSessionStatusLabel(session.status) }}
            </BaseBadge>
            <span>{{ copy.history.stake }}：{{ session.stake.label }}</span>
          </div>
        </button>
      </div>
    </div>
  </section>
</template>
