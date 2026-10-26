// The instrument bus's handshake, from the outside (ARCHITECTURE.md sections 5.3 to 5.6, 15.4; I6; W1-T35's acceptance names
// GATE-bundle: "the handshake rejects a foreign origin and oversize messages"). The gate plays the embedder, with the iframe
// of section 5.3 (hidden, referrerpolicy no-referrer, sandbox="allow-scripts allow-same-origin"), from two origins:
//   handshake.foreign   an origin that is not the main origin gets no `hello`, and a forged `connect` gets no reply on its port
//   handshake.allowed   the main origin gets `hello` {bus: 1, build}, answers `connect`, gets `ready` with the engines' caps once,
//                       and the host refuses, each with the error code section 5.4 names, and keeps answering: a `run` message
//                       over 16 MiB (its input 16 MiB + 1 characters; section 5.6, any message), sent to an engine that is not
//                       a text engine when ready lists one, and a `run` whose input is over the 256 KiB a text engine takes
//                       (section 5.6, run.input for SMT-LIB and the other text engines), both `too-large` and never queued (an
//                       answer of `result` fails); a message that is not an object, a run with no request, prototype keys, all
//                       `bad-message`; an engine the build does not have, `unknown-engine`. The oversize messages are built in
//                       the page and are well-formed runs for an engine `ready` listed, at the version it listed, so size is the
//                       only thing wrong with them
//   handshake.caps      `ready` reports each engine's firstLoadBytes, and for z3 that is the build manifest's figure (OD-6)
//   handshake.toplevel  the host opened at the top level shows a notice and talks to nobody
// The host's allowed parent is the production main origin (https://<COURSE_DOMAIN>), which the gate's hosts map onto the site's
// local origin, so the gate's own embedder, served from the site's origin, is the allowed parent.

import type { Page } from '@playwright/test'
import { enforce, expect, newPage, test } from './fixtures.ts'
import type { World } from '../lib/world.ts'

const EMBEDDER = `<!doctype html><meta charset="utf-8"><title>gate embedder</title>
<body>
<script>
window.__log = [];
window.__ports = [];
const host = new URLSearchParams(location.search).get('host');
const hostOrigin = new URL(host).origin;
const frame = document.createElement('iframe');
frame.setAttribute('sandbox', 'allow-scripts allow-same-origin');
frame.setAttribute('referrerpolicy', 'no-referrer');
frame.title = 'statespace instruments';
frame.hidden = true;
frame.src = host;
window.addEventListener('message', (e) => {
  if (e.source === frame.contentWindow) window.__log.push({ via: 'window', origin: e.origin, data: e.data });
});
document.body.append(frame);
window.__connect = (build) => {
  const channel = new MessageChannel();
  const index = window.__ports.length;
  channel.port1.onmessage = (e) => window.__log.push({ via: 'port', index, data: e.data });
  window.__ports.push(channel.port1);
  frame.contentWindow.postMessage({ t: 'connect', bus: 1, build, nonce: 'gate-' + Math.random().toString(36).slice(2) }, hostOrigin, [channel.port2]);
  return index;
};
</script>
</body>`

type Entry = { via: 'window' | 'port'; origin?: string; index?: number; data: Record<string, unknown> }

/** The engines whose run.input section 5.6 caps at 256 KiB, "text engines (SMT-LIB, TLA+, SQL, IR JSON)", by section 5.4's engine table. */
const TEXT_ENGINES: ReadonlySet<string> = new Set(['z3', 'spectacle', 'pglite', 'interp'])

const log = (p: Page): Promise<Entry[]> => p.evaluate(() => (window as unknown as { __log: Entry[] }).__log)

async function waitFor(p: Page, what: string, until: (l: Entry[]) => boolean, ms = 8000): Promise<Entry[]> {
  const deadline = Date.now() + ms
  let l: Entry[] = []
  while (Date.now() < deadline) {
    l = await log(p)
    if (until(l)) return l
    await p.waitForTimeout(100)
  }
  throw new Error(`timed out after ${ms} ms waiting for ${what}; saw ${JSON.stringify(l).slice(0, 400)}`)
}

function embedderUrl(origin: string, path: string, world: World): string {
  return `${origin}${path}?host=${encodeURIComponent(world.hostUrl ?? '')}`
}

test('[handshake.foreign] a foreign origin gets no hello and no reply to a forged connect', async ({ browser, world, gate }) => {
  enforce(gate, 'handshake.foreign')
  expect(world.hostUrl, 'the instruments build has no host.html').not.toBeNull()
  world.foreign.override('/embed.html', EMBEDDER, 'text/html; charset=utf-8')
  const { context, page } = await newPage(browser)
  try {
    await page.goto(embedderUrl(world.foreignOrigin, '/embed.html', world), { waitUntil: 'load' })
    await page.waitForTimeout(3000)
    expect((await log(page)).filter((l) => l.via === 'window'), 'the host spoke to a foreign parent').toEqual([])
    await page.evaluate(() => (window as unknown as { __connect(b: string): number }).__connect('forged'))
    await page.waitForTimeout(1500)
    expect((await log(page)).filter((l) => l.via === 'port'), 'the host answered a forged connect').toEqual([])
  } finally {
    world.foreign.override('/embed.html', null)
    await context.close()
  }
})

test('[handshake.allowed] the main origin connects once, and the host refuses what the bus forbids', async ({ browser, world, gate }) => {
  enforce(gate, 'handshake.allowed')
  expect(world.hostUrl, 'the instruments build has no host.html').not.toBeNull()
  world.site.override('/__gate/embed.html', EMBEDDER, 'text/html; charset=utf-8')
  const { context, page } = await newPage(browser)
  try {
    await page.goto(embedderUrl(world.siteOrigin, '/__gate/embed.html', world), { waitUntil: 'load' })
    const hello = (await waitFor(page, 'hello', (l) => l.some((e) => e.via === 'window' && e.data['t'] === 'hello'), 12_000)).find((e) => e.via === 'window' && e.data['t'] === 'hello') as Entry
    expect(hello.origin, 'hello comes from the instrument origin').toBe(world.instrumentOrigin)
    expect(hello.data['bus']).toBe(1)
    expect(typeof hello.data['build'], 'hello names the build').toBe('string')

    await page.evaluate((b) => (window as unknown as { __connect(b: string): number }).__connect(b), String(hello.data['build']))
    const ready = (await waitFor(page, 'ready', (l) => l.some((e) => e.via === 'port' && e.data['t'] === 'ready'))).find((e) => e.via === 'port' && e.data['t'] === 'ready') as Entry
    expect(Array.isArray(ready.data['engines']), 'ready carries the engines').toBe(true)

    // a second connect is never adopted
    await page.evaluate((b) => (window as unknown as { __connect(b: string): number }).__connect(b), String(hello.data['build']))
    await page.waitForTimeout(1500)
    expect((await log(page)).filter((l) => l.via === 'port' && l.index === 1), 'a second connect was answered').toEqual([])

    const send = (m: unknown): Promise<void> => page.evaluate((x) => (window as unknown as { __ports: MessagePort[] }).__ports[0]?.postMessage(x), m)
    const errorFor = async (what: string, since: number, match: (e: Entry) => boolean): Promise<Entry> => {
      const l = await waitFor(page, what, (all) => all.slice(since).some(match), 10_000)
      return l.slice(since).find(match) as Entry
    }
    const mark = async (): Promise<number> => (await log(page)).length

    // the size caps of section 5.6, on runs the page builds itself, for an engine `ready` listed at the version it listed. The
    // message cap is probed on an engine that is not a text engine where ready lists one, so that a host capping only a text
    // engine's input still has to refuse the message by the 16 MiB cap; the input cap is probed on a text engine
    const listed = (ready.data['engines'] as { engine?: unknown; version?: unknown }[]).filter((e) => typeof e.engine === 'string')
    const textEngine = listed.find((e) => e.engine === 'z3') ?? listed.find((e) => TEXT_ENGINES.has(String(e.engine)))
    const anyEngine = listed.find((e) => !TEXT_ENGINES.has(String(e.engine))) ?? textEngine ?? listed[0]
    const oversize = async (what: string, id: string, chars: number, engine: { engine?: unknown; version?: unknown } | undefined): Promise<void> => {
      const since = await mark()
      await page.evaluate(
        ({ id, chars, engine, version }) => {
          const req = { engine, version, input: 'x'.repeat(chars), budget: { wallMs: 1000 } }
          ;(window as unknown as { __ports: MessagePort[] }).__ports[0]?.postMessage({ t: 'run', id, req })
        },
        { id, chars, engine: String(engine?.engine ?? 'z3'), version: String(engine?.version ?? '') },
      )
      const answer = await errorFor(`an answer to ${what}`, since, (e) => e.via === 'port' && ((e.data['t'] === 'error' && (e.data['id'] === id || e.data['id'] === undefined)) || (e.data['t'] === 'result' && e.data['id'] === id)))
      expect(answer.data['t'], `the host ran ${what} instead of refusing it (section 5.6 caps it; error too-large)`).toBe('error')
      expect(answer.data['code'], `${what} is refused as too-large (sections 5.4 and 5.6)`).toBe('too-large')
    }
    await oversize('a run message over 16 MiB', '00112233445566778899aabbccddeeff', 16 * 1024 * 1024 + 1, anyEngine)
    if (textEngine) await oversize(`a ${String(textEngine.engine)} run whose input is over 256 KiB`, '0f1e2d3c4b5a69788796a5b4c3d2e1f0', 256 * 1024 + 1, textEngine)
    else test.info().annotations.push({ type: 'measured', description: 'ready listed no text engine, so the 256 KiB run.input cap was not probed' })

    let since = await mark()
    await page.evaluate(() => (window as unknown as { __ports: MessagePort[] }).__ports[0]?.postMessage('not an object'))
    const notObject = await errorFor('bad-message for a message that is not an object', since, (e) => e.via === 'port' && e.data['t'] === 'error')
    expect(notObject.data['code'], 'a message is an object').toBe('bad-message')

    since = await mark()
    await send({ t: 'run', id: '0123456789abcdef0123456789abcdef' })
    const bad = await errorFor('bad-message for a run with no request', since, (e) => e.via === 'port' && e.data['t'] === 'error')
    expect(bad.data['code']).toBe('bad-message')

    since = await mark()
    await page.evaluate(() => (window as unknown as { __ports: MessagePort[] }).__ports[0]?.postMessage(JSON.parse('{"t":"caps","__proto__":{"x":1},"constructor":1}')))
    const proto = await errorFor('bad-message for prototype keys', since, (e) => e.via === 'port' && e.data['t'] === 'error')
    expect(proto.data['code']).toBe('bad-message')

    since = await mark()
    await send({ t: 'run', id: 'fedcba9876543210fedcba9876543210', req: { engine: 'no-such-engine', version: '1', input: '', budget: { wallMs: 1000 } } })
    const unknown = await errorFor('unknown-engine', since, (e) => e.via === 'port' && e.data['t'] === 'error' && e.data['id'] === 'fedcba9876543210fedcba9876543210')
    expect(unknown.data['code'], 'a request for an engine the build does not have').toBe('unknown-engine')
  } finally {
    world.site.override('/__gate/embed.html', null)
    await context.close()
  }
})

test("[handshake.caps] ready reports each engine's first load, and for z3 it is the build manifest's figure", async ({ browser, world, gate }) => {
  enforce(gate, 'handshake.caps')
  expect(world.manifest, world.manifestProblem ?? 'no engine manifest').not.toBeNull()
  world.site.override('/__gate/embed.html', EMBEDDER, 'text/html; charset=utf-8')
  const { context, page } = await newPage(browser)
  try {
    await page.goto(embedderUrl(world.siteOrigin, '/__gate/embed.html', world), { waitUntil: 'load' })
    const hello = (await waitFor(page, 'hello', (l) => l.some((e) => e.via === 'window' && e.data['t'] === 'hello'), 12_000)).find((e) => e.via === 'window') as Entry
    await page.evaluate((b) => (window as unknown as { __connect(b: string): number }).__connect(b), String(hello.data['build']))
    const ready = (await waitFor(page, 'ready', (l) => l.some((e) => e.via === 'port' && e.data['t'] === 'ready'))).find((e) => e.via === 'port') as Entry
    const engines = ready.data['engines'] as { engine: string; firstLoadBytes: number }[]
    for (const e of engines) expect(typeof e.firstLoadBytes, `${e.engine}: firstLoadBytes`).toBe('number')
    const z3 = engines.find((e) => e.engine === 'z3')
    const figure = world.manifest?.engines.get('z3')?.firstLoadBytes
    if (figure !== undefined) {
      expect(z3, 'ready lists z3').toBeDefined()
      expect(z3?.firstLoadBytes, "caps.firstLoadBytes is the manifest's figure").toBe(figure)
    }
  } finally {
    world.site.override('/__gate/embed.html', null)
    await context.close()
  }
})

test('[handshake.toplevel] the host opened at the top level shows a notice and talks to nobody', async ({ browser, world, gate }) => {
  enforce(gate, 'handshake.toplevel')
  expect(world.hostUrl, 'the instruments build has no host.html').not.toBeNull()
  const { context, page } = await newPage(browser)
  try {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    await page.addInitScript(() => {
      ;(window as unknown as { __sent: unknown[] }).__sent = []
      window.addEventListener('message', (e) => (window as unknown as { __sent: unknown[] }).__sent.push(e.data))
    })
    await page.goto(world.hostUrl ?? '', { waitUntil: 'load' })
    await page.waitForTimeout(800)
    expect((await page.locator('body').innerText()).trim().length, 'a notice on the page').toBeGreaterThan(0)
    expect(errors).toEqual([])
    expect(await page.evaluate(() => (window as unknown as { __sent: unknown[] }).__sent)).toEqual([])
  } finally {
    await context.close()
  }
})
