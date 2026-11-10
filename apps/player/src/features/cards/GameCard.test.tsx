// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { GameCard } from "../../data/types";
import { GameCard as GameCardView } from "./GameCard";

let host: HTMLDivElement;
let root: Root;

const card: GameCard = {
  id: "metal-bird",
  label: "这只鸟，替你们保守一个秘密",
  prompt: "它停在你的手指上，\n好像已经听见了。",
  kicker: "先别翻，\n猜它想要什么。",
  rule: "轮流给这只鸟一句指令，最后一句必须让两个人都想做。",
  time: "90 SEC",
  color: "violet",
  moment: "两个人",
  payoff: "答案不在图里，在你们下一句话里。",
  action: "一起看图 5 秒。",
  sceneIds: ["date"],
  media: { kind: "image", src: "/media/cards/metal-bird.jpg", alt: "金属鸟" }
};

function renderCard(flipped: boolean, onFlip: (value: boolean) => void) {
  root.render(createElement(GameCardView, { card, flipped, slide: "", onFlip }));
}

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

it("flips from the card body on a direct tap in either direction", async () => {
  const onFlip = vi.fn();
  await act(async () => renderCard(false, onFlip));
  await act(async () => host.querySelector<HTMLElement>(".game-card")!.click());
  expect(onFlip).toHaveBeenCalledExactlyOnceWith(true);

  onFlip.mockClear();
  await act(async () => renderCard(true, onFlip));
  await act(async () => host.querySelector<HTMLElement>(".game-card")!.click());
  expect(onFlip).toHaveBeenCalledExactlyOnceWith(false);
});

it("keeps media and card controls out of the flip gesture", async () => {
  const onFlip = vi.fn();
  const onLike = vi.fn();
  await act(async () => root.render(createElement(GameCardView, { card, flipped: false, slide: "", onFlip, onLike })));
  await act(async () => host.querySelector<HTMLButtonElement>(".card-social-action")!.click());
  expect(onLike).toHaveBeenCalledOnce();
  expect(onFlip).not.toHaveBeenCalled();
});
