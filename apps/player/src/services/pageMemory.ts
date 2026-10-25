import { useCallback, useState } from "react";
import type { Party } from "../data/types";

const STORAGE_KEY = "playbit:player:page-memory:v1";

export type PageScrollKey = "benefits" | "profile" | "promise" | "agreement";

export interface PageMemory {
  playFlippedCardId: string | null;
  promiseWinner: Party | null;
  scrollTop: Partial<Record<PageScrollKey, number>>;
}

const initialMemory: PageMemory = {
  playFlippedCardId: null,
  promiseWinner: null,
  scrollTop: {}
};

function readMemory(): PageMemory {
  try {
    const value = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "null") as Partial<PageMemory> | null;
    if (!value) return initialMemory;
    return {
      ...initialMemory,
      ...value,
      scrollTop: value.scrollTop && typeof value.scrollTop === "object" ? value.scrollTop : {}
    };
  } catch {
    return initialMemory;
  }
}

function writeMemory(value: PageMemory) {
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value)); } catch { /* Session memory is optional. */ }
}

export function usePageMemory() {
  const [memory, setMemory] = useState(readMemory);
  const remember = useCallback((patch: Partial<PageMemory>) => {
    setMemory(current => {
      const next = { ...current, ...patch, scrollTop: { ...current.scrollTop, ...patch.scrollTop } };
      writeMemory(next);
      return next;
    });
  }, []);
  return { memory, remember };
}
