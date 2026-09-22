<script setup lang="ts">
import { copy } from "@playbit/content";
import type { BetSession } from "@playbit/shared";
import { BadgePlus, ShieldCheck, Trophy } from "lucide-vue-next";
import BaseButton from "./ui/BaseButton.vue";
import BaseBadge from "./ui/BaseBadge.vue";
import LifeActionBar from "./ui/LifeActionBar.vue";
import LifeAppBar from "./ui/LifeAppBar.vue";

const props = defineProps<{
  session: BetSession;
}>();

const emit = defineEmits<{
  back: [];
  settle: [winnerId: string, fulfilled: boolean];
}>();
</script>

<template>
  <section class="life-page">
    <LifeAppBar :title="copy.session.navTitle" :show-back="true" :back-label="copy.common.back" @back="emit('back')" />

    <div class="life-page-content">
      <section class="challenge-document">
        <BaseBadge tone="success">{{ copy.session.active }}</BaseBadge>
        <h2 class="challenge-title">{{ props.session.title }}</h2>
        <p class="challenge-content">{{ props.session.challenge }}</p>
        <ul class="life-info-list">
          <li>
            <span>{{ copy.session.judgment }}</span>
            <strong>{{ props.session.judgmentRule }}</strong>
          </li>
          <li>
            <span>{{ copy.session.stake }}</span>
            <strong>{{ props.session.stake.label }}</strong>
          </li>
        </ul>
      </section>

      <section class="life-panel">
        <h2 class="life-section-title">{{ copy.session.enhancementTitle }}</h2>
        <div class="session-enhancement-grid">
          <button type="button" class="session-option-button">
            <strong><BadgePlus :size="16" />{{ copy.session.boost }}</strong>
            <span>{{ copy.session.boostHint }}</span>
          </button>
          <button type="button" class="session-option-button">
            <strong><ShieldCheck :size="16" />{{ copy.session.silverBullet }}</strong>
            <span>{{ copy.session.silverHint }}</span>
          </button>
        </div>
      </section>
    </div>

    <LifeActionBar>
      <BaseButton
        v-for="participant in props.session.participants"
        :key="participant.id"
        size="lg"
        @click="emit('settle', participant.id, false)"
      >
        <Trophy :size="18" />
        {{ copy.session.chooseWinnerPrefix }} {{ participant.nickname }} {{ copy.session.chooseWinnerSuffix }}
      </BaseButton>
    </LifeActionBar>
  </section>
</template>
