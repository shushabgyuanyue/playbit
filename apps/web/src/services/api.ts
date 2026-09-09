import type { BetSession, Card, CreateSessionInput, LoginInput, RegisterInput, User } from "@playbit/shared";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.DEV ? "http://localhost:8787" : "");
const authTokenKey = "playbit.authToken";

function getAuthToken() {
  return localStorage.getItem(authTokenKey);
}

export function setAuthToken(token: string) {
  localStorage.setItem(authTokenKey, token);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAuthToken();
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
  getAuthToken,
  setAuthToken,
  async createGuest(nickname?: string) {
    const result = await request<{ user: User; token: string }>("/auth/guest", {
      method: "POST",
      body: JSON.stringify({ nickname })
    });
    setAuthToken(result.token);
    return result;
  },
  async register(payload: RegisterInput) {
    const result = await request<{ user: User; token: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    setAuthToken(result.token);
    return result;
  },
  async login(payload: LoginInput) {
    const result = await request<{ user: User; token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    setAuthToken(result.token);
    return result;
  },
  me() {
    return request<{ user: User | null }>("/auth/me");
  },
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
  getShare(shareCode: string) {
    return request<{ session: BetSession }>(`/share/${shareCode}`);
  },
  signShare(shareCode: string, nickname: string) {
    return request<{ session: BetSession }>(`/share/${shareCode}/sign`, {
      method: "POST",
      body: JSON.stringify({ nickname })
    });
  },
  settleSession(id: string, winnerId: string, fulfilled: boolean) {
    return request<{ session: BetSession }>(`/sessions/${id}/settle`, {
      method: "PATCH",
      body: JSON.stringify({ winnerId, fulfilled })
    });
  }
};
