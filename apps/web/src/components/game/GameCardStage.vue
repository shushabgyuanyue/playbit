<script setup lang="ts">
import { copy } from "@playbit/content";
import type { Card } from "@playbit/shared";
import { ref, watch } from "vue";
import backArt from "../../assets/game-card-back.webp";
import blueArt from "../../assets/game-card-blue.webp";
import goldArt from "../../assets/game-card-gold.webp";
import GameCard from "./GameCard.vue";

const props = defineProps<{ card: Card | null; loading?: boolean }>();
const emit = defineEmits<{ animating: [value: boolean] }>();
const revision = ref(0);
const stageElement = ref<HTMLElement | null>(null);
const transitionHeight = ref<number | null>(null);
function beginLeave() {
  transitionHeight.value = stageElement.value?.offsetHeight ?? null;
  emit("animating", true);
}
function finishEnter() {
  transitionHeight.value = null;
  emit("animating", false);
}
watch(() => props.loading, (loading, previous) => {
  if (previous && !loading) revision.value++;
});
</script>

<template>
  <div ref="stageElement" class="game-card-stage" :aria-busy="loading" :style="{ minHeight: transitionHeight ? `${transitionHeight}px` : undefined }">
    <div class="game-card-stack" aria-hidden="true">
      <img :src="goldArt" alt="" class="game-card-stack-far" />
      <img :src="blueArt" alt="" class="game-card-stack-near" />
    </div>
    <Transition name="game-draw" mode="out-in" appear
      @before-enter="emit('animating', true)" @before-leave="beginLeave"
      @after-enter="finishEnter" @enter-cancelled="finishEnter">
      <div v-if="card" :key="`${card.id}-${revision}`" class="game-card-turn" aria-live="polite" aria-atomic="true">
        <GameCard :card="card" class="game-card-front"><template v-if="$slots.actions" #actions><slot name="actions" /></template></GameCard>
        <img :src="backArt" class="game-card-reverse" alt="" aria-hidden="true" />
      </div>
      <div v-else class="game-card-waiting" key="waiting">
        <img :src="backArt" alt="" />
        <span role="status">{{ loading ? copy.draw.drawing : copy.draw.emptyTitle }}</span>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.game-card-stage { position: relative; width: calc(100% - 24px); max-width: 360px; margin: 12px auto 20px; perspective: 1200px; }
.game-card-stack { position: absolute; inset: 0; pointer-events: none; }
.game-card-stack img { position: absolute; width: 100%; height: 100%; object-fit: contain; border-radius: 22px; box-shadow: var(--pb-shadow-game-stack); }
.game-card-stack-far { transform: translate(5px, -9px) rotate(2.5deg) scale(.97); opacity: .8; }
.game-card-stack-near { transform: translate(-4px, -4px) rotate(-1.8deg) scale(.99); }
.game-card-turn { position: relative; transform-style: preserve-3d; }
.game-card-front, .game-card-reverse { backface-visibility: hidden; -webkit-backface-visibility: hidden; }
.game-card-reverse { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; border-radius: 22px; transform: rotateY(180deg); }
.game-card-waiting { position: relative; aspect-ratio: .7; border-radius: 22px; overflow: hidden; }
.game-card-waiting img { width: 100%; height: 100%; object-fit: contain; }
.game-card-waiting span { position: absolute; bottom: 28px; left: 22px; right: 22px; padding: 10px; border-radius: 6px; background: var(--pb-overlay-white-strong); color: var(--pb-text-1); text-align: center; font-size: var(--pb-font-base); }
.game-draw-enter-active { animation: card-reveal 440ms cubic-bezier(.22,.72,.25,1) both; }
.game-draw-leave-active { transition: transform 220ms ease-in, opacity 220ms ease-in; pointer-events: none; }
.game-draw-leave-to { transform: translate(-42px, -12px) rotate(-7deg); opacity: 0; }
@keyframes card-reveal {
  from { transform: translateY(14px) rotateY(-180deg) scale(.96); }
  to { transform: translateY(0) rotateY(0) scale(1); }
}
@media (prefers-reduced-motion: reduce) {
  .game-draw-enter-active { animation: none; }
  .game-draw-leave-active { transition: none; }
}
</style>
