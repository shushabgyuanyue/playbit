import { createContext, useContext, useEffect, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { playerCopy as copy } from "@playbit/content/player";
import type { PlayerState } from "../../data/types";
import { readState, writeState } from "../../services/playerRepository";

interface PlayerContextValue {
  state: PlayerState;
  update: Dispatch<SetStateAction<PlayerState>>;
  notify: (message: string) => void;
  toast: string;
}
const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [state, update] = useState(readState);
  const [toast, setToast] = useState("");
  const warned = useRef(false);
  useEffect(() => {
    if (!writeState(state) && !warned.current) { warned.current = true; setToast(copy.error.storage); }
  }, [state]);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);
  return <PlayerContext.Provider value={{ state, update, toast, notify: setToast }}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (!context) throw new Error("PlayerProvider missing");
  return context;
}
