// GEN-anomaly-id's history checker (INS-history's rules, ASSESSMENT.md section 4.10), as plain code over one recorded
// history. SQLSTATE outcomes are read from the recording; anomaly classes are computed:
//
//   1. Abstract serializability: try every serial order of the committed transactions, replaying each through the
//      reference semantics below from the setup state (both accounts at the cell's balance, no holds). The history
//      is serializable when some order reproduces every output a committed transaction printed (reads, RETURNING
//      rows, row counts) and the observer's final check.
//   2. When none does, the shape of the dependency cycle names the class, read off the recorded interleaving: two
//      transactions that each read a row before the other's commit and both write it, a lost update; two that each
//      read what the other writes and write different rows, write skew; one reader that sees one row before another
//      transaction's commit and a second row it wrote after it, read skew.
//   3. A serializable history is classed by its recorded SQLSTATEs: 40P01, deadlock; 40001, serialization failure;
//      otherwise no anomaly.
//
// The search is exact for this recorded run and says nothing about other runs. It is bounded at 8 committed
// transactions (8! orders); the pool's histories have at most 3.
//
// Pure: no DOM, storage or network.

export type Level = 'RC' | 'RR' | 'SER'

export const LEVEL_NAME: Readonly<Record<Level, string>> = { RC: 'READ COMMITTED', RR: 'REPEATABLE READ', SER: 'SERIALIZABLE' }

export type OpKind = 'begin' | 'commit' | 'seenBal' | 'seenTeam' | 'seenAvail' | 'condDebit' | 'rmwDebit' | 'teamDebit' | 'holdInsert' | 'read' | 'move' | 'credit'

export interface Op {
  /** The tester's step name. */
  readonly n: string
  readonly k: OpKind
  /** Where the step was issued in the tester's output, and where it completed (absent: at once). */
  readonly at: number
  readonly done?: number
  readonly waits?: boolean
  readonly id?: number
  readonly to?: number
  readonly amt?: number
  readonly guard?: number
  /** The SQLSTATE of the error this step raised, from the server's log. */
  readonly sqlstate?: string
  /** The tables the step printed, as integers. */
  readonly rows?: readonly (readonly (readonly number[])[])[]
}

export interface Txn {
  readonly s: string
  readonly level: Level
  /** commit, rollback, or abort:<SQLSTATE>, as recorded. */
  readonly outcome: string
  readonly ops: readonly Op[]
}

export interface History {
  readonly id: string
  readonly sha256: string
  readonly template: string
  readonly band: number
  readonly pattern: string
  readonly half: 'display' | 'graded'
  readonly balance: number
  readonly levels: Readonly<Record<string, Level>>
  readonly txns: readonly Txn[]
  readonly final: { readonly acct?: Readonly<Record<string, number>>; readonly bal?: number; readonly held?: number }
}

export type AnomalyClass = 'lost-update' | 'write-skew' | 'read-skew' | 'serialization-failure' | 'deadlock' | 'none'
export const CLASSES: readonly AnomalyClass[] = ['lost-update', 'write-skew', 'read-skew', 'serialization-failure', 'deadlock', 'none']

export const CLASS_TEXT: Readonly<Record<AnomalyClass, string>> = {
  'lost-update': 'lost update',
  'write-skew': 'write skew',
  'read-skew': 'read skew',
  'serialization-failure': 'serialization failure (40001)',
  deadlock: 'deadlock (40P01)',
  none: 'no anomaly',
}

export const MAX_TXNS = 8

// ---------------------------------------------------------------- reference semantics

interface Db {
  acct: Record<number, number>
  holds: { acct: number; amt: number }[]
}

const committed = (h: History): Txn[] => h.txns.filter((t) => t.outcome === 'commit')

/** Runs one op against the state with the transaction's `seen`; returns what it prints and the new `seen`. */
function run(db: Db, op: Op, seen: number | null): { rows: number[][][]; seen: number | null } {
  const bal = (id: number): number => db.acct[id] as number
  const one = (v: number): number[][][] => [[[v]]]
  switch (op.k) {
    case 'begin':
    case 'commit':
      return { rows: [], seen }
    case 'seenBal':
      return { rows: one(bal(op.id as number)), seen: bal(op.id as number) }
    case 'seenTeam': {
      const t = bal(1) + bal(2)
      return { rows: one(t), seen: t }
    }
    case 'seenAvail': {
      let held = 0
      for (const x of db.holds) if (x.acct === op.id) held += x.amt
      const avail = bal(op.id as number) - held
      return { rows: one(avail), seen: avail }
    }
    case 'read':
      return { rows: one(bal(op.id as number)), seen }
    case 'condDebit':
    case 'rmwDebit':
    case 'teamDebit': {
      const id = op.id as number
      const old = bal(id)
      const pass = op.k === 'condDebit' ? old >= (op.guard as number) : op.k === 'rmwDebit' ? (seen as number) >= (op.guard as number) : (seen as number) - (op.guard as number) >= 0
      if (!pass) return { rows: [[]], seen }
      db.acct[id] = op.k === 'rmwDebit' ? (seen as number) - (op.amt as number) : old - (op.amt as number)
      return { rows: [[[old, db.acct[id] as number]]], seen }
    }
    case 'holdInsert':
      if ((seen as number) < (op.guard as number)) return { rows: [[]], seen }
      db.holds.push({ acct: op.id as number, amt: op.amt as number })
      return { rows: [[[op.id as number, op.amt as number]]], seen }
    case 'move': {
      const a = op.id as number
      const b = op.to as number
      const oa = bal(a)
      db.acct[a] = oa - (op.amt as number)
      const ob = bal(b)
      db.acct[b] = ob + (op.amt as number)
      return { rows: [[[oa, db.acct[a] as number]], [[ob, db.acct[b] as number]]], seen }
    }
    case 'credit': {
      const id = op.id as number
      const old = bal(id)
      db.acct[id] = old + (op.amt as number)
      return { rows: [[[old, db.acct[id] as number]]], seen }
    }
  }
}

const tablesText = (rows: readonly (readonly (readonly number[])[])[]): string => {
  const shown = rows.map((t) => (t.length === 0 ? '0 rows' : t.map((r) => r.join(' → ')).join('; ')))
  return shown.length === 0 ? 'nothing' : shown.join(', ')
}

/** Why a serial order fails to reproduce the history, or null when it reproduces it. */
export function replayOrder(h: History, order: readonly Txn[]): string | null {
  const db: Db = { acct: { 1: h.balance, 2: h.balance }, holds: [] }
  for (const t of order) {
    let seen: number | null = null
    for (const op of t.ops) {
      const r = run(db, op, seen)
      seen = r.seen
      if (op.k === 'begin' || op.k === 'commit') continue
      const want = op.rows ?? []
      if (JSON.stringify(r.rows) !== JSON.stringify(want)) return `${t.s} would print ${tablesText(r.rows)} at ${op.n}, not ${tablesText(want)}`
    }
  }
  const f = h.final
  if (f.acct !== undefined) {
    for (const [id, v] of Object.entries(f.acct)) if (db.acct[Number(id)] !== v) return `the final balance of account ${id} would be ${db.acct[Number(id)] as number}, not ${v}`
  } else {
    let held = 0
    for (const x of db.holds) held += x.amt
    if (f.held !== held) return `the final total held would be ${held}, not ${String(f.held)}`
  }
  return null
}

/** Every order of the items, in a fixed order for a stable report. */
function permutations<T>(xs: readonly T[]): T[][] {
  const out: T[][] = []
  const go = (rest: T[], acc: T[]): void => {
    if (rest.length === 0) {
      out.push(acc)
      return
    }
    for (let i = 0; i < rest.length; i++) go([...rest.slice(0, i), ...rest.slice(i + 1)], [...acc, rest[i] as T])
  }
  go([...xs], [])
  return out
}

// ---------------------------------------------------------------- the dependency cycle

const doneAt = (op: Op): number => op.done ?? op.at

/** The rows an op reads apart from writing; holds is read as a predicate over every hold row. */
function readsOf(op: Op): string[] {
  switch (op.k) {
    case 'seenBal':
    case 'read':
      return [`acct:${op.id as number}`]
    case 'seenTeam':
      return ['acct:1', 'acct:2']
    case 'seenAvail':
      return [`acct:${op.id as number}`, 'holds:*']
    default:
      return []
  }
}

/** The rows an op wrote, when its effect happened (it printed a row). */
function writesOf(op: Op, t: Txn): string[] {
  const hit = (op.rows ?? []).some((x) => x.length > 0)
  if (!hit || op.sqlstate !== undefined) return []
  switch (op.k) {
    case 'condDebit':
    case 'rmwDebit':
    case 'teamDebit':
    case 'credit':
      return [`acct:${op.id as number}`]
    case 'move':
      return [`acct:${op.id as number}`, `acct:${op.to as number}`]
    case 'holdInsert':
      return [`holds:${t.s}`]
    default:
      return []
  }
}

const matches = (read: string, write: string): boolean => read === write || (read === 'holds:*' && write.startsWith('holds:'))

const commitAt = (t: Txn): number => {
  const c = t.ops.find((o) => o.k === 'commit')
  return c === undefined ? Number.MAX_SAFE_INTEGER : doneAt(c)
}

/** T read a row before U committed, and U wrote it: T did not see U's write. */
function antiDeps(t: Txn, u: Txn): { row: string; read: Op }[] {
  const out: { row: string; read: Op }[] = []
  const uw = u.ops.flatMap((o) => writesOf(o, u))
  for (const op of t.ops) for (const r of readsOf(op)) for (const w of uw) if (matches(r, w) && doneAt(op) < commitAt(u)) out.push({ row: w, read: op })
  return out
}

export interface Cycle {
  readonly cls: 'lost-update' | 'write-skew' | 'read-skew'
  readonly text: string
}

const rowText = (row: string): string => (row.startsWith('holds:') ? 'the holds' : `account ${row.slice('acct:'.length)}`)

export function cycleOf(h: History): Cycle | null {
  const ts = committed(h)
  for (const t of ts) for (const u of ts) {
    if (t === u || t.s > u.s) continue
    const tu = antiDeps(t, u)
    const ut = antiDeps(u, t)
    const tw = new Set(t.ops.flatMap((o) => writesOf(o, t)))
    const uw = new Set(u.ops.flatMap((o) => writesOf(o, u)))
    const both = tu.find((d) => tw.has(d.row) && ut.some((e) => e.row === d.row))
    if (both !== undefined) return { cls: 'lost-update', text: `${t.s} and ${u.s} both read ${rowText(both.row)} before the other committed, and both wrote it` }
    const a = tu.find((d) => !tw.has(d.row))
    const b = ut.find((d) => !uw.has(d.row))
    if (a !== undefined && b !== undefined) return { cls: 'write-skew', text: `${t.s} read ${rowText(a.row)} before ${u.s} wrote it, ${u.s} read ${rowText(b.row)} before ${t.s} wrote it, and they wrote different rows` }
  }
  for (const r of ts) for (const u of ts) {
    if (r === u) continue
    const uw = new Set(u.ops.flatMap((o) => writesOf(o, u)))
    const c = commitAt(u)
    const seenRows = (pred: (o: Op) => boolean): string[] => r.ops.filter(pred).flatMap((o) => readsOf(o).filter((x) => uw.has(x)))
    const before = seenRows((o) => doneAt(o) < c)
    const after = seenRows((o) => doneAt(o) > c)
    const x = before.find((b) => after.some((a) => a !== b))
    const y = after.find((a) => a !== x)
    if (x !== undefined && y !== undefined) return { cls: 'read-skew', text: `${r.s} read ${rowText(x)} before ${u.s} committed and ${rowText(y)} after, so it saw the two rows at two different moments` }
  }
  return null
}

// ---------------------------------------------------------------- the classification

export interface Classification {
  readonly cls: AnomalyClass
  readonly committed: number
  readonly orders: number
  /** The serial order that reproduces the history, when one does. */
  readonly order?: readonly string[]
  /** Why each serial order fails, when none reproduces it. */
  readonly failures?: readonly string[]
  readonly cycle?: string
  readonly sqlstates: readonly string[]
}

export type ClassifyResult = Classification | { readonly unknown: string }

export function classify(h: History): ClassifyResult {
  const ts = committed(h)
  if (ts.length > MAX_TXNS) return { unknown: `${ts.length} committed transactions, over the bound of ${MAX_TXNS}` }
  const sqlstates = h.txns.filter((t) => t.outcome.startsWith('abort:')).map((t) => t.outcome.slice('abort:'.length))
  const orders = permutations(ts)
  const failures: string[] = []
  for (const o of orders) {
    const why = replayOrder(h, o)
    if (why === null) {
      const cls: AnomalyClass = sqlstates.includes('40P01') ? 'deadlock' : sqlstates.includes('40001') ? 'serialization-failure' : 'none'
      return { cls, committed: ts.length, orders: orders.length, order: o.map((t) => t.s), sqlstates }
    }
    failures.push(`${o.map((t) => t.s).join(' then ')}: ${why}`)
  }
  const c = cycleOf(h)
  if (c === null) return { unknown: 'no serial order reproduces the history, and the dependency cycle has no named shape' }
  return { cls: c.cls, committed: ts.length, orders: orders.length, failures, cycle: c.text, sqlstates }
}

// ---------------------------------------------------------------- rendering

function stepText(op: Op): string {
  switch (op.k) {
    case 'begin':
      return 'BEGIN'
    case 'commit':
      return 'COMMIT'
    case 'seenBal':
      return `read account ${op.id as number}'s balance into \`seen\``
    case 'seenTeam':
      return "read the team's total balance into `seen`"
    case 'seenAvail':
      return `read account ${op.id as number}'s balance minus its holds into \`seen\``
    case 'read':
      return `SELECT account ${op.id as number}'s balance`
    case 'condDebit':
      return `UPDATE account ${op.id as number}: bal − ${op.amt as number} WHERE bal ≥ ${op.guard as number}`
    case 'rmwDebit':
      return `UPDATE account ${op.id as number}: bal := seen − ${op.amt as number} if seen ≥ ${op.guard as number}`
    case 'teamDebit':
      return `UPDATE account ${op.id as number}: bal − ${op.amt as number} if seen − ${op.guard as number} ≥ 0`
    case 'holdInsert':
      return `INSERT a hold of ${op.amt as number} on account ${op.id as number} if seen ≥ ${op.guard as number}`
    case 'move':
      return `move ${op.amt as number} from account ${op.id as number} to account ${op.to as number}`
    case 'credit':
      return `UPDATE account ${op.id as number}: bal + ${op.amt as number}`
  }
}

function resultText(op: Op): string {
  if (op.sqlstate !== undefined) return `ERROR, SQLSTATE ${op.sqlstate}`
  if (op.k === 'begin' || op.k === 'commit') return ''
  const rows = op.rows ?? []
  if (rows.length === 0) return '0 rows'
  if (op.k === 'seenBal' || op.k === 'seenTeam' || op.k === 'seenAvail' || op.k === 'read') return String(rows[0]?.[0]?.[0])
  if (op.k === 'holdInsert') return '1 row'
  return rows.map((t) => (t.length === 0 ? '0 rows' : t.map((r) => `${r[0] as number} → ${r[1] as number}`).join('; '))).join('; ')
}

/** The history as the stem's table: one row per step issue and per completion, in the tester's order. */
export function historyTable(h: History): string {
  const rows: { pos: number; line: string }[] = []
  for (const t of h.txns)
    for (const op of t.ops) {
      const label = op.k === 'begin' ? `BEGIN ISOLATION LEVEL ${LEVEL_NAME[t.level]}` : stepText(op)
      if (op.waits === true) {
        rows.push({ pos: op.at, line: `| ${t.s} | ${label} | waits for a lock |` })
        rows.push({ pos: doneAt(op), line: `| ${t.s} | … completes | ${resultText(op)} |` })
      } else rows.push({ pos: op.at, line: `| ${t.s} | ${label} | ${resultText(op)} |` })
    }
  rows.sort((a, b) => a.pos - b.pos)
  return ['| Session | Step | Result |', '|---|---|---|', ...rows.map((r) => r.line)].join('\n')
}

export function finalText(h: History): string {
  const f = h.final
  if (f.acct !== undefined) return Object.entries(f.acct).map(([id, v]) => `account ${id} = ${v}`).join(', ')
  return `balance = ${String(f.bal)}, total held = ${String(f.held)}`
}
