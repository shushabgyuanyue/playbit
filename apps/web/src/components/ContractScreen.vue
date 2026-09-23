<script setup lang="ts">
import { copy } from "@playbit/content";
import type { BetSession } from "@playbit/shared";
import { Play, RefreshCw, Share2 } from "lucide-vue-next";
import { computed } from "vue";
import AgreementProgress from "./AgreementProgress.vue";
import ContractDocument from "./ContractDocument.vue";
import LifeActionBar from "./ui/LifeActionBar.vue";
import LifeServiceHero from "./ui/LifeServiceHero.vue";
import BaseButton from "./ui/BaseButton.vue";
import { isCounterpartySigned } from "../utils/sessionDisplay";

const props = defineProps<{
  session: BetSession;
  refreshing?: boolean;
}>();

const emit = defineEmits<{
  back: [];
  start: [];
  refresh: [];
  openShare: [];
}>();

const signed = computed(() => isCounterpartySigned(props.session));
</script>

<template>
  <section class="life-page service-flow-page">
    <LifeServiceHero
      class="service-flow-hero"
      :eyebrow="copy.home.docketLabel"
      :title="copy.contract.navTitle"
      :show-back="true"
      :back-label="copy.common.back"
      @back="emit('back')"
    >
      <template #action>
        <button
          type="button"
          class="life-service-action"
          :aria-label="copy.contract.refreshing"
          @click="emit('refresh')"
        >
          <RefreshCw :size="19" :class="{ spinning: props.refreshing }" />
        </button>
      </template>
    </LifeServiceHero>

    <div class="life-page-content service-flow-content">
      <AgreementProgress :session="props.session" />
      <ContractDocument :session="props.session" />
      <p class="life-section-caption">
        {{ signed ? copy.contract.enterSession : props.refreshing ? copy.contract.refreshing : copy.contract.waiting }}
      </p>
    </div>

    <LifeActionBar>
      <BaseButton variant="outline" size="lg" @click="emit('openShare')">
        <Share2 :size="18" />
        {{ copy.share.openPanel }}
      </BaseButton>
      <BaseButton size="lg" :disabled="!signed" @click="emit('start')">
        <Play :size="18" />
        {{ signed ? copy.contract.enterSession : copy.contract.waiting }}
      </BaseButton>
    </LifeActionBar>
  </section>
</template>
