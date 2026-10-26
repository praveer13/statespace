// The Boot timing gate (spine section 11.2; ARCHITECTURE.md section 14; W0-S02 section 5.3): Boot interactive, with the
// recorded-run fallback, at 360 px within the Boot timing budget, provisional until a real-device report is merged, and held
// with an engine download in flight, because since OD-6 nothing asks before Z3 loads.
//
// The budget is read from runs/RUN-phone-pyodide/budget.json (lib/boot-budget.ts), so a merged device report moves it. CI
// cannot throttle the cross-origin worker [X RUN-browser-origin], so the gate measures on the runner and scales by W0-S02's
// yardstick, run in this browser first:
//   boot.handshake   W0-S02's "loader ready (handshake)": on a fresh profile, unthrottled, the frame is created, loads its host
//                    page and manifest and reports `ready` with the engine's caps, and the loader states the size, within the
//                    handshake threshold; timed from the frame's insertion, or from the tap when the frame was in the page
//                    before it, to the first moment the text at the loader's bar states a size
//   boot.responsive  throttle the page's main thread (DevTools, Chromium only) to the reference device's speed, shape the engine's
//                    link to 20 Mbit/s (W0-S02's links were 10 and 1.6 Mbit/s; this one only has to keep the download in flight), tap "Run it live in this tab", and require that the recorded run stays on screen,
//                    a tap on the Call It options still registers, and no tick of a 50 ms timer on the page comes later than
//                    the budget's latest tick (200 ms on the emulated reference) from the tap to the live verdict
//   boot.cold        on a fresh profile and an unshaped link, the live verdict arrives within the cold-start threshold
//                    (the CPU part, from the tap that starts the download)
//   boot.warm        with the engine cached, the live verdict arrives within the warm threshold
// Not measured here: a restart after a watchdog stop, which needs a query that outruns its budget; Boot's cell has none.

import type { Browser, Page } from '@playwright/test'
import { LAG_MONITOR_SOURCE, loadBootBudget, scaleFor } from '../lib/boot-budget.ts'
import { loaderTotal } from '../lib/units.ts'
import { enginePathPattern, liveVerdict, RECORDED, RUN_LIVE } from './engine-session.ts'
import type { World } from '../lib/world.ts'
import { enforce, expect, measureYardstick, newPage, test, type GateEnv } from './fixtures.ts'

const note = (description: string): void => void test.info().annotations.push({ type: 'measured', description })

/**
 * The handshake's marks, on the page's own clock: the tap (the first pointerdown, mousedown or click), the instrument frame's
 * insertion, and each change of the loader's text (the bar's aria-valuetext and aria-label and the text around it, read as
 * engine-session's observer reads them). A MutationObserver takes them, so a mark is the moment the page changed, not the moment
 * a poll saw it.
 */
const HANDSHAKE_MARKS = `
(() => {
  if (window.top !== window) return;
  const m = { tap: null, frame: null, snaps: [] };
  window.__ssHandshake = m;
  const look = (force) => {
    const t = performance.now();
    if (m.frame === null && document.querySelector('iframe')) m.frame = t;
    const el = document.querySelector('progress, [role="progressbar"]');
    if (!el || m.snaps.length >= 400) return;
    let box = el.parentElement;
    for (let up = el, i = 0; up && i < 6; i += 1, up = up.parentElement) {
      if (/download/i.test(up.innerText || '')) { box = up; break; }
    }
    const s = { t, valueText: el.getAttribute('aria-valuetext'), label: el.getAttribute('aria-label'), container: box ? box.innerText : '' };
    const last = m.snaps[m.snaps.length - 1];
    if (force || !last || last.valueText !== s.valueText || last.label !== s.label || last.container !== s.container) m.snaps.push(s);
  };
  for (const type of ['pointerdown', 'mousedown', 'click']) {
    addEventListener(type, () => { if (m.tap === null) { m.tap = performance.now(); look(true); } }, true);
  }
  new MutationObserver(() => look(false)).observe(document, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['aria-valuetext', 'aria-label', 'value', 'max'] });
})();
`

interface HandshakeMarks {
  tap: number | null
  frame: number | null
  snaps: { t: number; valueText: string | null; label: string | null; container: string }[]
}

/** The first moment, at or after the tap, that the loader's text states a size: a total above zero, as loader.size reads it. */
function firstSized(m: HandshakeMarks): { t: number; shown: string } | null {
  if (m.tap === null) return null
  for (const s of m.snaps) {
    if (s.t < m.tap) continue
    for (const text of [s.valueText, s.label, s.container]) {
      const total = text ? loaderTotal(text) : null
      if (total && total.bytes > 0) return { t: s.t, shown: total.raw }
    }
  }
  return null
}

interface HandshakeRun {
  ms: number
  /** The start mark: the frame's insertion, or the tap when the frame was in the page before it (or never appeared). */
  from: 'frame' | 'tap'
  shown: string
}

/**
 * One fresh profile at 360 px, unthrottled and on an unshaped link: load /boot, tap "Run it live in this tab", and time the frame's
 * handshake to the loader's size. The page cannot show the loader before the tap, so the interval starts at the later of the tap and
 * the frame's insertion: a page that makes the frame on the tap starts both at once, one that made it earlier is timed from the tap,
 * and one that first loads more code is timed from the frame, as W0-S02 timed it (the route budgets hold that code).
 */
async function handshakeRun(browser: Browser, world: World, limitMs: number): Promise<HandshakeRun> {
  const { context, page } = await newPage(browser, { width: 360 })
  try {
    await page.addInitScript(HANDSHAKE_MARKS)
    await page.goto(`${world.siteOrigin}/boot`, { waitUntil: 'load' })
    const button = page.getByRole('button', { name: RUN_LIVE }).first()
    await expect(button, 'the live run is offered beside the recorded one (DESIGN.md SCR-boot)').toBeVisible()
    await button.click()
    const read = (): Promise<HandshakeMarks> => page.evaluate(() => (window as unknown as { __ssHandshake: HandshakeMarks }).__ssHandshake)
    const deadline = Date.now() + Math.max(15_000, limitMs * 10)
    let marks = await read()
    let sized = firstSized(marks)
    while (sized === null && Date.now() < deadline) {
      await page.waitForTimeout(50)
      marks = await read()
      sized = firstSized(marks)
    }
    expect(marks.tap, 'the tap on "Run it live in this tab" registered').not.toBeNull()
    expect(sized, 'the loader never stated a size after the tap: expected "Downloading … of <size>" at a progress bar (DESIGN.md section 6.2)').not.toBeNull()
    const tap = marks.tap as number
    // a frame made in the tap's own handler can carry the tap's time stamp (WebKit's clock counts whole milliseconds)
    const from = marks.frame !== null && marks.frame >= tap ? 'frame' : 'tap'
    const start = from === 'frame' ? (marks.frame as number) : tap
    const s = sized as { t: number; shown: string }
    return { ms: Math.max(0, Math.round(s.t - start)), from, shown: s.shown }
  } finally {
    await context.close()
  }
}

test('[boot.handshake] on a fresh profile the loader states the engine size within the handshake threshold', async ({ browser, world, gate }) => {
  enforce(gate, 'boot.handshake')
  const engine = browser.browserType().name() as 'chromium' | 'firefox' | 'webkit'
  const budget = loadBootBudget(gate.budgetFile)
  const t = scaleFor(budget, engine, await measureYardstick(browser))
  world.instruments.setShape(null)
  const seen: HandshakeRun[] = []
  const { took, runs } = await medianOfRuns(async () => {
    const r = await handshakeRun(browser, world, t.handshakeMs)
    seen.push(r)
    return r.ms
  }, t.handshakeMs)
  const from = seen.every((r) => r.from === 'frame') ? "the frame's insertion" : seen.every((r) => r.from === 'tap') ? 'the tap' : 'the frame or the tap'
  note(`${engine}: ${took} ms from ${from} to the loader's "${seen[0]?.shown ?? ''}" (${runs.length === 1 ? 'one run' : `median of ${runs.join(', ')}`}), threshold ${t.handshakeMs} ms (yardstick ${t.yardstickMs.toFixed(0)} ms)`)
  expect(took, `the loader stated the engine's size ${took} ms after ${from} (allowed ${t.handshakeMs} ms at this runner's speed: W0-S02's loader ready, handshake)`).toBeLessThanOrEqual(t.handshakeMs)
})

test('[boot.responsive] Boot stays interactive at 360 px while the engine downloads', async ({ browser, world, gate }) => {
  enforce(gate, 'boot.responsive')
  // a shared runner can stall a page for 200 ms once, and one stall is not a Boot that does not answer: the check fails when two
  // consecutive runs each break the budget
  const first = await responsiveRun(browser, world, gate)
  if (first.ok) return reportResponsive(first)
  test.info().annotations.push({ type: 'measured', description: `first run over the budget (${first.summary}); run again` })
  const second = await responsiveRun(browser, world, gate)
  reportResponsive(second)
})

function reportResponsive(r: Responsive): void {
  note(r.summary)
  expect(r.ticks, 'the lag monitor ticked during the download').toBeGreaterThan(10)
  expect(r.maxLate, `the page's 50 ms timer came ${r.maxLate.toFixed(0)} ms late while the engine downloaded and started (allowed ${r.allowed} ms)`).toBeLessThanOrEqual(r.allowed)
  expect(r.verdict, 'a live verdict ("re-checked here") arrived').toBe(true)
}

interface Responsive {
  ok: boolean
  ticks: number
  maxLate: number
  allowed: number
  verdict: boolean
  summary: string
}

async function responsiveRun(browser: Browser, world: World, gate: GateEnv): Promise<Responsive> {
  const engine = browser.browserType().name() as 'chromium' | 'firefox' | 'webkit'
  const budget = loadBootBudget(gate.budgetFile)
  const yardstick = await measureYardstick(browser)
  const t = scaleFor(budget, engine, yardstick)
  const { context, page } = await newPage(browser, { width: 360 })
  world.instruments.setShape({ mbps: 20, rttMs: 50, match: enginePathPattern(world) })
  try {
    let throttle = 1
    if (engine === 'chromium') {
      throttle = t.throttleRate
      const cdp = await context.newCDPSession(page)
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle })
    }
    await page.addInitScript(LAG_MONITOR_SOURCE)
    await page.goto(`${world.siteOrigin}/boot`, { waitUntil: 'load' })
    await expect(page.getByText(RECORDED).first(), 'the recorded run is on screen at once, labeled as recorded').toBeVisible()
    await expect(page.getByText(/RUN-[a-z0-9][a-z0-9-]*/).first(), 'and shows its run id').toBeVisible()
    const button = page.getByRole('button', { name: RUN_LIVE }).first()
    await expect(button, 'the live run is offered beside the recorded one').toBeVisible()

    await page.evaluate(() => (window as unknown as { __ssLag: { setPhase(n: string | null): void } }).__ssLag.setPhase('engine'))
    await button.click()
    await page.locator('progress, [role="progressbar"]').first().waitFor({ timeout: 10_000 })
    // with the download in flight the recorded run is still there and the page still takes a tap
    await expect(page.getByText(RECORDED).first(), 'the recorded run stays in view while the engine downloads').toBeVisible()
    const radio = page.getByRole('radio').first()
    if ((await radio.count()) > 0) {
      await radio.check({ timeout: 5000 })
      expect(await radio.isChecked(), 'a Call It option takes a tap while the download runs').toBe(true)
    }
    const verdict = await liveVerdict(page, Math.max(30_000, t.coldCpuMs * 4))
    await page.evaluate(() => (window as unknown as { __ssLag: { setPhase(n: string | null): void } }).__ssLag.setPhase(null))
    const lag = await page.evaluate(() => (window as unknown as { __ssLag: { report(): Record<string, { ticks: number; maxLate: number; over100: number }> } }).__ssLag.report())
    const phase = lag['engine'] ?? { ticks: 0, maxLate: 0, over100: 0 }
    const summary = `${engine}: yardstick ${yardstick.toFixed(0)} ms, page throttle ${throttle}x, ${phase.ticks} ticks, latest ${phase.maxLate.toFixed(0)} ms of ${t.latestTickMs} ms allowed, ${phase.over100} over 100 ms; budget ${budget.provisional ? 'provisional (emulated reference)' : 'from real devices'}`
    return { ok: phase.ticks > 10 && phase.maxLate <= t.latestTickMs && verdict, ticks: phase.ticks, maxLate: phase.maxLate, allowed: t.latestTickMs, verdict, summary }
  } finally {
    world.instruments.setShape(null)
    await context.close()
  }
}

async function timedLiveRun(page: Page, limitMs: number): Promise<number> {
  const button = page.getByRole('button', { name: RUN_LIVE }).first()
  await expect(button).toBeVisible()
  const t0 = Date.now()
  await button.click()
  const ok = await liveVerdict(page, Math.max(limitMs * 4, 20_000))
  const took = Date.now() - t0
  expect(ok, 'a live verdict ("re-checked here") arrived').toBe(true)
  return took
}

/**
 * W0-S02 asks for thresholds "from the median of several runs on the CI runner": one run that passes is enough, and one that
 * does not is measured twice more, with the median of the three taken, so that a stall on a shared host is not a verdict.
 */
async function medianOfRuns(measure: () => Promise<number>, limit: number): Promise<{ took: number; runs: number[] }> {
  const runs = [await measure()]
  if ((runs[0] ?? 0) > limit) runs.push(await measure(), await measure())
  const sorted = [...runs].sort((a, b) => a - b)
  return { took: sorted[Math.floor(sorted.length / 2)] ?? 0, runs }
}

test('[boot.cold] on a fresh profile the live verdict arrives within the cold-start threshold', async ({ browser, world, gate }) => {
  enforce(gate, 'boot.cold')
  const engine = browser.browserType().name() as 'chromium' | 'firefox' | 'webkit'
  const budget = loadBootBudget(gate.budgetFile)
  const t = scaleFor(budget, engine, await measureYardstick(browser))
  const { took, runs } = await medianOfRuns(async () => {
    const { context, page } = await newPage(browser, { width: 360 })
    try {
      await page.goto(`${world.siteOrigin}/boot`, { waitUntil: 'load' })
      return await timedLiveRun(page, t.coldCpuMs)
    } finally {
      await context.close()
    }
  }, t.coldCpuMs)
  note(`${engine}: ${took} ms from the tap to the verdict (${runs.length === 1 ? 'one run' : `median of ${runs.join(', ')}`}), threshold ${t.coldCpuMs} ms (yardstick ${t.yardstickMs.toFixed(0)} ms)`)
  expect(took, `cold start took ${took} ms (allowed ${t.coldCpuMs} ms at this runner's speed)`).toBeLessThanOrEqual(t.coldCpuMs)
})

test('[boot.warm] with the engine cached the live verdict arrives within the warm threshold', async ({ browser, world, gate }) => {
  enforce(gate, 'boot.warm')
  const engine = browser.browserType().name() as 'chromium' | 'firefox' | 'webkit'
  const budget = loadBootBudget(gate.budgetFile)
  const t = scaleFor(budget, engine, await measureYardstick(browser))
  const { context, page } = await newPage(browser, { width: 360 })
  try {
    await page.goto(`${world.siteOrigin}/boot`, { waitUntil: 'load' })
    await timedLiveRun(page, t.coldCpuMs) // fills the engine cache
    const { took, runs } = await medianOfRuns(async () => {
      await page.reload({ waitUntil: 'load' })
      return timedLiveRun(page, t.warmLiveMs)
    }, t.warmLiveMs)
    note(`${engine}: ${took} ms from the tap to the verdict (${runs.length === 1 ? 'one run' : `median of ${runs.join(', ')}`}), threshold ${t.warmLiveMs} ms (yardstick ${t.yardstickMs.toFixed(0)} ms)`)
    expect(took, `warm start took ${took} ms (allowed ${t.warmLiveMs} ms at this runner's speed)`).toBeLessThanOrEqual(t.warmLiveMs)
  } finally {
    await context.close()
  }
})
