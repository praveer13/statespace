import { expect, test, type APIRequestContext, type Page } from '@playwright/test'

// Every page of the course opens: the start page, /stages, and each stage, lesson, lab and drawer page the content build
// wrote, at the config's 360-px viewport. Each must show its one h1 (not the could-not-load or not-found heading) with no
// console error. One test per kind of page walks all of that kind and lists every page that failed.
// scripts/site/smoke.sh runs this beside routes.spec.ts in the pinned Playwright image.

type Manifest = { lessons: Record<string, unknown>; drawers: Record<string, unknown>; stages: string; labs: string }
type Stages = { stages: { id: string; lab?: { id: string } | null }[] }

const FAILED_HEADINGS = ['This page could not load', 'Not found']

async function paths(request: APIRequestContext, kind: string): Promise<string[]> {
  const m = (await (await request.get('/content/manifest.json')).json()) as Manifest
  if (kind === 'lessons') return Object.keys(m.lessons).map((id) => `/lessons/${id}`)
  if (kind === 'drawers') return Object.keys(m.drawers).map((id) => `/drawers/${id}`)
  const s = (await (await request.get(`/${m.stages}`)).json()) as Stages
  if (kind === 'stages') return ['/', '/stages', ...s.stages.map((st) => `/stages/${st.id}`)]
  return s.stages.flatMap((st) => (st.lab ? [`/labs/${st.lab.id}`] : []))
}

async function opens(page: Page, path: string): Promise<string[]> {
  const seen: string[] = []
  const onConsole = (m: { type(): string; text(): string }) => {
    if (m.type() === 'error') seen.push(`console: ${m.text()}`)
  }
  const onError = (e: Error) => seen.push(`pageerror: ${e.message}`)
  page.on('console', onConsole)
  page.on('pageerror', onError)
  try {
    const res = await page.goto(path)
    if (res?.status() !== 200) seen.push(`status ${res?.status()}`)
    const h1 = page.locator('h1')
    await h1.first().waitFor({ state: 'visible', timeout: 10_000 })
    await page.waitForLoadState('networkidle')
    if ((await h1.count()) !== 1) seen.push(`${await h1.count()} h1 elements`)
    const heading = ((await h1.first().textContent()) ?? '').trim()
    if (heading === '' || FAILED_HEADINGS.includes(heading)) seen.push(`h1 is "${heading}"`)
    if (path.startsWith('/lessons/') && (await page.getByText('This lesson is not written yet').count()) > 0) seen.push('opens as not written')
  } catch (e) {
    seen.push(`no h1: ${(e as Error).message.split('\n')[0]}`)
  } finally {
    page.off('console', onConsole)
    page.off('pageerror', onError)
  }
  return seen
}

for (const kind of ['stages', 'lessons', 'labs', 'drawers']) {
  test(`every ${kind} page renders its h1 with no console error`, async ({ page, request }) => {
    test.setTimeout(600_000)
    const all = await paths(request, kind)
    expect(all.length).toBeGreaterThan(0)
    const failed: string[] = []
    for (const path of all) {
      const problems = await opens(page, path)
      if (problems.length > 0) failed.push(`${path}: ${problems.join('; ')}`)
    }
    console.log(`${kind}: ${all.length - failed.length} of ${all.length} pages render`)
    expect(failed).toEqual([])
  })
}
