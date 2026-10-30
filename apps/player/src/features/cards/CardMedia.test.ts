// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { CardMedia } from "./CardMedia";
import type { CardMedia as Media } from "../../data/types";

let root: Root;
let host: HTMLDivElement;
let play: ReturnType<typeof vi.spyOn>;
let pause: ReturnType<typeof vi.spyOn>;
const audio: Media = { kind: "audio", src: "/knocks.m4a", title: "Knocks", duration: "0:06" };
async function render(media: Media, active = true, visible = true) {
  await act(async () => root.render(createElement(CardMedia, { media, active, visible })));
}
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  play = vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(async function(this: HTMLMediaElement) {
    Object.defineProperty(this, "paused", { configurable: true, value: false });
    this.dispatchEvent(new Event("play"));
  });
  pause = vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(function(this: HTMLMediaElement) {
    Object.defineProperty(this, "paused", { configurable: true, value: true });
    this.dispatchEvent(new Event("pause"));
  });
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it("plays on demand, stops on the second tap, and resets when the card flips", async () => {
  await render(audio);
  const element = host.querySelector("audio")!;
  expect(host.querySelector(".card-audio-pulse")).toBeNull();
  expect(host.querySelector(".card-audio .voice-wave")).not.toBeNull();
  await act(async () => host.querySelector("button")!.click());
  expect(play).toHaveBeenCalledOnce();
  expect(host.querySelector('[aria-pressed="true"] .voice-wave.is-active')).not.toBeNull();
  element.currentTime = 2;
  await act(async () => host.querySelector("button")!.click());
  expect(element.paused).toBe(true);
  expect(element.currentTime).toBe(2);
  await act(async () => host.querySelector("button")!.click());
  element.currentTime = 3;
  Object.defineProperty(element, "paused", { configurable: true, value: true });
  await act(async () => element.dispatchEvent(new Event("ended")));
  expect(host.querySelector('.card-audio[aria-pressed="true"]')).toBeNull();
  await act(async () => host.querySelector("button")!.click());
  expect(play).toHaveBeenCalledTimes(3);
  await render(audio, false);
  expect(element.paused).toBe(true);
  expect(element.currentTime).toBe(0);
  expect(element.getAttribute("src")).toBeNull();
});

it("keeps neighboring video cards unloaded and stops current playback when navigating away", async () => {
  const video: Media = { kind: "video", src: "/cups.mp4", poster: "/cups.webp", title: "Cups" };
  await render(video, false);
  expect(host.querySelector("video")?.getAttribute("src")).toBeNull();
  expect(host.querySelector("video")?.preload).toBe("none");
  expect(host.querySelector("video")?.controls).toBe(false);
  await render(video);
  expect(host.querySelector("video")?.controls).toBe(false);
  expect(host.querySelector("video")?.preload).toBe("auto");
  expect(host.querySelector("video")?.autoplay).toBe(true);
  expect(host.querySelector("video")?.muted).toBe(true);
  expect(host.querySelector("video")?.loop).toBe(true);
  expect(host.querySelector(".card-video-state")).toBeNull();
  expect(host.querySelector<HTMLButtonElement>(".card-video")?.getAttribute("aria-pressed")).toBe("true");
  await act(async () => host.querySelector<HTMLButtonElement>(".card-video")!.click());
  expect(host.querySelector("video")?.paused).toBe(true);
  expect(host.querySelector<HTMLButtonElement>(".card-video")?.getAttribute("aria-pressed")).toBe("false");
  await act(async () => host.querySelector<HTMLButtonElement>(".card-video")!.click());
  expect(host.querySelector("video")?.paused).toBe(false);
  await render(video, true, false);
  expect(host.querySelector("video")?.getAttribute("src")).toBe("/cups.mp4");
  expect(host.querySelector("video")?.paused).toBe(true);
  pause.mockClear();
  await act(async () => root.render(null));
  expect(pause).toHaveBeenCalled();
});

it("shows a recoverable failure instead of a false playing state", async () => {
  play.mockRejectedValueOnce(new DOMException("Blocked", "NotAllowedError"));
  await render(audio);
  await act(async () => host.querySelector("button")!.click());
  expect(host.querySelector('.card-audio[aria-pressed="true"]')).toBeNull();
  expect(host.querySelector(".card-media-error")).not.toBeNull();
  await act(async () => host.querySelector<HTMLButtonElement>(".card-media-error")!.click());
  expect(host.querySelector(".card-media-error")).toBeNull();
  await act(async () => host.querySelector("button")!.click());
  expect(host.querySelector('.card-audio[aria-pressed="true"]')).not.toBeNull();
});
