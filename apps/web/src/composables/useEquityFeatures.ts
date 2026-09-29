import { copy } from "@playbit/content";
import type { Agreement, Coupon, Flip, GraceTicket, GraceWaiver, User } from "@playbit/shared";
import { showConfirmDialog, showToast } from "vant";
import { computed, ref, type Ref } from "vue";
import { api, ApiRequestError } from "../services/api";
import type { Screen } from "../types/screen";

type FlipFlowOptions = {
  agreements: Ref<Agreement[]>;
  coupons: Ref<Coupon[]>;
  activeAgreementId: Ref<string | null>;
  screen: Ref<Screen>;
  returnScreen: Ref<Screen>;
  pendingFlipId: Ref<string | null>;
  pendingFlipCouponId: Ref<string | null>;
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
    if (!coupon.agreementId) return;
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
    if (!coupon) return;
    if (!coupon.agreementId) return;
    if (!options.requireAccount("voucherDetail")) {
      options.pendingFlipCouponId.value = couponId;
      return;
    }
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
    try {
      const user = await options.ensureIdentity();
      if (!user) {
        options.requireAccount("flip");
        return false;
      }
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

  return {
    activeFlip, voucherFlip, voucherFlipLoading, voucherFlipError, flipBusy,
    loadVoucherFlips, startFlip, loadFlip, respondToFlip, refreshFlip, recordFlipOutcome
  };
}

type GraceFlowOptions = {
  graceTickets: Ref<GraceTicket[]>;
  graceWaivers: Ref<GraceWaiver[]>;
  ensureIdentity: () => Promise<User | null>;
  refreshAgreements: () => Promise<void>;
  refreshCoupons: () => Promise<void>;
  upsertAgreement: (agreement: Agreement) => void;
};

export function useGraceFlow(options: GraceFlowOptions) {
  async function refreshGrace() {
    try {
      const user = await options.ensureIdentity();
      if (!user) {
        options.graceTickets.value = [];
        options.graceWaivers.value = [];
        return;
      }
      const response = await api.listGrace();
      if ((await options.ensureIdentity())?.id !== user.id) return;
      options.graceTickets.value = response.tickets;
      options.graceWaivers.value = response.waivers;
    } catch {
      // Preserve the last known assets while the service is temporarily unavailable.
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

  return { refreshGrace, requestGraceWaiver, respondGraceWaiver };
}
