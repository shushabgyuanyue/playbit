<script setup lang="ts">
import AccountScreen from "./components/AccountScreen.vue";
import ContractScreen from "./components/ContractScreen.vue";
import CreateBetScreen from "./components/CreateBetScreen.vue";
import DrawCardScreen from "./components/DrawCardScreen.vue";
import HistoryScreen from "./components/HistoryScreen.vue";
import HomeScreen from "./components/HomeScreen.vue";
import SessionScreen from "./components/SessionScreen.vue";
import SignScreen from "./components/SignScreen.vue";
import SettlementScreen from "./components/SettlementScreen.vue";
import VoucherCenterScreen from "./components/VoucherCenterScreen.vue";
import VoucherDetailScreen from "./components/VoucherDetailScreen.vue";
import { usePlaybitFlow } from "./composables/usePlaybitFlow";
import { buildVoucherItems } from "./composables/useVoucherAssets";
import { computed } from "vue";

const {
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
  redeemCoupon,
  registerAccount,
  settleSession,
  signSession
} = usePlaybitFlow();

const activeVoucher = computed(() =>
  buildVoucherItems(sessions.value, coupons.value).find((voucher) => voucher.id === activeVoucherId.value) ?? null
);
</script>

<template>
  <main class="app-shell">
    <div class="mobile-frame">
      <HomeScreen
        v-if="screen === 'home'"
        :user="currentUser"
        @create="screen = 'create'"
        @draw="
          screen = 'draw';
          if (!activeCard) drawCard();
        "
        @history="screen = 'history'"
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
      <CreateBetScreen v-else-if="screen === 'create'" @back="screen = 'home'" @submit="createSession" />
      <ContractScreen
        v-else-if="screen === 'contract' && activeSession"
        :session="activeSession"
        @back="screen = contractBackScreen"
        @copy-share="copyShareText"
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
        @copy-share="copyShareText"
        @fulfill="fulfillSession"
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
        @sign="signSession"
      />
    </div>
  </main>
</template>
