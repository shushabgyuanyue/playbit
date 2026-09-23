<script setup lang="ts">
import { copy } from "@playbit/content";
import type { BetSession } from "@playbit/shared";
import { BadgePlus, Trophy } from "lucide-vue-next";
import AgreementProgress from "./AgreementProgress.vue";
import BaseButton from "./ui/BaseButton.vue";
import BaseBadge from "./ui/BaseBadge.vue";
import BaseField from "./ui/BaseField.vue";
import LifeActionBar from "./ui/LifeActionBar.vue";
import LifeServiceHero from "./ui/LifeServiceHero.vue";
import { getEffectiveStakeLabel } from "../utils/sessionDisplay";
import { computed, ref } from "vue";

const props = defineProps<{
  session: BetSession;
  currentUserId: string | null;
}>();

const emit = defineEmits<{
  back: [];
  settle: [winnerId: string];
  addBoost: [label: string];
  confirmBoost: [boostId: string];
}>();

const boostOpen = ref(false);
const boostDraft = ref("");
const currentParticipantId = computed(
  () => props.session.participants.find((participant) => participant.userId === props.currentUserId)?.id ?? null
);
const canAddBoost = computed(() => props.session.boosts.length < 3);
const pendingBoosts = computed(() =>
  props.session.boosts.filter(
    (boost) =>
      currentParticipantId.value &&
      !boost.confirmedBy.includes(currentParticipantId.value) &&
      boost.confirmedBy.length < props.session.participants.length
  )
);
const effectiveStake = computed(() => getEffectiveStakeLabel(props.session));
const confirmedBoosts = computed(() =>
  props.session.boosts.filter((boost) => boost.confirmedBy.length === props.session.participants.length)
);

function submitBoost() {
  const label = boostDraft.value.trim();
  if (!label) {
    return;
  }
  emit("addBoost", label);
  boostDraft.value = "";
  boostOpen.value = false;
}
</script>

<template>
  <section class="life-page service-flow-page">
    <LifeServiceHero
      class="service-flow-hero"
      :eyebrow="copy.home.docketLabel"
      :title="copy.session.navTitle"
      :show-back="true"
      :back-label="copy.common.back"
      @back="emit('back')"
    />

    <div class="life-page-content service-flow-content">
      <AgreementProgress :session="props.session" />
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
            <strong>{{ effectiveStake }}</strong>
          </li>
        </ul>
      </section>

      <section class="life-panel">
        <h2 class="life-section-title">{{ copy.session.enhancementTitle }}</h2>
        <div class="session-enhancement-grid">
          <button
            type="button"
            class="session-option-button"
            :disabled="!canAddBoost"
            @click="boostOpen = !boostOpen"
          >
            <strong><BadgePlus :size="16" />{{ copy.session.boost }}</strong>
            <span>{{ props.session.boosts.length }}/3 · {{ canAddBoost ? copy.session.boostHint : copy.session.boostLimit }}</span>
          </button>
        </div>
        <div v-if="boostOpen" class="session-boost-editor">
          <BaseField v-model="boostDraft" :placeholder="copy.session.boostPlaceholder" :label="copy.session.boost" />
          <BaseButton size="md" :disabled="!boostDraft.trim()" @click="submitBoost">
            {{ copy.session.boostSubmit }}
          </BaseButton>
        </div>
        <div v-if="pendingBoosts.length" class="session-pending-boosts">
          <article v-for="boost in pendingBoosts" :key="boost.id" class="session-pending-boost">
            <span>{{ boost.label }}</span>
            <BaseButton size="sm" variant="outline" @click="emit('confirmBoost', boost.id)">
              {{ copy.session.boostConfirm }}
            </BaseButton>
          </article>
        </div>
        <ul v-if="props.session.stake.additions?.length || pendingBoosts.length" class="life-info-list">
          <li v-for="addition in props.session.stake.additions" :key="addition.boostId">
            <span>{{ copy.session.boostConfirmed }}</span>
            <strong>{{ addition.label }}</strong>
          </li>
          <li v-for="boost in pendingBoosts" :key="boost.id">
            <span>{{ copy.session.boostPending }}</span>
            <strong>{{ boost.label }}</strong>
          </li>
        </ul>
        <p v-if="confirmedBoosts.length" class="life-section-caption">
          {{ confirmedBoosts.length }} {{ copy.session.boostConfirmed }}
        </p>
      </section>
    </div>

    <LifeActionBar>
      <BaseButton
        v-for="participant in props.session.participants"
        :key="participant.id"
        size="lg"
        @click="emit('settle', participant.id)"
      >
        <Trophy :size="18" />
        {{ copy.session.chooseWinnerPrefix }} {{ participant.nickname }} {{ copy.session.chooseWinnerSuffix }}
      </BaseButton>
    </LifeActionBar>
  </section>
</template>
