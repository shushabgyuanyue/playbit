<script setup lang="ts">
import { copy } from "@playbit/content";
import { generateSettlementTitle } from "@playbit/game-core";
import type { BetSession } from "@playbit/shared";
import { CheckCircle2, Copy, Home, Stamp } from "lucide-vue-next";
import { computed } from "vue";
import BaseButton from "./ui/BaseButton.vue";
import BaseBadge from "./ui/BaseBadge.vue";
import LifeActionBar from "./ui/LifeActionBar.vue";
import LifeAppBar from "./ui/LifeAppBar.vue";
import { getLoserName, getWinnerName } from "../utils/sessionDisplay";

const props = defineProps<{
  session: BetSession;
  showBack?: boolean;
}>();

const emit = defineEmits<{
  back: [];
  home: [];
  fulfill: [];
  copyShare: [];
}>();

const winner = computed(() => getWinnerName(props.session));
const loser = computed(() => getLoserName(props.session));
const fulfilled = computed(() => props.session.stake.fulfilled);
</script>

<template>
  <section class="life-page">
    <LifeAppBar
      :title="copy.settlement.navTitle"
      :show-back="props.showBack"
      :back-label="copy.common.back"
      @back="emit('back')"
    />

    <div class="life-page-content">
      <article class="settlement-document">
        <BaseBadge :tone="fulfilled ? 'success' : 'pending'">
          {{ fulfilled ? copy.settlement.fulfilled : copy.settlement.pending }}
        </BaseBadge>
        <h2 class="settlement-title">《{{ generateSettlementTitle(props.session) }}》</h2>
        <div class="settlement-stamp">
          <CheckCircle2 v-if="fulfilled" :size="15" />
          <Stamp v-else :size="15" />
          {{ fulfilled ? copy.session.fulfilled : copy.settlement.pending }}
        </div>
        <ul class="life-info-list">
          <li><span>{{ copy.settlement.agreement }}</span><strong>{{ props.session.title }}</strong></li>
          <li><span>{{ copy.settlement.winner }}</span><strong>{{ winner }}</strong></li>
          <li><span>{{ copy.settlement.loser }}</span><strong>{{ loser }}</strong></li>
          <li><span>{{ copy.settlement.stake }}</span><strong>{{ props.session.stake.label }}</strong></li>
          <li>
            <span>{{ copy.settlement.status }}</span>
            <strong>{{ fulfilled ? copy.settlement.fulfilled : copy.settlement.pending }}</strong>
          </li>
        </ul>
      </article>
      <p class="life-section-caption">{{ copy.share.screenshotHint }}</p>
    </div>

    <LifeActionBar>
      <BaseButton variant="outline" size="lg" @click="emit('copyShare')">
        <Copy :size="18" />
        {{ copy.share.copyLink }}
      </BaseButton>
      <BaseButton v-if="!fulfilled" variant="danger" size="lg" @click="emit('fulfill')">
        <Stamp :size="18" />
        {{ copy.settlement.confirmFulfill }}
      </BaseButton>
      <BaseButton variant="ghost" size="lg" @click="emit('home')">
        <Home :size="18" />
        {{ copy.settlement.backHome }}
      </BaseButton>
    </LifeActionBar>
  </section>
</template>
