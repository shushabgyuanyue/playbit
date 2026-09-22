<script setup lang="ts">
import { copy } from "@playbit/content";
import type { BetSession } from "@playbit/shared";
import { Copy, Play } from "lucide-vue-next";
import { computed } from "vue";
import ContractDocument from "./ContractDocument.vue";
import LifeActionBar from "./ui/LifeActionBar.vue";
import LifeAppBar from "./ui/LifeAppBar.vue";
import BaseButton from "./ui/BaseButton.vue";
import { isCounterpartySigned } from "../utils/sessionDisplay";

const props = defineProps<{
  session: BetSession;
}>();

const emit = defineEmits<{
  back: [];
  start: [];
  copyShare: [];
}>();

const signed = computed(() => isCounterpartySigned(props.session));
</script>

<template>
  <section class="life-page">
    <LifeAppBar :title="copy.contract.navTitle" :show-back="true" :back-label="copy.common.back" @back="emit('back')" />

    <div class="life-page-content">
      <ContractDocument :session="props.session" />
      <p class="life-section-caption">
        {{ signed ? copy.contract.enterSession : copy.contract.waiting }}
      </p>
    </div>

    <LifeActionBar>
      <BaseButton variant="outline" size="lg" @click="emit('copyShare')">
        <Copy :size="18" />
        {{ copy.share.contractCta }}
      </BaseButton>
      <BaseButton size="lg" :disabled="!signed" @click="emit('start')">
        <Play :size="18" />
        {{ signed ? copy.contract.enterSession : copy.contract.waiting }}
      </BaseButton>
    </LifeActionBar>
  </section>
</template>
