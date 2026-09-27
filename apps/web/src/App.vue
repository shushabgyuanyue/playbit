<script setup lang="ts">
import AccountScreen from "./components/AccountScreen.vue";
import AuthSheet from "./components/AuthSheet.vue";
import CertificateScreen from "./components/CertificateScreen.vue";
import ContractScreen from "./components/ContractScreen.vue";
import CreateBetScreen from "./components/CreateBetScreen.vue";
import DrawCardScreen from "./components/DrawCardScreen.vue";
import GameRoundScreen from "./components/game/GameRoundScreen.vue";
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
import { buildFlipSharePayload, type ShareIntent } from "./composables/playbitFlowHelpers";
import { buildVoucherItems } from "./composables/useVoucherAssets";
import { computed, provide, ref } from "vue";

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
  profileLoading,
  profileError,
  cardLoading,
  createLoading,
  boostLoading,
  contractBackScreen,
  certificateKind,
  certificateAction,
  coupons,
  graceTickets,
  graceWaivers,
  createDraft,
  currentUser,
  agreementRefreshing,
  agreementsLoading,
  agreementsError,
  agreements,
  sharePayload,
  signLoading,
  screen,
  clearAuthError,
  closeAuthSheet,
  createAgreement,
  drawCard,
  deleteAgreement,
  loginAccount,
  logoutAccount,
  addBoost,
  gameFlow,
  resultLoading,
  confirmBoost,
  withdrawBoost,
  openAccount,
  openCreate,
  openAgreementById,
  openDraw,
  openFeaturedCard,
  openHistory,
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
  redeemCoupon,
  startFlip,
  activeFlip,
  respondToFlip,
  refreshFlip,
  recordFlipOutcome,
  requestGraceWaiver,
  respondGraceWaiver,
  refreshActiveAgreement,
  refreshAgreements,
  registerAccount,
  recordAgreementResult,
  signSession,
  updateCreateDraft,
  updateProfile
} = usePlaybitFlow();

const activeVoucher = computed(() =>
  buildVoucherItems(agreements.value, coupons.value, currentUser.value?.id ?? null).find(
    (voucher) => voucher.id === activeVoucherId.value
  ) ?? null
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
const shareIntent = ref<ShareIntent>("general");
const invitationPayload = computed(() => shareIntent.value === "flip"
  ? (activeFlip.value ? buildFlipSharePayload(activeFlip.value) : null)
  : sharePayload.value);
const { busy: gameBusy, loading: gameLoading, error: gameError, draft: gameDraft, inviteCode: gameCode, needsLogin: gameNeedsLogin } = gameFlow;
function refreshGame() {
  const code = activeAgreement.value?.source === 'card' ? activeAgreement.value.shareCode : gameCode.value;
  if (code) void gameFlow.load(code);
}
const activeNoticeIndex = ref(0);

function openShare(intent: ShareIntent = "general") {
  shareIntent.value = intent;
  shareSheetOpen.value = true;
}

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

provide("playbit-authenticated", computed(() => Boolean(currentUser.value)));
</script>

<template>
  <main class="app-shell">
    <div class="mobile-frame">
      <HomeScreen
        v-if="screen === 'home'"
        :user="currentUser"
        :agreements="agreements"
        :agreements-loading="agreementsLoading"
        :agreements-error="agreementsError"
        :featured-cards="featuredCards"
        :coupon-count="activeCouponCount"
        @create="openCreate"
        @draw="openDraw"
        @play-featured="openFeaturedCard"
        @history="openHistory"
        @open-agreement="(agreement) => openAgreementFrom(agreement, 'home')"
        @refresh-agreements="refreshAgreements"
        @notice="openNotice"
        @account="openAccount"
        @vouchers="openVouchers"
      />
      <NoticesScreen
        v-else-if="screen === 'notices'"
        :active-index="activeNoticeIndex"
        @back="screen = 'home'"
        @home="screen = 'home'"
        @select="activeNoticeIndex = $event"
      />
      <AccountScreen
        v-else-if="screen === 'account' && currentUser"
        :user="currentUser"
        :agreements="agreements"
        :coupon-count="activeCouponCount"
        :profile-loading="profileLoading"
        :profile-error="profileError"
        @back="screen = 'home'"
        @logout="logoutAccount"
        @update-profile="updateProfile"
      />
      <CreateBetScreen
        v-else-if="screen === 'create'"
        :draft="createDraft"
        :user="currentUser"
        :loading="createLoading"
        @back="screen = 'home'"
        @home="screen = 'home'"
        @submit="createAgreement"
        @update-draft="updateCreateDraft"
      />
      <ContractScreen
        v-else-if="screen === 'contract' && activeAgreement"
        :agreement="activeAgreement"
        :current-user-id="currentUser?.id ?? null"
        :refreshing="agreementRefreshing"
        @back="returnFromContract"
        @home="screen = 'home'"
        @open-share="openShare('sign')"
        @refresh="refreshActiveAgreement"
        @start="screen = 'agreement'"
        @open-document="(action) => openCertificate('agreement', action)"
      />
      <CertificateScreen
        v-else-if="screen === 'certificate' && activeAgreement"
        :agreement="activeAgreement ?? null"
        :flip="null"
        :kind="certificateKind"
        :current-user-id="currentUser?.id"
        :auto-action="certificateAction"
        @back="closeCertificate"
        @home="screen = 'home'"
      />
      <DrawCardScreen
        v-else-if="screen === 'draw'"
        :card="activeCard"
        :user="currentUser"
        :loading="cardLoading"
        :create-loading="gameBusy"
        :stake="gameDraft"
        :error="gameError"
        @back="screen = 'home'"
        @home="screen = 'home'"
        @draw="drawCard"
        @update-stake="gameDraft = $event"
        @create-game="gameFlow.create"
      />
      <GameRoundScreen v-else-if="screen === 'game'"
        :agreement="activeAgreement?.source === 'card' ? activeAgreement : null"
        :current-user-id="currentUser?.id ?? null" :loading="gameLoading"
        :busy="gameBusy || resultLoading" :refreshing="agreementRefreshing" :error="gameError"
        :needs-login="gameNeedsLogin" @login="gameFlow.login"
        @back="screen = 'home'" @home="screen = 'home'" @join="gameFlow.join"
        @share="openShare('game')" @refresh="refreshGame" @record="recordAgreementResult"
        @certificate="openCertificate('agreement')" />
      <SessionScreen
        v-else-if="screen === 'agreement' && activeAgreement"
        :agreement="activeAgreement"
        :coupons="coupons"
        :current-user-id="currentUser?.id ?? null"
        @back="screen = 'contract'"
        :loading="resultLoading || boostLoading"
        @home="screen = 'home'"
        @settle="recordAgreementResult"
        @add-boost="addBoost"
        @confirm-boost="confirmBoost"
        @withdraw-boost="withdrawBoost"
      />
      <SettlementScreen
        v-else-if="screen === 'settlement' && activeAgreement"
        :agreement="activeAgreement"
        :current-user-id="currentUser?.id ?? null"
        :show-back="contractBackScreen === 'history' || contractBackScreen === 'vouchers' || contractBackScreen === 'voucherDetail'"
        @back="screen = contractBackScreen"
        @open-vouchers="openVouchers"
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
        @home="screen = 'home'"
        @accept="respondToFlip"
        @refresh="refreshFlip"
        @record-result="recordFlipOutcome"
        @share="openShare('flip')"
        @view-vouchers="openVouchers"
        @open-voucher="openVoucherDetail"
      />
      <HistoryScreen
        v-else-if="screen === 'history'"
        :agreements="agreements"
        :current-user-id="currentUser?.id ?? null"
        @back="screen = 'home'"
        @home="screen = 'home'"
        @open="(agreement) => openAgreementFrom(agreement, 'history')"
        @delete="deleteAgreement"
      />
      <VoucherCenterScreen
        v-else-if="screen === 'vouchers'"
        :agreements="agreements"
        :coupons="coupons"
        :current-user-id="currentUser?.id ?? null"
        :grace-tickets="graceTickets"
        @back="screen = 'home'"
        @home="screen = 'home'"
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
        @home="screen = 'home'"
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
        @home="screen = 'home'"
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
      :payload="invitationPayload"
      :intent="shareIntent"
    />
  </main>
</template>
