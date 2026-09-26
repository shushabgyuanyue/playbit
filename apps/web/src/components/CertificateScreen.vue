<script setup lang="ts">
import { copy } from "@playbit/content";
import type { Agreement, Flip } from "@playbit/shared";
import { Download, Share2 } from "lucide-vue-next";
import { onMounted, onUnmounted, ref, watch } from "vue";
import { showToast } from "vant";
import {
  getAgreementStatusLabel,
  getEffectiveStakeLabel,
  getLoserName,
  getParticipantName,
  getWinnerName,
  isCounterpartySigned
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
}>();

const emit = defineEmits<{
  back: [];
  home: [];
}>();
const canvas = ref<HTMLCanvasElement | null>(null);
const busy = ref(false);
const autoActionTimer = ref<number | null>(null);

function title() {
  if (props.kind === "flip") return copy.certificate.flipTitle;
  if (props.kind === "waiver") return copy.certificate.waiverTitle;
  if (props.kind === "agreement") return copy.contract.documentTitle;
  if (props.kind === "fulfillment") return copy.certificate.fulfillmentTitle;
  return copy.certificate.resultTitle;
}

type CertificatePalette = {
  blue: string;
  ink: string;
  muted: string;
  line: string;
  seal: string;
  paper: string;
  frame: string;
};

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

function loadImage(dataUrl: string | null | undefined): Promise<HTMLImageElement | null> {
  if (!dataUrl) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = dataUrl;
  });
}

function agreementDate(agreement: Agreement) {
  const date = new Date(agreement.createdAt);
  if (Number.isNaN(date.getTime())) {
    return agreement.createdAt;
  }
  return `${date.getFullYear()} 年 ${date.getMonth() + 1} 月 ${date.getDate()} 日`;
}

async function renderAgreementDocument(
  target: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  agreement: Agreement,
  palette: CertificatePalette
) {
  target.height = 1680;
  ctx.fillStyle = palette.paper;
  ctx.fillRect(0, 0, target.width, target.height);
  ctx.strokeStyle = palette.frame;
  ctx.lineWidth = 2;
  ctx.strokeRect(42, 42, 996, target.height - 84);
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
  ctx.fillText(`${copy.contract.agreementNo} ${agreement.shareCode}`, 984, 148);

  ctx.textAlign = "center";
  ctx.fillStyle = palette.ink;
  ctx.font = "700 52px 'Noto Serif SC', 'Songti SC', serif";
  ctx.fillText(copy.contract.documentTitle, 540, 238);

  ctx.textAlign = "left";
  const fields = [
    [copy.contract.signedDate, agreementDate(agreement)],
    [copy.contract.partyA, getParticipantName(agreement, "initiator", copy.contract.fallbackInitiator)],
    [copy.contract.partyB, getParticipantName(agreement, "counterparty", copy.contract.fallbackCounterparty)]
  ];
  let fieldY = 336;
  for (const [label, value] of fields) {
    ctx.fillStyle = palette.muted;
    ctx.font = "24px system-ui, sans-serif";
    ctx.fillText(`${label}：`, 104, fieldY);
    ctx.fillStyle = palette.ink;
    ctx.font = "600 28px system-ui, sans-serif";
    ctx.fillText(value, 270, fieldY);
    ctx.strokeStyle = palette.line;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(260, fieldY + 10);
    ctx.lineTo(976, fieldY + 10);
    ctx.stroke();
    fieldY += 54;
  }

  let y = 520;
  ctx.fillStyle = palette.ink;
  ctx.font = "600 28px system-ui, sans-serif";
  y += drawText(ctx, copy.contract.articles.spirit, 104, y, 872, 40) + 16;
  ctx.fillStyle = palette.muted;
  ctx.fillRect(104, y - 5, 3, 58);
  ctx.font = "22px system-ui, sans-serif";
  y += drawText(ctx, copy.contract.productLine, 124, y + 28, 852, 34) + 28;

  const clauses = [
    [copy.contract.articleLabels.first, copy.contract.clauseTitles.subject,
      `${copy.contract.clauseSentences.subjectPrefix} ${agreement.challenge}${copy.contract.clauseSentences.subjectSuffix}`],
    [copy.contract.articleLabels.second, copy.contract.clauseTitles.judgment,
      `${copy.contract.clauseSentences.judgmentPrefix} ${copy.contract.clauseSentences.judgmentSuffix}`],
    [copy.contract.articleLabels.third, copy.contract.clauseTitles.stake,
      `${copy.contract.stakePrefix} ${getEffectiveStakeLabel(agreement)}${copy.contract.stakeSuffix}`],
    [copy.contract.articleLabels.fourth, copy.contract.clauseTitles.exception, copy.contract.articles.exception],
    [copy.contract.articleLabels.fifth, copy.contract.clauseTitles.effective, copy.contract.articles.effective]
  ];

  for (const [index, subtitle, body] of clauses) {
    const isAgreement = index === copy.contract.articleLabels.first;
    ctx.fillStyle = palette.ink;
    ctx.font = "700 25px system-ui, sans-serif";
    ctx.fillText(`${index} ${subtitle}`, 104, y);
    if (isAgreement) {
      ctx.strokeStyle = palette.ink;
      ctx.beginPath();
      ctx.moveTo(104, y + 6);
      ctx.lineTo(104 + ctx.measureText(`${index} ${subtitle}`).width, y + 6);
      ctx.stroke();
    }
    y += 34;
    ctx.font = isAgreement ? "700 26px system-ui, sans-serif" : "26px system-ui, sans-serif";
    if (isAgreement) {
      ctx.strokeStyle = palette.ink;
    }
    y += drawText(ctx, body, 104, y, 872, 36, isAgreement) + 24;
  }

  const signatureY = Math.max(y + 8, 1390);
  const participants = [
    [copy.contract.confirmA, getParticipantName(agreement, "initiator", copy.contract.fallbackInitiator)],
    [copy.contract.confirmB, getParticipantName(agreement, "counterparty", copy.contract.fallbackCounterparty)]
  ];
  participants.forEach(([label, name], index) => {
    const x = index === 0 ? 104 : 580;
    ctx.fillStyle = palette.muted;
    ctx.font = "22px system-ui, sans-serif";
    ctx.fillText(label, x, signatureY);
    ctx.fillStyle = palette.ink;
    ctx.font = "600 26px system-ui, sans-serif";
    ctx.fillText(name, x, signatureY + 46);
    ctx.strokeStyle = palette.line;
    ctx.beginPath();
    ctx.moveTo(x, signatureY + 105);
    ctx.lineTo(x + 360, signatureY + 105);
    ctx.stroke();
  });

  const signatureImages = await Promise.all([
    loadImage(agreement.participants.find((participant) => participant.role === "initiator")?.signatureDataUrl),
    loadImage(agreement.participants.find((participant) => participant.role === "counterparty")?.signatureDataUrl)
  ]);
  signatureImages.forEach((image, index) => {
    if (!image) {
      return;
    }
    const x = index === 0 ? 104 : 580;
    ctx.drawImage(image, x, signatureY + 54, 270, 42);
  });

  const signed = isCounterpartySigned(agreement);
  ctx.strokeStyle = palette.seal;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(850, 1540, 66, 0, Math.PI * 2);
  ctx.stroke();
  ctx.textAlign = "center";
  ctx.fillStyle = palette.seal;
  ctx.font = "700 24px 'Noto Serif SC', 'Songti SC', serif";
  ctx.fillText(signed ? copy.contract.seal : copy.contract.pendingSeal, 850, 1548);
  ctx.textAlign = "left";
  ctx.fillStyle = palette.muted;
  ctx.font = "20px system-ui, sans-serif";
  ctx.fillText(getAgreementStatusLabel(agreement.status), 104, 1608);
}

async function renderCertificate() {
  const target = canvas.value;
  const ctx = target?.getContext("2d");
  const agreement = props.agreement;
  const flip = props.flip;
  if (!target || !ctx || !agreement) return;

  const styles = getComputedStyle(document.documentElement);
  const palette = {
    blue: styles.getPropertyValue("--pb-ink-blue").trim() || "#2565ae",
    ink: styles.getPropertyValue("--pb-text-1").trim() || "#172b4d",
    muted: styles.getPropertyValue("--pb-text-3").trim() || "#8491a3",
    line: styles.getPropertyValue("--pb-line").trim() || "#e2e7ee",
    seal: styles.getPropertyValue("--pb-seal").trim() || "#b63e42",
    paper: styles.getPropertyValue("--pb-certificate-paper").trim() || "#fffefa",
    frame: styles.getPropertyValue("--pb-certificate-line").trim() || "#dfe6ef"
  };

  target.width = 1080;
  target.height = 1440;
  if (props.kind === "agreement") {
    await renderAgreementDocument(target, ctx, agreement, palette);
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
  const certificateId = flip?.id ?? agreement.shareCode;
  const idY = 264 + titleHeight + 16;
  ctx.fillText(`${copy.certificate.signedAt}  ${certificateId.toUpperCase()}`, 540, idY);

  const winner = flip
    ? agreement.participants.find((participant) => participant.userId === flip.winnerUserId)?.nickname ?? copy.common.unavailable
    : agreement.winnerId ? getWinnerName(agreement) : copy.common.unavailable;
  const provider = agreement.loserId ? getLoserName(agreement) : copy.common.unavailable;
  const statusText = props.kind === "fulfillment"
    ? copy.certificate.fulfilledStatus
    : props.kind === "waiver"
      ? copy.vouchers.waiverRecorded
      : props.kind === "flip"
        ? flip?.outcome === "applicant_won" ? copy.certificate.flipWonStatus : copy.certificate.flipLostStatus
        : copy.certificate.waitingFulfillment;
  const rows = props.kind === "flip" && flip
    ? [
        [copy.certificate.agreement, agreement.title],
        [copy.certificate.challenge, flip.card.name],
        [copy.certificate.winner, winner],
        [copy.certificate.equity, getEffectiveStakeLabel(agreement)],
        [copy.certificate.status, statusText]
      ]
    : [
        [copy.certificate.agreement, agreement.title],
        [copy.certificate.winner, winner],
        [copy.certificate.provider, provider],
        [copy.certificate.equity, getEffectiveStakeLabel(agreement)],
        ...(props.kind === "waiver" ? [[copy.certificate.effect, copy.vouchers.waived]] : []),
        [copy.certificate.status, statusText]
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

  if (props.kind !== "flip") {
    ctx.textAlign = "left";
    ctx.fillStyle = palette.muted;
    ctx.font = "22px system-ui, sans-serif";
    ctx.fillText(copy.certificate.recordedBy, 104, y);
    ctx.fillStyle = palette.ink;
    ctx.font = "500 27px system-ui, sans-serif";
    const recorder = agreement.participants.find(
      (participant) => participant.userId === agreement.resultRecorderUserId
    )?.nickname ?? copy.common.unavailable;
    ctx.fillText(recorder, 104, y + 48);
  }

  ctx.strokeStyle = palette.seal;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(864, 1180, 62, 0, Math.PI * 2);
  ctx.stroke();
  ctx.textAlign = "center";
  ctx.fillStyle = palette.seal;
  ctx.font = "600 24px system-ui, sans-serif";
  ctx.fillText(copy.certificate.resultStatus, 864, 1188);

  ctx.textAlign = "center";
  ctx.fillStyle = palette.muted;
  ctx.font = "22px system-ui, sans-serif";
  drawText(ctx, copy.certificate.disclaimer, 540, 1300, 860);
}

function imageFile(): Promise<File> {
  const target = canvas.value;
  if (!target) return Promise.reject(new Error("CERTIFICATE_NOT_READY"));
  return new Promise((resolve, reject) => {
    target.toBlob((blob) => {
      if (!blob) {
        reject(new Error("CERTIFICATE_RENDER_FAILED"));
        return;
      }
      const code = props.flip?.id ?? props.agreement?.shareCode ?? "record";
      resolve(new File([blob], `playbit-${props.kind}-${code}.png`, { type: "image/png" }));
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
  try {
    await renderCertificate();
    const file = await imageFile();
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ title: title(), files: [file] });
    } else {
      save(file);
      showToast(copy.certificate.shareUnavailable);
    }
    return true;
  } catch (error) {
    if (!(error instanceof Error && error.name === "AbortError")) {
      showToast(copy.certificate.failed);
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
  () => [props.agreement?.revision, props.flip?.status, props.kind],
  () => { void renderCertificate(); }
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
      :title="props.kind === 'agreement' ? copy.contract.documentTitle : copy.certificate.navTitle"
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
      <canvas ref="canvas" class="certificate-preview" :aria-label="title()" />
    </div>
    <LifeActionBar v-if="!props.autoAction && !props.embedded">
      <BaseButton variant="outline" size="lg" :loading="busy" @click="saveCertificate">
        <Download :size="18" />
        {{ props.kind === "agreement" ? copy.contract.documentSave : copy.certificate.save }}
      </BaseButton>
      <BaseButton size="lg" :loading="busy" @click="shareCertificate">
        <Share2 :size="18" />
        {{ copy.certificate.share }}
      </BaseButton>
    </LifeActionBar>
  </section>
</template>

<style scoped>
.certificate-preview-wrap {
  padding-bottom: 24px;
}

.certificate-preview-wrap.is-direct-action {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  opacity: 0;
  pointer-events: none;
}

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
  box-shadow: var(--pb-shadow-certificate);
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
