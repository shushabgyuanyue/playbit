import fs from "node:fs";
import WebSocket from "../node_modules/.pnpm/ws@8.22.0/node_modules/ws/index.js";

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
await new Promise((resolve, reject) => { socket.once("open", resolve); socket.once("error", reject); });
await call("Page.navigate", { url: "http://localhost:5173/studio" });
await new Promise((resolve) => setTimeout(resolve, 900));
const evaluate = (expression) => call("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
await evaluate("[...document.querySelectorAll('button')].find((button) => button.textContent.includes('内容库')).click()");
await new Promise((resolve) => setTimeout(resolve, 500));
const body = (await evaluate("document.body.innerText")).result.result.value;
if (!body.includes("用户会看到的游戏卡") || !body.includes("每页 10 条")) throw new Error("Content library pagination view is missing");
const labels = (await evaluate("[...document.querySelectorAll('button')].map((button) => button.textContent)"));
if (labels.result.result.value.some((text) => text.includes("新建玩法"))) throw new Error("Content library still exposes the create entry");
await evaluate("document.querySelector('.studio-table-wrap tbody tr')?.click()");
await new Promise((resolve) => setTimeout(resolve, 300));
const labBody = (await evaluate("document.body.innerText")).result.result.value;
if (!labBody.includes("PLAYABLE CARD LAB")) throw new Error("Content row did not open the card lab");
if (!labBody.includes("L0 · 核心机制") || !labBody.includes("L1 · 玩法骨架") || !labBody.includes("L2 · 具体内容")) throw new Error("Lab relationship context is missing");
if (labBody.includes("审核与试玩")) throw new Error("Review queue still exists as a separate navigation");
await evaluate("[...document.querySelectorAll('button')].find((button) => button.textContent.includes('内容库')).click()");
await new Promise((resolve) => setTimeout(resolve, 300));
const libraryScreenshot = (await call("Page.captureScreenshot", { format: "png" })).result.data;
fs.writeFileSync(new URL("../artifacts/verification/studio-content-library.png", import.meta.url), Buffer.from(libraryScreenshot, "base64"));
await evaluate("document.querySelector('.studio-row-action[title=\"查看卡片分析\"]')?.click()");
await new Promise((resolve) => setTimeout(resolve, 500));
const analyticsBody = (await evaluate("document.body.innerText")).result.result.value;
if (!analyticsBody.includes("DISTRIBUTION & ANALYTICS") || !analyticsBody.includes("从展示到完成") || !analyticsBody.includes("卡片热榜") || !analyticsBody.includes("用户分群")) throw new Error("Analytics dashboard sections are missing");
const selectedWindow = await evaluate("document.querySelector('.studio-analytics-window select')?.value");
if (selectedWindow.result.result.value !== "all") throw new Error("Analytics default window is not all");
await evaluate("const select = document.querySelector('.studio-analytics-window select'); select.value = '7d'; select.dispatchEvent(new Event('change', { bubbles: true }))");
await new Promise((resolve) => setTimeout(resolve, 500));
const changedWindow = await evaluate("document.querySelector('.studio-analytics-window select')?.value");
if (changedWindow.result.result.value !== "7d") throw new Error("Analytics window did not change");
const screenshot = (await call("Page.captureScreenshot", { format: "png" })).result.data;
fs.writeFileSync(new URL("../artifacts/verification/studio-analytics-dashboard.png", import.meta.url), Buffer.from(screenshot, "base64"));
await evaluate("window.scrollTo(0, 720)");
await new Promise((resolve) => setTimeout(resolve, 200));
const lowerScreenshot = (await call("Page.captureScreenshot", { format: "png" })).result.data;
fs.writeFileSync(new URL("../artifacts/verification/studio-analytics-dashboard-lower.png", import.meta.url), Buffer.from(lowerScreenshot, "base64"));
console.log("Studio content and analytics passed: filtered card list, lab navigation, card drill-down, time window and dashboard sections.");
socket.close();
