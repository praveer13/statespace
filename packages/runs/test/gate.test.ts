// GATE-facts as CI runs it, on the fixtures that state the task's two acceptance criteria (W0-T08).

import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { join } from 'node:path'
import { test } from 'node:test'
import { FIXTURES, ROOT } from './helpers.ts'

interface Report {
  findings: Array<{ check: string; where: string; detail: string }>
  warnings: Array<{ check: string; where: string; detail: string }>
}

const gate = (root: string, today: string): { status: number | null; report: Report } => {
  const r = spawnSync(process.execPath, [join(ROOT, 'scripts', 'verify-facts.mjs'), '--root', root, '--today', today, '--json'], { encoding: 'utf8' })
  return { status: r.status, report: JSON.parse(r.stdout) as Report }
}

test('GATE-facts fails on a fixture sentence whose tagged value disagrees with its run', () => {
  const { status, report } = gate(join(FIXTURES, 'disagree'), '2026-10-24')
  assert.equal(status, 1)
  assert.equal(report.findings.length, 1)
  assert.equal(report.findings[0]?.where, 'docs/fixture.md:5')
  assert.match(report.findings[0]?.detail ?? '', /which is 11; it states "212 distinct states"/)
  const control = gate(join(FIXTURES, 'agree'), '2026-10-24')
  assert.equal(control.status, 0)
  assert.deepEqual(control.report.findings, [])
})

test('GATE-facts warns on an expired-TTL fixture without failing', () => {
  const fresh = gate(join(FIXTURES, 'ttl'), '2026-10-24')
  assert.equal(fresh.status, 0)
  assert.deepEqual(fresh.report.warnings, [])
  const expired = gate(join(FIXTURES, 'ttl'), '2026-12-23')
  assert.equal(expired.status, 0)
  assert.deepEqual(expired.report.findings, [])
  assert.deepEqual(expired.report.warnings.map((w) => w.where).sort(), [
    'content/registry/facts.json tool.pyodide.latest',
    'content/registry/facts.json twin.lean4.toolchain',
    'runs/RUN-lean-asset.json',
    'runs/RUN-twin-pins.json',
  ])
  assert.ok(expired.report.warnings.every((w) => w.check === 'ttl' && /stale since 2026-12-2[23]/.test(w.detail)))
})

test('GATE-facts is green on the repository today', () => {
  const r = spawnSync(process.execPath, [join(ROOT, 'scripts', 'verify-facts.mjs'), '--json'], { encoding: 'utf8' })
  const report = JSON.parse(r.stdout) as Report
  assert.deepEqual(report.findings, [])
  assert.equal(r.status, 0)
})
