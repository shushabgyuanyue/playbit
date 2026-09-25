# Playbit Mobile Visual System

## Reference Translation

The bank-app references feel like products because they keep a stable service hierarchy: a recognizable blue home surface, compact page navigation, white content groups, dark navy primary text, quiet metadata, clear separators, and state colors used consistently.

Playbit adopts that hierarchy, not the banking content. Its home screen has only two primary actions: create an agreement and open a round. Contract, card, settlement, and history screens use the same restrained service-page structure. The product remains about play and shared moments, not financial management.

## Brand

Playbit is a formal clerk with a quiet sense of humor. It records small promises with commercial-grade care; the contrast belongs in the agreement language and the small details, not in a playful skin.

- Formal, calm, trustworthy, concise, mobile-native.
- A little surprising at meaningful moments: signing, recording a result, issuing an entitlement, closing a case.
- No dashboard sprawl, casino styling, childish decoration, glassmorphism, oversized marketing copy, or unrelated financial-service patterns.

## Tokens

All shared values live in `apps/web/src/styles/tokens.css`.

| Role | Token | Value |
| --- | --- | --- |
| Page background | `--pb-fill-page` | `#f4f6f8` |
| Surface | `--pb-fill-card` | `#ffffff` |
| Primary text | `--pb-text-1` | `#172b4d` |
| Secondary text | `--pb-text-2` | `#4b5b73` |
| Muted text | `--pb-text-3` | `#8491a3` |
| Brand / agreement | `--pb-blue` | `#1677ff` |
| Redeem / action | `--pb-red` | `#d94a4a` |
| Pending | `--pb-orange` | `#d99122` |
| Complete | `--pb-green` | `#008f6b` |
| Divider | `--pb-line` | `#e2e7ee` |

Typography is compact by default: 13px body, 14px controls and list titles, 16px section titles, 18px page titles, and 22px only for the home brand or contract heading. Numeric counts use `--pb-font-numeric`. Cards and controls use 4-6px radii; shadows are reserved for genuine overlays and physical artifacts, not ordinary content groups.

## Page Patterns

- Home: supplied hero artwork with account and agreement actions, four service shortcuts, a vertical announcement ticker, agreement counts, then three game recommendations (one tall left tile and two stacked right tiles). Keep these five sections compact and use soft surface colors instead of repeated outlined boxes.
- Service detail: one white sticky page bar with back/action controls, a light-gray canvas, and clearly separated white content groups.
- Agreement: a document-like paper surface with numbered clauses, bold/underlined user content, party signatures, and one restrained seal.
- Challenge: a clean, high-contrast rule card. The game feeling comes from the challenge itself and its state, not decorative card art.
- Entitlements: reuse the single-ticket component and status grouping. A ticket is one fulfillable item and links back to its agreement.
- Bottom actions: one obvious next action, with secondary actions visually quieter and safe-area aware.

## Interaction Feedback

- Every network-backed action has a visible pending state on the control that initiated it; do not show global loading for background polling.
- State changes are explicit and recoverable. Preserve current content while refreshing.
- Signing and closing may use a short seal impact. Respect `prefers-reduced-motion`.
- Press, focus, disabled, loading, empty, and error states use shared component styles.
- Touch targets are at least 44px where practical; narrow screens must not introduce horizontal page overflow.

## Maintenance Rules

- Customer-facing language is defined in `packages/content/src/index.ts`.
- Shared color, type, spacing, and radius values come from tokens; public controls and page structures live in shared styles/components.
- Add a shared component when multiple pages share behavior or structure. Keep genuinely one-off business details local, but do not copy a shared visual pattern into another page stylesheet.
- Before adding a UI dependency, check whether Vant, lucide-vue-next, and existing components already cover the interaction.
- Remove superseded components and styles after confirming they have no callers; do not retain a parallel legacy path for hypothetical compatibility.
- Homepage service icons use user-supplied bitmap artwork, cropped and optically normalized to 38px with 144px WebP assets. Keep the touch area larger than the artwork. Future expressive icons follow this asset workflow; back, close and other standard controls remain library vectors. Keep labels, badges and actions in code.
- Home uses blue, coral and restrained gold; no green accents. Prefer typography, useful numeric emphasis and softly graded surfaces over filler illustrations. Only the main game recommendation has a filled, light coral action; secondary game entries and quiet navigation use text with an arrow. Do not substitute generic decorative icons when suitable artwork is unavailable.
- Agreement counts use compact register-like cells: a pale label band above a clear number, with zero and closed counts muted. The voucher shortcut uses a small speech-bubble count of the current holder's unfinished entitlements, including zero; guests see a sign-in hint instead of a fabricated count.
- Announcements remain still for reading and move vertically over one second every 6.5 seconds. Pause while focused, hovered or the document is hidden; remove transition motion for reduced-motion preferences. Open the displayed article directly.
