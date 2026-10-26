// GATE-stamps' and GATE-codes' rules on small inputs, and both gates' planted-fault self-checks on the repository
// (skipped, with a note, while the repository itself is red, so a finding elsewhere is not reported twice).

import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { scanLine } from '../../ids/src/grammar.ts'
import { isErrorLine } from '../src/index.ts'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const stampsGate = await import(join(ROOT, 'scripts', 'verify-stamps.mjs'))
const codesGate = await import(join(ROOT, 'scripts', 'verify-codes.mjs'))
const numbersRules = await import(join(ROOT, 'scripts', 'runs', 'numbers-rules.mjs'))
const ts = createRequire(join(ROOT, 'package.json'))('typescript')

const findings = (text: string, learner = true): string[] =>
  codesGate.unitFindings(codesGate.maskCopy(text), { learner, evidenceKeys: ['spikes', 'a5logs', 'a2logs', 'r1m', 'RESULTS.md'], idTokens: (s: string) => scanLine(s) }).map((f: { check: string }) => f.check)

type Unit = { text: string; offset: number; lineOf: (o: number) => number; evaluated?: boolean; line?: number }
type Finding = { check: string; index: number }

/** The lines of a YAML document that GATE-codes' status check flags. */
const yamlStatusLines = (yaml: string): number[] =>
  (codesGate.documentUnits(numbersRules, yaml, 'content/stages/S1/x.yaml') as Unit[]).flatMap((u) =>
    (codesGate.unitFindings(codesGate.maskCopy(u.text), { learner: true, evidenceKeys: [], idTokens: (s: string) => scanLine(s), evaluated: u.evaluated }) as Finding[]).filter((f) => f.check === 'status').map((f) => u.lineOf(u.offset + f.index)),
  )

/** The findings GATE-codes makes in a screen's source, each as its check. */
const sourceChecks = (source: string): string[] =>
  (codesGate.sourceUnits(ts, 'apps/site/src/screens/x/X.tsx', source) as Unit[]).flatMap((u) => (codesGate.unitFindings(codesGate.maskCopy(u.text), { learner: true, evidenceKeys: [], idTokens: (s: string) => scanLine(s) }) as Finding[]).map((f) => f.check))

/** The status findings GATE-codes makes in a screen's source, as the words it flags. */
const sourceStatus = (source: string): string[] =>
  (codesGate.sourceUnits(ts, 'apps/site/src/screens/x/X.tsx', source) as Unit[]).flatMap((u) =>
    (codesGate.unitFindings(codesGate.maskCopy(u.text), { learner: true, evidenceKeys: [], idTokens: (s: string) => scanLine(s) }) as Finding[]).filter((f) => f.check === 'status').map((f) => u.text.slice(f.index).split(/\W/)[0] ?? ''),
  )

test('GATE-codes: the allow-list passes the stamp codes and the tags, and nothing else', () => {
  assert.deepEqual(findings('PROVED [P] · Z3 5.3.1 unsat · uncertified [X RUN-z3-starter].'), [])
  assert.deepEqual(findings('Measured [X RUN-a, RUN-b#values.n] and [X spikes]; checked [V], [V cheerpj], [D], [D: a rule], [U], [KS].'), [])
  assert.deepEqual(findings('Each stamp: [P] [M] [T] [E] [C] [A] [?] [N] [R].'), [])
  assert.deepEqual(findings('It came back [OK].'), ['code'])
  assert.deepEqual(findings('Each is [X].'), ['code'])
  assert.deepEqual(findings('The [PROVED] label.'), ['code'])
  assert.deepEqual(findings('The [CPU 1.25] column.'), ['code'])
})

test('GATE-codes: IDs are never bracketed, though a link, code and an index expression are not brackets', () => {
  assert.deepEqual(findings('The claim [CL-6.4] is enforced.'), ['id'])
  assert.deepEqual(findings('It rests on [SEAM-1: balances are unbounded integers].'), ['id'])
  assert.deepEqual(findings('See [CL-6.4](claims.md) and [S2](../curriculum/S02-proof.md).'), [])
  assert.deepEqual(findings('Write `[CL-6.4]` to show a bad form, and `[C]` for the code.'), [])
  assert.deepEqual(findings('The sums c[A] + c[B] and x[N].'), [])
  assert.deepEqual(findings('CL-6.4 carries [E] and [C].'), [])
})

test('GATE-codes: every rule reads a one-word string in a screen, and an object value or a JSX child is copy', () => {
  assert.deepEqual(sourceChecks("export const X = () => <p>{'[OK]'}</p>\n"), ['code'])
  assert.deepEqual(sourceChecks("export const X = () => <p>{'[CL-1.1]'}</p>\n"), ['id'])
  assert.deepEqual(sourceChecks("const BADGE = { pass: '[PASS]', fail: 'refuted' } as const\nexport const X = ({ s }: { s: 'pass' | 'fail' }) => <span>{BADGE[s]}</span>\n"), ['code'])
  assert.deepEqual(sourceChecks("export const X = () => <p>{'PROVED[M]'}</p>\n"), ['pair'])
  // codes on the allow-list, tags, a selector, a regular expression's class, a name and a console log are fine
  assert.deepEqual(sourceChecks("export const a = '[P]'\nexport const b = '[?]'\nexport const q = (r: Element) => r.querySelector('[data-code]')\nexport const re = new RegExp('[A-Z]')\nexport const k = { '[OK]': 1 }\nconsole.error('[Z3] the worker stopped; cache verified')\n"), [])
})

test('GATE-codes: the apps\' pages are copy: their text and the attributes read aloud', () => {
  const units = codesGate.markupUnits('<!doctype html>\n<html lang="en">\n<head>\n<meta name="description" content="A course. Your claim is verified." />\n<meta name="viewport" content="width=device-width, initial-scale=1" />\n<title>statespace</title>\n<style>.x { content: "[OK]" }</style>\n</head>\n<body><p>Your <b>transfer</b> is safe.</p><img alt="[OK] badge" src="x.png"><!-- [PASS] --><script>const x = "[FAIL]"</script></body>\n</html>\n') as { text: string; line: number }[]
  const texts = units.map((u) => u.text.trim())
  assert.ok(texts.includes('A course. Your claim is verified.') && texts.includes('statespace') && texts.includes('[OK] badge') && texts.includes('is safe.'), JSON.stringify(texts))
  assert.ok(!texts.some((t) => /width=device-width|\[PASS\]|\[FAIL\]|content:/.test(t)), JSON.stringify(texts))
  assert.equal(units.find((u) => u.text.includes('verified'))?.line, 4)
})

test('GATE-codes: "proven" and "guaranteed" are status words too (DESIGN.md section 11.2)', () => {
  assert.deepEqual(findings('The guard is proven.'), ['status'])
  assert.deepEqual(findings('The balance is guaranteed.'), ['status'])
  assert.deepEqual(findings('PROVED [P] · Lean 4.35.0 kernel · axioms listed: proven for this statement only.'), [])
  assert.deepEqual(findings('The agent wrote “proven and guaranteed”.'), [])
  assert.deepEqual(sourceStatus("export const label = (ok: boolean) => (ok ? 'Proven' : 'open')\n"), ['Proven'])
})

test('GATE-codes: a stamp word goes with its own code, bracketed; erosion and learner states are never stamps', () => {
  assert.deepEqual(findings('PROVED P · Z3 unsat'), ['pair'])
  assert.deepEqual(findings('PROVED (P) · Z3 unsat'), ['pair'])
  assert.deepEqual(findings('PROVED [M] · constants'), ['pair'])
  assert.deepEqual(findings('NOT COVERED [N] · the recipient; MODEL-CHECKED [M] · N = 3 · complete'), [])
  assert.deepEqual(findings('The strip shows EROSION [R].'), ['pair'])
  assert.deepEqual(findings('You are signed off [T] here.'), ['state'])
  assert.deepEqual(findings('SETTLED [T] · 1 probe'), ['state'])
  assert.deepEqual(findings('Signed off is a learner state drawn in ink.'), [])
  assert.deepEqual(findings('A KC is settled [D] after a fresh probe at 30 days.'), [])
})

test('GATE-codes: no bare "verified", "correct" or "safe" in learner copy', () => {
  assert.deepEqual(findings('Your transfer is verified.'), ['status'])
  assert.deepEqual(findings('Correct! Well done.'), ['status'])
  assert.deepEqual(findings('This code is safe.'), ['status'])
  assert.deepEqual(findings('Option A, "The transfer is safe for all inputs.", is the misconception.'), [])
  assert.deepEqual(findings('The agent wrote “verified and correct”.'), [])
  assert.deepEqual(findings('PROVED [P] · Z3 5.3.1 unsat · uncertified: safe for this encoding only.'), [])
  assert.deepEqual(findings('Claims stay unverified since the night; correctness and safety are properties.'), [])
  assert.deepEqual(findings('LAB-2, the verified ledger.'), [])
  assert.deepEqual(findings('Your transfer is verified.', false), [], 'documents may discuss the words; only learner copy is held to them')
})

test('GATE-codes: in YAML a statement under evaluation is the value of a key that holds one; every other value is copy, quoted or not', () => {
  const yaml = [
    'claim: "unsat, therefore safe."', // 1, an audit case's claim: exempt
    'choice:',
    '  prompt: "Which reading holds?"',
    '  options:',
    '    - id: a',
    '      text: "The transfer is safe."', // 6, an option's text: exempt
    '      why: "Correct: the guard holds."', // 7, its feedback: copy
    '    - "It is verified for all inputs."', // 8, an option: exempt
    'feedback: "Correct, well done. Your transfer is verified."', // 9, copy, twice
    'quote: "safe for this encoding only"', // 10: exempt
    'agent: Proved and verified.', // 11, an agent's words: exempt
    'why: |',
    '  Safe: yes.', // 13, inside a block scalar: copy, never a key
    'note: The option "unsat, therefore safe" confuses the two.', // 14, quoted inside plain copy: exempt
    "single: 'It''s verified'", // 15: copy
    'list: ["Correct!", "fine"]', // 16: copy
    'options: ["The transfer is safe", "It is verified"]', // 17: exempt
  ].join('\n')
  assert.deepEqual(yamlStatusLines(yaml), [7, 9, 9, 13, 15, 16])
})

test('GATE-codes: a one-word string in a screen is copy where it can reach the screen as a word, and not as an identifier', () => {
  assert.deepEqual(sourceStatus("const label = 'Verified'\nexport const X = () => <p>{label}</p>\n"), ['Verified'])
  assert.deepEqual(sourceStatus("export const X = ({ ok }: { ok: boolean }) => <p>{ok ? 'correct' : 'wrong'}</p>\n"), ['correct'])
  assert.deepEqual(sourceStatus('export const X = () => <button aria-label="Verified">ok</button>\n'), ['Verified'])
  assert.deepEqual(sourceStatus("export const X = () => <p>{'Correct!'}</p>\n"), ['Correct'])
  assert.deepEqual(sourceStatus('export const t = `Verified ${1}`\n'), ['Verified'])
  assert.deepEqual(sourceStatus("export const X = ({ ok }: { ok: boolean }) => { const r = ok ? 'correct' : 'wrong'; return <p>{r}</p> }\n"), ['correct'])
  assert.deepEqual(sourceStatus("const status = 'verified'\nexport const X = () => <span title={status}>x</span>\n"), ['verified'])
  // names: a literal type, a comparison, a case label, a key, an element access, a class name, a kebab-case name, a CSS env() name
  const names = [
    "type Outcome = 'correct' | 'wrong'",
    "export const f = (o: string) => o === 'correct'",
    "export function g(o: string) { switch (o) { case 'safe': return 1 } return 0 }",
    "export const m = { correct: 1, 'verified': 2 }",
    "export const h = (r: Record<string, number>) => r['safe']",
    'export const X = () => <p className="safe">ok</p>',
    'export const Y = ({ id }: { id: string }) => <p className={`${id}-verified`} data-testid="is-verified">ok</p>',
    "export const pad = { paddingBottom: 'env(safe-area-inset-bottom)' }",
  ]
  for (const s of names) assert.deepEqual(sourceStatus(`${s}\n`), [], s)
})

test("GATE-codes: verified, correct and safe are never a screen's string values, and a template or a + chain is read whole", () => {
  // four ways a value reaches the screen: an object's value rendered by key, a template, a concatenation, a function's return value
  assert.deepEqual(sourceStatus("const LABEL = { pass: 'verified', fail: 'refuted' } as const\nexport const X = ({ s }: { s: 'pass' | 'fail' }) => <span>{LABEL[s]}</span>\n"), ['verified'])
  assert.deepEqual(sourceStatus('export const X = ({ claim }: { claim: string }) => <p>{`${claim} verified`}</p>\n'), ['verified'])
  assert.deepEqual(sourceStatus("export const X = () => <p>{'Your claim is ' + 'verified'}</p>\n"), ['verified'])
  assert.deepEqual(sourceStatus("function label(ok: boolean) { return ok ? 'verified' : 'refuted' }\nexport const X = ({ ok }: { ok: boolean }) => <p>{label(ok)}</p>\n"), ['verified'])
  // an enum value is a value too, whether or not this file renders it
  assert.deepEqual(sourceStatus("export const state = { outcome: 'correct' as const }\n"), ['correct'])
  assert.deepEqual(sourceStatus("export const set = (f: (o: string) => void) => f('SAFE')\n"), ['SAFE'])
  // a substitution inside a template is read for strings of its own
  assert.deepEqual(sourceStatus("export const t = (ok: boolean) => `${ok ? 'correct' : 'wrong'}!`\n"), ['correct'])
})

test('GATE-stamps: CSS rules, frames and grayscale signatures', () => {
  const css = '.stamp-x .stamp-frame { border-top-style: dashed; }\n@media (forced-colors: active) { .stamp-p .stamp-frame { border-top-width: 4px; } }\n.a, .b { color: var(--st-p-fill); }'
  const rules = stampsGate.parseCss(css)
  assert.equal(rules.length, 3)
  assert.deepEqual(rules[1].at, ['@media (forced-colors: active)'])
  assert.deepEqual(rules[2].selectors, ['.a', '.b'])
  const sheet = stampsGate.parseHex('#FAFBF8')
  assert.equal(stampsGate.signatureOf({ sides: ['none', 'none', 'none', 'none'], ring: 'none', hatch: false, fill: '#1D3F8F' }, sheet), 'none none none none | ring none | flat | fill solid')
  assert.equal(stampsGate.signatureOf({ sides: ['solid:2', 'solid:2', 'solid:2', 'solid:2'], ring: 'none', hatch: true, fill: '#FAFBF8' }, sheet), 'solid:2 solid:2 solid:2 solid:2 | ring none | hatch | fill none')
})

test("GATE-stamps: contrast reproduces DESIGN.md's computed values [D]", () => {
  const c = (a: string, b: string): number => Number(stampsGate.contrast(stampsGate.parseHex(a), stampsGate.parseHex(b)).toFixed(2))
  assert.equal(c('#1C211E', '#F1F3EF'), 14.63) // ink on ground
  assert.equal(c('#FFFFFF', '#C2410C'), 5.18) // light [R], the lowest text pair
  assert.equal(c('#7A837B', '#F1F3EF'), 3.51) // the component rule on vellum
  assert.equal(c('#DADBD5', '#2A2C29'), 10.11) // night [?] on its nearer stripe
  const p = stampsGate.parseHex('#1D3F8F')
  const r = stampsGate.parseHex('#C2410C')
  assert.ok(Math.min(...['protanopia', 'deuteranopia', 'tritanopia'].map((k) => stampsGate.deltaE(stampsGate.simulate(p, k), stampsGate.simulate(r, k)))) >= 92, '[P] against [R] in light keeps ΔE76 ≥ 92 under every simulation')
})

test('GATE-stamps: only the modelled rules draw a frame, in longhand', () => {
  const STAMP_CSS = 'apps/site/src/components/stamp/stamp.css'
  const problems = (css: string, rel = STAMP_CSS): string[] => stampsGate.frameShapeProblems(rel, stampsGate.parseCss(css)).map((p: { where: string }) => p.where.replace(/^.*:/, 'x.css:'))
  // the modelled rules, in longhand, with radius and offset, are fine; so is a reset on the button or a colour on the badge
  assert.deepEqual(problems('.stamp-frame { border-top-style: none; border-radius: 0; }\n.stamp-a .stamp-frame { border-top-style: dashed; border-color: #000; color: #111; }\n@media (forced-colors: active) { .stamp-p .stamp-frame { border-top-width: 4px; } }\n.stamp-r .stamp-frame { outline-style: solid; outline-offset: 2px; }\n.stamp-button { border: 0; background: none; }\n.lane-badge { color: #222; }\n.stamp-landing .stamp-frame { animation: x 1s; }'), [])
  // the same modelled rule outside stamp.css is not read, so it may not draw
  assert.deepEqual(problems('.stamp-t .stamp-frame { border-top-style: dotted; }', 'apps/site/src/screens/x/x.css'), ['x.css:1'])
  // a shorthand on a modelled rule
  assert.deepEqual(problems('.stamp-a .stamp-frame {\n  border: 2px solid #000;\n}'), ['x.css:2'])
  // a rule the frames are not read from: a compound selector, a grouped selector, another media query, a part of the frame, the box
  assert.deepEqual(problems('.stamp.stamp-a .stamp-frame { border-top-style: solid; }'), ['x.css:1'])
  assert.deepEqual(problems('.stamp-a .stamp-frame, .stamp-t .stamp-frame { border-top-style: solid; }'), ['x.css:1'])
  assert.deepEqual(problems('@media (prefers-color-scheme: dark) { .stamp-a .stamp-frame { border-top-style: solid; } }'), ['x.css:1'])
  assert.deepEqual(problems('.stamp-word { background-color: #000; }'), ['x.css:1'])
  assert.deepEqual(problems('.strip .stamp { box-shadow: 0 0 0 2px #000; }'), ['x.css:1'])
  assert.deepEqual(problems('.strip .stamp-frame { color: #f00; }'), ['x.css:1'])
  // a longhand framesOf does not read, on a modelled rule
  assert.deepEqual(problems('.stamp-t .stamp-frame { border-top-color: transparent; }'), ['x.css:1'])
})

test("GATE-stamps: a rule reaches a stamp's elements by type, attribute or universal selector too, and ancestors never rule it out", () => {
  const screen = 'apps/site/src/screens/x/x.css'
  const problems = (css: string): number => stampsGate.frameShapeProblems(screen, stampsGate.parseCss(css)).length
  // four rules that reached a frame before the lint read selectors by type, attribute and universal: a box, a ring, a box, a ring
  assert.equal(problems('.claim-card span { border-top-style: solid; border-top-width: 2px; }'), 2)
  assert.equal(problems('[aria-hidden="true"] { outline-style: solid; outline-width: 3px; outline-offset: 2px; }'), 3)
  assert.equal(problems('.card * { border: 2px solid currentColor; }'), 1)
  assert.equal(problems('.card span { box-shadow: 0 0 0 2px currentColor; }'), 1)
  // functional pseudo-classes, a class attribute test, a pseudo-element box, a fade, a filter, a ring on the button
  for (const css of ['.card :is(span, div) { outline: 2px solid; }', 'span:not(.x) { border: 1px solid; }', '[class*="stamp-"] { background-color: #000; }', '.card span::before { border: 2px solid; }', '.card span { opacity: 0.4; }', 'svg { filter: contrast(0.2); }', 'button { border: 2px solid; }', '[aria-expanded="true"] { outline: 2px solid; }', '.claim-card .card span { all: unset; }', '.card span { clip-path: inset(2px); }', '.stamp { forced-color-adjust: none; }', '.card span { -webkit-text-fill-color: #ccc; }']) assert.ok(problems(css) > 0, css)
  // rules that cannot select a stamp's element, or draw nothing on it: other types, a focus ring, a selection, resets around the frame
  for (const css of ['body { background: #fff; } a { color: blue; } .shell-head { border-bottom: 1px solid; }', ':where(h1, h2) { border-bottom: 1px solid; }', ':focus-visible { outline: 2px solid; }', 'span::selection { background: yellow; }', 'button { border: 0; background: none; }', '.visually-hidden { border: 0; }', 'span.highlight { border: 1px solid; }', '.visually-hidden { clip-path: inset(50%); border: 0; }', '.stamp { forced-color-adjust: auto; }']) assert.equal(problems(css), 0, css)
  // the subject compound, outside brackets, parentheses and quotes
  assert.equal(stampsGate.subjectOf('.a > .b [data-x="c d"]'), '[data-x="c d"]')
  assert.equal(stampsGate.subjectOf('.card :is(.a .b, span)'), ':is(.a .b, span)')
  assert.ok(stampsGate.isReset('border', '0 none') && stampsGate.isReset('opacity', '1') && !stampsGate.isReset('border', '0 solid red'))
})

test("GATE-stamps: outside stamp.css a rule may only place a stamp's frame and words, and lay out or reset what stands around them", () => {
  const screen = 'apps/site/src/screens/x/x.css'
  const problems = (css: string): number => stampsGate.frameShapeProblems(screen, stampsGate.parseCss(css)).length
  // hiding the word, hiding every span, restyling the words' face, size or case, replacing their content, a fade
  // around them, a strike-through or a shadow they would inherit, a transform that shrinks the stamp, a clip
  for (const css of ['.claim-card .stamp-word { display: none; }', '.claim-card span { visibility: hidden; }', '.card span { font-weight: 600; }', '.card span { font-size: 6px; }', '.card span { text-transform: lowercase; }', '.card .stamp-code::before { content: "[R]"; }', '.stamp::after { content: "✓"; }', '.card .stamp { text-decoration: line-through; }', '.card .stamp { text-shadow: 0 0 2px red; }', '.card .stamp { transform: scale(0.2); }', '.card .stamp { overflow: hidden; }', '.card .stamp { display: none; }', '.card .lane-badge { visibility: hidden; }', '* { padding: 0; }']) assert.ok(problems(css) > 0, css)
  // placing them: margins, alignment, wrapping, a box-sizing reset, a transition, laying out the box, a reset
  for (const css of ['*, *::before, *::after { box-sizing: border-box; }', '.claim-card .stamp { margin-inline-start: auto; align-self: center; }', '.card span { overflow-wrap: anywhere; }', '.card .stamp { display: block; max-width: 100%; padding: 0 4px; }', '.card .stamp { visibility: visible; transform: none; }', '.card button { cursor: pointer; transition: none; }']) assert.equal(problems(css), 0, css)
  // display is layout, never a reset: display: none hides; visibility: visible is a reset
  assert.ok(!stampsGate.isReset('display', 'none') && stampsGate.isReset('visibility', 'visible') && !stampsGate.isReset('visibility', 'hidden'))
})

test('GATE-stamps: the tokens a stamp is drawn with are defined only in tokens.css\'s :root blocks', () => {
  const tokens = new Set(['--st-p-fill', '--sheet', '--fs-stamp'])
  const problems = (rel: string, css: string): number => stampsGate.frameTokenProblems(rel, stampsGate.parseCss(css), tokens).length
  assert.equal(problems('apps/site/src/screens/x/x.css', '.claim-card { --st-p-fill: #fff; }'), 1)
  assert.equal(problems('apps/site/src/screens/x/x.css', '.compact { --fs-stamp: 9px; --space-1: 2px; }'), 1)
  assert.equal(problems('apps/site/src/screens/x/x.css', ':root { --sheet: #000; }'), 1, "another file's :root")
  assert.equal(problems('apps/site/src/styles/tokens.css', ':root { --sheet: #fff; }\n:root[data-theme="night"] { --sheet: #1a1d1a; }\n@media (min-width: 900px) { :root { --fs-stamp: 13px; } }'), 0)
  assert.equal(problems('apps/site/src/styles/tokens.css', '.card { --sheet: #000; }'), 1)
  // the token set follows stamp.css's rules on a stamp's elements and the tokens those are defined with
  const set = stampsGate.frameTokensOf('.stamp-p .stamp-frame { color: var(--st-p-text); background-color: var(--st-p-fill); padding-top: var(--pad); }\n.derivation-note { color: var(--ink); }', [{ '--st-p-fill': 'var(--blue)', '--blue': '#1D3F8F' }])
  assert.deepEqual([...set].sort(), ['--blue', '--st-p-fill', '--st-p-text'])
})

test('GATE-stamps: CSS a script holds as text is read as a stylesheet', () => {
  const sheets = stampsGate.scriptStyleSheets('apps/site/src/screens/x/sheet.ts', "const s = new CSSStyleSheet()\ns.replaceSync('.claim-card span { border-top-style: solid }')\nconst t = `.card ${'x'} span { outline: 2px solid }`\nconst json = '{\"a\": 1}'\nconst msg = 'Ratio: 2 { see below }'\n")
  assert.deepEqual(sheets.map((x: { css: string; lineOffset: number }) => x.lineOffset), [1, 2])
  assert.ok(stampsGate.looksLikeCss('.a span { border: 0 }') && stampsGate.looksLikeCss(':is(.a, span) { color: red }') && !stampsGate.looksLikeCss('{"a": 1}') && !stampsGate.looksLikeCss('query { user { id } }') && !stampsGate.looksLikeCss('style = { color: red }'))
  // a selector list splits at its top-level commas only, and text not shaped like a selector selects nothing
  assert.deepEqual(stampsGate.parseCss(':is(.a, span), .b { color: red }')[0].selectors, [':is(.a, span)', '.b'])
  assert.equal(stampsGate.mayMatch('=', { tag: 'span', classes: [], attrs: {} }), false)
})

test('GATE-stamps: a colour literal is read in every CSS syntax before it is compared with the stamp hues', () => {
  const n = (c: string): string | null => stampsGate.normalizeColour(c)
  for (const c of ['#1D3F8F', '#1d3f8f80', 'rgb(29, 63, 143)', 'rgb(29 63 143)', 'rgba(29,63,143,.5)', 'rgb(29 63 143 / 50%)', 'rgb(11.37% 24.7% 56.08%)', 'hwb(222.4 11.4% 43.9%)', 'color(srgb 0.1137 0.2471 0.5608)', 'oklch(39.36% 0.1387 263.8)']) assert.equal(n(c), '#1d3f8f', c)
  // CSS Color 4's own example: lab(29.2345% 39.3825 20.0664) is rgb(125 35 41), in every space that can say it
  for (const c of ['lab(29.2345% 39.3825 20.0664)', 'oklch(40.101% 0.12332 21.555)', 'oklab(40.101% 0.1147 0.0453)', 'color(srgb-linear 0.2051 0.0168 0.0222)']) assert.equal(n(c), '#7d2329', c)
  assert.equal(n('#abc'), '#aabbcc')
  assert.equal(n('var(--x)'), null)
  // hsl rounds to one off in a channel, which is why hues are compared within ΔE76 3
  const hsl = stampsGate.parseHex(n('hsl(222.4 66.3% 33.7%)'))
  assert.ok(stampsGate.deltaE(hsl, stampsGate.parseHex('#1D3F8F')) <= stampsGate.SAME_HUE_DELTA_E)
  assert.deepEqual(stampsGate.coloursIn("c.fillStyle = '#C2410C'; x = 'rgb(194 65 12 / 0.5)'; #abcdefgh"), ['#c2410c', '#c2410c'])
})

test('GATE-stamps: requirement fit is never [P] in learner copy, and only a negation beside the mark exempts it', () => {
  const lines = (rel: string, text: string): string[] => stampsGate.requirementCopyProblems(rel, text, codesGate).map((p: { where: string }) => p.where)
  // four placements: beside an unrelated "no", after the label's own line, in a table column, under a YAML key
  assert.deepEqual(lines('c.md', 'No doubt about it. Requirement fit: PROVED [P] · Z3 5.3.1 unsat · uncertified'), ['c.md:1'])
  assert.deepEqual(lines('c.md', 'Requirement fit:\n\nPROVED [P] · Z3 5.3.1 unsat · uncertified'), ['c.md:3'])
  assert.deepEqual(lines('c.md', '## Requirement fit\n\nThe segment reads\nPROVED [P] · Z3 5.3.1 unsat.\n\nPROVED [P] in another paragraph.'), ['c.md:4'])
  assert.deepEqual(lines('c.md', '| Claim | Requirement fit | Note |\n|---|---|---|\n| CL-1.1 | PROVED [P] · Z3 5.3.1 unsat | no |\n| CL-1.2 | ASSUMED [A] · the pool | PROVED [P] elsewhere |'), ['c.md:3'])
  assert.deepEqual(lines('c.yaml', 'requirement: PROVED [P] · Z3 5.3.1 unsat · uncertified\n'), ['c.yaml:1'])
  assert.deepEqual(lines('c.yaml', 'requirement:\n  text: |\n    The transfer is PROVED [P].\n'), ['c.yaml:3'])
  assert.deepEqual(lines('c.json', '{"requirement_fit": {"stamp": "[P] · Z3 5.3.1 unsat"}}'), ['c.json $.requirement_fit.stamp'])
  // the rule stated beside its mark, a quoted statement under evaluation, an option, and the proposition's own [P]
  for (const [rel, text] of [
    ['c.md', 'Requirement fit is never [P].'],
    ['c.md', 'A requirement-fit that is never a PROVED [P] stamp.'],
    ['c.md', 'Requirement fit: [P] is never its stamp.'],
    ['c.md', 'The option "Requirement fit: PROVED [P]" is the misconception.'],
    ['c.yaml', 'options:\n  - text: "Requirement fit: PROVED [P]"\n'],
    ['c.md', 'Proposition: PROVED [P] · Z3 5.3.1 unsat.\n\nRequirement fit: ASSUMED [A] · the pool is the whole system.'],
  ]) assert.deepEqual(lines(rel as string, text as string), [], text)
  assert.deepEqual(stampsGate.governedPMarks('never PROVED [P]'), [])
})

test("GATE-stamps: GEN-which-stamp's keys are checked against the deriver on W1-T26's fixtures", () => {
  const dir = mkdtempSync(join(tmpdir(), 'which-stamp-'))
  try {
    stampsGate.copyTree(ROOT, dir)
    // TLC 1.8.0's default-flags configuration; 1.7.4 prints the same two lines, so the fixture names the one it quotes
    const fixture = (key: string) => ({ id: 't1-doublespend-deadlock', run: 'RUN-tlc-doublespend', config: '1.8.0-default', parser: 'tlc', lines: ['Error: Deadlock reached.', '11 states generated, 10 distinct states found, 3 states left on queue.'], key })
    const run = (fixtures: unknown[]): { status: number | null; report: { findings?: { check: string; detail: string }[]; notes?: string[] } } => {
      mkdirSync(join(dir, 'content/generators/GEN-which-stamp'), { recursive: true })
      writeFileSync(join(dir, 'content/generators/GEN-which-stamp/fixtures.json'), JSON.stringify({ schema: 'statespace/which-stamp-fixtures@1', fixtures }))
      const r = spawnSync(process.execPath, [join(ROOT, 'scripts', 'verify-stamps.mjs'), '--root', dir, '--json'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
      return { status: r.status, report: JSON.parse(r.stdout) }
    }
    // the key in either form, word first or code first, agrees
    for (const key of ['[?] · stopped at deadlock, 10 distinct states', 'UNKNOWN [?] · stopped at deadlock, 10 distinct states']) {
      const ok = run([fixture(key)])
      assert.equal(ok.status, 0, JSON.stringify(ok.report.findings))
      assert.ok(ok.report.notes?.includes('GEN-which-stamp: 1 of 1 keys agree with the deriver on their recorded outputs'))
    }
    // a distractor typed as the key, and a key with no recorded output behind it
    const bad = run([fixture('[M] · bound · partial'), { id: 'typed', key: '[P] · TLC 1.8.0' }])
    assert.equal(bad.status, 1)
    const details = bad.report.findings?.filter((f) => f.check === 'which-stamp').map((f) => f.detail) ?? []
    assert.equal(details.length, 2, JSON.stringify(details))
    assert.match(details[0] ?? '', /^the key "\[M\] · bound · partial" is not what the deriver gives these lines: "UNKNOWN \[\?\] · stopped at deadlock, 10 distinct states"/)
    assert.match(details[1] ?? '', /^names no run: every key comes from a recorded output/)
    // a raw output typed by hand (a Z3 unsat keyed REFUTED), a context key that types part of the output, a parser
    // that is not the run's, and a trace counted twice under two configuration names
    const z3Line = '[1.3 guard added] unsat (0.00s) '
    const typed = run([
      { id: 'raw', run: 'RUN-z3-starter', parser: 'raw', lines: [z3Line], context: { raw: { kind: 'smt-sat', solver: { name: 'Z3', version: '5.3.1' }, model: '', replay: 'replayed', witness: { length: 1, unit: 'steps' } } }, key: 'REFUTED [R] · 1 step' },
      { id: 'method', run: 'RUN-z3-starter', parser: 'solver', lines: [z3Line], context: { direction: 'violation', method: 'unsat · 6 checkers' }, key: 'PROVED [P] · Z3 5.3.1 unsat · 6 checkers · uncertified' },
      { id: 'family', run: 'RUN-tlc-doublespend', config: '1.8.0-default', parser: 'solver', lines: ['Error: Deadlock reached.'], context: { direction: 'violation' }, key: 'none (replay-pending)' },
      { id: 'twice', run: 'RUN-tlc-tracemodule', parser: 'trace', lines: ['<<"trace-validation", [diameter |-> 15, verdict |-> "accepted", lines |-> 11, matched |-> 11, first_unmatched |-> 0, end_record |-> TRUE, paper_accepted |-> FALSE]>>', '<<"trace-validation", [diameter |-> 15, verdict |-> "accepted", lines |-> 11, matched |-> 11, first_unmatched |-> 0, end_record |-> TRUE, paper_accepted |-> FALSE]>>'], context: { traces: ['accepted', 'accepted-dfs'], property: 'safety' }, key: 'TESTED [T] · 2 seeds · TLC 1.8.0 trace validation' },
      { id: 'right', run: 'RUN-z3-starter', parser: 'solver', lines: [z3Line], context: { direction: 'violation' }, key: '[P] · Z3 5.3.1 unsat · uncertified' },
    ])
    assert.equal(typed.status, 1)
    const why = (id: string): string => typed.report.findings?.filter((f) => f.check === 'which-stamp' && f.detail !== undefined && (f as { where?: string }).where?.endsWith(` ${id}`)).map((f) => f.detail).join(' | ') ?? ''
    assert.match(why('raw'), /parser "raw" is not accepted/)
    assert.match(why('method'), /reads no context key method/)
    assert.match(why('family'), /the 1\.8\.0-default configuration of RUN-tlc-doublespend is a tlc run, which the solver parser does not read/)
    assert.match(why('twice'), /accepted-dfs and accepted are the same trace/)
    assert.equal(why('right'), '')
    assert.ok(typed.report.notes?.includes('GEN-which-stamp: 1 of 5 keys agree with the deriver on their recorded outputs'), JSON.stringify(typed.report.notes))
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('GATE-stamps: a stamp is typed by hand whether its word comes first or its code does', () => {
  for (const t of ['PROVED [P] · Z3 5.3.1 unsat', '[P] · Z3 5.3.1 unsat · uncertified', '[?] · canceled at rlimit 5e6', '[R]·1 step', 'PROVED[P]']) assert.ok(stampsGate.typedStamp(t), t)
  for (const t of ['Each stamp: [P] [M] [T]', 'c[A] + c[B]', 'the [P] stamp', '[X RUN-z3-starter] · 2 runs']) assert.ok(!stampsGate.typedStamp(t), t)
  for (const c of ['stamp', 'stamp-frame', 'stamp-p', 'stamp-word', 'lane-badge']) assert.ok(stampsGate.STAMP_CLASS.test(c), c)
  for (const c of ['stamped', 'stamp-list', 'strip', 'derivation']) assert.ok(!stampsGate.STAMP_CLASS.test(c), c)
})

test('GATE-stamps: a stamp copied and changed is a stamp built by hand, while a context or an error object spread with a lane, a source or a code is not', () => {
  const dir = mkdtempSync(join(tmpdir(), 'hand-'))
  try {
    const at = 'apps/site/src/screens/x'
    mkdirSync(join(dir, at), { recursive: true })
    const lines = [
      "export const A = ({ stamp }: { stamp: StampData }) => <Stamp stamp={{ ...stamp, qualifier: stamp.qualifier.slice(0, 1) }} />",
      "export const B = ({ s }: { s: StampData }) => <Stamp stamp={{ ...s, lane: 'rechecked-here' }} />",
      "export const c = (s: Stamp): Stamp => ({ ...s, defeaters: [] })",
      "export const d = (d: { stamp: object }) => ({ ...d.stamp, source: 'receipts/other.json' })",
      "export const e = (s: object) => stampText({ ...s, word: 'REFUTED' })",
      "export const f = (stamp: object) => Object.assign({}, stamp, { lane: 'rechecked-here' })",
      "export const g: Stamp = JSON.parse('{}')",
      "export const h = (raw: RawOutput, ctx: StampContext) => deriveStamp(raw, { ...ctx, lane: 'rechecked-here' })",
      "export const i = (err: object) => ({ ...err, code: 'E_TIMEOUT', source: 'bus' })",
    ]
    writeFileSync(join(dir, at, 'X.tsx'), `${lines.join('\n')}\n`)
    writeFileSync(join(dir, at, 'alias.ts'), "import type { Stamp as StampData } from '@statespace/stamps'\nexport const r = (s: StampData): StampData => ({ ...s, row: 'smt-sat' })\nexport const c = {} as StampData\nexport const k = (s: StampData) => s.code as StampData['code']\n")
    const where = (stampsGate.handCheck(dir) as { where: string }[]).map((p) => p.where).sort()
    assert.deepEqual(where, [...[1, 2, 3, 4, 5, 6, 7].map((n) => `${at}/X.tsx:${n}`), `${at}/alias.ts:2`, `${at}/alias.ts:3`].sort())
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test("GATE-stamps: a copy of what the compiler types as a Stamp is a stamp changed, whatever its names; so is a copy handed to a text function, or any copy in a file no compiler checks", () => {
  const dir = mkdtempSync(join(tmpdir(), 'hand-types-'))
  try {
    const at = 'apps/site/src/screens/x'
    mkdirSync(join(dir, at), { recursive: true })
    // the package's source, so that the compiler resolves @statespace/stamps under the root as the gate's copies do
    cpSync(join(ROOT, 'packages/stamps/src'), join(dir, 'packages/stamps/src'), { recursive: true })
    const lines = [
      "import type { Stamp as Item, Derivation, StampContext } from '@statespace/stamps'",
      "export const a = (ds: readonly Derivation[]) => ds.flatMap((d) => (d.kind === 'stamp' ? [d.stamp] : [])).map((s) => Object.assign({}, s, { lane: 'rechecked-here' }))",
      "export const b = (x: { item?: Item }) => ({ ...x.item, row: 'smt-sat' })",
      "export const c = (items: readonly Item[]) => Object.assign({}, items[0], { source: 'x' })",
      "export const d = (s: any, w: string) => stampText({ ...s, code: w })",
      // left alone: an error given a code, a context, a derivation, and a value typed any
      "export const e = (err: Error) => Object.assign(err, { code: 'E_TIMEOUT' })",
      "export const f = (ctx: StampContext) => ({ ...ctx, lane: 'rechecked-here' as const })",
      "export const g = (d: Derivation) => ({ ...d, source: 'x' })",
      "export const h = () => Object.assign(new Error('timeout'), { code: 'E_TIMEOUT' })",
    ]
    writeFileSync(join(dir, at, 'X.ts'), `${lines.join('\n')}\n`)
    writeFileSync(join(dir, at, 'Y.jsx'), "export const relabel = (s) => ({ ...s, lane: 'rechecked-here' })\nexport const fresh = () => Object.assign({}, { lane: 'reported' })\n")
    const where = (stampsGate.handCheck(dir) as { where: string }[]).map((p) => p.where).sort()
    assert.deepEqual(where, [`${at}/X.ts:2`, `${at}/X.ts:3`, `${at}/X.ts:4`, `${at}/X.ts:5`, `${at}/Y.jsx:1`].sort())
    // the compiler is asked only about copies the names and places leave undecided, and answers each
    const src = readFileSync(join(dir, at, 'X.ts'), 'utf8')
    // the expression `name` that stands right after `before` in the file
    const ask = (before: string, name: string) => {
      const start = src.indexOf(before) + before.length
      assert.ok(src.indexOf(before) >= 0 && src.slice(start, start + name.length) === name, `${before}${name}`)
      return { rel: `${at}/X.ts`, start, end: start + name.length }
    }
    assert.deepEqual(stampsGate.typedAsStamp(dir, [ask('({ ...', 'x.item'), ask('readonly Item[]) => Object.assign({}, ', 'items[0]'), ask('(err: Error) => Object.assign(', 'err'), ask('(d: Derivation) => ({ ...', 'd')]), [true, true, false, false])
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('GATE-stamps: a fixture that quotes a configuration quotes its error lines too', () => {
  const record = {
    id: 'RUN-x',
    configs: [
      { id: 'check-bad', verdict_lines: ["error: Axiom 'n._native.native_decide.ax_1_1' is not permitted; it is used by 'n'", 'Lean default kernel accepts the solution'] },
      { id: 'good', verdict_lines: ['Lean default kernel accepts the solution', 'lake exit=0'] },
      { id: 'tlc', verdict_lines: ['Error: Deadlock reached.', '11 states generated, 10 distinct states found, 3 states left on queue.'] },
    ],
  }
  // complete for one configuration that holds every quoted line
  assert.deepEqual(stampsGate.errorLineGaps(record, ['Lean default kernel accepts the solution'], isErrorLine), [])
  assert.deepEqual(stampsGate.errorLineGaps(record, ["error: Axiom 'n._native.native_decide.ax_1_1' is not permitted; it is used by 'n'", 'Lean default kernel accepts the solution'], isErrorLine), [])
  // the accept line beside a line no configuration holds: each configuration quoted from must be complete
  assert.equal(stampsGate.errorLineGaps(record, ["info: 'n' depends on axioms: [n._native.native_decide.ax_1_1]", 'Lean default kernel accepts the solution'], isErrorLine).length, 1)
  // TLC's Error: lines are its verdict vocabulary, not error lines
  assert.deepEqual(stampsGate.errorLineGaps(record, ['11 states generated, 10 distinct states found, 3 states left on queue.'], isErrorLine), [])
})

test("GATE-stamps: the spine's tables are read row by row", () => {
  const md = '### 8.8 Verdict → stamp\n\n| Raw output | Stamp |\n|---|---|\n| `sat` plus a model | [R] |\n| a \\| b | x |\n\n### 8.9 Next\n'
  assert.deepEqual(stampsGate.tableAfter(md, '### 8.8 Verdict → stamp'), [['`sat` plus a model', '[R]'], ['a \\| b', 'x']])
})

test("GATE-stamps: a fixture is read from the configuration that printed its lines, with that configuration's checker, budget and inputs", () => {
  const record = {
    id: 'RUN-x',
    engine: 'z3',
    version: '5.3.1',
    verdict_lines: ['z3 5.3.1', '[q] -> unknown'],
    inputs: [{ path: 'a.py', sha256: 'a'.repeat(64) }],
    budget: { rlimit: 5000000 },
    outputs: ['out.txt'],
    configs: [
      { id: 'old', version: '5.3.0', verdict_lines: ['z3 5.3.0', '[q] -> unsat'], budget: null },
      { id: 'older', version: '4.15.4', verdict_lines: ['z3 4.15.4', '[q] -> unsat'], budget: { rlimit: 7 }, inputs: [{ path: 'c.py', sha256: 'c'.repeat(64) }] },
      { id: 'cvc5', engine: 'cvc5', version: '1.4.2', verdict_lines: ['q: unsat'], inputs: [{ path: 'b.smt2', sha256: 'b'.repeat(64) }] },
    ],
  }
  // the record's output file gathers its configurations' lines
  const files = (p: string): string[] => (p === 'out.txt' ? ['[q] -> unsat', 'q: unsat', 'z3 5.3.0', '[q] -> unknown'] : [])
  type Held = { holders?: { id: string; engine: string; version: string }[]; problem?: string }
  const h = (quoted: string[], named?: string): Held => stampsGate.holdersOf(record, quoted, files, named)
  // two checkers print "-> unsat": the fixture says which, and the stamp names that one
  assert.match(h(['[q] -> unsat']).problem ?? '', /configurations of 2 checkers/)
  assert.deepEqual(h(['[q] -> unsat'], 'old').holders?.map((u) => `${u.engine} ${u.version}`), ['z3 5.3.0'])
  // a record with configurations gathers their files in its own output list, which makes no holder
  assert.match(h(['[q] -> unsat'], 'RUN-x').problem ?? '', /is not where the quoted lines are printed/)
  assert.match(h(['z3 5.3.0', '[q] -> unknown']).problem ?? '', /no one configuration of RUN-x prints every quoted line/)
  assert.deepEqual(h(['q: unsat']).holders?.map((u) => u.id), ['cvc5'])
  assert.match(h(['q: unsat'], 'nope').problem ?? '', /nope is not a configuration of RUN-x/)
  // a configuration's budget is its own, or the record's when it records none; its command line must agree with it
  assert.deepEqual(stampsGate.rlimitOfHolders(h(['[q] -> unsat'], 'old').holders), { value: 5000000 })
  assert.deepEqual(stampsGate.rlimitOfHolders(h(['[q] -> unsat'], 'older').holders), { value: 7 })
  assert.match(stampsGate.rlimitOfHolders([{ id: 'c', argv: ['z3', 'rlimit=7'], budget: { rlimit: 5000000 } }]).problem, /passes rlimit 7 but its budget records 5000000/)
  assert.match(stampsGate.rlimitOfHolders([{ id: 'a', argv: [], budget: { rlimit: 1 } }, { id: 'b', argv: [], budget: {} }]).problem, /different rlimits/)
  // a number stands in the run as a whole token, never as part of another
  assert.ok(stampsGate.standsIn(['rlimit=5000000'], '5000000'))
  assert.ok(!stampsGate.standsIn(['rlimit=5000000'], '500000'))
  assert.ok(!stampsGate.standsIn(['canceled 1.1 s'], '1'))
  assert.ok(stampsGate.standsIn(stampsGate.numberSources([{ lines: [], argv: ['-depth', '20'], budget: {}, values: { n: 3 }, exitCode: 2 }], []), '20'))
  // the query a solver line answers, where it names one
  assert.equal(stampsGate.queryNameOf('[cl11_violation] unsat'), 'cl11_violation')
  assert.equal(stampsGate.queryNameOf('cl11_violation: unsat'), 'cl11_violation')
  assert.equal(stampsGate.queryNameOf('2806ms py: rlimit-case unknown canceled 1.1 s'), 'rlimit-case')
  assert.equal(stampsGate.queryNameOf("cvc5 b'1.4.2-modified' -> unsat"), undefined)
})

test("GATE-stamps: the gate's own grammar holds every derived stamp to spine sections 8.7 and 10.2", () => {
  const wordOf = { '[P]': 'PROVED', '[M]': 'MODEL-CHECKED', '[T]': 'TESTED', '[R]': 'REFUTED', '[?]': 'UNKNOWN' }
  const p = (code: string, word: string, qualifier: string[]): string => stampsGate.stampGrammarProblems({ code, word, qualifier }, wordOf).join(' | ')
  assert.equal(p('[P]', 'PROVED', ['Z3 5.3.1 unsat', 'uncertified']), '')
  assert.equal(p('[P]', 'PROVED', ['Z3 5.3.1 and cvc5 1.4.2-modified agree', 'uncertified']), '')
  assert.equal(p('[P]', 'PROVED', ['Lean 4.35.0 kernel + compiler', 'axioms listed']), '')
  assert.match(p('[P]', 'PROVED', ['Z3 unsat']), /names its checker and a dotted version/)
  assert.match(p('[P]', 'PROVED', ['Z3 5 unsat']), /names its checker and a dotted version/)
  assert.match(p('[M]', 'MODEL-CHECKED', ['complete', 'Init = 100']), /leads with its bound/)
  assert.equal(p('[M]', 'MODEL-CHECKED', ['depth 6', 'partial']), '')
  assert.equal(p('[M]', 'MODEL-CHECKED', ['no constants', 'complete']), '')
  assert.match(p('[T]', 'TESTED', ['TLC 1.8.0 trace validation', '1 seed']), /leads with its count/)
  assert.equal(p('[T]', 'TESTED', ['10 of 12 unseen items']), '')
  assert.equal(p('[T]', 'TESTED', ['n = 200']), '')
  assert.match(p('[R]', 'REFUTED', ['replayed', '1 step']), /witness length/)
  assert.match(p('[?]', 'UNKNOWN', []), /no qualifier/)
  assert.match(p('[?]', 'UNKNOWN', [' padded']), /empty or padded/)
  assert.match(p('[?]', 'UNKNOWN', ['a · b']), /separator/)
  assert.match(p('[T]', 'ENFORCED', ['1 seed']), /word is TESTED/)
  assert.equal(stampsGate.stampTextOf({ word: 'PROVED', code: '[P]', qualifier: ['Z3 5.3.1 unsat'] }), 'PROVED [P] · Z3 5.3.1 unsat')
})

test('GATE-stamps: a line is dashed, dotted or a gradient wherever a script or a page draws it', () => {
  assert.equal(stampsGate.cssPropertyName('borderTopStyle'), 'border-top-style')
  assert.equal(stampsGate.cssPropertyName('WebkitTextDecorationStyle'), 'text-decoration-style')
  assert.ok(stampsGate.lineInValue('borderBottom', '1px dotted'))
  assert.ok(stampsGate.lineInValue('strokeDasharray', '4 2'))
  assert.ok(stampsGate.lineInValue('backgroundImage', 'linear-gradient(#fff, #000)'))
  assert.equal(stampsGate.lineInValue('borderBottom', '1px solid'), undefined)
  assert.equal(stampsGate.lineInValue('strokeDasharray', 'none'), undefined)
  assert.equal(stampsGate.lineInValue('listStyle', 'dotted'), undefined)
  const lines = (rel: string, text: string): string[] => stampsGate.markupLineProblems(rel, text).map((q: { where: string }) => q.where)
  assert.deepEqual(lines('x.html', '<path stroke-dasharray="2 2"/>\n<path stroke-dasharray="none"/>\n<p style="border: 1px dashed">x</p>\n<p style="border: 1px solid">x</p>'), ['x.html:1', 'x.html:3'])
  // code in Markdown is shown as text, never rendered as markup
  assert.deepEqual(lines('x.md', stampsGate.maskMarkdownCode('`<p style="border: 1px dashed">`\n\n```html\n<path stroke-dasharray="2 2"/>\n```\n')), [])
  // a chart's data in JSON draws a line by a key named after a line property
  const json = (text: string): string[] => stampsGate.jsonLineProblems('x.json', text).map((q: { where: string }) => q.where)
  assert.deepEqual(json('{\n"a": { "strokeDasharray": "4 2" },\n"b": { "border-style": "dotted" },\n"c": { "strokeDasharray": [4, 2] },\n"d": { "strokeDasharray": "none" },\n"e": { "strokeDasharray": 4 },\n"f": { "label": "dotted" }\n}'), ['x.json:2', 'x.json:3', 'x.json:4', 'x.json:6'])
  // a style value is read through the variables it names
  const dir = mkdtempSync(join(tmpdir(), 'line-'))
  try {
    mkdirSync(join(dir, 'apps/site/src/x'), { recursive: true })
    writeFileSync(join(dir, 'apps/site/src/x/X.tsx'), "const lineStyle = 'dashed'\nexport const P = ({ on }: { on: boolean }) => <div style={{ borderStyle: on ? 'solid' : lineStyle }}>x</div>\nexport const Q = ({ a }: { a: boolean }) => { const kind = a ? 'dotted' : 'solid'; return <div style={{ borderStyle: kind }}>x</div> }\nexport const R = () => { const k = 'solid'; return <div style={{ borderStyle: k }}>x</div> }\n")
    const found = (stampsGate.scriptHueCheck(dir, ['apps/site/src/x/X.tsx'], () => false) as { check: string; where: string }[]).filter((q) => q.check === 'line').map((q) => q.where)
    assert.deepEqual(found, ['apps/site/src/x/X.tsx:2', 'apps/site/src/x/X.tsx:3'])
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test("GATE-stamps: tokens.css's token blocks are :root itself, never an element below it", () => {
  for (const s of [':root', ':root[data-theme="night"]', ':root:not([data-theme="light"])', ':root[data-motion="reduce"]']) assert.ok(stampsGate.ROOT_BLOCK.test(s), s)
  for (const s of [':root .claim-card', ':root > body', ':root[data-theme="night"] .stamp', '.claim-card']) assert.ok(!stampsGate.ROOT_BLOCK.test(s), s)
  const rules = stampsGate.parseCss(':root .claim-card { --st-p-fill: #fff; }\n:root { --st-p-fill: #1D3F8F; }\n')
  assert.deepEqual((stampsGate.frameTokenProblems(stampsGate.PATHS.tokens, rules, new Set(['--st-p-fill'])) as { where: string }[]).map((q) => q.where), [`${stampsGate.PATHS.tokens}:1`])
})

test('GATE-stamps and GATE-codes: a planted fault counts as caught only when every finding it expects appears', () => {
  const found = [
    { check: 'line', where: 'a.css:1', detail: 'border: dashed' },
    { check: 'hue', where: 'a.css:2', detail: 'a hue' },
  ]
  assert.deepEqual(stampsGate.unmetExpectations(found, 'line'), [])
  assert.deepEqual(stampsGate.unmetExpectations(found, [['line', 'a.css:1', /dashed/], ['hue', /^a\.css:\d+$/, null]]), [])
  assert.equal(stampsGate.unmetExpectations(found, [['line', 'a.css:1', null], ['line', 'a.css:2', null]]).length, 1)
  assert.equal(stampsGate.unmetExpectations(found, [['line', 'a.css:1', /dotted/]]).length, 1)
  assert.equal(codesGate.unmetExpectations(found, [['status', null, null]]).length, 1)
  // a control: a form the rule must leave alone; a finding there is unmet
  for (const gate of [stampsGate, codesGate]) {
    assert.deepEqual(gate.unmetExpectations(found, [['!line', 'a.css:2', null]]), [])
    assert.equal(gate.unmetExpectations(found, [['!hue', 'a.css:2', null]]).length, 1)
  }
})

test('GATE-codes: a status word is copy as a return value, an operand of || or ??, an array element, a default, a method or constructor argument; a console call is not', () => {
  assert.deepEqual(sourceStatus("export function word(): string { return 'Verified' }\n"), ['Verified'])
  assert.deepEqual(sourceStatus("export const m = (p: { msg?: string }) => p.msg || 'All transfers are safe'\n"), ['safe'])
  assert.deepEqual(sourceStatus("export const n = (p: { msg?: string }) => p.msg ?? 'Proven'\n"), ['Proven'])
  assert.deepEqual(sourceStatus("export const L = ['Verified', 'Refuted'] as const\n"), ['Verified'])
  assert.deepEqual(sourceStatus("export function say(m = 'All transfers are verified'): string { return m }\n"), ['verified'])
  assert.deepEqual(sourceStatus("export const a = (el: HTMLElement) => el.setAttribute('aria-label', 'Your transfer is verified')\n"), ['verified'])
  assert.deepEqual(sourceStatus("export const f = () => new Notification('Your transfer is verified')\n"), ['verified'])
  assert.deepEqual(sourceStatus("export const d = () => console.log('verified', 'the cache is safe')\n"), [])
  // a status word joined to a name by a hyphen is a name on its own, and copy in a sentence
  assert.deepEqual(sourceStatus("export const k = 'is-verified'\n"), [])
  assert.deepEqual(sourceStatus("export const T = () => <p>{'Your transfer is verified-safe now'}</p>\n"), ['verified', 'safe'])
})

test('GATE-codes: a tag is matched whole, never by its first letters', () => {
  for (const s of ['This lesson is [DRAFT] for now.', 'A [V2] mark.', 'An [UNSAFE] mark.', 'A [KSX] mark.', 'Measured [X RUN-z3-starter/notes] once.', 'Measured [X spikes2] once.']) assert.deepEqual(findings(s), ['code'], s)
  for (const s of ['Checked [V] and [V cheerpj].', 'A rule [D: the spine says so].', 'Measured [X RUN-z3-starter, RUN-z3-11179] and [X spikes].']) assert.deepEqual(findings(s), [], s)
})

const green = (script: string): boolean => spawnSync(process.execPath, [join(ROOT, 'scripts', script), '--json'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).status === 0

test('GATE-stamps fails on each planted fault', (t) => {
  if (!green('verify-stamps.mjs')) {
    t.skip('GATE-stamps is red on the repository; its own step reports the findings')
    return
  }
  const r = spawnSync(process.execPath, [join(ROOT, 'scripts', 'verify-stamps.mjs'), '--self-check'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  assert.equal(r.status, 0, r.stdout + r.stderr)
  assert.match(r.stdout, /all \d+ planted faults caught/)
})

test('GATE-codes fails on each planted fault', (t) => {
  if (!green('verify-codes.mjs')) {
    t.skip('GATE-codes is red on the repository; its own step reports the findings')
    return
  }
  const r = spawnSync(process.execPath, [join(ROOT, 'scripts', 'verify-codes.mjs'), '--self-check'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  assert.equal(r.status, 0, r.stdout + r.stderr)
  assert.match(r.stdout, /all \d+ planted faults caught/)
})
