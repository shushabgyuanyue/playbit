<script setup lang="ts">
import { copy } from "@playbit/content";
import type { Agreement, Card, User } from "@playbit/shared";
import { ChevronRight, UserRound } from "lucide-vue-next";
import { computed } from "vue";
import agreementIcon from "../assets/home-agreement.webp";
import gameIcon from "../assets/home-game.webp";
import historyIcon from "../assets/home-history.webp";
import voucherIcon from "../assets/home-voucher.webp";
import HomeAnnouncement from "./home/HomeAnnouncement.vue";

const props = defineProps<{
  user: User | null;
  agreements: Agreement[];
  featuredCards: Card[];
  couponCount: number;
}>();

const emit = defineEmits<{
  create: [];
  draw: [];
  history: [];
  notice: [index: number];
  account: [];
  vouchers: [];
  playFeatured: [card: Card];
}>();

const agreementCounts = computed(() => ({
  pending: props.agreements.filter((agreement) => agreement.status === "pending_signature").length,
  active: props.agreements.filter((agreement) => agreement.status === "active").length,
  settling: props.agreements.filter((agreement) => agreement.status === "result_recorded").length,
  finished: props.agreements.filter((agreement) => ["fulfilled", "waived"].includes(agreement.status)).length
}));

const overviewItems = computed(() => [
  { key: "pending", label: copy.home.overview.pending, count: agreementCounts.value.pending },
  { key: "active", label: copy.home.overview.active, count: agreementCounts.value.active },
  { key: "settling", label: copy.home.overview.settling, count: agreementCounts.value.settling },
  { key: "finished", label: copy.home.overview.finished, count: agreementCounts.value.finished }
]);
</script>

<template>
  <section class="life-page home-page">
    <header class="home-hero">
      <h1 class="home-visually-hidden">{{ copy.app.name }}</h1>
      <button type="button" class="home-account-action" :aria-label="copy.home.accountAction" @click="emit('account')">
        <span class="home-account-avatar">
          <UserRound :size="19" :stroke-width="2.25" fill="currentColor" aria-hidden="true" />
        </span>
        <span class="home-account-label">{{ props.user?.nickname ?? copy.home.accountGuestLabel }}</span>
      </button>
      <button type="button" class="home-hero-cta" :aria-label="copy.home.heroAction" @click="emit('create')">
        <span class="home-visually-hidden">{{ copy.home.heroAction }}</span>
      </button>
    </header>

    <div class="life-page-content home-product-content">
      <nav class="home-function-grid" :aria-label="copy.home.functionsLabel">
        <button type="button" class="home-function-item" @click="emit('create')">
          <span class="home-function-icon home-function-icon-contract">
            <img :src="agreementIcon" width="38" height="38" alt="" />
          </span>
          <strong>{{ copy.home.functions.agreement }}</strong>
        </button>
        <button type="button" class="home-function-item" @click="emit('draw')">
          <span class="home-function-icon home-function-icon-game">
            <img :src="gameIcon" width="38" height="38" alt="" />
          </span>
          <strong>{{ copy.home.functions.game }}</strong>
        </button>
        <button type="button" class="home-function-item" @click="emit('history')">
          <span class="home-function-icon home-function-icon-history">
            <img :src="historyIcon" width="38" height="38" alt="" />
          </span>
          <strong>{{ copy.home.functions.records }}</strong>
        </button>
        <button type="button" class="home-function-item" @click="emit('vouchers')">
          <span class="home-function-icon home-function-icon-voucher">
            <img :src="voucherIcon" width="38" height="38" alt="" />
            <span class="home-function-badge">{{ props.user ? copy.home.voucherCount(props.couponCount) : copy.home.voucherLogin }}</span>
          </span>
          <strong>{{ copy.home.functions.vouchers }}</strong>
        </button>
      </nav>

      <HomeAnnouncement @open="emit('notice', $event)" />

      <section class="home-overview-section">
        <div class="home-section-heading">
          <h2 class="home-section-title">{{ copy.home.overviewTitle }}</h2>
          <button type="button" class="home-section-link" @click="emit('history')">
            {{ copy.home.viewAll }}<ChevronRight :size="15" aria-hidden="true" />
          </button>
        </div>
        <div class="home-overview-card">
          <div
            v-for="item in overviewItems"
            :key="item.key"
            class="home-overview-item"
          >
            <span class="home-overview-label">{{ item.label }}</span>
            <span class="home-overview-number" :class="{ 'home-overview-number-muted': item.count === 0 || item.key === 'finished' }">{{ item.count }}</span>
          </div>
        </div>
      </section>

      <section class="home-games-section">
        <div class="home-section-heading home-games-heading">
          <h2 class="home-section-title">{{ copy.home.gamesTitle }}</h2>
          <button type="button" class="home-section-link" @click="emit('draw')">
            {{ copy.home.moreGames }}<ChevronRight :size="15" aria-hidden="true" />
          </button>
        </div>
        <div class="home-game-grid">
          <button
            v-for="(card, index) in props.featuredCards.slice(0, 3)"
            :key="card.id"
            type="button"
            class="home-game-card"
            :class="{ 'home-game-card-primary': index === 0 }"
            @click="emit('playFeatured', card)"
          >
            <span class="home-game-copy">
              <strong>{{ card.name }}</strong>
              <span class="home-game-rule">{{ copy.home.gameTeasers[card.id as keyof typeof copy.home.gameTeasers] ?? card.winCondition }}</span>
              <span class="home-game-duration"><span class="home-game-minutes">{{ card.durationMinutes }}</span><span>{{ copy.home.minutes }}</span></span>
              <span class="home-game-cta">{{ copy.home.playThisCard }}<ChevronRight :size="14" aria-hidden="true" /></span>
            </span>
          </button>
        </div>
      </section>
    </div>
  </section>
</template>
