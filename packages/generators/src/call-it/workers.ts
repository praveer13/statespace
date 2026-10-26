// A small transition system checked in the tab: n workers withdraw a fixed amount from one shared balance, each in a
// fixed number of steps (the interleaving granularity), and the property is NoOverspend (the balance never goes below
// zero). It is the course's DoubleSpend specimen in miniature [D]: with the check and the debit in one atomic step no
// interleaving overspends; split into steps, two workers can both pass the check before either debits.
//
// The checker explores the whole finite state graph from the initial state, breadth first, so its shortest violating
// trace is exact at the printed constants (ASSESSMENT.md section 4.6, Trace; section 4.12, t2). It stands in for the
// TLC state graph that GEN-find-the-witness's and GEN-call-it's trace templates name, which the tab does not run yet.
//
// Pure: no DOM, storage or network.

export interface WorkerSpec {
  /** The balance at the start. */
  readonly init: number
  /** What each worker withdraws. */
  readonly amount: number
  /** How many workers run. */
  readonly workers: number
  /** Steps per withdrawal: 1 check-and-debit; 2 check, debit; 3 read, check, debit; 4 read, check, log, debit. */
  readonly steps: 1 | 2 | 3 | 4
}

export interface WorkerState {
  readonly bal: number
  /** Each worker's next step (0-based), `steps` when done, -1 when refused. */
  readonly pc: readonly number[]
  /** Each worker's read of the balance (steps 3 and 4), or null before it reads. */
  readonly local: readonly (number | null)[]
}

/** One action: a step name and the worker (1-based) that takes it. */
export interface Action {
  readonly step: string
  readonly worker: number
}

const NAMES: Readonly<Record<WorkerSpec['steps'], readonly string[]>> = {
  1: ['Withdraw'],
  2: ['Check', 'Debit'],
  3: ['Read', 'Check', 'Debit'],
  4: ['Read', 'Check', 'Log', 'Debit'],
}

export const stepNames = (spec: WorkerSpec): readonly string[] => NAMES[spec.steps]

export const actionText = (a: Action): string => `${a.step}(w${a.worker})`

export function initialState(spec: WorkerSpec): WorkerState {
  return { bal: spec.init, pc: Array.from({ length: spec.workers }, () => 0), local: Array.from({ length: spec.workers }, () => null) }
}

export const violates = (s: WorkerState): boolean => s.bal < 0

/** The state after worker w takes its next step, or null when that step is not enabled (done, refused, or not its step). */
export function step(spec: WorkerSpec, s: WorkerState, a: Action): WorkerState | null {
  const i = a.worker - 1
  if (i < 0 || i >= spec.workers) return null
  const pc = s.pc[i] as number
  const names = NAMES[spec.steps]
  if (pc < 0 || pc >= names.length || names[pc] !== a.step) return null
  const nextPc = (p: number): number[] => s.pc.map((x, j) => (j === i ? p : x))
  const withLocal = (v: number | null): (number | null)[] => s.local.map((x, j) => (j === i ? v : x))
  switch (a.step) {
    case 'Withdraw':
      return s.bal >= spec.amount ? { bal: s.bal - spec.amount, pc: nextPc(1), local: s.local } : { bal: s.bal, pc: nextPc(-1), local: s.local }
    case 'Read':
      return { bal: s.bal, pc: nextPc(pc + 1), local: withLocal(s.bal) }
    case 'Check': {
      // With a read step the check reads the worker's copy; without one it reads the balance itself.
      const seen = spec.steps >= 3 ? (s.local[i] as number) : s.bal
      return seen >= spec.amount ? { bal: s.bal, pc: nextPc(pc + 1), local: s.local } : { bal: s.bal, pc: nextPc(-1), local: s.local }
    }
    case 'Log':
      return { bal: s.bal, pc: nextPc(pc + 1), local: s.local }
    case 'Debit':
      return { bal: s.bal - spec.amount, pc: nextPc(names.length), local: s.local }
    default:
      return null
  }
}

/** Every action enabled in a state, workers in order. */
export function enabled(spec: WorkerSpec, s: WorkerState): Action[] {
  const out: Action[] = []
  const names = NAMES[spec.steps]
  s.pc.forEach((pc, i) => {
    if (pc >= 0 && pc < names.length) out.push({ step: names[pc] as string, worker: i + 1 })
  })
  return out
}

const keyOf = (s: WorkerState): string => `${s.bal}|${s.pc.join(',')}|${s.local.map((l) => (l === null ? '-' : String(l))).join(',')}`

export interface Exploration {
  /** Distinct states reachable from the initial state. */
  readonly distinct: number
  /** A shortest trace that ends in a violating state, or null when no reachable state violates. */
  readonly shortest: readonly Action[] | null
}

/** Breadth-first exploration of the whole graph, up to maxStates distinct states (null past it). */
export function explore(spec: WorkerSpec, maxStates: number): Exploration | null {
  const start = initialState(spec)
  const seen = new Map<string, { readonly prev: string | null; readonly via: Action | null }>([[keyOf(start), { prev: null, via: null }]])
  let frontier: WorkerState[] = [start]
  let shortest: Action[] | null = violates(start) ? [] : null
  while (frontier.length > 0) {
    const next: WorkerState[] = []
    for (const s of frontier) {
      for (const a of enabled(spec, s)) {
        const t = step(spec, s, a)
        if (t === null) continue
        const k = keyOf(t)
        if (seen.has(k)) continue
        seen.set(k, { prev: keyOf(s), via: a })
        if (seen.size > maxStates) return null
        if (shortest === null && violates(t)) {
          const path: Action[] = []
          let cur: string | null = k
          while (cur !== null) {
            const e = seen.get(cur)
            if (e === undefined || e.via === null) break
            path.unshift(e.via)
            cur = e.prev
          }
          shortest = path
        }
        next.push(t)
      }
    }
    frontier = next
  }
  return { distinct: seen.size, shortest }
}

/** Replay a trace from the initial state: the states it passes through, or the index of the first step not enabled. */
export function replay(spec: WorkerSpec, trace: readonly Action[]): { readonly ok: true; readonly states: readonly WorkerState[] } | { readonly ok: false; readonly at: number } {
  let s = initialState(spec)
  const states: WorkerState[] = [s]
  for (let i = 0; i < trace.length; i++) {
    const t = step(spec, s, trace[i] as Action)
    if (t === null) return { ok: false, at: i }
    s = t
    states.push(s)
  }
  return { ok: true, states }
}

/** The constants as a stem prints them. */
export const specText = (spec: WorkerSpec): string => `Init = ${spec.init}, Amount = ${spec.amount}, ${spec.workers} workers`
