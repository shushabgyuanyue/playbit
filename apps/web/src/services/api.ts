import type {
  BetSession,
  Card,
  Coupon,
  CreateSessionInput,
  LoginInput,
  RegisterInput,
  SessionRealtimeEvent,
  SignSessionInput,
  User
} from "@playbit/shared";

function normalizeApiBaseUrl(value: string | undefined) {
  const baseUrl = value?.trim() ?? "";
  if (!baseUrl) {
    return import.meta.env.DEV ? "http://localhost:8787" : "";
  }
  if (baseUrl.startsWith("http://") || baseUrl.startsWith("https://")) {
    return baseUrl.replace(/\/$/, "");
  }
  return `https://${baseUrl.replace(/^\/+|\/$/g, "")}`;
}

const apiBaseUrl = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL);
const authTokenKey = "playbit.authToken";

export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string
  ) {
    super(message);
  }
}

function getAuthToken() {
  return localStorage.getItem(authTokenKey);
}

export function setAuthToken(token: string) {
  localStorage.setItem(authTokenKey, token);
}

export function clearAuthToken() {
  localStorage.removeItem(authTokenKey);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAuthToken();
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    cache: init?.cache ?? "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers
    }
  });

  if (!response.ok) {
    let payload: { message?: string; code?: string } = {};
    try {
      payload = (await response.json()) as typeof payload;
    } catch {
      // Keep the HTTP status when the server does not return JSON.
    }
    throw new ApiRequestError(
      payload.message ?? `Request failed: ${response.status}`,
      response.status,
      payload.code
    );
  }

  return response.json() as Promise<T>;
}

export const api = {
  getAuthToken,
  clearAuthToken,
  setAuthToken,
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
  getSession(id: string) {
    return request<{ session: BetSession }>(`/sessions/${id}`);
  },
  syncSession(id: string) {
    return request<{ session: BetSession }>(`/sessions/${id}/sync`);
  },
  subscribeSessionEvents(
    id: string,
    onEvent: (event: SessionRealtimeEvent) => void,
    onError?: () => void
  ) {
    const token = getAuthToken();
    if (!token || typeof EventSource === "undefined") {
      return () => undefined;
    }

    const source = new EventSource(
      `${apiBaseUrl}/sessions/${id}/events?token=${encodeURIComponent(token)}`
    );
    const handleEvent = (event: Event) => {
      const message = event as MessageEvent<string>;
      onEvent(JSON.parse(message.data) as SessionRealtimeEvent);
    };
    source.addEventListener("session.updated", handleEvent);
    source.onerror = () => {
      onError?.();
    };

    return () => {
      source.removeEventListener("session.updated", handleEvent);
      source.onerror = null;
      source.close();
    };
  },
  getShare(shareCode: string) {
    return request<{ session: BetSession }>(`/share/${shareCode}`);
  },
  signShare(shareCode: string, payload: SignSessionInput) {
    return request<{ session: BetSession }>(`/share/${shareCode}/sign`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  settleSession(id: string, winnerId: string) {
    return request<{ session: BetSession }>(`/sessions/${id}/settle`, {
      method: "PATCH",
      body: JSON.stringify({ winnerId })
    });
  },
  addBoost(id: string, label: string) {
    return request<{ session: BetSession }>(`/sessions/${id}/boost`, {
      method: "POST",
      body: JSON.stringify({ label })
    });
  },
  confirmBoost(id: string, boostId: string) {
    return request<{ session: BetSession }>(`/sessions/${id}/boost/${boostId}/confirm`, {
      method: "POST"
    });
  },
  listCoupons() {
    return request<{ coupons: Coupon[] }>("/coupons");
  },
  useCoupon(id: string) {
    return request<{ coupon: Coupon }>(`/coupons/${id}/use`, {
      method: "PATCH"
    });
  }
};
