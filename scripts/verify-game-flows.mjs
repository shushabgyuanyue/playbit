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
await call("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
const evaluate = async (expression) => (await call("Runtime.evaluate", {
  expression,
  returnByValue: true,
  awaitPromise: true
})).result.result.value;
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const body = () => evaluate("document.body.innerText");
const click = async (selector) => evaluate(`(() => { const node = document.querySelector(${JSON.stringify(selector)}); if (!node) return false; node.click(); return true; })()`);
const clickText = async (text) => evaluate(`(() => { const node = [...document.querySelectorAll('button')].find((item) => item.textContent?.includes(${JSON.stringify(text)})); if (!node) return false; node.click(); return true; })()`);
const clickFeaturedCard = async (title) => evaluate(`(() => { const node = [...document.querySelectorAll('.home-game-card')].find((item) => item.querySelector('strong')?.textContent?.includes(${JSON.stringify(title)})); if (!node) return false; node.click(); return true; })()`);
const screenshot = async (name) => {
  const data = (await call("Page.captureScreenshot", { format: "png" })).result.data;
  fs.mkdirSync("artifacts/verification", { recursive: true });
  fs.writeFileSync(`artifacts/verification/${name}.png`, Buffer.from(data, "base64"));
};
const assertBody = async (label, expected) => {
  const text = await body();
  for (const value of expected) {
    if (!text.includes(value)) throw new Error(`${label}: missing ${value}; body=${text.slice(-1600)}`);
  }
};

async function openDraw() {
  await call("Page.navigate", { url: "http://localhost:5173/" });
  await wait(850);
  if (!await clickText("开一把")) throw new Error("Home draw entry is missing");
  await wait(850);
  await assertBody("play screen", ["怎么玩", "添个彩头", "记分牌"]);
}

async function runVersus() {
  await call("Page.navigate", { url: "http://localhost:5173/" });
  await wait(1300);
  if (!await clickFeaturedCard("只许答错")) throw new Error("Featured versus card is missing");
  await wait(500);
  await assertBody("versus card", ["添个彩头", "记分牌"]);
  if (!await clickText("添个彩头")) throw new Error("Versus stake action is missing");
  await wait(150);
  await assertBody("versus stake", ["发起结算", "开具比赛证书"]);
  const resultActions = await evaluate("[...document.querySelectorAll('button')].map((item) => item.textContent?.trim()).filter(Boolean)");
  await screenshot("game-versus-result");
  return resultActions;
}

async function runRanking() {
  await openDraw();
  await assertBody("ranking card", ["记分牌"]);
  if (!await clickText("记分牌")) throw new Error("Scoreboard bottom action did not open");
  await wait(150);
  const increment = await evaluate("document.querySelectorAll('.game-score-icon').length > 0");
  if (!increment) throw new Error("Scoreboard increment control is missing");
  if (!await click(".game-score-add")) throw new Error("Adding a third player is missing");
  await wait(100);
  const playerCount = await evaluate("document.querySelectorAll('.game-score-row').length");
  if (playerCount !== 3) throw new Error(`Expected 3 players, got ${playerCount}`);
  await evaluate("document.querySelectorAll('.game-score-row')[0].querySelectorAll('.game-score-icon')[1].click()");
  await evaluate("document.querySelectorAll('.game-score-row')[1].querySelectorAll('.game-score-icon')[1].click()");
  await evaluate("document.querySelector('.game-scoreboard-close')?.click()");
  await clickText("添个彩头");
  await wait(100);
  await assertBody("ranking stake", ["发起结算", "开具比赛证书"]);
  await screenshot("game-ranking-result");
}

const versusButtons = await runVersus();
await runRanking();

console.log(JSON.stringify({
  versusResultButtons: versusButtons,
  certificateEntryPresent: versusButtons.some((label) => label?.includes("证书")),
  settlementEntryPresent: versusButtons.some((label) => label?.includes("结算") || label?.includes("权益"))
}, null, 2));
await call("Emulation.clearDeviceMetricsOverride");
socket.close();
