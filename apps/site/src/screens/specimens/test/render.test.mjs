// The screen as it renders: the real components, bundled with esbuild and drawn to static markup the way GATE-stamps draws
// the stamp components, in a router, from the committed cabinet and a learner's events. This checks the markup a reader
// and a screen reader get (headings, labels, the stamp's own component, the witness's rule, escaping, unique ids); the
// layout at 320, 360 and 1280 px and axe are the browser harness's (scripts/spikes/W1-T16/harness).

import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test, { before, after } from 'node:test'
import { pathToFileURL } from 'node:url'
import { COPY } from '../copy.ts'
import { internalFindings, readGlossary } from '../../../../../../scripts/spikes/W1-T16/lib/learner-words.mjs'
import { call, loadCabinet, refind, REPO } from './helpers.mjs'

const SCREEN = path.join(REPO, 'apps/site/src/screens/specimens')
let dir
let M

before(async () => {
  const esbuild = (await import('esbuild')).default ?? (await import('esbuild'))
  dir = fs.mkdtempSync(path.join(process.env.W1T16_SCRATCH ?? os.tmpdir(), 'w1t16-render-'))
  const entry = `
    import { createElement } from 'react'
    import { renderToStaticMarkup } from 'react-dom/server'
    import { MemoryRouter } from 'react-router'
    import { SpecimensScreen } from ${JSON.stringify(path.join(SCREEN, 'SpecimensScreen.tsx'))}
    import { LabelBody } from ${JSON.stringify(path.join(SCREEN, 'Label.tsx'))}
    import { buildView } from ${JSON.stringify(path.join(SCREEN, 'model/cabinet.ts'))}
    export const screen = (props, at = '/specimens') => renderToStaticMarkup(createElement(MemoryRouter, { initialEntries: [at] }, createElement(SpecimensScreen, props)))
    export const label = (row, today, id = 'sp-test') => renderToStaticMarkup(createElement(MemoryRouter, null, createElement(LabelBody, { row, today, id })))
    export { buildView }
  `
  const out = path.join(dir, 'screen.mjs')
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

const cabinet = loadCabinet()
/** Boot and S1.L1 on 2 November, S1.L2 on the 3rd, S1.L4 on the 5th, S1.L5 on the 6th; SP-1.1 kept on the 10th. */
const EVENTS = [
  call('S1.L0', '2026-11-02T08:10:00Z'),
  call('S1.L1', '2026-11-02T08:50:00Z'),
  call('S1.L2', '2026-11-03T08:00:00Z'),
  call('S1.L4', '2026-11-05T08:00:00Z'),
  call('S1.L5', '2026-11-06T08:00:00Z'),
  refind('SP-1.1', '2026-11-10T08:00:00Z'),
]
const props = (extra = {}) => ({ cabinet, events: EVENTS, today: '2026-11-12', record: 'ready', ...extra })
const ids = (html) => [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])

test('the screen has a title, the draft banner, a filter for every status and a section for every stage', () => {
  const html = M.screen(props())
  assert.match(html, /<h1>Specimens<\/h1>/)
  assert.match(html, /Draft: first-learner pass pending\./)
  assert.equal([...html.matchAll(/<section[^>]*class="sp-drawer"/g)].length, 10)
  for (const stage of ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10']) assert.match(html, new RegExp(`id="sp-stage-${stage}"`), stage)
  // nine stages have none yet and say so: each keeps its heading and is never hidden
  assert.equal([...html.matchAll(/ · none yet/g)].length, 9)
  assert.match(html, /<h2 id="sp-stage-S2" class="sp-stage-head"><span class="sp-stage-id">S2<\/span> Proof \(Lean 4\)<span class="sp-none"> · none yet<\/span><\/h2>/)
  // the chips are native radios with their counts, one checked
  for (const [name, count] of [['All', 9], ['Mounted', 8], ['Kept', 1], ['Dated incidents', 2]]) assert.match(html, new RegExp(`${name} <span class="sp-count">${count}</span>`), name)
  assert.equal([...html.matchAll(/<input type="radio"[^>]*checked=""/g)].length, 1)
  assert.match(html, /<select/)
})

test('a specimen the learner has met is listed under its stage, and one not met is not, not even by name', () => {
  const html = M.screen(props())
  for (const id of ['SP-1.1', 'SP-1.2', 'SP-1.3', 'SP-1.4', 'SP-1.5', 'SP-1.7', 'SP-1.8', 'SP-1.9', 'SP-1.10']) assert.match(html, new RegExp(`<article class="sp-item" id="${id.replace('.', '\\.')}"`), id)
  assert.doesNotMatch(html, /id="SP-1\.6"/)
  assert.doesNotMatch(html, /contradictory premises/)
  const empty = M.screen(props({ events: [] }))
  assert.match(empty, /No specimen is mounted yet\. A lesson mounts one when you make its first call\./)
  assert.equal([...empty.matchAll(/ · none yet/g)].length, 10)
  assert.doesNotMatch(empty, /class="sp-schedule"/)
})

test('a stage whose specimens the filters hide says none match, and only a stage with nothing mounted says none yet', () => {
  // Boot and S1.L1 mount SP-1.1 and nothing is kept: the Kept chip hides it
  const hidden = M.screen(props({ events: EVENTS.slice(0, 2), initialFilters: { show: 'kept', stage: null, kc: null } }))
  assert.match(hidden, /<h2 id="sp-stage-S1" class="sp-stage-head"><span class="sp-stage-id">S1<\/span> Counterexample \(Z3Py\)<span class="sp-none"> · none match<\/span><\/h2>/)
  assert.equal([...hidden.matchAll(/ · none match/g)].length, 1)
  assert.equal([...hidden.matchAll(/ · none yet/g)].length, 9, 'the nine stages that hold nothing')
  assert.match(hidden, /No specimen matches these filters\./)
  // a stage that lists its specimens says neither
  const shown = M.screen(props({ events: EVENTS.slice(0, 2), initialFilters: { show: 'mounted', stage: null, kc: null } }))
  assert.doesNotMatch(shown, /none match/)
  assert.equal([...shown.matchAll(/ · none yet/g)].length, 9)
})

test('below 900 px a label opens from its heading, which is a button with its state; collapsed, it shows its stamp, status and re-find date', () => {
  const html = M.screen(props())
  assert.match(html, /<h3 id="sp-SP-1\.1-heading" class="sp-item-head"><button type="button" class="sp-toggle" aria-expanded="false" aria-controls="sp-SP-1\.1-panel">/)
  assert.match(html, /<div id="sp-SP-1\.1-panel" class="sp-panel" hidden="">/)
  // SP-1.1 is kept; SP-1.2 is mounted on the 5th and its re-find is from the 12th, which is today
  const kept = html.slice(html.indexOf('id="SP-1.1"'), html.indexOf('id="SP-1.2"'))
  assert.match(kept, /Kept 2026-11-10/)
  assert.match(kept, /class="stamp stamp-r"/)
  const mounted = html.slice(html.indexOf('id="SP-1.2"'), html.indexOf('id="SP-1.3"'))
  assert.match(mounted, /Mounted 2026-11-05 · Re-find from 2026-11-12/)
  assert.match(mounted, /<span class="stamp-word">REFUTED<\/span> <span class="stamp-code">\[R\]<\/span>/)
  assert.match(mounted, /2 steps/)
  // an unknown has the hatched frame and its reason; a dated incident is tagged
  assert.match(html.slice(html.indexOf('id="SP-1.7"'), html.indexOf('id="SP-1.8"')), /class="stamp stamp-q"/)
  assert.match(html.slice(html.indexOf('id="SP-1.9"'), html.indexOf('id="SP-1.10"')), /Dated incident/)
  // no label body until it is opened
  assert.doesNotMatch(html, /sp-witness/)
  const open = M.screen(props({ initialOpen: ['SP-1.2'] }))
  assert.match(open, /<button type="button" class="sp-toggle" aria-expanded="true"/)
  assert.equal([...open.matchAll(/class="sp-witness line-violation sp-witness-many"/g)].length, 2, 'the witness of SP-1.2 and the second witness under it, each of thirteen assignments')
})

test('from 900 px every label is open and its heading is a heading, not a button that closes nothing', () => {
  const html = M.screen(props({ wide: true }))
  assert.doesNotMatch(html, /class="sp-toggle"/)
  assert.match(html, /<h3 id="sp-SP-1\.1-heading" class="sp-item-head"><span class="sp-id">SP-1\.1<\/span> <span class="sp-title">The overdraft<\/span><\/h3>/)
  assert.equal([...html.matchAll(/<div id="sp-SP-[0-9.]+-panel" class="sp-panel">/g)].length, 9)
  assert.doesNotMatch(html, /class="sp-summary"/)
})

test('a label: the stamp from the stamp component, the recorded-run badge, the witness under its rule, and every field of DESIGN.md 6.5', () => {
  const view = M.buildView(cabinet, EVENTS, '2026-11-12')
  const row = view.drawers[0].rows.find((r) => r.entry.record.id === 'SP-1.1')
  const html = M.label(row, '2026-11-12')
  // the stamp is the component's: frame class, hidden frame, the spoken name
  assert.match(html, /<span class="stamp stamp-r" data-code="\[R\]">/)
  assert.match(html, /<span class="stamp-frame" aria-hidden="true">/)
  assert.match(html, /<span class="visually-hidden">Refuted, code R: 1 step<\/span>/)
  assert.match(html, /Recorded run RUN-z3-starter · Z3 5\.3\.1 · 2026-10-24/)
  // the witness, one assignment to a row, on paper under the violation rule
  assert.match(html, /<ul class="sp-witness line-violation" aria-label="Witness"><li><code>b = 0<\/code><\/li><li><code>amount = 1<\/code><\/li><li><code>a = 0<\/code><\/li><\/ul>/)
  assert.match(html, /<summary>Replayed<\/summary>/)
  // the fields
  for (const name of ['Violates', 'Because', 'Minimal?', 'Class', 'Cured by', 'Found in', 'Also drawn from', 'Status', 'Ideas']) assert.match(html, new RegExp(`<dt>${name.replace('?', '\\?')}</dt>`), name)
  assert.match(html, /yes: <code class="sp-code">amount = 1<\/code> under an Optimize objective/)
  assert.match(html, /<a href="\/lessons\/S1\.L1" data-discover="true">S1\.L1<\/a> · Z3 5\.3\.1 · <code class="sp-run">RUN-z3-starter<\/code>/)
  assert.match(html, /\(<a href="\/claims" data-discover="true">CL-1\.1<\/a>\)/)
  assert.match(html, /Kept 2026-11-10: you found the same class again on a fresh variant\. Mounted 2026-11-02\./)
  assert.doesNotMatch(html, /Re-find from/)
  // the compact provenance block closes it
  assert.match(html, /<dt>Sheet<\/dt><dd>SP-1\.1<\/dd>/)
  assert.match(html, /<dt>Rev<\/dt><dd>[0-9a-f]{12}<\/dd>/)
  assert.match(html, /<dt>Drawn<\/dt><dd>2026-10-24<\/dd>/)
  assert.match(html, /<dt>Checked by<\/dt><dd>Z3 5\.3\.1 · RUN-z3-starter<\/dd>/)
  // the lines it was drawn from, verbatim, in a disclosure
  assert.match(html, /<details class="sp-lines"><summary>Lines from the runs<\/summary>/)
  assert.match(html, /\[1\.2 starter: overdraft search\] sat \(0\.00s\) \[b = 0, amount = 1, a = 0\]/)
})

test('a mounted specimen says when a re-find keeps it; once the day has come it says so and points at Today, with nothing overdue', () => {
  const view = M.buildView(cabinet, EVENTS, '2026-11-08')
  const row = view.drawers[0].rows.find((r) => r.entry.record.id === 'SP-1.2')
  const waiting = M.label(row, '2026-11-08')
  assert.match(waiting, /Mounted 2026-11-05\. Find the same class again on a fresh variant from 2026-11-12 to keep it\./)
  assert.doesNotMatch(waiting, /href="\/today"/)
  const ready = M.label(row, '2026-12-30')
  assert.match(ready, /A re-find is ready: find the same class again on a fresh variant to keep it\./)
  assert.match(ready, /<a href="\/today" data-discover="true">It comes up in Today<\/a>\./)
  assert.doesNotMatch(`${waiting}${ready}`, /\b(overdue|late|behind|missed|streaks?|deadlines?)\b/i)
})

test('contradictory premises earn no stamp: the label says why in plain words, and no frame is drawn', () => {
  const events = [...EVENTS, call('S1.L3', '2026-11-04T08:00:00Z')]
  const view = M.buildView(cabinet, events, '2026-11-12')
  const row = view.drawers[0].rows.find((r) => r.entry.record.id === 'SP-1.6')
  const html = M.label(row, '2026-11-12')
  assert.match(html, /the premise query is unsat: the premises are contradictory, so any claim over them holds vacuously/)
  assert.doesNotMatch(html, /class="stamp /)
  assert.match(html, /yes: an unsat core of 2 constraints: <code class="sp-code">amount &lt;= MAX_TRANSFER<\/code> and <code class="sp-code">amount &gt; 0<\/code>/)
  // the answers are drawn under an ink rule, never the vermilion of a witness
  assert.doesNotMatch(html, /sp-witness/)
  assert.match(html, /sp-evidence-answer/)
})

test('a label is drawn with its evidence told apart: the premise query says what it is, the second block sits under its own heading', () => {
  const events = [...EVENTS, call('S1.L3', '2026-11-04T08:00:00Z')]
  const view = M.buildView(cabinet, events, '2026-11-12')
  const premise = M.label(view.drawers[0].rows.find((r) => r.entry.record.id === 'SP-1.6'), '2026-11-12')
  assert.match(premise, /The premise query: the premises alone, with no property to violate\./)
  const two = M.label(view.drawers[0].rows.find((r) => r.entry.record.id === 'SP-1.1'), '2026-11-12')
  assert.equal([...two.matchAll(/<p class="sp-also-head sp-kicker">Also from the runs<\/p>/g)].length, 1)
  // the heading comes after the first block and before the second; a label with one block has none
  assert.ok(two.indexOf('sp-also-head') > two.indexOf('sp-evidence-witness'))
  const one = M.label(view.drawers[0].rows.find((r) => r.entry.record.id === 'SP-1.5'), '2026-11-12')
  assert.doesNotMatch(one, /sp-also-head/)
  assert.equal([...one.matchAll(/<figure /g)].length, 1)
})

test('Minimal? puts its sentence, its basis and its run on lines of their own, and the ideas show code as code', () => {
  const view = M.buildView(cabinet, EVENTS, '2026-11-12')
  const label = (id) => M.label(view.drawers[0].rows.find((r) => r.entry.record.id === id), '2026-11-12')
  const field = (html) => html.slice(html.indexOf('<dt>Minimal?</dt>'), html.indexOf('<dt>Class</dt>'))
  const basis = field(label('SP-1.2'))
  assert.equal([...basis.matchAll(/<span class="sp-line/g)].length, 3, 'the answer, the basis and the run')
  assert.match(basis, /<span class="sp-line sp-basis">A plain query for anything smaller is unsat\.<\/span>/)
  assert.match(basis, /<span class="sp-line"><code class="sp-run">RUN-z3-double-capture<\/code><\/span>/)
  // a record with no basis has the answer and the run only
  assert.equal([...field(label('SP-1.1')).matchAll(/<span class="sp-line/g)].length, 2)
  // a name that is written with a backtick pair is drawn as a code element, never with the backticks
  const html = label('SP-1.1')
  const ideas = html.slice(html.indexOf('<dt>Ideas</dt>'), html.indexOf('</dl>', html.indexOf('<dt>Ideas</dt>')))
  assert.doesNotMatch(ideas, /`/)
  assert.match(ideas, /<code class="sp-code">/)
})

test('a long schedule shows its first five and keeps the rest behind a disclosure, soonest first, never as a count of what is owed', () => {
  const html = M.screen(props({ today: '2026-11-08' }))
  const schedule = html.slice(html.indexOf('class="sp-schedule"'), html.indexOf('class="sp-drawer"'))
  // eight are mounted and none of them is kept: five are listed, three are behind the disclosure
  assert.equal([...schedule.matchAll(/<li>/g)].length, 8)
  assert.match(schedule, /<details class="sp-more"><summary>3 more, soonest first<\/summary>/)
  assert.equal([...schedule.slice(0, schedule.indexOf('<details')).matchAll(/<li>/g)].length, 5)
  assert.doesNotMatch(schedule, /\b(overdue|late|behind|missed|streaks?|deadlines?|owed|backlog)\b/i)
  // a short one has no disclosure
  const few = M.screen(props({ today: '2026-11-08', events: EVENTS.slice(0, 2) }))
  assert.doesNotMatch(few, /sp-more/)
})

test('a dated incident carries its date, its source as a link and that the model is a toy; a source that is not https is text', () => {
  const view = M.buildView(cabinet, EVENTS, '2026-11-12')
  const row = view.drawers[0].rows.find((r) => r.entry.record.id === 'SP-1.9')
  const html = M.label(row, '2026-11-12')
  assert.match(html, /<dt>Dated incident<\/dt><dd>2010-08-15 · Source: <a href="https:\/\/en\.bitcoin\.it\/wiki\/CVE-2010-5139" rel="noopener noreferrer">Bitcoin wiki, CVE-2010-5139<\/a> · a toy model of the mechanism, never the incident&#x27;s code<\/dd>/)
  const planted = structuredClone(row)
  planted.label.incident.sourceUrl = 'javascript:alert(1)'
  const bad = M.label(planted, '2026-11-12')
  assert.doesNotMatch(bad, /javascript:/)
  assert.match(bad, /Source: <span>Bitcoin wiki, CVE-2010-5139<\/span>/)
})

test('words in a record are text: markup in them is escaped, and a code span is a code element only', () => {
  const view = M.buildView(cabinet, EVENTS, '2026-11-12')
  const row = structuredClone(view.drawers[0].rows.find((r) => r.entry.record.id === 'SP-1.1'))
  row.label.because = [{ kind: 'text', text: '<img src=x onerror=alert(1)> & "quoted"' }, { kind: 'code', text: '</code><script>alert(2)</script>' }]
  const html = M.label(row, '2026-11-12')
  assert.doesNotMatch(html, /<img|<script/)
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt; &amp; &quot;quoted&quot;/)
  assert.match(html, /<code class="sp-code">&lt;\/code&gt;&lt;script&gt;alert\(2\)&lt;\/script&gt;<\/code>/)
})

test('the markup holds together: unique ids, every label and control points at something, headings in order', () => {
  for (const html of [M.screen(props()), M.screen(props({ wide: true })), M.screen(props({ initialOpen: ['SP-1.1', 'SP-1.4'] })), M.screen(props({ events: [] }))]) {
    const all = ids(html)
    assert.equal(new Set(all).size, all.length, 'ids are unique')
    for (const m of html.matchAll(/(?:aria-labelledby|aria-controls|for)="([^"]+)"/g)) assert.ok(all.includes(m[1]), `${m[0]} points at an element that is there`)
    const levels = [...html.matchAll(/<h([1-6])[ >]/g)].map((m) => Number(m[1]))
    assert.equal(levels[0], 1)
    for (let i = 1; i < levels.length; i += 1) assert.ok(levels[i] <= levels[i - 1] + 1, `a heading never skips a level (h${levels[i - 1]} then h${levels[i]})`)
    assert.doesNotMatch(html, /<script|style="|onclick=/i)
    assert.equal([...html.matchAll(/<h1[ >]/g)].length, 1)
  }
})

test('while the record is read the screen says so and lists nothing; when it cannot be read it says that, and the stages keep their headings', () => {
  const loading = M.screen(props({ record: 'loading', events: [] }))
  assert.match(loading, /Reading your practice record…/)
  assert.doesNotMatch(loading, /sp-drawer/)
  const unavailable = M.screen(props({ record: 'unavailable', events: [] }))
  assert.match(unavailable, /This browser cannot keep a practice record/)
  assert.equal([...unavailable.matchAll(/class="sp-drawer"/g)].length, 10)
  assert.doesNotMatch(unavailable, /No specimen is mounted yet/)
})

/** Every word a reader is given by a page: its text, and the words in the attributes a screen reader speaks. */
function readerText(html) {
  const decode = (t) => t.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
  const attributes = [...html.matchAll(/\s(?:aria-label|aria-description|aria-roledescription|title|alt|placeholder)="([^"]*)"/g)].map((m) => decode(m[1]))
  return [decode(html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')), ...attributes]
}

/** The strings of COPY, the functions among them called once: the screen's fixed words, including states a static page does not draw. */
function copyStrings(node = COPY, path = 'COPY') {
  return Object.entries(node).flatMap(([key, value]) => {
    if (typeof value === 'string') return [[`${path}.${key}`, value]]
    if (typeof value === 'function') return [[`${path}.${key}()`, value('2026-11-09')]]
    return copyStrings(value, `${path}.${key}`)
  })
}

test('no screen copy says a bare verified, correct, safe, proven or guaranteed, or writes a stamp', () => {
  const html = [M.screen(props({ wide: true })), M.screen(props({ events: [] }))].join('\n')
  const text = html.replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ')
  // the title of SP-1.6 quotes the spine's own words, and a quotation is not a claim; it is not listed for this learner
  assert.doesNotMatch(text, /\b(verified|correct|safe|proven|guaranteed)\b/i)
  assert.doesNotMatch(text, /\bdrawers?\b/i, 'the glossary\'s drawer is side material; the cabinet\'s stages are headings')
})

test('no screen copy names an internal term: every word a reader is given, with every specimen met, is held to the glossary\'s list', () => {
  const { glossary, problem } = readGlossary(REPO)
  assert.equal(problem, undefined, problem)
  // the lists are the glossary's own, so a name it gains is refused here the day it lands
  assert.ok(glossary.internal.some((x) => x.name === 'Boot') && glossary.internal.some((x) => x.name === 'KC') && glossary.internal.some((x) => x.name === 'tier'))
  // a learner who has met all ten, so that every record's words and every label's generated sentences are drawn; the same learner narrow, open
  const everything = [...EVENTS, call('S1.L3', '2026-11-04T08:00:00Z')]
  const every = loadCabinet().specimens.map((e) => e.record.id)
  const pages = {
    'wide, every label open': M.screen(props({ wide: true, events: everything })),
    'narrow, every label open': M.screen(props({ events: everything, initialOpen: every })),
    'narrow, every label closed': M.screen(props({ events: everything })),
    'nothing met': M.screen(props({ events: [] })),
    'reading the record': M.screen(props({ record: 'loading', events: [] })),
    'record unavailable': M.screen(props({ record: 'unavailable', events: [] })),
  }
  const strings = [...Object.entries(pages).flatMap(([name, html]) => readerText(html).map((t) => [name, t])), ...copyStrings()]
  assert.ok(strings.length > 20)
  assert.ok(strings.some(([, t]) => /The variant from Start here/.test(t)), 'the words of the records are among the strings checked')
  assert.ok(strings.some(([, t]) => /contradictory premises/.test(t)), 'so is the label of SP-1.6, which only a learner who has met S1.L3 is given')
  const found = strings.flatMap(([where, text]) => internalFindings(text, glossary).map((f) => `${where}: ${f.detail}`))
  assert.deepEqual([...new Set(found)], [])
})
