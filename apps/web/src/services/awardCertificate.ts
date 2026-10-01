import { copy } from "@playbit/content";
import type { Agreement } from "@playbit/shared";
import winnerTemplateUrl from "../assets/certificates/result-winner.jpg";
import loserTemplateUrl from "../assets/certificates/result-loser.jpg";
import { getEffectiveStakeLabel, getWinnerName } from "../utils/sessionDisplay";
import { drawPlaybitSeal } from "./playbitSeal";

export type AwardKind = "result" | "fulfillment" | "waiver";

const CERTIFICATE_WIDTH = 1122;
const CERTIFICATE_HEIGHT = 1402;
const MAX_NICKNAME_LENGTH = 20;
const MAX_TITLE_LENGTH = 50;
const MAX_EQUITY_LENGTH = 20;
const serif = '"STSong", "Songti SC", "SimSun", serif';
const hand = '"STKaiti", "KaiTi", "Kaiti SC", cursive';

export function isHonoredChallenger(agreement: Agreement, userId?: string | null) {
  return Boolean(userId && agreement.participants.some(person => person.id === agreement.loserId && person.userId === userId));
}

export function awardTitle(kind: AwardKind, challenger: boolean) {
  if (kind === "fulfillment") return copy.certificate.fulfillmentTitle;
  if (kind === "waiver") return copy.certificate.waiverTitle;
  return challenger ? copy.certificate.honorTitle : copy.certificate.victoryTitle;
}

function clampText(value: string | null | undefined, maxLength: number) {
  const text = Array.from(String(value ?? "").trim()).slice(0, maxLength).join("");
  return text || copy.common.unavailable;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, width: number) {
  const rows: string[] = [];
  let line = "";
  for (const character of text) {
    if (line && ctx.measureText(line + character).width > width) {
      rows.push(line);
      line = "";
    }
    line += character;
  }
  if (line) rows.push(line);
  return rows;
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("CERTIFICATE_ASSET_FAILED"));
    image.src = src;
  });
}

function drawFittedCentered(
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  baseline: number,
  maxWidth: number,
  maxFontSize: number,
  minFontSize: number,
  fontFamily: string,
  color: string,
  lineHeight: number,
  maxLines = 1,
) {
  let fontSize = maxFontSize;
  let lines: string[] = [];
  while (fontSize >= minFontSize) {
    ctx.font = `600 ${fontSize}px ${fontFamily}`;
    lines = wrap(ctx, value, maxWidth);
    if (lines.length <= maxLines) break;
    fontSize -= 2;
  }
  if (lines.length > maxLines) {
    lines = lines.slice(0, maxLines);
    const last = lines.length - 1;
    while (ctx.measureText(lines[last]).width > maxWidth && lines[last].length > 1) {
      lines[last] = `${lines[last].slice(0, -1)}…`;
    }
  }
  ctx.textAlign = "center";
  ctx.fillStyle = color;
  lines.forEach((line, index) => ctx.fillText(line, x, baseline + index * lineHeight));
  return lines.length;
}

function drawImageContain(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  maxWidth: number,
  maxHeight: number,
) {
  const scale = Math.min(maxWidth / image.naturalWidth, maxHeight / image.naturalHeight);
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  ctx.drawImage(image, x, y + (maxHeight - height) / 2, width, height);
}

function drawFittedLeft(
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  baseline: number,
  maxWidth: number,
  maxFontSize: number,
  minFontSize: number,
  fontFamily: string,
  color: string,
  fontWeight = "600",
) {
  let fontSize = maxFontSize;
  ctx.textAlign = "left";
  ctx.fillStyle = color;
  while (fontSize > minFontSize) {
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    if (ctx.measureText(value).width <= maxWidth) break;
    fontSize -= 1;
  }
  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  let displayValue = value;
  while (ctx.measureText(displayValue).width > maxWidth && displayValue.length > 1) {
    displayValue = `${displayValue.slice(0, -1)}…`;
  }
  ctx.fillText(displayValue, x, baseline);
}

async function drawResultCertificate(
  canvas: HTMLCanvasElement,
  agreement: Agreement,
  userId?: string | null,
) {
  const challenger = isHonoredChallenger(agreement, userId);
  const recipient = agreement.participants.find(person => person.id === (challenger ? agreement.loserId : agreement.winnerId));
  const peer = agreement.participants.find(person => person.id !== recipient?.id);
  const recorder = agreement.participants.find(person => person.userId === agreement.resultRecorderUserId);
  const template = await loadImage(challenger ? loserTemplateUrl : winnerTemplateUrl);

  canvas.width = CERTIFICATE_WIDTH;
  canvas.height = CERTIFICATE_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("CERTIFICATE_CONTEXT_FAILED");
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(template, 0, 0, CERTIFICATE_WIDTH, CERTIFICATE_HEIGHT);

  const ink = challenger ? "#162e47" : "#653b0d";
  const recipientName = clampText(recipient?.nickname, MAX_NICKNAME_LENGTH);
  const title = `《${clampText(agreement.title, MAX_TITLE_LENGTH)}》`;
  const peerName = clampText(peer?.nickname, MAX_NICKNAME_LENGTH);
  const equity = clampText(getEffectiveStakeLabel(agreement), MAX_EQUITY_LENGTH);
  const recorderName = clampText(recorder?.nickname, MAX_NICKNAME_LENGTH);
  const date = new Date(agreement.resultRecordedAt ?? agreement.createdAt);
  const dateLabel = Number.isNaN(date.getTime())
    ? String(agreement.resultRecordedAt ?? agreement.createdAt)
    : `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;

  drawFittedCentered(ctx, recipientName, 561, 593, 540, 88, 42, serif, ink, 60, 1);
  drawFittedCentered(ctx, title, 561, 684, 520, 44, 22, serif, ink, 36, 2);

  const values = [peerName, equity];
  const rowBaselines = [1001, 1054];
  values.forEach((value, index) => {
    drawFittedLeft(ctx, value, 423, rowBaselines[index], 480, index === 0 ? 29 : 28, 20, serif, ink, index === 0 ? "700" : "600");
  });

  const recorderBaseline = 1110;
  if (recorder?.signatureDataUrl) {
    try {
      const signature = await loadImage(recorder.signatureDataUrl);
      drawImageContain(ctx, signature, 423, recorderBaseline - 24, 300, 48);
    } catch {
      drawFittedLeft(ctx, recorderName, 423, recorderBaseline, 390, 28, 18, serif, ink);
    }
  } else {
    drawFittedLeft(ctx, recorderName, 423, recorderBaseline, 390, 28, 18, serif, ink);
  }

  drawFittedLeft(ctx, dateLabel, 423, 1165, 390, 30, 20, hand, ink, "500");
}

function drawLegacyAwardCertificate(canvas: HTMLCanvasElement, agreement: Agreement, kind: Exclude<AwardKind, "result">, userId?: string | null) {
  const c = copy.certificate;
  const challenger = isHonoredChallenger(agreement, userId);
  const recipient = agreement.participants.find(person => person.id === (challenger ? agreement.loserId : agreement.winnerId));
  const peer = agreement.participants.find(person => person.id !== recipient?.id);
  const recorder = agreement.participants.find(person => person.userId === agreement.resultRecorderUserId);
  const ctx = canvas.getContext("2d")!;
  ctx.font = `600 62px ${serif}`;
  const nameRows = wrap(ctx, clampText(recipient?.nickname, MAX_NICKNAME_LENGTH), 810);
  ctx.font = `600 30px ${serif}`;
  const subjectRows = wrap(ctx, `《${clampText(agreement.title, MAX_TITLE_LENGTH)}》`, 810);
  ctx.font = `28px ${serif}`;
  const citation = kind === "fulfillment" ? c.fulfilledStatus : copy.vouchers.waiverRecorded;
  const citationRows = wrap(ctx, citation, 800);
  const resultFact = kind === "fulfillment" ? c.fulfilledStatus : copy.vouchers.waiverRecorded;
  const facts: Array<[string, string]> = [[c.resultFact, resultFact], [c.peer, peer?.nickname ?? getWinnerName(agreement)], [c.equity, getEffectiveStakeLabel(agreement)]];
  const rows = facts.map(([label, value]) => ({ label, lines: wrap(ctx, value, 620) }));
  const recorderRows = wrap(ctx, recorder?.nickname ?? copy.common.unavailable, 365);
  const bodyEnd = 593 + nameRows.length * 76 + 21 + subjectRows.length * 44 + citationRows.length * 44 + 54
    + rows.reduce((sum, row) => sum + Math.max(58, row.lines.length * 38 + 12), 0);
  const extraSignatureHeight = Math.max(0, recorderRows.length - 1) * 35;
  const height = Math.max(1460, bodyEnd + 330 + extraSignatureHeight);
  canvas.width = 1080;
  canvas.height = height;
  const ink = challenger ? "#294765" : "#57382b";
  const gold = challenger ? "#82949e" : "#ab8444";
  const paper = ctx.createLinearGradient(0, 0, 1080, height);
  paper.addColorStop(0, "#fffefa"); paper.addColorStop(.5, "#fffdf6"); paper.addColorStop(1, "#faf5e9");
  ctx.fillStyle = paper; ctx.fillRect(0, 0, 1080, height);
  ctx.strokeStyle = gold; ctx.lineWidth = 2;
  ctx.strokeRect(34, 34, 1012, height - 68);
  ctx.lineWidth = .7; ctx.strokeRect(45, 45, 990, height - 90); ctx.strokeRect(63, 63, 954, height - 126);
  ctx.globalAlpha = .17;
  for (let y = 72; y < height - 72; y += 7) {
    ctx.beginPath(); ctx.moveTo(48, y); ctx.lineTo(59, y + 7); ctx.moveTo(1021, y); ctx.lineTo(1032, y + 7); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  [[80, 80, 1, 1], [1000, 80, -1, 1], [80, height - 80, 1, -1], [1000, height - 80, -1, -1]].forEach(([x, y, dx, dy]) => {
    ctx.beginPath(); ctx.moveTo(x, y + dy * 45); ctx.lineTo(x, y); ctx.lineTo(x + dx * 45, y); ctx.stroke();
  });
  const text = (value: string, y: number, font: string, color = ink) => {
    ctx.textAlign = "center"; ctx.fillStyle = color; ctx.font = font; ctx.fillText(value, 540, y);
  };
  ctx.save(); ctx.translate(540, 159); ctx.strokeStyle = gold; ctx.lineWidth = .8;
  for (let i = 0; i < 32; i++) { ctx.rotate(Math.PI / 16); ctx.beginPath(); ctx.ellipse(0, 24, 12, 35, 0, 0, Math.PI * 2); ctx.stroke(); }
  ctx.fillStyle = "#fffdf6"; ctx.beginPath(); ctx.arc(0, 0, 32, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore();
  text(copy.contract.emblem, 173, `600 36px ${serif}`, gold);
  text(c.awardSeries, 261, `24px ${serif}`);
  text(awardTitle(kind, challenger), 362, `700 76px ${serif}`);
  text(c.archiveEnglish, 408, "18px Georgia, serif", gold);
  ctx.strokeStyle = gold; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(224, 441); ctx.lineTo(856, 441); ctx.stroke();
  text(c.awardPresented, 501, `24px ${serif}`);
  let y = 593;
  nameRows.forEach(line => { text(line, y, `600 62px ${serif}`); y += 76; });
  ctx.strokeStyle = gold; ctx.globalAlpha = .5; ctx.beginPath(); ctx.moveTo(250, y - 48); ctx.lineTo(830, y - 48); ctx.stroke(); ctx.globalAlpha = 1;
  y += 21;
  subjectRows.forEach(line => { text(line, y, `600 30px ${serif}`); y += 44; });
  citationRows.forEach(line => { text(line, y + 18, `28px ${serif}`); y += 44; });
  y += 54;
  for (const { label, lines } of rows) {
    ctx.textAlign = "left"; ctx.font = `23px ${serif}`; ctx.fillStyle = "#746e64"; ctx.fillText(label, 132, y);
    ctx.font = `28px ${serif}`; ctx.fillStyle = ink;
    lines.forEach((line, index) => ctx.fillText(line, 315, y + index * 38));
    const rowHeight = Math.max(58, lines.length * 38 + 12);
    ctx.strokeStyle = "#e3d9c6"; ctx.beginPath(); ctx.moveTo(132, y + rowHeight - 27); ctx.lineTo(948, y + rowHeight - 27); ctx.stroke(); y += rowHeight;
  }
  const signatureY = height - 256 - extraSignatureHeight;
  ctx.textAlign = "left"; ctx.fillStyle = "#746e64"; ctx.font = `22px ${serif}`; ctx.fillText(c.signedWitness, 136, signatureY);
  ctx.fillStyle = ink; ctx.font = `500 28px ${serif}`; recorderRows.forEach((line, index) => ctx.fillText(line, 136, signatureY + 44 + index * 35));
  ctx.textAlign = "right"; ctx.font = `26px ${serif}`; ctx.fillText(c.recordIssuer, 934, signatureY + 14);
  const date = new Date(agreement.resultRecordedAt ?? agreement.createdAt);
  ctx.font = `22px ${serif}`; ctx.fillText(`${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`, 934, signatureY + 54);
  drawPlaybitSeal(ctx, 846, signatureY + 22, {
    topText: c.resultStatus,
    centerText: c.awardSeal,
    bottomText: "PLAYBIT",
    scale: 1
  });
  text(c.resultStatus, height - 116, `24px ${serif}`);
  text(c.disclaimer, height - 78, "17px ui-sans-serif, sans-serif", "#776e63");
  text(`${c.recordNumber} ${agreement.shareCode.toUpperCase()} · ${challenger ? "C" : "W"}`, height - 49, "14px ui-monospace, monospace", "#776e63");
}

export async function drawAwardCertificate(canvas: HTMLCanvasElement, agreement: Agreement, kind: AwardKind, userId?: string | null) {
  if (kind === "result") {
    await drawResultCertificate(canvas, agreement, userId);
    return;
  }
  drawLegacyAwardCertificate(canvas, agreement, kind, userId);
}
