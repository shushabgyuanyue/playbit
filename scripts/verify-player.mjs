import fs from "node:fs";
import WebSocket from "../node_modules/.pnpm/ws@8.22.0/node_modules/ws/index.js";

const tabs = await (await fetch("http://127.0.0.1:9224/json/list")).json();
const tab = tabs.find(item => item.type === "page" && item.url.includes("5174"));
if (!tab) throw new Error("No React player page is available on CDP port 9224");

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
const evaluate = async expression => (await call("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true })).result.result.value;
const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
const click = async label => evaluate(`(() => { const button = [...document.querySelectorAll('button')].find(item => item.textContent?.includes(${JSON.stringify(label)})); if (!button) return false; button.click(); return true; })()`);
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
const navigate = async path => { await call("Page.navigate", { url: `http://127.0.0.1:5174${path}` }); await wait(1100); };
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const capture = async path => fs.writeFileSync(path, Buffer.from((await call("Page.captureScreenshot", { format: "png" })).result.data, "base64"));

await call("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
await evaluate("localStorage.removeItem('playbit:player:prototype:v1')");
await evaluate("sessionStorage.removeItem('playbit:player:page-memory:v1')");
await navigate("/");
assert((await evaluate("window.innerWidth")) === 390, "CDP mobile viewport was not applied");
assert(await evaluate("document.body.innerText.includes('翻开开始') && document.body.innerText.includes('添个彩头')"), "Play page main actions are missing");
assert(await evaluate("document.documentElement.scrollWidth <= window.innerWidth"), "Play page has horizontal overflow");
await wait(450);
fs.mkdirSync("artifacts", { recursive: true });
await capture("artifacts/player-home-mobile-verified.png");
await evaluate("document.querySelector('.bottom-nav .nav-item:first-child')?.click()"); await wait(25);
assert(await evaluate("location.pathname === '/benefits' && getComputedStyle(document.querySelector('.page-view')).animationName === 'pageIn'"), "Page transition animation is missing");
await navigate("/");

assert(await click("场景"), "Scene action is missing"); await wait(450);
assert(await evaluate("Boolean(document.querySelector('.drawer[data-state=\"open\"]'))"), "Scene drawer did not open");
await evaluate("document.querySelector('.drawer[data-state=\"open\"] .icon-btn[aria-label=\"关闭\"]')?.click()"); await wait(40);
assert(await evaluate("Boolean(document.querySelector('.drawer.is-closing'))"), "Scene drawer did not start closing animation"); await wait(300);
assert(await evaluate("!document.querySelector('.drawer')"), "Scene drawer did not unmount after closing animation");

await evaluate("document.querySelector('.deck-controls button:last-child')?.click()"); await wait(550);
assert(await evaluate("Boolean(document.querySelector('.game-card[data-card-id=\"memory\"]'))"), "Card transition did not reach the next card");
await evaluate("document.querySelector('.corner-save')?.click()"); await wait(80);
assert(await evaluate("document.querySelector('.corner-save')?.getAttribute('aria-pressed') === 'true' && Boolean(document.querySelector('.save-sheet[data-state=\"open\"]'))"), "Like state did not update immediately");
await evaluate("document.querySelector('.save-sheet[data-state=\"open\"] .icon-btn[aria-label=\"关闭\"]')?.click()"); await wait(320);
assert(await evaluate("document.querySelector('.corner-save')?.getAttribute('aria-pressed') === 'false'"), "Cancelled like state did not roll back");

assert(await click("翻开开始"), "Flip action is missing"); await wait(800);
assert(await evaluate("document.body.innerText.includes('HOW TO PLAY')"), "Card back did not open");
assert(await evaluate("Boolean(document.querySelector('.game-card.is-flipped'))"), "Card did not remember its flipped state before navigation");
await navigate("/benefits");
assert(await evaluate("!document.querySelector('.benefit-tabs') && document.querySelectorAll('.coupon-card').length > 0 && document.body.innerText.includes('确认核销')"), "Benefits page should show owned cards only");
await navigate("/");
assert(await evaluate("Boolean(document.querySelector('.game-card.is-flipped'))"), "Card flipped state was not restored after navigation");
assert(await click("添个彩头"), "Stake action is missing"); await wait(250);
assert(await evaluate("document.body.innerText.includes('给这一局，加一点期待')"), "Stake sheet did not open");
await call("Runtime.evaluate", { expression: "document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}))" });

await navigate("/");
await click("添个彩头"); await wait(180);
await evaluate("(() => { const input = document.querySelector('.save-sheet input'); if (!input) return false; const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; setter.call(input, '输的人请喝一杯'); input.dispatchEvent(new Event('input',{bubbles:true})); return true; })()");
await click("就这个彩头"); await wait(180);
assert(await evaluate("Boolean(document.querySelector('.stake-issue-icon'))"), "Stake issue icon did not appear after adding a stake");
await evaluate("document.querySelector('.stake-issue-icon')?.click()"); await wait(260);
assert(await evaluate("document.body.innerText.includes('把彩头交给赢家') && document.querySelectorAll('.signature-pad canvas').length === 1"), "Stake issue sheet is incomplete");
assert(await drawSignature(0), "Stake signature pad is not drawable"); await wait(100);
assert(await click("签发并生成权益卡"), "Stake issue action is missing"); await wait(220);
assert(await evaluate("document.body.innerText.includes('彩头已签发') && document.body.innerText.includes('等待获胜方领取')"), "Issued stake state is missing");
assert(await click("我来领取"), "Self claim action is missing"); await wait(280);
assert(await evaluate("location.pathname === '/benefits' && document.body.innerText.includes('输的人请喝一杯')"), "Claimed stake did not enter owned benefits");

await navigate("/promise");
assert(await evaluate("document.body.innerText.includes('建立一份') && document.body.innerText.includes('赢家权益')"), "Promise creation page is incomplete");
await evaluate("(() => { const input = document.querySelector('textarea'); const option = [...document.querySelectorAll('button')].find(item => item.textContent?.includes('周末早餐')); if (!input || !option) return false; const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set; setter.call(input, '这周谁先熬夜超过十二点'); input.dispatchEvent(new Event('input',{bubbles:true})); option.click(); return true; })()");
assert(await click("生成协议并进入签署"), "Promise creation action is missing"); await wait(250);
assert(await evaluate("document.body.innerText.includes('请双方核对条款并亲笔签署') && document.querySelectorAll('canvas').length === 2"), "Signing step is incomplete");
assert(await evaluate("getComputedStyle(document.querySelector('.bet-module > .page-transition')).animationName === 'pageIn'"), "Promise signing transition is missing");
assert(await drawSignature(0) && await drawSignature(1), "Signature pads are not drawable"); await wait(120);
assert(await click("签字完成，盖章生效"), "Promise seal action is missing"); await wait(1100);
assert(await evaluate("document.body.innerText.includes('确认权益获得方') && getComputedStyle(document.querySelector('.bet-module > .page-transition')).animationName === 'pageIn'"), "Promise result transition is missing");
assert(await click("甲方"), "Winner selection is missing"); await wait(80);
assert(await click("确认 甲方 获胜"), "Promise settlement action is missing"); await wait(250);
assert(await evaluate("document.body.innerText.includes('胜者权益') && getComputedStyle(document.querySelector('.bet-module > .page-transition')).animationName === 'pageIn'"), "Promise issued transition is missing");
await capture("artifacts/player-promise-mobile-verified.png");

await navigate("/benefits");
assert(await evaluate("document.body.innerText.includes('我的权益') && document.body.innerText.includes('确认核销') && !document.body.innerText.includes('我的承诺') && !document.body.innerText.includes('只展示已经属于你的权益卡')"), "Benefits page is incomplete");
await evaluate("document.querySelector('.coupon-card')?.click()"); await wait(700);
assert(await evaluate("Boolean(document.querySelector('.coupon-card.is-flipped')) && document.body.innerText.includes('签发证明') && document.body.innerText.includes('677A4DF7') && document.body.innerText.includes('签发时间')"), "Coupon back proof did not open");
await capture("artifacts/player-benefits-card-back-mobile.png");
await evaluate("document.querySelector('.coupon-back-hint')?.click()"); await wait(700);
assert(await evaluate("!document.querySelector('.coupon-card.is-flipped')"), "Coupon did not return to its front");
assert(await click("确认核销"), "Redeem action is missing"); await wait(220);
assert(await click("确认核销"), "Redeem confirmation is missing"); await wait(220);
await evaluate("document.querySelector('.coupon-card')?.click()"); await wait(700);
assert(await evaluate("Boolean(document.querySelector('.coupon-card.used')) && !document.body.innerText.includes('卡券内容')"), "Redeemed coupon surface is incorrect");
await evaluate("document.querySelector('.coupon-back-hint')?.click()"); await wait(700);
assert(await click("手动签发"), "Independent issue entry is missing"); await wait(260);
assert(await evaluate("document.body.innerText.includes('填写权益并留下签名') && Boolean(document.querySelector('.issue-benefit-picker')) && Boolean(document.querySelector('.issue-source-field select')) && !document.querySelector('.issue-source-field input')"), "Independent issue sheet is incomplete");
await capture("artifacts/player-benefits-issue-sheet-mobile.png");
assert(await click("周末早餐"), "Shared benefit picker is missing");
await evaluate("(() => { const select = document.querySelector('.issue-source-field select'); if (!select) return false; const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set; setter.call(select, 'custom'); select.dispatchEvent(new Event('change',{bubbles:true})); return true; })()");
await wait(80);
assert(await evaluate("Boolean(document.querySelector('.issue-source-field input'))"), "Custom source input did not open");
await evaluate("(() => { const input = document.querySelector('.issue-source-field input'); if (!input) return false; const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; setter.call(input, '朋友间的线下约定'); input.dispatchEvent(new Event('input',{bubbles:true})); return true; })()");
assert(await drawSignature(0), "Independent issue signature pad is not drawable"); await wait(100);
assert(await click("签名并生成权益卡"), "Independent issue action is missing"); await wait(220);
assert(await evaluate("document.body.innerText.includes('权益卡已生成') && document.body.innerText.includes('等待对方登录领取')"), "Independent issued state is missing");
assert(await click("在本机领取（演示）"), "Independent self claim action is missing"); await wait(280);
assert(await evaluate("location.pathname === '/benefits' && document.body.innerText.includes('周末早餐')"), "Independent claimed benefit did not enter owned benefits");
await capture("artifacts/player-benefits-mobile-verified.png");
await navigate("/me");
assert(await evaluate("document.body.innerText.includes('我的场景卡组') && document.body.innerText.includes('服务与设置')"), "Profile page is incomplete");
assert(await evaluate("document.documentElement.scrollWidth <= window.innerWidth"), "Profile page has horizontal overflow");
assert(await evaluate("document.querySelectorAll('.profile-deck:not(.add-deck)').length <= 3"), "Profile page shows more than three scene decks");
await capture("artifacts/player-profile-mobile-verified.png");

console.log("player browser verification passed");
socket.close();
