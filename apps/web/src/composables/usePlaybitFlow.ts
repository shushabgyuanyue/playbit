import { drawCard as drawLocalCard } from "@playbit/cards";
import { copy } from "@playbit/content";
import { createBetSession, settleBetSession } from "@playbit/game-core";
import type { BetSession, Card, Coupon, CreateSessionInput, LoginInput, RegisterInput, User } from "@playbit/shared";
import { showConfirmDialog, showToast } from "vant";
import { computed, onMounted, ref } from "vue";
import { api } from "../services/api";

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

export function usePlaybitFlow() {
  const screen = ref<Screen>("home");
  const currentUser = ref<User | null>(null);
  const sessions = ref<BetSession[]>([]);
  const coupons = ref<Coupon[]>([]);
  const activeSessionId = ref<string | null>(null);
  const activeCard = ref<Card | null>(null);
  const activeVoucherId = ref<string | null>(null);
  const contractBackScreen = ref<Screen>("home");
  const drawnCardIds = ref<string[]>([]);
  const cardLoading = ref(false);
  const signLoading = ref(false);
  const authLoading = ref(false);
  const activeShareCode = ref<string | null>(null);

  const activeSession = computed(() =>
    sessions.value.find((session) => session.id === activeSessionId.value)
  );

  function persistSessions() {
    localStorage.setItem("playbit.sessions", JSON.stringify(sessions.value));
  }

  function loadLocalSessions() {
    const stored = localStorage.getItem("playbit.sessions");
    sessions.value = stored ? (JSON.parse(stored) as BetSession[]) : [];
  }

  function localGuest(): User {
    const stored = localStorage.getItem("playbit.localUser");
    if (stored) {
      return JSON.parse(stored) as User;
    }

    const user: User = {
      id: `local_${Math.random().toString(36).slice(2, 10)}`,
      nickname: "我",
      email: null,
      authLevel: "guest",
      createdAt: new Date().toISOString()
    };
    localStorage.setItem("playbit.localUser", JSON.stringify(user));
    return user;
  }

  async function ensureIdentity() {
    if (currentUser.value) {
      return currentUser.value;
    }

    if (api.getAuthToken()) {
      try {
        const response = await api.me();
        if (response.user) {
          currentUser.value = response.user;
          return response.user;
        }
      } catch {
        currentUser.value = localGuest();
        return currentUser.value;
      }
    }

    try {
      const response = await api.createGuest("我");
      currentUser.value = response.user;
      return response.user;
    } catch {
      currentUser.value = localGuest();
      return currentUser.value;
    }
  }

  async function refreshSessions() {
    await ensureIdentity();
    try {
      const response = await api.listSessions();
      sessions.value = response.sessions;
      persistSessions();
    } catch {
      loadLocalSessions();
    }
  }

  async function refreshCoupons() {
    await ensureIdentity();
    try {
      const response = await api.listCoupons();
      coupons.value = response.coupons;
    } catch {
      coupons.value = [];
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
    const sessionInput = {
      ...payload,
      creatorNickname: user.nickname
    };

    try {
      const response = await api.createSession(sessionInput);
      sessions.value = [response.session, ...sessions.value.filter((item) => item.id !== response.session.id)];
      activeSessionId.value = response.session.id;
    } catch {
      const session = createBetSession(sessionInput, user.id);
      sessions.value = [session, ...sessions.value];
      activeSessionId.value = session.id;
    }

    persistSessions();
    contractBackScreen.value = "create";
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

    persistSessions();
    screen.value = "settlement";
  }

  async function fulfillSession() {
    if (!activeSession.value) {
      return;
    }

    try {
      const response = await api.fulfillSession(activeSession.value.id);
      upsertSession(response.session);
      await refreshCoupons();
    } catch {
      const winnerId = activeSession.value.winnerId ?? activeSession.value.participants[0].id;
      upsertSession(settleBetSession(activeSession.value, winnerId, true));
    }

    persistSessions();
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
    if (localSession) {
      openSession(localSession);
      return;
    }

    try {
      const response = await api.getSession(sessionId);
      upsertSession(response.session);
      openSession(response.session);
    } catch {
      showToast(copy.vouchers.openFailed);
    }
  }

  function openVouchers() {
    screen.value = "vouchers";
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

  async function copyShareText() {
    if (!activeSession.value) {
      return;
    }

    const session = activeSession.value;
    const winner = session.participants.find((participant) => participant.id === session.winnerId)?.nickname;
    const shareLink = `${window.location.origin}${window.location.pathname}?share=${session.shareCode}`;
    const text = winner
      ? `《${copy.share.settlementTitle}》\n${copy.share.labels.agreement}：${session.title}\n${copy.share.labels.winner}：${winner}\n${copy.share.labels.stake}：${session.stake.label}`
      : `《${session.title}》${copy.share.labels.pending}\n${copy.share.labels.challenge}：${session.challenge}\n${copy.share.labels.judgment}：${session.judgmentRule}\n${copy.share.labels.stake}：${session.stake.label}\n${copy.share.labels.signLink}：${shareLink}`;

    await navigator.clipboard?.writeText(text);
  }

  async function signSession(nickname: string) {
    if (!activeShareCode.value) {
      return;
    }

    await ensureIdentity();
    signLoading.value = true;
    try {
      const response = await api.signShare(activeShareCode.value, nickname);
      upsertSession(response.session);
      persistSessions();
      await refreshCoupons();
      screen.value = "contract";
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
      screen.value = "home";
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
      screen.value = "home";
    } finally {
      authLoading.value = false;
    }
  }

  onMounted(() => {
    loadLocalSessions();
    const shareCode = new URLSearchParams(window.location.search).get("share");
    if (shareCode) {
      void ensureIdentity();
      void loadShareSession(shareCode);
      return;
    }
    void ensureIdentity();
    void refreshSessions();
    void refreshCoupons();
  });

  return {
    activeCard,
    activeSession,
    activeVoucherId,
    authLoading,
    cardLoading,
    contractBackScreen,
    coupons,
    currentUser,
    sessions,
    signLoading,
    screen,
    copyShareText,
    createSession,
    drawCard,
    fulfillSession,
    loginAccount,
    openSession,
    openSessionById,
    openSessionFrom,
    openVoucherDetail,
    openVouchers,
    registerAccount,
    redeemCoupon,
    settleSession,
    signSession
  };
}
