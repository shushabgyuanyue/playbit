# React player

- Read `../../docs/design-constitution.md` and `../../docs/visual-system.md` before changing the player. The React player is the canonical user frontend; do not add compatibility code for a removed frontend.
- Keep App responsible for composition. Pages compose features; feature hooks own business transitions; repositories own persistence. Components must not import removed legacy frontend modules.
- Customer-facing copy belongs in `packages/content/src/player.ts`. Demo content belongs in `src/data`. Do not put API-only metadata on the client card view model.
- Use `styles/tokens.css`, `product-tokens.css`, and `product-primitives.css`; keep feature layouts with their feature styles. Consolidate superseded declarations instead of appending overrides.
- Use lucide-react and Radix Dialog for accessible icons and sheets. Preserve actual signature strokes, browser navigation, guest play, reduced motion, and drafts.
- This phase is a local prototype. Never issue backend writes, fake authentication or claim an actual share, delivery, or AI generation. Record unresolved product decisions without blocking independent work.
- Keep page behavior aligned with the current React product flow and record durable product decisions in the project playbook.
- Verify `pnpm --filter @playbit/player check`, `test`, `build`, and `test:browser`. Inspect real mobile and desktop screenshots. Keep production deployment configuration aligned with `apps/player`.
