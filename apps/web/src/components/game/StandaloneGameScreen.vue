<script setup lang="ts">
import { standaloneGameCopy as copy } from "@playbit/content";
import type { Card, CardToolId } from "@playbit/shared";
import { Bookmark, BookmarkCheck, Check, ChevronRight, Circle, RotateCcw, Sparkles } from "lucide-vue-next";
import { computed, ref } from "vue";
import type { LocalPlayResult, LocalPlayer } from "../../composables/useStandaloneGameFlow";
import GameToolTray from "./GameToolTray.vue";
import GameCard from "./GameCard.vue";
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
  timerSeconds: number;
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
  recordWinner: (winnerLabel: string) => void;
  recordRanking: () => void;
  recordCompleted: () => void;
}>();

const emit = defineEmits<{ back: []; home: []; "toggle-favorite": [] }>();
const isVersus = computed(() => props.card?.mode === "versus");
const isRanking = computed(() => Boolean(props.card && props.card.participantMax > 2));
const resultWinner = computed(() => props.result?.kind === "winner" ? props.result.winnerLabel : null);
const ranking = computed(() => props.result?.kind === "ranking" ? props.result.ranking : []);
const resultChooserOpen = ref(false);

function updateLabel(playerId: string, label: string) {
  props.updatePlayerLabel(playerId, label);
}

function openResultChooser() {
  resultChooserOpen.value = true;
}

function recordWinner(label: string) {
  resultChooserOpen.value = false;
  props.recordWinner(label);
}

function recordRanking() {
  resultChooserOpen.value = false;
  props.recordRanking();
}

function recordCompleted() {
  resultChooserOpen.value = false;
  props.recordCompleted();
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
      <div class="standalone-game-meta">
        <span>{{ copy.participantRange(props.card.participantMin, props.card.participantMax) }}</span>
        <span class="standalone-meta-dot" aria-hidden="true" />
        <span>{{ copy.duration(props.card.durationMinutes) }}</span>
        <span v-if="props.phase === 'playing'" class="standalone-live-mark"><Circle :size="8" fill="currentColor" />进行中</span>
      </div>
      <button v-if="props.card.l1Id" type="button" class="standalone-favorite-action" :disabled="props.favoriteBusy" :aria-pressed="props.favorite" @click="emit('toggle-favorite')">
        <BookmarkCheck v-if="props.favorite" :size="15" aria-hidden="true" />
        <Bookmark v-else :size="15" aria-hidden="true" />
        {{ props.favorite ? '已收藏玩法' : '收藏玩法' }}
      </button>

      <div class="standalone-card-frame">
        <GameCard :card="props.card" />
      </div>

      <p v-if="props.phase === 'playing'" class="standalone-game-hint">{{ copy.playingHint }}</p>
      <p v-else class="standalone-game-hint">{{ copy.resultHint }}</p>

      <template v-if="props.phase === 'playing'">
        <div class="standalone-reroll-action" :aria-busy="props.loading">
          <button type="button" class="standalone-secondary-action" :class="{ 'is-loading': props.loading }" :disabled="props.loading" @click="props.reroll"><RotateCcw :size="16" aria-hidden="true" />{{ copy.reroll }}</button>
        </div>
        <GameToolTray
          :tools="props.tools"
          :active-tool="props.activeTool"
          :timer-seconds="props.timerSeconds"
          :timer-running="props.timerRunning"
          :counter-value="props.counterValue"
          :players="props.players"
          :max-players="props.card.participantMax"
          @open="props.openTool"
          @close="props.closeTool"
          @toggle-timer="props.toggleTimer"
          @reset-timer="props.resetTimer"
          @change-counter="props.changeCounter"
          @change-score="props.changeScore"
          @update-player-label="updateLabel"
          @add-player="props.addPlayer"
          @remove-player="props.removePlayer"
        />
        <BaseButton v-if="!resultChooserOpen" size="lg" class="standalone-primary-action standalone-finish-action" @click="openResultChooser">
          <Check :size="17" aria-hidden="true" />{{ copy.finish }}
        </BaseButton>
        <section v-else class="standalone-result-chooser" aria-label="登记本局结果">
          <div class="standalone-chooser-heading">
            <strong>{{ isVersus ? copy.winnerTitle : isRanking ? copy.rankingTitle : copy.completed }}</strong>
            <button type="button" class="standalone-chooser-close" @click="resultChooserOpen = false">×</button>
          </div>
          <div v-if="isVersus" class="standalone-winner-options">
            <button v-for="player in props.players.slice(0, 2)" :key="player.id" type="button" class="standalone-winner-option" @click="recordWinner(player.label)">{{ player.label }}<Check :size="16" /></button>
            <button type="button" class="standalone-winner-option is-draw" @click="recordCompleted">{{ copy.draw }}</button>
          </div>
          <div v-else-if="isRanking" class="standalone-ranking-submit">
            <p>先用记分牌记分，再保存现场排名。</p>
            <button type="button" class="standalone-winner-option" @click="recordRanking">{{ copy.saveResult }}<Check :size="16" /></button>
          </div>
          <button v-else type="button" class="standalone-winner-option" @click="recordCompleted">{{ copy.completed }}<Check :size="16" /></button>
        </section>
      </template>

      <section v-else class="standalone-result-panel" aria-live="polite">
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

    <div v-else class="standalone-game-empty" aria-live="polite">
      <p>{{ props.loading ? copy.loading : copy.emptyCard }}</p>
      <BaseButton v-if="!props.loading" @click="props.reroll">{{ copy.start }}</BaseButton>
    </div>
  </section>
</template>

<style scoped>
.standalone-game-page { background: var(--pb-surface-game-stage); }
.standalone-game-content { display: grid; align-content: start; gap: 10px; flex: 1 0 auto; padding: 10px var(--pb-page-x) calc(22px + env(safe-area-inset-bottom)); }
.standalone-game-meta { display: flex; min-height: 24px; align-items: center; justify-content: center; gap: 8px; color: var(--pb-text-3); font-size: var(--pb-font-xs); }
.standalone-favorite-action { display: inline-flex; min-height: 32px; align-items: center; justify-self: center; gap: 5px; border: 0; background: transparent; color: var(--pb-text-3); padding: 0 8px; font: inherit; font-size: var(--pb-font-xs); }
.standalone-favorite-action[aria-pressed="true"] { color: var(--pb-ink-gold); }
.standalone-meta-dot { width: 3px; height: 3px; border-radius: 50%; background: var(--pb-text-4); }
.standalone-live-mark { display: inline-flex; align-items: center; gap: 4px; color: var(--pb-green); }
.standalone-card-frame { width: min(100%, 390px); margin: 0 auto; }
.standalone-game-hint { margin: 0 auto; color: var(--pb-text-3); font-size: var(--pb-font-sm); line-height: 1.5; text-align: center; }
.standalone-reroll-action { display: flex; justify-content: flex-start; width: min(100%, 390px); margin: 0 auto; }
.standalone-secondary-action, .standalone-result-link { display: inline-flex; min-height: 44px; align-items: center; justify-content: center; gap: 6px; border: 1px solid var(--pb-line-soft); border-radius: var(--pb-radius-md); background: rgba(255, 255, 255, .8); color: var(--pb-text-2); padding: 0 12px; font: inherit; font-size: var(--pb-font-base); }
.standalone-secondary-action:disabled { cursor: wait; opacity: .56; }
.standalone-primary-action { width: 100%; background: var(--pb-action-hero-gradient); box-shadow: var(--pb-shadow-game-action); }
.standalone-finish-action { width: min(100%, 390px); margin: 2px auto 0; background: var(--pb-action-contract-gradient); }
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
</style>
