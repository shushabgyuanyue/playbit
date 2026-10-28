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
    createElement("div", { className: "is-scrollable" }, "Long rules"));
}
function pointer(target: Element, type: string, y: number, isPrimary = true) {
  target.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerId: 1, pointerType: "touch", clientX: 100, clientY: y, isPrimary }));
}
beforeEach(async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  now = 0;
  vi.spyOn(performance, "now").mockImplementation(() => now);
  move.mockReset().mockReturnValue(true);
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => root.render(createElement(Harness, {})));
  surface = host.querySelector("section")!;
  let captured = false;
  Object.defineProperties(surface, {
    clientHeight: { value: 600 },
    setPointerCapture: { value: () => { captured = true; } },
    hasPointerCapture: { value: () => captured },
    releasePointerCapture: { value: () => { captured = false; } }
  });
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it("tracks the finger, keeps the release position for the transition, then resets on the next card", async () => {
  pointer(surface.querySelector("p")!, "pointerdown", 400);
  now = 250;
  pointer(surface, "pointermove", 240);
  expect(surface.style.getPropertyValue("--feed-drag")).toBe("-160px");
  pointer(surface, "pointerup", 240);
  expect(move).toHaveBeenCalledExactlyOnceWith(1);
  expect(surface.style.getPropertyValue("--feed-drag")).toBe("-160px");
  await act(async () => root.render(createElement(Harness, { slide: "enter-up", cardId: "next" })));
  expect(surface.style.getPropertyValue("--feed-drag")).toBe("");
  expect(surface.classList.contains("is-dragging")).toBe(false);
});

it("does not change cards from controls, long rule scrolling, secondary fingers or cancelled drags", () => {
  for (const target of [surface.querySelector("button")!, surface.querySelector(".is-scrollable")!]) {
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
