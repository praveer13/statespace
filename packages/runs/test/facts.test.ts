import assert from 'node:assert/strict'
import { join } from 'node:path'
import { test } from 'node:test'
import { addDays, checkErrata, checkFacts, dateOf, daysBetween, ERRATA_FORMAT, expiredTtls, FACTS_FORMAT, isPartialDate, isRealDate, recheckFlags, runStaleness, staleness, staleSince } from '../src/index.ts'
import type { Erratum, Fact, RegistryContext } from '../src/index.ts'
import { fileReader, loadRuns, readJson, ROOT } from './helpers.ts'

const ctx = (today = '2026-10-24', runs = new Map<string, unknown>()): RegistryContext => ({ today, runs, file: () => null })

test('dates', () => {
  assert.ok(isRealDate('2026-10-24'))
  assert.ok(!isRealDate('2026-02-30'))
  assert.ok(!isRealDate('2026-10-24T00:00:00Z'))
  assert.ok(isPartialDate('2010') && isPartialDate('2025-11') && isPartialDate('2010-08-15'))
  assert.ok(!isPartialDate('2025-13') && !isPartialDate('25-11'))
  assert.equal(addDays('2026-10-23', 60), '2026-12-22')
  assert.equal(addDays('2026-12-31', 1), '2027-01-01')
  assert.equal(daysBetween('2026-10-23', '2026-12-22'), 60)
  assert.equal(dateOf('2026-10-24T14:16:02.311Z'), '2026-10-24')
  assert.equal(dateOf('2026-10-21'), '2026-10-21')
  assert.equal(dateOf(null), null)
  assert.equal(dateOf('yesterday'), null)
})

test('the clock: checked on 2026-10-23 with 60 days, stale since 2026-12-22 (docs/LANDSCAPE.md section 6.2)', () => {
  assert.equal(staleSince('2026-10-23', 60, '2026-12-21'), null)
  assert.equal(staleSince('2026-10-23', 60, '2026-12-22'), '2026-12-22')
  assert.equal(staleSince('2026-10-23', 90, '2027-01-20'), null)
  assert.equal(staleSince('2026-10-23', 90, '2027-01-21'), '2027-01-21')
  assert.deepEqual(staleness('2026-10-23', 60, '2027-01-01'), { anchor: '2026-10-23', ttl_days: 60, expires: '2026-12-22', stale: true, age_days: 70 })
})

test("a run's clock: its execution date plus ttl_days; none without ttl_days", () => {
  const asset = loadRuns().get('RUN-lean-asset')
  const s = runStaleness(asset, '2026-12-23')
  assert.equal(s?.anchor, '2026-10-24')
  assert.equal(s?.expires, '2026-12-23')
  assert.equal(s?.stale, true)
  assert.equal(runStaleness(asset, '2026-12-22')?.stale, false)
  assert.equal(runStaleness(loadRuns().get('RUN-tlc-full'), '2030-01-01'), null)
  assert.equal(runStaleness({ ttl_days: 60, started_at: null, recorded_at: '2026-10-01T10:00:00Z' }, '2026-12-01')?.expires, '2026-11-30')
})

test('the committed registry is well formed, and its saved copies still hold their quotes', () => {
  const runs = loadRuns()
  const facts = checkFacts(readJson(join(ROOT, 'content/registry/facts.json')), { today: '2026-10-24', runs, file: fileReader() })
  assert.deepEqual(facts.issues, [])
  assert.ok(facts.facts.length >= 10)
  const errata = checkErrata(readJson(join(ROOT, 'content/registry/errata.json')), { today: '2026-10-24', runs, file: fileReader(), facts: new Map(facts.facts.map((f) => [f.id, f])) })
  assert.deepEqual(errata.issues, [])
  // Every tool fact of the seed goes stale on 2026-12-22; nothing is stale the day after the check.
  assert.deepEqual(expiredTtls(facts.facts, runs, '2026-10-24'), [])
  const later = expiredTtls(facts.facts, runs, '2026-12-22').filter((x) => x.kind === 'fact')
  assert.equal(later.length, facts.facts.filter((f) => f.kind === 'tool').length)
  assert.ok(later.every((x) => x.staleness.expires === '2026-12-22'))
})

const tool = (over: Partial<Fact> & Record<string, unknown> = {}): Record<string, unknown> => ({
  id: 'tool.example.latest',
  kind: 'tool',
  statement: 'Example 1.0 is the latest release.',
  source: { url: 'https://example.org/releases', title: 'Example releases' },
  checked_at: '2026-10-23',
  ttl_days: 60,
  ...over,
})
const issuesOf = (facts: unknown[], c = ctx()) => checkFacts({ format: FACTS_FORMAT, facts }, c).issues.map((i) => `${i.id}: ${i.detail}`)

test('tool facts: a source, a check date that has happened, a TTL of 60 to 90 days', () => {
  assert.deepEqual(issuesOf([tool()]), [])
  assert.deepEqual(issuesOf([tool({ ttl_days: 90 })]), [])
  assert.match(issuesOf([tool({ ttl_days: 59 })]).join(), /from 60 to 90/)
  assert.match(issuesOf([tool({ ttl_days: 91 })]).join(), /from 60 to 90/)
  assert.match(issuesOf([tool({ ttl_days: 60.5 })]).join(), /whole number/)
  assert.match(issuesOf([tool({ checked_at: '2026-10-26' })]).join(), /in the future/)
  assert.deepEqual(issuesOf([tool({ checked_at: '2026-10-25' })]), []) // a day of slack for time zones
  assert.match(issuesOf([tool({ date: '2026-10-12' })]).join(), /date belongs to the dated kinds/)
  assert.match(issuesOf([tool({ source: { url: 'https://example.org', title: '' } })]).join(), /source\.title/)
  assert.match(issuesOf([tool({ value: '' })]).join(), /value, when present/)
  assert.deepEqual(issuesOf([tool({ value: '1.0' })]), [])
  assert.match(issuesOf([tool({ value: '1.1' })]).join(), /statement does not state its value, 1\.1/)
  assert.match(issuesOf([tool(), tool()]).join(), /a second fact with this id/)
})

test('dated facts state their own date and never have a TTL', () => {
  const incident = { id: 'incident.example', kind: 'incident', statement: 'An incident.', source: { url: 'https://example.org/i', title: 'Report' }, date: '2020-06-12' }
  assert.deepEqual(issuesOf([incident]), [])
  assert.match(issuesOf([{ ...incident, ttl_days: 60 }]).join(), /has no TTL/)
  assert.match(issuesOf([{ ...incident, date: undefined }]).join(), /date must be the date/)
  assert.match(issuesOf([{ ...incident, date: '2027' }]).join(), /in the future/)
  assert.deepEqual(issuesOf([{ ...incident, kind: 'quotation', date: '2025-12' }]), [])
})

test("twins: the pin lives in a run with a 60-day TTL, and the twin follows the run's clock", () => {
  const pins = { id: 'RUN-twin-pins', started_at: '2026-10-24', ttl_days: 60, values: { pins: { x: 'abc1234' } } }
  const twin = { id: 'twin.example.repo', kind: 'twin', statement: 'A twin.', source: { url: 'https://example.org/repo', title: 'Repo' }, run: 'RUN-twin-pins', pin: 'values.pins.x' }
  const runs = new Map<string, unknown>([['RUN-twin-pins', pins]])
  assert.deepEqual(issuesOf([twin], ctx('2026-10-24', runs)), [])
  assert.match(issuesOf([twin]).join(), /is not on disk/)
  assert.match(issuesOf([{ ...twin, pin: 'values.pins' }], ctx('2026-10-24', runs)).join(), /not one pin/)
  assert.match(issuesOf([twin], ctx('2026-10-24', new Map([['RUN-twin-pins', { ...pins, ttl_days: 90 }]]))).join(), /must carry ttl_days 60/)
  assert.match(issuesOf([{ ...twin, ttl_days: 60 }], ctx('2026-10-24', runs)).join(), /keeps its clock in its run/)
  const [f] = checkFacts({ format: FACTS_FORMAT, facts: [twin] }, ctx('2026-12-23', runs)).facts
  const expired = expiredTtls([f as Fact], runs, '2026-12-23')
  assert.deepEqual(
    expired.map((x) => [x.kind, x.id, x.staleness.expires, x.via ?? null]),
    [
      ['fact', 'twin.example.repo', '2026-12-23', 'RUN-twin-pins'],
      ['run', 'RUN-twin-pins', '2026-12-23', null],
    ],
  )
})

test('evidence: the saved copy keeps its SHA-256 and holds the quote', () => {
  const runs = loadRuns()
  const pyodide = (readJson(join(ROOT, 'content/registry/facts.json')) as { facts: Array<Record<string, unknown>> }).facts.find((f) => f.id === 'tool.pyodide.latest')
  assert.ok(pyodide)
  const c = { today: '2026-10-24', runs, file: fileReader() }
  assert.deepEqual(issuesOf([pyodide], c), [])
  const src = pyodide.source as Record<string, unknown>
  assert.match(issuesOf([{ ...pyodide, source: { ...src, quote: '"latest":"999.0.0"' } }], c).join(), /does not occur in research\/evidence\/A5v2\/npm-pyodide\.json/)
  assert.match(issuesOf([{ ...pyodide, evidence: { path: 'research/evidence/A5v2/npm-pyodide.json', sha256: '0'.repeat(64) } }], c).join(), /has SHA-256/)
  assert.match(issuesOf([{ ...pyodide, evidence: { path: '../outside.json', sha256: '0'.repeat(64) } }], c).join(), /a repository path/)
})

const erratum = (over: Partial<Erratum> & Record<string, unknown> = {}): Record<string, unknown> => ({
  id: '2026-11-20-example',
  date: '2026-11-20',
  kind: 'changed',
  lessons: ['S6.L2'],
  title: 'An example',
  before: 'The old sentence.',
  after: 'The new sentence.',
  ...over,
})

test('errata: the format, and supersedes that never loops', () => {
  const c = { ...ctx('2026-11-21'), facts: new Map<string, Fact>() }
  const issues = (errata: unknown[]) => checkErrata({ format: ERRATA_FORMAT, errata }, c).issues.map((i) => `${i.id}: ${i.detail}`)
  assert.deepEqual(issues([erratum()]), [])
  assert.match(issues([erratum({ lessons: ['S6'] })]).join(), /not a lesson ID/)
  assert.match(issues([erratum({ before: 'x'.repeat(241) })]).join(), /at most 240/)
  assert.match(issues([erratum({ why: Array(41).fill('word').join(' ') })]).join(), /over 40 words/)
  assert.match(issues([erratum({ date: '2026-11-23', id: '2026-11-23-example' })]).join(), /in the future/)
  const a = erratum({ id: '2026-11-20-a', supersedes: '2026-11-20-b' })
  const b = erratum({ id: '2026-11-20-b', supersedes: '2026-11-20-a' })
  assert.match(issues([a, b]).join(), /forms a loop/)
  assert.match(issues([erratum({ id: '2026-11-20-a', supersedes: '2026-11-20-a' })]).join(), /supersedes itself/)
})

test('re-check flags: an erratum flags a lesson the learner finished on or before its date; a newer erratum replaces the one it supersedes', () => {
  const older = erratum({ id: '2026-11-20-old', date: '2026-11-20', lessons: ['S6.L2', 'S6.L3'] }) as unknown as Erratum
  const newer = erratum({ id: '2026-12-01-new', date: '2026-12-01', lessons: ['S6.L2'], supersedes: '2026-11-20-old' }) as unknown as Erratum
  const finished = new Map([
    ['S6.L2', '2026-11-01'],
    ['S6.L3', '2026-11-25'],
  ])
  assert.deepEqual(recheckFlags([older], finished), [{ erratum: '2026-11-20-old', lesson: 'S6.L2', date: '2026-11-20' }])
  assert.deepEqual(recheckFlags([older, newer], finished), [{ erratum: '2026-12-01-new', lesson: 'S6.L2', date: '2026-12-01' }])
  assert.deepEqual(recheckFlags([older], new Map()), [])
})
