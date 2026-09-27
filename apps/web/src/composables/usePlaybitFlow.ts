import { drawCard as drawLocalCard } from "@playbit/cards";
import { copy } from "@playbit/content";
import { canDeleteAgreement } from "@playbit/game-core";
import type {
  Agreement,
  Card,
  Coupon,
  GraceTicket,
  GraceWaiver,
  CreateAgreementInput,
  LoginInput,
  RegisterInput,
  UpdateProfileInput,
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
import { useFlipFlow, useGraceFlow } from "./useEquityFeatures";
import { useGameFlow } from "./useGameFlow";
import { requestId } from "../utils/requestId";

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
  const removedAgreementIds = new Set<string>();
  const coupons = ref<Coupon[]>([]);
  const graceTickets = ref<GraceTicket[]>([]);
  const graceWaivers = ref<GraceWaiver[]>([]);
  const activeAgreementId = ref<string | null>(null);
  const activeCard = ref<Card | null>(null);
  const activeVoucherId = ref<string | null>(null);
  const contractBackScreen = ref<Screen>("home");
  const certificateBackScreen = ref<Screen>("home");
  const certificateKind = ref<"agreement" | "result" | "fulfillment" | "waiver">("agreement");
  const certificateAction = ref<"save" | "share" | null>(null);
  const authReturnScreen = ref<Screen>("home");
  const editingAgreementId = ref<string | null>(null);
  const editingRevision = ref<number | null>(null);
  let createAttempt: { id: string; fingerprint: string } | null = null;
  const drawnCardIds = ref<string[]>([]);
  const cardLoading = ref(false);
  const createLoading = ref(false);
  const signLoading = ref(false);
  const resultLoading = ref(false);
  const pendingSignSignature = ref<SignAgreementInput | null>(null);
  const boostLoading = ref(false);
  const authLoading = ref(false);
  const profileLoading = ref(false);
  const profileError = ref<string | null>(null);
  const agreementRefreshing = ref(false);
  const agreementsLoading = ref(false);
  const agreementsError = ref<string | null>(null);
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
  const gameFlow = useGameFlow({ activeCard, activeAgreement, screen, user: currentUser,
    requireAccount, upsert: upsertAgreement, open: openAgreement });

  async function ensureIdentity() {
    if (currentUser.value) {
      return currentUser.value;
    }

    const token = api.getAuthToken();
    if (!token) {
      return null;
    }

    try {
      const response = await api.me();
      if (api.getAuthToken() !== token) return currentUser.value;
      currentUser.value = response.user;
      return response.user;
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 401 && api.getAuthToken() === token) {
        api.clearAuthToken();
        currentUser.value = null;
        return null;
      }
      throw error;
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
    gameFlow.clearPending();
  }

  function clearAuthError() {
    authError.value = null;
  }

  function openCreate() {
    resetCreateDraft();
    editingAgreementId.value = null;
    editingRevision.value = null;
    createAttempt = null;
    screen.value = "create";
  }

  function openDraw() {
    gameFlow.error.value = "";
    screen.value = "draw";
    if (!activeCard.value) {
      void drawCard();
    }
  }

  function openFeaturedCard(card: Card) {
    gameFlow.error.value = "";
    activeCard.value = card;
    if (!drawnCardIds.value.includes(card.id)) {
      drawnCardIds.value = [...drawnCardIds.value, card.id];
    }
    screen.value = "draw";
  }

  function openHistory() {
    requireAccount("history");
  }

  let agreementsRequestInFlight = false;

  async function refreshAgreements() {
    if (agreementsRequestInFlight) {
      return;
    }

    agreementsRequestInFlight = true;
    agreementsLoading.value = true;
    agreementsError.value = null;
    try {
      const user = await ensureIdentity();
      if (!user) {
        agreements.value = [];
        return;
      }

      const knownIds = new Set(agreements.value.map(agreement => agreement.id));
      const response = await api.listAgreements();
      if (currentUser.value?.id !== user.id) return;
      const newlyCreated = agreements.value.filter(agreement => !knownIds.has(agreement.id) &&
        !response.agreements.some(item => item.id === agreement.id));
      agreements.value = [...newlyCreated, ...response.agreements.filter(agreement => !removedAgreementIds.has(agreement.id)).map(agreement => {
        const local = agreements.value.find(item => item.id === agreement.id);
        return local && local.revision > agreement.revision ? local : agreement;
      })];
    } catch {
      agreementsError.value = copy.home.overviewLoadFailedNote;
    } finally {
      agreementsRequestInFlight = false;
      agreementsLoading.value = false;
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
    } catch (error) {
      activeAgreementId.value = null;
      if (error instanceof ApiRequestError && error.status === 403 && !currentUser.value) {
        authReturnScreen.value = "sign";
        authOpen.value = true;
      }
      return false;
    }
  }

  async function refreshCoupons() {
    try {
      const user = await ensureIdentity();
      if (!user) { coupons.value = []; return; }
      const response = await api.listCoupons();
      if (currentUser.value?.id === user.id) coupons.value = response.coupons;
    } catch {
      // A temporary failure must not turn existing equity into an empty wallet.
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
    const agreementId = activeAgreementId.value;
    const userId = currentUser.value?.id;
    if (!silent) {
      agreementRefreshing.value = true;
    }
    try {
      const response = await api.syncAgreement(agreementId);
      if (activeAgreementId.value !== agreementId || currentUser.value?.id !== userId) return;
      upsertAgreement(response.agreement);
      if (["game", "agreement"].includes(screen.value) && response.agreement.winnerId) {
        screen.value = "settlement";
        void refreshCoupons();
      }
    } catch (error) {
      // Keep the current contract visible if the network is temporarily unavailable.
      if (error instanceof ApiRequestError && error.status === 404 && activeAgreementId.value === agreementId) {
        removeAgreementLocally(agreementId);
        showToast(copy.contract.removed);
        return;
      }
      if (!silent) showToast(copy.session.stateSyncFailed);
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
    if (agreement?.source === "card") {
      gameFlow.inviteCode.value = agreement.shareCode;
      openAgreement(agreement);
      return;
    }
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
    if (createLoading.value) return;
    createLoading.value = true;
    try {
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
      const sessionInput = { ...payload, creatorNickname: user.nickname };

      const fingerprint = JSON.stringify([user.id, payload.title, payload.challenge, payload.stake]);
      if (!createAttempt || createAttempt.fingerprint !== fingerprint) createAttempt = { id: requestId(), fingerprint };
      const response = editingAgreementId.value
        ? await api.updateAgreement(editingAgreementId.value, sessionInput, editingRevision.value!)
        : await api.createAgreement(sessionInput, createAttempt.id);
      if (currentUser.value?.id !== user.id) return;
      currentUser.value = {
        ...user,
        signatureDataUrl: payload.creatorSignatureDataUrl
      };
      agreements.value = [response.agreement, ...agreements.value.filter((item) => item.id !== response.agreement.id)];
      activeAgreementId.value = response.agreement.id;
      editingAgreementId.value = response.agreement.id;
      editingRevision.value = response.agreement.revision;

      contractBackScreen.value = "create";
      screen.value = "contract";
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 409 && editingAgreementId.value) {
        const response = await api.getAgreement(editingAgreementId.value).catch(() => null);
        if (response) {
          upsertAgreement(response.agreement);
          screen.value = "contract";
        }
        showToast(copy.contract.changedReview);
      } else showToast(copy.create.createFailed);
    } finally {
      createLoading.value = false;
    }
  }

  async function drawCard() {
    if (cardLoading.value) return;
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
    if (!activeAgreement.value || resultLoading.value) {
      return;
    }
    resultLoading.value = true;
    const id = activeAgreement.value.id;
    const userId = currentUser.value?.id;
    try {
      const response = await api.recordAgreementResult(id, winnerId);
      if (currentUser.value?.id !== userId || activeAgreementId.value !== id) return;
      upsertAgreement(response.agreement);
      await refreshCoupons();
    } catch {
      if (currentUser.value?.id !== userId || activeAgreementId.value !== id) return;
      await refreshActiveAgreement(true);
      if (activeAgreement.value?.winnerId === winnerId) {
        screen.value = "settlement";
        void refreshCoupons();
        return;
      }
      showToast(copy.session.stateSyncFailed);
      return;
    } finally {
      resultLoading.value = false;
    }

    if (currentUser.value?.id === userId && activeAgreementId.value === id) screen.value = "settlement";
  }

  async function addBoost(label: string) {
    if (!activeAgreement.value || boostLoading.value) {
      return;
    }
    boostLoading.value = true;
    const id = activeAgreement.value.id;
    const userId = currentUser.value?.id;
    try {
      const response = await api.addBoost(id, label);
      if (currentUser.value?.id !== userId || activeAgreementId.value !== id) return;
      upsertAgreement(response.agreement);
    } catch {
      await refreshActiveAgreement(true);
      showToast(copy.session.boostFailed);
    } finally { boostLoading.value = false; }
  }

  async function confirmBoost(boostId: string) {
    if (!activeAgreement.value || boostLoading.value) {
      return;
    }
    boostLoading.value = true;
    const id = activeAgreement.value.id;
    const userId = currentUser.value?.id;
    try {
      const response = await api.confirmBoost(id, boostId);
      if (currentUser.value?.id !== userId || activeAgreementId.value !== id) return;
      upsertAgreement(response.agreement);
    } catch {
      await refreshActiveAgreement(true);
      showToast(copy.session.boostFailed);
    } finally { boostLoading.value = false; }
  }

  async function withdrawBoost(boostId: string) {
    if (!activeAgreement.value || boostLoading.value) return;
    const id = activeAgreement.value.id;
    const userId = currentUser.value?.id;
    boostLoading.value = true;
    try {
      const response = await api.withdrawBoost(id, boostId);
      if (currentUser.value?.id !== userId || activeAgreementId.value !== id) return;
      upsertAgreement(response.agreement);
      showToast(copy.session.boostWithdrawn);
    } catch {
      if (currentUser.value?.id !== userId || activeAgreementId.value !== id) return;
      await refreshActiveAgreement(true);
      showToast(copy.session.boostWithdrawFailed);
    } finally { boostLoading.value = false; }
  }

  function upsertAgreement(agreement: Agreement) {
    if (removedAgreementIds.has(agreement.id)) return;
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
    upsertAgreement
  });
  const { refreshGrace, requestGraceWaiver, respondGraceWaiver } = graceFlow;
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
    loadVoucherFlips, startFlip, loadFlip, respondToFlip, refreshFlip, recordFlipOutcome
  } = flipFlow;

  function openAgreement(agreement: Agreement) {
    activeAgreementId.value = agreement.id;
    if (agreement.source === "card") {
      gameFlow.error.value = agreement.gameCard ? "" : copy.game.failed;
      gameFlow.needsLogin.value = false;
      gameFlow.inviteCode.value = agreement.shareCode;
    }
    screen.value = agreement.winnerId ? "settlement" : agreement.source === "card" ? "game" : agreement.status === "active" ? "agreement" : "contract";
  }

  function openAgreementFrom(agreement: Agreement, backScreen: Screen = "home") {
    contractBackScreen.value = backScreen;
    openAgreement(agreement);
  }

  function returnFromContract() {
    if (
      contractBackScreen.value === "create" &&
      editingAgreementId.value === activeAgreement.value?.id &&
      activeAgreement.value?.status === "pending_signature"
    ) {
      const agreement = activeAgreement.value;
      const initiator = agreement.participants.find((participant) => participant.role === "initiator");
      createDraft.title = agreement.title;
      createDraft.stake = {
        ...agreement.stake,
        additions: [...(agreement.stake.additions ?? [])]
      };
      createDraft.creatorSignatureDataUrl = initiator?.signatureDataUrl ?? "";
      editingRevision.value = agreement.revision;
      screen.value = "create";
      return;
    }
    screen.value = contractBackScreen.value === "create" ? "home" : contractBackScreen.value;
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

  async function deleteAgreement(agreement: Agreement) {
    const user = currentUser.value;
    if (!user || !canDeleteAgreement(agreement, user.id)) {
      return;
    }

    try {
      await showConfirmDialog({
        title: copy.history.deleteTitle,
        message: copy.history.deleteMessage(agreement.title),
        confirmButtonText: copy.history.deleteAction
      });
    } catch {
      return;
    }

    try {
      await api.deleteAgreement(agreement.id);
      removeAgreementLocally(agreement.id);
      showToast(copy.history.deleteSuccess);
    } catch {
      showToast(copy.history.deleteFailed);
    }
  }

  function removeAgreementLocally(id: string) {
    removedAgreementIds.add(id);
    agreements.value = agreements.value.filter(item => item.id !== id);
    coupons.value = coupons.value.filter(coupon => coupon.agreementId !== id);
    if (activeAgreementId.value === id) {
      activeAgreementId.value = null;
      editingAgreementId.value = null;
      editingRevision.value = null;
      screen.value = "home";
    }
    void refreshGrace();
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
    if (!activeShareCode.value || signLoading.value) {
      return;
    }
    signLoading.value = true;
    try {
      const user = await ensureIdentity();
      if (!user) {
        pendingSignSignature.value = payload;
        authReturnScreen.value = "sign";
        authError.value = null;
        authStep.value = "credentials";
        authOpen.value = true;
        return;
      }
      authError.value = null;
      const response = await api.signShare(activeShareCode.value, payload);
      if (currentUser.value?.id !== user.id) return;
      currentUser.value = {
        ...user,
        signatureDataUrl: payload.signatureDataUrl
      };
      upsertAgreement(response.agreement);
      await refreshCoupons();
      if (currentUser.value?.id !== user.id) return;
      pendingSignSignature.value = null;
      contractBackScreen.value = "home";
      screen.value = "contract";
    } catch (error) {
      if (error instanceof ApiRequestError && [403, 409].includes(error.status)) {
        await restorePendingShareAgreement();
        showSharedAgreement();
      }
      showToast(error instanceof ApiRequestError && error.code === "AGREEMENT_CHANGED"
        ? copy.contract.changedReview : copy.contract.signFailed);
    } finally {
      signLoading.value = false;
    }
  }

  async function continuePendingSignature(shareRestored: boolean) {
    const signature = pendingSignSignature.value;
    pendingSignSignature.value = null;
    if (shareRestored && signature && activeAgreement.value?.status === "pending_signature" &&
      !activeAgreement.value.participants.some((participant) => participant.userId === currentUser.value?.id)) {
      if (activeAgreement.value.revision !== signature.revision) {
        showToast(copy.contract.changedReview);
        return;
      }
      await signSession(signature);
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
    screen.value = returnScreen === "flip" && !flipRestored ? "home" : returnScreen;
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
    await gameFlow.resume();
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

  async function updateProfile(payload: UpdateProfileInput) {
    const user = currentUser.value;
    if (!user || !payload.nickname.trim() || profileLoading.value) {
      return;
    }
    profileLoading.value = true;
    profileError.value = null;
    try {
      const response = await api.updateProfile({ ...payload, nickname: payload.nickname.trim() });
      currentUser.value = response.user;
      showToast(copy.auth.profileSaved);
    } catch {
      profileError.value = copy.auth.profileFailed;
    } finally {
      profileLoading.value = false;
    }
  }

  function logoutAccount() {
    gameFlow.reset();
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
    editingAgreementId.value = null;
    editingRevision.value = null;
    createAttempt = null;
    pendingCreatePayload.value = null;
    pendingSignSignature.value = null;
    resetCreateDraft();
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
    const agreement = activeAgreement.value;
    return Boolean(
      currentUser.value &&
        document.visibilityState === "visible" &&
        agreement &&
        !agreement.winnerId &&
        ["pending_signature", "pending_confirmation", "active"].includes(agreement.status) &&
        ["contract", "agreement", "game"].includes(screen.value) &&
        agreement.participants.some(person => person.userId === currentUser.value?.id)
    );
  }

  function shouldPollSessionFallback() {
    const agreement = activeAgreement.value;
    return Boolean(
      agreement &&
        !agreement.winnerId &&
        ["pending_signature", "pending_confirmation", "active"].includes(agreement.status)
    );
  }

  function handleRealtimeEvent(event: AgreementRealtimeEvent) {
    if (event.type === "agreement.deleted") {
      if (event.agreementId === activeAgreementId.value) {
        removeAgreementLocally(event.agreementId);
        showToast(copy.contract.removed);
      }
      return;
    }
    if (event.agreement.id !== activeAgreementId.value || !currentUser.value ||
      !event.agreement.participants.some(person => person.userId === currentUser.value?.id)) return;
    upsertAgreement(event.agreement);
    if (["agreement", "game"].includes(screen.value) && event.agreement.winnerId) {
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
      if (realtimeConnected || syncTimer || !shouldPollSessionFallback()) {
        return;
      }
      void refreshActiveAgreement(true);
      const syncInterval = activeAgreement.value?.status === "pending_signature" ? 5_000 : 10_000;
      syncTimer = window.setInterval(() => {
        if (!shouldPollSessionFallback()) {
          window.clearInterval(syncTimer);
          syncTimer = undefined;
          return;
        }
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
    if (shouldPollSessionFallback()) {
      realtimeFallbackTimer = window.setTimeout(() => {
        if (!realtimeConnected) {
          startFallbackPolling();
        }
      }, 8_000);
    }
  }

  function refreshWhenVisible() {
    if (document.visibilityState !== "visible") { stopSessionRealtime(); return; }
    if (screen.value === "flip") void refreshFlip();
    if (["vouchers", "voucherDetail"].includes(screen.value)) {
      void refreshCoupons().then(() => {
        if (screen.value === "voucherDetail" && activeVoucherId.value) void loadVoucherFlips(activeVoucherId.value);
      });
    }
    if (shouldUseSessionRealtime()) startSessionRealtime();
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

  watch(screen, (nextScreen, previousScreen) => {
    if (nextScreen === "home" && previousScreen !== "home") {
      void refreshAgreements();
      void refreshCoupons();
    }
  });

  onMounted(async () => {
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    const shareCode = new URLSearchParams(window.location.search).get("share");
    const user = await ensureIdentity().catch(() => {
      agreementsError.value = copy.home.overviewLoadFailedNote;
      return null;
    });
    const gameCode = new URLSearchParams(window.location.search).get("game");
    if (gameCode) { await gameFlow.load(gameCode); return; }
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
    boostLoading,
    gameFlow,
    resultLoading,
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
    agreementsLoading,
    agreementsError,
    agreements,
    sharePayload,
    signLoading,
    screen,
    createAgreement,
    deleteAgreement,
    confirmBoost,
    withdrawBoost,
    drawCard,
    loginAccount,
    logoutAccount,
    closeAuthSheet,
    clearAuthError,
    openAccount,
    openCreate,
    openAgreementById,
    openDraw,
    openFeaturedCard,
    openHistory,
    refreshAgreements,
    openAgreement,
    openAgreementFrom,
    returnFromContract,
    openCertificate,
    openVoucherCertificate,
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
    graceTickets,
    graceWaivers,
    requestGraceWaiver,
    respondGraceWaiver,
    signSession,
    updateCreateDraft,
    updateProfile
  };
}
