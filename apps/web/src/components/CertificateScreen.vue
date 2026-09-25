<script setup lang="ts">
import { copy } from "@playbit/content";
import type { Agreement, Flip } from "@playbit/shared";
import { Download, Share2 } from "lucide-vue-next";
import { onMounted, ref, watch } from "vue";
import { showToast } from "vant";
import { getEffectiveStakeLabel, getLoserName, getWinnerName } from "../utils/sessionDisplay";
import BaseButton from "./ui/BaseButton.vue";
import LifeActionBar from "./ui/LifeActionBar.vue";
import LifeServiceHero from "./ui/LifeServiceHero.vue";

const props = defineProps<{
  agreement: Agreement | null;
  flip: Flip | null;
  kind: "agreement" | "result" | "fulfillment" | "waiver" | "flip";
}>();

const emit = defineEmits<{ back: [] }>();
const canvas = ref<HTMLCanvasElement | null>(null);
const busy = ref(false);

function title() {
  if (props.kind === "flip") return copy.certificate.flipTitle;
  if (props.kind === "waiver") return copy.certificate.waiverTitle;
  if (props.kind === "agreement") return copy.certificate.agreementTitle;
  if (props.kind === "fulfillment") return copy.certificate.fulfillmentTitle;
  return copy.certificate.resultTitle;
}

function drawText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number) {
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
  lines.forEach((value, index) => ctx.fillText(value, x, y + index * 46));
  return Math.max(1, lines.length) * 46;
}

function renderCertificate() {
  const target = canvas.value;
  const ctx = target?.getContext("2d");
  const agreement = props.agreement;
  const flip = props.flip;
  if (!target || !ctx || !agreement) return;

  target.width = 1080;
  target.height = 1440;
  ctx.fillStyle = "#fbfaf7";
  ctx.fillRect(0, 0, target.width, target.height);
  ctx.strokeStyle = "#d8d7d0";
  ctx.lineWidth = 2;
  ctx.strokeRect(42, 42, 996, 1356);
  ctx.strokeStyle = "#254c43";
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(84, 86);
  ctx.lineTo(996, 86);
  ctx.stroke();

  ctx.textAlign = "left";
  ctx.fillStyle = "#254c43";
  ctx.font = "600 30px system-ui, sans-serif";
  ctx.fillText(copy.app.name, 96, 148);
  ctx.textAlign = "right";
  ctx.fillStyle = "#74766f";
  ctx.font = "22px system-ui, sans-serif";
  ctx.fillText(copy.certificate.eyebrow, 984, 148);

  ctx.textAlign = "center";
  ctx.fillStyle = "#222923";
  ctx.font = "600 50px system-ui, sans-serif";
  const titleHeight = drawText(ctx, title(), 540, 264, 900);
  ctx.fillStyle = "#72756d";
  ctx.font = "25px system-ui, sans-serif";
  const certificateId = flip?.id ?? agreement.shareCode;
  const idY = 264 + titleHeight + 16;
  ctx.fillText(`${copy.certificate.signedAt}  ${certificateId.toUpperCase()}`, 540, idY);

  const winner = flip
    ? agreement.participants.find((participant) => participant.userId === flip.winnerUserId)?.nickname ?? copy.common.unavailable
    : agreement.winnerId ? getWinnerName(agreement) : copy.common.unavailable;
  const provider = agreement.loserId ? getLoserName(agreement) : copy.common.unavailable;
  const statusText = props.kind === "agreement"
    ? copy.contract.seal
    : props.kind === "fulfillment"
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
        ...(props.kind === "agreement" ? [] : [[copy.certificate.winner, winner], [copy.certificate.provider, provider]]),
        [copy.certificate.equity, getEffectiveStakeLabel(agreement)],
        ...(props.kind === "waiver" ? [[copy.certificate.effect, copy.vouchers.waived]] : []),
        [copy.certificate.status, statusText]
      ];

  let y = Math.max(390, idY + 58);
  for (const [label, value] of rows) {
    ctx.textAlign = "left";
    ctx.fillStyle = "#777970";
    ctx.font = "22px system-ui, sans-serif";
    ctx.fillText(label, 104, y);
    ctx.fillStyle = "#252b26";
    ctx.font = "500 28px system-ui, sans-serif";
    const usedHeight = drawText(ctx, value, 104, y + 48, 850);
    y += Math.max(104, usedHeight + 46);
  }

  if (props.kind !== "agreement" && props.kind !== "flip") {
    ctx.textAlign = "left";
    ctx.fillStyle = "#777970";
    ctx.font = "22px system-ui, sans-serif";
    ctx.fillText(copy.certificate.recordedBy, 104, y);
    ctx.fillStyle = "#252b26";
    ctx.font = "500 27px system-ui, sans-serif";
    const recorder = agreement.participants.find(
      (participant) => participant.userId === agreement.resultRecorderUserId
    )?.nickname ?? copy.common.unavailable;
    ctx.fillText(recorder, 104, y + 48);
  }

  ctx.strokeStyle = "#254c43";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(864, 1180, 62, 0, Math.PI * 2);
  ctx.stroke();
  ctx.textAlign = "center";
  ctx.fillStyle = "#254c43";
  ctx.font = "600 24px system-ui, sans-serif";
  ctx.fillText(props.kind === "agreement" ? copy.certificate.seal : copy.certificate.resultStatus, 864, 1188);

  ctx.textAlign = "center";
  ctx.fillStyle = "#74766f";
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

async function saveCertificate() {
  if (busy.value) return;
  busy.value = true;
  try {
    save(await imageFile());
    showToast(copy.certificate.saved);
  } catch {
    showToast(copy.certificate.failed);
  } finally {
    busy.value = false;
  }
}

async function shareCertificate() {
  if (busy.value) return;
  busy.value = true;
  try {
    const file = await imageFile();
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ title: title(), files: [file] });
    } else {
      save(file);
      showToast(copy.certificate.shareUnavailable);
    }
  } catch (error) {
    if (!(error instanceof Error && error.name === "AbortError")) {
      showToast(copy.certificate.failed);
    }
  } finally {
    busy.value = false;
  }
}

onMounted(renderCertificate);
watch(() => [props.agreement?.revision, props.flip?.status, props.kind], renderCertificate);
</script>

<template>
  <section class="life-page service-flow-page certificate-page">
    <LifeServiceHero
      class="service-flow-hero"
      :title="copy.certificate.navTitle"
      :show-back="true"
      :back-label="copy.common.back"
      @back="emit('back')"
    />
    <div class="life-page-content service-flow-content certificate-preview-wrap">
      <canvas ref="canvas" class="certificate-preview" :aria-label="title()" />
    </div>
    <LifeActionBar>
      <BaseButton variant="outline" size="lg" :loading="busy" @click="saveCertificate">
        <Download :size="18" />
        {{ copy.certificate.save }}
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

.certificate-preview {
  display: block;
  width: min(100%, 460px);
  height: auto;
  margin: 0 auto;
  border: 1px solid #d8d7d0;
  box-shadow: 0 10px 28px rgb(36 49 42 / 9%);
}
</style>
