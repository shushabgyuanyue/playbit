<script setup lang="ts">
import { copy } from "@playbit/content";
import type { LoginInput, RegisterInput } from "@playbit/shared";
import { AlertCircle, Check, Eye, EyeOff, LockKeyhole, RefreshCw, X } from "lucide-vue-next";
import { computed, reactive, ref, watch } from "vue";
import BaseButton from "./ui/BaseButton.vue";
import BaseField from "./ui/BaseField.vue";
import BrandMascot from "./ui/BrandMascot.vue";

const props = defineProps<{
  show: boolean;
  loading: boolean;
  error?: string | null;
  step: "credentials" | "register";
}>();

const emit = defineEmits<{
  "update:show": [show: boolean];
  register: [payload: RegisterInput];
  login: [payload: LoginInput];
  "clear-error": [];
}>();

const form = reactive({
  nickname: "",
  email: "",
  password: ""
});

const isRegister = computed(() => props.step === "register");
const emailValid = computed(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()));
const passwordValid = computed(() => form.password.length >= 8);
const nicknameSuggestions = copy.auth.nicknameSuggestions;
const passwordVisible = ref(false);
const emailSuggestions = computed(() => {
  const value = form.email.trim();
  const atIndex = value.indexOf("@");
  if (atIndex <= 0 || value.slice(atIndex + 1).includes("@") || /\s/.test(value)) {
    return [];
  }

  const localPart = value.slice(0, atIndex);
  const domainQuery = value.slice(atIndex + 1).toLowerCase();
  return copy.auth.emailDomains
    .filter((domain) => domain.startsWith(domainQuery) && domain !== domainQuery)
    .slice(0, 5)
    .map((domain) => ({
      domain,
      email: `${localPart}@${domain}`
    }));
});
const canSubmit = computed(() =>
  Boolean(
    emailValid.value &&
      passwordValid.value &&
      (!isRegister.value || (form.nickname.trim() && form.password.length >= 8))
  )
);

watch(
  [() => props.show, () => props.step],
  ([show, step]) => {
    if (show) {
      emit("clear-error");
    }
    if (!show) {
      passwordVisible.value = false;
    }
    if (show && step === "register" && !form.nickname.trim()) {
      chooseNickname();
    }
  }
);

function chooseNickname() {
  const current = form.nickname.trim();
  const available = nicknameSuggestions.filter((nickname) => nickname !== current);
  form.nickname = available[Math.floor(Math.random() * available.length)] ?? nicknameSuggestions[0];
}

function chooseEmail(email: string) {
  form.email = email;
}

function close() {
  if (!props.loading) {
    emit("update:show", false);
  }
}

function submit() {
  if (!canSubmit.value || props.loading) {
    return;
  }

  if (isRegister.value) {
    emit("register", {
      email: form.email.trim(),
      password: form.password,
      nickname: form.nickname.trim()
    });
    return;
  }

  emit("login", {
    email: form.email.trim(),
    password: form.password
  });
}
</script>

<template>
  <van-popup
    :show="props.show"
    position="bottom"
    round
    teleport="body"
    class="life-sheet-popup auth-sheet-popup"
    :close-on-click-overlay="!props.loading"
    @update:show="emit('update:show', $event)"
  >
    <section class="auth-sheet" aria-labelledby="auth-sheet-title">
      <div class="auth-sheet-handle" aria-hidden="true" />

      <div class="auth-sheet-brand">
        <span class="auth-sheet-brand-avatar">
          <BrandMascot variant="panda-logo" width="42" height="42" />
        </span>
        <span>
          <strong>{{ copy.app.name }}</strong>
          <small>{{ copy.auth.accountEntry }}</small>
        </span>
      </div>

      <header class="auth-sheet-header">
        <div>
          <h2 id="auth-sheet-title">
            {{ isRegister ? copy.auth.completeRegisterTitle : copy.auth.loginTitle }}
          </h2>
        </div>
        <button
          type="button"
          class="auth-sheet-close"
          :aria-label="copy.auth.close"
          :disabled="props.loading"
          @click="close"
        >
          <X :size="19" />
        </button>
      </header>

      <p class="auth-sheet-hint">
        {{ isRegister ? copy.auth.registerHint : copy.auth.loginHint }}
      </p>

      <form class="auth-sheet-form" autocomplete="on" @submit.prevent="submit">
        <div class="life-field-group">
          <div v-if="isRegister" class="auth-nickname-field">
            <BaseField
              v-model="form.nickname"
              :label="copy.auth.nickname"
              :placeholder="copy.auth.nicknamePlaceholder"
              name="nickname"
              autocomplete="nickname"
              autofocus
              :spellcheck="false"
            />
            <p class="auth-nickname-note">
              <span>{{ copy.auth.nicknameHint }}</span>
              <button type="button" :aria-label="copy.auth.nicknameRefresh" :title="copy.auth.nicknameRefresh" @click="chooseNickname">
                <RefreshCw :size="15" aria-hidden="true" />
              </button>
            </p>
          </div>
          <div class="auth-email-field">
            <BaseField
              v-model="form.email"
              type="email"
              :label="copy.auth.email"
              :placeholder="copy.auth.emailPlaceholder"
              name="email"
              :autocomplete="isRegister ? 'email' : 'username'"
              :autofocus="!isRegister"
              inputmode="email"
              :spellcheck="false"
            />
            <div v-if="emailSuggestions.length" class="auth-email-suggestions" role="listbox">
              <button
                v-for="suggestion in emailSuggestions"
                :key="suggestion.email"
                type="button"
                role="option"
                :aria-label="suggestion.email"
                @click="chooseEmail(suggestion.email)"
              >
                <span>{{ suggestion.email.slice(0, suggestion.email.indexOf('@') + 1) }}</span>
                <strong>{{ suggestion.domain }}</strong>
              </button>
            </div>
          </div>
          <div class="auth-password-field">
            <BaseField
              v-model="form.password"
              :type="passwordVisible ? 'text' : 'password'"
              :label="copy.auth.password"
              :placeholder="copy.auth.passwordPlaceholder"
              name="password"
              :autocomplete="isRegister ? 'new-password' : 'current-password'"
            />
            <button
              type="button"
              class="auth-password-toggle"
              :aria-label="passwordVisible ? copy.auth.hidePassword : copy.auth.showPassword"
              :title="passwordVisible ? copy.auth.hidePassword : copy.auth.showPassword"
              @click="passwordVisible = !passwordVisible"
            >
              <EyeOff v-if="passwordVisible" :size="18" aria-hidden="true" />
              <Eye v-else :size="18" aria-hidden="true" />
            </button>
          </div>
        </div>

        <p
          v-if="(form.email && !emailValid) || (form.password && !passwordValid)"
          class="auth-sheet-field-hint"
        >
          {{ form.email && !emailValid ? copy.auth.invalidEmail : copy.auth.passwordRule }}
        </p>

        <p v-if="props.error" class="auth-sheet-error" role="alert">
          <AlertCircle :size="16" />
          {{ props.error }}
        </p>

        <BaseButton
          type="submit"
          size="lg"
          :disabled="!canSubmit || props.loading"
        >
          <Check v-if="isRegister" :size="18" />
          <LockKeyhole v-else :size="18" />
          {{
            props.loading
              ? copy.common.loading
              : isRegister
                ? copy.auth.completeRegister
                : copy.auth.login
          }}
        </BaseButton>
      </form>

      <p class="auth-sheet-footnote">
        <LockKeyhole :size="14" />
        {{ copy.auth.loginStateHint }}
      </p>
    </section>
  </van-popup>
</template>
