import { expect, test, type APIRequestContext, type Page } from '@playwright/test'

// The happy path's smoke test: the start page and one page of each route type render their one h1 at the config's
// 360-px viewport, with no console error and no sideways page scroll at 360 or 320 px; and a learner can answer a lesson's questions and
// find their place again on Today. The lesson and the drawer are the first the content build wrote (S1.L0 and D-01,
// which open as "not written yet", when it wrote none). scripts/site/smoke.sh runs this in the pinned Playwright image.

type Manifest = { lessons: Record<string, unknown>; drawers: Record<string, unknown> }

async function built(request: APIRequestContext): Promise<{ lesson: string; drawer: string }> {
  const m = (await (await request.get('/content/manifest.json')).json()) as Manifest
  return { lesson: Object.keys(m.lessons).sort()[0] ?? 'S1.L0', drawer: Object.keys(m.drawers).sort()[0] ?? 'D-01' }
}

function watch(page: Page): string[] {
  const seen: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error') seen.push(`console: ${m.text()}`)
  })
  page.on('pageerror', (e) => seen.push(`pageerror: ${e.message}`))
  return seen
}

const ROUTES = ['/', '/today', '/stages', '/stages/S1', 'lesson', '/labs/LAB-1', 'drawer', '/bench', '/claims', '/audit', '/specimens', '/mirror']

for (const route of ROUTES) {
  test(`${route} renders its h1 with no console error`, async ({ page, request }) => {
    const ids = await built(request)
    const path = route === 'lesson' ? `/lessons/${ids.lesson}` : route === 'drawer' ? `/drawers/${ids.drawer}` : route
    const seen = watch(page)
    const res = await page.goto(path)
    expect(res?.status()).toBe(200)
    await expect(page.locator('h1')).toHaveCount(1)
    await expect(page.locator('h1')).toBeVisible()
    await page.evaluate(() => document.fonts.ready)
    const sideways = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(await sideways(), `${path} scrolls sideways at 360 px`).toBeLessThanOrEqual(0)
    await page.setViewportSize({ width: 320, height: 800 })
    expect(await sideways(), `${path} scrolls sideways at 320 px`).toBeLessThanOrEqual(0)
    expect(seen).toEqual([])
  })
}

test('a learner answers a lesson and Today finds the place again', async ({ page, request }) => {
  const ids = await built(request)
  const seen = watch(page)
  await page.goto(`/lessons/${ids.lesson}`)
  await expect(page.locator('h1')).toBeVisible()
  const questions = page.locator('.question:has(input[type=radio])')
  const cells = page.locator('.cell:has(.ci)')
  test.skip((await questions.count()) + (await cells.count()) === 0, `${ids.lesson} has no question this build can answer`)

  if ((await questions.count()) > 0) {
    const q = questions.first()
    await q.locator('input[type=radio]').first().check()
    await q.getByRole('button', { name: 'Submit' }).click()
    await expect(q.locator('.question-result')).toBeVisible()
    await expect(q.locator('.whys-list li')).not.toHaveCount(0)
  }
  if ((await cells.count()) > 0) {
    const cell = cells.first()
    await expect(cell.locator('.cell-output')).toHaveCount(0)
    await cell.locator('.ci-options input[type=radio]').first().check()
    await cell.locator('.ci-taps input[type=radio]').first().check()
    await cell.locator('.ci-action').click()
    await expect(cell.locator('.cell-output')).toBeVisible()
    await expect(cell.locator('.whys-list li')).not.toHaveCount(0)
  }

  await page.goto('/today')
  await expect(page.locator('.today-card')).toContainText(/Continue|Next/)
  await page.reload()
  await page.goto(`/lessons/${ids.lesson}`)
  await expect(page.locator('.question-result, .cell-output').first()).toBeVisible()
  expect(seen).toEqual([])
})
