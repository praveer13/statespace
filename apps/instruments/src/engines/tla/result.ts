// What a Spectacle run returns in its reply's `witness`, as JSON (`tla-run`, version 1). The main origin parses it
// as data and renders it with text APIs only (apps/site/src/instruments/renderers/tla/, which keeps a copy of
// these types). The supervisor clips the witness at 64 KiB, so the worker drops the graph's values, then the
// graph, before it would reach that.

export interface TlaTraceStep {
  /** The action that took the previous state here, as TLC labels it (`Read(w1)`); null for an initial state. */
  readonly action: string | null
  /** One TLA+ value per variable, in `vars` order. */
  readonly values: readonly string[]
}

export interface TlaGraph {
  /** Breadth-first order: index 0 is the first initial state. `values` is dropped when the graph is large. */
  readonly nodes: readonly { readonly depth: number; readonly values?: readonly string[] }[]
  /** [from, to, action label]. */
  readonly edges: readonly (readonly [number, number, string])[]
  readonly init: readonly number[]
  /** The counterexample's states, by node index, first to last. */
  readonly trace: readonly number[]
  /** True when the search reached every state, so the graph is the whole reachable graph. */
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
  /** `stopped`: the wall-clock budget ended the search before any error and before it was complete. */
  readonly verdict: 'violated' | 'deadlock' | 'ok' | 'stopped'
  readonly invariant: string | null
  readonly initStates: number
  /** TLC's counts at the verdict (at the end when there is no error), breadth first with one worker. */
  readonly tlc: { readonly generated: number; readonly distinct: number; readonly left: number; readonly depth: number }
  /** How far the search went in all, to draw the graph. */
  readonly explored: { readonly distinct: number; readonly complete: boolean }
  readonly budgetMs: number
  readonly vars: readonly string[]
  /** The counterexample, first state first; empty when there is none. */
  readonly trace: readonly TlaTraceStep[]
  readonly graph: TlaGraph | null
  readonly ms: number
}
