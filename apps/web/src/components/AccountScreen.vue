<script setup lang="ts">
import { copy } from "@playbit/content";
import type { User } from "@playbit/shared";
import { LogOut, ShieldCheck } from "lucide-vue-next";
import BaseBadge from "./ui/BaseBadge.vue";
import BaseButton from "./ui/BaseButton.vue";
import LifeActionBar from "./ui/LifeActionBar.vue";
import LifeServiceHero from "./ui/LifeServiceHero.vue";

defineProps<{
  user: User;
}>();

const emit = defineEmits<{
  back: [];
  logout: [];
}>();
</script>

<template>
  <section class="life-page service-flow-page">
    <LifeServiceHero
      class="service-flow-hero"
      :eyebrow="copy.home.heroSubtitle"
      :title="copy.auth.account"
      :show-back="true"
      :back-label="copy.common.back"
      @back="emit('back')"
    />

    <div class="life-page-content service-flow-content">
      <section class="life-panel account-identity-panel">
        <BaseBadge tone="success">{{ copy.auth.accountReady }}</BaseBadge>
        <h2 class="life-section-title">{{ user.nickname }}</h2>
        <p class="life-section-caption">{{ copy.auth.saveHint }}</p>
        <dl class="account-identity-list">
          <div>
            <dt>{{ copy.auth.accountEmail }}</dt>
            <dd>{{ user.email }}</dd>
          </div>
          <div>
            <dt>{{ copy.auth.signatureStatus }}</dt>
            <dd>
              <ShieldCheck :size="16" />
              {{ user.signatureDataUrl ? copy.auth.signatureSaved : copy.auth.signaturePending }}
            </dd>
          </div>
        </dl>
      </section>
    </div>

    <LifeActionBar>
      <BaseButton variant="outline" size="lg" @click="emit('logout')">
        <LogOut :size="18" />
        {{ copy.auth.logout }}
      </BaseButton>
    </LifeActionBar>
  </section>
</template>
