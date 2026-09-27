import type { SharePayload } from "../composables/playbitFlowHelpers";
import { copy } from "@playbit/content";
import pandaArt from "../assets/avatar-panda.webp";

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

function lines(ctx: CanvasRenderingContext2D, value: string, x: number, y: number, width: number, height: number, limit: number) {
  const output: string[] = [];
  let line = "";
  for (const character of value.replace(/\s+/g, " ")) {
    if (line && ctx.measureText(line + character).width > width) { output.push(line); line = ""; }
    line += character;
  }
  if (line) output.push(line);
  output.slice(0, limit).forEach((text, index) => ctx.fillText(index === limit - 1 && output.length > limit ? text.slice(0, -1) + "…" : text, x, y + index * height));
}

export async function invitationCard(payload: SharePayload, heading: string, hint: string): Promise<{ image: string; file: File }> {
  const qr = await loadImage(await invitationQr(payload.url));
  const canvas = document.createElement("canvas");
  canvas.width = 720;
  canvas.height = 1000;
  const ctx = canvas.getContext("2d")!;
  const surface = ctx.createLinearGradient(0, 0, 720, 1000);
  surface.addColorStop(0, "#eaf3ff"); surface.addColorStop(.42, "#ffffff"); surface.addColorStop(1, "#fff9f0");
  ctx.fillStyle = surface; ctx.fillRect(0, 0, 720, 1000);
  ctx.strokeStyle = "#c5d9ee"; ctx.lineWidth = 2; ctx.strokeRect(22, 22, 676, 956);
  ctx.textAlign = "center";
  ctx.fillStyle = "#2565ae"; ctx.font = "600 24px system-ui, sans-serif";
  ctx.fillText(copy.app.name, 360, 84);
  ctx.fillStyle = "#172b4d"; ctx.font = "700 38px system-ui, sans-serif";
  lines(ctx, heading, 360, 154, 604, 48, 2);
  ctx.font = "600 28px system-ui, sans-serif";
  lines(ctx, payload.title, 360, 260, 596, 42, 3);
  ctx.fillStyle = "#4b5b73"; ctx.font = "23px system-ui, sans-serif";
  lines(ctx, hint, 360, 402, 596, 34, 2);
  ctx.drawImage(qr, 120, 484, 480, 480);
  ctx.font = "18px system-ui, sans-serif";
  ctx.fillText(new URL(payload.url).host, 360, 969);
  const image = canvas.toDataURL("image/png");
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error("Image unavailable")), "image/png"));
  return { image, file: new File([blob], "playbit-invitation.png", { type: "image/png" }) };
}
