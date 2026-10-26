// GEN-find-the-witness t3's histories: transactions over a few keys, run concurrently under snapshot isolation (each
// reads the committed state as of its start, writes at its commit, and a write-write conflict between overlapping
// transactions is not drawn). The page simulates the run [D]; ASSESSMENT.md section 4.6 names histories recorded on
// PostgreSQL 18.6 through INS-history, which the tab does not replay yet.
//
// The checker is the abstract-serializability search: every serial order of the committed transactions is replayed one
// after another from the initial state, and an order explains the history when it reproduces every value read. With at
// most four transactions the search tries all 24 orders, so its answer is exact. Pure.

export interface Op {
  readonly kind: 'read' | 'write'
  readonly key: string
  /** The value read (as the history recorded it) or written. */
  readonly value: number
}

export interface Txn {
  /** T1, T2, ... */
  readonly id: string
  readonly ops: readonly Op[]
}

export interface History {
  readonly keys: readonly string[]
  /** Every key's value before any transaction. */
  readonly initial: number
  readonly txns: readonly Txn[]
  /** The order the transactions committed in, by id. */
  readonly commitOrder: readonly string[]
}

/** Replay an order: the first read it cannot reproduce, or null when it explains every read. */
export function replayOrder(h: History, order: readonly string[]): { readonly txn: string; readonly key: string; readonly read: number; readonly would: number } | null {
  const state: Record<string, number> = {}
  for (const key of h.keys) state[key] = h.initial
  for (const id of order) {
    const t = h.txns.find((x) => x.id === id)
    if (t === undefined) return { txn: id, key: '-', read: 0, would: 0 }
    // Within one transaction a read after its own write sees that write.
    const local: Record<string, number> = { ...state }
    for (const op of t.ops) {
      if (op.kind === 'read') {
        if (local[op.key] !== op.value) return { txn: id, key: op.key, read: op.value, would: local[op.key] as number }
      } else local[op.key] = op.value
    }
    for (const op of t.ops) if (op.kind === 'write') state[op.key] = op.value
  }
  return null
}

/** Every permutation of the ids, in lexicographic order of positions. */
export function permutations(ids: readonly string[]): string[][] {
  if (ids.length <= 1) return [ids.slice()]
  const out: string[][] = []
  ids.forEach((first, i) => {
    for (const rest of permutations([...ids.slice(0, i), ...ids.slice(i + 1)])) out.push([first, ...rest])
  })
  return out
}

/** The serial orders that explain the history. */
export function explainingOrders(h: History): string[][] {
  return permutations(h.txns.map((t) => t.id)).filter((o) => replayOrder(h, o) === null)
}

export interface Plan {
  readonly id: string
  readonly reads: readonly string[]
  readonly writes: readonly { readonly key: string; readonly value: number }[]
}

/**
 * Simulate plans under snapshot isolation with a schedule: `starts` and `commits` give each transaction's start and
 * commit positions on one timeline (distinct integers). Returns null when two overlapping transactions write a key in
 * common (first-committer-wins would abort one, and the page does not draw aborts).
 */
export function simulate(keys: readonly string[], initial: number, plans: readonly Plan[], starts: readonly number[], commits: readonly number[]): History | null {
  const n = plans.length
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const overlap = (starts[i] as number) < (commits[j] as number) && (starts[j] as number) < (commits[i] as number)
      const shared = (plans[i] as Plan).writes.some((w) => (plans[j] as Plan).writes.some((x) => x.key === w.key))
      if (overlap && shared) return null
    }
  }
  const order = plans.map((p, i) => ({ p, c: commits[i] as number, s: starts[i] as number })).sort((a, b) => a.c - b.c)
  const txns: Txn[] = plans.map((p, i) => {
    // The snapshot: initial values, then every write of a transaction that committed before this one started.
    const snap: Record<string, number> = {}
    for (const key of keys) snap[key] = initial
    for (const o of order) if (o.c < (starts[i] as number)) for (const w of o.p.writes) snap[w.key] = w.value
    const ops: Op[] = [...p.reads.map((key) => ({ kind: 'read' as const, key, value: snap[key] as number })), ...p.writes.map((w) => ({ kind: 'write' as const, key: w.key, value: w.value }))]
    return { id: p.id, ops }
  })
  return { keys, initial, txns, commitOrder: order.map((o) => o.p.id) }
}

export const orderText = (o: readonly string[]): string => o.join(' → ')

export const opText = (op: Op): string => `${op.kind === 'read' ? 'reads' : 'writes'} ${op.key} = ${op.value}`
