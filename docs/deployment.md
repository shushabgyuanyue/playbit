# Deployment

Playbit uses two services:

- Vercel for `apps/web`
- Railway for `apps/api` and PostgreSQL

## 1. Push Code

The repository root is deployable as-is.

```bash
git push origin main
```

推送代码只会触发应用重新构建和重启，不会重建 Railway PostgreSQL。只要
`DATABASE_URL` 仍然指向同一个 Railway PostgreSQL 服务，数据库中的用户、合约、权益和结算数据会保留。
真正会造成数据丢失的是删除/重建 PostgreSQL 服务、切换到另一条 `DATABASE_URL`、执行 `TRUNCATE`/`DROP`
或把线上 API 启动在内存模式。

## 2. Deploy API On Railway

Create a Railway project from the GitHub repository.

Attach a PostgreSQL database and set these variables on the API service:

```bash
DATABASE_URL=<Railway PostgreSQL connection string>
WEB_ORIGIN=https://<your-vercel-domain>
PORT=8080
DATABASE_SSL=false
PLAYBIT_DATA_ENV=prod
```

`WEB_ORIGIN` is the frontend domain allowed to call the API from a browser. If it is not set in production, the API falls back to permissive CORS so the app can still be tested, but setting the exact Vercel/custom domain is recommended.

`PORT` must match the port shown in Railway `Networking -> Public Networking`. Railway commonly routes public HTTP traffic to `8080`; if that panel shows another port, use that value instead.

Use `DATABASE_SSL=false` when `DATABASE_URL` points to Railway's internal PostgreSQL host. The API also detects `.railway.internal` database URLs and disables SSL automatically.

Railway reads `railway.json` from the repository root.

Authentication sessions are stored in PostgreSQL. No extra auth provider is required for the current email/password upgrade flow.

The start command runs migrations before starting the API:

```bash
pnpm --filter @playbit/api db:migrate && pnpm --filter @playbit/api start
```

`PLAYBIT_DATA_ENV=prod` 或 `NODE_ENV=production` 且未配置 `DATABASE_URL` 时，API 会拒绝启动，不再静默退化为内存模式。
迁移是 Drizzle 增量迁移：只新增或修改已声明的迁移，不要删除旧迁移文件，也不要把迁移命令替换为重建数据库。

内容运营库目前仍有一部分使用内存 Repository。即使 API 配置了 PostgreSQL，内容库草稿、审核状态、推荐运行状态和内容分析缓存仍不能视为可恢复的线上数据；正式使用前必须完成内容域数据库迁移。详见
[`docs/data-lifecycle.md`](data-lifecycle.md)。

Check the API after deployment:

```text
https://<your-railway-api-domain>/health
```

## 3. Deploy Web On Vercel

Create a Vercel project from the same GitHub repository.

Set this environment variable:

```bash
VITE_API_BASE_URL=https://<your-railway-api-domain>
```

This variable is required for login, registration, signing, and coupon management in production. Without it, the deployed web app will try to call `/auth/register` and `/auth/login` on the Vercel domain instead of the Railway API.

Vercel reads `vercel.json` from the repository root:

```json
{
  "buildCommand": "pnpm --filter @playbit/web build",
  "outputDirectory": "apps/web/dist",
  "installCommand": "pnpm install"
}
```

After Vercel gives you a domain, update Railway `WEB_ORIGIN` to that exact domain.

Invitation QR codes use the current frontend URL by default, including its path.
Set `VITE_PUBLIC_SITE_URL=https://<your-public-domain>/` at build time when preview
domains should invite people to a canonical production site. Never set it to the
API domain, localhost, or a deployment protected by a login wall. The canonical
site must use the same API/database as the app creating the invitation. QR codes
carry `?share=`, `?game=`, or `?flip=` and require a reachable HTTPS frontend and API.
Before release, scan all three invitation types from a second phone on mobile data,
open them logged out, and complete signing/joining after login. Local QR decoding
does not establish public-network reachability.

Image invitations use Web Share file support on HTTPS. The operating system chooses
available destinations and the user chooses the recipient. Ordinary web pages cannot
force WeChat/WhatsApp to receive an image or silently send it to a contact. Browsers
without file sharing download the same invitation card for sending from the photo
library; copy-link remains available. No unsupported app URL scheme is used.

## Local Commands

```bash
pnpm install
pnpm dev
pnpm check
pnpm build
```
