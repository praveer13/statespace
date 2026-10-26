// Verdict lines in, raw outputs out. The parsers read what the engines print (TLC's report, Lean's and lake
// comparator's messages, a solver's verdict with its model or reason) as the runs registry and receipts carry
// it verbatim. They never trust an exit code alone (ARCHITECTURE.md section 10.3), and they never read past an
// error line: an error that is not a verdict means there is no verdict. GATE-stamps runs them on lines drawn from
// executed runs; GEN-which-stamp keys its items with the same code (ASSESSMENT.md section 4.13). Pure.

import type { Checker, Constants, RawOutput, Replay, WitnessLength } from './raw.ts'

export class ParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ParseError'
  }
}

/**
 * An error line as the engines print one: Lean's and Lake's `error: …` or `<file>:<line>:<col>: error: …`, and an
 * SMT-LIB solver's `(error "…")`. A line that only mentions an error further on (after a harness prefix, inside a
 * message) is not one. TLC's `Error:` lines are its verdict vocabulary and parseTlcReport reads them.
 */
export function isErrorLine(line: string): boolean {
  return /^\s*(?:\(error[\s"]|error(?::|\s|$)|[^\s:]+:\d+:\d+:\s*error(?::|\s|$))/.test(line)
}

// ------------------------------------------------------------------ TLC

const CFG_KEYWORDS = /^(?:CONSTANTS?|INIT|NEXT|SPECIFICATION|INVARIANTS?|PROPERT(?:Y|IES)|CONSTRAINTS?|ACTION_CONSTRAINTS?|SYMMETRY|VIEW|CHECK_DEADLOCK|POSTCONDITION|ALIAS)$/

/** The constants a TLC configuration assigns, in order and verbatim: `CONSTANTS Init = 100  Amount = 80`. */
export function parseTlcConstants(cfg: string): Constants {
  const words = cfg.replace(/\\\*.*$/gm, '').replace(/\(\*[\s\S]*?\*\)/g, ' ')
  const out: [string, string][] = []
  const re = /\bCONSTANTS?\b([\s\S]*?)(?=\n\s*[A-Z_]{4,}\b(?!\s*=)|$)/g
  for (const m of words.matchAll(re)) {
    const body = m[1] ?? ''
    // split at each `name =` or `name <-` that starts an assignment at brace depth 0
    let depth = 0
    let cur = ''
    const parts: string[] = []
    for (let i = 0; i < body.length; i += 1) {
      const c = body[i] ?? ''
      if ('{(<['.includes(c)) depth += 1
      if ('})>]'.includes(c) && !(c === '>' && body[i - 1] === '-')) depth -= 1
      if (depth === 0 && /\s/.test(c)) {
        const rest = body.slice(i)
        const next = /^\s+([A-Za-z_][A-Za-z0-9_]*)\s*(=|<-)/.exec(rest)
        if (next && cur.includes('=') && !CFG_KEYWORDS.test(next[1] ?? '')) {
          parts.push(cur)
          cur = ''
          continue
        }
      }
      cur += c
    }
    if (cur.trim() !== '') parts.push(cur)
    for (const p of parts) {
      const a = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*(?:=|<-)\s*([\s\S]*?)\s*$/.exec(p)
      if (a && a[1] && a[2] !== undefined && !CFG_KEYWORDS.test(a[1])) out.push([a[1], a[2].replace(/\s+/g, ' ')])
    }
  }
  return out
}

export interface TlcReport {
  readonly result: 'no-error' | 'deadlock' | 'violated' | 'unfinished'
  readonly distinctStates?: number
  readonly statesGenerated?: number
  readonly leftOnQueue?: number
  readonly depth?: number
  /** The violated property, as TLC names it. */
  readonly property?: string
  /** The number of states in the counterexample trace, counted from TLC's `State k:` lines. */
  readonly traceStates?: number
  /** "Model checking completed" and nothing left on the queue. */
  readonly complete: boolean
  /** TLC's `Error:` lines outside its verdict vocabulary (a parse failure, an exception): TLC reached no verdict. */
  readonly errorLines: readonly string[]
}

const int = (s: string): number => Number(s.replace(/,/g, ''))

/** TLC's verdict vocabulary among its `Error:` lines: a violation, a deadlock stop, and the trace that follows. */
const TLC_VERDICT_ERROR = /^Error: (?:(?:Invariant|Temporal property|Action property) \S+ (?:is|was) violated|Deadlock reached\.|The behavior up to this point is:|The following behaviou?r constitutes a counter-example:)/

/** Read TLC's report: its result, its counts and the counterexample's length. */
export function parseTlcReport(lines: readonly string[]): TlcReport {
  const errorLines = lines.map((l) => l.trim()).filter((l) => /^Error:/.test(l) && !TLC_VERDICT_ERROR.test(l))
  const text = lines.join('\n')
  const counts = /([\d,]+) states? generated, ([\d,]+) distinct states? found, ([\d,]+) states? left on queue/.exec(text)
  const depth = /The depth of the complete state graph search is (\d+)/.exec(text)
  const violated = /Error: (?:Invariant|Temporal property|Action property) (\S+) (?:is|was) violated/.exec(text)
  const deadlock = /Error: Deadlock reached\./.test(text)
  const noError = /Model checking completed\. No error has been found\./.test(text)
  const stateNos = [...text.matchAll(/^\s*State (\d+):/gm)].map((m) => int(m[1] ?? '0'))
  const leftOnQueue = counts ? int(counts[3] ?? '') : undefined
  const report: TlcReport = {
    result: violated ? 'violated' : deadlock ? 'deadlock' : noError ? 'no-error' : 'unfinished',
    distinctStates: counts ? int(counts[2] ?? '') : undefined,
    statesGenerated: counts ? int(counts[1] ?? '') : undefined,
    leftOnQueue,
    depth: depth ? int(depth[1] ?? '') : undefined,
    property: violated?.[1],
    traceStates: stateNos.length > 0 ? Math.max(...stateNos) : undefined,
    complete: noError && leftOnQueue === 0,
    errorLines,
  }
  return report
}

export interface TlcContext {
  readonly engine: Checker
  readonly constants: Constants
  /** True when the property under check is deadlock freedom, so a deadlock is the violation itself. */
  readonly deadlockFreedom?: boolean
  /** A stated bound or state constraint the run stopped at, such as "depth 20". */
  readonly bound?: string
}

/**
 * A TLC report as a raw output. A violation's witness is its trace length in actions (states − 1). An `Error:` line
 * outside TLC's verdict vocabulary means TLC reached no verdict, so a stated bound cannot turn it into [M].
 */
export function rawFromTlc(report: TlcReport, ctx: TlcContext): RawOutput {
  const error = report.errorLines[0]
  if (error !== undefined) throw new ParseError(`TLC reported an error that is not a verdict, so it reached none: ${error}`)
  const distinct = report.distinctStates
  switch (report.result) {
    case 'no-error':
      if (!report.complete) {
        if (ctx.bound === undefined) throw new ParseError('TLC finished with states left on the queue but no bound was stated')
        return { kind: 'model-check-bounded', engine: ctx.engine, bound: ctx.bound, constants: ctx.constants, distinctStates: distinct }
      }
      if (distinct === undefined) throw new ParseError('TLC reported no error but printed no distinct-state count')
      return { kind: 'tlc-complete', engine: ctx.engine, constants: ctx.constants, distinctStates: distinct }
    case 'deadlock': {
      if (distinct === undefined) throw new ParseError('TLC reached a deadlock but printed no distinct-state count')
      const witness = report.traceStates !== undefined ? traceWitness(report.traceStates) : undefined
      // a deadlock that violates deadlock freedom is [R] with its witness's length, so the lines must hold the trace
      if (ctx.deadlockFreedom === true && witness === undefined) throw new ParseError('TLC reached a deadlock that violates deadlock freedom, but the lines hold no trace to give its length')
      return { kind: 'tlc-deadlock', engine: ctx.engine, distinctStates: distinct, deadlockFreedom: ctx.deadlockFreedom === true, ...(witness ? { witness } : {}) }
    }
    case 'violated':
      if (report.traceStates === undefined) throw new ParseError(`TLC reported ${report.property ?? 'a property'} violated, but the lines hold no trace`)
      return { kind: 'tlc-violation', engine: ctx.engine, property: report.property ?? 'the property', witness: traceWitness(report.traceStates) }
    case 'unfinished':
      if (ctx.bound !== undefined) return { kind: 'model-check-bounded', engine: ctx.engine, bound: ctx.bound, constants: ctx.constants, ...(distinct !== undefined ? { distinctStates: distinct } : {}) }
      throw new ParseError('TLC printed no result: no error, no deadlock and no violation')
  }
}

/** A trace of k states is k − 1 actions: "4 actions (5 states)". */
export const traceWitness = (states: number): WitnessLength => ({ length: Math.max(0, states - 1), unit: 'actions', states })

// ------------------------------------------------------------------ solvers (Z3, cvc5)

export interface SolverLine {
  readonly verdict: 'sat' | 'unsat' | 'unknown'
  /** The model in brackets, as the solver or its harness printed it. */
  readonly model?: string
  /** The reason for `unknown`, innermost: "incomplete (theory arithmetic)", "canceled". */
  readonly reason?: string
}

/** The innermost-but-one balanced group at the end of a reason: "(incomplete (theory arithmetic))" → its inside. */
function lastGroup(s: string): string | undefined {
  const end = s.lastIndexOf(')')
  if (end < 0) return undefined
  let depth = 0
  for (let i = end; i >= 0; i -= 1) {
    if (s[i] === ')') depth += 1
    if (s[i] === '(') depth -= 1
    if (depth === 0) return s.slice(i + 1, end)
  }
  return undefined
}

/** A harness's label before a verdict, `[1.3 guard added] `, with one level of nested brackets, then an optional `-> `. */
const LABEL = String.raw`\[(?:[^\[\]\n]|\[[^\[\]\n]*\])*\]\s*(?:->\s*)?`
const VERDICT = String.raw`(unsat|sat|unknown)(?![\w/-])`

/**
 * Where a verdict may stand on a line, and nowhere else: first on the line (Z3's and cvc5's own output); after a
 * harness label in brackets (`[1.3 guard added] unsat (0.00s)`, `[issue input 1 (truth: sat, y=2)] -> unknown`);
 * after a case name that is one hyphenated or underscored word (`recipient-wrap sat [M = …]`); after a case name
 * and a colon (`corrected_guard: unsat`, the cvc5 cross-check configurations of the S1 runs), a name that is not an
 * error's or an exception's (`Z3Exception: unsat core is not available` is a message); after the budget harness's
 * time, language and case (`2806ms py: rlimit-case unknown canceled 1.1 s`); or after a solver, its version and an
 * arrow (`cvc5 b'1.4.2-modified' -> unsat`). A verdict word anywhere else (inside a label, a message, a model or a
 * sentence such as "not sat") is not a verdict.
 */
const VERDICT_AT: readonly RegExp[] = [
  new RegExp(String.raw`^\s*(?:${LABEL})?${VERDICT}`),
  new RegExp(String.raw`^\s*[A-Za-z][\w.]*[-_][\w.-]*\s+${VERDICT}`),
  new RegExp(String.raw`^\s*(?![\w.-]*(?:[Ee]rror|ERROR|[Ee]xception|EXCEPTION|[Ww]arning|WARNING))[A-Za-z_][\w.-]*:\s+${VERDICT}`),
  new RegExp(String.raw`^\s*\d+(?:\.\d+)?m?s\s+\w+:\s+[\w.-]+\s+${VERDICT}`),
  new RegExp(String.raw`^\s*[\w.-]+\s+\S+\s+->\s+${VERDICT}`),
]

export interface SolverLineOptions {
  /**
   * What an SMT-LIB `(error …)` line after the verdict means. `no-verdict`, the default: the lines carry no verdict,
   * because nothing in them says which command printed the answer-like word (`(simplify sat)` prints `sat` before a
   * question that fails). `keep`: the verdict stands, which is the Bench CLI's Z3 grammar for the scripts it accepts
   * (bench/statespace/lanes/z3.py): it refuses every command that could print an answer before the one question, so
   * a later error comes from a command that reads the answer, such as `(get-model)` after `unsat` (RUN-z3-verdict-lines,
   * case cli-model-asked-after-unsat). Receipts take `keep`, so the tab re-derives the CLI's verdict (ARCHITECTURE.md
   * section 10.3). An error before the verdict, or a note from the CLI (`statespace: …`), is no verdict either way.
   */
  readonly errorAfterVerdict?: 'no-verdict' | 'keep'
}

/**
 * Read a solver's verdict from the lines of one query: `sat`, `unsat` or `unknown`, the model after `sat`, and the
 * reason after `unknown` (Z3's `:reason-unknown`, or the tactic message a harness prints). The verdict must stand
 * where a verdict stands (VERDICT_AT), on exactly one line; the lines after it continue it, so a model printed over
 * several lines is one model. An SMT-LIB `(error …)` line means the lines carry no verdict (see SolverLineOptions).
 */
export function parseSolverLines(lines: readonly string[], options: SolverLineOptions = {}): SolverLine {
  const note = lines.find((l) => l.startsWith('statespace: '))
  if (note !== undefined) throw new ParseError(`the CLI stopped the solver or saw no answer, so its lines carry no verdict: ${note.trim()}`)
  const isSmtError = (l: string): boolean => /^\s*\(error[\s"]/.test(l)
  const found: { index: number; verdict: SolverLine['verdict']; rest: string }[] = []
  lines.forEach((line, index) => {
    for (const re of VERDICT_AT) {
      const m = re.exec(line)
      if (m && m[1] !== undefined) {
        found.push({ index, verdict: m[1] as SolverLine['verdict'], rest: line.slice(m.index + m[0].length) })
        return
      }
    }
  })
  const first = found[0]
  const error = lines.findIndex(isSmtError)
  if (error >= 0 && (first === undefined || error < first.index || options.errorAfterVerdict !== 'keep')) throw new ParseError(`the solver reported an error, so its lines carry no verdict: ${(lines[error] ?? '').trim()}`)
  if (first === undefined) throw new ParseError('no solver verdict (sat, unsat or unknown) where a verdict stands on a line')
  if (found.length > 1) throw new ParseError(`the lines carry ${found.length} verdicts (${found.map((f) => f.verdict).join(', ')}); pass the lines of one query`)
  const { verdict } = first
  const kept = lines.filter((l) => !isSmtError(l))
  const text = kept.join('\n')
  const after = [first.rest, ...lines.slice(first.index + 1).filter((l) => !isSmtError(l))].join('\n')
  if (verdict === 'sat') {
    const model = /\[([\s\S]*?)\]/.exec(after)
    return model ? { verdict, model: `[${(model[1] ?? '').replace(/\s*\n\s*/g, ' ').trim()}]` } : { verdict }
  }
  if (verdict === 'unknown') {
    const cli = /:reason-unknown\s+"((?:[^"]|"")*)"/.exec(text)
    if (cli) return { verdict, reason: (cli[1] ?? '').replace(/""/g, '"') }
    const group = lastGroup(after.replace(/\(\d+(?:\.\d+)?s\)/g, ''))
    if (group !== undefined && group.trim() !== '') return { verdict, reason: group.trim() }
    const word = /^\s*([a-z][a-z .-]*?)(?:\s+\d[\d.]*\s*s)?\s*$/m.exec(after)
    return word && word[1] ? { verdict, reason: word[1].trim() } : { verdict }
  }
  return { verdict }
}

export interface SolverContext {
  readonly solver: Checker
  /** What the query asserts: a violation of P, or the premises alone. Without it a verdict cannot be read. */
  readonly direction?: 'violation' | 'premise'
  readonly rlimit?: number
  /** Whether a `sat` model replayed (in the interpreter, or by evaluating the property on it). */
  readonly replay?: Replay
  /** A `sat` witness's length: one transfer is "1 step". */
  readonly witness?: WitnessLength
  readonly guardsEnforcement?: boolean
  readonly method?: string
  readonly premise?: 'sat' | 'unsat' | 'not-run'
  readonly crossCheck?: { readonly solver: Checker; readonly verdict: 'sat' | 'unsat' | 'unknown'; readonly sameInput: boolean }
}

/** A solver's verdict as a raw output, read in the query's direction (DESIGN.md section 5.4). */
export function rawFromSolver(line: SolverLine, ctx: SolverContext): RawOutput {
  if (line.verdict === 'unknown') {
    return { kind: 'smt-unknown', solver: ctx.solver, reason: line.reason ?? '', ...(ctx.rlimit !== undefined ? { rlimit: ctx.rlimit } : {}), ...(ctx.guardsEnforcement ? { guardsEnforcement: true } : {}) }
  }
  if (ctx.direction === undefined) return { kind: 'smt-direction-unknown', solver: ctx.solver, verdict: line.verdict }
  if (ctx.direction === 'premise') return { kind: 'smt-premise', solver: ctx.solver, verdict: line.verdict }
  if (line.verdict === 'unsat') {
    return {
      kind: 'smt-unsat',
      solver: ctx.solver,
      ...(ctx.method !== undefined ? { method: ctx.method } : {}),
      ...(ctx.rlimit !== undefined ? { rlimit: ctx.rlimit } : {}),
      ...(ctx.crossCheck ? { crossCheck: ctx.crossCheck } : {}),
      ...(ctx.premise ? { premise: ctx.premise } : {}),
    }
  }
  return { kind: 'smt-sat', solver: ctx.solver, model: line.model ?? '', replay: ctx.replay ?? 'pending', witness: ctx.witness ?? { length: 1, unit: 'steps' } }
}

// ------------------------------------------------------------------ Lean and lake comparator

/** Lean's three standard axioms (Lean 4's own documentation; spine section 8.8's "axioms standard"). */
export const STANDARD_AXIOMS: ReadonlySet<string> = new Set(['propext', 'Quot.sound', 'Classical.choice'])

export interface LeanReport {
  readonly sandboxLine?: string
  readonly mismatch?: { readonly kind: 'statement' | 'constant'; readonly line: string }
  /** The first line of the closed list of rejections: a kernel rejects the solution, leanchecker found a problem, an axiom is not permitted. */
  readonly rejectedLine?: string
  /** Error lines that are neither a mismatch nor a rejection: with one, there is no verdict (spine section 9.6). */
  readonly errorLines: readonly string[]
  /** Exit codes a harness printed beside the lines (`== good comparator rc=0 :: …`), in order. */
  readonly exitCodes: readonly number[]
  /** Axioms by theorem, from `#print axioms` lines (every axiom any line names for it); theorem "" for lines that list axioms without naming one. */
  readonly axioms: ReadonlyMap<string, readonly string[]>
  readonly sorryWarnings: number
  readonly comparatorAccepted: boolean
  /** The checkers that printed "accepts the solution". */
  readonly acceptingCheckers: readonly string[]
}

/**
 * The research harness's prefix: `== good comparator(no-sandbox) rc=0 :: <output>`, or a header line alone,
 * `== good --paranoid rc=0 secs=3`. Its `rc` is the exit code of the run whose output follows.
 */
function harnessLine(line: string): { readonly rc?: number; readonly body: string } {
  if (!line.startsWith('== ')) return { body: line }
  const sep = line.indexOf(' :: ')
  const rc = /\brc=(\d+)\b/.exec(sep >= 0 ? line.slice(0, sep) : line)
  return { ...(rc?.[1] !== undefined ? { rc: Number(rc[1]) } : {}), body: sep >= 0 ? line.slice(sep + 4).trim() : '' }
}

/** Read Lean's, lake check's and lake comparator's messages. */
export function parseLeanReport(lines: readonly string[]): LeanReport {
  let sandboxLine: string | undefined
  let mismatch: LeanReport['mismatch']
  let rejectedLine: string | undefined
  const errorLines: string[] = []
  const exitCodes: number[] = []
  const axioms = new Map<string, string[]>()
  // a theorem whose axioms are printed twice keeps every axiom either line names, so no line hides another's
  const list = (s: string | undefined): string[] => (s ?? '').split(',').map((a) => a.trim()).filter((a) => a !== '')
  const note = (name: string, found: readonly string[]): void => void axioms.set(name, [...new Set([...(axioms.get(name) ?? []), ...found])])
  let sorryWarnings = 0
  let comparatorAccepted = false
  const accepting: string[] = []
  for (const raw of lines) {
    const { rc, body: line } = harnessLine(raw.trim())
    if (rc !== undefined) exitCodes.push(rc)
    const bwrap = /(?:^|\s)(bwrap: (?!\/\S*$).*)$/.exec(line)
    if (bwrap && bwrap[1] && sandboxLine === undefined) sandboxLine = bwrap[1]
    // a statement mismatch outranks a constant mismatch wherever it stands among the lines, so the reading never
    // depends on which of the two a comparator printed first
    const stmt = /(?:error: )?Challenge and solution theorem statement do not match.*|theorem statement do not match.*/.exec(line)
    if (stmt && mismatch?.kind !== 'statement') mismatch = { kind: 'statement', line: stmt[0] }
    const cnst = /(?:error: )?Const does not match.*/.exec(line)
    if (cnst && !mismatch) mismatch = { kind: 'constant', line: cnst[0] }
    const rej = /(?:\S+ )?(?:kernel rejects the solution|found a problem in .*)|(?:error: )?Axiom '[^']+' is not permitted.*/.exec(line)
    if (rej && rejectedLine === undefined) rejectedLine = rej[0]
    if (isErrorLine(line) && !stmt && !cnst && !rej) errorLines.push(line)
    const dep = /'([^']+)' depends on axioms: \[([^\]]*)\]/.exec(line)
    if (dep && dep[1] !== undefined) note(dep[1], list(dep[2]))
    const nodep = /'([^']+)' does not depend on any axioms/.exec(line)
    if (nodep && nodep[1] !== undefined) note(nodep[1], [])
    const uses = /^Uses axioms: (.*)$/.exec(line)
    if (uses) note('', list(uses[1]))
    if (/declaration uses `sorry`/.test(line)) sorryWarnings += 1
    if (/Your solution is okay!/.test(line)) comparatorAccepted = true
    const acc = /^(.+?) (?:kernel )?accepts the solution$/.exec(line)
    if (acc && acc[1] !== undefined) accepting.push(acc[1])
  }
  return { sandboxLine, mismatch, rejectedLine, errorLines, exitCodes, axioms, sorryWarnings, comparatorAccepted, acceptingCheckers: accepting }
}

export interface LeanContext {
  readonly lean: Checker
  /**
   * The checker's exit code. It marks a killed checker (137 or 143), and an acceptance needs it to be 0 when it is
   * known (spine section 9.6); it is never read as a verdict alone.
   */
  readonly exitCode?: number
  /** Whether `--paranoid` ran, so the accepting checkers are counted into the qualifier. */
  readonly paranoid?: boolean
}

/**
 * Classify a Lean report under spine sections 8.8 and 9.6 ("every Lean verdict is read by one rule"). Precedence: a
 * sandbox failure or a killed checker gives no verdict; then a comparator mismatch; then a rejection, by a line of
 * the closed list; then any other error line, or a non-zero exit, is no verdict; then `sorryAx` and a custom axiom
 * give the "modulo" reading. Only then can a solution be accepted, and only with an accept line: a `_native` axiom
 * gives [P] · kernel + compiler, standard axioms [P] · kernel. Lines with none of these are no verdict either
 * (ParseError).
 */
export function rawFromLean(report: LeanReport, ctx: LeanContext): RawOutput {
  if (report.sandboxLine !== undefined) return { kind: 'lean-tool-error', lean: ctx.lean, line: report.sandboxLine }
  const exits = [...(ctx.exitCode !== undefined ? [ctx.exitCode] : []), ...report.exitCodes]
  const killed = exits.find((c) => c === 137 || c === 143)
  if (killed !== undefined) return { kind: 'lean-tool-error', lean: ctx.lean, exitCode: killed }
  if (report.mismatch) return { kind: 'lean-mismatch', lean: ctx.lean, mismatch: report.mismatch.kind, line: report.mismatch.line }
  if (report.rejectedLine !== undefined) return { kind: 'lean-rejected', lean: ctx.lean, line: report.rejectedLine }
  const nonZero = exits.find((c) => c !== 0)
  const error = report.errorLines[0]
  if (error !== undefined) return { kind: 'lean-no-verdict', lean: ctx.lean, line: error, ...(nonZero !== undefined ? { exitCode: nonZero } : {}) }
  if (nonZero !== undefined) return { kind: 'lean-no-verdict', lean: ctx.lean, exitCode: nonZero }
  const all = [...report.axioms.values()].flat()
  const sorryLemmas = [...report.axioms].filter(([, ax]) => ax.includes('sorryAx')).map(([name]) => name).filter((n) => n !== '')
  if (all.includes('sorryAx') || report.sorryWarnings > 0) return { kind: 'lean-sorry', lean: ctx.lean, lemmas: sorryLemmas, count: Math.max(sorryLemmas.length, report.sorryWarnings, 1) }
  const native = all.filter((a) => a.includes('._native.'))
  const custom = all.filter((a) => !STANDARD_AXIOMS.has(a) && !a.includes('._native.'))
  if (custom.length > 0) return { kind: 'lean-custom-axiom', lean: ctx.lean, axioms: [...new Set(custom)] }
  if (!report.comparatorAccepted && report.acceptingCheckers.length === 0) throw new ParseError('Lean printed no verdict: no acceptance, mismatch, rejection or sandbox line')
  if (native.length > 0) return { kind: 'lean-native', lean: ctx.lean, nativeAxioms: [...new Set(native)] }
  const axioms = [...new Set(all)]
  return ctx.paranoid ? { kind: 'lean-accepted', lean: ctx.lean, axioms, checkers: new Set(report.acceptingCheckers).size } : { kind: 'lean-accepted', lean: ctx.lean, axioms }
}

// ------------------------------------------------------------------ trace validation (W0-S13's trace module)

export interface TraceRecord {
  readonly verdict: 'accepted' | 'rejected' | 'partial'
  /** The log's line count, its end record included. */
  readonly lines: number
  readonly matched: number
  /** The first line no behavior matches; 0 when every line matched. */
  readonly firstUnmatched: number
  /** Whether the log's last line is the end record, `{"event":"End"}`. */
  readonly endRecord: boolean
}

/**
 * The verdict a record's own counts give (docs/spikes/W0-S13.md sections 2 and 6: the line counter decides):
 * accepted when every line matched and the last one is the end record; partial when every line matched and there is
 * no end record; rejected at line k when lines 1 to k − 1 matched and k is a line of the log.
 */
function verdictOfCounts(r: Omit<TraceRecord, 'verdict'>): TraceRecord['verdict'] | undefined {
  if (r.firstUnmatched === 0 && r.matched === r.lines) return r.endRecord ? (r.lines >= 1 ? 'accepted' : undefined) : 'partial'
  if (r.firstUnmatched >= 1 && r.firstUnmatched === r.matched + 1 && r.firstUnmatched <= r.lines) return 'rejected'
  return undefined
}

/**
 * Read the trace module's record: `<<"trace-validation", [verdict |-> "accepted", lines |-> 11, ...]>>`. A record
 * whose verdict is not the one its own counts give (an "accepted" record that matched 3 of 11 lines) is no verdict.
 */
export function parseTraceRecord(line: string): TraceRecord {
  const field = (name: string): string | undefined => new RegExp(`\\b${name} \\|-> ("?)([^,\\]"]*)\\1`).exec(line)?.[2]
  const verdict = field('verdict')
  if (verdict !== 'accepted' && verdict !== 'rejected' && verdict !== 'partial') throw new ParseError(`not a trace-validation record: ${line}`)
  const count = (name: string): number => {
    const v = field(name)
    if (v === undefined || !/^\d+$/.test(v)) throw new ParseError(`the trace-validation record has no ${name} count: ${line}`)
    return Number(v)
  }
  const end = field('end_record')
  if (end !== 'TRUE' && end !== 'FALSE') throw new ParseError(`the trace-validation record does not say whether the log ends with its end record: ${line}`)
  const record: TraceRecord = { verdict, lines: count('lines'), matched: count('matched'), firstUnmatched: count('first_unmatched'), endRecord: end === 'TRUE' }
  const counted = verdictOfCounts(record)
  if (counted !== verdict) {
    throw new ParseError(
      `the record says ${verdict}, but its counts (${record.matched} of ${record.lines} lines matched, first unmatched line ${record.firstUnmatched}, end record ${end}) say ${counted ?? 'neither accepted, rejected nor partial'}`,
    )
  }
  return record
}

/** One validated trace: the trace (its file, or the run configuration that read it), its record, and what tells it from the others. */
export interface TraceInput {
  readonly trace: string
  readonly record: TraceRecord
  readonly seed?: number
  /** The SHA-256 of the trace's bytes, when the source records it. */
  readonly sha256?: string
}

/**
 * Trace validation as a raw output: "[T] · n seeds", n counting distinct accepted traces only (spine section 8.8). A
 * trace listed twice, by its name or by its bytes, would be counted twice, so it is a ParseError: no verdict. Rejected
 * traces are the witnesses, with their first non-conforming lines; partial ones count for nothing.
 */
export function rawFromTraces(traces: readonly TraceInput[], ctx: { readonly engine: Checker; readonly property: 'safety' | 'liveness' }): RawOutput {
  const names = new Set<string>()
  const bytes = new Map<string, string>()
  for (const t of traces) {
    if (names.has(t.trace)) throw new ParseError(`the trace ${t.trace} is listed twice, so it would be counted twice`)
    names.add(t.trace)
    if (t.sha256 !== undefined) {
      const other = bytes.get(t.sha256)
      if (other !== undefined) throw new ParseError(`${t.trace} and ${other} are the same trace (the same bytes), so it would be counted twice`)
      bytes.set(t.sha256, t.trace)
    }
  }
  return {
    kind: 'trace-validation',
    engine: ctx.engine,
    accepted: traces.filter((t) => t.record.verdict === 'accepted').length,
    rejected: traces.flatMap((t) => (t.record.verdict === 'rejected' ? [{ trace: t.trace, firstNonConformingLine: t.record.firstUnmatched }] : [])),
    partial: traces.filter((t) => t.record.verdict === 'partial').length,
    error: 0,
    property: ctx.property,
  }
}
