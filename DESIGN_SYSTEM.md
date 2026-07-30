# Design System — Mazari Dahmani Portfolio

This documents the design system as it stands after the refinement
pass described in the "Design System Refinement" entry of
`FIGMA_QA.md`. It's a reference for maintaining consistency going
forward, not a new design — every value here already existed in the
shipped site; this file just names and organizes them.

## Design Tokens (`styles/main.css`, `:root`)

**Color** — surfaces (`--bg-page`, `--card-bg`, `--contact-bg`, etc.),
ink scale (`--ink-900` darkest → `--ink-300` lightest used for text),
line/border colors, and status colors (`--color-success`,
`--color-error`). `--white` and `--surface-media` were added this round
to replace literal `#fff`/`#f3f3f3` values that were repeated across
6+ separate rules.

**Typography** — three font families only: `--font-geist` (headings),
`--font-inter` (UI/body), `--font-figtree` (meta/secondary labels —
eyebrows, captions, timestamps). No other font is used anywhere.

**Radius** — 4 steps: `--r-pill` (40px, buttons/nav), `--r-lg` (18px,
cards/media), `--r-md` (12px, inputs/swatches), `--r-sm` (8px, tags).

**Shadow** — 2 steps: `--shadow-card` (resting) and
`--shadow-card-hover` (the single hover-elevation value shared by
every card type and every standalone button — verified in an earlier
round to be the literal same computed value across both).

**Spacing** — added this round: a named scale (`--space-1` through
`--space-20`) documenting the 4px-based progression already in
consistent use (4/8/12/16/20/24/32/40/48/56/64/80). A few values are
deliberately *not* part of the scale — 89px section padding, 7px/13px/
14px button and tag padding — because they're exact values sourced
from the original Figma file (see `FIGMA_QA.md`), and forcing them
into a "clean" scale would change the site's pixel fidelity to that
source. Scale tokens are documented for future work to reach for;
existing Figma-exact values were left as literals at their point of
use rather than retrofitted.

## Components

- **Buttons** (`.btn` + `.btn-dark` / `.btn-ghost` / `.btn-outline` /
  `.btn-light`): one shared base rule now owns the transition and the
  `:active`/`:disabled` states — previously only `.btn-light` had a
  `:disabled` rule, so `.btn-dark`/`.btn-ghost`/`.nav-cta` had no
  defined disabled appearance at all.
- **Cards** (`.exp-card`, `.cert-card`, `.proof-card`, `.case-card`,
  `.cs-card`): all share the same radius/shadow/background tokens;
  hover state (4px lift + `--shadow-card-hover`) is identical across
  every type.
- **Form controls** (`.field`): added this round — a proper per-field
  error state (`.field.has-error`, red border + inline message) that
  didn't exist before (only the aggregate success/error message under
  the whole form did). Wired to real-time clearing as the user
  corrects a field, not just on submit.
- **Navigation**: single floating pill component, consistent across
  all three pages, no variants.
- **Icons**: real brand/UI SVG and PNG assets throughout (see
  `FIGMA_QA.md` for provenance); consistent sizing per context (16px
  action icons, 18px meta icons, 20px nav/button icons, 32px social
  icons, 40px logos).
- **Modals**: none exist in the current product surface. Not adding a
  speculative modal component with zero usage — that would add
  unused CSS/complexity rather than remove it, which cuts against
  this round's own goal.

## States

- **Hover**: consistent lift + shadow language across every card and
  standalone button (shared token, not per-component values).
- **Focus**: global `:focus-visible` ring — fixed a real bug this
  round where the default ring color (`--ink-850`, near-black) was
  almost invisible against the dark contact panel (`--contact-bg`,
  also near-black); the panel now gets its own light-colored ring.
- **Active**: added this round — a subtle press feedback
  (`opacity: 0.85`) on the shared `.btn` base rule; previously no
  `:active` state existed anywhere in the stylesheet.
- **Disabled**: unified onto the shared `.btn` base rule (previously
  only one button variant had it defined).
- **Error**: previously only existed at the whole-form level (the
  status message under Send Message). Added real per-field error
  styling this round.

## Grid & Layout

Single content width (`--content-w: 960px`) via `.container-960`,
`.hero-guide`, and `.column-guide` — no competing layout system exists
anywhere in the codebase.

## Meridian reference comparison (real data, not general best practice)

Once Figma MCP access was restored, pulled real data from three parts
of the Meridian file rather than relying on general knowledge: its
Typography component set, the H1 heading's responsive breakpoint
variants, and the Select (dropdown) component with full light/dark/
disabled states. Findings, and what each one meant for this project:

- **Two-tier shadow system, validated.** Meridian defines `shadow/xs`
  (single soft layer, resting state) and `shadow/md` (two-layer,
  elevated state) as its only two elevation tokens. This project
  already has exactly that structure — `--shadow-card` /
  `--shadow-card-hover` — just under different names. No change made;
  this confirms the existing approach rather than replacing it.
- **Light/dark border treatment, validated.** Meridian uses a solid
  light-gray border in light mode and a low-opacity white border in
  dark mode (not the same color dimmed — an actually different
  approach per surface). This project already does the same thing:
  `--line-tag` (#ebebeb, light contexts) vs. `--line-contact`
  (`rgba(246,247,248,0.14)`, the dark contact panel). No change needed
  — already aligned before this comparison happened.
- **Hierarchical token naming** (`--text/sm/font-size`,
  `--spacing/2`, `--base/foreground`, etc.). A genuinely well-organized
  pattern, but adopting it here would mean renaming most of this
  project's existing custom properties throughout every stylesheet —
  pure churn with real regression risk and zero visual or functional
  benefit, given the current names (`--ink-900`, `--r-lg`, `--space-6`)
  already encode the same information just as clearly. Not adopted, for
  that reason specifically — not because the pattern is bad.
- **Explicit per-breakpoint heading variants**, validated against what
  this project already has: `.hero-heading` and `.section-heading`
  both already have real responsive font-size steps (checked directly
  in `main.css`'s media queries) — this was already in place, not a
  gap this comparison uncovered.
- **Disabled-state opacity**: Meridian uses 0.5, this project uses 0.6.
  Both are reasonable, standard values; kept the existing 0.6 rather
  than changing it to match, since there's no functional or
  accessibility reason to prefer one over the other and changing it
  would be an unrequested visual tweak.

Net result of this comparison: the refinement made two rounds ago
(tokens, missing states, the focus-ring accessibility fix) already had
the project fairly well aligned with how a system like Meridian
structures itself. This round's real-data comparison confirmed that
rather than surfacing major new gaps — which is itself a useful
outcome, not a null result.

## What this project intentionally does *not* adopt from Meridian

Per the explicit "don't redesign, refine only" instruction: no color,
font, spacing, radius, or shadow *value* from Meridian was pulled in —
only structural/systemic patterns were compared, and only where this
project already independently matched them. Meridian's own colors
(neutral grays, `#0a0a0a` near-black text) and its Geist-only font
system were not adopted; this project keeps its own Inter/Geist/
Figtree three-font system and its own ink/surface color palette
unchanged, since swapping either would change the site's visual
identity — exactly what was asked not to do.

