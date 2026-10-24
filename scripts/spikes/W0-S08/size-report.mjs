#!/usr/bin/env node
// W0-S08: the first-load manifest of a PGlite build, from what a browser actually requested.
//
//   node size-report.mjs --out <size-manifest.json> --version <label>=<dist dir>=<first-load result.json> [--version ...]
//
// The first-load result is browser-run.mjs's output; its identity-mode cold runs list every /pglite/ file the engine
// requested. For each such file the report gives raw bytes, SHA-256, gzip at levels 5, 6 and 9 (stock zlib of the Node in
// use) and Brotli at quality 11, all computed here from the file's bytes. Level 5 is the headline: it is the level at which
// GitHub Pages' gzip output matched byte for byte (gh-pages-probe.mjs). The report checks the level-5 sum against the bytes
// the browser run's server log says it sent and against the engine's own resource timing. The first label is the build that
// is compared with the others.
//
// OD-6 asks before a download "above 5 MB" and does not say whether that is 5,000,000 or 5,242,880 bytes, so both are shown.

import { parseArgs } from 'node:util'
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { compress } from './serve.mjs'

const { values: a } = parseArgs({ options: { out: { type: 'string' }, version: { type: 'string', multiple: true } } })
const MB = 5_000_000
const MIB = 5 * 1024 * 1024
const sha = (buf) => createHash('sha256').update(buf).digest('hex')

function walk(dir, base = dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = path.join(dir, n)
    return statSync(p).isDirectory() ? walk(p, base) : [path.relative(base, p)]
  })
}

function report(label, dist, resultFile) {
  const result = JSON.parse(readFileSync(resultFile, 'utf8'))
  const cold = result.first_load.identity.find((r) => r.cold)
  const requested = cold.server_log.filter((l) => l.path.startsWith('/pglite/') && l.status === 200).map((l) => l.path.slice('/pglite/'.length))
  const files = requested.map((rel) => {
    const buf = readFileSync(path.join(dist, rel))
    return {
      path: rel, raw_bytes: buf.length, sha256: sha(buf),
      gzip5_bytes: compress(buf, 'gzip', 5).length, gzip6_bytes: compress(buf, 'gzip', 6).length, gzip9_bytes: compress(buf, 'gzip', 9).length, brotli11_bytes: compress(buf, 'br', 11).length,
    }
  })
  const sum = (k) => files.reduce((n, f) => n + f[k], 0)
  const totals = { raw: sum('raw_bytes'), gzip5: sum('gzip5_bytes'), gzip6: sum('gzip6_bytes'), gzip9: sum('gzip9_bytes'), brotli11: sum('brotli11_bytes') }
  const klass = (f) => (f.path === 'pglite.wasm' ? 'pglite.wasm' : f.path === 'pglite.data' ? 'pglite.data' : f.path === 'initdb.wasm' ? 'initdb.wasm' : 'javascript')
  const byClass = {}
  for (const f of files) {
    const c = (byClass[klass(f)] ??= { files: 0, raw_bytes: 0, gzip5_bytes: 0, gzip6_bytes: 0, gzip9_bytes: 0, brotli11_bytes: 0 })
    c.files++; c.raw_bytes += f.raw_bytes; c.gzip5_bytes += f.gzip5_bytes; c.gzip6_bytes += f.gzip6_bytes; c.gzip9_bytes += f.gzip9_bytes; c.brotli11_bytes += f.brotli11_bytes
  }
  // what the browser runs measured, per engine would need several files; this file's own run is the cross-check
  const gzipCold = result.first_load.gzip.find((r) => r.cold)
  const sent = gzipCold.server_log.filter((l) => l.path.startsWith('/pglite/') && l.status === 200).reduce((n, l) => n + l.body_bytes, 0)
  const resource = gzipCold.result.resource_entries.filter((e) => e.name.startsWith('/pglite/')).reduce((n, e) => n + e.encoded_body_size, 0)
  const notLoaded = walk(dist).filter((rel) => !requested.includes(rel))
  const sizeOf = (rel) => statSync(path.join(dist, rel)).size
  const ext = notLoaded.filter((r) => r.endsWith('.tar.gz'))
  return {
    label, engine_browser: result.engine, browser_version: result.browser_version, pglite_version: result.pglite_version,
    requested_in_order: requested, files, totals,
    totals_mb: Object.fromEntries(Object.entries(totals).map(([k, v]) => [k, Math.round(v / 1e4) / 100])),
    totals_mib: Object.fromEntries(Object.entries(totals).map(([k, v]) => [k, Math.round((v / 1048576) * 100) / 100])),
    above_5_000_000: Object.fromEntries(Object.entries(totals).map(([k, v]) => [k, v > MB])),
    above_5_242_880: Object.fromEntries(Object.entries(totals).map(([k, v]) => [k, v > MIB])),
    by_class: byClass,
    cross_check: { gzip5_computed_bytes: totals.gzip5, server_log_bytes_sent: sent, resource_timing_encoded_bytes: resource, equal: totals.gzip5 === sent && sent === resource },
    not_loaded: {
      files: notLoaded.length, bytes: notLoaded.reduce((n, r) => n + sizeOf(r), 0),
      extension_tarballs: ext.length, extension_tarball_bytes: ext.reduce((n, r) => n + sizeOf(r), 0),
      largest_extension: ext.map((r) => ({ path: r, bytes: sizeOf(r) })).sort((x, y) => y.bytes - x.bytes)[0] ?? null,
    },
  }
}

const reports = (a.version ?? []).map((v) => { const [label, dist, file] = v.split('='); return report(label, dist, file) })
const [main, ...rest] = reports
const comparison = rest.map((o) => ({
  from: o.label, to: main.label,
  raw_delta_bytes: main.totals.raw - o.totals.raw, gzip5_delta_bytes: main.totals.gzip5 - o.totals.gzip5, brotli11_delta_bytes: main.totals.brotli11 - o.totals.brotli11,
  by_class_raw: Object.fromEntries(Object.keys({ ...main.by_class, ...o.by_class }).map((k) => [k, { [o.label]: o.by_class[k]?.raw_bytes ?? 0, [main.label]: main.by_class[k]?.raw_bytes ?? 0 }])),
  by_class_gzip5: Object.fromEntries(Object.keys({ ...main.by_class, ...o.by_class }).map((k) => [k, { [o.label]: o.by_class[k]?.gzip5_bytes ?? 0, [main.label]: main.by_class[k]?.gzip5_bytes ?? 0 }])),
}))
const out = { thresholds: { od6_decimal_bytes: MB, od6_binary_bytes: MIB }, builds: reports, comparison }
writeFileSync(a.out, JSON.stringify(out, null, 2) + '\n')
for (const r of reports) {
  console.log(`${r.label}: ${r.files.length} files; raw ${r.totals.raw} B; gzip5 ${r.totals.gzip5} B; gzip6 ${r.totals.gzip6} B; gzip9 ${r.totals.gzip9} B; brotli11 ${r.totals.brotli11} B; cross-check equal: ${r.cross_check.equal}`)
}
