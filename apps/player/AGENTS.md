# React player

- Read `../../docs/react-player-migration.md`. Figma commit `49c8f21` is the visual baseline; existing Vue pages inform behavior, not the new visual direction.
- Keep App responsible for composition. Pages compose features; feature hooks own business transitions; repositories own persistence. No component should import Vue implementation files.
- Customer-facing copy belongs in `packages/content/src/player.ts`. Demo content belongs in `src/data`. Do not put API-only metadata on the client card view model.
- Use `styles/tokens.css`, `product-tokens.css`, and `product-primitives.css`; keep feature layouts with their feature styles. Consolidate superseded declarations instead of appending overrides.
- Use lucide-react and Radix Dialog for accessible icons and sheets. Preserve actual signature strokes, browser navigation, guest play, reduced motion, and drafts.
- This phase is a local prototype. Never issue backend writes, fake authentication or claim an actual share, delivery, or AI generation. Record unresolved product decisions without blocking independent work.
- Check each page against the old implementation. Record retain/drop/discuss decisions in the migration document.
- Verify `pnpm --filter @playbit/player check`, `test`, `build`, and `test:browser`. Inspect real mobile and desktop screenshots. Do not change existing production deployment configuration.
