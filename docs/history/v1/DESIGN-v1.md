# PLINTH — Design System

Companion to `PLAN.md`. The visual reference is the design canvas (six
sheets: system, Elevation, Lesson, Theater, Audit Desk, Ledger).

## 1. Direction: the drafting table

Formal methods is careful, slow, written work: definitions, derivations,
specimens under glass, stamped approvals. The interface should feel like an
engineer's drafting table — vellum sheets, graphite line work, a title block,
rubber stamps — not a hacker terminal and not a gamified app.

- **Light by default** (vellum), with a **blueprint** dark theme. kernelspace is
  dark-only with a mint accent; Plinth is deliberately the opposite.
- **Structure is drawn, not boxed.** Hairline rules, 1.5px graphite frames,
  dimension-line annotations. No drop shadows, no gradients, no rounded cards.
  Corner radius is 2px at most.
- **Colour is semantic.** The only saturated colours in the product are the
  assurance stamps. Nothing is coloured for decoration, so colour always means
  something about the strength of a claim.

## 2. Line language

| Line | Meaning |
|---|---|
| Solid graphite | established structure, set courses |
| **Dashed** | assumed, trusted, not checked — the only meaning of a dash anywhere |
| Dotted blue | bounded — checked only this far |
| Heavy vermilion | a witnessed violation |

## 3. Assurance stamps (the core palette)

Stamps are uppercase Archivo Expanded, 2px border, 2px radius, and **always
carry a qualifier**. Text is always printed — colour is never the only signal.

| Stamp | Fill / border / text | Shape cue | Qualifier (required) |
|---|---|---|---|
| PROVED | `#1D3F8F` / same / white | solid | which kernel or solver |
| CHECKED | `#E3E9F6` / `#1D3F8F` / `#1D3F8F` | tinted, proved's hollow sibling | bound: states, scope, constants |
| TESTED | sheet / `#7A5A00` / `#7A5A00` | outline | n, generator |
| ENFORCED | `#3B4A57` / same / white | solid slate | where (runtime, DB constraint) |
| ASSUMED | sheet / `#5F675F` dashed / `#3A423D` | **dashed** | — |
| REFUTED | `#C2410C` / same / white | solid | witness size (steps, vars) |
| UNKNOWN | ochre hatch / `#7A5A00` / `#5C4400` | hatched | timeout or reason |
| EROSION | as REFUTED | banner form | the specimen that cracked it |

PROVED vs REFUTED — the one pair that must never be confused — is blue vs
orange, which separates under the common colour-vision deficiencies and by
lightness.

## 4. Tokens

```css
:root {
  --vellum: #F1F3EF;   /* ground */
  --sheet: #FAFBF8;    /* surfaces */
  --paper: #FFFFFF;    /* code, instruments */
  --rule: #C9CFC6;     /* hairlines */
  --rule-soft: #DDE2DA;
  --pencil: #4A534D;   /* secondary text, labels */
  --graphite: #1C211E; /* ink, primary buttons, frames */
  --verdigris: #0E6655;/* links, focus ring, "you are here" */
  --proved: #1D3F8F; --checked-fill: #E3E9F6;
  --tested: #7A5A00; --enforced: #3B4A57; --assumed: #5F675F;
  --refuted: #C2410C; --refuted-wash: #FFF7F2;
}
/* blueprint (dark): ground #0E1622, sheet #142033, rule #2A3A52,
   ink #E6ECF5, pencil #A9B6C8, verdigris #4FC2A8, proved #8FB0F5,
   refuted #FF8A50 — stamps invert to outline-on-dark with the same shape cues. */
```

All text pairs meet 4.5:1 on their ground, including 11px labels.

## 5. Type

| Role | Face | Use |
|---|---|---|
| Structure | **Archivo** (width axis; Expanded 110–125% for labels and the wordmark) | headings, labels, stamps, buttons, title blocks |
| Reading | **Source Serif 4** | lesson prose, margin notes — long-form reading like a textbook |
| Code & logic | **IBM Plex Mono**, falling back to **Noto Sans Math** for ∀ ∃ ⊢ □ ◇ ⟦⟧ ℤ ′ | instruments, theorem statements, traces |

In production, evaluate **JuliaMono** for code: it covers Lean's Unicode
natively. Labels are 11px, 0.14em tracking, uppercase. Prose 18–19px / 1.6,
measure ≤ 680px.

## 6. Signature components

- **Title block** — the course header, styled like a drawing's title block
  (project, sheet, drawn, rev). Each lesson and receipt carries one.
- **Elevation** — the home view: the plinth drawn in elevation, one course per
  stage, widest at the bottom. Set courses are solid proved-blue; the current
  course fills with checked-tint as claims land, outlined in verdigris; seams
  are dashed vermilion lines on the course's lower edge. Above the top course
  sits a dashed empty plinth top: "your application stands here".
- **Claim card** — the six fields as a two-column ruled table under a graphite
  frame, stamp top-right. Correspondence and Requirement fields can never
  render PROVED.
- **Specimen label** — a museum label: a vermilion ID tag, the witness in mono
  on a vermilion wash, then *violates / because / minimal? / cured by*.
- **Instrument cell** — header strip naming the engine and version ("Z3 4.x,
  wasm, in this tab"), white code area, then the **Call It** row and a result
  panel. Run stays disabled until a verdict and confidence are chosen.
- **Theater lanes** — one row per process, one column per step, plus a SHARED
  state row in dashed boxes; violations outline the offending step and state
  in heavy vermilion. Controls split into *scheduler* and *environment*.
- **Audit finding form** — gap class (radio), evidence (mono textarea),
  re-stamp buttons drawn as the stamps themselves.

## 7. Motion and sound

Almost none. A stamp lands with a 120ms scale-from-104% and no bounce. Theater
steps advance with a 160ms horizontal wipe. Erosion banners draw their
vermilion border left-to-right once. All motion is disabled under
`prefers-reduced-motion`. No sound.

## 8. Layout and access

- Content max-width 1180px; lesson column ≤ 680px with a left outline rail that
  stacks above the article below 900px.
- Wide things (timelines, ledgers, diffs) scroll inside their own frame;
  the page never scrolls horizontally. 16px side gutter on phones.
- Touch targets ≥ 44px. Every stamp has text. Call It is a real radio group.
  Theater is fully keyboard-operable (1–9 select process, `c` crash,
  `u` undo), announced via a live region.

## 9. Voice

Precise and unhurried. Never "correct", "verified" or "safe" without a stamp
and qualifier. Failures are praised as finds ("Specimen mounted"), not scolded.
Second person, present tense, short sentences.
