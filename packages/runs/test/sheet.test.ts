import assert from 'node:assert/strict'
import { test } from 'node:test'
import { runChip, runSheet } from '../src/index.ts'
import type { RunLike } from '../src/index.ts'
import { loadRuns } from './helpers.ts'

const runs = loadRuns()
const get = (id: string): RunLike => runs.get(id) as RunLike

test('the run chip: id, engine, version and the day the run executed', () => {
  const chip = runChip(get('RUN-tlc-full'), '2026-10-24')
  assert.equal(chip.id, 'RUN-tlc-full')
  assert.equal(chip.engine, get('RUN-tlc-full').engine)
  assert.equal(chip.version, get('RUN-tlc-full').version)
  assert.equal(chip.date, '2026-10-24')
  assert.equal(chip.staleSince, null)
})

test('the chip of a run with a TTL shows "stale since" once the TTL has passed', () => {
  assert.equal(runChip(get('RUN-lean-asset'), '2026-12-22').staleSince, null)
  assert.equal(runChip(get('RUN-lean-asset'), '2026-12-23').staleSince, '2026-12-23')
})

test('the run sheet: commands, inputs, outputs, verdict lines and the command that re-executes the run', () => {
  const sheet = runSheet(get('RUN-tlc-full'), '2026-10-24')
  assert.equal(sheet.rerun, 'statespace run RUN-tlc-full')
  assert.ok(sheet.commands.length >= 1 && sheet.commands.every((c) => Array.isArray(c) && c.length > 0))
  assert.ok(sheet.outputs.every((o) => typeof o.path === 'string'))
  assert.deepEqual(sheet.verdictLines, get('RUN-tlc-full').verdict_lines)
  // A run of several commands keeps them in order (RUN-pg-catalog records a list of commands).
  const catalog = get('RUN-pg-catalog')
  assert.ok(Array.isArray(catalog.argv) && Array.isArray(catalog.argv[0]))
  assert.equal(runSheet(catalog, '2026-10-24').commands.length, catalog.argv.length)
  // An imported run with no argv has no commands, and says it was imported.
  const imported = runSheet(get('RUN-z3-starter'), '2026-10-24')
  assert.equal(imported.origin, get('RUN-z3-starter').origin ?? 'recorded')
})

test('every record on disk yields a chip and a sheet', () => {
  for (const [id, record] of runs) {
    const sheet = runSheet(record as RunLike, '2026-10-24')
    assert.equal(sheet.id, id)
    assert.ok(sheet.date === null || /^\d{4}-\d{2}-\d{2}$/.test(sheet.date), id)
  }
  assert.throws(() => runChip({ id: 'not-a-run' } as RunLike, '2026-10-24'))
})
