// Service-worker kill-switch tests (spine section 11.2; ARCHITECTURE.md section 16). The main origin's worker is the vendored
// sw.js (vendor/kernelspace/public/sw.js), whose kill switch is the rule of its header: "set KILL_SWITCH to true and deploy,
// and install/activate unregister this worker and delete every cache", and app code unregisters on ?nosw=1. These four checks
// are the browser half of kernelspace's own smoke test (vendor/kernelspace/scripts/sw-smoke.ts), run on the built site:
//   sw.register  the worker registers, precaches, and controls the next load
//   sw.offline   Today and Boot render offline after one visit ("Today must start offline", section 14)
//   sw.nosw      ?nosw=1 unregisters the worker, deletes its caches and leaves the page uncontrolled
//   sw.kill      a deployed KILL_SWITCH build replaces a live worker on registration.update() and retires it, caches included
// None of them names a cache: the vendored worker's prefix is rewritten by the build step that derives dist/sw.js (VENDOR.md),
// so "retired" means no registration and no cache at all.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Page } from '@playwright/test'
import { enforce, expect, gateEnv, newPage, test } from './fixtures.ts'

const ROUTES = new Set(gateEnv().routes.map((r) => r.path))
const HOME = ROUTES.has('/today') ? '/today' : '/'

const registrations = (p: Page): Promise<number> => p.evaluate(() => navigator.serviceWorker.getRegistrations().then((r) => r.length))
const cacheCount = (p: Page): Promise<number> => p.evaluate(() => caches.keys().then((k) => k.length))
const controlled = (p: Page): Promise<boolean> => p.evaluate(() => navigator.serviceWorker.controller !== null)

/** Poll a condition in the page: the worker's own work (install, precache, activate) runs on its own clock. */
async function until(p: Page, what: string, condition: () => Promise<boolean>, ms = 15_000): Promise<void> {
  const deadline = Date.now() + ms
  while (Date.now() < deadline) {
    if (await condition().catch(() => false)) return
    await p.waitForTimeout(150)
  }
  throw new Error(`timed out after ${ms} ms waiting for ${what}`)
}

const installed = (p: Page) => async (): Promise<boolean> =>
  p.evaluate(async () => {
    const reg = await navigator.serviceWorker.getRegistration()
    return reg?.active != null && (await caches.keys()).length > 0
  })

async function visitUntilInstalled(p: Page, origin: string, path: string): Promise<void> {
  await p.goto(`${origin}${path}`, { waitUntil: 'load' })
  await until(p, 'the worker to register, activate and precache', installed(p))
  await p.reload({ waitUntil: 'load' }) // the next load is controlled
  await until(p, 'the next load to be controlled', () => controlled(p), 8000)
}

test('[sw.register] the worker registers, precaches the shell and controls the next load', async ({ browser, world, gate }) => {
  enforce(gate, 'sw.register')
  const { context, page } = await newPage(browser)
  try {
    const res = await page.request.get(`${world.siteOrigin}/sw.js`)
    expect(res.status(), 'the build has a sw.js at the site root').toBe(200)
    await visitUntilInstalled(page, world.siteOrigin, HOME)
    expect(await registrations(page)).toBe(1)
  } finally {
    await context.close()
  }
})

test('[sw.offline] Today and Boot render offline after one visit', async ({ browser, world, gate }) => {
  enforce(gate, 'sw.offline')
  if (browser.browserType().name() === 'webkit') {
    // Playwright's offline mode makes WebKit fail the navigation outright ("WebKit encountered an internal error") when a service
    // worker controls the page, so the check cannot be run there; the other two engines run it
    test.info().annotations.push({ type: 'measured', description: "webkit: not run, Playwright's offline mode does not work with a WebKit service worker" })
    test.skip(true, 'the offline mode of Playwright cannot be used with a service worker in WebKit')
  }
  const { context, page } = await newPage(browser)
  try {
    const wanted = ['/today', '/boot'].filter((r) => ROUTES.has(r))
    const paths = wanted.length > 0 ? wanted : ['/']
    for (const p of paths) await visitUntilInstalled(page, world.siteOrigin, p)
    await context.setOffline(true)
    for (const p of paths) {
      const failed: string[] = []
      const onFail = (r: { url(): string }): void => void failed.push(r.url())
      page.on('requestfailed', onFail)
      await page.goto(`${world.siteOrigin}${p}`, { waitUntil: 'load' })
      await page.evaluate(() => document.fonts.ready.then(() => true))
      await page.waitForTimeout(800)
      const chars = await page.evaluate(() => (document.getElementById('root')?.innerText ?? document.body.innerText).trim().length)
      page.off('requestfailed', onFail)
      expect(chars, `${p} renders offline`).toBeGreaterThan(40)
      expect(failed.filter((u) => u.startsWith(world.siteOrigin)), `${p} offline: same-origin requests that failed`).toEqual([])
    }
  } finally {
    await context.close()
  }
})

test('[sw.nosw] ?nosw=1 unregisters the worker, deletes its caches and leaves the page uncontrolled', async ({ browser, world, gate }) => {
  enforce(gate, 'sw.nosw')
  const { context, page } = await newPage(browser)
  try {
    await visitUntilInstalled(page, world.siteOrigin, HOME)
    await page.goto(`${world.siteOrigin}${HOME}?nosw=1`, { waitUntil: 'load' })
    await until(page, 'the registration and every cache to be gone', async () => (await registrations(page)) === 0 && (await cacheCount(page)) === 0, 10_000)
    await page.goto(`${world.siteOrigin}${HOME}?nosw=1`, { waitUntil: 'load' })
    expect(await controlled(page), 'a following ?nosw=1 load is uncontrolled').toBe(false)
  } finally {
    await context.close()
  }
})

test('[sw.kill] a deployed kill switch replaces a live worker and retires it, caches included', async ({ browser, world, gate }) => {
  enforce(gate, 'sw.kill')
  const live = readFileSync(join(world.siteDir, 'sw.js'), 'utf8')
  const killed = live.replace('const KILL_SWITCH = false', 'const KILL_SWITCH = true')
  expect(killed, 'dist/sw.js must keep the vendored line `const KILL_SWITCH = false`, the one a kill-switch deploy flips (vendor/kernelspace/VENDOR.md)').not.toBe(live)
  const { context, page } = await newPage(browser)
  try {
    await visitUntilInstalled(page, world.siteOrigin, HOME)
    // settled: precached, active and controlling, so an update cannot slip past a worker that is still installing
    await page.waitForTimeout(1000)
    world.site.override('/sw.js', killed, 'text/javascript; charset=utf-8')
    // not awaited: with a stuck install the update never settles, and the polling below is the verdict
    void page.evaluate(() => navigator.serviceWorker.getRegistration().then((r) => r?.update())).catch(() => undefined)
    // getRegistration(), not getRegistrations(): an unregister queued behind a stuck install already hides the
    // registration from the plural call while the old worker stays active
    await until(
      page,
      'the killed worker to replace the live one and retire it',
      async () => (await page.evaluate(() => navigator.serviceWorker.getRegistration().then((r) => r === undefined))) && (await cacheCount(page)) === 0,
      12_000,
    )
    // a plain load registers the kill worker again, which must retire itself and leave the page alone
    await page.goto(`${world.siteOrigin}${HOME}`, { waitUntil: 'load' })
    await page.waitForTimeout(3500)
    expect(await controlled(page), 'a later plain load stays uncontrolled').toBe(false)
    expect(await cacheCount(page), 'and no cache is left').toBe(0)
  } finally {
    world.site.override('/sw.js', null)
    await context.close()
  }
})
