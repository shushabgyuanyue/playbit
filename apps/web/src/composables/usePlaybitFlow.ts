import { drawCard as drawLocalCard } from "@playbit/cards";
import { copy } from "@playbit/content";
import { settleBetSession } from "@playbit/game-core";
import type {
  BetSession,
  Card,
  Coupon,
  CreateSessionInput,
  LoginInput,
  RegisterInput,
  Stake,
  User
} from "@playbit/shared";
import { showConfirmDialog, showToast } from "vant";
import { computed, onMounted, onUnmounted, reactive, ref, watch } from "vue";
import { api } from "../services/api";
import {
  buildSharePayload,
  defaultStake,
  loadLocalSessions,
  persistSessions,
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
    screen.value = "account";
    showToast(copy.auth.requiredTitle);
    return false;
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
      persistSessions(sessions.value);
    } catch {
      sessions.value = loadLocalSessions();
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
      const response = await api.getSession(activeSessionId.value);
      upsertSession(response.session);
      persistSessions(sessions.value);
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
      activeSessionId.value = localSession.id;
      screen.value = "sign";
    }

    try {
      const response = await api.getShare(shareCode);
      upsertSession(response.session);
      screen.value = "sign";
    } catch {
      screen.value = "sign";
    }
  }

  async function createSession(payload: CreateSessionInput) {
    const user = await ensureIdentity();
    if (!user) {
      authReturnScreen.value = screen.value;
      screen.value = "account";
      showToast(copy.auth.requiredTitle);
      return;
    }
    const sessionInput = {
      ...payload,
      creatorNickname: user.nickname
    };

    const response = await api.createSession(sessionInput);
    sessions.value = [response.session, ...sessions.value.filter((item) => item.id !== response.session.id)];
    activeSessionId.value = response.session.id;

    persistSessions(sessions.value);
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

  async function settleSession(winnerId: string, fulfilled: boolean) {
    if (!activeSession.value) {
      return;
    }

    try {
      const response = await api.settleSession(activeSession.value.id, winnerId, fulfilled);
      upsertSession(response.session);
      await refreshCoupons();
    } catch {
      upsertSession(settleBetSession(activeSession.value, winnerId, fulfilled));
    }

    persistSessions(sessions.value);
    screen.value = "settlement";
  }

  function upsertSession(session: BetSession) {
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

  async function openSessionById(sessionId: string, backScreen: Screen = "home") {
    contractBackScreen.value = backScreen;
    const localSession = sessions.value.find((session) => session.id === sessionId);

    try {
      const response = await api.getSession(sessionId);
      upsertSession(response.session);
      openSession(response.session);
    } catch {
      if (localSession) {
        openSession(localSession);
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
      screen.value = "account";
      showToast(copy.auth.requiredTitle);
      return;
    }
    signLoading.value = true;
    try {
      const response = await api.signShare(activeShareCode.value, payload);
      upsertSession(response.session);
      persistSessions(sessions.value);
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
    try {
      const response = await api.register(payload);
      currentUser.value = response.user;
      await refreshSessions();
      await refreshCoupons();
      screen.value = authReturnScreen.value;
      if (authReturnScreen.value === "draw" && !activeCard.value) {
        void drawCard();
      }
      authReturnScreen.value = "home";
    } catch {
      showToast(copy.auth.saveFailed);
    } finally {
      authLoading.value = false;
    }
  }

  async function loginAccount(payload: LoginInput) {
    authLoading.value = true;
    try {
      const response = await api.login(payload);
      currentUser.value = response.user;
      await refreshSessions();
      await refreshCoupons();
      screen.value = authReturnScreen.value;
      if (authReturnScreen.value === "draw" && !activeCard.value) {
        void drawCard();
      }
      authReturnScreen.value = "home";
    } catch {
      showToast(copy.auth.loginFailed);
    } finally {
      authLoading.value = false;
    }
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

  let refreshTimer: number | undefined;

  function shouldPollActiveSession() {
    return screen.value === "contract" && activeSession.value?.status === "pending_confirmation";
  }

  function startActiveSessionPolling() {
    stopActiveSessionPolling();
    refreshTimer = window.setInterval(() => {
      if (shouldPollActiveSession()) {
        void refreshActiveSession(true);
      }
    }, 5000);
  }

  function stopActiveSessionPolling() {
    if (refreshTimer) {
      window.clearInterval(refreshTimer);
      refreshTimer = undefined;
    }
  }

  function refreshWhenVisible() {
    if ((document.visibilityState === "visible" || document.hasFocus()) && activeSessionId.value) {
      void refreshActiveSession(true);
    }
  }

  watch(
    () => [screen.value, activeSession.value?.status, activeSessionId.value],
    () => {
      if (shouldPollActiveSession()) {
        void refreshActiveSession(true);
        startActiveSessionPolling();
        return;
      }
      stopActiveSessionPolling();
    }
  );

  onMounted(() => {
    sessions.value = loadLocalSessions();
    const shareCode = new URLSearchParams(window.location.search).get("share");
    if (shareCode) {
      void loadShareSession(shareCode);
      return;
    }
    void ensureIdentity();
    void refreshSessions();
    void refreshCoupons();
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);
  });

  onUnmounted(() => {
    stopActiveSessionPolling();
    window.removeEventListener("focus", refreshWhenVisible);
    document.removeEventListener("visibilitychange", refreshWhenVisible);
  });

  return {
    activeCard,
    activeSession,
    activeVoucherId,
    authLoading,
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
    drawCard,
    loginAccount,
    nativeShare,
    openCreate,
    openDraw,
    openHistory,
    openSession,
    openSessionById,
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
