#!/usr/bin/env node
// GATE-stamps (spine sections 8.7, 8.8, 10.2 and 11.2; DESIGN.md sections 2, 4 and 5; ARCHITECTURE.md section 8.5;
// W1-T01).
//
// Each stamp is derived from a receipt via spine section 8.8; qualifiers are present, with checker and version;
// requirement-fit is never [P]; stamp hues stay inside stamps, strips, the witnessed-violation line and the erosion
// crack; the nine stamps separate in grayscale in both themes.
//
//   node scripts/verify-stamps.mjs              the fast lane
//   node scripts/verify-stamps.mjs --json       print the report as JSON
//   node scripts/verify-stamps.mjs --root DIR   check the tree under DIR (the self-check uses this)
//   node scripts/verify-stamps.mjs --self-check plant faults in scratch copies; the gate must report each as expected
//
// Checks (each finding names its check):
//   rows        packages/stamps/src/rows.ts carries every row of spine section 8.8, its "Raw output" cell verbatim
//               and in order, and nothing else as a spine row; the vocabulary matches section 8.7's table
//   derive      the fixture table (packages/stamps/test/fixtures/verdicts.json): an executed fixture is read by one of
//               the package's parsers (solver, tlc, lean, trace), never typed as a raw output; every quoted line is
//               a whole line of the cited run's record or output files, and one configuration of the run prints them
//               all (the record counts as one; a record with configurations gathers their output files in its own
//               list, which makes none): the stamp names that configuration's checker, engine and version, never the
//               record's alone, so lines that configurations of several checkers print need `config`, and the
//               configuration must be a run of the parser's engine; a cvc5 answer is read only as a Z3 query's
//               cross-check; a fixture that quotes lines of one of the run's configurations quotes every error line
//               of it too (so no fixture keeps an accept line and drops the error beside it); its context holds only
//               the keys its parser reads, each a value of the kind it takes; the solver's rlimit is the one that
//               configuration ran under (budget or command line), and a context rlimit must be it; every other
//               number in the context stands as a whole token in the quoted lines or that configuration's verdict
//               lines, command line, budget, values or exit code (a solver's witness length is context too, typed
//               with a note saying why, and must stand there like any other number; the gate cannot read a length
//               out of a model); a configuration file it parses constants from is an input of that configuration,
//               with the hash it recorded; a cross-check is a second solver's (cvc5 beside Z3), read from one
//               configuration of its run, and one said to read the same input shares an input hash with the
//               query's configuration and, where both lines name their query, answers the same query; a trace
//               fixture names the configuration that printed each record, those configurations run one TLC version,
//               and a trace counts once, whatever it is called; the stamp derived from the parsed lines equals the
//               expected one, the derivation's row is the fixture's row, and every row (section 8.8 and the rules
//               beside it) has a fixture. Receipts are derived by packages/stamps' deriveReceipt, which re-reads every
//               verdict line and never trusts a receipt section alone (ARCHITECTURE.md section 10.3); its unit tests
//               hold it to that
//   which-stamp every GEN-which-stamp key comes from the one deriver applied to a recorded output (ASSESSMENT.md
//               sections 4.13 and 7.1): each fixture in content/generators/GEN-which-stamp/fixtures.json (W1-T26;
//               the format is in packages/stamps/README.md) is derived through the derive path above, so a raw
//               output typed by hand never stands in for one, and its key must be what the deriver gives; the
//               generator imports packages/stamps, and only its mutants.ts (or distractors.ts) may spell a stamp by
//               hand; "pending (W1-T26)" while neither exists
//   grammar     every derived stamp, by the gate's own reading of spine sections 8.7 and 10.2 (never the package's
//               grammar check, which a deriver could loosen with itself): its word is the spine's for its code; it has
//               a qualifier whose parts are non-empty, unpadded and free of the separator; [P] names its checker and a
//               dotted version first, [M] leads with its bound, [T] with its count and [R] with its witness length;
//               the package prints it as its word, code and parts; and every stamp code of section 8.7 has a fixture
//   requirement buildStrip refuses a PROVED reading in requirement fit ([P] as primary or supporting, or a Lean
//               result's "PROVED modulo k assumed lemmas") and refuses an agent's claim; the Strip component refuses
//               to draw such a strip; learner copy never puts a [P] (or PROVED) in requirement fit: on a line that
//               names it, on the line after a label that ends its line, in a table column headed by it, or under a
//               YAML or JSON requirement key, unless a negation stands right beside the mark ("never [P]", "[P] is
//               not") or the mark is quoted or under evaluation (an option)
//   render      the stamp and strip components render every derived stamp with its frame class, a hidden frame and
//               the spoken name of DESIGN.md section 5.9, and an agent's assertion as UNREVIEWED text with no frame;
//               the strip component draws neither [P] nor a "modulo" reading in requirement fit when handed a strip
//               buildStrip would refuse; the stamp's own elements (tag, classes, attributes) are read from this
//               markup for the frame lint
//   hand        no stamp is built by hand in apps/*/src or packages/*/src: no stamp word beside a code, no code
//               followed by " · " and a qualifier, and no stamp's spoken name ("Proved, code P: …"), in a string, a
//               template, a concatenation, an array joined into text or an element's text with every element nested
//               in it, nor in the apps' pages (each app's own HTML pages and the HTML and SVG files under its src/
//               and public/: their text with the tags taken out, and each tag's attributes); no object literal with
//               a stamp code beside a word or qualifier; no copy of a stamp, by a spread or Object.assign, that sets
//               one of a stamp's fields (code, word, qualifier, lane, defeaters, row, source) when the field is a
//               qualifier or defeaters, or its value a stamp code or word; or when what it copies is named after a
//               stamp (`stamp`, `d.stamp`, `myStamp`) or is typed a Stamp by the compiler (a parameter, a callback's
//               argument, a property, an element, a call's result, a union or intersection holding one: one program
//               reads the files that hold such copies); or when the copy stands where a stamp is used (a stamp
//               attribute or property, a declaration, return type or satisfies naming Stamp, the argument of
//               stampText, codeText, qualifierText or spokenName); or when the file is one no compiler checks (.js,
//               .jsx and their module forms); no Object.assign of something named after a stamp; no JSON.parse
//               where a stamp is used; no cast to Stamp, under any name the file imports it as; and no element
//               wearing the stamp component's classes (stamp, stamp-frame, stamp-<code>, its parts, lane-badge)
//               outside the component. A context, an error or a row given a lane, a source or a code is no stamp.
//               The compiler refuses a spread copy wherever a Stamp is expected, since a Stamp's brand is a private
//               field no copy carries; this check reads what it lets through (Object.assign, whose result it types
//               as the stamp; a copy handed to a text function, which takes a stamp's text fields; a cast). A value
//               typed any is beyond both
//   hue         a stamp hue (any --st-* token, --line-violation, or a colour within ΔE76 3 of a hue, in any CSS
//               syntax: hex with or without alpha, rgb(), hsl(), hwb(), lab(), lch(), oklab(), oklch(), color())
//               appears only in rules scoped to .stamp*, .strip*, .line-violation or .line-crack; vermilion only in
//               .stamp-r, .line-violation and .line-crack. Outside the stamp and strip components, no string or
//               template in an app's scripts, no colour in its HTML, SVG or JSON files, and no colour in learner
//               content (whose raw HTML renders on the site) holds a hue or names a stamp token
//   line        dashed and dotted lines and stroke-dasharray only in .line-assumed, .line-bounded, .stamp-a and
//               .stamp-m; a gradient (the hatch) only in .stamp-q and .line-crack. Read in every stylesheet the apps
//               can load (below); in the apps' scripts, as the value of a line property (border, outline, text
//               decoration, column rule, their sides and styles, stroke-dasharray) wherever a style is declared (a
//               style object in a constant, a map or a spread, a JSX style attribute or string, a variable named after
//               the property, an assignment to an element's style, setProperty), read through the file's variables
//               it names; a gradient, or a dashed or dotted CSS value with a width or a colour beside it, in any
//               string; a strokeDasharray attribute and a canvas dash pattern (setLineDash); and in the apps' HTML,
//               SVG and JSON files and learner content (code in Markdown aside), as a stroke-dasharray attribute, a
//               style attribute that draws one, or a JSON key named after a line property
//   grayscale   in both themes the nine frames' grayscale signatures differ, and differ again under forced colors;
//               every stamp's text is at least 4.5:1 against its surface (the stripe nearer in luminance, for the
//               hatch) and its identifying stroke or fill at least 3:1 against the sheet; the pairs color cannot
//               separate (grayscale luminance ratio, Machado 2009 simulations) are reported with the frames that do.
//               The signatures are read from stamp.css and tokens.css, so nothing else may draw on a stamp. Every
//               stylesheet an app can load is read: CSS files under apps/*/src and apps/*/public; <style> blocks in
//               the apps' HTML pages (index.html and the instrument origin's pages), their HTML and SVG files, and
//               learner content; and CSS a script holds as text, which it can hand to a constructed stylesheet,
//               insertRule or a style element (any string or template in an app's scripts that reads as CSS rules, a
//               TSX <style> element's text among them). A rule reaches a stamp's element when its subject compound
//               can select that element as the component renders it, by class, type, attribute or universally,
//               whatever its ancestors. In
//               stamp.css only the modelled rules (.stamp-frame and .stamp-<code> .stamp-frame, at the top level or
//               under forced colors) draw the frame: a border, outline, background, shadow, mask, clip-path, filter,
//               opacity, forced-color-adjust, `all` or text colour, in the longhands framesOf reads. Outside
//               stamp.css a rule that reaches the frame or its words may only place them (margin, alignment,
//               wrapping, pointer behaviour), so nothing else hides the word, changes its face or size, or draws on
//               the frame (DESIGN.md section 5.2: the word always appears); a rule that reaches what stands around
//               the frame (the box, the button, the badge) may lay it out or reset a property (0, none, transparent,
//               auto), and nothing that draws, hides (display: none, visibility) or passes into the words. A token
//               the frames or their words are drawn with (every var() of stamp.css's rules on them, and the tokens
//               those are defined with) is defined only in tokens.css's :root blocks: a rule anywhere else, a style
//               attribute in an app's markup or in learner content, or a style object's key or a setProperty call
//               in a script would redefine it for every stamp below that element. Focus and press states are left
//               alone: a focus ring passes with the focus.
//               What a static read cannot see: an element the app wraps around a stamp drawing its own box or ring;
//               an ancestor's fade or filter; and a script that changes how an element draws, other than by a token,
//               through its inline style (`el.style.outline = …`, setAttribute('style', …)) or the Web Animations
//               API, on an element it selected by type or attribute. (A script cannot reach a frame by its class:
//               the hand check refuses the stamp classes in selectors and class lists outside the component.) The
//               rendered check of every stamp on
//               the built pages, requested of W1-T41's GATE-bundle, covers those.
//   tokens      tokens.css defines every token the stamp and strip styles use, its two night blocks are identical,
//               and its generated @font-face block declares exactly the files of apps/site/public/fonts/fonts.json,
//               each present with its recorded SHA-256, beside its license
//
// The self-check (--self-check, --only TEXT for some plants) plants faults in scratch copies of what the gate reads,
// several at a time (GATE_SELF_CHECK_JOBS), each with the findings it must draw, where and saying what: a plant that
// exercises several forms of a rule (one per line, file or fixture) expects a finding for each, so a weakening that
// drops any one form or one rule of a check, widens an exemption or a scope to take one in, or turns an exact match
// into a prefix match, leaves a plant missed; a control (a context, an error or a row spread with a lane, a source or
// a code, typed or not; a derivation's fields; a dash array of none) expects none. scripts/spikes/W1-T01/mutate.mjs
// measures that.
//
// Exit status: 0 green, 1 findings, 2 the gate could not run.

import { spawn, spawnSync } from 'node:child_process'
import crypto from 'node:crypto'
import { createRequire } from 'node:module'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

// packages/stamps is TypeScript, which Node 22 runs with type stripping (on by default from 22.18).
if (!process.features.typescript && !process.env.STAMPS_GATE_STRIP) {
  const again = spawnSync(process.execPath, ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', ...process.argv.slice(1)], {
    stdio: 'inherit',
    env: { ...process.env, STAMPS_GATE_STRIP: '1' },
  })
  process.exit(again.status ?? 1)
}

const SCRIPT = fileURLToPath(import.meta.url)
const REPO = path.resolve(path.dirname(SCRIPT), '..')

export const PATHS = {
  spine: 'docs/spine/SPINE.md',
  stamps: 'packages/stamps/src/index.ts',
  fixtures: 'packages/stamps/test/fixtures/verdicts.json',
  tokens: 'apps/site/src/styles/tokens.css',
  stampCss: 'apps/site/src/components/stamp/stamp.css',
  stripCss: 'apps/site/src/components/strip/strip.css',
  stampDir: 'apps/site/src/components/stamp',
  stripDir: 'apps/site/src/components/strip',
  fonts: 'apps/site/public/fonts',
  // GEN-which-stamp (W1-T26): its fixtures, each a recorded output and the key the item gives it, and its source
  whichStamp: 'content/generators/GEN-which-stamp/fixtures.json',
  whichStampSrc: 'packages/generators/src/which-stamp',
}

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.vite', 'coverage', '__pycache__', '.venv', 'target', '.lake', '_solutions'])
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex')

/** Every file under root/rel (sorted), filtered by a predicate on the repository-relative path. */
export function walk(root, rel, keep) {
  const out = []
  const visit = (r) => {
    const abs = path.join(root, r)
    let st
    try {
      st = fs.lstatSync(abs)
    } catch {
      return
    }
    if (st.isSymbolicLink()) return
    if (st.isDirectory()) {
      if (SKIP_DIRS.has(path.basename(abs))) return
      for (const e of fs.readdirSync(abs).sort()) visit(path.posix.join(r, e))
    } else if (st.isFile() && keep(r)) out.push(r)
  }
  visit(rel)
  return out
}

// ------------------------------------------------------------------ markdown tables
/** The rows of the first table after a heading line that starts with `heading`, as arrays of cells. */
export function tableAfter(markdown, heading) {
  const lines = markdown.split('\n')
  const start = lines.findIndex((l) => l.startsWith(heading))
  if (start < 0) return null
  const rows = []
  let inTable = false
  for (let i = start + 1; i < lines.length; i += 1) {
    const t = lines[i].trim()
    if (/^#{1,6}\s/.test(t)) break
    if (t.startsWith('|')) {
      inTable = true
      if (/^\|[\s:|-]+\|?$/.test(t)) continue
      rows.push(t.slice(1, t.endsWith('|') ? -1 : undefined).split(/(?<!\\)\|/).map((c) => c.trim()))
    } else if (inTable) break
  }
  return rows.slice(1) // without the header row
}

// ------------------------------------------------------------------ colour
export function parseHex(v) {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(v.trim())
  if (!m) return null
  const h = m[1].length === 3 ? [...m[1]].map((c) => c + c).join('') : m[1]
  return [0, 2, 4].map((i) => Number.parseInt(h.slice(i, i + 2), 16))
}
const lin = (c) => {
  const s = c / 255
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}
const unlin = (x) => {
  const v = Math.min(1, Math.max(0, x))
  return 255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055)
}
/** WCAG 2.2 relative luminance. */
export const luminance = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
/** WCAG contrast ratio. */
export function contrast(a, b) {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}
/** HSL saturation, to tell a stamp hue from a neutral graphite (DESIGN.md section 2.7: neutrals are at most 7%). */
export function saturation([r, g, b]) {
  const [mx, mn] = [Math.max(r, g, b) / 255, Math.min(r, g, b) / 255]
  const l = (mx + mn) / 2
  if (mx === mn) return 0
  return (mx - mn) / (l > 0.5 ? 2 - mx - mn : mx + mn)
}
/** Machado, Oliveira and Fernandes (2009), severity 1.0, applied in linear RGB (DESIGN.md, "Computed values"). */
const MACHADO = {
  protanopia: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deuteranopia: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
  tritanopia: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.3039],
  ],
}
export function simulate(rgb, kind) {
  const l = rgb.map(lin)
  return MACHADO[kind].map((row) => unlin(row[0] * l[0] + row[1] * l[1] + row[2] * l[2]))
}
/** CIELAB under D65, then ΔE76. */
function lab(rgb) {
  const [r, g, b] = rgb.map(lin)
  const x = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047
  const y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b
  const z = (0.0193339 * r + 0.119192 * g + 0.9503041 * b) / 1.08883
  const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116)
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))]
}
export const deltaE = (a, b) => Math.hypot(...lab(a).map((v, i) => v - lab(b)[i]))

// ------------------------------------------------------------------ colour literals, normalized
// A stamp hue can be written in any CSS colour syntax, so every literal is read to sRGB before it is compared:
// hex (3, 4, 6 or 8 digits, alpha dropped), rgb(), rgba(), hsl(), hsla(), hwb(), lab(), lch(), oklab(), oklch() and
// color(srgb | srgb-linear …), in comma or space syntax, with percentages and angle units (CSS Color 4).
const toHex = (rgb) => `#${rgb.map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, '0')).join('')}`
const mul = (m, v) => m.map((row) => row[0] * v[0] + row[1] * v[1] + row[2] * v[2])
const fromLinear = (rgb) => rgb.map(unlin)
const D50 = [0.3457 / 0.3585, 1, (1 - 0.3457 - 0.3585) / 0.3585]
const BRADFORD_D50_D65 = [
  [0.955473421488075, -0.02309845494876471, 0.06325924320057072],
  [-0.0283697093338637, 1.0099953980813041, 0.021041441191917323],
  [0.012314014864481998, -0.020507649298898964, 1.330365926242124],
]
const XYZ_D65_TO_LINEAR_SRGB = [
  [3.2409699419045226, -1.537383177570094, -0.4986107602930034],
  [-0.9692436362808796, 1.8759675015077202, 0.04155505740717559],
  [0.05563007969699366, -0.20397695888897652, 1.0569715142428786],
]
function labToRgb(L, a, b) {
  const [k, e] = [24389 / 27, 216 / 24389]
  const fy = (L + 16) / 116
  const fx = fy + a / 500
  const fz = fy - b / 200
  const xyz = [fx ** 3 > e ? fx ** 3 : (116 * fx - 16) / k, L > k * e ? fy ** 3 : L / k, fz ** 3 > e ? fz ** 3 : (116 * fz - 16) / k].map((v, i) => v * D50[i])
  return fromLinear(mul(XYZ_D65_TO_LINEAR_SRGB, mul(BRADFORD_D50_D65, xyz)))
}
function oklabToRgb(L, a, b) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  return fromLinear([4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s])
}
function hslToRgb(h, s, l) {
  const f = (n) => {
    const k = (n + h / 30) % 12
    return l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, 9 - k, 1))
  }
  return [f(0), f(8), f(4)].map((v) => v * 255)
}
/** An angle in degrees: 120, 120deg, 0.33turn, 2rad, 133grad. */
function angle(t) {
  const m = /^(-?[\d.]+(?:e-?\d+)?)(deg|turn|rad|grad)?$/i.exec(t)
  if (!m) return Number.NaN
  const v = Number(m[1])
  const unit = (m[2] ?? 'deg').toLowerCase()
  const deg = unit === 'turn' ? v * 360 : unit === 'rad' ? (v * 180) / Math.PI : unit === 'grad' ? v * 0.9 : v
  return ((deg % 360) + 360) % 360
}
/** A component: a number, or a percentage scaled so 100% is `full`; `none` is 0. */
function component(t, full) {
  if (t === 'none') return 0
  const m = /^(-?[\d.]+(?:e-?\d+)?)(%)?$/.exec(t)
  if (!m) return Number.NaN
  return m[2] ? (Number(m[1]) / 100) * full : Number(m[1])
}
/** One colour function's arguments, alpha dropped: `29, 63, 143`, `29 63 143 / 50%`, `srgb 0.1 0.2 0.5`. */
function colourArgs(body) {
  const [main] = body.split('/')
  const parts = main.includes(',') ? main.split(',').map((p) => p.trim()) : main.trim().split(/\s+/)
  return parts.filter((p) => p !== '')
}
/** One colour literal as #rrggbb, or null when it is not one this reader knows. */
export function normalizeColour(literal) {
  const t = literal.trim().toLowerCase()
  const hex = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/.exec(t)
  if (hex) {
    const h = hex[1].length <= 4 ? [...hex[1].slice(0, 3)].map((c) => c + c).join('') : hex[1].slice(0, 6)
    return `#${h}`
  }
  const fn = /^(rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(\s*([^()]*)\)$/.exec(t)
  if (!fn) return null
  const args = colourArgs(fn[2])
  let rgb = null
  switch (fn[1]) {
    case 'rgb':
    case 'rgba':
      rgb = args.slice(0, 3).map((a) => component(a, 255))
      break
    case 'hsl':
    case 'hsla': {
      const [h, s, l] = [angle(args[0] ?? ''), component(args[1] ?? '', 100) / 100, component(args[2] ?? '', 100) / 100]
      rgb = hslToRgb(h, s, l)
      break
    }
    case 'hwb': {
      const [h, w, b] = [angle(args[0] ?? ''), component(args[1] ?? '', 100) / 100, component(args[2] ?? '', 100) / 100]
      rgb = w + b >= 1 ? [0, 0, 0].map(() => (w / (w + b)) * 255) : hslToRgb(h, 1, 0.5).map((c) => c * (1 - w - b) + w * 255)
      break
    }
    case 'lab':
      rgb = labToRgb(component(args[0] ?? '', 100), component(args[1] ?? '', 125), component(args[2] ?? '', 125))
      break
    case 'lch': {
      const [L, C, H] = [component(args[0] ?? '', 100), component(args[1] ?? '', 150), angle(args[2] ?? '')]
      rgb = labToRgb(L, C * Math.cos((H * Math.PI) / 180), C * Math.sin((H * Math.PI) / 180))
      break
    }
    case 'oklab':
      rgb = oklabToRgb(component(args[0] ?? '', 1), component(args[1] ?? '', 0.4), component(args[2] ?? '', 0.4))
      break
    case 'oklch': {
      const [L, C, H] = [component(args[0] ?? '', 1), component(args[1] ?? '', 0.4), angle(args[2] ?? '')]
      rgb = oklabToRgb(L, C * Math.cos((H * Math.PI) / 180), C * Math.sin((H * Math.PI) / 180))
      break
    }
    case 'color': {
      const [space, ...rest] = args
      const v = rest.slice(0, 3).map((a) => component(a, 1))
      if (space === 'srgb') rgb = v.map((c) => c * 255)
      else if (space === 'srgb-linear') rgb = fromLinear(v)
      break
    }
  }
  return rgb && rgb.length === 3 && rgb.every(Number.isFinite) ? toHex(rgb) : null
}
const COLOUR_LITERAL = /#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})(?![0-9a-z_-])|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(\s*[^()]*\)/gi
/** Every colour literal in a text, normalized to #rrggbb. */
export const coloursIn = (text) => [...String(text).matchAll(COLOUR_LITERAL)].map((m) => normalizeColour(m[0])).filter(Boolean)
/** Two colours this close read as the same hue: under ΔE76 3, about one just-noticeable difference. */
export const SAME_HUE_DELTA_E = 3

// ------------------------------------------------------------------ CSS
/** Strip comments, keeping string contents. */
function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
}

/**
 * A small CSS reader: rules as {selectors, at, decls: [{prop, value, line}], line}. `at` is the stack of enclosing
 * at-rule preludes ("@media (forced-colors: active)"). @font-face and @keyframes bodies are kept as rules whose
 * selectors are the at-rule itself.
 */
export function parseCss(source) {
  const css = stripComments(source)
  const rules = []
  const stack = [] // {kind: 'at'|'rule', prelude}
  let buf = ''
  let line = 1
  let bufLine = 1
  const lineAt = []
  for (let i = 0; i < css.length; i += 1) {
    const c = css[i]
    if (c === '\n') line += 1
    if (c === '{') {
      const prelude = buf.trim()
      stack.push({ prelude, line: bufLine, decls: [], isAt: prelude.startsWith('@') })
      buf = ''
      bufLine = line
      continue
    }
    if (c === ';' || c === '}') {
      const top = stack[stack.length - 1]
      const text = buf.trim()
      if (text !== '' && top) {
        const colon = text.indexOf(':')
        if (colon > 0) top.decls.push({ prop: text.slice(0, colon).trim().toLowerCase(), value: text.slice(colon + 1).trim(), line: bufLine })
      }
      buf = ''
      bufLine = line
      if (c === '}') {
        const done = stack.pop()
        if (done && (!done.isAt || /^@(font-face|keyframes|page)/.test(done.prelude))) {
          const at = stack.filter((s) => s.isAt).map((s) => s.prelude)
          // a selector list splits at its top-level commas, never inside :is(…), :not(…) or an attribute test
          const selectors = done.isAt ? [done.prelude] : splitTopLevel(done.prelude).filter(Boolean)
          rules.push({ selectors, at, decls: done.decls, line: done.line, keyframe: stack.some((s) => /^@keyframes/.test(s.prelude)) })
        }
      }
      continue
    }
    if (buf.trim() === '' && !/\s/.test(c)) bufLine = line
    buf += c
    lineAt.push(line)
  }
  return rules
}

/** The class tokens of one selector. */
const classes = (selector) => [...selector.matchAll(/\.([A-Za-z0-9_-]+)/g)].map((m) => m[1])
const allSelectors = (rule, pred) => rule.selectors.length > 0 && rule.selectors.every((s) => pred(classes(s), s))
const inStampScope = (cls) => cls.some((c) => /^(stamp|strip)(-|$)/.test(c) || c === 'line-violation' || c === 'line-crack')
const inVermilionScope = (cls) => cls.some((c) => c === 'stamp-r' || c === 'line-violation' || c === 'line-crack')
const inLineScope = (cls) => cls.some((c) => c === 'line-assumed' || c === 'line-bounded' || c === 'stamp-a' || c === 'stamp-m')
const inPatternScope = (cls) => cls.some((c) => c === 'stamp-q' || c === 'line-crack')

// ------------------------------------------------------------------ tokens
/** The custom properties of the first rule matching `selector` inside the at-rule stack `at`. */
function blockOf(rules, selector, at = []) {
  const r = rules.find((x) => x.selectors.length === 1 && x.selectors[0] === selector && x.at.join('|') === at.join('|'))
  if (!r) return null
  return Object.fromEntries(r.decls.filter((d) => d.prop.startsWith('--')).map((d) => [d.prop, d.value]))
}

/** The light and night token maps; night is light overlaid with the night block. */
export function themesOf(tokensCss) {
  const rules = parseCss(tokensCss)
  const light = blockOf(rules, ':root')
  const nightMedia = blockOf(rules, ':root:not([data-theme="light"])', ['@media (prefers-color-scheme: dark)'])
  const nightAttr = blockOf(rules, ':root[data-theme="night"]')
  return { rules, light, nightMedia, nightAttr }
}

/** Resolve var() references in a value against a token map, to a literal. */
export function resolve(value, tokens, depth = 0) {
  if (depth > 10) return value
  return value.replace(/var\(\s*(--[A-Za-z0-9_-]+)\s*(?:,\s*([^)]*))?\)/g, (_, name, fb) => {
    const v = tokens[name]
    return v === undefined ? (fb ?? `var(${name})`) : resolve(v, tokens, depth + 1)
  })
}

// ------------------------------------------------------------------ frames
const SIDES = ['top', 'right', 'bottom', 'left']
const FORCED_COLORS = /^@media\s*\(\s*forced-colors\s*:\s*active\s*\)$/
/**
 * The rules framesOf reads, and the only ones that may draw a frame: `.stamp-frame` at the top level, and
 * `.stamp-<code> .stamp-frame` at the top level or directly under `@media (forced-colors: active)`.
 */
export function isModelledFrameRule(rule) {
  if (rule.selectors.length !== 1 || rule.keyframe) return false
  const s = rule.selectors[0]
  if (s === '.stamp-frame') return rule.at.length === 0
  return /^\.stamp-[pmtecaqnr] \.stamp-frame$/.test(s) && (rule.at.length === 0 || (rule.at.length === 1 && FORCED_COLORS.test(rule.at[0])))
}
/** Shorthands that set several of a frame's longhands at once, which framesOf does not expand. */
const FRAME_SHORTHAND = /^(?:border|border-(?:top|right|bottom|left|style|width|block|inline|block-start|block-end|inline-start|inline-end)|outline|background)$/
/** The longhands framesOf reads into a frame's signature and contrast. */
const FRAME_LONGHANDS = new Set([...SIDES.flatMap((s) => [`border-${s}-style`, `border-${s}-width`]), 'border-color', 'outline-style', 'outline-width', 'outline-color', 'outline-offset', 'background-color', 'background-image', 'color'])
/**
 * Properties that draw on an element or change how what it draws reads: borders, rings, fills, shadows, masks and
 * clips, fades and filters, `all` (which can undo a frame), and forced-color-adjust (which keeps fills under forced
 * colors, where the frames rest on their borders).
 */
const DRAWS = /^(?:all|border|outline|background|box-shadow|mask|clip-path|filter|backdrop-filter|opacity|mix-blend-mode|forced-color-adjust)(?:-|$)/
/** The text's own colour, which the gate's contrast check reads from the frame. */
const TEXT_COLOUR = /^(?:color|-webkit-text-fill-color|-webkit-text-stroke(?:-.+)?)$/
/** Corner radii change no grayscale signature, and the table-border properties do nothing to an inline element. */
const NO_SIGNATURE = /^border(?:-(?:top|bottom|start|end)-(?:left|right|start|end))?-radius$|^border-(?:collapse|spacing)$/
/**
 * A value that draws nothing and hides nothing: a reset (`border: 0`, `background: none`, `opacity: 1`,
 * `forced-color-adjust: auto`, `visibility: visible`). `display` is never a reset: it is layout, and `display: none`
 * hides the whole stamp.
 */
export function isReset(prop, value) {
  const v = value.replace(/!important/i, '').trim().toLowerCase()
  if (prop === 'opacity') return /^(?:1(?:\.0*)?|100%)$/.test(v)
  if (prop === 'forced-color-adjust') return v === 'auto'
  if (prop === 'display') return false
  if (prop === 'visibility' || prop === 'content-visibility') return /^(?:visible|auto|inherit|initial|unset|revert|revert-layer)$/.test(v) && !(prop === 'visibility' && v === 'auto')
  return v.split(/[\s,]+/).every((t) => /^(?:0(?:\.0*)?(?:px|em|rem|%)?|none|transparent|inherit|initial|unset|revert|revert-layer|normal)$/.test(t))
}

/**
 * Properties that change nothing a stamp shows (its frame, its words, their face, size and visibility): where it
 * sits among its neighbours, how its text wraps, how the pointer and transitions behave.
 */
export const PLACEMENT = /^(?:box-sizing|margin(?:-[a-z-]+)?|cursor|pointer-events|(?:-webkit-)?user-select|touch-action|transition(?:-[a-z-]+)?|will-change|scroll-(?:margin|padding|snap)(?:-[a-z-]+)?|vertical-align|flex(?:-(?:grow|shrink|basis))?|order|align-self|justify-self|place-self|grid-(?:area|row|column)(?:-[a-z-]+)?|(?:page-)?break-(?:before|after|inside)|orphans|widows|-webkit-tap-highlight-color|caret-color|accent-color|overflow-wrap|word-wrap|word-break|hyphens|tab-size|text-rendering|-webkit-font-smoothing|-moz-osx-font-smoothing|font-kerning|font-optical-sizing|image-rendering|counter-(?:reset|increment|set)|quotes|list-style(?:-[a-z-]+)?|anchor-name|view-transition-name)$/
/** Around the frame (the box, the button, the badge), the properties that lay the stamp out, as long as they hide nothing. */
export const LAYOUT = /^(?:display|position|padding(?:-[a-z-]+)?|gap|row-gap|column-gap|align-items|align-content|justify-content|justify-items|place-items|place-content|flex-(?:wrap|direction|flow)|grid-template(?:-[a-z-]+)?|grid-auto-(?:rows|columns|flow)|(?:min-|max-)?(?:width|height|inline-size|block-size))$/
/** Layout values that hide the stamp rather than place it. */
const HIDES = { display: /^none$/ }

// The elements of a stamp as the component renders them, each with its role: the frame and its parts (whose
// signature GATE-stamps reads from stamp.css), or what stands around the frame (the box, the button, the badge, the
// spoken name). renderCheck reads them from the rendered markup; this list stands in when it cannot render.
const STAMP_CODES_LOWER = ['p', 'm', 't', 'e', 'c', 'a', 'q', 'n', 'r']
export const FALLBACK_ELEMENTS = [
  ...STAMP_CODES_LOWER.flatMap((c) => [
    { tag: 'span', classes: ['stamp', `stamp-${c}`], attrs: { class: `stamp stamp-${c}`, 'data-code': `[${c === 'q' ? '?' : c.toUpperCase()}]` }, role: 'around' },
    { tag: 'span', classes: ['stamp', `stamp-${c}`, 'stamp-landing'], attrs: { class: `stamp stamp-${c} stamp-landing`, 'data-code': `[${c === 'q' ? '?' : c.toUpperCase()}]` }, role: 'around' },
  ]),
  ...['false', 'true'].map((expanded) => ({ tag: 'button', classes: ['stamp-button'], attrs: { type: 'button', class: 'stamp-button', 'aria-expanded': expanded, 'aria-controls': 'x' }, role: 'around' })),
  { tag: 'span', classes: ['stamp-frame'], attrs: { class: 'stamp-frame', 'aria-hidden': 'true' }, role: 'frame' },
  ...['stamp-head', 'stamp-word', 'stamp-code', 'stamp-sep', 'stamp-part'].map((c) => ({ tag: 'span', classes: [c], attrs: { class: c }, role: 'frame' })),
  { tag: 'span', classes: ['visually-hidden'], attrs: { class: 'visually-hidden' }, role: 'hidden' },
  { tag: 'span', classes: ['lane-badge'], attrs: { class: 'lane-badge' }, role: 'around' },
  { tag: 'span', classes: [], attrs: {}, role: 'around' },
  ...['svg', 'path', 'rect'].map((tag) => ({ tag, classes: [], attrs: { 'aria-hidden': 'true' }, role: 'around' })),
]

/** The elements of rendered markup (React's static markup is well formed): tag, classes, attributes, and whether each is the frame or inside it. */
export function elementsOf(html) {
  const out = []
  const stack = []
  const decode = (s) => s.replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
  for (const m of html.matchAll(/<(\/?)([a-zA-Z][\w-]*)((?:\s+[^\s=>/]+(?:="[^"]*")?)*)\s*(\/?)>/g)) {
    const [, close, tagName, attrText, selfClose] = m
    if (close) {
      stack.pop()
      continue
    }
    const tag = tagName.toLowerCase()
    const attrs = {}
    for (const a of attrText.matchAll(/([^\s=]+)(?:="([^"]*)")?/g)) attrs[a[1].toLowerCase()] = decode(a[2] ?? '')
    const classList = (attrs.class ?? '').split(/\s+/).filter(Boolean)
    const frame = stack.some((s) => s.frame) || classList.includes('stamp-frame')
    // the spoken name is clipped to nothing (tokens.css's .visually-hidden), so nothing drawn on it shows
    out.push({ tag, classes: classList, attrs, role: classList.includes('visually-hidden') ? 'hidden' : frame ? 'frame' : 'around' })
    if (!selfClose && !/^(?:area|base|br|col|embed|hr|img|input|link|meta|source|track|wbr)$/.test(tag)) stack.push({ frame })
  }
  return out
}

/** The compound after a selector's last combinator, outside brackets, parentheses and quotes: `.card span` → `span`. */
export function subjectOf(selector) {
  const s = selector.trim()
  let paren = 0
  let bracket = 0
  let quote = null
  let start = 0
  for (let i = 0; i < s.length; i += 1) {
    const c = s[i]
    if (quote) {
      if (c === '\\') i += 1
      else if (c === quote) quote = null
      continue
    }
    if (c === '\\') i += 1
    else if (c === '"' || c === "'") quote = c
    else if (c === '(') paren += 1
    else if (c === ')') paren -= 1
    else if (c === '[') bracket += 1
    else if (c === ']') bracket -= 1
    else if (paren === 0 && bracket === 0 && /[\s>+~]/.test(c)) start = i + 1
  }
  return s.slice(start).trim()
}

/** Split a selector list at its top-level commas. */
function splitTopLevel(list) {
  const out = []
  let depth = 0
  let cur = ''
  for (const c of list) {
    if (c === '(' || c === '[') depth += 1
    if (c === ')' || c === ']') depth -= 1
    if (c === ',' && depth === 0) {
      out.push(cur.trim())
      cur = ''
    } else cur += c
  }
  if (cur.trim() !== '') out.push(cur.trim())
  return out
}

/** A compound selector's parts: its type, classes, ids, attribute tests, pseudo-classes (with their arguments) and pseudo-element. */
export function parseCompound(compound) {
  const parts = { type: null, classes: [], ids: [], attrs: [], pseudos: [], pseudoElement: null }
  const s = compound
  let i = 0
  const ident = () => {
    let out = ''
    while (i < s.length && (/[\w-]/.test(s[i]) || s[i] === '\\' || s.charCodeAt(i) > 127)) {
      if (s[i] === '\\') {
        out += s[i + 1] ?? ''
        i += 2
      } else out += s[i++]
    }
    return out
  }
  const balanced = () => {
    // at '(': return the inside, leave i after ')'
    let depth = 0
    const from = i + 1
    for (; i < s.length; i += 1) {
      if (s[i] === '(') depth += 1
      if (s[i] === ')') {
        depth -= 1
        if (depth === 0) {
          i += 1
          return s.slice(from, i - 1)
        }
      }
    }
    return s.slice(from)
  }
  if (s[0] === '*') {
    parts.type = '*'
    i = 1
  } else if (/[A-Za-z]/.test(s[0] ?? '')) parts.type = ident().toLowerCase()
  while (i < s.length) {
    const c = s[i]
    if (c === '.') {
      i += 1
      parts.classes.push(ident())
    } else if (c === '#') {
      i += 1
      parts.ids.push(ident())
    } else if (c === '[') {
      const end = s.indexOf(']', i)
      const body = s.slice(i + 1, end < 0 ? s.length : end)
      i = end < 0 ? s.length : end + 1
      const a = /^\s*([\w-]+)\s*(?:([~|^$*]?=)\s*(?:"([^"]*)"|'([^']*)'|([^\s\]]+))\s*([is])?)?\s*$/i.exec(body)
      parts.attrs.push(a ? { name: a[1].toLowerCase(), op: a[2] ?? null, value: a[3] ?? a[4] ?? a[5] ?? null, insensitive: (a[6] ?? '').toLowerCase() === 'i' } : { name: '', op: 'unknown', value: null, insensitive: false })
    } else if (c === ':') {
      const element = s[i + 1] === ':'
      i += element ? 2 : 1
      const name = ident().toLowerCase()
      const args = s[i] === '(' ? balanced() : null
      if (element || /^(?:before|after|first-line|first-letter)$/.test(name)) parts.pseudoElement = name
      else parts.pseudos.push({ name, args })
    } else i += 1
  }
  return parts
}

/** Focus and press states, which pass with the gesture; a focus ring is not a frame. */
const TRANSIENT = new Set(['focus', 'focus-visible', 'focus-within', 'active'])
/** Pseudo-elements that draw nothing on the element's box at rest. */
const NOT_ON_THE_BOX = /^(?:selection|placeholder|marker|backdrop|file-selector-button|cue|spelling-error|grammar-error|target-text|highlight|-webkit-.*|-moz-.*)$/

/** Can this compound select this element, wherever the element stands? Ancestors are never known, so they never rule it out. */
export function mayMatch(compound, el) {
  // text that is not shaped like a compound selector selects nothing
  if (compound !== '' && !/^[A-Za-z*.#[:&\\]/.test(compound)) return false
  const p = parseCompound(compound)
  if (p.pseudoElement && NOT_ON_THE_BOX.test(p.pseudoElement)) return false
  if (p.type && p.type !== '*' && p.type !== el.tag) return false
  if (!p.classes.every((c) => el.classes.includes(c))) return false
  if (p.ids.some((id) => el.attrs.id !== id)) return false
  for (const a of p.attrs) {
    if (a.op === 'unknown') continue // a test this reader cannot parse may match
    const has = Object.hasOwn(el.attrs, a.name)
    if (!has) return false
    if (a.op === null) continue
    const v = a.insensitive ? String(el.attrs[a.name]).toLowerCase() : String(el.attrs[a.name])
    const w = a.insensitive ? String(a.value).toLowerCase() : String(a.value)
    const ok = a.op === '=' ? v === w : a.op === '~=' ? v.split(/\s+/).includes(w) : a.op === '|=' ? v === w || v.startsWith(`${w}-`) : a.op === '^=' ? w !== '' && v.startsWith(w) : a.op === '$=' ? w !== '' && v.endsWith(w) : w !== '' && v.includes(w)
    if (!ok) return false
  }
  for (const { name, args } of p.pseudos) {
    if (TRANSIENT.has(name)) return false
    if (/^(?:link|visited|any-link|target|root)$/.test(name)) return false // a link, a fragment's target or <html>: never a stamp's element
    if ((name === 'is' || name === 'where' || name === 'matches' || name === '-webkit-any') && args !== null) {
      if (!splitTopLevel(args).some((arg) => mayMatch(subjectOf(arg), el))) return false
    }
    if (name === 'not' && args !== null) {
      // only a plain compound can be ruled out exactly; a complex argument depends on ancestors, so it may match
      const simple = splitTopLevel(args).filter((arg) => subjectOf(arg) === arg.trim())
      if (simple.length > 0 && simple.some((arg) => mayMatch(arg, el))) return false
    }
  }
  return true
}

/**
 * Rules that would draw on a stamp in a way framesOf cannot read, or hide what it shows. A rule reaches a stamp's
 * element when its subject compound (the part after the last combinator) can select that element as the component
 * renders it: by a class, by its type (`span`, `button`), by an attribute (`[aria-hidden="true"]`), or universally
 * (`*`); ancestors never rule it out.
 *   In stamp.css, which draws the stamps, only the modelled rules (.stamp-frame and .stamp-<code> .stamp-frame, at
 *   the top level or under forced colors) set a border, outline, background, shadow, mask, filter, opacity or text
 *   colour on the frame and its parts, and only in the longhands framesOf reads; around the frame such a property is
 *   only ever reset.
 *   Anywhere else, a rule that reaches the frame or its words may set only placement (PLACEMENT): their face, size,
 *   visibility, colour and frame are stamp.css's alone. A rule that reaches what stands around the frame (the box, the
 *   button, the badge) may also lay it out (LAYOUT, except display: none) or reset a property, and nothing else: no
 *   drawing, no hiding, and nothing the words would inherit.
 * Custom properties are judged by the token rule (frameTokenProblems), not here.
 */
export function frameShapeProblems(rel, rules, elements = FALLBACK_ELEMENTS) {
  const out = []
  const inStampCss = rel === PATHS.stampCss
  for (const rule of rules) {
    if (rule.keyframe || /^@/.test(rule.selectors[0] ?? '')) continue
    const reached = elements.filter((el) => el.role !== 'hidden' && rule.selectors.some((s) => mayMatch(subjectOf(s), el)))
    if (reached.length === 0) continue
    const frame = reached.filter((el) => el.role === 'frame')
    const modelled = inStampCss && isModelledFrameRule(rule)
    const on = `${rule.selectors.join(', ')}${rule.at.length > 0 ? ` inside ${rule.at.join(' ')}` : ''}`
    const named = (els) => [...new Set(els.map((el) => `${el.tag}${el.classes.map((c) => `.${c}`).join('')}`))].slice(0, 4).join(', ')
    for (const d of rule.decls) {
      if (d.prop.startsWith('--')) continue
      const where = `${rel}:${d.line}`
      if (inStampCss) {
        if (NO_SIGNATURE.test(d.prop) || !(DRAWS.test(d.prop) || TEXT_COLOUR.test(d.prop))) continue
        if (frame.length > 0) {
          if (!modelled) out.push({ where, detail: `${d.prop}: ${d.value} on ${on} reaches a stamp's frame (${named(frame)}): only .stamp-frame and .stamp-<code> .stamp-frame in stamp.css, at the top level or under forced colors, draw a frame or set its text colour, because those are the rules GATE-stamps reads` })
          else if (FRAME_SHORTHAND.test(d.prop)) out.push({ where, detail: `${d.prop}: ${d.value} is a shorthand on a stamp (${on}); write the longhands (border-*-style, border-*-width, border-color, outline-*, background-color, background-image) so the frame's grayscale signature can be read` })
          else if (!FRAME_LONGHANDS.has(d.prop)) out.push({ where, detail: `${d.prop} on ${on}: GATE-stamps does not read it into the frame's grayscale signature, so it may not change the frame` })
        } else if (DRAWS.test(d.prop) && !isReset(d.prop, d.value)) out.push({ where, detail: `${d.prop}: ${d.value} on ${on} draws around a stamp's frame (${named(reached)}): around the frame nothing draws (a reset such as 0 or none is fine), so only the frame's own shape tells the stamps apart` })
        continue
      }
      if (PLACEMENT.test(d.prop)) continue
      if (frame.length > 0) {
        out.push({ where, detail: `${d.prop}: ${d.value} on ${on} reaches a stamp's frame or its words (${named(frame)}): outside stamp.css a rule may only place them (margin, alignment, wrapping), because GATE-stamps reads every frame from stamp.css and the word always appears in its own face and size (DESIGN.md section 5.2); scope the rule with a class of your own` })
        continue
      }
      if (LAYOUT.test(d.prop) && !HIDES[d.prop]?.test(d.value.replace(/!important/i, '').trim().toLowerCase())) continue
      if (isReset(d.prop, d.value)) continue
      out.push({ where, detail: `${d.prop}: ${d.value} on ${on} draws on, hides or restyles what stands around a stamp's frame (${named(reached)}): around the frame a rule may lay the stamp out or reset a property (0, none, transparent, visible), so only the frame's own shape tells the stamps apart and the words keep stamp.css's face; scope the rule with a class of your own` })
    }
  }
  return out
}

/**
 * The tokens a stamp's frame and words are drawn with: every var() in stamp.css's rules that reach a stamp's
 * elements, on a property that is not placement or layout, and every token those are defined with, in either theme.
 */
export function frameTokensOf(stampCss, themes, elements = FALLBACK_ELEMENTS) {
  const queue = []
  for (const rule of parseCss(stampCss)) {
    if (rule.keyframe || /^@/.test(rule.selectors[0] ?? '')) continue
    if (!elements.some((el) => el.role !== 'hidden' && rule.selectors.some((s) => mayMatch(subjectOf(s), el)))) continue
    for (const d of rule.decls) if (!PLACEMENT.test(d.prop) && !LAYOUT.test(d.prop)) for (const m of d.value.matchAll(/var\(\s*(--[\w-]+)/g)) queue.push(m[1])
  }
  const tokens = new Set()
  while (queue.length > 0) {
    const t = queue.pop()
    if (tokens.has(t)) continue
    tokens.add(t)
    for (const map of themes) for (const m of String(map?.[t] ?? '').matchAll(/var\(\s*(--[\w-]+)/g)) queue.push(m[1])
  }
  return tokens
}

/**
 * A token the frames are drawn with, defined anywhere but tokens.css's :root blocks: custom properties inherit, so a
 * rule on any element (`.claim-card { --st-p-fill: #fff }`) redefines it for every stamp below that element, and the
 * frames GATE-stamps measured from tokens.css are no longer the ones drawn there.
 */
/** A token block of tokens.css: :root itself, under attribute tests or :not() conditions only, never an element below it. */
export const ROOT_BLOCK = /^:root(?:\[[^\]]*\]|:not\([^()]*\))*$/

export function frameTokenProblems(rel, rules, frameTokens) {
  const out = []
  for (const rule of rules) {
    const isTokenBlock = rel === PATHS.tokens && rule.selectors.length > 0 && rule.selectors.every((s) => ROOT_BLOCK.test(s))
    if (isTokenBlock) continue
    for (const d of rule.decls) {
      if (frameTokens.has(d.prop)) out.push({ where: `${rel}:${d.line}`, detail: `${d.prop} on ${rule.selectors.join(', ')} redefines a token a stamp's frame or words are drawn with: only tokens.css's :root blocks define it, because a rule anywhere else redefines it for every stamp below it` })
    }
  }
  return out
}

/** A selector's shape: it starts as a type, `*`, a class, an id, an attribute test, a pseudo-class or `&`, and holds only selector characters outside its brackets and parentheses. */
const selectorLike = (sel) => {
  const t = sel.trim()
  const bare = t.replace(/\[[^\]]*\]/g, '').replace(/\([^)]*\)/g, '')
  return /^[A-Za-z*.#:&[\\]/.test(t) && /^[\w\s.#*:>+~&\\-]*$/.test(bare)
}

/** Text that reads as CSS rules: selectors shaped like selectors, braces, and at least one declaration. */
export function looksLikeCss(text) {
  if (!/\{/.test(text) || !/\}/.test(text) || !/:/.test(text)) return false
  return parseCss(text).some((r) => r.selectors.length > 0 && !r.keyframe && r.selectors.every(selectorLike) && r.decls.some((d) => /^(?:-?[a-z][a-z0-9-]*|--[\w-]+)$/.test(d.prop) && d.value !== ''))
}

/**
 * CSS a script holds as text, which it can hand to a constructed stylesheet (`new CSSStyleSheet().replaceSync(…)`),
 * to insertRule, or to a style element's text: every string or template in the script that reads as CSS rules, each
 * with the line it starts on. A substitution in a template stands as `*`, so a selector built from one reads as one
 * that may select anything, and a value built from one is never a reset.
 */
export function scriptStyleSheets(rel, text) {
  const ts = loadTypescript()
  const sf = ts.createSourceFile(rel, text, ts.ScriptTarget.Latest, true, /x$/.test(rel) ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
  const out = []
  const visit = (node) => {
    let css = null
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) css = node.text
    else if (ts.isTemplateExpression(node)) css = node.head.text + node.templateSpans.map((s) => `*${s.literal.text}`).join('')
    if (css !== null && looksLikeCss(css)) out.push({ css, lineOffset: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line })
    if (ts.isTemplateExpression(node)) for (const s of node.templateSpans) visit(s.expression)
    else ts.forEachChild(node, visit)
  }
  visit(sf)
  return out
}

/** The frame of each stamp class, from the stamp CSS: borders, outline, fill and hatch, resolved per theme. */
export function framesOf(stampCss, tokens, { forced = false } = {}) {
  const rules = parseCss(stampCss).filter(isModelledFrameRule)
  const base = rules.filter((r) => r.selectors[0] === '.stamp-frame')
  const frames = {}
  for (const code of ['p', 'm', 't', 'e', 'c', 'a', 'q', 'n', 'r']) {
    const props = {}
    for (const r of base) for (const d of r.decls) props[d.prop] = d.value
    const own = rules.filter((r) => r.selectors[0] === `.stamp-${code} .stamp-frame`)
    for (const r of own.filter((x) => x.at.length === 0)) for (const d of r.decls) props[d.prop] = d.value
    if (forced) for (const r of own.filter((x) => x.at.length === 1)) for (const d of r.decls) props[d.prop] = d.value
    const get = (p) => (props[p] === undefined ? undefined : resolve(props[p], tokens).trim())
    const color = get('border-color')
    const sides = SIDES.map((s) => {
      const style = get(`border-${s}-style`) ?? 'none'
      const width = Number.parseFloat(get(`border-${s}-width`) ?? '0') || 0
      return style === 'none' || width === 0 ? 'none' : `${style}:${width}`
    })
    const ringStyle = get('outline-style') ?? 'none'
    const ringWidth = Number.parseFloat(get('outline-width') ?? '0') || 0
    const bg = get('background-color')
    const image = get('background-image') ?? 'none'
    const stops = [...image.matchAll(/#[0-9a-fA-F]{3,6}\b/g)].map((m) => m[0])
    frames[code] = {
      sides,
      ring: ringStyle !== 'none' && ringWidth > 0 ? `${ringStyle}:${ringWidth}` : 'none',
      hatch: forced ? false : /gradient\(/.test(image),
      fill: forced ? null : bg && bg !== 'transparent' ? bg : null,
      text: get('color'),
      stroke: color ?? get('outline-color') ?? null,
      stops: forced ? [] : stops,
    }
  }
  return frames
}

/** A frame's grayscale signature: its borders and ring, whether it is hatched, and how its fill reads. */
export function signatureOf(frame, sheet) {
  let fill = 'none'
  if (frame.fill && !frame.hatch) {
    const c = parseHex(frame.fill)
    const r = c && sheet ? contrast(c, sheet) : 1
    fill = r >= 3 ? 'solid' : r >= 1.05 ? 'tint' : 'none'
  }
  return [frame.sides.join(' '), `ring ${frame.ring}`, frame.hatch ? 'hatch' : 'flat', `fill ${fill}`].join(' | ')
}

// ------------------------------------------------------------------ stamp grammar
/** A stamp as it reads: `WORD [code] · part · part` (spine section 10.2). */
export const stampTextOf = (s) => [`${s.word} ${s.code}`, ...s.qualifier].join(' · ')

/**
 * A derived stamp's grammar, by the gate's own reading of spine sections 8.7 and 10.2: its word is the spine's word for
 * its code; it has a qualifier whose parts are each non-empty, unpadded and free of the separator; [P]'s first part
 * names its checker and a dotted version ("Z3 5.3.1 unsat", "Lean 4.35.0 kernel"); [M] leads with its bound
 * (constants, "no constants", or a bound such as "depth 6"); [T] leads with its count ("1 seed", "n = 200", "10 of 12
 * unseen items"); and [R] leads with its witness length, a count and its unit ("1 step", "6 actions (7 states)").
 */
export function stampGrammarProblems(stamp, wordOf) {
  const out = []
  const { code, word } = stamp
  const q = Array.isArray(stamp.qualifier) ? stamp.qualifier : []
  if (wordOf[code] === undefined) out.push(`${code} is not a stamp code of spine section 8.7`)
  else if (wordOf[code] !== word) out.push(`${code}'s word is ${wordOf[code]} in spine section 8.7, not ${word}`)
  if (q.length === 0) out.push(`${code} has no qualifier, which spine section 8.7 requires`)
  for (const part of q) {
    if (typeof part !== 'string' || part.trim() === '' || part !== part.trim()) out.push(`${code} has an empty or padded qualifier part: "${part}"`)
    else if (part.includes('·')) out.push(`${code} has a qualifier part that holds the separator: "${part}"`)
  }
  const first = String(q[0] ?? '')
  if (q.length === 0) return out
  if (code === '[P]' && !/^[A-Za-z][\w+.-]*\s+v?\d+(?:\.\d+)+(?![\w.])/.test(first)) out.push(`[P] names its checker and a dotted version first (spine section 8.7: checker@version), not "${first}"`)
  if (code === '[M]' && !/^(?:no constants$|[A-Za-z_]\w* = |depth \d)/.test(first)) out.push(`[M] leads with its bound, its constants or a bound such as "depth 6" (spine section 10.2; I10), not "${first}"`)
  if (code === '[T]' && !/^(?:\d[\d,]*(?: of \d[\d,]*)? [a-z]|n = \d)/.test(first)) out.push(`[T] leads with its count, such as "1 seed" or "n = 200" (spine section 10.2; I10), not "${first}"`)
  if (code === '[R]' && !/^\d[\d,]* [a-z]/.test(first)) out.push(`[R] leads with its witness length, a count and its unit (spine section 8.7), not "${first}"`)
  return out
}

// ------------------------------------------------------------------ fixtures
/**
 * A run configuration is one execution: a fixture that quotes its lines quotes its error lines too, so it cannot
 * keep an accept line and drop the error beside it. When several configurations hold every quoted line, the
 * fixture may come from any one of them and must be complete for one; otherwise every configuration it quotes from
 * must be complete. `isErrorLine` is packages/stamps' own test, the one its parsers use.
 */
export function errorLineGaps(record, quoted, isErrorLine) {
  const q = new Set(quoted.map((l) => String(l).trimEnd()))
  const configs = (record.configs ?? []).map((c, i) => ({ id: c.id ?? c.name ?? `#${i + 1}`, lines: (c.verdict_lines ?? []).map((l) => String(l).trimEnd()) }))
  const gaps = (c) => c.lines.filter((l) => isErrorLine(l) && !q.has(l))
  const holdingAll = configs.filter((c) => q.size > 0 && [...q].every((l) => c.lines.includes(l)))
  if (holdingAll.some((c) => gaps(c).length === 0)) return []
  const blamed = holdingAll.length > 0 ? holdingAll.slice(0, 1) : configs.filter((c) => c.lines.some((l) => q.has(l)))
  return blamed.flatMap((c) => gaps(c).map((l) => `quotes the ${c.id} configuration of ${record.id} but leaves out its error line "${l}"`))
}

/** Which engine's runs each parser reads (packages/stamps' engineFamily). */
export const PARSER_FAMILY = { solver: 'solver', tlc: 'tlc', lean: 'lean', trace: 'tlc' }

const trimEnd = (l) => String(l).trimEnd()

/**
 * A run record's configurations, the record itself counting as one under the run's own id: each with the checker that
 * printed its lines (its own engine and version, or the record's), its own verdict lines and output files, its own
 * inputs, and the inputs, budget, command line, exit code and values it ran with (the record's, where it repeats none
 * of its own). A record's own lists often gather its configurations' (RUN-z3-vacuous-unsat's outputs and inputs name
 * every configuration's files), so they never stand in for a configuration's.
 */
export function configurationsOf(record) {
  const own = (c) => ({ lines: (c.verdict_lines ?? []).map(trimEnd), outputs: (c.outputs ?? []).map((o) => (typeof o === 'string' ? o : o?.path)).filter(Boolean), ownInputs: Array.isArray(c.inputs) ? c.inputs : [] })
  const top = { id: String(record.id ?? ''), isRecord: true, engine: String(record.engine ?? ''), version: String(record.version ?? ''), ...own(record), budget: record.budget ?? {}, argv: record.argv ?? [], exitCode: record.exit_code ?? null, values: record.values ?? null }
  top.inputs = top.ownInputs
  return [
    top,
    ...(record.configs ?? []).map((c, i) => {
      const o = own(c)
      return { id: String(c.id ?? c.name ?? `#${i + 1}`), isRecord: false, engine: String(c.engine ?? top.engine), version: String(c.version ?? top.version), ...o, inputs: o.ownInputs.length > 0 ? o.ownInputs : top.inputs, budget: c.budget ?? top.budget, argv: c.argv ?? top.argv, exitCode: c.exit_code ?? top.exitCode, values: c.values ?? top.values }
    }),
  ]
}

/**
 * The configurations that print every quoted line: those whose own verdict lines hold them all, or, when none does,
 * those whose verdict lines and own output files do (a record with configurations gathers their files in its own
 * output list, which therefore counts for none). They must name one checker (engine and version), since a stamp names
 * the checker that printed its lines; when configurations of several checkers print them (RUN-z3-11179's Z3 5.3.0,
 * 5.1.0 and 4.15.4 all print "-> unsat" for issue input 1), the fixture names the one it quotes in `config`, which must
 * be among them. Returns {holders} or {problem}.
 */
export function holdersOf(record, quoted, linesOfFile, named) {
  const q = quoted.map(trimEnd)
  const units = configurationsOf(record)
  const holding = (u, withOutputs) => {
    const have = new Set(u.lines)
    if (withOutputs) for (const p of u.outputs) for (const l of linesOfFile(p)) have.add(l)
    return q.every((l) => have.has(l))
  }
  const own = units.filter((u) => holding(u, false))
  // a record with configurations gathers their output files in its own list, so that list makes no holder
  const holders = own.length > 0 ? own : units.filter((u) => holding(u, !u.isRecord || units.length === 1))
  const label = (u) => `${u.id} (${u.engine} ${u.version})`
  if (named !== undefined) {
    const h = holders.find((u) => u.id === named)
    if (h) return { holders: [h] }
    if (!units.some((u) => u.id === named)) return { problem: `${named} is not a configuration of ${record.id}` }
    const which = named === String(record.id) ? `the record ${record.id} itself` : `the ${named} configuration of ${record.id}`
    return { problem: `${which} is not where the quoted lines are printed${holders.length > 0 ? `: ${holders.map(label).join(', ')} ${holders.length === 1 ? 'prints' : 'print'} them` : ''}` }
  }
  if (holders.length === 0) return { problem: `no one configuration of ${record.id} prints every quoted line: quote the lines of one execution` }
  const checkers = new Set(holders.map((u) => `${u.engine.toLowerCase()} ${u.version}`))
  if (checkers.size > 1) return { problem: `configurations of ${checkers.size} checkers print the quoted lines (${holders.map(label).join(', ')}): name the one the fixture quotes in config, so the stamp names the checker that printed them` }
  return { holders }
}

/** The holders whose inputs count: the configurations, or the record when the record alone prints the lines (its own list often gathers every configuration's). */
const readers = (holders) => (holders.some((h) => !h.isRecord) ? holders.filter((h) => !h.isRecord) : holders)
const inputsOfHolders = (holders) => readers(holders).flatMap((h) => h.inputs)
const inputHashes = (inputs) => new Set(inputs.map((i) => (typeof i === 'object' && i ? i.sha256 : undefined)).filter(Boolean))

/** Every rlimit a command line passes: Z3's `rlimit=N`, the Bench's API runner's `--rlimit N`. */
function argvRlimits(argv) {
  const out = []
  argv.forEach((a, k) => {
    const m = /^rlimit=(\d+)$/.exec(String(a))
    if (m) out.push(Number(m[1]))
    if (a === '--rlimit' && /^\d+$/.test(String(argv[k + 1] ?? ''))) out.push(Number(argv[k + 1]))
  })
  return out
}

/**
 * The rlimit the configurations that print the lines ran under: their budget's, or the one their command line passes
 * (which must agree with it). {value} (undefined when none is recorded) or {problem}.
 */
export function rlimitOfHolders(holders) {
  const each = holders.map((h) => {
    const passed = [...new Set(argvRlimits(h.argv))]
    const budget = typeof h.budget?.rlimit === 'number' ? h.budget.rlimit : undefined
    if (passed.length > 1 || (passed.length === 1 && budget !== undefined && passed[0] !== budget)) return { problem: `the ${h.id} configuration's command line passes rlimit ${passed.join(' and ')} but its budget records ${budget ?? 'none'}` }
    return { value: passed[0] ?? budget }
  })
  const bad = each.find((e) => e.problem)
  if (bad) return bad
  const values = [...new Set(each.map((e) => e.value))]
  if (values.length > 1) return { problem: `the configurations that print the quoted lines ran under different rlimits (${values.map((v) => v ?? 'none').join(', ')}): name one in config` }
  return { value: values[0] }
}

/** The text a context number must stand in, as a whole token: the quoted lines and the holders' verdict lines, command line, budget, values and exit code. */
export function numberSources(holders, quoted) {
  const leaves = (v, out) => {
    if (v === null || v === undefined) return out
    if (typeof v === 'object') for (const x of Object.values(v)) leaves(x, out)
    else out.push(String(v))
    return out
  }
  return [...quoted.map(String), ...holders.flatMap((h) => [...h.lines, h.argv.join(' '), ...leaves(h.budget, []), ...leaves(h.values, []), ...(h.exitCode === null || h.exitCode === undefined ? [] : [String(h.exitCode)])])]
}
/** A number stands in a text as a whole token: 500000 does not stand in 5000000, nor 1 in 1.1. */
export const standsIn = (sources, n) => {
  const re = new RegExp(`(?<![0-9.])${String(n).replace(/[.]/g, '\\.')}(?![0-9.])`)
  return sources.some((s) => re.test(s))
}

/** The query a solver line answers, where the line names one: `[cl11_violation] unsat`, `cl11_violation: unsat`, `recipient-wrap sat`, `2806ms py: rlimit-case unknown`. */
export function queryNameOf(line) {
  const t = String(line).trim()
  const label = /^\[((?:[^[\]\n]|\[[^[\]\n]*\])*)\]/.exec(t)
  if (label) return label[1].trim()
  const timed = /^\d+(?:\.\d+)?m?s\s+\w+:\s+([\w.-]+)\s+(?:unsat|sat|unknown)\b/.exec(t)
  if (timed) return timed[1]
  const named = /^([A-Za-z_][\w.-]*):\s+(?:unsat|sat|unknown)\b/.exec(t) ?? /^([A-Za-z][\w.]*[-_][\w.-]*)\s+(?:unsat|sat|unknown)\b/.exec(t)
  return named ? named[1] : undefined
}

const isCount = (v) => Number.isInteger(v) && v >= 0
const onlyKeys = (v, keys) => v !== null && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).every((k) => keys.includes(k))
/**
 * The context keys each parser reads beside a fixture's lines, each with the values it takes: what the lines cannot
 * say (the query's direction, whether a model replayed, which configuration printed a record), never a verdict, a
 * count or qualifier text of its own. Anything else would be part of a raw output typed by hand.
 */
export const FIXTURE_CONTEXT = {
  solver: {
    direction: (v) => v === 'violation' || v === 'premise',
    rlimit: isCount,
    replay: (v) => v === 'replayed' || v === 'failed' || v === 'pending',
    witness: (v) => onlyKeys(v, ['length', 'unit', 'states']) && isCount(v.length) && ['actions', 'steps', 'rows', 'lines', 'calls'].includes(v.unit) && (v.states === undefined || isCount(v.states)),
    guardsEnforcement: (v) => typeof v === 'boolean',
    crossCheck: (v) => onlyKeys(v, ['run', 'lines', 'sameInput', 'config']) && typeof v.run === 'string' && Array.isArray(v.lines) && v.lines.length > 0 && v.lines.every((l) => typeof l === 'string') && typeof v.sameInput === 'boolean' && (v.config === undefined || (typeof v.config === 'string' && v.config !== '')),
  },
  tlc: {
    constantsFrom: (v) => typeof v === 'string' && v !== '',
    deadlockFreedom: (v) => typeof v === 'boolean',
    bound: (v) => typeof v === 'string' && /^depth \d+$/.test(v),
  },
  lean: {
    exitCode: (v) => Number.isInteger(v),
    paranoid: (v) => typeof v === 'boolean',
  },
  trace: {
    traces: (v) => Array.isArray(v) && v.every((x) => typeof x === 'string' && x !== ''),
    property: (v) => v === 'safety' || v === 'liveness',
  },
}

// ------------------------------------------------------------------ the gate
export async function runGate(root) {
  const findings = []
  const notes = []
  const fail = (check, where, detail) => findings.push({ check, where, detail })
  const read = (rel) => {
    try {
      return fs.readFileSync(path.join(root, rel), 'utf8')
    } catch {
      return null
    }
  }
  // A check that throws records a finding under its own name and the gate goes on, so one broken check never hides
  // the findings the others made (exit 2 is kept for a gate that cannot start at all).
  const guard = (check, where, fn) => {
    try {
      fn()
    } catch (e) {
      fail(check, where, `the check could not finish: ${e instanceof Error ? e.message : e}`)
    }
  }
  const guarded = (check, where, fn) => {
    try {
      return fn()
    } catch (e) {
      fail(check, where, `the check could not finish: ${e instanceof Error ? e.message : e}`)
      return []
    }
  }

  const stampsSrc = path.join(root, PATHS.stamps)
  if (!fs.existsSync(stampsSrc)) return { error: `${PATHS.stamps} is missing` }
  const S = await import(pathToFileURL(stampsSrc).href)

  // ---------------------------------------------------------------- rows
  const spine = read(PATHS.spine)
  if (spine === null) return { error: `${PATHS.spine} is missing` }
  const t88 = tableAfter(spine, '### 8.8 Verdict → stamp')
  if (!t88 || t88.length === 0) fail('rows', PATHS.spine, 'section 8.8 has no table the gate can read')
  else {
    const spineCells = t88.map((r) => r[0])
    const ours = S.SPINE_ROWS.map((r) => r.spine)
    spineCells.forEach((cell, i) => {
      if (ours[i] !== cell) fail('rows', `${PATHS.spine} §8.8 row ${i + 1}`, `packages/stamps/src/rows.ts has ${ours[i] === undefined ? 'no row' : `"${ours[i]}"`} where the spine has "${cell}"`)
    })
    for (let i = spineCells.length; i < ours.length; i += 1) fail('rows', 'packages/stamps/src/rows.ts', `a spine row the spine does not have: "${ours[i]}"`)
  }
  const t87 = tableAfter(spine, '### 8.7 Stamps')
  if (!t87 || t87.length !== 9) fail('rows', PATHS.spine, `section 8.7's table has ${t87 ? t87.length : 'no'} rows; the vocabulary needs 9`)
  else
    t87.forEach((row, i) => {
      const spec = S.STAMPS[i]
      const [word, code, requires] = row
      if (!spec || spec.word !== word || spec.code !== code.replace(/`/g, '')) fail('rows', `${PATHS.spine} §8.7 row ${i + 1}`, `the vocabulary has ${spec ? `${spec.word} ${spec.code}` : 'nothing'} where the spine has ${word} ${code}`)
      // the vocabulary's qualifier is the spine's cell, without the examples the cell may go on to give
      else if (requires !== spec.requires && !requires.startsWith(`${spec.requires}, for example `)) fail('rows', `${PATHS.spine} §8.7 row ${i + 1}`, `${spec.code} requires "${spec.requires}" in the vocabulary, "${requires}" in the spine`)
    })

  // ---------------------------------------------------------------- derive and grammar
  const derived = [] // {fixture, derivation}
  const fixturesText = read(PATHS.fixtures)
  let fixtures = []
  if (fixturesText === null) fail('derive', PATHS.fixtures, 'the fixture table is missing')
  else {
    try {
      fixtures = JSON.parse(fixturesText).fixtures ?? []
    } catch (e) {
      fail('derive', PATHS.fixtures, `does not parse: ${e instanceof Error ? e.message : e}`)
    }
  }
  const runCache = new Map()
  const runOf = (id) => {
    if (!runCache.has(id)) {
      const text = read(`runs/${id}.json`)
      let record = null
      try {
        record = text === null ? null : JSON.parse(text)
      } catch {
        record = null
      }
      runCache.set(id, { text, record })
    }
    return runCache.get(id)
  }
  const fileLines = new Map()
  /** The lines of a file a run records as an output, read once. */
  const linesOfFile = (p) => {
    if (!fileLines.has(p)) {
      const text = p ? read(p) : null
      fileLines.set(p, text !== null && text.length < 8_000_000 ? text.split('\n').map(trimEnd) : [])
    }
    return fileLines.get(p)
  }
  /** Every line a run's record holds: its verdict lines, its configurations', and its output files on disk. */
  const linesOfRun = (record) => {
    const lines = new Set()
    for (const u of configurationsOf(record)) {
      for (const l of u.lines) lines.add(l)
      for (const p of u.outputs) for (const l of linesOfFile(p)) lines.add(l)
    }
    return lines
  }
  const numbersIn = (v) => [...JSON.stringify(v ?? null).matchAll(/\d+(?:\.\d+)?/g)].map((m) => m[0])

  /**
   * The raw output of a fixture drawn from an executed run, or undefined (with each reason reported) when it cannot
   * be read. It names one of the package's parsers; every quoted line is a whole line of the run's record or output
   * files, and one configuration of the run prints them all (holdersOf): the stamp names that configuration's checker
   * (its own engine and version, never the record's alone), so lines that configurations of several checkers print
   * need `config`, and the configuration must be a run of the parser's engine. A configuration it quotes from is
   * quoted with its error lines. Its context holds only the keys its parser reads (FIXTURE_CONTEXT); the solver's
   * rlimit is the one that configuration ran under (its budget, or its command line), whatever the context says, and a
   * context rlimit must be that one; every other number in the context stands as a whole token in the quoted lines or
   * that configuration's verdict lines, command line, budget, values or exit code (a Lean exitCode is its recorded
   * exit code where it has one). A solver's witness length is context (the gate cannot read a length out of a model):
   * its number must stand in the run like any other, and its note says why the witness is that long. The lines are
   * parsed by packages/stamps' own parsers. A raw output typed by hand never stands in for a recorded one. The fixture
   * table and GEN-which-stamp's fixtures both come through here, so the course's stamps and the items' keys share one
   * path.
   */
  function deriveFixture(f, where, report) {
    const family = PARSER_FAMILY[f.parser]
    if (family === undefined) {
      report(where, f.parser === 'raw' ? 'parser "raw" is not accepted: a raw output typed by hand is not a recorded output; read the run\'s lines with the solver, tlc, lean or trace parser' : `unknown parser ${JSON.stringify(f.parser)}: use solver, tlc, lean or trace`)
      return undefined
    }
    if (f.context !== undefined && (f.context === null || typeof f.context !== 'object' || Array.isArray(f.context))) {
      report(where, 'context must be an object of the keys its parser reads')
      return undefined
    }
    if (f.config !== undefined && (typeof f.config !== 'string' || f.config === '')) {
      report(where, "config names one configuration of the run by its id (the run's own id for the record itself)")
      return undefined
    }
    const allowed = FIXTURE_CONTEXT[f.parser]
    let badContext = false
    for (const [k, v] of Object.entries(f.context ?? {})) {
      if (!Object.hasOwn(allowed, k)) {
        badContext = true
        report(where, `the ${f.parser} parser reads no context key ${k} (it reads ${Object.keys(allowed).join(', ')}): a value typed into the context is not one the run recorded`)
      } else if (!allowed[k](v)) {
        badContext = true
        report(where, `the context's ${k} is not a value the ${f.parser} parser takes: ${JSON.stringify(v)}`)
      }
    }
    if (badContext) return undefined
    const run = runOf(f.run)
    if (!run.record) {
      report(where, `cites ${f.run}, which is not on disk as runs/${f.run}.json`)
      return undefined
    }
    if (!Array.isArray(f.lines) || f.lines.length === 0) {
      report(where, 'an executed fixture quotes no line')
      return undefined
    }
    const lines = linesOfRun(run.record)
    const missing = f.lines.filter((l) => !lines.has(trimEnd(l)))
    for (const l of missing) report(where, `"${l}" is not a whole line of ${f.run}'s record or output files`)
    if (missing.length > 0) return undefined
    for (const gap of errorLineGaps(run.record, f.lines, S.isErrorLine)) report(where, gap)
    const { witness, traces, crossCheck, constantsFrom, ...rest } = { ...(f.context ?? {}) }
    if (f.parser === 'trace') return traceFixture(f, run, where, report, traces, rest)

    // the configuration that printed the lines: its checker, budget, inputs and numbers are the stamp's
    const held = holdersOf(run.record, f.lines, linesOfFile, f.config)
    if (held.problem) {
      report(where, held.problem)
      return undefined
    }
    const holders = held.holders
    const engine = holders[0].engine
    const at = holders.length === 1 && !holders[0].isRecord ? `the ${holders[0].id} configuration of ${f.run}` : f.run
    if (S.engineFamily(engine) !== family) {
      report(where, `${at} is a ${engine} run, which the ${f.parser} parser does not read`)
      return undefined
    }
    const checker = S.checkerOf(engine, holders[0].version)
    const ran = rlimitOfHolders(holders)
    if (ran.problem) {
      report(where, ran.problem)
      return undefined
    }
    const { rlimit, exitCode, ...others } = rest
    if (rlimit !== undefined && rlimit !== ran.value) {
      report(where, ran.value === undefined ? `the context's rlimit ${rlimit} is not the configuration's: ${at} ran under no recorded rlimit` : `the context's rlimit ${rlimit} is not ${ran.value}, the rlimit ${at} ran under`)
      return undefined
    }
    const sources = numberSources(holders, f.lines)
    const exits = [...new Set(holders.map((h) => h.exitCode).filter((c) => c !== null && c !== undefined))]
    if (exitCode !== undefined && exits.length > 0 && !exits.includes(exitCode)) report(where, `the context's exitCode ${exitCode} is not the exit code ${at} recorded (${exits.join(', ')})`)
    for (const n of numbersIn({ ...others, ...(exits.length === 0 ? { exitCode } : {}), witness })) if (!standsIn(sources, n)) report(where, `the context's number ${n} stands in neither the quoted lines nor ${at}'s verdict lines, command line, budget, values or exit code`)
    if (witness && !f.note) report(where, 'a witness length in the context needs a note saying where it comes from')
    let constants = []
    if (constantsFrom) {
      const input = inputsOfHolders(holders).find((i) => i.path === constantsFrom)
      const text = read(constantsFrom)
      if (!input) report(where, `${constantsFrom} is not an input of ${at}`)
      else if (text === null) report(where, `${constantsFrom} is not on disk`)
      else if (sha256(fs.readFileSync(path.join(root, constantsFrom))) !== input.sha256) report(where, `${constantsFrom} no longer has the SHA-256 ${f.run} recorded`)
      else constants = S.parseTlcConstants(text)
    }
    switch (f.parser) {
      case 'solver': {
        // a cvc5 answer is read only as a Z3 query's cross-check, never alone, as deriveReceipt reads a receipt
        if (!/^(?:z3|z3-solver)$/i.test(engine)) {
          report(where, `the quoted lines are ${checker.name} ${checker.version}'s (${at}): a cvc5 answer is read only as a Z3 query's cross-check, never alone, as deriveReceipt reads a receipt (ARCHITECTURE.md section 10.4)`)
          return undefined
        }
        let cc
        if (crossCheck) {
          cc = crossCheckOf(crossCheck, f, holders, checker, where, report)
          if (cc === undefined) return undefined
        }
        return S.rawFromSolver(S.parseSolverLines(f.lines), { solver: checker, ...others, ...(ran.value !== undefined ? { rlimit: ran.value } : {}), ...(witness ? { witness } : {}), ...(cc ? { crossCheck: cc } : {}) })
      }
      case 'tlc':
        return S.rawFromTlc(S.parseTlcReport(f.lines), { engine: checker, constants, ...others })
      case 'lean':
        return S.rawFromLean(S.parseLeanReport(f.lines), { lean: checker, ...others, ...(exitCode !== undefined ? { exitCode } : {}) })
      default:
        return undefined
    }
  }

  /**
   * A solver fixture's cross-check: lines of one configuration of the cited run (holdersOf, with crossCheck.config), a
   * second solver's (cvc5 beside Z3: "agree" never comes from one solver twice), and, when it says it read the same
   * input, a configuration that records an input with the same SHA-256 as one the query's configuration read (never
   * the record's gathered list), answering the same query where both lines name one.
   */
  function crossCheckOf(crossCheck, f, holders, checker, where, report) {
    const other = runOf(crossCheck.run)
    if (!other.record) {
      report(where, `the cross-check cites ${crossCheck.run}, which is not on disk`)
      return undefined
    }
    const ol = linesOfRun(other.record)
    const absent = crossCheck.lines.filter((l) => !ol.has(trimEnd(l)))
    for (const l of absent) report(where, `"${l}" is not a whole line of ${crossCheck.run}`)
    if (absent.length > 0) return undefined
    for (const gap of errorLineGaps(other.record, crossCheck.lines, S.isErrorLine)) report(where, `the cross-check ${gap}`)
    const held = holdersOf(other.record, crossCheck.lines, linesOfFile, crossCheck.config)
    if (held.problem) {
      report(where, `the cross-check: ${held.problem}`)
      return undefined
    }
    const theirs = held.holders
    const engine = theirs[0].engine
    if (S.engineFamily(engine) !== 'solver') {
      report(where, `the cross-check cites lines of a ${engine} run, which is not a solver's`)
      return undefined
    }
    const second = S.checkerOf(engine, theirs[0].version)
    if (second.name === checker.name) {
      report(where, `the cross-check's lines are ${second.name} ${second.version}'s, the query's own solver: a cross-check is a second solver's answer (cvc5 beside Z3; spine section 8.8)`)
      return undefined
    }
    if (crossCheck.sameInput) {
      const mine = inputHashes(inputsOfHolders(holders))
      if (![...inputHashes(inputsOfHolders(theirs))].some((h) => mine.has(h))) report(where, `the cross-check says it read the same input, but the configuration that printed the query's lines (${readers(holders).map((h) => h.id).join(', ')}) and the one that printed the cross-check's (${readers(theirs).map((h) => h.id).join(', ')}) record no input with the same SHA-256`)
      const ours = new Set(f.lines.map(queryNameOf).filter(Boolean))
      const named = new Set(crossCheck.lines.map(queryNameOf).filter(Boolean))
      if (ours.size > 0 && named.size > 0 && ![...named].some((n) => ours.has(n))) report(where, `the cross-check's lines answer another query (${[...named].join(', ')}, not ${[...ours].join(', ')})`)
    }
    return { solver: second, verdict: S.parseSolverLines(crossCheck.lines).verdict, sameInput: crossCheck.sameInput === true }
  }

  /**
   * A trace fixture: each record names the run configuration that printed it, and the stamp names those
   * configurations' TLC version (one version among them); the trace each validated (its own .ndjson input, by hash)
   * counts once, whatever the fixture calls it.
   */
  function traceFixture(f, run, where, report, traces, rest) {
    const names = traces ?? []
    if (names.length !== f.lines.length) {
      report(where, 'a trace fixture names, in context.traces, the run configuration that printed each record it quotes')
      return undefined
    }
    if (rest.property === undefined) {
      report(where, 'a trace fixture says whether its claim is safety-shaped or a liveness claim (context.property), as a receipt must')
      return undefined
    }
    const configs = configurationsOf(run.record)
    const inputs = []
    const checkers = new Map()
    for (const [k, name] of names.entries()) {
      const c = configs.find((x) => x.id === name)
      if (!c) {
        report(where, `${name} is not a configuration of ${f.run}`)
        return undefined
      }
      if (!c.lines.includes(trimEnd(f.lines[k]))) {
        report(where, `the record quoted as ${name} is not a line the ${name} configuration printed`)
        return undefined
      }
      if (S.engineFamily(c.engine) !== 'tlc') {
        report(where, `the ${name} configuration is a ${c.engine} run, which the trace parser does not read`)
        return undefined
      }
      checkers.set(`${c.engine.toLowerCase()} ${c.version}`, S.checkerOf(c.engine, c.version))
      const file = c.ownInputs.find((i) => typeof i === 'object' && i && /\.ndjson$/.test(String(i.path ?? '')))
      inputs.push({ trace: name, record: S.parseTraceRecord(f.lines[k]), ...(file?.sha256 ? { sha256: file.sha256 } : {}) })
    }
    if (checkers.size > 1) {
      report(where, `the quoted records were printed by ${checkers.size} TLC versions (${[...checkers.keys()].join(', ')}), and a stamp names one`)
      return undefined
    }
    return S.rawFromTraces(inputs, { engine: [...checkers.values()][0], property: rest.property })
  }

  const rowKeys = new Set(S.ALL_ROWS.map((r) => r.key))
  const covered = new Map()
  for (const f of fixtures) {
    const where = `${PATHS.fixtures} ${f.id}`
    if (!rowKeys.has(f.row)) {
      fail('derive', where, `names no row of packages/stamps/src/rows.ts: ${f.row}`)
      continue
    }
    let raw
    try {
      if (f.executed) {
        raw = deriveFixture(f, where, (w, detail) => fail('derive', w, detail))
        if (raw === undefined) continue
      } else {
        if (!f.note) fail('derive', where, 'a fixture that no run exercises needs a note naming the run to record')
        raw = f.raw
      }
      // every fixture derives in the reported lane; a self-grade moves itself to self-assessed
      const d = S.deriveStamp(raw, { lane: 'reported', source: f.run ?? `fixture ${f.id}` })
      derived.push({ fixture: f, derivation: d })
      covered.set(f.row, (covered.get(f.row) ?? []).concat(f.executed ? 'executed' : 'synthetic'))
      const e = f.expect ?? {}
      const row = d.kind === 'modulo' ? d.assumed[0]?.row : d.kind === 'stamp' ? d.stamp.row : d.row
      if (row !== f.row) fail('derive', where, `derived by row ${row}, not ${f.row}`)
      if (e.stamp !== undefined) {
        const got = d.kind === 'stamp' ? S.stampText(d.stamp) : `${d.kind}${d.kind === 'none' ? ` (${d.reason})` : ''}`
        if (got !== e.stamp) fail('derive', where, `derives "${got}", expected "${e.stamp}"`)
        if (d.kind === 'stamp') {
          if (e.defeaters && JSON.stringify(d.stamp.defeaters.map((x) => x.text)) !== JSON.stringify(e.defeaters)) fail('derive', where, `defeaters ${JSON.stringify(d.stamp.defeaters.map((x) => x.text))}, expected ${JSON.stringify(e.defeaters)}`)
          if ((e.enforcement ?? null) !== (d.enforcement ?? null)) fail('derive', where, `enforcement ${d.enforcement ?? 'none'}, expected ${e.enforcement ?? 'none'}`)
          if (e.witnesses && JSON.stringify(d.witnesses ?? []) !== JSON.stringify(e.witnesses)) fail('derive', where, `witnesses ${JSON.stringify(d.witnesses ?? [])}, expected ${JSON.stringify(e.witnesses)}`)
          if (e.lane && d.stamp.lane !== e.lane) fail('derive', where, `lane ${d.stamp.lane}, expected ${e.lane}`)
        }
      } else if (e.none !== undefined) {
        if (d.kind !== 'none' || d.reason !== e.none) fail('derive', where, `derives ${d.kind === 'none' ? `no stamp (${d.reason})` : d.kind === 'stamp' ? `"${S.stampText(d.stamp)}"` : d.text}, expected no stamp (${e.none})`)
        else {
          if (e.defeater && d.defeater?.against !== e.defeater) fail('derive', where, `defeater against ${d.defeater?.against ?? 'nothing'}, expected ${e.defeater}`)
          if (e.quote && d.quote?.quote !== e.quote) fail('derive', where, `quote "${d.quote?.quote}", expected "${e.quote}"`)
        }
      } else if (e.modulo !== undefined) {
        if (d.kind !== 'modulo' || d.text !== e.modulo) fail('derive', where, `derives ${d.kind === 'modulo' ? `"${d.text}"` : d.kind}, expected "${e.modulo}"`)
        else if (e.assumed && JSON.stringify(d.assumed.map((s) => S.stampText(s))) !== JSON.stringify(e.assumed)) fail('derive', where, `assumed ${JSON.stringify(d.assumed.map((s) => S.stampText(s)))}, expected ${JSON.stringify(e.assumed)}`)
      } else fail('derive', where, 'states no expectation')
    } catch (err) {
      fail('derive', where, `${err instanceof Error ? err.name : 'Error'}: ${err instanceof Error ? err.message : err}`)
    }
  }
  for (const row of S.ALL_ROWS) if (!covered.has(row.key)) fail('derive', PATHS.fixtures, `no fixture for row ${row.key} (${row.spine ?? row.rule})`)
  const awaiting = S.SPINE_ROWS.filter((r) => covered.has(r.key) && !covered.get(r.key).includes('executed')).map((r) => r.key)
  if (awaiting.length > 0) notes.push(`spine rows that no parser derives from an executed run yet (synthetic fixtures stand in): ${awaiting.join(', ')}`)

  // grammar of every derived stamp, by the gate's own reading of spine sections 8.7 and 10.2, never the package's
  // grammarProblems: a deriver that loosens its own grammar check is still held to the spine
  const stamps = derived.flatMap(({ fixture, derivation: d }) => (d.kind === 'stamp' ? [{ fixture, stamp: d.stamp }] : d.kind === 'modulo' ? d.assumed.map((s) => ({ fixture, stamp: s })) : []))
  const wordOf = Object.fromEntries((t87 ?? []).map((row) => [String(row[1] ?? '').replace(/`/g, ''), row[0]]))
  for (const { fixture, stamp } of stamps) {
    const where = `${PATHS.fixtures} ${fixture.id}`
    for (const p of stampGrammarProblems(stamp, wordOf)) fail('grammar', where, p)
    if (S.stampText(stamp) !== stampTextOf(stamp)) fail('grammar', where, `the package prints "${S.stampText(stamp)}" where the stamp's word, code and qualifier read "${stampTextOf(stamp)}"`)
  }
  const codesSeen = new Set(stamps.map((s) => s.stamp.code))
  for (const code of Object.keys(wordOf)) if (!codesSeen.has(code)) fail('grammar', PATHS.fixtures, `no fixture derives ${code}`)

  // ---------------------------------------------------------------- requirement
  const pStamp = stamps.find((s) => s.stamp.code === '[P]')?.stamp
  const aStamp = stamps.find((s) => s.stamp.code === '[A]')?.stamp
  if (pStamp && aStamp) {
    if (S.buildStrip({ claim: 'CL-1.1', title: 'gate', requirement: { primary: pStamp } }).ok) fail('requirement', 'packages/stamps/src/strip.ts', 'buildStrip accepts [P] as the primary stamp of requirement fit')
    if (S.buildStrip({ claim: 'CL-1.1', title: 'gate', requirement: { primary: aStamp, supporting: [pStamp] } }).ok) fail('requirement', 'packages/stamps/src/strip.ts', 'buildStrip accepts [P] as a supporting stamp of requirement fit')
    if (S.buildStrip({ claim: 'local', title: 'gate', agent: true, proposition: { primary: pStamp } }).ok) fail('requirement', 'packages/stamps/src/strip.ts', "buildStrip stamps an agent's claim (I8)")
  }
  // a Lean result with sorry or a custom axiom reads "PROVED modulo k assumed lemmas": PROVED all the same
  const modulo = derived.find(({ derivation: d }) => d.kind === 'modulo')?.derivation
  if (!modulo) fail('requirement', PATHS.fixtures, 'no fixture derives a "modulo" reading to try in requirement fit')
  else if (S.buildStrip({ claim: 'CL-1.1', title: 'gate', requirement: { primary: modulo } }).ok) fail('requirement', 'packages/stamps/src/strip.ts', `buildStrip accepts "${modulo.text}" as the primary of requirement fit, which is never PROVED`)
  const COPY_ROOTS = ['content', 'labs']
  const copyFiles = COPY_ROOTS.flatMap((r) => walk(root, r, (p) => /\.(md|mdx|ya?ml|txt|json)$/.test(p) && !/(^|\/)fixtures\//.test(p) && !p.startsWith('content/pg-catalog/')))
  const codes = await loadCodesGate().catch(() => null)
  if (!codes) fail('requirement', 'scripts/verify-codes.mjs', "GATE-codes' YAML reader could not be loaded, so YAML requirement keys go unread")
  for (const rel of copyFiles)
    guard('requirement', rel, () => {
      for (const p of requirementCopyProblems(rel, read(rel) ?? '', codes)) fail('requirement', p.where, p.detail)
    })

  // ---------------------------------------------------------------- render
  const renderProblems = await renderCheck(root, S, stamps.map((s) => s.stamp), derived)
  for (const p of renderProblems.problems) fail(p.check, p.where, p.detail)

  // ---------------------------------------------------------------- which-stamp
  guard('which-stamp', PATHS.whichStamp, () => {
    const r = whichStampCheck(root, S, deriveFixture)
    for (const p of r.problems) fail('which-stamp', p.where, p.detail)
    notes.push(...r.notes)
  })

  // ---------------------------------------------------------------- hand
  guard('hand', 'apps/*/src, packages/*/src', () => {
    for (const p of handCheck(root)) fail('hand', p.where, p.detail)
  })

  // ---------------------------------------------------------------- tokens, hue, line, grayscale
  const tokensCss = read(PATHS.tokens)
  const stampCss = read(PATHS.stampCss)
  if (tokensCss === null || stampCss === null) {
    fail('tokens', tokensCss === null ? PATHS.tokens : PATHS.stampCss, 'is missing')
    return { findings, notes }
  }
  const themes = themesOf(tokensCss)
  if (!themes.light) fail('tokens', PATHS.tokens, 'no :root block of tokens')
  if (!themes.nightMedia) fail('tokens', PATHS.tokens, 'no @media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) } block')
  if (!themes.nightAttr) fail('tokens', PATHS.tokens, 'no :root[data-theme="night"] block')
  if (themes.nightMedia && themes.nightAttr && JSON.stringify(Object.entries(themes.nightMedia).sort()) !== JSON.stringify(Object.entries(themes.nightAttr).sort())) {
    const keys = new Set([...Object.keys(themes.nightMedia), ...Object.keys(themes.nightAttr)])
    const differ = [...keys].filter((k) => themes.nightMedia[k] !== themes.nightAttr[k])
    fail('tokens', PATHS.tokens, `the two night blocks differ: ${differ.join(', ')}`)
  }
  const light = themes.light ?? {}
  const night = { ...light, ...(themes.nightAttr ?? {}) }
  const theme = { light, night }

  // every var() the stamp and strip styles use is defined
  for (const rel of [PATHS.stampCss, PATHS.stripCss]) {
    const text = read(rel) ?? ''
    for (const m of text.matchAll(/var\(\s*(--[A-Za-z0-9_-]+)/g)) if (light[m[1]] === undefined) fail('tokens', rel, `uses ${m[1]}, which tokens.css does not define`)
  }

  // the stamp hues: saturated values of the --st-* tokens, and the violation line, in both themes
  const hueTokens = new Set()
  const hueValues = new Set()
  const vermilionValues = new Set()
  for (const t of [light, night]) {
    for (const [k, v] of Object.entries(t)) {
      if (!/^--st-|^--line-violation$/.test(k)) continue
      const rgb = parseHex(resolve(v, t))
      if (rgb && saturation(rgb) > 0.1) {
        hueTokens.add(k)
        hueValues.add(resolve(v, t).toLowerCase())
      }
      if (/^--st-r-fill$|^--line-violation$/.test(k)) vermilionValues.add(resolve(v, t).toLowerCase())
    }
  }
  // A stamp hue: any stamp token (the neutral ones belong to stamps too), the violation line, or a colour literal in
  // any CSS syntax within ΔE76 3 of a hue's value; vermilion likewise. A literal is normalized first, so rgb(29 63 143)
  // and oklch(39.36% 0.1387 263.8) are [P]'s blue as surely as #1D3F8F is.
  const near = (values) => (colour) => [...values].some((v) => deltaE(parseHex(colour), parseHex(v)) <= SAME_HUE_DELTA_E)
  const isHueColour = near(hueValues)
  const isVermilionColour = near(vermilionValues)
  const usesHue = (value) => /var\(\s*--st-/.test(value) || [...hueTokens].some((k) => value.includes(`var(${k})`) || value.includes(`var(${k},`)) || coloursIn(value).some(isHueColour)
  const usesVermilion = (value) => /var\(\s*(--st-r-|--line-violation)/.test(value) || coloursIn(value).some(isVermilionColour)

  // every stylesheet the apps can load: CSS files under apps/*/src and apps/*/public; <style> blocks in the apps' own
  // pages (each app's root HTML files: index.html, the instrument origin's instrument.html and host.html), in their
  // HTML and SVG files, and in learner content, whose raw HTML renders on the site; and CSS a script holds as text,
  // which it can hand to a constructed stylesheet, insertRule or a style element (a TSX <style> element's text is such
  // a string or template)
  const appDirs = (fs.existsSync(path.join(root, 'apps')) ? fs.readdirSync(path.join(root, 'apps')).sort() : []).filter((a) => fs.statSync(path.join(root, 'apps', a)).isDirectory())
  const rootPages = (a) => fs.readdirSync(path.join(root, 'apps', a)).filter((n) => n.endsWith('.html')).sort().map((n) => `apps/${a}/${n}`)
  const appFiles = (keep) => appDirs.flatMap((a) => [...walk(root, `apps/${a}/src`, keep), ...walk(root, `apps/${a}/public`, keep), ...rootPages(a).filter(keep)])
  const contentPages = walk(root, 'content', (p) => /\.(?:md|mdx|html|svg)$/.test(p) && !p.startsWith('content/pg-catalog/') && !/(^|\/)fixtures\//.test(p))
  const sheets = [
    ...appFiles((p) => p.endsWith('.css')).map((rel) => ({ rel, css: read(rel) ?? '', lineOffset: 0 })),
    ...appFiles((p) => /\.(?:html|svg)$/.test(p)).flatMap((rel) => styleBlocks(read(rel) ?? '').map((b) => ({ rel, ...b }))),
    ...contentPages.flatMap((rel) => styleBlocks(read(rel) ?? '').map((b) => ({ rel, ...b }))),
    ...appFiles((p) => /\.[cm]?[jt]sx?$/.test(p) && !/\.d\.ts$/.test(p) && !HUE_EXEMPT.some((re) => re.test(p))).flatMap((rel) => guarded('grayscale', rel, () => scriptStyleSheets(rel, read(rel) ?? '').map((b) => ({ rel, ...b })))),
  ]
  const elements = renderProblems.elements ?? FALLBACK_ELEMENTS
  // the tokens the frames and their words are drawn with, which only tokens.css's :root blocks define
  const frameTokens = frameTokensOf(stampCss, [light, night], elements)
  for (const { rel, css, lineOffset } of sheets) {
    guard('hue', rel, () => {
      const rules = parseCss(css).map((r) => ({ ...r, line: r.line + lineOffset, decls: r.decls.map((d) => ({ ...d, line: d.line + lineOffset })) }))
      for (const rule of rules) {
        const isTokenBlock = rel === PATHS.tokens && rule.selectors.length > 0 && rule.selectors.every((s) => ROOT_BLOCK.test(s))
        for (const d of rule.decls) {
          const where = `${rel}:${d.line}`
          const definesToken = isTokenBlock && /^--(st-|line-violation$)/.test(d.prop)
          if (!definesToken && usesHue(d.value) && (rule.keyframe || /^@/.test(rule.selectors[0] ?? '') || !allSelectors(rule, inStampScope))) fail('hue', where, `${d.prop}: ${d.value} uses a stamp hue outside .stamp, .strip, .line-violation and .line-crack (${rule.selectors.join(', ')})`)
          if (!definesToken && usesVermilion(d.value) && !allSelectors(rule, inVermilionScope)) fail('hue', where, `${d.prop}: ${d.value} uses vermilion outside .stamp-r, .line-violation and .line-crack (${rule.selectors.join(', ')})`)
          const isLineProp = /^(border(-(top|right|bottom|left|block|inline|block-start|block-end|inline-start|inline-end))?(-style)?|outline(-style)?|text-decoration(-style)?|column-rule(-style)?)$/.test(d.prop)
          if (isLineProp && /\b(dashed|dotted)\b/.test(d.value) && !allSelectors(rule, inLineScope)) fail('line', where, `${d.prop}: ${d.value}: nothing else is dashed or dotted (${rule.selectors.join(', ')})`)
          if (d.prop === 'stroke-dasharray' && !/^(none|0)$/.test(d.value) && !allSelectors(rule, inLineScope)) fail('line', where, `stroke-dasharray outside .line-assumed, .line-bounded, .stamp-a and .stamp-m (${rule.selectors.join(', ')})`)
          if (/gradient\(/.test(d.value) && !allSelectors(rule, inPatternScope)) fail('line', where, `a gradient outside .stamp-q's hatch and .line-crack: the one pattern means no verdict (${rule.selectors.join(', ')})`)
        }
      }
      // the frames are read from stamp.css and tokens.css alone, so nothing else may draw on a stamp, hide its words or
      // redefine the tokens it is drawn with (the grayscale check's premise)
      for (const p of frameShapeProblems(rel, rules, elements)) fail('grayscale', p.where, p.detail)
      for (const p of frameTokenProblems(rel, rules, frameTokens)) fail('grayscale', p.where, p.detail)
    })
  }
  // a hue in an app's script, markup, image or data (any string a .ts or .tsx file holds; any colour in its HTML, SVG
  // and JSON), or in learner content, whose raw HTML and styles render on the site
  guard('hue', 'apps/*/src, apps/*/public, content', () => {
    for (const p of scriptHueCheck(root, appFiles((p) => /\.[cm]?[jt]sx?$/.test(p) && !/\.d\.ts$/.test(p) && !HUE_EXEMPT.some((re) => re.test(p))), usesHue, frameTokens)) fail(p.check, p.where, p.detail)
    const marked = [...appFiles((p) => /\.(?:html|svg|json)$/.test(p) && !HUE_EXEMPT.some((re) => re.test(p))), ...walk(root, 'content', (p) => /\.(?:md|mdx|ya?ml|json|html|svg)$/.test(p) && !p.startsWith('content/pg-catalog/') && !/(^|\/)fixtures\//.test(p))]
    for (const rel of marked) {
      const text = read(rel) ?? ''
      text.split('\n').forEach((line, i) => {
        const hit = coloursIn(line).find(isHueColour)
        if (hit || /var\(\s*--st-/.test(line)) fail('hue', `${rel}:${i + 1}`, `${hit ?? 'a stamp token'} is a stamp hue, which stays inside the stamp and strip components`)
        // a frame token defined in markup (a style attribute, raw HTML in a lesson) redefines it for every stamp below
        for (const m of line.matchAll(/(?:^|[\s;"'{])(--[\w-]+)\s*:/g)) if (frameTokens.has(m[1])) fail('grayscale', `${rel}:${i + 1}`, `defines ${m[1]}, a token a stamp's frame or words are drawn with: only tokens.css's :root blocks define it, because a definition anywhere else redefines it for every stamp below it`)
      })
      // a line drawn by hand in markup: a dash array attribute, or a dashed, dotted or gradient line in a style
      // attribute (raw HTML in a lesson renders on the site; code in Markdown does not)
      for (const p of markupLineProblems(rel, /\.mdx?$/.test(rel) ? maskMarkdownCode(text) : text)) fail('line', p.where, p.detail)
      // a line drawn by data: a JSON key named after a line property (a chart's "strokeDasharray": "4 2")
      if (rel.endsWith('.json')) for (const p of jsonLineProblems(rel, text)) fail('line', p.where, p.detail)
    }
  })

  // grayscale, forced colors and contrast, per theme
  const report = { themes: {} }
  for (const [name, tokens] of Object.entries(theme)) guard('grayscale', `${PATHS.stampCss} (${name})`, () => {
    const sheet = parseHex(resolve(tokens['--sheet'] ?? '', tokens))
    if (!sheet) {
      fail('tokens', PATHS.tokens, `${name}: --sheet is not a hex colour`)
      return
    }
    const frames = framesOf(stampCss, tokens)
    const sigs = Object.fromEntries(Object.entries(frames).map(([c, f]) => [c, signatureOf(f, sheet)]))
    const groups = new Map()
    for (const [c, s] of Object.entries(sigs)) groups.set(s, [...(groups.get(s) ?? []), c])
    for (const [s, cs] of groups) if (cs.length > 1) fail('grayscale', PATHS.stampCss, `${name}: ${cs.map((c) => `[${c === 'q' ? '?' : c.toUpperCase()}]`).join(' and ')} share one grayscale signature (${s})`)
    const forced = framesOf(stampCss, tokens, { forced: true })
    const fsigs = new Map()
    for (const [c, f] of Object.entries(forced)) {
      const s = signatureOf(f, null)
      fsigs.set(s, [...(fsigs.get(s) ?? []), c])
    }
    for (const [s, cs] of fsigs) if (cs.length > 1) fail('grayscale', PATHS.stampCss, `${name}, forced colors: ${cs.map((c) => `[${c === 'q' ? '?' : c.toUpperCase()}]`).join(' and ')} share one frame (${s})`)
    // contrast: text on its surface (the worse stripe of a hatch), the identifying stroke or fill on the sheet
    const pairs = {}
    for (const [c, f] of Object.entries(frames)) {
      const code = `[${c === 'q' ? '?' : c.toUpperCase()}]`
      const text = parseHex(f.text ?? '')
      const surfaces = f.hatch ? f.stops.map(parseHex).filter(Boolean) : [parseHex(f.fill ?? '') ?? sheet]
      pairs[code] = {}
      if (!text) fail('grayscale', PATHS.stampCss, `${name}: ${code} has no text colour the gate can read`)
      else {
        const worst = Math.min(...surfaces.map((s) => contrast(text, s)))
        pairs[code].text = Number(worst.toFixed(2))
        if (worst < 4.5) fail('grayscale', PATHS.stampCss, `${name}: ${code} text is ${worst.toFixed(2)}:1 against its surface, below 4.5:1`)
      }
      const ident = c === 'n' ? null : parseHex(f.fill && !f.hatch && contrast(parseHex(f.fill) ?? sheet, sheet) >= 1.5 ? f.fill : (f.stroke ?? ''))
      if (c !== 'n') {
        if (!ident) fail('grayscale', PATHS.stampCss, `${name}: ${code} has no identifying stroke or fill the gate can read`)
        else {
          const r = contrast(ident, sheet)
          pairs[code].identifying = Number(r.toFixed(2))
          if (r < 3) fail('grayscale', PATHS.stampCss, `${name}: ${code}'s identifying stroke or fill is ${r.toFixed(2)}:1 against the sheet, below 3:1`)
        }
      }
    }
    // the pairs colour cannot separate, and the frames that do (DESIGN.md section 2.6), for the report
    const colourOf = (f) => parseHex(f.fill && !f.hatch ? f.fill : (f.stroke ?? f.text ?? ''))
    const weak = []
    const codes = Object.keys(frames)
    for (let i = 0; i < codes.length; i += 1)
      for (let j = i + 1; j < codes.length; j += 1) {
        const [a, b] = [colourOf(frames[codes[i]]), colourOf(frames[codes[j]])]
        if (!a || !b) continue
        const lum = contrast(a, b)
        const cvd = Math.min(...Object.keys(MACHADO).map((k) => deltaE(simulate(a, k), simulate(b, k))))
        if (lum < 1.5 || cvd < 15) weak.push({ pair: `${codes[i]}/${codes[j]}`, luminanceRatio: Number(lum.toFixed(2)), minDeltaE76: Number(cvd.toFixed(1)), framesDiffer: sigs[codes[i]] !== sigs[codes[j]] })
      }
    report.themes[name] = { signatures: sigs, contrast: pairs, colourCannotSeparate: weak }
  })

  // forced-colors cues DESIGN.md section 2.6 names
  guard('grayscale', `${PATHS.stampCss} (forced colors)`, () => {
    const forcedLight = framesOf(stampCss, light, { forced: true })
    if (!forcedLight.p.sides.every((s) => s === 'solid:4')) fail('grayscale', PATHS.stampCss, 'under forced colors [P] needs a 4-px solid border (DESIGN.md section 2.6)')
    if (forcedLight.q.sides[3] !== 'solid:6') fail('grayscale', PATHS.stampCss, 'under forced colors [?] needs a 6-px left border in place of its hatch')
    if (forcedLight.r.ring === 'none') fail('grayscale', PATHS.stampCss, 'under forced colors [R] keeps its ring as an outline')
  })

  // fonts
  guard('tokens', PATHS.fonts, () => {
    for (const p of fontCheck(root, tokensCss)) fail('tokens', p.where, p.detail)
  })

  // a rule read twice (a <style> element's text is also a string its script holds) reports once
  const once = new Set()
  return { findings: findings.filter((f) => !once.has(`${f.check} ${f.where} ${f.detail}`) && once.add(`${f.check} ${f.where} ${f.detail}`)), notes, report }
}

// ------------------------------------------------------------------ render: the components in Node
export async function renderCheck(root, S, stamps, derived) {
  const problems = []
  const fail = (where, detail) => problems.push({ check: 'render', where, detail })
  let esbuild
  let React
  let server
  try {
    esbuild = (await import('esbuild')).default ?? (await import('esbuild'))
    React = (await import('react')).default
    server = await import('react-dom/server')
  } catch (e) {
    fail('node_modules', `esbuild, react and react-dom are needed to render the components: ${e instanceof Error ? e.message : e}`)
    return { problems }
  }
  // the stamp's own elements as rendered, every variant: the frame lint matches selectors against them
  const seen = new Map()
  const collect = (markup) => {
    for (const el of elementsOf(markup)) seen.set(JSON.stringify(el), el)
  }
  const entry = `export * from ${JSON.stringify(path.join(root, PATHS.stampDir, 'index.ts'))}\nexport * from ${JSON.stringify(path.join(root, PATHS.stripDir, 'index.ts'))}\n`
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gate-stamps-'))
  try {
    const out = path.join(dir, 'components.mjs')
    await esbuild.build({
      stdin: { contents: entry, resolveDir: root, loader: 'ts', sourcefile: 'gate-entry.ts' },
      bundle: true,
      format: 'esm',
      platform: 'node',
      jsx: 'automatic',
      loader: { '.css': 'empty' },
      external: ['react', 'react-dom', 'react/jsx-runtime'],
      nodePaths: [path.join(REPO, 'node_modules')],
      alias: { '@statespace/stamps': path.join(root, PATHS.stamps) },
      outfile: out,
      logLevel: 'silent',
    })
    // the bundle imports react from the repository, not from the scratch directory
    const code = fs.readFileSync(out, 'utf8').replace(/from\s+["'](react(?:\/jsx-runtime)?|react-dom)["']/g, (_, m) => `from ${JSON.stringify(pathToFileURL(path.join(REPO, 'node_modules', m === 'react/jsx-runtime' ? 'react/jsx-runtime.js' : m, m === 'react/jsx-runtime' ? '' : 'index.js')).href.replace(/\/$/, ''))}`)
    fs.writeFileSync(out, code)
    const C = await import(pathToFileURL(out).href)
    const html = (el) => server.renderToStaticMarkup(el)
    for (const s of stamps) {
      const m = html(React.createElement(C.Stamp, { stamp: s }))
      collect(m)
      for (const props of [{ landing: true }, { badge: false }, { onOpen: () => {}, expanded: false, controls: 'gate-details' }, { onOpen: () => {}, expanded: true, controls: 'gate-details' }]) collect(html(React.createElement(C.Stamp, { stamp: s, ...props })))
      const spec = S.specOf(s.code)
      const where = `${PATHS.stampDir}/Stamp.tsx ${s.code}`
      if (!m.includes(`class="stamp ${spec.className}"`)) fail(where, `the stamp does not carry its frame class ${spec.className}`)
      if (!m.includes('class="stamp-frame" aria-hidden="true"')) fail(where, 'the visible frame is not hidden from assistive technology')
      const spoken = S.spokenName(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;')
      if (!m.includes(`<span class="visually-hidden">${spoken}</span>`)) fail(where, `the accessible name is not "${S.spokenName(s)}"`)
      if (!m.includes(`<span class="stamp-word">${s.word}</span>`)) fail(where, `the word ${s.word} is not shown`)
      if (!m.includes(S.LANE_BADGES[s.lane])) fail(where, `the lane badge "${S.LANE_BADGES[s.lane]}" is not shown`)
    }
    const p = stamps.find((s) => s.code === '[P]')
    const a = stamps.find((s) => s.code === '[A]')
    if (p && a) {
      const ok = S.buildStrip({ claim: 'CL-1.1', title: 'gate strip', proposition: { primary: p, assumptions: [{ seam: 'SEAM-1', text: 'balances are unbounded integers' }] }, correspondence: { primary: a }, requirement: { primary: a } })
      if (ok.ok) {
        const m = html(React.createElement(C.Strip, { strip: ok.strip }))
        for (const label of Object.values(S.SEGMENT_LABELS)) if (!m.includes(`<dt class="strip-label">${label}</dt>`)) fail(`${PATHS.stripDir}/Strip.tsx`, `the segment "${label}" has no label`)
        if (!m.includes('role="group"') || !m.includes('aria-labelledby=')) fail(`${PATHS.stripDir}/Strip.tsx`, 'the strip is not a labelled group')
        if (!m.includes('line-assumed')) fail(`${PATHS.stripDir}/Strip.tsx`, "an assumption's tick is not drawn as an assumed line")
      }
      // strips built by hand, bypassing buildStrip, with [P] or a "modulo" reading in requirement fit: the component
      // refuses to draw either
      const cell = (primary, extra = {}) => ({ primary, supporting: [], defeaters: [], assumptions: [], ...extra })
      const forge = (requirement) => html(React.createElement(C.Strip, { strip: { claim: 'CL-1.1', title: 'forged', cells: { proposition: cell(p), correspondence: cell(a), requirement } } }))
      const requirementOf = (m) => m.slice(m.indexOf('data-segment="requirement"'))
      if (requirementOf(forge(cell(p))).includes('stamp-p')) fail(`${PATHS.stripDir}/Strip.tsx`, 'the component draws [P] in requirement fit when handed a strip that buildStrip would refuse')
      const moduloText = 'PROVED modulo 1 assumed lemma'
      const withModulo = requirementOf(forge(cell(null, { modulo: moduloText, supporting: [a] })))
      if (withModulo.includes(moduloText) || withModulo.includes('strip-modulo')) fail(`${PATHS.stripDir}/Strip.tsx`, `the component draws "${moduloText}" in requirement fit when handed a strip that buildStrip would refuse`)
    }
    const agent = derived.find(({ derivation: d }) => d.kind === 'none' && d.reason === 'agent-assertion')
    if (!agent) fail(PATHS.fixtures, 'no agent-assertion fixture to render')
    else {
      const m = html(React.createElement(C.DerivationView, { derivation: agent.derivation }))
      if (!m.includes('UNREVIEWED')) fail(`${PATHS.stampDir}/DerivationView.tsx`, "an agent's assertion is not labelled UNREVIEWED")
      if (/class="stamp[ "]/.test(m)) fail(`${PATHS.stampDir}/DerivationView.tsx`, "an agent's assertion renders a stamp frame (I8)")
    }
  } catch (e) {
    fail('components', `could not build or render: ${e instanceof Error ? e.message : e}`)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
  return { problems, ...(seen.size > 0 ? { elements: [...seen.values()] } : {}) }
}

// ------------------------------------------------------------------ hand: stamps built by hand in the apps
/**
 * Code that may build or spell stamps: the deriver, its components, tests, and GEN-which-stamp's distractor mutants,
 * which are wrong stamps on purpose (ASSESSMENT.md section 4.13) and live in one file of the generator. The rest of
 * the generator is held to the rule, and its keys to the deriver by the which-stamp check.
 */
const HAND_EXEMPT = [/^packages\/stamps\//, /^apps\/site\/src\/components\/(stamp|strip)\//, /(^|\/)(test|tests|e2e|fixtures|__tests__)\//, /\.test\.[cm]?[jt]sx?$/, /\.spec\.[cm]?[jt]sx?$/, /^packages\/generators\/src\/which-stamp\/(?:mutants|distractors)\.ts$/]
const STAMP_TEXT = /\b(PROVED|MODEL-CHECKED|TESTED|ENFORCED|CONFIGURED|ASSUMED|UNKNOWN|NOT COVERED|REFUTED)\s*\[(?:P|M|T|E|C|A|\?|N|R)\]/
/** A stamp written code first, `[P] · Z3 5.3.1 unsat`: the word is left out, but it is a stamp all the same. */
const CODE_FIRST = /\[(?:P|M|T|E|C|A|\?|N|R)\]\s*·\s*\S/
/** A stamp's spoken name (DESIGN.md section 5.9), "Proved, code P: Z3 5.3.1 unsat", which only the component writes. */
const SPOKEN_STAMP = /\b(?:Proved|Model-checked|Tested|Enforced|Configured|Assumed|Unknown|Not covered|Refuted),\s+code\s+(?:P|M|T|E|C|A|question mark|N|R):/
export const typedStamp = (text) => STAMP_TEXT.test(text) || CODE_FIRST.test(text) || SPOKEN_STAMP.test(text)
/** The classes the stamp component draws a stamp with: an element that wears one outside the component is a stamp drawn by hand. */
export const STAMP_CLASS = /^(?:stamp(?:-(?:frame|head|word|code|sep|part|button|landing|[pmtecaqnr]))?|lane-badge)$/
/** Attributes and calls that set an element's classes. */
const CLASS_ATTR = /^(?:className|class)$/
const CLASS_CALL = /^(?:add|toggle|replace)$/
/** A Stamp's fields: an object that copies a stamp and sets one of them changes the stamp. */
export const STAMP_FIELDS = ['code', 'word', 'qualifier', 'lane', 'defeaters', 'row', 'source']
const STAMP_CODE_LITERAL = /^\[(?:P|M|T|E|C|A|\?|N|R)\]$/
const STAMP_WORD_LITERAL = /^(?:PROVED|MODEL-CHECKED|TESTED|ENFORCED|CONFIGURED|ASSUMED|UNKNOWN|NOT COVERED|REFUTED)$/
/** The package's functions that print a stamp from its text fields: they take a `Pick` of Stamp, so a copy type-checks there. */
const STAMP_TEXT_FUNCTIONS = /^(?:stampText|codeText|qualifierText|spokenName)$/
const changedStampDetail = (fields) => `a stamp copied and changed (${fields.join(', ')}): a stamp is derived from a receipt or a reply and never changed, so a copy that drops a qualifier part or a defeater, or claims another lane, is a stamp built by hand (I2)`

/**
 * Which expressions the TypeScript compiler types as a Stamp. One program reads the files that hold them, with their
 * imports (`@statespace/stamps` resolved to packages/stamps/src under the root; anything it cannot resolve is typed
 * any), and a type is a Stamp when it, a member of its union or a part of its intersection carries the brand
 * packages/stamps/src/types.ts declares. `asks` is [{ rel, start, end }]; the answer is one boolean for each.
 */
export function typedAsStamp(root, asks) {
  if (asks.length === 0) return []
  const ts = loadTypescript()
  const options = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    jsx: ts.JsxEmit.Preserve,
    allowJs: true,
    allowImportingTsExtensions: true,
    noEmit: true,
    strict: true,
    skipLibCheck: true,
    types: [],
    lib: ['lib.es2022.d.ts', 'lib.dom.d.ts'],
    baseUrl: root,
    paths: { '@statespace/stamps': [PATHS.stamps] },
  }
  const program = ts.createProgram([...new Set(asks.map((a) => path.join(root, a.rel)))], options)
  const checker = program.getTypeChecker()
  const brandFile = path.join(root, path.dirname(PATHS.stamps), 'types.ts')
  const branded = (t) => t.getProperties().some((p) => /#stamp$/.test(String(p.escapedName)) && (p.declarations ?? []).some((d) => path.resolve(d.getSourceFile().fileName) === brandFile))
  const isStamp = (t) => {
    if (!t || t.flags & ts.TypeFlags.Any) return false
    if (t.isUnion()) return t.types.some(isStamp)
    if (t.isIntersection()) return t.types.some(isStamp) || branded(t)
    return branded(t)
  }
  const nodeAt = (sf, start, end) => {
    let found
    const visit = (n) => {
      if (found || n.getStart(sf) > start || n.getEnd() < end) return
      if (n.getStart(sf) === start && n.getEnd() === end) found = n
      else ts.forEachChild(n, visit)
    }
    visit(sf)
    return found
  }
  return asks.map((a) => {
    const sf = program.getSourceFile(path.join(root, a.rel))
    const node = sf ? nodeAt(sf, a.start, a.end) : undefined
    return node !== undefined && isStamp(checker.getTypeAtLocation(node))
  })
}

export function handCheck(root) {
  const problems = []
  let ts
  try {
    ts = loadTypescript()
  } catch (e) {
    return [{ where: 'node_modules', detail: `the typescript package is needed: ${e instanceof Error ? e.message : e}` }]
  }
  // copies the names and places below leave undecided: whether the compiler types a source as a Stamp, asked of
  // every file at once after the walk
  const asks = []
  const files = ['apps', 'packages'].flatMap((r) => walk(root, r, (p) => /\/src\//.test(p) && /\.[cm]?[jt]sx?$/.test(p) && !/\.d\.ts$/.test(p) && !HAND_EXEMPT.some((re) => re.test(p))))
  for (const rel of files) {
    const text = fs.readFileSync(path.join(root, rel), 'utf8')
    const sf = ts.createSourceFile(rel, text, ts.ScriptTarget.Latest, true, rel.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
    const at = (node) => `${rel}:${sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1}`
    // a file no compiler checks (.js, .jsx and their module forms), where nothing refuses a copy used as a Stamp
    const untyped = /\.[cm]?jsx?$/.test(rel)
    // The names this file gives the Stamp type: Stamp, and any alias it imports it under from packages/stamps
    // (`import type { Stamp as StampData } from '@statespace/stamps'`, as the components do).
    const typeNames = new Set(['Stamp'])
    for (const st of sf.statements) {
      if (!ts.isImportDeclaration(st) || !ts.isStringLiteral(st.moduleSpecifier) || !/^@statespace\/stamps$|(?:^|\/)stamps\/src(?:\/|$)/.test(st.moduleSpecifier.text)) continue
      const bindings = st.importClause?.namedBindings
      if (bindings && ts.isNamedImports(bindings)) for (const el of bindings.elements) if ((el.propertyName ?? el.name).text === 'Stamp') typeNames.add(el.name.text)
    }
    /** A type that is a Stamp, or holds one (`Stamp`, `readonly Stamp[]`, `S.Stamp`, `StampData | undefined`), and not a field of one (`Stamp['code']`). */
    const namesStampType = (typeText) => [...typeNames].some((n) => new RegExp(`(?<![\\w$])${n}(?![\\w$])(?!\\s*\\[\\s*['"\`])`).test(typeText))
    /** An expression that names a stamp: `stamp`, `d.stamp`, `props.stamp`, `myStamp`, `stampOf(d)` (a timestamp is not one). */
    const STAMP_NAME = /(?<!time)stamp$/i
    const namesAStamp = (e) => {
      let n = e
      while (ts.isParenthesizedExpression(n) || ts.isAsExpression(n) || ts.isNonNullExpression(n) || ts.isSatisfiesExpression?.(n)) n = n.expression
      if (ts.isIdentifier(n)) return STAMP_NAME.test(n.text)
      if (ts.isPropertyAccessExpression(n)) return STAMP_NAME.test(n.name.text)
      if (ts.isElementAccessExpression(n)) return ts.isStringLiteral(n.argumentExpression) && STAMP_NAME.test(n.argumentExpression.text)
      if (ts.isCallExpression(n)) return (ts.isIdentifier(n.expression) && /^stampOf$/.test(n.expression.text)) || (ts.isPropertyAccessExpression(n.expression) && /^stampOf$/.test(n.expression.name.text))
      return false
    }
    const propName = (name) => (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNoSubstitutionTemplateLiteral(name) ? name.text : ts.isComputedPropertyName(name) && (ts.isStringLiteral(name.expression) || ts.isNoSubstitutionTemplateLiteral(name.expression)) ? name.expression.text : undefined)
    const enclosingFunction = (n) => {
      let p = n.parent
      while (p && !ts.isFunctionLike(p)) p = p.parent
      return p
    }
    /**
     * Where a value is used as a stamp: a `stamp` attribute or property, a declaration typed Stamp, a value that
     * satisfies Stamp, what a function typed to return a Stamp returns, or the stamp handed to one of the package's
     * text functions (stampText, codeText, qualifierText, spokenName); through parentheses, conditionals, logical
     * defaults and array literals.
     */
    const inStampPosition = (node) => {
      let n = node
      while (n.parent && (ts.isParenthesizedExpression(n.parent) || (ts.isConditionalExpression(n.parent) && n.parent.condition !== n) || (ts.isBinaryExpression(n.parent) && [ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken, ts.SyntaxKind.AmpersandAmpersandToken].includes(n.parent.operatorToken.kind)) || ts.isArrayLiteralExpression(n.parent) || ts.isSpreadElement(n.parent) || ts.isNonNullExpression(n.parent))) n = n.parent
      const p = n.parent
      if (!p) return false
      if (ts.isJsxExpression(p) && p.parent && ts.isJsxAttribute(p.parent)) return /^stamps?$/.test(p.parent.name.getText(sf))
      if (ts.isPropertyAssignment(p) && p.initializer === n) return /^stamps?$/.test(propName(p.name) ?? '')
      if ((ts.isVariableDeclaration(p) || ts.isParameter(p) || ts.isPropertyDeclaration(p)) && p.initializer === n) return !!p.type && namesStampType(p.type.getText(sf))
      if (ts.isSatisfiesExpression?.(p)) return namesStampType(p.type.getText(sf))
      if (ts.isCallExpression(p) && p.arguments.includes(n)) return STAMP_TEXT_FUNCTIONS.test(ts.isIdentifier(p.expression) ? p.expression.text : ts.isPropertyAccessExpression(p.expression) ? p.expression.name.text : '')
      const fn = ts.isReturnStatement(p) ? enclosingFunction(p) : ts.isArrowFunction(p) && p.body === n ? p : undefined
      return !!fn?.type && namesStampType(fn.type.getText(sf))
    }
    /** A value made where it stands, which cannot be a stamp: a literal, an array or object literal, `new …()`, a function. */
    const fresh = (e) => {
      let n = e
      while (ts.isParenthesizedExpression(n) || ts.isAsExpression(n) || ts.isNonNullExpression(n) || ts.isSatisfiesExpression?.(n)) n = n.expression
      return ts.isObjectLiteralExpression(n) || ts.isArrayLiteralExpression(n) || ts.isNewExpression(n) || ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n) || ts.isTemplateExpression(n) || ts.isNumericLiteral(n) || ts.isFunctionExpression(n) || ts.isArrowFunction(n) || ts.isClassExpression(n) || [ts.SyntaxKind.TrueKeyword, ts.SyntaxKind.FalseKeyword, ts.SyntaxKind.NullKeyword].includes(n.kind) || (ts.isIdentifier(n) && n.text === 'undefined')
    }
    /**
     * An object built from a stamp with some of its fields changed: a spread (`{ ...stamp, lane: 'rechecked-here' }`)
     * or Object.assign. It is a changed stamp when it sets one of a stamp's fields and: the field is one only a stamp
     * has (qualifier, defeaters), a stamp code or a stamp word; or it copies something named after a stamp; or it
     * stands where a stamp is used; or the file is one no compiler checks (.js, .jsx); or else, asked once the walk is
     * done, the compiler types something it copies as a Stamp. (A context object, `{ ...ctx, lane: 'rechecked-here' }`
     * handed to deriveStamp, is none of these, and neither is an error given a code.)
     */
    const changedStamp = (node, sources, setters) => {
      const set = new Map()
      for (const obj of setters)
        for (const p of obj.properties) {
          const name = (ts.isPropertyAssignment(p) || ts.isShorthandPropertyAssignment(p)) && p.name ? propName(p.name) : undefined
          if (name !== undefined && STAMP_FIELDS.includes(name)) set.set(name, p)
        }
      if (set.size === 0) return
      const literal = (k, re) => {
        const p = set.get(k)
        return !!p && ts.isPropertyAssignment(p) && (ts.isStringLiteral(p.initializer) || ts.isNoSubstitutionTemplateLiteral(p.initializer)) && re.test(p.initializer.text)
      }
      const own = set.has('qualifier') || set.has('defeaters') || literal('code', STAMP_CODE_LITERAL) || literal('word', STAMP_WORD_LITERAL)
      const copied = sources.filter((e) => !fresh(e))
      if (own || (untyped && copied.length > 0) || sources.some(namesAStamp) || inStampPosition(node)) problems.push({ where: at(node), detail: changedStampDetail([...set.keys()]) })
      else for (const s of copied) asks.push({ rel, start: s.getStart(sf), end: s.getEnd(), where: at(node), fields: [...set.keys()] })
    }
    const seen = new Set()
    const typed = (node, t) => {
      const where = at(node)
      if (!typedStamp(t) || seen.has(where)) return
      seen.add(where)
      problems.push({ where, detail: `a stamp typed as text ("${t.trim().slice(0, 60)}"): derive it with packages/stamps and render it with the stamp component` })
    }
    // text as it reaches the screen: a template with its substitutions, a concatenation, an element with every
    // element nested in it (`<p><b>PROVED</b> <i>[P]</i> · …</p>` reads "PROVED [P] · …"), each part that is not
    // literal text standing as "…"; a line break reads as a space and any other empty element as nothing
    const textOf = (node) => {
      if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isJsxText(node)) return node.text
      if (ts.isTemplateExpression(node)) return node.head.text + node.templateSpans.map((s) => `…${s.literal.text}`).join('')
      if (ts.isParenthesizedExpression(node)) return textOf(node.expression)
      if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) return textOf(node.left) + textOf(node.right)
      if (ts.isJsxExpression(node)) return node.expression ? textOf(node.expression) : ''
      if (ts.isJsxElement(node) || ts.isJsxFragment(node)) return node.children.map(textOf).join('')
      if (ts.isJsxSelfClosingElement(node)) return node.tagName.getText(sf) === 'br' ? ' ' : ''
      return '…'
    }
    /** The class names a node's strings and templates spell, wherever they stand in it (`cx('stamp', on && 'stamp-p')`). */
    const classTokens = (node) => {
      const out = []
      const walkStrings = (n) => {
        if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) out.push(...n.text.split(/\s+/))
        else if (ts.isTemplateExpression(n)) out.push(...[n.head.text, ...n.templateSpans.map((s) => s.literal.text)].join(' ').split(/\s+/))
        ts.forEachChild(n, walkStrings)
      }
      walkStrings(node)
      return out.filter((c) => c !== '')
    }
    const handClass = (node, tokens) => {
      const hit = tokens.find((c) => STAMP_CLASS.test(c))
      if (hit) problems.push({ where: at(node), detail: `the class ${hit} belongs to the stamp component: a stamp is drawn by apps/site/src/components/stamp from a derived stamp, never by hand with its classes` })
    }
    const visit = (node) => {
      // (an element's text is read whole, with every element nested in it, below)
      if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isTemplateExpression(node)) typed(node, textOf(node))
      if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken && !(ts.isBinaryExpression(node.parent) && node.parent.operatorToken.kind === ts.SyntaxKind.PlusToken)) typed(node, textOf(node))
      if (ts.isJsxElement(node) || ts.isJsxFragment(node)) typed(node, textOf(node))
      // the stamp component's classes on an element outside it: className, class, classList.add/toggle/replace,
      // setAttribute('class', …) and an assignment to .className
      if (ts.isJsxAttribute(node) && CLASS_ATTR.test(node.name.getText(sf)) && node.initializer) handClass(node, classTokens(node.initializer))
      if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
        const callee = node.expression
        if (CLASS_CALL.test(callee.name.text) && ts.isPropertyAccessExpression(callee.expression) && callee.expression.name.text === 'classList') handClass(node, node.arguments.flatMap((a) => classTokens(a)))
        if (callee.name.text === 'setAttribute' && node.arguments[0] && ts.isStringLiteral(node.arguments[0]) && node.arguments[0].text === 'class') handClass(node, node.arguments.slice(1).flatMap((a) => classTokens(a)))
        // a script that finds a stamp's element by its class reaches into the component, to restyle the frame at run time
        if (/^(?:querySelector|querySelectorAll|closest|matches)$/.test(callee.name.text)) handClass(node, node.arguments.flatMap((a) => classTokens(a)).flatMap((sel) => [...sel.matchAll(/\.([\w-]+)/g)].map((m) => m[1])))
        if (callee.name.text === 'getElementsByClassName') handClass(node, node.arguments.flatMap((a) => classTokens(a)))
      }
      if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken && ts.isPropertyAccessExpression(node.left) && /^(?:className|value)$/.test(node.left.name.text) && (node.left.name.text === 'className' || (ts.isPropertyAccessExpression(node.left.expression) && node.left.expression.name.text === 'classList'))) handClass(node, classTokens(node.right))
      // an array joined into stamp text: ['[P]', checker].join(' · ')
      if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 'join' && ts.isArrayLiteralExpression(node.expression.expression)) {
        const sep = node.arguments[0] && (ts.isStringLiteral(node.arguments[0]) || ts.isNoSubstitutionTemplateLiteral(node.arguments[0])) ? node.arguments[0].text : ','
        typed(node, node.expression.expression.elements.map(textOf).join(sep))
      }
      if (ts.isObjectLiteralExpression(node)) {
        const names = new Map(node.properties.filter((p) => ts.isPropertyAssignment(p) && p.name && (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name))).map((p) => [p.name.text, p]))
        const code = names.get('code')
        if (code && ts.isStringLiteral(code.initializer) && /^\[(P|M|T|E|C|A|\?|N|R)\]$/.test(code.initializer.text) && (names.has('word') || names.has('qualifier'))) problems.push({ where: at(node), detail: `a stamp object built by hand (code ${code.initializer.text}): stamps are derived, never typed (I2)` })
        // a spread copy of a stamp with a field changed (the compiler refuses one used as a Stamp; a formatter that
        // takes a stamp's text fields, or code the compiler does not see, would not)
        else if (node.properties.some(ts.isSpreadAssignment)) changedStamp(node, node.properties.filter(ts.isSpreadAssignment).map((p) => p.expression), [node])
      }
      // Object.assign onto a copy of a stamp: its type is the stamp's, so only this check sees it
      if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && ts.isIdentifier(node.expression.expression) && node.expression.expression.text === 'Object' && node.expression.name.text === 'assign') {
        changedStamp(node, node.arguments.filter((a) => !ts.isObjectLiteralExpression(a)), node.arguments.filter(ts.isObjectLiteralExpression))
        if (node.arguments.some(namesAStamp) && !problems.some((p) => p.where === at(node))) problems.push({ where: at(node), detail: 'Object.assign copies a stamp: a stamp is derived, never copied and changed (I2)' })
      }
      // a stamp read back from stored text: stamps are computed at read time and never stored (I2)
      if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && ts.isIdentifier(node.expression.expression) && node.expression.expression.text === 'JSON' && node.expression.name.text === 'parse' && inStampPosition(node)) problems.push({ where: at(node), detail: 'a stamp read back from stored text (JSON.parse): stamps are derived at read time and never stored (I2)' })
      if ((ts.isAsExpression(node) || ts.isTypeAssertionExpression(node)) && namesStampType(node.type.getText(sf))) problems.push({ where: at(node), detail: 'a cast to Stamp bypasses the deriver' })
      ts.forEachChild(node, visit)
    }
    visit(sf)
  }
  // the apps' pages, drawn as they stand: each app's own HTML pages and the HTML and SVG files under its src/ and
  // public/. Their text with the tags taken out (so a stamp split across elements or lines reads whole), and each
  // tag's attributes (a title, an aria-label)
  const appsDir = path.join(root, 'apps')
  const apps = fs.existsSync(appsDir) ? fs.readdirSync(appsDir).filter((a) => fs.statSync(path.join(appsDir, a)).isDirectory()).sort() : []
  const pages = apps.flatMap((a) => [...fs.readdirSync(path.join(appsDir, a)).filter((n) => n.endsWith('.html')).sort().map((n) => `apps/${a}/${n}`), ...['src', 'public'].flatMap((d) => walk(root, `apps/${a}/${d}`, (p) => /\.(?:html|svg)$/.test(p) && !HAND_EXEMPT.some((re) => re.test(p))))])
  for (const rel of pages) {
    const page = fs.readFileSync(path.join(root, rel), 'utf8').replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, ' '))
    const lineAt = (i) => page.slice(0, i).split('\n').length
    const found = new Set()
    const report = (i, t) => {
      const where = `${rel}:${lineAt(i)}`
      if (found.has(where)) return
      found.add(where)
      problems.push({ where, detail: `a stamp typed as text in a page ("${t.replace(/\s+/g, ' ').trim().slice(0, 60)}"): derive it with packages/stamps and render it with the stamp component` })
    }
    const shown = page.replace(/<[^>]*>/g, (m) => m.replace(/[^\n]/g, ' '))
    for (const re of [STAMP_TEXT, CODE_FIRST, SPOKEN_STAMP]) for (const m of shown.matchAll(new RegExp(re.source, 'g'))) report(m.index, shown.slice(m.index, m.index + 80))
    for (const tag of page.matchAll(/<[^>]*>/g)) if (typedStamp(tag[0])) report(tag.index, tag[0])
  }
  // the copies left undecided: a copy of something the compiler types as a Stamp (`stamps.map((s) => Object.assign({},
  // s, { lane }))`, `(x: { item: Stamp }) => ({ ...x.item, row })`) is a stamp changed, whatever its names
  let answers
  try {
    answers = typedAsStamp(root, asks)
  } catch (e) {
    // fail closed: a copy the compiler could not type is reported, never passed
    answers = asks.map(() => true)
    problems.push({ where: asks[0]?.where ?? 'hand', detail: `the compiler could not type the copies this check asked about: ${e instanceof Error ? e.message : e}` })
  }
  const reported = new Set(problems.map((p) => p.where))
  asks.forEach((a, k) => {
    if (!answers[k] || reported.has(a.where)) return
    reported.add(a.where)
    problems.push({ where: a.where, detail: changedStampDetail(a.fields) })
  })
  return problems
}

let tsModule = null
/** The TypeScript compiler, from the repository's node_modules (CommonJS, so through createRequire). */
function loadTypescript() {
  tsModule ??= createRequire(path.join(REPO, 'package.json'))('typescript')
  return tsModule
}

// ------------------------------------------------------------------ hues in scripts; style blocks
/** Files whose scripts may name stamp hues: the stamp and strip components, and tests. */
export const HUE_EXEMPT = [/^apps\/site\/src\/components\/(stamp|strip)\//, /(^|\/)(test|tests|e2e|fixtures|__tests__)\//, /\.(test|spec)\.[cm]?[jt]sx?$/]
/** A stamp token named as a string, as a canvas or a computed style reads it: `getPropertyValue('--st-p-fill')`. */
const NAMES_STAMP_TOKEN = /(?<![\w-])--st-[\w-]+/

/**
 * A stamp hue in an app's script: any string or template a .ts, .tsx or .js file under apps/*\/src holds (a style
 * object, a canvas fillStyle, an SVG attribute, a CSS string), whether it spells the hue as a token, a stamp token's
 * name or a colour literal in any syntax. And a line drawn by hand in a script: a dashed or dotted line style or a
 * dash array as the value of a style property wherever it is declared (a style object in a constant, a map or a
 * spread, a JSX style attribute, a variable named after the property, an assignment to an element's style, a
 * setProperty call), a gradient in any string, a strokeDasharray attribute, and a canvas dash pattern (setLineDash).
 */
export function scriptHueCheck(root, files, usesHue, frameTokens = new Set()) {
  const problems = []
  const ts = loadTypescript()
  for (const rel of files) {
    const text = fs.readFileSync(path.join(root, rel), 'utf8')
    const sf = ts.createSourceFile(rel, text, ts.ScriptTarget.Latest, true, /x$/.test(rel) ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
    const at = (node) => `${rel}:${sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1}`
    /** The texts a value can take: its strings and templates (a substitution as *) and its numbers, through parentheses, casts, ?: and ||, ?? and &&. */
    // the values each name is given in this file (`const kind = assumed ? 'dashed' : 'solid'`), so a style property's
    // value is read through the variables it names
    const declared = new Map()
    const collectDeclared = (n) => {
      if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer) declared.set(n.name.text, [...(declared.get(n.name.text) ?? []), n.initializer])
      ts.forEachChild(n, collectDeclared)
    }
    collectDeclared(sf)
    const textsOf = (node, through = new Set()) => {
      if (!node) return []
      if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isNumericLiteral(node)) return [node.text]
      if (ts.isTemplateExpression(node)) return [node.head.text + node.templateSpans.map((s) => `${textsOf(s.expression, through).join(' ') || '*'}${s.literal.text}`).join('')]
      if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isTypeAssertionExpression(node) || ts.isSatisfiesExpression?.(node) || ts.isNonNullExpression(node)) return textsOf(node.expression, through)
      if (ts.isConditionalExpression(node)) return [...textsOf(node.whenTrue, through), ...textsOf(node.whenFalse, through)]
      if (ts.isBinaryExpression(node) && [ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken, ts.SyntaxKind.AmpersandAmpersandToken].includes(node.operatorToken.kind)) return [...textsOf(node.left, through), ...textsOf(node.right, through)]
      if (ts.isIdentifier(node) && !through.has(node.text)) return (declared.get(node.text) ?? []).flatMap((init) => textsOf(init, new Set([...through, node.text])))
      return []
    }
    const nameOf = (n) => (ts.isIdentifier(n) || ts.isPrivateIdentifier?.(n) || ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n) ? n.text : ts.isComputedPropertyName(n) && (ts.isStringLiteral(n.expression) || ts.isNoSubstitutionTemplateLiteral(n.expression)) ? n.expression.text : undefined)
    const drawnLine = (property, value, node) => {
      if (property === undefined) return
      for (const t of textsOf(value)) {
        const why = lineInValue(property, t)
        if (why && !/gradient/.test(why)) problems.push({ check: 'line', where: at(node), detail: `${why} in a script's style: lines take the line-language classes (.line-assumed, .line-bounded), so nothing else is dashed or dotted` })
      }
    }
    /** A string a script sets as a custom property's name: a style object's key, or setProperty's first argument. */
    const setsProperty = (node) => {
      let n = node
      while (n.parent && (ts.isAsExpression(n.parent) || ts.isParenthesizedExpression(n.parent) || ts.isSatisfiesExpression?.(n.parent) || ts.isTypeAssertionExpression(n.parent))) n = n.parent
      const p = n.parent
      if (p && (ts.isComputedPropertyName(p) || (ts.isPropertyAssignment(p) && p.name === n))) return true
      return !!p && ts.isCallExpression(p) && p.arguments[0] === n && ts.isPropertyAccessExpression(p.expression) && p.expression.name.text === 'setProperty'
    }
    const visit = (node) => {
      if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node) || ts.isJsxText(node)) {
        const s = node.text
        if (usesHue(s) || NAMES_STAMP_TOKEN.test(s)) problems.push({ check: 'hue', where: at(node), detail: `"${s.trim().slice(0, 60)}" uses a stamp hue outside the stamp and strip components` })
        else if (frameTokens.has(s.trim()) && setsProperty(node)) problems.push({ check: 'grayscale', where: at(node), detail: `sets ${s.trim()}, a token a stamp's frame or words are drawn with, on an element: only tokens.css's :root blocks define it, because it would redefine it for every stamp below that element` })
        if (!ts.isJsxText(node) && /gradient\(/i.test(s)) problems.push({ check: 'line', where: at(node), detail: `"${s.trim().slice(0, 60)}" holds a gradient, the pattern only the [?] hatch and the erosion crack draw` })
        // a dashed or dotted line written as a CSS value, wherever the string goes (a style module's constants, a
        // theme object): a width or a colour beside the line style marks it as one
        if (!ts.isJsxText(node) && DASHED_LINE_VALUE.test(s)) problems.push({ check: 'line', where: at(node), detail: `"${s.trim().slice(0, 60)}" is a dashed or dotted line: lines take the line-language classes (.line-assumed, .line-bounded), so nothing else is dashed or dotted` })
      }
      // a style property's value, wherever the style is declared: an object's key (a constant, a map, a spread, a JSX
      // style attribute), a variable named after the property, an assignment to an element's style, setProperty
      if (ts.isPropertyAssignment(node)) drawnLine(nameOf(node.name), node.initializer, node)
      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) drawnLine(node.name.text, node.initializer, node)
      if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
        const l = node.left
        drawnLine(ts.isPropertyAccessExpression(l) ? l.name.text : ts.isElementAccessExpression(l) && (ts.isStringLiteral(l.argumentExpression) || ts.isNoSubstitutionTemplateLiteral(l.argumentExpression)) ? l.argumentExpression.text : undefined, node.right, node)
      }
      if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
        const method = node.expression.name.text
        const [first, second] = node.arguments
        if (method === 'setProperty' && first && (ts.isStringLiteral(first) || ts.isNoSubstitutionTemplateLiteral(first))) drawnLine(first.text, second, node)
        // a canvas dash pattern: setLineDash([]) is the solid line, anything else dashes it
        if (method === 'setLineDash' && !(first && ts.isArrayLiteralExpression(first) && first.elements.length === 0)) problems.push({ check: 'line', where: at(node), detail: 'a canvas dash pattern (setLineDash) draws a dashed line outside the line-language classes' })
      }
      if (ts.isJsxAttribute(node) && node.initializer) {
        const name = node.name.getText(sf)
        if (/^(strokeDasharray|stroke-dasharray)$/.test(name)) problems.push({ check: 'line', where: at(node), detail: 'stroke-dasharray outside .line-assumed and .line-bounded: give the path the line class instead' })
        // a style written as a string, as markup writes it (a style object's properties are read where it is declared)
        if (name === 'style' && ts.isStringLiteral(node.initializer))
          for (const decl of node.initializer.text.split(';')) {
            const colon = decl.indexOf(':')
            const why = colon > 0 ? lineInValue(decl.slice(0, colon).trim(), decl.slice(colon + 1)) : undefined
            if (why) problems.push({ check: 'line', where: at(node), detail: `a style attribute: ${why}; lines take the line-language classes (.line-assumed, .line-bounded)` })
          }
      }
      ts.forEachChild(node, visit)
    }
    visit(sf)
  }
  return problems
}

/** A CSS property whose line can be dashed or dotted: a border or one of its sides, an outline, a text decoration, a column rule, or their styles. */
export const LINE_STYLE_PROP = /^(?:border(?:-(?:top|right|bottom|left|block|inline|block-start|block-end|inline-start|inline-end))?(?:-style)?|outline(?:-style)?|text-decoration(?:-style)?|column-rule(?:-style)?)$/
/** A style object's key or a style property's name as CSS writes it: borderTopStyle is border-top-style, WebkitTextDecorationStyle is text-decoration-style. */
export const cssPropertyName = (name) =>
  String(name)
    .replace(/^ms(?=[A-Z])/, '-ms')
    .replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)
    .replace(/^-(?:webkit|moz|ms)-/, '')
    .toLowerCase()
const DASHED = /\b(?:dashed|dotted)\b/i
/** A line style written as a CSS value, with the width before it or the colour after it: "1px dashed", "dotted var(--rule)". */
export const DASHED_LINE_VALUE = /(?:^|[\s:;,(])\d*\.?\d+(?:px|em|rem|pt)\s+(?:dashed|dotted)\b|\b(?:dashed|dotted)\s+(?:#[0-9a-f]{3,8}\b|var\(|currentcolor\b|rgba?\(|hsla?\(|transparent\b)/i
const NO_DASHES = /^\s*(?:none|0(?:px)?)\s*$/i

/**
 * A line drawn in a value: a line property (border, outline, text decoration, column rule) whose value is dashed or
 * dotted, a stroke-dasharray that is not none or 0, or a gradient (the hatch's pattern) in any value. Returns the
 * reason, or undefined.
 */
export function lineInValue(property, value) {
  const name = cssPropertyName(property)
  if (LINE_STYLE_PROP.test(name) && DASHED.test(value)) return `${name}: ${value.trim()} draws a dashed or dotted line`
  if (name === 'stroke-dasharray' && !NO_DASHES.test(value)) return `stroke-dasharray: ${value.trim()} draws a dashed line`
  if (/gradient\(/i.test(value)) return `${name}: a gradient, which only the [?] hatch and the erosion crack draw`
  return undefined
}

/** Fenced code and code spans in Markdown, blanked (lines kept): code is shown as text, never rendered as markup. */
export function maskMarkdownCode(text) {
  const blank = (s) => s.replace(/[^\n]/g, ' ')
  return text.replace(/^(\s{0,3})(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\s{0,3}\2[^\n]*$/gm, blank).replace(/(`+)[^`\n][\s\S]*?\1/g, blank)
}

/** Lines drawn by hand in markup: a stroke-dasharray attribute that is not none or 0, and a style attribute that draws a dashed, dotted, dash-array or gradient line. */
export function markupLineProblems(rel, text) {
  const out = []
  text.split('\n').forEach((line, i) => {
    const where = `${rel}:${i + 1}`
    for (const m of line.matchAll(/(?<![\w-])stroke-dasharray\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>/]+))/gi)) {
      const v = m[1] ?? m[2] ?? m[3] ?? ''
      if (!NO_DASHES.test(v)) out.push({ where, detail: `a stroke-dasharray="${v}" attribute draws a dashed line outside .line-assumed, .line-bounded, .stamp-a and .stamp-m: give the path the line class instead` })
    }
    for (const m of line.matchAll(/(?<![\w-])style\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)) {
      for (const decl of (m[1] ?? m[2] ?? '').split(';')) {
        const colon = decl.indexOf(':')
        const why = colon > 0 ? lineInValue(decl.slice(0, colon).trim(), decl.slice(colon + 1)) : undefined
        if (why) out.push({ where, detail: `a style attribute: ${why}; lines take the line-language classes (.line-assumed, .line-bounded), and the one pattern is the [?] hatch` })
      }
    }
  })
  return out
}

/**
 * Lines drawn by data: a JSON key named after a line property, in either case (`"strokeDasharray": "4 2"`,
 * `"border-style": "dashed"`, `"strokeDasharray": [4, 2]`), whose value draws one, at any depth (a chart's
 * `{ "series": [{ "strokeDasharray": "4 2" }] }`) and over several lines. A value that holds objects or arrays is
 * read key by key, never as one value.
 */
export function jsonLineProblems(rel, text) {
  const out = []
  const lineAt = (i) => text.slice(0, i).split('\n').length
  for (const m of text.matchAll(/"([A-Za-z-]+)"\s*:\s*(?:"((?:[^"\\\n]|\\.)*)"|\[([^[\]{}]*)\]|(-?\d[\d.]*))/g)) {
    const value = m[2] ?? (m[3] !== undefined ? m[3].replace(/[",\s]+/g, ' ').trim() : m[4])
    const why = lineInValue(m[1], value)
    if (why) out.push({ where: `${rel}:${lineAt(m.index)}`, detail: `a JSON key draws a line: ${why}; lines take the line-language classes (.line-assumed, .line-bounded), and the one pattern is the [?] hatch` })
  }
  return out
}

/** The <style> blocks of an HTML or SVG file, each with the line it starts on, so a finding names the file's line. */
export function styleBlocks(text) {
  return [...text.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => {
    const start = m.index + m[0].indexOf('>') + 1
    return { css: m[1], lineOffset: text.slice(0, start).split('\n').length - 1 }
  })
}

// ------------------------------------------------------------------ fonts
export function fontCheck(root, tokensCss) {
  const problems = []
  const dir = path.join(root, PATHS.fonts)
  let manifest
  try {
    manifest = JSON.parse(fs.readFileSync(path.join(dir, 'fonts.json'), 'utf8'))
  } catch (e) {
    return [{ where: `${PATHS.fonts}/fonts.json`, detail: `missing or unreadable: ${e instanceof Error ? e.message : e}` }]
  }
  for (const f of manifest.files ?? []) {
    const p = path.join(dir, f.file)
    if (!fs.existsSync(p)) problems.push({ where: `${PATHS.fonts}/${f.file}`, detail: 'is in fonts.json but not on disk' })
    else {
      const bytes = fs.readFileSync(p)
      if (sha256(bytes) !== f.sha256 || bytes.length !== f.bytes) problems.push({ where: `${PATHS.fonts}/${f.file}`, detail: 'no longer has the SHA-256 and size fonts.json records' })
    }
  }
  for (const [file, hash] of Object.entries(manifest.licenses ?? {})) {
    const p = path.join(dir, file)
    if (!fs.existsSync(p) || sha256(fs.readFileSync(p)) !== hash) problems.push({ where: `${PATHS.fonts}/${file}`, detail: 'the license beside the subsets is missing or changed' })
  }
  if (Object.keys(manifest.licenses ?? {}).length < 3) problems.push({ where: `${PATHS.fonts}/fonts.json`, detail: 'each of the three faces needs its license beside the subsets' })
  const onDisk = fs.existsSync(dir) ? fs.readdirSync(dir).filter((n) => n.endsWith('.woff2')).sort() : []
  const listed = (manifest.files ?? []).map((f) => f.file).sort()
  for (const n of onDisk) if (!listed.includes(n)) problems.push({ where: `${PATHS.fonts}/${n}`, detail: 'a font file fonts.json does not list' })
  // the @font-face block declares exactly the manifest's files, with their ranges
  const faces = parseCss(tokensCss).filter((r) => r.selectors[0] === '@font-face')
  const declared = new Map()
  for (const r of faces) {
    const src = r.decls.find((d) => d.prop === 'src')?.value ?? ''
    const url = /url\(\s*['"]?\/fonts\/([^'")]+)['"]?\s*\)/.exec(src)
    if (url) declared.set(url[1], r.decls.find((d) => d.prop === 'unicode-range')?.value ?? '')
  }
  for (const face of manifest.faces ?? [])
    for (const x of face.files) {
      if (!declared.has(x.file)) problems.push({ where: PATHS.tokens, detail: `the @font-face block does not declare ${x.file}` })
      else if (declared.get(x.file) !== x.unicodeRange) problems.push({ where: PATHS.tokens, detail: `${x.file}'s unicode-range differs from fonts.json` })
    }
  for (const file of declared.keys()) if (!listed.includes(file)) problems.push({ where: PATHS.tokens, detail: `declares /fonts/${file}, which fonts.json does not list` })
  return problems
}

// ------------------------------------------------------------------ requirement fit in learner copy
const REQ_LABEL = /requirement[ _-]?fit/i
/** A label that ends its line ("Requirement fit:", "**Requirement fit**"), so what it labels is on the next line. */
const REQ_LABEL_ENDS_LINE = /requirement[ _-]?fit[\s*_:—–-]*$/i
const REQ_KEY = /^requirement(?:[ _-]?fit)?$/i
/** [P], or the word PROVED, the way a requirement-fit segment would wear it. */
const P_MARK = /\[P\]|\bPROVED\b/g
/** A negation that directly governs the mark before it: "never [P]", "not a PROVED [P]", "no [P]". */
const NEGATION_BEFORE = /\b(?:never|not|no|nor|cannot|can't|isn't|aren't|without)\s+(?:(?:a|an|the|one|any)\s+)?(?:PROVED\s+)?$/i
/** …or right after it: "[P] is never", "PROVED [P] is not". */
const NEGATION_AFTER = /^\s*(?:(?:is|are|was)\s+)?(?:never|not)\b/i

/** The [P] marks in a text that no negation directly governs and no quotation marks enclose (a quoted statement is under evaluation), with their offsets. */
export function governedPMarks(text) {
  const spans = []
  for (const re of [/"[^"\n]*"/g, /“[^”\n]*”/g, /‘[^’\n]*’/g, /«[^»\n]*»/g]) for (const m of text.matchAll(re)) spans.push([m.index, m.index + m[0].length])
  return [...text.matchAll(P_MARK)]
    .filter((m) => !spans.some(([a, b]) => m.index >= a && m.index < b) && !NEGATION_BEFORE.test(text.slice(0, m.index)) && !NEGATION_AFTER.test(text.slice(m.index + m[0].length)))
    .map((m) => ({ mark: m[0], index: m.index }))
}

let codesGate = null
/** GATE-codes' YAML reader and its keys for statements under evaluation, shared so both gates read YAML alike. */
async function loadCodesGate() {
  codesGate ??= await import(pathToFileURL(path.join(REPO, 'scripts', 'verify-codes.mjs')).href)
  return codesGate
}

/**
 * Requirement fit is never [P] (spine section 5.2), in learner copy. A [P] (or PROVED) is in requirement fit when it
 * stands on a line that names requirement fit, on the line after a label that ends its line ("Requirement fit:"), in
 * a table column headed requirement fit, or in a YAML or JSON value under a requirement or requirement_fit key. It is
 * exempt only when a negation directly governs it ("never [P]", "[P] is not"), or when it is quoted, or in YAML and
 * JSON under a key that holds a statement under evaluation (an option, a distractor, a quote).
 */
export function requirementCopyProblems(rel, text, codes) {
  const out = new Map()
  const flag = (where, mark) => out.set(where, { where, detail: `puts ${mark} in requirement fit, which is never [P] (spine section 5.2); a line that states the rule says "never [P]" right beside the mark` })
  const first = (t) => governedPMarks(t)[0]
  if (/\.ya?ml$/.test(rel) && codes) {
    for (const b of codes.yamlBlocks(text)) {
      if (!b.keys.some((k) => REQ_KEY.test(k)) || codes.isEvaluatedPath(b.keys)) continue
      const g = first(codes.unquoteYaml(b.text))
      if (g) flag(`${rel}:${b.lineOf(g.index)}`, g.mark)
    }
  }
  if (/\.json$/.test(rel)) {
    let doc
    try {
      doc = JSON.parse(text)
    } catch {
      doc = undefined
    }
    const visit = (v, keys) => {
      if (typeof v === 'string') {
        const g = keys.some((k) => REQ_KEY.test(k)) && !(codes?.isEvaluatedPath(keys) ?? false) ? first(v) : undefined
        if (g) flag(`${rel} $.${keys.join('.')}`, g.mark)
      } else if (Array.isArray(v)) v.forEach((x) => visit(x, keys))
      else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) visit(x, [...keys, k])
    }
    if (doc !== undefined) visit(doc, [])
  }
  const lines = text.split('\n')
  let header = null // the requirement-fit columns of the table being read
  lines.forEach((line, i) => {
    const t = line.trim()
    // a table: the header row names its columns, and a column headed requirement fit holds requirement-fit stamps
    if (t.startsWith('|')) {
      if (/^\|[\s:|-]+\|?$/.test(t)) return
      const cells = t.slice(1, t.endsWith('|') ? -1 : undefined).split(/(?<!\\)\|/).map((c) => c.trim())
      if (header === null) header = cells.flatMap((c, k) => (REQ_LABEL.test(c) ? [k] : []))
      else
        for (const k of header) {
          const g = first(cells[k] ?? '')
          if (g) flag(`${rel}:${i + 1}`, g.mark)
        }
    } else header = null
    if (!REQ_LABEL.test(line)) return
    const g = first(line)
    if (g) flag(`${rel}:${i + 1}`, g.mark)
    // a label that ends its line labels what follows it: the next paragraph, up to the blank line after it
    if (REQ_LABEL_ENDS_LINE.test(line)) {
      let j = lines.findIndex((l, k) => k > i && l.trim() !== '')
      for (; j > i && j < lines.length && lines[j].trim() !== ''; j += 1) {
        const next = first(lines[j])
        if (next) {
          flag(`${rel}:${j + 1}`, next.mark)
          break
        }
      }
    }
  })
  return [...out.values()]
}

// ------------------------------------------------------------------ GEN-which-stamp
/**
 * Every GEN-which-stamp key comes from the one deriver applied to a recorded output (ASSESSMENT.md sections 4.13
 * and 7.1). W1-T26's fixtures (PATHS.whichStamp; the format is in packages/stamps/README.md) each name a run on
 * disk, quote its lines, name the parser that reads that run's engine and the context it reads, and state the key
 * the item gives them; each is derived through the same path as the fixture table (deriveFixture), so a raw output
 * typed by hand, or a context key that would type part of one, never stands in for a recorded output; and the key
 * must be the derived stamp's text (word first or code first), its "modulo" reading, or "none (<reason>)". The
 * generator's source must import packages/stamps.
 */
export function whichStampCheck(root, S, deriveFixture) {
  const problems = []
  const notes = []
  const hasGenerator = fs.existsSync(path.join(root, PATHS.whichStampSrc))
  if (hasGenerator) {
    const sources = walk(root, PATHS.whichStampSrc, (p) => /\.[cm]?[jt]sx?$/.test(p) && !/\.d\.ts$/.test(p) && !/(^|\/)(test|tests|__tests__)\/|\.(test|spec)\.[cm]?[jt]sx?$/.test(p))
    const usesDeriver = sources.some((rel) => /from\s+['"](?:@statespace\/stamps|(?:\.\.\/)+(?:packages\/)?stamps\/src\/[\w./-]+)['"]/.test(fs.readFileSync(path.join(root, rel), 'utf8')))
    if (!usesDeriver) problems.push({ where: PATHS.whichStampSrc, detail: 'GEN-which-stamp does not import @statespace/stamps, so its keys cannot come from the one deriver (ASSESSMENT.md section 4.13)' })
  }
  const file = path.join(root, PATHS.whichStamp)
  if (!fs.existsSync(file)) {
    if (hasGenerator) problems.push({ where: PATHS.whichStamp, detail: `${PATHS.whichStampSrc}/ exists but its fixtures do not: GATE-stamps checks every key against the deriver on them (format: packages/stamps/README.md)` })
    else notes.push('GEN-which-stamp: pending (W1-T26); its keys are checked once content/generators/GEN-which-stamp/fixtures.json exists')
    return { problems, notes }
  }
  let doc
  try {
    doc = JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch (e) {
    problems.push({ where: PATHS.whichStamp, detail: `does not parse: ${e instanceof Error ? e.message : e}` })
    return { problems, notes }
  }
  if (doc?.schema !== 'statespace/which-stamp-fixtures@1') problems.push({ where: PATHS.whichStamp, detail: 'schema must be "statespace/which-stamp-fixtures@1"' })
  const list = Array.isArray(doc?.fixtures) ? doc.fixtures : []
  if (list.length === 0) problems.push({ where: PATHS.whichStamp, detail: 'holds no fixture' })
  const ids = new Set()
  let agreed = 0
  list.forEach((f, i) => {
    const where = `${PATHS.whichStamp} ${typeof f?.id === 'string' && f.id !== '' ? f.id : `#${i + 1}`}`
    if (typeof f?.id !== 'string' || f.id === '') problems.push({ where, detail: 'needs an id' })
    else if (ids.has(f.id)) problems.push({ where, detail: 'repeats an id' })
    else ids.add(f.id)
    if (typeof f?.key !== 'string' || f.key.trim() === '') return void problems.push({ where, detail: 'states no key' })
    if (typeof f.run !== 'string' || f.run === '') return void problems.push({ where, detail: 'names no run: every key comes from a recorded output, never a typed one' })
    try {
      let reported = false
      const raw = deriveFixture(f, where, (w, detail) => {
        reported = true
        problems.push({ where: w, detail })
      })
      if (raw === undefined) return
      const d = S.deriveStamp(raw, { lane: 'reported', source: f.run })
      const keys = d.kind === 'stamp' ? [S.stampText(d.stamp), S.codeText(d.stamp)] : d.kind === 'modulo' ? [d.text] : [`none (${d.reason})`]
      if (!keys.includes(f.key.trim())) return void problems.push({ where, detail: `the key "${f.key}" is not what the deriver gives these lines: ${keys.map((k) => `"${k}"`).join(' or ')}` })
      if (f.part !== undefined && !(d.kind === 'stamp' && d.stamp.qualifier.includes(f.part))) return void problems.push({ where, detail: `"${f.part}" is not a part of the derived qualifier (${d.kind === 'stamp' ? d.stamp.qualifier.join(' · ') : 'no stamp'})` })
      if (!reported) agreed += 1
    } catch (e) {
      problems.push({ where, detail: `${e instanceof Error ? e.name : 'Error'}: ${e instanceof Error ? e.message : e}` })
    }
  })
  notes.push(`GEN-which-stamp: ${agreed} of ${list.length} keys agree with the deriver on their recorded outputs`)
  return { problems, notes }
}

// ------------------------------------------------------------------ self-check
const SELF_COPY = ['docs/spine/SPINE.md', 'packages/stamps/src', 'packages/stamps/test/fixtures', 'runs', 'apps/site/src', 'apps/site/public', 'apps/instruments/src', 'apps/instruments/public', 'content', 'labs', 'packages/generators/src/which-stamp']

/** Copy what the gate reads into dest, so a planted fault (or a test's fixture) runs against an otherwise unchanged tree. */
export function copyTree(root, dest) {
  for (const rel of SELF_COPY) {
    const from = path.join(root, rel)
    if (!fs.existsSync(from)) continue
    const st = fs.statSync(from)
    if (st.isDirectory()) {
      for (const f of walk(root, rel, (p) => !(rel === 'runs' && p.split('/').length > 2))) {
        fs.mkdirSync(path.dirname(path.join(dest, f)), { recursive: true })
        fs.copyFileSync(path.join(root, f), path.join(dest, f))
      }
    } else {
      fs.mkdirSync(path.dirname(path.join(dest, rel)), { recursive: true })
      fs.copyFileSync(from, path.join(dest, rel))
    }
  }
  // each app's own pages (index.html, the instrument origin's pages), whose <style> blocks the gate reads
  for (const a of fs.existsSync(path.join(root, 'apps')) ? fs.readdirSync(path.join(root, 'apps')) : []) {
    const dir = path.join(root, 'apps', a)
    if (!fs.statSync(dir).isDirectory()) continue
    for (const n of fs.readdirSync(dir).filter((x) => x.endsWith('.html'))) {
      fs.mkdirSync(path.join(dest, 'apps', a), { recursive: true })
      fs.copyFileSync(path.join(dir, n), path.join(dest, 'apps', a, n))
    }
  }
  // the configuration files the TLC fixtures parse their constants from
  const fixtures = JSON.parse(fs.readFileSync(path.join(root, PATHS.fixtures), 'utf8')).fixtures
  for (const f of fixtures) {
    const c = f.context?.constantsFrom
    if (c) {
      fs.mkdirSync(path.dirname(path.join(dest, c)), { recursive: true })
      fs.copyFileSync(path.join(root, c), path.join(dest, c))
    }
  }
}

/**
 * One planted fault per rule: [name, expect, plant(dir)]. `expect` is a check's name (any finding of that check counts)
 * or a list of findings that must all appear, each [check, where, detail]: where is the finding's location exactly or a
 * pattern it matches, and detail a pattern its text matches (null for either: any). A plant that exercises several
 * forms of a rule (one per line, file or fixture) lists a finding for each, so a weakening that drops any one form
 * leaves its finding missing and the self-check fails. A control, no(check, where), is a form the rule must leave
 * alone: a finding there fails the plant too.
 */
const x = (check, where = null, detail = null) => [check, where, detail]
const no = (check, where) => [`!${check}`, where, null]
const fixtureAt = (id) => `${PATHS.fixtures} ${id}`
const keyAt = (id) => `${PATHS.whichStamp} ${id}`
const TSX = 'apps/site/src/screens/planted/Planted.tsx'
const CSS = 'apps/site/src/screens/planted/planted.css'
const LESSON = 'content/stages/S1/planted.md'
const STRIP_TS = 'packages/stamps/src/strip.ts'
const DERIVE_TS = 'packages/stamps/src/derive.ts'
const STAMP_TSX = `${PATHS.stampDir}/Stamp.tsx`
const STRIP_TSX = `${PATHS.stripDir}/Strip.tsx`
const QUOTE_TSX = `${PATHS.stampDir}/UnreviewedQuote.tsx`
const at = (rel) => new RegExp(`^${rel.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}:\\d+$`)

/** Lines that each draw a finding of `check` where they stand in `rel`: one fault per line. */
function faultsPerLine(rel, check, lines, detail = null) {
  return { expect: lines.map((_, i) => x(check, `${rel}:${i + 1}`, detail)), plant: (d) => write(d, rel, `${lines.join('\n')}\n`) }
}
/** Several plants in one copy, with every expectation of each. */
function together(...parts) {
  return { expect: parts.flatMap((p) => p.expect), plant: (d) => parts.forEach((p) => p.plant(d)) }
}
const entry = (name, combo) => [name, combo.expect, combo.plant]
/** Replace text a plant needs in a file; a plant whose text is gone fails loudly instead of planting nothing. */
function sub(text, from, to, { all = true } = {}) {
  if (!text.includes(from)) throw new Error(`the plant's text is not in the file: ${from.slice(0, 80)}`)
  return all ? text.split(from).join(to) : text.replace(from, () => to)
}
const subs = (d, rel, ...pairs) => edit(d, rel, (t) => pairs.reduce((acc, [a, b]) => sub(acc, a, b), t))
/** A fixture of the table, copied with changes under a new id. */
const like = (j, id, changes) => ({ ...structuredClone(j.fixtures.find((f) => f.id === id)), ...changes })

// the line properties GATE-stamps reads in CSS and in scripts, each with a dashed or a dotted value
const LINE_PROPS = ['', '-top', '-right', '-bottom', '-left', '-block', '-inline', '-block-start', '-block-end', '-inline-start', '-inline-end']
  .flatMap((side) => [`border${side}`, `border${side}-style`])
  .concat(['outline', 'outline-style', 'text-decoration', 'text-decoration-style', 'column-rule', 'column-rule-style'])
const lineValue = (prop, i) => `${prop.endsWith('-style') ? '' : '1px '}${i % 2 === 0 ? 'dashed' : 'dotted'}`
const camel = (prop) => prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase())

// every property that draws on a frame or colours its words, with a value that is not a reset
const STAMP_CSS_DRAWS = [
  ['all', 'unset'],
  ['background-color', '#000'],
  ['box-shadow', '0 0 0 1px #000'],
  ['mask-image', 'url(m.svg)'],
  ['clip-path', 'inset(1px)'],
  ['filter', 'blur(1px)'],
  ['backdrop-filter', 'blur(1px)'],
  ['opacity', '0.5'],
  ['mix-blend-mode', 'multiply'],
  ['forced-color-adjust', 'none'],
  ['outline-style', 'solid'],
  ['border-top-style', 'solid'],
  ['color', '#000'],
  ['-webkit-text-fill-color', '#000'],
  ['-webkit-text-stroke-width', '1px'],
  ['border-top-width', '4px'],
  ['outline-offset', '2px'],
]
// the shorthands a modelled frame rule may not use, since its signature is read from the longhands
const FRAME_SHORTHANDS = ['border', 'border-top', 'border-right', 'border-bottom', 'border-left', 'border-style', 'border-width', 'border-block', 'border-inline', 'border-block-start', 'border-block-end', 'border-inline-start', 'border-inline-end', 'outline', 'background']
// the stamp component's classes, and the nine words with their codes
const STAMP_CLASSES = ['stamp', 'stamp-frame', 'stamp-head', 'stamp-word', 'stamp-code', 'stamp-sep', 'stamp-part', 'stamp-button', 'stamp-landing', 'stamp-p', 'stamp-m', 'stamp-t', 'stamp-e', 'stamp-c', 'stamp-a', 'stamp-q', 'stamp-n', 'stamp-r', 'lane-badge']
const STAMP_WORDS_CODES = [['PROVED', 'P'], ['MODEL-CHECKED', 'M'], ['TESTED', 'T'], ['ENFORCED', 'E'], ['CONFIGURED', 'C'], ['ASSUMED', 'A'], ['UNKNOWN', '?'], ['NOT COVERED', 'N'], ['REFUTED', 'R']]
// every stamp hue tokens.css defines, day then night: the saturated values of the --st-* tokens and --line-violation
// (DESIGN.md section 2.9), the [C] and [E] hues and the night [M] fill among them
const STAMP_HUES = ['#1D3F8F', '#E3E9F6', '#7A5A00', '#3B4A57', '#6A3E80', '#C2410C', '#8FB0F5', '#0B1430', '#1E2A44', '#E0B44C', '#B7C4D1', '#CDB6E6', '#FF8A50', '#2A0E00']
// stamp hues in classes outside the stamp scope that only look like it: a claim card's, a line's that is not the
// violation line or the crack, one that holds "stamp" without being a stamp's
const HUE_LOOKALIKES = ['.claim-card { color: #6A3E80; }', '.claim-card-title { border-color: #1D3F8F; }', '.line-divider { color: #1D3F8F; }', '.timestamp { color: #1D3F8F; }']

// a line in each shape a solver line names its query by, each answering another query than cl11_violation
const QUERY_SHAPES = ['other_query: sat', 'other_query: unknown', '2806ms py: other-case unsat', '2806ms py: other-case sat', '2806ms py: other-case unknown', 'other-case unsat', 'other-case sat', 'other-case unknown', '[outer [inner] case] unsat']

// a fixture for each rule of the derive check, appended to the table: [id, fixture, the finding it must draw]
const DERIVE_BUNDLE = (j) => {
  const guard = (changes) => like(j, 'z3-guard-unsat', changes)
  const synth = (row, raw, expect) => ({ row, executed: false, note: 'a planted fault', raw, expect })
  const cross = (crossCheck) => guard({ context: { direction: 'violation', crossCheck } })
  const vacuous = { row: 'smt-unsat', executed: true, run: 'RUN-z3-vacuous-unsat', parser: 'solver', note: 'a planted fault', expect: { stamp: 'PROVED [P] · Z3 5.3.1 unsat · uncertified · rlimit 5e6' } }
  const issue = { row: 'smt-unsat', executed: true, run: 'RUN-z3-11179', parser: 'solver', lines: ['[issue input 1 (truth: sat, y=2)] -> unsat'], context: { direction: 'violation' }, note: 'a planted fault', expect: { stamp: 'PROVED [P] · Z3 5.3.0 unsat · uncertified' } }
  const trace = (changes) => like(j, 'trace-validation-liveness', changes)
  return [
    ['unknown-row', synth('no-such-row', { kind: 'not-covered', what: 'x' }, { stamp: 'NOT COVERED [N] · x' }), /names no row/],
    ['synthetic-no-note', { ...synth('not-covered', { kind: 'not-covered', what: 'x' }, { stamp: 'NOT COVERED [N] · x' }), note: undefined }, /needs a note naming the run/],
    ['wrong-row', synth('assumption', { kind: 'not-covered', what: 'x' }, { stamp: 'NOT COVERED [N] · x' }), /derived by row not-covered, not assumption/],
    ['wrong-stamp', guard({ expect: { stamp: 'PROVED [P] · Z3 5.3.1 sat' } }), /derives "PROVED \[P\] · Z3 5\.3\.1 unsat · uncertified", expected/],
    ['wrong-defeaters', guard({ expect: { stamp: 'PROVED [P] · Z3 5.3.1 unsat · uncertified', defeaters: ['another doubt'] } }), /^defeaters /],
    ['wrong-enforcement', like(j, 'z3-unknown-canceled-at-rlimit', { expect: { stamp: 'UNKNOWN [?] · canceled at rlimit 5e6' } }), /enforcement fail-closed, expected none/],
    ['wrong-witnesses', like(j, 'trace-validation-safety', { expect: { stamp: 'TESTED [T] · 1 seed · TLC 1.8.0 trace validation', witnesses: [] } }), /^witnesses /],
    ['wrong-lane', synth('self-grade', { kind: 'self-grade' }, { stamp: 'ASSUMED [A] · self-assessed', lane: 'reported' }), /lane self-assessed, expected reported/],
    ['wrong-none', synth('agent-assertion', { kind: 'agent-assertion', text: 'Proved.' }, { none: 'model-assertion' }), /expected no stamp \(model-assertion\)/],
    ['wrong-defeater', synth('shadow-mismatch', { kind: 'shadow-mismatch', sides: ['a', 'b'], detail: 'd' }, { none: 'shadow-mismatch', defeater: 'claim' }), /defeater against both-sides, expected claim/],
    ['wrong-quote', synth('agent-assertion', { kind: 'agent-assertion', text: 'Proved.' }, { none: 'agent-assertion', quote: 'Other.' }), /quote "Proved\.", expected "Other\."/],
    ['wrong-modulo', like(j, 'lean-sorry', { expect: { modulo: 'PROVED modulo 2 assumed lemmas' } }), /expected "PROVED modulo 2 assumed lemmas"/],
    ['wrong-assumed', like(j, 'lean-sorry', { expect: { modulo: 'PROVED modulo 1 assumed lemma', assumed: ['ASSUMED [A] · another lemma'] } }), /^assumed /],
    ['no-expectation', synth('not-covered', { kind: 'not-covered', what: 'x' }, {}), /states no expectation/],
    ['context-array', guard({ context: [] }), /context must be an object/],
    ['config-number', guard({ config: 5 }), /config names one configuration/],
    ['unknown-key', guard({ context: { direction: 'violation', method: 'x' } }), /reads no context key method/],
    ['bad-value', guard({ context: { direction: 'sideways' } }), /is not a value the solver parser takes/],
    ['no-run', guard({ run: 'RUN-no-such-run' }), /not on disk as runs\/RUN-no-such-run\.json/],
    ['no-lines', guard({ lines: [] }), /quotes no line/],
    ['wrong-engine', guard({ parser: 'tlc', context: {} }), /is a z3 run, which the tlc parser does not read/],
    ['constants-not-input', like(j, 'tlc-atomic-complete', { context: { constantsFrom: 'research/evidence/A5r3/tla/DoubleSpend.cfg' } }), /is not an input of/],
    ['constants-missing', like(j, 'tlc-atomic-complete', { context: { constantsFrom: 'research/spikes/tla/DoubleSpendAtomic.tla' } }), /is not on disk/],
    ['cross-no-run', cross({ run: 'RUN-nope', lines: ['unsat'], sameInput: false }), /the cross-check cites RUN-nope, which is not on disk/],
    ['cross-line', cross({ run: 'RUN-cvc5-alethe', lines: ['cvc5 -> unsat'], sameInput: false }), /"cvc5 -> unsat" is not a whole line of RUN-cvc5-alethe/],
    ['cross-same-solver', cross({ run: 'RUN-z3-vacuous-unsat', lines: ['[cl11_violation] unsat'], sameInput: false }), /the query's own solver/],
    ['cross-ambiguous', cross({ run: 'RUN-z3-11179', lines: ['[issue input 1 (truth: sat, y=2)] -> unsat'], sameInput: false }), /^the cross-check: configurations of 3 checkers/],
    ['cross-not-solver', cross({ run: 'RUN-tlc-doublespend', config: '1.8.0-default', lines: ['Error: Deadlock reached.'], sameInput: false }), /not a solver's/],
    ['cross-input', cross({ run: 'RUN-cvc5-alethe', lines: ["cvc5 b'1.4.2-modified' -> unsat"], sameInput: true }), /no input with the same SHA-256/],
    ['cross-other-query', { ...vacuous, lines: ['[cl11_violation] unsat'], context: { direction: 'violation', crossCheck: { run: 'RUN-z3-vacuous-unsat', config: 'cvc5-bench', lines: ['max0_guarded_absurd: unsat'], sameInput: true } } }, /answer another query \(max0_guarded_absurd, not cl11_violation\)/],
    ['cvc5-alone', { ...vacuous, lines: ['cl11_violation: unsat'], context: { direction: 'violation' } }, /a cvc5 answer is read only as a Z3 query's cross-check/],
    ['version-ambiguous', issue, /configurations of 3 checkers print the quoted lines/],
    ['two-checkers', like(j, 'z3-unknown-theory-arithmetic', { config: undefined }), /configurations of 2 checkers print the quoted lines/],
    ['cross-same-record', { ...vacuous, lines: ['[cl11_violation] unsat'], context: { direction: 'violation', crossCheck: { run: 'RUN-z3-vacuous-unsat', config: 'cvc5-bench', lines: ['cl11_violation: unsat'], sameInput: true } } }, /the cross-check says it read the same input, but .* record no input with the same SHA-256/],
    ['named-missing', guard({ config: 'no-such-config' }), /no-such-config is not a configuration of RUN-z3-starter/],
    ['named-elsewhere', { ...issue, config: 'RUN-z3-11179' }, /is not where the quoted lines are printed/],
    ['not-one-config', { ...issue, lines: ['z3 5.3.0', '[issue input 2 (truth: sat, y=1/2)] -> unknown'] }, /no one configuration of RUN-z3-11179 prints every quoted line/],
    ['rlimit-none', guard({ context: { direction: 'violation', rlimit: 5000000 } }), /ran under no recorded rlimit/],
    ['exit-code', like(j, 'lean-error-not-a-rejection', { context: { exitCode: 2 } }), /exitCode 2 is not the exit code/],
    ['number-token', like(j, 'tlc-doublespend-deadlock', { context: { constantsFrom: 'research/evidence/A5r3/tla/DoubleSpend.cfg', deadlockFreedom: false, bound: 'depth 7' } }), /number 7 stands in neither/],
    ['witness-no-note', like(j, 'z3-overdraft-sat-replayed', { note: undefined }), /needs a note saying where it comes from/],
    ['witness-typed', like(j, 'z3-overdraft-sat-replayed', { context: { direction: 'violation', replay: 'replayed', witness: { length: 42, unit: 'steps' } } }), /number 42 stands in neither/],
    ['trace-names-count', like(j, 'trace-validation-safety', { context: { traces: ['accepted'], property: 'safety' } }), /names, in context\.traces/],
    ['trace-no-property', like(j, 'trace-validation-safety', { context: { traces: ['accepted', 'rejected', 'partial'] } }), /safety-shaped or a liveness claim/],
    ['trace-config-missing', trace({ context: { traces: ['nope'], property: 'liveness' } }), /nope is not a configuration of RUN-tlc-tracemodule/],
    ['trace-record-elsewhere', trace({ context: { traces: ['rejected'], property: 'liveness' } }), /is not a line the rejected configuration printed/],
    ['parse-error', guard({ lines: ['[1.2 starter: overdraft search] sat (0.00s) [b = 0, amount = 1, a = 0]', '[1.3 guard added] unsat (0.00s) '] }), /ParseError/],
    ['number-substring', like(j, 'tlc-doublespend-deadlock', { context: { constantsFrom: 'research/evidence/A5r3/tla/DoubleSpend.cfg', deadlockFreedom: false, bound: 'depth 02' } }), /number 02 stands in neither/],
    ['lean-on-z3', guard({ parser: 'lean', context: {} }), /is a z3 run, which the lean parser does not read/],
    ['solver-on-lean', { row: 'smt-unsat', executed: true, run: 'RUN-lean-axioms', parser: 'solver', lines: ['Lean default kernel accepts the solution'], context: { direction: 'violation' }, note: 'a planted fault', expect: { stamp: 'x' } }, /is a lean run, which the solver parser does not read/],
    ['trace-on-lean', { row: 'trace-validation', executed: true, run: 'RUN-lean-axioms', parser: 'trace', lines: ['Lean default kernel accepts the solution'], context: { traces: ['check-bad'], property: 'safety' }, note: 'a planted fault', expect: { none: 'trace-unearned' } }, /the check-bad configuration is a lean run, which the trace parser does not read/],
    // each context key's values: a value outside the kind its parser takes
    ...[
      ['solver', { direction: 'violation', rlimit: -1 }, 'rlimit'],
      ['solver', { direction: 'violation', replay: 'maybe' }, 'replay'],
      ['solver', { direction: 'violation', witness: { length: 1, unit: 'parsecs' } }, 'witness'],
      ['solver', { direction: 'violation', witness: { length: 1, unit: 'steps', extra: 1 } }, 'witness'],
      ['solver', { direction: 'violation', witness: { length: -1, unit: 'steps' } }, 'witness'],
      ['solver', { direction: 'violation', witness: { length: 1, unit: 'steps', states: 1.5 } }, 'witness'],
      ['solver', { direction: 'violation', guardsEnforcement: 'yes' }, 'guardsEnforcement'],
      ['solver', { direction: 'violation', crossCheck: { run: 'RUN-cvc5-alethe', lines: ['x'] } }, 'crossCheck'],
      ['solver', { direction: 'violation', crossCheck: { run: 'RUN-cvc5-alethe', lines: ['x'], sameInput: false, config: 5 } }, 'crossCheck'],
      ['solver', { direction: 'violation', crossCheck: { run: 'RUN-cvc5-alethe', lines: [], sameInput: false } }, 'crossCheck'],
      ['solver', { direction: 'violation', crossCheck: { run: 'RUN-cvc5-alethe', lines: ['x'], sameInput: false, extra: 1 } }, 'crossCheck'],
      ['tlc', { constantsFrom: '' }, 'constantsFrom'],
      ['tlc', { deadlockFreedom: 'no' }, 'deadlockFreedom'],
      ['tlc', { bound: 'depth x' }, 'bound'],
      ['tlc', { bound: 'depth 6 and more' }, 'bound'],
      ['lean', { exitCode: 1.5 }, 'exitCode'],
      ['lean', { paranoid: 'yes' }, 'paranoid'],
      ['trace', { traces: [1], property: 'safety' }, 'traces'],
      ['trace', { traces: ['accepted'], property: 'both' }, 'property'],
    ].map(([parser, context, key], k) => [`context-${k}-${key}`, guard({ parser, context }), new RegExp(`the context's ${key} is not a value the ${parser} parser takes`)]),
  ]
}

// a fixture for each per-key rule of the which-stamp check: [id, fixture, the finding it must draw]
const WHICH_STAMP_BUNDLE = [
  ['', { run: 'RUN-z3-starter', parser: 'solver', lines: ['[1.3 guard added] unsat (0.00s) '], context: { direction: 'violation' }, key: '[P] · Z3 5.3.1 unsat · uncertified' }, /needs an id/, `${PATHS.whichStamp} #1`],
  ['dup', { run: 'RUN-z3-starter', parser: 'solver', lines: ['[1.3 guard added] unsat (0.00s) '], context: { direction: 'violation' }, key: '[P] · Z3 5.3.1 unsat · uncertified' }, null, null],
  ['dup', { run: 'RUN-z3-starter', parser: 'solver', lines: ['[1.3 guard added] unsat (0.00s) '], context: { direction: 'violation' }, key: '[P] · Z3 5.3.1 unsat · uncertified' }, /repeats an id/, keyAt('dup')],
  ['no-key', { run: 'RUN-z3-starter', parser: 'solver', lines: ['[1.3 guard added] unsat (0.00s) '], context: { direction: 'violation' } }, /states no key/],
  ['no-run', { parser: 'solver', lines: ['unsat'], key: '[P] · Z3 5.3.1 unsat · uncertified' }, /names no run/],
  ['part-outside', { run: 'RUN-z3-starter', parser: 'solver', lines: ['[1.3 guard added] unsat (0.00s) '], context: { direction: 'violation' }, key: '[P] · Z3 5.3.1 unsat · uncertified', part: 'Z3 5.3.0 unsat' }, /is not a part of the derived qualifier/],
  ['z3-530-keyed-531', { run: 'RUN-z3-11179', config: 'cli-5.3.0', parser: 'solver', lines: ['[issue input 1 (truth: sat, y=2)] -> unsat'], context: { direction: 'violation' }, key: 'PROVED [P] · Z3 5.3.1 unsat · uncertified' }, /is not what the deriver gives these lines: "PROVED \[P\] · Z3 5\.3\.0 unsat/],
  ['z3-530-unnamed', { run: 'RUN-z3-11179', parser: 'solver', lines: ['[issue input 1 (truth: sat, y=2)] -> unsat'], context: { direction: 'violation' }, key: 'PROVED [P] · Z3 5.3.1 unsat · uncertified' }, /configurations of 3 checkers print the quoted lines/],
  ['cvc5-as-z3', { run: 'RUN-z3-vacuous-unsat', parser: 'solver', lines: ['cl11_violation: unsat'], context: { direction: 'violation' }, key: 'PROVED [P] · Z3 5.3.1 unsat · uncertified · rlimit 5e6' }, /a cvc5 answer is read only as a Z3 query's cross-check/],
  ['cross-other-query', { run: 'RUN-z3-vacuous-unsat', parser: 'solver', lines: ['[cl11_violation] unsat'], context: { direction: 'violation', crossCheck: { run: 'RUN-z3-vacuous-unsat', lines: ['max0_guarded_absurd: unsat'], sameInput: true } }, key: 'PROVED [P] · Z3 5.3.1 and cvc5 1.4.2 agree · uncertified · rlimit 5e6' }, /answer another query/],
  ['rlimit-500000', { run: 'RUN-z3-budget-pyodide', parser: 'solver', lines: ['2806ms py: rlimit-case unknown canceled 1.1 s'], context: { rlimit: 500000 }, key: 'UNKNOWN [?] · canceled at rlimit 5e5' }, /rlimit 500000 is not 5000000/],
  ['throws', { run: 'RUN-z3-starter', parser: 'solver', lines: ['[1.2 starter: overdraft search] sat (0.00s) [b = 0, amount = 1, a = 0]', '[1.3 guard added] unsat (0.00s) '], context: { direction: 'violation' }, key: '[P] · Z3 5.3.1 unsat · uncertified' }, /ParseError/],
  // a key is the whole derived stamp: never its code alone, its word and code alone, or its qualifier cut short
  ['code-only', { run: 'RUN-z3-starter', parser: 'solver', lines: ['[1.3 guard added] unsat (0.00s) '], context: { direction: 'violation' }, key: '[P]' }, /the key "\[P\]" is not what the deriver gives/],
  ['word-and-code', { run: 'RUN-z3-starter', parser: 'solver', lines: ['[1.3 guard added] unsat (0.00s) '], context: { direction: 'violation' }, key: 'PROVED [P]' }, /the key "PROVED \[P\]" is not what the deriver gives/],
  ['cut-short', { run: 'RUN-z3-starter', parser: 'solver', lines: ['[1.3 guard added] unsat (0.00s) '], context: { direction: 'violation' }, key: 'PROVED [P] · Z3 5.3.1 unsat' }, /the key "PROVED \[P\] · Z3 5\.3\.1 unsat" is not what the deriver gives/],
  ['none-bare', { run: 'RUN-z3-starter', parser: 'solver', lines: ['[1.2 starter: overdraft search] sat (0.00s) [b = 0, amount = 1, a = 0]'], context: { direction: 'violation' }, key: 'none' }, /the key "none" is not what the deriver gives these lines: "none \(replay-pending\)"/],
]

const GENERATOR = `${PATHS.whichStampSrc}/index.ts`
const whichStampFile = (fixtures, schema = 'statespace/which-stamp-fixtures@1') => (d) => write(d, PATHS.whichStamp, `${JSON.stringify({ schema, fixtures }, null, 2)}\n`)

/**
 * Copies of what the compiler types as a Stamp, each line one that only the compiler's types can tell (no stamp
 * name, no stamp position, no field only a stamp has): a callback's parameter, a property, an element, a call's
 * result, a type parameter, a union with undefined, an intersection. Beside them, typed forms the rule leaves alone:
 * an error given a code, a context handed to the deriver, a derivation's fields.
 */
function typedCopies() {
  const rel = 'apps/site/src/screens/planted/c-types.ts'
  const head = ["import type { Stamp as Item, Derivation, StampContext } from '@statespace/stamps'", 'declare function pick(ds: readonly Derivation[]): Item']
  const copies = [
    "export const a = (ds: readonly Derivation[]) => ds.flatMap((d) => (d.kind === 'stamp' ? [d.stamp] : [])).map((s) => Object.assign({}, s, { lane: 'rechecked-here' }))",
    "export const b = (x: { item: Item }) => ({ ...x.item, row: 'smt-sat' })",
    "export const c = (items: readonly Item[]) => items.map((i) => ({ ...i, source: 'receipts/other.json' }))",
    "export const e = <T extends Item>(t: T, w: Item['code']) => ({ ...t, code: w })",
    "export const u = (x: { item?: Item }) => ({ ...x.item, lane: 'reported' })",
    "export const v = (i: Item & { seen: boolean }) => ({ ...i, row: 'smt-sat' })",
    "export const w = (ds: readonly Derivation[]) => ({ ...pick(ds), lane: 'reported' })",
    "export const z = (items: readonly Item[]) => Object.assign({}, items[0], { source: 'receipts/other.json' })",
  ]
  const controls = ["export const f = (err: Error) => Object.assign(err, { code: 'E_TIMEOUT' })", "export const g = (ctx: StampContext) => ({ ...ctx, lane: 'rechecked-here' as const })", "export const h = (d: Derivation) => ({ ...d, source: 'x' })"]
  const line = (k) => `${rel}:${head.length + k + 1}`
  return {
    expect: [...copies.map((_, k) => x('hand', line(k), /copied and changed/)), ...controls.map((_, k) => no('hand', line(copies.length + k)))],
    plant: (d) => write(d, rel, `${[...head, ...copies, ...controls].join('\n')}\n`),
  }
}

export const PLANTS = [
  // ---------------------------------------------------------------- rows
  ['a spine row the table drops', [x('rows', `${PATHS.spine} §8.8 row 19`, /where the spine has/)], (d) => subs(d, 'packages/stamps/src/rows.ts', ["  { key: 'one-database', spine: '\"Results match\" on one database', stamp: '[T] · 1 instance', kinds: ['one-database'] },\n", ''])],
  ['a row the spine does not have', [x('rows', 'packages/stamps/src/rows.ts', /a spine row the spine does not have/)], (d) => subs(d, 'packages/stamps/src/rows.ts', ["kinds: ['course-claim-under-audit'] },\n]", "kinds: ['course-claim-under-audit'] },\n  { key: 'extra-row', spine: 'A row the spine does not have', stamp: '[T]', kinds: [] },\n]"])],
  ["section 8.8's table under another heading", [x('rows', PATHS.spine, /section 8\.8 has no table/)], (d) => subs(d, PATHS.spine, ['### 8.8 Verdict → stamp', '### 8.8 Verdicts and their stamps'])],
  ["section 8.7's table with a row gone", [x('rows', PATHS.spine, /8\.7's table has 8 rows/)], (d) => subs(d, PATHS.spine, ['| UNKNOWN | [?] | reason | hatched |\n', ''])],
  ["the vocabulary's word for [T] drifts from section 8.7", [x('rows', `${PATHS.spine} §8.7 row 3`, /the vocabulary has ENFORCED \[T\]/)], (d) => subs(d, 'packages/stamps/src/vocabulary.ts', ["{ code: '[T]', word: 'TESTED',", "{ code: '[T]', word: 'ENFORCED' as 'TESTED',"])],
  ["the vocabulary's qualifier for [T] drifts from section 8.7", [x('rows', `${PATHS.spine} §8.7 row 3`, /requires "a count"/)], (d) => subs(d, 'packages/stamps/src/vocabulary.ts', ["requires: 'n and generator statistics'", "requires: 'a count'"])],
  ["the vocabulary's qualifier for [T] cut short", [x('rows', `${PATHS.spine} §8.7 row 3`, /requires "n" in the vocabulary/)], (d) => subs(d, 'packages/stamps/src/vocabulary.ts', ["requires: 'n and generator statistics'", "requires: 'n'"])],

  // ---------------------------------------------------------------- derive
  ['a quoted line that is not in its run', [x('derive', fixtureAt('z3-guard-unsat'), /is not a whole line/)], (d) => subs(d, PATHS.fixtures, ['"lines": ["[1.3 guard added] unsat (0.00s) "],\n      "context": { "direction": "violation" },\n      "note"', '"lines": ["[1.3 guard added] unsat (0.01s) "],\n      "context": { "direction": "violation" },\n      "note"'])],
  ['a context rlimit that is not the one the run ran under (500000, a substring of 5000000)', [x('derive', fixtureAt('z3-unknown-canceled-at-rlimit'), /rlimit 500000 is not 5000000/)], (d) => subs(d, PATHS.fixtures, ['"rlimit": 5000000, "guardsEnforcement"', '"rlimit": 500000, "guardsEnforcement"'])],
  ['a Lean fixture that keeps the accept line and drops the error line beside it', [x('derive', fixtureAt('lean-native-not-permitted'), /leaves out its error line/)], (d) =>
    editJson(d, PATHS.fixtures, (j) => {
      const f = j.fixtures.find((y) => y.id === 'lean-native-not-permitted')
      Object.assign(f, { row: 'lean-native', lines: ["info: Ledger/Bad.lean:7:0: 'big_native' depends on axioms: [big_native._native.native_decide.ax_1_1]", 'Lean default kernel accepts the solution'], expect: { stamp: 'PROVED [P] · Lean 4.35.0 kernel + compiler · axioms listed' } })
    })],
  ['a trace counted twice under two names', [x('derive', fixtureAt('trace-validation-safety'), /same trace/)], (d) =>
    editJson(d, PATHS.fixtures, (j) => {
      const f = j.fixtures.find((y) => y.id === 'trace-validation-safety')
      const accepted = f.lines[0]
      Object.assign(f, { lines: [accepted, accepted, ...f.lines.slice(1)], context: { ...f.context, traces: ['accepted', 'accepted-dfs', 'rejected', 'partial'] }, expect: { ...f.expect, stamp: 'TESTED [T] · 2 seeds · TLC 1.8.0 trace validation' } })
    })],
  ['a row of section 8.8 with no fixture', [x('derive', PATHS.fixtures, /no fixture for row one-database/)], (d) => editJson(d, PATHS.fixtures, (j) => void (j.fixtures = j.fixtures.filter((f) => f.id !== 'one-database')))],
  ['the fixture table missing', [x('derive', PATHS.fixtures, /the fixture table is missing/)], (d) => fs.rmSync(path.join(d, PATHS.fixtures))],
  ['a fixture table that does not parse', [x('derive', PATHS.fixtures, /does not parse/)], (d) => write(d, PATHS.fixtures, '{ "fixtures": [\n')],
  ["a cross-check that quotes a configuration's answer and drops the error line beside it", [x('derive', fixtureAt('z3-guard-unsat-cvc5-other-input'), /the cross-check quotes the \w+ configuration of RUN-cvc5-alethe but leaves out its error line/)], (d) => editJson(d, 'runs/RUN-cvc5-alethe.json', (r) => r.configs.forEach((c) => c.verdict_lines.push('(error "line 3: a planted error")')))],
  [
    'fixtures that break each rule of the derive check, one rule each',
    // a configuration file the run recorded, changed since: its constants no longer read
    [...DERIVE_BUNDLE({ fixtures: [] }).map(([id, , detail]) => x('derive', fixtureAt(`planted-${id}`), detail)), x('derive', fixtureAt('tlc-atomic-complete'), /no longer has the SHA-256/)],
    (d) => {
      editJson(d, PATHS.fixtures, (j) => j.fixtures.push(...DERIVE_BUNDLE(j).map(([id, f]) => ({ ...f, id: `planted-${id}` }))))
      fs.appendFileSync(path.join(d, 'research/spikes/tla/DoubleSpendAtomic.cfg'), '\\* a planted change\n')
    },
  ],
  [
    "a line only a record's gathered output list holds, read as the record's own",
    [x('derive', fixtureAt('planted-gathered-output'), /the record RUN-z3-11179 itself is not where the quoted lines are printed/)],
    (d) => {
      editJson(d, 'runs/RUN-z3-11179.json', (r) => r.outputs.push('runs/RUN-z3-11179/planted.log'))
      write(d, 'runs/RUN-z3-11179/planted.log', 'z3 5.1.0\n[planted query] -> unsat\n')
      editJson(d, PATHS.fixtures, (j) => j.fixtures.push({ id: 'planted-gathered-output', row: 'smt-unsat', executed: true, run: 'RUN-z3-11179', config: 'RUN-z3-11179', parser: 'solver', lines: ['[planted query] -> unsat'], context: { direction: 'violation' }, note: 'a planted fault', expect: { stamp: 'PROVED [P] · Z3 5.3.1 unsat · uncertified' } }))
    },
  ],
  [
    "cross-checks that answer another query, in each shape a solver line names its query",
    QUERY_SHAPES.map((line, k) => x('derive', fixtureAt(`planted-name-${k}`), /the cross-check's lines answer another query/)),
    (d) => {
      editJson(d, 'runs/RUN-z3-vacuous-unsat.json', (r) => r.configs.find((c) => c.id === 'cvc5-bench').verdict_lines.push(...QUERY_SHAPES))
      editJson(d, PATHS.fixtures, (j) =>
        j.fixtures.push(...QUERY_SHAPES.map((line, k) => ({ id: `planted-name-${k}`, row: 'smt-unsat', executed: true, run: 'RUN-z3-vacuous-unsat', parser: 'solver', lines: ['[cl11_violation] unsat'], context: { direction: 'violation', crossCheck: { run: 'RUN-z3-vacuous-unsat', config: 'cvc5-bench', lines: [line], sameInput: true } }, note: 'a planted fault', expect: { stamp: 'x' } }))),
      )
    },
  ],
  ["a run's command line that passes another rlimit than its budget records", [x('derive', fixtureAt('z3-unknown-canceled-at-rlimit'), /command line passes rlimit 7 but its budget records 5000000/)], (d) => editJson(d, 'runs/RUN-z3-budget-pyodide.json', (r) => void (r.configs.find((c) => c.id === 'rlimit').argv = ['node', 'z3py.mjs', 'rlimit=7']))],
  ['configurations that print one line under two rlimits', [x('derive', fixtureAt('z3-unknown-canceled-at-rlimit'), /ran under different rlimits/)], (d) => editJson(d, 'runs/RUN-z3-budget-pyodide.json', (r) => void (r.configs.find((c) => c.id === 'rlimit').budget = { rlimit: 4000000 }))],
  [
    "trace records whose configurations ran another TLC version than the record names: the stamp names theirs",
    [x('derive', fixtureAt('trace-validation-safety'), /derives "TESTED \[T\] · 1 seed · TLC 1\.7\.4 trace validation"/)],
    (d) => editJson(d, 'runs/RUN-tlc-tracemodule.json', (r) => r.configs.filter((c) => ['accepted', 'rejected', 'partial'].includes(c.id)).forEach((c) => void (c.version = '1.7.4'))),
  ],
  [
    'trace records printed by configurations of another engine or another TLC version',
    [x('derive', fixtureAt('planted-trace-engine'), /the partial configuration is a z3 run/), x('derive', fixtureAt('planted-trace-versions'), /printed by 2 TLC versions/)],
    (d) => {
      editJson(d, 'runs/RUN-tlc-tracemodule.json', (r) => {
        r.configs.find((c) => c.id === 'partial').engine = 'z3'
        r.configs.find((c) => c.id === 'rejected').version = '1.7.4'
      })
      editJson(d, PATHS.fixtures, (j) => {
        const safety = j.fixtures.find((f) => f.id === 'trace-validation-safety')
        j.fixtures.push({ ...structuredClone(safety), id: 'planted-trace-engine', lines: [safety.lines[2]], context: { traces: ['partial'], property: 'safety' }, expect: { none: 'trace-unearned' } })
        j.fixtures.push({ ...structuredClone(safety), id: 'planted-trace-versions', lines: safety.lines.slice(0, 2), context: { traces: ['accepted', 'rejected'], property: 'safety' } })
      })
    },
  ],

  // ---------------------------------------------------------------- grammar
  [
    "a deriver whose own grammar check is off, printing stamps that break each rule of the gate's grammar",
    [
      x('grammar', fixtureAt('tlc-atomic-complete'), /\[M\] leads with its bound/),
      // [P]: its version printed but not first; no version; a version with no dot
      x('grammar', fixtureAt('z3-guard-unsat'), /\[P\] names its checker and a dotted version first .*not "uncertified"/),
      x('grammar', fixtureAt('lean-comparator-okay'), /\[P\] names its checker and a dotted version first .*not "Lean kernel"/),
      x('grammar', fixtureAt('lean-native-permitted'), /\[P\] names its checker and a dotted version first .*not "Lean 4 kernel \+ compiler"/),
      x('grammar', fixtureAt('z3-inductive-param'), /\[P\] names its checker and a dotted version first .*not "unsat by Z3 5\.3\.1"/),
      x('grammar', fixtureAt('trace-validation-safety'), /\[T\] leads with its count/),
      x('grammar', fixtureAt('differential'), /\[T\] leads with its count.*not "n 200"/),
      x('grammar', fixtureAt('defence-part'), /\[T\] leads with its count.*not "Wilson 0\.55–0\.95"/),
      x('grammar', fixtureAt('z3-overdraft-sat-replayed'), /\[R\] leads with its witness length/),
      x('grammar', fixtureAt('z3-unknown-theory-arithmetic'), /empty or padded/),
      x('grammar', fixtureAt('lean-statement-mismatch'), /holds the separator/),
      x('grammar', fixtureAt('pg-bigint-range-enforced'), /has no qualifier/),
      x('grammar', fixtureAt('recipient-not-covered'), /\[N\]'s word is NOT COVERED in spine section 8\.7, not NOT TESTED/),
    ],
    (d) => {
      subs(
        d,
        DERIVE_TS,
        ['  const problems = grammarProblems(code, parts)', '  const problems: string[] = []'],
        ['    word: specOf(code).word,', "    word: code === '[N]' ? 'NOT TESTED' : specOf(code).word,"],
        ["[constantsText(raw.constants), 'complete', plural(raw.distinctStates, 'distinct state', 'distinct states')], ctx, 'tlc-complete')", "['complete', constantsText(raw.constants), plural(raw.distinctStates, 'distinct state', 'distinct states')], ctx, 'tlc-complete')"],
        ["return stamp('[P]', [head, 'uncertified', raw.rlimit", "return stamp('[P]', ['uncertified', head, raw.rlimit"],
        ["[`${checker(raw.lean)} kernel`, 'axioms listed'", "[`${raw.lean.name} kernel`, 'axioms listed'"],
        ["[`${checker(raw.lean)} kernel + compiler`, 'axioms listed']", "[`${raw.lean.name} ${raw.lean.version.split('.')[0]} kernel + compiler`, 'axioms listed']"],
        ["[`${checker(raw.solver)} unsat`, 'uncertified', `for every ${raw.parameter}`", "[`unsat by ${checker(raw.solver)}`, 'uncertified', `for every ${raw.parameter}`"],
        ["[plural(raw.accepted, 'seed', 'seeds'), `${checker(raw.engine)} trace validation`]", "[`${checker(raw.engine)} trace validation`, plural(raw.accepted, 'seed', 'seeds')]"],
        ["[`n = ${fmtCount(raw.n)}`, raw.statistics", "[`n ${fmtCount(raw.n)}`, raw.statistics"],
        ["return stamp('[T]', [count, interval], ctx, 'grader')", "return stamp('[T]', [interval, count], ctx, 'grader')"],
        ["return stamp('[R]', [witnessText(raw.witness)], ctx, 'smt-sat')", "return stamp('[R]', ['witness replayed', witnessText(raw.witness)], ctx, 'smt-sat')"],
        ["[unknownReason(raw.reason, raw.rlimit)]", '[` ${unknownReason(raw.reason, raw.rlimit)}`]'],
        ["'statement mismatch' : 'statement mismatch (a constant differs)'", "'statement · mismatch' : 'statement mismatch (a constant differs)'"],
        ["return stamp('[E]', [raw.where], ctx, 'runtime-check')", "return stamp('[E]', [], ctx, 'runtime-check')"],
      )
      // the fixture table updated to match, so only the gate's own grammar can tell
      editJson(d, PATHS.fixtures, (j) => {
        const expect = { 'tlc-atomic-complete': 'MODEL-CHECKED [M] · complete · Init = 100, Amount = 80, Workers = {w1, w2} · 4 distinct states', 'z3-guard-unsat': 'PROVED [P] · uncertified · Z3 5.3.1 unsat', 'lean-comparator-okay': 'PROVED [P] · Lean kernel · axioms listed', 'lean-native-permitted': 'PROVED [P] · Lean 4 kernel + compiler · axioms listed', differential: 'TESTED [T] · n 200 · outcome classes committed and refused · PGlite 0.5.11 and PostgreSQL 18.6', 'z3-inductive-param': 'PROVED [P] · unsat by Z3 5.3.1 · uncertified · for every N', 'defence-part': 'TESTED [T] · Wilson 0.55–0.95 · 10 of 12 unseen items' }
        for (const [id, stamp] of Object.entries(expect)) j.fixtures.find((f) => f.id === id).expect.stamp = stamp
      })
    },
  ],
  ['a package that prints stamp text other than its word, code and qualifier', [x('grammar', fixtureAt('z3-guard-unsat'), /the package prints/)], (d) => subs(d, 'packages/stamps/src/format.ts', ['  return [`${s.word} ${s.code}`, ...s.qualifier].join(SEP)', "  return [`${s.word} ${s.code}`, ...s.qualifier].join(' / ')"])],
  ['a stamp code no fixture derives', [x('grammar', PATHS.fixtures, /no fixture derives \[N\]/)], (d) => editJson(d, PATHS.fixtures, (j) => void (j.fixtures = j.fixtures.filter((f) => f.id !== 'recipient-not-covered')))],

  // ---------------------------------------------------------------- requirement
  ['a strip that takes [P] as the primary stamp of requirement fit', [x('requirement', STRIP_TS, /accepts \[P\] as the primary/)], (d) => subs(d, STRIP_TS, ["if (req.primary?.code === '[P]' || req.supporting.some((s) => s.code === '[P]')) {", "if (req.supporting.some((s) => s.code === '[P]')) {"])],
  ['a strip that takes [P] as a supporting stamp of requirement fit', [x('requirement', STRIP_TS, /accepts \[P\] as a supporting/)], (d) => subs(d, STRIP_TS, ["if (req.primary?.code === '[P]' || req.supporting.some((s) => s.code === '[P]')) {", "if (req.primary?.code === '[P]') {"])],
  ["a strip that stamps an agent's claim", [x('requirement', STRIP_TS, /stamps an agent's claim/)], (d) => subs(d, STRIP_TS, ['if (input.agent) return', 'if (false) return'])],
  ['a strip that takes PROVED modulo k assumed lemmas as requirement fit', [x('requirement', STRIP_TS, /as the primary of requirement fit, which is never PROVED/)], (d) => subs(d, STRIP_TS, ['  if (req.modulo !== undefined) {', '  if (req.modulo === "never") {'])],
  ['no fixture derives a "modulo" reading to try in requirement fit', [x('requirement', PATHS.fixtures, /no fixture derives a "modulo" reading/)], (d) => editJson(d, PATHS.fixtures, (j) => void (j.fixtures = j.fixtures.filter((f) => f.row !== 'lean-sorry' && f.row !== 'lean-custom-axiom')))],
  entry(
    'a [P] in requirement fit in learner copy, in each form the check reads',
    together(
      {
        expect: [1, 2, 3, 4, 8, 12].map((n) => x('requirement', `${LESSON}:${n}`)),
        plant: (d) =>
          write(
            d,
            LESSON,
            [
              'Requirement fit: PROVED [P] · Z3 5.3.1 unsat · uncertified',
              'No doubt about it. Requirement fit: PROVED [P] · Z3 5.3.1 unsat',
              'Requirement-fit: [P] · Z3 5.3.1 unsat',
              'requirement_fit: PROVED · Z3 5.3.1 unsat',
              '',
              'Requirement fit:',
              '',
              'PROVED [P] · Z3 5.3.1 unsat · uncertified',
              '',
              '| Claim | Requirement fit |',
              '|---|---|',
              '| CL-1.1 | PROVED [P] · Z3 5.3.1 unsat · uncertified |',
              '',
            ].join('\n'),
          ),
      },
      faultsPerLine('content/stages/S1/planted.yaml', 'requirement', ['requirement: PROVED [P] · Z3 5.3.1 unsat · uncertified', 'requirement_fit: "[P] · Z3 5.3.1 unsat"']),
      { expect: [x('requirement', 'content/stages/S1/planted.json $.requirement')], plant: (d) => write(d, 'content/stages/S1/planted.json', '{ "requirement": "PROVED [P] · Z3 5.3.1 unsat" }\n') },
      faultsPerLine('content/stages/S1/planted.mdx', 'requirement', ['Requirement fit: PROVED [P] · Z3 5.3.1 unsat']),
      faultsPerLine('labs/planted.txt', 'requirement', ['Requirement fit: PROVED [P] · Z3 5.3.1 unsat']),
    ),
  ),
  entry(
    'a [P] in requirement fit that only looks exempt: after "is", in parentheses or straight single quotes, after a negation that governs something else, deep in a labelled paragraph',
    {
      expect: [1, 3, 5, 7, 9, 11, 15, 17].map((n) => x('requirement', `content/stages/S1/planted-requirement.md:${n}`)),
      plant: (d) =>
        write(
          d,
          'content/stages/S1/planted-requirement.md',
          [
            'For CL-1.1, requirement fit is PROVED [P] · Z3 5.3.1 unsat.',
            '',
            'Requirement fit (PROVED [P] · Z3 5.3.1 unsat) is the third segment.',
            '',
            "Requirement fit: 'PROVED [P] · Z3 5.3.1 unsat' in the strip.",
            '',
            'It is not a proof of the requirement. Requirement fit: PROVED [P] · Z3 5.3.1 unsat',
            '',
            'Never skip the scenarios. Requirement fit: PROVED [P] · Z3 5.3.1 unsat',
            '',
            'Without a scenario it fails. Requirement fit: PROVED [P] · Z3 5.3.1 unsat',
            '',
            'Requirement fit:',
            'The scenarios cover the transfer rule.',
            'PROVED [P] · Z3 5.3.1 unsat',
            '',
            'Requirement fit: PROVED [P] · Z3 5.3.1 unsat, so do not skip the scenarios.',
            '',
          ].join('\n'),
        ),
    },
  ),

  // ---------------------------------------------------------------- render
  ['a strip component that draws [P] in requirement fit', [x('render', STRIP_TSX, /draws \[P\] in requirement fit/)], (d) => subs(d, STRIP_TSX, ["const refused = segment === 'requirement' && provedInRequirement(cell)", 'const refused = false'])],
  ['a strip component that draws PROVED modulo k assumed lemmas in requirement fit', [x('render', STRIP_TSX, /draws "PROVED modulo 1 assumed lemma"/)], (d) => subs(d, STRIP_TSX, ["const refused = segment === 'requirement' && provedInRequirement(cell)", "const refused = segment === 'requirement' && (cell.primary?.code === '[P]' || cell.supporting.some((s) => s.code === '[P]'))"])],
  [
    'a stamp component without its frame class, hidden frame, spoken name, word or lane badge',
    [/does not carry its frame class/, /not hidden from assistive technology/, /the accessible name is not/, /the word PROVED is not shown/, /the lane badge .* is not shown/].map((re) => x('render', `${STAMP_TSX} [P]`, re)),
    (d) =>
      subs(
        d,
        STAMP_TSX,
        ['  const name = spokenName(stamp)', "  const name = stamp.qualifier.join(', ')"],
        ["className={`stamp ${spec.className}${landing ? ' stamp-landing' : ''}`}", "className={`stamp${landing ? ' stamp-landing' : ''}`}"],
        ['<span className="stamp-frame" aria-hidden="true">', '<span className="stamp-frame">'],
        ['<span className="stamp-word">{stamp.word}</span>', '<span className="stamp-word">{stamp.word.toLowerCase()}</span>'],
        ['{badge ? <LaneBadge lane={stamp.lane} /> : null}', '{null}'],
      ),
  ],
  [
    'a strip component without its segment labels, its labelled group or its assumed ticks',
    [/has no label/, /not a labelled group/, /assumed line/].map((re) => x('render', STRIP_TSX, re)),
    (d) => subs(d, STRIP_TSX, ['<dt className="strip-label">{SEGMENT_LABELS[segment]}</dt>', '<dt className="strip-label">{segment}</dt>'], ['<div className="strip" role="group" aria-labelledby={labelId}>', '<div className="strip">'], ['className="strip-tick line-assumed"', 'className="strip-tick"']),
  ],
  [
    "an agent's assertion drawn without its UNREVIEWED label, in a stamp's frame",
    [x('render', `${PATHS.stampDir}/DerivationView.tsx`, /not labelled UNREVIEWED/), x('render', `${PATHS.stampDir}/DerivationView.tsx`, /renders a stamp frame/)],
    (d) => subs(d, QUOTE_TSX, ['{quote.label} · {who}', '{who}'], ['<figure className="unreviewed">', '<figure className="stamp unreviewed">']),
  ],
  ['no agent-assertion fixture to render', [x('render', PATHS.fixtures, /no agent-assertion fixture/)], (d) => editJson(d, PATHS.fixtures, (j) => void (j.fixtures = j.fixtures.filter((f) => f.row !== 'agent-assertion')))],
  ['stamp components that do not build', [x('render', 'components', /could not build or render/)], (d) => subs(d, STAMP_TSX, ['export function Stamp(', 'export function Stamp((('])],

  // ---------------------------------------------------------------- hand
  entry(
    'a stamp built by hand in a screen, in each form the check reads',
    together(
      ...[
        ['h-text.tsx', 'export const A = () => <p>PROVED [P] · Z3 5.3.1 unsat</p>'],
        ['h-code-first.tsx', 'export const A = () => <p>[P] · Z3 5.3.1 unsat · uncertified</p>'],
        ['h-string.ts', "export const label = 'UNKNOWN [?] · canceled at rlimit 5e6'"],
        ['h-template.ts', 'export const label = (v: string) => `[P] · Z3 ${v} unsat`'],
        ['h-plus.ts', "export const label = 'PROVED [' + 'P] · Z3 5.3.1 unsat'"],
        ['h-join.ts', "export const label = (v: string) => ['[P]', `Z3 ${v} unsat`, 'uncertified'].join(' · ')"],
        ['h-nested.tsx', 'export const A = () => <p><b>PROVED</b> <i>[P]</i> · Z3 5.3.1 unsat</p>'],
        ['h-fragment.tsx', 'export const A = () => <><b>REFUTED</b> [R] · 1 step</>'],
        ['h-class.tsx', 'export const A = () => <span className="stamp stamp-p">x</span>'],
        ['h-class-attr.tsx', 'export const A = () => <span class="stamp-frame">x</span>'],
        ['h-query.ts', "export const f = (r: HTMLElement) => r.querySelector('.claim-card .stamp-frame')"],
        ['h-query-all.ts', "export const f = (r: HTMLElement) => r.querySelectorAll('.stamp')"],
        ['h-closest.ts', "export const f = (r: HTMLElement) => r.closest('.stamp-word')"],
        ['h-matches.ts', "export const f = (r: HTMLElement) => r.matches('.stamp-p')"],
        ['h-by-class.ts', "export const f = (r: HTMLElement) => r.getElementsByClassName('stamp-code')"],
        ['h-add.ts', "export const f = (r: HTMLElement) => r.classList.add('stamp-r')"],
        ['h-toggle.ts', "export const f = (r: HTMLElement) => r.classList.toggle('stamp-m')"],
        ['h-replace.ts', "export const f = (r: HTMLElement) => r.classList.replace('x', 'stamp-t')"],
        ['h-set-attribute.ts', "export const f = (r: HTMLElement) => r.setAttribute('class', 'stamp stamp-e')"],
        ['h-class-name.ts', "export const f = (r: HTMLElement) => { r.className = 'stamp-head' }"],
        ['h-class-value.ts', "export const f = (r: HTMLElement) => { r.classList.value = 'lane-badge' }"],
        ['h-object.ts', "export const s = { code: '[R]', word: 'REFUTED', qualifier: ['1 step'] }"],
        ['h-cast.ts', 'export const s = {} as unknown as import("@statespace/stamps").Stamp'],
        ['h-plain.js', "export const label = 'PROVED [P] · Z3 5.3.1 unsat'"],
        ['h-plain.jsx', 'export const A = () => <p>REFUTED [R] · 1 step</p>'],
        ['h-module.mjs', "export const label = '[?] · canceled at rlimit 5e6'"],
      ].map(([file, line]) => faultsPerLine(`apps/site/src/screens/planted/${file}`, 'hand', [line])),
    ),
  ),
  entry(
    'a stamp copied and changed, read back from stored text or cast under an alias, in each form the check reads, beside the forms it leaves alone',
    together(
      ...[
        // a spread in a stamp attribute: a compact view's qualifier cut short, a receipt's stamp relabelled re-checked
        // here, its defeaters dropped, its word changed
        ['c-qualifier.tsx', 'export const A = ({ stamp }: { stamp: StampData }) => <Stamp stamp={{ ...stamp, qualifier: stamp.qualifier.slice(0, 1) }} />'],
        ['c-lane.tsx', "export const A = ({ stamp }: { stamp: StampData }) => <Stamp stamp={{ ...stamp, lane: 'rechecked-here' }} />"],
        ['c-defeaters.tsx', 'export const A = ({ stamp }: { stamp: StampData }) => <Stamp stamp={{ ...stamp, defeaters: [] }} />'],
        ['c-word.tsx', "export const A = ({ stamp }: { stamp: StampData }) => <Stamp stamp={{ ...stamp, word: 'REFUTED' }} />"],
        // a spread anywhere: of something named after a stamp, typed as one, setting a stamp code, or handed to a
        // formatter (which takes a stamp's text fields, so the compiler lets it through)
        ['c-source.ts', "export const moved = (d: { stamp: object }) => ({ ...d.stamp, source: 'receipts/other.json' })"],
        ['c-typed.ts', "export const relabel = (s: Stamp): Stamp => ({ ...s, lane: 'rechecked-here' })"],
        ['c-declared.ts', "export const c = (s: Stamp) => { const t: Stamp = { ...s, row: 'smt-sat' }; return t }"],
        ['c-code.ts', "export const forged = (s: object) => ({ ...s, code: '[R]' })"],
        ['c-text.ts', 'export const short = (s: StampData) => stampText({ ...s, qualifier: s.qualifier.slice(0, 1) })'],
        // Object.assign, whose result the compiler types as a stamp
        ['c-assign.ts', "export const relabel = (stamp: object) => Object.assign({}, stamp, { lane: 'rechecked-here' })"],
        ['c-assign-qualifier.ts', 'export const short = (s: object) => Object.assign({}, s, { qualifier: [] })'],
        ['c-assign-copy.ts', 'export const copy = (myStamp: object, o: object) => Object.assign({}, myStamp, o)'],
        // a stamp read back from storage, which I2 forbids
        ['c-parse.ts', "export const stored: Stamp = JSON.parse(localStorage.getItem('stamp') ?? '{}')"],
        // each path of the rule alone: a spread of a value not named after a stamp, where a stamp is used (an
        // attribute, a property, satisfies, a return), and fields only a stamp has
        ['c-attr.tsx', "export const A = ({ s }: { s: StampData }) => <Stamp stamp={{ ...s, lane: 'rechecked-here' }} />"],
        ['c-prop.ts', "export const item = (s: object) => ({ id: 'x', stamp: { ...s, source: 'receipts/other.json' } })"],
        ['c-satisfies.ts', "export const t = (s: Stamp) => ({ ...s, lane: 'rechecked-here' }) satisfies Stamp"],
        ['c-return.ts', "export function f(s: Stamp): Stamp { return { ...s, lane: 'reported' } }"],
        ['c-defeaters-own.ts', 'export const clean = (s: object) => ({ ...s, defeaters: [] })'],
        ['c-word-own.ts', "export const reworded = (s: object) => ({ ...s, word: 'REFUTED' })"],
        ['c-computed.ts', "export const short = (s: object) => stampText({ ...s, ['qualifier']: [] })"],
      ].map(([file, line]) => faultsPerLine(`apps/site/src/screens/planted/${file}`, 'hand', [line])),
      // every stamp word and every stamp code set on a spread copy
      faultsPerLine('apps/site/src/screens/planted/c-words.ts', 'hand', STAMP_WORDS_CODES.map(([w], i) => `export const w${i} = (s: object) => ({ ...s, word: '${w}' })`)),
      faultsPerLine('apps/site/src/screens/planted/c-codes.ts', 'hand', STAMP_WORDS_CODES.map(([, c], i) => `export const c${i} = (s: object) => ({ ...s, code: '[${c}]' })`)),
      // the Stamp type imported under another name, from the package or from its source
      faultsPerLine('apps/site/src/screens/planted/c-alias-source.ts', 'hand', ["import type { Stamp as Derived } from '../../../../../packages/stamps/src/types.ts'; export const forged = {} as Derived", "import type { Stamp as FromDir } from '../../../../../packages/stamps/src'; export const again = {} as FromDir"]),
      {
        expect: [x('hand', 'apps/site/src/screens/planted/c-alias.ts:2', /copied and changed/), x('hand', 'apps/site/src/screens/planted/c-alias.ts:3', /a cast to Stamp/), no('hand', 'apps/site/src/screens/planted/c-alias.ts:4')],
        plant: (d) => write(d, 'apps/site/src/screens/planted/c-alias.ts', "import type { Stamp as StampData } from '@statespace/stamps'\nexport const relabel = (s: StampData): StampData => ({ ...s, lane: 'rechecked-here' })\nexport const cast = {} as StampData\nexport const code = (s: StampData) => s.code as StampData['code']\n"),
      },
      // a copy of what the compiler types as a Stamp, whatever it is called and wherever it stands (each line only
      // the compiler's types can tell), beside typed forms it leaves alone: an error given a code, a context handed
      // to the deriver, a derivation's fields
      typedCopies(),
      // a copy handed to each of the package's text functions, which take a stamp's text fields, of a value typed any
      faultsPerLine('apps/site/src/screens/planted/c-text-functions.ts', 'hand', ['export const a = (s: any, w: string) => stampText({ ...s, code: w })', 'export const b = (s: any, w: string) => codeText({ ...s, code: w })', 'export const c = (s: any, l: string) => qualifierText({ ...s, lane: l })', 'export const d = (s: any, w: string) => S.spokenName({ ...s, code: w })']),
      // in a file no compiler checks, any copy that sets a stamp's field, of each kind of script file
      ...[
        ['c-untyped.jsx', "export const relabel = (s) => ({ ...s, lane: 'rechecked-here' })"],
        ['c-untyped.js', "export const moved = (x) => Object.assign({}, x, { source: 'receipts/other.json' })"],
        ['c-untyped.mjs', "export const relabel = (s) => ({ ...s, row: 'smt-sat' })"],
        ['c-untyped.cjs', "exports.relabel = (s) => ({ ...s, lane: 'reported' })"],
      ].map(([file, line]) => faultsPerLine(`apps/site/src/screens/planted/${file}`, 'hand', [line])),
      // what the rule leaves alone: a context handed to the deriver, an error's code, a table row's source
      {
        expect: [1, 2, 3, 4, 5].map((n) => no('hand', `apps/site/src/screens/planted/c-controls.ts:${n}`)),
        plant: (d) => write(d, 'apps/site/src/screens/planted/c-controls.ts', "export const a = (raw: RawOutput, ctx: StampContext) => deriveStamp(raw, { ...ctx, lane: 'rechecked-here' })\nexport const b = (err: object) => ({ ...err, code: 'E_TIMEOUT' })\nexport const c = (row: object) => ({ ...row, source: 'bus', row: 3 })\nexport const e = (r: Receipt, opts: object) => deriveReceipt(r, { ...opts, source: 'receipts/x.json' })\nexport const f = (timestamp: object) => ({ ...timestamp, source: 'clock' })\n"),
      },
    ),
  ),
  entry(
    'a stamp typed by hand on the instrument origin, whose page shows receipts, and in a component other than the stamp and strip components',
    together(faultsPerLine('apps/instruments/src/planted/Receipt.tsx', 'hand', ['export const R = () => <p>PROVED [P] · Z3 5.3.1 unsat · uncertified</p>']), faultsPerLine('apps/site/src/components/planted/Card.tsx', 'hand', ['export const Card = () => <p>MODEL-CHECKED [M] · Init = 100 · complete</p>'])),
  ),
  entry(
    "a stamp's spoken name typed by hand, for each stamp, and a stamp typed into the apps' pages: each app's own page, an HTML or SVG file under src/ and public/, its text split across tags and lines, and its attributes",
    together(
      faultsPerLine('apps/site/src/screens/planted/spoken.tsx', 'hand', STAMP_WORDS_CODES.map(([w, c], i) => `export const S${i} = () => <span aria-label="${w.charAt(0)}${w.slice(1).toLowerCase()}, code ${c === '?' ? 'question mark' : c}: 1 step">x</span>`)),
      { expect: [x('hand', 'apps/instruments/instrument.html:2', /typed as text in a page/)], plant: (d) => write(d, 'apps/instruments/instrument.html', `${fs.readFileSync(path.join(d, 'apps/instruments/instrument.html'), 'utf8').replace(/^([^\n]*\n)/, '$1<p>PROVED [P] · Z3 5.3.1 unsat</p>\n')}`) },
      faultsPerLine('apps/site/public/planted.html', 'hand', ['<p><b>REFUTED</b> <i>[R]</i> · 1 step</p>', '<span title="[?] · canceled at rlimit 5e6">x</span>', '<span aria-label="Tested, code T: 200 seeds">x</span>']),
      { expect: [x('hand', 'apps/site/src/screens/planted/page.html:1')], plant: (d) => write(d, 'apps/site/src/screens/planted/page.html', '<p>MODEL-CHECKED\n[M] · Init = 100 · complete</p>\n') },
      faultsPerLine('apps/instruments/public/planted.svg', 'hand', ['<svg xmlns="http://www.w3.org/2000/svg"><text>PROVED [P] · Lean 4.35.0 kernel</text></svg>']),
    ),
  ),
  entry('each class of the stamp component worn by hand', faultsPerLine('apps/site/src/screens/planted/classes.tsx', 'hand', STAMP_CLASSES.map((c, i) => `export const C${i} = () => <span className="${c}">x</span>`))),
  entry('each stamp word typed by hand with its code', faultsPerLine('apps/site/src/screens/planted/words.ts', 'hand', STAMP_WORDS_CODES.map(([w, c], i) => `export const w${i} = '${w} [${c}]'`))),
  entry('a stamp object built by hand for each code', faultsPerLine('apps/site/src/screens/planted/objects.ts', 'hand', STAMP_WORDS_CODES.map(([w, c], i) => `export const o${i} = { code: '[${c}]', word: '${w}' }`))),
  entry('each stamp code typed by hand first, with a qualifier and no word', faultsPerLine('apps/site/src/screens/planted/codes.ts', 'hand', STAMP_WORDS_CODES.map(([, c], i) => `export const c${i} = '[${c}] · x'`))),
  ['a key typed in the GEN-which-stamp generator outside its mutants file', [x('hand', `${PATHS.whichStampSrc}/keys.ts:3`)], (d) => write(d, `${PATHS.whichStampSrc}/keys.ts`, "import { deriveStamp } from '@statespace/stamps'\nexport const derive = deriveStamp\nexport const key = 'UNKNOWN [?] · stopped at deadlock, 10 distinct states'\n")],

  // ---------------------------------------------------------------- hue
  entry(
    'a stamp hue outside the stamp scope, in every colour syntax the check reads',
    together(
      faultsPerLine(CSS, 'hue', [
        '.h0 { background-color: var(--st-p-fill); }',
        '.h1 { background-color: #1D3F8F; }',
        '.h2 { background-color: #1d3f8fcc; }',
        '.h3 { color: #750; }',
        '.h4 { color: #8aef; }',
        '.h5 { color: rgb(29, 63, 143); }',
        '.h6 { color: rgb(29 63 143); }',
        '.h7 { color: rgba(29, 63, 143, 0.5); }',
        '.h8 { color: rgb(11.4% 24.7% 56.1%); }',
        '.h9 { color: hsl(222, 66%, 34%); }',
        '.h10 { color: hsla(222deg 66% 34% / 50%); }',
        '.h11 { color: hsl(0.6167turn 66% 34%); }',
        '.h12 { color: hsl(3.8746rad 66% 34%); }',
        '.h13 { color: hsl(246.67grad 66% 34%); }',
        '.h14 { color: hwb(222 11% 44%); }',
        '.h15 { color: lab(28 12 -49); }',
        '.h16 { color: lch(28 50.4 283.8); }',
        '.h17 { color: oklab(0.3936 -0.0145 -0.1379); }',
        '.h18 { color: oklch(39.36% 0.1387 263.8); }',
        '.h19 { color: color(srgb 0.1137 0.2471 0.5608); }',
        '.h20 { color: color(srgb-linear 0.0123 0.0497 0.2747); }',
        '.stamp-p, .h21 { background-color: var(--st-p-fill); }',
        '.h22 { border-color: var(--line-violation); }',
        '.h23 { color: #cbe; }',
        '.h24 { color: #C2410C; }',
      ]),
      // the violation token (.h22) and a vermilion literal (.h24) draw both findings
      { expect: [23, 25].flatMap((n) => [x('hue', `${CSS}:${n}`, /uses a stamp hue outside/), x('hue', `${CSS}:${n}`, /uses vermilion outside/)]), plant: () => {} },
      faultsPerLine('apps/site/src/screens/planted/vermilion.css', 'hue', ['.stamp-p .stamp-label { outline-color: var(--st-r-fill); }'], /vermilion outside/),
      faultsPerLine('apps/site/src/screens/planted/hues.ts', 'hue', [
        "export const s = { color: 'var(--st-p-fill)' }",
        "export const t = (el: HTMLElement) => getComputedStyle(el).getPropertyValue('--st-r-fill')",
        'export const u = (x: string) => `color: ${x}; background: #1D3F8F`',
        "export function draw(c: CanvasRenderingContext2D): void { c.fillStyle = '#C2410C' }",
      ]),
      faultsPerLine('apps/site/public/planted.json', 'hue', ['{ "fill": "#1D3F8F" }']),
      faultsPerLine('apps/site/src/screens/planted/mark.svg', 'hue', ['<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4"><rect fill="#1d3f8f" width="4" height="4"/></svg>']),
      faultsPerLine(LESSON, 'hue', ['The guard <span style="color: rgb(194, 65, 12)">failed</span> here.']),
      faultsPerLine('content/stages/S1/planted.yaml', 'hue', ['tint: var(--st-p-fill)']),
      faultsPerLine('content/stages/S1/planted.mdx', 'hue', ['The guard <span style="color: #1D3F8F">held</span>.']),
      faultsPerLine('content/stages/S1/planted.html', 'hue', ['<p style="color: #1D3F8F">held</p>']),
      faultsPerLine('content/stages/S1/planted.svg', 'hue', ['<svg xmlns="http://www.w3.org/2000/svg"><rect fill="#1D3F8F" width="4" height="4"/></svg>']),
      faultsPerLine('content/stages/S1/planted.json', 'hue', ['{ "tint": "#1D3F8F" }']),
      { expect: [x('hue', at(PATHS.stripCss), /uses a stamp hue/), x('hue', at(PATHS.tokens), /uses a stamp hue/)], plant: (d) => (fs.appendFileSync(path.join(d, PATHS.stripCss), '\n@keyframes strip-glow {\n  from {\n    color: var(--st-p-fill);\n  }\n}\n'), fs.appendFileSync(path.join(d, PATHS.tokens), '\n.planted-progress {\n  color: var(--st-p-fill);\n}\n')) },
    ),
  ),
  ['vermilion in a strip rule that is not the crack', [x('hue', at(PATHS.stripCss), /vermilion outside/)], (d) => edit(d, PATHS.stripCss, (t) => `${t}\n.strip-note { color: var(--st-r-fill); }\n`)],
  entry(
    'every stamp hue of both themes outside the stamp scope, under a claim class too, and in the instrument origin',
    together(
      {
        ...faultsPerLine('apps/site/src/screens/planted/hues.css', 'hue', [...STAMP_HUES.map((hex, i) => `.hv${i} { color: ${hex}; }`), ...HUE_LOOKALIKES]),
        // the plant names the hues tokens.css defines; one that no longer does fails loudly rather than test nothing
        plant: (d) => {
          const tokens = fs.readFileSync(path.join(d, PATHS.tokens), 'utf8')
          for (const hex of STAMP_HUES) if (!tokens.includes(`: ${hex};`)) throw new Error(`tokens.css no longer defines the stamp hue ${hex}: update STAMP_HUES`)
          write(d, 'apps/site/src/screens/planted/hues.css', `${[...STAMP_HUES.map((hex, i) => `.hv${i} { color: ${hex}; }`), ...HUE_LOOKALIKES].join('\n')}\n`)
        },
      },
      faultsPerLine('apps/instruments/src/planted/hue.tsx', 'hue', ["export const A = () => <p style={{ color: '#1D3F8F' }}>held</p>", "export const tint = { color: '#C2410C' }", "export const name = 'var(--st-p-fill)'"]),
      faultsPerLine('apps/instruments/src/planted/planted.css', 'hue', ['.receipt-note { color: #1D3F8F; }']),
      // a component outside the stamp and strip components is held to the rule like a screen
      faultsPerLine('apps/site/src/components/planted/Legend.tsx', 'hue', ["export const Legend = () => <span style={{ color: '#1D3F8F' }}>held</span>"]),
      // vermilion in a strip rule whose other class only looks like the violation line
      { expect: [x('hue', 'apps/site/src/screens/planted/vermilion-lookalike.css:1', /uses vermilion outside/)], plant: (d) => write(d, 'apps/site/src/screens/planted/vermilion-lookalike.css', '.strip-note .line-divider { color: var(--line-violation); }\n') },
    ),
  ),

  // ---------------------------------------------------------------- line
  entry(
    'a dashed, dotted, dash-array or gradient line outside the line language, in every form the check reads',
    together(
      faultsPerLine(CSS, 'line', [
        ...LINE_PROPS.map((prop, i) => `.l${i} { ${prop}: ${lineValue(prop, i)}; }`),
        '.chart path { stroke-dasharray: 4 2; }',
        '.line-assumed, .l-mixed { border-style: dashed; }',
        '.in-progress { background-image: repeating-linear-gradient(45deg, #000 0, #000 2px, #fff 2px, #fff 6px); }',
      ]),
      faultsPerLine(TSX, 'line', [
        ...LINE_PROPS.map((prop, i) => `export const s${i} = { ${camel(prop)}: '${lineValue(prop, i)}' }`),
        "export const k = { 'border-left-style': 'dotted' }",
        "export const w = { WebkitTextDecorationStyle: 'dashed' }",
        "export const d = { strokeDasharray: '4 2' }",
        'export const n = { strokeDasharray: 4 }',
        "export const textDecorationStyle = 'dotted'",
        "export function a(el: HTMLElement): void { el.style.borderStyle = 'dashed' }",
        "export function b(el: HTMLElement): void { el.style['border-top-style'] = 'dotted' }",
        "export function c(el: HTMLElement): void { el.style.setProperty('outline-style', 'dashed') }",
        'export function e(ctx: CanvasRenderingContext2D): void { ctx.setLineDash([4, 2]) }',
        "export const g = 'repeating-linear-gradient(45deg, #000 0, #fff 4px)'",
        'export const P = () => <svg><path d="M0 0h8" strokeDasharray="2 2" /></svg>',
        "export const Q = () => <div style={{ borderBottom: '1px dotted' }}>x</div>",
        "export const pick = (on: boolean) => ({ outline: on ? '1px solid' : '1px dashed' })",
        "export const sub = { border: `1px ${'dashed'}` }",
        "export const moz = { MozTextDecorationStyle: 'dotted' }",
        "export const ms = { msTextDecorationStyle: 'dashed' }",
        "export const cast = { border: '1px dashed' as string }",
        "export const paren = { border: ('1px dotted') }",
        "export const either = (s?: string) => ({ border: s || '1px dashed' })",
        "export const both = (on: boolean) => ({ border: on && '1px dotted' })",
        "export const fallback = (s?: string) => ({ border: s ?? '1px dashed' })",
        "export const sat = { border: '1px dotted' satisfies string }",
        "export const computed = { ['border-style']: 'dashed' }",
        'export const R = () => <div style="border-bottom: 1px dotted">x</div>',
        'export const K = () => <svg><path d="M0 0h8" stroke-dasharray="2 2" /></svg>',
      ]),
      { expect: [2, 3, 4, 5, 6].map((n) => x('line', `apps/site/public/planted.svg:${n}`)), plant: (d) => write(d, 'apps/site/public/planted.svg', '<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8">\n<path d="M0 4h8" stroke="#000" stroke-dasharray="2 2"/>\n<path d="M0 6h8" style="stroke-dasharray: 3 1"/>\n<path d="M0 7h8" stroke-dasharray=\'1 1\'/>\n<path d="M0 8h8" stroke-dasharray=3 />\n<path d="M0 9h8" style=\'border-top: 1px dotted\'/>\n</svg>\n') },
      { expect: [x('line', at('apps/site/index.html'))], plant: (d) => subs(d, 'apps/site/index.html', ['<div id="root"></div>', '<div id="root" style="border: 1px dashed #000"></div>']) },
      { expect: [x('line', `${LESSON}:3`), x('line', `${LESSON}:5`)], plant: (d) => write(d, LESSON, 'A lesson.\n\n<span style="border-bottom: 1px dotted">a term</span>\n\n<div style="background-image: linear-gradient(#fff, #eee)">x</div>\n') },
      faultsPerLine('content/stages/S1/planted.yaml', 'line', ['body: \'<span style="outline: 1px dashed">x</span>\'']),
      faultsPerLine('content/stages/S1/planted.mdx', 'line', ['<span style="border-bottom: 1px dotted">a term</span>']),
      faultsPerLine('content/stages/S1/planted.html', 'line', ['<p style="outline: 1px dashed">x</p>']),
      faultsPerLine('content/stages/S1/planted.svg', 'line', ['<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 4h8" stroke-dasharray="2 2"/></svg>']),
      faultsPerLine('content/stages/S1/planted.json', 'line', ['{ "figure": "<path stroke-dasharray=\\"2 2\\"/>" }']),
      // a style written as a string in JSX, and CSS a script holds as text, each with a value no other rule reads
      {
        expect: [x('line', 'apps/site/src/screens/planted/style-string.tsx:1', /a style attribute: border-style: dashed/), x('line', 'apps/site/src/screens/planted/style-string.tsx:2', /a style attribute: text-decoration-style: dotted/), x('line', 'apps/site/src/screens/planted/style-string.tsx:3', /border-style: dashed: nothing else is dashed or dotted \(\.note\)/)],
        plant: (d) => write(d, 'apps/site/src/screens/planted/style-string.tsx', "export const R = () => <div style=\"border-style: dashed\">x</div>\nexport const S = () => <abbr style='text-decoration-style: dotted'>x</abbr>\nexport const sheet = () => new CSSStyleSheet().replaceSync('.note { border-style: dashed; }')\n"),
      },
      // a dashed line written as a CSS value in a style module's constants, under keys that name no property
      faultsPerLine('apps/site/src/screens/planted/styles.ts', 'line', [
        "export const rule = { divider: '1px dashed var(--rule)' }",
        "export const theme = { underline: 'dotted currentColor' }",
        // each width unit, a width at the start or after a property, each style, and each colour form after it
        "export const a = { v: '1px dashed' }",
        "export const b = { v: 'border-top: 2px dotted' }",
        "export const c = { v: '0.5em dotted' }",
        "export const d = { v: '1rem dashed' }",
        "export const e = { v: '1pt dotted' }",
        "export const f = { v: 'dashed #999' }",
        "export const g = { v: 'dotted var(--rule)' }",
        "export const h = { v: 'dashed currentColor' }",
        "export const i = { v: 'dotted rgb(0 0 0)' }",
        "export const j = { v: 'dashed hsl(0 0% 50%)' }",
        "export const k = { v: 'dotted transparent' }",
        "export const l = { v: 'dashed rgba(0, 0, 0, 0.5)' }",
      ]),
      // a style property's value read through the variables it names, and a chart's data in JSON
      {
        expect: [x('line', 'apps/site/src/screens/planted/indirect.tsx:2'), x('line', 'apps/site/src/screens/planted/indirect.tsx:3'), no('line', 'apps/site/src/screens/planted/indirect.tsx:1')],
        plant: (d) => write(d, 'apps/site/src/screens/planted/indirect.tsx', "const lineStyle = 'dashed'\nexport const P = ({ on }: { on: boolean }) => <div style={{ borderStyle: on ? 'solid' : lineStyle }}>x</div>\nexport const Q = ({ assumed }: { assumed: boolean }) => { const kind = assumed ? 'dotted' : 'solid'; return <div style={{ borderStyle: kind }}>x</div> }\n"),
      },
      {
        expect: [2, 3, 4, 6].map((n) => x('line', `apps/site/src/screens/planted/chart.json:${n}`)).concat([no('line', 'apps/site/src/screens/planted/chart.json:5')]),
        plant: (d) => write(d, 'apps/site/src/screens/planted/chart.json', '{\n  "a": { "strokeDasharray": "4 2" },\n  "b": { "border-style": "dotted" },\n  "c": { "strokeDasharray": [4, 2] },\n  "d": { "strokeDasharray": "none" },\n  "e": { "strokeDasharray": 4 }\n}\n'),
      },
      // a line key deep in a chart's series, under a style object, and with its dash array over several lines
      {
        expect: [1, 2, 3].map((n) => x('line', `apps/site/src/screens/planted/chart-nested.json:${n}`)),
        plant: (d) => write(d, 'apps/site/src/screens/planted/chart-nested.json', '{ "series": [{ "strokeDasharray": "4 2" }],\n  "grid": { "lines": [{ "style": { "borderTopStyle": "dashed" } }] },\n  "axis": { "strokeDasharray": [\n    4,\n    2\n  ] } }\n'),
      },
      // the instrument origin's scripts and stylesheets
      faultsPerLine('apps/instruments/src/planted/line.tsx', 'line', ["export const A = () => <div style={{ border: '1px dashed' }}>x</div>", "export const s = { borderTop: '1px dotted' }", "export const g = 'linear-gradient(#000, #fff)'"]),
      faultsPerLine('apps/instruments/src/planted/line.css', 'line', ['.receipt-rule { border-top: 1px dashed; }']),
    ),
  ),
  entry(
    'a line or a gradient in a rule whose selector list puts one selector in the line language and another outside it, and in classes outside the language that only look like it',
    together(
      {
        expect: [x('line', 'apps/site/src/screens/planted/mixed.css:1', /a gradient outside/), x('line', 'apps/site/src/screens/planted/mixed.css:2', /stroke-dasharray outside/), x('hue', 'apps/site/src/screens/planted/mixed.css:3', /uses vermilion outside/)],
        plant: (d) => write(d, 'apps/site/src/screens/planted/mixed.css', '.line-crack, .progress-bar { background-image: linear-gradient(90deg, #000 0, #fff 100%); }\n.line-assumed, .chart-grid line { stroke-dasharray: 2 2; }\n.line-violation, .strip-note { color: var(--line-violation); }\n'),
      },
      faultsPerLine('apps/site/src/screens/planted/scopes.css', 'line', [
        '.line-divider { border-bottom: 1px dotted var(--rule); }',
        '.x .line-violation { stroke-dasharray: 4 2; }',
        '.x .line-crack { border-style: dashed; }',
        '.stamp-legend { background-image: linear-gradient(#000, #fff); }',
        '.strip-legend { background-image: linear-gradient(#000, #fff); }',
        '.stamp-p .stamp-legend-tick { border-top: 1px dotted; }',
        '.strip-note { border-bottom: 1px dotted; }',
        '.line-divider { background-image: linear-gradient(#000, #fff); }',
      ]),
    ),
  ),

  // ---------------------------------------------------------------- grayscale
  ['[A] drawn as a single solid box, like [T]', [x('grayscale', PATHS.stampCss, /\[T\] and \[A\] share one grayscale signature/)], (d) => edit(d, PATHS.stampCss, (t) => sub(t, '  border-top-style: dashed;\n  border-right-style: dashed;\n  border-bottom-style: dashed;\n  border-left-style: dashed;', '  border-top-style: solid;\n  border-right-style: solid;\n  border-bottom-style: solid;\n  border-left-style: solid;'))],
  ['[A] boxed solid by a border shorthand', [x('grayscale', at(PATHS.stampCss), /is a shorthand on a stamp/)], (d) => subs(d, PATHS.stampCss, ['  border-color: var(--st-a-line);\n}', '  border-color: var(--st-a-line);\n  border: 2px solid var(--st-a-line);\n}'])],
  ['[A] boxed solid by a rule the frames are not read from', [x('grayscale', at(PATHS.stampCss), /only \.stamp-frame and \.stamp-<code> \.stamp-frame in stamp\.css/)], (d) => edit(d, PATHS.stampCss, (t) => `${t}\n.stamp.stamp-a .stamp-frame {\n  border-top-style: solid;\n  border-right-style: solid;\n  border-bottom-style: solid;\n  border-left-style: solid;\n}\n`)],
  [
    'frame rules that only start like the modelled ones: a pseudo-element, a descendant, a forced-colors query with another condition',
    [
      x('grayscale', /^apps\/site\/src\/components\/stamp\/stamp\.css:\d+$/, /outline-offset: 2px on \.stamp-e \.stamp-frame inside @media \(forced-colors: active\) and \(min-width: 600px\) reaches a stamp's frame/),
      x('grayscale', /^apps\/site\/src\/components\/stamp\/stamp\.css:\d+$/, /border-top-style: solid on \.stamp-a \.stamp-frame::after reaches a stamp's frame/),
      x('grayscale', /^apps\/site\/src\/components\/stamp\/stamp\.css:\d+$/, /border-top-style: solid on \.stamp-frame \.stamp-word reaches a stamp's frame/),
    ],
    (d) => fs.appendFileSync(path.join(d, PATHS.stampCss), '\n@media (forced-colors: active) and (min-width: 600px) {\n  .stamp-e .stamp-frame {\n    outline-offset: 2px;\n  }\n}\n\n.stamp-a .stamp-frame::after {\n  border-top-style: solid;\n}\n\n.stamp-frame .stamp-word {\n  border-top-style: solid;\n}\n'),
  ],
  [
    'every property that draws on a frame or colours its words, on a stamp.css rule the frames are not read from',
    STAMP_CSS_DRAWS.map(([prop]) => x('grayscale', at(PATHS.stampCss), new RegExp(`^${prop}: .* on \\.stamp \\.stamp-frame reaches a stamp's frame`))),
    (d) => fs.appendFileSync(path.join(d, PATHS.stampCss), `\n.stamp .stamp-frame {\n${STAMP_CSS_DRAWS.map(([prop, value]) => `  ${prop}: ${value};`).join('\n')}\n}\n`),
  ],
  [
    "every shorthand on a modelled frame rule, which the frame's signature is not read from",
    FRAME_SHORTHANDS.map((prop) => x('grayscale', at(PATHS.stampCss), new RegExp(`^${prop}: .* is a shorthand on a stamp`))),
    (d) => subs(d, PATHS.stampCss, ['.stamp-a .stamp-frame {\n  color: var(--st-a-text);', `.stamp-a .stamp-frame {\n  color: var(--st-a-text);\n${FRAME_SHORTHANDS.map((prop) => `  ${prop}: ${prop.startsWith('background') ? 'none' : '2px dashed var(--st-a-line)'};`).join('\n')}`]),
  ],
  [
    'a frame property GATE-stamps does not read, and a ring around the frame, in stamp.css',
    [x('grayscale', at(PATHS.stampCss), /box-shadow on .* does not read it into the frame's grayscale signature/), x('grayscale', at(PATHS.stampCss), /outline-style: solid on \.stamp-button draws around a stamp's frame/)],
    (d) => (subs(d, PATHS.stampCss, ['.stamp-a .stamp-frame {\n  color: var(--st-a-text);', '.stamp-a .stamp-frame {\n  color: var(--st-a-text);\n  box-shadow: 0 0 0 2px currentColor;']), fs.appendFileSync(path.join(d, PATHS.stampCss), '\n.stamp-button {\n  outline-style: solid;\n  outline-width: 2px;\n}\n')),
  ],
  entry(
    "rules in another stylesheet that draw on a stamp's frame or words, hide them or draw around them, by every selector form",
    faultsPerLine(CSS, 'grayscale', [
      '.claim-card span { border-top-style: solid; }',
      '[aria-hidden="true"] { outline-style: solid; }',
      '.card * { border: 2px solid currentColor; }',
      '.card span { box-shadow: 0 0 0 2px currentColor; }',
      '.claim-card :is(span, b) { outline: 2px solid; }',
      '.claim-card span:not(.note) { border-top-style: solid; }',
      '.claim-card .stamp-frame::before { border-top-style: solid; }',
      '.claim-card span:hover { outline: 2px solid; }',
      '.claim-card [class] { border-top-style: solid; }',
      '.stamp-t .stamp-frame { border-top-style: dotted; }',
      '.claim-card .stamp-word { display: none; }',
      '.claim-card span { visibility: hidden; }',
      '.claim-card span { font-size: 6px; }',
      '.claim-card .stamp { border-top-style: solid; }',
      '.claim-card .stamp { display: none; }',
      '.claim-card .stamp-button { background-color: #000; }',
      '.claim-card .lane-badge { outline: 1px solid; }',
      '.claim-card { --st-p-fill: #FFFFFF; }',
      '.claim-card .stamp { text-transform: lowercase; }',
      '.claim-card .stamp { opacity: 0.3; }',
      '.claim-card .stamp { font-size: 4px; }',
      '.claim-card .stamp-word { position: absolute; clip: rect(0 0 0 0); }',
      '.claim-card .stamp-word { color: var(--sheet); }',
      '.claim-card .stamp-frame { transform: scale(0.2); }',
      '.claim-card .stamp-word { width: 0; overflow: hidden; }',
      '.claim-card .stamp-frame { letter-spacing: -1em; }',
      '.claim-card .stamp-word { text-indent: -9999px; }',
      '.claim-card > span { outline: 2px solid; }',
      '.claim-card + span { outline: 2px solid; }',
      '.claim-card ~ span { outline: 2px solid; }',
      '.claim-card>span { outline-style: solid; }',
      '.claim-card span[class~="stamp-word"] { outline-style: solid; }',
      '.claim-card span[class^="stamp"] { outline-style: solid; }',
      '.claim-card span[class$="frame"] { outline-style: solid; }',
      '.claim-card span[class*="word"] { outline-style: solid; }',
      '.claim-card span[class|="stamp"] { outline-style: solid; }',
      '.claim-card span[aria-hidden="TRUE" i] { outline-style: solid; }',
      '.claim-card :where(span) { outline-style: solid; }',
      // each property on its own, so that no other one on the line draws the finding for it
      '.claim-card .stamp-word { width: 0; }',
      '.claim-card .stamp-word { clip: rect(0 0 0 0); }',
      '.claim-card .stamp-word { font-family: serif; }',
      '.claim-card .stamp-word { font-weight: 400; }',
      '.claim-card .stamp { filter: grayscale(1); }',
    ]),
  ),
  entry(
    "rules that hide what stands around a stamp's frame, draw on it in a state that lasts, or write into its words",
    faultsPerLine('apps/site/src/screens/planted/around.css', 'grayscale', [
      '.x .stamp { visibility: hidden; }',
      '.x .stamp-button { visibility: collapse; }',
      '.x .lane-badge { visibility: hidden; }',
      '.x .stamp { content-visibility: hidden; }',
      '.x .stamp-button:disabled { outline: 2px solid; }',
      '.x .stamp-button[aria-expanded="true"] { outline: 2px solid; }',
      ".x .stamp-word::after { content: ' (checked)'; }",
      '.x .stamp { overflow: hidden; }',
      '.x .stamp { transform: scale(0.5); }',
      ".x .stamp::before { content: '!'; }",
      '.x .stamp-button { clip: rect(0 0 0 0); }',
      '.x .stamp { forced-color-adjust: none; }',
      '.x .stamp-button:checked { outline: 2px solid; }',
    ]),
  ),
  entry(
    "a stamp's frame drawn on, or a frame token set, from a script, a <style> element or a page",
    together(
      faultsPerLine('apps/site/src/screens/planted/sheet.ts', 'grayscale', ["new CSSStyleSheet().replaceSync('.claim-card span { border-top-style: solid; border-top-width: 4px }')", "new CSSStyleSheet().replaceSync('.claim-card { --fs-stamp: 4px }')"]),
      faultsPerLine('content/stages/S1/planted.mdx', 'grayscale', ['<style>.lesson span { outline: 2px solid; }</style>']),
      faultsPerLine('content/stages/S1/planted.html', 'grayscale', ['<style>.page span { outline: 2px solid; }</style>']),
      faultsPerLine('content/stages/S1/planted.svg', 'grayscale', ['<svg xmlns="http://www.w3.org/2000/svg"><style>span { outline: 2px solid; }</style></svg>']),
      faultsPerLine('apps/site/public/planted.svg', 'grayscale', ['<svg xmlns="http://www.w3.org/2000/svg"><style>span { outline: 2px solid; }</style></svg>']),
      { expect: [x('grayscale', 'content/stages/S1/planted.yaml:2'), x('grayscale', 'content/stages/S1/planted-token.md:2')], plant: (d) => (write(d, 'content/stages/S1/planted.yaml', 'body: |\n  --sheet: #000;\n'), write(d, 'content/stages/S1/planted-token.md', '<div style="\n--sheet: #000;\n">A dark card.</div>\n')) },
      faultsPerLine('apps/site/src/screens/planted/Styled.tsx', 'grayscale', ["export const A = () => <style>{'.card span { outline: 3px solid; }'}</style>", "export const B = () => <style dangerouslySetInnerHTML={{ __html: '.card button { outline: 3px solid; }' }} />", "export const C = () => <div style={{ ['--fs-stamp' as string]: '4px' }}>x</div>", "export const D = (el: HTMLElement) => el.style.setProperty('--fs-stamp', '4px')"]),
      { expect: [x('grayscale', at('apps/instruments/instrument.html'))], plant: (d) => subs(d, 'apps/instruments/instrument.html', ['</head>', '  <style>\n    span { outline: 3px solid; }\n  </style>\n  </head>']) },
      // in tokens.css itself, a rule below :root redefines a frame token for what it selects
      { expect: [x('grayscale', at(PATHS.tokens), /--st-p-fill on :root \.claim-card redefines/), x('grayscale', at(PATHS.tokens), /--st-m-line on \.claim-card redefines/)], plant: (d) => fs.appendFileSync(path.join(d, PATHS.tokens), '\n:root .claim-card {\n  --st-p-fill: #FFFFFF;\n}\n\n.claim-card {\n  --st-m-line: #FFFFFF;\n}\n') },
      { expect: [x('grayscale', `${LESSON}:3`), x('grayscale', `${LESSON}:6`)], plant: (d) => write(d, LESSON, 'A lesson.\n\n<div style="--sheet: #000">A dark card.</div>\n\n<style>\n.lesson span { border: 2px solid; }\n</style>\n') },
    ),
  ),
  // just under each threshold, so a lowered threshold lets the plant through
  ['a TESTED text colour just under 4.5:1', [x('grayscale', PATHS.stampCss, /light: \[T\] text is 4\.49:1 against its surface, below 4\.5:1/)], (d) => subs(d, PATHS.tokens, ['--st-t: #7A5A00;', '--st-t: #8C7123;'])],
  ["[A]'s identifying stroke just under 3:1 against the sheet", [x('grayscale', PATHS.stampCss, /light: \[A\]'s identifying stroke or fill is 2\.98:1 against the sheet, below 3:1/)], (d) => subs(d, PATHS.tokens, ['--st-a-line: #5F675F;', '--st-a-line: #8E948E;'])],
  [
    'a frame with no text colour and a frame with no identifying stroke',
    [x('grayscale', PATHS.stampCss, /light: \[N\] has no text colour/), x('grayscale', PATHS.stampCss, /light: \[C\] has no identifying stroke or fill/)],
    (d) => subs(d, PATHS.stampCss, ['.stamp-n .stamp-frame {\n  color: var(--st-n-text);\n}', '.stamp-n .stamp-frame {\n}'], ['  border-bottom-width: var(--border-component);\n  border-color: var(--st-c);\n}', '  border-bottom-width: var(--border-component);\n}']),
  ],
  [
    "forced colors without [P]'s 4-px border, [?]'s 6-px left border or [R]'s ring",
    [x('grayscale', PATHS.stampCss, /under forced colors \[P\] needs a 4-px solid border/), x('grayscale', PATHS.stampCss, /under forced colors \[\?\] needs a 6-px left border/), x('grayscale', PATHS.stampCss, /under forced colors \[R\] keeps its ring/)],
    (d) =>
      subs(
        d,
        PATHS.stampCss,
        ['    border-top-width: var(--border-double);\n    border-right-width: var(--border-double);\n    border-bottom-width: var(--border-double);\n    border-left-width: var(--border-double);\n  }', '    border-top-width: var(--border-stamp);\n    border-right-width: var(--border-stamp);\n    border-bottom-width: var(--border-stamp);\n    border-left-width: var(--border-stamp);\n  }'],
        ['    border-left-width: 6px;', '    border-left-width: 2px;'],
        ['  .stamp-r .stamp-frame {\n    outline-style: solid;', '  .stamp-r .stamp-frame {\n    outline-style: none;'],
      ),
  ],
  ['two frames that forced colors draw alike', [x('grayscale', PATHS.stampCss, /forced colors: \[P\] and \[E\] share one frame/)], (d) => subs(d, PATHS.stampCss, ['    outline-width: var(--border-violation);\n  }\n}', '    outline-width: var(--border-violation);\n  }\n\n  .stamp-e .stamp-frame {\n    border-top-style: solid;\n    border-right-style: solid;\n    border-bottom-style: solid;\n    border-left-style: solid;\n  }\n}'])],

  // ---------------------------------------------------------------- tokens
  ['the two night blocks drift apart', [x('tokens', PATHS.tokens, /the two night blocks differ: --st-c/)], (d) => edit(d, PATHS.tokens, (t) => sub(t, '  --st-c: #CDB6E6;\n', '  --st-c: #CDB6E7;\n', { all: false }))],
  ['a stamp style that uses a token tokens.css does not define', [x('tokens', PATHS.stampCss, /uses --st-tested/)], (d) => subs(d, PATHS.stampCss, ['.stamp-t .stamp-frame {\n  color: var(--st-t);', '.stamp-t .stamp-frame {\n  color: var(--st-tested);'])],
  ["tokens.css without its night setting's block", [x('tokens', PATHS.tokens, /no :root\[data-theme="night"\] block/)], (d) => subs(d, PATHS.tokens, [':root[data-theme="night"] {', ':root[data-theme="dusk"] {'])],
  ["tokens.css without its system night block", [x('tokens', PATHS.tokens, /no @media \(prefers-color-scheme: dark\)/)], (d) => subs(d, PATHS.tokens, ['@media (prefers-color-scheme: dark) {\n  :root:not([data-theme="light"]) {', '@media (prefers-color-scheme: dark) {\n  :root:not([data-theme="day"]) {'])],
  ['tokens.css without its light block', [x('tokens', PATHS.tokens, /no :root block of tokens/)], (d) => subs(d, PATHS.tokens, [':root {\n  color-scheme: light;', '.root {\n  color-scheme: light;'])],
  ['a sheet colour the gate cannot read', [x('tokens', PATHS.tokens, /light: --sheet is not a hex colour/)], (d) => subs(d, PATHS.tokens, ['  --sheet: #F4F4F0;', '  --sheet: rgb(244 244 240);'])],
  ['stamp.css missing', [x('tokens', PATHS.stampCss, /is missing/)], (d) => fs.rmSync(path.join(d, PATHS.stampCss))],
  [
    'font files, licenses and @font-face rules that no longer match the manifest',
    [
      x('tokens', `${PATHS.fonts}/juliamono-400-core.woff2`, /no longer has the SHA-256/),
      // a byte changed in place: the size stays, the hash does not
      x('tokens', `${PATHS.fonts}/source-serif-4-600-core.woff2`, /no longer has the SHA-256/),
      x('tokens', `${PATHS.fonts}/jost-var-ext.woff2`, /not on disk/),
      x('tokens', `${PATHS.fonts}/extra.woff2`, /a font file fonts\.json does not list/),
      x('tokens', `${PATHS.fonts}/OFL-Jost.txt`, /license beside the subsets is missing or changed/),
      x('tokens', PATHS.tokens, /does not declare juliamono-600-ext\.woff2/),
      x('tokens', PATHS.tokens, /source-serif-4-400-ext\.woff2's unicode-range differs/),
      x('tokens', PATHS.tokens, /declares \/fonts\/stray\.woff2/),
    ],
    (d) => {
      fs.appendFileSync(path.join(d, PATHS.fonts, 'juliamono-400-core.woff2'), Buffer.from([0]))
      const same = path.join(d, PATHS.fonts, 'source-serif-4-600-core.woff2')
      const bytes = fs.readFileSync(same)
      bytes[bytes.length >> 1] ^= 0xff
      fs.writeFileSync(same, bytes)
      fs.rmSync(path.join(d, PATHS.fonts, 'jost-var-ext.woff2'))
      fs.writeFileSync(path.join(d, PATHS.fonts, 'extra.woff2'), Buffer.from([0]))
      fs.appendFileSync(path.join(d, PATHS.fonts, 'OFL-Jost.txt'), '\n')
      edit(d, PATHS.tokens, (t) => {
        const face = /@font-face \{\n  font-family: 'JuliaMono';\n  src: url\('\/fonts\/juliamono-600-ext\.woff2'\)[^}]*\}\n/.exec(t)
        if (!face) throw new Error("the plant's @font-face block is not in tokens.css")
        const stray = "@font-face {\n  font-family: 'Stray';\n  src: url('/fonts/stray.woff2') format('woff2');\n}\n"
        return sub(t.replace(face[0], stray), 'unicode-range: U+0100-012B, U+012E-0131', 'unicode-range: U+0100-012C, U+012E-0131', { all: false })
      })
    },
  ],
  ['a manifest that lists two of the three licenses', [x('tokens', `${PATHS.fonts}/fonts.json`, /each of the three faces needs its license/)], (d) => editJson(d, `${PATHS.fonts}/fonts.json`, (m) => void delete m.licenses['OFL-JuliaMono.txt'])],
  ['a font manifest that does not parse', [x('tokens', `${PATHS.fonts}/fonts.json`, /missing or unreadable/)], (d) => write(d, `${PATHS.fonts}/fonts.json`, '{ not json\n')],

  // ---------------------------------------------------------------- which-stamp
  [
    'a GEN-which-stamp key the deriver does not give its recorded output',
    [x('which-stamp', keyAt('t1-doublespend-deadlock'), /is not what the deriver gives these lines/)],
    whichStampFile([{ id: 't1-doublespend-deadlock', run: 'RUN-tlc-doublespend', config: '1.8.0-default', parser: 'tlc', lines: ['Error: Deadlock reached.', '11 states generated, 10 distinct states found, 3 states left on queue.'], key: '[M] · bound · partial' }]),
  ],
  ['a GEN-which-stamp generator that does not use the deriver', [x('which-stamp', PATHS.whichStampSrc, /does not import @statespace\/stamps/)], (d) => write(d, GENERATOR, "export const key = (): string => 'a key'\n")],
  ['a GEN-which-stamp generator without its fixtures', [x('which-stamp', PATHS.whichStamp, /exists but its fixtures do not/)], (d) => write(d, GENERATOR, "import { deriveStamp } from '@statespace/stamps'\nexport const derive = deriveStamp\n")],
  [
    'a GEN-which-stamp key typed as a raw output: a Z3 unsat keyed REFUTED',
    [x('which-stamp', keyAt('typed-refuted'), /parser "raw" is not accepted/)],
    whichStampFile([{ id: 'typed-refuted', run: 'RUN-z3-starter', parser: 'raw', lines: ['[1.3 guard added] unsat (0.00s) '], context: { raw: { kind: 'smt-sat', solver: { name: 'Z3', version: '5.3.1' }, model: '', replay: 'replayed', witness: { length: 1, unit: 'steps' } } }, key: 'REFUTED [R] · 1 step' }]),
  ],
  [
    'a GEN-which-stamp key whose context types part of the raw output',
    [x('which-stamp', keyAt('typed-method'), /reads no context key method/)],
    whichStampFile([{ id: 'typed-method', run: 'RUN-z3-starter', parser: 'solver', lines: ['[1.3 guard added] unsat (0.00s) '], context: { direction: 'violation', method: 'unsat · 6 checkers' }, key: 'PROVED [P] · Z3 5.3.1 unsat · 6 checkers · uncertified' }]),
  ],
  [
    "a GEN-which-stamp key read with a parser that is not its run's",
    [x('which-stamp', keyAt('wrong-parser'), /is a tlc run, which the solver parser does not read/)],
    whichStampFile([{ id: 'wrong-parser', run: 'RUN-tlc-doublespend', config: '1.8.0-default', parser: 'solver', lines: ['Error: Deadlock reached.'], context: { direction: 'violation' }, key: 'none (replay-pending)' }]),
  ],
  [
    'GEN-which-stamp fixtures that break each per-key rule, one rule each',
    WHICH_STAMP_BUNDLE.filter(([, , detail]) => detail !== null).map(([id, , detail, where]) => x('which-stamp', where ?? keyAt(id), detail)),
    whichStampFile(WHICH_STAMP_BUNDLE.map(([id, f]) => (id === '' ? f : { id, ...f }))),
  ],
  ['GEN-which-stamp fixtures under another schema, with none listed', [x('which-stamp', PATHS.whichStamp, /schema must be/), x('which-stamp', PATHS.whichStamp, /holds no fixture/)], whichStampFile([], 'statespace/which-stamp@0')],
  ['GEN-which-stamp fixtures that do not parse', [x('which-stamp', PATHS.whichStamp, /does not parse/)], (d) => write(d, PATHS.whichStamp, '{ "schema": \n')],
]
function edit(dir, rel, f) {
  const p = path.join(dir, rel)
  const before = fs.readFileSync(p, 'utf8')
  const after = f(before)
  if (after === before) throw new Error(`the plant did not change ${rel}`)
  fs.writeFileSync(p, after)
}
function write(dir, rel, text) {
  fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true })
  fs.writeFileSync(path.join(dir, rel), text)
}
function editJson(dir, rel, f) {
  const p = path.join(dir, rel)
  const before = fs.readFileSync(p, 'utf8')
  const j = JSON.parse(before)
  f(j)
  const after = `${JSON.stringify(j, null, 2)}\n`
  if (JSON.stringify(JSON.parse(after)) === JSON.stringify(JSON.parse(before))) throw new Error(`the plant did not change ${rel}`)
  fs.writeFileSync(p, after)
}

/** The expectations of a plant that a report's findings do not meet (an empty list: the plant was caught); a control (`!check`) is unmet when a finding of its check stands where it says. */
export function unmetExpectations(findings, expect) {
  const list = typeof expect === 'string' ? [x(expect)] : expect
  return list.filter(([check, where, detail]) => {
    const control = check.startsWith('!')
    const c = control ? check.slice(1) : check
    const hit = findings.some((f) => f.check === c && (where === null || (where instanceof RegExp ? where.test(f.where) : f.where === where)) && (detail === null || detail.test(String(f.detail))))
    return control ? hit : !hit
  })
}
const describe = ([check, where, detail]) => (check.startsWith('!') ? `a ${check.slice(1)} finding it must not draw at ${where}` : `no finding: ${check}${where === null ? '' : ` at ${where}`}${detail === null ? '' : ` matching ${detail}`}`)

/** Run a command, collecting its output, without blocking the other plants. */
function spawnCollect(args) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, args, { stdio: ['ignore', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (b) => (stdout += b))
    child.stderr.on('data', (b) => (stderr += b))
    child.on('close', (status) => resolve({ status, stdout, stderr }))
  })
}

/** How many plants run at once: GATE_SELF_CHECK_JOBS, or a third of the cores (at least 2, at most 6). */
const selfCheckJobs = () => Number(process.env.GATE_SELF_CHECK_JOBS) || Math.max(2, Math.min(6, Math.floor((os.availableParallelism?.() ?? os.cpus().length) / 3)))

async function selfCheck(only) {
  // the copies hold only what the gate reads, so an unplanted copy must be green, or a plant could pass for the wrong reason
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'gate-stamps-base-'))
  try {
    copyTree(REPO, base)
    const clean = await spawnCollect([SCRIPT, '--root', base, '--json'])
    if (clean.status !== 0) return [{ name: `the unplanted copy is green (it is not: ${clean.stdout.slice(0, 600)})`, checks: 'copy', caught: false, missing: [] }]
  } finally {
    fs.rmSync(base, { recursive: true, force: true })
  }
  const plants = PLANTS.filter(([name]) => only === undefined || name.includes(only))
  const results = new Array(plants.length)
  let next = 0
  const worker = async () => {
    while (next < plants.length) {
      const k = next++
      const [name, expect, plant] = plants[k]
      const checks = [...new Set((typeof expect === 'string' ? [expect] : expect.map((e) => e[0].replace(/^!/, ''))))].join('+')
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gate-stamps-self-'))
      try {
        copyTree(REPO, dir)
        plant(dir)
        const r = await spawnCollect([SCRIPT, '--root', dir, '--json'])
        let report = null
        try {
          report = JSON.parse(r.stdout)
        } catch {
          report = null
        }
        const missing = report?.findings ? unmetExpectations(report.findings, expect) : typeof expect === 'string' ? [x(expect)] : expect
        results[k] = { name, checks, caught: r.status === 1 && missing.length === 0, missing, status: r.status }
      } catch (e) {
        results[k] = { name, checks, caught: false, missing: [], error: e instanceof Error ? e.message : String(e) }
      } finally {
        fs.rmSync(dir, { recursive: true, force: true })
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(selfCheckJobs(), plants.length) }, worker))
  return results
}

// ------------------------------------------------------------------ main
async function main() {
  const argv = process.argv.slice(2)
  if (argv.includes('--help') || argv.includes('-h')) {
    const lines = fs.readFileSync(SCRIPT, 'utf8').split('\n').slice(1)
    console.log(lines.slice(0, lines.findIndex((l) => !l.startsWith('//'))).map((l) => l.replace(/^\/\/ ?/, '')).join('\n'))
    return 0
  }
  if (argv.includes('--self-check')) {
    const clean = await runGate(REPO)
    if (clean.error || clean.findings.length > 0) {
      console.error('GATE-stamps self-check: the gate must be green on the tree before faults are planted')
      return 1
    }
    const k = argv.indexOf('--only')
    const results = await selfCheck(k >= 0 ? argv[k + 1] : undefined)
    for (const r of results) {
      console.log(`${r.caught ? 'caught' : 'MISSED'}  ${r.checks.padEnd(11)} ${r.name}`)
      if (r.error) console.log(`        the plant could not be planted: ${r.error}`)
      for (const m of r.caught ? [] : r.missing) console.log(`        ${describe(m)}`)
    }
    const missed = results.filter((r) => !r.caught)
    console.log(missed.length === 0 ? `GATE-stamps self-check: all ${results.length} planted faults caught` : `GATE-stamps self-check: ${missed.length} of ${results.length} planted faults missed`)
    return missed.length === 0 ? 0 : 1
  }
  const i = argv.indexOf('--root')
  const root = i >= 0 ? path.resolve(argv[i + 1]) : REPO
  const result = await runGate(root)
  if (result.error) {
    if (argv.includes('--json')) console.log(JSON.stringify({ error: result.error }))
    else console.error(`GATE-stamps could not run: ${result.error}`)
    return 2
  }
  if (argv.includes('--json')) {
    console.log(JSON.stringify(result, null, 2))
    return result.findings.length === 0 ? 0 : 1
  }
  for (const n of result.notes) console.log(`note: ${n}`)
  if (result.findings.length === 0) {
    console.log('GATE-stamps: green (rows, derive, which-stamp, grammar, requirement, render, hand, hue, line, grayscale, tokens)')
    return 0
  }
  for (const f of result.findings) console.log(`${f.check.padEnd(11)} ${f.where}: ${f.detail}`)
  console.log(`GATE-stamps: ${result.findings.length} finding(s)`)
  return 1
}

if (process.argv[1] && path.resolve(process.argv[1]) === SCRIPT) {
  main().then(
    (code) => process.exit(code),
    (e) => {
      console.error(`GATE-stamps could not run: ${e instanceof Error ? e.stack : e}`)
      process.exit(2)
    },
  )
}
