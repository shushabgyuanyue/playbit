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

Playbit uses a familiar, professional life-app surface to give small promises playful emotional value. Start with the [design principles](docs/design-constitution.md), then the [visual system and reuse guide](docs/visual-system.md). Product boundaries live in the [project playbook](docs/project-playbook.md).

Playing a card requires no account. Persistent agreements, coupons and personal records require an account; no temporary user record is created for anonymous play.

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
