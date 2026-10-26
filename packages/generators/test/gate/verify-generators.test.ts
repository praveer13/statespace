import assert from 'node:assert/strict'
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { pathToFileURL } from 'node:url'
import { BROWSER_ENGINES, CORE_REV, DEFAULT_SAMPLE, DETERMINISM_SCHEMA, familyDigest } from '../../src/core/index.ts'
import type { Generator } from '../../src/core/index.ts'
// The gate script: plain JavaScript, imported for its exported functions (it runs main() only when executed).
// @ts-expect-error -- an .mjs script without type declarations
import * as gate from '../../../../scripts/verify-generators.mjs'

type Gate = {
  parseArgs(argv: string[]): Record<string, unknown>
  withGuard<T>(fn: () => T): T
  familyDirs(root: string): string[]
  loadRegistry(root: string): { generators: Map<string, number>; misconceptions: Set<string>; kcs: Set<string>; tasks?: Set<string> } | null
  trackerTasks(root: string): Set<string> | null
  portFor(gen: unknown, map: Map<string, unknown>): { run(req: unknown): Promise<unknown> } | undefined
  formatReport(result: unknown, verbose?: boolean): string[]
  lintTree(root: string): Promise<{ files: number; findings: { where: string; message: string }[] }>
  main(argv: string[], io: { out: (s: string) => void; err: (s: string) => void }): Promise<number>
}
const g = gate as unknown as Gate
const ROOT = new URL('../../../../', import.meta.url).pathname

test('arguments: --write needs browser digests, and unknown flags are usage errors', () => {
  assert.deepEqual(g.parseArgs(['--family', 'GEN-a,GEN-b', '--family', 'GEN-c']).families, ['GEN-a', 'GEN-b', 'GEN-c'])
  assert.equal(g.parseArgs(['--engines-out', 'x.json']).engines, true)
  assert.throws(() => g.parseArgs(['--write']), /--write needs --engines/)
  assert.throws(() => g.parseArgs(['--engines', '--engines-in', 'x.json']), /does not run browsers/)
  assert.throws(() => g.parseArgs(['--key-seeds', '0']), /positive integer/)
  assert.throws(() => g.parseArgs(['--bogus']), /unknown argument/)
  assert.throws(() => g.parseArgs(['--root']), /needs a value/)
})

test('the guard: inside make() every clock and entropy read throws, and everything is restored after, even on a throw', () => {
  const reads: [string, () => unknown][] = [
    ['Math.random', () => Math.random()],
    ['Date.now', () => Date.now()],
    ['new Date()', () => new Date()],
    ['Date()', () => (Date as unknown as () => string)()],
    ['performance.now', () => performance.now()],
    ['crypto.getRandomValues', () => crypto.getRandomValues(new Uint8Array(1))],
    ['crypto.randomUUID', () => (crypto as unknown as { randomUUID(): string }).randomUUID()],
  ]
  for (const [name, read] of reads) assert.throws(() => g.withGuard(read), /inside make\(\)/, name)
  assert.equal(g.withGuard(() => new Date(0).toISOString()), '1970-01-01T00:00:00.000Z', 'a date from an argument reads no clock')
  assert.equal(g.withGuard(() => Date.UTC(2026, 0, 1)), Date.UTC(2026, 0, 1))
  for (const [name, read] of reads) assert.doesNotThrow(read, `${name} is restored`)
  assert.ok(new Date() instanceof Date)
})

test('discovery: the fixture first, then every family folder with an index.ts, core excluded', () => {
  const dirs = g.familyDirs(ROOT)
  assert.equal(dirs[0], 'core/fixture')
  assert.ok(!dirs.includes('core'))
  const reg = g.loadRegistry(ROOT)
  assert.equal(reg?.generators.get('GEN-negate-it'), 4)
  assert.ok(reg?.misconceptions.has('dp:Z1'))
  assert.ok(reg?.kcs.has('KC-1.violation-as-sat'))
  // Landing tasks: the spine's tasks and the tracker's refined ones (W3-T27 is the tracker's alone).
  assert.ok(reg?.tasks?.has('W1-T05') && reg.tasks.has('W3-T27') && reg.tasks.has('W0-S09'))
  assert.ok(g.trackerTasks(ROOT)?.has('W1-T21'))
  assert.equal(g.trackerTasks(join(ROOT, 'no-such-tree')), null)
})

test('ports: a family needs a port for every engine its live templates consult, never for a pending template\'s engine', async () => {
  const box = { run: async () => ({ verdict: { kind: 'sat' }, stats: { ms: 0 }, provenance: {} }) }
  const live = { id: 'GEN-x', engines: ['z3'], templates: [{ id: 't1' }, { id: 't2' }] }
  assert.equal(g.portFor(live, new Map()), undefined)
  assert.ok(g.portFor(live, new Map([['z3', box]])))
  const slice = { ...live, templates: [{ id: 't1' }, { id: 't2', pending: { engine: 'trace', lands: 'W3-T27' } }] }
  assert.ok(g.portFor(slice, new Map([['z3', box]])), 'the pending template\'s engine is not required')
  assert.equal(g.portFor({ ...slice, engines: ['z3', 'history'] }, new Map([['z3', box]])), undefined, 'a live template\'s engine without a port is')
  assert.equal(g.portFor({ ...slice, engines: [] }, new Map([['z3', box]])), undefined, 'a family that consults no engine gets no port')
  const port = g.portFor(live, new Map([['z3', box]]))
  await assert.rejects(port?.run({ engine: 'trace', version: '1', input: {}, budget: { wallMs: 1 } }) ?? Promise.resolve(), /no port for engine trace here/)
})

test('the report names each pending template and the task it lands with', () => {
  const report = { family: 'GEN-x', fixture: false, findings: [], notes: ['pending: t2 waits'], stats: { instances: 1, keyed: 1, discarded: {}, graded: 1, engineFree: false }, digest: null, pending: [{ template: 't2', engine: 'trace', lands: 'W3-T27' }] }
  const lines = g.formatReport({ reports: [report], findings: [], lint: { files: 1, findings: [] }, browsers: null, written: [] }, true)
  assert.match(lines.join('\n'), /ok {4}GEN-x .*; pending: t2 until W3-T27/)
  assert.match(lines.join('\n'), /note: pending: t2 waits/)
})

test('the lint walks the seeded paths of a tree and reports clocks, entropy and engine-dependent arithmetic', async () => {
  const tmp = mkdtempSync(join(tmpdir(), 'gate-generators-'))
  try {
    mkdirSync(join(tmp, 'packages', 'generators', 'src', 'planted'), { recursive: true })
    mkdirSync(join(tmp, 'packages', 'generators', 'test', 'planted'), { recursive: true })
    writeFileSync(join(tmp, 'packages', 'generators', 'src', 'planted', 'index.ts'), 'export const x = Math.random() + Date.now() + 2 ** 3\n')
    writeFileSync(join(tmp, 'packages', 'generators', 'test', 'planted', 'a.test.ts'), 'export const y = Math.random()\n')
    const r = await g.lintTree(tmp)
    assert.equal(r.files, 1, 'tests are out of scope')
    assert.equal(r.findings.length, 3)
    assert.ok(r.findings.every((f) => f.where.startsWith('packages/generators/src/planted/index.ts:1:')))
  } finally {
    rmSync(tmp, { recursive: true, force: true })
  }
  const real = await g.lintTree(ROOT)
  assert.deepEqual(real.findings, [], 'the seeded paths of this repository are clean')
  assert.ok(real.files > 10)
})

test('the gate is green on the fixture family, its self-check holds, and a usage error exits 2', async () => {
  // The fixture only: the course families' own tests run them, with the engine ports they need.
  const lines: string[] = []
  const io = { out: (s: string) => lines.push(s), err: (s: string) => lines.push(s) }
  assert.equal(await g.main(['--family', 'GEN-fixture'], io), 0, lines.join('\n'))
  assert.match(lines.at(-1) ?? '', /^GATE-generators: green/)
  lines.length = 0
  assert.equal(await g.main(['--self-check'], io), 0, lines.join('\n'))
  assert.match(lines.at(-1) ?? '', /self-check: green/)
  assert.equal(await g.main(['--nope'], io), 2)
  lines.length = 0
  assert.equal(await g.main(['--family', 'GEN-no-such-family'], io), 1)
  assert.match(lines.join('\n'), /no family GEN-no-such-family/)
})

test('a family lives in the folder its ID names, and no ID is defined twice', async () => {
  const tmp = mkdtempSync(join(tmpdir(), 'gate-generators-'))
  try {
    mkdirSync(join(tmp, 'packages', 'generators', 'src', 'misnamed'), { recursive: true })
    mkdirSync(join(tmp, 'packages', 'ids', 'src'), { recursive: true })
    symlinkSync(join(ROOT, 'packages', 'generators', 'src', 'core'), join(tmp, 'packages', 'generators', 'src', 'core'))
    copyFileSync(join(ROOT, 'packages', 'ids', 'src', 'registry.json'), join(tmp, 'packages', 'ids', 'src', 'registry.json'))
    const fixture = join(ROOT, 'packages', 'generators', 'src', 'core', 'fixture', 'index.ts')
    writeFileSync(join(tmp, 'packages', 'generators', 'src', 'misnamed', 'index.ts'), `export { generator, ports } from ${JSON.stringify(fixture)}\n`)
    const lines: string[] = []
    const code = await g.main(['--root', tmp, '--key-seeds', '2'], { out: (x) => lines.push(x), err: (x) => lines.push(x) })
    const text = lines.join('\n')
    assert.equal(code, 1)
    assert.match(text, /defines GEN-fixture, but a family lives in packages\/generators\/src\/fixture\//)
    assert.match(text, /GEN-fixture is defined twice/)
  } finally {
    rmSync(tmp, { recursive: true, force: true })
  }
})

test('end to end: a family shaped like GEN-find-the-witness\'s W1 slice is green on its live template, and fails once a pending engine has a port', async () => {
  const tmp = mkdtempSync(join(tmpdir(), 'gate-generators-'))
  try {
    const dir = join(tmp, 'packages', 'generators', 'src', 'find-the-witness')
    mkdirSync(dir, { recursive: true })
    mkdirSync(join(tmp, 'packages', 'ids', 'src'), { recursive: true })
    mkdirSync(join(tmp, 'tracker'), { recursive: true })
    symlinkSync(join(ROOT, 'packages', 'generators', 'src', 'core'), join(tmp, 'packages', 'generators', 'src', 'core'))
    copyFileSync(join(ROOT, 'packages', 'ids', 'src', 'registry.json'), join(tmp, 'packages', 'ids', 'src', 'registry.json'))
    copyFileSync(join(ROOT, 'tracker', 'tasks.yaml'), join(tmp, 'tracker', 'tasks.yaml'))
    const core = join(ROOT, 'packages', 'generators', 'src', 'core', 'index.ts')
    const fixture = join(ROOT, 'packages', 'generators', 'src', 'core', 'fixture', 'index.ts')
    // The fixture's model-like template live; the spine's other three templates pending, each on its own engine.
    writeFileSync(
      join(dir, 'index.ts'),
      [
        `import { defineGenerator } from ${JSON.stringify(core)}`,
        `import { generator as fx, ports as fxPorts } from ${JSON.stringify(fixture)}`,
        'const [t1, t2, t3] = fx.templates',
        'export const generator = defineGenerator({',
        "  ...fx, id: 'GEN-find-the-witness', fixture: false, title: 'A W1 slice for the gate test',",
        "  templates: [t1, { ...t2, pending: { engine: 'trace', lands: 'W3-T27' } }, { ...t3, pending: { engine: 'history', lands: 'W4-T20' } }, { ...t3, id: 't4', name: 'state pair', pending: { engine: 'pairs', lands: 'W4-T28' } }],",
        "  make: (s, b, t) => ({ ...fx.make(s, b, t), family: 'GEN-find-the-witness' }),",
        '})',
        'export const ports = fxPorts',
        '',
      ].join('\n'),
    )
    const mod = (await import(pathToFileURL(join(dir, 'index.ts')).href)) as { generator: Generator }
    const d = familyDigest(mod.generator)
    assert.deepEqual(Object.keys(d.cells), ['t1/b1', 't1/b2', 't1/b3'])
    // A planted record: every engine is given Node's digest, as only a test may.
    const record = { schema: DETERMINISM_SCHEMA, family: d.family, core: CORE_REV, sample: DEFAULT_SAMPLE, seeds: d.seeds, cells: d.cells, digest: d.digest, engines: BROWSER_ENGINES.map((engine) => ({ engine, version: 'planted', digest: d.digest })), run: 'planted' }
    writeFileSync(join(dir, 'determinism.json'), `${JSON.stringify(record, null, 2)}\n`)
    const lines: string[] = []
    const io = { out: (x: string) => lines.push(x), err: (x: string) => lines.push(x) }
    assert.equal(await g.main(['--root', tmp, '--family', 'GEN-find-the-witness', '--key-seeds', '2'], io), 0, lines.join('\n'))
    assert.match(lines.join('\n'), /ok {4}GEN-find-the-witness .*; pending: t2 until W3-T27, t3 until W4-T20, t4 until W4-T28/)
    // A provider that now offers the trace engine: t2 may no longer stay pending.
    const provider = join(tmp, 'provider.mjs')
    writeFileSync(provider, `export const createPorts = async () => ({ trace: (await import(${JSON.stringify(pathToFileURL(fixture).href)})).boxPort })\n`)
    lines.length = 0
    assert.equal(await g.main(['--root', tmp, '--family', 'GEN-find-the-witness', '--key-seeds', '2', '--ports', provider], io), 1, lines.join('\n'))
    assert.match(lines.join('\n'), /FAIL {2}pending {2}GEN-find-the-witness {2}t2 is pending on trace, but a port for trace is here/)
  } finally {
    rmSync(tmp, { recursive: true, force: true })
  }
})
