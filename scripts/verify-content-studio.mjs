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

await new Promise((resolve, reject) => {
  socket.once("open", resolve);
  socket.once("error", reject);
});
await call("Page.navigate", { url: "http://localhost:5173/studio" });
await new Promise((resolve) => setTimeout(resolve, 900));
const evaluate = (expression) => call("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
const code = `test_browser_play_${Date.now()}`;
await evaluate("[...document.querySelectorAll('button')].find((button) => button.textContent.includes('内容库')).click()");
await new Promise((resolve) => setTimeout(resolve, 300));
await evaluate("[...document.querySelectorAll('button')].find((button) => button.textContent.includes('新建玩法')).click()");
await new Promise((resolve) => setTimeout(resolve, 300));
await evaluate(`(() => {
  const set = (element, value) => {
    const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, "value").set.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
  };
  const inputs = [...document.querySelectorAll(".studio-create-form input")];
  const areas = [...document.querySelectorAll(".studio-create-form textarea")];
  set(inputs[0], "${code}");
  set(inputs[1], "浏览器测试玩法");
  set(inputs[2], "反向接话");
  set(inputs[3], "越认真越容易接错");
  set(areas[0], "轮流接住上一句反话，不能直接重复关键词。");
  set(areas[1], "连续完成三轮。");
  document.querySelector(".studio-create-form").requestSubmit();
  return "submitted";
})()`);
await new Promise((resolve) => setTimeout(resolve, 1200));
await evaluate("[...document.querySelectorAll('button')].find((button) => button.textContent.includes('卡片实验室')).click()");
await new Promise((resolve) => setTimeout(resolve, 400));
const body = (await evaluate("document.body.innerText")).result.result.value;
if (!body.includes("卡片实验室")) {
  throw new Error(`Studio authoring did not reach the card lab: ${body.slice(-1400)}`);
}
console.log("Studio browser authoring passed.");
const screenshot = (await call("Page.captureScreenshot", { format: "png" })).result.data;
fs.writeFileSync(new URL("../artifacts/verification/studio-after-create.png", import.meta.url), Buffer.from(screenshot, "base64"));
socket.close();
