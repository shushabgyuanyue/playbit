<script setup lang="ts">
import { copy } from "@playbit/content";
import type { Agreement } from "@playbit/shared";
import { BadgeCheck, Play, RefreshCw, Share2 } from "lucide-vue-next";
import { computed } from "vue";
import AgreementProgress from "./AgreementProgress.vue";
import ContractDocument from "./ContractDocument.vue";
import LifeActionBar from "./ui/LifeActionBar.vue";
import LifeServiceHero from "./ui/LifeServiceHero.vue";
import BaseButton from "./ui/BaseButton.vue";
import { isCounterpartySigned } from "../utils/sessionDisplay";

const props = defineProps<{
  agreement: Agreement;
  refreshing?: boolean;
}>();

const emit = defineEmits<{
  back: [];
  start: [];
  refresh: [];
  openShare: [];
  openCertificate: [];
}>();

const signed = computed(() => isCounterpartySigned(props.agreement));
</script>

<template>
  <section class="life-page service-flow-page">
    <LifeServiceHero
      class="service-flow-hero"
      :title="copy.contract.navTitle"
      :show-back="true"
      :back-label="copy.common.back"
      @back="emit('back')"
    >
      <template #action>
        <button
          type="button"
          class="life-service-action"
          :aria-label="props.refreshing ? copy.contract.refreshing : copy.contract.refreshAction"
          :aria-busy="props.refreshing"
          :disabled="props.refreshing"
          @click="emit('refresh')"
        >
          <RefreshCw :size="19" :class="{ spinning: props.refreshing }" />
        </button>
      </template>
    </LifeServiceHero>

    <div class="life-page-content service-flow-content">
      <AgreementProgress :agreement="props.agreement" />
      <ContractDocument :agreement="props.agreement" />
      <BaseButton v-if="signed" variant="outline" @click="emit('openCertificate')">
        <BadgeCheck :size="17" />
        {{ copy.certificate.agreementTitle }}
      </BaseButton>
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
