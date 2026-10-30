// @vitest-environment happy-dom
import { act, createElement, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { IssueStakeSheet } from "./IssueStakeSheet";

vi.mock("../../components/ui/Sheet", () => ({ Sheet: ({ children, open }: { children: ReactNode; open: boolean }) => open ? children : null }));
const playback = vi.hoisted(() => ({ playing: false, loading: false, error: "", toggle: vi.fn(), stop: vi.fn() }));
vi.mock("../promise/useVoicePlayback", () => ({ useVoicePlayback: () => playback }));

it("keeps voice issuance shareable, guards busy actions and removes claim actions after receipt", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const host = document.createElement("div");
  const root = createRoot(host);
  const props = { open: true, onClose: vi.fn(), cardTitle: "约定", stake: "请喝一杯", issuerName: "主持人", voice: { id: "voice", assetId: "recorded", durationMs: 1000, storage: "indexeddb" as const }, onIssue: vi.fn(), onShare: vi.fn(), onSelfClaim: vi.fn(), issuance: { id: "issued", title: "请喝一杯", issuerName: "主持人", signature: [], status: "pending_claim" as const, claimToken: "token" } };
  try {
    await act(async () => root.render(createElement(IssueStakeSheet, { ...props, issuance: null, source: "promise" })));
    const play = host.querySelector<HTMLButtonElement>('.coupon-ticket button[aria-label="播放原声"]');
    expect(play).not.toBeNull();
    expect(host.querySelector(".coupon-ticket.dark-coupon")).not.toBeNull();
    expect(host.querySelector("canvas")).toBeNull();
    await act(async () => play!.click());
    expect(playback.toggle).toHaveBeenCalledOnce();
    expect(props.onIssue).not.toHaveBeenCalled();
    await act(async () => host.querySelector<HTMLButtonElement>(".issue-stake-submit")!.click());
    expect(props.onIssue).toHaveBeenCalledWith(props.voice);
    await act(async () => root.render(createElement(IssueStakeSheet, props)));
    const findShare = () => Array.from(host.querySelectorAll("button")).find(button => button.textContent?.includes("分享给获胜方"));
    expect(host.querySelector("canvas")).toBeNull();
    expect(host.querySelector("input")?.value).toContain("/claim/token");
    await act(async () => findShare()!.click());
    expect(props.onShare).toHaveBeenCalledOnce();
    await act(async () => root.render(createElement(IssueStakeSheet, { ...props, claiming: true })));
    expect(findShare()?.disabled).toBe(true);
    await act(async () => root.render(createElement(IssueStakeSheet, { ...props, issuance: { ...props.issuance, status: "claimed" } })));
    expect(findShare()).toBeUndefined();
    expect(host.querySelector("input")).toBeNull();
  } finally {
    await act(async () => root.unmount());
    vi.unstubAllGlobals();
  }
});
