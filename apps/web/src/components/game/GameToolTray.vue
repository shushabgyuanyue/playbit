<script setup lang="ts">
import { standaloneGameCopy as copy } from "@playbit/content";
import type { CardToolId } from "@playbit/shared";
import { Clock3, GripVertical, Hash, Minus, Pause, Play, Plus, RotateCcw, X } from "lucide-vue-next";
import { computed, nextTick, ref, watch } from "vue";

type InlineToolId = Exclude<CardToolId, "scoreboard">;

const props = defineProps<{
  tools: InlineToolId[];
  activeTool: InlineToolId | null;
  timerMilliseconds: number;
  timerRunning: boolean;
  counterValue: number;
}>();

const emit = defineEmits<{
  open: [tool: InlineToolId];
  close: [];
  toggleTimer: [];
  resetTimer: [];
  changeCounter: [delta: number];
}>();

const toolMeta: Record<InlineToolId, { label: string; icon: typeof Clock3 }> = {
  timer: { label: copy.timer, icon: Clock3 },
  counter: { label: copy.counter, icon: Hash }
};

const formattedTime = computed(() => {
  const minutes = Math.floor(props.timerMilliseconds / 60000).toString().padStart(2, "0");
  const seconds = Math.floor(props.timerMilliseconds / 1000 % 60).toString().padStart(2, "0");
  const milliseconds = (props.timerMilliseconds % 1000).toString().padStart(3, "0");
  return minutes + ":" + seconds + "." + milliseconds;
});

const panelRef = ref<HTMLElement | null>(null);
const panelPosition = ref({ left: 0, top: 0 });
const hasPosition = ref(false);
const dragState = ref<{ pointerId: number; offsetX: number; offsetY: number } | null>(null);

const panelStyle = computed(() => hasPosition.value
  ? { left: panelPosition.value.left + "px", top: panelPosition.value.top + "px" }
  : { right: "16px", top: "112px" });

function clampPosition(left: number, top: number) {
  const width = panelRef.value?.offsetWidth ?? 208;
  const height = panelRef.value?.offsetHeight ?? 116;
  const maxLeft = Math.max(12, window.innerWidth - width - 12);
  const maxTop = Math.max(72, window.innerHeight - height - 12);
  return {
    left: Math.min(Math.max(12, left), maxLeft),
    top: Math.min(Math.max(72, top), maxTop)
  };
}

function placePanel() {
  const width = panelRef.value?.offsetWidth ?? 208;
  panelPosition.value = clampPosition(window.innerWidth - width - 16, 112);
  hasPosition.value = true;
}

function beginDrag(event: PointerEvent) {
  if ((event.target as HTMLElement).closest("button")) return;
  const panel = panelRef.value;
  if (!panel) return;
  const rect = panel.getBoundingClientRect();
  dragState.value = {
    pointerId: event.pointerId,
    offsetX: event.clientX - rect.left,
    offsetY: event.clientY - rect.top
  };
  (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
}

function moveDrag(event: PointerEvent) {
  if (!dragState.value || dragState.value.pointerId !== event.pointerId) return;
  panelPosition.value = clampPosition(
    event.clientX - dragState.value.offsetX,
    event.clientY - dragState.value.offsetY
  );
  hasPosition.value = true;
}

function endDrag(event: PointerEvent) {
  if (dragState.value?.pointerId === event.pointerId) dragState.value = null;
}

function chooseTool(tool: InlineToolId) {
  emit("open", tool);
}

watch(() => props.activeTool, (tool) => {
  if (!tool) return;
  void nextTick(() => {
    if (!hasPosition.value) placePanel();
  });
});
</script>

<template>
  <section v-if="props.tools.length" class="game-tool-tray" aria-label="卡片工具">
    <div class="game-card-tool-actions">
      <button
        v-for="tool in props.tools"
        :key="tool"
        type="button"
        class="game-card-tool-button"
        :class="{ 'is-active': props.activeTool === tool }"
        :aria-pressed="props.activeTool === tool"
        @click="chooseTool(tool)"
      >
        <component :is="toolMeta[tool].icon" :size="14" aria-hidden="true" />
        <span>{{ toolMeta[tool].label }}</span>
      </button>
    </div>

    <div
      v-if="props.activeTool"
      ref="panelRef"
      class="game-tool-panel"
      role="dialog"
      :aria-label="toolMeta[props.activeTool].label"
      :style="panelStyle"
      @pointermove="moveDrag"
      @pointerup="endDrag"
      @pointercancel="endDrag"
    >
      <div class="game-tool-panel-heading" @pointerdown="beginDrag">
        <div class="game-tool-panel-title">
          <GripVertical :size="14" aria-hidden="true" />
          <component :is="toolMeta[props.activeTool].icon" :size="15" aria-hidden="true" />
          <strong>{{ toolMeta[props.activeTool].label }}</strong>
        </div>
        <button type="button" class="game-tool-close" :aria-label="copy.closeTools" @click="emit('close')"><X :size="16" /></button>
      </div>

      <div v-if="props.activeTool === 'timer'" class="game-tool-timer">
        <strong>{{ formattedTime }}</strong>
        <div class="game-tool-actions">
          <button
            type="button"
            class="game-tool-action game-tool-action-primary"
            :aria-label="props.timerRunning ? copy.pauseTimer : copy.startTimer"
            :title="props.timerRunning ? copy.pauseTimer : copy.startTimer"
            @click="emit('toggleTimer')"
          >
            <Pause v-if="props.timerRunning" :size="15" aria-hidden="true" />
            <Play v-else :size="15" aria-hidden="true" />
          </button>
          <button type="button" class="game-tool-action" :aria-label="copy.resetTimer" :title="copy.resetTimer" @click="emit('resetTimer')"><RotateCcw :size="15" aria-hidden="true" /></button>
        </div>
      </div>

      <div v-else class="game-tool-counter">
        <button type="button" class="game-tool-round-button" :aria-label="copy.decrement" :title="copy.decrement" @click="emit('changeCounter', -1)"><Minus :size="17" /></button>
        <strong>{{ props.counterValue }}</strong>
        <button type="button" class="game-tool-round-button" :aria-label="copy.increment" :title="copy.increment" @click="emit('changeCounter', 1)"><Plus :size="17" /></button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.game-tool-tray { position: relative; z-index: 2; width: 100%; pointer-events: none; }
.game-card-tool-actions { display: flex; justify-content: flex-end; gap: 6px; min-height: 32px; margin: 0 0 7px; pointer-events: auto; }
.game-card-tool-button { display: inline-flex; min-height: 32px; align-items: center; gap: 5px; border: 1px solid var(--pb-line-soft); border-radius: 999px; background: rgba(255, 255, 255, .88); color: var(--pb-text-2); padding: 0 9px; font: inherit; font-size: var(--pb-font-xs); box-shadow: 0 4px 12px rgba(42, 57, 78, .06); backdrop-filter: blur(8px); }
.game-card-tool-button.is-active { border-color: var(--pb-line-action); background: var(--pb-blue-soft); color: var(--pb-blue); }
.game-tool-panel { position: fixed; z-index: 60; display: grid; gap: 9px; width: min(208px, calc(100vw - 24px)); border: 1px solid var(--pb-line-soft); border-radius: 12px; background: rgba(255, 255, 255, .97); padding: 9px; box-shadow: 0 12px 30px rgba(27, 49, 78, .16); pointer-events: auto; backdrop-filter: blur(14px); }
.game-tool-panel-heading { display: flex; min-height: 24px; align-items: center; justify-content: space-between; gap: 8px; cursor: move; touch-action: none; user-select: none; }
.game-tool-panel-title { display: inline-flex; min-width: 0; align-items: center; gap: 5px; color: var(--pb-blue); font-size: var(--pb-font-xs); }
.game-tool-panel-title > svg:first-child { color: var(--pb-text-4); }
.game-tool-close, .game-tool-action, .game-tool-round-button { display: inline-grid; place-items: center; border: 1px solid var(--pb-line-soft); background: var(--pb-fill-soft); color: var(--pb-text-2); }
.game-tool-close { width: 27px; height: 27px; border: 0; border-radius: 50%; }
.game-tool-timer { display: grid; justify-items: center; gap: 8px; }
.game-tool-timer > strong { color: var(--pb-ink-blue); font-family: var(--pb-font-numeric); font-size: 25px; font-weight: 600; letter-spacing: .4px; line-height: 1.1; }
.game-tool-actions { display: flex; gap: 6px; }
.game-tool-action { width: 32px; height: 30px; border-radius: 8px; }
.game-tool-action-primary { border-color: var(--pb-line-action); background: var(--pb-blue-soft); color: var(--pb-blue); }
.game-tool-counter { display: flex; align-items: center; justify-content: center; gap: 17px; }
.game-tool-counter > strong { min-width: 42px; color: var(--pb-ink-blue); font-family: var(--pb-font-numeric); font-size: 27px; text-align: center; }
.game-tool-round-button { width: 32px; height: 32px; border-radius: 50%; background: #fff; }
@media (max-width: 380px) { .game-tool-panel { width: min(194px, calc(100vw - 24px)); } }
</style>
