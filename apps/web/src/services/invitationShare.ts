import type { SharePayload } from "../composables/playbitFlowHelpers";
import { copy } from "@playbit/content";
import pandaArt from "../assets/avatar-panda.webp";

const CARD_WIDTH = 720;
const QR_SIZE = 420;

export function invitationUrl(value?: string): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password
      ? url.toString() : null;
  } catch {
    return null;
  }
}

export async function invitationQr(url: string): Promise<string> {
  const link = invitationUrl(url);
  if (!link) throw new Error("Invalid invitation URL");
  const { default: QRCode } = await import("qrcode");
  const canvas = document.createElement("canvas");
  await QRCode.toCanvas(canvas, link, { width: 640, margin: 4, errorCorrectionLevel: "H" });
  const ctx = canvas.getContext("2d")!;
  try {
    const panda = await loadImage(pandaArt);
    // A small central mark with high error correction; keep finder patterns and quiet zone intact.
    ctx.fillStyle = "white";
    ctx.fillRect(278, 278, 84, 84);
    ctx.drawImage(panda, 284, 284, 72, 72);
  } catch { /* A missing decorative image must not prevent inviting someone. */ }
  return canvas.toDataURL("image/png");
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function wrapLines(ctx: CanvasRenderingContext2D, value: string, width: number, limit: number) {
  const output: string[] = [];
  let line = "";
  for (const character of value.replace(/\s+/g, " ")) {
    if (line && ctx.measureText(line + character).width > width) { output.push(line); line = ""; }
    line += character;
  }
  if (line) output.push(line);
  if (output.length <= limit) return output;

  const visible = output.slice(0, limit);
  let last = visible[limit - 1];
  while (last && ctx.measureText(`${last}…`).width > width) last = last.slice(0, -1);
  visible[limit - 1] = `${last}…`;
  return visible;
}

function drawLines(ctx: CanvasRenderingContext2D, value: string, x: number, y: number, width: number, lineHeight: number, limit: number) {
  const wrapped = wrapLines(ctx, value, width, limit);
  wrapped.forEach((text, index) => ctx.fillText(text, x, y + index * lineHeight));
  return wrapped.length;
}

export async function invitationCard(payload: SharePayload, heading: string, hint: string): Promise<{ image: string; file: File; height: number }> {
  const qr = await loadImage(await invitationQr(payload.url));
  const canvas = document.createElement("canvas");
  canvas.width = CARD_WIDTH;
  canvas.height = 1000;
  let ctx = canvas.getContext("2d")!;
  ctx.textAlign = "center";
  ctx.font = "700 38px system-ui, sans-serif";
  const headingLines = wrapLines(ctx, heading, 604, 2);
  const titleY = 154 + headingLines.length * 48 + 14;
  ctx.font = "600 28px system-ui, sans-serif";
  const titleLines = wrapLines(ctx, payload.title, 596, 3);
  const hintY = titleY + titleLines.length * 42 + 22;
  ctx.font = "23px system-ui, sans-serif";
  const hintLines = wrapLines(ctx, hint, 596, 2);
  const qrY = Math.max(500, hintY + Math.max(1, hintLines.length) * 34 + 10);
  const footerY = qrY + QR_SIZE + 32;
  canvas.height = Math.max(1000, footerY + 50);
  ctx = canvas.getContext("2d")!;

  const surface = ctx.createLinearGradient(0, 0, CARD_WIDTH, canvas.height);
  surface.addColorStop(0, "#eaf3ff"); surface.addColorStop(.42, "#ffffff"); surface.addColorStop(1, "#fff9f0");
  ctx.fillStyle = surface; ctx.fillRect(0, 0, CARD_WIDTH, canvas.height);
  ctx.strokeStyle = "#c5d9ee"; ctx.lineWidth = 2; ctx.strokeRect(22, 22, 676, canvas.height - 44);
  ctx.textAlign = "center";
  ctx.fillStyle = "#2565ae"; ctx.font = "600 24px system-ui, sans-serif";
  ctx.fillText(copy.app.name, 360, 84);
  ctx.fillStyle = "#172b4d"; ctx.font = "700 38px system-ui, sans-serif";
  drawLines(ctx, heading, 360, 154, 604, 48, 2);
  ctx.font = "600 28px system-ui, sans-serif";
  drawLines(ctx, payload.title, 360, titleY, 596, 42, 3);
  ctx.fillStyle = "#4b5b73"; ctx.font = "23px system-ui, sans-serif";
  drawLines(ctx, hint, 360, hintY, 596, 34, 2);
  ctx.drawImage(qr, (CARD_WIDTH - QR_SIZE) / 2, qrY, QR_SIZE, QR_SIZE);
  ctx.fillStyle = "#2565ae";
  ctx.font = "600 22px system-ui, sans-serif";
  ctx.fillText(copy.app.name, 360, footerY);
  ctx.fillStyle = "#7b8798";
  ctx.font = "18px system-ui, sans-serif";
  ctx.fillText(new URL(payload.url).host, 360, footerY + 26);
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error("Image unavailable")), "image/png"));
  return {
    image: URL.createObjectURL(blob),
    file: new File([blob], "playbit-invitation.png", { type: "image/png" }),
    height: canvas.height
  };
}
