// GEN-trace-allowed's spec in the tab: DoubleSpend (research/spikes/tla/DoubleSpend.tla, the spec RUN-tlc-full and
// RUN-tlc-doublespend ran), written as plain code so this page can build its state graph at an item's constants.
//
// Each worker reads the balance into a local `seen`, then in a separate step writes `seen - Amount`. With `steps: 2`
// the read also decides whether the worker goes on (the recorded spec); with `steps: 3` a separate Check step reads
// the local `seen` and decides, so the guard sits on a local variable. The property is NoOverspend: spent <= Init.
//
// explore() builds the complete reachable graph by breadth-first search, as TLC does with one worker, and counts
// states the way TLC prints them: distinct states, states generated (the initial state plus every successor,
// duplicates included) and depth (the longest shortest path, in states). Its counts at the recorded constants are
// checked against RUN-tlc-full in the family's tests.
//
// Pure: no DOM, storage or network.

export interface WorkerModel {
  readonly init: number
  readonly amount: number
  readonly workers: number
  /** 2: Read decides, then Write (the recorded spec); 3: Read, then Check on the local `seen`, then Write. */
  readonly steps: 2 | 3
}

export type Pc = 'read' | 'check' | 'write' | 'done'

export interface WState {
  readonly bal: number
  readonly spent: number
  readonly pc: readonly Pc[]
  readonly seen: readonly number[]
}

export interface Edge {
  readonly from: number
  readonly action: string
  readonly to: number
}

export interface Graph {
  readonly states: readonly WState[]
  readonly edges: readonly Edge[]
  /** The initial state's index (always 0). */
  readonly init: number
  readonly distinct: number
  readonly generated: number
  readonly depth: number
}

export const workerName = (i: number): string => `w${i + 1}`

export function initial(m: WorkerModel): WState {
  return { bal: m.init, spent: 0, pc: Array.from({ length: m.workers }, () => 'read' as Pc), seen: Array.from({ length: m.workers }, () => 0) }
}

export const stateKey = (s: WState): string => `${s.bal}|${s.spent}|${s.pc.join(',')}|${s.seen.join(',')}`

const setAt = <T>(xs: readonly T[], i: number, v: T): T[] => xs.map((x, j) => (j === i ? v : x))

/** The action names of Next for one worker, in program order. */
export function actionsOf(m: WorkerModel, w: number): string[] {
  const n = workerName(w)
  return m.steps === 2 ? [`Read(${n})`, `Write(${n})`] : [`Read(${n})`, `Check(${n})`, `Write(${n})`]
}

/** Every action of Next, worker by worker. */
export function allActions(m: WorkerModel): string[] {
  const out: string[] = []
  for (let w = 0; w < m.workers; w++) out.push(...actionsOf(m, w))
  return out
}

/** The successors of a state: one per enabled action, in worker order. */
export function successors(m: WorkerModel, s: WState): { action: string; to: WState }[] {
  const out: { action: string; to: WState }[] = []
  for (let w = 0; w < m.workers; w++) {
    const n = workerName(w)
    const pc = s.pc[w]
    if (pc === 'read') {
      const next: Pc = m.steps === 3 ? 'check' : s.bal >= m.amount ? 'write' : 'done'
      out.push({ action: `Read(${n})`, to: { ...s, seen: setAt(s.seen, w, s.bal), pc: setAt(s.pc, w, next) } })
    } else if (pc === 'check') {
      const seen = s.seen[w] as number
      out.push({ action: `Check(${n})`, to: { ...s, pc: setAt(s.pc, w, seen >= m.amount ? 'write' : 'done') } })
    } else if (pc === 'write') {
      out.push({ action: `Write(${n})`, to: { ...s, bal: (s.seen[w] as number) - m.amount, spent: s.spent + m.amount, pc: setAt(s.pc, w, 'done') } })
    }
  }
  return out
}

/** NoOverspend == spent <= Init. */
export const noOverspend = (m: WorkerModel, s: WState): boolean => s.spent <= m.init

/** The complete reachable graph, breadth first, or null when it holds more than maxStates states. */
export function explore(m: WorkerModel, maxStates: number): Graph | null {
  const states: WState[] = [initial(m)]
  const index = new Map<string, number>([[stateKey(states[0] as WState), 0]])
  const level: number[] = [1]
  const edges: Edge[] = []
  let generated = 1
  for (let i = 0; i < states.length; i++) {
    const s = states[i] as WState
    for (const { action, to } of successors(m, s)) {
      generated++
      const k = stateKey(to)
      let j = index.get(k)
      if (j === undefined) {
        if (states.length >= maxStates) return null
        j = states.length
        states.push(to)
        index.set(k, j)
        level.push((level[i] as number) + 1)
      }
      edges.push({ from: i, action, to: j })
    }
  }
  let depth = 0
  for (const l of level) if (l > depth) depth = l
  return { states, edges, init: 0, distinct: states.length, generated, depth }
}

/** The edge from a state by an action, if the action is enabled there. */
export function step(g: Graph, from: number, action: string): number | undefined {
  for (const e of g.edges) if (e.from === from && e.action === action) return e.to
  return undefined
}

export function enabledAt(g: Graph, from: number): string[] {
  return g.edges.filter((e) => e.from === from).map((e) => e.action)
}

export function indexOf(g: Graph, s: WState): number | undefined {
  const k = stateKey(s)
  const i = g.states.findIndex((t) => stateKey(t) === k)
  return i < 0 ? undefined : i
}

/** A state as the item prints it: bal = 100, spent = 0, w1 read (seen 0), w2 write (seen 100). */
export function showState(s: WState): string {
  const ws = s.pc.map((pc, i) => `${workerName(i)} ${pc}${pc === 'read' ? '' : ` (seen ${s.seen[i] as number})`}`)
  return `bal = ${s.bal}, spent = ${s.spent}, ${ws.join(', ')}`
}

/** The worker an action belongs to: Read(w2) -> 1. */
export function workerOf(action: string): number {
  const m = /\(w([0-9]+)\)/.exec(action)
  return m === null ? -1 : Number(m[1]) - 1
}

/** The spec as the stem states it. */
export function describeModel(m: WorkerModel): string {
  const ws = Array.from({ length: m.workers }, (_, i) => workerName(i)).join(', ')
  const how =
    m.steps === 2
      ? `Each worker reads the balance into its own \`seen\` (Read), stopping if \`seen < Amount\`; then, in a separate step, writes \`bal := seen - Amount\` and adds Amount to \`spent\` (Write).`
      : `Each worker reads the balance into its own \`seen\` (Read); then checks its \`seen\` against Amount and stops if \`seen < Amount\` (Check); then writes \`bal := seen - Amount\` and adds Amount to \`spent\` (Write). Each is a separate step.`
  return `*Spec:* DoubleSpend with \`Init = ${m.init}\`, \`Amount = ${m.amount}\` and \`Workers = {${ws}}\`, \`Spec == Init_ ∧ [][Next]_vars\`. ${how} *Property:* \`NoOverspend == spent <= Init\`.`
}
