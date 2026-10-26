import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import { PLANTS, REPO } from './helpers.mjs'

// Apart from gate.test.mjs because it runs the gate over every planted fault through the command line, which takes
// seconds (page.test.mjs plants the same faults in process); the nightly lane runs the same command as its own step.
const SCRIPT = path.join(REPO, 'scripts', 'verify-lessons.mjs')
const run = (...args) => spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8', cwd: os.tmpdir() })

test('--self-check plants every fault in a scratch copy, and the gate catches each with every rule it names', () => {
  const r = run('--self-check')
  assert.equal(r.status, 0, r.stdout + r.stderr)
  const rules = new Set(PLANTS.flatMap((p) => p.rules)).size
  assert.match(r.stdout, new RegExp(`GATE-lessons self-check: all ${PLANTS.length} planted faults caught, each with every rule it names \\(${rules} rules\\); the copy corpora and the vocabulary matrix hold`))
  assert.doesNotMatch(r.stdout, /MISSED|BROKEN/)
  assert.match(r.stdout, /^held +corpus +fixtures\/copy\/lock\.txt: (\d+) of \1 rows as marked$/m)
  assert.match(r.stdout, /^held +corpus +fixtures\/copy\/pressure\.txt: (\d+) of \1 rows as marked$/m)
  assert.match(r.stdout, /^held +corpus +fixtures\/copy\/internal\.txt: (\d+) of \1 rows as marked$/m)
  assert.match(r.stdout, /^held +matrix +the lock rule's vocabulary in each frame: (\d+) of \1 sentences flagged/m)
  for (const name of ['a graded item without a family', 'an answer in the rail', 'a seventh block type', 'lock copy', 'an internal name']) assert.match(r.stdout, new RegExp(`caught +\\S+ +${name} \\[`))
  // one line for each plant, in the plants' order, with the rules it names
  const lines = r.stdout.split('\n').filter((l) => /^(?:caught|MISSED) /.test(l))
  assert.deepEqual(lines.map((l) => /^caught +\S+ +(.*) \[(.*)\]$/.exec(l)?.slice(1)), PLANTS.map((p) => [p.name, p.rules.join(', ')]))
})
