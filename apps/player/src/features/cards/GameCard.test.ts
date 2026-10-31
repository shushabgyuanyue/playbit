// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { GameCard, VoiceNote } from "../../data/types";
import { GameCard as GameCardView } from "./GameCard";

const card: GameCard = {
  id: "default-material-card",
  label: "默认素材",
  prompt: "没有素材也要有舞台。",
  kicker: "保持同一套布局。",
  rule: "看清文字，再翻开卡片。",
  time: "1 MIN",
  color: "coral",
  moment: "",
  payoff: "让内容先被看见。",
  action: "先读完这一句。",
  sceneIds: ["date"]
};

let root: Root;
let host: HTMLDivElement;

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});

it("gives a card without uploaded media the same material stage", async () => {
  await act(async () => root.render(createElement(GameCardView, {
    card,
    flipped: false,
    slide: "",
    onFlip: vi.fn()
  })));

  expect(host.querySelector(".game-card")?.classList.contains("has-media")).toBe(true);
  expect(host.querySelector(".game-card")?.classList.contains("media-default")).toBe(true);
  expect(host.querySelector(".card-stage .card-media-default")).not.toBeNull();
});

it("wraps a recorded stake waveform as the gift surface", async () => {
  const voice: VoiceNote = { id: "voice-1", assetId: "asset-1", durationMs: 1400, storage: "indexeddb", transcript: "输的人请喝一杯。" };
  await act(async () => root.render(createElement(GameCardView, {
    card,
    flipped: true,
    slide: "",
    stakeVoice: voice,
    onFlip: vi.fn()
  })));

  expect(host.querySelector(".card-voice-gift")).not.toBeNull();
  expect(host.querySelector(".card-voice-bow")).not.toBeNull();
  expect(host.querySelector(".card-voice-wave .voice-wave")).not.toBeNull();
  expect(host.querySelector(".card-voice-duration")).toBeNull();
  expect(host.querySelector(".feed-stake-label")).toBeNull();
  expect(host.querySelector(".card-back .card-stake-label")?.textContent).toContain("彩头");
  expect(host.querySelector(".card-back .card-stake-transcript")?.textContent).toContain("输的人请喝一杯");
  expect(host.querySelector(".card-front .card-stake-transcript")).toBeNull();
});

it("returns to the content side when the rule face is tapped", async () => {
  const onFlip = vi.fn();
  await act(async () => root.render(createElement(GameCardView, {
    card,
    flipped: true,
    slide: "",
    onFlip
  })));

  host.querySelector<HTMLElement>(".card-back")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  expect(onFlip).toHaveBeenCalledWith(false);
});

it("does not return to the content side when a rule control is tapped", async () => {
  const onFlip = vi.fn();
  const cardWithClock = { ...card, flow: { countdownSeconds: 3 } };
  await act(async () => root.render(createElement(GameCardView, {
    card: cardWithClock,
    flipped: true,
    slide: "",
    onFlip
  })));

  host.querySelector<HTMLButtonElement>(".feed-clock")?.click();
  expect(onFlip).not.toHaveBeenCalled();
});
