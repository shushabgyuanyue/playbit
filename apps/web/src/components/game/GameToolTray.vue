<script setup lang="ts">
import { standaloneGameCopy as copy } from "@playbit/content";
import type { CardToolId } from "@playbit/shared";
import { Clock3, Hash, Minus, Pause, Play, Plus, RotateCcw, Trophy, X } from "lucide-vue-next";
import type { LocalPlayer } from "../../composables/useStandaloneGameFlow";
import { computed } from "vue";

const props = defineProps<{
  tools: CardToolId[];
  activeTool: CardToolId | null;
  timerSeconds: number;
  timerRunning: boolean;
  counterValue: number;
  players: LocalPlayer[];
  maxPlayers: number;
}>();

const emit = defineEmits<{
  open: [tool: CardToolId];
  close: [];
  toggleTimer: [];
  resetTimer: [];
  changeCounter: [delta: number];
  changeScore: [playerId: string, delta: number];
  updatePlayerLabel: [playerId: string, label: string];
  addPlayer: [];
  removePlayer: [playerId: string];
}>();

const toolMeta: Record<CardToolId, { label: string; icon: typeof Clock3 }> = {
  timer: { label: copy.timer, icon: Clock3 },
  counter: { label: copy.counter, icon: Hash },
  scoreboard: { label: copy.scoreboard, icon: Trophy }
};

const formattedTime = computed(() => {
  const minutes = Math.floor(props.timerSeconds / 60).toString().padStart(2, "0");
  const seconds = (props.timerSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
});
</script>

<template>
  <section class="game-tool-tray" aria-label="现场工具">
    <div class="game-tool-tabs" role="toolbar" :aria-label="copy.tools">
      <button
        v-for="tool in props.tools"
        :key="tool"
        type="button"
        class="game-tool-tab"
        :class="{ 'is-active': props.activeTool === tool }"
        :aria-pressed="props.activeTool === tool"
        @click="emit('open', tool)"
      >
        <component :is="toolMeta[tool].icon" :size="15" aria-hidden="true" />
        <span>{{ toolMeta[tool].label }}</span>
      </button>
    </div>

    <div v-if="props.activeTool" class="game-tool-panel">
      <div class="game-tool-panel-heading">
        <strong>{{ toolMeta[props.activeTool].label }}</strong>
        <button type="button" class="game-tool-close" :aria-label="copy.closeTools" @click="emit('close')"><X :size="17" /></button>
      </div>

      <div v-if="props.activeTool === 'timer'" class="game-tool-timer">
        <strong>{{ formattedTime }}</strong>
        <div class="game-tool-actions">
          <button type="button" class="game-tool-action game-tool-action-primary" @click="emit('toggleTimer')">
            <Pause v-if="props.timerRunning" :size="16" aria-hidden="true" />
            <Play v-else :size="16" aria-hidden="true" />
            {{ props.timerRunning ? copy.pauseTimer : copy.startTimer }}
          </button>
          <button type="button" class="game-tool-action" @click="emit('resetTimer')"><RotateCcw :size="15" aria-hidden="true" />{{ copy.resetTimer }}</button>
        </div>
      </div>

      <div v-else-if="props.activeTool === 'counter'" class="game-tool-counter">
        <button type="button" class="game-tool-round-button" :aria-label="copy.decrement" @click="emit('changeCounter', -1)"><Minus :size="20" /></button>
        <strong>{{ props.counterValue }}</strong>
        <button type="button" class="game-tool-round-button" :aria-label="copy.increment" @click="emit('changeCounter', 1)"><Plus :size="20" /></button>
      </div>

      <div v-else class="game-tool-scoreboard">
        <div v-for="player in props.players" :key="player.id" class="game-score-row">
          <input :value="player.label" :aria-label="player.label" maxlength="12" @input="emit('updatePlayerLabel', player.id, ($event.target as HTMLInputElement).value)" />
          <strong>{{ player.score }}<small>{{ copy.scoreUnit }}</small></strong>
          <button type="button" :aria-label="`${copy.removePlayer}${player.label}`" class="game-score-icon" @click="emit('changeScore', player.id, -1)"><Minus :size="14" /></button>
          <button type="button" :aria-label="`${copy.increment}${player.label}`" class="game-score-icon" @click="emit('changeScore', player.id, 1)"><Plus :size="14" /></button>
          <button v-if="props.players.length > 2" type="button" class="game-score-remove" @click="emit('removePlayer', player.id)">{{ copy.removePlayer }}</button>
        </div>
        <button v-if="props.players.length < props.maxPlayers" type="button" class="game-score-add" @click="emit('addPlayer')"><Plus :size="15" aria-hidden="true" />{{ copy.addPlayer }}</button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.game-tool-tray { display: grid; gap: 8px; width: 100%; }
.game-tool-tabs { display: flex; gap: 7px; overflow-x: auto; padding: 1px 1px 2px; scrollbar-width: none; }
.game-tool-tabs::-webkit-scrollbar { display: none; }
.game-tool-tab { display: inline-flex; min-height: 36px; flex: 0 0 auto; align-items: center; gap: 6px; border: 1px solid var(--pb-line-soft); border-radius: 999px; background: rgba(255, 255, 255, .7); color: var(--pb-text-2); padding: 0 12px; font: inherit; font-size: var(--pb-font-sm); }
.game-tool-tab.is-active { border-color: var(--pb-line-action); background: var(--pb-blue-soft); color: var(--pb-blue); }
.game-tool-panel { display: grid; gap: 12px; border: 1px solid var(--pb-line-soft); border-radius: var(--pb-radius-lg); background: rgba(255, 255, 255, .9); padding: 12px; box-shadow: var(--pb-shadow-panel); }
.game-tool-panel-heading { display: flex; align-items: center; justify-content: space-between; color: var(--pb-text-1); font-size: var(--pb-font-sm); }
.game-tool-close, .game-score-icon { display: inline-grid; width: 32px; height: 32px; place-items: center; border: 0; border-radius: 50%; background: var(--pb-fill-soft); color: var(--pb-text-2); }
.game-tool-timer { display: grid; justify-items: center; gap: 12px; }
.game-tool-timer > strong { color: var(--pb-ink-blue); font-family: var(--pb-font-numeric); font-size: 34px; font-weight: 600; letter-spacing: 1px; }
.game-tool-actions { display: flex; gap: 8px; }
.game-tool-action { display: inline-flex; min-height: 38px; align-items: center; gap: 6px; border: 1px solid var(--pb-line-soft); border-radius: var(--pb-radius-md); background: #fff; color: var(--pb-text-2); padding: 0 12px; font: inherit; font-size: var(--pb-font-sm); }
.game-tool-action-primary { border-color: var(--pb-line-action); background: var(--pb-blue-soft); color: var(--pb-blue); }
.game-tool-counter { display: flex; align-items: center; justify-content: center; gap: 24px; }
.game-tool-counter > strong { min-width: 64px; color: var(--pb-ink-blue); font-family: var(--pb-font-numeric); font-size: 30px; text-align: center; }
.game-tool-round-button { display: inline-grid; width: 40px; height: 40px; place-items: center; border: 1px solid var(--pb-line-soft); border-radius: 50%; background: #fff; color: var(--pb-text-2); }
.game-tool-scoreboard { display: grid; gap: 8px; }
.game-score-row { display: grid; grid-template-columns: minmax(0, 1fr) auto 32px 32px auto; gap: 5px; align-items: center; }
.game-score-row input { min-width: 0; height: 34px; border: 1px solid var(--pb-line-soft); border-radius: var(--pb-radius-md); background: var(--pb-fill-soft); color: var(--pb-text-1); padding: 0 8px; font: inherit; font-size: var(--pb-font-sm); }
.game-score-row strong { min-width: 36px; color: var(--pb-ink-blue); font-family: var(--pb-font-numeric); font-size: var(--pb-font-md); text-align: right; }
.game-score-row small { margin-left: 2px; color: var(--pb-text-3); font-family: var(--pb-font-sans); font-size: 10px; }
.game-score-remove, .game-score-add { border: 0; background: transparent; color: var(--pb-text-3); font: inherit; font-size: 10px; white-space: nowrap; }
.game-score-add { display: inline-flex; align-items: center; gap: 3px; justify-self: start; color: var(--pb-blue); font-size: var(--pb-font-sm); }
@media (max-width: 380px) { .game-score-row { grid-template-columns: minmax(0, 1fr) auto 30px 30px; } .game-score-remove { display: none; } }
</style>
