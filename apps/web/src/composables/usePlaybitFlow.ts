import { drawCard as drawLocalCard } from "@playbit/cards";
import { copy } from "@playbit/content";
import type {
  Agreement,
  Card,
  Coupon,
  GraceTicket,
  GraceWaiver,
  CreateAgreementInput,
  LoginInput,
  RegisterInput,
  AgreementRealtimeEvent,
  SignAgreementInput,
  Stake,
  User
} from "@playbit/shared";
import { showConfirmDialog, showToast } from "vant";
import { computed, onMounted, onUnmounted, reactive, ref, watch } from "vue";
import { api, ApiRequestError } from "../services/api";
import type { Screen } from "../types/screen";
import {
  buildSharePayload,
  defaultStake,
  type SharePayload
} from "./playbitFlowHelpers";
import { useShareActions } from "./useShareActions";
import { useFlipFlow, useGraceFlow } from "./useEquityFeatures";

export type CreateBetDraft = {
  title: string;
  stake: Stake;
  creatorSignatureDataUrl: string;
};

export function usePlaybitFlow() {
  const screen = ref<Screen>("home");
  const currentUser = ref<User | null>(null);
  const authOpen = ref(false);
  const authError = ref<string | null>(null);
  const authStep = ref<"credentials" | "register">("credentials");
  const pendingCreatePayload = ref<CreateAgreementInput | null>(null);
  const agreements = ref<Agreement[]>([]);
  const coupons = ref<Coupon[]>([]);
  const graceTickets = ref<GraceTicket[]>([]);
  const graceWaivers = ref<GraceWaiver[]>([]);
  const activeAgreementId = ref<string | null>(null);
  const activeCard = ref<Card | null>(null);
  const activeVoucherId = ref<string | null>(null);
  const contractBackScreen = ref<Screen>("home");
  const certificateBackScreen = ref<Screen>("home");
  const certificateKind = ref<"agreement" | "result" | "fulfillment" | "waiver" | "flip">("agreement");
  const certificateAction = ref<"save" | "share" | null>(null);
  const authReturnScreen = ref<Screen>("home");
  const drawnCardIds = ref<string[]>([]);
  const cardLoading = ref(false);
  const createLoading = ref(false);
  const signLoading = ref(false);
  const pendingSignSignature = ref<string | null>(null);
  const authLoading = ref(false);
  const profileLoading = ref(false);
  const profileError = ref<string | null>(null);
  const agreementRefreshing = ref(false);
  const activeShareCode = ref<string | null>(null);
  const pendingFlipId = ref<string | null>(null);
  const pendingFlipCouponId = ref<string | null>(null);
  const flipBackScreen = ref<Screen>("home");
  const createDraft = reactive<CreateBetDraft>({
    title: "",
    stake: { ...defaultStake },
    creatorSignatureDataUrl: ""
  });

  const activeAgreement = computed(() =>
    agreements.value.find((agreement) => agreement.id === activeAgreementId.value)
  );

  const sharePayload = computed<SharePayload | null>(() =>
    activeAgreement.value ? buildSharePayload(activeAgreement.value) : null
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
    pendingSignSignature.value = null;
    pendingCreatePayload.value = null;
    pendingFlipCouponId.value = null;
  }

  function clearAuthError() {
    authError.value = null;
  }

  function openCreate() {
    resetCreateDraft();
    screen.value = "create";
  }

  function openDraw() {
    screen.value = "draw";
    if (!activeCard.value) {
      void drawCard();
    }
  }

  function openFeaturedCard(card: Card) {
    activeCard.value = card;
    if (!drawnCardIds.value.includes(card.id)) {
      drawnCardIds.value = [...drawnCardIds.value, card.id];
    }
    screen.value = "draw";
  }

  function beginCardUpgrade() {
    requireAccount("draw");
  }

  function openHistory() {
    requireAccount("history");
  }

  async function refreshAgreements() {
    const user = await ensureIdentity();
    if (!user) {
      agreements.value = [];
      return;
    }
    try {
      const response = await api.listAgreements();
      agreements.value = response.agreements;
    } catch {
      agreements.value = [];
    }
  }

  async function restorePendingShareAgreement() {
    if (!activeShareCode.value) {
      return false;
    }

    try {
      const response = await api.getShare(activeShareCode.value);
      upsertAgreement(response.agreement);
      return true;
    } catch {
      activeAgreementId.value = null;
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

  async function refreshActiveAgreement(silent = false) {
    if (!activeAgreementId.value) {
      return;
    }
    if (agreementSyncInFlight) {
      return;
    }

    agreementSyncInFlight = true;
    if (!silent) {
      agreementRefreshing.value = true;
    }
    try {
      const response = await api.syncAgreement(activeAgreementId.value);
      upsertAgreement(response.agreement);
    } catch {
      // Keep the current contract visible if the network is temporarily unavailable.
    } finally {
      agreementSyncInFlight = false;
      if (!silent) {
        agreementRefreshing.value = false;
      }
    }
  }

  async function loadShareAgreement(shareCode: string) {
    activeShareCode.value = shareCode;
    activeAgreementId.value = null;
    await restorePendingShareAgreement();
    showSharedAgreement();
  }

  function showSharedAgreement() {
    const agreement = activeAgreement.value;
    if (!agreement || !currentUser.value) {
      screen.value = "sign";
      return;
    }
    if (agreement.participants.some((participant) => participant.userId === currentUser.value?.id)) {
      contractBackScreen.value = "home";
      openAgreement(agreement);
      return;
    }
    screen.value = "sign";
  }

  async function createAgreement(payload: CreateAgreementInput) {
    const user = await ensureIdentity();
    if (!user) {
      pendingCreatePayload.value = payload;
      authReturnScreen.value = screen.value;
      authError.value = null;
      authStep.value = "credentials";
      authOpen.value = true;
      return;
    }
    if (!payload.creatorSignatureDataUrl) {
      showToast(copy.create.signatureRequired);
      return;
    }
    const sessionInput = {
      ...payload,
      creatorNickname: user.nickname
    };

    createLoading.value = true;
    try {
      const response = await api.createAgreement(sessionInput);
      currentUser.value = {
        ...user,
        signatureDataUrl: payload.creatorSignatureDataUrl
      };
      agreements.value = [response.agreement, ...agreements.value.filter((item) => item.id !== response.agreement.id)];
      activeAgreementId.value = response.agreement.id;

      contractBackScreen.value = payload.source === "card" ? "draw" : "create";
      screen.value = "contract";
    } catch {
      showToast(copy.create.createFailed);
    } finally {
      createLoading.value = false;
    }
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

  async function recordAgreementResult(winnerId: string) {
    if (!activeAgreement.value) {
      return;
    }

    try {
      const response = await api.recordAgreementResult(activeAgreement.value.id, winnerId);
      upsertAgreement(response.agreement);
      await refreshCoupons();
    } catch {
      await refreshActiveAgreement(true);
      showToast(copy.session.stateSyncFailed);
      return;
    }

    screen.value = "settlement";
  }

  async function addBoost(label: string) {
    if (!activeAgreement.value) {
      return;
    }
    try {
      const response = await api.addBoost(activeAgreement.value.id, label);
      upsertAgreement(response.agreement);
    } catch {
      showToast(copy.session.boostFailed);
    }
  }

  async function confirmBoost(boostId: string) {
    if (!activeAgreement.value) {
      return;
    }
    try {
      const response = await api.confirmBoost(activeAgreement.value.id, boostId);
      upsertAgreement(response.agreement);
    } catch {
      showToast(copy.session.boostFailed);
    }
  }

  function upsertAgreement(agreement: Agreement) {
    const existing = agreements.value.find((candidate) => candidate.id === agreement.id);
    if (existing && agreement.revision < existing.revision) {
      return;
    }
    agreements.value = [agreement, ...agreements.value.filter((candidate) => candidate.id !== agreement.id)];
    activeAgreementId.value = agreement.id;
  }

  const graceFlow = useGraceFlow({
    graceTickets,
    graceWaivers,
    ensureIdentity,
    refreshAgreements,
    refreshCoupons,
    upsertAgreement,
    setScreen: (nextScreen) => { screen.value = nextScreen; }
  });
  const { refreshGrace, requestGraceWaiver, respondGraceWaiver, fulfillCustomAgreement } = graceFlow;
  const flipFlow = useFlipFlow({
    agreements,
    coupons,
    activeAgreementId,
    screen,
    returnScreen: flipBackScreen,
    pendingFlipId,
    pendingFlipCouponId,
    ensureIdentity,
    requireAccount,
    refreshAgreements,
    refreshCoupons,
    refreshGrace,
    upsertAgreement
  });
  const {
    activeFlip, voucherFlip, voucherFlipLoading, voucherFlipError, flipBusy,
    loadVoucherFlips, startFlip, loadFlip, respondToFlip, refreshFlip, recordFlipOutcome, shareFlip
  } = flipFlow;

  function openAgreement(agreement: Agreement) {
    activeAgreementId.value = agreement.id;
    screen.value = agreement.winnerId ? "settlement" : agreement.status === "active" ? "agreement" : "contract";
  }

  function openAgreementFrom(agreement: Agreement, backScreen: Screen = "home") {
    contractBackScreen.value = backScreen;
    openAgreement(agreement);
  }

  function openCertificate(
    kind: "agreement" | "result" | "fulfillment" | "waiver",
    action: "save" | "share" | null = null
  ) {
    if (!activeAgreement.value) return;
    certificateBackScreen.value = screen.value;
    certificateKind.value = kind;
    certificateAction.value = action;
    screen.value = "certificate";
  }

  async function openVoucherCertificate(agreementId: string) {
    if (!agreementId) return;

    const localAgreement = agreements.value.find((agreement) => agreement.id === agreementId);
    try {
      const response = await api.getAgreement(agreementId);
      upsertAgreement(response.agreement);
      certificateBackScreen.value = "voucherDetail";
      certificateKind.value = "waiver";
      certificateAction.value = null;
      screen.value = "certificate";
    } catch (error) {
      if (localAgreement && !(error instanceof ApiRequestError)) {
        upsertAgreement(localAgreement);
        certificateBackScreen.value = "voucherDetail";
        certificateKind.value = "waiver";
        certificateAction.value = null;
        screen.value = "certificate";
        return;
      }
      showToast(copy.vouchers.openFailed);
    }
  }

  function openFlipCertificate() {
    if (!activeFlip.value) return;
    certificateBackScreen.value = screen.value;
    certificateKind.value = "flip";
    certificateAction.value = null;
    screen.value = "certificate";
  }

  function closeCertificate() {
    certificateAction.value = null;
    screen.value = certificateBackScreen.value;
  }

  function closeFlip() {
    screen.value = flipBackScreen.value;
    if (screen.value === "voucherDetail" && activeVoucherId.value) {
      void loadVoucherFlips(activeVoucherId.value);
    }
  }

  async function openAgreementById(agreementId: string, backScreen: Screen = "home") {
    contractBackScreen.value = backScreen;
    const localSession = agreements.value.find((agreement) => agreement.id === agreementId);

    try {
      const response = await api.getAgreement(agreementId);
      upsertAgreement(response.agreement);
      openAgreement(response.agreement);
    } catch (error) {
      if (localSession && !(error instanceof ApiRequestError)) {
        upsertAgreement(localSession);
        openAgreement(localSession);
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
    void loadVoucherFlips(voucherId);
  }

  function openVoucherFlip() {
    if (voucherFlip.value) void loadFlip(voucherFlip.value.id, "voucherDetail");
  }

  function retryVoucherFlip() {
    if (activeVoucherId.value) void loadVoucherFlips(activeVoucherId.value);
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
      await refreshAgreements();
      await refreshGrace();
      showToast(copy.vouchers.redeemSuccess);
    } catch {
      showToast(copy.vouchers.redeemFailed);
    }
  }

  async function signSession(payload: SignAgreementInput) {
    if (!activeShareCode.value) {
      return;
    }

    const user = await ensureIdentity();
    if (!user) {
      pendingSignSignature.value = payload.signatureDataUrl;
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
      upsertAgreement(response.agreement);
      await refreshCoupons();
      pendingSignSignature.value = null;
      screen.value = "contract";
    } catch (error) {
      if (error instanceof ApiRequestError && [403, 409].includes(error.status)) {
        await restorePendingShareAgreement();
        showSharedAgreement();
      }
      showToast(copy.contract.signFailed);
    } finally {
      signLoading.value = false;
    }
  }

  async function continuePendingSignature(shareRestored: boolean) {
    const signatureDataUrl = pendingSignSignature.value;
    pendingSignSignature.value = null;
    if (shareRestored && signatureDataUrl && activeAgreement.value?.status === "pending_signature" &&
      !activeAgreement.value.participants.some((participant) => participant.userId === currentUser.value?.id)) {
      await signSession({ signatureDataUrl });
    }
  }

  async function resumeAfterAuth() {
    const returnScreen = authReturnScreen.value;
    const pendingCreate = pendingCreatePayload.value;
    const pendingFlipCoupon = pendingFlipCouponId.value;
    pendingCreatePayload.value = null;
    pendingFlipCouponId.value = null;
    const shareRestored = returnScreen === "sign" && (await restorePendingShareAgreement());
    const flipRestored = returnScreen === "flip" && pendingFlipId.value
      ? await loadFlip(pendingFlipId.value)
      : false;

    authOpen.value = false;
    authStep.value = "credentials";
    screen.value = flipRestored ? "flip" : returnScreen;
    if (shareRestored) showSharedAgreement();
    if (returnScreen === "draw" && !activeCard.value) {
      void drawCard();
    }
    await continuePendingSignature(Boolean(shareRestored));
    if (pendingCreate) {
      await createAgreement(pendingCreate);
    }
    if (pendingFlipCoupon) {
      await startFlip(pendingFlipCoupon);
    }
    authReturnScreen.value = "home";
  }

  async function registerAccount(payload: RegisterInput) {
    authLoading.value = true;
    authError.value = null;
    try {
      const response = await api.register(payload);
      currentUser.value = response.user;
      await refreshAgreements();
      await refreshCoupons();
      await refreshGrace();
      await resumeAfterAuth();
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
      await refreshAgreements();
      await refreshCoupons();
      await refreshGrace();
      await resumeAfterAuth();
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 404 && error.code === "ACCOUNT_NOT_FOUND") {
        authStep.value = "register";
        return;
      }
      authError.value = error instanceof ApiRequestError && error.status === 401
        ? copy.auth.loginFailed
        : copy.auth.loginUnavailable;
    } finally {
      authLoading.value = false;
    }
  }

  async function updateProfile(nickname: string) {
    const user = currentUser.value;
    if (!user || !nickname.trim() || profileLoading.value) {
      return;
    }
    profileLoading.value = true;
    profileError.value = null;
    try {
      const response = await api.updateProfile({ nickname: nickname.trim() });
      currentUser.value = response.user;
      showToast(copy.auth.profileSaved);
    } catch {
      profileError.value = copy.auth.profileFailed;
    } finally {
      profileLoading.value = false;
    }
  }

  function logoutAccount() {
    stopSessionRealtime();
    api.clearAuthToken();
    currentUser.value = null;
    agreements.value = [];
    coupons.value = [];
    graceTickets.value = [];
    graceWaivers.value = [];
    activeFlip.value = null;
    pendingFlipId.value = null;
    pendingFlipCouponId.value = null;
    activeAgreementId.value = null;
    activeVoucherId.value = null;
    screen.value = "home";
  }

  function updateCreateDraft(nextDraft: CreateBetDraft) {
    createDraft.title = nextDraft.title;
    createDraft.stake = nextDraft.stake;
    createDraft.creatorSignatureDataUrl = nextDraft.creatorSignatureDataUrl;
  }

  function resetCreateDraft() {
    createDraft.title = "";
    createDraft.stake = { ...defaultStake };
    createDraft.creatorSignatureDataUrl = "";
  }

  let realtimeDispose: (() => void) | undefined;
  let syncTimer: number | undefined;
  let realtimeFallbackTimer: number | undefined;
  let agreementSyncInFlight = false;

  function shouldUseSessionRealtime() {
    return Boolean(
      currentUser.value &&
        activeAgreement.value &&
        ["contract", "agreement", "settlement"].includes(screen.value)
    );
  }

  function handleRealtimeEvent(event: AgreementRealtimeEvent) {
    upsertAgreement(event.agreement);
    if (screen.value === "agreement" && event.agreement.winnerId) {
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
    if (realtimeFallbackTimer) {
      window.clearTimeout(realtimeFallbackTimer);
      realtimeFallbackTimer = undefined;
    }
  }

  function startSessionRealtime() {
    stopSessionRealtime();
    if (!shouldUseSessionRealtime() || !activeAgreement.value) {
      return;
    }

    const agreementId = activeAgreement.value.id;
    let realtimeConnected = false;
    const startFallbackPolling = () => {
      if (realtimeConnected || syncTimer) {
        return;
      }
      void refreshActiveAgreement(true);
      const syncInterval = activeAgreement.value?.status === "pending_signature" ? 5_000 : 10_000;
      syncTimer = window.setInterval(() => {
        void refreshActiveAgreement(true);
      }, syncInterval);
    };

    realtimeDispose = api.subscribeAgreementEvents(
      agreementId,
      handleRealtimeEvent,
      () => {
        realtimeConnected = false;
        startFallbackPolling();
      },
      () => {
        realtimeConnected = true;
        if (realtimeFallbackTimer) {
          window.clearTimeout(realtimeFallbackTimer);
          realtimeFallbackTimer = undefined;
        }
        if (syncTimer) {
          window.clearInterval(syncTimer);
          syncTimer = undefined;
        }
      }
    );
    void refreshActiveAgreement(true);
    realtimeFallbackTimer = window.setTimeout(() => {
      if (!realtimeConnected) {
        startFallbackPolling();
      }
    }, 8_000);
  }

  function refreshWhenVisible() {
    if (
      (document.visibilityState === "visible" || document.hasFocus()) &&
      activeAgreementId.value &&
      shouldUseSessionRealtime()
    ) {
      void refreshActiveAgreement(true);
    }
  }

  watch(
    () => [
      screen.value,
      activeAgreement.value?.id,
      currentUser.value?.id
    ],
    () => {
      startSessionRealtime();
    }
  );

  onMounted(async () => {
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    const shareCode = new URLSearchParams(window.location.search).get("share");
    const user = await ensureIdentity();
    const flipId = new URLSearchParams(window.location.search).get("flip");
    if (flipId) {
      pendingFlipId.value = flipId;
      if (user) {
        await loadFlip(flipId);
      } else {
        authReturnScreen.value = "flip";
        authOpen.value = true;
      }
      return;
    }
    if (shareCode) {
      await loadShareAgreement(shareCode);
      if (user) {
        await refreshAgreements();
        await restorePendingShareAgreement();
        showSharedAgreement();
      }
      return;
    }
    void refreshAgreements();
    void refreshCoupons();
    void refreshGrace();
  });

  onUnmounted(() => {
    stopSessionRealtime();
    window.removeEventListener("focus", refreshWhenVisible);
    document.removeEventListener("visibilitychange", refreshWhenVisible);
  });

  return {
    activeCard,
    activeAgreement,
    activeVoucherId,
    voucherFlip,
    voucherFlipLoading,
    voucherFlipError,
    flipBusy,
    addBoost,
    authError,
    authLoading,
    profileLoading,
    profileError,
    authOpen,
    authStep,
    cardLoading,
    createLoading,
    contractBackScreen,
    certificateKind,
    certificateAction,
    coupons,
    createDraft,
    currentUser,
    agreementRefreshing,
    agreements,
    sharePayload,
    signLoading,
    screen,
    copyShareText,
    createAgreement,
    confirmBoost,
    drawCard,
    beginCardUpgrade,
    loginAccount,
    logoutAccount,
    nativeShare,
    closeAuthSheet,
    clearAuthError,
    openAccount,
    openCreate,
    openAgreementById,
    openDraw,
    openFeaturedCard,
    openHistory,
    openAgreement,
    openAgreementFrom,
    openCertificate,
    openVoucherCertificate,
    openFlipCertificate,
    closeCertificate,
    closeFlip,
    openVoucherDetail,
    openVoucherFlip,
    retryVoucherFlip,
    openVouchers,
    refreshActiveAgreement,
    registerAccount,
    redeemCoupon,
    recordAgreementResult,
    startFlip,
    loadFlip,
    activeFlip,
    flipBackScreen,
    respondToFlip,
    refreshFlip,
    recordFlipOutcome,
    shareFlip,
    graceTickets,
    graceWaivers,
    requestGraceWaiver,
    respondGraceWaiver,
    fulfillCustomAgreement,
    signSession,
    updateCreateDraft,
    updateProfile
  };
}
