---
version: 1
slug: "apps-site-src-screens-home-home-tsx"
primary_target: "apps/site/src/screens/home/Home.tsx"
related_targets: ["apps/site/src/screens/stages/StagesScreen.tsx","apps/site/src/screens/stages/StageScreen.tsx"]
---

# Surface brief: start page and stages (apps/site home + /stages + /stages/:id)

Mode: Persuade (start page); the stage index and stage pages are Read, inheriting the world.
Audience and job: a backend engineer deciding to begin, then returning to find their volume. Action: open volume 1 (S1.L0, Boot). Proof: the course's own objects drawn from real content (lesson counts, minutes, tools, run IDs). Constraints: PRODUCT.md (no gamification, no "behind", stamps only with qualifiers, colour never alone, WCAG 2.2 AA, GATE-stamps hue and line scopes).

## Direction contract

THESIS: statespace is a numbered series of slim maths paperbacks. Each stage is a volume with a flat ink cover and one diagram drawn from that stage's own object. It refuses the category default: a headline, subcopy and a grid of ten stage cards.

OWN-WORLD: The covers are solid offset inks, one per volume: ultramarine, teal, ochre, plum, bottle green, slate, carmine-free brick, ink blue and so on, all kept clear of the stamp hues. The interior is cool newsprint (#ECEDE8) with black ink, and the volume's ink is used only for diagrams and the rubric. Jost geometric caps set covers, spines and labels. Source Serif 4 sets reading text and italic maths variables, and JuliaMono sets code and states. Halftone dot fields and a one-pixel misregistration offset come from SVG patterns, never gradients. Shapes have square corners, a round series flag and numbered spines.

STORY: The visitor sees a real state graph first and learns what the course is about, a set of states and the step between them. They see that every check says how far it reached, then open volume 1.

FIRST VIEWPORT: A full-bleed series cover in the S1 ink. Top left: the masthead strip, with the wordmark statespace and the series line "A course in formal methods · ten volumes", plus the nav as series links. On the left, two thirds of the width: the headline in Jost caps at about 7vw, stacked, with the lede in Source Serif. On the right: a live SVG state graph of the Boot transfer (balance states, transfer steps, the overdraft state). The bound-k slider sits beneath it: "explore to depth k". Overdraft states inked in the second colour appear once k reaches them, with the caption "checked to depth k: a bound, not a proof". The round series flag, overlapping the cover's lower edge, holds the primary action "Open volume 1". Below the fold: the shelf of ten spines.

FORM: The Little Library (mid-century popular-mathematics paperback series), position 6 on the grounded list. seed:23dbab4536dab4da. Raises: the live bound-k slider (variable-font-specimen); keyable addresses (teletext); a ruled colophon on every cover (wax-pack); colour only for the volume in hand (glazier); witness traces stay inked (plankton).

Signature interaction: the bound-k slider re-explores the cover graph breadth-first, with the frontier drawn in hairline. The shelf spines pull forward on hover and focus, and their cover diagrams render from each stage's data. Motion grammar: a print-registration slide of 1–2px, and spines translating on one axis. Everything is static under reduced motion.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Cited adaptations (after finish review 1)

- Headline: Jost 600, sentence case, stacked, at most 92px, not caps. Nine words in caps at cover size need seven lines and read as shouting. The series name in caps carries the cover-lettering voice instead.
- Series line: the cover's own masthead across the top, ruled off in white, not the shell header. A paperback carries its series name on the cover, and the shell header stays the site's navigation.
- Flag: it sits in the action row beside "All ten volumes" and does not overlap the cover's lower edge. Overlapping would cover the shelf heading on phones.
- Figure: printed on the cover in white line work, with no pasted-on sheet. Overdrafts use the violation ink, filled and cased in white, so they keep 3:1 contrast on any cover ink.
