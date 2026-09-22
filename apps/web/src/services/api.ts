import type {
  BetSession,
  Card,
  Coupon,
  CreateSessionInput,
  LoginInput,
  RegisterInput,
  SignSessionInput,
  User
} from "@playbit/shared";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.DEV ? "http://localhost:8787" : "");
const authTokenKey = "playbit.authToken";

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
  getShare(shareCode: string) {
    return request<{ session: BetSession }>(`/share/${shareCode}`);
  },
  signShare(shareCode: string, payload: SignSessionInput) {
    return request<{ session: BetSession }>(`/share/${shareCode}/sign`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  settleSession(id: string, winnerId: string, fulfilled: boolean) {
    return request<{ session: BetSession }>(`/sessions/${id}/settle`, {
      method: "PATCH",
      body: JSON.stringify({ winnerId, fulfilled })
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
