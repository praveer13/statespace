import { AxeBuilder } from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

// The scaffold's smoke test: the built site loads under its meta CSP, requests nothing from another origin,
// raises no console error, and passes axe (WCAG 2.0 to 2.2, A and AA) with no sideways scroll at the three
// widths of GATE-a11y. GATE-bundle and GATE-a11y proper are built on the shell (W1).

const WIDTHS = [360, 320, 1280]
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

type Watched = { problems: string[]; origins: Set<string> }

async function watch(page: Page): Promise<Watched> {
  const seen: Watched = { problems: [], origins: new Set() }
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') seen.problems.push(`console ${m.type()}: ${m.text()}`)
  })
  page.on('pageerror', (e) => seen.problems.push(`pageerror: ${e.message}`))
  page.on('requestfailed', (r) => seen.problems.push(`request failed: ${r.url()}`))
  page.on('request', (r) => {
    if (!r.url().startsWith('data:')) seen.origins.add(new URL(r.url()).origin)
  })
  await page.addInitScript(() => {
    const w = window as unknown as { __csp?: string[] }
    document.addEventListener('securitypolicyviolation', (e) => {
      w.__csp = [...(w.__csp ?? []), `${e.violatedDirective} ${e.blockedURI}`]
    })
  })
  return seen
}

const violations = (page: Page) => page.evaluate(() => (window as unknown as { __csp?: string[] }).__csp ?? [])

test('the home screen renders under its meta CSP, blocks nothing and calls no other origin', async ({ page, baseURL }) => {
  const seen = await watch(page)
  const res = await page.goto('/')
  expect(res?.status()).toBe(200)
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/formal methods/)
  await expect(page.getByRole('main')).toBeVisible()
  const csp = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content')
  expect(csp).toContain("default-src 'self'")
  expect(csp).toContain("script-src 'self'")
  expect(csp).toContain("object-src 'none'")
  expect(csp).not.toContain('unsafe-')
  expect(await violations(page)).toEqual([])
  expect(seen.problems).toEqual([])
  expect([...seen.origins]).toEqual([new URL(baseURL!).origin])
})

test('an unknown path shows the not-found screen', async ({ page }) => {
  const seen = await watch(page)
  const res = await page.goto('/no-such-screen')
  expect(res?.status()).toBe(200)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Not found')
  await page.getByRole('link', { name: 'Go to the start.' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/formal methods/)
  expect(seen.problems).toEqual([])
})

for (const width of WIDTHS) {
  test(`axe finds nothing and the page does not scroll sideways at ${width} px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 })
    for (const route of ['/', '/no-such-screen']) {
      await page.goto(route)
      await page.evaluate(() => document.fonts.ready)
      const { violations: found } = await new AxeBuilder({ page }).withTags(TAGS).analyze()
      expect(found.map((v) => `${v.id}: ${v.nodes[0]?.target.join(' ')}`)).toEqual([])
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(overflow).toBeLessThanOrEqual(0)
    }
  })
}
