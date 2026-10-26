// The poller of S8.L3, "A poller and a late commit": two writers take sequence ids when they INSERT and commit in either
// order, and a poller delivers committed rows. Design "mark" reads rows above a high-water mark and raises the mark to
// the highest id it read; design "status" reads every committed row not yet delivered. Pure and small: the page steps it
// by hand and searches every reachable state for the shortest trace that strands a committed row.
//
//   Insert(w)     wpc[w] = "idle"      -> w takes id nextId; nextId + 1
//   CommitRow(w)  wpc[w] = "inserted"  -> idOf[w] joins committedIds
//   Poll          Batch /= {}          -> delivered \cup Batch; under "mark", mark' = Max(Batch \cup {mark})
//   MarkInv == \A i \in committedIds : i <= mark => i \in delivered

export type Design = 'mark' | 'status'
export type Writer = 1 | 2
export const WRITERS: readonly Writer[] = [1, 2]
export type Pc = 'idle' | 'inserted' | 'committed'

export interface State {
  readonly wpc: Readonly<Record<Writer, Pc>>
  readonly idOf: Readonly<Record<Writer, number>>
  readonly nextId: number
  readonly committedIds: readonly number[]
  readonly delivered: readonly number[]
  readonly mark: number
}

export const INIT: State = {
  wpc: { 1: 'idle', 2: 'idle' },
  idOf: { 1: 0, 2: 0 },
  nextId: 1,
  committedIds: [],
  delivered: [],
  mark: 0,
}

export type Action =
  | { readonly kind: 'Insert'; readonly w: Writer }
  | { readonly kind: 'CommitRow'; readonly w: Writer }
  | { readonly kind: 'Poll' }

export const ACTIONS: readonly Action[] = [
  { kind: 'Insert', w: 1 },
  { kind: 'Insert', w: 2 },
  { kind: 'CommitRow', w: 1 },
  { kind: 'CommitRow', w: 2 },
  { kind: 'Poll' },
]

const sorted = (xs: readonly number[]): number[] => [...new Set(xs)].sort((a, b) => a - b)

/** The rows the next poll reads. */
export function batch(d: Design, s: State): number[] {
  return d === 'mark' ? s.committedIds.filter((i) => i > s.mark) : s.committedIds.filter((i) => !s.delivered.includes(i))
}

export function step(d: Design, s: State, a: Action): State | null {
  switch (a.kind) {
    case 'Insert':
      return s.wpc[a.w] !== 'idle'
        ? null
        : { ...s, wpc: { ...s.wpc, [a.w]: 'inserted' }, idOf: { ...s.idOf, [a.w]: s.nextId }, nextId: s.nextId + 1 }
    case 'CommitRow':
      return s.wpc[a.w] !== 'inserted'
        ? null
        : { ...s, wpc: { ...s.wpc, [a.w]: 'committed' }, committedIds: sorted([...s.committedIds, s.idOf[a.w]]) }
    case 'Poll': {
      const b = batch(d, s)
      if (b.length === 0) return null
      return { ...s, delivered: sorted([...s.delivered, ...b]), mark: d === 'mark' ? Math.max(s.mark, ...b) : s.mark }
    }
  }
}

export const enabled = (d: Design, s: State): Action[] => ACTIONS.filter((a) => step(d, s, a) !== null)

export const actionName = (a: Action): string =>
  a.kind === 'Poll' ? 'Poll' : a.kind === 'Insert' ? `Writer ${a.w} inserts` : `Writer ${a.w} commits`

export const traceText = (t: readonly Action[]): string => t.map(actionName).join(', ')

/** Committed rows at or below the mark that were never delivered: MarkInv's counterexamples. No poll can reach them. */
export function stranded(d: Design, s: State): number[] {
  if (d !== 'mark') return []
  return s.committedIds.filter((i) => i <= s.mark && !s.delivered.includes(i))
}

export interface Search {
  readonly trace: Action[] | null
  readonly states: number
}

/** Breadth-first over every reachable state of the design, for the shortest trace that strands a committed row. */
export function shortestStranding(d: Design): Search {
  const key = (s: State): string => JSON.stringify(s)
  const seen = new Map<string, { prev: string | null; via: Action | null }>([[key(INIT), { prev: null, via: null }]])
  const queue: State[] = [INIT]
  while (queue.length > 0) {
    const s = queue.shift() as State
    const k = key(s)
    if (stranded(d, s).length > 0) {
      const trace: Action[] = []
      let cur: string | null = k
      while (cur !== null) {
        const e = seen.get(cur)
        if (e === undefined || e.via === null) break
        trace.unshift(e.via)
        cur = e.prev
      }
      return { trace, states: seen.size }
    }
    for (const a of enabled(d, s)) {
      const t = step(d, s, a) as State
      const tk = key(t)
      if (seen.has(tk)) continue
      seen.set(tk, { prev: k, via: a })
      queue.push(t)
    }
  }
  return { trace: null, states: seen.size }
}

export function run(d: Design, trace: readonly Action[]): State | null {
  let s: State | null = INIT
  for (const a of trace) {
    if (s === null) return null
    s = step(d, s, a)
  }
  return s
}

/** Every reachable state where the writers are done and no poll is enabled: are all committed rows delivered there? */
export function everyEndDelivers(d: Design): { ends: number; allDelivered: boolean } {
  const key = (s: State): string => JSON.stringify(s)
  const seen = new Set<string>([key(INIT)])
  const queue: State[] = [INIT]
  let ends = 0
  let all = true
  while (queue.length > 0) {
    const s = queue.shift() as State
    const next = enabled(d, s)
    if (next.length === 0) {
      ends++
      if (s.committedIds.some((i) => !s.delivered.includes(i))) all = false
    }
    for (const a of next) {
      const t = step(d, s, a) as State
      if (!seen.has(key(t))) {
        seen.add(key(t))
        queue.push(t)
      }
    }
  }
  return { ends, allDelivered: all }
}
