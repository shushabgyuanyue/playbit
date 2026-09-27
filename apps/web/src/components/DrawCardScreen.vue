<script setup lang="ts">
import { copy } from "@playbit/content";
import type { Card, Stake, User } from "@playbit/shared";
import { Plus, RefreshCcw } from "lucide-vue-next";
import { computed, ref, watch } from "vue";
import StakePicker from "./StakePicker.vue";
import GameCardStage from "./game/GameCardStage.vue";
import BaseButton from "./ui/BaseButton.vue";
import CardReveal from "./ui/CardReveal.vue";
import LifeServiceHero from "./ui/LifeServiceHero.vue";

const props = defineProps<{
  card: Card | null;
  loading: boolean;
  createLoading?: boolean;
  user: User | null;
  stake: Stake;
  error?: string;
}>();
const emit = defineEmits<{
  back: []; home: []; draw: []; createGame: [stake: Stake]; updateStake: [stake: Stake];
}>();
const agreementOpen = ref(false);
const animating = ref(false);
const busy = computed(() => props.loading || animating.value);
const validationAttempted = ref(false);
const stakeError = computed(() => validationAttempted.value && (!props.stake.label.trim() ||
  (props.stake.type === 'custom' && props.stake.label === copy.stakes.presets.find(item => item.type === 'custom')?.label)) ? copy.create.stakeRequired : '');
watch(() => props.card?.id, () => {
  agreementOpen.value = false;
  validationAttempted.value = false;
});
function openUpgrade() {
  if (busy.value || props.card?.mode !== "versus") return;
  agreementOpen.value = true;
}
function createGame() {
  validationAttempted.value = true;
  if (!stakeError.value && !props.createLoading) emit('createGame', props.stake);
}
</script>

<template>
  <section class="life-page service-flow-page draw-page">
    <LifeServiceHero class="service-flow-hero" :title="copy.draw.title" :show-back="true" :show-home="true"
      :back-label="copy.common.back" :home-label="copy.common.home" @back="emit('back')" @home="emit('home')" />
    <div class="life-page-content draw-stage-content">
      <GameCardStage :card="props.card" :loading="props.loading" @animating="animating = $event">
      <template #actions>
      <div class="draw-actions">
      <div class="draw-action-row" :class="{ 'draw-action-row-single': props.card?.mode !== 'versus' && !props.card?.reveal }">
      <BaseButton class="draw-again" size="lg" :loading="props.loading" :disabled="busy" @click="emit('draw')">
        <RefreshCcw v-if="!props.loading" :size="18" aria-hidden="true" />
        {{ props.card ? copy.draw.reroll : copy.draw.drawNow }}
      </BaseButton>
      <BaseButton v-if="props.card?.mode === 'versus'" class="draw-upgrade" variant="outline" size="lg" :disabled="busy" @click="openUpgrade">
        <Plus :size="15" aria-hidden="true" />{{ copy.draw.addStakes }}
      </BaseButton>
      <CardReveal v-else-if="props.card?.reveal" :key="props.card.id" :answer="props.card.reveal" :disabled="busy" />
      </div>
      <CardReveal v-if="props.card?.mode === 'versus' && props.card.reveal" :key="props.card.id" :answer="props.card.reveal" :disabled="busy" />
      </div>
      </template>
      </GameCardStage>
      <BaseButton v-if="!props.card" :loading="props.loading" @click="emit('draw')">{{ copy.draw.drawNow }}</BaseButton>
    </div>
    <van-popup v-model:show="agreementOpen" round position="bottom" teleport="body" class="life-sheet-popup" :close-on-click-overlay="!props.createLoading">
      <section class="game-stake-sheet">
        <h2 class="life-section-title">{{ copy.game.selectStake }}</h2>
        <p class="life-section-caption">{{ copy.game.stakeHint }}</p>
        <StakePicker :model-value="stake" :title="copy.game.stakeTitle" :error="stakeError" equity-only @change="emit('updateStake', $event)" />
        <p v-if="props.error" class="game-stake-error" role="alert">{{ props.error }}</p>
        <p class="life-section-caption">{{ copy.game.consent }}</p>
        <BaseButton size="lg" :loading="props.createLoading" @click="createGame">{{ copy.game.confirmStake }}</BaseButton>
      </section>
    </van-popup>
  </section>
</template>

<style scoped>
.game-stake-sheet { display: grid; gap: 14px; padding: 20px 16px calc(20px + env(safe-area-inset-bottom)); max-height: 85dvh; overflow-y: auto; }
.game-stake-error { color: var(--pb-ink-coral); font-size: var(--pb-font-base); }
.draw-page { background: var(--pb-surface-game-stage); }
.draw-stage-content { flex: 0 0 auto; align-content: start; gap: 0; padding: 18px 12px calc(18px + env(safe-area-inset-bottom)); }
.draw-stage-content :deep(.game-card-stage) { width: calc(100% - 16px); max-width: 380px; margin: 12px auto; }
.draw-actions { display: grid; gap: 6px; }
.draw-action-row { display: grid; grid-template-columns: 1.1fr 1fr; gap: 8px; }
.draw-action-row-single { grid-template-columns: 1fr; }
.draw-actions :deep(.life-button) { min-height: 44px; padding: 8px; font-size: var(--pb-font-base); border-radius: 6px; }
.draw-actions :deep(.card-reveal) { margin: 0; }
.draw-actions :deep(.card-reveal > button) { width: 100%; background: var(--pb-surface-option); color: var(--pb-text-2); }
.draw-actions :deep(.draw-again) { background: var(--pb-action-hero-gradient); box-shadow: var(--pb-shadow-game-action); border: 1px solid var(--pb-line-action-highlight); }
.draw-actions :deep(.draw-upgrade) { background: var(--pb-surface-option); border-color: var(--pb-line-soft); color: var(--pb-text-2); }
@media (max-height: 700px) { .draw-stage-content { padding-top: 10px; } }
</style>
