import { playerCopy as copy } from "@playbit/content/player";
import type { Party, Signature } from "../../data/types";

export type AgreementShareImageInput = {
  text: string;
  createdAt: string;
  signatures: Record<Party, Signature>;
  participantNames?: Partial<Record<Party, string>>;
};

export type AgreementShareResult = "shared" | "downloaded" | "cancelled";

const width = 1080;
const padding = 76;
const ink = "#18151d";
const violet = "#7d54ff";
const coral = "#ff654d";
const paper = "#faf9f7";

function wrapText(context: CanvasRenderingContext2D, value: string, maxWidth: number) {
  const lines: string[] = [];
  for (const paragraph of value.split(/\r?\n/)) {
    let line = "";
    for (const char of Array.from(paragraph)) {
      const next = line + char;
      if (line && context.measureText(next).width > maxWidth) {
        lines.push(line);
        line = char;
      } else {
        line = next;
      }
    }
    lines.push(line);
  }
  return lines.length ? lines : [""];
}

function drawSignature(context: CanvasRenderingContext2D, signature: Signature, x: number, y: number, w: number, h: number) {
  context.save();
  context.strokeStyle = ink;
  context.lineWidth = 4;
  context.lineCap = "round";
  context.lineJoin = "round";
  for (const stroke of signature) {
    if (stroke.length < 2) continue;
    context.beginPath();
    context.moveTo(x + stroke[0]!.x * w, y + stroke[0]!.y * h);
    for (const point of stroke.slice(1)) context.lineTo(x + point.x * w, y + point.y * h);
    context.stroke();
  }
  context.restore();
}

function drawLine(context: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) {
  context.beginPath();
  context.moveTo(x1, y1);
  context.lineTo(x2, y2);
  context.stroke();
}

function dateLabel(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

function canvasBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Unable to create agreement image")), "image/png");
  });
}

export async function createAgreementShareImage(input: AgreementShareImageInput) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is unavailable");

  const mainText = input.text.trim() || copy.promise.shareCard.promiseTitle;
  let fontSize = 74;
  context.font = `700 ${fontSize}px system-ui, sans-serif`;
  let lines = wrapText(context, mainText, width - padding * 2 - 24);
  while (fontSize > 48 && lines.length > 7) {
    fontSize -= 2;
    context.font = `700 ${fontSize}px system-ui, sans-serif`;
    lines = wrapText(context, mainText, width - padding * 2 - 24);
  }

  const lineHeight = Math.ceil(fontSize * 1.34);
  const textY = 386;
  const signatureHeadingY = textY + lines.length * lineHeight + 112;
  const markY = signatureHeadingY + 62;
  const markHeight = 144;
  const nameY = markY + markHeight + 52;
  const footerY = nameY + 90;
  const height = Math.max(1240, footerY + 90);
  canvas.width = width;
  canvas.height = height;
  context.fillStyle = paper;
  context.fillRect(0, 0, width, height);

  context.fillStyle = violet;
  context.fillRect(0, 0, width, 7);
  context.fillStyle = ink;
  context.font = "700 26px system-ui, sans-serif";
  context.fillText(copy.promise.shareCard.brand, padding, 94);
  context.fillStyle = violet;
  context.font = "600 20px system-ui, sans-serif";
  context.textAlign = "right";
  context.fillText(dateLabel(input.createdAt), width - padding, 94);
  context.textAlign = "left";

  context.fillStyle = ink;
  context.font = "800 76px system-ui, sans-serif";
  context.fillText(copy.promise.shareCard.shareImageTitle, padding, 216);
  context.fillStyle = coral;
  context.fillRect(padding, 254, 50, 7);
  context.fillStyle = violet;
  context.font = "600 23px system-ui, sans-serif";
  context.fillText(copy.promise.shareCard.shareImageEyebrow, padding, 320);

  context.fillStyle = ink;
  context.font = `700 ${fontSize}px system-ui, sans-serif`;
  lines.forEach((line, index) => context.fillText(line, padding, textY + index * lineHeight));

  context.fillStyle = ink;
  context.strokeStyle = "rgba(24, 21, 29, .18)";
  context.lineWidth = 2;
  drawLine(context, padding, signatureHeadingY - 26, width - padding, signatureHeadingY - 26);
  context.font = "700 25px system-ui, sans-serif";
  context.fillText(copy.promise.shareCard.keepTogether, padding, signatureHeadingY + 14);

  const signerGap = 56;
  const signerWidth = (width - padding * 2 - signerGap) / 2;
  const firstX = padding;
  const secondX = padding + signerWidth + signerGap;
  const firstName = input.participantNames?.a?.trim() || copy.promise.shareCard.initiator;
  const secondName = input.participantNames?.b?.trim() || copy.promise.shareCard.anonymousCounterparty;
  context.fillStyle = violet;
  context.font = "600 19px system-ui, sans-serif";
  context.fillText(copy.promise.shareCard.initiator, firstX, markY - 10);
  context.fillText(copy.promise.shareCard.counterparty, secondX, markY - 10);
  drawSignature(context, input.signatures.a, firstX, markY, signerWidth, markHeight);
  drawSignature(context, input.signatures.b, secondX, markY, signerWidth, markHeight);
  context.strokeStyle = "rgba(24, 21, 29, .28)";
  context.lineWidth = 2;
  drawLine(context, firstX, markY + markHeight + 14, firstX + signerWidth, markY + markHeight + 14);
  drawLine(context, secondX, markY + markHeight + 14, secondX + signerWidth, markY + markHeight + 14);
  context.fillStyle = ink;
  context.font = "700 25px system-ui, sans-serif";
  context.fillText(firstName, firstX, nameY, signerWidth);
  context.fillText(secondName, secondX, nameY, signerWidth);

  context.strokeStyle = "rgba(24, 21, 29, .12)";
  context.lineWidth = 1;
  drawLine(context, padding, footerY - 25, width - padding, footerY - 25);
  context.fillStyle = ink;
  context.font = "600 18px system-ui, sans-serif";
  context.fillText(copy.promise.shareCard.shareImageFooter, padding, footerY + 12, width - padding * 2);

  return canvasBlob(canvas);
}

function downloadImage(file: File) {
  const objectUrl = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = "women-shuo-hao-le.png";
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

export async function shareAgreementImage(input: AgreementShareImageInput): Promise<AgreementShareResult> {
  const blob = await createAgreementShareImage(input);
  const file = new File([blob], "women-shuo-hao-le.png", { type: "image/png" });

  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({
        title: copy.promise.shareCard.shareImageTitle,
        text: copy.promise.shareCard.shareImageText,
        files: [file]
      });
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return "cancelled";
      throw error;
    }
  }

  downloadImage(file);
  return "downloaded";
}
