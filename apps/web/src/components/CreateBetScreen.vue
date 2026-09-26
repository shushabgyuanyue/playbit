<script setup lang="ts">
import { copy } from "@playbit/content";
import type { CreateAgreementInput, Stake, User } from "@playbit/shared";
import { ArrowRight, Check } from "lucide-vue-next";
import { computed, nextTick, onMounted, reactive, ref, watch } from "vue";
import type { CreateBetDraft } from "../composables/usePlaybitFlow";
import StakePicker from "./StakePicker.vue";
import AgreementNotice from "./ui/AgreementNotice.vue";
import LifeActionBar from "./ui/LifeActionBar.vue";
import LifeServiceHero from "./ui/LifeServiceHero.vue";
import BaseButton from "./ui/BaseButton.vue";
import BaseField from "./ui/BaseField.vue";
import SignaturePad from "./ui/SignaturePad.vue";

const props = defineProps<{
  draft: CreateBetDraft;
  user: User | null;
  loading?: boolean;
}>();

const emit = defineEmits<{
  back: [];
  home: [];
  submit: [payload: CreateAgreementInput];
  updateDraft: [draft: CreateBetDraft];
}>();

const form = reactive({
  title: props.draft.title,
  stake: props.draft.stake as Stake,
  creatorSignatureDataUrl: props.draft.creatorSignatureDataUrl || props.user?.signatureDataUrl || ""
});
const signatureOpen = ref(false);
const pendingSignatureSubmit = ref(false);
const validationAttempted = ref(false);
const titleField = ref<InstanceType<typeof BaseField> | null>(null);
const signaturePad = ref<InstanceType<typeof SignaturePad> | null>(null);

const titleError = computed(() =>
  validationAttempted.value && !form.title.trim() ? copy.create.agreementRequired : ""
);
const isEmptyCustomStake = computed(() =>
  form.stake.type === "custom" &&
    (!form.stake.label.trim() || form.stake.label.trim() === copy.stakes.custom)
);
const stakeError = computed(() =>
  validationAttempted.value && isEmptyCustomStake.value ? copy.create.stakeRequired : ""
);

watch(
  form,
  () => {
    emit("updateDraft", {
      title: form.title,
      stake: form.stake,
      creatorSignatureDataUrl: form.creatorSignatureDataUrl
    });
  },
  { deep: true }
);

watch(
  () => props.user?.signatureDataUrl,
  (signature) => {
    if (signature && !form.creatorSignatureDataUrl) {
      form.creatorSignatureDataUrl = signature;
    }
  }
);

async function focusTitle() {
  await nextTick();
  titleField.value?.focus();
}

function openSignature() {
  validationAttempted.value = true;
  if (titleError.value || stakeError.value || props.loading) {
    if (titleError.value) {
      void focusTitle();
    }
    return;
  }
  (document.activeElement as HTMLElement | null)?.blur();
  signatureOpen.value = true;
}

function refreshSignaturePad() {
  signaturePad.value?.refresh();
}

function submit() {
  validationAttempted.value = true;
  if (!form.title.trim() || isEmptyCustomStake.value || !form.creatorSignatureDataUrl || props.loading) {
    return;
  }

  emit("submit", {
    source: "custom",
    creatorNickname: props.user?.nickname ?? "",
    creatorSignatureDataUrl: form.creatorSignatureDataUrl,
    title: form.title.trim(),
    challenge: form.title.trim(),
    stake: form.stake,
    cardId: null
  });
}

function confirmSignature() {
  if (!form.creatorSignatureDataUrl) {
    return;
  }
  pendingSignatureSubmit.value = true;
  signatureOpen.value = false;
}

function finishSignature() {
  if (!pendingSignatureSubmit.value) {
    return;
  }
  pendingSignatureSubmit.value = false;
  submit();
}

onMounted(focusTitle);
</script>

<template>
  <section class="life-page service-flow-page create-page">
    <LifeServiceHero
      class="service-flow-hero"
      :title="copy.create.title"
      :show-back="true"
      :show-home="true"
      :back-label="copy.common.back"
      :home-label="copy.common.home"
      @back="emit('back')"
      @home="emit('home')"
    />

    <div class="life-page-content service-flow-content create-content">
      <nav class="create-stepper" :aria-label="copy.create.title">
        <span class="active"><b>01</b>{{ copy.create.stepAgreement }}</span>
        <i aria-hidden="true" />
        <span class="active"><b>02</b>{{ copy.create.stepStake }}</span>
        <i aria-hidden="true" :class="{ active: signatureOpen }" />
        <span :class="{ active: signatureOpen }"><b>03</b>{{ copy.create.stepSignature }}</span>
      </nav>

      <section class="create-document" aria-labelledby="create-document-title">
        <header class="create-document-header">
          <div>
            <span class="create-document-kicker">{{ copy.create.navTitle }}</span>
            <h2 id="create-document-title">{{ copy.create.title }}</h2>
          </div>
          <span class="create-document-status">{{ copy.create.draftStatus }}</span>
        </header>

        <p class="create-document-subtitle">{{ copy.create.subtitle }}</p>

        <div class="create-clause">
          <span class="create-clause-index">01</span>
          <div class="create-clause-body">
            <BaseField
              ref="titleField"
              v-model="form.title"
              :label="copy.create.agreement"
              :placeholder="copy.create.agreementPlaceholder"
              :multiline="true"
              :autofocus="true"
              :error="titleError"
            />
            <p class="create-personality-line">{{ copy.create.personalityLine }}</p>
          </div>
        </div>

        <div class="create-clause">
          <span class="create-clause-index">02</span>
          <div class="create-clause-body">
            <StakePicker
              :title="copy.create.stake"
              :model-value="form.stake"
              :error="stakeError"
              @change="form.stake = $event"
            />
          </div>
        </div>
      </section>

    </div>

    <LifeActionBar>
      <p class="create-action-hint">{{ copy.create.nextHint }}</p>
      <BaseButton
        size="lg"
        :loading="props.loading"
        :disabled="props.loading"
        @click="openSignature"
      >
        <ArrowRight :size="18" />
        {{ copy.create.nextStep }}
      </BaseButton>
    </LifeActionBar>

    <van-popup
      v-model:show="signatureOpen"
      round
      position="bottom"
      teleport="body"
      class="life-sheet-popup create-signature-popup"
      :z-index="2001"
      @opened="refreshSignaturePad"
      @closed="finishSignature"
    >
      <section class="create-signature-sheet">
        <div class="create-sheet-handle" aria-hidden="true" />
        <header>
          <h2>{{ copy.create.signatureSheetTitle }}</h2>
        </header>
        <p class="create-sheet-hint">{{ copy.signature.safety }}</p>
        <AgreementNotice />
        <SignaturePad
          ref="signaturePad"
          :label="copy.create.signature"
          :model-value="form.creatorSignatureDataUrl"
          @change="form.creatorSignatureDataUrl = $event"
        />
        <BaseButton size="lg" :disabled="!form.creatorSignatureDataUrl || props.loading" @click="confirmSignature">
          <Check :size="18" />
          {{ copy.create.signatureConfirm }}
        </BaseButton>
      </section>
    </van-popup>

  </section>
</template>
