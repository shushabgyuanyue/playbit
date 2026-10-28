// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { CouponCard } from "./CouponCard";
import type { Coupon } from "../../data/types";

const playback = vi.hoisted(() => ({ playing: false, loading: false, error: "", toggle: vi.fn(), stop: vi.fn() }));
vi.mock("../promise/useVoicePlayback", () => ({ useVoicePlayback: () => playback }));
let root: Root;
let host: HTMLDivElement;
const coupon: Coupon = { id: "test", title: "请喝一杯", subtitle: "约定权益", side: "won", source: "promise", tone: "dark-coupon", status: "available", signature: [[{ x: .1, y: .2 }, { x: .8, y: .5 }]], voice: { id: "voice", assetId: "audio", durationMs: 3000, storage: "indexeddb" } };

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  playback.toggle.mockReset(); playback.stop.mockReset();
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals(); });

it("shows a clickable waveform in place of both local and remote signatures", async () => {
  await act(async () => root.render(createElement(CouponCard, { coupon, index: 0, onRedeem: vi.fn(), signatureDataUrl: "data:image/png;base64,test" })));
  expect(host.querySelector(".coupon-back .signature-mark, .coupon-back .signature-image")).toBeNull();
  expect(host.querySelector(".coupon-back .voice-wave")).not.toBeNull();
  expect(host.querySelector(".coupon-back")?.hasAttribute("inert")).toBe(true);
  await act(async () => host.querySelector<HTMLElement>("article")!.click());
  expect(host.querySelector("article")?.classList.contains("is-flipped")).toBe(true);
  await act(async () => host.querySelector<HTMLButtonElement>(".coupon-audio-play")!.click());
  expect(playback.toggle).toHaveBeenCalledOnce();
  expect(host.querySelector("article")?.classList.contains("is-flipped")).toBe(true);
  playback.stop.mockClear();
  await act(async () => host.querySelector<HTMLButtonElement>(".coupon-back-hint")!.click());
  expect(playback.stop).toHaveBeenCalledOnce();
});

it("continues to show handwriting for a normal coupon", async () => {
  await act(async () => root.render(createElement(CouponCard, { coupon: { ...coupon, voice: undefined }, index: 0, onRedeem: vi.fn() })));
  expect(host.querySelector(".coupon-back .signature-mark")).not.toBeNull();
  expect(host.querySelector(".coupon-audio-play")).toBeNull();
});
