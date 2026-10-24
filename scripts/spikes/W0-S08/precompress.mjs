#!/usr/bin/env node
// W0-S08: write gzip copies of a PGlite dist folder, so that the browser harness serves bytes made by a known encoder.
//
//   node precompress.mjs --dist <dist dir> --out <dir> [--level 5]
//
// The Playwright image's Node ships a different zlib from the host's (a Chromium fork), whose output differs from stock
// zlib by up to 16 percent on pglite.data. GitHub Pages' gzip output for four probed files equals stock zlib 1.3.1 at
// level 5 byte for byte (gh-pages-probe.mjs), so that is what this writes by default, on the host, with the zlib recorded.

import { parseArgs } from 'node:util'
import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'

const { values: a } = parseArgs({ options: { dist: { type: 'string' }, out: { type: 'string' }, level: { type: 'string', default: '5' } } })
const level = Number(a.level)
const walk = (dir) => readdirSync(dir).flatMap((n) => { const p = path.join(dir, n); return statSync(p).isDirectory() ? walk(p) : [p] })
let n = 0
for (const file of walk(a.dist)) {
  const rel = path.relative(a.dist, file)
  const target = path.join(a.out, rel + '.gz')
  mkdirSync(path.dirname(target), { recursive: true })
  writeFileSync(target, zlib.gzipSync(readFileSync(file), { level }))
  n++
}
console.log(`wrote ${n} gzip files at level ${level} with zlib ${process.versions.zlib}`)
