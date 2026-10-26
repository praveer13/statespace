// A Spectacle run's witness (`tla-run`, version 1): a copy of apps/instruments/src/engines/tla/result.ts, kept equal
// by hand until packages/bus holds the one copy. It arrives as JSON text and is read as data only.

export interface TlaTraceStep {
  readonly action: string | null
  readonly values: readonly string[]
}

export interface TlaGraph {
  readonly nodes: readonly { readonly depth: number; readonly values?: readonly string[] }[]
  readonly edges: readonly (readonly [number, number, string])[]
  readonly init: readonly number[]
  readonly trace: readonly number[]
  readonly complete: boolean
}

export interface TlaRun {
  readonly kind: 'tla-run'
  readonly v: 1
  readonly module: string
  readonly init: string
  readonly next: string
  readonly invariants: readonly string[]
  readonly invariantsNamed: boolean
  readonly deadlock: boolean
  readonly constants: Readonly<Record<string, string>>
  readonly actions: readonly string[]
  readonly verdict: 'violated' | 'deadlock' | 'ok' | 'stopped'
  readonly invariant: string | null
  readonly initStates: number
  readonly tlc: { readonly generated: number; readonly distinct: number; readonly left: number; readonly depth: number }
  readonly explored: { readonly distinct: number; readonly complete: boolean }
  readonly budgetMs: number
  readonly vars: readonly string[]
  readonly trace: readonly TlaTraceStep[]
  readonly graph: TlaGraph | null
  readonly ms: number
}

const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x)
const isStrs = (x: unknown): x is string[] => Array.isArray(x) && x.every((s) => typeof s === 'string')

/** The witness, or null when it is not a well-formed `tla-run`; a malformed graph is dropped, not trusted. */
export function parseTlaRun(w: string | null): TlaRun | null {
  if (w === null) return null
  let v: Partial<TlaRun>
  try {
    v = JSON.parse(w) as Partial<TlaRun>
  } catch {
    return null
  }
  if (v === null || typeof v !== 'object' || v.kind !== 'tla-run' || v.v !== 1) return null
  if (typeof v.module !== 'string' || !isStrs(v.vars) || !isStrs(v.invariants) || !Array.isArray(v.trace)) return null
  const t = v.tlc
  if (t === undefined || !isNum(t.generated) || !isNum(t.distinct) || !isNum(t.left) || !isNum(t.depth)) return null
  if (!['violated', 'deadlock', 'ok', 'stopped'].includes(String(v.verdict))) return null
  const trace = v.trace.filter((s): s is TlaTraceStep => s !== null && typeof s === 'object' && isStrs(s.values) && (s.action === null || typeof s.action === 'string'))
  let graph: TlaGraph | null = null
  const g = v.graph
  if (g !== null && g !== undefined && Array.isArray(g.nodes) && Array.isArray(g.edges) && Array.isArray(g.trace) && Array.isArray(g.init)) {
    const n = g.nodes.length
    const okIdx = (i: unknown): i is number => Number.isInteger(i) && (i as number) >= 0 && (i as number) < n
    if (
      g.nodes.every((x) => x !== null && typeof x === 'object' && isNum(x.depth) && (x.values === undefined || isStrs(x.values))) &&
      g.edges.every((e) => Array.isArray(e) && okIdx(e[0]) && okIdx(e[1]) && typeof e[2] === 'string') &&
      g.trace.every(okIdx) &&
      g.init.every(okIdx)
    )
      graph = g
  }
  return { ...(v as TlaRun), trace, graph }
}
