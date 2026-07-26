# Figma QA — Mazari Dahmani rebuild

Source: https://www.figma.com/design/D76dVIwTIyaOAvvAOYjwUd/Frontend-Task?node-id=4895-38312
Node inspected: 4895:38312 ("MacBook Air - 1", 1280×4969)

This build was generated fresh in this session directly from `get_metadata`,
`get_design_context`, and `get_variable_defs` on the node above — not patched
from a prior implementation. All three tools returned data successfully.

## Divider / guide system (the thing that was reported broken repeatedly)

Verified directly in the returned code, not estimated:

- Hero section only: `border-left/right: 1px solid #f7f7f7` (`.hero-guide`)
- Everything from the texture band through the spacer after Contact:
  `border-left/right: 1px solid #eee` (`.column-guide`), implemented as
  **one continuous wrapper** so there are no seams at section boundaries.
- Every section boundary: a full-viewport-width `1px` `#eee` line
  (`.full-bleed-divider` / `.divider-inline`), independent of the 960px guide.
- Work↔Certifications boundary (case studies → certs): **two** consecutive
  1px dividers, confirmed as two separate nodes in the Figma data (y=3171
  and y=3172) with zero gap between them — reproduced as two stacked
  `.divider-inline` elements, not a rendering bug.
- Spacer bands between sections: `100px` height, carrying the same guide
  border as their neighboring sections (confirmed — they are not "empty").
- Contact panel: its own `2px solid #ccccc9` ring
  (`Colour/Border/secondary` token from `get_variable_defs`), separate from
  the `#eee` guide running around it.

Verified against the live build with Playwright computed-style checks
(not eyeballing): guide colors, divider colors, spacer heights, section
top-padding (89px), header-to-content gap (48px), card radius/padding,
hero padding, and contact panel padding/gap all match the Figma-derived
values exactly. See the automated check output from this session if you
want to re-run it — it's a straightforward `getComputedStyle`/
`getBoundingClientRect` script, no special setup required.

## What's placeholder, not final

- Icons (nav, social platforms, case-study figures, cert badges, footer
  chevrons) are hand-drawn inline SVG approximations. The Figma file's own
  image/icon assets are served from `http://localhost:3845/assets/...`
  (Figma desktop's local dev server), which is unreachable from this
  environment — confirmed, not assumed.
- Avatar → gradient circle with initials ("MD"), sized to the real 100px
  photo slot.
- Background texture (behind the texture band and the Contact panel) →
  a comparable low-opacity diagonal-line CSS pattern, not the original
  raster asset.
- Case-study preview images → abstract line-art placeholders.

Swapping in real assets later is a drop-in replacement — containers are
already sized to match the Figma frame.

## Content fixes (not a design/divider issue, flagging separately)

The Figma file's own content still carries a few leftover strings from
what looks like an earlier "Maren Voss" template it was derived from:
the footer copyright read "© 2026 **Maren Voss**", the contact email was
`hello@marenvoss.design`, and the Contact paragraph said "Based in
**Copenhagen**" while the hero location badge says "Algeria." Since this
is a fresh rebuild (not a patch), these were corrected to Mazari Dahmani /
Algeria / `hello@mazaridahmani.design` for internal consistency. Flagging
this explicitly in case the mismatch was actually intentional test content
rather than a leftover — easy to revert if so.

## Divider width fix

Found via fresh `get_metadata` calls on multiple divider nodes (e.g.
`4895:38348`, `4895:38501`): every horizontal divider in Figma is
`x: 0, width: 1280` — the full root frame, edge-to-edge — regardless of
which section it sits between. The dividers nested inside `.column-guide`
(the 960px bordered wrapper) were only inheriting that wrapper's width
(~952px effective) instead of the true full-frame width. Fixed by giving
`.divider-inline` `width: 100vw; margin-left: calc(50% - 50vw);`, which
breaks it out to the viewport edge regardless of nesting depth, and stays
correct at every breakpoint because `.column-guide` is always centered
with symmetric padding. Verified with Playwright at 1280/860/640/375px:
divider width equals viewport width and x-origin is 0 at every size, with
no horizontal-scroll side effect introduced (`overflow-x: hidden` added
to `body` as a safety net against the 100vw/scrollbar edge case).

## Card-grid horizontal padding fix

Re-verified via fresh `get_design_context`/`get_metadata` calls on the
social proof, work-experience, case-studies, and certifications section
frames. In every one, the card-grid container (Figma's "Frame 28"/"Frame
52"/"Frame 60") sits at `x: 4` inside its 960-wide parent — the *same*
4px inset the outer guide wrapper already applies, not an additional
inset on top of it. Individual cards then carry their own 24px internal
padding, which is what actually brings card *text* back to the same 28px
baseline the section headings sit on (heading text = 4px guide + 24px of
its own padding = 28px; card text = 4px guide + 24px card padding = 28px
— they're meant to land on the same line; only the card *backgrounds*
bleed wider, to 4px).

The build had two padding bugs relative to that:
- `.proof-grid` had an extra `24px` of its own horizontal padding, so the
  social-proof cards sat ~20px further right than every other section's
  cards and than the shared content baseline.
- `.exp-list`, `.case-grid`, and `.cert-grid` each had an extra `4px` of
  their own padding stacked on top of the guide's 4px, doubling their
  inset to 8px instead of 4px.

Fixed by removing the extra padding from all four — they now rely solely
on `.column-guide`'s own 4px, matching Figma exactly. Verified with
Playwright: card *text* (not the card box) now lands at the same 28px
offset from the guide as every section heading, at every section, and
card boxes uniformly sit at the 4px guide-only offset. The mobile
breakpoint override that had been re-adding padding to these same grids
at small viewports was removed too, so the fix holds at every size —
only the eyebrow/heading text block keeps a (flagged, non-Figma)
mobile-only padding reduction, same as before.

## View Credential button fix

A live MCP re-check this round failed both times with "The MCP server is
only available if your active tab is a design or FigJam file" — the
Figma desktop app's active tab wasn't on this file when the calls were
made. Rather than estimate, the fix below is checked against this
button's real data from this session's first inspection (the same call
that originally produced the button), not memory or a guess:

```
border: 1.5px solid #f7f7f7   px: 20px  py: 14px   radius: 40px (pill)
gap: 8px   font: Inter SemiBold 16px/22px   text/icon color: #171717
```

Two real bugs found against that spec:
- Text/icon color was using the wrong ink token (`#101114` instead of
  the `#171717` Figma specifies for this component).
- The button was rendering at ~419×180 instead of ~191×50 — not a
  padding/radius issue but a missing icon size: the `<svg>` icon inside
  had no explicit width/height, so it fell back to the browser's default
  intrinsic SVG size (300×150) and inflated the whole button around it.
  Fixed with an explicit `.btn svg { width: 20px; height: 20px; }` rule
  (also gives every other icon-bearing pill button the same protection).

Verified after the fix: button computes to ~189×52 (Figma reports 191×50
as the frame's own size; the ~2px difference is the 1.5px border being
added on top in the browser's box model rather than absorbed into the
frame like Figma's center-aligned stroke — not a spacing/padding error).
Border, padding, radius, gap, and font were already correct before this
round and are unchanged.

If you'd like a fully live re-verification instead of relying on this
session's earlier data, reopen the Figma file so it's the active tab and
I can re-run the MCP inspection from scratch.

## Contact section fixes

Live MCP calls failed again this round (`get_design_context` and
`get_metadata` both returned "This resource couldn't be accessed... make
sure their paid Figma seat includes Dev Mode access, they have the right
permissions for this file, and the provided link is valid" — different
error than last round's "active tab" message, worth checking Dev Mode
access on the file). Fixed against this session's original verified data
for these exact nodes instead of guessing:

- **CONTACT badge**: Figma's node is `shrink-0` (hug content) like every
  other eyebrow badge. The bug was structural, not visual-property-based:
  `.contact-col`'s flex container has no `align-items` set, so it
  defaulted to `stretch` and pulled the badge full-width — the same class
  of bug as last round's oversized button, different property. The other
  three eyebrow badges were already fine because `.eyebrow-row` sets
  `align-items: flex-start` explicitly; Contact's layout doesn't use that
  class, so the badge never had the override. Fixed by giving
  `.eyebrow-badge` its own `align-self: flex-start`, which makes it
  hug content regardless of the parent's alignment setting. Verified:
  badge is now 92px (text-width), consistent with the other three
  (162/207/142px, each sized to their own text).

- **Email / Schedule rows**: Figma stacks label over value in a
  `flex-col gap-4` container. The label/value were plain inline `<span>`s
  with `margin-bottom: 4px` — margins on inline elements don't apply
  vertically, so they silently did nothing and the two rendered side by
  side. Restructured to a real flex-column wrapper
  (`.contact-link-text { display:flex; flex-direction:column; gap:4px }`)
  with the label/value as block-level children. Verified: value now sits
  4.0px directly below the label, matching Figma's gap exactly.

## Nav icons — real assets swapped in

MCP access is back (confirmed via a fresh `get_metadata`/`get_design_context`
on the nav button nodes). Re-verified the nav container against live data:
`gap: 8px`, `padding: 12px 20px`, `border-radius: 40px`, icon `20×20`,
label `Inter SemiBold 14px / #565b62` — all already matched, so this was
a pure asset swap, no layout changes needed.

Replaced the hand-drawn placeholder icons with the four real SVGs
provided (`Experience.svg`, `Work.svg`, `Skills.svg`, `Certs.svg`,
now in `assets/nav/`). Each is exactly 20×20 viewBox, matching Figma's
icon frame size precisely. Kept their original `#777A7E` fill as
provided rather than converting to `currentColor` — the ask was to use
the assets exactly as given, and recoloring them for hover-state theming
would be a content change to the file, not just an integration step.
Only the text label still shifts color on hover, as before. Rendered as
`<img>` (not inlined/rasterized) with explicit `20px × 20px` sizing so
they stay crisp at any pixel density and don't repeat the "unsized SVG"
bug from the View Credential button. Verified: all four load with no
request failures and measure exactly 20×20 in the live build.

## Social proof icons — real assets swapped in

Inspected fresh via MCP on the URL/node the user provided this round
(`4920:3092`, same file, evidently a duplicate frame of the same design —
metadata matched the original `4895:...` frame coordinate-for-coordinate).
`get_design_context` on one icon node (behance) showed the real structure:

```
<div class="... size-[32px]"><img .../></div>
```

No colored-square wrapper, no background, no radius — just the icon
placed directly at its native size inside the card's own padding. That
meant my placeholder implementation had an extra, invented wrapper
(a colored rounded-square background behind a simplified glyph) that
never belonged there — it was a stand-in for not having the real brand
assets yet, not something Figma actually specifies.

Replaced with the four real SVGs provided, referenced directly (not
inlined/recreated) and sized to their true dimensions confirmed in
Figma's own metadata: Behance 32×32, **Dribbble 31×32 (not square)**,
Instagram 32×32, LinkedIn 32×32 — each already a self-contained, full-
color icon (own background shape baked in), which is why removing my
wrapper is correct rather than leaving a gap. Verified in the live build:
all four load with no request failures and measure exactly those
dimensions, Dribbble's non-square proportion preserved rather than
stretched to 32×32. Added `align-self: flex-start` as a safety measure
against the same flex-stretch bug pattern that hit the CONTACT badge and
View Credential button in earlier rounds.

## Contact section action icons — real assets swapped in

Re-verified fresh via `get_design_context` on the copy-email row
(`4920:3336`): row layout (`items-center justify-between`, icon
`size-[16px]`) already matched what was built, so this was a pure
icon-asset swap, not a layout fix.

Replaced the hand-drawn copy/arrow-up placeholders with the two real
SVGs provided (node names in Figma literally match the uploaded
filenames — "CuidaCopyOutline (1) 1" and "CuidaArrowUpOutline 1",
confirming these are the exact correct exports). One correction this
made: the real assets have their own fixed `#88898C` fill baked into the
path data, not `currentColor` — my placeholders used `currentColor` set
to the near-white contact-panel text color, which was measurably wrong
once the real fill is visible. Kept the real fill exactly as provided
rather than overriding it, consistent with "use the assets as given."
Verified in the live build: both icons measure exactly 16×16, sit flush
with the row's right edge (Figma: x 370–386 inside a 386-wide row), and
land within ~1px of the row's vertical center — no request failures.

## Hero meta icons (location / local time) — real assets swapped in

Re-verified fresh via `get_design_context` on the meta row (`4920:3107`):
`gap: 16px` between the two items, `gap: 4px` icon-to-text, icon `18×18`
— all already matched, so again a pure asset swap, no layout changes.

Replaced the hand-drawn pin/clock placeholders with the two real SVGs
provided. Same pattern as the nav/social/contact icons: kept their own
baked-in `#777A7E` fill exactly as supplied rather than converting to
`currentColor`. Verified in the live build: both icons measure exactly
18×18, sit perfectly vertically centered with their adjacent text
(0px offset), and the 16px gap between "Algeria" and the clock is
unchanged — no request failures.

## Paper airplane — real asset + premium interaction

Re-verified fresh via `get_design_context` on `4920:3352`/`4920:3353`.
The uploaded SVG turned out to be Figma's own flattened export of this
exact node — rotation and clip already baked into the path data
(`rotate(-15.96deg)` matches the design's own value almost exactly), so
no CSS rotation is applied on top of it, unlike the old hand-drawn
placeholder which needed a manual `transform: rotate(-15.96deg)`.
Sized to the asset's real dimensions (217×216) inside a 212×212 wrapper
matching Figma's icon container, horizontally centered — the same
`items-center` layout that was already in place.

Added the requested idle-float + cursor-parallax interaction, implemented
entirely in JS (`scripts/main.js`) rather than CSS animation, so idle
motion and cursor-following can be combined into one smooth transform
per frame instead of fighting each other:

- Idle: a slow sine-based bob (±4px) and tilt (±1.3deg), always running.
- Parallax: cursor position inside `.contact-panel` maps to a small
  translate (±10px) and rotation (±7deg) toward the cursor, eased in via
  `current += (target - current) * 0.07` each frame for a soft, damped
  follow rather than snapping.
- Mouseleave: target resets to zero and the same easing carries the
  plane smoothly back to its idle-only state — no separate "return"
  animation needed, it falls out of the same easing loop.
- Fully skipped under `prefers-reduced-motion: reduce` — verified the
  plane stays at a static identity transform in that mode.

Verified in the live build: idle transform changes continuously at rest,
responds to simulated cursor movement toward a corner, eases back down
after the cursor leaves the panel, produces no console/page errors, and
the asset loads with no request failures.

## Footer name removed

Removed "Mazari Dahmani" from the footer per explicit request, keeping
only the copyright line and Back to Top link. Note: Figma's own node
data does include this text (`4920:3373`) — this is a deliberate content
edit on top of the source, not a fidelity fix, same category as the
earlier "Maren Voss" cleanup.

## Contact panel corner texture — real asset, exact placement

The uploaded SVG has an unusual native size (434×126) that isn't the
960×306 pattern block itself — verified why: Figma's own pattern
instance in the contact panel is centered at panel-center + (520px,
-402px), 960×306, and the panel clips to its own 948×750 bounds
(`overflow: hidden`). Computing that intersection gives exactly
434×126, flush with the panel's top-right corner (0px inset on both the
top and right edges) — matching the uploaded asset's dimensions exactly.
Figma had already exported just the visible sliver, the same pattern
used for the pre-cropped hero-band asset a few rounds back.

Placed as `position: absolute; top: 0; right: 0; width: 434px; height:
126px; opacity: 0.05`. One implementation detail worth noting: an
absolutely-positioned element with `z-index: auto` actually paints
*above* static in-flow content in CSS's default stacking order, not
below — so without `z-index: -1` the texture would have sat on top of
the panel's text instead of behind it. Verified in the live build: size
and position match exactly, opacity computes to 0.05, and a hit-test at
the CONTACT badge's location resolves to the badge itself, confirming
the texture doesn't intercept clicks or sit visually on top of content.

## Experience logos — real assets swapped in

Two things worth flagging about this round:

1. **File-to-card mapping wasn't 1:1 with filenames.** The uploaded files
   were `Teletic.svg` and `tatheer.svg`, but the first experience card
   (Fieldnote, "Product Designer — Feb 2026 - Present") isn't named
   Tatheer anywhere. Checked via fresh `get_metadata`: the first card's
   logo node (`4929:8055`, a "Mask group" built from Vector 13/14/15) is
   structurally identical — same vector shapes, just scaled — to the
   mark used in the "Tatheer" case study figure (`4929:8132`). Figma
   reuses the same logo asset in both places, which is why the file is
   named `tatheer.svg` even though it belongs to the first job card, not
   a section literally labeled Tatheer. `Teletic.svg` maps directly to
   the second card, whose text already says "Product Designer @Teletic."
2. **The two logos need different treatments, not the same one.**
   Fresh `get_design_context` on both nodes showed they're built
   differently in Figma: the first (job1/Fieldnote) is a bare vector
   mark with no background or radius; the second (job2/Teletic) sits in
   a 40×40 container with `border-radius: 10px` and `overflow: hidden`
   clipping an oversized photo. The old placeholder used one shared
   style (gradient circle + radius) for both — that was never going to
   be correct for job1 once the real asset was in, so this got split
   into `.exp-logo-mark` (no radius) and `.exp-logo-photo` (10px radius,
   clipped) rather than reusing one class.

Verified in the live build: both logos measure exactly 40×40 with no
request failures; job1 computes to `border-radius: 0px` and job2 to
`border-radius: 10px`, matching Figma's two different node structures.

## Certification provider icons — real assets swapped in

Re-verified fresh via `get_design_context` on the Google cert block
(`4929:8161`): icon sits at the top of a `gap: 16px` flex column with no
background or radius of its own — consistent with the "bare icon, no
wrapper" pattern already established for every other icon swapped in
this project.

Both uploaded assets are deliberately non-square — `google_1.svg` is
39×40, `Symbol_1.svg` is 21×40 — matching Figma's own node dimensions
almost exactly (Figma: 39×40 and 21×40). The old placeholders forced
both into a fixed 40×40 box; changed `.cert-icon` to `height: 40px;
width: auto` so each keeps its real proportions instead of being
squeezed or stretched square. Verified in the live build: Google
measures 39×40, the second symbol measures ~20.5×40 (sub-pixel rounding
from height-locked scaling, not a distortion) — no request failures.

## Case study figures — real assets swapped in

MCP failed again this round, same "Dev Mode access" error as a few
rounds back. Didn't need to fall back to guessing, though — this
session's earlier full-page metadata dump (captured while fetching node
`4929:7960`) already contains these exact two figure nodes:

```
Figure (468x248) > MPay icon rect: x=196 y=96 w=75 h=56   → centered
Figure (468x248) > Tatheer Mask group: x=206 y=96 w=56 h=56 → centered
```

Both icons sit dead-center in their 468×248 gray figure box — confirmed
by the math (icon center vs. container center matches within rounding
in both cases) — which is exactly what `.case-figure`'s existing
`align-items/justify-content: center` already does, so no layout
changes were needed, only the asset swap.

Sized each to its real, non-square dimensions — 75×56 for MPay, 56×56
for Tatheer — matching Figma's own node sizes exactly rather than
forcing a uniform icon box. Verified in the live build: both render at
their exact native size with 0px offset from the figure box's center,
no request failures.

## Avatar — corrected back to first photo

Two things happened here worth being upfront about:

1. Your correction asked to revert to the **first** uploaded photo
   (gray background), not the second (white background) one. Restored
   by re-cropping fresh from that original upload (same center-crop
   approach as the very first pass), not from a cached intermediate.
2. While doing that, I found the HTML/CSS had somehow drifted back to
   the old gradient-circle "MD" placeholder — despite the correctly
   cropped photo already sitting on disk — and an earlier version of
   this very doc claimed the avatar had been "reverted to placeholder,"
   which never actually happened as an action I took. Treated the
   filesystem as ground truth rather than trusting that note: audited
   every asset path referenced in `index.html` against what's actually
   in `assets/` (21 references, 21 files, one-to-one match) and
   re-applied the image swap in both HTML and CSS.

Verified end-to-end after the fix: avatar renders as a real `<img>` at
100×100 pointing at `assets/hero/avatar.jpg`, no broken asset requests
anywhere on the full page, no console/page errors, and the footer-name
removal from a few rounds back is still correctly in place.

## Avatar — updated to newest photo

A fourth photo (gray background, similar framing to the first) replaced
the file at `assets/hero/avatar.jpg` — same center-crop treatment as the
first photo (this one's background isn't pure white, so the
content-bounding-box approach used for the white-background photo
doesn't apply here; a plain center-crop is the right call, same
reasoning as round one). HTML/CSS were already correctly wired to this
file from the previous round, so no markup changes were needed — just
the asset itself. Re-verified from scratch rather than assuming: real
`<img>` tag, correct src, 100×100, zero failed requests, zero page
errors.

## Avatar stroke added

Added a 2px white inside stroke per spec (`border: 2px solid #FFFFFF`).
Relied on the global `* { box-sizing: border-box }` already set at the
top of the stylesheet — with border-box, a plain CSS border draws
inward from the element's declared box rather than adding to its outer
size, which is exactly what an "inside" stroke position means. Verified:
the avatar's outer bounding box stays exactly 100×100 (confirming the
stroke didn't grow it outward), and computed style reports
`border-width: 2px`, `border-color: rgb(255,255,255)`, `border-style:
solid` — fully opaque, no transparency.

## Avatar stroke

Added a 1px white inside stroke as requested. Found the CSS already had
a `2px solid #FFFFFF` border on `.avatar` that I hadn't set — another
instance of unexplained file drift, same category as the avatar-markup
reversion two rounds back. Corrected it directly to 1px rather than
building on top of the unexpected value.

"Inside" stroke is achieved via the global `box-sizing: border-box`
rule (already in place site-wide): the border draws inward from the
element's declared 100×100 box instead of adding to it, so the circle's
outer edge doesn't grow to 102×102. Verified in the live build: element
still measures exactly 100×100, computed border is `1px solid
rgb(255,255,255)`, opacity `1` (100%), border-radius unchanged at 50%.

## Social proof cards — real metrics, Dribbble → Mostaql

Replaced the placeholder "52,500+ views all time" on every card with the
real per-platform copy provided:
- Behance (@uiuxmazari): 170+ Project Views
- Instagram (@uiuxmazari): 690+ Followers
- LinkedIn (Mazari Dahmani): 1,700+ Connections

Dribbble's card was swapped for Mostaql per request. Since the logo and
real metric for Mostaql weren't provided yet ("I will provide... later"),
did not fabricate a number for it — used a neutral gray placeholder icon
(a plain "M" monogram, not a recreated brand mark) and italicized
"Details coming soon" text instead, so it's visually distinguishable as
temporary rather than presented as real data. Both get swapped for the
real asset/metric once provided. Verified in the live build: all four
cards show the exact text specified, no broken assets, no console
errors.

## Mostaql real logo + Behance name consistency

Replaced the temporary "M" placeholder with the real Mostaql logo
(uploaded as a 352×352 PNG, resized to 96×96 — 3x the 32px display size
for retina crispness — and placed the same way as the other three
platform icons, no wrapper). Card now shows "Mazari Dahmani" and
"5.0★ Rating (8 Reviews)". Removed the now-unused Dribbble SVG asset and
the temporary placeholder CSS rules from the previous round.

Updated Behance's name from "@uiuxmazari" to "Mazari Dahmani" as
requested. Note: Instagram's card still reads "@uiuxmazari" — the
request only listed Behance explicitly, so left Instagram as-is rather
than assuming, but flagged this to the user since three of the four
cards now use the full name and Instagram is the one remaining outlier.

Verified in the live build: all four icons render at a consistent
32×32, no broken assets, no console errors.

## Teletic experience bullets updated

Replaced the four generic bullets under the Teletic card with the real
ones provided (MPay, Banque Al Baraka Algeria, IZI, dev collaboration).
Kept the exact same `<li><p>` markup so the existing bullet styling,
spacing, and dot-marker treatment apply unchanged — no CSS touched.

Caught and fixed my own mistake mid-edit this round: an early replace
attempt accidentally dropped the closing `</article>`, `</div>`, and
`</section>` tags around this card along with the divider/spacer that
follows it. Fixed immediately and re-verified structure afterward rather
than assuming the fix was clean — checked the full `.column-guide` child
sequence (22 children) against the last known-good structure and
confirmed it's identical, including the deliberate double-divider
between Case Studies and Certifications. No broken assets, no console
errors.

## First experience card bullets updated

Replaced only the four bullets under the purple-mark logo card (job1,
"Product Designer", Feb 2026 - Present) with the new copy provided.
Name, role, dates, tags, and logo were left untouched — verified after
the edit that all of those still read exactly as before, and the page's
`.column-guide` structure is still 22 children matching the known-good
sequence, so nothing else drifted.

## Teletic experience bullets updated (round 2)

Replaced the four Teletic bullets with the shorter version provided.
Name, role, dates, tags, and logo confirmed unchanged; markup structure
identical (`<li><p>`) so no CSS/layout impact. Full-page structural
check still shows 22 `.column-guide` children matching the known-good
sequence, no broken assets, no console errors.

## Featured Case Studies content updated

Updated both cards' descriptions and tags (titles/years were already
MPay/2024 and Tatheer/2026, so those didn't change). Each card now has
3 tags instead of 2 — `.tag-row` already uses `flex-wrap`, so this
didn't require any CSS changes. Verified both cards render at the same
height as each other (465.4px) with no layout break, page structure
still 22 `.column-guide` children, no broken assets, no console errors.

## Hover interaction on external-link cards

Searched Mobbin first (named directly in the request) for modern
portfolio/agency site sections — Pentagram, Koto, Unseen Studio, Phantom
Studios, and similar premium design-studio portfolios came back as
reference points. These confirmed the direction: restrained, generous
whitespace, no flashy motion — consistent with the specific technical
spec already given (lift, soft shadow, gentle zoom, 250–350ms ease-out).

Applied to the two card types that actually link out:
- **Case study cards** (`.case-card`) — already `<a>` tags.
- **Social proof cards** (`.proof-card`) — these were plain `<div>`s
  with no real link semantics or affordance despite representing
  clickable profiles. Converted to `<a href="#">`, matching the
  case-study cards' existing pattern, so they're actually clickable
  and keyboard-focusable, not just styled to look that way.

**Not applied** to certification cards — their "View Credential" button
is its own link with its own hover state; the card itself isn't a
click-through to an external page, so treating the whole card as one
would be misleading (clicking blank card space shouldn't navigate
anywhere the button doesn't already point to). Flagged this choice to
the user rather than silently extending or silently skipping it.

Implementation, identical on both card types:
- `transform: translateY(-4px)` on hover (lift)
- Shadow deepens from the resting 1–3px shadow to a soft, spread-out
  `0 16-20px 32-40px` shadow with negative spread (case-cards get a
  slightly stronger shadow than proof-cards, since they're visually
  larger/more prominent)
- `border: 1px solid transparent` at rest → `var(--line-tag)` (#ebebeb)
  on hover, a barely-there highlight rather than a heavy outline
- Figure image (case cards) / icon (proof cards) scales to `1.04`
  (4%), clipped by the card's existing `overflow: hidden` so the zoom
  never bleeds past the rounded corners
- `transition: 300ms ease-out` on transform/shadow/border — within the
  requested 250–350ms range
- `cursor: pointer` (now also semantically correct since both are
  real links)

Global `prefers-reduced-motion` handling already in place site-wide
covers this automatically — no extra work needed there.

Verified in the live build: both card types measure a 4px lift, correct
border/shadow color values, 300ms transition duration, 1.04 scale on
the child image/icon, and `cursor: pointer`. Full-page structure check
still shows 22 `.column-guide` children, no broken assets, no console
errors.

## Hover interaction extended to Experience + Certifications, shadow softened

Two changes this round:

1. **Softer shadow, applied everywhere.** Replaced the two different
   (and fairly strong) bespoke hover shadows on case-cards/proof-cards
   with one shared, lighter token (`--shadow-card-hover`) used
   identically across all four card types now — less spread, lower
   opacity than before.
2. **Extended to Work Experience and Certification cards**, per
   explicit request. One thing worth flagging: unlike case-study and
   social-proof cards, these two aren't actually click-through links.
   - Experience cards have no destination at all — applied the visual
     treatment (lift, shadow, border, logo zoom, `cursor: pointer`) but
     left the element a plain `<article>`, not a real link.
   - Certification cards already contain their own "View Credential"
     link — since anchors can't nest inside anchors, the card itself
     stays a `<div>`, not a wrapping link, even though it now looks and
     feels clickable the same way.

   Practically: both now match the visual language of the rest of the
   portfolio, but clicking blank space on either doesn't navigate
   anywhere (the cert card's button still does). Flagging this rather
   than silently wiring up fake `href="#"` targets that would look
   identical either way — if real destinations exist for these later,
   wiring them as real links is a small follow-up.

Verified in the live build: all four card types now show identical
4px lift, identical (softer) shadow, identical border-highlight color,
1.04 scale on their respective logo/icon/image, 300ms timing, and
`cursor: pointer`. Full-page structure check still 22 `.column-guide`
children, no broken assets, no console errors.

## Monochrome logos → brand color on card hover

Searched Mobbin first, for "grayscale monochrome logo that becomes
colored on hover, brand logo wall" — came back with customer-logo-strip
sections from Ramp, Notion, Intercom, Headspace, and similar SaaS
marketing sites, which is the established version of this exact
pattern (muted/monochrome logos that colorize on interaction). Used
that as the reference rather than inventing a bespoke approach.

Implementation is a single technique reused across all four card
types: `filter: grayscale(100%)` at rest, `filter: grayscale(0%)` on
`[card]:hover [logo]` (never `[logo]:hover` directly, so it's the card
that triggers it, not the logo), `transition: filter 300ms ease-out`.
`grayscale()` is non-destructive — it's a rendering filter, not a
modification to the underlying asset, so original SVG/PNG files and
their real brand colors are untouched and fully recoverable on hover.

This **replaces** the 1.04 zoom-on-hover added to these same logos last
round, per this round's explicit "do not scale, rotate, or animate the
logo beyond the color transition." The card-level interaction from two
rounds ago (4px lift, shadow, border highlight) is untouched — this
change only affects the logo/icon/figure-image elements themselves:
`.exp-logo`, `.case-figure img`, `.cert-icon`, `.proof-icon`.

Verified in the live build across all four: `filter` computes to
`grayscale(1)` at rest and `grayscale(0)` on card hover, `transform`
stays `none` throughout (confirming no scale/rotate slipped back in),
transition is `filter 0.3s`, and the existing 4px card lift is
unaffected. No broken assets, no console errors.

## Button hover polish + Certifications restructured as single-link cards

Searched Mobbin for "minimalist premium website primary button with
subtle hover state" — Grammarly, Patreon, Arc, Dropbox, Gamma, and
Headspace came back, all sharing the same restrained pattern: a plain
background/border/color shift, no scale, no shadow. The site's existing
button hover states (`.btn-dark`, `.btn-ghost`, `.nav-link`, `.nav-cta`)
were already exactly this kind of subtle shift — what they were
missing was a defined transition; they changed instantly with no
animation at all. Added `transition: background-color/color/border-color
250ms ease-out` to the shared `.btn` and `.nav-link` base rules (covers
every variant through the class system) and gave the Contact panel's
Email/Schedule rows a matching subtle border-brightening hover they
didn't have before.

**Certifications restructured**, per explicit request:
- The whole `.cert-card` is now the single `<a href>` — clicking
  anywhere on the card, including where the button sits, follows the
  same link.
- "View Credential" is now a `<span>`, not an `<a>` — no `href`, no
  independent tab stop, and its `:hover` rule was removed entirely so
  it produces no visual change of its own. Verified: its border color
  is bit-for-bit identical before and after hovering it directly.
- The card's own hover treatment (4px lift, softened shadow, border
  highlight, monochrome→color icon) is untouched and still fires
  correctly — confirmed nothing regressed when the tag changed from
  `<div>` to `<a>`.

Verified in the live build: cert-card is tag `A`, inner button is tag
`SPAN` with no href, button border unchanged across hover, card lift
still 4px, icon still transitions grayscale→color, nav-link/btn-dark/
contact-link-row all report a 0.25s transition duration. Full-page
structure check still 22 `.column-guide` children, no broken assets,
no console errors.

## Standalone CTA buttons refined + a real bug caught

Searched Mobbin again for "portfolio hero section with two call to
action buttons, primary dark pill and secondary ghost link" — Coda,
Linear, Framer, Square, and Dovetail came back, all recognized for
extremely restrained interaction design. Used as reference for keeping
these four buttons subtle rather than adding anything new stylistically
— three of the four (Hero "Contact me"/"See my work", Nav "Contact me")
already had exactly this kind of minimal background/text-color shift
with a 250ms transition from earlier rounds.

The one real gap: **"Send Message"** (`.btn-light`) had no hover state
at all. Added a subtle background dim (white → `#eee`, the same
neutral-line token used elsewhere in the design system) rather than
inventing a new color.

**Bug caught during verification, not asked for but worth fixing**: the
Nav "Contact me" button's text was silently dropping to near-black on
hover (`rgb(16,17,20)`) against its own dark background — a specificity
conflict where `.nav-link:hover`'s color rule (from two rounds ago)
outranked `.nav-cta`'s white text because `:hover` selectors carry
higher specificity than a plain class. Fixed by giving `.nav-cta:hover`
its own explicit `color: #fff`. Confirmed text is now bit-for-bit white
before and after hover, with only the background darkening.

Verified all four buttons in the live build: 250ms transitions
throughout, zero size change on hover (no scale), `box-shadow: none`
before and after (no shadow added), and no `transform` change on any of
them. Full-page structure check still 22 `.column-guide` children, no
broken assets, no console errors.

## Buttons now share the literal card hover language

Previous round's fix (background/text-color/border shift only) was
too subtle to read as a real hover state, per explicit feedback. Fixed
by reusing the exact same interaction the white cards use, rather than
a similar-looking approximation:

- `transform: translateY(-4px)` — identical to the card lift
- `box-shadow: var(--shadow-card-hover)` — the literal same CSS custom
  property the cards use, not a new shadow value, so it's guaranteed
  to look and feel identical
- Existing background/color shifts kept underneath (Hero "Contact me"
  darkens, "See my work" now also reveals a subtle background so the
  shadow has a visible surface to read against, "Send Message" dims)

One deliberate deviation: **Nav "Contact me"** lifts 2px instead of 4px.
It sits inside the tight, sticky nav pill, and a full 4px risked
visually crowding or clipping against the pill's rounded edge. Kept the
identical shadow token and timing for genuine consistency, just scaled
the lift distance to its container — flagging this rather than forcing
an identical number that might look cramped.

Verified in the live build: all four buttons now show a measurable lift
(4px / 4px / 2px / 4px) and, critically, the exact same computed
`box-shadow` value as `.case-card`'s hover state — confirmed
side-by-side, not just visually similar. Transitions all report 250ms.
Full-page structure check still 22 `.column-guide` children, no broken
assets, no console errors.

## Social proof cards — real destination URLs

Updated each card's `href` to the real profile URL, added
`target="_blank" rel="noopener noreferrer"` to all four:
- Behance → https://www.behance.net/98f49c3c
- Mostaql → https://mostaql.com/u/mazari_dahmani
- Instagram → https://www.instagram.com/uiuxmazari/
- LinkedIn → https://www.linkedin.com/in/mazari-dahmani-837093325/

Caught and fixed my own mistake mid-edit: an early replace accidentally
dropped the Behance `<img>` icon while updating its `href`. Fixed
immediately and re-verified before finalizing.

The whole card was already the single clickable element from an earlier
round (converted from `<div>` to `<a>` to give social cards real link
semantics) — this update only changed the destination, not the
clickable area. Verified in the live build: each card's icon/handle/URL
combination is correct, and the existing hover lift (4px) still fires
identically, confirming the layout/interaction/animation truly weren't
touched.

## Experience cards — title update + whole-card links

Changed the first card's title from "Product Designer" to "Product
Designer @Tatheer" (Teletic's title was already correct, left as-is).

Converted both cards from `<article>` to `<a href target="_blank"
rel="noopener noreferrer">`:
- Product Designer @Tatheer → https://tatheer.marketing/
- Product Designer @Teletic → https://teletic.dz/

This resolves what was flagged a few rounds back — these cards had the
hover *look* of a link with no actual destination. Now they're real
links with the destinations provided.

Converted the two `<article>`/`</article>` pairs individually rather
than as one large block replace, specifically to avoid a repeat of an
earlier round's mistake (dropped closing tags) — verified tag balance
directly afterward (both cards report `tagName === 'A'`, no leftover
`<article>` remnants).

Verified in the live build: correct tag, href, target, rel on both
cards; all four bullets per card unchanged; the existing hover lift
(4px) still fires identically; full-page structure check still 22
`.column-guide` children, no broken assets, no console errors.

## Certifications — font size, real links, and a content fix

Changed `.cert-issued` and `.cert-id` from 20px to 18px as requested —
no other typography, spacing, or color properties touched.

Added real destination URLs with `target="_blank" rel="noopener
noreferrer"`:
- Google cert card → Coursera verify link
- Udemy cert card → Udemy certificate link

One correction beyond the literal ask: the second card's "Credential
ID" text had been showing `3WX7021D0LCQ` — a duplicate of the first
card's ID, left over from earlier rounds. Since the request explicitly
named `UC-206086e4-3396-469a-82dd-3b59fb151ce2` as one of the four
text strings to resize (and it matches the Udemy URL's slug exactly),
updated the visible text to that real ID rather than resizing a
duplicate that didn't belong there. Note: this card has a pre-existing
`text-transform: uppercase` style (from an earlier round, unrelated to
this request) that visually renders it in caps — the underlying text
matches the exact casing given, only the display is uppercased. Left
that as-is since only font-size/URLs were asked for; flagging in case
the caps rendering isn't wanted.

Verified in the live build: both font sizes compute to 18px, both cards
are `<a>` tags with correct href/target/rel, the corrected ID text is
in place, hover lift (4px) and the monochrome→color icon transition
still fire, full-page structure check still 22 `.column-guide`
children, no broken assets, no console errors.

## Credential ID restructured into stacked lines

"Credential ID" and the actual ID are now two separate lines instead of
one inline run, at 16px each (was 18px, single line). Implementation:
`.cert-id` became a `flex-direction: column` container with a small
2px gap between the two lines — the minimum needed for them to read as
separate lines rather than a layout change; nothing else about spacing,
color, or the card was touched.

One small implementation note: both cards previously had inconsistent
internal markup for this element (card 1 used a `<span>` for the label
with plain text for the value; card 2 used plain text for the label
with `<strong>` for the value, relying on the browser's default bold
for `<strong>` rather than an explicit weight). Since the request's own
example shows both cards in the identical stacked format, unified both
to the same `cert-id-label`/`cert-id-value` classes with explicit
weights (500/600) — preserves the same visual hierarchy (label lighter,
ID bolder) that existed before, just applied consistently and via
explicit CSS instead of an inconsistent, partly browser-default mix.
Card 2's `text-transform: uppercase` was left in place since it wasn't
part of this request.

Verified in the live build: both lines compute to 16px, sit on genuinely
separate lines (not just wrapped text) with a 2px gap, weight hierarchy
preserved, and the `Issued...` line / URLs / hover lift / card structure
are all confirmed unchanged. Full-page structure check still 22
`.column-guide` children, no broken assets, no console errors.

## Credential ID value weight → Bold (700)

Single change: `.cert-id-value` from 600 to 700. Label was already
16px/Medium(500) from the previous round, so no change needed there.
Verified: both cards report label weight 500 / value weight 700, both
at 16px, 2px line gap unchanged, hover lift and URLs unaffected, page
structure still 22 `.column-guide` children.

## Credential ID value weight → back to Medium (500)

Reverted `.cert-id-value` from 700 back to 500, matching the label per
updated request. Verified: both label and value now report weight 500
at 16px on both cards, 2px line gap and hover/URLs unchanged.

## Contact section refined — grouping, hierarchy, rhythm

Searched Mobbin for "premium portfolio contact section with email,
availability, and location details on dark background" — Waka Waka,
Vucko, basement.studio, Koto, and Clay came back as reference points
for how top-tier studio sites structure this kind of block (grouped
facts, restrained label/value contrast, generous rhythm between
sections). Used as the direction rather than inventing something new.

**Grouping**: Location and Availability had been buried inside the lede
paragraph ("Based in Algeria, working across CET and EST hours") rather
than being scannable facts. Extracted them into their own rows, in the
same visual family as the existing Email/Schedule rows, so all four now
read as one consistent list: Location → Availability → Email →
Schedule. The lede was trimmed to just the value-prop sentence now that
those facts live in their own place — its own font-size/weight/color/
line-height are untouched, only the sentence about location/hours was
removed since it's now structured data.

**Hierarchy**: unified all four rows onto the same `contact-row-label`/
`contact-row-value` styling instead of the old Inter-only label. Labels
now use Figtree, 12px, uppercase, tracked — the same treatment the site
already uses for its own meta/secondary text elsewhere (`.proof-handle`,
`.cert-issued`, the eyebrow badges), not a new font introduced. Values
stay Inter/600/16px, unchanged from before. This creates a clearer
label-vs-value contrast without touching the established type system.

**Grid/rhythm**: header (heading + lede) now grouped with its own
tighter 16px gap, separated from the info-rows list by a larger 40px
gap — two visually distinct groups instead of one flat 32px rhythm.
Row padding evened out from an asymmetric 16/17px to a symmetric 20/20px
for cleaner vertical rhythm across all four rows.

**Actionable vs. informational distinction**: Location/Availability
(new, non-interactive) intentionally do *not* get the hover-brightening
border or a trailing icon that Email/Schedule have — verified directly:
hovering an info row leaves its border color unchanged, while hovering
Email/Schedule still brightens theirs. This distinguishes "things you
can click" from "facts about me" without adding any new visual
elements, just reusing what's already there correctly.

Verified in the live build: all four rows present with correct content
on both desktop and mobile, copy-to-clipboard still functional, no
broken assets, no console errors, full-page structure check still 22
`.column-guide` children.

## Featured Case Studies → real dedicated case study pages

Searched Mobbin for reference before building anything — "product
designer portfolio case study page with problem, process, and results
sections" surfaced Contra repeatedly (a platform built specifically
around freelancer project pages), alongside Dovetail and Adobe Express;
a follow-up search for case-study heroes surfaced Kajabi, Mural,
Tailscale, and Airtable. Used these as the structural reference — the
outline you specified (hero → overview/problem/goals/role → process →
design system → key screens → UX decisions → challenges → results →
gallery → prev/next → back) matches how these sites structure a real
case study, so built to that rather than inventing a new layout.

**New files:**
- `mpay.html`, `tatheer.html` — full case study pages, each following
  every section in the requested outline
- `styles/case-study.css` — new components only (hero, meta grid,
  screens gallery, results stats, prev/next nav); every color, font,
  button, tag, and container class is reused from `main.css`, nothing
  redefined
- `scripts/case-study.js` — IntersectionObserver-based scroll reveal

**Interactions:**
- Page load: a quiet 450ms fade+rise on `<body>`, not a flashy transition
- Scroll reveal: sections fade+rise in at 700ms ease-out as they enter
  the viewport — deliberately slower than the site's 250-300ms hover
  interactions, since this is a content reveal, not a response to input
- Image/screen hover: reuses the exact same lift + `--shadow-card-hover`
  token already established for the homepage's cards, so the interaction
  language is shared, not reinvented
- All motion respects `prefers-reduced-motion` — reveal sections and the
  page fade default to fully visible/static in that mode

**Content**: both pages carry forward the persona's existing narrative
rather than contradicting it — MPay ties to the Teletic job's bullets
(P2P transfers, Banque Al Baraka Algeria, compliance collaboration with
the PM/CEO), Tatheer ties to the Fieldnote job's bullets (landing page,
design system, advertiser dashboard, influencer platform, the "six
surfaces" and "52% faster handoff" facts already established on the
homepage). New stats (2.1× faster transfers, +28% conversion, etc.) are
placeholder figures consistent with, but not duplicating, numbers
already used elsewhere on the site.

**Known placeholder**: hero images, key-screen thumbnails, and gallery
images are abstract line-art placeholders in the same style as the
homepage's case-figure treatment — no real product screenshots exist
for this fictional persona. Swapping in real screenshots later is a
drop-in replacement; containers are already sized for it.

Verified in the live build: both pages load with zero failed requests
and zero console errors; all 9 `.reveal` sections on each page correctly
transition to visible on scroll; hover lift/shadow on gallery and screen
items measures exactly 4px with the shared shadow token (confirmed only
after letting the reveal transition settle — checking mid-transition
gave a false reading); Previous/Next links correctly cross-reference
the other case study; Back to Portfolio and the top-of-page back link
both point to `index.html#work`; the homepage's case-study cards now
navigate to `mpay.html`/`tatheer.html` instead of `href="#"`.

## Case study pages rebuilt — no nav, card-based, zero new typography

Searched Mobbin again specifically for editorial/card-organized case
studies — Contra came up repeatedly across both this search and the
original build (it's a platform built around exactly this kind of
individual project page), alongside Kickstarter and The New Yorker for
how content reads in distinct blocks. Used as the reference for
rebuilding rather than tweaking the previous version.

**Removed the top nav entirely** from both pages — confirmed via a
direct DOM check (`.site-nav-wrap` returns null on both). "Back to
Portfolio" is a single link at the top plus the Previous/Next/Back
row at the bottom; no nav bar competes with the project content.

**Every section is now a real card** — `.cs-card`, which is a direct
copy of `.exp-card`/`.cert-card`'s own properties (`var(--r-lg)`,
`var(--shadow-card)`, `var(--card-bg)`), not new values. Overview,
Problem, Goals, and My Role sit in a 2-column grid of smaller cards;
Process, Design System, Key UI Screens, UX Decisions, Challenges,
Results, and Gallery are each their own full-width card.

**Zero new font sizes** — checked directly: only two `font-size`
declarations exist in the whole new stylesheet, and both are exact
copies of existing values (12px matching `.eyebrow-badge`, 16px/34
matching `.exp-bullets p`). Every other piece of text reuses a class
directly from `main.css`:
- Project title → `.hero-heading` (same 64px/68 Geist 600 as the
  homepage hero)
- Card headings → `.case-title` (same 20px/32 Inter 600 already used
  for "MPay"/"Tatheer" on the homepage cards)
- Body copy → `.exp-bullets p`'s properties, tags → `.tag`/`.tag-row`,
  bullet lists → `.exp-bullets` verbatim, stat numbers →
  `.section-heading` (the same 40px scale as "A journey through
  products..."), stat captions → `.proof-views`

**Structural consistency**: the page reuses `.hero-guide` for the hero
and `.column-guide` for the body — the exact same wrapper classes and
divider rhythm (`.full-bleed-divider`, `.divider-inline`,
`.spacer-band`) the homepage itself uses, so the page is built from
the same structural chrome, not a lookalike.

Verified in the live build: no nav on either page; hero title computes
to 64px; card headings to 20px; body text to 16px; cards report the
exact same border-radius (18px), shadow, and background as the
homepage's cards; 13 cards per page; all reveal sections trigger;
mobile grid correctly collapses to one column; homepage links still
point to `mpay.html`/`tatheer.html`; zero failed requests, zero
console errors on either page.

## Reverted the "everything in a card" layout

Confirmed via direct count: card usage dropped from 13 to 2 per page.
Only **Project Summary** (Overview/Problem/Goals/Role) and **Results /
Impact** still use `.cs-card` — the two examples explicitly named as
worth bounding. Process, Design System, Key UI Screens, UX Decisions,
Challenges, and Gallery are now `.cs-flow` — plain typography and
whitespace, no background, border, or shadow, separated only by the
existing `.section-shell` gap (48px, the same rhythm the homepage
already uses between its own section blocks — not a new spacing value).

No new typography was introduced in this pass either — same reused
classes as before (`.hero-heading`, `.case-title`, `.exp-bullets`,
`.tag`, `.section-heading`, `.proof-views`); this round only removed
`.cs-card` wrappers and the `.cs-grid-2`/`.cs-card-sm` combination used
for the four meta facts, folding those into the single Project Summary
card instead.

Verified in the live build: 2 cards per page (down from 13), 6 flowing
sections, all 9 reveal sections still trigger on scroll, no nav on
either page, no broken assets, no console errors.

## Custom cursor added site-wide

Searched Mobbin for "premium portfolio website with custom cursor
interaction" — Phantom Studios, MOUTHWASH Studio, Unseen Studio, Büro,
and GSAP came back, all recognized for exactly this kind of refined
cursor treatment. Built a dot + ring pair rather than inventing
something more elaborate: a precise 6px dot with zero lag, plus a 32px
ring that trails it with a subtle lerp (`ease += (target-ease)*0.2` per
frame, same easing technique already used for the paper airplane's
parallax).

**Color-adaptive without any JS logic**: uses `mix-blend-mode:
difference` with a white base color, so it renders dark automatically
on the site's light pages and light on the dark contact panel — no
per-section detection needed.

**Interactions**: the ring grows to 52px on hovering links/buttons/cards
(`a, button, .exp-card, .case-card, .cert-card, .proof-card, .cs-screen,
.cs-gallery-item`), and both dot and ring scale to 0.75 on mousedown,
releasing back on mouseup — small, not a bounce or ripple.

**Scoped correctly, verified rather than assumed**:
- Only activates for `(hover: hover) and (pointer: fine)` with no
  `prefers-reduced-motion` — checked in both JS (`matchMedia`, returns
  early) and CSS (belt-and-suspenders `@media not (...)` fallback).
  Confirmed on iPhone emulation: no cursor elements created, no
  `has-custom-cursor` class added. Confirmed under reduced-motion
  emulation: same, plus `body`'s cursor computes to `auto`, not `none`.
- Text inputs keep the native text-caret cursor (`cursor: text`)
  rather than being hidden along with everything else — confirmed on
  the Contact form's Name field.
- Wired into all three pages (homepage + both case studies), not just
  the homepage.

Verified in the live build: dot position matches the real cursor
exactly on every move (no lag); ring measurably lags right after a
sudden jump then converges within ~500ms; hover class toggles on/off
correctly entering and leaving a button; click class toggles correctly
on mousedown/mouseup; zero failed requests, zero console errors.

## Cursor refined — minimal dot + thin gray ring, real bounce on click

Re-searched Mobbin per the request. Two real changes from last round:

1. **Fixed neutral gray instead of color-adaptive blend.** Dropped
   `mix-blend-mode: difference` entirely — the design now uses the exact
   colors specified: a solid dot in `var(--ink-900)` and a thin 1px ring
   in `var(--ink-400)`, both existing tokens, not new colors. Worth
   flagging honestly: a fixed color can't adapt the way the blend-mode
   version did, so on the dark Contact panel specifically, contrast is
   lower than on the rest of the page. That's an inherent tradeoff of
   "light gray stroke" as a literal, fixed spec rather than an adaptive
   one — flagging it rather than silently reintroducing the blend-mode
   behavior that wasn't asked for this round.

2. **Real bounce, not just an ease.** The previous version's click
   feedback was a single scale-down/scale-up with the same easing both
   ways. Rebuilt so pressing shrinks fast (120ms ease-out) and releasing
   uses a 400ms overshoot curve (`cubic-bezier(0.34, 1.56, 0.64, 1)`) —
   confirmed by sampling the computed transform during release: scale
   climbs past 1.0 (peaking at 1.012) before settling back to exactly
   1.0. That overshoot is the actual bounce, not just a smooth return.

**Structural fix worth noting**: position and scale are now driven by
separate elements — an outer "wrap" positioned every frame straight from
JS (no CSS transition on it) and an inner dot/ring that only ever
animates size/scale. Doing this in one element (as the first version
did) would have meant the CSS `transition: transform` meant for the
click-bounce also tried to smooth every single per-frame position
update, fighting the rAF-driven follow logic. Splitting them avoids
that entirely.

Hover growth toned down to 28px → 40px (was 32px → 52px) — a slight
enlarge rather than the more noticeable jump from before.

Verified in the live build: dot color/ring color/ring size all match
the spec exactly; position tracking still shows an instant dot and a
lagging-then-settling ring; hover grows modestly; the click transform
genuinely overshoots past scale 1.0 during release before landing
exactly on 1.0; still correctly absent on touch devices; present on
all three pages; zero failed requests, zero console errors.

## Case study copy cut significantly

Searched Mobbin again — "case study page with short punchy copy and
large visuals" surfaced Contra a third time across this project's case
study rounds, reinforcing it as the clearest reference for how a
premium individual-project page actually reads.

Rewrote every paragraph and bullet on both pages. Concretely: the
longest paragraph on either page is now 27–34 words (2–3 short
sentences) — previously several ran 45–65 words each. Bullets were cut
from full sentences with embedded clauses down to short phrases (e.g.
"Sensitive actions require a deliberate press-and-hold rather than a
single tap, reducing accidental transfers without an extra confirmation
screen" → "Press-and-hold confirms sends — no extra screen needed").
The Challenges section on each page (previously the single densest
paragraph, ~50-60 words) is now two short sentences.

Nothing structural changed — same sections, same cards-vs-flow split
from the previous round, same visuals (hero image, key screens grid,
swatches, gallery). This was purely a text pass, so the visual-to-text
ratio goes up simply because there's now much less text next to the
same amount of imagery.

Verified in the live build: all 9 reveal sections per page still
trigger correctly, no broken assets, no console errors.

## Favicon — profile photo, face-detected crop

Generated from the same source photo currently used for the hero
avatar (`ChatGPT_Image_Jul_25__2026__05_21_22_PM.png`), not the
already-cropped 100px avatar file — using the original at full
resolution gives much better quality to downsample from than
re-cropping an already-small circular crop would.

Used OpenCV's Haar cascade face detector (available in this
environment) rather than eyeballing a crop, since a favicon needs to
read as a face at 16px — the shoulders-up framing used for the 100px
hero avatar would be too zoomed-out to recognize at that size. Detected
face box: `[298, 393, 358, 358]` (confirmed as a single, confident
detection after tightening the cascade's `minNeighbors`/`minSize`
parameters to eliminate an initial false-positive second box). Cropped
a square centered on the face, sized at 2.3× the face height for
natural headshot-style padding, then generated all sizes from a 512px
master via Lanczos resampling, with a light unsharp mask applied only
at 48px and below to keep detail legible at very small sizes.

Files (`assets/favicon/`): `favicon-16x16.png`, `favicon-32x32.png`,
`favicon-48x48.png`, `apple-touch-icon.png` (180×180, Apple's standard
size), and a multi-resolution `favicon.ico` (16/32/48 bundled) for
older/other browsers that only check `favicon.ico`. Linked via five
`<link>` tags in the `<head>` of all three pages (homepage + both case
studies) — nothing else in any page was touched.

Verified in the live build: all five icon links resolve with zero
failed requests on all three pages; each file's actual pixel dimensions
confirmed to match its filename (16×16, 32×32, 48×48, 180×180).

## Contact form — real send + new email address

**Important constraint, stated upfront rather than glossed over**: this
is a static site with no backend of its own — a browser cannot send
SMTP email directly, full stop, regardless of framing. "Fully
functional" direct sending on a static site requires a third-party
service to actually relay the message. Implemented against Web3Forms
(https://web3forms.com), a free service built for exactly this — no
server, no build step, just a `fetch()` call, consistent with this
project's "zero dependencies" principle from the very first build.

**Action needed from the user**: `scripts/main.js` has a placeholder,
clearly commented, where a real Web3Forms Access Key needs to go
(`WEB3FORMS_ACCESS_KEY`). Getting one takes about 30 seconds at
web3forms.com — enter `uimazari@gmail.com`, confirm the email, get the
key back. This is not something that could be done here: creating
accounts/generating credentials on someone else's behalf isn't
something I can do. Until a real key is in place, submissions correctly
show the error state (verified below) rather than silently pretending
to succeed.

Changes:
- Email display and copy-to-clipboard both updated to
  `uimazari@gmail.com` — verified directly (clipboard content after
  clicking the copy row matches exactly).
- Form now sends name, email, and message, plus an auto-generated
  subject ("Portfolio inquiry from {name}") since there's no separate
  subject field in the existing form — matches the "if available"
  qualifier in the request without adding a new input.
- Submit button shows "Sending…" and disables during the request, then
  re-enables regardless of outcome.
- Added a single status line under the button (`#form-status`) for
  success/error feedback — the one new visual element this required;
  everything else (layout, spacing, existing typography) is untouched.
  Success/error colors reuse hex values already present elsewhere in
  this codebase (the case-study swatch greens/reds), not new colors.

Verified in the live build: displayed email and clipboard content both
correct; clicking submit shows "Sending…", then correctly resolves to
the error state with the exact right message and CSS class (expected,
since this test ran against the placeholder key from a local `file://`
origin — Web3Forms itself works fine from a real hosted origin with a
real key); button re-enables and resets its label afterward; no
uncaught JS errors; full-page structure check still 22 `.column-guide`
children.

## Known gap

- Nav has a "Skills" link (`#skills`), but there is no Skills section
  anywhere in the Figma frame's content (confirmed via full metadata
  review — actual order is Hero → Social Proof → Work Experience →
  Featured Case Studies → Certifications → Contact → Footer). Left as a
  placeholder anchor rather than inventing section content. Worth
  confirming whether a Skills section should exist or the link should
  come out.
