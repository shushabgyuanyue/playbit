import type {
  Agreement,
  Card,
  Coupon,
  CreateAgreementInput,
  LoginInput,
  RegisterInput,
  UpdateProfileInput,
  AgreementRealtimeEvent,
  SignAgreementInput,
  Flip,
  GraceTicket,
  GraceWaiver,
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

  if (response.status === 204) {
    return undefined as T;
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
  updateProfile(payload: UpdateProfileInput) {
    return request<{ user: User }>("/auth/me", {
      method: "PATCH",
      body: JSON.stringify(payload)
    });
  },
  drawCard(previousIds: string[]) {
    return request<{ card: Card }>("/cards/draw", {
      method: "POST",
      body: JSON.stringify({ previousIds })
    });
  },
  createAgreement(payload: CreateAgreementInput) {
    return request<{ agreement: Agreement }>("/agreements", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  updateAgreement(id: string, payload: CreateAgreementInput) {
    return request<{ agreement: Agreement }>(`/agreements/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    });
  },
  deleteAgreement(id: string) {
    return request<void>(`/agreements/${id}`, { method: "DELETE" });
  },
  listAgreements() {
    return request<{ agreements: Agreement[] }>("/agreements");
  },
  getAgreement(id: string) {
    return request<{ agreement: Agreement }>(`/agreements/${id}`);
  },
  syncAgreement(id: string) {
    return request<{ agreement: Agreement }>(`/agreements/${id}/sync`);
  },
  subscribeAgreementEvents(
    id: string,
    onEvent: (event: AgreementRealtimeEvent) => void,
    onError?: () => void,
    onOpen?: () => void
  ) {
    const token = getAuthToken();
    if (!token || typeof EventSource === "undefined") {
      onError?.();
      return () => undefined;
    }

    const source = new EventSource(
      `${apiBaseUrl}/agreements/${id}/events?token=${encodeURIComponent(token)}`
    );
    const handleEvent = (event: Event) => {
      const message = event as MessageEvent<string>;
      onEvent(JSON.parse(message.data) as AgreementRealtimeEvent);
    };
    source.addEventListener("agreement.updated", handleEvent);
    source.onopen = () => onOpen?.();
    source.onerror = () => {
      onError?.();
    };

    return () => {
      source.removeEventListener("agreement.updated", handleEvent);
      source.onopen = null;
      source.onerror = null;
      source.close();
    };
  },
  getShare(shareCode: string) {
    return request<{ agreement: Agreement }>(`/share/${shareCode}`);
  },
  signShare(shareCode: string, payload: SignAgreementInput) {
    return request<{ agreement: Agreement }>(`/share/${shareCode}/sign`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  recordAgreementResult(id: string, winnerId: string) {
    return request<{ agreement: Agreement }>(`/agreements/${id}/result`, {
      method: "PATCH",
      body: JSON.stringify({ winnerId })
    });
  },
  addBoost(id: string, label: string) {
    return request<{ agreement: Agreement }>(`/agreements/${id}/boost`, {
      method: "POST",
      body: JSON.stringify({ label })
    });
  },
  confirmBoost(id: string, boostId: string) {
    return request<{ agreement: Agreement }>(`/agreements/${id}/boost/${boostId}/confirm`, {
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
  },
  listGrace() {
    return request<{ tickets: GraceTicket[]; waivers: GraceWaiver[] }>("/grace");
  },
  fulfillAgreement(id: string) {
    return request<{ agreement: Agreement; graceTickets: GraceTicket[] }>(`/agreements/${id}/fulfill`, {
      method: "POST"
    });
  },
  requestWaiver(ticketId: string, couponId: string) {
    return request<{ waiver: GraceWaiver }>(`/grace/${ticketId}/waivers`, {
      method: "POST",
      body: JSON.stringify({ couponId })
    });
  },
  respondWaiver(id: string, accept: boolean) {
    return request<{ waiver: GraceWaiver; agreement: Agreement | null }>(`/grace/waivers/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ accept })
    });
  },
  listFlips(agreementId: string) {
    return request<{ flips: Flip[] }>(`/agreements/${agreementId}/flips`);
  },
  getFlip(id: string) {
    return request<{ flip: Flip }>(`/flips/${id}`);
  },
  createFlip(agreementId: string, couponId: string) {
    return request<{ flip: Flip }>(`/agreements/${agreementId}/flips`, {
      method: "POST",
      body: JSON.stringify({ couponId })
    });
  },
  respondFlip(id: string, accept: boolean) {
    return request<{ flip: Flip }>(`/flips/${id}/response`, {
      method: "PATCH",
      body: JSON.stringify({ accept })
    });
  },
  recordFlipResult(id: string, winnerUserId: string) {
    return request<{ flip: Flip; agreement: Agreement | null; coupon: Coupon | null; issuedCoupon: Coupon | null }>(`/flips/${id}/result`, {
      method: "PATCH",
      body: JSON.stringify({ winnerUserId })
    });
  }
};
