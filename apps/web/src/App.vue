<script setup lang="ts">
import AccountScreen from "./components/AccountScreen.vue";
import AuthSheet from "./components/AuthSheet.vue";
import ContractScreen from "./components/ContractScreen.vue";
import CreateBetScreen from "./components/CreateBetScreen.vue";
import DrawCardScreen from "./components/DrawCardScreen.vue";
import HistoryScreen from "./components/HistoryScreen.vue";
import HomeScreen from "./components/HomeScreen.vue";
import SessionScreen from "./components/SessionScreen.vue";
import ShareSheet from "./components/ShareSheet.vue";
import SignScreen from "./components/SignScreen.vue";
import SettlementScreen from "./components/SettlementScreen.vue";
import VoucherCenterScreen from "./components/VoucherCenterScreen.vue";
import VoucherDetailScreen from "./components/VoucherDetailScreen.vue";
import { usePlaybitFlow } from "./composables/usePlaybitFlow";
import { buildVoucherItems } from "./composables/useVoucherAssets";
import { computed, ref } from "vue";

const {
  activeCard,
  activeSession,
  activeVoucherId,
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
  clearAuthError,
  closeAuthSheet,
  createSession,
  drawCard,
  loginAccount,
  logoutAccount,
  addBoost,
  confirmBoost,
  nativeShare,
  openAccount,
  openCreate,
  openAgreementById,
  openDraw,
  openHistory,
  openSessionFrom,
  openVoucherDetail,
  openVouchers,
  redeemCoupon,
  refreshActiveSession,
  registerAccount,
  settleSession,
  signSession,
  updateCreateDraft
} = usePlaybitFlow();

const activeVoucher = computed(() =>
  buildVoucherItems(sessions.value, coupons.value, currentUser.value?.id ?? null).find(
    (voucher) => voucher.id === activeVoucherId.value
  ) ?? null
);
const settlementCoupon = computed(() =>
  activeSession.value ? coupons.value.find((coupon) => coupon.sessionId === activeSession.value?.id) ?? null : null
);
const shareSheetOpen = ref(false);
</script>

<template>
  <main class="app-shell">
    <div class="mobile-frame">
      <HomeScreen
        v-if="screen === 'home'"
        :user="currentUser"
        :sessions="sessions"
        :coupons="coupons"
        @create="openCreate"
        @draw="openDraw"
        @history="openHistory"
        @account="openAccount"
        @vouchers="openVouchers"
        @open="(session) => openSessionFrom(session, 'home')"
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
        @submit="createSession"
        @update-draft="updateCreateDraft"
      />
      <ContractScreen
        v-else-if="screen === 'contract' && activeSession"
        :session="activeSession"
        :refreshing="sessionRefreshing"
        @back="screen = contractBackScreen"
        @open-share="shareSheetOpen = true"
        @refresh="refreshActiveSession"
        @start="screen = 'session'"
      />
      <DrawCardScreen
        v-else-if="screen === 'draw'"
        :card="activeCard"
        :user="currentUser"
        :loading="cardLoading"
        @back="screen = 'home'"
        @draw="drawCard"
        @create-agreement="createSession"
      />
      <SessionScreen
        v-else-if="screen === 'session' && activeSession"
        :session="activeSession"
        :current-user-id="currentUser?.id ?? null"
        @back="screen = 'home'"
        @settle="settleSession"
        @add-boost="addBoost"
        @confirm-boost="confirmBoost"
      />
      <SettlementScreen
        v-else-if="screen === 'settlement' && activeSession"
        :session="activeSession"
        :coupon="settlementCoupon"
        :current-user-id="currentUser?.id ?? null"
        :show-back="contractBackScreen === 'history' || contractBackScreen === 'vouchers' || contractBackScreen === 'voucherDetail'"
        @back="screen = contractBackScreen"
        @open-share="shareSheetOpen = true"
        @open-vouchers="openVouchers"
        @open-agreement="openAgreementById(activeSession?.id ?? '', 'settlement')"
        @home="screen = 'home'"
      />
      <HistoryScreen
        v-else-if="screen === 'history'"
        :sessions="sessions"
        @back="screen = 'home'"
        @open="(session) => openSessionFrom(session, 'history')"
      />
      <VoucherCenterScreen
        v-else-if="screen === 'vouchers'"
        :sessions="sessions"
        :coupons="coupons"
        :current-user-id="currentUser?.id ?? null"
        @back="screen = 'home'"
        @open-agreement="(sessionId) => openAgreementById(sessionId, 'vouchers')"
        @open-voucher="openVoucherDetail"
      />
      <VoucherDetailScreen
        v-else-if="screen === 'voucherDetail' && activeVoucher"
        :voucher="activeVoucher"
        @back="screen = 'vouchers'"
        @open-agreement="
          (voucher) => {
            if (voucher.sessionId) openAgreementById(voucher.sessionId, 'voucherDetail');
          }
        "
        @redeem="
          (voucher) => {
            if (voucher.couponId) redeemCoupon(voucher.couponId);
          }
        "
      />
      <SignScreen
        v-else-if="screen === 'sign'"
        :session="activeSession ?? null"
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
