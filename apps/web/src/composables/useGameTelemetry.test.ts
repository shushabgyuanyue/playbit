// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../services/api";
import { useGameTelemetry } from "./useGameTelemetry";

describe("game telemetry", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(api, "ingestGameEvents").mockResolvedValue({ accepted: 1 });
  });

  afterEach(() => vi.restoreAllMocks());

  it("creates an anonymous actor and sends idempotent-shaped events", async () => {
    const telemetry = useGameTelemetry();
    const event = telemetry.record("started", { sessionId: "session-1", cardId: "card-1" });
    await telemetry.flush();

    expect(event.actorKey).toBe(telemetry.actorKey);
    expect(event.clientEventId).toMatch(/^event_/);
    expect(api.ingestGameEvents).toHaveBeenCalledWith([event]);
    expect(localStorage.getItem("playbit.game.actorKey")).toBe(telemetry.actorKey);
  });

  it("keeps the queue when the observation endpoint is unavailable", async () => {
    vi.mocked(api.ingestGameEvents).mockRejectedValue(new Error("offline"));
    const telemetry = useGameTelemetry();
    const event = telemetry.record("rerolled", { sessionId: "session-1", cardId: "card-1", payload: { toCardId: "card-2" } });
    await telemetry.flush();

    expect(JSON.parse(localStorage.getItem("playbit.game.eventQueue") ?? "[]")).toEqual([event]);
  });
});
