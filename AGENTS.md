# Playbit implementation guide

- Read `docs/project-playbook.md` for product and domain boundaries.
- Before frontend work, read `docs/design-constitution.md` and `docs/visual-system.md`.
- The current homepage is the visual reference. Reuse its principles, not its five-section layout on every screen.
- Under `apps/web/src`, shared foundations live in `styles/tokens.css`; product surfaces, motion and accents in `styles/product-tokens.css`; public skins in `styles/product-primitives.css`.
- Reuse `components/ui` and existing business components before adding a new primitive. Keep page layout local. Extract repeated structure/behavior, not speculative universal abstractions.
- Keep customer copy in `packages/content/src/index.ts`. Keep factual status labels separate from decorative brand stamps.
- Preserve permissions, back navigation, drafts and guest play while restyling. Do not create temporary accounts or mandatory agreements for drawing a card.
- Split files at responsibility boundaries before they become hard to maintain. Remove replaced code and styles rather than retaining parallel legacy implementations.
- Work autonomously on implementation details. Clarify meaningful product-direction conflicts; no extra approval ceremony for ordinary reversible work.
- Verify affected behavior and mobile screenshots. For meaningful shared changes, run `pnpm check`, `pnpm test`, and `pnpm build`; report actual results and any limits.
