#!/usr/bin/env node
// Builds GEN-anomaly-id's pool, packages/generators/src/anomaly-id/pool.ts, from the recorded histories of
// RUN-pg-catalog (content/pg-catalog/grid/t*-*.ndjson). Copy, never type: every value in the pool is parsed from the
// isolationtester block PostgreSQL 18.6 printed, verbatim, and each history keeps its id and block_sha256, so it can be
// found again in the recording. Outcomes and SQLSTATEs come from the same row (read from the server's log).
//
// Each step's SQL is matched against the grid's small step vocabulary (scripts/spikes/W0-S09/patterns.py) and becomes
// an op the history checker can replay; a history with a step outside it (the kv rows of retry-unique, the bigint
// cells of retry-overflow) is left out and counted. The pool keeps a deterministic, stratified sample per template,
// band and half, so the module stays small; the counts are printed and written into the module.
//
//   node packages/generators/tools/anomaly-id-pool.mjs [--per-stratum N]

import { createHash } from 'node:crypto'
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const GRID = join(ROOT, 'content/pg-catalog/grid')
const OUT = join(ROOT, 'packages/generators/src/anomaly-id/pool.ts')
const argPer = process.argv.indexOf('--per-stratum')
const PER = argPer > 0 ? Number(process.argv[argPer + 1]) : 4

const STEP_FORMS = [
  [/^BEGIN ISOLATION LEVEL (READ COMMITTED|REPEATABLE READ|SERIALIZABLE);$/, (m) => ({ k: 'begin', level: m[1] })],
  [/^COMMIT;$/, () => ({ k: 'commit' })],
  [/^CREATE TEMP TABLE seen ON COMMIT DROP AS SELECT bal FROM acct WHERE id = (\d+); SELECT bal FROM seen;$/, (m) => ({ k: 'seenBal', id: +m[1] })],
  [/^CREATE TEMP TABLE seen ON COMMIT DROP AS SELECT sum\(bal\) AS total FROM acct WHERE team = 1; SELECT total FROM seen;$/, () => ({ k: 'seenTeam' })],
  [/^CREATE TEMP TABLE seen ON COMMIT DROP AS SELECT a\.bal - coalesce\(\(SELECT sum\(h\.amt\) FROM holds h WHERE h\.acct = (\d+)\), 0\) AS avail FROM acct a WHERE a\.id = (\d+); SELECT avail FROM seen;$/, (m) => ({ k: 'seenAvail', id: +m[2] })],
  [/^UPDATE acct SET bal = bal - (\d+) WHERE id = (\d+) AND bal >= (\d+) RETURNING old\.bal AS old_bal, new\.bal AS new_bal;$/, (m) => ({ k: 'condDebit', amt: +m[1], id: +m[2], guard: +m[3] })],
  [/^UPDATE acct SET bal = \(SELECT bal FROM seen\) - (\d+) WHERE id = (\d+) AND \(SELECT bal FROM seen\) >= (\d+) RETURNING old\.bal AS old_bal, new\.bal AS new_bal;$/, (m) => ({ k: 'rmwDebit', amt: +m[1], id: +m[2], guard: +m[3] })],
  [/^UPDATE acct SET bal = bal - (\d+) WHERE id = (\d+) AND \(SELECT total FROM seen\) - (\d+) >= 0 RETURNING old\.bal AS old_bal, new\.bal AS new_bal;$/, (m) => ({ k: 'teamDebit', amt: +m[1], id: +m[2], guard: +m[3] })],
  [/^INSERT INTO holds SELECT (\d+), (\d+) WHERE \(SELECT avail FROM seen\) >= (\d+) RETURNING acct, amt;$/, (m) => ({ k: 'holdInsert', id: +m[1], amt: +m[2], guard: +m[3] })],
  [/^SELECT bal FROM acct WHERE id = (\d+);$/, (m) => ({ k: 'read', id: +m[1] })],
  [/^UPDATE acct SET bal = bal - (\d+) WHERE id = (\d+) RETURNING old\.bal AS old_bal, new\.bal AS new_bal; UPDATE acct SET bal = bal \+ (\d+) WHERE id = (\d+) RETURNING old\.bal AS old_bal, new\.bal AS new_bal;$/, (m) => ({ k: 'move', amt: +m[1], id: +m[2], to: +m[4] })],
  [/^UPDATE acct SET bal = bal \+ (\d+) WHERE id = (\d+) RETURNING old\.bal AS old_bal, new\.bal AS new_bal;$/, (m) => ({ k: 'credit', amt: +m[1], id: +m[2] })],
]
const LEVEL = { 'READ COMMITTED': 'RC', 'REPEATABLE READ': 'RR', SERIALIZABLE: 'SER' }
const CHECKS = new Set([
  'SELECT id, bal FROM acct ORDER BY id;',
  'SELECT id, bal FROM acct ORDER BY id; SELECT sum(bal) AS team_total FROM acct WHERE team = 1;',
  'SELECT (SELECT bal FROM acct WHERE id = 1) AS bal, coalesce(sum(amt), 0) AS held FROM holds;',
])

/** The block's steps in the order the tester printed them: issue lines and completion lines, each with its tables and error. */
function parseBlock(block) {
  const lines = block.split('\n')
  const events = []
  let cur = null
  let table = null
  const flushTable = () => {
    if (table !== null && cur !== null) cur.tables.push(table.rows)
    table = null
  }
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const m = /^step (\S+): (.*)$/.exec(line)
    if (m) {
      flushTable()
      const done = m[2].startsWith('<... completed>')
      const waiting = m[2].endsWith(' <waiting ...>')
      const sql = waiting ? m[2].slice(0, -' <waiting ...>'.length) : m[2]
      cur = { step: m[1], sql: done ? null : sql, completion: done, waiting, tables: [], error: null }
      events.push(cur)
      continue
    }
    if (cur === null) continue
    if (line.startsWith('ERROR:  ')) {
      flushTable()
      cur.error = line.slice('ERROR:  '.length)
      continue
    }
    if (/^\(\d+ rows?\)$/.test(line)) {
      flushTable()
      continue
    }
    if (line.trim() === '') continue
    // A table: header, a dashed rule, then rows.
    if (table === null && /^[-+]+$/.test(lines[i + 1] ?? '')) {
      table = { rows: [] }
      i++
      continue
    }
    if (table !== null) table.rows.push(line.split('|').map((c) => c.trim()))
  }
  flushTable()
  return events
}

function sessionOf(step, sessions) {
  let best = null
  for (const s of sessions) if (step.startsWith(s) && (best === null || s.length > best.length)) best = s
  return best
}

const num = (t) => {
  if (!/^-?\d+$/.test(t)) throw new Error(`not an integer: ${JSON.stringify(t)}`)
  return Number(t)
}

/** One recorded history as the pool keeps it, or a reason it is left out. */
function convert(h) {
  if (typeof h.cell.balance !== 'number') return { skip: 'a cell outside the acct vocabulary (bigint or kv)' }
  const sessions = Object.keys(h.levels)
  const events = parseBlock(h.block)
  const ops = []
  const open = new Map() // step name -> op waiting for completion
  let final = null
  let pos = 0
  for (const e of events) {
    if (e.step === 'chk') {
      if (!CHECKS.has(e.sql)) return { skip: `check ${e.sql}` }
      final = e.tables
      continue
    }
    const session = sessionOf(e.step, sessions)
    if (session === null) return { skip: `step ${e.step} has no session` }
    if (e.completion) {
      const op = open.get(e.step)
      if (op === undefined) return { skip: `completion of ${e.step} without its issue` }
      open.delete(e.step)
      op.done = pos++
      op.rows = e.tables
      if (e.error !== null) op.error = e.error
      continue
    }
    const form = STEP_FORMS.find(([re]) => re.test(e.sql))
    if (form === undefined) return { skip: `step form ${e.sql.slice(0, 60)}` }
    const op = { n: e.step, s: session, ...form[1](form[0].exec(e.sql)), at: pos++ }
    if (e.waiting) {
      op.waits = true
      open.set(e.step, op)
    } else {
      op.done = op.at
      op.rows = e.tables
      if (e.error !== null) op.error = e.error
    }
    ops.push(op)
  }
  if (open.size > 0) return { skip: 'a step never completed' }
  if (final === null) return { skip: 'no check' }
  // SQLSTATEs from the server's log, matched to each failing step in order.
  const errs = [...h.errors]
  for (const op of ops) {
    if (op.error === undefined) continue
    const i = errs.findIndex((x) => x.step === op.n)
    if (i < 0) return { skip: `error at ${op.n} with no SQLSTATE` }
    op.sqlstate = errs[i].sqlstate
    errs.splice(i, 1)
    delete op.error
  }
  // Transactions: a session's ops from BEGIN to COMMIT, or to its first error (PostgreSQL ends it there).
  const txns = []
  for (const s of sessions) {
    const outcomes = h.outcome[s] ?? []
    let t = null
    let k = 0
    for (const op of ops.filter((o) => o.s === s)) {
      if (op.k === 'begin') {
        t = { s, level: LEVEL[op.level], outcome: outcomes[k] ?? null, ops: [] }
        k++
        txns.push(t)
      }
      if (t === null) return { skip: `an op of ${s} outside a transaction` }
      t.ops.push(op)
    }
  }
  for (const t of txns) {
    if (t.outcome === null) return { skip: 'a transaction with no recorded outcome' }
    if (t.outcome.startsWith('abort:') && !t.ops.some((o) => o.sqlstate !== undefined)) return { skip: 'an abort with no failing step' }
  }
  // The observer's check, as printed.
  const finalOut = {}
  const acct = final[0]
  if (acct[0]?.length === 2 && h.pattern !== 'holds2' && !h.pattern.startsWith('retry-holds')) {
    finalOut.acct = Object.fromEntries(acct.map(([id, bal]) => [id, num(bal)]))
  } else {
    finalOut.bal = num(acct[0][0])
    finalOut.held = num(acct[0][1])
  }
  const compact = (op) => {
    const out = { n: op.n, k: op.k, at: op.at }
    if (op.done !== op.at) out.done = op.done
    for (const f of ['id', 'to', 'amt', 'guard', 'sqlstate']) if (op[f] !== undefined) out[f] = op[f]
    if (op.waits) out.waits = true
    if (op.rows !== undefined && op.rows.length > 0) out.rows = op.rows.map((t) => t.map((r) => r.map(num)))
    return out
  }
  return {
    history: {
      id: h.id,
      sha256: h.block_sha256,
      template: h.template,
      band: h.band,
      pattern: h.pattern,
      half: h.half,
      balance: h.cell.balance,
      levels: Object.fromEntries(Object.entries(h.levels).map(([k, v]) => [k, LEVEL[v]])),
      txns: txns.map((t) => ({ s: t.s, level: t.level, outcome: t.outcome, ops: t.ops.map(compact) })),
      final: finalOut,
    },
  }
}

// ------------------------------------------------------------------ read, convert, sample

const all = []
const skipped = {}
for (const f of readdirSync(GRID).filter((x) => x.endsWith('.ndjson')).sort()) {
  for (const line of readFileSync(join(GRID, f), 'utf8').split('\n')) {
    if (line.trim() === '') continue
    const h = JSON.parse(line)
    const r = convert(h)
    if (r.skip) skipped[`${h.pattern}: ${r.skip}`] = (skipped[`${h.pattern}: ${r.skip}`] ?? 0) + 1
    else all.push(r.history)
  }
}

/** A history's stratum: template, band, half, levels and outcomes; the pool keeps PER of each, spread by id. */
const stratum = (h) => [h.template, h.band, h.half, Object.values(h.levels).join('/'), h.txns.map((t) => t.outcome).join('+')].join('|')
const byStratum = new Map()
for (const h of all.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))) {
  const k = stratum(h)
  if (!byStratum.has(k)) byStratum.set(k, [])
  byStratum.get(k).push(h)
}
const pool = []
for (const [, hs] of [...byStratum].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) {
  // Evenly spaced by a hash of the id, so the sample does not favour the first cells.
  const ranked = [...hs].sort((a, b) => (createHash('sha256').update(a.id).digest('hex') < createHash('sha256').update(b.id).digest('hex') ? -1 : 1))
  pool.push(...ranked.slice(0, PER))
}
// Template 4's band 1 is the cross-listed 40001 histories of templates 1 and 2 (grid.json, cross_listed_for_t4).
const t4b1 = pool.filter((h) => (h.template === 't1' || h.template === 't2') && h.txns.some((t) => t.outcome === 'abort:40001'))

const counts = {}
for (const h of pool) counts[`${h.template}/b${h.band}/${h.half}`] = (counts[`${h.template}/b${h.band}/${h.half}`] ?? 0) + 1
counts['t4/b1 (cross-listed)'] = t4b1.length

const header = `// GEN-anomaly-id's pool: recorded PostgreSQL 18.6 histories copied from RUN-pg-catalog (content/pg-catalog/grid), by
// packages/generators/tools/anomaly-id-pool.mjs. Generated: do not edit. Every value was parsed from the isolationtester
// block the server's run printed; \`id\` and \`sha256\` find the block in the grid's ndjson. No class is stored here: the
// history checker computes it at grade time.
//
// Recorded histories read: ${all.length + Object.values(skipped).reduce((a, b) => a + b, 0)}; replayable: ${all.length}; kept: ${pool.length} (${PER} per stratum of template, band, half, levels
// and outcomes). Left out: ${JSON.stringify(skipped)}.
// Kept per template, band and half: ${JSON.stringify(counts)}.
//
// Pure data: no DOM, storage or network.

import type { History } from './history.ts'

export const POOL_RUN = 'RUN-pg-catalog'
`
writeFileSync(OUT, `${header}\nexport const POOL: readonly History[] = ${JSON.stringify(pool)}\n`)
console.log(`kept ${pool.length} of ${all.length} replayable histories; skipped ${JSON.stringify(skipped)}`)
console.log(JSON.stringify(counts))
