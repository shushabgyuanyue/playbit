<script setup lang="ts">
import { standaloneGameCopy as copy } from "@playbit/content";
import type { Card, CardToolId } from "@playbit/shared";
import { ChevronRight, Gift, Heart, RotateCcw, Sparkles, Trophy, X } from "lucide-vue-next";
import { computed, ref } from "vue";
import type { LocalPlayResult, LocalPlayer } from "../../composables/useStandaloneGameFlow";
import GameToolTray from "./GameToolTray.vue";
import GameScoreboardDialog from "./GameScoreboardDialog.vue";
import StandaloneGameCertificateDialog from "./StandaloneGameCertificateDialog.vue";
import GameCardStage from "./GameCardStage.vue";
import BaseButton from "../ui/BaseButton.vue";
import LifeServiceHero from "../ui/LifeServiceHero.vue";

type GameCard = Card & { l1Id?: string };

const props = defineProps<{
  card: GameCard | null;
  phase: "playing" | "result";
  tools: CardToolId[];
  activeTool: CardToolId | null;
  players: LocalPlayer[];
  result: LocalPlayResult | null;
  loading: boolean;
  favorite: boolean;
  favoriteBusy: boolean;
  timerMilliseconds: number;
  timerRunning: boolean;
  counterValue: number;
  playAgain: () => void;
  reroll: () => void;
  openTool: (tool: CardToolId) => void;
  closeTool: () => void;
  toggleTimer: () => void;
  resetTimer: () => void;
  changeCounter: (delta: number) => void;
  changeScore: (playerId: string, delta: number) => void;
  updatePlayerLabel: (playerId: string, label: string) => void;
  addPlayer: () => void;
  removePlayer: (playerId: string) => void;
  clearScoreboard: () => void;
  recordWinner: (winnerLabel: string) => void;
  recordRanking: () => void;
  recordCompleted: () => void;
}>();

const emit = defineEmits<{ back: []; home: []; "toggle-favorite": []; "start-settlement": [] }>();
const resultWinner = computed(() => props.result?.kind === "winner" ? props.result.winnerLabel : null);
const ranking = computed(() => props.result?.kind === "ranking" ? props.result.ranking : []);
const stakeOpen = ref(false);
const certificateOpen = ref(false);
const inlineTools = computed(() => props.tools.filter((tool): tool is "timer" | "counter" => tool !== "scoreboard"));
const hasScoreboard = computed(() => props.phase === "playing");
const floatingTool = computed(() => props.activeTool === "timer" || props.activeTool === "counter" ? props.activeTool : null);
const scoreboardOpen = computed(() => hasScoreboard.value && props.activeTool === "scoreboard");

function toggleScoreboard() {
  if (scoreboardOpen.value) props.closeTool();
  else props.openTool("scoreboard");
}

function updateLabel(playerId: string, label: string) {
  props.updatePlayerLabel(playerId, label);
}

function openStake() { stakeOpen.value = true; }
function openSettlement() {
  stakeOpen.value = false;
  emit("start-settlement");
}
function openCertificate() {
  stakeOpen.value = false;
  certificateOpen.value = true;
}
</script>

<template>
  <section class="life-page standalone-game-page">
    <LifeServiceHero
      :eyebrow="copy.eyebrow"
      :title="copy.title"
      :show-back="true"
      :show-home="true"
      :back-label="copy.backToPlay"
      :home-label="'回到首页'"
      @back="emit('back')"
      @home="emit('home')"
    />

    <div v-if="props.card" class="standalone-game-content">
      <div class="standalone-card-frame">
        <GameCardStage :card="props.card" :loading="props.loading">
          <template #top-actions>
            <GameToolTray
              v-if="props.phase === 'playing' && inlineTools.length"
              :tools="inlineTools"
              :active-tool="floatingTool"
              :timer-milliseconds="props.timerMilliseconds"
              :timer-running="props.timerRunning"
              :counter-value="props.counterValue"
              @open="props.openTool"
              @close="props.closeTool"
              @toggle-timer="props.toggleTimer"
              @reset-timer="props.resetTimer"
              @change-counter="props.changeCounter"
            />
            <button
              v-if="props.card.l1Id"
              type="button"
              class="standalone-favorite-action"
              :disabled="props.favoriteBusy"
              :aria-pressed="props.favorite"
               :aria-label="props.favorite ? copy.unlikeCard : copy.likeCard"
               :title="props.favorite ? copy.unlikeCard : copy.likeCard"
               @click="emit('toggle-favorite')"
             >
               <Heart :size="14" :fill="props.favorite ? 'currentColor' : 'none'" aria-hidden="true" />
            </button>
          </template>
          <template #actions>
            <div v-if="props.phase === 'playing'" class="standalone-card-actions">
              <button type="button" class="standalone-card-action" :disabled="props.loading" @click="props.reroll">
                <RotateCcw :size="15" aria-hidden="true" />{{ copy.reroll }}
              </button>
              <button type="button" class="standalone-card-action is-primary" :disabled="props.loading" @click="props.playAgain">
                <Sparkles :size="15" aria-hidden="true" />{{ copy.playAgain }}
              </button>
            </div>
          </template>
        </GameCardStage>
      </div>

      <p v-if="props.phase === 'result'" class="standalone-game-hint">{{ copy.resultHint }}</p>
      <p v-else class="standalone-game-hint standalone-game-product-line">{{ copy.playingHint }}</p>

      <section v-if="props.phase === 'playing'" class="standalone-bottom-actions" aria-label="本局操作">
        <button type="button" class="standalone-bottom-action is-stake" :aria-expanded="stakeOpen" aria-controls="standalone-stake-dialog" @click="openStake">
          <Gift :size="16" aria-hidden="true" />{{ copy.finish }}
        </button>
        <button type="button" class="standalone-bottom-action is-scoreboard" :aria-pressed="scoreboardOpen" @click="toggleScoreboard">
          <Trophy :size="16" aria-hidden="true" />{{ copy.scoreboard }}
        </button>
      </section>

      <section v-if="props.phase === 'result'" class="standalone-result-panel" aria-live="polite">
        <div class="standalone-result-kicker"><Sparkles :size="15" aria-hidden="true" />{{ copy.resultRecorded }}</div>
        <h2>{{ copy.certificate }}</h2>
        <template v-if="resultWinner">
          <p class="standalone-result-winner">{{ resultWinner }} <span>胜出</span></p>
        </template>
        <template v-else-if="ranking.length">
          <p class="standalone-result-title">{{ copy.rankingTitle }}</p>
          <ol class="standalone-ranking">
            <li v-for="(player, index) in ranking" :key="player.id">
              <span class="standalone-ranking-index">{{ index + 1 }}</span>
              <span>{{ player.label }}</span>
              <strong>{{ player.score }}<small>{{ copy.scoreUnit }}</small></strong>
            </li>
          </ol>
        </template>
        <p v-else class="standalone-result-winner">{{ copy.completed }}</p>
        <p class="standalone-certificate-note">{{ copy.certificateNote }}</p>
        <div class="standalone-result-actions">
          <button type="button" class="standalone-secondary-action" :disabled="props.loading" @click="props.playAgain">{{ copy.playAgain }}</button>
          <button type="button" class="standalone-result-link" @click="emit('home')">回到首页<ChevronRight :size="16" aria-hidden="true" /></button>
        </div>
      </section>
    </div>

    <Teleport to="body">
      <div v-if="stakeOpen" class="standalone-stake-overlay" @click.self="stakeOpen = false">
        <section id="standalone-stake-dialog" class="standalone-stake-dialog" role="dialog" aria-modal="true" aria-label="添个彩头">
          <div class="standalone-sheet-grip" aria-hidden="true" />
          <header class="standalone-stake-heading">
            <div>
              <span class="standalone-stake-kicker"><Gift :size="14" />{{ copy.stakeTitle }}</span>
              <h2>{{ copy.stakeTitle }}</h2>
            </div>
            <button type="button" class="standalone-stake-close" aria-label="关闭" @click="stakeOpen = false"><X :size="17" /></button>
          </header>
          <p class="standalone-stake-copy">{{ copy.stakeHint }}</p>
          <div class="standalone-stake-note"><span>线下约定彩头</span><ChevronRight :size="13" /><span>系统记录结果</span><ChevronRight :size="13" /><span>需要时再结算</span></div>
          <div class="standalone-stake-actions">
            <button type="button" class="standalone-stake-action is-main" @click="openSettlement">{{ copy.startSettlement }}<ChevronRight :size="16" /></button>
            <button type="button" class="standalone-stake-action" @click="openCertificate">{{ copy.openCertificate }}<Trophy :size="15" /></button>
          </div>
          <p class="standalone-stake-footnote">只有确认创建权益卡券时才需要登录。</p>
        </section>
      </div>
    </Teleport>

    <GameScoreboardDialog
      :open="scoreboardOpen"
      :players="props.players"
      :max-players="8"
      @close="props.closeTool"
      @change-score="props.changeScore"
      @update-player-label="updateLabel"
      @add-player="props.addPlayer"
      @remove-player="props.removePlayer"
      @clear="props.clearScoreboard"
    />

    <StandaloneGameCertificateDialog :open="certificateOpen" :players="props.players" @close="certificateOpen = false" />

    <div v-if="!props.card" class="standalone-game-empty" aria-live="polite">
      <p>{{ props.loading ? copy.loading : copy.emptyCard }}</p>
      <BaseButton v-if="!props.loading" @click="props.reroll">{{ copy.start }}</BaseButton>
    </div>
  </section>
</template>

<style scoped>
.standalone-game-page { background: #f7f9fc; }
.standalone-game-page :deep(.life-service-hero) { border-bottom-color: rgba(218, 225, 234, .84); background: rgba(255, 255, 255, .86); }
.standalone-game-content { display: grid; width: min(100%, 480px); align-content: start; gap: 12px; flex: 1 0 auto; margin: 0 auto; padding: 12px var(--pb-page-x) calc(22px + env(safe-area-inset-bottom)); }
.standalone-favorite-action { display: inline-grid; width: 28px; height: 28px; place-items: center; border: 1px solid color-mix(in srgb, var(--card-ink) 22%, transparent); border-radius: 50%; background: rgba(255, 255, 255, .58); color: var(--card-ink); padding: 0; }
.standalone-favorite-action[aria-pressed="true"] { border-color: color-mix(in srgb, var(--card-ink) 40%, transparent); background: color-mix(in srgb, var(--card-ink) 10%, white); }
.standalone-card-frame { width: min(100%, 390px); margin: 0 auto; padding-top: 2px; }
.standalone-card-frame :deep(.game-card-stage) { width: 100%; max-width: 360px; margin: 0 auto; }
.standalone-card-frame :deep(.game-card-top-actions) { align-items: flex-start; gap: 6px; }
.standalone-card-frame :deep(.game-tool-tray) { width: auto; margin-left: auto; }
.standalone-card-frame :deep(.game-card-tool-actions) { min-height: 28px; margin: -2px 0 0; }
.standalone-card-frame :deep(.game-card-tool-button) { min-height: 28px; padding: 0 8px; }
.standalone-game-hint { position: relative; z-index: 2; margin: 0 auto; color: var(--pb-text-2); font-size: var(--pb-font-sm); line-height: 1.5; text-align: center; }
.standalone-game-product-line { padding: 0 8px; font-size: var(--pb-font-xs); font-weight: 500; }
.standalone-bottom-actions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; width: min(100%, 390px); margin: 4px auto 0; }
.standalone-bottom-action { display: inline-flex; min-height: 43px; align-items: center; justify-content: center; gap: 6px; border: 1px solid rgba(128, 145, 164, .25); border-radius: 12px; background: rgba(255, 255, 255, .66); color: var(--pb-text-2); padding: 0 10px; font: inherit; font-size: var(--pb-font-sm); font-weight: 600; box-shadow: 0 3px 10px rgba(22, 47, 75, .045); transition: border-color 160ms ease, background 160ms ease, transform 160ms ease; }
.standalone-bottom-action.is-stake { color: #916017; }
.standalone-bottom-action.is-scoreboard { color: var(--pb-blue); }
.standalone-bottom-action[aria-pressed="true"], .standalone-bottom-action[aria-expanded="true"] { border-color: rgba(145, 111, 48, .38); background: #fffdf7; color: #916017; }
.standalone-bottom-action:active { transform: translateY(1px); }
.standalone-stake-overlay { position: fixed; inset: 0; z-index: 110; display: flex; align-items: flex-end; justify-content: center; background: rgba(26, 41, 59, .28); padding: 14px 14px calc(14px + env(safe-area-inset-bottom)); backdrop-filter: blur(5px); animation: standalone-overlay-in 180ms ease-out both; }
.standalone-stake-dialog { position: relative; display: grid; gap: 12px; width: min(100%, 460px); border: 1px solid rgba(172, 132, 70, .28); border-radius: 22px; background: #fffdf8; padding: 15px 16px calc(16px + env(safe-area-inset-bottom)); box-shadow: 0 24px 70px rgba(34, 50, 71, .22); animation: standalone-sheet-in 260ms cubic-bezier(.2, .8, .25, 1.05) both; }
.standalone-sheet-grip { width: 38px; height: 4px; margin: -4px auto 1px; border-radius: 999px; background: #d6c7ab; }
.standalone-stake-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
.standalone-stake-heading h2 { margin: 3px 0 0; color: var(--pb-text-1); font-family: var(--pb-font-serif); font-size: 21px; }
.standalone-stake-kicker { display: inline-flex; align-items: center; gap: 5px; color: var(--pb-ink-gold); font-size: var(--pb-font-xs); font-weight: 700; }
.standalone-stake-close { display: inline-grid; width: 29px; height: 29px; place-items: center; border: 0; border-radius: 50%; background: var(--pb-fill-soft); color: var(--pb-text-2); }
.standalone-stake-copy { margin: 0; color: var(--pb-text-2); font-size: var(--pb-font-sm); line-height: 1.6; }
.standalone-stake-note { display: flex; align-items: center; flex-wrap: wrap; gap: 4px; border-top: 1px solid rgba(184, 155, 101, .2); border-bottom: 1px solid rgba(184, 155, 101, .2); padding: 10px 0; color: #937144; font-size: var(--pb-font-xs); }
.standalone-stake-note svg { color: #c6a86f; }
.standalone-stake-actions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 7px; }
.standalone-stake-action { display: inline-flex; min-height: 42px; align-items: center; justify-content: center; gap: 4px; border: 1px solid rgba(145, 111, 48, .3); border-radius: 10px; background: transparent; color: #916017; padding: 0 7px; font: inherit; font-size: var(--pb-font-xs); font-weight: 700; }
.standalone-stake-action.is-main { border-color: #a66d1e; background: #a66d1e; color: #fff; box-shadow: 0 4px 10px rgba(166, 109, 30, .16); }
.standalone-stake-footnote { margin: -2px 0 0; color: var(--pb-text-3); font-size: 10px; line-height: 1.45; }
.standalone-card-actions { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 8px; }
.standalone-card-action { display: inline-flex; min-height: 40px; align-items: center; justify-content: center; gap: 5px; border: 1px solid color-mix(in srgb, var(--card-ink) 20%, transparent); border-radius: var(--pb-radius-md); background: rgba(255, 255, 255, .72); color: var(--card-ink); padding: 0 9px; font: inherit; font-size: var(--pb-font-sm); font-weight: 600; }
.standalone-card-action.is-primary { border-color: var(--card-ink); background: var(--card-ink); color: #fff; }
.standalone-card-action:disabled { cursor: wait; opacity: .56; }
.standalone-secondary-action, .standalone-result-link { display: inline-flex; min-height: 44px; align-items: center; justify-content: center; gap: 6px; border: 1px solid var(--pb-line-soft); border-radius: var(--pb-radius-md); background: rgba(255, 255, 255, .8); color: var(--pb-text-2); padding: 0 12px; font: inherit; font-size: var(--pb-font-base); }
.standalone-secondary-action:disabled { cursor: wait; opacity: .56; }
.standalone-result-chooser { display: grid; gap: 10px; width: min(100%, 390px); margin: 2px auto 0; border: 1px solid var(--pb-line-soft); border-radius: var(--pb-radius-lg); background: rgba(255, 255, 255, .92); padding: 12px; box-shadow: var(--pb-shadow-panel); }
.standalone-chooser-heading { display: flex; align-items: center; justify-content: space-between; color: var(--pb-text-1); font-size: var(--pb-font-sm); }
.standalone-chooser-close { display: inline-grid; width: 28px; height: 28px; place-items: center; border: 0; border-radius: 50%; background: var(--pb-fill-soft); color: var(--pb-text-2); font-size: 20px; }
.standalone-winner-options { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.standalone-winner-option { display: inline-flex; min-height: 42px; align-items: center; justify-content: center; gap: 6px; border: 1px solid var(--pb-line-action); border-radius: var(--pb-radius-md); background: var(--pb-blue-soft); color: var(--pb-blue); padding: 0 10px; font: inherit; font-size: var(--pb-font-base); }
.standalone-winner-option.is-draw { grid-column: 1 / -1; border-color: var(--pb-line-soft); background: var(--pb-fill-soft); color: var(--pb-text-2); }
.standalone-ranking-submit { display: grid; gap: 8px; }
.standalone-ranking-submit p { margin: 0; color: var(--pb-text-3); font-size: var(--pb-font-xs); }
.standalone-ranking-submit .standalone-winner-option { width: 100%; }
.standalone-result-panel { display: grid; gap: 10px; width: min(100%, 390px); margin: 2px auto 0; border: 1px solid rgba(189, 148, 83, .22); border-radius: var(--pb-radius-lg); background: linear-gradient(145deg, #fffefa, #fff, #f8fbff); padding: 16px; box-shadow: var(--pb-shadow-panel); text-align: center; }
.standalone-result-kicker { display: inline-flex; align-items: center; justify-content: center; gap: 5px; color: var(--pb-ink-gold); font-size: var(--pb-font-xs); font-weight: var(--pb-weight-semibold); }
.standalone-result-panel h2 { margin: 0; color: var(--pb-text-1); font-family: var(--pb-font-serif); font-size: 23px; font-weight: 600; }
.standalone-result-winner { margin: 0; color: var(--pb-ink-coral); font-size: 20px; font-weight: var(--pb-weight-bold); }
.standalone-result-winner span { color: var(--pb-text-2); font-size: var(--pb-font-base); font-weight: var(--pb-weight-regular); }
.standalone-result-title { margin: 0; color: var(--pb-text-2); font-size: var(--pb-font-sm); }
.standalone-ranking { display: grid; gap: 6px; margin: 0; padding: 0; list-style: none; text-align: left; }
.standalone-ranking li { display: grid; grid-template-columns: 24px minmax(0, 1fr) auto; gap: 8px; align-items: center; border-bottom: 1px solid var(--pb-line-soft); padding: 6px 0; color: var(--pb-text-1); font-size: var(--pb-font-base); }
.standalone-ranking-index { color: var(--pb-ink-gold); font-family: var(--pb-font-numeric); text-align: center; }
.standalone-ranking strong { color: var(--pb-ink-blue); font-family: var(--pb-font-numeric); }
.standalone-ranking small { margin-left: 2px; color: var(--pb-text-3); font-family: var(--pb-font-sans); font-size: 10px; }
.standalone-certificate-note { margin: 0; color: var(--pb-text-3); font-size: var(--pb-font-xs); line-height: 1.5; }
.standalone-result-actions { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 8px; }
.standalone-result-link { border-color: transparent; background: transparent; color: var(--pb-blue); }
.standalone-game-empty { display: grid; flex: 1; place-items: center; align-content: center; gap: 14px; padding: 24px; color: var(--pb-text-3); }
.standalone-game-empty p { margin: 0; }
@media (max-height: 720px) { .standalone-game-content { gap: 7px; padding-top: 5px; } .standalone-card-frame { width: min(100%, 350px); } }
@media (min-width: 720px) {
  .standalone-stake-overlay { align-items: center; padding: 24px; }
  .standalone-stake-dialog { border-radius: 24px; padding-bottom: 16px; }
}
@keyframes standalone-overlay-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes standalone-sheet-in { from { opacity: 0; transform: translateY(22px); } to { opacity: 1; transform: translateY(0); } }
@media (prefers-reduced-motion: reduce) {
  .standalone-stake-overlay, .standalone-stake-dialog { animation: none; }
  .standalone-bottom-action { transition: none; }
}
</style>
