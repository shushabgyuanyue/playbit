import { drawCard as drawLocalCard } from "@playbit/cards";
import { copy } from "@playbit/content";
import type {
  BetSession,
  Card,
  Coupon,
  CreateSessionInput,
  LoginInput,
  RegisterInput,
  SessionRealtimeEvent,
  Stake,
  User
} from "@playbit/shared";
import { showConfirmDialog, showToast } from "vant";
import { computed, onMounted, onUnmounted, reactive, ref, watch } from "vue";
import { api, ApiRequestError } from "../services/api";
import {
  buildSharePayload,
  defaultStake,
  type SharePayload
} from "./playbitFlowHelpers";
import { useShareActions } from "./useShareActions";

export type Screen =
  | "home"
  | "create"
  | "contract"
  | "draw"
  | "session"
  | "settlement"
  | "history"
  | "sign"
  | "account"
  | "vouchers"
  | "voucherDetail";

export type CreateBetDraft = {
  title: string;
  judgmentRule: string;
  stake: Stake;
  creatorSignatureDataUrl: string;
};

export function usePlaybitFlow() {
  const screen = ref<Screen>("home");
  const currentUser = ref<User | null>(null);
  const authOpen = ref(false);
  const authError = ref<string | null>(null);
  const authStep = ref<"credentials" | "register">("credentials");
  const sessions = ref<BetSession[]>([]);
  const coupons = ref<Coupon[]>([]);
  const activeSessionId = ref<string | null>(null);
  const activeCard = ref<Card | null>(null);
  const activeVoucherId = ref<string | null>(null);
  const contractBackScreen = ref<Screen>("home");
  const authReturnScreen = ref<Screen>("home");
  const drawnCardIds = ref<string[]>([]);
  const cardLoading = ref(false);
  const signLoading = ref(false);
  const authLoading = ref(false);
  const sessionRefreshing = ref(false);
  const activeShareCode = ref<string | null>(null);
  const createDraft = reactive<CreateBetDraft>({
    title: "",
    judgmentRule: "",
    stake: { ...defaultStake },
    creatorSignatureDataUrl: ""
  });

  const activeSession = computed(() =>
    sessions.value.find((session) => session.id === activeSessionId.value)
  );

  const sharePayload = computed<SharePayload | null>(() =>
    activeSession.value ? buildSharePayload(activeSession.value) : null
  );
  const { copyShareText, nativeShare } = useShareActions(sharePayload);

  async function ensureIdentity() {
    if (currentUser.value) {
      return currentUser.value;
    }

    if (!api.getAuthToken()) {
      return null;
    }

    try {
      const response = await api.me();
      currentUser.value = response.user;
      return response.user;
    } catch {
      api.clearAuthToken();
      currentUser.value = null;
      return null;
    }
  }

  function requireAccount(nextScreen: Screen) {
    if (currentUser.value) {
      screen.value = nextScreen;
      return true;
    }

    authReturnScreen.value = nextScreen;
    authError.value = null;
    authStep.value = "credentials";
    authOpen.value = true;
    return false;
  }

  function openAccount() {
    if (currentUser.value) {
      screen.value = "account";
      return;
    }

    authReturnScreen.value = "home";
    authError.value = null;
    authStep.value = "credentials";
    authOpen.value = true;
  }

  function closeAuthSheet() {
    if (authLoading.value) {
      return;
    }
    authOpen.value = false;
    authError.value = null;
    authStep.value = "credentials";
  }

  function clearAuthError() {
    authError.value = null;
  }

  function openCreate() {
    requireAccount("create");
  }

  function openDraw() {
    if (requireAccount("draw") && !activeCard.value) {
      void drawCard();
    }
  }

  function openHistory() {
    requireAccount("history");
  }

  async function refreshSessions() {
    const user = await ensureIdentity();
    if (!user) {
      sessions.value = [];
      return;
    }
    try {
      const response = await api.listSessions();
      sessions.value = response.sessions;
    } catch {
      sessions.value = [];
    }
  }

  async function restorePendingShareSession() {
    if (!activeShareCode.value) {
      return false;
    }

    try {
      const response = await api.getShare(activeShareCode.value);
      upsertSession(response.session);
      return true;
    } catch {
      return false;
    }
  }

  async function refreshCoupons() {
    const user = await ensureIdentity();
    if (!user) {
      coupons.value = [];
      return;
    }
    try {
      const response = await api.listCoupons();
      coupons.value = response.coupons;
    } catch {
      coupons.value = [];
    }
  }

  async function refreshActiveSession(silent = false) {
    if (!activeSessionId.value) {
      return;
    }
    if (sessionRefreshing.value) {
      return;
    }

    if (!silent) {
      sessionRefreshing.value = true;
    }
    try {
      const response = await api.syncSession(activeSessionId.value);
      upsertSession(response.session);
    } catch {
      // Keep the current contract visible if the network is temporarily unavailable.
    } finally {
      if (!silent) {
        sessionRefreshing.value = false;
      }
    }
  }

  async function loadShareSession(shareCode: string) {
    activeShareCode.value = shareCode;
    const localSession = sessions.value.find((session) => session.shareCode === shareCode);
    if (localSession) {
      upsertSession(localSession);
    }

    await restorePendingShareSession();
    screen.value = "sign";
  }

  async function createSession(payload: CreateSessionInput) {
    const user = await ensureIdentity();
    if (!user) {
      authReturnScreen.value = screen.value;
      authError.value = null;
      authStep.value = "credentials";
      authOpen.value = true;
      return;
    }
    const sessionInput = {
      ...payload,
      creatorNickname: user.nickname
    };

    const response = await api.createSession(sessionInput);
    currentUser.value = {
      ...user,
      signatureDataUrl: payload.creatorSignatureDataUrl
    };
    sessions.value = [response.session, ...sessions.value.filter((item) => item.id !== response.session.id)];
    activeSessionId.value = response.session.id;

    resetCreateDraft();
    contractBackScreen.value = payload.source === "card" ? "draw" : "create";
    screen.value = "contract";
  }

  async function drawCard() {
    cardLoading.value = true;

    try {
      const response = await api.drawCard(drawnCardIds.value);
      activeCard.value = response.card;
    } catch {
      activeCard.value = drawLocalCard(drawnCardIds.value);
    } finally {
      if (activeCard.value) {
        drawnCardIds.value = [...drawnCardIds.value, activeCard.value.id];
      }
      cardLoading.value = false;
    }
  }

  async function settleSession(winnerId: string) {
    if (!activeSession.value) {
      return;
    }

    try {
      const response = await api.settleSession(activeSession.value.id, winnerId);
      upsertSession(response.session);
      await refreshCoupons();
    } catch {
      await refreshActiveSession(true);
      showToast(copy.session.stateSyncFailed);
      return;
    }

    screen.value = "settlement";
  }

  async function addBoost(label: string) {
    if (!activeSession.value) {
      return;
    }
    try {
      const response = await api.addBoost(activeSession.value.id, label);
      upsertSession(response.session);
    } catch {
      showToast(copy.session.boostFailed);
    }
  }

  async function confirmBoost(boostId: string) {
    if (!activeSession.value) {
      return;
    }
    try {
      const response = await api.confirmBoost(activeSession.value.id, boostId);
      upsertSession(response.session);
    } catch {
      showToast(copy.session.boostFailed);
    }
  }

  function upsertSession(session: BetSession) {
    const existing = sessions.value.find((candidate) => candidate.id === session.id);
    if (existing && session.revision < existing.revision) {
      return;
    }
    sessions.value = [session, ...sessions.value.filter((candidate) => candidate.id !== session.id)];
    activeSessionId.value = session.id;
  }

  function openSession(session: BetSession) {
    activeSessionId.value = session.id;
    screen.value = session.winnerId ? "settlement" : session.status === "active" ? "session" : "contract";
  }

  function openSessionFrom(session: BetSession, backScreen: Screen = "home") {
    contractBackScreen.value = backScreen;
    openSession(session);
  }

  async function openAgreementById(sessionId: string, backScreen: Screen = "home") {
    contractBackScreen.value = backScreen;
    const localSession = sessions.value.find((session) => session.id === sessionId);

    try {
      const response = await api.getSession(sessionId);
      upsertSession(response.session);
      screen.value = "contract";
    } catch {
      if (localSession) {
        upsertSession(localSession);
        screen.value = "contract";
        return;
      }
      showToast(copy.vouchers.openFailed);
    }
  }

  function openVouchers() {
    if (!requireAccount("vouchers")) {
      return;
    }
    void refreshCoupons();
  }

  function openVoucherDetail(voucherId: string) {
    activeVoucherId.value = voucherId;
    screen.value = "voucherDetail";
  }

  async function redeemCoupon(couponId: string) {
    try {
      await showConfirmDialog({
        title: copy.vouchers.confirmRedeemTitle,
        message: copy.vouchers.confirmRedeemText
      });
    } catch {
      return;
    }

    try {
      await api.useCoupon(couponId);
      await refreshCoupons();
      await refreshSessions();
      showToast(copy.vouchers.redeemSuccess);
    } catch {
      showToast(copy.vouchers.redeemFailed);
    }
  }

  async function signSession(payload: { nickname: string; signatureDataUrl: string }) {
    if (!activeShareCode.value) {
      return;
    }

    const user = await ensureIdentity();
    if (!user) {
      authReturnScreen.value = "sign";
      authError.value = null;
      authStep.value = "credentials";
      authOpen.value = true;
      return;
    }
    signLoading.value = true;
    authError.value = null;
    try {
      const response = await api.signShare(activeShareCode.value, payload);
      currentUser.value = {
        ...user,
        signatureDataUrl: payload.signatureDataUrl
      };
      upsertSession(response.session);
      await refreshCoupons();
      screen.value = "contract";
    } catch {
      showToast(copy.contract.signFailed);
    } finally {
      signLoading.value = false;
    }
  }

  async function registerAccount(payload: RegisterInput) {
    authLoading.value = true;
    authError.value = null;
    try {
      const response = await api.register(payload);
      currentUser.value = response.user;
      await refreshSessions();
      await refreshCoupons();
      const shareRestored = authReturnScreen.value === "sign" && (await restorePendingShareSession());
      authOpen.value = false;
      authStep.value = "credentials";
      screen.value = shareRestored ? "sign" : authReturnScreen.value;
      if (authReturnScreen.value === "draw" && !activeCard.value) {
        void drawCard();
      }
      authReturnScreen.value = "home";
    } catch {
      authError.value = copy.auth.saveFailed;
    } finally {
      authLoading.value = false;
    }
  }

  async function loginAccount(payload: LoginInput) {
    authLoading.value = true;
    authError.value = null;
    try {
      const response = await api.login(payload);
      currentUser.value = response.user;
      await refreshSessions();
      await refreshCoupons();
      const shareRestored = authReturnScreen.value === "sign" && (await restorePendingShareSession());
      authOpen.value = false;
      authStep.value = "credentials";
      screen.value = shareRestored ? "sign" : authReturnScreen.value;
      if (authReturnScreen.value === "draw" && !activeCard.value) {
        void drawCard();
      }
      authReturnScreen.value = "home";
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 404 && error.code === "ACCOUNT_NOT_FOUND") {
        authStep.value = "register";
        authError.value = copy.auth.accountNotFound;
        return;
      }
      authError.value = copy.auth.loginFailed;
    } finally {
      authLoading.value = false;
    }
  }

  function logoutAccount() {
    stopSessionRealtime();
    api.clearAuthToken();
    currentUser.value = null;
    sessions.value = [];
    coupons.value = [];
    activeSessionId.value = null;
    activeVoucherId.value = null;
    screen.value = "home";
  }

  function updateCreateDraft(nextDraft: CreateBetDraft) {
    createDraft.title = nextDraft.title;
    createDraft.judgmentRule = nextDraft.judgmentRule;
    createDraft.stake = nextDraft.stake;
    createDraft.creatorSignatureDataUrl = nextDraft.creatorSignatureDataUrl;
  }

  function resetCreateDraft() {
    createDraft.title = "";
    createDraft.judgmentRule = "";
    createDraft.stake = { ...defaultStake };
    createDraft.creatorSignatureDataUrl = "";
  }

  let realtimeDispose: (() => void) | undefined;
  let syncTimer: number | undefined;

  function shouldUseSessionRealtime() {
    return Boolean(
      currentUser.value &&
        activeSession.value &&
        ["contract", "session", "settlement"].includes(screen.value)
    );
  }

  function handleRealtimeEvent(event: SessionRealtimeEvent) {
    upsertSession(event.session);
    if (screen.value === "session" && event.session.winnerId) {
      screen.value = "settlement";
      void refreshCoupons();
    }
  }

  function stopSessionRealtime() {
    realtimeDispose?.();
    realtimeDispose = undefined;
    if (syncTimer) {
      window.clearInterval(syncTimer);
      syncTimer = undefined;
    }
  }

  function startSessionRealtime() {
    stopSessionRealtime();
    if (!shouldUseSessionRealtime() || !activeSession.value) {
      return;
    }

    const sessionId = activeSession.value.id;
    realtimeDispose = api.subscribeSessionEvents(sessionId, handleRealtimeEvent);
    syncTimer = window.setInterval(() => {
      void refreshActiveSession(true);
    }, 8_000);
  }

  function refreshWhenVisible() {
    if (
      (document.visibilityState === "visible" || document.hasFocus()) &&
      activeSessionId.value &&
      shouldUseSessionRealtime()
    ) {
      void refreshActiveSession(true);
    }
  }

  watch(
    () => [screen.value, activeSession.value?.id, currentUser.value?.id],
    () => {
      startSessionRealtime();
    }
  );

  onMounted(async () => {
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    const shareCode = new URLSearchParams(window.location.search).get("share");
    const user = await ensureIdentity();
    if (shareCode) {
      await loadShareSession(shareCode);
      if (user) {
        await refreshSessions();
        await restorePendingShareSession();
      }
      return;
    }
    void refreshSessions();
    void refreshCoupons();
  });

  onUnmounted(() => {
    stopSessionRealtime();
    window.removeEventListener("focus", refreshWhenVisible);
    document.removeEventListener("visibilitychange", refreshWhenVisible);
  });

  return {
    activeCard,
    activeSession,
    activeVoucherId,
    addBoost,
    authError,
    authLoading,
    authOpen,
    authStep,
    cardLoading,
    contractBackScreen,
    coupons,
    createDraft,
    currentUser,
    sessionRefreshing,
    sessions,
    sharePayload,
    signLoading,
    screen,
    copyShareText,
    createSession,
    confirmBoost,
    drawCard,
    loginAccount,
    logoutAccount,
    nativeShare,
    closeAuthSheet,
    clearAuthError,
    openAccount,
    openCreate,
    openAgreementById,
    openDraw,
    openHistory,
    openSession,
    openSessionFrom,
    openVoucherDetail,
    openVouchers,
    refreshActiveSession,
    registerAccount,
    redeemCoupon,
    settleSession,
    signSession,
    updateCreateDraft
  };
}
