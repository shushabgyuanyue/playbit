import { createContext, useContext, useEffect, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { playerCopy as copy } from "@playbit/content/player";
import type { LoginInput, RegisterInput, User } from "@playbit/shared";
import type { PlayerState } from "../../data/types";
import { readState, writeState } from "../../services/playerRepository";
import { clearAuthToken, getAuthToken, isPlayerApiConfigured, playerApi, setAuthToken } from "../../services/playerApi";
import { useIssuanceAvailability } from "./useIssuanceAvailability";

interface PlayerAuth {
  user: User | null;
  loading: boolean;
  login: (payload: LoginInput) => Promise<User>;
  register: (payload: RegisterInput) => Promise<User>;
  logout: () => void;
  refresh: () => Promise<User | null>;
}

interface PlayerContextValue {
  state: PlayerState;
  update: Dispatch<SetStateAction<PlayerState>>;
  notify: (message: string) => void;
  toast: string;
  auth: PlayerAuth;
}
const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [state, update] = useState(readState);
  useIssuanceAvailability(state, update);
  const [toast, setToast] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const warned = useRef(false);
  useEffect(() => {
    if (!writeState(state) && !warned.current) { warned.current = true; setToast(copy.error.storage); }
  }, [state]);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);
  async function refresh() {
    if (!isPlayerApiConfigured() || !getAuthToken()) {
      setUser(null);
      setAuthLoading(false);
      return null;
    }
    try {
      const result = await playerApi.me();
      setUser(result.user);
      return result.user;
    } catch {
      clearAuthToken();
      setUser(null);
      return null;
    } finally {
      setAuthLoading(false);
    }
  }
  useEffect(() => { void refresh(); }, []);
  async function login(payload: LoginInput) {
    const result = await playerApi.login(payload);
    setAuthToken(result.token);
    setUser(result.user);
    update(current => current.profileName === copy.profile.defaultName ? { ...current, profileName: result.user.nickname } : current);
    return result.user;
  }
  async function register(payload: RegisterInput) {
    const result = await playerApi.register(payload);
    setAuthToken(result.token);
    setUser(result.user);
    update(current => current.profileName === copy.profile.defaultName ? { ...current, profileName: result.user.nickname } : current);
    return result.user;
  }
  function logout() {
    clearAuthToken();
    setUser(null);
  }
  return <PlayerContext.Provider value={{
    state,
    update,
    toast,
    notify: setToast,
    auth: { user, loading: authLoading, login, register, logout, refresh }
  }}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (!context) throw new Error("PlayerProvider missing");
  return context;
}
