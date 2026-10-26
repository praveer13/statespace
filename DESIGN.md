---
name: statespace
description: The Little Library. A zero-server formal-methods course printed as a numbered series of mid-century popular-mathematics paperbacks.
colors:
  newsprint: "#ECEDE8"
  sheet: "#F4F4F0"
  paper: "#FAFAF7"
  ink: "#161715"
  structure: "#161715"
  here: "#161715"
  pencil: "#4A4C47"
  rule: "#7B7D76"
  rule-hair: "#C6C8C0"
  rule-soft: "#DADBD4"
  band: "#E1E2DB"
  link: "#0B5A5E"
  rubric: "#0F6468"
  plate: "#ECEDE8"
  plate-ink: "#161715"
  on-vol: "#FFFFFF"
  vol-1: "#0F6468"
  vol-2: "#33308A"
  vol-3: "#6A2C5B"
  vol-4: "#46621C"
  vol-5: "#172033"
  vol-6: "#7A3920"
  vol-7: "#43306F"
  vol-8: "#0D573A"
  vol-9: "#8E2C52"
  vol-10: "#262624"
  violation: "#C2410C"
  night-ground: "#121311"
  night-sheet: "#1A1B19"
  night-paper: "#161715"
  night-ink: "#E8E9E3"
  night-pencil: "#B4B6AE"
  night-structure: "#9D9F97"
  night-here: "#E8E9E3"
  night-rule: "#6E7069"
  night-rule-hair: "#333430"
  night-rule-soft: "#262724"
  night-band: "#232421"
  night-link: "#8ACFCB"
  night-rubric: "#8ACFCB"
  night-plate: "#1A1B19"
  night-plate-ink: "#E8E9E3"
  night-violation: "#FF8A50"
typography:
  display:
    fontFamily: "Jost, 'Jost fallback', Arial, 'Liberation Sans', sans-serif"
    fontSize: "clamp(42px, 6.2vw, 92px)"
    fontWeight: 600
    lineHeight: 0.98
    letterSpacing: "-0.025em"
  volume-title:
    fontFamily: "Jost, 'Jost fallback', Arial, 'Liberation Sans', sans-serif"
    fontSize: "clamp(44px, 7vw, 104px)"
    fontWeight: 600
    lineHeight: 0.95
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Jost, 'Jost fallback', Arial, 'Liberation Sans', sans-serif"
    fontSize: "clamp(26px, 2.6vw, 36px)"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Jost, 'Jost fallback', Arial, 'Liberation Sans', sans-serif"
    fontSize: "clamp(26px, 2.6vw, 40px)"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.015em"
  spine:
    fontFamily: "Jost, 'Jost fallback', Arial, 'Liberation Sans', sans-serif"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "0.02em"
  field-label:
    fontFamily: "Jost, 'Jost fallback', Arial, 'Liberation Sans', sans-serif"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0.1em"
  label:
    fontFamily: "Jost, 'Jost fallback', Arial, 'Liberation Sans', sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0.12em"
  interface:
    fontFamily: "Jost, 'Jost fallback', Arial, 'Liberation Sans', sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.25
  button:
    fontFamily: "Jost, 'Jost fallback', Arial, 'Liberation Sans', sans-serif"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: 1.25
  body:
    fontFamily: "'Source Serif 4', 'Source Serif 4 fallback', 'Times New Roman', 'Liberation Serif', serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.6
  body-desktop:
    fontFamily: "'Source Serif 4', 'Source Serif 4 fallback', 'Times New Roman', 'Liberation Serif', serif"
    fontSize: "19px"
    fontWeight: 400
    lineHeight: 1.6
  lede:
    fontFamily: "'Source Serif 4', 'Source Serif 4 fallback', 'Times New Roman', 'Liberation Serif', serif"
    fontSize: "clamp(18px, 1.5vw, 21px)"
    fontWeight: 400
    lineHeight: 1.5
  code:
    fontFamily: "JuliaMono, 'JuliaMono fallback', 'Courier New', 'Liberation Mono', ui-monospace, monospace"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  none: "0px"
  sheet: "2px"
  flag: "50%"
spacing:
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "5": "24px"
  "6": "32px"
  "7": "48px"
  "8": "64px"
  gutter-phone: "16px"
  gutter-600: "24px"
  gutter-1100: "32px"
  measure: "680px"
  wrap: "1320px"
components:
  cover:
    backgroundColor: "{colors.vol-1}"
    textColor: "{colors.on-vol}"
    padding: "48px 16px 32px"
  mini-cover:
    backgroundColor: "{colors.vol-1}"
    textColor: "{colors.on-vol}"
    rounded: "{rounded.none}"
    padding: "10px"
    width: "7.5rem"
  series-flag:
    backgroundColor: "{colors.plate}"
    textColor: "{colors.plate-ink}"
    rounded: "{rounded.flag}"
    size: "9.5rem"
  spine:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    typography: "{typography.spine}"
    rounded: "{rounded.none}"
    height: "56px"
  spine-held:
    backgroundColor: "{colors.vol-1}"
    textColor: "{colors.on-vol}"
  spine-number:
    backgroundColor: "{colors.vol-1}"
    textColor: "{colors.on-vol}"
    width: "52px"
  catalogue-entry:
    textColor: "{colors.ink}"
    typography: "{typography.title}"
    padding: "16px 0"
  colophon-key:
    textColor: "{colors.pencil}"
    typography: "{typography.field-label}"
    width: "8.5rem"
  goto-field:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.code}"
    rounded: "{rounded.none}"
    height: "36px"
    width: "7.5em"
  goto-help:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.newsprint}"
    padding: "8px 12px"
  nav-link:
    textColor: "{colors.ink}"
    typography: "{typography.field-label}"
    height: "44px"
  series-mark:
    backgroundColor: "{colors.vol-1}"
    textColor: "{colors.on-vol}"
    size: "32px"
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.newsprint}"
    typography: "{typography.button}"
    rounded: "{rounded.sheet}"
    height: "44px"
    padding: "0 16px"
  running-head:
    backgroundColor: "{colors.vol-1}"
    textColor: "{colors.on-vol}"
    height: "64px"
  chapter-opener:
    textColor: "{colors.ink}"
    typography: "{typography.headline}"
  exercise:
    textColor: "{colors.ink}"
    typography: "{typography.interface}"
  figure-strip:
    backgroundColor: "{colors.vol-1}"
    textColor: "{colors.on-vol}"
    padding: "8px 12px"
  specimen-label:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    width: "32rem"
  toy-frame:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
---

# Design System: statespace

**Authority.** This file is the authority for statespace's visual world: palette, volume inks, type roles, rules, covers, spines and the components listed below. `docs/DESIGN.md` remains the authority for screen specs, stamps (§5), the line language (§4), accessibility (§10) and voice (§11). Where the two overlap on a token value, `apps/site/src/styles/tokens.css` is the source both are read from. Stamps, their `--st-*` tokens, `stamp.css` and the four line classes are product truth. This file records them as fixed and never restyles them.

## Overview

**Creative North Star: "The Little Library"**

statespace is printed as a numbered series of slim mid-century popular-mathematics paperbacks. Each stage, S1 to S10, is a volume. It has its own flat offset ink, white type and one cover figure drawn from the stage's own object: the lattice of states, a derivation tree, a syntax tree, a proof obligation, a lasso, a refinement ladder, a Hasse diagram, a crash timeline, a commuting square, the strata of the whole. A figure sits over a halftone disc in the volume's deeper ink. A second plate in a pale tint of the ink is printed a hair off register, as a cheap two-colour run would print it. Covers are where colour lives. Open a volume and the interior is cool newsprint and black ink, with ink rules, a rubric on headings and nothing else in colour except what the stamps and line language mean.

The start page is the series cover in volume 1's ink. It carries a masthead, the course's promise and a live state-space figure of Boot's transfer, which you explore by hand. It ends in the round series flag that opens volume 1. Below it stands a shelf of spines. A spine's thickness follows the volume's planned minutes, and only the volume in hand floods with its ink. The stages index is a ruled series catalogue. A stage page is a volume cover followed by a ruled colophon. Pages are dense and typographic, with square corners and flat ink. The halftone and the off-register plate supply the depth.

**Key Characteristics:**
- Ten flat volume inks, each with white type, used on covers, spines, mini-covers, catalogue numerals and, inside a lesson, the running head, the light lesson and segment numerals, exercise numbers and figure strips. Never on body text, rows, controls or status.
- Cool newsprint interior with black ink. The rubric heads interior sections.
- 3-px ink rules divide the page. 1.5-px ink frames hold controls and spines. 1-px rules separate rows.
- Jost sets structure, Source Serif 4 sets reading text and JuliaMono sets code and states.
- Cover figures are drawn from each stage's own object, never from stock decoration.
- Flat print with no elevation. Halftone screens and a 0.45-px misregistration stand in for depth.

## Colors

The palette is a print run: newsprint and black ink inside, ten offset inks on the covers, and the stamp hues kept apart for what checks establish.

### Primary
- **The ten volume inks** (`vol-1` to `vol-10`): Teal Press (S1), Ultramarine (S2), Plum (S3), Olive Field (S4), Midnight Slate (S5), Brick (S6), Violet Ink (S7), Bottle Green (S8), Raspberry (S9), Lamp Black (S10). One ink per volume, the same in light and night. Each carries white type (`on-vol`) at 6.9:1 or better. A component sets `--vol` to its volume's ink, and every surface derives from that one variable: cover, spine number, held spine, mini-cover, catalogue numeral, the spine's "Open volume" underline.
- **Halftone and second plate** (derived, not tokens): the halftone dot is `color-mix(in oklab, var(--vol) 62%, black)`. The second plate is `color-mix(in oklab, var(--vol) 58%, white)`. The start cover's field is a 9-px SVG dot screen masked to a disc.

### Secondary
- **Rubric** (`rubric`, night `night-rubric`): interior section headings (h2) on the start page and stage pages, and the 8-px head of the open-plate link. In light it is volume 1's ink.
- **Link** (`link`, night `night-link`): underlined links at the browser's automatic thickness, offset 2 px (the `styles.css` rule, which loads after and overrides the 1-px, 0.15em rule in `tokens.css`). Links are always underlined, because their hue alone does not separate them from ink.

### Tertiary
- **Violation ink** (`violation`, night `night-violation`): product truth from the line language. On a cover it appears only as the overdraft squares and the witness path of the state graph. It is filled and cased in white there so it holds contrast on any ink.

### Neutral
- **Newsprint** (`newsprint`, night `night-ground`): the page ground, and the shell's top bar.
- **Sheet** (`sheet`, night `night-sheet`): spines at rest, the bottom bar, sheets and cards.
- **Paper** (`paper`, night `night-paper`): code areas and the Go-to field.
- **Ink** (`ink`, night `night-ink`): text, every structural rule, primary buttons, the focus ring and the current-destination rule.
- **Structure** (`structure`, night `night-structure`): the bounded line's colour. In light it is the ink; at night it is a quieter grey.
- **Here** (`here`, night `night-here`): the location pointer, in ink in both themes.
- **Focus** (`--focus-ring`, `--focus-width`, `--focus-offset`): the ink at 2 px with a 2-px offset. They are tokens, not colours of their own.
- **Pencil** (`pencil`, night `night-pencil`): secondary text, colophon keys, tool lists, meta lines.
- **Rule** (`rule`, night `night-rule`): 1-px row separators in the catalogue and colophon, and component boundaries.
- **Hairline and soft rule** (`rule-hair`, `rule-soft`): decorative dividers only, never the sole boundary of a control.
- **Band** (`band`, night `night-band`): the shared-state band in traces.
- **Plate and plate ink** (`plate`, `plate-ink`): the series flag's disc and its type, newsprint on the ink.

### Named Rules
**The Covers Carry the Colour Rule.** Volume inks flood only covers, the held spine, spine numbers and mini-covers. Interior text takes one ink as the catalogue numeral, and the rubric takes another for headings. Body text, rows, tables and controls stay ink on newsprint.

**The One Volume in Hand Rule.** On the shelf only the held volume (focused, hovered, or the first by default) floods with its ink. The rest stay sheet, with their number block in their colour.

**The Stamp Hues Stay Stamps Rule.** No volume ink, tint or derived mix may take a stamp hue's job, and stamp hues never decorate a cover. The one stamp-adjacent colour on a cover is the violation ink, used for exactly what the line language says it means.

## Typography

**Display Font:** Jost (with `Jost fallback`, a metric-matched Arial)
**Body Font:** Source Serif 4 (with `Source Serif 4 fallback`, a metric-matched Times New Roman)
**Label/Mono Font:** JuliaMono (with `JuliaMono fallback`, a metric-matched Courier New)

**Character:** Jost is a geometric sans in the tradition of mid-century cover lettering. It sets covers, spines, labels and navigation in tight-tracked sentence case at size, and in open-tracked capitals at label size. Source Serif 4 sets reading text and the flag's italic subline. JuliaMono sets code, states, tool lists and addresses. All three faces are self-hosted subsets.

### Hierarchy
- **Display** (Jost 600, `clamp(42px, 6.2vw, 92px)`, 0.98): the start cover's headline, sentence case, balanced, at most 92 px.
- **Volume title** (Jost 600, `clamp(44px, 7vw, 104px)`, 0.95, -0.03em): a stage cover's name. Its numeral is set at Jost 300 beside it. The catalogue's page title is Jost 600 at `clamp(40px, 5vw, 72px)`, with its own line height (1) and tracking (-0.025em).
- **Headline** (Jost 600, `clamp(26px, 2.6vw, 36px)`, 1.1): interior section headings in the rubric. Stage pages use `clamp(24px, 2.2vw, 30px)`.
- **Title** (Jost 600, `clamp(26px, 2.6vw, 40px)`, 1): a catalogue entry's name, with its numeral at Jost 300 in the volume's ink.
- **Spine** (Jost 600, 18 px, uppercase, 0.02em): a spine's title, lying flat on phones. From 900 px it stands vertical at `clamp(14px, 1.18vw, 21px)`, 0.03em. The spine number is Jost 700 at 22 px, and the mini-cover number is Jost 700 at 30 px.
- **Body** (Source Serif 4 400, 17 px phone / 19 px from 900 px, 1.6): lesson prose. Catalogue questions use the body size at 1.4. Measure at most 680 px.
- **Lede** (Source Serif 4 400, `clamp(18px, 1.5vw, 21px)`, 1.5): the cover's lede, at most 30em, in 86% white with 14% of the ink.
- **Field label** (Jost 600, 13 px, 0.1em, uppercase): colophon keys, the Go-to label and the figure's control names. The cover masthead uses the same cut at 400. Desktop navigation uses it at 14 px and 500.
- **Label** (Jost 600, 12 px, 0.12em, uppercase; the `--fs-label` and `--tracking-label` tokens): the legacy kicker and the bottom bar's labels.
- **Interface** (Jost 400, 16 px, 1.25): status text, colophon values and the skip link. **Button** (Jost 600, 16 px, 1.25): `.button` and its variants.
- **Code** (JuliaMono 400, 14 px phone / 15 px desktop, 1.5): code, tool lists (12–15 px), state labels (600, 13 px) and the depth readout (600, 15 px).

### Named Rules
**The Sentence-Case Cover Rule.** Cover headlines are sentence case. Capitals belong to spines, labels, the masthead and the flag's verb, where the series lettering voice lives.

**The Light Numeral Rule.** A volume's number beside its name is Jost 300, and the name is 600. On a spine or a mini-cover the number stands alone at 700.

## Layout

The phone width is the design width, and pages run one column with 16-px gutters (24 px from 600, 32 px from 1100). Full-bleed pages (the start page, the catalogue, a stage page) let the cover run edge to edge in its ink. The content beneath sits in a 1320-px column with the shell's gutters. Other screens sit in the 1180-px content column. Spacing follows the 4-px scale (4, 8, 12, 16, 24, 32, 48, 64). The start page's sections stand 64 px apart.

- **Start cover:** masthead strip, then one column. From 1000 px it splits into two equal columns, text and figure.
- **Stage cover:** one column. From 900 px it splits text and figure 1.4 to 1, with the figure at most 26rem.
- **Shelf:** on phones spines lie flat as horizontal bars, each `--thick × 100%` wide, at least 17.5rem. From 900 px they stand in a 440-px row on a 3-px ink baseline. Each takes a flex share equal to its thickness and a height of 78% plus 22% of its thickness.
- **Catalogue entry:** cover at 4.5rem plus a stacked column. From 1000 px it runs across four columns (cover, title and tools, question, holdings).
- **Interior sections** on the start page: from 1000 px a 1-to-2 grid, heading left and text right, under a 3-px ink rule.

## Elevation & Depth

The world is flat print. Nothing casts a shadow, nothing glows and nothing blurs. Depth comes from print devices only. These are the halftone disc behind each cover figure, the second plate printed 0.45 px left and 0.35 px up, and the white line work standing on the ink. Layers separate by ground against sheet and by ink rules. Movement provides the only lift: a held spine rises 18 px on its one axis, and a catalogue cover tips by 4 px and 2 degrees.

### Named Rules
**The Off-Register Rule.** Depth on a cover is a second plate a hair off register (`translate(-0.45px, -0.35px)`) in a tint of the ink. It never comes from a shadow, gradient or blur.

**The Rules Not Boxes Rule.** Sections divide with a full-width 3-px ink rule, and rows with a 1-px rule. Neither needs a raised card.

## Shapes

Corners are square. Covers, spines, mini-covers, the mark, the Go-to field and the colophon have no radius. The legacy sheet, button and code block keep the incumbent 2-px radius from `--radius`, and nothing is rounder, with one exception. The series flag is a full circle (9.5rem), set at -8 degrees like a price flag stuck on a cover. Lines come in fixed weights: a 3-px ink rule for sections, the shell's head and foot, the shelf baseline, the colophon head and the current destination; a 1.5-px ink frame for spines, the Go-to field and the open plate; a 1-px rule between rows. On a cover the same 3-px rule is drawn in white under the masthead and above the figure's controls.

## Components

### Cover
Flat ink, white type, one figure. The start cover takes volume 1's ink. It has a masthead strip (series name at Jost 700 15 px; series lines in label capitals) ruled off by a 3-px white rule, the display headline, the lede, an action row (the series flag plus "All ten volumes" as an underlined Jost 500 18-px link) and the state graph. A stage cover takes its own ink. It carries breadcrumbs in Jost 400 capitals at 14 px and 0.08em, the volume title with its light numeral, the tool list in JuliaMono, the stage's question in Source Serif, and a flag labelled "Start" and the first lesson's ID, with the lesson named beside it. Focus rings on a cover are white.

### Cover figure
One SVG per volume (100 × 140), white line work at 1.6 (heavy 2.4) non-scaling stroke with square caps, white fills for nodes. It sits over a halftone disc (3.2-unit dot screen rotated 28 degrees, clipped to a circle). Two copies of the motif are drawn, the tint plate off register beneath the white key plate. Figures are decorative (`aria-hidden`); the cover's heading carries the words. A motif must be the stage's own object.

### Spine and shelf
Each spine is a link with its full spoken name ("Volume n, name, tools"). At rest it is sheet with a 1.5-px ink frame and a number block in the volume's ink. When held (focus, hover or the default first) it floods with the ink: type turns white and the number block goes transparent. Thickness is `0.42 + 0.58 × minutes / most`. From 900 px the tool list is hidden visually but still spoken. Below the shelf, the volume in hand shows a mini-cover, "Volume n · name" (Jost 600), its question, its holdings line in tabular figures, and "Open volume n" with a 2-px underline in the volume's ink. Nothing locks.

### Series flag
A round newsprint disc on the cover's ink, 9.5rem, rotated -8 degrees. It holds the verb (Jost 500 15 px, 0.14em capitals), the object (Jost 700 25 px) and an optional italic Source Serif subline over a 1.5-px rule. On hover it straightens and scales to 1.04. Focus is a 3-px white outline at 4-px offset. It is the cover's one primary action.

### Catalogue entry
A ruled line of the series catalogue: a 4.5rem mini-cover, the numeral (Jost 300, in the volume's ink) and name (Jost 600), tools in JuliaMono 14 px pencil, the question in Source Serif, and the holdings in Jost tabular figures. Entries divide by 1-px rules under a 3-px ink head rule. On hover or focus the mini-cover tips (`translateY(-4px) rotate(-2deg)`). On hover only, the name takes a 2-px underline in the volume's ink.

### Colophon
A definition list under a 3-px ink rule. Each row has a key at 8.5rem in label capitals and pencil, and a value in Jost 16 px, separated by 1-px rules. Run IDs wrap as JuliaMono 13-px chips with no frame. The stage's lessons, lab and drawers follow as ruled rows, and the pager closes under a 3-px ink rule.

### Go-to field
In the masthead from 900 px: the label "Go to" in label capitals and pencil, then a 7.5em JuliaMono field on paper with a 1.5-px ink frame, square corners, 36 px tall, placeholder `S5.L3`. It accepts printed addresses (S5, S5.L3, D-12, LAB-5). An invalid entry thickens the frame to 2.5 px and opens a help note in ink with newsprint type beneath the field. The note is a live status, so the cue never rests on colour.

### Navigation
The top bar is newsprint with a 3-px ink rule beneath it. It holds the wordmark and the series mark (S′ in Source Serif 4 italic at 600, a weight the browser synthesizes from the shipped 400 italic, white on volume 1's ink in a 32-px square), with "statespace" in Jost 600 at 23 px. From 900 px the five destinations are label capitals (14 px, 500, 0.1em). The current one carries a 3-px ink rule beneath it and its label at 700. Hover underlines at 1.5 px. On phones a sheet bottom bar of five 56-px targets has icons, 12-px labels and a 3-px ink rule along the top of the current target. The current target's icon stroke goes from 1.5 to 2.25.

### Running head
A lesson or drawer opens as a chapter inside its volume. The page's main area runs full bleed (App.tsx sets `data-bleed` on `/`, `/stages`, `/lessons/` and `/drawers/`) and a 64-px band in the volume's ink runs across it: the light volume numeral and the stage name in label capitals (a link back to the stage), the lesson address in JuliaMono, and a small copy of the volume's cover figure at the right. A drawer is an appendix with no volume ink: its band takes `--vol-10`, the series black, and reads "Drawer beside S5 Time", with no figure.

### Chapter opener
The lesson number large and light in the volume's ink ("L3", "Boot" for L0, or the drawer's address) beside the title in Jost 600. Then the objective as a Source Serif lede, one quiet colophon line (format · minutes · questions answered), the draft banner between 1-px rules, and the provenance as a ruled colophon (address, revision, drawn, checked by). "Checked by" groups runs under their engine and version, with the run IDs as JuliaMono chips that wrap. At night the numerals read through `--vol-lift` (0% by day, 64% at night): `color-mix(in oklab, var(--vol), white var(--vol-lift))`, so dark inks such as vol-5 stay legible on the night ground.

### Chapter layout and rail
Below 1100 px the chapter is one column and the segment contents are a disclosure ("Segments (n)"). From 1100 px a sticky 14rem rail numbers the segments §1, §2 … in the volume's ink; a scroll-spy marks the current one by weight plus a 3-px ink rule, never by colour alone. The reading column is at most 680 px, and the remaining width is the margin for sidenotes and plates. Segments open under a 3-px ink rule with "§n" in the volume's ink beside the title (Jost 600), and the minutes in small label capitals beneath.

### Exercise
Items, prequestions and Call It are textbook exercises: "Exercise 1.2 · Before this segment" in Jost, with the number in the volume's ink, under a 3-px ink rule and with no box or shadow. Choices are full-width rows at least 44 px tall divided by 1-px rules, with a round ink mark; the picked mark fills (160 ms, ease-out, none under reduced motion) and the picked row goes bold. The confidence taps (guess / think so / sure) are one segmented control, the chosen segment reversed in ink. After answering, the key and every "why" read like the answer key at the back of a book. Inside a figure the Call It opens with a 3-px rule instead of a box.

### Figure and instrument cell
A recorded run is a numbered figure. A strip in the volume's ink holds "Figure 2.1 · The Theater · recorded run" (Jost 15 px: "Figure n" at 700, the instrument at 600, the lane at 400) and the run ID in JuliaMono on the right. The code sits on paper in a 1.5-px ink frame and scrolls in its own frame; then come the Call It and the result, whose stamps render exactly as the stamp component draws them. "Run not yet recorded" is a quiet state, never an error.

### Specimen label and margin plates
A claim or a specimen is a museum label: a 32rem plate on paper with a 1.5-px ink frame and a 3-px top rule, title first in Jost 600, then the ID in JuliaMono. Before its questions are answered it is an empty outline that says it appears once they are. "Build this" and "Reading" cards are margin plates with a band in the rubric at the top; from 1100 px they float into the margin column. On the Specimens screen the same labels stand in a cabinet grid of uneven sizes, each beside a small square of its stage's ink with the stage ID in text.

### Toy frame
An interactive teaching aid ("toy") in a lesson is a figure plate: a strip in the volume's ink that reads "Figure · Game · Get past the guard" in the same type as an instrument cell's strip, the toy on paper inside a 1.5-px ink frame, and a caption in pencil Source Serif that says what the page computes and what it does not claim ("no solver runs here"). Controls are real labelled inputs and buttons at 44 px; status changes are words in an `aria-live="polite"` line on a 3-px ink left rule; the SVG has `role="img"` with a text alternative or a table beside it. Marks differ by shape (dots, rings, squares) as well as colour, and the violation hue appears only through `.line-violation`, dashes only through `.line-bounded` and `.line-assumed`. The one motion is `.toy-land` (a mark landing, ease-out), off under reduced motion. Toys live in `apps/site/src/components/toys/<slug>/` (placement.ts, model.ts, Toy.tsx, optional css); `index.ts` finds every `placement.ts` and the lesson page draws each toy, lazily, after the segment it names.

| Slug | Lesson, after | Toy | What it teaches |
|---|---|---|---|
| s1-witness | S1.L0 §1 | Get past the guard (game) | Pick balances and an amount; the page runs the PR's guard and shows which picks are witnesses (165 of a 1,000-pick grid). The fixed guard finds none on the grid, which says nothing beyond it. |
| s1-wrap | S1.L5 §3 | Past the largest value | At 8 and 64 bits an addition that passes the guard can wrap; the search counts recipient witnesses and shows none for the sender when X > 0, and none over Int. |
| s2-generalize | S2.L7 §3 | Which state does ih talk about? | Step induction with a fixed header and with `generalizing s`; the goal and context show why the fixed header's ih is about the wrong state. |
| s2-pinned | S2.L10 §4 | Fool the pinned statements (game) | Pick a transfer that passes the four pinned statements but breaks the requirement; adding `transfer_moves` stops every fooling transfer on the 81-state grid. |
| s3-stepper | S3.L4 §2 | Step it, one rule at a time | Small-step a call through the expression rules and see it end done, in an error, or stuck with no rule. |
| s3-policy | S3.L7 §2 | Switch a decision, watch the calls move | Change the semantics' policy decisions (self-transfer, zero amounts, overflow) and watch five calls change outcome and step. |
| s4-wp-push | S4.L3 §1 | Push Inv back through Transfer | Push Inv backward line by line under three guard readings; at every point the formula holds exactly when the run from there ends in Inv. |
| s4-cti-reach | S4.L6 §2 | Reach the counterexample (game) | Drive the twin from Init to a state where holds exceed the balance and then overdraw it; the good model reaches none within 6 steps. |
| s5-scheduler | S5.L3 §2 | You are the scheduler (game) | Interleave Read and Write of two workers to overpay; the atomic repair has no such order; three workers show 84 of 90 schedules overpay. |
| s5-fairness | S5.L7 §2 | Whose promise ends the cycle (game) | Write a Fair line from WF/SF on each action and read each lasso against it; the goal needs fairness on your own actions only. |
| s6-scheduler | S6.L6 §4 | You are the scheduler (game) | Order two transactions' statements under three isolation levels and four compilations; see lost updates, serialization failures and deadlock. |
| s6-serial | S6.L8 §4 | Find a serial order | Replay five histories in both serial orders and find which, if any, explain what each transaction saw. |
| s7-pairs | S7.L5 §2 | Tell frank's two worlds apart (game) | Find pairs of worlds that frank's view tells apart under Open v0 and global slugs; v1 and per-tenant slugs leave none. |
| s7-relation | S7.L6 §2 | Related under ~Acme, or not | Change fields of a second world; the page says whether the worlds are related and whether the observer can tell them apart. |
| s8-crash-windows | S8.L3 §2 | Place the crash yourself (game) | Allow one crash in a chosen window and try to make the provider charge twice; a stable key with a provider that honors keys leaves none. |
| s8-poller | S8.L3 §4 | Strand a row below the mark | Commit late under a mark-based poller and strand a row; a status-based poller delivers every committed row. |
| s9-stack | S9.L1 §2 | Whose stack is it? | Run `comp e` on a stack machine and see `exec s (comp e) stk = aval e s :: stk` hold for this run, whatever stack it started on. |
| s9-hoist | S9.L7 §2 | Close the square, or break it | Step the source and an edited IR; sweep the grid for starts where they end differently (25 for the agent's edit, all in amt ≤ balance < 2·amt). |
| s10-cti | S10.L6 §3 | Counterexample to induction, or a bug? | Pick a pre-state and a step; unreached CTIs mean strengthen the invariant, a reached one means fix the command. |
| s10-doubts | S10.L7 §3 | Keep the doubt log (game) | Call what the log reads (m retired of n identified) after each event before the page applies the rules. |

### Working-screen head
Today, Claims, Specimens, Mirror, the Bench, a lab, the Audit Desk and Not found share one head: the title in Jost 600 at clamp(36px, 4vw, 56px), a Source Serif lede in ink at clamp(18px, 1.5vw, 21px), and a 3-px ink rule beneath. There is no eyebrow. Section heads take the rubric (the Mirror stays in ink, by its test). Screens that belong to no volume take `--vol-10` as their accent; an item that belongs to a stage shows a small square of its volume's ink beside its ID, with the stage ID in text too.

### State graph (signature)
Boot's transfer, drawn in white on the start cover. The lattice of states is a faint grid (white mixed 34% into the ink), and the no-overdraft triangle (every state with no balance below zero) is a 2-px white edge. Unreached states are ink-filled rings, and reached states are white dots that land with a 220-ms scale-in. The frontier is the bounded line (dotted ring, white on the cover). Overdrafts are violation-ink squares cased in white, and the witness path is the violation line at 3.5 px over a 7-px white casing. The controls form a colophon under a 3-px white rule: a guard choice (two radios) and an "explore to depth" range with a JuliaMono readout. A live status in Source Serif says what the exploration reached: "so far" while the frontier is open, and, once the exploration is exhausted with no overdraft, that this is every state the small model can reach and it says nothing beyond it.

## Do's and Don'ts

### Do:
- **Do** derive every volume surface from one `--vol` set on the component, and mix the halftone and plate tints from it in oklab.
- **Do** keep covers to white type on flat ink, and the interior to ink on newsprint with the rubric for headings.
- **Do** divide sections with a 3-px ink rule and rows with a 1-px rule.
- **Do** draw each cover figure from the stage's own object, and keep it decorative with the words in the heading.
- **Do** case the violation ink in white wherever it sits on a volume ink.
- **Do** set every motion to none under reduced motion (system setting or `data-motion="reduce"`).

### Don't:
- **Don't** flood more than one spine with its ink at a time.
- **Don't** use a volume ink for body text, rows, controls or status. Status belongs to stamps and words.
- **Don't** add shadows, gradients, glow or blur. Depth is halftone and off-register plate only.
- **Don't** round corners beyond the incumbent 2 px. The series flag is the one circle.
- **Don't** set cover headlines in capitals.
- **Don't** restyle stamps, the `--st-*` tokens or the four line classes. They are product truth (`docs/DESIGN.md` §4–§5).
- **Don't** set an uppercase label line above a heading. The label cut names fields (colophon keys, the Go-to field, figure controls) and is not a kicker.
