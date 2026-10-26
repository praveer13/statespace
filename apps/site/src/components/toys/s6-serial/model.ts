// "Some serial order" for S6.L8: the lesson's recorded histories of two committed transactions, and a tiny reference
// semantics that replays them one at a time from α(D₀). Pure and small. An order passes when every transaction's
// replayed output equals the output it committed with; an aborted attempt is a stutter and is skipped. With two
// transactions there are two orders, well inside the checker's bound of 8.
//
// The histories, each from the lesson:
//   lost     the read-modify-write at READ COMMITTED (cell 2, from S6.L6): both read 100, both committed a debit
//   retry    the conditional UPDATE at SERIALIZABLE: B's first attempt aborted, its retry updated 0 rows and committed
//   report   a report and a transfer at SERIALIZABLE (cell 3, catalog row H04): the report commits last, reads 100, 100
//   skew     the same report and transfer at READ COMMITTED: the report reads 100, then 150
//   team     two team debits at REPEATABLE READ: each reads the team total 200 and debits 150 from its own account

export type Txn = 'A' | 'B'
export type HistoryId = 'lost' | 'retry' | 'report' | 'skew' | 'team'
export type State = Readonly<Record<number, number>>

export type Command =
  /** Debit(acct, amt), guarded by bal >= amt */
  | { readonly k: 'debit'; readonly acct: number; readonly amt: number }
  /** Transfer(from, to, amt), guarded by the sender's bal >= amt */
  | { readonly k: 'transfer'; readonly from: number; readonly to: number; readonly amt: number }
  /** Report(accts): reads each balance */
  | { readonly k: 'report'; readonly accts: readonly number[] }
  /** TeamDebit(acct, amt), guarded by the team total >= amt */
  | { readonly k: 'team'; readonly acct: number; readonly amt: number }

/** What a transaction returned: its old and new pairs (from RETURNING), what it read, or a typed refusal. */
export type Output =
  | { readonly k: 'ok'; readonly pairs: readonly (readonly [number, number, number])[]; readonly read?: number }
  | { readonly k: 'read'; readonly vals: readonly (readonly [number, number])[] }
  | { readonly k: 'insufficient'; readonly read?: number }

export interface TxnRecord {
  readonly id: Txn
  readonly cmd: Command
  /** The output it committed with. */
  readonly out: Output
  /** What it did along the way, as the history shows it. */
  readonly trace: readonly string[]
}

export interface History {
  readonly id: HistoryId
  readonly name: string
  readonly level: string
  readonly d0: State
  readonly txns: readonly [TxnRecord, TxnRecord]
  /** The order in which they committed. */
  readonly commitOrder: readonly [Txn, Txn]
}

export const HISTORIES: readonly History[] = [
  {
    id: 'lost',
    name: 'Two withdrawals, read-modify-write',
    level: 'READ COMMITTED',
    d0: { 1: 100 },
    txns: [
      { id: 'A', cmd: { k: 'debit', acct: 1, amt: 80 }, out: { k: 'ok', pairs: [[1, 100, 20]] }, trace: ['read 100', 'UPDATE returned old 100, new 20', 'committed'] },
      { id: 'B', cmd: { k: 'debit', acct: 1, amt: 80 }, out: { k: 'ok', pairs: [[1, 20, 20]] }, trace: ['read 100', 'UPDATE returned old 20, new 20', 'committed'] },
    ],
    commitOrder: ['A', 'B'],
  },
  {
    id: 'retry',
    name: 'Two withdrawals, conditional UPDATE, with a retry',
    level: 'SERIALIZABLE',
    d0: { 1: 100 },
    txns: [
      { id: 'A', cmd: { k: 'debit', acct: 1, amt: 80 }, out: { k: 'ok', pairs: [[1, 100, 20]] }, trace: ['UPDATE returned old 100, new 20', 'committed'] },
      {
        id: 'B',
        cmd: { k: 'debit', acct: 1, amt: 80 },
        out: { k: 'insufficient' },
        trace: ['first attempt: serialization failure (a stutter)', 'retry: UPDATE matched 0 rows, Insufficient', 'committed'],
      },
    ],
    commitOrder: ['A', 'B'],
  },
  {
    id: 'report',
    name: 'A report and a transfer',
    level: 'SERIALIZABLE',
    d0: { 1: 100, 2: 100 },
    txns: [
      { id: 'A', cmd: { k: 'report', accts: [1, 2] }, out: { k: 'read', vals: [[1, 100], [2, 100]] }, trace: ['read acct 1 → 100', 'read acct 2 → 100, from its snapshot', 'committed last'] },
      {
        id: 'B',
        cmd: { k: 'transfer', from: 1, to: 2, amt: 50 },
        out: { k: 'ok', pairs: [[1, 100, 50], [2, 100, 150]] },
        trace: ['acct 1: 100 → 50, acct 2: 100 → 150', 'committed first'],
      },
    ],
    commitOrder: ['B', 'A'],
  },
  {
    id: 'skew',
    name: 'A report and a transfer',
    level: 'READ COMMITTED',
    d0: { 1: 100, 2: 100 },
    txns: [
      { id: 'A', cmd: { k: 'report', accts: [1, 2] }, out: { k: 'read', vals: [[1, 100], [2, 150]] }, trace: ['read acct 1 → 100', 'read acct 2 → 150, after B committed', 'committed last'] },
      {
        id: 'B',
        cmd: { k: 'transfer', from: 1, to: 2, amt: 50 },
        out: { k: 'ok', pairs: [[1, 100, 50], [2, 100, 150]] },
        trace: ['acct 1: 100 → 50, acct 2: 100 → 150', 'committed first'],
      },
    ],
    commitOrder: ['B', 'A'],
  },
  {
    id: 'team',
    name: 'Two team debits',
    level: 'REPEATABLE READ',
    d0: { 1: 100, 2: 100 },
    txns: [
      { id: 'A', cmd: { k: 'team', acct: 1, amt: 150 }, out: { k: 'ok', read: 200, pairs: [[1, 100, -50]] }, trace: ['read team total 200', 'acct 1: 100 → −50', 'committed'] },
      { id: 'B', cmd: { k: 'team', acct: 2, amt: 150 }, out: { k: 'ok', read: 200, pairs: [[2, 100, -50]] }, trace: ['read team total 200', 'acct 2: 100 → −50', 'committed'] },
    ],
    commitOrder: ['A', 'B'],
  },
]

export const history = (id: HistoryId): History => HISTORIES.find((h) => h.id === id) as History

const total = (s: State): number => Object.values(s).reduce((n, v) => n + v, 0)

/** The reference semantics: one command from one abstract state. */
export function interp(c: Command, s: State): { readonly out: Output; readonly next: State } {
  const bal = (a: number): number => s[a] ?? 0
  switch (c.k) {
    case 'debit': {
      const b = bal(c.acct)
      if (b < c.amt) return { out: { k: 'insufficient' }, next: s }
      return { out: { k: 'ok', pairs: [[c.acct, b, b - c.amt]] }, next: { ...s, [c.acct]: b - c.amt } }
    }
    case 'transfer': {
      const f = bal(c.from)
      const t = bal(c.to)
      if (f < c.amt) return { out: { k: 'insufficient' }, next: s }
      return {
        out: { k: 'ok', pairs: [[c.from, f, f - c.amt], [c.to, t, t + c.amt]] },
        next: { ...s, [c.from]: f - c.amt, [c.to]: t + c.amt },
      }
    }
    case 'report':
      return { out: { k: 'read', vals: c.accts.map((a) => [a, bal(a)] as const) }, next: s }
    case 'team': {
      const t = total(s)
      const b = bal(c.acct)
      if (t < c.amt) return { out: { k: 'insufficient', read: t }, next: s }
      return { out: { k: 'ok', read: t, pairs: [[c.acct, b, b - c.amt]] }, next: { ...s, [c.acct]: b - c.amt } }
    }
  }
}

const num = (n: number): string => (n < 0 ? `−${-n}` : String(n))

export function sayOutput(o: Output): string {
  switch (o.k) {
    case 'ok': {
      const pairs = o.pairs.map(([a, x, y]) => `acct ${a}: ${num(x)} → ${num(y)}`).join(', ')
      return o.read === undefined ? `Ok, ${pairs}` : `Ok, read total ${num(o.read)}; ${pairs}`
    }
    case 'read':
      return `read ${o.vals.map(([a, v]) => `acct ${a} = ${num(v)}`).join(', ')}`
    case 'insufficient':
      return o.read === undefined ? 'Err Insufficient' : `Err Insufficient, read total ${num(o.read)}`
  }
}

export const sayCommand = (c: Command): string => {
  switch (c.k) {
    case 'debit':
      return `Debit(${c.acct}, ${c.amt})`
    case 'transfer':
      return `Transfer(${c.from}, ${c.to}, ${c.amt})`
    case 'report':
      return `Report(${c.accts.join(', ')})`
    case 'team':
      return `TeamDebit(${c.acct}, ${c.amt})`
  }
}

export const sayState = (s: State): string =>
  `{${Object.entries(s)
    .map(([a, v]) => `${a}: ${num(v)}`)
    .join(', ')}}`

export const same = (x: Output, y: Output): boolean => JSON.stringify(x) === JSON.stringify(y)

export interface ReplayStep {
  readonly id: Txn
  readonly from: State
  /** The abstract state after the replayed step. */
  readonly after: State
  readonly replayed: Output
  readonly committed: Output
  readonly match: boolean
}

/** Replay a serial order from α(D₀); the order passes when every step matches. */
export function replay(h: History, order: readonly [Txn, Txn]): { readonly steps: readonly ReplayStep[]; readonly passes: boolean } {
  let s = h.d0
  const steps: ReplayStep[] = []
  for (const id of order) {
    const t = h.txns.find((x) => x.id === id) as TxnRecord
    const r = interp(t.cmd, s)
    steps.push({ id, from: s, after: r.next, replayed: r.out, committed: t.out, match: same(r.out, t.out) })
    s = r.next
  }
  return { steps, passes: steps.every((x) => x.match) }
}

export const ORDERS: readonly (readonly [Txn, Txn])[] = [
  ['A', 'B'],
  ['B', 'A'],
]

/** The checker: every serial order of the committed transactions, the first that passes, or none. */
export function check(h: History): { readonly accepted: readonly [Txn, Txn] | null; readonly tried: number } {
  const ok = ORDERS.find((o) => replay(h, o).passes)
  return { accepted: ok ?? null, tried: ORDERS.length }
}

export const BOUND = 8
