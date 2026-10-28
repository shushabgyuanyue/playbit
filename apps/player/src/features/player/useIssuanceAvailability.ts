import { useEffect, type Dispatch, type SetStateAction } from "react";
import type { PlayerState } from "../../data/types";
import { isPlayerApiConfigured, PlayerApiError, playerApi } from "../../services/playerApi";

export function useIssuanceAvailability(state: PlayerState, update: Dispatch<SetStateAction<PlayerState>>) {
  const pending = JSON.stringify([
    ...Object.values(state.issuedBenefits),
    ...Object.values(state.issuedStakes)
  ].filter(item => item.status === "pending_claim" && item.claimToken).map(item => item.claimToken));

  useEffect(() => {
    if (!isPlayerApiConfigured()) return;
    let active = true;
    let running = false;
    async function refresh() {
      if (running) return;
      running = true;
      const closed = new Set<string>();
      await Promise.allSettled((JSON.parse(pending) as string[]).map(async token => {
        try { await playerApi.getCouponShare(token); }
        catch (error) { if (error instanceof PlayerApiError && error.status === 410) closed.add(token); }
      }));
      running = false;
      if (!active || !closed.size) return;
      update(current => {
        const sync = <T extends { status: string; claimToken?: string }>(items: Record<string, T>) => Object.fromEntries(Object.entries(items).map(([key, item]) => [key, item.status === "pending_claim" && item.claimToken && closed.has(item.claimToken) ? { ...item, status: "unavailable" as const } : item]));
        return { ...current, issuedBenefits: sync(current.issuedBenefits), issuedStakes: sync(current.issuedStakes) };
      });
    }
    void refresh();
    const onVisible = () => { if (document.visibilityState === "visible") void refresh(); };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisible);
    return () => { active = false; window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", onVisible); };
  }, [pending, update]);
}
