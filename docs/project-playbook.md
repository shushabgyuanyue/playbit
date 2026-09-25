# Playbit Project Playbook

This records the current product and engineering decisions for the Playbit
repository. The customer-facing product name is **说好不许赖**.

## Product Core

Playbit gives ordinary life a sharp little game, then treats any optional
agreement with deliberately professional ceremony. The game is the emotional
hook; the agreement is a way to remember a shared promise and its equity, not a
claim that Playbit can enforce it.

The two entry points are independent until the player chooses otherwise:

- **立合约** records an agreement that already exists between people.
- **开一盘** draws one curated game card. Players can start immediately,
  without accepting a platform verdict, creating an account, or making an
  agreement.
- **添加权益** is an optional upgrade from a versus card into a persistent
  Agreement: choose an equity, sign, and invite the other participant.

The anonymous card is ephemeral client state. Do not create a guest account,
fake agreement, or database record just to let someone play a card.

## Product Boundaries

- Real life stays the setting; the phone supplies a short rule and records only
  what the players choose to bring back.
- Playbit does not observe, adjudicate, verify, or enforce results. An
  authenticated participant may register the result; store who registered it.
  The product must say plainly that Playbit was not there.
- A person may choose not to fulfill an equity. The product records the
  agreement and usage; it does not shame or penalize anyone for declining.
- “不服翻盘” is an invitation to play again and extend the emotion, not an
  appeal or dispute-resolution workflow.
- A 赖皮券 is a rare, earned permission to mutually waive one ordinary
  fulfillment. It is not sold, not an ordinary prize, and does not erase the
  original agreement or use record.
- In-session play may have hidden information, reversals, and mutually
  confirmed boosts. Out-of-session product surfaces stay small: agreements,
  equity, records, and user-initiated proof/share.
- No real-money custody, recharge, withdrawal, commerce, ranking, seasons,
  relationship spaces, AI, map API, or permanent progression in the current
  release.
- Boosting is a change to the same equity, requires both participants, and is
  limited to three times per Agreement. Store confirmed amendments under
  `stake.additions`; never mint an extra coupon for a boost.

## Domain Rules

### Identity

- Drawing and playing a card require no account.
- Persistence actions (creating/signing an Agreement, recording its result,
  managing equity, and viewing personal history) require a registered account.
- No guest or temporary user records. Login/register uses the same email and
  password entry; an unknown email continues into registration.
- A share link can show a pending Agreement. Only the invited counterparty can
  sign it; an initiator cannot sign their own link. After signature, only
  participants can view the private Agreement.
- The account nickname is the default signing name. Signature is a chosen
  display mark, not a request for a legal name; preload the last saved signature.

### Agreements And Results

- `Agreement` is the sole persisted agreement aggregate. `PlayCard` is a
  curated prompt, not an agreement and not a database session.
- Agreement states are `pending_signature -> active -> result_recorded ->
  fulfilled`, with `waived` for an equity mutually waived through a 赖皮券.
  A result is a participant-submitted record, never a platform judgment.
- The initiator signs at creation; the share-link visitor becomes the
  counterparty only when signing.
- Opening a share link as its initiator or an existing signatory resumes the
  Agreement instead of asking for another signature. A new signatory uses the
  account nickname; the signing request contains only the saved or drawn mark.
- Each equity coupon links to one Agreement. Provider/holder actions derive
  from explicit user IDs, not array position or display text.
- A coupon is issued only after a participant records a result. For point or
  custom equity, retain the Agreement record without inventing a coupon.
- The result reporter, winner, provider, and holder are explicit fields. Do not
  infer them from who opened a screen.

### Flip, Waiver, And Proof

- A flip is a replay invitation attached to an unfulfilled coupon, not an
  appeal. The provider invites the holder; the holder may decline. Accepting
  reuses the original equity and draws one card, with no second stake.
- If the provider wins, waive only the coupon being flipped. If the provider
  loses, keep that coupon and issue one independent coupon with identical
  terms. Never collapse or deduplicate coupons by Agreement ID.
- Flip eligibility follows each available coupon, including a bonus coupon
  after the original Agreement equity has been fulfilled or waived. The
  Agreement status describes the original equity, not every later coupon.
- Award one 赖皮券 for every completed 10-fulfillment milestone. Store the
  milestone as the idempotency key so retries and concurrent requests cannot
  award it twice. A waiver request reserves one ticket and one available
  coupon; decline restores both, approval consumes the ticket and waives only
  that coupon. Keep the Agreement and every waiver decision in history.
- Certificates are derived from existing Agreement/Flip facts. They are
  generated only by explicit user action, never required to settle, sign, or
  redeem. They record participant submissions and do not imply Playbit verified
  the event or enforces the promise.

## Cards

- Maintain a directly curated catalog of short games that are fun on their own.
  Real life is the setting, not a required theme: a strong riddle or word game
  is better than an awkward life challenge. Cards should take about five
  minutes and work without location or special equipment.
- Separate games with a natural, recordable winner from games that can end
  without one. Only the former can be upgraded into an Agreement or used for a
  flip.
- Do not model or expose board-game motif taxonomies, AI rewrite prompts,
  progression systems, or an accept-before-play step.
- A card has its own play instructions and completion condition. If upgraded
  into an Agreement, preserve both in the recorded challenge text.
- Re-roll is available before choosing to play or upgrade. No silver-bullet
  inventory or mandatory multi-round structure in the current release.

## Frontend And Copy

- Mobile-first and mini-program-friendly. Reuse the shared service shell,
  document, controls, design tokens, and voucher primitives before adding UI.
- Agreements, settlement proofs, and equity cards share the electronic
  signing visual language: formal hierarchy, clear status, restrained color,
  and ritual in the sequence rather than decorative animation.
- Cards may feel like a game, but keep their visual system coherent with the
  professional shell. Humor belongs in precise copy and small details.
- Customer-facing copy lives in `packages/content/src/index.ts`. Do not add
  display text directly to Vue templates, API responses, or formatter output.
- Avoid gambling, enforcement, arbitration, and legal-effect claims. Preferred
  terms are agreement, equity, result record, provider, holder, and redemption.
- Functional titles, buttons, statuses, errors, and proofs must state exactly
  what happened or what the action will do. Use one term per state and action:
  sign an Agreement, record a result, fulfill an equity, redeem a coupon, issue
  a certificate. Never claim a link was shared or content copied before it was.
- The product name carries most of the childlike contrast. Keep the shell and
  documents professionally restrained; let one short line of personality
  appear only where it adds warmth without changing a decision, such as the
  home eyebrow, an empty state, or a flip invitation. Card rules may be playful.

## Collaboration And Verification

- Keep collaboration lightweight: clarify product boundaries first, inspect
  local patterns, implement autonomously, then verify the affected path.
- The user owns product direction and irreversible tradeoffs. The coding agent
  owns decomposition, edge cases, permissions, copy placement, and tests.
- Do not keep dead models, routes, database tables, guest-account fallbacks, or
  dual-read compatibility when a new model replaces them. Development-stage
  migrations may deliberately discard obsolete records; never apply them to a
  deployed database without an explicit data-reset decision.
- For meaningful changes, run `pnpm check`, `pnpm test`, and `pnpm build`.
- A release path is complete when anonymous play works, upgrade/login preserves
  the active card and form state, both parties see signed state, either party
  can register the result, the reporter is recorded, and equity ownership and
  redemption permissions are correct.
