// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { CouponClaimPage } from "./CouponClaimPage";

const mocks = vi.hoisted(() => ({ navigate: vi.fn(), notify: vi.fn(), claim: vi.fn().mockResolvedValue({ coupon: {} }) }));
vi.mock("react-router-dom", () => ({ useParams: () => ({ token: "claim-token" }), useNavigate: () => mocks.navigate }));
vi.mock("../components/ui/PageBack", () => ({ PageBack: () => null }));
vi.mock("../features/player/PlayerProvider", () => ({ usePlayer: () => ({ auth: { user: null }, notify: mocks.notify }) }));
vi.mock("../services/playerApi", () => ({ PlayerApiError: class extends Error {}, playerApi: { getCouponShare: async () => ({ coupon: { name: "请喝一杯", description: "朋友的权益", sourceLabel: "手动签发", issuerNickname: "甲", remainingClaims: 1 } }), claimCoupon: mocks.claim } }));
vi.mock("../features/player/AuthSheet", () => ({ AuthSheet: ({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) => open ? createElement("button", { onClick: () => { onClose(); onSuccess(); } }, "模拟登录完成") : null }));

it("continues claiming once after authentication closes its sheet", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const host = document.createElement("div");
  const root = createRoot(host);
  try {
    await act(async () => root.render(createElement(CouponClaimPage)));
    const findButton = (text: string) => Array.from(host.querySelectorAll("button")).find(item => item.textContent?.includes(text))!;
    await act(async () => findButton("登录后领取").click());
    expect(mocks.claim).not.toHaveBeenCalled();
    await act(async () => findButton("模拟登录完成").click());
    expect(mocks.claim).toHaveBeenCalledExactlyOnceWith("claim-token");
    expect(mocks.navigate).toHaveBeenCalledWith("/benefits");
  } finally {
    await act(async () => root.unmount());
    vi.unstubAllGlobals();
  }
});
