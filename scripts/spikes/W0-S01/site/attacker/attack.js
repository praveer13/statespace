// W0-S01 negative test: a page on an unrelated site frames the instrument host twice (once with
// the default referrer policy, once with referrerpolicy="no-referrer", which masks
// location.ancestorOrigins in some engines), listens for a hello, and sends each frame a forged
// connect carrying a MessagePort. The host must never answer on either port.
'use strict';

const HOST = '__INSTRUMENT_ORIGIN__/b/__BUILD__/host.html';
const results = { helloReceived: [], answeredOnForgedPort: {} };

window.addEventListener('message', (e) => {
  results.helloReceived.push({ origin: e.origin, t: e.data && e.data.t });
});

let pending = 0;
for (const [name, policy] of [['plain', ''], ['noReferrer', 'no-referrer']]) {
  pending++;
  const frame = document.createElement('iframe');
  frame.name = name;
  frame.title = `framed instrument host (${name})`;
  if (policy) frame.referrerPolicy = policy;
  frame.src = HOST;
  results.answeredOnForgedPort[name] = null;
  frame.addEventListener('load', () => {
    const ch = new MessageChannel();
    ch.port1.onmessage = (e) => { results.answeredOnForgedPort[name] = (e.data && e.data.t) || 'message'; };
    frame.contentWindow.postMessage({ t: 'connect', bus: 1, build: '__BUILD__', nonce: 'forged' }, '*', [ch.port2]);
    setTimeout(() => { if (--pending === 0) window.__attack = results; }, 3000);
  });
  document.body.append(frame);
}
