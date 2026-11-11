// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useFeedSwipe } from "./useFeedSwipe";

let host: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
let surface: HTMLElement;
let now: number;
const move = vi.fn<(direction: number) => boolean>();

function Harness({ slide = "", cardId = "first" }) {
  const swipe = useFeedSwipe(slide, cardId, move);
  return createElement("section", swipe,
    createElement("p", null, "Content"),
    createElement("button", null, "Flip"),
    createElement("div", { className: "card-back" }, createElement("div", { className: "is-scrollable", "data-feed-scroll": true }, "Long rules")));
}
function pointerAt(target: Element, type: string, x: number, y: number, isPrimary = true) {
  target.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerId: 1, pointerType: "touch", clientX: x, clientY: y, isPrimary }));
}
function pointer(target: Element, type: string, y: number, isPrimary = true) {
  pointerAt(target, type, 100, y, isPrimary);
}
beforeEach(async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.useFakeTimers();
  now = 0;
  vi.spyOn(performance, "now").mockImplementation(() => now);
  move.mockReset().mockReturnValue(true);
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => root.render(createElement(Harness, {})));
  surface = host.querySelector("section")!;
  surface.querySelector("[data-feed-scroll]")?.classList.add("is-scrollable");
  let captured = false;
  Object.defineProperties(surface, {
    clientHeight: { value: 600 },
    clientWidth: { value: 600 },
    setPointerCapture: { value: () => { captured = true; } },
    hasPointerCapture: { value: () => captured },
    releasePointerCapture: { value: () => { captured = false; } }
  });
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.restoreAllMocks();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it("tracks the finger, keeps the release position for the transition, then resets on the next card", async () => {
  pointer(surface.querySelector("p")!, "pointerdown", 400);
  now = 250;
  pointer(surface, "pointermove", 240);
  const drag = Number.parseFloat(surface.style.getPropertyValue("--feed-drag"));
  expect(drag).toBeCloseTo(-160, 4);
  expect(Number.parseFloat(surface.style.getPropertyValue("--feed-progress"))).toBeCloseTo(.2667, 3);
  expect(surface.dataset.dragAxis).toBe("y");
  pointer(surface, "pointerup", 240);
  expect(move).toHaveBeenCalledExactlyOnceWith(1);
  expect(surface.style.getPropertyValue("--feed-drag")).toBe(`${drag}px`);
  expect(surface.classList.contains("is-settling")).toBe(true);
  await act(async () => root.render(createElement(Harness, { slide: "enter-up", cardId: "next" })));
  expect(surface.style.getPropertyValue("--feed-drag")).toBe("");
  expect(surface.classList.contains("is-dragging")).toBe(false);
});

it("uses left swipe to enter same-type mode and right swipe to exit it", async () => {
  const enter = vi.fn();
  const exit = vi.fn();
  function TypeModeHarness() {
    const swipe = useFeedSwipe("", "type-mode", move, { onSwipeLeft: enter, onSwipeRight: exit });
    return createElement("section", swipe, createElement("p", null, "Content"));
  }
  await act(async () => root.render(createElement(TypeModeHarness)));
  surface = host.querySelector("section")!;
  Object.defineProperties(surface, {
    clientHeight: { value: 600 }, clientWidth: { value: 600 },
    setPointerCapture: { value: () => undefined }, hasPointerCapture: { value: () => false }, releasePointerCapture: { value: () => undefined }
  });
  pointerAt(surface.querySelector("p")!, "pointerdown", 420, 300);
  pointerAt(surface, "pointermove", 220, 300);
  pointerAt(surface, "pointerup", 220, 300);
  expect(enter).toHaveBeenCalledOnce();
  expect(move).not.toHaveBeenCalled();
  pointerAt(surface.querySelector("p")!, "pointerdown", 220, 300);
  pointerAt(surface, "pointermove", 440, 300);
  pointerAt(surface, "pointerup", 440, 300);
  expect(exit).toHaveBeenCalledOnce();
  expect(move).not.toHaveBeenCalled();
});

it("suppresses the synthetic click that follows a committed swipe", () => {
  const tap = vi.fn();
  function ClickHarness() {
    const swipe = useFeedSwipe("", "synthetic-click", move, { onSwipeLeft: () => move(-1), onTap: tap });
    return createElement("section", { ...swipe, onClick: tap }, createElement("p", null, "Content"));
  }
  act(() => root.render(createElement(ClickHarness)));
  surface = host.querySelector("section")!;
  Object.defineProperties(surface, {
    clientHeight: { value: 600 }, clientWidth: { value: 600 },
    setPointerCapture: { value: () => undefined }, hasPointerCapture: { value: () => false }, releasePointerCapture: { value: () => undefined }
  });
  pointerAt(surface.querySelector("p")!, "pointerdown", 420, 300);
  pointerAt(surface, "pointermove", 220, 300);
  pointerAt(surface, "pointerup", 220, 300);
  surface.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  expect(move).toHaveBeenCalledTimes(1);
  expect(move).toHaveBeenCalledWith(-1);
  expect(tap).not.toHaveBeenCalled();
});

it("damps horizontal motion without scaling the mode surface", async () => {
  const enter = vi.fn();
  function TypeModeHarness() {
    const swipe = useFeedSwipe("", "type-mode-damped", move, { onSwipeLeft: enter });
    return createElement("section", swipe, createElement("p", null, "Content"));
  }
  await act(async () => root.render(createElement(TypeModeHarness)));
  surface = host.querySelector("section")!;
  Object.defineProperties(surface, {
    clientHeight: { value: 600 }, clientWidth: { value: 600 },
    setPointerCapture: { value: () => undefined }, hasPointerCapture: { value: () => false }, releasePointerCapture: { value: () => undefined }
  });
  pointerAt(surface.querySelector("p")!, "pointerdown", 420, 300);
  pointerAt(surface, "pointermove", 120, 300);
  const drag = Number.parseFloat(surface.style.getPropertyValue("--feed-drag-x"));
  expect(drag).toBeCloseTo(-300, 4);
  expect(Number.parseFloat(surface.style.getPropertyValue("--feed-stage-depth-x"))).toBeCloseTo(12, 1);
  expect(Number.parseFloat(surface.style.getPropertyValue("--feed-story-depth-x"))).toBeCloseTo(4.8, 1);
  expect(Number.parseFloat(surface.style.getPropertyValue("--feed-scale"))).toBe(1);
  pointerAt(surface, "pointerup", 120, 300);
  expect(enter).toHaveBeenCalledOnce();
  expect(surface.classList.contains("is-settling")).toBe(true);
  await act(async () => { vi.advanceTimersByTime(360); });
  expect(surface.classList.contains("is-settling")).toBe(false);
  expect(surface.style.getPropertyValue("--feed-drag-x")).toBe("");
  expect(surface.style.getPropertyValue("--feed-stage-depth-x")).toBe("");
});

it("keeps rubber-band resistance monotonic after the threshold", () => {
  pointerAt(surface.querySelector("p")!, "pointerdown", 100, 300);
  pointerAt(surface, "pointermove", 500, 300);
  const first = Number.parseFloat(surface.style.getPropertyValue("--feed-drag-x"));
  pointerAt(surface, "pointermove", 560, 300);
  const second = Number.parseFloat(surface.style.getPropertyValue("--feed-drag-x"));
  expect(Math.abs(first)).toBeLessThan(400);
  expect(Math.abs(second)).toBeGreaterThan(Math.abs(first));
});

it("locks the gesture axis after the first meaningful movement", async () => {
  const enter = vi.fn();
  function TypeModeHarness() {
    const swipe = useFeedSwipe("", "type-mode-axis", move, { onSwipeLeft: enter });
    return createElement("section", swipe, createElement("p", null, "Content"));
  }
  await act(async () => root.render(createElement(TypeModeHarness)));
  surface = host.querySelector("section")!;
  Object.defineProperties(surface, {
    clientHeight: { value: 600 }, clientWidth: { value: 600 },
    setPointerCapture: { value: () => undefined }, hasPointerCapture: { value: () => false }, releasePointerCapture: { value: () => undefined }
  });
  pointerAt(surface.querySelector("p")!, "pointerdown", 420, 300);
  pointerAt(surface, "pointermove", 390, 285);
  pointerAt(surface, "pointermove", 395, 220);
  pointerAt(surface, "pointerup", 395, 220);
  expect(enter).toHaveBeenCalledOnce();
  expect(move).not.toHaveBeenCalled();
});

it("hands an overflowing rule region back to native vertical scrolling", async () => {
  function ScrollHarness() {
    const swipe = useFeedSwipe("", "native-scroll", move);
    return createElement("section", swipe, createElement("div", { className: "card-back" }, createElement("div", { className: "is-scrollable", "data-feed-scroll": true }, "Long rules")));
  }
  await act(async () => root.render(createElement(ScrollHarness)));
  surface = host.querySelector("section")!;
  Object.defineProperties(surface, {
    setPointerCapture: { value: () => undefined }, hasPointerCapture: { value: () => false }, releasePointerCapture: { value: () => undefined }
  });
  const scrollRegion = surface.querySelector("[data-feed-scroll]")!;
  scrollRegion.classList.add("is-scrollable");
  pointerAt(scrollRegion, "pointerdown", 100, 300);
  expect(surface.classList.contains("is-native-scroll")).toBe(true);
  pointerAt(surface, "pointerup", 100, 200);
  expect(surface.classList.contains("is-native-scroll")).toBe(false);
  expect(move).not.toHaveBeenCalled();
});

it("keeps a vertical feed swipe active when it starts in overflowing front content", async () => {
  function FrontContentHarness() {
    const swipe = useFeedSwipe("", "front-content", move);
    return createElement("section", swipe, createElement("div", { className: "card-front" }, createElement("div", { className: "is-scrollable", "data-feed-scroll": true }, "Long content")));
  }
  await act(async () => root.render(createElement(FrontContentHarness)));
  surface = host.querySelector("section")!;
  Object.defineProperties(surface, {
    clientHeight: { value: 600 }, clientWidth: { value: 600 },
    setPointerCapture: { value: () => undefined }, hasPointerCapture: { value: () => false }, releasePointerCapture: { value: () => undefined }
  });
  const content = surface.querySelector("[data-feed-scroll]")!;
  content.classList.add("is-scrollable");
  pointerAt(content, "pointerdown", 100, 400);
  pointerAt(surface, "pointermove", 100, 180);
  pointerAt(surface, "pointerup", 100, 180);
  expect(move).toHaveBeenCalledExactlyOnceWith(1);
});

it("keeps a short tap on a scrollable card face available for flipping", () => {
  const tap = vi.fn();
  function ScrollTapHarness() {
    const swipe = useFeedSwipe("", "scroll-tap", move, { onTap: tap });
    return createElement("section", swipe, createElement("div", { className: "card-back" }, createElement("div", { className: "is-scrollable", "data-feed-scroll": true }, "Long rules")));
  }
  act(() => root.render(createElement(ScrollTapHarness)));
  surface = host.querySelector("section")!;
  Object.defineProperties(surface, {
    clientHeight: { value: 600 }, clientWidth: { value: 600 },
    setPointerCapture: { value: () => undefined }, hasPointerCapture: { value: () => false }, releasePointerCapture: { value: () => undefined }
  });
  const scrollRegion = surface.querySelector("[data-feed-scroll]")!;
  scrollRegion.classList.add("is-scrollable");
  pointerAt(scrollRegion, "pointerdown", 100, 300);
  pointerAt(surface, "pointerup", 100, 300);
  expect(tap).toHaveBeenCalledOnce();
  expect(move).not.toHaveBeenCalled();
});

it("does not change cards from controls, long rule scrolling, secondary fingers or cancelled drags", () => {
  for (const target of [surface.querySelector("button")!, surface.querySelector("[data-feed-scroll]")!]) {
    pointer(target, "pointerdown", 400);
    pointer(surface, "pointerup", 100);
  }
  pointer(surface, "pointerdown", 400, false);
  pointer(surface, "pointerup", 100, false);
  pointer(surface, "pointerdown", 400);
  pointer(surface, "pointermove", 200);
  pointer(surface, "pointercancel", 200);
  expect(move).not.toHaveBeenCalled();
  expect(surface.style.getPropertyValue("--feed-drag")).toBe("");
});

it("lets media controls keep tap playback while allowing a swipe to start on the media stage", () => {
  const tap = vi.fn();
  function MediaHarness() {
    const swipe = useFeedSwipe("", "media", move, { onTap: tap });
    return createElement("section", swipe, createElement("button", { className: "card-video" }, "Video"));
  }
  act(() => root.render(createElement(MediaHarness)));
  surface = host.querySelector("section")!;
  Object.defineProperties(surface, {
    clientHeight: { value: 600 }, clientWidth: { value: 600 },
    setPointerCapture: { value: () => undefined }, hasPointerCapture: { value: () => false }, releasePointerCapture: { value: () => undefined }
  });
  const media = surface.querySelector(".card-video")!;
  pointer(media, "pointerdown", 400);
  pointer(surface, "pointerup", 400);
  expect(tap).not.toHaveBeenCalled();

  pointer(media, "pointerdown", 400);
  now = 250;
  pointer(surface, "pointermove", 200);
  pointer(surface, "pointerup", 200);
  expect(move).toHaveBeenCalledExactlyOnceWith(1);
});

it("returns the card to its position when a pending stake blocks a swipe, and ignores wheel inertia", () => {
  move.mockReturnValue(false);
  pointer(surface, "pointerdown", 400);
  now = 250;
  pointer(surface, "pointermove", 200);
  pointer(surface, "pointerup", 200);
  expect(surface.style.getPropertyValue("--feed-drag")).toBe("");
  move.mockClear().mockReturnValue(true);
  for (let i = 0; i < 8; i++) {
    surface.dispatchEvent(new WheelEvent("wheel", { deltaY: 60, bubbles: true, cancelable: true }));
    now += 30;
  }
  expect(move).toHaveBeenCalledExactlyOnceWith(1);
});

it("finishes a drag when the pointer leaves the deck and keeps the next gesture usable", () => {
  pointer(surface, "pointerdown", 400);
  now = 250;
  pointer(surface, "pointermove", 200);
  window.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 1, pointerType: "touch", clientX: 100, clientY: 200, isPrimary: true }));
  expect(move).toHaveBeenCalledExactlyOnceWith(1);

  vi.advanceTimersByTime(340);
  pointer(surface, "pointerdown", 400);
  pointer(surface, "pointerup", 400);
  expect(surface.style.getPropertyValue("--feed-drag")).toBe("");
});

it("reports a tap immediately without a hold timer", () => {
  const tap = vi.fn();
  function TapHarness() {
    const swipe = useFeedSwipe("", "tap", move, { onTap: tap });
    return createElement("section", swipe, createElement("p", null, "Content"));
  }
  act(() => root.render(createElement(TapHarness)));
  surface = host.querySelector("section")!;
  pointer(surface.querySelector("p")!, "pointerdown", 400);
  vi.advanceTimersByTime(1200);
  pointer(surface, "pointerup", 400);
  expect(tap).toHaveBeenCalledOnce();
  expect(move).not.toHaveBeenCalled();
  expect(surface.classList.contains("is-holding")).toBe(false);
  expect(surface.style.getPropertyValue("--hold-progress")).toBe("");
});
