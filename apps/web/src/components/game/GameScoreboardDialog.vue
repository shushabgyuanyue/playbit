<script setup lang="ts">
import { standaloneGameCopy as copy } from "@playbit/content";
import { Minus, Plus, Trophy, X } from "lucide-vue-next";
import type { LocalPlayer } from "../../composables/useStandaloneGameFlow";

defineProps<{
  open: boolean;
  players: LocalPlayer[];
  maxPlayers: number;
}>();

const emit = defineEmits<{
  close: [];
  changeScore: [playerId: string, delta: number];
  updatePlayerLabel: [playerId: string, label: string];
  addPlayer: [];
  removePlayer: [playerId: string];
  clear: [];
}>();
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="game-scoreboard-overlay" @click.self="emit('close')">
      <section class="game-scoreboard-dialog" role="dialog" aria-modal="true" :aria-label="copy.scoreboard">
        <header class="game-scoreboard-heading">
          <div class="game-scoreboard-title"><Trophy :size="18" aria-hidden="true" /><strong>{{ copy.scoreboard }}</strong></div>
          <button type="button" class="game-scoreboard-close" :aria-label="copy.closeTools" @click="emit('close')"><X :size="18" /></button>
        </header>
        <p class="game-scoreboard-note">积分会跨卡保留，直到你手动清空。</p>
        <div class="game-scoreboard-list">
          <div v-for="player in players" :key="player.id" class="game-score-row">
            <input
              :value="player.label"
              :aria-label="player.label"
              maxlength="12"
              @input="emit('updatePlayerLabel', player.id, ($event.target as HTMLInputElement).value)"
            />
            <strong>{{ player.score }}<small>{{ copy.scoreUnit }}</small></strong>
            <button type="button" class="game-score-icon" :aria-label="copy.decrement + player.label" @click="emit('changeScore', player.id, -1)"><Minus :size="15" /></button>
            <button type="button" class="game-score-icon" :aria-label="copy.increment + player.label" @click="emit('changeScore', player.id, 1)"><Plus :size="15" /></button>
            <button v-if="players.length > 2" type="button" class="game-score-remove" :aria-label="copy.removePlayer + player.label" @click="emit('removePlayer', player.id)"><X :size="14" /></button>
          </div>
          <button v-if="players.length < maxPlayers" type="button" class="game-score-add" @click="emit('addPlayer')"><Plus :size="15" aria-hidden="true" />{{ copy.addPlayer }}</button>
        </div>
        <button type="button" class="game-scoreboard-clear" @click="emit('clear')">{{ copy.clearScoreboard }}</button>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.game-scoreboard-overlay { position: fixed; inset: 0; z-index: 100; display: grid; place-items: center; background: rgba(28, 43, 62, .28); padding: 20px; backdrop-filter: blur(3px); }
.game-scoreboard-dialog { width: min(420px, 100%); border: 1px solid var(--pb-line-soft); border-radius: 16px; background: var(--pb-surface-panel); padding: 16px; box-shadow: 0 24px 70px rgba(21, 42, 70, .22); }
.game-scoreboard-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 13px; }
.game-scoreboard-title { display: inline-flex; align-items: center; gap: 7px; color: var(--pb-blue); font-size: var(--pb-font-md); }
.game-scoreboard-note { margin: -5px 0 12px; color: var(--pb-text-3); font-size: var(--pb-font-xs); line-height: 1.5; }
.game-scoreboard-close { display: inline-grid; width: 32px; height: 32px; place-items: center; border: 0; border-radius: 50%; background: var(--pb-fill-soft); color: var(--pb-text-2); }
.game-scoreboard-list { display: grid; gap: 8px; }
.game-score-row { display: grid; grid-template-columns: minmax(0, 1fr) auto 34px 34px auto; gap: 6px; align-items: center; }
.game-score-row input { min-width: 0; height: 36px; border: 1px solid var(--pb-line-soft); border-radius: var(--pb-radius-md); background: var(--pb-fill-soft); color: var(--pb-text-1); padding: 0 9px; font: inherit; font-size: var(--pb-font-sm); }
.game-score-row strong { min-width: 38px; color: var(--pb-ink-blue); font-family: var(--pb-font-numeric); font-size: var(--pb-font-md); text-align: right; }
.game-score-row small { margin-left: 2px; color: var(--pb-text-3); font-family: var(--pb-font-sans); font-size: 10px; }
.game-score-icon, .game-score-remove { display: inline-grid; width: 30px; height: 30px; place-items: center; border: 0; border-radius: 50%; background: var(--pb-fill-soft); color: var(--pb-text-2); }
.game-score-remove { background: transparent; color: var(--pb-text-3); }
.game-score-add { display: inline-flex; min-height: 32px; align-items: center; gap: 4px; border: 0; background: transparent; color: var(--pb-blue); padding: 0 3px; font: inherit; font-size: var(--pb-font-sm); }
.game-scoreboard-clear { justify-self: start; margin-top: 6px; border: 0; background: transparent; color: var(--pb-text-3); padding: 3px 0; font: inherit; font-size: var(--pb-font-xs); text-decoration: underline; text-underline-offset: 3px; }
@media (max-width: 380px) { .game-scoreboard-overlay { padding: 12px; } .game-score-row { grid-template-columns: minmax(0, 1fr) auto 30px 30px auto; gap: 4px; } }
</style>
