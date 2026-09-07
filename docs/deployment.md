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
PORT=8787
DATABASE_SSL=true
```

Railway reads `railway.json` from the repository root.

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

