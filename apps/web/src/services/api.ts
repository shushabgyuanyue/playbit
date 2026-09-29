import type {
  Agreement,
  Card,
  Coupon,
  CreateAgreementInput,
  CreateGameInput,
  LoginInput,
  RegisterInput,
  UpdateProfileInput,
  AgreementRealtimeEvent,
  SignAgreementInput,
  Flip,
  GraceTicket,
  GraceWaiver,
  User,
  GameEvent,
  ContentOverview,
  ContentListItem,
  DeliveredContentCard
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
      signal: AbortSignal.timeout(4000),
      body: JSON.stringify({ previousIds })
    });
  },
  ingestGameEvents(events: GameEvent[]) {
    return request<{ accepted: number }>("/content/events", {
      method: "POST",
      body: JSON.stringify({ events })
    });
  },
  getRecommendedCard(actorKey: string, previousIds: string[], preferredL1Id?: string) {
    const query = new URLSearchParams({ actorKey, previousIds: JSON.stringify(previousIds) });
    if (preferredL1Id) query.set("l1Id", preferredL1Id);
    return request<{ card: DeliveredContentCard }>(`/content/cards/next?${query.toString()}`, {
      signal: AbortSignal.timeout(1200)
    });
  },
  getStudioOverview() {
    return request<ContentOverview>("/studio/overview");
  },
  listStudioContent(status?: string) {
    const query = status ? `?status=${encodeURIComponent(status)}` : "";
    return request<{ items: ContentListItem[]; total: number }>(`/studio/content${query}`);
  },
  createStudioL1(payload: {
    code: string;
    name: string;
    l0Ids: string[];
    minPlayers: number;
    maxPlayers: number | null;
    durationMin: number | null;
    durationMax: number | null;
    outcomeModel: "no_winner" | "self_reported_winner" | "ranked_result" | "shared_completion";
    certificateEligible?: boolean;
    tags?: string[];
  }) {
    return request<{ l1: { id: string; name: string; code: string } }>("/studio/l1", { method: "POST", body: JSON.stringify(payload) });
  },
  createStudioL2(payload: {
    l1Id: string;
    title: string;
    contentType: "prompt" | "truth" | "sequence" | "environment";
    payload: Record<string, unknown>;
    qualityTier?: number;
    reusePolicy?: { cooldownRounds?: number; cooldownDays?: number; permanentExhaustion?: boolean; skipCooldownRounds?: number };
    sourceMode?: "system" | "human" | "environment" | "external_ai" | "hybrid";
  }) {
    return request<{ l2: ContentListItem["l2"] }>("/studio/l2", { method: "POST", body: JSON.stringify(payload) });
  },
  updateStudioL2(l2Id: string, payload: { title?: string; contentType?: "prompt" | "truth" | "sequence" | "environment"; payload?: Record<string, unknown>; qualityTier?: number; sourceMode?: "system" | "human" | "environment" | "external_ai" | "hybrid" }) {
    return request<{ l2: ContentListItem["l2"] }>(`/studio/l2/${l2Id}`, { method: "PATCH", body: JSON.stringify(payload) });
  },
  createStudioVersion(l1Id: string, payload: { shortRule?: string; completionCondition?: string; failureCondition?: string | null; displayHook?: string; toolIds?: string[]; changeNote?: string | null }) {
    return request<{ version: { id: string; l1Id: string; versionNo: number; shortRule: string; completionCondition: string; failureCondition: string | null; displayHook: string; toolIds: string[]; changeNote: string | null; reviewStatus: string } }>(`/studio/l1/${l1Id}/versions`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  submitStudioVersion(versionId: string) {
    return request<{ version: { id: string; versionNo: number; reviewStatus: string } }>(`/studio/versions/${versionId}/submit`, { method: "POST" });
  },
  updateStudioVersion(versionId: string, payload: { shortRule?: string; completionCondition?: string; failureCondition?: string | null; displayHook?: string; toolIds?: string[]; changeNote?: string | null }) {
    return request<{ version: { id: string; versionNo: number; shortRule: string; completionCondition: string; failureCondition: string | null; displayHook: string; toolIds: string[]; changeNote: string | null; reviewStatus: string } }>(`/studio/versions/${versionId}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    });
  },
  reviewStudioVersion(versionId: string, decision: "approve" | "request_changes" | "pause" | "retire") {
    return request<{ version: { id: string; versionNo: number; reviewStatus: string } }>(`/studio/versions/${versionId}/review`, {
      method: "POST",
      body: JSON.stringify({ decision })
    });
  },
  publishStudioVersion(versionId: string) {
    return request<{ version: { id: string; versionNo: number; reviewStatus: string } }>(`/studio/versions/${versionId}/publish`, { method: "POST" });
  },
  submitStudioL2(l2Id: string) {
    return request<{ l2: ContentListItem["l2"] }>(`/studio/l2/${l2Id}/submit`, { method: "POST" });
  },
  reviewStudioL2(l2Id: string, decision: "approve" | "request_changes" | "pause" | "retire") {
    return request<{ l2: ContentListItem["l2"] }>(`/studio/l2/${l2Id}/review`, { method: "POST", body: JSON.stringify({ decision }) });
  },
  publishStudioL2(l2Id: string) {
    return request<{ l2: ContentListItem["l2"] }>(`/studio/l2/${l2Id}/publish`, { method: "POST" });
  },
  updateStudioReusePolicy(l2Id: string, policy: { cooldownRounds: number; cooldownDays: number; permanentExhaustion: boolean; skipCooldownRounds: number }, actor = "studio") {
    return request<{ audit: { id: string } }>(`/studio/l2/${l2Id}/reuse-policy`, { method: "PATCH", body: JSON.stringify({ policy, actor }) });
  },
  listStudioReuseAudits(l2Id: string) {
    return request<{ audits: Array<{ id: string; action: string; before: unknown; after: unknown; createdAt: string }> }>(`/studio/l2/${l2Id}/reuse-policy/audits`);
  },
  getStudioAnalytics() {
    return request<{ generatedAt: string; metrics: ContentOverview["metrics"] }>("/studio/analytics/content");
  },
  setGameFavorite(actorKey: string, l1Id: string, isFavorite: boolean) {
    return request<{ ok: boolean }>("/content/preferences", {
      method: "POST",
      body: JSON.stringify({ actorKey, l1Id, isFavorite })
    });
  },
  createAgreement(payload: CreateAgreementInput, requestId: string) {
    return request<{ agreement: Agreement }>("/agreements", {
      method: "POST",
      body: JSON.stringify({ ...payload, requestId })
    });
  },
  createGame(payload: CreateGameInput) {
    return request<{ agreement: Agreement }>("/games", { method: "POST", body: JSON.stringify(payload) });
  },
  joinGame(shareCode: string, revision: number) {
    return request<{ agreement: Agreement }>(`/games/${shareCode}/join`, { method: "POST", body: JSON.stringify({ revision }) });
  },
  updateAgreement(id: string, payload: CreateAgreementInput, revision: number) {
    return request<{ agreement: Agreement }>(`/agreements/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ ...payload, revision })
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
    source.addEventListener("agreement.deleted", handleEvent);
    source.onopen = () => onOpen?.();
    source.onerror = () => {
      onError?.();
    };

    return () => {
      source.removeEventListener("agreement.updated", handleEvent);
      source.removeEventListener("agreement.deleted", handleEvent);
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
  withdrawBoost(id: string, boostId: string) {
    return request<{ agreement: Agreement }>(`/agreements/${id}/boost/${boostId}`, { method: "DELETE" });
  },
  listCoupons() {
    return request<{ coupons: Coupon[] }>("/coupons");
  },
  useCoupon(id: string) {
    return request<{ coupon: Coupon }>(`/coupons/${id}/use`, {
      method: "PATCH"
    });
  },
  createIndependentCoupon(payload: {
    gameResultId?: string | null;
    certificateId?: string | null;
    name: string;
    description: string;
    transferNote?: string | null;
    holderUserId?: string | null;
    holderNickname: string;
  }) {
    return request<{ coupon: Coupon }>("/coupons/independent", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  listGrace() {
    return request<{ tickets: GraceTicket[]; waivers: GraceWaiver[] }>("/grace");
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
