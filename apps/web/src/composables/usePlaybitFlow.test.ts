// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp, nextTick, type App } from "vue";
import { createAgreement, recordAgreementResult as settleAgreement, signCounterparty } from "@playbit/game-core";
import type { Agreement, CreateAgreementInput, User } from "@playbit/shared";
import { copy } from "@playbit/content";
import { api, ApiRequestError } from "../services/api";
import { usePlaybitFlow } from "./usePlaybitFlow";

vi.mock("vant", () => ({ showToast: vi.fn(), showConfirmDialog: vi.fn().mockResolvedValue(undefined) }));
import { showToast } from "vant";

const user: User = { id: "owner", nickname: "Owner", email: "owner@example.com", createdAt: "2026-09-27", signatureDataUrl: null, avatarDataUrl: null };
const friend: User = { ...user, id: "friend", nickname: "Friend" };
const input: CreateAgreementInput = { source: "custom", title: "First to laugh", challenge: "First to laugh",
  creatorSignatureDataUrl: "data:image/png;base64,test", stake: { type: "coupon", label: "Tea", fulfilled: false, additions: [] } };
const draft = () => createAgreement(input, user.id);
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((ok, fail) => { resolve = ok; reject = fail; });
  return { promise, resolve, reject };
}
async function flush() { for (let index = 0; index < 20; index++) await Promise.resolve(); await nextTick(); }
let mounted: App | undefined;
let flow: ReturnType<typeof usePlaybitFlow>;
async function mount() {
  const node = document.createElement("div"); document.body.append(node);
  mounted = createApp({ setup() { flow = usePlaybitFlow(); return () => null; } });
  mounted.mount(node); await flush(); return flow;
}

beforeEach(() => {
  window.history.replaceState(null, "", "/");
  vi.spyOn(api, "getAuthToken").mockReturnValue(null);
  vi.spyOn(api, "clearAuthToken").mockImplementation(() => {});
  vi.spyOn(api, "me").mockResolvedValue({ user });
  vi.spyOn(api, "listAgreements").mockResolvedValue({ agreements: [] });
  vi.spyOn(api, "listCoupons").mockResolvedValue({ coupons: [] });
  vi.spyOn(api, "listGrace").mockResolvedValue({ tickets: [], waivers: [] });
  vi.spyOn(api, "syncAgreement").mockRejectedValue(new Error("offline"));
  vi.spyOn(api, "subscribeAgreementEvents").mockReturnValue(() => {});
  vi.spyOn(api, "createAgreement").mockResolvedValue({ agreement: draft() });
  vi.spyOn(api, "signShare").mockRejectedValue(new Error("unexpected signature"));
  vi.spyOn(api, "login").mockResolvedValue({ user: friend, token: "token" });
});
afterEach(() => { mounted?.unmount(); document.body.innerHTML = ""; vi.restoreAllMocks(); vi.clearAllMocks(); });

describe("contract flow recovery", () => {
  it("never offers deletion of settled agreements before or after redemption", async () => {
    await mount(); flow.currentUser.value = user;
    const remove = vi.spyOn(api, "deleteAgreement").mockResolvedValue(undefined);
    for (const status of ["result_recorded", "fulfilled", "waived"] as const) {
      await flow.deleteAgreement({ ...draft(), status });
    }
    expect(remove).not.toHaveBeenCalled();
  });

  it("keeps saved login credentials when the identity service is temporarily offline", async () => {
    vi.mocked(api.getAuthToken).mockReturnValue("saved-token");
    vi.mocked(api.me).mockRejectedValue(new Error("offline"));
    await mount();
    expect(api.clearAuthToken).not.toHaveBeenCalled();
    expect(flow.agreementsError.value).toBeTruthy();
  });

  it("locks before identity awaits and reuses the creation identity after a lost response", async () => {
    await mount(); flow.currentUser.value = user; flow.openCreate();
    const saved = draft(); const first = deferred<{ agreement: Agreement }>();
    vi.mocked(api.createAgreement).mockReturnValueOnce(first.promise).mockResolvedValue({ agreement: saved });
    const submitting = flow.createAgreement(input); const duplicate = flow.createAgreement(input);
    await flush(); expect(api.createAgreement).toHaveBeenCalledTimes(1);
    first.reject(new Error("lost response")); await submitting; await duplicate;
    await flow.createAgreement(input);
    const calls = vi.mocked(api.createAgreement).mock.calls;
    expect(calls[0][1]).toBe(calls[1][1]);
    expect(flow.activeAgreement.value?.id).toBe(saved.id);
    flow.openCreate(); await flow.createAgreement(input);
    expect(vi.mocked(api.createAgreement).mock.calls[2][1]).not.toBe(calls[0][1]);
  });

  it("returns an unsigned document to editing with its reviewed revision, but never edits a signed document", async () => {
    await mount(); flow.currentUser.value = user; flow.openCreate();
    const saved = draft(); vi.mocked(api.createAgreement).mockResolvedValue({ agreement: saved });
    await flow.createAgreement(input); flow.returnFromContract();
    expect(flow.screen.value).toBe("create");
    expect(flow.createDraft.title).toBe(saved.title);
    const update = vi.spyOn(api, "updateAgreement").mockResolvedValue({ agreement: { ...saved, revision: 2 } });
    await flow.createAgreement({ ...input, title: "Edited" });
    expect(update).toHaveBeenCalledWith(saved.id, expect.anything(), 1);
    flow.agreements.value = [signCounterparty(saved, friend.nickname, friend.id, "signature")];
    flow.returnFromContract(); expect(flow.screen.value).toBe("home");
  });

  it.each([false, true])("resumes guest signing only when the reviewed terms are unchanged (changed=%s)", async changed => {
    const saved = draft();
    window.history.replaceState(null, "", `/?share=${saved.shareCode}`);
    const getShare = vi.spyOn(api, "getShare").mockResolvedValue({ agreement: saved });
    await mount();
    await flow.signSession({ signatureDataUrl: "signature", revision: saved.revision });
    expect(flow.authOpen.value).toBe(true);
    getShare.mockResolvedValue({ agreement: changed ? { ...saved, revision: 2, title: "New terms" } : saved });
    vi.mocked(api.signShare).mockResolvedValue({ agreement: signCounterparty(saved, friend.nickname, friend.id, "signature") });
    await flow.loginAccount({ email: "friend@example.com", password: "password123" });
    expect(api.signShare).toHaveBeenCalledTimes(changed ? 0 : 1);
    expect(flow.screen.value).toBe(changed ? "sign" : "contract");
    if (changed) expect(showToast).toHaveBeenCalledWith(copy.contract.changedReview);
  });

  it("offers login when reopening an already-signed private invitation", async () => {
    window.history.replaceState(null, "", "/?share=private");
    vi.spyOn(api, "getShare").mockRejectedValue(new ApiRequestError("Forbidden", 403));
    await mount(); expect(flow.authOpen.value).toBe(true);
    expect(flow.screen.value).toBe("sign");
  });

  it("does not reopen a signed document after logout during asset loading", async () => {
    const saved = draft();
    window.history.replaceState(null, "", `/?share=${saved.shareCode}`);
    vi.spyOn(api, "getShare").mockResolvedValue({ agreement: saved });
    await mount(); flow.currentUser.value = friend;
    vi.mocked(api.signShare).mockResolvedValue({ agreement: signCounterparty(saved, friend.nickname, friend.id, "signature") });
    const assets = deferred<{ coupons: [] }>();
    vi.mocked(api.listCoupons).mockReturnValue(assets.promise);
    const signing = flow.signSession({ signatureDataUrl: "signature", revision: saved.revision });
    await flush(); expect(api.listCoupons).toHaveBeenCalled();
    flow.logoutAccount(); assets.resolve({ coupons: [] }); await signing;
    expect(flow.screen.value).toBe("home");
    expect(flow.currentUser.value).toBeNull();
    expect(flow.agreements.value).toEqual([]);
  });

  it("ignores an old sync response after opening another agreement", async () => {
    await mount(); flow.currentUser.value = user;
    const first = draft(); const second = draft();
    flow.agreements.value = [first, second]; flow.openAgreement(first);
    const response = deferred<{ agreement: Agreement }>();
    vi.mocked(api.syncAgreement).mockReturnValue(response.promise);
    const refresh = flow.refreshActiveAgreement(); await flush();
    flow.openAgreement(second); await flush();
    response.resolve({ agreement: { ...first, revision: 2 } }); await refresh; await flush();
    expect(flow.activeAgreement.value?.id).toBe(second.id);
  });

  it("does not restore another account's list when a late response arrives after logout", async () => {
    await mount(); flow.currentUser.value = user;
    const response = deferred<{ agreements: Agreement[] }>();
    vi.mocked(api.listAgreements).mockReturnValue(response.promise);
    const refresh = flow.refreshAgreements(); await flush(); flow.logoutAccount();
    response.resolve({ agreements: [draft()] }); await refresh;
    expect(flow.agreements.value).toEqual([]);
    expect(flow.currentUser.value).toBeNull();
  });

  it("keeps the latest local revision when a stale summary finishes loading", async () => {
    await mount(); flow.currentUser.value = user;
    const saved = draft(); flow.agreements.value = [{ ...saved, revision: 3, title: "Latest" }];
    vi.mocked(api.listAgreements).mockResolvedValue({ agreements: [saved] });
    await flow.refreshAgreements(); expect(flow.agreements.value[0].title).toBe("Latest");
  });

  it("keeps a newly-created agreement when an older list response arrives", async () => {
    await mount(); flow.currentUser.value = user;
    const response = deferred<{ agreements: Agreement[] }>();
    vi.mocked(api.listAgreements).mockReturnValue(response.promise);
    const refresh = flow.refreshAgreements(); await flush();
    const saved = draft(); flow.agreements.value = [saved];
    response.resolve({ agreements: [] }); await refresh;
    expect(flow.agreements.value[0].id).toBe(saved.id);
  });

  it("removes a remotely-deleted agreement and does not resurrect it from a stale list", async () => {
    await mount(); flow.currentUser.value = user;
    const saved = draft(); flow.agreements.value = [saved]; flow.openAgreement(saved); await flush();
    const response = deferred<{ agreements: Agreement[] }>();
    vi.mocked(api.listAgreements).mockReturnValue(response.promise);
    const refresh = flow.refreshAgreements(); await flush();
    const onEvent = vi.mocked(api.subscribeAgreementEvents).mock.calls.at(-1)![1];
    onEvent({ type: "agreement.deleted", agreementId: saved.id });
    response.resolve({ agreements: [saved] }); await refresh; await flush();
    expect(flow.screen.value).toBe("home"); expect(flow.agreements.value).toEqual([]);
  });

  it("continues to settlement when a lost result response is recovered by sync", async () => {
    await mount(); flow.currentUser.value = user;
    const active = signCounterparty(draft(), friend.nickname, friend.id, "signature");
    flow.agreements.value = [active]; flow.openAgreement(active); await flush();
    const winnerId = active.participants[0].id;
    vi.spyOn(api, "recordAgreementResult").mockRejectedValue(new Error("response lost"));
    vi.mocked(api.syncAgreement).mockResolvedValue({ agreement: { ...active, status: "result_recorded", winnerId,
      loserId: active.participants[1].id, revision: 2, resultRecorderUserId: user.id } });
    await flow.recordAgreementResult(winnerId);
    expect(flow.screen.value).toBe("settlement"); expect(api.recordAgreementResult).toHaveBeenCalledTimes(1);
  });

  it("does not subscribe or sync a settled agreement", async () => {
    await mount();
    vi.useFakeTimers();
    flow.currentUser.value = user;
    const signed = signCounterparty(draft(), friend.nickname, friend.id, "signature");
    const winnerId = signed.participants[0].id;
    const settled = settleAgreement(signed, winnerId, user.id);
    vi.mocked(api.subscribeAgreementEvents).mockImplementation((_id, _onEvent, onError) => {
      onError?.();
      return () => undefined;
    });
    vi.mocked(api.syncAgreement).mockRejectedValue(new Error("offline"));

    flow.agreements.value = [settled];
    flow.openAgreement(settled);
    await flush();
    expect(api.subscribeAgreementEvents).not.toHaveBeenCalled();
    expect(api.syncAgreement).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(30_000);
    await flush();
    expect(api.subscribeAgreementEvents).not.toHaveBeenCalled();
    expect(api.syncAgreement).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});
