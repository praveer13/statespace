// SCR-mirror as it renders: the real screen, bundled with esbuild and drawn to static markup, over the real derivations
// (deriveMirror, deriveVrk30) of a learner's log. This checks what a reader and a screen reader get: the order (bias, then the
// bands), the interval and n on every row, the sentence only past the minimum and only when the interval lies outside the band,
// assisted calls apart, VRK30's count and rate, the words, escaping, and that the stylesheet is ink only. Layout at 320, 360 and
// 1280 px, axe and the keyboard are the browser harness's (scripts/spikes/W1-T07/harness).

import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test, { after, before } from 'node:test'
import { pathToFileURL } from 'node:url'
import { copyProblems, readGlossary } from '../../../../../../scripts/spikes/W1-T07/lib/words.mjs'
import { MIN_CALLS_PER_BAND, deriveMirror, deriveVrk30, rateOf } from '../../../../../../packages/learner/src/mirror/index.ts'
import { COPY } from '../copy.ts'
import { siteContent } from '../content.ts'
import { KC, REPO, call, fresh, inBand, learned, minutes } from './helpers.mjs'

const SCREEN = path.join(REPO, 'apps/site/src/screens/mirror')
let dir
let M

before(async () => {
  const esbuild = (await import('esbuild')).default ?? (await import('esbuild'))
  dir = fs.mkdtempSync(path.join(process.env.W1T07_SCRATCH ?? os.tmpdir(), 'w1t07-mirror-'))
  const entry = `
    import { createElement } from 'react'
    import { renderToStaticMarkup } from 'react-dom/server'
    import { MemoryRouter } from 'react-router'
    import { MirrorScreen } from ${JSON.stringify(path.join(SCREEN, 'MirrorScreen.tsx'))}
    export const render = (props) => renderToStaticMarkup(createElement(MemoryRouter, { initialEntries: ['/mirror'] }, createElement(MirrorScreen, props)))
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

const NOW = '2027-06-01T00:00:00Z'
const ideaName = (kc) => ({ 'KC-1.three-answers': 'What `sat`, `unsat` and `unknown` each assert', 'KC-1.violation-as-sat': 'A violation search asks for a model' })[kc]

function props(events, extra = {}) {
  const log = [learned(), ...events]
  return { record: 'ready', mirror: deriveMirror({ events: log, content: siteContent, now: NOW }), vrk: deriveVrk30({ events: log, content: siteContent, now: NOW }), ideaName, ...extra }
}
const html = (p) => M.render(p)
const text = (h) => h.replace(/<[^>]*>/g, ' ').replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim()
const count = (h, re) => [...h.matchAll(re)].length

test('the states: reading the record, no record, and a record with no counted call', () => {
  const loading = html({ record: 'loading', mirror: null, vrk: null, ideaName })
  assert.match(loading, /<h1>Mirror<\/h1>/)
  assert.match(text(loading), /Reading your record…/)
  assert.doesNotMatch(loading, /<h2/)
  const gone = html({ record: 'unavailable', mirror: null, vrk: null, ideaName })
  assert.match(text(gone), /This browser is not keeping your record, so there is nothing to show here\./)
  const empty = html(props([]))
  assert.match(text(empty), new RegExp(`It shows nothing until there are enough calls to say anything: at least ${MIN_CALLS_PER_BAND} in a band\\.`))
  assert.equal(count(empty, /<li class="mr-band">/g), 3, 'the three bands have rows even when empty')
  assert.equal(count(text(empty), /No calls in this band yet\./g), 3)
  assert.doesNotMatch(empty, /class="mr-bias-line"/)
  assert.match(text(empty), /Nothing yet\. An idea counts after you answer a fresh question on it, right, 30 days or more after you first learned it\./)
})

test('the page is private and reached from Today: a way back to Today, no link to Claims, no export', () => {
  const h = html(props([]))
  assert.match(h, /<a href="\/today"[^>]*>Back to Today<\/a>/)
  assert.match(text(h), /Only you see this\. It stays on this device and is never part of a shared report\./)
  assert.doesNotMatch(h, /href="\/claims|download|export/i)
})

test('the diagnosis table of ASSESSMENT.md section 5.6, as the screen says it', () => {
  const sure18 = text(html(props(inBand('sure', 30, 18))))
  assert.match(sure18, /sure · above 80% 18 of 30 right · hit rate 0\.60 · interval 0\.42–0\.75/)
  assert.match(sure18, /Your “sure” calls hit less often than “sure” says: 18 of 30, interval 0\.42–0\.75\./)
  const sure21 = text(html(props(inBand('sure', 30, 21))))
  assert.match(sure21, /21 of 30 right · hit rate 0\.70 · interval 0\.52–0\.83/)
  assert.match(sure21, /The interval reaches the band, so there is nothing to report\./)
  assert.doesNotMatch(sure21, /hit less often|hit more often/)
  const sure18of20 = text(html(props(inBand('sure', 20, 18))))
  assert.match(sure18of20, /18 of 20 right · hit rate 0\.90 · interval 0\.70–0\.97/)
  assert.match(sure18of20, /The interval reaches the band/)
  const think = text(html(props(inBand('think', 12, 7))))
  assert.match(think, /think so · 67–80% 7 of 12 right · hit rate 0\.58 · interval 0\.32–0\.81/)
  assert.match(think, /Too few calls in this band to say anything yet \(12\)\./)
  assert.doesNotMatch(think, /hit less often|hit more often|reaches the band/)
  const guess = text(html(props(inBand('guess', 40, 40))))
  assert.match(guess, /Your “guess” calls hit more often than “guess” says: 40 of 40, interval 0\.91–1\.00\./)
})

test('bias leads: shown with its interval from 20 calls, a wait notice before, and the sets in a group of their own', () => {
  const few = html(props(inBand('sure', 19, 10)))
  assert.match(text(few), /Too few calls to say anything about bias yet \(19 of 20\)\./)
  assert.doesNotMatch(few, /class="mr-bias-line"/)
  const enough = html(props(inBand('sure', 20, 15)))
  const t = text(enough)
  assert.match(t, /BIAS|Bias/)
  assert.match(t, /\+0\.15 \(interval \+0\.0\d to \+0\.\d\d\)/)
  assert.match(t, /Stated confidence averaged 0\.90\. 15 of 20 calls were right: hit rate 0\.75, interval 0\.53–0\.89\./)
  // bias comes before the bands in the page
  assert.ok(enough.indexOf('mr-bias-line') < enough.indexOf('mr-bands'))
  const both = html(props([...inBand('sure', 22, 18), ...inBand('think', 21, 12, { shape: { form: 'set', statements: 5 } })]))
  assert.match(both, /<h3 id="mr-own-answer-h">Calls with one answer<\/h3>/)
  assert.match(both, /<h3 id="mr-own-set-h">Calls on a set of statements<\/h3>/)
  assert.equal(count(html(props(inBand('sure', 22, 18))), /Calls on a set of statements/g), 0, 'a group with no call is not drawn')
})

test('assisted calls are shown apart, never pooled, and carry no bias and no sentence', () => {
  const h = html(props([...inBand('sure', 22, 12), ...inBand('sure', 25, 25, { provenance: 'assisted' })]))
  const t = text(h)
  assert.match(t, /Calls made with help, shown apart/)
  assert.match(t, /These are kept out of everything above and never pooled with it\./)
  const apart = t.slice(t.indexOf('Calls made with help, shown apart'), t.indexOf('What counts'))
  assert.match(apart, /25 of 25 right/)
  assert.doesNotMatch(apart, /Bias|hit less often|hit more often|reaches the band|Too few/)
  // the learner's own group says 12 of 22, never 37 of 47
  assert.match(t, /12 of 22 right/)
  assert.doesNotMatch(t, /37 of 47/)
  // "what counts" says "with no help declared", so it counts the learner's own calls and not the ones made with help
  assert.match(t, /22 calls count: your first call on each question/)
  assert.doesNotMatch(t, /47 calls count/)
})

test('what counts: the calls that count and each reason a call was left out, in words, only when there is something to say', () => {
  const log = [
    ...inBand('think', 3, 2),
    call({ provenance: 'agent' }),
    call({ exposure: 'seen' }),
    call({ at: minutes(5), ref: 'call:S1.L2/c900' }),
    call({ ref: 'call:S1.L2/c901', kc: 'KC-1.never-learned' }),
  ]
  const t = text(html(props(log)))
  assert.match(t, /3 calls count: your first call on each question, made after the lesson that teaches it, with no help declared\./)
  assert.match(t, /Left out:/)
  assert.match(t, /1 an agent made\./)
  assert.match(t, /1 on a question you had seen before\./)
  assert.match(t, /2 made before the lesson that teaches the idea \(kept out on purpose\)\./)
  const clean = text(html(props(inBand('think', 1, 1))))
  assert.match(clean, /1 call counts:/)
  assert.doesNotMatch(clean, /Left out:/)
})

test('VRK30: the count, the rate per active study-month, the accuracy with its interval, and the ideas in words', () => {
  const kcs = ['KC-1.three-answers', 'KC-1.violation-as-sat']
  const log = []
  // both KCs first learned at minute 10 (the exit item of S1.L2 teaches KC-1.three-answers; KC-1.violation-as-sat is taught in S1.L1)
  log.push(event0('S1.L1'))
  for (const kc of kcs) {
    log.push(fresh(kc, 35, true))
    log.push(fresh(kc, 40, kc === kcs[0]))
  }
  // active study-months: four days of graded work in each of two months
  for (const day of ['2026-12-01', '2026-12-02', '2026-12-03', '2026-12-04', '2027-01-05', '2027-01-06', '2027-01-07', '2027-01-08']) log.push(fresh('KC-1.three-answers', 100, true, { at: `${day}T09:00:00Z` }))
  const t = text(html(props(log)))
  assert.match(t, /Reasoning moves still yours at 30 days \(VRK 30 \)/)
  assert.match(t, /Count 1 idea whose latest answer, 30 days or more after you first learned them, was right/)
  assert.match(t, /Rate 0\.50 per active study-month \(2 months with graded work on 4 or more days\)/)
  // one of the eight events of the first month is 29 days after first learning, so 11 events qualify and 10 are right
  assert.match(t, /Answers 10 of 11 answers right 30 days or more after first learning · interval 0\.62–0\.98/)
  assert.match(t, /Ideas that count/)
  assert.match(t, /What sat\s*,\s*unsat and unknown each assert/)
  assert.doesNotMatch(t, /KC-1\./, 'an idea is shown in words, never by its ID')
  // a code span in an idea's name is set in the code face, and its backticks are not shown
  const named = html(props(log))
  assert.match(named, /What <code class="mr-code">sat<\/code>, <code class="mr-code">unsat<\/code> and <code class="mr-code">unknown<\/code> each assert/)
  assert.doesNotMatch(named, /`/)
  assert.match(t, /first learned 2026-11-02 · latest answer 2027-/)
  assert.match(t, /Settled ideas are marked here once a stage is signed off and a fresh question on the idea is answered 30 days or more later\./)
})

function event0(lesson) {
  return fresh('KC-1.violation-as-sat', 0, true, { at: minutes(10), seed: 99, data: { exit: { lesson } } })
}

test('VRK30 marks a settled idea and names an idea the graph does not hold without showing its ID', () => {
  const log = [event0('S1.L1'), fresh('KC-1.violation-as-sat', 40, true), fresh('KC-1.not-in-the-graph', 40, true)]
  const p = props(log)
  const settled = { ...p, vrk: deriveVrk30({ events: [learned(), ...log], content: siteContent, now: NOW, settled: new Set(['KC-1.violation-as-sat']) }) }
  const t = text(html(settled))
  assert.match(t, /A violation search asks for a model settled/)
  assert.doesNotMatch(t, /KC-1\./)
})

test('the dimension line: the interval and the hit rate on a 0 to 100% axis, and the band\'s range above it (guess: from its chance to 67%)', () => {
  const bracket = (h) => [...h.matchAll(/class="mr-bracket" d="([^"]*)"/g)].map((m) => m[1])
  const dimension = (h) => [...h.matchAll(/class="mr-dimension" d="([^"]*)"/g)].map((m) => m[1])
  // eight three-option guesses: the guess band's range starts at 1 in 3 of the 300-unit axis (100) and ends at 67% (201)
  const guess = html(props(inBand('guess', 8, 3)))
  assert.deepEqual(bracket(guess), ['M100 9 V3 H201 V9'])
  // 3 of 8: the Wilson interval, in drawing units of the 300-unit axis, to a tenth; the hit rate's mark sits at 3/8 of it
  const w = rateOf(3, 8)
  const u = (x) => Math.round(x * 3000) / 10
  assert.deepEqual(dimension(guess), [`M${u(w.low)} 16 H${u(w.high)} M${u(w.low)} 11 V21 M${u(w.high)} 11 V21`])
  assert.deepEqual([...guess.matchAll(/class="mr-rate" d="([^"]*)"/g)].map((m) => m[1]), [`M${u(3 / 8)} 10 V22`])
  // a constructed answer has no guessing floor, so its range starts at 0; think so and sure keep the printed band
  assert.deepEqual(bracket(html(props(inBand('guess', 5, 1, { shape: { form: 'constructed' } })))), ['M0 9 V3 H201 V9'])
  const both = html(props([...inBand('think', 5, 3), ...inBand('sure', 5, 4)]))
  assert.deepEqual(bracket(both), ['M201 9 V3 H240 V9', 'M240 9 V3 H300 V9'])
})

test('the page is a document: one h1, section headings, lists for the rows, a hidden drawing, and a closed drawer for how to read it', () => {
  const h = html(props(inBand('sure', 30, 18)))
  assert.equal(count(h, /<h1>/g), 1)
  assert.deepEqual([...h.matchAll(/<h([1-4])/g)].map((m) => Number(m[1])).filter((n, i, a) => i === 0 || n <= a[i - 1] + 1), [...h.matchAll(/<h([1-4])/g)].map((m) => Number(m[1])), 'headings never skip a level')
  // one drawing for the one band that holds calls, hidden from assistive technology: the row prints the same numbers
  assert.equal(count(h, /<svg [^>]*aria-hidden="true"/g), 1)
  assert.equal(count(h, /<svg/g), 1)
  assert.match(h, /<details class="mr-how"><summary>How to read this<\/summary>/)
  assert.doesNotMatch(h, /<details[^>]*open/)
  assert.equal(count(h, /\sstyle=/g), 0)
  assert.doesNotMatch(h, /<script|<img|<a href="http/)
})

test('every word the screen gives a reader keeps the vocabulary rules: no internal name, no ID, and no glossary term whose first lesson is after S1.L1', () => {
  const glossary = readGlossary()
  const log = [...inBand('sure', 30, 18), ...inBand('guess', 25, 5, { provenance: 'assisted' }), call({ provenance: 'agent' }), call({ exposure: 'seen' })]
  const pages = [html(props(log)), html(props([])), html({ record: 'loading', mirror: null, vrk: null, ideaName }), html({ record: 'unavailable', mirror: null, vrk: null, ideaName })]
  for (const [i, h] of pages.entries()) assert.deepEqual(copyProblems(text(h), glossary, { lesson: 'S1.L1' }), [], `page ${i}`)
  // a copy function is called with numbers, or with a tap's name first where it names a band
  const sample = (fn) => {
    for (const args of [[1, 2, 3, 4, 5], ['guess', 1, 2, 3, 4], ['2026-11-02', '2026-12-05']]) {
      try {
        const out = fn(...args)
        if (typeof out === 'string' && !out.includes('undefined')) return out
      } catch {}
    }
    throw new Error(`no sample arguments for ${fn}`)
  }
  const fixed = Object.entries(COPY).flatMap(([k, v]) =>
    typeof v === 'string' ? [[k, v]] : Array.isArray(v) ? v.map((x, i) => [`${k}[${i}]`, x]) : typeof v === 'function' ? [[k, sample(v)]] : Object.entries(v).map(([a, b]) => [`${k}.${a}`, typeof b === 'function' ? sample(b) : b]),
  )
  for (const [k, s] of fixed) assert.deepEqual(copyProblems(String(s), glossary, { lesson: 'S1.L1' }), [], `COPY.${k}`)
})

test('the bands are named as the spine prints them, and the how-to-read text names the same bands and minimum', () => {
  const h = text(html(props(inBand('think', 5, 3))))
  for (const band of ['guess · below 67%', 'think so · 67–80%', 'sure · above 80%']) assert.ok(h.includes(band), band)
  assert.match(h, /A band gets a sentence only with at least 20 calls and an interval wholly outside its printed band\./)
  assert.match(h, /guess \(below 67%\), think so \(67–80%\) or sure \(above 80%\)/)
  assert.match(h, /0\.73 for think so, 0\.90 for sure, and for guess midway between the question's chance and 2\/3/)
  assert.match(h, /Provenance is self-declared\. Nothing on this device can tell assisted work from unassisted work\./)
})

test('the stylesheets are ink only: no stamp token, no vermilion, no literal colour, no dashed or dotted line, no gradient, no shadow', () => {
  for (const file of ['apps/site/src/screens/mirror/mirror.css', 'apps/site/src/components/call-it/call-it.css']) {
    const css = fs.readFileSync(path.join(REPO, file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
    assert.doesNotMatch(css, /--st-|--line-violation|--line-crack|--line-assumed|--line-bounded/, `${file}: no stamp or line token`)
    assert.doesNotMatch(css, /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(|\bhwb\(|\blab\(|\blch\(|\boklab\(|\boklch\(|\bcolor\(/, `${file}: no literal colour`)
    assert.doesNotMatch(css, /\b(dashed|dotted)\b|stroke-dasharray|gradient\(/, `${file}: no dashed, dotted or gradient line`)
    assert.doesNotMatch(css, /box-shadow:(?!\s*none)|text-shadow|filter:|backdrop-filter/, `${file}: no shadow, glow or blur`)
    for (const m of css.matchAll(/var\((--[a-z0-9-]+)/g)) assert.match(m[1], /^--(ground|sheet|paper|ink|pencil|structure|rule|rule-hair|rule-soft|link|here|band|focus-ring|focus-width|focus-offset|space-\d|gutter|border-[a-z]+|radius|target|measure|content-max|font-[a-z]+|fs-[a-z-]+|lh-[a-z-]+|tracking-[a-z]+|motion-[a-z-]+|ci-dock-height)$/, `${file}: ${m[1]} is a token of tokens.css`)
  }
})
