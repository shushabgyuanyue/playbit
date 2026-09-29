import fs from "node:fs";
import WebSocket from "../node_modules/.pnpm/ws@8.22.0/node_modules/ws/index.js";

const suffix = `${Date.now()}`;
const name = `审核回归玩法 ${suffix}`;
const title = `${name} 卡面`;
const code = `review_flow_${suffix}`;
const apiBase = "http://localhost:8787";
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
await call("Emulation.setDeviceMetricsOverride", { width: 1440, height: 960, deviceScaleFactor: 1, mobile: false });
const evaluate = async (expression) => (await call("Runtime.evaluate", {
  expression,
  returnByValue: true,
  awaitPromise: true
})).result.result.value;
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const body = () => evaluate("document.body.innerText");
const clickText = async (text, scope = "document") => evaluate(`(() => { const root = ${scope === "document" ? "document" : `document.querySelector(${JSON.stringify(scope)})`}; if (!root) return false; const node = [...root.querySelectorAll('button')].find((item) => item.textContent?.includes(${JSON.stringify(text)})); if (!node) return false; node.click(); return true; })()`);
const setValue = async (selector, value) => evaluate(`(() => { const element = document.querySelector(${JSON.stringify(selector)}); if (!element) return false; const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(prototype, "value").set.call(element, ${JSON.stringify(value)}); element.dispatchEvent(new Event("input", { bubbles: true })); return true; })()`);
const setFormValues = async (formSelector, inputValues, textareaValues) => evaluate(`(() => {
  const form = document.querySelector(${JSON.stringify(formSelector)});
  if (!form) return { ok: false, reason: "form" };
  const set = (element, value) => {
    const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, "value").set.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
  };
  const inputs = [...form.querySelectorAll("input")];
  const textareas = [...form.querySelectorAll("textarea")];
  if (inputs.length < ${inputValues.length} || textareas.length < ${textareaValues.length}) return { ok: false, reason: "fields", inputs: inputs.length, textareas: textareas.length };
  ${inputValues.map((value, index) => `set(inputs[${index}], ${JSON.stringify(value)});`).join("\n  ")}
  ${textareaValues.map((value, index) => `set(textareas[${index}], ${JSON.stringify(value)});`).join("\n  ")}
  return { ok: true };
})()`);
const setSelectValue = async (selector, value) => evaluate(`(() => { const element = document.querySelector(${JSON.stringify(selector)}); if (!element) return false; element.value = ${JSON.stringify(value)}; element.dispatchEvent(new Event("change", { bubbles: true })); return true; })()`);
const screenshot = async (fileName) => {
  const data = (await call("Page.captureScreenshot", { format: "png", captureBeyondViewport: true })).result.data;
  fs.mkdirSync("artifacts/verification", { recursive: true });
  fs.writeFileSync(`artifacts/verification/${fileName}.png`, Buffer.from(data, "base64"));
};
const assertBody = async (label, expected) => {
  const text = await body();
  for (const value of expected) if (!text.includes(value)) throw new Error(`${label}: missing ${value}; body=${text.slice(-1800)}`);
};

await call("Page.navigate", { url: "http://localhost:5173/studio" });
await wait(1100);
await assertBody("studio overview", ["总览", "内容池状态"]);
await screenshot("studio-overview-before-workflow");
if (!await clickText("内容库")) throw new Error("Content library navigation is missing");
await wait(200);
if (!await clickText("新建玩法")) throw new Error("New playable entry is missing");
await wait(150);

const formResult = await setFormValues(".studio-create-form", [
  code,
  name,
  title,
  "下一句话，接得住才算赢",
], [
  "轮流接住上一句，不能重复关键词；卡住或重复就结束。",
  "完成三轮，或有人卡住时记录现场结果。",
]);
if (!formResult?.ok) throw new Error(`Could not fill create form: ${JSON.stringify(formResult)}`);
if (!await setSelectValue(".studio-create-form select", "l0-constraint")) throw new Error("L0 mechanism selector is missing");
if (!await evaluate("document.querySelector('.studio-create-form')?.requestSubmit(), true")) throw new Error("Create form did not submit");
await wait(1000);
await assertBody("created draft", [title, "草稿", "卡片实验室"]);
await screenshot("studio-created-draft");

if (!await clickText("内容库")) throw new Error("Could not return to content library");
await wait(200);
const rowClicked = await evaluate(`(() => { const row = [...document.querySelectorAll('.studio-table-panel tbody tr')].find((item) => item.textContent?.includes(${JSON.stringify(title)})); if (!row) return false; row.click(); return true; })()`);
if (!rowClicked) throw new Error("Created draft is not selectable in the library");
if (!await clickText("卡片实验室")) throw new Error("Card lab navigation is missing");
await wait(200);

if (!await clickText("提交人工审核", ".studio-workflow-buttons")) throw new Error("L1 submit action is missing");
await wait(250);
if (!await clickText("提交 L2", ".studio-l2-workflow")) throw new Error("L2 submit action is missing");
await wait(250);
await assertBody("pending review", ["待人工审核"]);
if (!await clickText("审核与试玩")) throw new Error("Review queue navigation is missing");
await wait(200);
await assertBody("review queue", [title, "待人工审核"]);
if (!await clickText("卡片实验室")) throw new Error("Could not return to card lab from review queue");
await wait(200);

if (!await clickText("审核通过", ".studio-workflow-buttons")) throw new Error("L1 approve action is missing");
await wait(250);
if (!await clickText("通过 L2", ".studio-l2-workflow")) throw new Error("L2 approve action is missing");
await wait(250);
await assertBody("approved", ["已通过"]);

if (!await clickText("发布版本", ".studio-workflow-buttons")) throw new Error("L1 publish action is missing");
await wait(250);
if (!await clickText("发布 L2", ".studio-l2-workflow")) throw new Error("L2 publish action is missing");
await wait(400);
await assertBody("published", ["已发布"]);
await screenshot("studio-published-workflow");

const listResponse = await fetch(`${apiBase}/studio/content`);
const listPayload = await listResponse.json();
const item = listPayload.items.find((candidate) => candidate.l1.name === name);
if (!item || item.l1.l0Ids[0] !== "l0-constraint" || item.version.reviewStatus !== "published" || item.l2.status !== "published") {
  throw new Error("Published L1/L2 content was not visible through the API");
}
const nextResponse = await fetch(`${apiBase}/content/cards/next?actorKey=${encodeURIComponent(`workflow_${suffix}`)}&l1Id=${encodeURIComponent(item.l1.id)}&participantCount=2`);
if (!nextResponse.ok) throw new Error(`Published content was not deliverable: ${nextResponse.status}`);
const nextPayload = await nextResponse.json();
if (nextPayload.card.name !== title) throw new Error("Published content delivery returned the wrong card");

console.log(JSON.stringify({
  name,
  l1Status: item.version.reviewStatus,
  l2Status: item.l2.status,
  deliveredCard: nextPayload.card.name
}, null, 2));
await call("Emulation.clearDeviceMetricsOverride");
socket.close();
