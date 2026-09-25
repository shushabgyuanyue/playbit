<script setup lang="ts">
import { copy } from "@playbit/content";
import type { Agreement, Card, User } from "@playbit/shared";
import agreementIcon from "../assets/home-agreement.webp";
import gameIcon from "../assets/home-game.webp";
import historyIcon from "../assets/home-history.webp";
import voucherIcon from "../assets/home-voucher.webp";
import BrandMascot from "./ui/BrandMascot.vue";
import SectionHeading from "./ui/SectionHeading.vue";
import HomeAnnouncement from "./home/HomeAnnouncement.vue";
import HomeAgreementOverview from "./home/HomeAgreementOverview.vue";
import HomeAccountBar from "./home/HomeAccountBar.vue";

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
    <HomeAccountBar :nickname="props.user?.nickname" @account="emit('account')" />
    <header class="home-hero">
      <h1 class="home-visually-hidden">{{ copy.app.name }}</h1>
      <button type="button" class="home-hero-cta" :aria-label="copy.home.heroAction" @click="emit('create')">
        <span class="home-visually-hidden">{{ copy.home.heroAction }}</span>
      </button>
    </header>

    <div class="life-page-content home-product-content">
      <nav class="home-function-grid" :aria-label="copy.home.functionsLabel">
        <button type="button" class="home-function-item" @click="emit('create')">
          <span class="home-function-icon home-function-icon-contract">
            <img :src="agreementIcon" width="32" height="32" alt="" />
          </span>
          <strong>{{ copy.home.functions.agreement }}</strong>
        </button>
        <button type="button" class="home-function-item" @click="emit('draw')">
          <span class="home-function-icon home-function-icon-game">
            <img :src="gameIcon" width="32" height="32" alt="" />
          </span>
          <strong>{{ copy.home.functions.game }}</strong>
        </button>
        <button type="button" class="home-function-item" @click="emit('history')">
          <span class="home-function-icon home-function-icon-history">
            <img :src="historyIcon" width="32" height="32" alt="" />
          </span>
          <strong>{{ copy.home.functions.records }}</strong>
        </button>
        <button type="button" class="home-function-item" @click="emit('vouchers')">
          <span class="home-function-icon home-function-icon-voucher">
            <img :src="voucherIcon" width="32" height="32" alt="" />
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
        <SectionHeading :title="copy.home.gamesTitle" :action-label="copy.home.moreGames" show-arrow @action="emit('draw')" />
        <div class="home-game-grid">
          <button
            v-for="(card, index) in props.featuredCards.slice(0, 3)"
            :key="card.id"
            type="button"
            class="home-game-card pb-tinted-surface pb-pressable"
            :data-tone="index === 0 ? 'coral' : index === 2 ? 'gold' : 'blue'"
            :class="{ 'home-game-card-primary': index === 0 }"
            @click="emit('playFeatured', card)"
          >
            <BrandMascot v-if="index === 0" variant="panda-watermark" class="home-game-watermark" width="108" height="115" />
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
