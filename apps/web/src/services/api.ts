import type { BetSession, Card, CreateSessionInput } from "@playbit/shared";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.DEV ? "http://localhost:8787" : "");

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...init?.headers
    },
    ...init
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const api = {
  drawCard(previousIds: string[]) {
    return request<{ card: Card }>("/cards/draw", {
      method: "POST",
      body: JSON.stringify({ previousIds })
    });
  },
  createSession(payload: CreateSessionInput) {
    return request<{ session: BetSession }>("/sessions", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  listSessions() {
    return request<{ sessions: BetSession[] }>("/sessions");
  },
  settleSession(id: string, winnerId: string, fulfilled: boolean) {
    return request<{ session: BetSession }>(`/sessions/${id}/settle`, {
      method: "PATCH",
      body: JSON.stringify({ winnerId, fulfilled })
    });
  }
};
