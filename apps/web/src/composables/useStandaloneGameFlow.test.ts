// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp, ref, type App } from "vue";
import type { Card } from "@playbit/shared";
import { dailyCards } from "@playbit/cards";
import { useStandaloneGameFlow } from "./useStandaloneGameFlow";
import type { Screen } from "../types/screen";

let mounted: App | undefined;

function mountFlow(options: Parameters<typeof useStandaloneGameFlow>[1] = {}) {
  const screen = ref<Screen>("home");
  let flow!: ReturnType<typeof useStandaloneGameFlow>;
  const node = document.createElement("div");
  document.body.append(node);
  mounted = createApp({ setup() { flow = useStandaloneGameFlow(screen, options); return () => null; } });
  mounted.mount(node);
  return { flow, screen };
}

afterEach(() => {
  vi.useRealTimers();
  mounted?.unmount();
  document.body.innerHTML = "";
  window.localStorage.clear();
});

describe("standalone game flow", () => {
  it("starts a card without creating an agreement and records a local winner", () => {
    const { flow, screen } = mountFlow();
    const card = dailyCards.find((item) => item.mode === "versus") as Card;

    flow.open(card);
    expect(screen.value).toBe("play");
    expect(flow.phase.value).toBe("playing");
    expect(flow.card.value?.id).toBe(card.id);

    expect(flow.tools.value).toContain("counter");
    flow.changeCounter(2);
    expect(flow.counterValue.value).toBe(2);

    flow.recordWinner(flow.players.value[0].label);
    expect(flow.phase.value).toBe("result");
    expect(flow.result.value).toEqual({ kind: "winner", winnerLabel: flow.players.value[0].label });
  });

  it("does not submit a second completion after the result is final", () => {
    const completedEvents: unknown[] = [];
    const { flow } = mountFlow({
      recordEvent: (eventName) => {
        if (eventName === "completed") completedEvents.push(eventName);
      }
    });
    flow.open(dailyCards.find((item) => item.mode === "versus") as Card);
    flow.recordWinner(flow.players.value[0].label);
    flow.recordWinner(flow.players.value[1].label);

    expect(completedEvents).toHaveLength(1);
    expect(flow.result.value).toEqual({ kind: "winner", winnerLabel: flow.players.value[0].label });
  });

  it("cleans up the reusable timer when the local game resets", () => {
    vi.useFakeTimers();
    const { flow } = mountFlow();
    flow.open(dailyCards[0]);
    flow.toggleTimer();
    vi.advanceTimersByTime(2100);
    expect(flow.timerMilliseconds.value).toBeGreaterThanOrEqual(2000);
    const elapsedAtReset = flow.timerMilliseconds.value;

    flow.reset();
    const elapsedAfterReset = flow.timerMilliseconds.value;
    vi.advanceTimersByTime(2100);
    expect(elapsedAfterReset).toBeGreaterThanOrEqual(elapsedAtReset);
    expect(flow.timerMilliseconds.value).toBe(elapsedAfterReset);
    expect(flow.timerRunning.value).toBe(false);
  });

  it("keeps scoreboard state local and supports a lightweight ranking", () => {
    const { flow } = mountFlow();
    const card = dailyCards.find((item) => item.participantMax > 2) as Card;
    flow.open(card);
    flow.changeScore(flow.players.value[0].id, 3);
    flow.changeScore(flow.players.value[1].id, 1);
    flow.recordRanking();

    expect(flow.result.value?.kind).toBe("ranking");
    expect(flow.result.value && "ranking" in flow.result.value ? flow.result.value.ranking[0].score : 0).toBe(3);
  });

  it("persists the game-level scoreboard across cards and can clear it deliberately", () => {
    const first = mountFlow();
    first.flow.open(dailyCards[0]);
    first.flow.updatePlayerLabel(first.flow.players.value[0].id, "主持人");
    first.flow.changeScore(first.flow.players.value[0].id, 4);
    first.flow.open(dailyCards[1]);
    expect(first.flow.players.value[0]).toMatchObject({ label: "主持人", score: 4 });

    mounted?.unmount();
    mounted = undefined;
    const second = mountFlow();
    second.flow.open(dailyCards[1]);
    expect(second.flow.players.value[0]).toMatchObject({ label: "主持人", score: 4 });

    second.flow.clearScoreboard();
    expect(second.flow.players.value.every((player) => player.score === 0)).toBe(true);
    expect(second.flow.players.value[0].label).toBe("玩家 1");
  });

  it("prefers a recommended card and exposes a loading state while it is pending", async () => {
    let resolveRecommendation!: (card: Card) => void;
    const recommended = dailyCards[0];
    const { flow, screen } = mountFlow({
      drawRecommendedCard: () => new Promise<Card>((resolve) => { resolveRecommendation = resolve; })
    });

    flow.open();
    expect(screen.value).toBe("play");
    expect(flow.loading.value).toBe(true);
    expect(flow.card.value).toBeNull();

    resolveRecommendation(recommended);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(flow.loading.value).toBe(false);
    expect(flow.card.value?.id).toBe(recommended.id);
  });

  it("falls back to a local card when recommendation is unavailable", async () => {
    const { flow } = mountFlow({ drawRecommendedCard: async () => { throw new Error("offline"); } });

    flow.open();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(flow.loading.value).toBe(false);
    expect(flow.card.value).not.toBeNull();
  });

  it("does not let a late recommendation restore a reset flow", async () => {
    let resolveRecommendation!: (card: Card) => void;
    const { flow, screen } = mountFlow({
      drawRecommendedCard: () => new Promise<Card>((resolve) => { resolveRecommendation = resolve; })
    });

    flow.open();
    flow.reset();
    resolveRecommendation(dailyCards[0]);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(screen.value).toBe("play");
    expect(flow.card.value).toBeNull();
    expect(flow.loading.value).toBe(false);
  });
});
