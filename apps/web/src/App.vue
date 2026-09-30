<script setup lang="ts">
import AuthSheet from "./components/AuthSheet.vue";
import HomeScreen from "./components/HomeScreen.vue";
import ShareSheet from "./components/ShareSheet.vue";
import { dailyCards } from "@playbit/cards";
import { copy } from "@playbit/content";
import type { Agreement, GraceWaiver } from "@playbit/shared";
import { usePlaybitFlow } from "./composables/usePlaybitFlow";
import { buildFlipSharePayload, type ShareIntent } from "./composables/playbitFlowHelpers";
import { buildVoucherItems } from "./composables/useVoucherAssets";
import type { VoucherItem } from "./types/voucher";
import { computed, defineAsyncComponent, defineComponent, h, provide, reactive, ref, type Component } from "vue";

const ScreenLoader = defineComponent({
  setup: () => () => h("div", { class: "screen-chunk-loading", role: "status" }, copy.common.loading)
});
const asyncScreen = (loader: () => Promise<{ default: Component }>) => defineAsyncComponent({
  loader,
  loadingComponent: ScreenLoader,
  delay: 100
});

const AccountScreen = asyncScreen(() => import("./components/AccountScreen.vue"));
const CertificateScreen = asyncScreen(() => import("./components/CertificateScreen.vue"));
const ContractScreen = asyncScreen(() => import("./components/ContractScreen.vue"));
const CreateBetScreen = asyncScreen(() => import("./components/CreateBetScreen.vue"));
const DrawCardScreen = asyncScreen(() => import("./components/DrawCardScreen.vue"));
const StandaloneGameScreen = asyncScreen(() => import("./components/game/StandaloneGameScreen.vue"));
const GameRoundScreen = asyncScreen(() => import("./components/game/GameRoundScreen.vue"));
const FlipScreen = asyncScreen(() => import("./components/FlipScreen.vue"));
const HistoryScreen = asyncScreen(() => import("./components/HistoryScreen.vue"));
const NoticesScreen = asyncScreen(() => import("./components/NoticesScreen.vue"));
const SessionScreen = asyncScreen(() => import("./components/SessionScreen.vue"));
const SignScreen = asyncScreen(() => import("./components/SignScreen.vue"));
const SettlementScreen = asyncScreen(() => import("./components/SettlementScreen.vue"));
const VoucherCenterScreen = asyncScreen(() => import("./components/VoucherCenterScreen.vue"));
const VoucherDetailScreen = asyncScreen(() => import("./components/VoucherDetailScreen.vue"));
const StudioScreen = asyncScreen(() => import("./components/StudioScreen.vue"));

const {
  activeCard,
  activeAgreement,
  settlementRevealId,
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
  canGoBack,
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
  shareEntryLoading,
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
  standaloneGameFlow,
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
  goBack,
  goHome,
  openCertificate,
  openVoucherCertificate,
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
  featuredCards: contentFeaturedCards,
  registerAccount,
  recordAgreementResult,
  acknowledgeSettlementReveal,
  signSession,
  updateCreateDraft,
  updateProfile
} = usePlaybitFlow();
const standaloneGame = reactive(standaloneGameFlow);

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
const isStudio = computed(() => window.location.pathname === "/studio");

function openShare(intent: ShareIntent = "general") {
  shareIntent.value = intent;
  shareSheetOpen.value = true;
}

function openNotice(index: number) {
  activeNoticeIndex.value = index;
  screen.value = "notices";
}

const staticFeaturedCardIds = ["wrong-answers-only", "two-truths-one-lie", "turtle-soup-water"];
const staticFeaturedCards = staticFeaturedCardIds
  .map((id) => dailyCards.find((card) => card.id === id))
  .filter((card): card is (typeof dailyCards)[number] => Boolean(card));
const featuredCards = computed(() => contentFeaturedCards.value.length ? contentFeaturedCards.value : staticFeaturedCards);
const activeCouponCount = computed(() => buildVoucherItems(
  agreements.value, coupons.value, currentUser.value?.id ?? null
).filter((item) => item.role === "holder" && item.status !== "used").length);

provide("playbit-authenticated", computed(() => Boolean(currentUser.value)));
</script>

<template>
  <main class="app-shell">
    <StudioScreen v-if="isStudio" />
    <div v-else class="mobile-frame">
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
        @back="goBack"
        @home="goHome"
        @select="activeNoticeIndex = $event"
      />
      <AccountScreen
        v-else-if="screen === 'account' && currentUser"
        :user="currentUser"
        :agreements="agreements"
        :coupon-count="activeCouponCount"
        :profile-loading="profileLoading"
        :profile-error="profileError"
        @back="goBack"
        @home="goHome"
        @logout="logoutAccount"
        @update-profile="updateProfile"
      />
      <CreateBetScreen
        v-else-if="screen === 'create'"
        :draft="createDraft"
        :user="currentUser"
        :loading="createLoading"
        @back="goBack"
        @home="goHome"
        @submit="createAgreement"
        @update-draft="updateCreateDraft"
      />
      <ContractScreen
        v-else-if="screen === 'contract' && activeAgreement"
        :agreement="activeAgreement"
        :current-user-id="currentUser?.id ?? null"
        :refreshing="agreementRefreshing"
        @back="goBack"
        @home="goHome"
        @open-share="openShare('sign')"
        @refresh="refreshActiveAgreement"
        @start="screen = 'agreement'"
        @open-document="(action: 'save' | 'share') => openCertificate('agreement', action)"
      />
      <CertificateScreen
        v-else-if="screen === 'certificate' && activeAgreement"
        :agreement="activeAgreement ?? null"
        :flip="null"
        :kind="certificateKind"
        :current-user-id="currentUser?.id"
        :auto-action="certificateAction"
        @back="goBack"
        @home="goHome"
      />
      <DrawCardScreen
        v-else-if="screen === 'draw'"
        :card="activeCard"
        :user="currentUser"
        :loading="cardLoading"
        :create-loading="gameBusy"
        :stake="gameDraft"
        :error="gameError"
        @back="goBack"
        @home="goHome"
        @draw="drawCard"
        @update-stake="gameDraft = $event"
        @create-game="gameFlow.create"
      />
      <StandaloneGameScreen
        v-else-if="screen === 'play'"
        :card="standaloneGame.card"
        :phase="standaloneGame.phase"
        :tools="standaloneGame.tools"
        :active-tool="standaloneGame.activeTool"
        :players="standaloneGame.players"
        :result="standaloneGame.result"
        :loading="standaloneGame.loading"
        :favorite="standaloneGame.favorite"
        :favorite-busy="standaloneGame.favoriteBusy"
        :timer-milliseconds="standaloneGame.timerMilliseconds"
        :timer-running="standaloneGame.timerRunning"
        :counter-value="standaloneGame.counterValue"
        :play-again="standaloneGame.playAgain"
        :reroll="standaloneGame.reroll"
        :open-tool="standaloneGame.openTool"
        :close-tool="standaloneGame.closeTool"
        :toggle-timer="standaloneGame.toggleTimer"
        :reset-timer="standaloneGame.resetTimer"
        :change-counter="standaloneGame.changeCounter"
        :change-score="standaloneGame.changeScore"
        :update-player-label="standaloneGame.updatePlayerLabel"
        :add-player="standaloneGame.addPlayer"
        :remove-player="standaloneGame.removePlayer"
        :clear-scoreboard="standaloneGame.clearScoreboard"
        :record-winner="standaloneGame.recordWinner"
        :record-ranking="standaloneGame.recordRanking"
        :record-completed="standaloneGame.recordCompleted"
        @toggle-favorite="standaloneGame.toggleFavorite"
        @start-settlement="openCreate"
        @back="goBack"
        @home="goHome"
      />
      <GameRoundScreen v-else-if="screen === 'game'"
        :agreement="activeAgreement?.source === 'card' ? activeAgreement : null"
        :current-user-id="currentUser?.id ?? null" :loading="gameLoading"
        :busy="gameBusy || resultLoading" :refreshing="agreementRefreshing" :error="gameError"
        :needs-login="gameNeedsLogin" @login="gameFlow.login"
        @back="goBack" @home="goHome" @join="gameFlow.join"
        @share="openShare('game')" @refresh="refreshGame" @record="recordAgreementResult"
        @certificate="openCertificate('agreement')" />
      <SessionScreen
        v-else-if="screen === 'agreement' && activeAgreement"
        :agreement="activeAgreement"
        :coupons="coupons"
        :current-user-id="currentUser?.id ?? null"
        @back="goBack"
        :loading="resultLoading || boostLoading"
        @home="goHome"
        @settle="recordAgreementResult"
        @add-boost="addBoost"
        @confirm-boost="confirmBoost"
        @withdraw-boost="withdrawBoost"
      />
      <SettlementScreen
        v-else-if="screen === 'settlement' && activeAgreement"
        :agreement="activeAgreement"
        :current-user-id="currentUser?.id ?? null"
        :reveal-id="settlementRevealId"
        :show-back="canGoBack"
        @back="goBack"
        @open-vouchers="openVouchers"
        @reveal-complete="acknowledgeSettlementReveal"
        @home="goHome"
      />
      <FlipScreen
        v-else-if="screen === 'flip' && activeFlip"
        :flip="activeFlip"
        :agreement="activeAgreement ?? null"
        :coupon="coupons.find((coupon) => coupon.id === activeFlip?.couponId) ?? null"
        :issued-coupon="coupons.find((coupon) => coupon.sourceFlipId === activeFlip?.id) ?? null"
        :current-user-id="currentUser?.id ?? null"
        :loading="flipBusy"
        @back="goBack"
        @home="goHome"
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
        @back="goBack"
        @home="goHome"
        @open="(agreement: Agreement) => openAgreementFrom(agreement, 'history')"
        @delete="deleteAgreement"
      />
      <VoucherCenterScreen
        v-else-if="screen === 'vouchers'"
        :agreements="agreements"
        :coupons="coupons"
        :current-user-id="currentUser?.id ?? null"
        :grace-tickets="graceTickets"
        @back="goBack"
        @home="goHome"
        @open-agreement="(agreementId: string) => openAgreementById(agreementId, 'vouchers')"
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
        @back="goBack"
        @home="goHome"
        @open-agreement="
          (voucher: VoucherItem) => {
            if (voucher.agreementId) openAgreementById(voucher.agreementId, 'voucherDetail');
          }
        "
        @redeem="
          (voucher: VoucherItem) => {
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
        :entry-loading="shareEntryLoading"
        :loading="signLoading"
        @home="goHome"
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
