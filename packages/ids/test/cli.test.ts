// The two scripts as a user runs them: exit codes, output, and which directories are read.

import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { after, test } from 'node:test'
import { checkLinks } from '../src/check.ts'
import { loadInputs } from '../../../scripts/verify-links.mjs'
import { edit, ROOT } from './helpers.ts'

const dirs: string[] = []
after(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true })
})

/**
 * A scratch tree holding only the files that the gate requires (the spine, EVIDENCE.md, tasks.yaml, the
 * tracker's checklist) and the committed registry, so that a test sees the gate's behavior and not the
 * state of the other documents. The tracker owns every catalog ID in it, and any ID that those files
 * mention without the spine registering it is listed as a proposal, so the gate is green on it.
 */
function tree(): string {
  const dir = scratch('ids-gate-')
  for (const p of ['docs/spine/SPINE.md', 'docs/EVIDENCE.md', 'docs/TRACKER.md', 'tracker/tasks.yaml', 'packages/ids/src']) {
    mkdirSync(dirname(join(dir, p)), { recursive: true })
    cpSync(join(ROOT, p), join(dir, p), { recursive: true })
  }
  // Idempotent: a task implementing SCR-instrument twice is harmless.
  edit(dir, 'tracker/tasks.yaml', (t) => t.replace(/implements: \["/, 'implements: ["SCR-instrument", "'))
  const inputs = loadInputs(dir)
  if ('missing' in inputs || 'invalid' in inputs) throw new Error('the scratch tree is incomplete')
  const open = [...new Set(checkLinks(inputs).failures.filter((f) => f.check === 'unresolved').map((f) => f.id))]
  put(dir, 'packages/ids/proposals.json', `${JSON.stringify({ proposals: open.map((id) => ({ id })) })}\n`)
  return dir
}

/** The tree plus a document that mentions one more proposed ID, and the proposals file that lists it. */
function treeWithProposal(): string {
  const dir = tree()
  put(dir, 'docs/proposed.md', 'The spec proposes CL-9.99 for later.\n')
  const file = join(dir, 'packages/ids/proposals.json')
  const listed = JSON.parse(readFileSync(file, 'utf8')) as { proposals: { id: string }[] }
  listed.proposals.push({ id: 'CL-9.99' })
  writeFileSync(file, `${JSON.stringify(listed)}\n`)
  return dir
}

function scratch(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix))
  dirs.push(dir)
  return dir
}

const run = (name: string, args: string[]): { status: number | null; out: string; err: string } => {
  const r = spawnSync(process.execPath, [join(ROOT, 'scripts', name), ...args], { encoding: 'utf8' })
  return { status: r.status, out: r.stdout, err: r.stderr }
}
const put = (dir: string, path: string, text: string): void => {
  mkdirSync(dirname(join(dir, path)), { recursive: true })
  writeFileSync(join(dir, path), text)
}

test('verify-links exits 0 on a consistent tree', () => {
  const dir = tree()
  const r = run('verify-links.mjs', ['--root', dir])
  assert.equal(r.status, 0, r.out + r.err)
  assert.match(r.out, /^GATE-links: green/m)
})

test('a pending proposal is reported and does not fail the gate', () => {
  const r = run('verify-links.mjs', ['--root', treeWithProposal()])
  assert.equal(r.status, 0, r.out + r.err)
  assert.match(r.out, /^GATE-links: green \(\d+ pending proposal\(s\)\)$/m)
  assert.match(r.out, /PENDING {2}\d+ proposed ID\(s\), not failures until `--strict`/)
  assert.match(r.out, /CL-9\.99 {2}1 place\(s\): docs\/proposed\.md:1:19 /)
})

test('--strict fails while proposals remain, and names each one', () => {
  const r = run('verify-links.mjs', ['--strict', '--root', treeWithProposal()])
  assert.equal(r.status, 1)
  assert.match(r.out, /FAIL {2}proposed {2}docs\/proposed\.md:1:19 {2}CL-9\.99 is proposed, not registered in the spine yet \(packages\/ids\/proposals\.json\)/)
  assert.match(r.out, /^GATE-links: FAIL \(\d+ finding\(s\)\)$/m)
})

test('without the proposals file, a proposed ID is an ordinary failure (the gate falls back to the spine)', () => {
  const dir = treeWithProposal()
  rmSync(join(dir, 'packages/ids/proposals.json'))
  const r = run('verify-links.mjs', ['--root', dir])
  assert.equal(r.status, 1)
  assert.match(r.out, /FAIL {2}unresolved {2}docs\/proposed\.md:1:19 {2}CL-9\.99 is not a registered claim-template ID/)
})

test('IDs are resolved in docs, curriculum, labs, content, tracker and design; v1 history is exempt', () => {
  const dir = tree()
  const bad: Record<string, string> = {
    'docs/extra.md': 'See S1.L77.',
    'curriculum/extra.md': 'See KC-3.nope.',
    'labs/extra.md': 'See LAB-2.c88.',
    'content/stages/S1/extra.yaml': 'kc: KC-1.nothing-here\n',
    'tracker/extra.md': 'See W2-T88.',
    'design/artboards/new-sheet.html': '<p>SCR-nowhere</p>',
    'docs/history/v1/old.md': 'v1 wrote S1.L77, SP-1.99, LAB-2.c88.',
    'design/canvas/old.html': '<p>CL-9.9 in v1 form</p>',
  }
  for (const [path, text] of Object.entries(bad)) put(dir, path, text)
  const r = run('verify-links.mjs', ['--root', dir])
  assert.equal(r.status, 1)
  for (const id of ['S1.L77', 'KC-3.nope', 'LAB-2.c88', 'KC-1.nothing-here', 'W2-T88', 'SCR-nowhere']) {
    assert.match(r.out, new RegExp(`FAIL {2}unresolved .*${id.replace(/[.]/g, '\\.')} is not a registered`), id)
  }
  assert.doesNotMatch(r.out, /docs\/history|design\/canvas|SP-1\.99|CL-9\.9/)
})

test('a mistyped ID used in several places is one finding with its places', () => {
  const dir = tree()
  put(dir, 'docs/many.md', 'S1.L77\n\nS1.L77 again\n\nS1.L77 once more\n')
  const r = run('verify-links.mjs', ['--root', dir])
  assert.match(r.out, /FAIL {2}unresolved {2}S1\.L77 is not a registered lesson ID {2}\[3 places: docs\/many\.md:1:1, docs\/many\.md:3:1, docs\/many\.md:5:1\]/)
})

test('--json prints the findings and the same exit status', () => {
  const dir = tree()
  put(dir, 'docs/extra.md', 'See S1.L77.')
  const r = run('verify-links.mjs', ['--json', '--root', dir])
  assert.equal(r.status, 1)
  const j = JSON.parse(r.out) as { ok: boolean; failures: { check: string; file: string; line: number; col: number; id: string }[]; pending: unknown[]; stats: { files: number } }
  assert.equal(j.ok, false)
  assert.deepEqual(j.failures.map((f) => [f.check, f.file, f.line, f.col, f.id]), [['unresolved', 'docs/extra.md', 1, 5, 'S1.L77']])
  assert.ok(j.stats.files > 0)
})

test('an unreadable required file is exit 2, not a pass', () => {
  const dir = tree()
  rmSync(join(dir, 'docs/spine/SPINE.md'))
  const r = run('verify-links.mjs', ['--root', dir])
  assert.equal(r.status, 2)
  assert.match(r.err, /cannot read docs\/spine\/SPINE\.md/)
  assert.equal(run('verify-links.mjs', ['--nonsense']).status, 2)
})

test('a proposals file that is not valid is exit 2, not a pass', () => {
  const dir = tree()
  put(dir, 'packages/ids/proposals.json', '{ not json')
  const bad = run('verify-links.mjs', ['--root', dir])
  assert.equal(bad.status, 2)
  assert.match(bad.err, /packages\/ids\/proposals\.json is not valid JSON/)
  put(dir, 'packages/ids/proposals.json', '{"proposals": {"id": "CL-2.6"}}')
  const shape = run('verify-links.mjs', ['--root', dir])
  assert.equal(shape.status, 2)
  assert.match(shape.err, /must be \{"proposals": \[/)
})

// ---------------------------------------------------------------- build-ids

function spineOnly(prefix: string): string {
  const dir = scratch(prefix)
  for (const p of ['docs/spine/SPINE.md', 'docs/EVIDENCE.md']) {
    mkdirSync(dirname(join(dir, p)), { recursive: true })
    cpSync(join(ROOT, p), join(dir, p))
  }
  return dir
}

test('build-ids writes the registry and the types, and --check agrees afterwards', () => {
  const dir = spineOnly('ids-build-')
  assert.equal(run('build-ids.mjs', ['--check', '--root', dir]).status, 1, 'nothing is written yet')
  const w = run('build-ids.mjs', ['--root', dir])
  assert.equal(w.status, 0, w.err)
  assert.match(w.out, /wrote packages\/ids\/src\/registry\.json and packages\/ids\/src\/index\.ts \(\d+ entries\)/)
  assert.ok(existsSync(join(dir, 'packages/ids/src/registry.json')) && existsSync(join(dir, 'packages/ids/src/index.ts')))
  assert.equal(run('build-ids.mjs', ['--check', '--root', dir]).status, 0)
  // the files written are the files committed to this repository
  for (const f of ['registry.json', 'index.ts']) {
    assert.equal(readFileSync(join(dir, 'packages/ids/src', f), 'utf8'), readFileSync(join(ROOT, 'packages/ids/src', f), 'utf8'), f)
  }
  // a spine edit makes the committed files stale
  edit(dir, 'docs/spine/SPINE.md', (t) => t.replace('| M-prequestion |', '| M-prequestion-renamed |'))
  const c = run('build-ids.mjs', ['--check', '--root', dir])
  assert.equal(c.status, 1)
  assert.match(c.err, /packages\/ids\/src\/registry\.json is out of date; run `node scripts\/build-ids\.mjs`/)
})

test('build-ids --against fails when an ID of an earlier revision is gone or names another kind, and not when IDs are added or fields change', () => {
  const dir = spineOnly('ids-against-')
  type Reg = { entries: { id: string; kind: string; section: string; src: string }[] }
  const committed = JSON.parse(readFileSync(join(ROOT, 'packages/ids/src/registry.json'), 'utf8')) as Reg
  const earlier = (fn: (r: Reg) => void): string => {
    const copy = structuredClone(committed)
    fn(copy)
    const path = join(dir, 'earlier.json')
    writeFileSync(path, JSON.stringify(copy))
    return path
  }
  const same = run('build-ids.mjs', ['--root', dir, '--against', earlier(() => undefined)])
  assert.equal(same.status, 0, same.err)
  assert.match(same.out, /0 added, 0 removed, 0 retyped, 0 changed/)
  const removedLater = run('build-ids.mjs', ['--root', dir, '--against', earlier((r) => void r.entries.push({ id: 'M-was-here', kind: 'mechanic', section: '7', src: 'spine' }))])
  assert.equal(removedLater.status, 1)
  assert.match(removedLater.err, /removed: M-was-here/)
  const addedSince = run('build-ids.mjs', ['--root', dir, '--against', earlier((r) => void r.entries.splice(r.entries.findIndex((e) => e.id === 'M-call-it'), 1))])
  assert.equal(addedSince.status, 0)
  assert.match(addedSince.out, /1 added, 0 removed, 0 retyped, 0 changed/)
  const retyped = run('build-ids.mjs', [
    '--root',
    dir,
    '--against',
    earlier((r) => {
      const e = r.entries.find((x) => x.id === 'S1.L1')
      if (e) e.kind = 'stage'
    }),
  ])
  assert.equal(retyped.status, 1)
  assert.match(retyped.err, /retyped: S1\.L1 now names another kind of thing/)
  const retitled = run('build-ids.mjs', [
    '--root',
    dir,
    '--against',
    earlier((r) => {
      const e = r.entries.find((x) => x.id === 'S1.L1') as { title?: string } | undefined
      if (e) e.title = 'An earlier title'
    }),
  ])
  assert.equal(retitled.status, 0, 'a changed title is not a changed ID')
  assert.match(retitled.out, /0 added, 0 removed, 0 retyped, 1 changed \(fields only\)/)
})

test('build-ids refuses to write a registry from a spine whose tables no longer parse', () => {
  const dir = scratch('ids-broken-')
  put(dir, 'docs/spine/SPINE.md', '# empty spine\n')
  cpSync(join(ROOT, 'docs/EVIDENCE.md'), join(dir, 'docs/EVIDENCE.md'))
  const r = run('build-ids.mjs', ['--root', dir])
  assert.equal(r.status, 1)
  assert.match(r.err, /expected 1 table\(s\) for "invariants", found 0/)
  assert.ok(!existsSync(join(dir, 'packages/ids/src/registry.json')), 'nothing written')
})
