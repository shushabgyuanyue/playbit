import fs from "node:fs";
import { randomUUID } from "node:crypto";
import WebSocket from "../node_modules/.pnpm/ws@8.22.0/node_modules/ws/index.js";

const apiBase = "http://localhost:8787";
const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
const json = async (path, init = {}) => {
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${init.method ?? "GET"} ${path} ${response.status}: ${JSON.stringify(payload)}`);
  return payload;
};
const register = (nickname, email) => json("/auth/register", {
  method: "POST",
  body: JSON.stringify({ nickname, email, password: "playbit-test-123" })
});

const owner = await register("主持人测试", `host_${suffix}@example.com`);
const friend = await register("参赛人测试", `friend_${suffix}@example.com`);
const auth = (token) => ({ Authorization: `Bearer ${token}` });
const created = await json("/agreements", {
  method: "POST",
  headers: auth(owner.token),
  body: JSON.stringify({
    requestId: randomUUID(),
    source: "custom",
    title: "浏览器证书回归局",
    challenge: "现场完成一轮游戏并登记结果",
    creatorSignatureDataUrl: "data:image/png;base64,host-signature",
    stake: { type: "coupon", label: "请喝一杯", fulfilled: false, additions: [] }
  })
});
const signed = await json(`/share/${created.agreement.shareCode}/sign`, {
  method: "POST",
  headers: auth(friend.token),
  body: JSON.stringify({ revision: created.agreement.revision, signatureDataUrl: "data:image/png;base64,friend-signature" })
});
const winnerId = signed.agreement.participants.find((participant) => participant.userId === friend.user.id).id;
const settled = await json(`/agreements/${signed.agreement.id}/result`, {
  method: "PATCH",
  headers: auth(owner.token),
  body: JSON.stringify({ winnerId })
});

const independent = await json("/coupons/independent", {
  method: "POST",
  headers: auth(owner.token),
  body: JSON.stringify({
    gameResultId: `local_result_${suffix}`,
    certificateId: null,
    name: "现场赢家请喝一杯",
    description: "由主持人发放的独立权益",
    transferNote: "",
    holderUserId: friend.user.id,
    holderNickname: friend.user.nickname
  })
});
const holderCoupons = await json("/coupons", { headers: auth(friend.token) });
const holderCoupon = holderCoupons.coupons.find((coupon) => coupon.id === independent.coupon.id);
if (!holderCoupon || holderCoupon.transferNote !== null || holderCoupon.gameResultId === null) {
  throw new Error("Independent equity was not listed with the expected optional fields");
}
const redeemed = await json(`/coupons/${independent.coupon.id}/use`, {
  method: "PATCH",
  headers: auth(friend.token)
});
if (redeemed.coupon.status !== "used") throw new Error("Independent equity did not redeem");

const tabs = await (await fetch("http://127.0.0.1:9222/json/list")).json();
const tab = tabs.find((item) => item.type === "page" && item.url.includes("5173"));
if (!tab) throw new Error("No Playbit page is available on CDP");
const socket = new WebSocket(tab.webSocketDebuggerUrl);
let sequence = 0;
const pending = new Map();
socket.on("message", (raw) => {
  const message = JSON.parse(raw);
  if (message.id && pending.has(message.id)) {
    pending.get(message.id)(message);
    pending.delete(message.id);
  }
});
const call = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++sequence;
  pending.set(id, (message) => message.error ? reject(new Error(JSON.stringify(message.error))) : resolve(message));
  socket.send(JSON.stringify({ id, method, params }));
});
await new Promise((resolve, reject) => {
  socket.once("open", resolve);
  socket.once("error", reject);
});
await call("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
const evaluate = async (expression) => (await call("Runtime.evaluate", {
  expression,
  returnByValue: true,
  awaitPromise: true
})).result.result.value;
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const screenshot = async (name) => {
  const data = (await call("Page.captureScreenshot", { format: "png" })).result.data;
  fs.mkdirSync("artifacts/verification", { recursive: true });
  fs.writeFileSync(`artifacts/verification/${name}.png`, Buffer.from(data, "base64"));
};

await evaluate(`localStorage.setItem("playbit.authToken", ${JSON.stringify(owner.token)});`);
await call("Page.navigate", { url: `http://localhost:5173/?share=${encodeURIComponent(created.agreement.shareCode)}` });
await wait(1800);
const settlementText = await evaluate("document.body.innerText");
if (!settlementText.includes("下载并分享") || !settlementText.includes("证书")) {
  throw new Error(`Settlement page is incomplete: ${settlementText.slice(-1800)}`);
}
await screenshot("agreement-settlement-before-share");
await evaluate("window.__playbitDownloads = []; const originalClick = HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click = function () { if (this.download) window.__playbitDownloads.push(this.download); return originalClick.call(this); };");
const shareButton = await evaluate("[...document.querySelectorAll('button')].find((item) => item.textContent?.includes('下载并分享'))");
if (!shareButton) throw new Error("Settlement certificate share button is missing");
await evaluate("[...document.querySelectorAll('button')].find((item) => item.textContent?.includes('下载并分享')).click()");
await wait(1200);
const downloads = await evaluate("window.__playbitDownloads ?? []");
if (!downloads.length) throw new Error("Certificate share fallback did not trigger a download");
const afterShareText = await evaluate("document.body.innerText");
if (afterShareText.includes("凭证生成失败")) throw new Error("Certificate sharing reported a generation failure after fallback");
await screenshot("agreement-settlement-after-share");

console.log(JSON.stringify({
  agreementStatus: settled.agreement.status,
  independentCouponStatus: redeemed.coupon.status,
  certificateFallbackDownloads: downloads
}, null, 2));
await call("Emulation.clearDeviceMetricsOverride");
socket.close();
