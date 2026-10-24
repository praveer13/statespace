#!/usr/bin/env node
// W0-S08: what a static host on GitHub Pages sends for a WebAssembly file, an unknown binary type and a script.
//
//   node gh-pages-probe.mjs --out <gh-pages-probe.json>
//
// The course will be served by GitHub Pages (architecture section 3), so the bytes on the wire for PGlite depend on
// what that host compresses and how. This probes public sites that GitHub Pages serves (not this course's
// deployment) with `Accept-Encoding: gzip, br`, records the response headers that matter, and compares the gzip body
// length the host sent with the length that stock zlib (the Node in use) and GNU gzip give at levels 1 to 9 for the
// same decoded bytes. An exact match at one level says which encoder and level the host behaves like.

import { parseArgs } from 'node:util'
import { writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import zlib from 'node:zlib'

const { values: a } = parseArgs({ options: { out: { type: 'string' } } })

const URLS = [
  ['application/wasm', 'https://mozilla.github.io/pdf.js/web/wasm/openjpeg.wasm'],
  ['application/wasm', 'https://floooh.github.io/sokol-html5/triangle-sapp.wasm'],
  ['unknown extension (served as application/octet-stream)', 'https://mozilla.github.io/pdf.js/web/cmaps/UniJIS-UTF16-H.bcmap'],
  ['text/javascript', 'https://mozilla.github.io/pdf.js/build/pdf.mjs'],
]

const pick = (h, k) => h.get(k) ?? null
const rows = []
for (const [kind, url] of URLS) {
  const res = await fetch(url, { headers: { 'accept-encoding': 'gzip, br' } })
  const decoded = Buffer.from(await res.arrayBuffer())
  const sent = res.headers.get('content-length') ? Number(res.headers.get('content-length')) : null
  const encoding = pick(res.headers, 'content-encoding')
  const zlibSizes = {}
  const gzipSizes = {}
  for (let level = 1; level <= 9; level++) {
    zlibSizes[level] = zlib.gzipSync(decoded, { level }).length
    const r = spawnSync('gzip', ['-n', `-${level}`, '-c'], { input: decoded, maxBuffer: 1 << 28 })
    gzipSizes[level] = r.stdout.length
  }
  const match = (sizes) => Object.entries(sizes).filter(([, n]) => n === sent).map(([l]) => Number(l))
  rows.push({
    kind, url, status: res.status, server: pick(res.headers, 'server'), content_type: pick(res.headers, 'content-type'),
    content_encoding: encoding, content_length_sent: sent, decoded_bytes: decoded.length, etag_weak: (pick(res.headers, 'etag') || '').startsWith('W/'),
    cache_control: pick(res.headers, 'cache-control'), vary: pick(res.headers, 'vary'),
    candidate_sizes: { node_zlib: zlibSizes, gnu_gzip: gzipSizes },
    exact_matches: { node_zlib_levels: match(zlibSizes), gnu_gzip_levels: match(gzipSizes) },
    nearest_node_zlib_level: Object.entries(zlibSizes).sort((x, y) => Math.abs(x[1] - sent) - Math.abs(y[1] - sent))[0].map(Number),
  })
}
const out = {
  probed_at: new Date().toISOString(), node: process.version, zlib: process.versions.zlib,
  gnu_gzip: spawnSync('gzip', ['--version']).stdout.toString().split('\n')[0],
  note: 'public sites served by GitHub Pages, not this course\'s deployment; the request offered gzip and br; no .data file was probed',
  rows,
}
writeFileSync(a.out, JSON.stringify(out, null, 2) + '\n')
for (const r of rows) console.log(`${r.kind}: ${r.url.split('/').pop()} encoding=${r.content_encoding} sent=${r.content_length_sent} decoded=${r.decoded_bytes} zlib exact level(s)=${JSON.stringify(r.exact_matches.node_zlib_levels)} gnu gzip exact=${JSON.stringify(r.exact_matches.gnu_gzip_levels)} nearest zlib level=${r.nearest_node_zlib_level[0]} (${r.nearest_node_zlib_level[1]})`)
