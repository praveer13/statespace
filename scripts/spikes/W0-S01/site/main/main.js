// W0-S01 main origin (stands in for https://<course-domain>/).
// Seeds stand-in learner data in every store the main origin owns, embeds the instrument frame
// as ARCHITECTURE.md section 5.3 shows, runs the origin-checked MessagePort handshake, and gives
// the Playwright harness a small promise API (window.__ss). Spike code, not product code.
'use strict';

const cfg = document.documentElement.dataset;
const INSTRUMENT_ORIGIN = cfg.instrumentOrigin; // build-time constant: exact scheme and host
const BUILD = cfg.build;
const SANDBOX = cfg.sandbox || '';
const log = [];
const note = (event, detail = {}) => log.push({ ms: Math.round(performance.now()), event, ...detail });
const token = crypto.randomUUID();

document.addEventListener('securitypolicyviolation', (e) => {
  note('csp-violation', { directive: e.violatedDirective, blocked: String(e.blockedURI).slice(0, 120) });
});

async function seedStorage() {
  localStorage.setItem('ss-evidence-marker', token);
  sessionStorage.setItem('ss-evidence-marker', token);
  await new Promise((resolve, reject) => {
    const req = indexedDB.open('statespace-evidence', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('events', { keyPath: 'id' });
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction('events', 'readwrite');
      tx.objectStore('events').put({ id: 1, kind: 'marker', token });
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => reject(tx.error);
    };
  });
  const c = await caches.open('main-shell');
  await c.put('/marker', new Response(token));
  // Two cookie probes: a host-only cookie, and a cookie scoped to the registrable domain.
  // The course itself sets no cookies; these exist only to map the boundary.
  document.cookie = `ss_host=${token}; Secure; SameSite=Strict; Path=/`;
  document.cookie = `ss_domain=${token}; Domain=${location.hostname}; Secure; SameSite=Lax; Path=/`;
  note('seeded');
}

let iframe = null;
let port = null;
let readySeen = false;
let ignoredWindowMessages = 0;
const pending = new Map();
let resolveReady;
const ready = new Promise((r) => { resolveReady = r; });

window.addEventListener('message', (e) => {
  // Accept exactly one hello: from the instrument origin, from our own frame, for our build.
  if (port || e.origin !== INSTRUMENT_ORIGIN || !iframe || e.source !== iframe.contentWindow) {
    ignoredWindowMessages++;
    return;
  }
  const d = e.data;
  if (!d || d.t !== 'hello' || d.bus !== 1 || d.build !== BUILD) { ignoredWindowMessages++; return; }
  note('hello', { origin: e.origin });
  const ch = new MessageChannel();
  port = ch.port1;
  port.onmessage = onPortMessage;
  iframe.contentWindow.postMessage({ t: 'connect', bus: 1, build: BUILD, nonce: crypto.randomUUID() },
    INSTRUMENT_ORIGIN, [ch.port2]);
  note('connect-sent');
});

function onPortMessage(e) {
  const d = e.data;
  if (d && d.t === 'ready' && !readySeen) {
    readySeen = true;
    note('ready');
    resolveReady({ ok: true, engines: d.engines });
    return;
  }
  if (d && typeof d.id === 'string' && pending.has(d.id)) {
    const p = pending.get(d.id);
    pending.delete(d.id);
    clearTimeout(p.timer);
    p.resolve(d);
    return;
  }
  note('dropped-port-message', { t: d && d.t });
}

function call(msg, timeoutMs = 120000) {
  const id = crypto.randomUUID();
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      resolve({ t: 'error', id, code: 'terminated', detail: 'main-side watchdog' });
    }, timeoutMs);
    pending.set(id, { resolve, timer });
    port.postMessage({ ...msg, id });
  });
}

// A second connect after the handshake must never be adopted (ARCHITECTURE.md section 5.3, step 5).
function secondConnect(waitMs = 2000) {
  return new Promise((resolve) => {
    const ch = new MessageChannel();
    let answered = null;
    ch.port1.onmessage = (e) => { answered = (e.data && e.data.t) || 'message'; };
    iframe.contentWindow.postMessage({ t: 'connect', bus: 1, build: BUILD, nonce: crypto.randomUUID() },
      INSTRUMENT_ORIGIN, [ch.port2]);
    setTimeout(() => resolve({ answeredOnSecondPort: answered }), waitMs);
  });
}

function embed() {
  iframe = document.createElement('iframe');
  iframe.src = `${INSTRUMENT_ORIGIN}/b/${BUILD}/host.html`;
  iframe.title = 'statespace instruments';
  iframe.hidden = true;
  iframe.referrerPolicy = 'no-referrer';
  if (SANDBOX) iframe.setAttribute('sandbox', SANDBOX);
  document.body.append(iframe);
  note('embedded', { src: iframe.src, sandbox: SANDBOX || null });
}

const seeded = seedStorage().then(embed, (err) => { note('seed-failed', { error: String(err) }); embed(); });

window.__ss = {
  config: cfg.config,
  instrumentOrigin: INSTRUMENT_ORIGIN,
  build: BUILD,
  token,
  log,
  seeded,
  ready,
  call,
  secondConnect,
  ignoredWindowMessages: () => ignoredWindowMessages,
  activation: () => (navigator.userActivation
    ? { isActive: navigator.userActivation.isActive, hasBeenActive: navigator.userActivation.hasBeenActive }
    : 'unsupported'),
};
