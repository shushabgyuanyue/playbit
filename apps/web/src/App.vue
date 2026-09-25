<script setup lang="ts">
import AccountScreen from "./components/AccountScreen.vue";
import AuthSheet from "./components/AuthSheet.vue";
import CertificateScreen from "./components/CertificateScreen.vue";
import ContractScreen from "./components/ContractScreen.vue";
import CreateBetScreen from "./components/CreateBetScreen.vue";
import DrawCardScreen from "./components/DrawCardScreen.vue";
import FlipScreen from "./components/FlipScreen.vue";
import HistoryScreen from "./components/HistoryScreen.vue";
import HomeScreen from "./components/HomeScreen.vue";
import NoticesScreen from "./components/NoticesScreen.vue";
import SessionScreen from "./components/SessionScreen.vue";
import ShareSheet from "./components/ShareSheet.vue";
import SignScreen from "./components/SignScreen.vue";
import SettlementScreen from "./components/SettlementScreen.vue";
import VoucherCenterScreen from "./components/VoucherCenterScreen.vue";
import VoucherDetailScreen from "./components/VoucherDetailScreen.vue";
import { dailyCards } from "@playbit/cards";
import type { GraceWaiver } from "@playbit/shared";
import { usePlaybitFlow } from "./composables/usePlaybitFlow";
import { buildVoucherItems } from "./composables/useVoucherAssets";
import { computed, ref } from "vue";

const {
  activeCard,
  activeAgreement,
  activeVoucherId,
  voucherFlip,
  voucherFlipLoading,
  voucherFlipError,
  flipBusy,
  authError,
  authLoading,
  authOpen,
  authStep,
  cardLoading,
  contractBackScreen,
  certificateKind,
  coupons,
  graceTickets,
  graceWaivers,
  createDraft,
  currentUser,
  agreementRefreshing,
  agreements,
  sharePayload,
  signLoading,
  screen,
  copyShareText,
  clearAuthError,
  closeAuthSheet,
  createAgreement,
  drawCard,
  loginAccount,
  logoutAccount,
  addBoost,
  beginCardUpgrade,
  confirmBoost,
  nativeShare,
  openAccount,
  openCreate,
  openAgreementById,
  openDraw,
  openFeaturedCard,
  openHistory,
  openAgreementFrom,
  openCertificate,
  openVoucherCertificate,
  closeCertificate,
  closeFlip,
  openFlipCertificate,
  openVoucherDetail,
  openVoucherFlip,
  retryVoucherFlip,
  openVouchers,
  redeemCoupon,
  startFlip,
  activeFlip,
  respondToFlip,
  refreshFlip,
  recordFlipOutcome,
  shareFlip,
  requestGraceWaiver,
  respondGraceWaiver,
  fulfillCustomAgreement,
  refreshActiveAgreement,
  registerAccount,
  recordAgreementResult,
  signSession,
  updateCreateDraft
} = usePlaybitFlow();

const activeVoucher = computed(() =>
  buildVoucherItems(agreements.value, coupons.value, currentUser.value?.id ?? null).find(
    (voucher) => voucher.id === activeVoucherId.value
  ) ?? null
);
const settlementCoupon = computed(() =>
  activeAgreement.value ? coupons.value.find((coupon) => coupon.agreementId === activeAgreement.value?.id && !coupon.sourceFlipId) ?? null : null
);
const activeCoupon = computed(() =>
  coupons.value.find((coupon) => coupon.id === activeVoucher.value?.couponId) ?? null
);
const voucherAgreement = computed(() =>
  agreements.value.find((agreement) => agreement.id === activeVoucher.value?.agreementId) ?? null
);
const canFlipVoucher = computed(() => Boolean(
  currentUser.value && activeCoupon.value?.issuerUserId === currentUser.value.id &&
  activeCoupon.value.status === "available" && Boolean(voucherAgreement.value?.winnerId)
));
const hasAvailableGraceTicket = computed(() => graceTickets.value.some((ticket) => ticket.status === "available"));
const activeGraceWaiver = computed<GraceWaiver | null>(() => {
  const couponId = activeVoucher.value?.couponId;
  if (!couponId) return null;
  return graceWaivers.value
    .filter((waiver) => waiver.couponId === couponId)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0] ?? null;
});
const canRespondGraceWaiver = computed(() => Boolean(
  currentUser.value && activeCoupon.value?.holderUserId === currentUser.value.id && activeGraceWaiver.value?.status === "pending"
));
const isGraceWaiverRequester = computed(() => Boolean(
  currentUser.value && activeGraceWaiver.value?.requesterUserId === currentUser.value.id
));
const shareSheetOpen = ref(false);
const activeNoticeIndex = ref(0);

function openNotice(index: number) {
  activeNoticeIndex.value = index;
  screen.value = "notices";
}

const featuredCardIds = ["wrong-answers-only", "two-truths-one-lie", "turtle-soup-water"];
const featuredCards = featuredCardIds
  .map((id) => dailyCards.find((card) => card.id === id))
  .filter((card): card is (typeof dailyCards)[number] => Boolean(card));
const activeCouponCount = computed(() => buildVoucherItems(
  agreements.value, coupons.value, currentUser.value?.id ?? null
).filter((item) => item.role === "holder" && item.status !== "used").length);
</script>

<template>
  <main class="app-shell">
    <div class="mobile-frame">
      <HomeScreen
        v-if="screen === 'home'"
        :user="currentUser"
        :agreements="agreements"
        :featured-cards="featuredCards"
        :coupon-count="activeCouponCount"
        @create="openCreate"
        @draw="openDraw"
        @play-featured="openFeaturedCard"
        @history="openHistory"
        @notice="openNotice"
        @account="openAccount"
        @vouchers="openVouchers"
      />
      <NoticesScreen
        v-else-if="screen === 'notices'"
        :active-index="activeNoticeIndex"
        @back="screen = 'home'"
        @select="activeNoticeIndex = $event"
      />
      <AccountScreen
        v-else-if="screen === 'account' && currentUser"
        :user="currentUser"
        @back="screen = 'home'"
        @logout="logoutAccount"
      />
      <CreateBetScreen
        v-else-if="screen === 'create'"
        :draft="createDraft"
        :user="currentUser"
        @back="screen = 'home'"
        @submit="createAgreement"
        @update-draft="updateCreateDraft"
      />
      <ContractScreen
        v-else-if="screen === 'contract' && activeAgreement"
        :agreement="activeAgreement"
        :refreshing="agreementRefreshing"
        @back="screen = contractBackScreen"
        @open-share="shareSheetOpen = true"
        @refresh="refreshActiveAgreement"
        @start="screen = 'agreement'"
        @open-certificate="openCertificate('agreement')"
      />
      <CertificateScreen
        v-else-if="screen === 'certificate' && (activeAgreement || (certificateKind === 'flip' && activeFlip))"
        :agreement="activeAgreement ?? null"
        :flip="certificateKind === 'flip' ? activeFlip : null"
        :kind="certificateKind"
        @back="closeCertificate"
      />
      <DrawCardScreen
        v-else-if="screen === 'draw'"
        :card="activeCard"
        :user="currentUser"
        :loading="cardLoading"
        @back="screen = 'home'"
        @draw="drawCard"
        @upgrade="beginCardUpgrade"
        @create-agreement="createAgreement"
      />
      <SessionScreen
        v-else-if="screen === 'agreement' && activeAgreement"
        :agreement="activeAgreement"
        :current-user-id="currentUser?.id ?? null"
        @back="screen = 'home'"
        @settle="recordAgreementResult"
        @add-boost="addBoost"
        @confirm-boost="confirmBoost"
      />
      <SettlementScreen
        v-else-if="screen === 'settlement' && activeAgreement"
        :agreement="activeAgreement"
        :coupon="settlementCoupon"
        :current-user-id="currentUser?.id ?? null"
        :show-back="contractBackScreen === 'history' || contractBackScreen === 'vouchers' || contractBackScreen === 'voucherDetail'"
        @back="screen = contractBackScreen"
        @open-share="shareSheetOpen = true"
        @open-certificate="openCertificate"
        @open-vouchers="openVouchers"
        @open-agreement="openAgreementById(activeAgreement?.id ?? '', 'settlement')"
        @fulfill="fulfillCustomAgreement(activeAgreement?.id ?? '')"
        @home="screen = 'home'"
      />
      <FlipScreen
        v-else-if="screen === 'flip' && activeFlip"
        :flip="activeFlip"
        :agreement="activeAgreement ?? null"
        :coupon="coupons.find((coupon) => coupon.id === activeFlip?.couponId) ?? null"
        :issued-coupon="coupons.find((coupon) => coupon.sourceFlipId === activeFlip?.id) ?? null"
        :current-user-id="currentUser?.id ?? null"
        :loading="flipBusy"
        @back="closeFlip"
        @accept="respondToFlip"
        @refresh="refreshFlip"
        @record-result="recordFlipOutcome"
        @share="shareFlip"
        @certificate="openFlipCertificate"
        @view-vouchers="openVouchers"
      />
      <HistoryScreen
        v-else-if="screen === 'history'"
        :agreements="agreements"
        @back="screen = 'home'"
        @open="(agreement) => openAgreementFrom(agreement, 'history')"
      />
      <VoucherCenterScreen
        v-else-if="screen === 'vouchers'"
        :agreements="agreements"
        :coupons="coupons"
        :current-user-id="currentUser?.id ?? null"
        :grace-tickets="graceTickets"
        @back="screen = 'home'"
        @open-agreement="(agreementId) => openAgreementById(agreementId, 'vouchers')"
        @open-voucher="openVoucherDetail"
      />
      <VoucherDetailScreen
        v-else-if="screen === 'voucherDetail' && activeVoucher"
        :voucher="activeVoucher"
        :can-flip="canFlipVoucher"
        :flip="voucherFlip"
        :flip-loading="voucherFlipLoading"
        :flip-error="voucherFlipError"
        :flip-busy="flipBusy"
        :has-available-grace-ticket="hasAvailableGraceTicket"
        :waiver="activeGraceWaiver"
        :can-respond-waiver="canRespondGraceWaiver"
        :is-waiver-requester="isGraceWaiverRequester"
        @back="screen = 'vouchers'"
        @open-agreement="
          (voucher) => {
            if (voucher.agreementId) openAgreementById(voucher.agreementId, 'voucherDetail');
          }
        "
        @redeem="
          (voucher) => {
            if (voucher.couponId) redeemCoupon(voucher.couponId);
          }
        "
        @flip="startFlip"
        @open-flip="openVoucherFlip"
        @retry-flip="retryVoucherFlip"
        @request-waiver="requestGraceWaiver"
        @respond-waiver="respondGraceWaiver"
        @open-certificate="openVoucherCertificate(activeVoucher?.agreementId ?? '')"
      />
      <SignScreen
        v-else-if="screen === 'sign'"
        :agreement="activeAgreement ?? null"
        :user="currentUser"
        :loading="signLoading"
        @decline="screen = 'home'"
        @sign="signSession"
      />
    </div>
    <AuthSheet
      :show="authOpen"
      :loading="authLoading"
      :error="authError"
      :step="authStep"
      @update:show="(show) => (show ? undefined : closeAuthSheet())"
      @clear-error="clearAuthError"
      @login="loginAccount"
      @register="registerAccount"
    />
    <ShareSheet
      v-model:show="shareSheetOpen"
      :payload="sharePayload"
      @native-share="nativeShare"
      @copy="copyShareText"
    />
  </main>
</template>
