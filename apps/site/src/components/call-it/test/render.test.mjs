// The sheet as it renders: the real component, bundled with esbuild and drawn to static markup, from the fixtures. This checks
// the markup a reader and a screen reader get (a fieldset with a legend, native radios, the chance and the bands printed, the
// action disabled until a verdict and a confidence, a recorded call read-only, escaping, unique ids) and holds every word the
// sheet gives a reader to the vocabulary rules. What happens when a learner taps, in three browsers at 320, 360 and 1280 px, with
// axe and the keyboard, is the browser harness's (scripts/spikes/W1-T07/harness).

import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test, { after, before } from 'node:test'
import { pathToFileURL } from 'node:url'
import { copyProblems, readGlossary } from '../../../../../../scripts/spikes/W1-T07/lib/words.mjs'
import { COPY } from '../copy.ts'
import { REPO, authoredItems, generatedItems } from './helpers.mjs'

const COMPONENT = path.join(REPO, 'apps/site/src/components/call-it')
let dir
let M

before(async () => {
  const esbuild = (await import('esbuild')).default ?? (await import('esbuild'))
  dir = fs.mkdtempSync(path.join(process.env.W1T07_SCRATCH ?? os.tmpdir(), 'w1t07-render-'))
  const entry = `
    import { createElement } from 'react'
    import { renderToStaticMarkup } from 'react-dom/server'
    import { CallIt } from ${JSON.stringify(path.join(COMPONENT, 'CallIt.tsx'))}
    import { CallItCell } from ${JSON.stringify(path.join(COMPONENT, 'CallItCell.tsx'))}
    const never = () => Promise.reject(new Error('not called'))
    export const render = (item, props = {}) => renderToStaticMarkup(createElement(CallIt, { item, onCommit: never, ...props }))
    export const renderCell = (item, store) => renderToStaticMarkup(createElement(CallItCell, { item, store }))
  `
  const out = path.join(dir, 'sheet.mjs')
  await esbuild.build({
    stdin: { contents: entry, resolveDir: REPO, loader: 'ts', sourcefile: 'render-entry.ts' },
    bundle: true,
    format: 'esm',
    platform: 'node',
    jsx: 'automatic',
    loader: { '.css': 'empty' },
    nodePaths: [path.join(REPO, 'node_modules')],
    banner: { js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);" },
    outfile: out,
    logLevel: 'silent',
  })
  M = await import(pathToFileURL(out).href)
})

after(() => {
  if (dir) fs.rmSync(dir, { recursive: true, force: true })
})

const text = (html) => html.replace(/<[^>]*>/g, ' ').replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim()
const count = (html, re) => [...html.matchAll(re)].length
const ids = (html) => [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])
const never = () => Promise.reject(new Error('not called'))
const recordedChoice = (extra = {}) => ({ id: 'e1', conf: 'think', ok: true, picked: 'B', answers: null, provenance: 'own', ...extra })

test('an open sheet: a fieldset with its legend, the question, one native radio per option, the chance printed, and the action off', async () => {
  const [item] = await authoredItems()
  const html = M.render(item)
  assert.match(html, /<fieldset class="ci-fieldset">/)
  assert.match(html, /<legend class="ci-legend"><span class="ci-label">Call it\.<\/span> <span class="ci-rule">Your first call is the one that counts\.<\/span><\/legend>/)
  assert.match(html, /data-state="choosing"/)
  assert.match(text(html), /This query asks for a2 < 0 and b2 < 0 on the unguarded transfer\. What will Z3 return\?/)
  assert.equal(count(html, /<input type="radio"/g), 3)
  assert.equal(count(html, /<label class="ci-option">/g), 3)
  // a name shared by the three, so the arrow keys move within the group, and no radio is checked
  const names = new Set([...html.matchAll(/<input type="radio" name="([^"]+)"/g)].map((m) => m[1]))
  assert.equal(names.size, 1)
  assert.equal(count(html, /checked=""/g), 0)
  assert.match(html, /<code class="ci-code">sat<\/code>/)
  assert.match(text(html), /3 options · chance 1 in 3/)
  // verdict, then confidence: the taps are not there yet; the action is, and it says why it is off
  assert.doesNotMatch(html, /ci-taps/)
  assert.doesNotMatch(text(html), /How likely is this right\?/)
  assert.match(html, /<button type="button" class="ci-action" disabled="" aria-describedby="[^"]+">Record my call<\/button>/)
  assert.match(text(html), /Choose an answer, then how likely it is right\./)
  const need = html.match(/aria-describedby="([^"]+)">Record my call/)[1]
  assert.match(html, new RegExp(`<p id="${need.replace(/[:]/g, '\\:')}" class="ci-need">`))
})

test('the sheet bound to the store: no store says the record is not kept and offers no call, and a store not yet read says it is looking', async () => {
  const [item] = await authoredItems()
  const none = M.renderCell(item, null)
  assert.match(none, /<p class="ci-unavailable">This browser is not keeping your record, so a call cannot be recorded here\.<\/p>/)
  assert.doesNotMatch(none, /<input|<button|<fieldset/)
  const store = { events: () => new Promise(() => {}), record: never, subscribe: () => () => {}, status: () => ({ mode: 'ready' }) }
  const reading = M.renderCell(item, store)
  assert.match(reading, /<p class="ci-loading" role="status">Looking for your call…<\/p>/)
  assert.doesNotMatch(reading, /<input|<button|<fieldset/, 'no sheet is drawn until the log has been read, so a call already made is never offered again')
  // a host still opening the store says so with undefined: the sheet looks, and never says that the record is not kept
  const opening = M.renderCell(item, undefined)
  assert.match(opening, /<p class="ci-loading" role="status">Looking for your call…<\/p>/)
  assert.doesNotMatch(opening, /not keeping your record/)
})

test('the action is named by the host, the help box is a native checkbox with its honesty note, and the expert skip is offered only when asked for', async () => {
  const [item] = await authoredItems()
  assert.match(M.render(item, { actionLabel: 'Run Z3 here' }), />Run Z3 here<\/button>/)
  const html = M.render(item)
  assert.match(html, /<input type="checkbox"[^>]*aria-describedby="[^"]+"\/><span>I had help with this call<\/span>/)
  assert.match(text(html), /Provenance is self-declared\. Nothing on this device can tell assisted work from unassisted work\./)
  assert.equal(count(M.render(item, { helpToggle: false }), /type="checkbox"/g), 0)
  assert.doesNotMatch(html, /Skip the call/)
  assert.match(M.render(item, { skip: { onSkip() {} } }), /<button type="button" class="ci-skip">Skip the call: you&#x27;ve shown this one\.<\/button>/)
  assert.doesNotMatch(M.render({ ...item, identity: item.identity }, { layout: 'inline' }), /data-layout="sheet"/)
  assert.match(M.render(item, { layout: 'sheet' }), /data-layout="sheet"/)
})

test('a recorded call: the whole fieldset is disabled, the taps and the payoffs stay in view, and there is no action and no skip', async () => {
  const [item] = await authoredItems()
  const html = M.render(item, { recorded: recordedChoice(), skip: { onSkip() {} } })
  assert.match(html, /data-state="recorded"/)
  assert.match(html, /<fieldset class="ci-fieldset" disabled="">/)
  assert.equal(count(html, /<input type="radio"/g), 6, 'three answers and three taps, read-only')
  assert.equal(count(html, /checked=""/g), 2, 'the answer and the tap that were called')
  assert.match(html, /<input type="radio" name="[^"]+" checked="" value="B"/)
  assert.match(html, /<input type="radio" name="[^"]+" checked="" value="think"/)
  assert.doesNotMatch(html, /class="ci-action"/)
  assert.doesNotMatch(html, /class="ci-skip"/)
  assert.doesNotMatch(html, /type="checkbox"/)
  assert.match(text(html), /Feedback only, never credit: guess \+1 \/ 0 · think so \+2 \/ −2 · sure \+3 \/ −6\./)
  assert.match(text(html), /Recorded: B\. unsat · think so\./)
  // the result is not told until the host reveals it (after the run)
  assert.doesNotMatch(text(html), /Your call matched|Your call missed|feedback only\./)
  assert.doesNotMatch(html, /ci-why/)
})

test('once the host reveals the result: matched or missed, the payoff as feedback only, and the whys', async () => {
  const [item] = await authoredItems()
  const matched = text(M.render(item, { recorded: recordedChoice(), revealed: true }))
  assert.match(matched, /Your call matched\. Recorded: B\. unsat · think so\. \+2, feedback only\./)
  assert.match(matched, /Why your answer: No input satisfies it, so Z3 answers unsat/)
  assert.doesNotMatch(matched, /The answer:|Why the answer:/, 'a match shows one why')
  const missed = text(M.render(item, { recorded: recordedChoice({ conf: 'sure', ok: false, picked: 'A' }), revealed: true }))
  assert.match(missed, /Your call missed\. Recorded: A\. sat · sure\. −6, feedback only\./)
  assert.match(missed, /Why your answer: The transfer is unguarded/)
  assert.match(missed, /The answer: B\. unsat Why the answer: No input satisfies it/)
  const guess = text(M.render(item, { recorded: recordedChoice({ conf: 'guess', ok: false, picked: 'C' }), revealed: true }))
  assert.match(guess, /Your call missed\. Recorded: C\. unknown · guess\. 0, feedback only\./)
  const withHelp = text(M.render(item, { recorded: recordedChoice({ provenance: 'assisted' }), revealed: true }))
  assert.match(withHelp, /Marked as made with help\./)
})

test('a multiple true/false set: a true/false pair per statement, one confidence for the set, its chance as 1 in 2^m', () => {
  const item = generatedItems().find((i) => i.form === 'set')
  const html = M.render(item)
  assert.equal(count(html, /<fieldset class="ci-row">/g), 5)
  assert.equal(count(html, /<input type="radio"/g), 10)
  assert.equal(new Set([...html.matchAll(/<input type="radio" name="([^"]+)"/g)].map((m) => m[1])).size, 5, 'one name per statement')
  assert.match(text(html), /all 5 by guessing: 1 in 32/)
  assert.match(text(html), /Mark every statement, then say how likely the whole set is right\./)
  const done = M.render(item, {
    recorded: { id: 'e2', conf: 'sure', ok: false, picked: null, answers: { s1: true, s2: true, s3: false, s4: true, s5: false }, provenance: 'own' },
    revealed: true,
  })
  const t = text(done)
  assert.match(t, /Your call missed\. Recorded: 5 statements · sure\. −6, feedback only\./)
  assert.match(t, /Statement s2: you said true; it is false\./)
  assert.match(t, /Statement s1: you said true; it is true\./)
  assert.equal(count(done, /checked=""/g), 6, 'five statements and the tap')
})

test('a generated instance prints its stem and the bound its key rests on (I10)', () => {
  const item = generatedItems().find((i) => i.identity.ref === 'call:GEN-call-it/t2')
  const t = text(M.render(item))
  assert.match(t, /TLC will check the DoubleSpend model/)
  assert.match(t, /Bound: TLC 1\.8\.0 at Init = 100, Amount = 80 and two workers\./)
  assert.match(t, /3 options · chance 1 in 3/)
  const four = text(M.render(generatedItems().find((i) => i.options?.length === 4)))
  assert.match(four, /4 options · chance 1 in 4/)
})

test('everything an item says is a text node: markup in a prompt, an option or a why is escaped, never drawn', async () => {
  const [item] = await authoredItems()
  const evil = {
    ...item,
    stem: '<img src=x onerror=alert(1)> **bold** <script>alert(1)</script>',
    prompt: 'a <b>prompt</b> with `<i>code</i>`',
    options: item.options.map((o, i) => ({ ...o, text: i === 0 ? '<a href="https://example.test">link</a>' : o.text, why: '<script>x</script>' })),
  }
  const html = M.render(evil, { recorded: recordedChoice({ picked: 'A', ok: false }), revealed: true })
  assert.doesNotMatch(html, /<img|<script|<a |<b>|<i>/)
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/)
  assert.match(html, /<code class="ci-code">&lt;i&gt;code&lt;\/i&gt;<\/code>/)
  assert.equal(count(html, /\sstyle=/g), 0)
})

test('every id is unique within a sheet and across sheets, and each radio sits in a label', async () => {
  const [a, b] = await authoredItems()
  const html = M.render(a) + M.render(b, { recorded: recordedChoice() })
  const list = ids(html)
  assert.equal(new Set(list).size, list.length, 'ids are unique')
  assert.equal(count(html, /<input type="radio"/g), count(html, /<label class="ci-(option|tap|tf-option)">/g))
})

test("the sheet's own words keep the vocabulary rules and use no glossary term beyond the five Boot introduces; an item's words are held to the lesson that carries it", async () => {
  const glossary = readGlossary()
  // the sheet's fixed words read the same in Boot (S1.L0, which may use terms 1 to 5 only) and in every lesson
  const sample = (v) => (typeof v === 'function' ? [v('x', 'think so', 'true'), v(2)] : [v])
  const fixedWords = Object.entries(COPY).flatMap(([k, v]) => sample(v).map((text) => [`COPY.${k}`, String(text)]))
  assert.ok(fixedWords.length > 20)
  for (const [where, text] of fixedWords) assert.deepEqual(copyProblems(text, glossary, { lesson: 'S1.L0' }), [], where)
  // an item's words are lesson copy, held to the terms its lesson may use: an authored call's ref names the lesson (call:S1.L2/c1 is
  // S1.L2); a generated item can come from any lesson of S1, so its words are held to the terms S1 introduces (S1.L5 is S1's last)
  const lessonOf = (item) => /^call:(S[0-9]+\.L[0-9]+)\//.exec(item.identity.ref)?.[1] ?? 'S1.L5'
  const items = [...(await authoredItems()), ...generatedItems()]
  assert.deepEqual([...new Set(items.map(lessonOf))].sort(), ['S1.L1', 'S1.L2', 'S1.L3', 'S1.L5'])
  const seen = []
  for (const item of items) {
    const base = { ...item }
    seen.push([`${item.identity.ref} open`, text(M.render(base)), lessonOf(item)])
    const picked = item.form === 'choice' ? { picked: item.key, answers: null } : { picked: null, answers: Object.fromEntries(item.statements.map((s) => [s.id, s.truth])) }
    seen.push([`${item.identity.ref} matched`, text(M.render(base, { recorded: recordedChoice(picked), revealed: true })), lessonOf(item)])
    const wrong = item.form === 'choice' ? { picked: item.options.find((o) => o.id !== item.key).id, answers: null, ok: false, conf: 'sure' } : { picked: null, ok: false, conf: 'sure', answers: Object.fromEntries(item.statements.map((s) => [s.id, !s.truth])) }
    seen.push([`${item.identity.ref} missed`, text(M.render(base, { recorded: recordedChoice(wrong), revealed: true })), lessonOf(item)])
  }
  for (const [where, page, lesson] of seen) assert.deepEqual(copyProblems(page, glossary, { lesson }), [], `${where} (a page of ${lesson})`)
})
