// The course's adapter over Spectacle at commit 5827c22 (ARCHITECTURE.md section 6.3, DECISIONS.md Log item 56).
// Spectacle is used unmodified, for its parser, its constant evaluation and its successor and initial-state
// functions; everything else here is the course's: a breadth-first search in TLC's order with one worker, the
// invariant check on every new state (initial states included), the deadlock check TLC does by default, TLC's
// counts at the verdict, the counterexample trace, and the explored step graph. It follows W0-S04's driver
// (scripts/spikes/W0-S04/harness/driver.js), which matched TLC on 49 of 49 graphs [X RUN-spectacle-s5s8].
//
// It reads Spectacle's globals, which its classic scripts declare in the worker's global scope.

import type { ModelConfig } from './config.ts'
import type { TlaGraph, TlaRun, TlaTraceStep } from './result.ts'

/* eslint-disable @typescript-eslint/no-explicit-any */
declare const TLASpec: any
declare const TlaInterpreter: any
declare const Context: any
declare const TLAState: any
declare const evalExpr: any
declare const parseExprToNode: any
declare const evalExprStrInContext: any
declare const IntValue: any
declare const BoolValue: any
declare const StringValue: any
declare const ModelValue: any
declare const SetValue: any
declare const TupleValue: any
declare const FcnRcdValue: any

/** Graphs above this many states are counted but not drawn. */
export const GRAPH_MAX_STATES = 120

/** TLA+ text for a value, in TLC's print style. */
export function fmt(v: any): string {
  if (v instanceof IntValue) return String(v.val)
  if (v instanceof BoolValue) return v.val ? 'TRUE' : 'FALSE'
  if (v instanceof StringValue) return JSON.stringify(v.val)
  if (v instanceof ModelValue) return String(v.val)
  if (v instanceof SetValue) {
    const els = (v.getElems() as any[]).map(fmt).sort()
    return `{${els.join(', ')}}`
  }
  if (v instanceof TupleValue) return `<<${(v.elems as any[]).map(fmt).join(', ')}>>`
  if (v instanceof FcnRcdValue) {
    const dom = v.getDomain() as any[]
    const vals = v.getValues() as any[]
    if (v.isRecord) return `[${dom.map((d, i) => `${String(d.getVal())} |-> ${fmt(vals[i])}`).join(', ')}]`
    if (dom.length > 0 && dom.every((d, i) => d instanceof IntValue && d.val === i + 1)) return `<<${vals.map(fmt).join(', ')}>>`
    if (dom.length === 0) return '<<>>'
    return `(${dom.map((d, i) => `${fmt(d)} :> ${fmt(vals[i])}`).join(' @@ ')})`
  }
  return String(v)
}

interface Action {
  readonly label: string
  readonly node: any
  /** Parameter names to substitute from the successor's quantifier bounds, for the label. */
  readonly params: readonly string[]
  /** The quantifier's domain as TLA+ text, when the action is `\E p \in S : ...`. */
  readonly domain: string | null
  /** Actions split from one quantified disjunct share a group, and TLC takes their successors value by value. */
  readonly group: number
}

interface Env {
  readonly spec: any
  readonly consts: any
  readonly interp: any
  readonly cfg: ModelConfig
  readonly actions: readonly Action[]
  readonly invariants: readonly { name: string; node: any }[]
  readonly vars: readonly string[]
}

/** Split `A \/ B \/ C` at the top level (not inside brackets). */
function topDisjuncts(s: string): string[] {
  const out: string[] = []
  let depth = 0
  let cur = ''
  for (let i = 0; i < s.length; i++) {
    const c = s[i] as string
    if (c === '(' || c === '[' || c === '{') depth++
    else if (c === ')' || c === ']' || c === '}') depth--
    if (depth === 0 && s.startsWith('\\/', i)) {
      out.push(cur)
      cur = ''
      i++
      continue
    }
    cur += c
  }
  out.push(cur)
  return out.map((x) => x.trim()).filter((x) => x !== '')
}

/**
 * The actions of NEXT, each with a label TLC would print: Spectacle splits the top-level disjunction; a
 * quantified disjunct `\E w \in S : A(w) \/ B(w)` is split once more into `\E w \in S : A(w)` and
 * `\E w \in S : B(w)`, and its label takes the bound value, as in `Read(w1)`.
 */
function actionsOf(spec: any, next: string): Action[] {
  const def = spec.getDefinitionByName(next)
  if (def === undefined) throw new Error(`the spec defines no ${next} (NEXT)`)
  const parsed = spec.parseActionsFromNode(def.node) as { name: string; node: any }[]
  const out: Action[] = []
  let group = 0
  for (const a of parsed) {
    group++
    const text = String(a.node.text ?? '').trim()
    const q = /^\\E\s+([\s\S]+?)\s+\\in\s+([\s\S]+?)\s*:\s*([\s\S]+)$/.exec(text)
    if (q !== null) {
      const vars = (q[1] as string).split(',').map((x) => x.trim())
      const body = (q[3] as string).replace(/^\(([\s\S]*)\)$/, '$1')
      const parts = topDisjuncts(body)
      if (parts.length > 1 && parts.every((p) => /^[A-Za-z_]\w*(\([^()]*\))?$/.test(p))) {
        for (const p of parts) out.push({ label: p, node: parseExprToNode(`\\E ${q[1]} \\in ${q[2]} : ${p}`), params: vars, domain: (q[2] as string).trim(), group })
        continue
      }
      const one = body.trim()
      out.push({ label: /^[A-Za-z_]\w*(\([^()]*\))?$/.test(one) ? one : a.name, node: a.node, params: vars, domain: (q[2] as string).trim(), group })
      continue
    }
    out.push({ label: a.name, node: a.node, params: [], domain: null, group })
  }
  return out
}

function labelFor(a: Action, ctx: any): string {
  if (a.params.length === 0) return a.label
  const qb = (ctx?.quant_bound ?? {}) as Record<string, any>
  let s = a.label
  for (const p of a.params) {
    const v = qb[p]
    if (v !== undefined) s = s.replace(new RegExp(`\\b${p}\\b`, 'g'), fmt(v))
  }
  return s
}

export async function parseModule(text: string, cfg: ModelConfig): Promise<any> {
  // Spectacle asks fetch() for each EXTENDS target that is not a standard module; the adapter answers each one
  // itself and refuses every name (one module per cell; community modules would come from a third-party URL).
  const before = self.fetch
  const asked: string[] = []
  self.fetch = ((url: RequestInfo | URL) => {
    const name = String(url).split('/').pop() ?? String(url)
    asked.push(name.replace(/\.tla$/, ''))
    return Promise.resolve(new Response('', { status: 404 }))
  }) as typeof self.fetch
  try {
    const refuse = (): Error => new Error(`this cell runs one module; it cannot load ${asked.join(', ')} (EXTENDS standard modules only, or paste the definitions in)`)
    const spec = new TLASpec(text, `https://module.invalid/${cfg.module}.tla`)
    try {
      await spec.parse()
    } catch (e) {
      throw asked.length > 0 ? refuse() : e
    }
    if (asked.length > 0) throw refuse()
    return spec
  } finally {
    self.fetch = before
  }
}

function makeEnv(spec: any, cfg: ModelConfig): Env {
  const declared = Object.keys(spec.spec_obj.const_decls ?? {})
  const missing = declared.filter((c) => !(c in cfg.constants))
  if (missing.length > 0) throw new Error(`no value for CONSTANT ${missing.join(', ')}; give one in a comment after ====, as \\* ${missing[0]} = ...`)
  const consts: Record<string, any> = {}
  for (const k of declared) {
    const ctx = new Context(null, new TLAState({}), spec.spec_obj.op_defs, {}, consts)
    ctx.evalModelVals = true
    consts[k] = evalExprStrInContext(ctx, cfg.constants[k])
  }
  for (const name of [cfg.init, cfg.next, ...cfg.invariants]) {
    if (spec.getDefinitionByName(name) === undefined) throw new Error(`the spec defines no ${name}`)
  }
  const vars = Object.keys(spec.spec_obj.var_decls ?? {})
  return {
    spec,
    consts,
    interp: new TlaInterpreter(),
    cfg,
    actions: actionsOf(spec, cfg.next),
    invariants: cfg.invariants.map((name) => ({ name, node: parseExprToNode(name) })),
    vars,
  }
}

function holds(env: Env, st: any, inv: { name: string; node: any }): boolean {
  const v = evalExpr(inv.node, ctxFor(env, st))[0].val
  if (!(v instanceof BoolValue)) throw new Error(`invariant ${inv.name} is not a Boolean in some state`)
  return v.val as boolean
}

function ctxFor(env: Env, st: any): any {
  const ctx = new Context(null, st, env.spec.spec_obj.op_defs, {}, env.consts)
  ctx.defns_curr_context = Object.keys(env.spec.spec_obj.op_defs)
  ctx.setGlobalDefTable(env.spec.globalDefTable)
  ctx.setSpecObj(env.spec)
  return ctx
}

const domainNodes = new Map<string, any>()

/** The fingerprints of a quantifier domain's elements, in Spectacle's (and TLC's) enumeration order. */
function domainOrder(env: Env, st: any, domain: string): Map<string, number> {
  let node = domainNodes.get(domain)
  if (node === undefined) {
    node = parseExprToNode(domain)
    domainNodes.set(domain, node)
  }
  const v = evalExpr(node, ctxFor(env, st))[0].val
  const order = new Map<string, number>()
  const els = v instanceof SetValue ? (v.getElems() as any[]) : []
  els.forEach((e, i) => order.set(String(e.fingerprint()), i))
  return order
}

/**
 * Successors in TLC's order: the disjuncts of NEXT in turn, and within `\E w \in S : A(w) \/ B(w)`, each w
 * of S in turn with A then B. The order decides which error a breadth-first search meets first, and so TLC's
 * counts at that error.
 */
function successors(env: Env, st: any): { state: any; label: string }[] {
  const out: { state: any; label: string }[] = []
  let i = 0
  while (i < env.actions.length) {
    const g = (env.actions[i] as Action).group
    const members: Action[] = []
    while (i < env.actions.length && (env.actions[i] as Action).group === g) members.push(env.actions[i++] as Action)
    const found: { state: any; label: string; v: number; a: number; k: number }[] = []
    const first = members[0] as Action
    const order = members.length > 1 && first.domain !== null && first.params.length === 1 ? domainOrder(env, st, first.domain) : null
    members.forEach((a, ai) => {
      const res = env.interp.computeNextStates(env.spec.spec_obj, env.consts, [st], a.node, env.spec, env.cfg.next) as any[]
      res.forEach((c, k) => {
        const bound = order !== null ? c?.quant_bound?.[first.params[0] as string] : undefined
        const v = bound !== undefined ? (order?.get(String(bound.fingerprint())) ?? 0) : 0
        found.push({ state: c.state.deprimeVars(), label: labelFor(a, c), v, a: ai, k })
      })
    })
    found.sort((x, y) => x.v - y.v || x.a - y.a || x.k - y.k)
    for (const f of found) out.push({ state: f.state, label: f.label })
  }
  return out
}

export interface CheckOptions {
  /** The engine budget: the search stops here and keeps a partial verdict. */
  readonly budgetMs: number
  readonly onProgress?: (distinct: number, queued: number, ms: number) => void
}

/**
 * Check the model as TLC would with `-workers 1`: breadth first; each new state's invariants as it is found; a
 * state with no successor is a deadlock when the check is on. TLC's counts are taken at the first error. The
 * search then goes on, within the budget, to complete the step graph the cell draws.
 */
export function check(spec: any, cfg: ModelConfig, opts: CheckOptions): TlaRun {
  const t0 = performance.now()
  const env = makeEnv(spec, cfg)
  const fps = new Map<string, number>()
  const states: any[] = []
  const depth: number[] = []
  const pred: (number | null)[] = []
  const via: (string | null)[] = []
  const edges: [number, number, string][] = []
  const init: number[] = []
  let generated = 0
  let queue: number[] = []
  let qi = 0
  let verdict: TlaRun['verdict'] = 'ok'
  let invariant: string | null = null
  let at: TlaRun['tlc'] | null = null
  let bad: number | null = null
  let stopped = false
  let lastTick = t0

  const add = (st: any, from: number | null, label: string | null): { idx: number; fresh: boolean } => {
    const fp = String(st.fingerprint())
    const seen = fps.get(fp)
    if (seen !== undefined) return { idx: seen, fresh: false }
    const idx = states.length
    fps.set(fp, idx)
    states.push(st)
    depth.push(from === null ? 1 : (depth[from] as number) + 1)
    pred.push(from)
    via.push(label)
    return { idx, fresh: true }
  }
  const maxDepth = (): number => depth.reduce((m, d) => (d > m ? d : m), 0)
  const event = (kind: 'violated' | 'deadlock', idx: number, inv: string | null, left: number): void => {
    if (at !== null) return
    verdict = kind
    invariant = inv
    bad = idx
    at = { generated, distinct: states.length, left, depth: maxDepth() }
  }
  const firstBroken = (st: any): string | null => {
    for (const inv of env.invariants) if (!holds(env, st, inv)) return inv.name
    return null
  }

  const inits = env.interp.computeInitStates(env.spec.spec_obj, env.consts, false, env.spec, cfg.init) as any[]
  for (const st of inits) {
    generated++
    const r = add(st, null, null)
    if (!r.fresh) continue
    init.push(r.idx)
    const broken = at === null ? firstBroken(st) : null
    if (broken !== null) event('violated', r.idx, broken, queue.length)
    else queue.push(r.idx)
  }
  const initCount = init.length

  while (qi < queue.length) {
    const now = performance.now()
    if (now - t0 > opts.budgetMs) {
      stopped = true
      break
    }
    if (opts.onProgress !== undefined && now - lastTick > 1000) {
      lastTick = now
      opts.onProgress(states.length, queue.length - qi, now - t0)
    }
    // Past the verdict, the search only completes the graph, and only while it stays small enough to draw.
    if (at !== null && states.length > GRAPH_MAX_STATES) break
    const idx = queue[qi++] as number
    const succ = successors(env, states[idx])
    if (succ.length === 0 && cfg.deadlock) event('deadlock', idx, null, queue.length - qi)
    for (const s of succ) {
      if (at === null) generated++
      const r = add(s.state, idx, s.label)
      edges.push([idx, r.idx, s.label])
      if (!r.fresh) continue
      const broken = at === null ? firstBroken(s.state) : null
      if (broken !== null) event('violated', r.idx, broken, queue.length - qi)
      else queue.push(r.idx)
    }
  }
  if (qi >= queue.length) queue = []
  const complete = !stopped && qi >= queue.length
  if (at === null) {
    at = { generated, distinct: states.length, left: complete ? 0 : queue.length - qi, depth: maxDepth() }
    if (stopped) verdict = 'stopped'
  }

  const traceOf = (idx: number): number[] => {
    const out: number[] = []
    for (let i: number | null = idx; i !== null; i = pred[i] as number | null) out.push(i)
    return out.reverse()
  }
  const valuesOf = (st: any): string[] => env.vars.map((v) => fmt(st.stateVars[v]))
  const tracePath = bad === null ? [] : traceOf(bad)
  const trace: TlaTraceStep[] = tracePath.map((i) => ({ action: via[i] ?? null, values: valuesOf(states[i]) }))

  let graph: TlaGraph | null = null
  if (states.length <= GRAPH_MAX_STATES) {
    graph = {
      nodes: states.map((st, i) => ({ depth: depth[i] as number, values: valuesOf(st) })),
      edges,
      init,
      trace: tracePath,
      complete,
    }
  }
  return {
    kind: 'tla-run',
    v: 1,
    module: cfg.module,
    init: cfg.init,
    next: cfg.next,
    invariants: [...cfg.invariants],
    invariantsNamed: cfg.invariantsNamed,
    deadlock: cfg.deadlock,
    constants: { ...cfg.constants },
    actions: env.actions.map((a) => a.label),
    verdict,
    invariant,
    initStates: initCount,
    tlc: at,
    explored: { distinct: states.length, complete },
    budgetMs: opts.budgetMs,
    vars: [...env.vars],
    trace,
    graph,
    ms: Math.round(performance.now() - t0),
  }
}
