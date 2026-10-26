// "A spec-duel fragment never leaves the device and is parsed only on the instrument origin" (spine section 11.2; I6;
// ARCHITECTURE.md sections 3.2 and 5.7). A fragment is the one place a payload can ride in a link without reaching a server,
// and the main origin must not read it as data: it may look up a name in it (SCR-receipt's #<sha256>), never decode or parse
// it. This check loads routes with a payload in the fragment, a base64url JSON that names a canary, and watches the main
// origin's page for any call of a decoder or parser (JSON.parse, atob, decodeURI*, TextDecoder, DOMParser, eval) whose argument
// holds the canary or its encoding. It also requires that the payload never shows on the page decoded and that no request
// carries it. Frames on the instrument origin are left alone: parsing belongs there. The lint `lint.fragment` is the static
// half of the same rule.
//
// The routes are lib/routes.ts canaryRoutes: every route of ARCHITECTURE.md section 3.2 that the build has, /receipts among
// them (the one main-origin route whose fragment names something), and the first page of each other kind. Each route gets its
// own canary, so a leak names the route it came from, and four routes load at a time.

import { fragmentCanary } from '../lib/fuzz.ts'
import { canaryRoutes } from '../lib/routes.ts'
import { expect, newPage, test } from './fixtures.ts'

const PROBES = `(args) => {
  if (location.origin !== args.siteOrigin) return;
  const hits = (window.__ssProbe = { hits: [] }).hits;
  const rawDecode = TextDecoder.prototype.decode;
  const text = (v) => {
    if (typeof v === 'string') return v;
    if (v instanceof ArrayBuffer || ArrayBuffer.isView(v)) return rawDecode.call(new TextDecoder(), v);
    return String(v);
  };
  const sees = (v) => { try { const s = text(v); return s.includes(args.token) || s.includes(args.encoded); } catch { return false; } };
  const wrap = (obj, name, label) => {
    const original = obj && obj[name];
    if (typeof original !== 'function') return;
    obj[name] = function (...a) { if (a.some(sees)) hits.push(label); return original.apply(this, a); };
  };
  wrap(JSON, 'parse', 'JSON.parse');
  wrap(window, 'atob', 'atob');
  wrap(window, 'decodeURIComponent', 'decodeURIComponent');
  wrap(window, 'decodeURI', 'decodeURI');
  wrap(window, 'unescape', 'unescape');
  wrap(window, 'eval', 'eval');
  wrap(DOMParser.prototype, 'parseFromString', 'DOMParser.parseFromString');
  wrap(TextDecoder.prototype, 'decode', 'TextDecoder.decode');
}`

/** Pages loaded at once: the routes are independent, and one at a time would cost the fast lane about a second a route. */
const AT_ONCE = 4

async function eachAtOnce<T>(items: readonly T[], limit: number, fn: (item: T) => Promise<void>): Promise<void> {
  let next = 0
  const lane = async (): Promise<void> => {
    while (next < items.length) await fn(items[next++] as T)
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, lane))
}

test('[fragment.canary] the main origin never decodes or parses what a URL fragment carries', async ({ browser, world, gate }) => {
  const routes = canaryRoutes(gate.routes)
  expect(routes.length, 'the build has no route to load').toBeGreaterThan(0)
  const problems: string[] = []
  await eachAtOnce(routes, AT_ONCE, async (route) => {
    const { token, encoded } = fragmentCanary(`route${route.replace(/[^A-Za-z0-9]+/g, '-')}`)
    const { context, page } = await newPage(browser)
    try {
      await page.addInitScript(`(${PROBES})(${JSON.stringify({ token, encoded, siteOrigin: world.siteOrigin })})`)
      await page.goto(`${world.siteOrigin}${route}#${encoded}`, { waitUntil: 'load' })
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => undefined)
      await page.waitForTimeout(400)
      const hits = await page.evaluate(() => (window as unknown as { __ssProbe?: { hits: string[] } }).__ssProbe?.hits ?? [])
      if (hits.length > 0) problems.push(`${route}#<payload>: the page passed the fragment to ${[...new Set(hits)].join(', ')}`)
      if ((await page.locator('body').innerText()).includes(token)) problems.push(`${route}: the decoded payload is on the page`)
      const leaked = world.requests.filter((r) => r.path.includes(encoded) || r.path.includes(token))
      if (leaked.length > 0) problems.push(`${route}: a request carried the fragment (${leaked.map((r) => `${r.label} ${r.path}`).join(', ')})`)
    } finally {
      await context.close()
    }
  })
  test.info().annotations.push({ type: 'measured', description: `${routes.length} routes loaded with a payload in the fragment: ${routes.join(', ')}` })
  expect(problems, `the main origin read what a fragment carries: ${problems.join('; ')}`).toEqual([])
})
