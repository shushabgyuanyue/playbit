# Deployment

Playbit uses two services:

- Vercel for `apps/web`
- Railway for `apps/api` and PostgreSQL

## 1. Push Code

The repository root is deployable as-is.

```bash
git push origin main
```

## 2. Deploy API On Railway

Create a Railway project from the GitHub repository.

Attach a PostgreSQL database and set these variables on the API service:

```bash
DATABASE_URL=<Railway PostgreSQL connection string>
WEB_ORIGIN=https://<your-vercel-domain>
PORT=8080
DATABASE_SSL=false
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

## Local Commands

```bash
pnpm install
pnpm dev
pnpm check
pnpm build
```
