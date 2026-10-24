import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const CHECK = path.join(HERE, '..', 'check.mjs')
const run = (root) => {
  const res = spawnSync(process.execPath, [CHECK, '--root', root], { encoding: 'utf8' })
  return { status: res.status, out: res.stdout + res.stderr }
}
const fixture = (name) => path.join(HERE, '..', 'fixtures', name)

// The planted lines of fixtures/bad, as file:line rule. A change to a fixture changes this table.
const PLANTED = [
  ['packages/leaky/src/globals.ts:3', 'PURE-GLOBAL', 'document'],
  ['packages/leaky/src/globals.ts:4', 'PURE-GLOBAL', 'localStorage'],
  ['packages/leaky/src/globals.ts:5', 'PURE-GLOBAL', 'indexedDB'],
  ['packages/leaky/src/globals.ts:6', 'PURE-GLOBAL', 'fetch'],
  ['packages/leaky/src/globals.ts:7', 'PURE-GLOBAL', 'XMLHttpRequest'],
  ['packages/leaky/src/globals.ts:8', 'PURE-GLOBAL', 'navigator'],
  ['packages/leaky/src/globals.ts:9', 'PURE-GLOBAL', 'process'],
  ['packages/leaky/src/globals.ts:10', 'PURE-GLOBAL', 'Buffer'],
  ['packages/leaky/src/globals.ts:11', 'PURE-GLOBAL', 'Worker'],
  ['packages/leaky/src/globals.ts:13', 'PURE-GLOBALTHIS', 'window.alert'],
  ['packages/leaky/src/global-this.ts:2', 'PURE-GLOBALTHIS', 'globalThis.document'],
  ['packages/leaky/src/global-this.ts:3', 'PURE-GLOBALTHIS', 'globalThis["fetch"]'],
  ['packages/leaky/src/global-this.ts:5', 'PURE-GLOBALTHIS', 'globalThis[...]'],
  ['packages/leaky/src/imports.ts:2', 'PURE-IMPORT', 'node:fs'],
  ['packages/leaky/src/imports.ts:3', 'PURE-IMPORT', 'path'],
  ['packages/leaky/src/imports.ts:4', 'PURE-IMPORT', 'node:os'],
  ['packages/leaky/src/imports.ts:6', 'PURE-IMPORT', 'https://example.invalid/x.js'],
  ['packages/leaky/src/imports.ts:7', 'PURE-IMPORT', 'node:net'],
  ['packages/leaky/src/apps.ts:2', 'PKG-APP-IMPORT', 'apps/'],
  ['packages/leaky/src/vendor.ts:2', 'VENDOR-IMPORT', 'vendor/'],
  ['apps/site/src/vendor.ts:2', 'VENDOR-IMPORT', 'vendor/'],
]

test('the planted fixtures trip the lint, line by line', () => {
  const { status, out } = run(fixture('bad'))
  assert.equal(status, 1, out)
  for (const [where, rule, what] of PLANTED) {
    const hit = out.split('\n').find((l) => l.startsWith(`${where}:`) && l.includes(` ${rule} `) && l.includes(what))
    assert.ok(hit, `${where} should report ${rule} for ${what}\n${out}`)
  }
  const reported = out.split('\n').filter((l) => /^(packages|apps)\//.test(l))
  const plantedLines = new Set(PLANTED.map(([where]) => where))
  for (const l of reported) {
    const where = l.split(':').slice(0, 2).join(':')
    assert.ok(plantedLines.has(where), `unplanted finding: ${l}`)
  }
})

test('the clean fixtures pass: locals, keys, strings, types, wrapper homes and apps', () => {
  const { status, out } = run(fixture('good'))
  assert.equal(status, 0, out)
  assert.match(out, /purity-lint: ok/)
})

test('the repository passes', () => {
  const { status, out } = run(path.join(HERE, '..', '..', '..'))
  assert.equal(status, 0, out)
})
