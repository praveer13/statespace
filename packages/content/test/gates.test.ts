import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { after, test } from 'node:test'
import { REPO, fixture } from './helpers.ts'

// The source format keeps learner copy out of code fences because GATE-numbers and GATE-runs skip fenced blocks.
// These tests run the two gates over a lesson in this format and show that the copy inside its blocks is read.

const made: string[] = []
after(() => {
  for (const d of made) rmSync(d, { recursive: true, force: true })
})

function tree(lesson: string): string {
  const root = mkdtempSync(join(tmpdir(), 'content-gates-'))
  made.push(root)
  mkdirSync(join(root, 'content/stages/S1'), { recursive: true })
  writeFileSync(join(root, 'content/stages/S1/S1.L1.md'), lesson)
  mkdirSync(join(root, 'runs'), { recursive: true })
  cpSync(join(REPO, 'runs/RUN-z3-starter.json'), join(root, 'runs/RUN-z3-starter.json'))
  // GATE-runs hashes the files a record names, so the tree carries them
  const record = JSON.parse(readFileSync(join(REPO, 'runs/RUN-z3-starter.json'), 'utf8')) as { inputs?: Array<{ path?: string }>; outputs?: Array<{ path?: string }> }
  for (const f of [...(record.inputs ?? []), ...(record.outputs ?? [])]) {
    if (f.path === undefined || f.path.startsWith('<')) continue
    mkdirSync(dirname(join(root, f.path)), { recursive: true })
    cpSync(join(REPO, f.path), join(root, f.path))
  }
  return root
}

const gate = (script: string, root: string): { status: number | null; out: string } => {
  const r = spawnSync(process.execPath, [join(REPO, 'scripts', script), '--root', root], { encoding: 'utf8' })
  return { status: r.status, out: r.stdout + r.stderr }
}

test('GATE-numbers reads the copy inside a block, and passes the fixture lesson', () => {
  const clean = gate('verify-numbers.mjs', tree(fixture('lessons/S1.L1.md')))
  assert.equal(clean.status, 0, clean.out)
  const planted = fixture('lessons/S1.L1.md').replace('A transfer of 1 from an account holding 0 passes every premise.', 'Z3 5.3.1 returned sat with 12 distinct states.')
  const bad = gate('verify-numbers.mjs', tree(planted))
  assert.equal(bad.status, 1, bad.out)
  assert.match(bad.out, /content\/stages\/S1\/S1\.L1\.md:\d+ {2}untagged version "Z3 5\.3\.1" in learner copy: "why: Z3 5\.3\.1 returned sat/)
  assert.match(bad.out, /untagged count "12 distinct states"/)
})

test('GATE-numbers lets a number pass when its sentence carries a run reference', () => {
  const tagged = fixture('lessons/S1.L1.md').replace('A transfer of 1 from an account holding 0 passes every premise.', 'Z3 5.3.1 returned sat on this query [X RUN-z3-starter].')
  assert.equal(gate('verify-numbers.mjs', tree(tagged)).status, 0)
})

test('GATE-runs reads a reference inside a block, in a draft and in a final page', () => {
  const draftWaits = fixture('lessons/S1.L1.md').replace('A transfer of 1 from an account holding 0 passes every premise.', 'Later {{run:RUN-z3-boot-variant}} says so.')
  assert.equal(gate('verify-runs.mjs', tree(draftWaits)).status, 0, 'a draft may wait for its run')
  const final = draftWaits.replace('draft: true', 'draft: false')
  const r = gate('verify-runs.mjs', tree(final))
  assert.equal(r.status, 1, r.out)
  assert.match(r.out, /S1\.L1\.md:\d+:\d+: {{run:RUN-z3-boot-variant}} does not resolve.*not labeled draft/)
})
