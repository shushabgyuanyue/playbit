import { copy } from "@playbit/content";
import type { Agreement, Coupon, Flip, GraceTicket, GraceWaiver, User } from "@playbit/shared";
import { showConfirmDialog, showToast } from "vant";
import { computed, ref, type Ref } from "vue";
import { api, ApiRequestError } from "../services/api";
import type { Screen } from "../types/screen";
import { copyWithFeedback } from "./useShareActions";

type FlipFlowOptions = {
  agreements: Ref<Agreement[]>;
  coupons: Ref<Coupon[]>;
  activeAgreementId: Ref<string | null>;
  screen: Ref<Screen>;
  returnScreen: Ref<Screen>;
  pendingFlipId: Ref<string | null>;
  ensureIdentity: () => Promise<User | null>;
  requireAccount: (screen: Screen) => boolean;
  refreshAgreements: () => Promise<void>;
  refreshCoupons: () => Promise<void>;
  refreshGrace: () => Promise<void>;
  upsertAgreement: (agreement: Agreement) => void;
};

export function useFlipFlow(options: FlipFlowOptions) {
  const activeFlip = ref<Flip | null>(null);
  const voucherFlips = ref<Flip[]>([]);
  const selectedCouponId = ref<string | null>(null);
  const voucherFlipLoading = ref(false);
  const voucherFlipError = ref(false);
  const flipBusy = ref(false);
  let refreshInFlight = false;
  let refreshAfterFlight = false;
  let flipVersion = 0;
  let voucherLoadId = 0;

  const voucherFlip = computed(() => {
    const coupon = options.coupons.value.find((item) => item.id === selectedCouponId.value);
    if (!coupon) return null;
    const related = voucherFlips.value.filter((flip) =>
      flip.couponId === coupon.id || flip.id === coupon.sourceFlipId
    );
    return related.find((flip) => ["pending_acceptance", "active"].includes(flip.status))
      ?? related[0]
      ?? null;
  });

  function upsertFlip(flip: Flip) {
    voucherFlips.value = [flip, ...voucherFlips.value.filter((item) => item.id !== flip.id)]
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  async function loadVoucherFlips(couponId: string) {
    selectedCouponId.value = couponId;
    const coupon = options.coupons.value.find((item) => item.id === couponId);
    const version = flipVersion;
    const loadId = ++voucherLoadId;
    voucherFlips.value = [];
    voucherFlipError.value = false;
    if (!coupon) return;
    voucherFlipLoading.value = true;
    try {
      const response = await api.listFlips(coupon.agreementId);
      if (selectedCouponId.value === couponId && version === flipVersion && loadId === voucherLoadId) {
        voucherFlips.value = response.flips;
      }
    } catch {
      if (selectedCouponId.value === couponId && version === flipVersion && loadId === voucherLoadId) {
        voucherFlipError.value = true;
      }
    } finally {
      if (selectedCouponId.value === couponId && loadId === voucherLoadId) voucherFlipLoading.value = false;
    }
  }

  async function startFlip(couponId: string) {
    if (flipBusy.value) return;
    const coupon = options.coupons.value.find((item) => item.id === couponId);
    if (!coupon || !options.requireAccount("voucherDetail")) return;
    let agreement = options.agreements.value.find((item) => item.id === coupon.agreementId);
    if (!agreement) {
      await options.refreshAgreements();
      agreement = options.agreements.value.find((item) => item.id === coupon.agreementId);
    }
    if (!agreement) return;
    flipBusy.value = true;
    flipVersion += 1;
    try {
      const response = await api.createFlip(agreement.id, couponId);
      options.returnScreen.value = options.screen.value;
      options.activeAgreementId.value = agreement.id;
      activeFlip.value = response.flip;
      upsertFlip(response.flip);
      options.screen.value = "flip";
      await options.refreshCoupons();
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 409) {
        await loadVoucherFlips(couponId);
        if (voucherFlip.value && ["pending_acceptance", "active"].includes(voucherFlip.value.status)) {
          await loadFlip(voucherFlip.value.id, "voucherDetail");
          return;
        }
      }
      showToast(copy.flip.failed);
    } finally {
      flipBusy.value = false;
    }
  }

  async function loadFlip(flipId: string, backScreen: Screen = "home") {
    options.pendingFlipId.value = flipId;
    options.returnScreen.value = backScreen;
    const user = await options.ensureIdentity();
    if (!user) {
      options.requireAccount("flip");
      return false;
    }
    try {
      const { flip } = await api.getFlip(flipId);
      activeFlip.value = flip;
      upsertFlip(flip);
      options.activeAgreementId.value = flip.agreementId;
      const { agreement } = await api.getAgreement(flip.agreementId);
      options.upsertAgreement(agreement);
      await options.refreshCoupons();
      options.screen.value = "flip";
      options.pendingFlipId.value = null;
      return true;
    } catch {
      showToast(copy.flip.failed);
      return false;
    }
  }

  async function respondToFlip(accept: boolean) {
    if (!activeFlip.value || flipBusy.value) return;
    flipBusy.value = true;
    flipVersion += 1;
    let shouldRefresh = false;
    try {
      const response = await api.respondFlip(activeFlip.value.id, accept);
      activeFlip.value = response.flip;
      upsertFlip(response.flip);
      if (!accept) {
        await options.refreshCoupons();
        showToast(copy.flip.declined);
      }
    } catch {
      showToast(copy.flip.failed);
      shouldRefresh = true;
    } finally {
      flipBusy.value = false;
    }
    if (shouldRefresh) queueFlipRefresh();
  }

  function queueFlipRefresh() {
    if (refreshInFlight) {
      refreshAfterFlight = true;
    } else {
      void refreshFlip();
    }
  }

  async function refreshFlip() {
    if (!activeFlip.value || flipBusy.value || refreshInFlight) return;
    refreshInFlight = true;
    const flipId = activeFlip.value.id;
    const version = flipVersion;
    try {
      const response = await api.getFlip(flipId);
      if (version !== flipVersion || activeFlip.value?.id !== flipId) return;
      activeFlip.value = response.flip;
      upsertFlip(response.flip);
      if (response.flip.status === "settled") {
        const { agreement } = await api.getAgreement(response.flip.agreementId);
        options.upsertAgreement(agreement);
        await Promise.all([options.refreshCoupons(), options.refreshGrace()]);
      }
    } catch {
      // Keep the current record visible while the network is unavailable.
    } finally {
      refreshInFlight = false;
      if (refreshAfterFlight) {
        refreshAfterFlight = false;
        void refreshFlip();
      }
    }
  }

  async function recordFlipOutcome(winnerUserId: string) {
    if (!activeFlip.value || flipBusy.value) return;
    flipBusy.value = true;
    flipVersion += 1;
    try {
      await showConfirmDialog({
        title: copy.flip.confirmResultTitle,
        message: winnerUserId === activeFlip.value.applicantUserId
          ? copy.flip.confirmApplicantWon
          : copy.flip.confirmApplicantLost
      });
    } catch {
      flipBusy.value = false;
      return;
    }
    let shouldRefresh = false;
    try {
      const response = await api.recordFlipResult(activeFlip.value.id, winnerUserId);
      activeFlip.value = response.flip;
      upsertFlip(response.flip);
      if (response.agreement) options.upsertAgreement(response.agreement);
      await Promise.all([options.refreshCoupons(), options.refreshGrace()]);
    } catch {
      showToast(copy.flip.failed);
      shouldRefresh = true;
    } finally {
      flipBusy.value = false;
    }
    if (shouldRefresh) queueFlipRefresh();
  }

  async function shareFlip() {
    if (!activeFlip.value) return;
    const url = new URL(window.location.href);
    url.search = "";
    url.searchParams.set("flip", activeFlip.value.id);
    const payload = { title: copy.flip.navTitle, text: copy.flip.shareText, url: url.toString() };
    try {
      if (navigator.share) {
        await navigator.share(payload);
      } else {
        await copyWithFeedback(`${payload.text}\n${payload.url}`);
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      await copyWithFeedback(`${payload.text}\n${payload.url}`);
    }
  }

  return {
    activeFlip, voucherFlip, voucherFlipLoading, voucherFlipError, flipBusy,
    loadVoucherFlips, startFlip, loadFlip, respondToFlip, refreshFlip, recordFlipOutcome, shareFlip
  };
}

type GraceFlowOptions = {
  graceTickets: Ref<GraceTicket[]>;
  graceWaivers: Ref<GraceWaiver[]>;
  ensureIdentity: () => Promise<User | null>;
  refreshAgreements: () => Promise<void>;
  refreshCoupons: () => Promise<void>;
  upsertAgreement: (agreement: Agreement) => void;
  setScreen: (screen: Screen) => void;
};

export function useGraceFlow(options: GraceFlowOptions) {
  async function refreshGrace() {
    const user = await options.ensureIdentity();
    if (!user) {
      options.graceTickets.value = [];
      options.graceWaivers.value = [];
      return;
    }
    try {
      const response = await api.listGrace();
      options.graceTickets.value = response.tickets;
      options.graceWaivers.value = response.waivers;
    } catch {
      options.graceTickets.value = [];
      options.graceWaivers.value = [];
    }
  }

  async function requestGraceWaiver(couponId: string) {
    const ticket = options.graceTickets.value.find((item) => item.status === "available");
    if (!ticket) return;
    try {
      await api.requestWaiver(ticket.id, couponId);
      await Promise.all([refreshGrace(), options.refreshCoupons()]);
      showToast(copy.vouchers.graceRequestSent);
    } catch {
      showToast(copy.vouchers.graceFailed);
    }
  }

  async function respondGraceWaiver(waiverId: string, accept: boolean) {
    try {
      const response = await api.respondWaiver(waiverId, accept);
      if (response.agreement) options.upsertAgreement(response.agreement);
      await Promise.all([refreshGrace(), options.refreshCoupons(), options.refreshAgreements()]);
    } catch {
      showToast(copy.vouchers.graceFailed);
    }
  }

  async function fulfillCustomAgreement(agreementId: string) {
    try {
      const response = await api.fulfillAgreement(agreementId);
      options.upsertAgreement(response.agreement);
      await refreshGrace();
      options.setScreen("settlement");
    } catch {
      showToast(copy.settlement.fulfillFailed);
    }
  }

  return { refreshGrace, requestGraceWaiver, respondGraceWaiver, fulfillCustomAgreement };
}
