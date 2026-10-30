// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { GameCard } from "../../data/types";
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
    onFlip: vi.fn(),
    onStake: vi.fn(),
    onIssue: vi.fn()
  })));

  expect(host.querySelector(".game-card")?.classList.contains("has-media")).toBe(true);
  expect(host.querySelector(".game-card")?.classList.contains("media-default")).toBe(true);
  expect(host.querySelector(".card-stage .card-media-default")).not.toBeNull();
});
