import { drawCard as drawLocalCard } from "@playbit/cards";
import type { Card, CardToolId, DeliveredContentCard, GameEventName } from "@playbit/shared";
import { computed, onUnmounted, ref, type Ref } from "vue";
import type { Screen } from "../types/screen";

export type LocalPlayer = { id: string; label: string; score: number };
export type LocalPlayResult =
  | { kind: "winner"; winnerLabel: string }
  | { kind: "ranking"; ranking: LocalPlayer[] }
  | { kind: "completed"; note?: string };

type StandaloneGameFlowOptions = {
  recordEvent?: (eventName: GameEventName, input: { sessionId: string; cardId: string; payload?: Record<string, unknown> }) => unknown;
  drawRecommendedCard?: (previousIds: string[], preferredL1Id?: string) => Promise<DeliveredContentCard | Card | null>;
  isFavorite?: (l1Id: string) => boolean;
  setFavorite?: (l1Id: string, favorite: boolean) => Promise<void>;
};

type PlayableCard = Card & Partial<Pick<DeliveredContentCard, "l1Id">>;

const toolIds: CardToolId[] = ["timer", "counter", "scoreboard"];

function inferTools(card: Card): CardToolId[] {
  if (card.tools?.length) return card.tools;
  const inferred: CardToolId[] = [];
  if (card.durationMinutes) inferred.push("timer");
  if (card.mode === "versus") inferred.push("counter");
  if (card.participantMax > 2) inferred.push("scoreboard");
  return inferred.length ? inferred : ["timer"];
}

function createPlayers(card: Card): LocalPlayer[] {
  const count = card.mode === "versus" ? 2 : Math.min(Math.max(card.participantMin, 2), 4);
  return Array.from({ length: count }, (_, index) => ({
    id: `player-${index + 1}`,
    label: card.mode === "versus" ? `玩家 ${index === 0 ? "A" : "B"}` : `玩家 ${index + 1}`,
    score: 0
  }));
}

function makeSessionId() {
  return `session_${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}_${Math.random().toString(36).slice(2)}`}`;
}

export function useStandaloneGameFlow(screen: Ref<Screen>, options: StandaloneGameFlowOptions = {}) {
  const card = ref<PlayableCard | null>(null);
  const phase = ref<"playing" | "result">("playing");
  const activeTool = ref<CardToolId | null>(null);
  const previousCardIds = ref<string[]>([]);
  const players = ref<LocalPlayer[]>([]);
  const result = ref<LocalPlayResult | null>(null);
  const startedAt = ref<string | null>(null);
  const completedAt = ref<string | null>(null);
  const sessionId = ref("");
  const loading = ref(false);
  const favorite = ref(false);
  const favoriteBusy = ref(false);
  const timerSeconds = ref(0);
  const timerRunning = ref(false);
  const counterValue = ref(0);
  let timerHandle: number | undefined;
  let drawRevision = 0;

  const tools = computed(() => card.value ? inferTools(card.value) : toolIds);
  const hasCard = computed(() => Boolean(card.value));

  function clearTimer() {
    if (timerHandle !== undefined) {
      window.clearInterval(timerHandle);
      timerHandle = undefined;
    }
    timerRunning.value = false;
  }

  function resetLocalState(nextCard: PlayableCard) {
    clearTimer();
    card.value = nextCard;
    phase.value = "playing";
    activeTool.value = null;
    players.value = createPlayers(nextCard);
    result.value = null;
    startedAt.value = new Date().toISOString();
    completedAt.value = null;
    sessionId.value = makeSessionId();
    timerSeconds.value = 0;
    counterValue.value = 0;
    favorite.value = Boolean(nextCard.l1Id && options.isFavorite?.(nextCard.l1Id));
  }

  function recordEvent(eventName: GameEventName, cardId: string, payload?: Record<string, unknown>) {
    if (!options.recordEvent || !sessionId.value) return;
    options.recordEvent(eventName, { sessionId: sessionId.value, cardId, ...(payload ? { payload } : {}) });
  }

  async function drawNext(reason: "draw" | "reroll" | "play_again" = "draw") {
    const revision = ++drawRevision;
    const previousCard = card.value;
    loading.value = true;
    let next: Card | null = null;

    if (options.drawRecommendedCard) {
      try {
        const preferredL1Id = reason === "play_again" ? previousCard?.l1Id : undefined;
        next = await options.drawRecommendedCard(previousCardIds.value, preferredL1Id);
      } catch {
        next = null;
      }
    }

    if (!next) next = drawLocalCard(previousCardIds.value);
    if (revision !== drawRevision) return null;

    previousCardIds.value = [...previousCardIds.value, next.id].slice(-8);
    if (reason === "reroll" && previousCard) {
      recordEvent("rerolled", previousCard.id, { toCardId: next.id, action: "switch_l1" });
    }
    resetLocalState(next);
    recordEvent("exposed", next.id, {
      reason,
      action: reason === "play_again" ? "replay_same_l1" : reason === "reroll" ? "switch_l1" : "initial_draw"
    });
    recordEvent("started", next.id, { reason });
    loading.value = false;
    return next;
  }

  function open(nextCard?: PlayableCard) {
    drawRevision += 1;
    loading.value = false;
    if (nextCard) {
      previousCardIds.value = previousCardIds.value.includes(nextCard.id)
        ? previousCardIds.value
        : [...previousCardIds.value, nextCard.id].slice(-8);
      resetLocalState(nextCard);
      recordEvent("exposed", nextCard.id, { reason: "featured" });
      recordEvent("started", nextCard.id, { reason: "featured" });
    } else if (!card.value) {
      screen.value = "play";
      void drawNext();
      return;
    } else {
      resetLocalState(card.value);
    }
    screen.value = "play";
  }

  function reroll() {
    if (loading.value) return;
    void drawNext("reroll");
  }

  function openTool(tool: CardToolId) {
    if (!tools.value.includes(tool)) return;
    if (activeTool.value !== tool && card.value) recordEvent("tool_opened", card.value.id, { tool });
    activeTool.value = activeTool.value === tool ? null : tool;
  }

  async function toggleFavorite() {
    const l1Id = card.value?.l1Id;
    if (!l1Id || !options.setFavorite || favoriteBusy.value) return;
    const nextValue = !favorite.value;
    favorite.value = nextValue;
    favoriteBusy.value = true;
    try {
      await options.setFavorite(l1Id, nextValue);
    } catch {
      favorite.value = !nextValue;
    } finally {
      favoriteBusy.value = false;
    }
  }

  function closeTool() {
    activeTool.value = null;
  }

  function toggleTimer() {
    if (timerRunning.value) {
      clearTimer();
      return;
    }
    timerRunning.value = true;
    timerHandle = window.setInterval(() => { timerSeconds.value += 1; }, 1000);
  }

  function resetTimer() {
    clearTimer();
    timerSeconds.value = 0;
  }

  function changeCounter(delta: number) {
    counterValue.value = Math.max(0, counterValue.value + delta);
  }

  function changeScore(playerId: string, delta: number) {
    const player = players.value.find((item) => item.id === playerId);
    if (player) player.score = Math.max(0, player.score + delta);
  }

  function updatePlayerLabel(playerId: string, label: string) {
    const player = players.value.find((item) => item.id === playerId);
    if (player) player.label = label;
  }

  function addPlayer() {
    if (!card.value || players.value.length >= card.value.participantMax) return;
    players.value.push({ id: `player-${Date.now()}`, label: `玩家 ${players.value.length + 1}`, score: 0 });
  }

  function removePlayer(playerId: string) {
    if (players.value.length <= 2) return;
    players.value = players.value.filter((player) => player.id !== playerId);
  }

  function recordWinner(winnerLabel: string) {
    if (!card.value || phase.value === "result") return;
    phase.value = "result";
    result.value = { kind: "winner", winnerLabel };
    completedAt.value = new Date().toISOString();
    clearTimer();
    recordEvent("completed", card.value.id, { kind: "winner", winnerLabel });
  }

  function recordRanking() {
    if (!card.value || phase.value === "result") return;
    phase.value = "result";
    result.value = { kind: "ranking", ranking: [...players.value].sort((a, b) => b.score - a.score) };
    completedAt.value = new Date().toISOString();
    clearTimer();
    recordEvent("completed", card.value.id, { kind: "ranking", ranking: result.value.ranking });
  }

  function recordCompleted(note?: string) {
    if (!card.value || phase.value === "result") return;
    phase.value = "result";
    result.value = { kind: "completed", note };
    completedAt.value = new Date().toISOString();
    clearTimer();
    recordEvent("completed", card.value.id, { kind: "completed", note });
  }

  function playAgain() {
    if (loading.value) return;
    void drawNext("play_again");
    screen.value = "play";
  }

  function reset() {
    drawRevision += 1;
    loading.value = false;
    if (card.value && phase.value === "playing" && startedAt.value) {
      recordEvent("abandoned", card.value.id, { reason: "leave" });
    }
    clearTimer();
    card.value = null;
    phase.value = "playing";
    activeTool.value = null;
    previousCardIds.value = [];
    players.value = [];
    result.value = null;
    sessionId.value = "";
  }

  onUnmounted(clearTimer);

  return {
    card,
    phase,
    tools,
    activeTool,
    players,
    result,
    hasCard,
    startedAt,
    completedAt,
    timerSeconds,
    timerRunning,
    counterValue,
    loading,
    favorite,
    favoriteBusy,
    open,
    reroll,
    openTool,
    toggleFavorite,
    closeTool,
    toggleTimer,
    resetTimer,
    changeCounter,
    changeScore,
    updatePlayerLabel,
    addPlayer,
    removePlayer,
    recordWinner,
    recordRanking,
    recordCompleted,
    playAgain,
    reset
  };
}
