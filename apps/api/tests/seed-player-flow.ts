const base = "http://127.0.0.1:8799";
async function request<T>(path: string, body: unknown, token?: string): Promise<T> {
  const result = await fetch(`${base}${path}`, { method: "POST", signal: AbortSignal.timeout(5000), headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
  if (!result.ok) throw new Error(`${path}: ${result.status}`);
  return result.json() as Promise<T>;
}
const account = await request<{ token: string }>("/auth/register", { nickname: "分页测试", email: "flow-pages@playbit.test", password: "FlowTest1028!" });
for (let index = 1; index <= 12; index++) {
  const issued = await request<{ coupon: { claimToken: string } }>("/coupons/public", { name: `分页权益 ${String(index).padStart(2, "0")}`, description: "隔离流程测试，不连接数据库", issuerNickname: "流程测试", sourceLabel: "手动签发", claimLimit: 1 });
  await request(`/coupons/share/${issued.coupon.claimToken}/claim`, undefined, account.token);
}
console.log("Seeded 12 owned coupons in the disposable API.");
