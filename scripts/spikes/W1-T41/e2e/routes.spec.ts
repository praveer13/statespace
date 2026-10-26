// Route tests (spine section 11.2, ARCHITECTURE.md sections 3.1 and 3.2). Every route in the build, and every delivered screen
// (scripts/spikes/W1-T41/lib/routes.ts), is requested from a host that serves files and nothing else, as GitHub Pages does,
// in a fresh browser, and must hold:
//   * the page answers 200 for a deep link: a static page exists for the route, with no single-page fallback to lean on
//   * nothing guards the route (I5): the page the learner asked for is the page they get, with no redirect to another route
//   * the page has what a screen has: lang, a title, a main landmark and a level-one heading
//   * no console error or warning, no page error, no failed request, no CSP violation
//   * no request to any origin but the site's own, and the instrument origin's once the page creates its frame: the spine
//     fails "a request to any third-party origin the learner did not reach through a link-out", and no test here follows one
//   * the main origin sets no cookie
// The shell's navigation (five destinations and search) is checked once it exists (W1-T02).

import { NAV_DESTINATIONS } from '../lib/routes.ts'
import { enforce, expect, gateEnv, kb, newPage, pathOf, test, watch } from './fixtures.ts'

for (const route of gateEnv().routes) {
  test(`[route:${route.path}] a deep link answers 200 from static hosting and the page holds the rules`, async ({ browser, world }) => {
    const { context, page } = await newPage(browser)
    try {
      const seen = await watch(page)
      const res = await page.goto(world.siteOrigin + route.path, { waitUntil: 'load' })
      expect(res?.status(), `${route.path} must have a page of its own (no single-page fallback on static hosting)`).toBe(200)
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => undefined)

      if (route.path !== '/') expect(pathOf(page.url()), 'a route has no guard: the learner is not sent elsewhere (I5)').toBe(route.path)
      await expect(page.locator('html')).toHaveAttribute('lang', /^[a-z]{2}/)
      expect((await page.title()).trim(), 'the page has a title').not.toBe('')
      await expect(page.getByRole('main').first()).toBeVisible()
      expect(await page.getByRole('heading', { level: 1 }).count(), 'the page has a level-one heading').toBeGreaterThanOrEqual(1)

      expect(seen.problems, `console errors or warnings, page errors or failed requests: ${seen.problems.join(' | ').slice(0, 300)}`).toEqual([])
      const csp = await seen.csp()
      expect(csp, `CSP violations: ${csp.join(' | ').slice(0, 300)}`).toEqual([])
      const allowed = new Set([world.siteOrigin, world.instrumentOrigin])
      const foreign = [...seen.origins].filter((o) => !allowed.has(o))
      expect(foreign, `requests to origins the course does not run: ${foreign.join(', ')}`).toEqual([])
      expect(await page.evaluate(() => document.cookie), 'the main origin sets no cookie').toBe('')
      expect(await context.cookies(), 'no cookie in the browser').toEqual([])
      const t = await seen.transfer(world.siteOrigin)
      test.info().annotations.push({ type: 'measured', description: `first visit ${kb(t.total)} on the wire (js ${kb(t.js)}, css ${kb(t.css)}, fonts ${kb(t.fonts)}, other ${kb(t.other)})` })
    } finally {
      await context.close()
    }
  })
}

test('[route:404] an unknown path is a 404, never a page that answers 200 for everything', async ({ browser, world }) => {
  const { context, page } = await newPage(browser)
  try {
    const res = await page.goto(`${world.siteOrigin}/no-such-screen-${Date.now().toString(36)}`, { waitUntil: 'load' })
    expect(res?.status()).toBe(404)
    const notFound = await page.request.get(`${world.siteOrigin}/404.html`)
    if (notFound.status() === 200) {
      // the site's own not-found page is what a host serves for a miss
      await expect(page.getByRole('main').first()).toBeVisible()
      expect(await page.getByRole('heading', { level: 1 }).count()).toBeGreaterThanOrEqual(1)
    }
  } finally {
    await context.close()
  }
})

test('[nav] the shell offers Today, Stages, Bench, Audit, Claims and search, and each works from a keyboard-first page', async ({ browser, world, gate }) => {
  enforce(gate, 'nav')
  for (const width of [360, 1280]) {
    const { context, page } = await newPage(browser, { width })
    try {
      await page.goto(`${world.siteOrigin}/`, { waitUntil: 'load' })
      await page.keyboard.press('Tab')
      const first = await page.evaluate(() => (document.activeElement as HTMLElement | null)?.textContent?.trim() ?? '')
      expect(first, `at ${width} px the first Tab stop is the skip link (DESIGN.md section 7.2)`).toMatch(/skip to (main )?content/i)
      await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur()) // a focused skip link may sit over the first link
      const nav = page.getByRole('navigation').first()
      await expect(nav, `at ${width} px the page has a navigation landmark`).toBeVisible()
      for (const d of NAV_DESTINATIONS) {
        const link = nav.getByRole('link', { name: d.name }).first()
        await expect(link, `at ${width} px the navigation links ${d.path}`).toBeVisible()
        await link.click()
        await page.waitForURL((u) => pathOf(u.toString()) === d.path, { timeout: 8000 })
        await expect(page.getByRole('main').first()).toBeVisible()
        await page.goto(`${world.siteOrigin}/`, { waitUntil: 'load' })
      }
      const search = page.getByRole('link', { name: /search/i }).or(page.getByRole('button', { name: /search/i })).or(page.getByRole('searchbox'))
      expect(await search.count(), `at ${width} px search is reachable`).toBeGreaterThanOrEqual(1)
    } finally {
      await context.close()
    }
  }
})
