// Tests of the learner-state fixture: it stays in the shapes the schemas publish, its hashes are the ones the rules give,
// its IDs are the registry's, and the committed file is what the generator writes.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { allIds } from '../../../packages/ids/src/grammar.ts'
import { parseYaml } from '../../../packages/ids/src/yaml-subset.ts'
import { statementHashOfBytes, validate } from '../../../packages/schema/src/index.ts'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO = join(HERE, '../../..')
const file = join(REPO, 'tests/fixtures/learner-state.json')
const fixture = JSON.parse(readFileSync(file, 'utf8'))
const registry = new Set(JSON.parse(readFileSync(join(REPO, 'packages/ids/src/registry.json'), 'utf8')).entries.map((e) => e.id))
const sha256 = (text) => createHash('sha256').update(text).digest('hex')

describe('the learner-state fixture', () => {
  test('says what it is', () => {
    assert.equal(fixture.format, 'learner-state/1')
    assert.equal(fixture.synthetic, true)
    assert.match(fixture.now, /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/)
  })

  test('every event is an event@1 record, with unique ids, in time order, within the fixture\'s week', () => {
    assert.ok(fixture.events.length >= 20)
    const ids = new Set()
    let last = ''
    for (const e of fixture.events) {
      const r = validate('event', e)
      assert.ok(r.ok, `${e.id}: ${JSON.stringify(r.issues?.slice(0, 2))}`)
      assert.ok(!ids.has(e.id), `${e.id} is used twice`)
      ids.add(e.id)
      assert.ok(e.at >= last, `${e.id} is out of order`)
      last = e.at
      assert.ok(e.at <= fixture.now, `${e.id} is after now`)
      assert.equal(e.at.slice(0, 10), e.day)
    }
  })

  test('it covers what the screens derive from: every confidence, both verdicts, three provenances, both exposures', () => {
    const has = (pred) => fixture.events.some(pred)
    for (const conf of ['guess', 'think', 'sure']) assert.ok(has((e) => e.conf === conf && e.ok === true), `${conf} and right`)
    assert.ok(has((e) => e.conf === 'guess' && e.ok === false), 'guess and wrong')
    assert.ok(has((e) => e.conf === 'sure' && e.ok === false), 'a sure-and-wrong call, which M-sure-wrong-returns reads')
    for (const p of ['own', 'assisted', 'agent']) assert.ok(has((e) => e.provenance === p), p)
    for (const x of ['seen', 'unseen']) assert.ok(has((e) => e.exposure === x), x)
    for (const k of ['call', 'item', 'lab-check', 'receipt-import', 'audit', 'note']) assert.ok(has((e) => e.kind === k), k)
  })

  test('every ID in it is in the registry', () => {
    const tokens = new Set(allIds(JSON.stringify({ events: fixture.events, mirror: fixture.mirror })))
    for (const id of tokens) {
      if (/^(?:RUN|SEAM|OD)-/.test(id) || registry.has(id)) continue
      assert.fail(`${id} is not in the registry`)
    }
    for (const needed of ['S1.L0', 'LAB-1.c4', 'GEN-negate-it', 'CL-1.1', 'CL-1.2', 'SEAM-1', 'SEAM-7']) assert.ok(tokens.has(needed) || registry.has(needed), needed)
  })

  test('the mirror holds claims, receipts and statements that validate and agree', async () => {
    const byPath = new Map(fixture.mirror.map((m) => [m.path, m]))
    for (const m of fixture.mirror) {
      assert.equal(typeof m.text, 'string', `${m.path}: every file is its text`)
      assert.equal(m.sha256, sha256(m.text), `${m.path}: the file's SHA-256`)
    }
    for (const m of fixture.mirror.filter((x) => x.kind === 'claim')) {
      assert.match(m.path, /^claims\/[a-z0-9-]+\.yaml$/)
      const claim = parseYaml(m.text)
      const r = validate('claim', claim)
      assert.ok(r.ok, `${m.path}: ${JSON.stringify(r.issues?.slice(0, 2))}`)
      assert.ok(byPath.has(claim.method.receipt), `${m.path} names a receipt the mirror lacks`)
      assert.ok(byPath.has(claim.statement.path), `${m.path} names a statement the mirror lacks`)
    }
    for (const m of fixture.mirror.filter((x) => x.kind === 'receipt')) {
      const receipt = JSON.parse(m.text)
      assert.ok(validate('receipt', receipt).ok, m.path)
      assert.equal(m.text, `${JSON.stringify(receipt, null, 2)}\n`, `${m.path}: the receipt is the pretty-printed file`)
      for (const s of receipt.statements) {
        const st = byPath.get(s.path)
        assert.ok(st, `${m.path} names ${s.path}, which the mirror lacks`)
        assert.equal(s.sha256, await statementHashOfBytes(Buffer.from(st.text, 'utf8')), `${s.path}: the statement hash a receipt records is the rule's`)
        assert.equal(st.statementHash, s.sha256)
      }
      for (const run of receipt.runs) assert.equal(run.verdict, 'unsat')
    }
  })

  test('each receipt-import event names a receipt of the mirror', () => {
    const hashes = new Set(fixture.mirror.filter((m) => m.kind === 'receipt').map((m) => m.sha256))
    const imports = fixture.events.filter((e) => e.kind === 'receipt-import')
    assert.equal(imports.length, hashes.size)
    for (const e of imports) assert.ok(hashes.has(e.ref.split(':')[1]), e.ref)
  })

  test('the committed file is what the generator writes', () => {
    const r = spawnSync(process.execPath, [join(HERE, 'fixtures/build-learner-state.mjs'), '--check'], { encoding: 'utf8' })
    assert.equal(r.status, 0, r.stderr)
  })
})
