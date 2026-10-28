import type { Agreement, Coupon, LoginInput, RegisterInput, User } from "@playbit/shared";
import type { Signature } from "../data/types";

function normalizeApiBaseUrl(value: string | undefined) {
  const baseUrl = value?.trim() ?? "";
  if (!baseUrl) return import.meta.env.DEV ? "http://localhost:8787" : "";
  if (baseUrl.startsWith("http://") || baseUrl.startsWith("https://")) return baseUrl.replace(/\/$/, "");
  return `https://${baseUrl.replace(/^\/+|\/+$/g, "")}`;
}

const apiBaseUrl = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL);
const authTokenKey = "playbit.authToken";

export class PlayerApiError extends Error {
  constructor(message: string, readonly status: number, readonly code?: string) {
    super(message);
  }
}

export function isPlayerApiConfigured() {
  return Boolean(apiBaseUrl);
}

export function getAuthToken() {
  try { return localStorage.getItem(authTokenKey); } catch { return null; }
}

export function setAuthToken(token: string) {
  localStorage.setItem(authTokenKey, token);
}

export function clearAuthToken() {
  localStorage.removeItem(authTokenKey);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!apiBaseUrl) throw new PlayerApiError("API is not configured", 0, "API_UNCONFIGURED");
  const token = getAuthToken();
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      ...init,
      signal: init?.signal ?? AbortSignal.timeout(15_000),
      cache: init?.cache ?? "no-store",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init?.headers
      }
    });
  } catch {
    throw new PlayerApiError("Network request failed", 0, "NETWORK_ERROR");
  }
  if (!response.ok) {
    let payload: { message?: string; code?: string } = {};
    try { payload = await response.json() as typeof payload; } catch { /* Keep the HTTP status. */ }
    throw new PlayerApiError(payload.message ?? `Request failed: ${response.status}`, response.status, payload.code);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export type CouponPage = {
  coupons: Coupon[];
  nextCursor: string | null;
  hasMore: boolean;
};

export const playerApi = {
  getAuthToken,
  setAuthToken,
  clearAuthToken,
  register(payload: RegisterInput) {
    return request<{ user: User; token: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  login(payload: LoginInput) {
    return request<{ user: User; token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  me() {
    return request<{ user: User | null }>("/auth/me");
  },
  listCoupons(options: { cursor?: string | null; limit?: number; ownedOnly?: boolean } = {}) {
    const query = new URLSearchParams({ limit: String(Math.max(1, Math.min(50, options.limit ?? 10))) });
    if (options.cursor) query.set("cursor", options.cursor);
    if (options.ownedOnly) query.set("owned", "1");
    return request<CouponPage>(`/coupons?${query.toString()}`);
  },
  createIndependentCoupon(payload: {
    gameResultId?: string | null;
    certificateId?: string | null;
    name: string;
    description: string;
    sourceLabel?: string | null;
    signatureDataUrl?: string | null;
    transferNote?: string | null;
    claimLimit?: number;
  }) {
    return request<{ coupon: Coupon }>("/coupons/independent", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  createPublicCoupon(payload: {
    gameResultId?: string | null;
    certificateId?: string | null;
    name: string;
    description: string;
    sourceLabel?: string | null;
    issuerNickname?: string | null;
    signatureDataUrl?: string | null;
    transferNote?: string | null;
    claimLimit?: number;
  }) {
    return request<{ coupon: Coupon }>("/coupons/public", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  createOfflineAgreement(payload: {
    requestId: string;
    source: "custom";
    creatorSignatureDataUrl: string;
    counterpartyNickname: string;
    counterpartySignatureDataUrl: string;
    title: string;
    challenge?: string;
    stake: { type: "coupon" | "custom"; label: string; fulfilled: false; additions: [] };
  }) {
    return request<{ agreement: Agreement }>("/agreements/offline", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  getAgreementShare(shareCode: string) {
    return request<{ agreement: Agreement }>(`/share/${encodeURIComponent(shareCode)}`);
  },
  getCouponShare(token: string) {
    return request<{ coupon: Pick<Coupon, "id" | "name" | "description" | "sourceLabel" | "issuerNickname" | "transferNote" | "status" | "createdAt" | "claimLimit" | "claimedCount" | "remainingClaims"> }>(`/coupons/share/${encodeURIComponent(token)}`);
  },
  claimCoupon(token: string) {
    return request<{ coupon: Coupon }>(`/coupons/share/${encodeURIComponent(token)}/claim`, { method: "POST" });
  },
  useCoupon(id: string) {
    return request<{ coupon: Coupon }>(`/coupons/${encodeURIComponent(id)}/use`, { method: "PATCH" });
  }
};

export function signatureToDataUrl(signature: Signature): string | null {
  if (!signature.length || typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 600;
  canvas.height = 160;
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.strokeStyle = "#25202a";
  context.lineWidth = 3;
  context.lineCap = "round";
  context.lineJoin = "round";
  for (const stroke of signature) {
    if (stroke.length < 2) continue;
    context.beginPath();
    context.moveTo(stroke[0]!.x * canvas.width, stroke[0]!.y * canvas.height);
    for (const point of stroke.slice(1)) context.lineTo(point.x * canvas.width, point.y * canvas.height);
    context.stroke();
  }
  return canvas.toDataURL("image/png");
}
