// Playwright fixtures for GATE-bundle's browser checks. scripts/verify-bundle.mjs decides what is under test and passes it in
// one environment variable (SS_GATE_ENV, JSON); the checks here read it, start the gate's three hosts once per worker, and
// say, for each check, whether it is enforced or waits for the task that builds what it exercises.
//
// A task that wants its own Playwright test in GATE-bundle writes a file named `*.gate.ts` under apps/<app>/e2e/ and imports
// `test` and `expect` from this module; the root playwright.config.ts runs it with the same hosts and the same reporting.
// Name each test `[check-id] what it checks`: the id before the first space is what the gate's report prints.

import { expect, test as base, type Browser, type BrowserContext, type Page, type TestInfo } from '@playwright/test'
import type { Applicability } from '../lib/applicability.ts'
import { YARDSTICK_WORKER_SOURCE } from '../lib/boot-budget.ts'
import { startWorld, type World } from '../lib/world.ts'

export interface GateEnv {
  /** This repository: where the gate's own inputs (schemas, runs) are, whatever tree is under test. */
  repoRoot: string
  /** The tree under test: the repository, or a planted-fixture root. */
  root: string
  siteDir: string
  instrumentsDir: string
  courseDomain: string | null
  /** The file W0-S02's derive-budget wrote: runs/RUN-phone-pyodide/budget.json. */
  budgetFile: string
  routes: { path: string; required: boolean; owner?: string }[]
  /** Per browser check, from the features the owning tasks have delivered. */
  applicability: Record<string, Applicability>
  engines: string[]
  strict: boolean
}

let cached: GateEnv | null = null

export function gateEnv(): GateEnv {
  if (cached) return cached
  const raw = process.env['SS_GATE_ENV']
  if (!raw) throw new Error('SS_GATE_ENV is not set: run these checks through scripts/verify-bundle.mjs')
  cached = JSON.parse(raw) as GateEnv
  return cached
}

interface WorkerFixtures {
  gate: GateEnv
  world: World
}

export const test = base.extend<object, WorkerFixtures>({
  gate: [
    async ({}, use) => {
      await use(gateEnv())
    },
    { scope: 'worker' },
  ],
  world: [
    async ({ gate }, use) => {
      const world = await startWorld({ siteDir: gate.siteDir, instrumentsDir: gate.instrumentsDir, courseDomain: gate.courseDomain })
      await Promise.all([world.site.prime(), world.instruments.prime()])
      await use(world)
      await world.close()
    },
    { scope: 'worker' },
  ],
})

export { expect }

/**
 * Call first in a test: a check that its owner has not delivered yet is skipped with a `pending` annotation naming the task
 * (the orchestrator reports it as pending and, under --strict, as a failure); one the environment cannot run is `skipped`.
 */
export function enforce(gate: GateEnv, id: string, info: TestInfo = base.info()): void {
  const a = gate.applicability[id] ?? { status: 'enforced' as const }
  if (a.status === 'enforced') return
  const description = a.status === 'pending' ? `${a.owner}: ${a.why}` : a.why
  info.annotations.push({ type: a.status, description })
  base.skip(true, description)
}

/** Bytes on the wire (the response body as sent, compressed) by kind, for what one origin served a page. */
export interface Transfer {
  js: number
  css: number
  fonts: number
  other: number
  total: number
}

export interface Watched {
  problems: string[]
  origins: Set<string>
  csp: () => Promise<string[]>
  /** What `origin` served this page so far; wait for the page to settle first. */
  transfer: (origin: string) => Promise<Transfer>
}

/** Console errors and warnings, page errors, failed requests, every origin requested, CSP violations, and transfer by kind. */
export async function watch(page: Page): Promise<Watched> {
  const seen: Pick<Watched, 'problems' | 'origins'> = { problems: [], origins: new Set() }
  const sizes: Promise<{ origin: string; kind: keyof Transfer; bytes: number }>[] = []
  page.on('response', (r) => {
    const origin = new URL(r.url()).origin
    const type = r.request().resourceType()
    const kind = type === 'script' ? 'js' : type === 'stylesheet' ? 'css' : type === 'font' ? 'fonts' : 'other'
    sizes.push(
      r
        .request()
        .sizes()
        .then((s) => ({ origin, kind: kind as keyof Transfer, bytes: s.responseBodySize }))
        .catch(() => ({ origin, kind: kind as keyof Transfer, bytes: 0 })),
    )
  })
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') seen.problems.push(`console ${m.type()}: ${m.text()}`)
  })
  page.on('pageerror', (e) => seen.problems.push(`pageerror: ${e.message}`))
  page.on('requestfailed', (r) => seen.problems.push(`request failed: ${r.url()} (${r.failure()?.errorText ?? 'no reason'})`))
  page.on('request', (r) => {
    const u = r.url()
    if (!u.startsWith('data:') && !u.startsWith('blob:') && !u.startsWith('about:')) seen.origins.add(new URL(u).origin)
  })
  await page.addInitScript(() => {
    const w = window as unknown as { __csp?: string[] }
    document.addEventListener('securitypolicyviolation', (e) => {
      w.__csp = [...(w.__csp ?? []), `${e.violatedDirective} ${e.blockedURI}`]
    })
  })
  return {
    ...seen,
    csp: () => page.evaluate(() => (window as unknown as { __csp?: string[] }).__csp ?? []),
    transfer: async (origin) => {
      const t: Transfer = { js: 0, css: 0, fonts: 0, other: 0, total: 0 }
      for (const e of await Promise.all(sizes)) {
        if (e.origin !== origin) continue
        t[e.kind] += e.bytes
        t.total += e.bytes
      }
      return t
    },
  }
}

export const kb = (n: number): string => `${(n / 1000).toFixed(1)} KB`

export interface PageOptions {
  width?: number
  height?: number
  /** Fixed to this instant before the page loads. */
  colorScheme?: 'light' | 'dark'
}

export async function newPage(browser: Browser, opts: PageOptions = {}): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({
    viewport: { width: opts.width ?? 360, height: opts.height ?? 800 },
    serviceWorkers: 'allow',
    colorScheme: opts.colorScheme ?? 'light',
  })
  return { context, page: await context.newPage() }
}

const yardsticks = new Map<string, Promise<number>>()

/** W0-S02's yardstick, run in a worker on a blank page of this engine: the runner's own speed, in milliseconds. */
export function measureYardstick(browser: Browser): Promise<number> {
  const key = browser.browserType().name()
  let p = yardsticks.get(key)
  if (!p) {
    p = (async () => {
      const { context, page } = await newPage(browser)
      try {
        await page.goto('about:blank')
        return await page.evaluate(
          (source) =>
            new Promise<number>((resolve, reject) => {
              const url = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }))
              const w = new Worker(url)
              w.onmessage = (e: MessageEvent<{ median: number }>) => {
                resolve(e.data.median)
                w.terminate()
              }
              w.onerror = (e) => reject(new Error(e.message))
              w.postMessage(1)
            }),
          YARDSTICK_WORKER_SOURCE,
        )
      } finally {
        await context.close()
      }
    })()
    yardsticks.set(key, p)
  }
  return p
}

/** The path of a URL without a trailing slash (a Pages-like host redirects /x to /x/). */
export const pathOf = (url: string): string => {
  const p = new URL(url).pathname
  return p.length > 1 ? p.replace(/\/+$/, '') : p
}
