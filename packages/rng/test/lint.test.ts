import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { lintDeterminism, seededScope } from '../src/lint.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const VENDORED = path.join(ROOT, 'vendor', 'kernelspace', 'scripts', 'verify-determinism.ts')

const count = (src: string, numeric = true): number => lintDeterminism(ts, 'case.ts', src, { numeric }).length
const rules = (src: string): string[] => lintDeterminism(ts, 'case.ts', src).map((f) => f.rule)

interface VendoredCase {
  name: string
  src: string
  numeric: boolean
  expect: number
}

/** The self-test cases of the vendored lint, read from its source with the TypeScript parser (never evaluated). */
function vendoredCases(): VendoredCase[] {
  const sf = ts.createSourceFile(VENDORED, readFileSync(VENDORED, 'utf8'), ts.ScriptTarget.Latest, true)
  const out: VendoredCase[] = []
  const visit = (node: ts.Node): void => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === 'cases' && node.initializer && ts.isArrayLiteralExpression(node.initializer)) {
      for (const el of node.initializer.elements) {
        if (!ts.isObjectLiteralExpression(el)) throw new Error('a vendored case is not an object literal')
        const c: Record<string, unknown> = {}
        for (const p of el.properties) {
          if (!ts.isPropertyAssignment(p) || !ts.isIdentifier(p.name)) throw new Error('unexpected vendored case shape')
          const v = p.initializer
          if (ts.isStringLiteral(v) || ts.isNoSubstitutionTemplateLiteral(v)) c[p.name.text] = v.text
          else if (v.kind === ts.SyntaxKind.TrueKeyword) c[p.name.text] = true
          else if (v.kind === ts.SyntaxKind.FalseKeyword) c[p.name.text] = false
          else if (ts.isNumericLiteral(v)) c[p.name.text] = Number(v.text)
          else throw new Error(`unexpected vendored value for ${p.name.text}`)
        }
        out.push(c as unknown as VendoredCase)
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(sf)
  return out
}

test('parity: every self-test case of the vendored kernelspace lint gives the same number of findings here', () => {
  const cases = vendoredCases()
  assert.ok(cases.length >= 19, `expected the vendored self-test cases, found ${cases.length}`)
  for (const c of cases) assert.equal(count(c.src, c.numeric), c.expect, `vendored case "${c.name}"`)
})

test('statespace additions: randomUUID, the other transcendental functions and **', () => {
  assert.deepEqual(rules('const id = crypto.randomUUID()'), ['entropy'])
  assert.deepEqual(rules('const a = Math.expm1(1) + Math.log1p(1) + Math.tanh(1) + Math.asin(0.5) + Math.atan(1)'), [
    'engine-math',
    'engine-math',
    'engine-math',
    'engine-math',
    'engine-math',
  ])
  assert.deepEqual(rules('const p = 2 ** 10'), ['engine-math'])
  assert.deepEqual(rules('let p = 3\np **= 2'), ['engine-math'])
  assert.equal(count('const p = 2 ** 10', false), 0)
})

test('statespace additions: locale-dependent methods and Intl, through any receiver or the global object', () => {
  assert.deepEqual(rules("const c = 'a'.localeCompare('b')"), ['locale'])
  assert.deepEqual(rules('const s = (12345).toLocaleString()'), ['locale'])
  assert.deepEqual(rules("const s = x['toLocaleUpperCase']()"), ['locale'])
  assert.deepEqual(rules('const f = new Intl.NumberFormat()'), ['locale'])
  assert.deepEqual(rules('const f = globalThis.Intl'), ['locale'])
  assert.equal(count('let f: Intl.NumberFormat | undefined'), 0)
})

test('statespace additions: timers and garbage-collection observers, bare or through the global object', () => {
  assert.deepEqual(rules('setTimeout(() => 0, 1)'), ['timer'])
  assert.deepEqual(rules('globalThis.setTimeout(() => 0, 1)'), ['timer'])
  assert.deepEqual(rules("globalThis['queueMicrotask'](() => 0)"), ['timer'])
  assert.deepEqual(rules('const r = new WeakRef({})'), ['timer'])
  assert.deepEqual(rules('const r = new FinalizationRegistry(() => 0)'), ['timer'])
  assert.equal(count('const o = { setTimeout: 1 }\no.setTimeout'), 0)
})

test('statespace additions: crypto and performance cannot hide behind an alias, and globalThis[...] is a global', () => {
  assert.deepEqual(rules('const c = crypto\nc.getRandomValues(new Uint8Array(1))'), ['alias'])
  assert.deepEqual(rules('const p = performance'), ['alias'])
  assert.deepEqual(rules("const x = globalThis['Math'].random()"), ['entropy'])
  assert.equal(count('const d = crypto.subtle'), 0)
})

test('exact arithmetic, comments and strings never trip it', () => {
  assert.equal(count('const a = Math.imul(3, 5) + Math.floor(7 / 2) + Math.abs(-1) + Math.max(1, 2) + Math.sqrt(16) + Math.trunc(1.5) + (x >>> 0)'), 0)
  assert.equal(count("// Math.random() and 2 ** 3\nconst s = 'Date.now() localeCompare Intl setTimeout'"), 0)
})

test('a finding names its line and column', () => {
  const [f] = lintDeterminism(ts, 'case.ts', 'const a = 1\nconst b = Math.random()')
  assert.deepEqual({ line: f?.line, col: f?.col, rule: f?.rule }, { line: 2, col: 11, rule: 'entropy' })
})

test('the scope: statespace\'s seeded paths, numeric, without tests, declarations or vendored code', () => {
  assert.deepEqual(seededScope('packages/generators/src/core/draw.ts'), { numeric: true })
  assert.deepEqual(seededScope('packages/generators/src/negate-it/index.ts'), { numeric: true })
  assert.deepEqual(seededScope('packages/pocket/src/predicates.ts'), { numeric: true })
  assert.deepEqual(seededScope('packages/rng/src/draw.ts'), { numeric: true })
  assert.deepEqual(seededScope('apps/instruments/src/engines/clearinghouse/world.ts'), { numeric: true })
  assert.equal(seededScope('packages/generators/test/core/draw.test.ts'), null)
  assert.equal(seededScope('packages/generators/src/core/types.d.ts'), null)
  assert.equal(seededScope('packages/generators/src/core/README.md'), null)
  assert.equal(seededScope('packages/ledger/src/time.ts'), null)
  assert.equal(seededScope('vendor/kernelspace/src/lib/rng.ts'), null)
  assert.equal(seededScope('apps/site/src/screens/today/route.tsx'), null)
})
