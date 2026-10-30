import { useSyncExternalStore } from "react";
import type { Party } from "../data/types";
import type { GameplayId } from "../data/catalog/gameplays";

const STORAGE_KEY = "playbit:player:page-memory:v1";

export type PageScrollKey = "benefits" | "profile" | "promise" | "agreements" | "agreement" | "notifications" | "announcements";

export interface PageMemory {
  playFlippedCardId: string | null;
  promiseWinner: Party | null;
  homePath: "/" | "/promise";
  playMode: GameplayId | null;
  scrollTop: Partial<Record<PageScrollKey, number>>;
}

const initialMemory: PageMemory = {
  playFlippedCardId: null,
  promiseWinner: null,
  homePath: "/",
  playMode: null,
  scrollTop: {}
};

function readMemory(): PageMemory {
  try {
    const value = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "null") as Partial<PageMemory> | null;
    if (!value) return initialMemory;
    return {
      ...initialMemory,
      ...value,
      homePath: value.homePath === "/promise" ? "/promise" : "/",
      scrollTop: value.scrollTop && typeof value.scrollTop === "object" ? value.scrollTop : {}
    };
  } catch {
    return initialMemory;
  }
}

function writeMemory(value: PageMemory) {
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value)); } catch { /* Session memory is optional. */ }
}

let snapshot: PageMemory | undefined;
const listeners = new Set<() => void>();
function getSnapshot() { return snapshot ??= readMemory(); }
function subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
function remember(patch: Partial<PageMemory>) {
  const current = getSnapshot();
  snapshot = { ...current, ...patch, scrollTop: { ...current.scrollTop, ...patch.scrollTop } };
  writeMemory(snapshot);
  for (const listener of listeners) listener();
}

export function usePageMemory() {
  const memory = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return { memory, remember };
}
