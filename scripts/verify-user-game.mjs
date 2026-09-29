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
await call("Emulation.setDeviceMetricsOverride", {
  width: 390,
  height: 844,
  deviceScaleFactor: 1,
  mobile: true
});
const evaluate = async (expression) => (await call("Runtime.evaluate", {
  expression,
  returnByValue: true,
  awaitPromise: true
})).result.result.value;
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const clickButton = async (label) => evaluate(`(() => {
  const button = [...document.querySelectorAll("button")].find((item) => item.textContent?.includes(${JSON.stringify(label)}));
  if (!button) return false;
  button.click();
  return true;
})()`);
const saveScreenshot = async (path) => {
  const screenshot = (await call("Page.captureScreenshot", { format: "png" })).result.data;
  fs.writeFileSync(path, Buffer.from(screenshot, "base64"));
};

await call("Page.navigate", { url: "http://localhost:5173/" });
await wait(900);
const homeText = await evaluate("document.body.innerText");
if (!homeText.includes("开一把") || !homeText.includes("热门游戏卡")) {
  throw new Error(`Home content is incomplete: ${homeText.slice(0, 800)}`);
}
if (!await evaluate("document.documentElement.scrollWidth <= window.innerWidth")) {
  throw new Error("Home page has horizontal overflow on the mobile viewport");
}
await saveScreenshot("artifacts/verification/game-home-current.png");

if (!await clickButton("开一把")) throw new Error("The home draw entry is missing");
await wait(900);
const gameText = await evaluate("document.body.innerText");
if (!gameText.includes("玩法") || !gameText.includes("工具")) {
  throw new Error(`Game screen content is incomplete: ${gameText.slice(0, 1200)}`);
}
if (!await evaluate("document.documentElement.scrollWidth <= window.innerWidth")) {
  throw new Error("Game page has horizontal overflow on the mobile viewport");
}
await saveScreenshot("artifacts/verification/game-playing-current.png");

const toolLabel = (await evaluate("[...document.querySelectorAll('button')].map((item) => item.textContent?.trim()).filter(Boolean).find((label) => ['计时器', '计数器', '记分牌'].includes(label))"));
if (!toolLabel || !await clickButton(toolLabel)) throw new Error("The reusable game tool entry is missing");
await wait(250);
const toolText = await evaluate("document.body.innerText");
if (!toolText.includes(toolLabel)) throw new Error("The selected game tool did not open");
await saveScreenshot("artifacts/verification/game-tool-current.png");

const resultButton = (await evaluate("[...document.querySelectorAll('button')].map((item) => item.textContent?.trim()).filter(Boolean).find((label) => ['记录结果', '记录胜者', '记录排名', '记录完成'].includes(label))"));
if (!resultButton || !await clickButton(resultButton)) throw new Error("The result action is missing");
await wait(500);
const resultChoice = (await evaluate("[...document.querySelectorAll('button')].map((item) => item.textContent?.trim()).filter(Boolean).find((label) => ['玩家 A', '本局完成', '生成结果', '平局'].includes(label))"));
if (!resultChoice || !await clickButton(resultChoice)) throw new Error("The result choice is missing");
await wait(500);
const resultText = await evaluate("document.body.innerText");
if (!resultText.includes("本局完成") && !resultText.includes("结果已记录") && !resultText.includes("胜者")) {
  throw new Error(`Result screen content is incomplete: ${resultText.slice(-1200)}`);
}
await saveScreenshot("artifacts/verification/game-result-current.png");

console.log("User game browser flow passed: home, playable card, reusable tool and result.");
await call("Emulation.clearDeviceMetricsOverride");
socket.close();
