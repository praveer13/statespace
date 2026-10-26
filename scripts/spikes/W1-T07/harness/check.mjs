// Runs inside the pinned Playwright image (mcr.microsoft.com/playwright:v1.63.0-noble):
//   node scripts/spikes/W1-T07/harness/check.mjs <dist> <out> <base>
// Serves the built harness and, in Chromium, Firefox and WebKit:
//
//   THE FIRST CALL IS FINAL (M-call-it; W1-T07's acceptance), on the real IndexedDB adapter:
//   - verdict, then confidence, then the action appear in turn; the action starts the host's run only after the call is in the log
//   - once recorded the whole fieldset is disabled; a forced click, a hostile re-enable of the fieldset and a click on every other
//     answer and tap change nothing on screen and write nothing; a reload and a second tab show the same read-only call
//   - a stale tab (one that hears no other tab) that commits after another tab did writes nothing and shows the call that stands
//   - an open tab hears the other tab's call and turns read-only without a reload
//   - two tabs that commit at the same moment end with one call that counts, the same one on both screens
//   - one mounted cell given another question starts again, and a question called earlier shows its own call when it comes round
//   - a set of statements, the help box, the expert skip, and a store that fails (the call is not recorded, and nothing is lost)
//
//   LAYOUT AND ACCESS: at 320, 360 and 1280 px in both themes, axe (WCAG 2.2 AA tags) with no serious or critical issue, no
//   sideways scroll, the site's three faces loaded, every control at least 44 px; the keyboard path of DESIGN.md section 10.3; the
//   docked sheet never hides a focused control above it (WCAG 2.4.11).
//
//   THE MIRROR: the screen over a learner's log at the three widths; the route over the real adapter with the clock fixed, and a
//   call written by a second tab reaches the first without a reload.
//
// and writes a report. Exit 0 when nothing fails.

import AxeBuilder from '@axe-core/playwright'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { chromium, firefox, webkit } from 'playwright-core'

const [dist, out, base = '/statespace/'] = process.argv.slice(2)
fs.mkdirSync(out, { recursive: true })
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.json': 'application/json', '.svg': 'image/svg+xml', '.txt': 'text/plain' }
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x')
  const p = url.pathname.startsWith(base) ? url.pathname.slice(base.length) : null
  if (p === null) return res.writeHead(404).end()
  const file = path.join(dist, p === '' || p.endsWith('/') ? `${p}index.html` : p)
  if (!file.startsWith(path.resolve(dist)) || !fs.existsSync(file)) return res.writeHead(404).end()
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream' })
  fs.createReadStream(file).pipe(res)
})
await new Promise((r) => server.listen(4174, '127.0.0.1', r))
const origin = `http://127.0.0.1:4174${base}`

const failures = []
const report = { layout: [], final: [], keyboard: [], dock: [], mirror: [], notes: [] }
const fail = (where, what) => {
  failures.push(`${where}: ${what}`)
  console.log(`FAIL ${where}: ${what}`)
}
const stable = (v) => JSON.stringify(v, (_, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => (a < b ? -1 : 1))) : x))
const same = (where, got, want, what) => {
  if (stable(got) !== stable(want)) fail(where, `${what}: got ${stable(got)}, expected ${stable(want)}`)
}
// ONLY=final,layout,keyboard,dock,mirror picks the parts to run; ENGINES=chromium picks the engines (both for a quick look)
const only = (process.env.ONLY || 'final,layout,keyboard,dock,mirror').split(',')
const engines = (process.env.ENGINES || 'chromium,firefox,webkit').split(',')

const ready = async (page) => {
  await page.waitForSelector('html[data-harness="ready"]', { timeout: 40000 })
  await page.evaluate(() => document.fonts.ready)
}
async function until(fn, ms = 8000, step = 50) {
  const end = Date.now() + ms
  for (;;) {
    const v = await fn()
    if (v) return v
    if (Date.now() > end) return v
    await new Promise((r) => setTimeout(r, step))
  }
}

async function axeOf(page) {
  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()
  return {
    serious: axe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, help: v.help, targets: v.nodes.slice(0, 3).map((n) => n.target.join(' ')) })),
    all: axe.violations.map((v) => `${v.id}:${v.impact}`),
  }
}

const CONTROLS = '.ci-option, .ci-tap, .ci-tf-option, .ci-help, .ci-action, .ci-skip, .mr-back a, .mr-how summary, .h-button'
async function smallControls(page) {
  return page.evaluate((sel) => {
    return [...document.querySelectorAll(sel)]
      .filter((el) => el.getClientRects().length > 0 && !el.disabled)
      .map((el) => ({ el, r: el.getBoundingClientRect() }))
      .filter(({ r }) => r.width < 43.5 || r.height < 43.5)
      .map(({ el, r }) => `${el.tagName.toLowerCase()}.${[...el.classList].join('.')} ${Math.round(r.width)}x${Math.round(r.height)} "${(el.textContent ?? '').trim().slice(0, 30)}"`)
  }, CONTROLS)
}
const overflowOf = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
const callsOf = async (page, ref) => (await page.evaluate(() => window.harness.events())).filter((e) => e.kind === 'call' && (ref === undefined || e.ref === ref))
const stateOf = (page) => page.locator('.ci').first().getAttribute('data-state')
const checkedOf = (page) => page.evaluate(() => [...document.querySelectorAll('.ci input[type="radio"]:checked')].map((i) => `${i.name.replace(/^.*-/, '')}=${i.value}`).sort())
const allDisabled = (page) => page.evaluate(() => [...document.querySelectorAll('.ci input, .ci button')].every((el) => el.disabled || el.closest('fieldset[disabled]')))

/** The three taps in turn: verdict, then confidence, then the action. */
async function ready3(page, verdict, conf, { help = false } = {}) {
  await page.locator(`.ci input[name$="-v"][value="${verdict}"]`).check()
  await page.locator(`.ci input[name$="-c"][value="${conf}"]`).check()
  if (help) await page.locator('.ci-help input').check()
}

for (const [name, engine] of [['chromium', chromium], ['firefox', firefox], ['webkit', webkit]].filter(([n]) => engines.includes(n))) {
  const browser = await engine.launch()
  const version = browser.version()

  // ================================================================ the first call is final
  if (only.includes('final')) {
    const where = `${name} final`
    const ctx = await browser.newContext({ viewport: { width: 360, height: 800 }, serviceWorkers: 'block' })
    const a = await ctx.newPage()
    await a.goto(`${origin}?view=cell&item=verdict`)
    await ready(a)
    await a.waitForSelector('.ci')

    // in turn: the verdict, then the confidence, then the action
    same(where, await stateOf(a), 'choosing', 'a fresh sheet is open')
    same(where, await a.locator('.ci-taps').count(), 0, 'no confidence taps before a verdict')
    same(where, await a.locator('.ci-action').isDisabled(), true, 'the action is off before a verdict')
    await a.locator('.ci input[name$="-v"][value="B"]').check()
    await a.waitForSelector('.ci-taps')
    same(where, await a.locator('.ci-taps input').count(), 3, 'three taps after a verdict')
    same(where, await a.locator('.ci-action').isDisabled(), true, 'the action is still off with no confidence')
    const taps = await a.locator('.ci-tap').evaluateAll((els) => els.map((e) => e.innerText.trim().replace(/\s+/g, ' ')))
    same(where, taps, ['guess below 67%', 'think so 67–80%', 'sure above 80%'], 'the bands are printed on the taps')
    const chance = await a.locator('.ci-chance').innerText()
    same(where, chance, '3 options · chance 1 in 3', 'the chance is printed')
    const payoffs = await a.locator('.ci-payoffs').innerText()
    same(where, payoffs, 'Feedback only, never credit: guess +1 / 0 · think so +2 / −2 · sure +3 / −6.', 'the payoffs are printed before the tap')
    await a.locator('.ci input[name$="-c"][value="think"]').check()
    same(where, await a.locator('.ci-action').isDisabled(), false, 'the action is on with both')
    same(where, (await callsOf(a)).length, 0, 'nothing is written before the action')

    await a.locator('.ci-action').click()
    await a.waitForSelector('.ci[data-state="recorded"]')
    // the host's run starts only after the call is in the log
    const started = await a.waitForSelector('[data-run-started="yes"]')
    same(where, await started.getAttribute('data-calls-in-log'), '1', 'the host\'s run starts once, with the call already in the log')
    const calls = await callsOf(a)
    same(where, calls.length, 1, 'one call event')
    const c = calls[0]
    same(where, { ref: c.ref, conf: c.conf, ok: c.ok, resp: c.resp, provenance: c.provenance, exposure: c.exposure, kc: c.data.call.kc, shape: [c.data.call.form, c.data.call.options] }, { ref: 'call:S1.L1/c1', conf: 'think', ok: true, resp: { picked: 'B' }, provenance: 'own', exposure: 'unseen', kc: 'KC-1.quantifier-negation', shape: ['choice', 3] }, 'the call as written')
    same(where, typeof c.ms, 'number', 'time on task is recorded')

    // read-only: every control is disabled and the sheet says what was called
    same(where, await allDisabled(a), true, 'every control is disabled once the call is recorded')
    same(where, await a.locator('.ci-action').count(), 0, 'no action once recorded')
    const before = await checkedOf(a)
    same(where, before, ['c=think', 'v=B'], 'the call that was made is the one shown')
    const line = await a.locator('.ci-recorded').innerText()
    if (!/Your call matched\. Recorded: B\. unsat · think so\. \+2, feedback only\./.test(line)) fail(where, `the record line reads "${line}"`)

    // edits: a forced click on another answer and tap, a keyboard, and a hostile re-enable of the fieldset all change nothing
    for (const sel of ['.ci input[name$="-v"][value="A"]', '.ci input[name$="-v"][value="C"]', '.ci input[name$="-c"][value="sure"]', '.ci input[name$="-c"][value="guess"]']) {
      await a.locator(sel).click({ force: true, timeout: 2000 }).catch(() => {})
    }
    await a.keyboard.press('Tab')
    await a.keyboard.press('ArrowDown')
    await a.keyboard.press('Space')
    same(where, await checkedOf(a), before, 'forced clicks and keys change nothing')
    await a.evaluate(() => {
      for (const f of document.querySelectorAll('.ci fieldset')) f.disabled = false
    })
    for (const sel of ['.ci input[name$="-v"][value="A"]', '.ci input[name$="-c"][value="sure"]']) await a.locator(sel).click({ force: true, timeout: 2000 }).catch(() => {})
    await a.waitForTimeout(200)
    same(where, await checkedOf(a), before, 'a hostile re-enable of the fieldset still changes nothing on screen')
    same(where, (await callsOf(a)).length, 1, 'and writes nothing')
    same(where, await stateOf(a), 'recorded', 'the sheet stays recorded')

    // a reload and a second tab: the same read-only call, read from the log
    await a.reload()
    await ready(a)
    await a.waitForSelector('.ci[data-state="recorded"]')
    same(where, await checkedOf(a), before, 'a reload shows the same call')
    same(where, await allDisabled(a), true, 'a reload shows it read-only')
    const b = await ctx.newPage()
    await b.goto(`${origin}?view=cell&item=verdict`)
    await ready(b)
    await b.waitForSelector('.ci[data-state="recorded"]')
    same(where, await checkedOf(b), before, 'a second tab shows the same call')
    same(where, (await callsOf(b)).length, 1, 'still one call event')
    await b.close()

    // an open tab hears another tab's call and turns read-only without a reload (the channel is on)
    const c1 = await ctx.newPage()
    const c2 = await ctx.newPage()
    await c1.goto(`${origin}?view=cell&item=budget`)
    await c2.goto(`${origin}?view=cell&item=budget`)
    await ready(c1)
    await ready(c2)
    await c1.waitForSelector('.ci[data-state="choosing"]')
    await c2.waitForSelector('.ci[data-state="choosing"]')
    await ready3(c2, 'B', 'sure')
    await c2.locator('.ci-action').click()
    await c2.waitForSelector('.ci[data-state="recorded"]')
    const heard = await until(async () => (await stateOf(c1)) === 'recorded', 10000)
    if (!heard) fail(where, 'an open tab did not hear the other tab\'s call')
    else same(where, await checkedOf(c1), ['c=sure', 'v=B'], 'the open tab shows the call the other tab made')
    same(where, await allDisabled(c1), true, 'and shows it read-only')
    await c1.close()
    await c2.close()

    // a stale tab (hears no one) commits after another tab did: nothing is written, and the call that stands is shown
    const s1 = await ctx.newPage()
    const s2 = await ctx.newPage()
    await s1.goto(`${origin}?view=cell&item=unknown`)
    await s2.goto(`${origin}?view=cell&item=unknown&channel=off`)
    await ready(s1)
    await ready(s2)
    await s2.waitForSelector('.ci[data-state="choosing"]')
    await ready3(s2, 'A', 'guess')
    await s1.waitForSelector('.ci[data-state="choosing"]')
    await ready3(s1, 'C', 'sure')
    await s1.locator('.ci-action').click()
    await s1.waitForSelector('.ci[data-state="recorded"]')
    await s2.waitForTimeout(300)
    same(where, await stateOf(s2), 'choosing', 'the stale tab still shows an open sheet, as it heard nothing')
    await s2.locator('.ci-action').click()
    await s2.waitForSelector('.ci[data-state="recorded"]')
    same(where, (await callsOf(s2, 'call:S1.L2/c1')).length, 1, 'the stale tab wrote nothing')
    same(where, await checkedOf(s2), ['c=sure', 'v=C'], 'the stale tab shows the call that stands, not its own taps')
    const notice = await s2.locator('.ci-record').innerText()
    if (!/This question was already called, in another tab\. That call stands\./.test(notice)) fail(where, `the stale tab says "${notice}"`)
    await s1.close()
    await s2.close()

    // two tabs commit at the same moment: one call counts, the same one on both screens
    for (let round = 0; round < 3; round += 1) {
      const items = ['gverdict', 'interval', 'anomaly']
      const item = items[round]
      const p1 = await ctx.newPage()
      const p2 = await ctx.newPage()
      await p1.goto(`${origin}?view=cell&item=${item}&channel=off`)
      await p2.goto(`${origin}?view=cell&item=${item}&channel=off`)
      await ready(p1)
      await ready(p2)
      await p1.waitForSelector('.ci[data-state="choosing"]')
      await p2.waitForSelector('.ci[data-state="choosing"]')
      const ids = await p1.locator('.ci input[name$="-v"]').evaluateAll((els) => els.map((e) => e.value))
      await ready3(p1, ids[0], 'sure')
      await ready3(p2, ids[1], 'guess')
      await Promise.all([p1.locator('.ci-action').click(), p2.locator('.ci-action').click()])
      await p1.waitForSelector('.ci[data-state="recorded"]')
      await p2.waitForSelector('.ci[data-state="recorded"]')
      await p1.waitForTimeout(300)
      const [r1, r2] = [await checkedOf(p1), await checkedOf(p2)]
      same(`${where} race ${item}`, r1, r2, 'both screens show the same call')
      const written = await callsOf(p1)
      const ref = (await p1.evaluate((k) => window.harness.items[k].ref, item))
      const mine = written.filter((e) => e.ref === ref)
      if (mine.length < 1 || mine.length > 2) fail(`${where} race ${item}`, `${mine.length} call events for one question`)
      const first = [...mine].sort((x, y) => (x.at < y.at ? -1 : x.at > y.at ? 1 : x.id < y.id ? -1 : 1))[0]
      same(`${where} race ${item}`, r1.sort(), [`c=${first.conf}`, `v=${first.resp.picked}`].sort(), 'the screens show the first call in fold order')
      report.final.push({ engine: name, race: item, events: mine.length })
      await p1.close()
      await p2.close()
    }

    // the help box writes the call as assisted; a set of statements is one call with one confidence
    const h = await ctx.newPage()
    await h.goto(`${origin}?view=cell&item=value`)
    await ready(h)
    await h.waitForSelector('.ci[data-state="choosing"]')
    await ready3(h, 'A', 'sure', { help: true })
    await h.locator('.ci-action').click()
    await h.waitForSelector('.ci[data-state="recorded"]')
    const helped = (await callsOf(h, 'call:S1.L1/c2'))[0]
    same(`${where} help`, [helped.provenance, helped.ok, helped.conf], ['assisted', true, 'sure'], 'a call made with help')
    const note = await h.locator('.ci-recorded').innerText()
    if (!/Marked as made with help\./.test(note)) fail(`${where} help`, `the record says "${note}"`)
    await h.close()

    const t = await ctx.newPage()
    await t.goto(`${origin}?view=cell&item=set`)
    await ready(t)
    await t.waitForSelector('.ci[data-state="choosing"]')
    same(`${where} set`, await t.locator('.ci-chance').innerText(), 'all 5 by guessing: 1 in 32', 'the set prints 1 in 2^5')
    same(`${where} set`, await t.locator('.ci-taps').count(), 0, 'no taps until every statement is marked')
    const truth = { s1: true, s2: false, s3: false, s4: true, s5: false }
    for (const [id, v] of Object.entries(truth).slice(0, 4)) await t.locator(`.ci input[name$="-s-${id}"][value="${v}"]`).check()
    same(`${where} set`, await t.locator('.ci-taps').count(), 0, 'four of five marked: still no taps')
    await t.locator('.ci input[name$="-s-s5"][value="false"]').check()
    await t.waitForSelector('.ci-taps')
    await t.locator('.ci input[name$="-c"][value="sure"]').check()
    await t.locator('.ci-action').click()
    await t.waitForSelector('.ci[data-state="recorded"]')
    const set = (await callsOf(t, 'call:GEN-call-it/t4'))[0]
    same(`${where} set`, [set.ok, set.conf, set.resp.answers, set.data.call], [true, 'sure', truth, { form: 'set', statements: 5, kc: 'KC-1.three-answers' }], 'the set as written')
    same(`${where} set`, typeof set.seed, 'number', 'a generated instance records its seed')
    await t.close()

    await ctx.close()

    // one mounted sheet given another question starts again: the call on a question is never shown on the next, and a question that has
    // been called shows its own call when it comes round again. Once as the cell bound to the real adapter and once as the sheet on
    // its own, each in a profile of its own, so that neither question has been called
    for (const [mode, query] of [['cell', 'view=switch'], ['sheet on its own', 'view=switch&mode=direct']]) {
      const ctx3 = await browser.newContext({ viewport: { width: 360, height: 800 }, serviceWorkers: 'block' })
      const sw = await ctx3.newPage()
      const at = `${where} switch (${mode})`
      await sw.goto(`${origin}?${query}`)
      await ready(sw)
      await sw.waitForSelector('.ci[data-state="choosing"]')
      const first = await sw.locator('[data-question]').innerText()
      await ready3(sw, 'B', 'sure')
      await sw.locator('.ci-action').click()
      await sw.waitForSelector('.ci[data-state="recorded"]')
      await sw.locator('[data-next]').click()
      await until(async () => (await sw.locator('[data-question]').innerText()) !== first)
      await sw.waitForSelector('.ci')
      await sw.waitForTimeout(500)
      same(at, await stateOf(sw), 'choosing', 'another question starts open, whatever the last one was called')
      same(at, await checkedOf(sw), [], 'nothing of the last question is chosen on the next')
      await ready3(sw, 'A', 'guess')
      await sw.locator('.ci-action').click()
      await sw.waitForSelector('.ci[data-state="recorded"]')
      same(at, await checkedOf(sw), ['c=guess', 'v=A'], 'the second question holds its own call')
      await sw.locator('[data-next]').click()
      await until(async () => (await sw.locator('[data-question]').innerText()) === first)
      await sw.waitForSelector('.ci')
      await sw.waitForTimeout(500)
      same(at, await stateOf(sw), 'recorded', 'the first question, come round again, is read-only')
      same(at, await checkedOf(sw), ['c=sure', 'v=B'], 'and shows its own call, not the last one')
      if (mode === 'cell') same(at, (await callsOf(sw)).length, 2, 'two questions, two calls in the log')
      await ctx3.close()
    }

    // the expert skip writes nothing; a store that fails reports it, writes nothing and keeps the learner's taps (a profile of their own)
    const ctx2 = await browser.newContext({ viewport: { width: 360, height: 800 }, serviceWorkers: 'block' })
    const k = await ctx2.newPage()
    await k.goto(`${origin}?view=cell&item=interval&skip=1`)
    await ready(k)
    await k.waitForSelector('.ci-skip')
    same(`${where} skip`, await k.locator('.ci-skip').innerText(), "Skip the call: you've shown this one.", 'the skip is offered in the words of DESIGN.md section 6.2')
    await k.locator('.ci-skip').click()
    same(`${where} skip`, await k.evaluate(() => document.documentElement.getAttribute('data-skipped')), 'yes', 'the skip reaches the host')
    same(`${where} skip`, (await callsOf(k)).length, 0, 'a skipped call writes nothing')
    await k.close()

    const f = await ctx2.newPage()
    await f.goto(`${origin}?view=cell&item=anomaly&commit=fail`)
    await ready(f)
    await f.waitForSelector('.ci[data-state="choosing"]')
    await ready3(f, 'C', 'think')
    await f.locator('.ci-action').click()
    await f.waitForSelector('.ci-error')
    const msg = await f.locator('.ci-error').innerText()
    if (!/Not recorded: QuotaExceededError\. Your call has not been saved\./.test(msg)) fail(`${where} failure`, `the failure says "${msg}"`)
    same(`${where} failure`, await stateOf(f), 'choosing', 'the sheet is open again after a failure')
    same(`${where} failure`, await checkedOf(f), ['c=think', 'v=C'], 'the learner\'s taps survive a failure')
    same(`${where} failure`, (await callsOf(f)).length, 0, 'a failed commit writes nothing')
    await f.close()
    await ctx2.close()
    report.final.push({ engine: name, version, checks: 'first call final, reload, second tab, stale tab, live tab, races, help, set, a cell given another question, skip, failure' })
  }

  // ================================================================ layout and axe
  if (only.includes('layout')) for (const width of [320, 360, 1280]) {
    for (const theme of ['light', 'night']) {
      const tag = `${name}-${width}-${theme}`
      const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: theme === 'night' ? 'dark' : 'light', serviceWorkers: 'block' })
      const page = await context.newPage()
      const pages = [
        ['open verdict', 'view=sheet&item=verdict'],
        ['recorded, matched', 'view=sheet&item=verdict&rec=B.think.ok&revealed=1'],
        ['recorded, missed', 'view=sheet&item=verdict&rec=A.sure.miss&revealed=1'],
        ['open interval with its bound', 'view=sheet&item=interval'],
        ['open anomaly', 'view=sheet&item=anomaly&skip=1'],
        ['open set', 'view=sheet&item=set'],
        ['recorded set', 'view=sheet&item=set&rec=x&revealed=1'],
        ['mirror, no calls', 'view=mirror&learner=none'],
        ['mirror, few calls', 'view=mirror&learner=few'],
        ['mirror, many calls', 'view=mirror&learner=many'],
      ]
      for (const [kind, query] of pages) {
        await page.goto(`${origin}?${query}&theme=${theme}`)
        await ready(page)
        await page.waitForSelector(query.includes('mirror') ? '.mirror' : '.ci')
        const fonts = [...new Set(await page.evaluate(() => [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family.replace(/^["']|["']$/g, ''))))].sort()
        // the open verdict sheet sets its legend in the structure face, its question in the reading face and its options in the code face
        if (kind === 'open verdict') for (const face of ['Archivo', 'Source Serif 4', 'JuliaMono']) if (!fonts.includes(face)) fail(`${tag} ${kind}`, `${face} did not load`)
        const overflow = await overflowOf(page)
        if (overflow > 0) {
          const offenders = await page.evaluate(() => [...document.querySelectorAll('body *')].filter((e) => e.getBoundingClientRect().right > document.documentElement.clientWidth + 0.5).slice(0, 6).map((e) => `${e.tagName.toLowerCase()}.${[...e.classList].join('.')} right=${Math.round(e.getBoundingClientRect().right)}`))
          fail(`${tag} ${kind}`, `scrolls sideways by ${overflow} px: ${offenders.join(', ')}`)
        }
        const axe = await axeOf(page)
        for (const v of axe.serious) fail(`${tag} ${kind}`, `axe ${v.id} (${v.impact}, ${v.nodes} nodes): ${v.help}; ${v.targets.join(' | ')}`)
        const small = await smallControls(page)
        for (const s of small) fail(`${tag} ${kind}`, `a control under 44 px: ${s}`)
        report.layout.push({ engine: name, version, width, theme, kind, overflowPx: overflow, axeSerious: axe.serious.length, axeViolations: axe.all, smallControls: small.length, fonts })
        if (name === 'chromium' && theme === 'light' && (width === 360 || width === 1280) && (kind === 'open verdict' || kind === 'recorded, missed' || kind === 'mirror, many calls' || kind === 'open set')) {
          await page.screenshot({ path: path.join(out, `${tag}-${kind.replace(/[^a-z]+/g, '-')}.png`), fullPage: true })
        }
      }
      // the interactive states of the bound sheet: with a verdict, with a confidence, in a docked layout
      for (const [kind, query] of [['bound sheet', 'view=cell&item=verdict'], ['docked sheet', 'view=cell&item=verdict&layout=sheet']]) {
        await page.goto(`${origin}?${query}&theme=${theme}`)
        await ready(page)
        await page.waitForSelector('.ci[data-state="choosing"]')
        for (const step of ['verdict chosen', 'ready']) {
          if (step === 'verdict chosen') await page.locator('.ci input[name$="-v"][value="C"]').check()
          else await page.locator('.ci input[name$="-c"][value="guess"]').check()
          const axe = await axeOf(page)
          for (const v of axe.serious) fail(`${tag} ${kind} ${step}`, `axe ${v.id} (${v.impact}, ${v.nodes} nodes): ${v.help}; ${v.targets.join(' | ')}`)
          const overflow = await overflowOf(page)
          if (overflow > 0) fail(`${tag} ${kind} ${step}`, `scrolls sideways by ${overflow} px`)
          for (const s of await smallControls(page)) fail(`${tag} ${kind} ${step}`, `a control under 44 px: ${s}`)
          report.layout.push({ engine: name, width, theme, kind: `${kind}, ${step}`, overflowPx: overflow, axeSerious: axe.serious.length, axeViolations: axe.all })
        }
      }
      await context.close()
    }
  }

  // ================================================================ the keyboard path (DESIGN.md section 10.3)
  if (only.includes('keyboard')) for (const width of [360, 1280]) {
    const where = `${name} keyboard ${width}`
    const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: 'block' })
    const page = await context.newPage()
    await page.goto(`${origin}?view=cell&item=verdict&layout=sheet`)
    await ready(page)
    await page.waitForSelector('.ci[data-state="choosing"]')
    const focused = () =>
      page.evaluate(() => {
        const el = document.activeElement
        if (!el || el === document.body) return null
        const s = getComputedStyle(el)
        const r = el.getBoundingClientRect()
        return { tag: el.tagName.toLowerCase(), type: el.getAttribute('type'), value: el.getAttribute('value'), cls: el.className, ring: s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0, inView: r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight }
      })
    // Tab through what comes before the sheet: the code region, then the recorded-result button
    await page.keyboard.press('Tab')
    let f = await focused()
    if (f?.tag !== 'pre') fail(where, `the first stop is ${JSON.stringify(f)}`)
    await page.keyboard.press('Tab')
    f = await focused()
    if (f?.cls !== 'h-button') fail(where, `the second stop is ${JSON.stringify(f)}`)
    // Tab into the verdict radios: one stop for the group
    await page.keyboard.press('Tab')
    f = await focused()
    if (!(f?.type === 'radio' && f.value === 'A')) fail(where, `Tab did not enter the verdict group at its first radio: ${JSON.stringify(f)}`)
    if (!f?.ring) fail(where, 'the first radio shows no focus ring')
    // arrow keys move within the group and select; Space selects
    await page.keyboard.press('ArrowDown')
    f = await focused()
    if (!(f?.type === 'radio' && f.value === 'B')) fail(where, `ArrowDown did not move to B: ${JSON.stringify(f)}`)
    same(where, await checkedOf(page), ['v=B'], 'the arrow key selected the answer')
    await page.waitForSelector('.ci-taps')
    // Tab leaves the group for the next group: the taps
    await page.keyboard.press('Tab')
    f = await focused()
    if (!(f?.type === 'radio' && f.value === 'guess')) fail(where, `Tab did not enter the taps at their first radio: ${JSON.stringify(f)}`)
    await page.keyboard.press('ArrowRight')
    f = await focused()
    if (!(f?.type === 'radio' && f.value === 'think')) fail(where, `ArrowRight did not move to think so: ${JSON.stringify(f)}`)
    await page.keyboard.press('Space')
    same(where, await checkedOf(page), ['c=think', 'v=B'], 'Space selected the tap')
    // the help box, then the action
    await page.keyboard.press('Tab')
    f = await focused()
    if (f?.type !== 'checkbox') fail(where, `the stop after the taps is ${JSON.stringify(f)}`)
    await page.keyboard.press('Tab')
    f = await focused()
    if (!(f?.tag === 'button' && /ci-action/.test(f.cls))) fail(where, `the stop after the help box is ${JSON.stringify(f)}`)
    if (!f?.ring) fail(where, 'the action shows no focus ring')
    await page.keyboard.press('Enter')
    await page.waitForSelector('.ci[data-state="recorded"]')
    same(where, (await callsOf(page)).length, 1, 'Enter on the action recorded one call')
    // after the call: nothing in the sheet takes focus; Tab goes on to the link after the cell
    await page.keyboard.press('Tab')
    f = await focused()
    if (f === null || !/^a$/.test(f.tag)) fail(where, `after the call the next stop is ${JSON.stringify(f)}, not the link after the cell`)
    await context.close()
    report.keyboard.push({ engine: name, width })
  }

  // ================================================================ the docked bar never hides a focused control (WCAG 2.4.11)
  if (only.includes('dock')) {
    const where = `${name} dock`
    const context = await browser.newContext({ viewport: { width: 360, height: 640 }, serviceWorkers: 'block' })
    const page = await context.newPage()
    await page.goto(`${origin}?view=cell&item=verdict&layout=sheet`)
    await ready(page)
    await page.waitForSelector('.ci[data-state="choosing"]')
    const bar = page.locator('.ci-actions')
    same(where, await bar.evaluate((el) => getComputedStyle(el).position), 'sticky', 'the action bar is docked on a phone')
    const padding = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).scrollPaddingBottom))
    if (!(padding > 0)) fail(where, `the page reserves no scroll padding for the docked bar (${padding})`)
    const barHeight = await bar.evaluate((el) => Math.ceil(el.getBoundingClientRect().height))
    if (Math.abs(padding - barHeight) > 2) fail(where, `the page reserves ${padding} px for a bar that is ${barHeight} px tall`)
    // the sheet's content is not a scroller: nothing inside it scrolls, so no engine adds a stop for it
    const scrollers = await page.evaluate(() => [...document.querySelectorAll('.ci, .ci *')].filter((el) => el.scrollHeight > el.clientHeight + 1 && ['auto', 'scroll'].includes(getComputedStyle(el).overflowY)).map((el) => el.className))
    same(where, scrollers, [], 'nothing inside the sheet scrolls')
    await page.evaluate(() => window.scrollTo(0, 0))
    // every focusable control above the bar is fully above it once focused: before the sheet, in it, and after the verdict
    const focusables = '.h-button, .h-cell pre, .ci input[type="radio"]:not(:disabled)'
    const count = await page.locator(focusables).count()
    for (let i = 0; i < count; i += 1) {
      await page.evaluate(([sel, idx]) => [...document.querySelectorAll(sel)][idx].focus(), [focusables, i])
      await page.waitForTimeout(150)
      const r = await page.evaluate(([sel, idx]) => {
        const el = [...document.querySelectorAll(sel)][idx]
        const b = document.querySelector('.ci-actions').getBoundingClientRect()
        const box = el.getBoundingClientRect()
        return { bottom: box.bottom, top: box.top, barTop: b.top, name: el.className || el.tagName.toLowerCase() }
      }, [focusables, i])
      if (r.bottom > r.barTop + 2 && r.top < r.barTop) fail(where, `a focused control (${r.name}) sits under the docked bar: bottom ${Math.round(r.bottom)} against the bar's top ${Math.round(r.barTop)}`)
    }
    await page.locator('.ci input[name$="-v"][value="B"]').check()
    await page.waitForSelector('.ci-taps')
    const tapCount = await page.locator('.ci-tap input').count()
    for (let i = 0; i < tapCount; i += 1) {
      await page.locator('.ci-tap input').nth(i).focus()
      await page.waitForTimeout(150)
      const r = await page.evaluate((idx) => {
        const box = document.querySelectorAll('.ci-tap input')[idx].getBoundingClientRect()
        const b = document.querySelector('.ci-actions').getBoundingClientRect()
        return { bottom: box.bottom, top: box.top, barTop: b.top }
      }, i)
      if (r.bottom > r.barTop + 2 && r.top < r.barTop) fail(where, `a focused tap sits under the docked bar: bottom ${Math.round(r.bottom)} against the bar's top ${Math.round(r.barTop)}`)
    }
    // docked: the bar's bottom edge is the viewport's while its cell is in view; once recorded the sheet has no bar and reserves nothing
    await page.evaluate(() => window.scrollTo(0, 0))
    const bottom = await bar.evaluate((el) => Math.round(el.getBoundingClientRect().bottom))
    const vh = await page.evaluate(() => innerHeight)
    if (bottom > vh + 1) fail(where, `the docked bar's bottom is ${bottom}, below the viewport (${vh})`)
    await page.locator('.ci input[name$="-c"][value="sure"]').check()
    await page.locator('.ci-action').click()
    await page.waitForSelector('.ci[data-state="recorded"]')
    await page.waitForTimeout(200)
    same(where, await page.locator('.ci-actions').count(), 0, 'a recorded sheet has no bar')
    const after = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).scrollPaddingBottom) || 0)
    same(where, after, 0, 'a recorded sheet reserves no scroll padding')
    await context.close()
    // from 900 px the bar is in the flow
    const wide = await browser.newContext({ viewport: { width: 1280, height: 800 }, serviceWorkers: 'block' })
    const wp = await wide.newPage()
    await wp.goto(`${origin}?view=cell&item=verdict&layout=sheet`)
    await ready(wp)
    await wp.waitForSelector('.ci-actions')
    same(where, await wp.locator('.ci-actions').evaluate((el) => getComputedStyle(el).position), 'static', 'the bar is in the flow on a wide screen')
    await wide.close()
    report.dock.push({ engine: name, padding, barHeight })
  }

  // ================================================================ the Mirror's route over the real adapter
  if (only.includes('mirror')) {
    const where = `${name} mirror route`
    const context = await browser.newContext({ viewport: { width: 360, height: 900 }, serviceWorkers: 'block' })
    const first = await context.newPage()
    await first.clock.setFixedTime(new Date('2027-06-01T00:00:00Z'))
    await first.goto(`${origin}?view=route&learner=many`)
    await ready(first)
    await first.waitForSelector('.mr-bands')
    const text = () => first.locator('.mirror').innerText()
    let t = await text()
    for (const want of [
      'Your “sure” calls hit less often than “sure” says: 18 of 30, interval 0.42–0.75.',
      'Calls on a set of statements',
      'Calls made with help, shown apart',
      '2 ideas whose latest answer, 30 days or more after you first learned them, was right',
    ]) if (!t.includes(want)) fail(where, `the route does not say "${want}"`)
    if (/KC-1\./.test(t)) fail(where, 'the route shows a KC ID')
    const sureBefore = /(\d+) of (\d+) right · hit rate/.exec(t)
    // a second tab of the profile writes calls; the first shows them without a reload
    const second = await context.newPage()
    await second.clock.setFixedTime(new Date('2027-06-01T00:00:00Z'))
    await second.goto(`${origin}?view=route&seed=0`)
    await ready(second)
    await second.evaluate(async () => {
      const more = window.harness.learner('few').filter((e) => e.kind === 'call').map((e, i) => ({ ...e, id: `extra-${i}`, ref: `call:S1.L2/c9000${i}`, conf: 'sure', ok: false, at: '2026-11-03T09:00:00Z', day: '2026-11-03' }))
      await window.harness.append(more)
    })
    const heard = await until(async () => /sure · above 80% \d+ of 37 right/.test(await text()) || /sure · above 80%\s+\d+ of 37 right/.test(await text()), 12000)
    t = await text()
    if (!heard) fail(where, `a call written by a second tab did not reach the first without a reload (still: ${t.slice(t.indexOf('sure ·'), t.indexOf('sure ·') + 120).replace(/\s+/g, ' ')})`)
    report.mirror.push({ engine: name, before: sureBefore?.[0] ?? null, heard: Boolean(heard) })
    await context.close()
  }
  await browser.close()
}

report.failures = failures
fs.writeFileSync(path.join(out, 'report.json'), `${JSON.stringify(report, null, 2)}\n`)
server.close()
console.log(`${report.layout.length} axe and layout runs, ${report.final.length} first-call-final runs, ${report.keyboard.length} keyboard walks, ${report.dock.length} dock checks, ${report.mirror.length} route checks; ${failures.length} failures`)
process.exit(failures.length === 0 ? 0 : 1)
