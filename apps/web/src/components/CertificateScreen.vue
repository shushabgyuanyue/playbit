<script setup lang="ts">
import { copy } from "@playbit/content";
import type { Agreement, Flip } from "@playbit/shared";
import { Download, Share2 } from "lucide-vue-next";
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import ContractDocument from "./ContractDocument.vue";
import { awardTitle, drawAwardCertificate, isHonoredChallenger } from "../services/awardCertificate";
import { showToast } from "vant";
import {
  getAgreementStatusLabel,
  getEffectiveStakeLabel,
} from "../utils/sessionDisplay";
import BaseButton from "./ui/BaseButton.vue";
import LifeActionBar from "./ui/LifeActionBar.vue";
import LifeServiceHero from "./ui/LifeServiceHero.vue";

const props = defineProps<{
  agreement: Agreement | null;
  flip: Flip | null;
  kind: "agreement" | "result" | "fulfillment" | "waiver" | "flip";
  autoAction?: "save" | "share" | null;
  embedded?: boolean;
  currentUserId?: string | null;
}>();

const emit = defineEmits<{
  back: [];
  home: [];
  rendered: [renderKey: string];
}>();
const canvas = ref<HTMLCanvasElement | null>(null);
const busy = ref(false);
const contractNode = ref<HTMLElement | null>(null);
const isContract = computed(() => props.kind === "agreement" && props.agreement?.source !== "card");
const awardAgreement = computed(() => {
  const agreement = props.agreement;
  const flip = props.flip;
  if (!agreement || props.kind !== "flip" || !flip) return agreement;
  return {
    ...agreement,
    title: flip.card.name,
    shareCode: flip.id,
    winnerId: agreement.participants.find(person => person.userId === flip.winnerUserId)?.id ?? null,
    loserId: agreement.participants.find(person => person.userId !== flip.winnerUserId)?.id ?? null,
    resultRecorderUserId: flip.resultRecorderUserId,
    resultRecordedAt: flip.resolvedAt
  };
});
const challenger = computed(() => Boolean(awardAgreement.value && isHonoredChallenger(awardAgreement.value, props.currentUserId)));
const autoActionTimer = ref<number | null>(null);

function title() {
  if (props.kind === "flip") return awardTitle("result", challenger.value);
  if (props.kind === "waiver") return copy.certificate.waiverTitle;
  if (props.kind === "agreement") return props.agreement?.source === "card" ? copy.game.gameCertificate : copy.contract.documentTitle;
  if (props.kind === "fulfillment") return copy.certificate.fulfillmentTitle;
  return awardTitle("result", challenger.value);
}

function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight = 46,
  underline = false
) {
  const lines: string[] = [];
  let line = "";
  for (const character of text) {
    const next = line + character;
    if (line && ctx.measureText(next).width > maxWidth) {
      lines.push(line);
      line = character;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  lines.forEach((value, index) => {
    const lineY = y + index * lineHeight;
    ctx.fillText(value, x, lineY);
    if (underline) {
      ctx.beginPath();
      ctx.moveTo(x, lineY + 6);
      ctx.lineTo(x + ctx.measureText(value).width, lineY + 6);
      ctx.stroke();
    }
  });
  return Math.max(1, lines.length) * lineHeight;
}

function agreementDate(agreement: Agreement) {
  const date = new Date(agreement.createdAt);
  if (Number.isNaN(date.getTime())) {
    return agreement.createdAt;
  }
  return `${date.getFullYear()} 年 ${date.getMonth() + 1} 月 ${date.getDate()} 日`;
}

async function renderCertificate() {
  const target = canvas.value;
  const ctx = target?.getContext("2d");
  const agreement = props.agreement;
  if (!target || !ctx || !agreement) return;
  const renderKey = `${agreement.id}:${agreement.revision}:${props.currentUserId ?? ""}`;
  await document.fonts.ready;

  const styles = getComputedStyle(document.documentElement);
  const palette = {
    blue: styles.getPropertyValue("--pb-ink-blue").trim() || "#2565ae",
    gold: styles.getPropertyValue("--pb-ink-gold").trim() || "#90601c",
    ink: styles.getPropertyValue("--pb-text-1").trim() || "#172b4d",
    muted: styles.getPropertyValue("--pb-text-3").trim() || "#8491a3",
    line: styles.getPropertyValue("--pb-line").trim() || "#e2e7ee",
    seal: styles.getPropertyValue("--pb-seal").trim() || "#b63e42",
    paper: styles.getPropertyValue("--pb-certificate-paper").trim() || "#fffefa",
    frame: styles.getPropertyValue("--pb-certificate-line").trim() || "#dfe6ef"
  };

  target.width = 1080;
  target.height = 1440;

  const gameConfirmation = props.kind === "agreement" && agreement.source === "card";
  if (!gameConfirmation) {
    await drawAwardCertificate(target, awardAgreement.value!, props.kind === "flip" ? "result" : props.kind as "result" | "fulfillment" | "waiver", props.currentUserId);
    emit("rendered", renderKey);
    return;
  }

  ctx.fillStyle = palette.paper;
  ctx.fillRect(0, 0, target.width, target.height);
  ctx.strokeStyle = palette.frame;
  ctx.lineWidth = 2;
  ctx.strokeRect(42, 42, 996, 1356);
  ctx.strokeStyle = palette.blue;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(84, 86);
  ctx.lineTo(996, 86);
  ctx.stroke();

  ctx.textAlign = "left";
  ctx.fillStyle = palette.blue;
  ctx.font = "600 30px system-ui, sans-serif";
  ctx.fillText(copy.app.name, 96, 148);
  ctx.textAlign = "right";
  ctx.fillStyle = palette.muted;
  ctx.font = "22px system-ui, sans-serif";
  ctx.fillText(copy.certificate.eyebrow, 984, 148);

  ctx.textAlign = "center";
  ctx.fillStyle = palette.ink;
  ctx.font = "600 50px system-ui, sans-serif";
  const titleHeight = drawText(ctx, title(), 540, 264, 900);
  ctx.fillStyle = palette.muted;
  ctx.font = "25px system-ui, sans-serif";
  const certificateId = agreement.shareCode;
  const idY = 264 + titleHeight + 16;
  ctx.fillText(`${copy.certificate.signedAt}  ${certificateId.toUpperCase()}`, 540, idY);

  const rows = [
      [copy.game.title, agreement.title],
      [copy.game.participant, agreement.participants.map(person => person.nickname).join(' · ')],
      [copy.game.stakeTitle, getEffectiveStakeLabel(agreement)],
      [copy.game.createdAt, agreementDate(agreement)],
      [copy.certificate.status, getAgreementStatusLabel(agreement.status)]
    ];

  let y = Math.max(390, idY + 58);
  for (const [label, value] of rows) {
    ctx.textAlign = "left";
    ctx.fillStyle = palette.muted;
    ctx.font = "22px system-ui, sans-serif";
    ctx.fillText(label, 104, y);
    ctx.fillStyle = palette.ink;
    ctx.font = "500 28px system-ui, sans-serif";
    const usedHeight = drawText(ctx, value, 104, y + 48, 850);
    ctx.strokeStyle = palette.line;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(104, y + Math.max(78, usedHeight + 22));
    ctx.lineTo(976, y + Math.max(78, usedHeight + 22));
    ctx.stroke();
    y += Math.max(104, usedHeight + 46);
  }

  ctx.strokeStyle = palette.seal;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(864, 1180, 62, 0, Math.PI * 2);
  ctx.stroke();
  ctx.textAlign = "center";
  ctx.fillStyle = palette.seal;
  ctx.font = "600 24px system-ui, sans-serif";
  ctx.fillText(copy.game.joined, 864, 1188);

  ctx.textAlign = "center";
  ctx.fillStyle = palette.muted;
  ctx.font = "22px system-ui, sans-serif";
  drawText(ctx, copy.certificate.disclaimer, 540, 1300, 860);
  emit("rendered", renderKey);
}

async function imageFile(): Promise<File> {
  await document.fonts.ready;
  if (isContract.value) {
    const node = contractNode.value?.querySelector<HTMLElement>(".contract-document");
    if (!node) throw new Error("CONTRACT_NOT_READY");
    const { toBlob } = await import("html-to-image");
    const blob = await toBlob(node, { pixelRatio: 3, skipFonts: true, backgroundColor: "#fffefa" });
    if (!blob) throw new Error("CONTRACT_RENDER_FAILED");
    return new File([blob], `playbit-agreement-${props.agreement?.shareCode}.png`, { type: "image/png" });
  }
  const target = canvas.value;
  if (!target) return Promise.reject(new Error("CERTIFICATE_NOT_READY"));
  return new Promise((resolve, reject) => {
    target.toBlob((blob) => {
      if (!blob) {
        reject(new Error("CERTIFICATE_RENDER_FAILED"));
        return;
      }
      const code = props.flip?.id ?? props.agreement?.shareCode ?? "record";
      resolve(new File([blob], `playbit-${props.kind}-${code}${(props.kind === "result" || props.kind === "flip") && challenger.value ? "-challenger" : ""}.png`, { type: "image/png" }));
    }, "image/png");
  });
}

function save(file: File) {
  const url = URL.createObjectURL(file);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = file.name;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function saveCertificate(): Promise<boolean> {
  if (busy.value) return false;
  busy.value = true;
  try {
    await renderCertificate();
    save(await imageFile());
    showToast(copy.certificate.saved);
    return true;
  } catch {
    showToast(copy.certificate.failed);
    return false;
  } finally {
    busy.value = false;
  }
}

async function shareCertificate(): Promise<boolean> {
  if (busy.value) return false;
  busy.value = true;
  let file: File | null = null;
  try {
    await renderCertificate();
    file = await imageFile();
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ title: title(), files: [file] });
    } else {
      save(file);
      showToast(copy.certificate.shareUnavailable);
    }
    return true;
  } catch (error) {
    if (!(error instanceof Error && error.name === "AbortError")) {
      if (file) {
        save(file);
        showToast(copy.certificate.shareUnavailable);
        return true;
      } else {
        showToast(copy.certificate.failed);
      }
    }
    return false;
  } finally {
    busy.value = false;
  }
}

onMounted(() => {
  void renderCertificate();
  if (props.autoAction) {
    autoActionTimer.value = window.setTimeout(() => {
      void (async () => {
        const completed = props.autoAction === "save"
          ? await saveCertificate()
          : await shareCertificate();
        if (completed) {
          emit("back");
        }
      })();
    }, 80);
  }
});
onUnmounted(() => {
  if (autoActionTimer.value) {
    window.clearTimeout(autoActionTimer.value);
  }
});
watch(
  () => [props.agreement?.id, props.agreement?.revision, props.flip?.status, props.kind, props.currentUserId],
  () => { void renderCertificate(); },
  { flush: "post" }
);

defineExpose({
  busy,
  saveCertificate,
  shareCertificate
});
</script>

<template>
  <section
    class="life-page service-flow-page certificate-page"
    :class="{ 'is-auto-action': props.autoAction, 'certificate-page-embedded': props.embedded }"
  >
    <LifeServiceHero
      v-if="!props.embedded"
      class="service-flow-hero"
      :title="props.kind === 'agreement' ? title() : copy.certificate.navTitle"
      :show-back="true"
      :show-home="true"
      :back-label="copy.common.back"
      :home-label="copy.common.home"
      @back="emit('back')"
      @home="emit('home')"
    />
    <div
      class="life-page-content service-flow-content certificate-preview-wrap"
      :class="{ 'is-direct-action': props.autoAction, 'is-embedded': props.embedded }"
    >
      <div v-if="isContract && agreement" ref="contractNode" class="certificate-contract"><ContractDocument :agreement="agreement" exporting /></div>
      <canvas v-else ref="canvas" class="certificate-preview" :aria-label="title()" />
    </div>
    <LifeActionBar v-if="!props.autoAction && !props.embedded">
      <BaseButton variant="outline" size="lg" :loading="busy" @click="saveCertificate">
        <Download :size="18" />
        {{ props.kind === "agreement" && props.agreement?.source !== 'card' ? copy.contract.documentSave : copy.certificate.save }}
      </BaseButton>
      <BaseButton size="lg" :loading="busy" @click="shareCertificate">
        <Share2 :size="18" />
        {{ copy.certificate.share }}
      </BaseButton>
    </LifeActionBar>
  </section>
</template>

<style scoped>
.certificate-contract { width: min(100%, 460px); margin: 0 auto; }

.certificate-preview-wrap {
  padding-bottom: 24px;
}

.certificate-preview-wrap.is-direct-action {
  position: absolute;
  width: min(calc(100vw - 32px), 488px);
  padding: 0;
  overflow: hidden;
  opacity: 0;
  pointer-events: none;
}
.certificate-preview-wrap.is-direct-action .certificate-contract { width: 100%; }

.certificate-page-embedded {
  min-height: 0;
  background: transparent;
  animation: none;
}

.certificate-preview-wrap.is-embedded {
  display: block;
  min-height: 0;
  padding: 0;
}

.certificate-preview-wrap.is-embedded .certificate-preview {
  width: min(100%, 420px);
  border-color: rgba(144, 96, 28, 0.28);
  box-shadow: 0 8px 24px rgba(23, 43, 77, 0.12), 0 2px 0 rgba(144, 96, 28, 0.08);
}

.certificate-preview {
  display: block;
  width: min(100%, 460px);
  height: auto;
  margin: 0 auto;
  border: 1px solid var(--pb-certificate-line);
  box-shadow: var(--pb-shadow-certificate);
}
</style>
