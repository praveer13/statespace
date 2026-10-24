#!/usr/bin/env node
// W0-S08: summarize the first-load, specimen, throttle and slow-CPU results into one file with verdict lines.
//
//   node summarize-first-load.mjs --out <summary.json> --first-load <file>... --specimens <file>... [--memory <file>...] [--throttle <file>] [--slow <file>...]
//
// Every number is computed from the result files named on the command line.

import { parseArgs } from 'node:util'
import { readFileSync, writeFileSync } from 'node:fs'
import { canon } from './rls-spec.mjs'

const { values: a } = parseArgs({
  options: {
    out: { type: 'string' }, 'first-load': { type: 'string', multiple: true }, specimens: { type: 'string', multiple: true },
    throttle: { type: 'string' }, slow: { type: 'string', multiple: true }, memory: { type: 'string', multiple: true },
  },
})
const load = (f) => JSON.parse(readFileSync(f, 'utf8'))
const median = (xs) => { const s = [...xs].sort((p, q) => p - q); return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : null }
const r1 = (x) => (x === null ? null : Math.round(x * 10) / 10)
const mib = (b) => (b === null ? null : Math.round((b / 1048576) * 10) / 10)
const sum = (xs) => xs.reduce((n, x) => n + x, 0)

const lines = []
const summary = { engines: {} }

for (const f of a['first-load'] ?? []) {
  const r = load(f)
  const e = { browser_version: r.browser_version, user_agent: r.user_agent, pglite_version: r.pglite_version, playwright_core: r.playwright_core, modes: {} }
  for (const mode of ['identity', 'gzip']) {
    const cold = r.first_load[mode].filter((x) => x.cold)
    const warm = r.first_load[mode].find((x) => !x.cold)
    const bytes = (run) => sum(run.server_log.filter((l) => l.path.startsWith('/pglite/') && l.status === 200).map((l) => l.body_bytes))
    const rawBytes = (run) => sum(run.server_log.filter((l) => l.path.startsWith('/pglite/') && l.status === 200).map((l) => l.raw_bytes))
    const files = (run) => run.server_log.filter((l) => l.path.startsWith('/pglite/') && l.status === 200).length
    const m = {
      cold_runs: cold.length,
      pglite_files_requested: [...new Set(cold.map(files))],
      pglite_wire_body_bytes: [...new Set(cold.map(bytes))], pglite_raw_bytes: [...new Set(cold.map(rawBytes))],
      import_ms: cold.map((x) => r1(x.result.first.import_ms)), ready_ms: cold.map((x) => r1(x.result.first.ready_ms)), first_query_ms: cold.map((x) => r1(x.result.first.first_query_ms)),
      total_ms: cold.map((x) => r1(x.result.first.total_ms)),
      ready_ms_median: r1(median(cold.map((x) => x.result.first.ready_ms))), total_ms_median: r1(median(cold.map((x) => x.result.first.total_ms))),
      further_instance_ready_ms_median: r1(median(cold.flatMap((x) => x.result.further_instances.map((y) => y.ready_ms)))),
      wasm_memory_bytes: [...new Set(cold.map((x) => x.result.first.wasm_memory_bytes))],
      warm: warm ? { requests_to_server_for_pglite: warm.server_log.filter((l) => l.path.startsWith('/pglite/')).length, pglite_bytes_from_server: bytes(warm), ready_ms: r1(warm.result.first.ready_ms), total_ms: r1(warm.result.first.total_ms) } : null,
      version: [...new Set(cold.map((x) => x.result.first.version))],
      further_instances: cold[0].result.further_instances.length,
    }
    e.modes[mode] = m
  }
  summary.engines[r.engine] = e
  const g = e.modes.gzip, id = e.modes.identity
  lines.push(`${r.engine} ${r.browser_version}: PGlite ${r.pglite_version} first load = ${g.pglite_files_requested.join('/')} files, ${id.pglite_raw_bytes.join('/')} B raw, ${g.pglite_wire_body_bytes.join('/')} B gzip on the wire; cold ready ${g.ready_ms.join(', ')} ms (median ${g.ready_ms_median}), later fresh instance ${g.further_instance_ready_ms_median} ms; wasm memory ${g.wasm_memory_bytes.join('/')} B per instance`)
}

summary.memory = {}
for (const f of a.memory ?? []) {
  const r = load(f)
  const base = r.steps[0].rss_bytes
  summary.memory[r.engine] = { browser_version: r.browser_version, wasm_memory_bytes: r.wasm_memory_bytes, steps: r.steps.map((s) => ({ step: s.step, rss_mib: mib(s.rss_bytes), over_blank_page_mib: mib(s.rss_bytes - base) })) }
  lines.push(`memory, ${r.engine}: ${r.steps.map((s) => `${s.step} ${mib(s.rss_bytes)} MiB`).join('; ')} (wasm linear memory ${r.wasm_memory_bytes} B = ${mib(r.wasm_memory_bytes)} MiB per instance)`)
}

summary.specimens = {}
for (const f of a.specimens ?? []) {
  const r = load(f)
  summary.specimens[r.engine ?? f] = { browser_version: r.browser_version, server_version: r.specimens.server_version, single_session: r.specimens.single_session, serialize: r.specimens.serialize }
}
const ss = Object.entries(summary.specimens)
if (ss.length > 1) {
  const ref = canon(ss[0][1].single_session.map((s) => [s.id, s.outcome]))
  summary.specimens_equal_across_engines = ss.every(([, v]) => canon(v.single_session.map((s) => [s.id, s.outcome])) === ref)
  const ser = canon(ss[0][1].serialize.log) // the interleaving log is the experiment's outcome; timings differ
  summary.serialize_log_equal_across_engines = ss.every(([, v]) => canon(v.serialize.log) === ser) && ss.every(([, v]) => v.serialize.final === ss[0][1].serialize.final)
  lines.push(`single-session specimens (${ss.length} browser engines): outcomes equal across engines: ${summary.specimens_equal_across_engines}; two "concurrent" workers: log ${JSON.stringify(ss[0][1].serialize.log)}, final balance ${ss[0][1].serialize.final}, identical in all engines: ${summary.serialize_log_equal_across_engines}`)
}

if (a.throttle) {
  const t = load(a.throttle)
  summary.cdp_throttle = t.throttle.map((x) => ({ rate: x.rate, cpu_probe_ms: r1(x.cpu_probe_ms), ready_ms: r1(x.first.ready_ms) }))
  lines.push(`Chromium CDP CPU throttling at ${t.throttle.map((x) => x.rate + 'x').join(', ')}: worker CPU probe ${summary.cdp_throttle.map((x) => x.cpu_probe_ms).join(', ')} ms, PGlite ready ${summary.cdp_throttle.map((x) => x.ready_ms).join(', ')} ms (the throttle does not reach the worker)`)
}

if (a.slow?.length) {
  summary.slow_cpu = []
  for (const f of a.slow) {
    const s = load(f)
    const probe = s.repeats.map((x) => Math.min(...x.cpu_probe_ms))
    summary.slow_cpu.push({ label: s.label, repeats: s.repeats.length, cpu_probe_min_ms: probe.map(r1), cpu_probe_ms_median: r1(median(probe)), ready_ms: s.repeats.map((x) => r1(x.first.ready_ms)), ready_ms_median: r1(median(s.repeats.map((x) => x.first.ready_ms))) })
  }
  const base = summary.slow_cpu[0]
  for (const x of summary.slow_cpu) { x.probe_slowdown_vs_first = r1(x.cpu_probe_ms_median / base.cpu_probe_ms_median); x.ready_slowdown_vs_first = r1(x.ready_ms_median / base.ready_ms_median) }
  for (const x of summary.slow_cpu) lines.push(`emulated slow CPU (${x.label}): worker probe median ${x.cpu_probe_ms_median} ms (${x.probe_slowdown_vs_first}x), PGlite cold ready median ${x.ready_ms_median} ms (${x.ready_slowdown_vs_first}x), n = ${x.repeats}`)
}

summary.verdict_lines = lines
writeFileSync(a.out, JSON.stringify(summary, null, 2) + '\n')
for (const l of lines) console.log(l)
