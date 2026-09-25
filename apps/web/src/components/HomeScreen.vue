<script setup lang="ts">
import { copy } from "@playbit/content";
import type { Agreement, Card, User } from "@playbit/shared";
import { ChevronRight } from "lucide-vue-next";
import agreementIcon from "../assets/home-agreement.webp";
import gameIcon from "../assets/home-game.webp";
import historyIcon from "../assets/home-history.webp";
import voucherIcon from "../assets/home-voucher.webp";
import accountRabbit from "../assets/brand-rabbit-white.webp";
import HomeAnnouncement from "./home/HomeAnnouncement.vue";
import HomeAgreementOverview from "./home/HomeAgreementOverview.vue";

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
  openAgreement: [agreement: Agreement];
  notice: [index: number];
  account: [];
  vouchers: [];
  playFeatured: [card: Card];
}>();

</script>

<template>
  <section class="life-page home-page">
    <header class="home-hero">
      <h1 class="home-visually-hidden">{{ copy.app.name }}</h1>
      <button type="button" class="home-account-action" :aria-label="copy.home.accountAction" @click="emit('account')">
        <span class="home-account-avatar">
          <img :src="accountRabbit" width="40" height="40" alt="" draggable="false" />
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

      <HomeAgreementOverview
        :agreements="props.agreements"
        :current-user-id="props.user?.id ?? null"
        @create="emit('create')"
        @history="emit('history')"
        @open="emit('openAgreement', $event)"
      />

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
              <span class="home-game-footer">
                <span class="home-game-duration"><span class="home-game-minutes">{{ card.durationMinutes }}</span><span>{{ copy.home.minutes }}</span></span>
                <span class="home-game-cta">{{ copy.home.playThisCard }}</span>
              </span>
            </span>
          </button>
        </div>
      </section>
    </div>
  </section>
</template>
