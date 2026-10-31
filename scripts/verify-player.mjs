import fs from "node:fs";
import WebSocket from "../node_modules/.pnpm/ws@8.22.0/node_modules/ws/index.js";

const baseUrl = process.env.PLAYER_URL ?? "http://127.0.0.1:5174";
const cdpUrl = process.env.PLAYER_CDP_URL ?? "http://127.0.0.1:9224";
const tabs = await (await fetch(`${cdpUrl}/json/list`)).json();
const tab = tabs.find(item => item.type === "page" && item.url.includes(new URL(baseUrl).port));
if (!tab) throw new Error(`No React player page is available for ${baseUrl}`);

const socket = new WebSocket(tab.webSocketDebuggerUrl);
let sequence = 0;
const pending = new Map();
socket.on("message", raw => {
  const message = JSON.parse(raw);
  if (message.id && pending.has(message.id)) {
    pending.get(message.id)(message);
    pending.delete(message.id);
  }
});
await new Promise((resolve, reject) => {
  socket.once("open", resolve);
  socket.once("error", reject);
});

const call = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++sequence;
  pending.set(id, message => message.error ? reject(new Error(JSON.stringify(message.error))) : resolve(message));
  socket.send(JSON.stringify({ id, method, params }));
});
const evaluate = async expression => (await call("Runtime.evaluate", {
  expression,
  returnByValue: true,
  awaitPromise: true
})).result.result.value;
const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
const navigate = async path => {
  await call("Page.navigate", { url: `${baseUrl}${path}` });
  await wait(800);
};
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

await call("Emulation.setDeviceMetricsOverride", {
  width: 390,
  height: 844,
  deviceScaleFactor: 1,
  mobile: true
});
await evaluate("localStorage.removeItem('playbit:player:prototype:v1'); sessionStorage.clear();");
await navigate("/");
assert(await evaluate("document.body.innerText.includes('翻开开始') && document.body.innerText.includes('添个彩头')"), "Player home is missing its primary actions");
assert(await evaluate("Boolean(document.querySelector('.game-card')) && Boolean(document.querySelector('.card-stage'))"), "Player home did not render a game card");
assert(await evaluate("document.documentElement.scrollWidth <= window.innerWidth"), "Player home has horizontal overflow");

await navigate("/promise");
assert(await evaluate("document.body.innerText.includes('建立一份')"), "Promise page did not load");
assert(await evaluate("document.documentElement.scrollWidth <= window.innerWidth"), "Promise page has horizontal overflow");

await navigate("/benefits");
assert(await evaluate("document.body.innerText.includes('赢来的')"), "Benefits page did not load");
assert(await evaluate("document.documentElement.scrollWidth <= window.innerWidth"), "Benefits page has horizontal overflow");

await navigate("/me");
assert(await evaluate("document.body.innerText.includes('我的场景卡组')"), "Profile page did not load");
assert(await evaluate("document.documentElement.scrollWidth <= window.innerWidth"), "Profile page has horizontal overflow");

fs.mkdirSync("artifacts", { recursive: true });
const screenshot = (await call("Page.captureScreenshot", { format: "png" })).result.data;
fs.writeFileSync("artifacts/player-profile-mobile-verified.png", Buffer.from(screenshot, "base64"));
console.log("player browser smoke verification passed");
socket.close();
