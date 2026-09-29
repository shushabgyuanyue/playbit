# Playbit Project Playbook

This records the current product and engineering decisions for the Playbit
repository. The customer-facing product name is **说好不许赖**.

## Product Core

Playbit gives ordinary life a sharp little game, then treats any optional
agreement with deliberately professional ceremony. The game is the emotional
hook; the agreement is a way to remember a shared promise and its equity, not a
claim that Playbit can enforce it.

The two entry points are independent:

- **立合约** records an agreement that already exists between people.
- **开一盘** draws one curated game card. Players can start immediately,
  without accepting a platform verdict, creating an account, or making an
  agreement.
- **开一局** is a lightweight game surface. It can record a host-entered result,
  issue a shareable certificate, and optionally open an independent settlement
  flow. It does not ask players to choose a stake, invite a companion, or
  confirm a game asset before playing.

The anonymous card is ephemeral client state. Do not create a guest account,
fake agreement, or database record just to let someone play a card.

### Lightweight Game Settlement

Game play is separate from the signing ceremony above. The card is playable
without an account, room, stake, or agreement. Players may settle a real-life
彩头 outside Playbit; the product only offers a small result record and host
certificate after the game. A provider may separately issue one independent
equity coupon to one specified holder. Certificate sharing and settlement are
independent actions, and the holder does not need to revisit the game card.
Do not mint game assets before play or introduce a room lobby, room code, or
ready/start gate. `useGameFlow` owns card play and result recording;
`CreateBetScreen` owns signed contracts; direct settlement belongs to the
existing equity domain.

The current implementation still contains a legacy `/games` path that creates
`Agreement(source=card)` and a join flow. Treat that path as migration debt,
not as the target product contract. Do not extend it with more game stake
features until the result and direct settlement boundary is implemented and
the existing Coupon assumptions have been reviewed.

Contract invitation sharing is QR-first when a counterparty needs to sign, with
copy-link as a utility. Invitation cards may contain a QR code and use the OS
file share sheet where available. The user selects the app and recipient;
ordinary web pages cannot target a particular app with an image. Unsupported
browsers download the card for manual sending. Neither action claims delivery.
Game cards are not invitation cards: the host uses the card locally, while only
certificates and independent settlement links can be shared after play.

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
- No real-money custody, recharge, withdrawal, commerce, global ranking, seasons,
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
- Signed agreement states are `pending_signature -> active -> result_recorded ->
  fulfilled`; a result is a participant-submitted record, never a platform
  judgment. Formal agreements support `waived` when their original equity is
  waived.
- Contract initiators sign at creation and their visitor signs to join. Game
  cards have no confirmation gate, account requirement, coupon selection, room,
  or second participant state. The host may save a result and issue a
  certificate after play.
- A game card is ephemeral until the host saves a result/certificate or needs a
  recoverable history. The server freezes the L1/L2 content snapshot at that
  boundary. A provider may separately start a direct settlement for one
  specified holder; this does not create a game stake or a shared coupon.
- The host's game card is local to the host's play flow. There is no game-card
  share link, invitation, QR join, or participant page. Participants who never
  opened the card can still receive a certificate or an independent settlement
  link from the host/provider.
- Opening a share link as its initiator or an existing signatory resumes the
  Agreement instead of asking for another signature. A new signatory uses the
  account nickname; the signing request contains the saved/drawn mark and the
  revision actually reviewed. Draft edits also require the reviewed revision.
  Login continuation retains that revision; changed terms require a fresh confirmation.
- Contract creation carries a per-attempt request identity, just like game
  creation. Retrying the same payload does not create another Agreement.
- New stakes cannot supply fulfilled state or preconfirmed additions. Individual
  stake and boost labels remain bounded to 80 characters; the issued coupon can
  hold all four labels plus separators (323 characters).
- Each equity coupon links to one Agreement. Provider/holder actions derive
  from explicit user IDs, not array position or display text.
- Formal Agreement result recording and coupon issuance remain one contract
  transaction. Game result recording is a separate lightweight operation;
  optional direct settlement creates one independent coupon only after an
  explicit provider action. It never creates a shared coupon or a game stake.
- The result reporter, winner, provider, and holder are explicit fields. Do not
  infer them from who opened a screen.
- A settled agreement (`result_recorded`, `fulfilled`, or `waived`) is terminal
  history and cannot be deleted. Only an unsigned, unjoined, or active record
  may be removed by its initiator.
- A pending boost may be withdrawn by its proposer. Withdrawal removes the
  pending proposal and frees its slot; once both participants confirm it, the
  addition is part of the stake and cannot be withdrawn.

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
  without one. The former may offer host-entered result recording, scoring, and
  a certificate; none of these automatically creates an Agreement or Flip.
- Do not model or expose board-game motif taxonomies, AI rewrite prompts,
  progression systems, or an accept-before-play step.
- A card has its own play instructions and completion condition. If a result is
  saved, preserve the card and content versions in the result snapshot.
- Re-roll is available before choosing to play or upgrade. No silver-bullet
  inventory or mandatory multi-round structure in the current release.

## Frontend And Copy

- Use `docs/design-constitution.md` for product tone and `docs/visual-system.md`
  for homepage-validated rules, the component inventory and migration checklist.
  Shared product tokens and primitives are consumed by the homepage; future
  pages reuse them rather than copying homepage styles.

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

### Navigation

- In-app screens use one navigation stack. The Back action returns to the prior
  screen in the current visit; when no prior screen exists, it falls back to
  Home. The Home action always clears the stack and returns to Home.
- Authentication sheets do not add a screen. After authentication, continue the
  pending task in place; successful signing replaces the temporary invitation
  form so Back cannot reopen a completed step.
- Flow-specific exits may restore draft state or return to a captured origin
  (contract editing, certificate, flip), but must prune the stack to that same
  destination. They must not create a second, conflicting back path.
- Opening a page from a list or another feature records that source naturally.
  Direct invitation links start with Home as the fallback. Keep `share`, `game`,
  and `flip` query parameters as entry data, not as a substitute for screen
  history.

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
