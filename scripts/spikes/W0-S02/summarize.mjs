// W0-S02: reduce raw sessions (harness records, and device reports from the phone page) to the figures
// the run record and the budget derivation use. Dependency-free; imported by record.mjs and derive-budget.mjs.
//
// A record is {label, engine, tier, session, memory?, requests?, env?}: the harness writes these, and the
// phone page's sessions are wrapped into the same shape by wrapDeviceSession. Everything here is arithmetic
// on recorded values; nothing is estimated.

export const median = (a) => {
  const b = a.filter((v) => v != null && !Number.isNaN(v)).sort((x, y) => x - y);
  if (!b.length) return null;
  const m = b.length >> 1;
  return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2;
};
export const round1 = (v) => (v == null ? null : Math.round(v * 10) / 10);
export const stat = (values) => {
  const v = values.filter((x) => x != null && !Number.isNaN(x));
  return v.length ? { n: v.length, median: round1(median(v)), min: round1(Math.min(...v)), max: round1(Math.max(...v)), values: v.map(round1) } : null;
};
const sub = (a, b) => (a == null || b == null ? null : a - b);

// The sessions of a device report, in the harness's record shape.
export function wrapDeviceSession(s, device) {
  return { label: `session-${s.n}`, engine: device.id, tier: 'device', device, session: s };
}

export function metrics(rec) {
  const s = rec.session || {};
  const ph = (s.init && s.init.phases) || {};
  const m = s.marks || {};
  const fill = s.fill && s.fill.files ? s.fill : null;
  const files = fill ? fill.files : [];
  const observedWire = files.length ? files.reduce((n, f) => n + ((f.resource_timing && f.resource_timing.encoded) || f.content_length || 0), 0) : null;
  const ladder = {};
  for (const r of s.rlimit_ladder || []) ladder[`${r.case}:${r.rlimit}`] = { solve_ms: r.solve_ms, verdict: r.verdict, reason: r.reason };
  const sample = (name) => (rec.memory && rec.memory.samples ? rec.memory.samples.find((x) => x.name === name) : null);
  const mem = (name, key) => (sample(name) ? sample(name)[key] : null);
  const cache = s.frame_at_start && s.frame_at_start.caches ? s.frame_at_start.caches['ss-engines-v1'] : null;
  const initFetches = ph.fetches || [];
  const instRequests = rec.requests && rec.requests.by_site ? rec.requests.by_site.instruments : null;
  return {
    label: rec.label, engine: rec.engine, tier: rec.tier, kind: s.kind || null, ok: s.starter_ok === true, error: rec.error || s.errors || null,
    interrupted: !!(s.interrupted && !s.finished_at),
    hidden: !!(s.visibility && (s.visibility.hidden_at_start || s.visibility.hidden_events > 0 || s.visibility.hidden_ms > 0)),
    cpu_end_js_ms: s.cpu_end ? s.cpu_end.js_median_ms : null,
    lag: s.main_thread ? s.main_thread.phases : null,
    harness_pause_ms: s.harness_pause_ms ?? null,
    handshake_ms: s.handshake ? s.handshake.embed_to_ready_ms : null,
    worker_spawn_ms: s.worker_spawn ? s.worker_spawn.host_call_ms : null,
    fill_ms: fill ? fill.ms : null,
    fill_mode: s.fill ? s.fill.fill_mode || null : null,
    // a fill the service worker never answered: how long the host waited, and whether the worker had been stopped and started again
    fill_failed: s.fill && s.fill.failed ? s.fill.failed : null,
    fill_failed_after_ms: s.fill && s.fill.failed ? s.fill.host_ms : null,
    sw_restarted_during_fill: s.fill && s.fill.failed ? s.fill.sw_instance_before !== s.fill.sw_instance_after : null,
    sw_same_instance: s.fill && !s.fill.failed && s.fill.instance ? s.fill.sw_instance_before === s.fill.instance : null,
    fill_files: files.length,
    fill_wire_bytes: observedWire,
    consent_to_filled_ms: s.kind === 'first-visit' ? round1(sub(m.filled, m.consent)) : null,
    import_ms: ph.import_ms ?? null,
    load_pyodide_ms: ph.load_pyodide_ms ?? null,
    load_wheel_ms: ph.load_wheel_ms ?? null,
    import_z3_ms: ph.import_z3_ms ?? null,
    ready_ms: ph.ready_ms ?? null,
    ready_with_z3_ms: ph.ready_with_z3_ms ?? null,
    engine_start_ms: round1(sub(m.first_verdict, m.init_start)),
    // the sum of the timed parts (the fill, the worker's creation, the engine start to the first verdict), so that a
    // harness pause between them is not counted; on a phone there is none and the sum equals the stretch from the tap
    consent_to_verdict_ms: s.kind === 'first-visit' && s.worker_spawn ? round1(sub(m.filled, m.consent) + s.worker_spawn.host_call_ms + sub(m.first_verdict, m.init_start)) : null,
    starter_solve_ms: s.starter && s.starter.solve_ms ? s.starter.solve_ms : null,
    cpu_js_ms: s.cpu ? s.cpu.js_median_ms : null,
    cpu_wasm_ms: s.cpu ? s.cpu.wasm_tail_median_ms : null,
    cpu_wasm_async: s.cpu ? s.cpu.wasm_async_instantiate || null : null,
    ladder,
    respawn_to_verdict_ms: s.respawn ? s.respawn.to_verdict_ms : null,
    respawn_ready_ms: s.respawn && s.respawn.init ? s.respawn.init.ready_ms : null,
    heap_after_pyodide: ph.heap_after_pyodide ?? null,
    heap_after_wheel: ph.heap_after_wheel ?? null,
    heap_after_z3: ph.heap_after_import_z3 ?? null,
    heap_after_cases: s.memory ? s.memory.heap : null,
    page_js_heap: s.page ? s.page.js_heap : null,
    rss: { blank: mem('blank', 'rss_bytes'), connected: mem('connected', 'rss_bytes'), after_fill: mem('after-fill', 'rss_bytes'), first_verdict: mem('first-verdict', 'rss_bytes'), after_cases: mem('after-cases', 'rss_bytes'), after_respawn: mem('after-respawn', 'rss_bytes'), before_timeout: mem('before-timeout', 'rss_bytes'), after_timeout_stop: mem('after-timeout-stop', 'rss_bytes'), after_timeout_next: mem('after-timeout-next', 'rss_bytes'), peak: rec.memory ? rec.memory.peak_rss_bytes : null },
    pss: { blank: mem('blank', 'pss_bytes'), connected: mem('connected', 'pss_bytes'), after_fill: mem('after-fill', 'pss_bytes'), first_verdict: mem('first-verdict', 'pss_bytes'), after_cases: mem('after-cases', 'pss_bytes'), after_respawn: mem('after-respawn', 'pss_bytes'), before_timeout: mem('before-timeout', 'pss_bytes'), after_timeout_stop: mem('after-timeout-stop', 'pss_bytes'), after_timeout_next: mem('after-timeout-next', 'pss_bytes') },
    cache_entries_at_start: cache ? cache.entries : 0,
    controlled_at_load: s.frame_at_start ? s.frame_at_start.controlled_at_load : null,
    marker_present: s.frame_at_start && s.frame_at_start.marker ? s.frame_at_start.marker.present === true : null,
    engine_fetches_from_cache: initFetches.filter((f) => f.from === 'engine-cache').length,
    engine_fetches_other: initFetches.filter((f) => f.from !== 'engine-cache').length,
    engine_requests_to_server: instRequests ? instRequests.engine_requests : null,
    since_first_fill_ms: s.since_first_fill_ms ?? null,
    online: s.online ?? null,
  };
}

const COLD = (x) => x.kind === 'first-visit' && !x.hidden;
const WARM = (x) => x.kind === 'return-visit' && !x.hidden;

// One cell: the metrics of every session of one engine at one tier (or one device), grouped by kind.
export function summarizeCell(list) {
  const cold = list.filter((x) => COLD(x) && x.ok);
  const warm = list.filter((x) => WARM(x) && x.ok);
  const take = (arr, k) => stat(arr.map((x) => x[k]));
  const group = (arr) => ({
    n: arr.length,
    labels: arr.map((x) => x.label),
    handshake_ms: take(arr, 'handshake_ms'), worker_spawn_ms: take(arr, 'worker_spawn_ms'),
    fill_ms: take(arr, 'fill_ms'), consent_to_filled_ms: take(arr, 'consent_to_filled_ms'),
    import_ms: take(arr, 'import_ms'), load_pyodide_ms: take(arr, 'load_pyodide_ms'), load_wheel_ms: take(arr, 'load_wheel_ms'), import_z3_ms: take(arr, 'import_z3_ms'),
    ready_ms: take(arr, 'ready_ms'), ready_with_z3_ms: take(arr, 'ready_with_z3_ms'), engine_start_ms: take(arr, 'engine_start_ms'),
    consent_to_verdict_ms: take(arr, 'consent_to_verdict_ms'),
  });
  // what each return visit found: the cache, the controller, the frame's marker, and the engine requests that reached the server
  const persistence = {
    return_visits: list.filter((x) => x.kind === 'return-visit').length,
    cache_six_of_six: list.filter((x) => x.kind === 'return-visit' && x.cache_entries_at_start === 6).length,
    controlled_at_load: list.filter((x) => x.kind === 'return-visit' && x.controlled_at_load === true).length,
    marker_present: list.filter((x) => x.kind === 'return-visit' && x.marker_present === true).length,
    engine_fetches_not_from_cache: list.filter((x) => x.kind === 'return-visit').reduce((n, x) => n + x.engine_fetches_other, 0),
    engine_requests_to_server: list.filter((x) => x.kind === 'return-visit').reduce((n, x) => n + (x.engine_requests_to_server || 0), 0),
  };
  const withCpu = list.filter((x) => x.cpu_js_ms != null && !x.hidden);
  const ladderKeys = [...new Set(list.flatMap((x) => Object.keys(x.ladder)))].sort();
  const ladder = {};
  for (const k of ladderKeys) {
    const rows = list.filter((x) => x.ladder[k]);
    ladder[k] = { solve_ms: stat(rows.map((x) => x.ladder[k].solve_ms)), verdicts: [...new Set(rows.map((x) => x.ladder[k].verdict))], reasons: [...new Set(rows.map((x) => x.ladder[k].reason))] };
  }
  const first = list.find((x) => x.heap_after_z3 != null) || {};
  const mb = (v) => (v == null ? null : Math.round((v / 1048576) * 10) / 10);
  const rssOf = (arr, k) => stat(arr.map((x) => mb(x.rss[k])));
  const rssDelta = (arr, a, b) => stat(arr.map((x) => mb(sub(x.rss[a], x.rss[b]))));
  const pssDelta = (arr, a, b) => stat(arr.map((x) => mb(sub(x.pss[a], x.pss[b]))));
  const mem = list.filter((x) => x.rss.first_verdict != null);
  return {
    sessions: list.length,
    persistence,
    hidden_sessions: list.filter((x) => x.hidden).length,
    cold: group(cold),
    warm: group(warm),
    yardstick: { js_ms: take(withCpu, 'cpu_js_ms'), wasm_ms: take(withCpu, 'cpu_wasm_ms'), wasm_async_instantiate: withCpu.map((x) => x.cpu_wasm_async).filter(Boolean) },
    respawn_to_verdict_ms: take(list, 'respawn_to_verdict_ms'), respawn_ready_ms: take(list, 'respawn_ready_ms'),
    main_thread: Object.fromEntries(['idle', 'fill', 'start', 'cases'].map((ph) => {
      const rows = list.filter((x) => x.lag && x.lag[ph] && !x.hidden).map((x) => x.lag[ph]);
      return [ph, rows.length ? {
        sessions: rows.length,
        late_ms_max: stat(rows.map((r) => r.late_ms_max)),
        late_ms_mean_per_tick: stat(rows.map((r) => (r.ticks ? r.late_ms_total / r.ticks : null))),
        ticks_over_100_total: rows.reduce((n, r) => n + r.ticks_over_100, 0), ticks_over_250_total: rows.reduce((n, r) => n + r.ticks_over_250, 0), ticks_total: rows.reduce((n, r) => n + r.ticks, 0),
        long_task_max_ms: stat(rows.map((r) => r.long_task_max_ms ?? null)),
      } : null];
    })),
    ladder,
    heap_mib: { after_pyodide: mb(first.heap_after_pyodide), after_wheel: mb(first.heap_after_wheel), after_import_z3: mb(first.heap_after_z3), after_cases: stat(list.map((x) => mb(x.heap_after_cases))) },
    rss_mib: mem.length ? {
      blank: rssOf(mem, 'blank'), connected: rssOf(mem, 'connected'), first_verdict: rssOf(mem, 'first_verdict'),
      engine_over_connected: rssDelta(mem, 'first_verdict', 'connected'), peak: stat(mem.map((x) => mb(x.rss.peak))),
      pss_engine_over_connected: pssDelta(mem, 'first_verdict', 'connected'),
    } : null,
  };
}

// results: [{engine, tier, plan, sessions: [harness records]}, ...]
// The matrix plan (and the smoke plans) make the per-tier cells; the extras plan and the link plan are kept apart,
// so that a cold session of the extras plan never joins a cell's repeats.
export function summarize(resultFiles) {
  const out = { tiers: {}, link: {}, extras: {}, ui: {} };
  for (const f of resultFiles) {
    const flat = f.plan === 'ui' ? [] : f.sessions.map((rec) => ({ rec, m: metrics({ ...rec, engine: f.engine, tier: f.tier }) }));
    if (f.plan === 'ui') {
      out.ui[f.engine] = f.sessions.map((rec) => ({ label: rec.label, error: rec.error || null, ui: rec.ui || null }));
    } else if (f.plan === 'link') {
      for (const { rec, m } of flat) {
        // what the server saw of an engine file the browser closed before its end: which file, how much had been sent, and when
        // (counted from the first engine file's request)
        const files = (rec.requests && rec.requests.engine_files) || [];
        const cut = files.find((q) => q.aborted_ms != null);
        const sess = rec.session || {};
        const afterStop = sess.caps_after_stop ? { cached_files: sess.caps_after_stop.cachedCount, of: sess.caps_after_stop.assetCount } : null;
        const fr = sess.fill_retry;
        const retry = fr ? { ok: !fr.failed, skipped: fr.skipped ?? null, filled: fr.filled ?? null, bytes_fetched: fr.bytes ?? null, ms: fr.ms ?? null, cached_files_after: sess.caps_after_retry ? sess.caps_after_retry.cachedCount : null } : null;
        const closed = cut ? { file: cut.file, sent_bytes: cut.sent_bytes, body_bytes: cut.body_bytes, files_finished_before: files.filter((q) => q.aborted_ms == null && q.ms > 0 && q.t_ms < cut.t_ms).length, after_first_engine_request_ms: files[0] ? cut.t_ms + cut.aborted_ms - files[0].t_ms : null } : null;
        ((out.link[rec.env.link.name] ||= {})[f.engine] ||= []).push({
          label: m.label, link: rec.env.link, fill_mode: (rec.options && rec.options.fill) || 'single', ok: m.ok,
          fill_failed: m.fill_failed, fill_failed_after_ms: m.fill_failed_after_ms, sw_restarted: m.sw_restarted_during_fill, sw_same_instance: m.sw_same_instance, closed_by_browser: closed, after_stop: afterStop, retry,
          handshake_ms: m.handshake_ms, fill_ms: m.fill_ms, fill_wire_bytes: m.fill_wire_bytes, consent_to_verdict_ms: m.consent_to_verdict_ms, ready_ms: m.ready_ms, engine_start_ms: m.engine_start_ms,
        });
      }
    } else if (f.plan === 'extras') {
      for (const { rec, m } of flat) ((out.extras[f.tier] ||= {})[f.engine] ||= []).push({ label: m.label, offline: rec.env.offline, metrics: m });
    } else {
      (out.tiers[f.tier] ||= {})[f.engine] = summarizeCell(flat.map((x) => x.m));
    }
  }
  return out;
}
