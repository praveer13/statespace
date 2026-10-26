// A small, complete world for GATE-bundle to run on: a site build and an instruments build, with the features the gate checks
// (Boot with a Z3 cell and the download loader, the importer, the bus host, the service worker), written to a directory as a
// mini repository, so the gate treats it like the real tree. The good world passes every check; each bad variant plants one fault
// that one check must catch. This is how the gate's checks are proven to bite, before the tasks that build the real features
// deliver them, and how they stay proven after.
//
// The pages follow the documents, not the other way round: the loader is DESIGN.md section 6.2's ("Downloading Z3 · <received>
// of <size>" on a determinate progress bar), the host is ARCHITECTURE.md sections 5.3 to 5.6's (hello, connect, ready, the 16 MiB
// cap on a message and the 256 KiB cap on a text engine's input, the error codes), the service worker is the vendored one, with a
// build object filled in.
//
// Each bad variant plants one fault, and where a check holds several rules each rule has a variant of its own, so that weakening
// any one rule makes some variant pass and the self-check fail.
//
//   good           every check passes
//   loader-size    the loader prints a size that is not the manifest's; the bar's maximum is right      loader.size
//   loader-max     the loader prints the manifest's size; the bar's maximum is not it                   loader.size
//   loader-progress-total  the host's progress messages carry a total 4.3 times the manifest's (decoded
//                  bytes), and the loader prints it once the download starts: right in the first frame,
//                  wrong in every later one                                                              loader.size
//   loader-visible the visible text rounds in MiB and labels it MB ("2.9 MB"), while aria-valuetext
//                  states the decimal figure ("3.0 MB"): right to a screen reader, wrong to the eye      loader.size
//   prompt         a size warning with a role of alert appears on the tap                                loader.noprompt
//   warning-word   on the tap: "Warning: this is a large download." (wording, no size)                  loader.noprompt
//   warning-static before the tap, beside the button: "Running it live fetches 3.0 MB." (a size, no
//                  wording), taken away on the tap, so only the page before the tap shows it             loader.noprompt
//   warning-size   with the loader, outside its box: "Z3: 3.0 MB." (a size, no wording)                  loader.noprompt
//   warning-toast  on the tap, a status toast appended to the body, outside <main>: "Heads up: Z3 is a
//                  3.0 MB download."                                                                     loader.noprompt
//   warning-banner before the tap, a line in the page's header, outside <main>: "Running Z3 live
//                  downloads 3.0 MB."                                                                    loader.noprompt
//   prompt-dialog  an alert() before the frame is made (no wording or size on the page)                  loader.noprompt
//   prompt-element a rendered role=dialog element on the tap (no wording or size in it)                  loader.noprompt
//   prompt-inline  the loader shows, and the download waits for a second tap on "Start the download"     loader.noprompt
//   lag            the page's main thread is busy while the engine downloads                             boot.responsive
//   slow-handshake the host answers `connect` with `ready` a second late                                 boot.handshake
//   render         the importer writes the file's text into the page as HTML                             import.fuzz
//   handshake      the host accepts any parent                                                           handshake.foreign
//   no-cap         the host has no 16 MiB message cap (it still caps a text engine's input), so it runs
//                  the 16 MiB message sent to its other engine                                           handshake.allowed
//   no-input-cap   the host caps messages at 16 MiB but not a text engine's input at 256 KiB             handshake.allowed
//   sw             the worker does not retire when a kill-switch build replaces it                       sw.kill
//   fragment       the page parses a fragment's payload                                                  fragment.canary
//   fragment-receipts  the page parses a fragment's payload on /receipts only                            fragment.canary
//   sandbox        the page's frame has no sandbox attribute (a source lint plants it too)              frame.sandbox
//   route-origin   /today loads an image from another origin, which its CSP allows, and nothing fails   route:/today
//   route-console  /today logs a console error                                                          route:/today
//   nodomain       the build was made without COURSE_DOMAIN, so it embeds no instrument frame           build.domain

import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { gzipSync } from 'node:zlib'
import { mulberry32 } from '../lib/fuzz.ts'

export type Variant =
  | 'good'
  | 'loader-size'
  | 'loader-max'
  | 'loader-progress-total'
  | 'loader-visible'
  | 'prompt'
  | 'warning-word'
  | 'warning-static'
  | 'warning-size'
  | 'warning-toast'
  | 'warning-banner'
  | 'prompt-dialog'
  | 'prompt-element'
  | 'prompt-inline'
  | 'lag'
  | 'slow-handshake'
  | 'render'
  | 'handshake'
  | 'no-cap'
  | 'no-input-cap'
  | 'sw'
  | 'fragment'
  | 'fragment-receipts'
  | 'sandbox'
  | 'route-origin'
  | 'route-console'
  | 'nodomain'
export const VARIANTS: readonly Variant[] = [
  'good',
  'loader-size',
  'loader-max',
  'loader-progress-total',
  'loader-visible',
  'prompt',
  'warning-word',
  'warning-static',
  'warning-size',
  'warning-toast',
  'warning-banner',
  'prompt-dialog',
  'prompt-element',
  'prompt-inline',
  'lag',
  'slow-handshake',
  'render',
  'handshake',
  'no-cap',
  'no-input-cap',
  'sw',
  'fragment',
  'fragment-receipts',
  'sandbox',
  'route-origin',
  'route-console',
  'nodomain',
]

/** The check ids each variant must fail among those RUN_ONLY runs, and nothing else may (the good world passes them all). */
export const EXPECTED_FAILURES: Record<Variant, string[]> = {
  good: [],
  'loader-size': ['loader.size'],
  'loader-max': ['loader.size'],
  'loader-progress-total': ['loader.size'],
  'loader-visible': ['loader.size'],
  prompt: ['loader.noprompt'],
  'warning-word': ['loader.noprompt'],
  'warning-static': ['loader.noprompt'],
  'warning-size': ['loader.noprompt'],
  'warning-toast': ['loader.noprompt'],
  'warning-banner': ['loader.noprompt'],
  'prompt-dialog': ['loader.noprompt'],
  'prompt-element': ['loader.noprompt'],
  'prompt-inline': ['loader.noprompt'],
  lag: ['boot.responsive'],
  'slow-handshake': ['boot.handshake'],
  render: ['import.fuzz'],
  handshake: ['handshake.foreign'],
  'no-cap': ['handshake.allowed'],
  'no-input-cap': ['handshake.allowed'],
  sw: ['sw.kill'],
  fragment: ['fragment.canary'],
  'fragment-receipts': ['fragment.canary'],
  sandbox: ['frame.sandbox'],
  'route-origin': ['route:/today'],
  'route-console': ['route:/today'],
  nodomain: ['build.domain'],
}

/** The checks to run on each variant: those that can see its fault. The control runs every check. */
export const RUN_ONLY: Record<Variant, string | null> = {
  good: null,
  'loader-size': 'loader.',
  'loader-max': 'loader.',
  'loader-progress-total': 'loader.',
  'loader-visible': 'loader.',
  prompt: 'loader.',
  'warning-word': 'loader.',
  'warning-static': 'loader.',
  'warning-size': 'loader.',
  'warning-toast': 'loader.',
  'warning-banner': 'loader.',
  'prompt-dialog': 'loader.',
  'prompt-element': 'loader.',
  'prompt-inline': 'loader.',
  lag: 'boot.responsive',
  'slow-handshake': 'boot.handshake',
  render: 'import.fuzz',
  handshake: 'handshake.',
  'no-cap': 'handshake.',
  'no-input-cap': 'handshake.',
  sw: 'sw.',
  fragment: 'fragment.canary',
  'fragment-receipts': 'fragment.canary',
  sandbox: 'frame.sandbox',
  'route-origin': 'route:',
  'route-console': 'route:',
  nodomain: 'build.,loader.size',
}

const DOMAIN = 'statespace-gate.test'
const ENGINE_BYTES = 3_000_000

export interface MadeWorld {
  root: string
  /** The manifest's first-load figure for the fixture engine. */
  firstLoadBytes: number
}

const write = (root: string, rel: string, body: string | Buffer): void => {
  const f = join(root, rel)
  mkdirSync(dirname(f), { recursive: true })
  writeFileSync(f, body)
}

const page = (title: string, body: string, attrs = '', frame = `https://instruments.${DOMAIN}`, img = "'self' data:", banner = ''): string => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self'; img-src ${img}; font-src 'self'; connect-src 'self'; frame-src ${frame}; worker-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <link rel="stylesheet" href="/assets/app.css" />
    <script type="module" src="/assets/app.js"></script>
  </head>
  <body ${attrs}>
    <a class="skip" href="#main">Skip to content</a>
    <header>
      <nav aria-label="Primary">
        <a href="/today">Today</a> <a href="/stages">Stages</a> <a href="/bench">Bench <small>laptop</small></a> <a href="/audit">Audit</a> <a href="/claims">Claims</a> <a href="/search">Search</a>
      </nav>${banner}
    </header>
    <main id="main">
      <h1>${title}</h1>
${body}
    </main>
  </body>
</html>
`

const CSS = `body { margin: 0; font: 17px/1.6 system-ui, sans-serif; color: #1b1b1b; background: #fafaf7; }
a { color: #14507a; text-decoration: underline; }
.skip { position: absolute; left: -999px; } .skip:focus { left: 8px; top: 8px; background: #fff; padding: 8px; }
header, main { padding: 12px 16px; max-width: 680px; }
nav a { margin-right: 10px; }
progress { width: 100%; }
pre { overflow: auto; }
`

function siteScript(v: Variant, firstLoadBytes: number): string {
  return `// the fixture site's one script: the service worker, the Boot cell with its loader, and the importer
const INSTRUMENT_ORIGIN = 'https://instruments.${DOMAIN}';
const HOST = INSTRUMENT_ORIGIN + '/b/fixture/host.html';
const VARIANT = ${JSON.stringify(v)};
const page = document.body.dataset.page || '';

// ---- service worker, and the recovery link
if ('serviceWorker' in navigator) {
  const params = new URLSearchParams(location.search);
  if (params.get('nosw') === '1') {
    navigator.serviceWorker.getRegistrations().then(async (regs) => {
      for (const r of regs) { r.active && r.active.postMessage({ t: 'kill' }); await r.unregister(); }
      for (const k of await caches.keys()) await caches.delete(k);
    });
  } else {
    window.addEventListener('load', () => setTimeout(() => navigator.serviceWorker.register('/sw.js').catch(() => {}), 200));
  }
}

// ---- the route faults, written only into their own variant: a request from /today to another origin (the same host by another
// name), which its page's CSP allows and which succeeds; and a console error on /today
${v === 'route-origin' ? "if (location.pathname.replace(/\\/+$/, '') === '/today') { const img = new Image(); img.alt = ''; img.src = 'http://localhost:' + location.port + '/assets/pixel.svg'; document.querySelector('main').append(img); }" : ''}
${v === 'route-console' ? "if (location.pathname.replace(/\\/+$/, '') === '/today') console.error('the fixture logs an error on /today');" : ''}

// ---- the fragment names a receipt: it is looked up, never parsed (the bad variants parse it, everywhere or on /receipts only)
if (location.hash.length > 1) {
  const parses = VARIANT === 'fragment' || (VARIANT === 'fragment-receipts' && location.pathname.startsWith('/receipts'));
  if (parses) { try { JSON.parse(atob(location.hash.slice(1).replace(/-/g, '+').replace(/_/g, '/'))); } catch {} }
  else { const id = location.hash.slice(1); document.documentElement.dataset.fragmentLength = String(id.length); }
}

// ---- the importer
const fileInput = document.getElementById('receipt-file');
if (fileInput) {
  const out = document.getElementById('import-result');
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;
    const text = await file.text();
    let shown;
    try { shown = JSON.stringify(JSON.parse(text), null, 2).slice(0, 4000); } catch (e) { shown = 'not JSON: ' + text.slice(0, 2000); }
    if (VARIANT === 'render') out.innerHTML = '<pre>' + shown + '</pre>';
    else { const pre = document.createElement('pre'); pre.textContent = shown; out.replaceChildren(pre); }
  });
}

// ---- Boot's Z3 cell
const run = document.getElementById('run-live');
if (page === 'boot' && run) {
  const status = document.getElementById('cell-status');
  // loader-visible rounds the visible figure in MiB and labels it MB; aria-valuetext keeps the decimal figure
  const MB = (n) => (n / ${v === 'loader-visible' ? 1048576 : 1e6}).toFixed(1) + ' MB';
  const decimalMB = (n) => (n / 1e6).toFixed(1) + ' MB';
  run.addEventListener('click', () => {
    run.disabled = true;
    ${v === 'prompt' ? "status.insertAdjacentHTML('beforeend', '<p role=\"alert\">This will download about 3.0 MB over your connection.</p>');" : ''}
    ${v === 'warning-word' ? "status.insertAdjacentHTML('beforeend', '<p>Warning: this is a large download.</p>');" : ''}
    ${v === 'warning-static' ? "document.getElementById('size-note').remove();" : ''}
    ${v === 'prompt-dialog' ? "window.alert('Z3 is about to download.');" : ''}
    ${v === 'prompt-element' ? "status.insertAdjacentHTML('beforeend', '<div role=\"dialog\" aria-label=\"Z3\"><p>Starting Z3.</p></div>');" : ''}
    ${v === 'warning-toast' ? "document.body.insertAdjacentHTML('beforeend', '<div role=\"status\">Heads up: Z3 is a 3.0 MB download.</div>');" : ''}
    const frame = document.createElement('iframe');
    ${v === 'sandbox' ? '' : "frame.setAttribute('sandbox', 'allow-scripts allow-same-origin');"}
    frame.setAttribute('referrerpolicy', 'no-referrer');
    frame.title = 'statespace instruments';
    frame.hidden = true;
    frame.setAttribute('src', HOST);
    const channel = new MessageChannel();
    const id = 'a0b1c2d3e4f50617a0b1c2d3e4f50617';
    let build = '';
    window.addEventListener('message', (e) => {
      if (e.origin !== INSTRUMENT_ORIGIN || e.source !== frame.contentWindow) return;
      if (e.data && e.data.t === 'hello' && e.data.bus === 1) {
        build = e.data.build;
        frame.contentWindow.postMessage({ t: 'connect', bus: 1, build, nonce: 'n' + Math.random().toString(36).slice(2) }, INSTRUMENT_ORIGIN, [channel.port2]);
      }
    });
    let bar = null;
    channel.port1.onmessage = (e) => {
      const m = e.data;
      if (m.t === 'ready') {
        const total = m.engines.find((x) => x.engine === 'z3').firstLoadBytes;
        const shownTotal = ${v === 'loader-size' ? 'total + 150000' : 'total'};
        bar = document.createElement('progress');
        bar.max = ${v === 'loader-max' ? 'total + 150000' : 'total'}; bar.value = 0; bar.setAttribute('aria-label', 'Downloading Z3');
        const label = document.createElement('p');
        label.id = 'loader-text'; label.textContent = 'Downloading Z3 · 0 B of ' + MB(shownTotal);
        status.append(bar, label);
        bar.dataset.total = String(shownTotal);
        ${v === 'loader-visible' ? "bar.setAttribute('aria-valuetext', 'Downloading Z3 · 0 B of ' + decimalMB(shownTotal));" : ''}
        ${v === 'warning-size' ? "document.querySelector('main').prepend(Object.assign(document.createElement('p'), { textContent: 'Z3: 3.0 MB.' }));" : ''}
        const go = () => channel.port1.postMessage({ t: 'run', id, req: { engine: 'z3', version: '5.3.1', input: '(check-sat)', budget: { wallMs: 10000, rlimit: 1000000 } } });
        ${v === 'prompt-inline' ? "const again = Object.assign(document.createElement('button'), { type: 'button', textContent: 'Start the download' }); again.addEventListener('click', go); status.append(again);" : 'go();'}
      } else if (m.t === 'progress' && bar) {
        bar.value = m.loaded;
        ${v === 'loader-progress-total' ? 'bar.dataset.total = String(m.total);' : ''}
        ${v === 'loader-visible' ? "bar.setAttribute('aria-valuetext', 'Downloading Z3 · ' + decimalMB(m.loaded) + ' of ' + decimalMB(Number(bar.dataset.total)));" : ''}
        document.getElementById('loader-text').textContent = 'Downloading Z3 · ' + MB(m.loaded) + ' of ' + MB(Number(bar.dataset.total));
        ${v === 'lag' ? "if (!window.__hogged) { window.__hogged = true; const t = performance.now(); while (performance.now() < t + 700) { /* the main thread is busy */ } }" : ''}
      } else if (m.t === 'result') {
        const p = document.createElement('p');
        p.innerHTML = 'Z3 returned ' + m.reply.verdict + '. <span class="badge">re-checked here</span>';
        status.append(p);
      } else if (m.t === 'error') {
        status.append(Object.assign(document.createElement('p'), { textContent: 'Error: ' + m.code }));
      }
    };
    document.body.append(frame);
  });
}
void ${firstLoadBytes};
`
}

function hostScript(v: Variant, firstLoadBytes: number): string {
  return `// the fixture instrument host: the handshake and limits of ARCHITECTURE.md sections 5.3 to 5.6
const BUILD = 'fixture';
const ALLOWED_PARENTS = ${v === 'handshake' ? "['*']" : `['https://${DOMAIN}']`};
const CAP = 16 * 1024 * 1024; // any message on the port
const INPUT_CAP = 256 * 1024; // run.input for a text engine
const TEXT_ENGINES = ['z3'];
const MESSAGE_CAPPED = ${v !== 'no-cap'};
const INPUT_CAPPED = ${v !== 'no-input-cap'};
const FIRST_LOAD = ${firstLoadBytes};
// the total each progress message carries: the manifest's figure (loader-progress-total: a decoded size, 4.3 times it)
const PROGRESS_TOTAL = ${v === 'loader-progress-total' ? 'Math.round(FIRST_LOAD * 4.3)' : 'FIRST_LOAD'};
const ENGINE = '/b/fixture/engines/z3/engine.wasm';
// z3, and a pure-pool engine that parses outside bytes (section 5.4's receipt), which downloads nothing
const ENGINES = [{ engine: 'z3', version: '5.3.1', cached: false, firstLoadBytes: FIRST_LOAD }, { engine: 'receipt', version: '1', cached: true, firstLoadBytes: 0 }];
const status = document.getElementById('status');
if (window.parent === window) {
  status.textContent = 'This page is the instrument host. Opened at the top level, it does nothing.';
} else {
  status.textContent = 'Instrument host.';
  for (const o of ALLOWED_PARENTS) window.parent.postMessage({ t: 'hello', bus: 1, build: BUILD }, o);
  let port = null;
  window.addEventListener('message', (e) => {
    if (e.source !== window.parent) return;
    if (!ALLOWED_PARENTS.includes('*') && !ALLOWED_PARENTS.includes(e.origin)) return;
    const m = e.data;
    if (!m || m.t !== 'connect' || m.bus !== 1 || typeof m.build !== 'string' || typeof m.nonce !== 'string') return;
    if (port || e.ports.length !== 1) return;
    port = e.ports[0];
    port.onmessage = onPort;
    ${v === 'slow-handshake' ? "setTimeout(() => port.postMessage({ t: 'ready', engines: ENGINES }), 1000);" : "port.postMessage({ t: 'ready', engines: ENGINES });"}
  });
  const fail = (id, code, detail) => port.postMessage({ t: 'error', ...(id ? { id } : {}), code, detail });
  const HEX32 = /^[0-9a-f]{32}$/;
  async function onPort(ev) {
    const d = ev.data;
    if (typeof d === 'string') return fail(undefined, MESSAGE_CAPPED && d.length > CAP ? 'too-large' : 'bad-message', 'a message is an object');
    if (!d || typeof d !== 'object' || Array.isArray(d) || typeof d.t !== 'string') return fail(undefined, 'bad-message', 'not a message');
    if (MESSAGE_CAPPED) {
      let size = Infinity;
      try { size = JSON.stringify(d).length; } catch {}
      if (size > CAP) return fail(typeof d.id === 'string' ? d.id : undefined, 'too-large', 'a message is at most 16 MiB');
    }
    for (const k of Object.keys(d)) if (k === '__proto__' || k === 'prototype' || k === 'constructor') return fail(undefined, 'bad-message', 'a forbidden key');
    if (d.t === 'caps') return port.postMessage({ t: 'ready', engines: ENGINES });
    if (d.t !== 'run' && d.t !== 'warm') return fail(undefined, 'bad-message', 'an unknown message');
    if (d.t === 'run') {
      if (typeof d.id !== 'string' || !HEX32.test(d.id) || !d.req || typeof d.req !== 'object') return fail(typeof d.id === 'string' ? d.id : undefined, 'bad-message', 'a run needs an id and a request');
      if (INPUT_CAPPED && TEXT_ENGINES.includes(d.req.engine) && typeof d.req.input === 'string' && d.req.input.length > INPUT_CAP) return fail(d.id, 'too-large', 'a text engine takes at most 256 KiB of input');
      if (!ENGINES.some((x) => x.engine === d.req.engine)) return fail(d.id, 'unknown-engine', 'no such engine');
      const cache = await caches.open('ss-engines-v1');
      let res = await cache.match(ENGINE);
      let loaded = 0;
      if (!res) {
        const net = await fetch(ENGINE);
        const reader = net.body.getReader();
        const parts = [];
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          parts.push(value); loaded += value.length;
          port.postMessage({ t: 'progress', id: d.id, phase: 'download', loaded: Math.min(loaded, FIRST_LOAD), total: PROGRESS_TOTAL });
        }
        port.postMessage({ t: 'progress', id: d.id, phase: 'download', loaded: FIRST_LOAD, total: PROGRESS_TOTAL });
        await cache.put(ENGINE, new Response(new Blob(parts)));
      }
      await new Promise((r) => setTimeout(r, 150));
      port.postMessage({ t: 'result', id: d.id, reply: { verdict: 'unsat', stats: { ms: 150 }, provenance: { engine: 'z3', version: '5.3.1', build: BUILD, budget: d.req.budget } } });
    }
  }
}
`
}

const swSource = (broken: boolean): string => {
  let src = readFileSync(join(import.meta.dirname, '../../../../vendor/kernelspace/public/sw.js'), 'utf8')
  if (broken) src = src.replace('await self.registration.unregister()', '/* the fixture: this worker does not unregister */')
  return src
}

export function makeWorld(root: string, variant: Variant): MadeWorld {
  // ---- the engine and its manifest
  const rand = mulberry32(0xe961e)
  const engine = Buffer.alloc(ENGINE_BYTES)
  for (let i = 0; i < engine.length; i += 4) engine.writeUInt32LE(Math.floor(rand() * 4294967296) >>> 0, i)
  const wire = gzipSync(engine, { level: 5 }).length
  const manifest = {
    build: 'fixture',
    engines: {
      z3: {
        version: '5.3.1',
        firstLoadBytes: wire,
        assets: [{ path: '/b/fixture/engines/z3/engine.wasm', sha256: createHash('sha256').update(engine).digest('hex'), bytes: engine.length, wire }],
      },
    },
  }

  // ---- the instruments build
  const I = 'apps/instruments/dist'
  write(root, `${I}/b/fixture/host.html`, `<!doctype html>
<html lang="en"><head><meta charset="UTF-8" />
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; connect-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'" />
<meta name="viewport" content="width=device-width, initial-scale=1" /><title>statespace instrument host</title>
<script type="module" src="/b/fixture/host.js"></script></head>
<body><main><h1>Instrument host</h1><p id="status">Loading.</p></main></body></html>
`)
  write(root, `${I}/b/fixture/host.js`, hostScript(variant, wire))
  write(root, `${I}/b/fixture/instrument.html`, `<!doctype html>
<html lang="en"><head><meta charset="UTF-8" />
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'" />
<meta name="viewport" content="width=device-width, initial-scale=1" /><title>statespace instrument page</title>
<script type="module" src="/b/fixture/instrument.js"></script></head>
<body data-page="instrument"><main><h1>Instrument page</h1>
<label>Receipt file <input type="file" id="receipt-file" accept="application/json" /></label>
<div id="import-result" aria-live="polite"></div></main></body></html>
`)
  write(root, `${I}/b/fixture/instrument.js`, siteScript(variant === 'render' ? 'render' : 'good', wire).replace("const page = document.body.dataset.page || '';", "const page = 'instrument';"))
  write(root, `${I}/b/fixture/manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`)
  write(root, `${I}/b/fixture/engines/z3/engine.wasm`, engine)
  write(root, `${I}/.vite/manifest.json`, JSON.stringify({ 'host.html': { file: 'b/fixture/host.js', src: 'host.html', isEntry: true } }))

  // ---- the site build
  const S = 'apps/site/dist'
  const routes: [string, string, string, string][] = [
    ['', 'statespace', '<p>The home page of the fixture site.</p>', ''],
    ['today', 'Today', '<p>Today.</p>', ''],
    ['stages', 'Stages', '<p>Stages.</p>', ''],
    ['bench', 'Bench', '<p>The Bench. <label>Receipt file <input type="file" id="receipt-file" accept="application/json" /></label></p><div id="import-result" aria-live="polite"></div>', ''],
    ['audit', 'Audit', '<p>Audit.</p>', ''],
    ['claims', 'Claims', '<p>Claims.</p>', ''],
    ['search', 'Search', '<p><label>Search <input type="search" /></label></p>', ''],
    ['receipts', 'Receipts', '<p>Receipts. <label>Receipt file <input type="file" id="receipt-file" accept="application/json" /></label></p><div id="import-result" aria-live="polite"></div>', ''],
    [
      'boot',
      'Start here',
      `<section><h2>The agent's claim</h2><p>UNREVIEWED: "safe, 200 tests green"</p></section>
      <fieldset><legend>Call it: safe for the sender?</legend>
        <label><input type="radio" name="call" value="a" /> safe</label>
        <label><input type="radio" name="call" value="b" /> not safe</label>
        <label><input type="radio" name="call" value="c" /> can't tell</label>
      </fieldset>
      <section id="cell"><h2>Z3</h2>
        <p>Recorded result · RUN-z3-boot-variant · Z3 5.3.1</p>
        <pre>Z3 returned sat (recorded).</pre>
        ${variant === 'warning-static' ? '<p id="size-note">Running it live fetches 3.0 MB.</p>' : ''}
        <button type="button" id="run-live">Run it live in this tab</button>
        <div id="cell-status" aria-live="polite"></div>
      </section>`,
      'data-page="boot"',
    ],
  ]
  for (const [path, title, body, attrs] of routes) {
    // route-origin's /today allows the other origin's image in its CSP, so the request is made and succeeds
    const img = variant === 'route-origin' && path === 'today' ? "'self' data: http://localhost:*" : undefined
    const banner = variant === 'warning-banner' && path === 'boot' ? '\n      <p>Running Z3 live downloads 3.0 MB.</p>' : ''
    write(root, `${S}/${path === '' ? '' : `${path}/`}index.html`, page(title, body, attrs || `data-page="${path || 'home'}"`, variant === 'nodomain' ? "'none'" : undefined, img, banner))
  }
  write(root, `${S}/assets/pixel.svg`, '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><rect width="1" height="1" fill="#fff"/></svg>\n')
  write(root, `${S}/404.html`, page('Not found', '<p>There is nothing at this address.</p>', '', variant === 'nodomain' ? "'none'" : undefined))
  write(root, `${S}/assets/app.css`, CSS)
  write(root, `${S}/assets/app.js`, siteScript(variant, wire))
  write(root, `${S}/.vite/manifest.json`, JSON.stringify({ 'index.html': { file: 'assets/app.js', src: 'index.html', isEntry: true, css: ['assets/app.css'] } }))
  const precache = ['index.html', 'today/index.html', 'boot/index.html', 'assets/app.js', 'assets/app.css']
  const sw = swSource(variant === 'sw').replace('/*__SW_BUILD__*/ null', JSON.stringify({ id: 'fixture1', schema: 1, shell: 'index.html', precache }))
  write(root, `${S}/sw.js`, sw)

  // ---- the sources the gate looks at to tell what has been delivered, and the site's entry as the budget checks read it: the
  // world's site is one script, so its router imports every screen eagerly and each screen is all in the entry chunk
  write(root, 'apps/site/index.html', '<!doctype html>\n<html lang="en"><head><meta charset="UTF-8" /><title>statespace</title></head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>\n')
  write(root, 'apps/site/src/main.tsx', "import { screens } from './app/router.tsx'\nconsole.info(Object.keys(screens).length)\n")
  write(root, 'apps/site/src/app/router.tsx', "export const screens = import.meta.glob('../screens/*/route.tsx', { eager: true })\n")
  const marker = (rel: string, text: string): void => write(root, rel, `// a marker: ${text}\nexport {}\n`)
  for (const screen of ['stages', 'today', 'bench', 'audit', 'claims', 'search', 'boot', 'receipt', 'lesson']) marker(`apps/site/src/screens/${screen}/route.tsx`, `the ${screen} screen`)
  marker('apps/site/src/sw/register.ts', 'the service worker')
  marker('apps/site/src/consent/loader.tsx', 'the download loader')
  marker('apps/instruments/src/engines/receipt/index.ts', 'receipt import')
  marker('packages/bus/src/index.ts', 'the bus')
  write(root, 'runs/RUN-phone-pyodide/budget.json', readFileSync(join(import.meta.dirname, '../../../../runs/RUN-phone-pyodide/budget.json')))
  return { root, firstLoadBytes: wire }
}
