import type { GameEvent, GameEventName } from "@playbit/shared";
import { api } from "../services/api";

const actorKeyStorage = "playbit.game.actorKey";
const eventQueueStorage = "playbit.game.eventQueue";
const maxQueuedEvents = 100;

function makeId(prefix: string) {
  const uuid = globalThis.crypto?.randomUUID?.();
  return `${prefix}_${uuid ?? `${Date.now()}_${Math.random().toString(36).slice(2)}`}`;
}

function readActorKey() {
  try {
    const existing = localStorage.getItem(actorKeyStorage);
    if (existing) return existing;
    const next = makeId("actor");
    localStorage.setItem(actorKeyStorage, next);
    return next;
  } catch {
    return makeId("actor");
  }
}

function readQueue(): GameEvent[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(eventQueueStorage) ?? "[]") as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is GameEvent => Boolean(item && typeof item === "object")) : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: GameEvent[]) {
  try {
    localStorage.setItem(eventQueueStorage, JSON.stringify(queue.slice(-maxQueuedEvents)));
  } catch {
    // Telemetry storage is optional and must never affect the game.
  }
}

export type GameEventRecorder = (
  eventName: GameEventName,
  input: { sessionId: string; cardId: string; payload?: Record<string, unknown> }
) => GameEvent;

export function useGameTelemetry() {
  const actorKey = readActorKey();
  let queue = readQueue();
  let flushing = false;

  async function flush() {
    if (flushing || queue.length === 0) return;
    flushing = true;
    const batch = queue.slice(0, 20);
    try {
      await api.ingestGameEvents(batch);
      const sentIds = new Set(batch.map((event) => event.clientEventId));
      queue = queue.filter((event) => !sentIds.has(event.clientEventId));
      writeQueue(queue);
    } catch {
      // A failed observation request is deliberately invisible to players.
    } finally {
      flushing = false;
    }
  }

  const record: GameEventRecorder = (eventName, input) => {
    const event: GameEvent = {
      clientEventId: makeId("event"),
      actorKey,
      sessionId: input.sessionId,
      cardId: input.cardId,
      eventName,
      occurredAt: new Date().toISOString(),
      ...(input.payload ? { payload: input.payload } : {})
    };
    queue = [...queue, event].slice(-maxQueuedEvents);
    writeQueue(queue);
    void flush();
    return event;
  };

  void flush();

  return { actorKey, record, flush };
}
