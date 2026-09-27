<script setup lang="ts">
import { copy } from "@playbit/content";
import type { Agreement } from "@playbit/shared";
import { computed, ref, watch } from "vue";
import { LoaderCircle, RefreshCw } from "lucide-vue-next";
import GameCardStage from "./GameCardStage.vue";
import GameEquity from "./GameEquity.vue";
import ResultPicker from "./ResultPicker.vue";
import CardReveal from "../ui/CardReveal.vue";
import LifeServiceHero from "../ui/LifeServiceHero.vue";
import LifeActionBar from "../ui/LifeActionBar.vue";
import BaseButton from "../ui/BaseButton.vue";
import BaseBadge from "../ui/BaseBadge.vue";

const props = defineProps<{ agreement: Agreement | null; currentUserId: string | null; loading: boolean; busy: boolean; error: string; refreshing?: boolean; needsLogin?: boolean }>();
const emit = defineEmits<{ back: []; home: []; join: []; share: []; refresh: []; record: [winnerId: string]; certificate: []; login: [] }>();
const member = computed(() => props.agreement?.participants.some(person => person.userId === props.currentUserId));
const creator = computed(() => props.agreement?.ownerUserId === props.currentUserId);
const active = computed(() => props.agreement?.status === "active");
const host = computed(() => props.agreement?.participants.find(person => person.role === "initiator"));
const resultOpen = ref(false);
watch(() => props.agreement?.status, () => { resultOpen.value = false; });
</script>
<template>
  <section class="life-page service-flow-page game-round-page">
    <LifeServiceHero class="service-flow-hero" :title="copy.game.title" show-back show-home
      :back-label="copy.common.back" :home-label="copy.common.home" @back="emit('back')" @home="emit('home')" />
    <div class="life-page-content game-round-content">
      <div v-if="loading" class="game-load" role="status"><LoaderCircle class="life-button-spinner" :size="24" />{{ copy.common.loading }}</div>
      <div v-else-if="error" class="game-load" role="alert"><p>{{ error }}</p><BaseButton v-if="needsLogin" @click="emit('login')">{{ copy.game.loginToView }}</BaseButton><BaseButton v-else variant="outline" @click="emit('refresh')">{{ copy.game.retry }}</BaseButton></div>
      <template v-else-if="agreement?.gameCard">
        <header class="game-round-heading">
          <div><BaseBadge :tone="active ? 'success' : 'contract'">{{ active ? copy.game.joined : copy.game.waitingStatus }}</BaseBadge>
            <h2>{{ active ? agreement.participants.map(person => person.nickname).join(' · ') : creator ? copy.game.waiting : copy.game.joinedBy(host?.nickname ?? '') }}</h2>
            <p>{{ active ? copy.game.activeHint : copy.game.waitingHint }}</p>
          </div>
          <button type="button" class="game-refresh" :aria-label="copy.flip.refresh" :disabled="refreshing" @click="emit('refresh')"><RefreshCw :size="17" :class="{ 'life-button-spinner': refreshing }" /></button>
        </header>
        <GameCardStage :card="agreement.gameCard" />
        <CardReveal v-if="agreement.gameCard.reveal" :answer="agreement.gameCard.reveal" />
        <section class="game-round-equity"><GameEquity :stake="agreement.stake" />
          <div class="game-round-meta"><span>{{ copy.game.source }}</span><span>{{ new Date(agreement.createdAt).toLocaleDateString() }}</span></div>
          <button v-if="active && member" type="button" class="game-document-link" @click="emit('certificate')">{{ copy.game.gameCertificate }}</button>
        </section>
      </template>
    </div>
    <LifeActionBar v-if="!loading && !error && agreement">
      <template v-if="active && member"><BaseButton size="lg" :loading="busy" @click="resultOpen = true">{{ copy.game.result }}</BaseButton></template>
      <BaseButton v-else-if="creator" size="lg" @click="emit('share')">{{ copy.game.invite }}</BaseButton>
      <template v-else><p class="life-section-caption">{{ currentUserId ? copy.game.noSignature : copy.game.guestHint }}</p><BaseButton size="lg" :loading="busy" @click="emit('join')">{{ copy.game.join }}</BaseButton></template>
    </LifeActionBar>
    <ResultPicker v-if="agreement" v-model:show="resultOpen" :participants="agreement.participants" :loading="busy" @submit="emit('record', $event)" />
  </section>
</template>
<style scoped>
.game-round-page { background: var(--pb-surface-game-stage); }
.game-round-page :deep(.life-action-bar .life-button-primary) { background: var(--pb-action-hero-gradient); box-shadow: var(--pb-shadow-game-action); }
.game-round-content { display: grid; gap: 16px; padding: 16px; }
.game-round-heading { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
.game-round-heading h2 { font-size: var(--pb-font-lg); line-height: 1.5; margin: 8px 0 3px; overflow-wrap: anywhere; }
.game-round-heading p { margin: 0; color: var(--pb-text-2); font-size: var(--pb-font-sm); }
.game-refresh { flex: 0 0 44px; display: grid; place-items: center; width: 44px; height: 44px; color: var(--pb-ink-blue); border: 0; background: transparent; }
.game-round-equity { display: grid; gap: 10px; }
.game-round-meta { display: flex; justify-content: space-between; font-size: var(--pb-font-xs); color: var(--pb-text-2); }
.game-document-link { justify-self: start; min-height: 44px; border: 0; background: transparent; color: var(--pb-ink-blue); font-size: var(--pb-font-base); }
.game-load { display: grid; justify-items: center; gap: 14px; padding: 48px 16px; color: var(--pb-text-2); }
</style>
