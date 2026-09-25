# Playbit Design Constitution

This is the product-level design constitution for Playbit. It is not a component spec. It describes the aesthetic judgment that should guide pages, components, copy, motion, and implementation details.

## Brand Persona

Playbit is a professional life-agreement service with a quiet sense of humor.

It treats tiny life moments with commercial-grade care: a late arrival, a small promise, a coupon for doing dishes, a settlement between two people. The surface should feel like WeChat Pay, Alipay, Apple Wallet, and a formal e-signature flow: credible, useful, restrained. The delight comes later, from serious systems handling ordinary life.

## Design Keywords

- Formal
- Light
- Trustworthy
- Restrained
- A little surprising
- Mobile-native
- Easy to share
- Commercial-grade
- Life-service-like

## What Playbit Is Not

- Not cyberpunk
- Not toy-like controls or childish typography; brand mascots can add warmth.
- Not glassmorphism-heavy
- Not a casino
- Not a game lobby
- Not an entertainment skin
- Not a social platform
- Not a wellness journal
- Not a dashboard
- Not a marketing landing page

## Visual Metaphor

### Brand Mascots

- The panda and rabbit from the user-provided homepage artwork are Playbit's paired visual identities, representing the two parties to an agreement. They do not imply gender or winner/loser status.
- Reuse the transparent `brand-panda.webp` and `brand-rabbit.webp` assets instead of introducing unrelated animal illustrations. `brand-rabbit-white.webp` is the monochrome account-entry variant for dark image backgrounds.
- The rabbit on the account entry is a brand mark, not an indication that the logged-in user is party B. Actual agreement roles remain explicit in the record.
- Preserve recognizable silhouettes at small sizes. Use subtle silhouette shadows for contrast; keep watermarks faint and separate from functional state labels.
- Voucher depth comes from a fine top highlight and a shallow bottom edge, not grey fills or heavy shadows. Use the shared `--pb-shadow-ticket` token.
- Source artwork: `apps/web/src/assets/home-hero.webp`. Run `python scripts/extract-brand-mascots.py` with Pillow installed to reproduce the cutouts.

### Documents And Vouchers

Playbit feels like a formal agreement and credential folder for ordinary life.

- Pages can feel like contracts, certificates, receipts, or settlement letters.
- Session IDs can feel like agreement numbers.
- Confirmation can feel like signing.
- Completion can feel like stamping.
- Share pages can feel like a case-closing notice.
- Coupons can feel like commercial vouchers.
- Challenge cards can feel like temporary rule tickets.

The metaphor should stay light. It should make the experience clearer and more memorable, not slow it down.

## Experience Principles

- The first screen is the product, not a pitch.
- Every step should have one obvious next action.
- Any core action should be understandable in 3 seconds.
- Bet creation should ask only for essential input: agreement, judging rule, stake.
- The counterparty should be added by signing a shared link, not by being typed during creation.
- Identity should be progressive in visibility, not temporary in ownership: public share pages can be viewed without an account, while creating, signing, settling, redeeming, and viewing personal records require a registered account.
- Ritual comes from flow and language first, animation second.
- The phone issues rules, records results, and produces artifacts; the real play happens offline.
- In-session moments may be dramatic; out-of-session surfaces must stay light.
- Share artifacts should look worth remembering without becoming decorative posters.

## Reference Objects

- `shadcn/ui`: composable primitives, token discipline, restrained controls.
- `Origin UI`: page-level block structure and practical interaction patterns.
- `21st.dev`: component-search workflow before custom design.
- `Apple Wallet`: credential-like clarity and shareable artifact feeling.
- `WeChat Pay / Alipay`: life-service navigation, coupon list structure, practical trust.
- `Notion`: paper-like rhythm, readable spacing, quiet hierarchy.
- `Linear`: typographic restraint and low-noise interface density.

## Critical Review Path

Review polish most carefully at these moments:

- First creation of a bet agreement.
- Generated contract preview.
- Sending or copying the confirmation/share artifact.
- Settling the winner and loser.
- Confirming fulfillment.
- Final settlement/share page.

Other screens may stay simpler if the core moments feel right.
