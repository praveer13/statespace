// The Boot timing budget of W0-S02 section 5.3, read from the run that derived it.
//
// runs/RUN-phone-pyodide/budget.json is written by scripts/spikes/W0-S02/derive-budget.mjs from the run's own figures. Its
// reference is the emulated slowest tier (0.25 CPUs, a single-thread loop 4.1x to 4.2x slower than unthrottled) until the
// owner merges real-device reports, which regenerate the file; the gate reads it, so a merged report moves the budget with
// no edit here, and `provisional` says which kind of reference it holds.
//
// CI throttling does not reach the cross-origin worker [X RUN-browser-origin], so the gate does what section 5.3 says:
// measure on the runner and scale by the yardstick instead of throttling the worker.
//   * A worker-time quantity (warm live verdict, cold start's CPU part) has a threshold at yardstick parity; the gate's
//     threshold is that times Y over the yardstick of the machine that recorded it, Y being this runner's loop time.
//   * The page's main thread is throttled with DevTools (Chromium only; the page is the one thing the throttle reaches), to
//     the rate that makes this runner's yardstick equal the reference profile's: round(reference / Y). With the recording
//     machine's Y the rate is the 4x section 5.3 names; a runner twice as slow gets 2x, and one slower than the reference
//     none, so the page is held to the reference device, not to a multiple of whatever CI happens to be.
//   * The page must answer: no tick of a 50 ms main-thread timer later than the budget's latest tick (200 ms on the
//     emulated reference) during the download and the engine start.

import { readFileSync } from 'node:fs'
import type { EngineName } from './browser.ts'

export interface EngineThresholds {
  /** The recording machine's unthrottled yardstick, in ms. */
  yardstickHereMs: number
  handshakeMs: number
  warmLiveMs: number
  coldCpuMs: number
  respawnMs: number
}

export interface BootBudget {
  file: string
  /** True while the reference is the emulated tier: no real-device report is merged. */
  provisional: boolean
  referenceKind: string
  /** The reference profile's yardstick, in ms. */
  referenceYardstickMs: number
  /** The latest a 50 ms timer may fire on the page's main thread while the engine downloads and starts. */
  latestTickMs: number
  perEngine: Partial<Record<EngineName, EngineThresholds>>
}

export class BudgetError extends Error {}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

function positive(v: unknown, what: string): number {
  if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0) throw new BudgetError(`${what} is missing or not a positive number`)
  return v
}

/** Read the budget file and keep what the gate uses. */
export function loadBootBudget(file: string): BootBudget {
  let doc: unknown
  try {
    doc = JSON.parse(readFileSync(file, 'utf8'))
  } catch (e) {
    throw new BudgetError(`cannot read ${file}: ${e instanceof Error ? e.message : String(e)}`)
  }
  if (!isObj(doc)) throw new BudgetError(`${file} is not a JSON object`)
  const ref = isObj(doc['reference']) ? doc['reference'] : {}
  const values = isObj(doc['reference_values']) ? doc['reference_values'] : {}
  const budget = isObj(doc['budget_ms']) ? doc['budget_ms'] : {}
  const ci = isObj(doc['ci_thresholds_ms']) ? doc['ci_thresholds_ms'] : {}
  const perEngine: BootBudget['perEngine'] = {}
  for (const engine of ['chromium', 'firefox', 'webkit'] as const) {
    const t = ci[engine]
    if (!isObj(t)) continue
    perEngine[engine] = {
      yardstickHereMs: positive(t['yardstick_here_ms'], `${engine}.yardstick_here_ms`),
      handshakeMs: positive(t['handshake_ms'], `${engine}.handshake_ms`),
      warmLiveMs: positive(t['warm_live_ms'], `${engine}.warm_live_ms`),
      coldCpuMs: positive(t['cold_cpu_ms'], `${engine}.cold_cpu_ms`),
      respawnMs: positive(t['respawn_ms'], `${engine}.respawn_ms`),
    }
  }
  if (Object.keys(perEngine).length === 0) throw new BudgetError(`${file} has no ci_thresholds_ms for any engine`)
  return {
    file,
    provisional: doc['provisional'] === true,
    referenceKind: typeof ref['kind'] === 'string' ? ref['kind'] : 'unknown',
    referenceYardstickMs: positive(values['yardstick_js_ms'], 'reference_values.yardstick_js_ms'),
    latestTickMs: positive(budget['main_thread_latest_tick'], 'budget_ms.main_thread_latest_tick'),
    perEngine,
  }
}

export interface Scaled {
  engine: EngineName
  yardstickMs: number
  /** DevTools CPU throttling rate for the page (1 means none). */
  throttleRate: number
  latestTickMs: number
  handshakeMs: number
  warmLiveMs: number
  coldCpuMs: number
  respawnMs: number
}

/** The thresholds for an engine on a runner whose yardstick is `yardstickMs`. */
export function scaleFor(b: BootBudget, engine: EngineName, yardstickMs: number): Scaled {
  const t = b.perEngine[engine] ?? b.perEngine.chromium
  if (!t) throw new BudgetError(`the budget has no thresholds for ${engine}`)
  const k = yardstickMs / t.yardstickHereMs
  const rate = Math.min(20, Math.max(1, Math.round(b.referenceYardstickMs / yardstickMs)))
  const r = (ms: number): number => Math.round(ms * k)
  return {
    engine,
    yardstickMs,
    throttleRate: rate,
    latestTickMs: b.latestTickMs,
    handshakeMs: r(t.handshakeMs),
    warmLiveMs: r(t.warmLiveMs),
    coldCpuMs: r(t.coldCpuMs),
    respawnMs: r(t.respawnMs),
  }
}

/**
 * W0-S02's yardstick, run in a worker on the runner: a fixed integer loop (xorshift32 steps and a running sum), the same
 * arithmetic as `jsLoop` in scripts/spikes/W0-S02/site/instruments/b/BUILD/worker.mjs, 100 million steps, three timed runs
 * after a warm-up, the median reported. Posting any message to the worker starts it.
 */
export const YARDSTICK_WORKER_SOURCE = `
function jsLoop(n) {
  let x = 123456789 | 0;
  let s = 0;
  for (let i = 0; i < n; i++) {
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    s = (s + (x & 255)) | 0;
  }
  return s;
}
self.onmessage = () => {
  jsLoop(1000000);
  const runs = [];
  for (let k = 0; k < 3; k++) {
    const t = performance.now();
    jsLoop(100000000);
    runs.push(performance.now() - t);
  }
  runs.sort((a, b) => a - b);
  self.postMessage({ median: runs[1], runs });
};
`

/** The 50 ms main-thread timer of W0-S02 (phone.js, setLag): the excess of a tick over 50 ms is time the thread was busy. */
export const LAG_MONITOR_SOURCE = `
(() => {
  if (window.top !== window) return;
  const TICK = 50;
  const lag = { phase: null, last: performance.now(), phases: {} };
  setInterval(() => {
    const t = performance.now();
    const late = Math.max(0, t - lag.last - TICK);
    lag.last = t;
    if (!lag.phase) return;
    const a = (lag.phases[lag.phase] ||= { ticks: 0, maxLate: 0, over100: 0 });
    a.ticks += 1;
    a.maxLate = Math.max(a.maxLate, late);
    if (late > 100) a.over100 += 1;
  }, TICK);
  window.__ssLag = {
    setPhase(name) { lag.phase = name; },
    report() { return JSON.parse(JSON.stringify(lag.phases)); },
  };
})();
`
