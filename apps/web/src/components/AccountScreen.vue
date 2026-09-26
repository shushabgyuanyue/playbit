<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { copy } from "@playbit/content";
import type { Agreement, User } from "@playbit/shared";
import { Check, LogOut, Pencil, ShieldCheck, X } from "lucide-vue-next";
import BaseBadge from "./ui/BaseBadge.vue";
import BaseButton from "./ui/BaseButton.vue";
import BaseField from "./ui/BaseField.vue";
import BrandSeal from "./ui/BrandSeal.vue";
import BrandMascot from "./ui/BrandMascot.vue";
import LifeActionBar from "./ui/LifeActionBar.vue";
import LifeServiceHero from "./ui/LifeServiceHero.vue";

const props = defineProps<{
  user: User;
  agreements: Agreement[];
  couponCount: number;
  profileLoading: boolean;
  profileError?: string | null;
}>();

const emit = defineEmits<{
  back: [];
  logout: [];
  "update-profile": [nickname: string];
}>();

const editOpen = ref(false);
const editNickname = ref(props.user.nickname);
const editError = ref("");

const pendingCount = computed(() => props.agreements.filter((agreement) =>
  ["pending_signature", "active", "result_recorded"].includes(agreement.status)
).length);

const medals = computed(() => [
  {
    key: "first",
    mark: "01",
    title: copy.auth.medals.firstAgreement,
    hint: copy.auth.medals.firstAgreementHint,
    earned: props.agreements.length > 0
  },
  {
    key: "keeper",
    mark: "✓",
    title: copy.auth.medals.keeper,
    hint: copy.auth.medals.keeperHint,
    earned: props.agreements.some((agreement) => agreement.status === "fulfilled")
  },
  {
    key: "regular",
    mark: "03",
    title: copy.auth.medals.regular,
    hint: copy.auth.medals.regularHint,
    earned: props.agreements.length >= 3
  }
]);

watch(
  () => props.user.nickname,
  (nickname) => {
    if (!editOpen.value) {
      editNickname.value = nickname;
    }
  }
);

watch(
  () => props.profileLoading,
  (loading, previous) => {
    if (previous && !loading && !props.profileError) {
      editOpen.value = false;
    }
  }
);

function openEditor() {
  editNickname.value = props.user.nickname;
  editError.value = "";
  editOpen.value = true;
}

function closeEditor() {
  if (!props.profileLoading) {
    editOpen.value = false;
  }
}

function saveProfile() {
  const nickname = editNickname.value.trim();
  if (!nickname) {
    editError.value = copy.auth.profileNicknameRequired;
    return;
  }
  editError.value = "";
  emit("update-profile", nickname);
}
</script>

<template>
  <section class="life-page service-flow-page account-page">
    <LifeServiceHero
      class="service-flow-hero"
      :title="copy.auth.account"
      :show-back="true"
      :show-home="true"
      :back-label="copy.common.back"
      :home-label="copy.common.home"
      @back="emit('back')"
      @home="emit('back')"
    />

    <div class="life-page-content service-flow-content account-content">
      <section class="account-profile-card">
        <span class="account-profile-inner-rule" aria-hidden="true" />
        <BrandSeal class="account-profile-watermark" />
        <div class="account-profile-avatar-pane">
          <span class="account-avatar-medallion">
            <BrandMascot variant="panda-logo" width="54" height="54" />
            <small>PB</small>
          </span>
          <span class="account-avatar-caption">{{ copy.auth.recordLabel }}</span>
        </div>

        <div class="account-profile-details">
          <header class="account-profile-head">
            <div class="account-profile-copy">
              <BaseBadge tone="success">{{ copy.auth.accountReady }}</BaseBadge>
              <h2>{{ user.nickname }}</h2>
              <p>{{ user.email }}</p>
            </div>
            <button
              type="button"
              class="account-edit-button"
              :aria-label="copy.auth.editProfile"
              :title="copy.auth.editProfile"
              @click="openEditor"
            >
              <Pencil :size="17" aria-hidden="true" />
            </button>
          </header>

          <div class="account-stats" :aria-label="copy.auth.statsLabel">
            <div>
              <strong>{{ agreements.length }}</strong>
              <span>{{ copy.auth.statsAgreements }}</span>
            </div>
            <div>
              <strong>{{ pendingCount }}</strong>
              <span>{{ copy.auth.statsPending }}</span>
            </div>
            <div>
              <strong>{{ couponCount }}</strong>
              <span>{{ copy.auth.statsVouchers }}</span>
            </div>
          </div>
        </div>

        <section class="account-honor-strip" aria-labelledby="account-honor-title">
          <header class="account-section-heading">
            <div>
              <span>{{ copy.auth.recordLabel }}</span>
              <h2 id="account-honor-title">{{ copy.auth.medalsTitle }}</h2>
            </div>
          </header>
          <div class="account-honor-stamps">
            <article v-for="medal in medals" :key="medal.key" class="account-honor-stamp" :class="{ earned: medal.earned }">
              <span class="account-honor-mark">{{ medal.mark }}</span>
              <strong>{{ medal.title }}</strong>
              <small>{{ medal.earned ? copy.auth.accountReady : medal.hint }}</small>
            </article>
          </div>
        </section>
      </section>

      <section class="life-panel account-record-panel">
        <div class="account-record-row">
          <div>
            <span><ShieldCheck :size="17" />{{ copy.auth.signatureStatus }}</span>
            <p>{{ copy.auth.saveHint }}</p>
          </div>
          <strong>{{ user.signatureDataUrl ? copy.auth.signatureSaved : copy.auth.signaturePending }}</strong>
        </div>
      </section>
    </div>

    <LifeActionBar>
      <BaseButton variant="outline" size="lg" @click="emit('logout')">
        <LogOut :size="18" />
        {{ copy.auth.logout }}
      </BaseButton>
    </LifeActionBar>

    <van-popup
      v-model:show="editOpen"
      round
      position="bottom"
      teleport="body"
      class="life-sheet-popup account-edit-popup"
      :close-on-click-overlay="!props.profileLoading"
    >
      <section class="account-edit-sheet">
        <div class="account-edit-handle" aria-hidden="true" />
        <header>
          <div>
            <span>{{ copy.auth.account }}</span>
            <h2>{{ copy.auth.editProfile }}</h2>
          </div>
          <button type="button" class="account-edit-close" :aria-label="copy.auth.close" @click="closeEditor">
            <X :size="18" aria-hidden="true" />
          </button>
        </header>
        <BaseField
          v-model="editNickname"
          :label="copy.auth.nickname"
          :placeholder="copy.auth.nicknamePlaceholder"
          name="nickname"
          autocomplete="nickname"
          :error="editError || props.profileError || ''"
        />
        <p class="account-edit-hint">{{ copy.auth.profileHint }}</p>
        <BaseButton size="lg" :loading="props.profileLoading" @click="saveProfile">
          <Check :size="18" />
          {{ copy.auth.saveProfile }}
        </BaseButton>
      </section>
    </van-popup>
  </section>
</template>
