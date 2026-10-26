import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { test } from 'node:test'
import { REPO } from './helpers.ts'

interface Report {
  report: { lessons: number; drawers: number; stages: number; labs: number }
  problems: Array<{ severity: string; code: string; file: string | null; line: number | null; message: string }>
}

// The other tests of this package build fixtures. This one builds the repository's own content/: every lesson and
// drawer (Markdown, which GATE-schema does not read), every stage and lab file, against the schema, the ID registry
// and the run records, exactly as `node scripts/build-content.mjs --check` does on a developer's machine. The lane's
// unit-tests step runs every package's tests, so a content file that the build rejects fails the fast lane here, in
// the commit that adds it. (A stage or lab file is also read by GATE-schema, in TypeScript and in Python.)
test("the repository's own content passes the content build's checks", () => {
  const r = spawnSync(process.execPath, [`${REPO}scripts/build-content.mjs`, '--check', '--json'], { encoding: 'utf8', cwd: REPO, maxBuffer: 64 * 1024 * 1024 })
  let out: Report
  try {
    out = JSON.parse(r.stdout) as Report
  } catch {
    assert.fail(`the content build did not print a report (exit ${r.status ?? r.signal ?? 'unknown'}): ${`${r.stdout}${r.stderr}`.slice(0, 2000)}`)
  }
  // the findings first, one to a line, as the build prints them: this is what an author reads
  const errors = out.problems.filter((p) => p.severity === 'error')
  assert.deepEqual(
    errors.map((p) => `${p.file ?? '(build)'}${p.line === null ? '' : `:${p.line}`} [${p.code}] ${p.message}`),
    [],
    "the content build reports errors in the repository's own content: run node scripts/build-content.mjs --check",
  )
  assert.equal(r.status, 0, r.stderr.slice(0, 2000))
  // it read the tree it was asked about: the report counts what the repository holds, which may be nothing yet
  const { lessons, drawers, stages, labs } = out.report
  for (const n of [lessons, drawers, stages, labs]) assert.ok(Number.isInteger(n) && n >= 0)
})
