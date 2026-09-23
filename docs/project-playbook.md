# Playbit Project Playbook

This document records the reusable product and engineering patterns agreed during
the project's discovery and implementation. It is a working constitution for
future changes, not a list of page-specific requirements.

## Product Core

Playbit adds a small rule, challenge, or agreement to something already
happening in real life. The phone provides the rule, signing, record, and
settlement; the real interaction happens outside the phone.

The smallest complete experience is:

`one challenge -> optional agreement upgrade -> shared signing -> result ->
equity issuance -> redemption -> archive`

The agreement domain is the common model for both manually created agreements
and card-started challenges. A card is not a separate product; it is a
lightweight way to start an agreement when the user has no existing one.

## Product Boundaries

- Life first, game second.
- In-session moments can include randomness, hidden information, and boosts.
- Out-of-session surfaces keep only records, permissions, assets, and sharing.
- No money custody, recharge, withdrawal, ranking, seasons, relationship spaces,
  or permanent progression in the MVP.
- Draw flow starts with the challenge. Signing is an optional upgrade when the
  participants want a formal record or an equity.
- Silver bullet is intentionally out of the current scope.
- A boost changes the current session only, requires the other participant's
  confirmation, and is limited to three per session.
- A confirmed boost is an amendment to the original equity, not a new asset.
  Store it under `stake.additions` for display and keep `boosts` as the
  in-session operation record.

## Domain Rules

### Identity

- A public share link can be viewed without an account.
- Creating an agreement, signing, settling, redeeming, and viewing personal
  history require a registered account.
- Do not create temporary accounts in the product flow.
- The logged-in nickname is the default signing name, and the user may override
  it per agreement.
- A hand-written signature is a call-sign credential, not a request for a legal
  real name. Persist the last signature and preload it next time.

### Participants

- The creator is the initiator and signs immediately.
- A share-link visitor becomes the counterparty only after signing.
- The initiator cannot sign their own counterparty link.
- After the counterparty signs, both sides must read the same `active` session
  state from the API.

### Equity Ownership

| Event | Provider | Holder | UI state |
| --- | --- | --- | --- |
| Before result | No asset | No asset | No coupon |
| Result settled with coupon | Participant who must provide it | Participant who earned it | Provider: pending fulfillment; holder: available for redemption |
| Holder redeems | Fulfillment completed | Redemption completed | Both sides: archived/closed |

The API stores one coupon per agreement. The client derives the user's
perspective from `holderUserId` and `issuerUserId`; it must not infer ownership
from array order or winner text.

If the agreement is boosted before settlement, the final coupon still remains
one record. Its display value is the base equity plus confirmed amendments.

## Frontend Patterns

- Mobile-first, mini-program-friendly composition.
- Use `LifeServiceHero`, `LifeActionBar`, `BaseButton`, `BaseField`,
  `BaseBadge`, `ContractDocument`, and `VoucherCard` before creating a new
  visual primitive.
- Keep page structure, tokens, controls, ticket styles, and service headers in
  shared styles. A theme change should be possible by changing tokens and
  shared primitives, not by rewriting every screen.
- Use the Vant interaction vocabulary for mobile sheets, empty states, and
  touch-friendly controls.
- Use one clear primary action per screen. Remove decorative tabs, redundant
  navigation, and feature descriptions that do not support the next action.
- Contract, settlement, and voucher pages must share the same document,
  typography, status colors, spacing, and action-bar language.
- The visual metaphor is an electronic signing service: agreement number,
  parties, signature, seal, status, equity credential, redemption, and archive.
  Humor belongs in the wording and small details, not in a playful shell.

## Copy And Internationalization

- User-facing text lives in `packages/content/src/index.ts`.
- Do not add display Chinese directly to Vue templates, API responses, or
  formatter output.
- Prefer neutral terms such as agreement, equity, provider, holder, result,
  redemption, and archive.
- Avoid gambling-oriented language in customer-facing copy.
- When a term changes, search the whole repository for the previous term,
  including tests and docs.

## Collaboration Loop

For any non-trivial change:

1. Read the repository patterns, routes, domain types, copy, and current git
   state.
2. Search for an existing component or mature external pattern before building.
3. Write the smallest domain state and permission matrix needed for the change.
4. Define observable acceptance checks before editing.
5. Implement the new path and remove obsolete paths in the same change.
6. Run type checks, focused tests, production build, and a mobile browser smoke
   check for user-facing work.
7. Review copy, responsive layout, loading/error states, route return behavior,
   and old terminology.
8. Convert repeated decisions into tokens, shared components, tests, or this
   playbook.

The user should provide product direction and constraints; implementation
details, mature patterns, edge cases, and verification belong to the coding
agent unless a product decision is genuinely ambiguous.

## Definition Of Done

- The main path works from a fresh account.
- Back navigation preserves entered data where the user expects it.
- Refreshing a contract reflects the other participant's latest state.
- Sharing provides Web Share where available and copy fallback everywhere.
- Every asset links back to its agreement and rule.
- Provider and holder see different actions for the same equity.
- No stale local session fallback competes with the API as a second source of
  truth.
- `pnpm check`, `pnpm test`, and `pnpm build` pass.
