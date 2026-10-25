# statespace: design system and screen specs (v2)

**Status:** the v2 design system, component specs and screen specs, for authoring and build. Every ID comes from `docs/spine/SPINE.md` (revision 2). **Date:** 2026-10-23 (machine clock). **Review:** awaits the owner. The owner decisions it builds on were reviewed on 2026-10-25 (DECISIONS.md, section 1): OD-6 and OD-10 changed, the rest accepted.

**What this file governs.** It implements the spine's Look (§0), stamps (§8.7–§8.8), interface (§10) and the visual change V2-33, and it specifies all 24 screens of spine §10.1 at phone (360 px) and desktop (1280 px) widths. Where the spine is silent, this file decides and says so. Where it believes the spine is wrong, it says so in **Spine issues** at the end.

**Precedence.** (1) the roadmap; (2) executed runs (`research/spikes/RESULTS.md`, `research/evidence/`); (3) the v2 brief; (4) the digests; (5) reports and adversarial reviews, chiefly the design review A7; (6) kernelspace, for its learning engine only; (7) the v1 design (`docs/history/v1/DESIGN-v1.md`) and the v1 canvas (`design/canvas/`), for history only.

**Tags.** `[X RUN-id]` an executed run on disk; `{{run:RUN-id}}` a run that must be recorded before the sentence ships; `[D]` design rationale, or a value computed for this file; evidence grades **A–D** follow the pedagogy digest (A meta-analysis or several RCTs; B one good similar experiment; C small, correlational or preprint; D rationale). Citation keys in brackets (`[cbm]`, `[kulik90]`) resolve in BRIEF §9.

**Computed values.** Every contrast ratio, luminance ratio and color-difference figure in §2 was computed for this file on 2026-10-23 from the token values printed here: WCAG 2.2 relative luminance for contrast; CIELAB ΔE76 (D65) for color difference; the Machado, Oliveira and Fernandes (2009) severity-1.0 matrices, applied in linear RGB, for color-vision simulation. They are design facts about these hex values, tagged `[D]`, and GATE-a11y and GATE-stamps recompute them on every build. They agree with the design review's own measurements wherever the two overlap (A7 appendix).

**Wireframes are schematic.** A wireframe shows field shapes and order. Its values are slots (‹n›, ‹verdict›, ‹sha›) unless a value carries a run reference. Nothing in a wireframe may be copied into learner copy without its run reference (GATE-numbers).

---

## 0. The design on one screen

| Decision | v2 choice | Section |
|---|---|---|
| Identity | a drafting table: vellum sheets, graphite line work, title blocks filled from runs, assurance stamps | §1 |
| Not this | no stone plinth and no elevation drawing; nothing of kernelspace's dark navy-and-mint terminal; no game chrome | §1.3 |
| Themes | light (vellum) and a validated graphite night; neither has navy, mint, glow or shadow | §2 |
| Color | semantic only: stamp hues live in stamps and strips (plus the two vermilion line styles); progress is drawn in ink | §2.1 |
| Type | Archivo for structure, Source Serif 4 for reading, JuliaMono for code, logic and inline math; self-hosted subsets; ASCII TLA+ by default | §3 |
| Lines | solid is structure, dashed is assumed, dotted is bounded, heavy vermilion is a witnessed violation, a vermilion zig-zag is an erosion crack; nothing else is dashed or dotted | §4 |
| Stamps | `WORD [code] · qualifier`; nine words, nine codes, nine frames that separate in grayscale; the qualifier is required and as large as the word | §5 |
| Claims | a three-segment strip (proposition-of-model · correspondence · requirement-fit); requirement-fit is never [P]; EROSION is an event drawn as a crack, never a stamp | §5.6–§5.7 |
| Calls | guess · think so · sure, with bands, chance and payoffs printed; payoffs are feedback only; the first call is final | §6.2 |
| Motion | spent only on change: goal diffs, trace scrubs, crack propagation; static +/− marks under reduced motion | §9 |
| Access | WCAG 2.2 AA at 360, 320 and 1280 px; traces as tables; a keyboard path through every instrument; spoken names for stamps and notation | §10 |
| Voice | precise and unhurried; no lock copy, loss framing, daily counters or bare "verified"; every tool number is a run | §11 |
| v1 canvas | history; §12 lists what v2 changes, sheet by sheet | §12 |

---

## 1. Identity: the drafting table

### 1.1 Why a drafting table

Formal methods is careful, written, slow work: definitions, derivations, counterexamples kept under glass, guarantees signed for a stated scope. An engineering drawing already has the two devices this course needs. Its **title block** says what was drawn, when, at what revision, at what scale and who checked it. Its **stamp** is a signed scope of responsibility. statespace uses both for its subject: every result says what was checked, by which checker at which version, within which bound, and on whose machine. The design review found this light-mode identity "strong and right for the subject" (A7, verdict in brief).

### 1.2 Signature elements

| Element | What it is | Where |
|---|---|---|
| Vellum and sheets | a pale vellum ground; content sits on sheets framed by 1.5-px graphite rules; corner radius at most 2 px | every screen |
| Graphite line work | structure is drawn with lines, not boxed with shadows; five line styles, one meaning each | §4 |
| Title blocks filled from runs | a six-field provenance block (Project, Sheet, Drawn, Rev, Scale, Checked by), filled from runs and receipts and never typed by hand | §6.1 |
| Stamps | a word plus a bracketed code plus a required qualifier, in a frame whose shape alone tells the nine stamps apart | §5 |
| Specimen labels | museum labels for counterexamples, generated from the run that found them | §6.5 |
| Dimension lines | ranges (plan hours, Wilson intervals, bounds) drawn as dimension lines with end ticks, so an interval looks like an interval | §6.12, SCR-week |
| The ordered path | the ten stages as nodes on one drawn route, mirrored by a list | §6.14, SCR-stages |
| The crack | the only drawn event: a vermilion zig-zag along a strip segment or a rests-on edge | §5.7 |
| Revision marks | a numbered triangle (△1) beside a line that an erratum changed, linking to SCR-changes | §6.15 |

### 1.3 What it is not

- **No stone plinth.** There is no elevation drawing, no stages stacked as masonry, no plinth top that "your application stands on", and no widths that encode nothing. The brief retired the metaphor because the word collides with other uses and the elevation drew a tower that read as a lock (A7-14; review digest R17). "Plinth" survives only in the roadmap's toy-language names, Mini-Plinth and `miniplinth check` (OD-2). Home is Today for return visits and an ordered path of stages with a list mirror (spine §0).
- **Not kernelspace.** kernelspace is dark-only: navy surfaces, a mint accent, a terminal aesthetic. statespace inherits kernelspace's learning engine and nothing of its look (spine §0). The table below is about look only.

  | | kernelspace | statespace |
  |---|---|---|
  | Default theme | dark only | light (vellum); a neutral graphite night on request or by system setting |
  | Ground | navy (surface `#18212F`) | vellum `#F1F3EF`; night `#121412`, a near-neutral graphite |
  | Accent | mint (hue 154°), which also marks the learner's own components | none; color belongs to stamps; links are verdigris in light and ink in night |
  | Aesthetic | a mint-and-cyan terminal | a drawing: Archivo labels, serif reading text, monospace only for code and logic; hairlines and frames, no shadows, gradients or glow |
  | Status | — | ink: words, node shapes, counts with intervals |

- **Not a game.** No XP, badges, levels, streak flames, confetti, leaderboards or daily counters. Expected rewards undermine motivation and mastery gating cuts completion (A [deci99][kulik90]); BRIEF §3.3 lists what is never built.
- **Not a hacker terminal.** Code sits on paper inside instrument cells. The interface itself speaks in plain words.

### 1.4 Wordmark and mark

- **Wordmark:** `statespace`, lowercase, Archivo 700 at width 118%, set in a single-rule title-block cell.
- **Mark:** `S′` in JuliaMono, ink, inside a 2-px graphite square: the next state, the object every claim in the course is about (spine §0). It is not a stamp and uses no stamp hue. The logic-glyph brand the design review proposed (⊢) is rejected with the glyph stamps, because ⊢ is what Lean prints before every open goal (review digest R11).
- **Favicon:** the mark, ink on vellum; in night, ink on graphite.

### 1.5 The rules the interface enforces

These four rules carry over from v1, rewritten for v2's vocabulary.

1. **Every result wears its status.** Nothing says "correct", "verified" or "safe" without a stamp and its qualifier (GATE-codes).
2. **Counterexamples are specimens.** A failed check is mounted, labeled from its run and kept beside its fix.
3. **Call it before you run it.** First runs of authored cells and generated items open with a committed call; free runs never wait (I5).
4. **The checker is not the requirement.** A kernel or solver establishes the formal proposition. Whether that proposition is the requirement is a separate segment of every claim, and it is never [P] (roadmap rule 4).

---

## 2. Tokens

### 2.1 Token rules

1. **Color is semantic.** The only saturated colors are stamp hues. Nothing is colored for decoration.
2. **Hue scope.** Stamp hues appear only inside stamps (`.stamp`) and claim strips (`.strip`), plus the two vermilion line styles the line language defines, witnessed violation (`.line-violation`) and erosion crack (`.line-crack`). GATE-stamps checks that allowlist (spine §10.2, §11.2).
3. **Progress is ink.** Signed off, settled, in progress, counts, calibration, the path and the Mirror are drawn in ink and pencil. They never borrow a stamp hue or a stamp frame (V2-02, A7-02).
4. **Verdigris marks links and "you are here", in light only.** Links are always underlined, because verdigris against ink is 2.37:1 and fails color-only distinction (WCAG 1.4.1). "You are here" is the pointer glyph ▸, drawn in verdigris, so it never depends on color. Night has no verdigris: links are ink and underlined, and the pointer is ink.
5. **Meaningful boundaries use the component rule** (at least 3:1, WCAG 1.4.11): inputs, buttons, focusable cells, trace cells. Hairlines are decorative only and never the sole boundary of a control.
6. **No shadows, gradients, glow, blur or translucency.** The one pattern is the [?] hatch, and it means nothing else (§4.2).
7. **Primary buttons are ink,** never a stamp hue (v1 painted its Run button in PROVED blue).

### 2.2 Light theme: vellum

| Token | Value | Role | Contrast [D] |
|---|---|---|---|
| `--ground` | `#F1F3EF` | vellum ground | — |
| `--sheet` | `#FAFBF8` | sheets, cards, stamps without a fill | — |
| `--paper` | `#FFFFFF` | code areas, instrument bodies, trace tables | — |
| `--ink` | `#1C211E` | primary text, structure lines, primary buttons, focus ring | 14.63 on ground · 15.73 on sheet · 16.33 on paper |
| `--pencil` | `#4A534D` | secondary text, labels, captions, [N] | 7.14 on ground · 7.67 on sheet · 7.97 on paper |
| `--rule` | `#7A837B` | component boundaries (non-text) | 3.51 on ground · 3.77 on sheet · 3.92 on paper |
| `--rule-hair` | `#C9CFC6` | decorative hairlines only | 1.53 on sheet (decorative; never a sole boundary) |
| `--rule-soft` | `#DDE2DA` | decorative dividers inside a framed component | decorative |
| `--link`, `--here` | `#0E6655` | underlined links; the ▸ pointer | 6.17 on ground · 6.63 on sheet · 6.88 on paper; 2.37 against ink |
| `--band` | `#E8ECE5` | the shared-state band in traces | ink 13.66 · pencil 6.66 on band |
| `--focus` | ink, 2 px, with a 2-px ground offset | focus ring | 14.63 against ground |

### 2.3 Night theme: graphite night

The night ground, sheet, ink and pencil are the design review's validated values (A7-20; spine §10.2). The remaining tokens are this file's, computed the same way.

| Token | Value | Role | Contrast [D] |
|---|---|---|---|
| `--ground` | `#121412` | graphite ground | — |
| `--sheet` | `#1A1D1A` | sheets, cards | — |
| `--paper` | `#151815` | code areas, instrument bodies, trace tables | — |
| `--ink` | `#E9ECE6` | primary text, links (underlined), focus ring, primary buttons | 15.52 on ground · 14.26 on sheet · 15.00 on paper |
| `--pencil` | `#B4BCB2` | secondary text, labels, [N] | 9.50 on ground · 8.73 on sheet · 9.18 on paper |
| `--structure` | `#9AA39A` | 1.5-px structure lines (frames, path) | 7.12 on ground · 6.54 on sheet · 6.89 on paper |
| `--rule` | `#6E776E` | component boundaries (non-text) | 3.99 on ground · 3.67 on sheet · 3.86 on paper |
| `--rule-hair` | `#333833` | decorative hairlines only | 1.42 on sheet (decorative) |
| `--link`, `--here` | ink `#E9ECE6` | underlined links; the ▸ pointer | as ink |
| `--band` | `#252A25` | the shared-state band in traces | ink 12.26 · pencil 7.50 on band |
| `--focus` | ink, 2 px, with a 2-px ground offset | focus ring | 15.52 against ground |

### 2.4 Stamp tokens

Each stamp has a text color, the surface behind its text, and an identifying stroke or fill. Contrast is text against the surface behind it, then the identifying stroke or fill against the sheet [D].

| Code | Frame | Light: text / surface / stroke or fill | Light contrast | Night: text / surface / stroke or fill | Night contrast |
|---|---|---|---|---|---|
| [P] | solid fill | `#FFFFFF` / `#1D3F8F` / fill `#1D3F8F` | 9.72 · 9.36 | `#0B1430` / `#8FB0F5` / fill `#8FB0F5` | 8.38 · 7.85 |
| [M] | 2-px dotted frame, tint fill | `#1D3F8F` / `#E3E9F6` / dotted `#1D3F8F` | 7.99 · 9.36 | `#8FB0F5` / `#1E2A44` / dotted `#8FB0F5` | 6.60 · 7.85 |
| [T] | 2-px solid frame, no fill | `#7A5A00` / sheet / `#7A5A00` | 6.15 · 6.15 | `#E0B44C` / sheet / `#E0B44C` | 8.75 · 8.75 |
| [E] | 4-px double frame, no fill | `#3B4A57` / sheet / `#3B4A57` | 8.78 · 8.78 | `#B7C4D1` / sheet / `#B7C4D1` | 9.58 · 9.58 |
| [C] | 1-px rules above and below, open sides | `#6A3E80` / sheet / `#6A3E80` | 7.74 · 7.74 | `#CDB6E6` / sheet / `#CDB6E6` | 9.26 · 9.26 |
| [A] | 2-px dashed frame, no fill | `#3A423D` / sheet / dashed `#5F675F` | 9.98 · 5.63 | `#CDD3CB` / sheet / dashed `#A9B1A9` | 11.16 · 7.73 |
| [?] | 2-px solid frame, 45° hatch fill | `#45463F` / hatch stripe `#E8E8E3` / `#6B6C64` | 7.76 · 5.11 | `#DADBD5` / hatch stripe `#2A2C29` / `#9A9C96` | 10.11 · 6.13 |
| [N] | bare: no frame, no fill | `#4A534D` / sheet / — | 7.67 · — | `#B4BCB2` / sheet / — | 8.73 · — |
| [R] | solid fill, ringed by a heavy outer rule with a 2-px gap | `#FFFFFF` / `#C2410C` / fill and ring `#C2410C` | 5.18 · 4.99 | `#2A0E00` / `#FF8A50` / fill and ring `#FF8A50` | 7.75 · 7.29 |

Notes on the table:

- **Lowest pairs.** The lowest text pair in either theme is light [R], 5.18:1, above the 4.5:1 floor. The lowest meaningful non-text pair is the light component rule on vellum, 3.51:1, above 3:1.
- **[?] moved off ochre in both themes.** v1 shared one ochre between TESTED and UNKNOWN (A7-06). The design review moved light UNKNOWN to neutral gray but proposed a yellow night UNKNOWN (`#E0C878`) beside a yellow night TESTED (`#E0B44C`), which recreates the clash; both themes here use a neutral gray hatch (spine §10.2).
- **[C] is new.** Neither v1 nor the review defined a CONFIGURED hue. Plum keeps it apart from the blues of [P] and [M] in normal vision; its open-sided frame keeps it apart from everything in grayscale.
- **The [?] hatch** is a 45° stripe pattern at 6-px pitch. Text sits directly on it and is measured against the stripe nearer in luminance to the text, so the ratio holds wherever a glyph lands.

### 2.5 Line tokens

| Line | Light | Night | Against sheet · ground [D] |
|---|---|---|---|
| Structure (solid, 1.5 px) | ink `#1C211E` | `#9AA39A` | light 15.73 · 14.63; night 6.54 · 7.12 |
| Component boundary (solid, 1 px) | `#7A837B` | `#6E776E` | light 3.77 · 3.51; night 3.67 · 3.99 |
| Assumed (dashed, 2 px) | `#5F675F` | `#A9B1A9` | light 5.63 · 5.24; night 7.73 · 8.42 |
| Bounded (dotted, 2 px) | `#1D3F8F` | `#8FB0F5` | light 9.36 · 8.71; night 7.85 · 8.55 |
| Witnessed violation (solid, 3 px) | `#C2410C` | `#FF8A50` | light 4.99 · 4.64; night 7.29 · 7.94 |
| Erosion crack (zig-zag, 2 px) | `#C2410C` | `#FF8A50` | as violation |

### 2.6 Color vision, grayscale and print

Color is the fourth cue on a stamp, after the word, the code and the frame. The computation below finds the pairs where color alone would fail, so the frame is load-bearing there [D].

| Pair | Where color fails | What still separates them |
|---|---|---|
| [P] / [E], light | luminance ratio 1.07 (identical in a grayscale print); ΔE76 12.2 under tritanopia | solid fill against a double frame with no fill. v1 drew both as solid fills (A7-06); v2 does not |
| [P] / [R], night | luminance ratio 1.08: both are solid fills of near-equal lightness. Color separates them well (ΔE76 81–94 under all three simulations), but grayscale, print and achromatopsia do not | [R] carries the heavy outer ring; [P] has none. The spine records the ring as [R]'s second cue (spine §8.7). |
| [T] / [R], light | ΔE76 0.7 under protanopia | a single frame with no fill against a ringed solid fill |
| [T] / [R], night | ΔE76 5.6 under deuteranopia | as above |
| [M] / [?] | both pale or dark fills of near-equal luminance (ratio 1.01 in both themes) | dotted frame with a flat tint against a solid frame with a hatch |
| [A] / [N] | ΔE76 8.4 light, 4.1 night | dashed frame against no frame |
| [E] / [N], [E] / [A] | ΔE76 6.4–18.2 across both themes and all simulations | double frame against no frame, or against a dashed frame |

[P] against [R] in light, the pair that must never be confused, keeps ΔE76 of at least 92 under every simulation, as v1 claimed and the review confirmed (A7 appendix). In both themes the grayscale signatures differ for all nine stamps: block (P), ringed block (R), dotted frame on a tint (M), single box (T), double box (E), open rules (C), dashed box (A), hatched box (?), nothing (N). Claim cards and the exported report print in grayscale without losing a single distinction.

**Forced colors.** Under `forced-colors: active` the browser replaces colors and drops fills and the hatch, but keeps border styles, border widths and outlines, so the frames are written to survive: [P] gains a 4-px solid border (apart from [T]'s 2-px solid and [E]'s 4-px double); [?] gains a 6-px left border in place of its hatch (apart from [T]); [R] keeps its ring, drawn as an `outline`. The word and code are always present, so no stamp depends on what forced colors remove.

### 2.7 Distance from kernelspace

- The night ground and sheet sit at ΔE76 13.3 and 12.6 from kernelspace's surface `#18212F`. v1's "blueprint" sheet sat at 3.7, effectively the same navy (A7-20) [D].
- Every night neutral is a near-neutral graphite: HSL saturation 7% or less, and the near-white ink 14% [D].
- No night token has a hue within 30° of kernelspace's mint (154°) at any saturation above 7%. The light theme's only green is verdigris (168°), used for underlined links and the pointer glyph, never as a fill or a state color.

### 2.8 Space, size and shape

| Property | Value |
|---|---|
| Spacing scale | 4-px base: 4, 8, 12, 16, 24, 32, 48, 64 |
| Side gutter | 16 px on phones; 24 px from 600 px; 32 px from 1100 px |
| Borders | 1 px component rule; 1.5 px structure frames; 2 px stamp frames; 3 px witnessed violation; 4 px double frame for [E] |
| Corner radius | 0 or 2 px; nothing rounder |
| Elevation | none: layers separate by sheet and ground and by rules, never by shadow |
| Targets | at least 44 × 44 px for every control (stricter than WCAG 2.5.8's 24 px) |
| Content widths | prose measure at most 680 px; content maximum 1180 px |
| Breakpoints | 320 (the reflow floor), 360 (phone design width), 600, 900 (tables appear), 1100 (sidenotes move to the margin), 1280 (desktop design width); see §7 |

### 2.9 Token sketch

```css
:root {
  color-scheme: light;
  --ground: #F1F3EF; --sheet: #FAFBF8; --paper: #FFFFFF;
  --ink: #1C211E; --pencil: #4A534D; --structure: #1C211E;
  --rule: #7A837B; --rule-hair: #C9CFC6; --rule-soft: #DDE2DA;
  --link: #0E6655; --here: #0E6655; --band: #E8ECE5;
  --st-p-fill: #1D3F8F; --st-p-text: #FFFFFF;
  --st-m-line: #1D3F8F; --st-m-fill: #E3E9F6; --st-m-text: #1D3F8F;
  --st-t: #7A5A00; --st-e: #3B4A57; --st-c: #6A3E80;
  --st-a-line: #5F675F; --st-a-text: #3A423D;
  --st-q-line: #6B6C64; --st-q-stripe: #E8E8E3; --st-q-text: #45463F;
  --st-n-text: #4A534D;
  --st-r-fill: #C2410C; --st-r-text: #FFFFFF;
  --line-assumed: #5F675F; --line-bounded: #1D3F8F; --line-violation: #C2410C;
}
:root[data-theme="night"] {
  color-scheme: dark;
  --ground: #121412; --sheet: #1A1D1A; --paper: #151815;
  --ink: #E9ECE6; --pencil: #B4BCB2; --structure: #9AA39A;
  --rule: #6E776E; --rule-hair: #333833; --rule-soft: #262A26;
  --link: #E9ECE6; --here: #E9ECE6; --band: #252A25;
  --st-p-fill: #8FB0F5; --st-p-text: #0B1430;
  --st-m-line: #8FB0F5; --st-m-fill: #1E2A44; --st-m-text: #8FB0F5;
  --st-t: #E0B44C; --st-e: #B7C4D1; --st-c: #CDB6E6;
  --st-a-line: #A9B1A9; --st-a-text: #CDD3CB;
  --st-q-line: #9A9C96; --st-q-stripe: #2A2C29; --st-q-text: #DADBD5;
  --st-n-text: #B4BCB2;
  --st-r-fill: #FF8A50; --st-r-text: #2A0E00;
  --line-assumed: #A9B1A9; --line-bounded: #8FB0F5; --line-violation: #FF8A50;
}
/* The same night block also applies under
   @media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { … } } */
```

The theme follows the system setting, falls back to light when the system states no preference, and can be fixed to light or night in SCR-settings.

---

## 3. Typography

### 3.1 Three faces, three jobs

| Role | Face | Cut | Used for |
|---|---|---|---|
| Structure | **Archivo**, a grotesque with a width axis | variable, weights 400–800, widths 100–125 | headings, labels, navigation, buttons, stamp words, title blocks, tables |
| Reading | **Source Serif 4** | regular, italic, semibold | lesson prose, sidenotes, drawers, technical notes |
| Code and logic | **JuliaMono** [X RUN-juliamono-glyphs] | regular, semibold | instrument code, theorem statements, traces, goal strips, SMT-LIB, stamp codes and qualifiers, inline math in prose |

**Why JuliaMono.** The design review parsed the served font files and found IBM Plex Mono (v1's code face) missing 36 of 49 sampled Lean and TLA+ symbols, with a proportional fallback that pushes logic lines out of alignment, while JuliaMono missed none and keeps one advance width (A7-15). Those are review measurements; W0-S12 re-recorded coverage against the course's own content [X RUN-juliamono-glyphs]. Source Serif 4 also lacks ℤ, ∀, ∃ and ⇒ (A7-15), so prose never sets a logic symbol in the serif: inline math is always a JuliaMono span.

### 3.2 Scale

| Style | Face and settings | Phone px | Desktop px | Line height |
|---|---|---|---|---|
| Stage title | Archivo 700, width 118 | 26 | 34 | 1.15 |
| Page title | Archivo 700, width 110 | 24 | 30 | 1.2 |
| Section | Archivo 650, width 105 | 20 | 24 | 1.25 |
| Subsection | Archivo 650, width 100 | 17 | 19 | 1.3 |
| Label | Archivo 600, width 118, uppercase, tracking 0.12 em | 12 | 12 | 1.3 |
| Stamp word | Archivo 700, width 118, uppercase, tracking 0.08 em | 12 | 13 | 1.15 |
| Stamp code and qualifier | JuliaMono 600 | 12 | 13 | 1.15 |
| Interface text | Archivo 600, width 100 | 16 | 16 | 1.25 |
| Table text | Archivo 400; values in JuliaMono | 14 | 15 | 1.4 |
| Prose | Source Serif 4 400 | 17 | 19 | 1.6 |
| Sidenote, caption | Source Serif 4 400 | 15 | 16 | 1.5 |
| Code block | JuliaMono 400 | 14 | 15 | 1.5 |
| Inline math | JuliaMono 400 at 0.92 em of the surrounding text | — | — | inherits |

- **Floor.** No text is smaller than 12 px, on any screen (spine §10.2 sets 12 px for phone labels; this file applies it everywhere). v1's 11-px labels and qualifiers are gone.
- **Case.** Uppercase only for labels and stamp words. Headings are sentence case.
- **Figures.** Tabular lining figures in tables, stamps, title blocks and every count (`font-variant-numeric: tabular-nums lining-nums`); lining figures in prose too, because numbers here sit beside code.
- **Measure.** Prose at most 680 px, about 70 characters at 19 px.

### 3.3 Notation

- **TLA+ shows ASCII source by default** (`\A`, `[]`, `<>`, `/\`, `==`), because that is what the learner types and what TLC echoes. A per-reader toggle in SCR-settings pretty-prints it, using the tlauc ASCII-to-Unicode mapping (A7-18). PlusCal appears beside its translation (D-09).
- **Lean shows Unicode,** as Lean source does. Each symbol offers its input abbreviation (`\forall` gives ∀) on hover, focus or tap.
- **SMT-LIB and Z3Py are ASCII.**
- **Every symbol has a spoken name** from the speech map (§10.6), used as its accessible name.
- **Glyph gate.** GATE-glyphs extracts every code point from lessons, specimens, audit cases, claims and goal strips and fails on any not present in JuliaMono's subset or the speech map. The spine adopts one extension: fail on a logic symbol set in the serif or sans rather than in a code span (spine §10.2, §11.2).
- **Subscripts** such as VRK₃₀ are set with `<sub>` in the surrounding face unless GATE-glyphs finds the Unicode subscript in that face.

### 3.4 Self-hosted subsets

- All three faces are self-hosted WOFF2 subsets served from the main origin. No font CDN: a CDN would receive every learner's IP address, and type would fall back to system fonts offline (A7-23).
- The service worker (`sw.js`, vendored from kernelspace) precaches them, so the page sets the same type offline.
- Each file is pinned by SHA-256 in a font manifest and counts against GATE-bundle's budgets. The three faces are under the SIL Open Font License, and their license files ship beside them (GATE-privacy's license lint).
- `font-display: swap`, with metric-matched fallbacks (`size-adjust`, `ascent-override`) to limit layout shift. The code face's fallback is a monospace stack, so alignment survives the swap.

---

## 4. Line language

### 4.1 One meaning per line style

| Line | Means | Appears as | Never used for |
|---|---|---|---|
| **Solid** (1.5 px structure, 1 px component rule, decorative hairline) | structure | frames, table rules, dividers, rests-on edges, the path route, the focus ring, faults and actions in the Theater | — |
| **Dashed** (2 px) | assumed | [A] frames; seam (assumption) records and their edges in the claim graph; fairness drawn as an assumption in S5.L7; parked goals, carried as [A]; held seams, labeled "held · tested by ‹gate›" | dividers, empty slots, shared state, drop zones, drafts, placeholders, disabled controls |
| **Dotted** (2 px) | bounded | [M] frames; the explored region on the state-space minimap; the bound bracket on a trace or search that stopped at a bound; "within N" on the CTI workbench | anything not bounded by a stated bound |
| **Heavy vermilion** (3 px, solid) | a witnessed violation | [R]'s ring; the violating step and state in a trace; the left rule of a specimen's witness block; the distinguishing row of a state pair; after scoring, the audit-diff line a keyed witness refutes | crashes, faults, errors, warnings, emphasis, an assumption that has not failed |
| **Vermilion zig-zag** (2 px) | an erosion crack | a cracked strip segment; a cracked assumption record; the rests-on edges a crack propagated along; the erosion-log marker | anything that is not an erosion event |

Rules (spine §10.2; A7-16):

- **Nothing else is dashed or dotted.** File-import drop zones use a solid rule; drafts carry a solid-ruled banner; empty slots are blank.
- **Shared state is a tinted band** (`--band`), never a dashed box.
- **Faults are ink.** Crash, duplicate and delay are actions, drawn in ink with labels; vermilion is reserved for witnessed violations (A7-19).
- **An assumption that has not failed is never vermilion.** v1 drew seams as dashed vermilion, mixing "assumed" with "violated" at 1.88:1 against its navy block (A7-16).
- **Lint.** GATE-stamps' line check rejects `border-style: dashed | dotted` and SVG `stroke-dasharray` outside `.line-assumed`, `.line-bounded`, `.stamp-a` and `.stamp-m`, and rejects vermilion strokes outside `.line-violation`, `.line-crack` and `.stamp-r`.

### 4.2 Patterns and fills

| Pattern or fill | Means | Nowhere else |
|---|---|---|
| 45° hatch | no verdict ([?]) | progress never hatches. The review proposed hatching for "in progress" (A7-02); a pattern means one thing, so this file does not adopt it |
| Solid stamp fill | [P], and [R] with its ring | — |
| Tint | [M] | — |
| Band | shared state in traces and histories | — |
| Ink fill | primary buttons; the "signed off" path node | never a stamp frame |

---

## 5. The stamp system v2

### 5.1 Vocabulary

| Word | Code | Means | Required qualifier (spine §8.7) | Frame | First needed |
|---|---|---|---|---|---|
| PROVED | [P] | holds for every input of the stated model, checked by a kernel or solver | checker@version: "Lean 4.35.0 kernel · axioms listed" [X RUN-lean-ledger], or "Z3 5.3.1 unsat · uncertified · rlimit N" [X RUN-z3-starter] | solid fill | S1 (CL-1.1) |
| MODEL-CHECKED | [M] | holds in every state explored within stated constants | constants; complete or partial | dotted frame, tint | S5 (CL-5.1) |
| TESTED | [T] | held on n sampled runs | n and generator statistics | single solid frame | S1 (the Defence's own stamp); S3 for claims (CL-3.5) |
| ENFORCED | [E] | the running system rejects violations | where | double frame | S6 (CL-6.4) |
| CONFIGURED | [C] | a setting, read back from the system | source, and when it was read back | rules above and below, open sides | S7 (CL-7.4) |
| ASSUMED | [A] | taken on trust | why | dashed frame | S1 (SEAM-1, SEAM-7) |
| UNKNOWN | [?] | no verdict | reason | hatched, solid frame | S1.L2 (SP-1.7) |
| NOT COVERED | [N] | outside the model | what is outside | bare | S1.L5 (CL-1.5) |
| REFUTED | [R] | a replayed witness violates the property | witness length in actions, steps or rows | solid vermilion fill, ringed | S1 (SP-1.1) |

EROSION is an event, drawn as a crack (§5.7). It is never a tenth stamp.

### 5.2 Grammar

`WORD [code] · qualifier`

- The word, uppercase in Archivo; the bracketed code and the qualifier in JuliaMono at the **same size as the word** (v1 set the qualifier as the smallest text on the page; A7-06).
- **The qualifier is required.** A stamp without one fails GATE-stamps. [A] states why; [N] states what is outside.
- **Bound first** for [M] and [T]: constants or n lead the qualifier.
- Parts of a qualifier are separated by ` · `. Word and code never wrap apart. A long qualifier wraps inside the frame with a hanging indent; inside a strip it may truncate behind a disclosure control, but the full text is always one tap or keypress away and is always the accessible name.
- **The word always appears.** The code aids scanning and search; it never stands alone for a stamp in learner copy.
- **Codes are bracketed and IDs never are** (GATE-codes): `[C]` is a stamp, `CL-6.4` is a claim.

Examples, each from a run or a spine template:

| Stamp | Source |
|---|---|
| `PROVED [P] · Lean 4.35.0 kernel · axioms listed` | CL-2.1 [X RUN-lean-ledger]; after `--paranoid` the qualifier adds `· 6 checkers` [X RUN-lean-comparator] |
| `PROVED [P] · Z3 5.3.1 unsat · uncertified · rlimit ‹N›` | CL-1.1 [X RUN-z3-starter] |
| `PROVED [P] · kernel + compiler` | a theorem whose axioms include a `_native` axiom [X RUN-lean-axioms] |
| `MODEL-CHECKED [M] · Init = 100, Amount = 80, Workers = {w1, w2} · complete · 4 distinct states` | CL-5.1 [X RUN-tlc-atomic] |
| `REFUTED [R] · 4 actions (5 states)` | SP-5.1, the double spend [X RUN-tlc-doublespend] |
| `UNKNOWN [?] · incomplete (theory arithmetic)` | SP-1.7 [X RUN-z3-unknown-pow] |
| `UNKNOWN [?] · canceled at rlimit 5e6` | SP-1.8 [X RUN-z3-budget-pyodide] |
| `UNKNOWN [?] · stopped at deadlock, 10 distinct states` | SP-5.2, TLC's default flags [X RUN-tlc-doublespend] |
| `UNKNOWN [?] · statement mismatch` | a claim voided by comparator's "theorem statement do not match" [X RUN-lean-comparator] |
| `TESTED [T] · n = ‹n› · ‹generator statistics› · PGlite and PostgreSQL 18.6` | CL-6.1 {{run:RUN-drt-transfers}} |
| `TESTED [T] · 1 instance` | "results match" on one database, SP-9.4 {{run:RUN-pg-one-db}} |
| `ENFORCED [E] · deferred check over postings, at commit` | CL-6.4 {{run:RUN-pg-enforce-commit}} |
| `CONFIGURED [C] · ‹setting› read back from ‹source› at ‹time›` | CL-7.4 {{run:RUN-pg-rls-differential}} |
| `ASSUMED [A] · contention assumed finite` | CL-6.5, assumed by design |
| `NOT COVERED [N] · the recipient's balance` | CL-1.5 [X RUN-z3-bv64] |
| `TESTED [T] · 10 of 12 unseen items · Wilson 0.55–0.95` | the course's stamp on a passed Defence part, with the spine's worked interval [D] |

### 5.3 Frames

Every stamp is an inline box: 4 × 8 px padding on phones, 5 × 10 px on desktop, minimum height 28 px. A stamp that opens details is a button whose target, padding included, is at least 44 × 44 px.

| Code | Frame | Grayscale signature |
|---|---|---|
| [P] | solid fill, no ring | a filled block |
| [M] | 2-px dotted frame on a tint | a dotted box on a flat tint |
| [T] | 2-px solid frame, no fill | a single box |
| [E] | 4-px double frame, no fill | a double box |
| [C] | 1-px rules above and below, open sides | two horizontal rules |
| [A] | 2-px dashed frame, no fill | a dashed box |
| [?] | 2-px solid frame over a 45° hatch | a hatched box |
| [N] | none | text only |
| [R] | solid fill plus a 2-px outer ring, 2 px out | a ringed block |

### 5.4 How a stamp is derived

- **Raw output first, stamp second.** An instrument declares its query direction in its header ("Query asserts: a state that violates P"), prints the engine's raw answer in neutral ink ("Z3 returned sat"), and only then shows the stamp derived from direction and result through spine §8.8 (A7-04). `sat` is never styled as a refutation on its own: premise witnesses and vacuity checks are sats that are good news, and GATE-calls keeps both directions in the item pool.
- **In S1–S2 the interpretation tap** (§6.4) sits between the raw answer and the stamp.
- **Only receipts and engine replies mint stamps.** Code tested by GATE-stamps derives them; nothing is stamped by hand.
- **The course stamps its own graders** (I10): a passed Defence part is [T] with n and its Wilson interval; a self-grade is [A].

### 5.5 Lanes and the recorded-run label

Every stamp names its lane in a badge beside it. Learners see only the badge words (spine §9.3):

| Badge | Means |
|---|---|
| *re-checked here* | an engine in this tab produced or re-checked the result (INS-z3, INS-lane-a, INS-interp and the other tab instruments) |
| *reported from your machine* | an imported receipt from the Bench (Lean, TLC, multi-session PostgreSQL) |
| *self-assessed* | the learner's own judgment; its stamp is [A] |
| *recorded run* | the course's own run, shown in place of a live one on a phone or while a worker is cold, with its RUN id. It is course evidence, never the learner's: it mints no learner stamp, claim or evidence event; only the learner's call before it is recorded (spine §9.3). Boot labels it *recorded result* until S1.L1 introduces "run" (spine §0, §9.3) |

Badges are pencil text with a small line icon. They are never framed, because frames belong to stamps.

### 5.6 The three-segment claim strip

Every claim renders a strip of three segments (spine §5.2; review digest R12):

| Segment | Asks | Usual stamps |
|---|---|---|
| **Proposition of the model** | what did the checker establish about the model? | the claim's expected stamp from spine §5.2: [P], [M], [T], [E], [A], [?], [R] |
| **Correspondence** | how does the model relate to the running system? | [A] while a seam stands in for it; [T] (a differential run); [P] (a preservation proof, CL-9.2); [E] (enforced in the system itself); [R] once a witness cracks it |
| **Requirement fit** | is the proposition the requirement? | [A] (the learner says so), [T] · n requirement scenarios, [N] (outside the model), [R] (a scenario the theorem permits and the requirement forbids). **Never [P]** (GATE-stamps) |

- **One primary stamp per segment.** Supporting stamps and open defeaters stack under the strip in the claim card, and show in the strip as a "+1" disclosure. CL-5.4, for example, carries [P] in its first segment with the open defeater "translation from the TLA+ spec unverified" and a supporting [M]; CL-7.4 carries [E] in the first segment, [T] for its `SET ROLE` differential in the second, and [C] for the read-back of `relrowsecurity` and `relforcerowsecurity`.
- **Assumptions attach to segments.** A seam that a segment rests on draws as a dashed tick on that segment's edge, linked to its assumption record.
- **Layout.** At 600 px and wider the strip is three equal cells under a 1.5-px frame, each headed by a 12-px label. Below 600 px it stacks into three rows, label on the left.
- **Claims never collapse to one stamp.** One stamp could not say "proved of the model; correspondence refuted by a specimen; requirement assumed", which is why v1's single-stamp Ledger row read as both proved and refuted (A7-03).

### 5.7 EROSION is an event

An erosion fires when both of its endpoints exist in the learner's record (spine §5.4). On the builder's path, if the cracking specimen came first, the claim mints with its seam already cracked and the forecast asks which segment it hits.

1. **Forecast** (M-erosion-forecast). A Today card asks the learner to restate the claim from memory, then call which segment cracks.
2. **Crack.** A vermilion zig-zag draws across the segment that cracks: correspondence, requirement fit, or an assumption record. The proposition-of-model segment is never changed silently; if an assumption under it cracks, the crack is drawn there and labeled.
3. **Propagate.** The crack runs along rests-on edges from the cracked assumption record to every claim resting on it: the blast radius.
4. **Restamp, keeping history.** The cracked segment keeps its old stamp struck through and legible, with the stamp derived from the cracking specimen beneath it. For ER-1 on CL-2.2: ~~`ASSUMED [A] · balances are unbounded integers`~~ then `REFUTED [R] · ‹witness length› · SP-6.4`, because PostgreSQL refuses with 22003 a step the model takes [X RUN-pg-anomalies, RUN-pg-claims, RUN-pglite].
5. **Remedy.** A card offers the remedies spine §5.4 lists; for ER-1, a bounded semantics and re-proof, `Except Overflow` made observable in R(S, D), or `numeric` with a stated bound, and it surfaces drawer D-30.
6. **Log.** The claim's erosion log keeps the event after the remedy re-mints the segment, and the export carries it.

Held seams (SEAM-13–SEAM-15) draw dashed with "held · tested by ‹gate›" and never crack. When a nightly gate goes red, the course's own claims show "unverified since ‹date›" on SCR-assurance instead.

### 5.8 What never gets a stamp

| Thing | How it renders |
|---|---|
| An agent's claim ("proved", "safe to merge", "200 tests green") | quoted text under the label UNREVIEWED, attributed to the agent, in pencil, never framed (I8) |
| A language model saying "equivalent" or "proved" | no stamp; quoted UNREVIEWED text (spine §8.8) |
| "Signed off", "settled", "kept", "mounted", "parked" | learner states, in ink words and path-node shapes; never a stamp frame or hue (GATE-codes) |
| A Theater monitor, a hand-played trace | an observation: "holds so far on your trace (‹k› steps)", "violated at step ‹k›" |
| A course recorded run | its raw verdict under the *recorded run* label |
| A shadow or gold mismatch | no stamp; a defeater against both sides (spine §8.8) |
| "None: sound" in an audit | an answer, scored after submission; not a stamp (v1 drew ACCEPT as a stamp; A7-09) |

### 5.9 Spoken names

- **Stamp:** "{Word}, code {letter}: {qualifier}". The visible bracketed code is hidden from assistive technology and spelled in the name: "Proved, code P: Lean 4.35.0 kernel, axioms listed" [X RUN-lean-ledger]; "Unknown, code question mark: incomplete, theory arithmetic".
- **Strip:** "Claim CL-2.2, transfer non-negative. Proposition of the model: Proved, code P: …. Correspondence: Assumed, code A: balances are unbounded integers. Requirement fit: Assumed, code A: your statement."
- **Crack:** appended to the segment: "Cracked by erosion ER-1, specimen SP-6.4. Was: Assumed, code A: …. Now: Refuted, code R: …."
- **Badge:** read after the stamp: "reported from your machine".

---

## 6. Components

Each component lists its anatomy, its states and the evidence behind its behavior. The owning tasks are in §13.

### 6.1 Provenance block (the title block)

Six fields, filled from runs and receipts and never typed by hand (A7-24):

| Field | Holds | Filled from |
|---|---|---|
| Project | edition or artifact: "statespace · edition 1", "LAB-2 · statespace-lab" | build metadata; the receipt's `lab` |
| Sheet | the ID: `S1.L1`, `CL-2.2`, `SP-1.1`, a receipt for `LAB-2.5` | the ID registry generated from the spine (GATE-links) |
| Drawn | the run or build date | `recordedAt`, `createdAt`, build time |
| Rev | content hash, receipt SHA-256 or statement hash | build; receipt |
| Scale | the bound: constants, n, `rlimit`, search bound; "—" when there is none | receipt `runs[].budget`; run registry |
| Checked by | engine@version as the engine reports it, with run IDs | runs registry; receipt `tools[]` |

- **Where:** the full block is SCR-receipt. A compact block (Sheet, Rev, Drawn, Checked by) heads SCR-lesson and SCR-stage and closes every claim card and specimen label; instrument cells carry Checked by and Scale in their header strip; SCR-assurance shows the edition pins.
- **Look:** a grid of cells divided by 1-px component rules inside a 1.5-px frame; 12-px caps labels over JuliaMono values. Phones show two columns.
- **Rules:** an empty field shows "—", never a guess; a version is the one the engine reported (v1 hard-coded a stale engine version into a lesson header; A7-07).
- **Markup:** a `<dl>`, one `<dt>`/`<dd>` pair per field.

### 6.2 Instrument cell with Call It

Anatomy, top to bottom:

1. **Header strip:** the instrument in learner words ("Z3 in this tab"), engine@version as reported, the lane badge, the budget (`rlimit ‹N›`), and a Stop control that calls `worker.terminate()`, the only hard stop the tab has [X RUN-z3-budget-pyodide].
2. **Query direction:** "Query asserts: ‹what›. sat means ‹what›." (A7-04).
3. **Code** on paper in JuliaMono, read-only or editable, line-numbered, scrolling sideways inside its own frame.
4. **Call It** (a `<fieldset>` of native radios), shown on first runs of authored cells and on generated items:
   - the verdict options, with the chance printed ("3 options · chance 1 in 3");
   - after a verdict, the confidence: *guess* (below 67%), *think so* (67–80%), *sure* (above 80%), the certainty-based-marking switch points [cbm];
   - the payoffs, printed before choosing and labeled "feedback only, never credit": +1 / 0, +2 / −2, +3 / −6 [baldiga14];
   - Run, active once a verdict and a confidence are chosen.

   Verdict, then confidence, then Run appear in turn, which keeps the cell short (A7-10). Free runs (after an edit, or any re-run) show Run at once and are labeled practice. Once a KC is solid, an expert skip appears: "Skip the call: you've shown this one."
5. **Result panel:**
   1. the raw answer in neutral ink: "Z3 returned sat. Model: b = 0, amount = 1, a = 0" [X RUN-z3-starter];
   2. in S1–S2, the interpretation tap (§6.4);
   3. the derived stamp and its lane badge;
   4. the call record: "Recorded: sat · think so" with "Your call matched" or "Your call missed", and the payoff as feedback ("+2, feedback only"). The fieldset turns read-only, because the first call is final: only it counts, and it cannot be edited (M-call-it);
   5. layered feedback (M-layered-feedback): witness, bound and basis always; a misconception note open by default only in novice KCs, collapsed in expert ones (expertise reversal, A [tetzlaff25]);
   6. actions: "Mount as specimen" after an [R], "Try a fresh variant" (a re-find), "See its class" (M-class-hint).

```
┌─ Z3 IN THIS TAB · Z3 5.3.1 · re-checked here ───────────────── rlimit ‹N› · Stop ─┐
│ Query asserts: a transfer that leaves the sender negative.                          │
│ sat means such a transfer exists.                                                   │
│ ┌─ transfer_overdraft.py ─────────────────────────────────────────────────────┐    │
│ │ 1  from z3 import *                                                          │    │
│ │ 2  a, b, amount = Ints('a b amount')                                         │    │
│ │ …                                                                            │    │
│ └──────────────────────────────────────────────────────────────────────────────┘    │
│ CALL IT · your first call is the one that counts                                    │
│  ( ) sat    ( ) unsat    ( ) unknown                      3 options · chance 1 in 3 │
│  How likely is this right?                                                          │
│  ( ) guess · below 67%   ( ) think so · 67–80%   ( ) sure · above 80%               │
│  Feedback only, never credit: guess +1/0 · think so +2/−2 · sure +3/−6              │
│  [ Run Z3 ]                                                                          │
├─────────────────────────────────────────────────────────────────────────────────────┤
│ Z3 returned sat. Model: b = 0, amount = 1, a = 0                  [X RUN-z3-starter] │
│ So the property:  ( ) holds    ( ) is violated    ( ) can't tell                     │
│ REFUTED [R] · witness: 1 step                                       re-checked here  │
│ Your call missed. Recorded: unsat · think so · −2, feedback only                    │
│ [ Mount as specimen ]  [ Try a fresh variant ]   Why: witness · bound · basis  ▸    │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

Schematic. Z3 5.3.1 in the tab is the recorded Pyodide build [X RUN-z3-starter-pyodide]. The code shown is the roadmap's starter, which LAB-1.1 runs; S1.L1's first scored call is a fresh variant, because the starter prints its own answer (V2-05).

**States**

| State | What the cell shows |
|---|---|
| Cold | the course's recorded run at once, under the *recorded run* label with its RUN id [X RUN-z3-starter-pyodide]. The learner can still call first; the call counts. "Run it live in this tab" sits beside it |
| Loading | no prompt and no warning first (OD-6, M-consent); a determinate progress bar by bytes, with text ("Downloading ‹engine› · ‹received› of ‹size›", the size from the build manifest; Z3's first load [X RUN-phone-pyodide]), while the recorded run stays in view; no spinner |
| Running | "Running · rlimit ‹N›", with Stop |
| Stopped | "Stopped before a verdict. Your call stands; no result was recorded." |
| `unknown` | not an error: [?] with its reason |
| Error | the engine's message verbatim, in ink; no stamp; "No result was recorded." |
| Offline | recorded runs and items "checked offline" still work (the internal pocket checkers, INS-pocket) |
| Phone | the Call It fieldset docks as a sticky sheet at the bottom of the cell (`position: sticky` inside the cell, so it never covers content outside it, and `scroll-padding-bottom` reserves its height so focus is never hidden, WCAG 2.4.11). Heavy instruments show the recorded run and "Queue for the Bench" |

**Evidence.** Calling before a run is retrieval and prequestioning (A [rowland14][sthilaire23]); predicting beats judging afterwards (pedagogy digest row 5, A). Certainty-based marking is a proper scoring rule but penalties mix in risk attitude, so payoffs are feedback, never credit (C for CBM as feedback; B [baldiga14]).

### 6.3 Call It on generated items

The same fieldset serves GEN-call-it's four templates and every graded item that takes a call.

| Template | Answer control | Chance line |
|---|---|---|
| Three-way verdict | three radios | "3 options · chance 1 in 3" |
| Trace length as an interval | one radio per offered interval | ‹k› options · chance 1 in ‹k› |
| Which anomaly | one radio per option | "‹k› options · chance 1 in ‹k›" |
| Multiple true/false, about five scenarios | a true/false radio pair per scenario row | one confidence for the whole set, with "all ‹n› by guessing: 1 in 2^‹n›" printed; the Mirror keeps these calls in their own bin (spine §8.5) |

- **Probes** (Defence Part A, test-out) are one shot, with feedback only after submission, because counterexamples invite patching the special case (spine §8.4; B [dantoni15]).
- **Practice** shows the witness and its class after the answer.
- **Options are never ordered by length,** and every option carries its "why" and misconception ID (GATE-items).

### 6.4 Interpretation tap

After a solver run in S1–S2, before the stamp appears, the learner taps one of "so the property holds", "so the property is violated", "can't tell" (spine §8.4). It is recorded as its own call type, fades once the KC's fresh items are solid, and returns for each new query in which sat is good news (review digest R13).

### 6.5 Specimen label

| Field | Content | Source |
|---|---|---|
| ID and title | `SP-n.k` for course specimens; learner specimens get an ID minted on mount | specimen registry; never typed |
| Stamp | `REFUTED [R] · ‹witness length›` | the run |
| Witness | the witness on paper in JuliaMono, under a heavy vermilion left rule | the run's output |
| Violates | the property | the specimen record |
| Because | the cause, in one line | the specimen record |
| Minimal? | per engine: Z3 only under an explicit Optimize objective, TLC only with `-workers 1` | the run's argv |
| Class | the class the witness belongs to (M-class-hint) | generator tags |
| Cured by | the fix, linked to the claim it mints | the lab repo's `fixed/` |
| Found in | lesson or lab stage, engine@version, RUN id | the run registry |
| Status | mounted ‹date›; kept after a re-find on a fresh variant at least 7 days later | events |
| Dated incident | for SP-1.9, SP-1.10, SP-4.5, SP-5.7, SP-6.11 and SP-8.5: date, source, "toy model", nightly re-run status; never exploit code | GATE-specimens |

```
SP-1.1 · The overdraft                                 REFUTED [R] · witness: 1 step
┃ b = 0, amount = 1, a = 0
┃ a − amount = −1
Violates   a − amount ≥ 0: the sender's balance stays non-negative
Because    the transfer has no guard, so amount > a is reachable
Minimal?   yes: amount = 1 under an Optimize objective          [X RUN-z3-optimize-min]
Class      an overdraft by an unguarded debit
Cured by   the guard amount ≤ a: unsat, plus a premise witness (CL-1.1)
Found in   S1.L1 · Z3 5.3.1 · RUN-z3-starter                    [X RUN-z3-starter]
Status     mounted ‹date› · re-find ‹date› → kept
```

The copy for a new specimen is "Specimen mounted", praised as a find. v1 showed one specimen ID with two different witnesses on two sheets, proof that its labels were typed (A7-07); v2 labels come only from runs (GATE-specimens). Keeping specimens is error-management training (A/B [keith08]).

### 6.6 Claim card

1. **Header:** ID, short proposition, lane badge, and whether each field came from a receipt or from the learner (M-claim-card fades from prefilled to learner-written).
2. **Strip** (§5.6).
3. **Six fields,** a two-column ruled table (label above value on phones): Proposition (the pinned statement in JuliaMono, with its statement hash); Assumptions (assumption records, each in a dashed frame, linked); Model; Method (checker@version, axioms, flags); Correspondence; If weakened (a witness against the claim's *own* proposition, which GATE-claims checks).
4. **Requirement row:** the learner's statement of the requirement. Its stamp is the strip's third segment, and it is never [P].
5. **Rests on,** split in two (A7-03): *Assumes* (assumption records) and *Evidence* (receipts, specimens).
6. **Open defeaters,** each open or closed: "encoding unverified" on every solver [P] until cross-checked.
7. **Erosion log.**
8. **Footer:** the compact provenance block.

```
CL-2.2 · transfer_nonneg                                 reported from your machine
PROPOSITION OF THE MODEL         │ CORRESPONDENCE                 │ REQUIREMENT FIT
PROVED [P] · Lean 4.35.0 kernel  │ ASSUMED [A] · balances are     │ ASSUMED [A] · "balances never
· axioms listed                  │ unbounded integers (SEAM-1)    │ go negative" is the rule
──────────────────────────────────────────────────────────────────────────────────────
Proposition     theorem transfer_nonneg …        statement ‹sha›     from the challenge pack
Assumptions     ┆SEAM-1 balances are unbounded integers┆
Model           Ledger: two accounts over Int; pure; sequential
Method          Lean 4.35.0 kernel via lake comparator; axioms listed   [X RUN-lean-ledger]
Correspondence  no implementation linked yet
If weakened     drop amount ≤ balance: non-negativity fails at amount 1 (SP-2.2)
                [X RUN-z3-conservation-noguard, RUN-z3-optimize-min]; Lean twin {{run:RUN-lean-noguard}}
Requirement     yours; never PROVED
Assumes         SEAM-1        Evidence   receipt ‹sha› · SP-2.2
Erosion log     —
SHEET CL-2.2 · REV ‹sha› · DRAWN ‹date› · CHECKED BY Lean 4.35.0 + lake comparator
```

Schematic; `┆…┆` marks a dashed assumption frame. An agent may produce a claim, because claims are not evidence, but any assertion an agent makes inside it renders as quoted UNREVIEWED text and fills no stamp (spine §8.1, I8).

### 6.7 Theater lanes over TLC graphs

The Theater (INS-theater) plays authored scenes that are TLC state graphs exported at build time with `-workers 1` and an explicit deadlock flag, so the Theater, the lasso validator and the phone view navigate one graph (V2-13). Learner edits run in Spectacle (INS-spectacle), capped at about 5k states [D].

| Part | Behavior |
|---|---|
| Lanes | one lane per process. Desktop: lanes are rows and time runs left to right. Phone: lanes are columns and time runs down; two or three processes fit at 360 px |
| Shared state | a tinted band: a row on desktop, a sticky strip at the top on phones |
| Enabled-action bar | the actions enabled in the current state, by process and action ("w1 ▸ Read", "w2 ▸ Write bal ← 20"). Disabled actions show their reason ("guard false"). Faults are per-scenario actions in ink ("crash w1"), never vermilion (A7-19) |
| Branching history | a tree: select any past state to fork from it. The current path is ink; other branches pencil |
| Trace table | the same steps as a real table, with a narration column (§10.4). Lanes and table are linked views: selecting a step in one selects it in the other (linked simultaneous views, A/C, pedagogy digest row 18) |
| Monitors | observations, never stamps: "NoOverspend: holds so far on your trace (‹k› steps)"; "NoOverspend: violated at step ‹k›", with ✗ and a heavy vermilion frame on that step |
| Minimap | reachable states as a small graph; visited states filled in ink; the current state ringed; a dotted outline around the explored region when exploration is bounded. Count line from the recorded run: "visited ‹k› of 11 reachable states (TLC, complete, invariant off)" [X RUN-tlc-full] |
| Lasso tool | "Loop back to this state" on any past state draws a return edge; the monitor reads fairness off the loop: "w1 ▸ Write is enabled throughout and never taken: not weakly fair". INS-lasso validates the lasso; only TLC's own result earns [M] |
| Granularity toggle | split read, check and write into separate actions and watch the reachable interleavings change; the split model's counterexample is 7 states and 6 actions, with 20 distinct states [X RUN-tlc-rtw3] (SP-5.5) |
| TLC panel | "TLC's counterexample: 4 actions (5 states). Yours: ‹k› actions" [X RUN-tlc-doublespend]. Trace length is counted in actions (KC-5.tlc-flags-matter). Under default flags TLC stops at "Deadlock reached" after 10 distinct states and still exits 0, which is why receipts never trust an exit code [X RUN-tlc-doublespend] |
| Constants | printed in the header with the argv of the recorded run: Init = 100, Amount = 80, Workers = {w1, w2} for DoubleSpend [X RUN-tlc-doublespend] |

### 6.8 Derivation Board

The Derivation Board (INS-derivation) derives weakest preconditions step by step, each step checked by one Z3 validity query.

- **Panels:** the command and postcondition; the current obligation; the numbered steps, each with its rule (assignment by substitution; sequence; conditional with its four guard readings), the resulting formula, and its per-step result: the raw answer, then "valid" or "not valid", with a distinguishing state. A step that fails because an earlier one did is marked "follow-on" and not counted twice.
- **Keyboard stepper, no dragging** (WCAG 2.5.7; A5-F18): ↑ and ↓ move between steps; ← and → move between the subterms of the current formula, the selected subterm framed in ink; Enter opens the rule list; Space applies the rule; Backspace undoes the last step. Every action is also a visible button.
- **Capture warnings** flag a substitution that would capture a variable (SP-4.2).
- **Fading** (family F3): correct worked derivations first, then blanks with no prompts, then one principle prompt per revealed step (A [barbieri23]; B [renkl02][hilbert08]).
- **Phone:** read-only. The derivation shows as its list of steps and results, with "Derive on a laptop".

```
DERIVATION BOARD · S4.L2 · Z3 5.3.1 checks each step
Command   bal := bal − amt
Post      bal ≥ 0
1  wp(bal := bal − amt, bal ≥ 0) = (bal ≥ 0)[bal ↦ bal − amt]   rule: assignment
2                                = bal − amt ≥ 0                  Z3: ‹raw answer› → ‹valid | not valid + state›
   [ ← subterm ] [ subterm → ] [ Apply rule ▾ ] [ Undo ]
```

Schematic; Z3 5.3.1 in the tab per [X RUN-z3-starter-pyodide].

### 6.9 Goal Replay

Goal Replay (INS-goal-replay) shows Lean goal strips generated at build time from real Lean 4.35.0 elaboration through `$/lean/plainGoal` [X RUN-lean-plaingoal], regenerated on every toolchain bump (GATE-replay; [X RUN-replay-gen]). It is never live Lean and never hand-written.

- **A strip** is a sequence of frames, one per tactic: the tactic line, then the goal after it, hypotheses above the turnstile and the target below.
- **Diffs** against the previous frame: added hypotheses marked + in the margin, removed ones −, changed target lines ~. The marks persist; the motion (§9) only draws attention to them. Screen readers hear "added", "removed", "changed".
- **Header:** theorem name; "Lean 4.35.0 · generated, not live Lean" (toolchain per [X RUN-lean-ledger]); a disclosed, uncredited link-out to live.lean-lang.org (OD-4).
- **Modes:** read (step with ← and →); predict (Call It on the next goal, GEN-proof-structure's "next goal" template); fade (blanked lines with no prompts, one principle prompt per revealed step; families F1, F2 and F6); order (Proof Blocks, §6.15).
- **Types on demand:** hover, focus or tap shows a term's type. The popover is dismissible, hoverable and stays until dismissed (WCAG 1.4.13).
- **Learner-paced, never autoplay:** narrated animated proofs lost more by two weeks than learner-paced ones (C, pedagogy digest row 18).
- **The proposition is pinned** at the top with its requirement row: "Is this the requirement?"
- **Phone:** one frame per screen, with Previous and Next buttons (a swipe is an extra, never the only way) and collapsible hypotheses. Long goal lines wrap or scroll inside the strip, never the page (spine §10.1 SCR-lesson).

```
GOAL REPLAY · ‹theorem› · Lean 4.35.0 · generated, not live Lean
tactic ‹k› of ‹n›:  induction ns generalizing s
 before                               after (case cons)
 ‹hypotheses›                         ‹hypotheses›
                                      + ih : ‹hypothesis›
 ⊢ ‹target›                           ~ ⊢ ‹target›
[ ◂ Previous ]  [ Next ▸ ]   Predict the next goal ▸   ASCII ⇄ Unicode   Types: tap a term
```

Schematic: every goal shown in the product comes from RUN-replay-gen.

### 6.10 Audit flow

The Audit Desk's five steps (spine §6), one per screen on phones and in one column on desktop beside the case:

1. **Call the statement alone.** The theorem statement and the claim it supports, nothing else. The learner calls "sound" or "has a gap" with a confidence (Call It). Judging the statement before seeing the reasoning helped proof understanding (C, pedagogy digest row 17).
2. **Reveal the diff.** The description and the diff, line-numbered. The agent's own words render as quoted UNREVIEWED text.
3. **"This proves: ___".** The learner restates what the theorem proves in plain English, optionally with a Lean `theorem` stub. It is kept with the finding and uncredited.
4. **Gap class.** Native radios with **no default**. "None: sound" comes first; the thirteen classes follow, grouped as rebutting, undermining and undercutting; subclasses (G1a, G3a, G6a–G6e, G8a–G8d) appear as nested radios once their class is chosen.
5. **Anchor typed evidence to lines.** The class names the evidence it needs: a witness or trace, the offending declaration, the mismatched identifiers, paired states, or a scenario the theorem permits and the requirement forbids. The learner anchors lines by keyboard (↑ and ↓ to move, Space to anchor) or pointer, and may attach a witness that the desk re-runs on the instrument origin.

- **Scores come after submission, as counts:** "‹k› of ‹n› flags matched", with Wilson intervals; balanced accuracy overall ("audit accuracy" in learner copy); per-class precision and recall only once a class has n ≥ 10 (spine §6).
- **A "based on" card** cites the dated incident behind the case and its source, never exploit code.
- **No teasers.** Nothing names a case's gap before it is opened, and nothing locks (v1's home page spoiled a case; A7-08).
- **The seeded sound share** (30–60% per session) is never displayed.
- **Evidence:** erroneous examples (A, small [alemdag25]); sound and flawed twins side by side (A [alfieri13]).

### 6.11 Today card

Each Today card is a sheet with a 12-px caps kind label, a title, one context line, an estimate in minutes from logged item times, and one action.

| Kind | From | Shows | Action |
|---|---|---|---|
| Due item | M-today, generator families | the KC in words; "fresh variant" | Start |
| Re-find | M-re-find | "Same move, new specimen", with the specimen's class | Start |
| Sure-and-wrong return | M-sure-wrong-returns | "A call you were sure of, on a fresh variant" | Start |
| Audit case | M-audit-desk (0–1 per session) | "An audit case from S‹n›"; never the gap | Open |
| Resume | the current lab stage | the last receipt, the failing check, the open goal from the receipt, and the park note | Open on the Bench |
| This has changed | M-change-cards | "‹N› things you learned have changed" | Review |
| Erosion forecast | M-erosion-forecast | "Restate ‹claim› from memory, then call which segment cracks", with a short crack line | Forecast |
| Keep-alive due | M-lean-keep-alive | "A 20–30-minute Lean session is due": its own Keep session, never part of Today | Start or plan |
| Drawer surfaced | a deferred drawer's trigger | "‹topic› now has a reason to be open" | Open |
| Clearinghouse | M-docket | "‹k› incidents this week" | Open |
| Note | M-notes, after S2, S5, S7 and S9 | "A technical note fits here" | Start a draft |
| Welcome back | M-welcome-back | replaces the plan after 7 or more idle days | Start |

**Rules.** No overdue counts, streaks, daily counters, deadlines or red badges. The plan states its composition ("4 items · 1 audit case · 1 re-find · about 11 minutes"), never a backlog. The learner can stop after any card and loses nothing. Spacing drives the plan (A [latimier21][cepeda08]); resumption is designed, never debt (B [silverman23]).

### 6.12 Mirror panels

- **Bias, first.** Stated confidence minus accuracy, with its interval, shown above the threshold only (defined below). Stated confidence is imputed from the band: for guess, midway between the item's chance and 2/3; for think so, 0.73 [D]; for sure, 0.90 [D] (spine §8.5).
- **Hit rate by band.** Three rows: guess, think so, sure. Each row prints n and hits, and draws the hit rate's Wilson 95% interval as a dimension line on a 0–100% axis, beside a pale ink bracket for the band's range (guess: chance to 67%; think so: 67–80%; sure: 80–100%). A sentence appears only when the band has reached the diagnosis threshold (at least 20 calls, spine §8.5, fixed as one constant in W1-T07) and its interval lies outside the band: "Your 'sure' calls hit less often than 'sure' says: ‹hits› of ‹n›, interval ‹low›–‹high›." Below the threshold: "Too few calls in this band to say anything yet (‹n›)."
- **What counts.** Post-instruction, unassisted calls only; assisted calls are shown apart (pedagogy digest §3.4).
- **VRK₃₀.** "Reasoning moves still yours at 30 days": the count, its rate per active study-month with an interval, and the KCs counted; then the settled KCs with their dates.
- **Ink only.** No stamp hue, no green-good/red-bad, no comparison with other learners, no population target (spine §2.3).
- **Private.** Reached from Today, never shown on Claims, never part of the exported report.
- **Evidence:** calibration feedback cut overconfidence, but content teaching raised it, and nothing is diagnosed from small n (B/C [stone00]).

### 6.13 Receipt view

- **The receipt is a title block** (§6.1): Project = lab; Sheet = stage and receipt; Drawn = `createdAt`; Rev = receipt SHA-256; Scale = budgets (`rlimit`, workers, seed); Checked by = tools, versions and binary hashes.
- **Below it:** the lane badge; the environment (devcontainer digest, OS, sandbox "on", "off" or "failed", recorded and never required [X RUN-lean-bwrap-docker]); verdict lines verbatim in JuliaMono, wrapped but never reworded; statements with their comparator-style SHA-256; per-engine blocks (Lean checkers, verdicts, axioms per theorem, native axioms, `sorry` count, automation flags; TLC constants, flags, distinct states, depth, result; Z3 `rlimit`, verdict, `reason_unknown`; PostgreSQL version, isolation level, SQLSTATE classes); per-check results; the trusted computing base; claims to mint or update, each with its derived stamp; provenance as self-reported (`assisted`, `agent`).
- **Never rendered as HTML.** The instrument origin parses and schema-validates the receipt (I6); the main origin renders the validated fields as text nodes only.
- **Every verdict is parsed; no exit code is trusted alone.** A `sorry` build exits 0 [X RUN-lean-axioms], and TLC exits 0 at "Deadlock reached" [X RUN-tlc-doublespend].
- **A changed statement hash** voids the claim's first segment to `UNKNOWN [?] · statement hash changed`. That is a void, not an erosion, so it draws no crack.

### 6.14 Path drawing and list mirror

- **The list is the document.** SCR-stages renders an ordered list of path nodes; the drawing is an SVG built from the same data and hidden from assistive technology, so cutting the drawing (spine §14's cut order lists "path drawing") loses nothing.
- **Nodes** sit at equal spacing on one solid route. Status is ink: ○ not started, ◐ in progress, ● signed off, ◉ settled, each with its words. "You are here" is the ▸ pointer.
- **Rests-on edges appear on focus or hover:** thin solid arcs from the stages whose KCs the focused stage requires, with the same facts printed in the list ("Rests on S1 and S3").
- **The builder's path** (OD-3) redraws the route in its published order, with split nodes ("S5 · L1–L8", then later "S5 · L9") and the soft-edge substitute D-23 noted on its node.
- **No tower, no widths, no stars.** A route, not a ladder.

### 6.15 Smaller components

| Component | Spec |
|---|---|
| Lane badge | §5.5 |
| KC tag | the KC's name in words; its ID on focus or hover; a "threshold" label where it applies |
| Lesson rail | segment titles only, never answers, verdicts or option text (spine §3.0; V2-05). The claims and specimens a lesson establishes appear only after its exit questions (A7-07) |
| Sidenote | in the right margin at 1100 px and wider; inline and expandable below |
| Content card | one block type with variants: production twin (upstream counterpart at a SHA from {{run:RUN-twin-pins}}, 60-day TTL, "stale since ‹date›" afterwards), dated incident, "Build this" (next lab stage, minutes, lane), "this will feel harder" (M-feels-harder, B [deslauriers19]), drawer pointer |
| Deferred drawer card | the "deferred" label, the topic, why the roadmap defers it, and its trigger; always openable |
| Hint ladder | an explanation field first (uncredited), then rungs R0 teach-back, R1 concept, R2 the stuck goal, R3 a `sorry` skeleton, R4 the informal proof, each opened deliberately; past R2 the check reads "assisted" until an unseen variant passes (M-hint-ladder; A−/C [bastani25][sankar26]) |
| Stuck protocol | offered at 25, 45 and 90 minutes on a stage, as an offer and never a countdown: `statespace stuck` output (a minimal example with private paths stripped), community venues, and "Park this goal" (a parked goal, carried as [A] in the claim, re-found in 7 days) |
| Proof order | Proof Blocks (M-proof-blocks): pick a step up with Space, move it with ↑ and ↓, drop it with Space; a live region announces "moved to position 2 of 5"; one or two distractors; graded as a DAG; feedback "matched" or "missed at step ‹k›" (B [poulsen23]) |
| Trace table | §10.4; used by INS-theater, INS-history, INS-sim and imported TLC traces |
| History viewer | INS-history: transactions as lanes labeled "txn A", "txn B" (never "S1", which is a stage); statements with outcomes and SQLSTATEs verbatim; the compilation pattern named in the header (read-modify-write for SP-6.2, the conditional UPDATE for SP-6.6) [X RUN-pg-anomalies]; the serial-order search prints its bound (6–8 transactions) and earns [T] |
| Paired-state viewer | INS-pairs: two executions side by side, the observer's view framed, differing fields marked, the distinguishing observation under a heavy vermilion rule once a leak is witnessed, bounds printed |
| Change card | the old line struck through in pencil, the new line in ink, a dated source, two retrieval items (M-change-cards) |
| Agent quote | a block quote with a 1-px pencil rule and the label "UNREVIEWED · the agent's words" |
| Revision mark | △‹n› beside a line an erratum changed, linking to SCR-changes |
| Banners | "Draft: first-learner pass pending" on unreviewed content (spine §13); "unverified since ‹date›" on course claims after a red night; both pencil text under a solid rule |

**Content block types for W1–W2.** V2-18 allows at most six, counted by GATE-lessons, and the spine names them (spine §12 item 48): (1) prose, with sidenotes and inline math, which also carries a static table or figure drawn from runs; (2) instrument, an instrument cell, which also carries a Goal Replay strip (W2 only); (3) item: prequestion, graded item or exit question; (4) claim; (5) specimen; (6) card, which is the content card. The rail, provenance blocks, "Establishes", stamps and Today cards are shell components rendered from data, not authored blocks.

---

## 7. Layout, navigation and the phone contract

### 7.1 Breakpoints

| Width | Role | Layout |
|---|---|---|
| 320 px | reflow floor | one column, no horizontal page scroll (WCAG 1.4.10); code, traces and wide tables scroll inside their own frames |
| 360 px | phone design width | one column; 16-px gutters; bottom navigation |
| 600 px | large phone, small tablet | strips three across; two-column card grids; 24-px gutters |
| 900 px | tablet, small laptop | tables appear (SCR-claims, SCR-stage, SCR-week); the lesson rail sits beside the article; top navigation replaces the bottom bar |
| 1100 px | laptop | sidenotes move to the right margin; 32-px gutters |
| 1280 px | desktop design width | three zones where a screen needs them (lesson: rail 200, article 680, margin 260); content at most 1180 |

### 7.2 Navigation

- **Destinations:** Today · Stages · Bench · Audit · Claims, plus search (spine §0).
- **Phones (below 900 px):** a bottom bar of the five destinations, each a 56-px-tall target with an icon and a 12-px label; the Bench carries the caption "laptop". A 48-px top bar holds the wordmark, search and settings.
- **Desktop (900 px and wider):** a top bar with the wordmark, the five destinations as text links, the search field with its shortcut (Ctrl K or ⌘K, a modified key, so WCAG 2.1.4 is met), and settings. The current destination carries the ▸ pointer and heavier weight, never color alone.
- **The Mirror** is reached from Today and never appears on Claims.
- **Footer:** the course's assurance page (SCR-assurance), changes (SCR-changes), settings, license and source.
- **Order and landmarks:** "Skip to content" comes first; then banner, navigation, main, complementary (rail, sidenotes) and content information.

### 7.3 Where each screen lives

| Destination | Screens |
|---|---|
| Today | SCR-today (home for return visits), SCR-week, SCR-mirror, SCR-clearinghouse; SCR-changes through its cards |
| Stages | SCR-stages, SCR-stage, SCR-lesson (with instrument cells and Goal Replay), SCR-theater, SCR-derivation, SCR-defence, SCR-drawer |
| Bench | SCR-bench, SCR-lab, SCR-receipt |
| Audit | SCR-audit |
| Claims | SCR-claims, with the tabs Claims · Specimens · Notes leading to SCR-specimens and SCR-notes |
| Everywhere | SCR-search, SCR-settings, SCR-assurance (footer), SCR-boot (first visit) |

### 7.4 The phone contract

- **Flagship phone surfaces** are Today, Lesson, Audit and Claims (spine §0); spine §10.1 marks every screen that also works on a phone.
- **The phone flow** is predict, see a recorded run with its run ID, then queue the hands-on part for the Bench (spine §9.3).
- **Laptop surfaces:** the Bench and labs (phones get resume cards), the Derivation Board (read only on phones), the Theater (vertical lanes on phones), the Defence (Part D on phones) and notes.
- **Queues stay on their device.** With no server, a "Queue for the Bench" item lives on the device that made it and reaches another device only through export and merge-import in SCR-settings (spine §9.3).
- **No download asks first** (OD-6). A cell opens on its recorded run and an engine downloads only when a page needs it, the loader showing its size, so phones still begin on recorded runs.
- **Offline,** after a first visit, Today and items "checked offline" work without a solver download.

### 7.5 Frames, sheets and wide content

- A screen's content sits on one or more sheets on the vellum ground: a 1.5-px structure frame, a radius of at most 2 px, and 16-, 24- or 32-px padding by width.
- Sticky parts (top bar, bottom bar, a cell's Call It sheet, the Theater's action bar) are separated by a 1.5-px rule, never a shadow.
- **No horizontal page scroll.** Code, verdict lines, traces and tables that need width scroll inside their frames. Each such frame is a focusable, labeled region, so a keyboard can scroll it, and shows a hairline edge with the caption "scrolls sideways" instead of a fade.

---

## 8. Screens

### 8.0 Index

| Screen | Purpose | Works on a phone (spine §10.1) | Built by | Wave |
|---|---|---|---|---|
| SCR-boot | the first session, at most 8 minutes | yes | W1-T09 | W1 |
| SCR-today | home for return visits | yes | W1-T08 | W1 |
| SCR-week | the weekly rhythm | yes | W1-T08 | W1 |
| SCR-stages | the ordered path S1–S10 | yes | W1-T02 | W1 |
| SCR-stage | one stage | yes | W1-T02 | W1 |
| SCR-lesson | a lesson | yes | W1-T02 (shell) | W1 |
| SCR-theater | concurrency by hand | no: vertical lanes on phones | W3-T06 | W3 |
| SCR-derivation | the Derivation Board | no: read on phones | W3-T01 | W3 |
| SCR-bench | labs and lanes | no: labeled laptop-only | W1-T13 | W1 |
| SCR-lab | a staged lab | no: resume card on phones | W1-T13 | W1 |
| SCR-receipt | a receipt as a title block | yes | W1-T14 | W1 |
| SCR-audit | the Audit Desk | yes | W1-T17 | W1 |
| SCR-specimens | the specimen cabinet | yes | W1-T16 | W1 |
| SCR-claims | the claim graph and report | yes (cards); a table from 900 px | W1-T15 | W1 |
| SCR-defence | the Defence | no: Part D on phones | W2-T12 | W2 |
| SCR-mirror | private calibration and VRK₃₀ | yes | W1-T07 | W1 |
| SCR-notes | technical notes | no | W2-T15 | W2 |
| SCR-drawer | drawers | yes | W1-T11 | W1 |
| SCR-clearinghouse | the Clearinghouse | yes for incidents; plug-in management is laptop-only | W3-T14 | W3 |
| SCR-assurance | the course's own claims | yes | W5-T08 | W5 |
| SCR-changes | errata and freshness | yes | W3-T15 | W3 |
| SCR-search | search | yes | W1-T02 | W1 |
| SCR-settings | data and downloads | yes | W1-T20 | W1 |
| SCR-instrument | the instrument origin's own page, where untrusted input renders | yes | W1-T14 | W1 |

Each spec below gives the purpose and the IDs it serves, the phone layout at 360 px (regions top to bottom), the desktop layout at 1280 px, the states that matter, and notes. Wireframes are schematic.

### SCR-boot · Start here

**Purpose.** S1.L0, the first session: at most 8 minutes on a phone, with a first success targeted within 4 minutes [ks100x], checked by the GATE-bundle timing gate at 360 px and by at least five naive testers (RUN-boot-firstsuccess) before the "external learners" label. Learners see "Start here"; "Boot" is an internal name (spine §0). **Serves:** S1.L0, SP-1.1, SP-1.4, SP-1.9, INS-z3, M-call-it, M-feels-harder, M-set-your-week, M-test-out (placement).

**Phone (360 px).** One column of sheets under a thin six-node route (skippable steps, never locks):

1. **The agent's claim.** An agent's pull request, its words quoted under UNREVIEWED ("safe, 200 tests green"), and the guarded transfer it adds, a variant whose answer the roadmap does not print.
2. **Call it.** "Is it safe for the sender?" (safe · not safe · can't tell; "3 options · chance 1 in 3"), then a confidence. This first-contact call is recorded and scheduled but counts toward no KC state until S1.L1 teaches it.
3. **Z3.** The instrument cell opens at once on the variant's recorded result {{run:RUN-z3-boot-variant}} (spine §3.1), labeled "recorded result", with "Run it live in this tab" beside it; the tap downloads Z3 without asking while the loader shows its size. The overdraft witness appears (SP-1.1), then the corrected guard's `unsat`, and their stamps land.
4. **The reveal, uncredited.** Re-encoded in BitVec 64, the guard protects the sender but the recipient wraps (SP-1.4) [X RUN-z3-bv64].
5. **The dated incident.** Bitcoin CVE-2010-5139, values that overflowed when summed, as a toy model (SP-1.9 {{run:RUN-z3-btc2010}}; source [btc2010]).
6. **"This will feel harder."** The card sets expectations (B [deslauriers19]); then *Set your week*: a weekly range, planned at the pessimistic end, two study blocks and a Keep block; and an optional placement walk, including "From kernelspace".

```
┌────────────────────────────────┐
│ statespace            Settings │
│ START HERE · about 8 minutes   │
│ ●──○──○──○──○──○   skip ▸      │
├────────────────────────────────┤
│ An agent opened a pull request │
│ ┃ UNREVIEWED · the agent's     │
│ ┃ words: "safe, 200 tests      │
│ ┃ green"                       │
│ ┌ transfer.py ───────────────┐ │
│ │ ‹the agent's guarded       │ │
│ │  transfer›                 │ │
│ └────────────────────────────┘ │
├────────────────────────────────┤
│ CALL IT · safe for the sender? │
│ ( ) safe   ( ) not safe        │
│ ( ) can't tell  · 1 in 3       │
│ How likely is this right?      │
│ guess · think so · sure        │
│ [ Check with Z3 ]              │
└────────────────────────────────┘
```

**Desktop (1280 px).** The same sequence in the 680-px column, with the instrument cell widened to 880 px and the incident card and the "feels harder" card in the right margin.

**States.** Cold worker: the variant's recorded result {{run:RUN-z3-boot-variant}}, labeled "recorded result". No live run: Boot completes entirely on recorded runs. Returning before finishing: Boot resumes at the last step; Today shows a "Finish Start here" card, never a nag.

**Notes.** At most five glossary terms are introduced here: call, stamp, specimen, Today, Keep block (spine §0). Boot's copy therefore says "study blocks", not "Bench blocks", and labels the cold-start result "recorded result" with its ID, leaving the words *Bench* and *run* to LAB-1 and S1.L1 (spine §0).

### SCR-today · Today

**Purpose.** The home for return visits: a 10–12-minute session, phone-first and offline, run 3–5 times a week inside the Keep block. **Serves:** M-today, M-re-find, M-sure-wrong-returns, M-audit-desk, M-change-cards, M-erosion-forecast, M-welcome-back, M-lean-keep-alive (its card), M-docket (its card), M-notes (its card).

**Phone (360 px).**

1. Header: "Today", the date, and the plan's composition and length ("4 items · 1 audit case · 1 re-find · about 11 minutes").
2. Start (a full-width, 48-px primary button), which steps through the cards in order.
3. The resume card for the current lab stage.
4. Erosion forecast and "this has changed" cards, when present.
5. Surfaced cards: a deferred drawer, the Clearinghouse's week, a keep-alive due, a note.
6. Links: Mirror · Your week.

```
┌────────────────────────────────┐
│ statespace          ⌕ Settings │
├────────────────────────────────┤
│ TODAY · ‹date›                 │
│ About 11 minutes               │
│ 4 items · 1 audit case ·       │
│ 1 re-find                      │
│ [ Start ]                      │
├────────────────────────────────┤
│ RESUME · LAB-2.5               │
│ run_conserves                  │
│ Last receipt: LAB-2.c5 fail    │
│ Open goal from the receipt ▸   │
│ [ Open on the Bench ]          │
├────────────────────────────────┤
│ EROSION FORECAST  ╱╲╱╲         │
│ Restate CL-2.4 from memory,    │
│ then call which segment cracks │
├────────────────────────────────┤
│ Mirror ▸        Your week ▸    │
├────────────────────────────────┤
│Today Stages Bench Audit Claims │
└────────────────────────────────┘
```

**Desktop (1280 px).** Two columns: the plan and the session cards in 680 px on the left; the resume card, forecasts, changes and links in a 360-px column on the right.

**States.** Nothing due: "Nothing is due. Practice a stage, or stop here." After 7 or more idle days the plan is replaced by a welcome-back set; after 14 or more, "Back at the bench" (20–30 minutes: the last claim card, three re-finds, one call, the next artifact restated); after 6 weeks or more, a landmark restart with a lighter target for two weeks (pedagogy digest §4.2). Offline: items checked offline run; others wait with their reason.

**Notes.** No overdue counts, streaks, daily counters or deadlines (§6.11). The Lean keep-alive is its own Keep session; Today shows only its card (spine §12 item 26).

### SCR-week · Your week

**Purpose.** The weekly rhythm (M-set-your-week, M-weekly-review, M-monthly-retro). **Serves:** the Keep block computation (spine §3.0), the stage plans of §3.11.

**Phone (360 px).**

1. **Your range,** drawn as a dimension line, planned at the pessimistic end (×1.6, B [buehler94]); two Bench blocks of 90–150 minutes on days the learner picks.
2. **The Keep block,** computed, not a constant: at the digest's sizing it plans at 45–75 minutes a week at 6 h/week and 60–105 at 10 h/week [D], recomputed from logged item times.
3. **Rhythm:** "met in ‹k› of the last 12 weeks" (target 8 or more), counting graded or Bench work only. A missed week can be made up within 7 days (repair softens a broken rhythm, B [silverman23]), declared breaks pause the window, and two reserve weeks per 12 are built in.
4. **Weekly review,** 5 minutes over Claims: "What can you now reason about?" (A [harkin16]); an optional human reviewer (OD-9).
5. **Monthly retro,** 15 minutes, one or two if-then plans (A, small [sheeran25]).
6. **Stage plans:** each stage's plan range beside the roadmap's range, both as dimension lines (S2: 15.6–28.5 h against 3–6 weeks), and the arc projected as a range (about 42–78 weeks at 6 h/week, spine §3.11), never as "behind".

**Desktop (1280 px).** Two columns: plan, Keep block and rhythm on the left; the stage-plan table with dimension lines on the right (a table from 900 px).

**States.** First week: the rhythm reads "starts counting this week". On a declared break: "On a break until ‹date›; the window is paused."

**Notes.** The rhythm is gain-framed and repairable; there is no daily view and no streak.

### SCR-stages · Stages

**Purpose.** The ordered path S1–S10 with a list mirror (§6.14). **Serves:** the stage map, OD-3's two published paths, M-test-out, drawers D-30–D-40 (the deferred topics link).

**Phone (360 px).** A path selector (roadmap order, the default, or the builder's path, as native radios), then the list: one row per node, with a node glyph on a vertical route, the stage number and name, its new tool, its status in words ("signed off ‹date›", "in progress · LAB-2.5", "not started"), its plan range, and "Test out". Focusing a row prints "Rests on S1 and S3". The list ends with "Deferred topics (11 drawers)".

```
┌────────────────────────────────┐
│ STAGES   ( ) roadmap order     │
│          ( ) builder's path    │
├────────────────────────────────┤
│ ●  S1 Counterexample · Z3Py    │
│ │  signed off ‹date›           │
│ ◐  S2 Proof · Lean 4      ▸    │
│ │  in progress · LAB-2.5       │
│ │  plan 15.6–28.5 h            │
│ ○  S3 Semantics                │
│ │  not started · Test out ▸    │
│ ⋮                              │
│ ○  S10 Assembly                │
├────────────────────────────────┤
│ Deferred topics (11 drawers) ▸ │
└────────────────────────────────┘
```

**Desktop (1280 px).** The drawn path on the left (equal spacing, nodes on one route, rests-on arcs drawn on focus); a summary sheet for the focused stage on the right: compact title block, lessons graded, lab stage, Defence parts, seams planted or cracked, plan range.

**States.** Builder's path: split nodes ("S5 · L1–L8", "S5 · L9") and the D-23 substitute on S6.L2's node. Placement in progress: the walk's result shown beside each KC-backed stage.

**Notes.** Nothing locks; every node opens. Status is derived at read time (I2) and drawn in ink.

### SCR-stage · one stage

**Purpose.** One stage at a glance. **Serves:** the stage's lessons, LAB-n stages and checks, Defence, SEAM and ER events, AUD anchors, drawers, production twins, budget, sibling bridges.

**Phone (360 px).**

1. Compact title block: stage, title, new tool, roadmap time, plan range, edition pins (Lean 4.35.x or PostgreSQL 18.6 where they apply, OD-12).
2. Lessons: ID, title, and format in plain words ("full lesson · 40–60 min" for core, "short lesson with reading · 15–25 min" for bridge), status in ink.
3. Lab: LAB-n stages with minutes (weekend stages marked), per-check results, the 2-minute first win first.
4. The Defence: four parts with status; S9 shows two halves, each with its mini-Defence.
5. Seams: planted (dashed) and cracked (crack), with their ER IDs once fired.
6. Audit anchors, drawers, production twins (pins from {{run:RUN-twin-pins}}), sibling bridges.
7. Budget: hours as a dimension line against the roadmap's range.

Each section is a disclosure; the first two are open.

**Desktop (1280 px).** Two columns: lessons and lab on the left (tables from 900 px); Defence, seams, anchors, drawers, twins and budget on the right. S10 shows its seven capstone steps (tier `[step]`) with the lab stage that builds each (LAB-3.8–LAB-3.11, LAB-4.5, LAB-6.8, LAB-8.7, LAB-10).

**States.** Draft content: the draft banner on the stage and on each unreviewed lesson.

**Notes.** Lesson tiers show as plain formats, because "core" and "bridge" are not glossary terms; the tier tags stay in data and search.

### SCR-lesson · a lesson

**Purpose.** A lesson: 680-px prose, a rail of segment titles only, sidenotes, prequestions, instrument cells, Call It, Goal Replay, exit questions, and "Build this" and twin cards. **Serves:** every `S{n}.L{k}`, M-prequestion, M-call-it, M-layered-feedback, M-goal-replay-fading, M-production-twin.

**Phone (360 px).**

1. Compact title block (Sheet, Rev, Drawn, Checked by).
2. A "Segments" disclosure with titles only.
3. The lesson column: a prequestion ("Before this segment"), prose, instrument cells whose Call It docks as a sticky sheet inside the cell, Goal Replay one frame per screen, graded items, sidenotes inline and expandable.
4. Exit questions, then "Establishes": the claims and specimens the lesson mints, shown only now.
5. "Build this" and twin cards.

Heavy instruments (the Bench engines) show a recorded run with its ID and "Queue for the Bench".

**Desktop (1280 px).**

```
┌ statespace   Today  Stages  Bench  Audit  Claims      ⌕ Search (Ctrl K)   Settings     ┐
├────────────────────────────────────────────────────────────────────────────────────────┤
│ S1 · COUNTEREXAMPLE ▸ S1.L1 · Negate, then search · full lesson · 40–60 min            │
│ SHEET S1.L1 │ REV ‹hash› │ DRAWN ‹build date› │ CHECKED BY Z3 5.3.1 (RUN-z3-starter)   │
├───────────────┬───────────────────────────────────────────┬────────────────────────────┤
│ SEGMENTS      │ Before this segment: ‹prequestion›         │ ‹sidenote›                 │
│ ▸ ‹segment 1› │ ‹prose, 19 px, at most 680 px›             │                            │
│   ‹segment 2› │ ┌ instrument cell (§6.2) ───────────────┐  │                            │
│   ‹segment 3› │ │ … Call It inline …                     │  │                            │
│   Exit        │ └────────────────────────────────────────┘  │                            │
│ (titles only) │ ‹graded item› · ‹exit question›            │                            │
└───────────────┴───────────────────────────────────────────┴────────────────────────────┘
```

The rail (200 px) sticks; the margin (260 px) holds sidenotes from 1100 px; below 900 px the rail folds into the "Segments" disclosure.

**States.** Cold instruments: recorded runs, labeled. Offline: prose and recorded runs. Draft: the draft banner.

**Notes.** The rail never shows answers, verdicts or option text (V2-05; GATE-lessons' rail lint), and nothing a lesson establishes appears before its exit questions (A7-07). A segment is 12–15 minutes and ends in a graded item (spine §3.0). On desktop Call It sits inline in the cell; the sticky sheet is a phone layout.

### SCR-theater · the Theater

**Purpose.** Concurrency played by hand on real TLC state graphs (§6.7). **Serves:** INS-theater, INS-spectacle, INS-lasso, M-telescope; the lessons that use it (S5.L1, S5.L3, S5.L5, S5.L6, S8.L1–S8.L3); GEN-trace-allowed, GEN-find-the-witness, GEN-lasso-or-not; SP-5.1, SP-5.5.

**Phone (360 px).** Vertical lanes, time flowing down:

1. Header: scene, constants, and History and Map buttons that open sheets.
2. The shared-state band, sticky.
3. Lanes as columns, one per process; each step in its lane, numbered.
4. Monitors (observations) and the TLC comparison.
5. The enabled-action bar, sticky at the bottom: 44-px buttons, wrapping to at most two rows, with "More actions" for the rest.

A "Table" toggle swaps the lanes for the trace table with its narration column.

```
┌────────────────────────────────┐
│ ◂ S5.L3 · Theater   History  Map│
│ SHARED  bal 20 · spent 160     │
├────────────────┬───────────────┤
│ w1             │ w2            │
│ 1 Read →100    │               │
│                │ 2 Read →100   │
│ 3 Write ←20    │               │
│                │┃4 Write ←20 ✗┃│
├────────────────┴───────────────┤
│ NoOverspend: violated, step 4  │
│ TLC: 4 actions (5 states)      │
├────────────────────────────────┤
│ ENABLED [ w1 ▸ … ] [ w2 ▸ … ]  │
└────────────────────────────────┘
```

**Desktop (1280 px).**

```
┌ THEATER · S5.L3 · DoubleSpend · TLC state graph · Init = 100, Amount = 80, Workers = {w1, w2} ────────────────────────────┐
├───────────────┬────────────────────────────────────────────────────────────────┬──────────────────────────────────────────┤
│ HISTORY       │ step      1             2             3             4          │ ENABLED NOW                              │
│ ● start       │ w1     Read bal→100                Write bal←20                │ [ w1 ▸ … ]  [ w2 ▸ … ]                   │
│ ├● w1 Read    │ w2                   Read bal→100              ┃Write bal←20┃  │ faults: crash w1 (ink)                   │
│ │├● w2 Read   │ shared bal 100       bal 100       bal 20       ┃bal 20     ┃  │ MAP                                      │
│ ││└● w1 Write │        spent 0       spent 0       spent 80     ┃spent 160 ✗┃  │ visited ‹k› of 11                        │
│ │└○ …         │ MONITORS · observations, not stamps                            │ reachable (TLC, complete, invariant off) │
│ └○ w2 Read    │ NoOverspend: violated at step 4                                │ [ Loop back to a state ]                 │
│               │ TLC's counterexample: 4 actions (5 states) · yours: ‹k›        │ [ Lanes ⇄ Table ]                        │
└───────────────┴────────────────────────────────────────────────────────────────┴──────────────────────────────────────────┘
```

The steps, the final `spent = 160, bal = 20` and the trace counts come from DoubleSpend's recorded run, and the reachable total from the complete run [X RUN-tlc-doublespend, RUN-tlc-full]; the learner's own trace and visited count are live.

**States.** Edit mode: learner edits run in Spectacle up to about 5k states [D]; past that, "Run this with TLC on the Bench", with a recorded run where one exists. Liveness scenes add the lasso tool. Offline: authored scenes still play, because their graphs ship with the page.

**Notes.** Monitors never stamp; only TLC or Spectacle results earn [M] (INS-theater). Faults are ink. Shortcuts act only while the Theater has focus, are listed, and can be turned off (WCAG 2.1.4); a live region announces each step (§10.3).

### SCR-derivation · the Derivation Board

**Purpose.** Weakest preconditions step by step, each step checked by Z3 (§6.8). **Serves:** INS-derivation; S4.L1–S4.L4; GEN-wp-it; fading family F3; SP-4.2.

**Phone (360 px).** Read only: the command, the postcondition, then the derivation as a list of steps, each with its rule and its result, and "Derive on a laptop", which queues the work.

**Desktop (1280 px).** The command, postcondition and current obligation across the top; the steps as a table in the middle; the keyboard stepper toolbar under it; on the right, the rule reference (assignment, sequence, the four guard readings) and the selected step's Z3 result, with its distinguishing state as a small table.

**States.** A step that is not valid shows its distinguishing state; later steps resting on it are marked "follow-on". Z3 not loaded: steps can be written, and they are checked once the solver loads.

**Notes.** The keyboard-only path is a W3 exit criterion; "Derivation Board polish" is first in the cut order (spine §14), so polish is optional and the stepper is not.

### SCR-bench · the Bench

**Purpose.** Labs and lanes: the lab list, `statespace doctor` output, receipt and lab-bundle import by file or link, and lane badges. **Serves:** LAB-1–LAB-10, INS-receipt, INS-bench-lean, INS-bench-tlc, INS-bench-pg, INS-bench-smt, INS-bench-souffle, INS-bench-cargo, D-15.

**Phone (360 px).** A note that the Bench is the learner's laptop with the real tools, so a phone reads receipts and resume cards; the lab list (lab, current stage, last check result); recent receipts; import by file, of a receipt or a lab bundle.

**Desktop (1280 px).** The lab table (lab, current stage, last check, receipt date, lane); the environment panel from the latest receipt's `statespace doctor` block (devcontainer digest, OS, sandbox state); the import area: a drop zone drawn with a solid rule (never dashed, §4.1), the controls "Import a receipt" and "Import a lab bundle", and "Import from a link", which opens the instrument origin (§8.24).

**States.** S1: "LAB-1 needs no devcontainer: `uv run --with z3-solver==5.3.1`, or run it in the tab" (spine §3.1). Before S2: a setup card for the devcontainer and `statespace doctor` (D-15), noting that the Lean toolchain unpacks to 3.0 GB [X RUN-lean-toolchain].

**Notes.** Receipt and lab-bundle bytes go to the instrument origin for parsing; the main origin renders only validated fields (I6). A lab bundle, which `statespace export` writes, fills the read-only mirror of the lab repo that SCR-claims dates with its "as of" line.

### SCR-lab · a staged lab

**Purpose.** A staged lab with per-check results. **Serves:** `LAB-n.k`, `LAB-n.ck`, M-hint-ladder, M-prove-it, M-stuck-protocol, M-claim-card, M-manual-mode.

**Phone (360 px).** The resume card: the current stage and its minutes, the last receipt's per-check results, the failing check or open goal from the receipt, and the park note; "Queue for the Bench"; the stage list, read only.

**Desktop (1280 px).** Three columns:

- **Stages** (left): the 2-minute first win first; stages of at most 25 minutes, or 45 at weekends (marked); `[stretch]` stages marked optional.
- **The current stage** (center): predict, then run the reference; 3–5 investigation items; what to build; the exact `statespace check` command; per-check results from the imported receipt; Prove-it, in which the learner predicts the outcome of seeded mutations of their own artifact, agent closed.
- **Help and claims** (right): the hint ladder behind its explanation field; the stuck protocol; the stage's claim cards, fading from receipt-prefilled to learner-written.

**States.** Waiting for a receipt: "Run `statespace check ‹lab›.‹stage›` on your machine, then import the receipt." A failed check shows its parsed verdict line. Past rung R2, the check reads "assisted" until an unseen variant passes. A parked goal shows as [A] in the claim, with its re-find date. Manual-mode stages flag automated closes on the receipt (M-manual-mode).

**Notes.** No timer is shown. The stuck protocol is offered at 25, 45 and 90 minutes as an offer: "You've been on this stage about 45 minutes. Want the stuck protocol?"

### SCR-receipt · a receipt

**Purpose.** A receipt rendered as a title block (§6.13). **Serves:** INS-receipt, `receipt@1`.

**Phone (360 px).** The title block as a two-column grid; the lane badge and environment; verdict lines (wrapped, verbatim); statements and hashes; checks; the trusted computing base; claims to mint, as cards with their derived stamps; provenance.

**Desktop (1280 px).**

```
┌ PROJECT LAB-2 · statespace-lab ┬ SHEET LAB-2.5 receipt ┬ DRAWN ‹createdAt› ┬ REV ‹sha256› ┬ SCALE ‹budget› ┬ CHECKED BY Lean 4.35.0 · lake comparator ┐
│ reported from your machine · sandbox ‹on | off | failed›, recorded, never required · devcontainer ‹digest›                                          │
├─────────────────────────────────────────────────┬───────────────────────────────────────────────────────────────────────────────────────────────┤
│ VERDICT LINES, verbatim                         │ CHECKS        LAB-2.c5 pass                                                                     │
│ Your solution is okay!     exit 0               │ CLAIMS TO MINT                                                                                  │
│                    [X RUN-lean-comparator]      │ CL-2.4  PROVED [P] · Lean 4.35.0 kernel · axioms listed                                         │
│ AXIOMS                                          │ TCB     Lean 4.35.0 kernel; lake comparator; ‹more›                                             │
│ run_conserves: [propext, Quot.sound]            │ PROVENANCE  assisted: ‹none | explain | code› · agent: ‹yes | no› · self-reported               │
│                    [X RUN-lean-ledger]          │                                                                                                 │
│ STATEMENTS  Challenge.lean  sha256 ‹…›          │                                                                                                 │
└─────────────────────────────────────────────────┴───────────────────────────────────────────────────────────────────────────────────────────────┘
```

**States.** Not a `receipt@1`: "This file is not a receipt: ‹validator message›. Nothing was imported." Over the size cap: refused with the cap stated. A statement hash that no longer matches voids the claim to `UNKNOWN [?] · statement hash changed`.

**Notes.** The receipt never renders as HTML and never trusts an exit code alone.

### SCR-audit · the Audit Desk

**Purpose.** Judge whether a claim is justified, with typed evidence (§6.10). **Serves:** M-audit-desk, M-twins, GEN-spot-the-gap, AUD-1.1–AUD-9.2, G1–G13.

**Phone (360 px).** The landing shows the cases scheduled now (from the Keep block), every case by stage (all open), and "Your audit record": counts, audit accuracy with its Wilson interval, per-class figures once a class reaches n ≥ 10. A case runs one step per screen under a five-node route. The diff wraps, with line numbers in 44-px rows that the learner taps, or reaches by keyboard, to anchor evidence.

```
┌────────────────────────────────┐   ┌────────────────────────────────┐
│ ◂ Audit · case ‹n›    ●○○○○    │   │ ◂ Audit · case ‹n›    ●●●●○    │
│ THE STATEMENT, ALONE           │   │ WHAT KIND OF GAP?              │
│ theorem refund_nonneg … :      │   │ ( ) None: sound                │
│   0 ≤ ‹…›                      │   │ REBUTTING                      │
│ Supports: "refunds never       │   │ ( ) G1 Statement too weak      │
│ overdraw"                      │   │ ( ) G2 Vacuous premise         │
│ CALL IT                        │   │ ( ) G3 Wrong property kind     │
│ ( ) sound   ( ) has a gap      │   │ ( ) G12 Requirement mismatch   │
│ How likely is this right?      │   │ UNDERMINING                    │
│ guess · think so · sure        │   │ ( ) G4 … ( ) G5 … ( ) G6 …     │
│ 2 options · 1 in 2             │   │ UNDERCUTTING  ( ) G8 … ( ) G13 │
│ [ Call it, then reveal ]       │   │                                │
└────────────────────────────────┘   └────────────────────────────────┘
```

**Desktop (1280 px).** Two columns: the case on the left (statement first; then, once revealed, the description and the line-numbered diff); the finding form on the right, steps 1–5 in order.

**States.** After submission: counts, the keyed evidence beside the learner's, the "based on" card, and "Try a variant" (GEN-spot-the-gap). An abandoned case resumes at its step.

**Notes.** No default class; "none: sound" first; the agent's words quoted under UNREVIEWED; no teasers; the session's seeded sound share is never shown.

### SCR-specimens · the specimen cabinet

**Purpose.** Counterexamples kept beside their fixes. **Serves:** M-specimen-cabinet, M-re-find, M-hall-of-records, SP-1.1–SP-9.6, the learner's own specimens.

**Phone (360 px).** Filters as chips with counts (all · mounted · kept · dated incidents); drawers by stage, each listing ID, title, [R] stamp, status and re-find date; tap opens the full label (§6.5).

**Desktop (1280 px).** A filter rail on the left (stage, status, dated incidents, KC); a grid of specimen labels, two or three across.

**States.** A stage with none yet shows its drawer, labeled "none yet", never hidden. The "dated incidents" filter shows source, date, toy-model note and nightly re-run status (internally the Hall of Records; spine §12 item 16).

**Notes.** Labels come from runs (GATE-specimens). "Kept" means a re-find on a fresh variant at least 7 days later.

### SCR-claims · Claims

**Purpose.** The claim graph and the report. **Serves:** M-claim-card, M-assurance-strip, M-seam-erosion, M-weekly-review, `statespace export`, `report@1`, CL-*, SEAM-*, ER-*.

**Header.** "‹n› claims · ‹m› assumptions · ‹k› erosions. Start with what they rest on." Never a count of PROVED claims, which would teach that PROVED needs no reading (A7-03). Under it, a pencil line reads "As of ‹bundle date or commit›": the screen shows a read-only mirror of the lab repo, filled by a lab bundle imported on the Bench (SCR-bench), and the line says how old it is.

**Phone (360 px).** Tabs: Claims · Specimens · Notes. Filter chips with counts (stage; a stamp in a given segment; cracked; open defeaters); claim cards with their strips; the rests-on view (pick an assumption, see every claim on it: the blast radius); the erosion log; export (Markdown, JSON).

**Desktop (900 px and wider).** A table, with a graph view one toggle away:

```
┌ CLAIMS · ‹n› claims · ‹m› assumptions · ‹k› erosions. Start with what they rest on. ─── [ Table | Graph ] [ Export ▾ ] ┐
│ Claim  │ Proposition            │ Proposition of model   │ Correspondence          │ Requirement fit │ Assumes │ Lane │
│ CL-1.1 │ guarded transfer never │ PROVED [P] · Z3 5.3.1  │ ASSUMED [A] · balances  │ ASSUMED [A] ·   │ SEAM-1  │ tab  │
│        │ overdraws the sender   │ unsat · uncertified …  │ are unbounded integers  │ ‹why›           │ SEAM-7  │      │
│ CL-2.2 │ transfer_nonneg        │ PROVED [P] · Lean …    │ ╱╲╱ cracked · ER-1      │ ASSUMED [A] · … │ SEAM-1  │ mach │
│ CL-5.1 │ atomic transfer never  │ MODEL-CHECKED [M] ·    │ ASSUMED [A] · ‹why›     │ ASSUMED [A] · … │ —       │ mach │
│        │ overspends             │ Init = 100, Amount …   │                         │                 │         │      │
└────────┴────────────────────────┴────────────────────────┴─────────────────────────┴─────────────────┴─────────┴──────┘
```

The Lane column prints the full badge words (*re-checked here*, *reported from your machine*, *self-assessed*); the wireframe abbreviates them. CL-1.1's open defeater, "encoding unverified", stacks under its first segment in the card. The rows' stamps are CL-1.1's [X RUN-z3-starter], CL-2.2's [X RUN-lean-ledger] and CL-5.1's [X RUN-tlc-atomic].

In the graph view, claims, assumption records and specimens are nodes and rests-on edges join them; a crack propagates along the edges (§9); the selected claim's card opens in a side panel. The weekly review sits above the table: "What can you now reason about?" (5 minutes).

**States.** No claims yet: "Your first two claims come from LAB-1.6." A fresh erosion: its forecast runs in Today first, then the crack appears here.

**Notes.** The Mirror never appears here. The export follows the roadmap's report categories (proved, model-checked, runtime-enforced, assumed), extended with more of the course's stamps (tested, configured, not covered; LAB-10.c8). It also carries a checker matrix, statement hashes and a defeater log reading "m of n", never summed (KC-10.defeater-log).

### SCR-defence · the Defence

**Purpose.** The four-part sign-off assessment, untimed, over at least two sessions (spine §8.6). **Serves:** M-defence, M-explain-back, GEN-defend; every stage's Defence; S9's two mini-Defences.

**Phone (360 px).** Part D: the explain-back prompt ("Explain aloud, for about two minutes, ‹the completion test›"), an optional stopwatch that counts up and is off by default, then the three-idea self-check compared with Part A. Parts A–C show their status, marked "on a laptop".

**Desktop (1280 px).** One tab per part:

- **A, probes:** 10–12 unseen-seed items, one shot each, feedback only after submission, a call on each.
- **B, defend:** predictions for 4–6 seeded mutations of the learner's own artifact; then "Run `statespace defend`" and import the receipt.
- **C, audit:** four cases, at least one sound, through the audit flow.
- **D, explain-back:** as on phones; required and uncredited.

The result panel shows each part as "‹k› of ‹n›", with its Wilson interval drawn as a dimension line against the 60% part floor and the 75% overall line; the course's stamp on its own assessment, such as `TESTED [T] · 10 of 12 unseen items · Wilson 0.55–0.95` [D]; and, apart from it and in ink, the learner state "Signed off" once the criteria and three spaced sessions are met.

**States.** A failed part: "Retake this part on fresh seeds from ‹date›." Nothing locks meanwhile, and every attempt stays in the log.

**Notes.** No countdowns anywhere: timed Defences are an anti-pattern (BRIEF §3.3). "Signed off" never wears a stamp color or frame (V2-02).

### SCR-mirror · the Mirror

**Purpose.** Private calibration and VRK₃₀ (§6.12). **Serves:** M-mirror, §2.3, §8.5.

**Phone (360 px).** Bias, when there are enough calls; hit rate by band (three rows with dimension-line intervals); VRK₃₀; settled KCs; a short "How to read this" drawer.

**Desktop (1280 px).** Two columns: bias and hit rate by band on the left; VRK₃₀ and settled KCs on the right.

**States.** Few calls: "Too few calls in this band to say anything yet (‹n›)." Assisted calls appear in their own rows.

**Notes.** Ink only; private; reached from Today; never on Claims.

### SCR-notes · technical notes

**Purpose.** A 600–1,000-word note after S2, S5, S7 and S9, from memory first (M-notes; A, small [bangertdrowns04]).

**Phone (360 px).** Drafts readable and editable, with a note that the layout is built for a laptop.

**Desktop (1280 px).** A Markdown editor with a serif preview, opening on the roadmap's three prompts as headings: the model, the surprising failure, what changed your understanding. A quiet "about 600–1,000 words" range with a live count. After the draft: "Attach evidence", a picker for specimens and receipt hashes. Export as Markdown, and a note that publishing, for example in the learner's public lab repo, is optional.

**States.** No due dates: a cadence card appears in Today after the stage.

### SCR-drawer · drawers

**Purpose.** Side material, always open (spine §3.12). **Serves:** D-01–D-23; deferred D-30–D-40.

**Phone (360 px)** and **desktop (1280 px).** A reading layout like a short lesson: title, text, where it is used, back link. A deferred drawer adds the "deferred" label and a card: what the topic is, why the roadmap defers it, and what surfaces it ("surfaced when ER-1 fires, for the `i64` path of your Rust", for D-30).

**Notes.** Opening a drawer is noted in the local log and never required. A trigger surfaces a drawer in Today; it unlocks nothing.

### SCR-clearinghouse · the Clearinghouse

**Purpose.** The persistent world the learner's components plug into (M-docket; OD-14). **Serves:** W3-T14, W4-T14, W5-T13; RUN-docket-baselines; ER-12.

**Phone (360 px).** "Week of ‹date› · ‹k› incidents"; the incident cards (an agent proposal as quoted UNREVIEWED text with its diff and "Run your checker", decided through the audit flow; a gap-class incident; an erosion when one fires); plug-in status (your checker, LAB-4, ‹sha›; the compiler, "reference module, earns nothing", until yours is in; the outbox machine; the validator); the world in brief (accounts, postings and holds; users, teams and documents from S7; the provider from S8).

**Desktop (1280 px).** Three columns: incidents (main), the world (side), plug-ins (side).

**States.** Before LAB-3: "Nothing of yours is plugged in yet. Incidents begin after LAB-3." The world is still open to browse.

**Notes.** The seeded sound share of proposals is never shown; incident thresholds are proven against a naive and a reference baseline (RUN-docket-baselines); erosions come from the oldest open erodible seam (spine §5.4).

### SCR-assurance · what this course claims about itself

**Purpose.** The course's own claims, stamped by the same rules as the learner's (`/assurance`). **Serves:** W5-T08, SEAM-13, spine §8.9, OD-8.

**Phone (360 px)** and **desktop (1280 px)**, desktop in two columns (claims; erosion log):

1. **The course's claims:** gates as stamped claims with run references, for example "INS-interp agrees with the Lean reference: `TESTED [T] · ‹n› goldens`" (GATE-interp; the held seam SEAM-13) and "Spectacle's state counts equal TLC's on the double-spend family" (11, 45, 191 and 813 distinct states [X RUN-spectacle, RUN-tlc-full]). A red night marks the claims it touches "unverified since ‹date›".
2. **The course's erosion log:** each tool bump re-runs `runs/`, and its reviewed diff becomes an EROSION entry.
3. **Edition pins:** Lean 4.35.x and PostgreSQL 18.6 (OD-12), each with its run.
4. **What this cannot establish** (spine §8.9): unassisted work is self-declared; oracles are visible to a determined learner; Defence Part B has no outcome data; the measurements describe one learner (n = 1) and support no causal claim.
5. **Provenance on the honor system** (OD-8), stated plainly.
6. **What to expect:** effects of tenths of a standard deviation at most; the median education effect is about 0.10 SD [kraft20].

### SCR-changes · changes

**Purpose.** Errata and freshness (M-change-cards). **Serves:** W3-T15; GATE-runs diffs; the facts registry's TTLs.

**Phone (360 px).** Change cards, newest first: the old line struck through, the new line, source and date, what it touches (revision marks in lessons link here), and the two retrieval items it sends to Today. Below them, registry facts past their TTL, each marked "stale since ‹date›".

**Desktop (1280 px).** Two columns: changes on the left; stale facts and tool-bump diffs on the right.

**Notes.** Errata flag "re-check" and never deduct (spine §2.4).

### SCR-search · search

**Purpose.** A build-time index of IDs, lessons, KCs and specimens. **Serves:** W1-T02.

**Phone (360 px).** Full screen: the field on top; results grouped by kind (lessons, KCs, specimens, claims, drawers, IDs), each labeled; recent searches kept on the device.

**Desktop (1280 px).** A 640-px palette opened with Ctrl K or ⌘K: arrow keys move, Enter opens, Escape closes and returns focus to where it was.

**Notes.** An exact ID ("SP-5.1") ranks first. Searching a deferred topic finds its drawer. The index is static: no network request.

### SCR-settings · settings

**Purpose.** Data, downloads and preferences. **Serves:** W1-T20, M-consent, OD-6, OD-8.

**Phone (360 px)** and **desktop (1280 px)**, desktop with a section list on the left:

1. **Appearance:** theme (system, light, night); motion (system, reduce); TLA+ notation (ASCII, pretty); shortcuts (on, off).
2. **Data:** export a bundle; merge-import with undo; the 7-day backup nudge and the last export date, because WebKit may clear script-written storage after seven days without interaction [webkit7d]; storage used.
3. **Downloads:** each engine's size and cache state, with sizes from their runs (Z3 in the tab [X RUN-phone-pyodide]; PGlite [X RUN-pglite-0511]); nothing asks before a download (OD-6); remove each; the service worker's kill switch.
4. **Path:** roadmap order or the builder's path (OD-3); placement.
5. **Honesty and privacy:** "Provenance is self-declared. Nothing on this device can tell assisted work from unassisted work; your declarations schedule and calibrate your practice, and police nothing" (OD-8). No accounts, no telemetry: data stays in this browser and in your lab repo.

### 8.24 SCR-instrument · the instrument origin's page

Two flows must render untrusted input that the main origin may never parse (I6): a spec duel opened from a link (M-spec-duel) and a receipt imported from a link (INS-receipt). Their links point at the instrument origin's own custom subdomain (OD-5), which serves a minimal page in the same tokens: a header reading "statespace · instruments" with "Back to the course", the untrusted spec or receipt rendered as text only, and the result (the distinguishing state Z3 returns, or the validated receipt fields handed back to the main origin by message). Spine §10.1 names the page SCR-instrument; W1-T14 builds it and W4-T15 uses it for spec duels.

---

## 9. Motion

### 9.1 Principle

Motion is spent only on change: a goal that changes, a trace being scrubbed, a crack propagating, a result arriving (spine §0; A7-22; review digest R1). Every animated change leaves a static mark (+, −, ~, a crack, a framed step) that stays after the motion ends, so motion never carries information alone. Goal Replay and the Theater never autoplay: learner-paced material beat narrated animation at two weeks (C, pedagogy digest row 18).

### 9.2 Catalog

| What changes | Motion | Duration, easing | Under reduced motion |
|---|---|---|---|
| Goal Replay step | changed hypotheses and target lines cross-fade; +, − and ~ marks slide in from the margin; unchanged lines stay still | 180 ms, ease-out | the marks appear; nothing moves |
| Trace scrub (Theater, histories) | the step highlight moves column to column on desktop, row to row on phones; the shared band updates in place | 120 ms per step, linear; a drag follows the pointer | the highlight jumps |
| Crack propagation | the zig-zag draws outward from the cracked assumption, edge by edge in order of graph distance | 240 ms per edge, at most 1.2 s in total, ease-in-out | the cracked state appears at once, with a list: "Cracked: CL-1.1, CL-1.2, CL-2.1–CL-2.4" |
| A stamp lands | opacity in, scale from 104% to 100%, identical for all nine stamps: PROVED gets no flourish | 120 ms, ease-out | appears at once |
| Derivation step applied | the replaced subterm cross-fades to its replacement | 160 ms | instant; the replaced term stays struck through in the step history |
| Sheets and side panels | a slide along one axis | 160 ms, ease-out | instant |
| Disclosures | a height reveal | 120 ms | instant |
| Rests-on arcs on focus | fade in | 120 ms | instant |

### 9.3 Never animated

Idle screens; loading (a determinate bar and text, no spinner); numbers (counts never count up); the path; celebrations of any kind; autoplay; parallax; loops. Nothing flashes (WCAG 2.3.1).

### 9.4 Implementation

`prefers-reduced-motion: reduce` is honored, and SCR-settings can override it either way. CSS and script-driven animation both read that one setting: kernelspace's own audit found its script animations ignoring its CSS kill switch, so the vendored shell wires both from the start.

---

## 10. Accessibility

### 10.1 Gates

- **The bar is WCAG 2.2 AA.** GATE-a11y runs axe with 0 serious issues at 360, 320 and 1280 px on every screen, nightly.
- **People, not only tools.** Each wave exit from W1 to W5 files a manual screen-reader pass on that wave's new screens; W6 runs full NVDA and VoiceOver passes (spine §13).
- **Keyboard paths are acceptance criteria:** the Derivation Board's keyboard-only path at W3's exit; Proof Blocks' keyboard ordering (W2-T18); the Theater's trace tables and phone lanes (W3-T06).
- **Related gates:** GATE-glyphs (notation), GATE-stamps (grayscale separability and hue scope), GATE-lessons (the rail and the glossary), GATE-bundle (Boot at 360 px within its time budget).

### 10.2 Success criteria and how they are met

| WCAG 2.2 | How |
|---|---|
| 1.1.1 Non-text content | every stamp, node glyph, crack and diagram has a text equivalent; the path drawing is hidden because its list carries the same facts |
| 1.3.1 Info and relationships | traces, histories, state pairs and claims tables are real tables; title blocks are definition lists; Call It is a fieldset with a legend |
| 1.3.2 Meaningful sequence | the phone's sticky Call It sheet stays in its cell's DOM order; sidenotes follow their paragraph |
| 1.4.1 Use of color | stamps differ by word, code and frame; links are underlined; violations carry ✗ and text; "you are here" is a glyph |
| 1.4.3 Contrast (minimum) | every text pair at least 4.5:1; the lowest is 5.18:1 (§2.4) |
| 1.4.4 Resize text; 1.4.10 Reflow | one column at 320 px and at 200% zoom; two-dimensional scrolling only inside code, trace and table frames |
| 1.4.11 Non-text contrast | component rules at least 3:1 (lowest 3.51:1); stamp frames at least 4.99:1 against the sheet |
| 1.4.12 Text spacing | nothing clips when line, paragraph, letter and word spacing rise |
| 1.4.13 Content on hover or focus | type popovers and qualifier details are dismissible with Escape, hoverable and persistent |
| 2.1.1 Keyboard; 2.1.2 No keyboard trap | every instrument has a keyboard path (§10.3); Escape leaves every sheet, palette and editor |
| 2.1.4 Character key shortcuts | single-key shortcuts act only while their widget has focus, are listed, and can be turned off |
| 2.2.1 Timing adjustable | nothing is timed: the Defence is untimed, there are no countdowns, the stuck protocol is an offer |
| 2.3.1 Three flashes or below | nothing flashes |
| 2.4.3 Focus order | DOM order matches visual order; dialogs hold focus only while open and return it on close |
| 2.4.7 Focus visible; 2.4.11 Focus not obscured | a 2-px ink ring with a 2-px offset; sticky parts reserve scroll padding so nothing they cover can hold focus unseen |
| 2.5.7 Dragging movements | the Derivation Board, Proof Blocks and the Theater need no drag; a swipe is never the only way |
| 2.5.8 Target size (minimum) | every target at least 44 × 44 px |
| 3.2.6 Consistent help | the hint ladder and the stuck protocol sit in the same place on every lab stage |
| 3.3.1 Error identification | import, validation and engine errors are stated in text, with the validator's or engine's own message |
| 3.3.7 Redundant entry | an audit finding's restatement and evidence carry forward between steps |
| 3.3.8 Accessible authentication | met by construction: there is no sign-in |
| 4.1.2 Name, role, value | native controls throughout; stamps and strips have names (§5.9) |
| 4.1.3 Status messages | run results, step announcements and import outcomes go to a polite live region |

### 10.3 Keyboard paths

| Instrument | Keys |
|---|---|
| Call It | Tab into the fieldset; arrow keys move within a radio group; Space selects; Tab to the next group; Enter on Run |
| Instrument cell | Tab reaches the code; in an editable cell the editor's keys apply, and Escape then Tab leaves it; Enter on Run and on Stop |
| Theater | with the lanes focused, ← and → (↑ and ↓ on phones) move the step cursor; Tab reaches the enabled-action buttons; while the Theater has focus, H opens history, M the map, L "loop back here" and T swaps lanes and table, all listed and switchable off |
| Derivation Board | ↑ and ↓ between steps; ← and → between subterms; Enter opens the rule list; Space applies; Backspace undoes |
| Goal Replay | ← and → between frames; Enter on a term opens its type; Escape closes it |
| Proof order | Space picks up and drops; ↑ and ↓ move; Escape cancels the move |
| Audit evidence | ↑ and ↓ move the line cursor in the diff; Space anchors or releases a line; the evidence-type radios follow |
| Path and lists | Tab through rows; Enter opens; focus prints the rests-on line |
| Search | Ctrl K or ⌘K opens; ↑ and ↓ move; Enter opens; Escape closes |
| Claims graph | the table and the rests-on list carry every fact; in the graph, Tab moves between nodes in list order and Enter opens a card |

### 10.4 Traces as tables

Every trace, whatever view draws it, exists as a table with steps as rows, processes as columns, the shared state as a column and a narration column that tells the story in words:

```html
<table>
  <caption>DoubleSpend: Init = 100, Amount = 80, Workers = {w1, w2}. TLC 1.8.0.
           NoOverspend is violated at step 4.</caption>
  <thead>
    <tr><th scope="col">Step</th><th scope="col">w1</th><th scope="col">w2</th>
        <th scope="col">Shared state</th><th scope="col">What happened</th></tr>
  </thead>
  <tbody>
    <tr><th scope="row">1</th><td>Read bal → 100</td><td></td>
        <td>bal 100, spent 0</td><td>w1 reads the balance</td></tr>
    <!-- steps 2 and 3 -->
    <tr><th scope="row">4</th><td></td><td>Write bal ← 20</td>
        <td>bal 20, spent 160</td><td>w2 writes; NoOverspend violated</td></tr>
  </tbody>
</table>
```

The values come from DoubleSpend's recorded run [X RUN-tlc-doublespend]. Rules: empty cells are empty, never dashes; a violation is named in the narration, marked with ✗ and drawn with the heavy frame; the caption names the spec, the constants, the engine and the outcome. Histories (INS-history) use transactions as columns ("txn A", "txn B"); state pairs (INS-pairs) use "execution 1" and "execution 2".

### 10.5 Spoken names

Stamps, strips and cracks follow §5.9. A specimen label and a claim card are each an article with a heading. A path node reads like "S2 Proof, in progress, plan 15.6 to 28.5 hours, you are here". Inline formulas carry a spoken alternative from the speech map; code blocks are read as code, with a "read as words" control that expands a spoken transcription.

### 10.6 Notation speech map (starter)

| Symbol | Spoken | TLA+ ASCII | Lean input |
|---|---|---|---|
| ∀ | for all | `\A` | `\forall` |
| ∃ | there exists | `\E` | `\exists` |
| ∧ | and | `/\` | `\and` |
| ∨ | or | `\/` | `\or` |
| ¬ | not | `~` | `\not` |
| ⇒ | implies | `=>` | — |
| → | implies; "to" in a function type | — | `\to` |
| ↔ | if and only if | `<=>` | `\iff` |
| □ | always | `[]` | — |
| ◇ | eventually | `<>` | — |
| ~> | leads to | `~>` | — |
| ≜ | is defined as | `==` | — |
| ′ | prime, the next-state value | `'` | — |
| ⊢ | goal (before a Lean target) | — | `\vdash` |
| ≤ · ≥ · ≠ | at most · at least · not equal to | `<=` · `>=` · `#` | `\le` · `\ge` · `\ne` |
| ∈ | in | `\in` | `\in` |
| ⟨ ⟩ | tuple open, tuple close | `<< >>` | `\<` `\>` |
| ↦ | maps to | `\|->` | `\mapsto` |
| λ | fun | — | `\lambda` |
| ℤ · ℕ | the integers · the naturals | `Int` · `Nat` | `\Z` · `\N` |

GATE-glyphs fails on a symbol missing from this map. How NVDA and VoiceOver speak these glyphs without the map is unverified (A7-18) until W1's screen-reader pass.

### 10.7 Testing protocol

axe at the three widths; a scripted keyboard walk-through per screen; NVDA with Firefox and VoiceOver with Safari on iOS; a grayscale and color-vision snapshot test in which GATE-stamps renders all nine stamps under grayscale and the three Machado simulations and compares their frame signatures; reduced-motion and forced-colors snapshots of the Theater, Goal Replay and a cracked claim.

---

## 11. Voice and copy

### 11.1 Voice

Precise and unhurried. Second person, present tense, short sentences. US English; "the Defence" keeps its spelling as a proper noun (spine §12 item 21). No hype, no emoji, no exclamation marks. Tables where they help.

### 11.2 Saying what a result established

- **Only a stamp says what a check established, and only with its qualifier.** Never a bare "correct", "verified", "safe", "proven" or "guaranteed" (GATE-codes).
- **Name the checker.** In prose, "proved" always names it: "proved by the Lean 4.35.0 kernel" [X RUN-lean-ledger]. A solver result says what it is about: "unsat for exactly this encoding, if the solver is sound" (V2-12).
- **Say what a result is about:** the encoding, the constants, the n, the database version.
- **Learner states are not stamps:** signed off, settled, mounted, kept, parked.
- **Calls:** "Your call matched." "Your call missed." Then the witness and its class.
- **Checks:** "pass" or "fail", with the verdict line. A failure is a find: "Specimen mounted."
- **Agents:** "the agent says", followed by quoted UNREVIEWED text; never "the agent proved".
- **No check marks.** A ✓ reads as "verified", and statespace never says that without a stamp. Matches and passes are words.

### 11.3 Numbers

- **Every tool number, verdict, flag or version is a run reference** (GATE-numbers, GATE-facts, GATE-runs).
- **Counts before rates;** every rate shows its n and its interval: "10 of 12 · 0.55–0.95".
- **Ranges for plans and projections;** never "behind".
- **No promised effects.** At most "more likely than not to help"; effects of tenths of a standard deviation (spine §2.4, §7).
- **Never write the left column of BRIEF §2.2's corrections ledger;** GATE-numbers keeps its deny-list.

### 11.4 Never write

| Never | Instead | Why |
|---|---|---|
| "unlock", "locked", "complete X first", "available after" | "Open", "Start", and the honest dependency: "needs your interpreter from LAB-3" | nothing locks (I5); mastery gating cuts completion (A [kulik90]) |
| "don't break your streak", "you're behind", "overdue", "you missed ‹n› days" | "Welcome back"; "met in ‹k› of the last 12 weeks"; "a short set to pick up where you were" | no loss framing or daily counters (BRIEF §3.3); repairable rhythm (B [silverman23]) |
| "+50 XP", badges, levels, "great job" | competence statements: "You can now ‹KC in words› on unseen items, 30 days on" | informational, not expected, rewards (A [deci99]) |
| "Correct!", "Wrong!" | "Your call matched", "Your call missed" | the copy never says "correct" (A7-10) |
| "verified", "safe", "proven" without a stamp | the stamp and its qualifier | GATE-codes |
| "due today", deadlines | windows and cadence: "a technical note fits here" | self-set deadlines did not help [bisin20] |
| "easy", "simple", "just" | what it takes: "about 25 minutes" | truthful expectations; the "this will feel harder" card (B [deslauriers19]) |
| lane, Shelf, docket, pocket checker, telescope, Hall of Records, proof debt, Judgment | the badge words; drawers marked "deferred"; the Clearinghouse's incidents; "checked offline"; the minimap; "dated incidents"; "parked goal"; "audit accuracy" | internal names stay out of learner copy (spine §0; GATE-lessons) |
| private or non-public material of any kind | "your system" | I9; GATE-privacy |

### 11.5 Nouns

Learner copy uses only the 25 glossary terms of spine §0 plus plain English, and the Boot session introduces at most five. This file's copy also says "Start here" for S1.L0, describes lesson tiers as formats ("full lesson", "short lesson with reading") and says "study blocks" during Boot (spine §0).

### 11.6 Patterns

| Moment | Copy |
|---|---|
| Call It | "Call it. Your first call is the one that counts." |
| Confidence | "How likely is this right? guess (below 67%) · think so (67–80%) · sure (above 80%). ‹k› options · chance 1 in ‹k›." |
| Payoffs | "Feedback only, never credit: +1 / 0 · +2 / −2 · +3 / −6." |
| After a call | "Your call matched. Recorded: ‹verdict› · ‹confidence›." |
| Interpretation | "Z3 returned sat. So the property: holds · is violated · can't tell?" |
| New specimen | "Specimen mounted: ‹ID›. Find the same class again on a fresh variant in 7 days to keep it." |
| Kept | "Kept: you found the same class again on a fresh variant." |
| Erosion forecast | "Before the reveal: restate ‹claim› from memory, then call which segment cracks." |
| Erosion | "This has cracked. ‹claim› still holds of the model; its ‹segment› does not: ‹one-line reason›. ‹specimen›." |
| Downloading | "Downloading ‹engine› · ‹received› of ‹size›. It stays on this device until you remove it in Settings." |
| Recorded run | "Recorded run ‹RUN-id› · ‹engine› ‹version› · ‹date›"; in Boot, "Recorded result ‹RUN-id› · ‹engine› ‹version› · ‹date›" |
| Laptop-only | "This part runs on the Bench, your laptop. Queue it for the Bench." |
| Deferred drawer | "Deferred. The roadmap defers ‹topic› until ‹condition›. This drawer is open now; it surfaces in Today when ‹trigger›." |
| Welcome back | "Welcome back. Here is a short set to pick up where you were." |
| Stuck | "You've been on this stage about ‹n› minutes. Want the stuck protocol? It writes a minimal example you can post, and lets you park the goal." |
| Retake | "Retake Part ‹X› on fresh seeds from ‹date›. Everything else stays open." |
| Signed off | "Signed off: ‹stage›. Parts A–C ‹k› of ‹n› (Wilson ‹low›–‹high›), every part above its floor, and three spaced sessions." |
| Agent's claim | "UNREVIEWED · the agent's words: “‹quote›”" |
| Draft | "Draft: first-learner pass pending." |
| Honesty | "Provenance is self-declared. Nothing on this device can tell assisted work from unassisted work." |

---

## 12. What v2 changes from the v1 canvas

The six v1 artboards in `design/canvas/`, and `canvas.json` with its pre-OD-1 working title, are history. They stay where they are, labeled "illustrative" (spine §10.2), and are never a reference for any number, stamp, ID or line of copy: several of their numbers were never run, and some of their sentences are false (BRIEF §2.2; this file does not repeat them). v2 artboards, when they are drawn, render from one learner-state fixture through the product's own registry, so every ID resolves (GATE-links) and every number is a run reference (GATE-numbers) (A7-24).

| v1 sheet | What it showed | What was wrong | v2 replacement |
|---|---|---|---|
| 1 · Design system | seven stamps including CHECKED; bare stamps; IBM Plex Mono with a proportional math fallback; a claim card with no requirement row; a hand-typed specimen label; four line styles; a navy "blueprint" night theme | CHECKED collided with PostgreSQL `CHECK` and with enforced checks (A7-01); shapes failed in grayscale and qualifiers were the smallest text, or missing (A7-06); 36 of 49 symbols missing (A7-15); the flagship card's "if weakened" entry was false: dropping the guard leaves conservation intact, and only non-negativity fails, at amount 1 [X RUN-z3-conservation-noguard, RUN-z3-optimize-min] (V2-03); one specimen ID with two witnesses (A7-07); dashes meant four things (A7-16); the night theme converged on kernelspace (A7-20) | nine words with codes (§5); frames separable in grayscale (§2.6); qualifiers as large as the word (§5.2); JuliaMono (§3); the claim card with its strip and requirement row (§6.6); labels from runs (§6.5); five line styles, crack included (§4); graphite night (§2.3) |
| 2 · Home, the elevation | the stone plinth in elevation, stages stacked as courses "set" by a viva; progress in PROVED blue; a verdigris outline for "you are here"; a judgment panel; an audit teaser; eight destinations | stamp hues leaked into progress (A7-02); a self-graded viva drawn in PROVED's color (V2-02); a tower that read as a lock (A7-14); a calibration diagnosis from too few calls (A7-11); a teaser that spoiled a case (A7-08); too many nouns (A7-12); no surface for return visits (A7-13) | SCR-today for return visits; SCR-stages, an ordered path with a list mirror (§6.14); progress in ink; the ▸ pointer; SCR-mirror, private, with intervals and a minimum n (§6.12); no teasers; five destinations (§7.2) |
| 3 · Lesson | a rail listing what the lesson establishes; raw `sat` styled as a refutation; confidence at 55, 75 and 95% with a Reset; "Correct" in the copy; a hard-coded engine version; a margin note in the main column; no title block; Run painted in PROVED blue | the rail answered the call (A7-07, V2-05); `sat` is not bad by itself (A7-04); no stakes, no guess level and a call that could be re-opened (A7-10); the version drifted (A7-07); no provenance (A7-24); a stamp hue on a button (A7-02) | a rail of segment titles only; query direction, raw answer, interpretation tap, then the stamp (§6.2, §6.4); guess · think so · sure with chance and payoffs, first call final; "Your call matched"; engine-reported versions; sidenotes in the margin from 1100 px; a title block from runs (§6.1); ink buttons |
| 4 · Theater | buttons per process; one trace wearing a bounded-check stamp; a state count that was never run; dashed shared-state boxes; message faults in a model without messages; one Undo; the lasso only in prose; a crash in vermilion; a grid of `div`s | a single sample stamped as if exhaustive (A7-05); invented numbers, where the recorded run gives 11 distinct states with `-deadlock` and a 4-action, 5-state trace [X RUN-tlc-doublespend] (V2-03); dashes overloaded (A7-16); not perceivable without sight (A7-18); processes instead of actions, no lasso (A7-19); desktop only (A7-21) | enabled actions from TLC graphs; monitors as observations; counts from runs; a shared band; per-scenario faults in ink; branching history; the lasso tool; a real table with narration; vertical lanes on phones (§6.7, SCR-theater) |
| 5 · Audit Desk | a pre-selected gap class; free-text evidence; the agent's claim in the PROVED stamp; live percentages without n; ACCEPT drawn as a stamp; a fixed pool with few sound cases | a default anchors the answer and evidence could not be checked (A7-09); the course's authority lent to an agent (A7-08); "reject everything" beat the course's own mock learner (V2-04) | five steps with no default (§6.10); typed, line-anchored evidence; quoted UNREVIEWED agent text; counts with Wilson intervals after submission; a seeded 30–60% sound share |
| 6 · Ledger | "Ledger" as the progress page; one stamp per claim; a headline implying PROVED claims need no reading; an erosion banner with the wrong mechanism; a concurrency refutation that never named its compilation pattern; a fixed-width flat table; one "rests on" column mixing four kinds of thing | the name collides with the subject matter (A7-12); one stamp cannot hold three segments (A7-03); PostgreSQL refuses with SQLSTATE 22003 [X RUN-pg-anomalies] (V2-08); the compilation pattern decides the anomaly (V2-07); no phone layout (A7-21) | SCR-claims with three-segment strips (§5.6), "Assumes" and "Evidence" split, the blast-radius view, the erosion log with SP-6.4, specimens that name their pattern (SP-6.2 read-modify-write, SP-6.6 conditional UPDATE), cards on phones and a table from 900 px |

What carries over from v1 is the light palette and type stack (kept, then validated), color as semantics (now enforced by a lint), PROVED blue against REFUTED vermilion, the claim card, specimen label and title block as components, motion restraint with reduced-motion support, and the voice (A7, "What to keep").

---

## 13. Implementation map

| Task | Implements from this file |
|---|---|
| W0-S12 | the scaffold; the font subsets and RUN-juliamono-glyphs |
| W1-T01 | tokens (§2), stamps and strip (§5); GATE-stamps, GATE-codes |
| W1-T02 | shell and navigation (§7); SCR-stages, SCR-stage, SCR-lesson, SCR-search |
| W1-T06 | the instrument cell with the download loader and the recorded fallback (§6.2) |
| W1-T07 | Call It (§6.2–§6.4); the Mirror (§6.12); SCR-mirror |
| W1-T08 | Today cards (§6.11); SCR-today, SCR-week |
| W1-T09 | SCR-boot |
| W1-T11 | SCR-drawer |
| W1-T13 | SCR-bench, SCR-lab |
| W1-T14 | the receipt view (§6.13); SCR-receipt, SCR-instrument |
| W1-T15 | the claim card (§6.6); SCR-claims |
| W1-T16 | the specimen label (§6.5); SCR-specimens |
| W1-T17 | the audit flow (§6.10); SCR-audit |
| W1-T18 | phone layouts; GATE-a11y at 360 and 320 px |
| W1-T20 | SCR-settings |
| W2-T03 | Goal Replay (§6.9) |
| W2-T06, W2-T14 | the hint ladder and the stuck protocol (§6.15) |
| W2-T12 | SCR-defence |
| W2-T15 | SCR-notes |
| W2-T16 | the welcome-back set and placement (§6.11, SCR-boot) |
| W2-T18 | proof order (§6.15) |
| W3-T01 | the Derivation Board (§6.8); SCR-derivation |
| W3-T06, W3-T08, W3-T09 | the Theater, its minimap and the lasso validator behind the lasso tool (§6.7); SCR-theater |
| W3-T12 | the crack, propagation and forecasts (§5.7, §9) |
| W3-T14 | SCR-clearinghouse |
| W3-T15 | change cards; SCR-changes |
| W4-T03, W4-T08 | the history viewer and the paired-state viewer (§6.15) |
| W4-T11 | the "dated incidents" filter (SCR-specimens) |
| W4-T15 | the instrument-origin duel page (SCR-instrument, §8.24) |
| W5-T06 | the report export from SCR-claims |
| W5-T08 | SCR-assurance |
| W6-T01, W6-T03 | the accessibility pass; glyphs and fonts |

**Gates that hold this file:** GATE-stamps, GATE-codes, GATE-a11y, GATE-glyphs, GATE-lessons, GATE-bundle, GATE-links, GATE-numbers, GATE-claims, GATE-items and GATE-privacy. **One fixture:** a single learner-state fixture drives artboards, Playwright screenshots and axe runs, so no two sheets can disagree (A7-24).

---

## Spine issues

*This list was resolved in spine revision 3 on 2026-10-25 (spine §15); each item ends with its outcome.*

Things in `docs/spine/SPINE.md` (revision 2) that this file believes are wrong, inconsistent or missing, with what this file does meanwhile.

1. **The hue-scope rule contradicts the line language.** §10.2 allows stamp hues "only inside stamps and strips (GATE-stamps)", but the same section's line language draws witnessed violations in heavy vermilion and erosion cracks as a vermilion zig-zag: on trace steps, specimen witnesses, claim graphs and state pairs, all outside stamps. As written, GATE-stamps fails the design or the design breaks the gate. This file allowlists `.line-violation` and `.line-crack` beside `.stamp` and `.strip` (§2.1); the spine should say so. *Revision 3: already resolved in the spine (§10.2 stamp grammar, §11.2 GATE-stamps).*
2. **The adopted night table (A7-20) brings back the TESTED/UNKNOWN clash.** It gives UNKNOWN a yellow (`#E0C878`) beside TESTED's yellow (`#E0B44C`), the clash A7-06 removed in light mode by moving UNKNOWN to neutral gray. It also has no night values for CONFIGURED or NOT COVERED, and no light CONFIGURED hue exists anywhere. This file uses a neutral gray hatch for [?] in both themes and defines [C] (§2.4). *Revision 3: already resolved in the spine (§10.2 tokens).*
3. **Night [P] and [R] cannot be told apart in grayscale.** Both are solid fills with a luminance ratio of 1.08 (computed here, and noted by A7-20 itself). The review relied on glyphs (⊢, ⊥) to separate them, and v2 rejected glyphs (review digest R11). The §8.7 shape cues "solid" and "solid vermilion" therefore do not meet §10.2's "shapes separable in grayscale" at night. This file adds a ring to [R] (§2.6, §5.3); §8.7 should record a second cue. *Revision 3: already resolved in the spine (§8.7).*
4. **No badge word exists for a course-recorded run.** §9.3 gives three badges for stamps, yet phones and cold workers show the course's own recorded runs with their run IDs (S1.L0, §9.3, W1-T06). This file adds a *recorded run* label and states that such a run mints no learner stamp, claim or evidence (§5.5). *Revision 3: already resolved in the spine (§9.3 Lane B; §0; §13 W1-T06).*
5. **CONFIGURED has no claim template.** None of CL-1.1–CL-10.2 expects [C], yet LAB-10.c8 requires the report to have a "configured" section and GEN-which-stamp trains [C]. The natural homes are an isolation level read back in S6.L9 (where CL-6.2's "[A] clauses" sit) or `FORCE ROW LEVEL SECURITY` read back in S7.L4. Add a template, or let the section read "none". *Revision 3: applied (§5.2 CL-7.4, §3.7 LAB-7.4).*
6. **Call It is underspecified in two places.** (a) §8.5's bands and chance assume a single verdict, but GEN-call-it template 4 (multiple true/false over about five scenarios, which §3.0 names as the usual graded form) has no rule for how confidence and chance apply; nor does the trace-length interval template. (b) "Bias (stated confidence minus accuracy)" needs one number per band, but the bands are ranges and no representative values are defined. This file uses one confidence per set with chance printed as 1 in 2ⁿ and a separate Mirror bin, declares the representative values as one constant, and leads the Mirror with band-versus-interval (§6.3, §6.12). The spine should decide both. *Revision 3: already resolved in the spine (§8.5, §7 M-mirror); this file's residual mismatches are fixed in §6.3, §6.12 and SCR-mirror.*
7. **GATE-glyphs checks too little.** It covers JuliaMono's subset and the speech map, but Source Serif 4 lacks ℤ, ∀, ∃ and ⇒ (A7-15), so a logic symbol typed into prose falls back silently. The gate should check every code point against the face assigned to its role (§3.3). *Revision 3: already resolved in the spine (§10.2 type, §11.2 GATE-glyphs).*
8. **"Queue for the laptop" has no channel.** §9.3's phone flow queues hands-on work for the laptop, but with no server a queue lives on the device that made it, and the only transfer the spine provides is export and merge-import (W1-T20). State that limit, or add a handoff task (kernelspace used a QR delta handoff) (§7.4). *Revision 3: already resolved in the spine (§9.3 Phones); the second alternative, a handoff task, is declined, because edition 1 has no server.*
9. **Boot overruns its noun budget, and some learner-facing names are outside the glossary.** M-set-your-week ("two Bench blocks") and the cold-start recorded run put glossary terms #12 Bench and #6 run into Boot, whose "first introduced" column says LAB-1 and S1.L1; Boot would then introduce seven coined terms against its cap of five. Also outside the 25 terms: "Boot" itself (S1.L0's title in §3.1), "the Core", and words for the `[core]` and `[bridge]` tiers. This file's copy says "Start here", "study blocks" and "recorded earlier" during Boot, and gives tiers as formats (SCR-boot, §11.5). The spine should list these names or confirm they stay out of learner copy. *Revision 3: applied (§0, §3.1 S1.L0, §10.1 SCR-boot, §11.2 GATE-lessons).*
10. **Instrument-origin pages have no screen ID.** M-spec-duel (W4-T15) and receipt import by link (INS-receipt) must render untrusted input on the instrument origin (I6), which therefore needs a visible page of its own. §10.1 has no SCR for it, so GATE-links' ownership check cannot cover it (§8.24). *Revision 3: already resolved in the spine (§10.1 SCR-instrument, §13 W1-T14).*
11. **The gates will fail on the history this spine keeps.** GATE-numbers and GATE-links scan artboards (§11.2), and W0-T03's acceptance resolves "every ID in docs and canvas", yet §10.2 keeps the v1 canvas in `design/canvas/`. Those sheets use v1's ID formats, which cannot resolve against the spine's registry, and contain sentences on the BRIEF §2.2 deny-list. Exempt `design/canvas/` and `docs/history/` from both gates, or move the canvas under `docs/history/v1/`. No task owns redrawing artboards from runs. *Revision 3: already resolved in the spine (§10.2 Artboards, §11.2); moving the canvas is declined, because it stays in design/canvas/, labeled.*
12. **Phone-first is defined twice.** §0 names four phone-first surfaces (Today, Lesson, Audit, Claims); §10.1 marks seventeen screens phone-first. One of them should be reworded, for example "flagship phone surfaces" in §0, or a §10.1 column that separates phone-first from phone-capable (§7.4). *Revision 3: already resolved in the spine (§0 Navigation, §10.1).*
13. **The kept v1 light tokens have no compliant component boundary, and night has no link token.** v1's `--rule` (`#C9CFC6`) is 1.53:1 on the sheet, below WCAG 1.4.11's 3:1 for a control's boundary, and §10.2's night list stops at four tokens. This file adds a component rule (`#7A837B`, at least 3.51:1), demotes v1's value to a decorative hairline, and makes night links and the location pointer ink, with no verdigris (§2.2, §2.3). *Revision 3: applied (§10.2 tokens).*
