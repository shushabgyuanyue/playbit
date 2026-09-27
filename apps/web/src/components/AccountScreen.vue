<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { copy } from "@playbit/content";
import type { Agreement, UpdateProfileInput, User } from "@playbit/shared";
import { Check, LogOut, Pencil, ShieldCheck, X } from "lucide-vue-next";
import BaseBadge from "./ui/BaseBadge.vue";
import BaseButton from "./ui/BaseButton.vue";
import BaseField from "./ui/BaseField.vue";
import BrandSeal from "./ui/BrandSeal.vue";
import UserAvatar from "./ui/UserAvatar.vue";
import { isAvatarFile, prepareAvatar } from "../services/avatar";
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
  "update-profile": [payload: UpdateProfileInput];
}>();

const editOpen = ref(false);
const editNickname = ref(props.user.nickname);
const editError = ref("");
const editAvatar = ref<string | null>(null);
const avatarInput = ref<HTMLInputElement | null>(null);
const avatarBusy = ref(false);
const avatarError = ref("");
const editorBusy = computed(() => props.profileLoading || avatarBusy.value);

const pendingCount = computed(() => props.agreements.filter((agreement) =>
  ["pending_signature", "pending_confirmation", "active", "result_recorded"].includes(agreement.status)
).length);

const medals = computed(() => [
  {
    key: "first",
    mark: "01",
    title: copy.auth.medals.firstAgreement,
    hint: copy.auth.medals.firstAgreementHint,
    earned: props.agreements.some(agreement => agreement.source === 'custom')
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
  editAvatar.value = props.user.avatarDataUrl ?? null;
  avatarError.value = "";
  editNickname.value = props.user.nickname;
  editError.value = "";
  editOpen.value = true;
}

function closeEditor() {
  if (!editorBusy.value) {
    editOpen.value = false;
  }
}

function saveProfile() {
  if (editorBusy.value || avatarError.value) return;
  const nickname = editNickname.value.trim();
  if (!nickname) {
    editError.value = copy.auth.profileNicknameRequired;
    return;
  }
  if (nickname.length > 24) {
    editError.value = copy.auth.profileNicknameTooLong;
    return;
  }
  editError.value = "";
  emit("update-profile", { nickname, avatarDataUrl: editAvatar.value });
}

async function selectAvatar(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = "";
  if (!file || editorBusy.value) return;
  avatarError.value = "";
  if (!isAvatarFile(file)) {
    avatarError.value = copy.auth.avatarInvalid;
    return;
  }
  avatarBusy.value = true;
  try {
    editAvatar.value = await prepareAvatar(file);
  } catch {
    avatarError.value = copy.auth.avatarFailed;
  } finally {
    avatarBusy.value = false;
  }
}

function resetAvatar() {
  editAvatar.value = null;
  avatarError.value = "";
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
          <button type="button" class="account-avatar-medallion" :aria-label="copy.auth.changeAvatar" @click="openEditor">
            <UserAvatar class="account-profile-avatar" :src="user.avatarDataUrl" />
            <small>PB</small>
          </button>
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
      :close-on-click-overlay="!editorBusy"
    >
      <section class="account-edit-sheet">
        <div class="account-edit-handle" aria-hidden="true" />
        <header>
          <div>
            <span>{{ copy.auth.account }}</span>
            <h2>{{ copy.auth.editProfile }}</h2>
          </div>
          <button type="button" class="account-edit-close" :aria-label="copy.auth.close" :disabled="editorBusy" @click="closeEditor">
            <X :size="18" aria-hidden="true" />
          </button>
        </header>
        <div class="account-avatar-editor" :aria-busy="avatarBusy">
          <button type="button" class="account-avatar-preview" :aria-label="copy.auth.changeAvatar" :disabled="editorBusy" @click="avatarInput?.click()">
            <UserAvatar :src="editAvatar" />
          </button>
          <div class="account-avatar-controls">
            <button type="button" :disabled="editorBusy" @click="avatarInput?.click()">{{ copy.auth.changeAvatar }}</button>
            <button v-if="editAvatar || avatarError" type="button" :disabled="editorBusy" @click="resetAvatar">{{ copy.auth.resetAvatar }}</button>
            <p role="status">{{ avatarBusy ? copy.auth.avatarProcessing : copy.auth.avatarHint }}</p>
          </div>
          <input ref="avatarInput" type="file" accept="image/jpeg,image/png,image/webp" hidden :disabled="editorBusy" @change="selectAvatar" />
        </div>
        <p v-if="avatarError" class="account-avatar-error" role="alert">{{ avatarError }}</p>
        <BaseField
          v-model="editNickname"
          :label="copy.auth.nickname"
          :placeholder="copy.auth.nicknamePlaceholder"
          name="nickname"
          autocomplete="nickname"
          :disabled="editorBusy"
          :error="editError || props.profileError || ''"
        />
        <p class="account-edit-hint">{{ copy.auth.profileHint }}</p>
        <BaseButton size="lg" :loading="props.profileLoading" :disabled="editorBusy || Boolean(avatarError)" @click="saveProfile">
          <Check :size="18" />
          {{ copy.auth.saveProfile }}
        </BaseButton>
      </section>
    </van-popup>
  </section>
</template>
