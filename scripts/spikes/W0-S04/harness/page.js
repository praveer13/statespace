// W0-S04 page runner. Playwright calls window.w0s04(plan) and reads the result.
// A main-thread heartbeat (setInterval, 10 ms) measures how long the page is
// blocked while a job runs, on the main thread or in a worker.
(function () {
  'use strict';
  const statusEl = document.getElementById('status');
  let mainReady = null;

  function heartbeat() {
    let last = performance.now();
    let maxGap = 0;
    const h = setInterval(() => {
      const t = performance.now();
      if (t - last > maxGap) maxGap = t - last;
      last = t;
    }, 10);
    return () => {
      clearInterval(h);
      const t = performance.now();
      if (t - last > maxGap) maxGap = t - last;
      return maxGap;
    };
  }
  const tick = () => new Promise((r) => setTimeout(r, 20));

  async function loadJob(id) {
    const res = await fetch('/jobs/' + id + '.json');
    return res.json();
  }

  async function runMain(ids, opts) {
    const out = [];
    if (!mainReady) mainReady = W0S04.initParser({ languageUrl: '/spectacle/js/tree-sitter-tlaplus.wasm', locateFile: (f) => '/spectacle/js/' + f });
    const boot = await mainReady;
    for (const id of ids) {
      const job = await loadJob(id);
      statusEl.textContent = 'main ' + id;
      await tick();
      const stop = heartbeat();
      const t0 = performance.now();
      const r = await W0S04.runJob(job, opts);
      r.wallMs = performance.now() - t0;
      await tick();
      r.mainThreadMaxGapMs = stop();
      out.push(r);
    }
    return { parserInitMs: boot.ms, results: out };
  }

  function newWorker() {
    const w = new Worker('/harness/worker.js');
    const pending = [];
    w.onmessage = (e) => { const p = pending.shift(); if (p) p.resolve(e.data); };
    w.onerror = (e) => { const p = pending.shift(); if (p) p.resolve({ type: 'error', error: 'worker error: ' + (e.message || e.type) }); };
    const send = (msg) => new Promise((resolve) => { pending.push({ resolve }); w.postMessage(msg); });
    return { w, send };
  }

  async function runWorker(ids, opts) {
    const t0 = performance.now();
    const wk = newWorker();
    const ready = await wk.send({ type: 'init' });
    const startupMs = performance.now() - t0;
    const out = [];
    for (const id of ids) {
      const job = await loadJob(id);
      statusEl.textContent = 'worker ' + id;
      const stop = heartbeat();
      const msg = await wk.send({ type: 'job', job, opts });
      const gap = stop();
      const r = msg.type === 'result' ? msg.result : { id, ok: false, errors: [msg.error] };
      r.mainThreadMaxGapMs = gap;
      out.push(r);
    }
    wk.w.terminate();
    return { workerStartupMs: startupMs, parserInitMs: ready.ms, readyType: ready.type, readyError: ready.error, results: out };
  }

  // The watchdog: terminate a worker in the middle of a long job, then show
  // that a fresh worker runs the next job.
  async function watchdog(longId, shortId, afterMs) {
    const wk = newWorker();
    await wk.send({ type: 'init' });
    const job = await loadJob(longId);
    let settled = false;
    wk.send({ type: 'job', job, opts: { mode: 'fetch', skipGraph: true } }).then(() => { settled = true; });
    await new Promise((r) => setTimeout(r, afterMs));
    const t0 = performance.now();
    wk.w.terminate();
    const terminatedWhileRunning = !settled;
    const wk2 = newWorker();
    await wk2.send({ type: 'init' });
    const msg = await wk2.send({ type: 'job', job: await loadJob(shortId), opts: { mode: 'fetch', skipGraph: true } });
    wk2.w.terminate();
    return {
      longJob: longId, terminatedAfterMs: afterMs, terminatedWhileRunning,
      freshWorkerJob: shortId, freshWorkerOk: msg.type === 'result' && msg.result.ok,
      freshWorkerDistinct: msg.type === 'result' && msg.result.explore ? msg.result.explore.distinct : null,
      recoveryMs: performance.now() - t0
    };
  }

  async function fingerprint(nx, ny) {
    const wk = newWorker();
    await wk.send({ type: 'init' });
    const msg = await wk.send({ type: 'fingerprint', nx, ny });
    wk.w.terminate();
    return msg.result;
  }

  window.w0s04 = async function (step) {
    try {
      if (step.kind === 'main') return await runMain(step.ids, step.opts);
      if (step.kind === 'worker') return await runWorker(step.ids, step.opts);
      if (step.kind === 'watchdog') return await watchdog(step.longId, step.shortId, step.afterMs);
      if (step.kind === 'fingerprint') return await fingerprint(step.nx, step.ny);
      throw new Error('unknown step ' + step.kind);
    } catch (e) {
      return { error: String(e && e.stack ? e.stack : e) };
    }
  };
  statusEl.textContent = 'ready';
  window.w0s04Ready = true;
})();
