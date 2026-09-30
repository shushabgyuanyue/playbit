<script setup lang="ts">
import { copy } from "@playbit/content";
import type { Card } from "@playbit/shared";
import { computed } from "vue";
import coralArt from "../../assets/game-card-coral.webp";
import blueArt from "../../assets/game-card-blue.webp";
import goldArt from "../../assets/game-card-gold.webp";

const props = defineProps<{ card: Card }>();
const tone = computed(() => props.card.tone ?? (props.card.reveal ? "gold" : "blue"));
const artwork = computed(() => ({ coral: coralArt, blue: blueArt, gold: goldArt })[tone.value]);
const steps = computed(() => props.card.steps?.length ? props.card.steps : [props.card.content]);
const scene = computed(() => props.card.scenes?.[0]
  ?? (props.card.participantMax > 2 ? "多人聚会" : props.card.durationMinutes && props.card.durationMinutes <= 3 ? "碎片时间" : "双人对局"));
</script>

<template>
  <article class="game-card" :data-tone="tone">
    <img class="game-card-art" :src="artwork" alt="" />
    <header class="game-card-meta">
      <span class="game-card-scene">{{ scene }}</span>
      <div v-if="$slots['top-actions']" class="game-card-top-actions"><slot name="top-actions" /></div>
    </header>
    <div class="game-card-heading">
      <h2>{{ card.name }}</h2>
      <p v-if="card.hook">{{ card.hook }}</p>
    </div>
    <div class="game-card-reading" tabindex="0" :aria-label="copy.draw.howToPlay">
    <div class="game-card-rules">
      <h3>{{ copy.draw.howToPlay }}</h3>
      <ol>
        <li v-for="(step, index) in steps" :key="index"><span v-if="steps.length > 1" class="game-step-number" aria-hidden="true">{{ String(index + 1).padStart(2, '0') }}</span><span>{{ step }}</span></li>
      </ol>
    </div>
    <div class="game-card-outcome">
      <h3>{{ card.mode === 'versus' ? copy.draw.outcomeLabel : copy.draw.winCondition }}</h3>
      <p>{{ card.winCondition }}</p>
    </div>
    </div>
    <footer v-if="$slots.actions" class="game-card-actions"><slot name="actions" /></footer>
  </article>
</template>

<style scoped>
.game-card {
  --card-ink: var(--pb-ink-blue);
  position: relative;
  display: flex;
  flex-direction: column;
  aspect-ratio: 891 / 1268;
  padding: 24px 24px 28px;
  border-radius: 22px;
  color: var(--pb-text-1);
  box-shadow: var(--pb-shadow-game-card);
  overflow-wrap: anywhere;
  isolation: isolate;
}
.game-card[data-tone="coral"] { --card-ink: var(--pb-ink-coral); aspect-ratio: 896 / 1264; }
.game-card[data-tone="gold"] { --card-ink: var(--pb-ink-gold); aspect-ratio: 882 / 1270; }
.game-card-art { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; z-index: -2; pointer-events: none; }
.game-card::before { content: ""; position: absolute; inset: 2%; border-radius: 18px; background: var(--pb-game-card-reading-veil); z-index: -1; pointer-events: none; }
.game-card-meta { display: flex; align-items: center; gap: 8px; flex: 0 0 auto; color: var(--card-ink); font-size: var(--pb-font-xs); font-weight: 500; }
.game-card-scene { font-weight: 700; }
.game-card-top-actions { display: inline-flex; align-items: center; gap: 4px; margin-left: auto; }
.game-card-duration + .game-card-top-actions { margin-left: 0; }
.game-card-heading { margin: 18px 0 14px; flex: 0 0 auto; }
.game-card-heading h2 { margin: 0; color: var(--card-ink); font-size: 24px; font-weight: 700; line-height: 1.35; letter-spacing: 0; }
.game-card-heading p { margin: 7px 0 0; font-size: var(--pb-font-base); line-height: 1.55; color: var(--pb-text-2); }
.game-card-reading { flex: 1 1 0; min-height: 0; overflow-y: auto; scrollbar-width: thin; scrollbar-color: color-mix(in srgb, var(--card-ink) 28%, transparent) transparent; }
.game-card-reading:focus-visible { outline: 1px solid var(--card-ink); outline-offset: 3px; }
.game-card h3 { margin: 0 0 8px; font-size: var(--pb-font-xs); font-weight: 700; color: var(--card-ink); }
.game-card-rules { border-top: 1px solid color-mix(in srgb, var(--card-ink) 19%, transparent); padding-top: 12px; }
.game-card-rules ol { margin: 0; padding: 0; list-style: none; display: grid; gap: 9px; }
.game-card-rules li { display: flex; align-items: baseline; gap: 7px; }
.game-step-number { flex: 0 0 auto; color: var(--card-ink); font-size: var(--pb-font-xs); font-weight: 600; font-variant-numeric: tabular-nums; }
.game-card-rules li, .game-card-outcome p { font-size: var(--pb-font-base); line-height: 1.7; margin: 0; }
.game-card-outcome { padding-top: 14px; }
.game-card-outcome h3 { border-top: 1px dashed color-mix(in srgb, var(--card-ink) 23%, transparent); padding-top: 10px; }
.game-card-outcome p { font-weight: 600; }
.game-card-actions { flex: 0 0 auto; margin-top: 12px; padding-top: 10px; border-top: 1px solid color-mix(in srgb, var(--card-ink) 15%, transparent); }
@media (max-width: 360px) {
  .game-card { padding: 22px 20px 24px; }
  .game-card-heading { margin: 14px 0 12px; }
}
</style>
