// The fuzzed-import test (ARCHITECTURE.md section 5.7: "Replies render as text ... no reply field is assigned to innerHTML or
// rendered as Markdown. W1-T14's acceptance, a fuzzed import never renders as HTML, is a GATE-bundle test"). A seeded corpus
// (lib/fuzz.ts) goes into every place a learner can import a file: valid receipts with hostile markup in their fields, damaged
// ones, and bytes that are not JSON. Each hostile string carries a marker attribute, so the page's DOM says whether markup was
// parsed (an element carries the marker) or text was shown (the characters are on the page and no element has the marker). After
// each import the page must hold no marker element, no new inline handler, no javascript: link and no new frame, and
// script that would run (window.__ssPwn) must not have. The same payloads then arrive in the URL fragment of each surface.
// Surfaces: SCR-receipt, SCR-bench (receipt import by file or fragment) and SCR-instrument, the instrument origin's page.

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Page } from '@playwright/test'
import { fuzzCorpus } from '../lib/fuzz.ts'
import { enforce, expect, newPage, test, type GateEnv } from './fixtures.ts'
import type { World } from '../lib/world.ts'

interface Surface {
  name: string
  url: string
}

function surfaces(world: World, gate: GateEnv): Surface[] {
  const out: Surface[] = []
  for (const path of ['/receipts', '/bench']) if (gate.routes.some((r) => r.path === path)) out.push({ name: `site ${path}`, url: `${world.siteOrigin}${path}` })
  const candidates = ['instrument.html']
  const b = world.hostPage?.replace(/host\.html$/, '')
  if (b) candidates.unshift(`${b}instrument.html`)
  const page = candidates.find((c) => existsSync(join(world.instrumentsDir, c)))
  if (page) out.push({ name: `instrument origin /${page}`, url: `${world.instrumentOrigin}/${page}` })
  return out
}

/** Wait until the page has stopped changing (no DOM mutation for 150 ms, at most 2 s): an import answers after a hop to a worker. */
async function settle(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        let timer = setTimeout(done, 150)
        const hard = setTimeout(done, 2000)
        const mo = new MutationObserver(() => {
          clearTimeout(timer)
          timer = setTimeout(done, 150)
        })
        mo.observe(document.documentElement, { subtree: true, childList: true, attributes: true, characterData: true })
        function done(): void {
          mo.disconnect()
          clearTimeout(timer)
          clearTimeout(hard)
          resolve()
        }
      }),
  )
}

async function pageState(page: Page): Promise<{ markers: number; pwn: boolean; handlers: number; jsLinks: number; frames: number }> {
  return page.evaluate(() => ({
    markers: document.querySelectorAll('[data-ss-fuzz]').length,
    pwn: (window as unknown as { __ssPwn?: unknown }).__ssPwn !== undefined,
    handlers: [...document.querySelectorAll('*')].filter((el) => [...el.attributes].some((a) => /^on/i.test(a.name))).length,
    jsLinks: document.querySelectorAll('a[href^="javascript:" i]').length,
    frames: document.querySelectorAll('iframe').length,
  }))
}

test('[import.fuzz] a fuzzed import never renders as HTML', async ({ browser, world, gate }) => {
  enforce(gate, 'import.fuzz')
  const base = JSON.parse(readFileSync(join(gate.repoRoot, 'schemas/fixtures/receipt/valid/z3-unsat-cross-checked.json'), 'utf8')) as never
  const corpus = fuzzCorpus(base)
  const found = surfaces(world, gate)
  expect(found.length, 'no import surface in the build').toBeGreaterThan(0)
  let withInput = 0
  for (const s of found) {
    const { context, page } = await newPage(browser)
    try {
      await page.goto(s.url, { waitUntil: 'load' })
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => undefined)
      const input = page.locator('input[type="file"]').first()
      if ((await input.count()) === 0) continue
      withInput += 1
      const baseline = await pageState(page)
      for (const f of corpus) {
        await input.setInputFiles({ name: f.name, mimeType: 'application/json', buffer: f.body })
        await settle(page)
        const now = await pageState(page)
        const why = `${s.name}, ${f.name} (${f.note})`
        expect(now.markers, `${why}: markup from the file was parsed into the page`).toBe(0)
        expect(now.pwn, `${why}: script from the file ran`).toBe(false)
        expect(now.handlers, `${why}: an inline event handler appeared`).toBeLessThanOrEqual(baseline.handlers)
        expect(now.jsLinks, `${why}: a javascript: link appeared`).toBe(0)
        expect(now.frames, `${why}: a frame appeared`).toBeLessThanOrEqual(baseline.frames)
      }
    } finally {
      await context.close()
    }
  }
  expect(withInput, 'none of the import surfaces has a file input (input[type="file"])').toBeGreaterThan(0)

  // the same payloads as fragments, within the 32 KiB cap of ARCHITECTURE.md section 5.6
  for (const s of found) {
    for (const f of corpus.filter((c) => c.body.length > 0 && c.body.length < 20_000).slice(0, 4)) {
      const { context, page } = await newPage(browser)
      try {
        await page.goto(`${s.url}#${f.body.toString('base64url')}`, { waitUntil: 'load' })
        await settle(page)
        const now = await pageState(page)
        const why = `${s.name} with ${f.name} in the fragment`
        expect(now.markers, `${why}: markup from the fragment was parsed into the page`).toBe(0)
        expect(now.pwn, `${why}: script from the fragment ran`).toBe(false)
        expect(now.jsLinks, `${why}: a javascript: link appeared`).toBe(0)
      } finally {
        await context.close()
      }
    }
  }
})
