import { AxeBuilder } from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

// The scaffold's smoke test for the instrument origin: both pages load under the host policy, request
// nothing from another origin, raise no console error, and pass axe at the three widths of GATE-a11y.

const WIDTHS = [360, 320, 1280]
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const PAGES = ['/host.html', '/instrument.html']

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

for (const route of PAGES) {
  test(`${route} loads under the host policy, blocks nothing and calls no other origin`, async ({ page, baseURL }) => {
    const seen = await watch(page)
    const res = await page.goto(route)
    expect(res?.status()).toBe(200)
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    const csp = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content')
    expect(csp).toContain("script-src 'self' 'wasm-unsafe-eval'")
    expect(csp).toContain("connect-src 'self'")
    expect(csp).toContain("object-src 'none'")
    expect(csp).not.toContain("'unsafe-inline'")
    expect(csp).not.toContain("'unsafe-eval'") // 'wasm-unsafe-eval' is the one allowance, and it is not this
    expect(await page.evaluate(() => (window as unknown as { __csp?: string[] }).__csp ?? [])).toEqual([])
    expect(seen.problems).toEqual([])
    expect([...seen.origins]).toEqual([new URL(baseURL!).origin])
  })
}

test('the host page opened on its own says what it is and does nothing', async ({ page }) => {
  await page.goto('/host.html')
  await expect(page.locator('#status')).toHaveText('This page belongs to the statespace course and does nothing on its own.')
})

for (const width of WIDTHS) {
  test(`axe finds nothing and neither page scrolls sideways at ${width} px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 })
    for (const route of PAGES) {
      await page.goto(route)
      await page.evaluate(() => document.fonts.ready)
      const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze()
      expect(violations.map((v) => `${route} ${v.id}: ${v.nodes[0]?.target.join(' ')}`)).toEqual([])
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(overflow).toBeLessThanOrEqual(0)
    }
  })
}
