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
await call("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
const evaluate = async (expression) => (await call("Runtime.evaluate", {
  expression,
  returnByValue: true,
  awaitPromise: true
})).result.result.value;
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const body = () => evaluate("document.body.innerText");
const clickText = async (text) => evaluate(`(() => { const node = [...document.querySelectorAll('button')].find((item) => item.textContent?.includes(${JSON.stringify(text)})); if (!node) return false; node.click(); return true; })()`);
const screenshot = async (name) => {
  fs.mkdirSync("artifacts/verification", { recursive: true });
  const data = (await call("Page.captureScreenshot", { format: "png" })).result.data;
  fs.writeFileSync(`artifacts/verification/${name}.png`, Buffer.from(data, "base64"));
};
const assertBody = async (label, values) => {
  const text = await body();
  for (const value of values) if (!text.includes(value)) throw new Error(`${label}: missing ${value}; body=${text.slice(-1500)}`);
};

await call("Page.navigate", { url: "http://localhost:5173/" });
await wait(900);
if (!await clickText("开一把")) throw new Error("Home draw entry is missing");
await wait(900);
await assertBody("playing screen", ["怎么玩", "添个彩头", "记分牌"]);
const initialBody = await body();
if (initialBody.includes("规则在卡上") || initialBody.includes("记录结果")) throw new Error("Old explanatory/result copy is still rendered");
if (await evaluate("Boolean(document.querySelector('.standalone-scoreboard-action'))")) throw new Error("Scoreboard is still mounted in the top navigation");
if (await evaluate("Boolean(document.querySelector('.standalone-finish-action'))")) throw new Error("Old heavy result action is still rendered");
const cardStageState = await evaluate("({ stage: Boolean(document.querySelector('.game-card-stage')), stack: Boolean(document.querySelector('.game-card-stack')), stackLayers: document.querySelectorAll('.game-card-stack-card').length, reverse: Boolean(document.querySelector('.game-card-reverse')), topTools: Boolean(document.querySelector('.game-card-top-actions .game-card-tool-actions')) })");
if (!cardStageState.stage || !cardStageState.stack || !cardStageState.reverse) throw new Error(`Card draw stage is incomplete: ${JSON.stringify(cardStageState)}`);
if (cardStageState.stackLayers !== 3) throw new Error(`Card stack should have three restrained back layers: ${JSON.stringify(cardStageState)}`);
await screenshot("standalone-playing-current");

if (!await clickText("记分牌")) throw new Error("Scoreboard bottom action is missing");
await wait(120);
if (!await evaluate("Boolean(document.querySelector('.game-scoreboard-dialog'))")) throw new Error("Scoreboard dialog did not open");
await evaluate("document.querySelector('.game-score-icon:nth-of-type(2)')?.click()");
await screenshot("standalone-scoreboard-current");
await evaluate("document.querySelector('.game-scoreboard-close')?.click()");

await clickText("添个彩头");
await wait(120);
await assertBody("stake panel", ["彩头由现场自行约定", "发起结算", "开具比赛证书"]);
if (!await evaluate("Boolean(document.querySelector('.standalone-stake-overlay'))")) throw new Error("Stake flow should open as a modal overlay");
if (await evaluate("Boolean(document.querySelector('.standalone-stake-panel'))")) throw new Error("Legacy inline stake panel is still rendered");
await screenshot("standalone-stake-current");

await clickText("开具比赛证书");
await wait(500);
await assertBody("certificate dialog", ["比赛证书", "保存证书", "分享证书"]);
const certificateState = await evaluate("({ width: document.querySelector('.standalone-certificate-canvas')?.width, height: document.querySelector('.standalone-certificate-canvas')?.height, nonBlank: (() => { const c = document.querySelector('.standalone-certificate-canvas'); if (!c || !c.width) return false; return [...c.getContext('2d').getImageData(10, 10, 1, 1).data].some((value) => value > 0); })() })");
if (certificateState.width !== 1122 || certificateState.height !== 1402 || !certificateState.nonBlank) throw new Error(`Certificate canvas is not rendered: ${JSON.stringify(certificateState)}`);
await screenshot("standalone-certificate-current");
await evaluate("document.querySelector('.standalone-certificate-close')?.click()");
await wait(100);

await clickText("记分牌");
await wait(100);
await evaluate("document.querySelector('.game-scoreboard-clear')?.click()");
await evaluate("document.querySelector('.game-scoreboard-close')?.click()");
await clickText("添个彩头");
await clickText("开具比赛证书");
await wait(180);
if (!await evaluate("Boolean(document.querySelector('.standalone-certificate-input input'))")) throw new Error("Zero-score certificate does not allow a custom champion");
await evaluate("(() => { const input = document.querySelector('.standalone-certificate-input input'); const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; setter.call(input, '现场冠军'); input.dispatchEvent(new Event('input', { bubbles: true })); })()");
await wait(180);
const zeroCertificateState = await evaluate("({ width: document.querySelector('.standalone-certificate-canvas')?.width, nonBlank: (() => { const c = document.querySelector('.standalone-certificate-canvas'); if (!c || !c.width) return false; return [...c.getContext('2d').getImageData(10, 10, 1, 1).data].some((value) => value > 0); })() })");
if (zeroCertificateState.width !== 1122 || !zeroCertificateState.nonBlank) throw new Error(`Custom champion certificate is not rendered: ${JSON.stringify(zeroCertificateState)}`);
await screenshot("standalone-certificate-custom-current");
await evaluate("document.querySelector('.standalone-certificate-close')?.click()");
await wait(100);

await clickText("添个彩头");
await clickText("发起结算");
await wait(500);
const createText = await body();
if (!createText.includes("创建") && !createText.includes("约定")) throw new Error(`Settlement entry did not open create flow: ${createText.slice(-900)}`);
await screenshot("standalone-settlement-entry-current");

console.log(JSON.stringify({
  bottomActions: ["添个彩头", "记分牌"],
  cardStage: cardStageState,
  certificate: certificateState,
  settlementEntry: "create"
}, null, 2));
await call("Emulation.clearDeviceMetricsOverride");
socket.close();
