<script setup lang="ts">
import AccountScreen from "./components/AccountScreen.vue";
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
  redeemCoupon,
  refreshActiveSession,
  registerAccount,
  settleSession,
  signSession,
  updateCreateDraft
} = usePlaybitFlow();

const activeVoucher = computed(() =>
  buildVoucherItems(sessions.value, coupons.value).find((voucher) => voucher.id === activeVoucherId.value) ?? null
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
        @account="screen = 'account'"
        @vouchers="openVouchers"
      />
      <AccountScreen
        v-else-if="screen === 'account'"
        :user="currentUser"
        :loading="authLoading"
        @back="screen = 'home'"
        @register="registerAccount"
        @login="loginAccount"
      />
      <CreateBetScreen
        v-else-if="screen === 'create'"
        :draft="createDraft"
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
        :loading="cardLoading"
        @back="screen = 'home'"
        @draw="drawCard"
        @accept="createSession"
      />
      <SessionScreen
        v-else-if="screen === 'session' && activeSession"
        :session="activeSession"
        @back="screen = 'home'"
        @settle="settleSession"
      />
      <SettlementScreen
        v-else-if="screen === 'settlement' && activeSession"
        :session="activeSession"
        :show-back="contractBackScreen === 'history' || contractBackScreen === 'vouchers' || contractBackScreen === 'voucherDetail'"
        @back="screen = contractBackScreen"
        @open-share="shareSheetOpen = true"
        @open-vouchers="openVouchers"
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
        @back="screen = 'home'"
        @open-session="(sessionId) => openSessionById(sessionId, 'vouchers')"
        @open-voucher="openVoucherDetail"
      />
      <VoucherDetailScreen
        v-else-if="screen === 'voucherDetail' && activeVoucher"
        :voucher="activeVoucher"
        @back="screen = 'vouchers'"
        @open-agreement="
          (voucher) => {
            if (voucher.sessionId) openSessionById(voucher.sessionId, 'voucherDetail');
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
        :loading="signLoading"
        @decline="screen = 'home'"
        @sign="signSession"
      />
    </div>
    <ShareSheet
      v-model:show="shareSheetOpen"
      :payload="sharePayload"
      @native-share="nativeShare"
      @copy="copyShareText"
    />
  </main>
</template>
