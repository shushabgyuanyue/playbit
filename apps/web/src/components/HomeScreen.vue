<script setup lang="ts">
import { copy } from "@playbit/content";
import type { BetSession, Coupon, User } from "@playbit/shared";
import { computed } from "vue";
import { Dices, FilePenLine, History, Ticket, UserRound } from "lucide-vue-next";
import LifeServiceHero from "./ui/LifeServiceHero.vue";
import { buildVoucherItems } from "../composables/useVoucherAssets";

const props = defineProps<{
  user: User | null;
  sessions: BetSession[];
  coupons: Coupon[];
}>();

const emit = defineEmits<{
  create: [];
  draw: [];
  history: [];
  account: [];
  vouchers: [];
}>();

const pendingCount = computed(
  () => props.sessions.filter((session) => session.status === "pending_confirmation").length
);
const activeCount = computed(
  () => props.sessions.filter((session) => session.status === "active" || session.status === "settling").length
);
const fulfilledCount = computed(
  () => props.sessions.filter((session) => session.status === "fulfilled" || session.status === "finished").length
);
const voucherAssetCount = computed(() => buildVoucherItems(props.sessions, props.coupons).length);
</script>

<template>
  <section class="life-page home-page">
    <LifeServiceHero
      class="home-service-hero"
      :eyebrow="copy.home.heroSubtitle"
      :title="copy.app.tagline"
    >
      <template #action>
        <button type="button" class="life-service-action" :aria-label="copy.home.accountAction" @click="emit('account')">
          <UserRound :size="18" />
        </button>
      </template>
    </LifeServiceHero>

    <div class="life-page-content home-product-content">
      <section class="life-summary-card">
        <header>
          <strong>{{ copy.home.overviewTitle }}</strong>
        </header>
        <div class="life-metric-row">
          <span>
            <strong>{{ pendingCount }}</strong>
            {{ copy.home.stats.pending }}
          </span>
          <span>
            <strong>{{ activeCount }}</strong>
            {{ copy.home.stats.active }}
          </span>
          <span>
            <strong>{{ fulfilledCount }}</strong>
            {{ copy.home.stats.fulfilled }}
          </span>
        </div>
      </section>

      <section>
        <h2 class="life-group-title">{{ copy.home.quickTitle }}</h2>
        <div class="life-product-grid">
          <button type="button" class="life-product-tile primary" @click="emit('create')">
            <FilePenLine :size="22" />
            <strong>{{ copy.home.shortcuts.create }}</strong>
            <span>{{ copy.home.primaryAction }}</span>
          </button>
          <button type="button" class="life-product-tile secondary" @click="emit('draw')">
            <Dices :size="22" />
            <strong>{{ copy.home.shortcuts.draw }}</strong>
            <span>{{ copy.home.secondaryAction }}</span>
          </button>
          <button type="button" class="life-product-tile" @click="emit('history')">
            <History :size="22" />
            <strong>{{ copy.home.shortcuts.history }}</strong>
            <span>{{ sessions.length }}</span>
          </button>
          <button type="button" class="life-product-tile" @click="emit('vouchers')">
            <Ticket :size="22" />
            <strong>{{ copy.home.shortcuts.vouchers }}</strong>
            <span>{{ voucherAssetCount }}</span>
          </button>
        </div>
      </section>
    </div>
  </section>
</template>
