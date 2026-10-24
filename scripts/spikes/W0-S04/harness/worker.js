// W0-S04 harness worker: a classic dedicated worker on the instrument origin.
// It loads Spectacle's scripts with importScripts, then the driver, and runs
// one job per message.
importScripts(
  '/spectacle/js/lib/lodash.min.js',
  '/spectacle/js/hash-sum/hash-sum.js',
  '/spectacle/js/tree-sitter.js',
  '/spectacle/js/eval.js'
);
var enableEvalTracing = false;
var parser;
importScripts('/harness/driver.js');

let ready = null;
onmessage = async (e) => {
  const msg = e.data;
  try {
    if (msg.type === 'init') {
      const t0 = performance.now();
      ready = ready || W0S04.initParser({
        languageUrl: '/spectacle/js/tree-sitter-tlaplus.wasm',
        locateFile: (f) => '/spectacle/js/' + f
      });
      await ready;
      postMessage({ type: 'ready', ms: performance.now() - t0 });
    } else if (msg.type === 'job') {
      await ready;
      const t0 = performance.now();
      const r = await W0S04.runJob(msg.job, msg.opts);
      r.wallMs = performance.now() - t0;
      postMessage({ type: 'result', result: r });
    } else if (msg.type === 'fingerprint') {
      postMessage({ type: 'fingerprint', result: W0S04.fingerprintProbe(msg.nx, msg.ny) });
    }
  } catch (err) {
    postMessage({ type: 'error', error: String(err && err.stack ? err.stack : err) });
  }
};
