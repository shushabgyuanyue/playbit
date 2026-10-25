import fs from "node:fs";
import WebSocket from "../node_modules/.pnpm/ws@8.22.0/node_modules/ws/index.js";

const baseUrl = process.env.PLAYER_URL ?? "http://127.0.0.1:5175";
const apiUrl = process.env.API_URL ?? "http://127.0.0.1:8788";
const tabs = await (await fetch("http://127.0.0.1:9224/json/list")).json();
const tab = tabs.find(item => item.type === "page" && item.url.includes(new URL(baseUrl).port));
if (!tab) throw new Error(`No React player page is available on CDP port 9224 for ${baseUrl}`);

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
await call("Target.activateTarget", { targetId: tab.id });
const evaluate = async expression => (await call("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true })).result.result.value;
const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const navigate = async path => { await call("Page.navigate", { url: `${baseUrl}${path}` }); await wait(900); };
const reload = async () => { await call("Page.reload", { ignoreCache: true }); await wait(900); };
const click = async label => evaluate(`(() => { const buttons = [...document.querySelectorAll('button')].filter(item => item.offsetParent !== null && item.textContent?.includes(${JSON.stringify(label)})); const button = buttons.at(-1); if (!button) return false; button.click(); return true; })()`);
const clickSelector = async selector => {
  const rect = await evaluate(`(() => { const element = document.querySelector(${JSON.stringify(selector)}); if (!element) return null; const rect = element.getBoundingClientRect(); return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }; })()`);
  if (!rect) return false;
  await call("Input.dispatchMouseEvent", { type: "mouseMoved", x: rect.x, y: rect.y });
  await call("Input.dispatchMouseEvent", { type: "mousePressed", button: "left", buttons: 1, clickCount: 1, x: rect.x, y: rect.y });
  await call("Input.dispatchMouseEvent", { type: "mouseReleased", button: "left", buttons: 0, x: rect.x, y: rect.y });
  return true;
};
const fill = async (selector, value) => evaluate(`(() => { const input = document.querySelector(${JSON.stringify(selector)}); if (!input) return false; const prototype = input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype; const setter = Object.getOwnPropertyDescriptor(prototype, 'value').set; setter.call(input, ${JSON.stringify(value)}); input.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
const drawSignature = async index => {
  const box = await evaluate(`(() => { const canvas = document.querySelectorAll('.signature-pad canvas')[${index}]; if (!canvas) return null; const rect = canvas.getBoundingClientRect(); return { x: rect.left, y: rect.top, width: rect.width, height: rect.height }; })()`);
  if (!box) return false;
  const points = [[box.x + 18, box.y + box.height * .62], [box.x + box.width * .38, box.y + box.height * .28], [box.x + box.width * .72, box.y + box.height * .68]];
  await call("Input.dispatchMouseEvent", { type: "mouseMoved", x: points[0][0], y: points[0][1] });
  await call("Input.dispatchMouseEvent", { type: "mousePressed", button: "left", clickCount: 1, x: points[0][0], y: points[0][1] });
  for (const [x, y] of points.slice(1)) await call("Input.dispatchMouseEvent", { type: "mouseMoved", button: "left", x, y });
  await call("Input.dispatchMouseEvent", { type: "mouseReleased", button: "left", x: points.at(-1)[0], y: points.at(-1)[1] });
  return true;
};
const capture = async path => fs.writeFileSync(path, Buffer.from((await call("Page.captureScreenshot", { format: "png" })).result.data, "base64"));

async function createUser(name) {
  const email = `${name}-${Date.now()}@playbit.test`;
  const response = await fetch(`${apiUrl}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nickname: name, email, password: "password123" })
  });
  assert(response.ok, `Could not create test user: ${response.status}`);
  return { ...(await response.json()), email, password: "password123" };
}

const issuer = await createUser("issuer");
const holder = await createUser("holder");
fs.mkdirSync("artifacts", { recursive: true });

await call("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
await evaluate("localStorage.clear(); sessionStorage.clear();");
await evaluate(`localStorage.setItem('playbit.authToken', ${JSON.stringify(issuer.token)})`);
await navigate(`/?verify=${Date.now()}`);
assert(await evaluate("document.body.innerText.includes('翻开开始')"), "Player home did not load");
assert(await evaluate("Boolean(document.querySelector('.preview-stake'))"), "Game stake button is missing");
assert(await clickSelector(".preview-stake"), "Game stake button could not be clicked");
await evaluate("document.querySelector('.preview-stake')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))");
await wait(180);
await capture("artifacts/player-api-after-stake-click.png");
assert(await fill(".save-sheet input", "输的人请喝一杯"), "Game stake input is missing");
assert(await click("就这个彩头"), "Game stake save action is missing");
await wait(220);
assert(await click("翻开开始"), "Game card flip action is missing");
await wait(720);
assert(await evaluate("Boolean(document.querySelector('.card-back .stake-issue-icon'))"), "Game issue icon is missing");
await evaluate("document.querySelector('.card-back .stake-issue-icon')?.click()");
await wait(220);
assert(await drawSignature(0), "Game issue signature pad is missing");
assert(await click("签发并生成权益卡"), "Game issue action is missing");
await wait(450);
assert(await evaluate("document.body.innerText.includes('彩头已签发') && !document.body.innerText.includes('我来领取')"), "Remote game issuance should not offer issuer self-claim");
const gameClaimToken = await evaluate("Object.values(JSON.parse(localStorage.getItem('playbit:player:prototype:v1')).issuedStakes)[0]?.claimToken");
assert(typeof gameClaimToken === "string" && gameClaimToken.length > 0, "Game claim token was not persisted");

await evaluate(`localStorage.setItem('playbit.authToken', ${JSON.stringify(holder.token)})`);
await reload();
await navigate(`/claim/${encodeURIComponent(gameClaimToken)}`);
assert(await evaluate("document.body.innerText.includes('有人把一份权益交给你') && document.body.innerText.includes('领取到我的权益')"), "Game claim page did not load");
assert(await click("领取到我的权益"), "Game claim action is missing");
await wait(600);
assert(await evaluate("location.pathname === '/benefits' && document.body.innerText.includes('输的人请喝一杯')"), "Game coupon did not enter the remote benefits page");
await click("确认核销"); await wait(180); await click("确认核销"); await wait(550);
const gameOwned = await (await fetch(`${apiUrl}/coupons?limit=10&owned=1`, { headers: { Authorization: `Bearer ${holder.token}` } })).json();
assert(gameOwned.coupons.some(item => item.name === "输的人请喝一杯" && item.status === "used"), "Game coupon was not redeemed through the API");

await evaluate("localStorage.removeItem('playbit.authToken')");
await reload();
await navigate("/promise");
assert(await evaluate("document.body.innerText.includes('建立一份')"), "Offline agreement page did not load");
await fill("textarea", "这周谁先熬夜超过十二点");
await click("周末早餐");
await click("生成协议并进入签署"); await wait(250);
assert(await drawSignature(0) && await drawSignature(1), "Offline agreement signatures are missing");
await click("签字完成，盖章生效"); await wait(1100);
assert(await evaluate("Boolean(document.querySelector('input[type=email]'))"), "Offline signing should request login before API persistence");
assert(await fill("input[type=email]", issuer.email) && await fill("input[type=password]", issuer.password), "Offline agreement login fields are missing");
assert(await click("登录"), "Offline agreement login action is missing"); await wait(1600);
assert(await evaluate("document.body.innerText.includes('把约定交给赢家') && !document.body.innerText.includes('确认权益获得方')"), "Offline agreement should settle without selecting a winner");
const remoteAgreements = await evaluate(`(async()=>{const token=localStorage.getItem('playbit.authToken'); const response=await fetch(${JSON.stringify(`${apiUrl}/agreements`)},{headers:{Authorization:'Bearer '+token}}); return response.ok ? await response.json() : null})()`);
assert(remoteAgreements?.agreements?.some(item => item.status === "active" && item.winnerId === null && item.participants?.length === 2), "Offline agreement was not persisted through the API");
await click("签发给赢家"); await wait(220);
assert(await drawSignature(0), "Offline benefit signature pad is missing");
await click("签发并生成权益卡"); await wait(450);
const promiseClaimToken = await evaluate("Object.values(JSON.parse(localStorage.getItem('playbit:player:prototype:v1')).issuedBenefits)[0]?.claimToken");
assert(typeof promiseClaimToken === "string" && promiseClaimToken.length > 0, "Offline agreement claim token was not persisted");
assert(await evaluate("!document.body.innerText.includes('在本机领取（演示）')"), "Remote offline issuance should not offer local demo claim");

await evaluate(`localStorage.setItem('playbit.authToken', ${JSON.stringify(holder.token)})`);
await reload();
await navigate(`/claim/${encodeURIComponent(promiseClaimToken)}`);
await click("领取到我的权益"); await wait(600);
assert(await evaluate("location.pathname === '/benefits' && document.body.innerText.includes('周末早餐')"), "Offline agreement coupon did not enter benefits");
await capture("artifacts/player-api-benefits-mobile.png");

console.log("player API browser verification passed: game issue -> claim -> redeem; offline agreement issue -> claim.");
socket.close();
