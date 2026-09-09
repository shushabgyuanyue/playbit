# playbit

Playbit turns tiny real-life bets, challenges, and rewards into lightweight sessions that can be confirmed, settled, shared, and remembered.

## Stack

- `apps/web`: Vue 3 + Vite mobile-first H5 app
- `apps/api`: Hono API prepared for Railway
- `packages/shared`: shared types and validation schemas
- `packages/content`: customer-facing copy and templates
- `packages/cards`: daily-life challenge card library
- `packages/game-core`: session, contract, stake, and settlement logic

## Design

Playbit follows the product-level design constitution in `docs/design-constitution.md`: a serious notary with a quiet sense of humor, using formal agreement metaphors for tiny real-life moments.

Identity is progressive: users get a temporary identity by default, then upgrade to an email account only when they need durable coupon, agreement, or history management.

## Commands

```bash
pnpm install
pnpm dev
pnpm build
pnpm check
```

Copy `.env.example` to `.env` for local API/database configuration.

## Deployment

See `docs/deployment.md`.
