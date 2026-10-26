// From a validated receipt@1 to stamps (ARCHITECTURE.md section 10.4). The instrument origin has already parsed,
// capped and schema-validated the receipt (section 10.3); this module re-reads every verdict line with the course's
// own parsers and applies spine section 8.8. A receipt's sections (z3, tlc, lean, traces, goldens) are the CLI's
// normalization of its runs, and section 10.3 trusts neither that normalization nor an exit code alone. So a stamp
// states only what verdict lines state; a section is used only where the lines agree with it; and a section that
// disagrees with its runs, or that no run backs, is a problem with no stamp. A negative signal from a section (a
// checker it says rejects) still counts, because refusing a stamp never overclaims. A receipt's stamps come from its
// checkers, whoever wrote the proof; its provenance sets only the weight of the receipt-import event. Pure.
//
// Order never matters, with one exception receipt@1 forces. Each rule reads every run that bears on a stamp, never
// the first one a search finds: every solver run on one input, every premise query of the violation queries on it,
// every Lean run, every trace. Where several Lean runs give one kind of reading, the one reported is chosen by its
// own text, and a statement mismatch in any run outranks a constant mismatch in another. The same runs in another
// order give the same stamps. The exception: a trace-validation run names its trace only by its seed, so the runs
// pair with the traces section's verdicts by seed when every run and every verdict names one (and the traces are
// then read in the section's order), and otherwise in the order both list them (one run per trace, in the order the
// CLI ran them; spine section 9.4). Runs out of that order are refused, never misread. And one part that cannot be
// stamped (a version with no dotted number, a deadlock with no trace) is named in `problems`; it never costs the
// receipt its other stamps.
//
// Query direction for solver runs. A `sat` or an `unsat` means opposite things for a violation query and for a
// premise query (DESIGN.md section 5.4), and receipt@1 has no field for it, so a solver run names its direction in
// `runs[].step`: `violation` or `premise`, optionally followed by `-<name>` to pair the two (`violation-guard` with
// `premise-guard`). A solver run whose step names no direction earns no stamp ("direction-unknown").

import type { Receipt, ReceiptRun } from '@statespace/schema'
import { deriveStamp, StampGrammarError, type StampContext } from './derive.ts'
import { isErrorLine, parseLeanReport, parseSolverLines, parseTlcReport, parseTraceRecord, rawFromTraces, traceWitness, STANDARD_AXIOMS, type LeanReport, type SolverLine, type TraceInput, type TraceRecord } from './parse.ts'
import type { Checker, Constants, RawOutput, Replay, WitnessLength } from './raw.ts'
import type { Derivation, Lane } from './types.ts'

export interface ReceiptItem {
  /** Where in the receipt the raw output came from: `runs[2]` (with its step), `tlc`, `lean`, `traces`, `statements[0]`. */
  readonly section: string
  readonly raw: RawOutput
  readonly derivation: Derivation
}

export interface ReceiptStamps {
  readonly lane: Lane
  readonly items: readonly ReceiptItem[]
  /** Parts of the receipt that yield no raw output, each with the reason. Never silently dropped. */
  readonly problems: readonly string[]
}

export interface ReceiptOptions {
  /** Where the receipt lives, such as `receipts/LAB-1.3/2026-11-02T10-00-00Z.json`; each stamp's source starts with it. */
  readonly source: string
  /** True only when this tab re-ran the checks itself; a stored receipt never carries re-checked here. */
  readonly recheckedHere?: boolean
  /** Statement hashes recomputed from text the mirror holds, by path; a difference voids the claim to [?] (I7). */
  readonly currentHashes?: ReadonlyMap<string, string>
  /** For a solver `sat` of a violation query: whether its model replayed, and the witness's length. */
  readonly replay?: (run: ReceiptRun, index: number) => { readonly replay: Replay; readonly witness: WitnessLength } | undefined
  /** Whether a solver run guards enforcement, so an [?] fails closed. */
  readonly guardsEnforcement?: (run: ReceiptRun, index: number) => boolean
  /** TLC: whether the property is deadlock freedom; the bound a stopped run reached. */
  readonly tlc?: { readonly deadlockFreedom?: boolean; readonly bound?: string }
  /** Trace validation: whether the claim is safety-shaped or a liveness claim (finite traces cannot test eventuality). */
  readonly traceProperty?: 'safety' | 'liveness'
}

/** Engine names as learners see them; versions stay verbatim. */
const ENGINE_NAMES: Readonly<Record<string, string>> = {
  z3: 'Z3', 'z3-solver': 'Z3', cvc5: 'cvc5', tlc: 'TLC', tla2tools: 'TLC', lean: 'Lean', lake: 'Lean', spectacle: 'Spectacle',
  pglite: 'PGlite', postgres: 'PostgreSQL', postgresql: 'PostgreSQL', souffle: 'Soufflé', apalache: 'Apalache', cargo: 'cargo',
}

/** An engine as the stamp names it: z3 5.3.1 is "Z3 5.3.1". */
export function checkerOf(engine: string, version: string): Checker {
  const key = engine.trim().toLowerCase()
  return { name: ENGINE_NAMES[key] ?? engine.trim(), version: version.trim() }
}

/** The engines this package reads verdict lines from, by family: the solvers, TLC, and Lean with its checkers. */
export type EngineFamily = 'solver' | 'tlc' | 'lean'

export function engineFamily(engine: string): EngineFamily | undefined {
  if (/^(?:z3|z3-solver|cvc5)$/i.test(engine)) return 'solver'
  if (/^(?:tlc|tla2tools)$/i.test(engine)) return 'tlc'
  if (/^(?:lean|lake|comparator|leanchecker)$/i.test(engine)) return 'lean'
  return undefined
}

const isSolver = (r: ReceiptRun): boolean => engineFamily(r.engine) === 'solver'
const isZ3 = (r: ReceiptRun): boolean => /^(?:z3|z3-solver)$/i.test(r.engine)
const isLean = (r: ReceiptRun): boolean => engineFamily(r.engine) === 'lean'
const isTlc = (r: ReceiptRun): boolean => engineFamily(r.engine) === 'tlc'

/** The record the trace module prints for each trace (W0-S13): `<<"trace-validation", [verdict |-> …, …]>>`. */
const TRACE_RECORD = /^<<"trace-validation",/
/** A TLC run is a trace validation when its lines carry the trace module's record; otherwise it is a model check. */
const isTraceRun = (r: ReceiptRun): boolean => r.verdictLines.some((l) => TRACE_RECORD.test(l.trim()))

/**
 * A solver run's direction and pairing name, from its step: `violation-guard` is ['violation', 'guard']. The plural
 * (`premises`, the Bench CLI's own name for the premise query in its LAB-90 fixtures) reads the same.
 */
export function directionOf(step: string | undefined): { direction?: 'violation' | 'premise'; name: string } {
  const m = /^(violation|premise)s?(?:[-.](.+))?$/.exec(step ?? '')
  return m ? { direction: m[1] as 'violation' | 'premise', name: m[2] ?? '' } : { name: '' }
}

const message = (e: unknown): string => (e instanceof Error ? e.message : String(e))
const runSection = (run: ReceiptRun, i: number): string => `runs[${i}]${run.step ? ` ${run.step}` : ''}`

/** What every section's derivation writes to: an item, a problem, and the I7 test for a hash. */
interface Out {
  readonly add: (section: string, raw: RawOutput) => void
  readonly problems: string[]
  /** True when the hash is the recorded hash of a statement whose recomputed hash differs (I7). */
  readonly voided: (hash: string | undefined) => boolean
  /** True when a statement of this kind changed (I7), for sections that name no statement of their own. */
  readonly kindChanged: (kind: Receipt['statements'][number]['kind']) => boolean
}

/** Derive every stamp a receipt's verdicts carry. */
export function deriveReceipt(receipt: Receipt, options: ReceiptOptions): ReceiptStamps {
  const lane: Lane = options.recheckedHere ? 'rechecked-here' : receipt.lane
  const items: ReceiptItem[] = []
  const problems: string[] = []
  // A raw output whose stamp would break the grammar (a version with no dotted number, say) is a problem with no
  // stamp, never a throw that loses the receipt's other stamps.
  const add = (section: string, raw: RawOutput): void => {
    const ctx: StampContext = { lane, source: `${options.source} · ${section}` }
    let derivation: Derivation
    try {
      derivation = deriveStamp(raw, ctx)
    } catch (e) {
      if (!(e instanceof StampGrammarError)) throw e
      problems.push(`${section}: ${e.message}; no stamp`)
      return
    }
    items.push({ section, raw, derivation })
  }
  // Each part derives on its own: anything one part cannot read is named, and the other parts still derive.
  const part = (name: string, fn: () => void): void => {
    try {
      fn()
    } catch (e) {
      problems.push(`${name}: could not be derived (${message(e)}); no stamp`)
    }
  }

  // I7: a statement whose recomputed hash differs voids the claims on it to [?], so no stamp derives from a run that
  // read it: a solver run whose input is the statement; the tlc section whose spec it is, or whose run read it; the
  // traces, whose runs record their configurations rather than the spec, when any TLA+ statement changed; the lean
  // section whose challenge it is, or any of whose runs read it, or when any challenge module changed.
  const changed = new Set<string>()
  const changedKinds = new Set<string>()
  receipt.statements.forEach((s, i) => {
    const now = options.currentHashes?.get(s.path)
    if (now !== undefined && now !== s.sha256) {
      changed.add(s.sha256)
      changedKinds.add(s.kind)
      add(`statements[${i}] ${s.path}`, { kind: 'statement-hash-changed', path: s.path })
    }
  })
  const out: Out = { add, problems, voided: (hash) => hash !== undefined && changed.has(hash), kindChanged: (kind) => changedKinds.has(kind) }

  part('solvers', () => deriveSolvers(receipt, options, out))

  // ---------------------------------------------------------------- TLC: the model check and trace validation
  const tlcRuns = receipt.runs.flatMap((run, i) => (isTlc(run) ? [{ run, i }] : []))
  const modelRuns = tlcRuns.filter(({ run }) => !isTraceRun(run))
  const traceRuns = tlcRuns.filter(({ run }) => isTraceRun(run))
  part('tlc', () => {
    const t = receipt.tlc
    if (!t) {
      for (const { run, i } of modelRuns) problems.push(`${runSection(run, i)}: a TLC run with no tlc section to give its constants; no stamp`)
      return
    }
    if (out.voided(t.specSha256) || modelRuns.some(({ run }) => out.voided(run.inputSha256)) || out.kindChanged('tla')) {
      problems.push('tlc: the spec it checked has changed since the run, so its claim is voided to [?] (I7); no stamp')
      return
    }
    const r = tlcRaw(t, modelRuns, options)
    if (typeof r === 'string') problems.push(`tlc: ${r}`)
    else add('tlc', r.raw)
    const reported = typeof r === 'string' ? -1 : r.index
    for (const { run, i } of modelRuns) if (i !== reported) problems.push(`${runSection(run, i)}: a TLC run the tlc section does not report; no stamp`)
  })
  part('traces', () => {
    const tv = receipt.traces
    if (!tv) {
      for (const { run, i } of traceRuns) problems.push(`${runSection(run, i)}: a trace-validation run with no traces section; no stamp`)
      return
    }
    if (traceRuns.some(({ run }) => out.voided(run.inputSha256)) || out.kindChanged('tla')) {
      problems.push('traces: the spec they were validated against has changed since the runs, so their claim is voided to [?] (I7); no stamp')
      return
    }
    const r = tracesRaw(tv, traceRuns, options)
    if (typeof r === 'string') problems.push(`traces: ${r}`)
    else add('traces', r)
  })

  // ---------------------------------------------------------------- Lean
  part('lean', () => {
    if (!receipt.lean && !receipt.runs.some(isLean)) return
    if (out.voided(receipt.lean?.challengeSha) || receipt.runs.some((r) => isLean(r) && out.voided(r.inputSha256)) || out.kindChanged('lean-challenge')) {
      problems.push('lean: the challenge it was checked against has changed since the run, so its claim is voided to [?] (I7); no stamp')
      return
    }
    const version = leanVersion(receipt)
    if (typeof version !== 'string') {
      problems.push(`lean: ${version.problem}; no stamp`)
      return
    }
    const raw = leanRaw(receipt, checkerOf('lean', version))
    if (typeof raw === 'string') problems.push(`lean: ${raw}`)
    else add('lean', raw)
  })

  // ---------------------------------------------------------------- not derived yet
  // TODO(W2-T25): the goldens harness arrives with LAB-3. Until its verdict lines have a parser here, deriving from
  // the goldens section would trust the CLI's counts alone (ARCHITECTURE.md section 10.3), so it is named instead.
  if (receipt.goldens) problems.push('goldens: not derived until the goldens harness (W2-T25) prints verdict lines this package parses; no stamp')
  // TODO(W4-T16): the pg, datalog and pairs sections arrive with S6 and S7 (W4-T16 adds the PostgreSQL lane and the pg
  // section); until a parser here reads their verdict lines, they are named, not dropped.
  for (const section of ['pg', 'datalog', 'pairs'] as const) if (receipt[section]) problems.push(`${section}: not derived before S6 and S7 (W4); no stamp`)
  // A run no deriver reads (a cargo build, a PostgreSQL session before S6) is named too.
  receipt.runs.forEach((run, i) => {
    if (engineFamily(run.engine) === undefined) problems.push(`${runSection(run, i)}: no deriver reads a ${run.engine} run yet; no stamp`)
  })

  return { lane, items, problems }
}

// ------------------------------------------------------------------ solvers

/**
 * A solver run read from its own lines: its verdict; no verdict, when the run ended in error and its lines carry
 * none; or inconsistent, when the run's verdict and its lines disagree (or it names no version). Each case that is
 * not a verdict leaves its problem.
 */
type SolverRead = { readonly kind: 'verdict'; readonly line: SolverLine } | { readonly kind: 'none' } | { readonly kind: 'inconsistent' }

function readSolverRun(run: ReceiptRun, section: string, problems: string[]): SolverRead {
  let line: SolverLine | undefined
  let why = ''
  try {
    // the Bench CLI's own grammar: an (error …) after the answer leaves the answer standing (parse.ts)
    line = parseSolverLines(run.verdictLines, { errorAfterVerdict: 'keep' })
  } catch (e) {
    why = message(e)
  }
  if (run.version.trim() === '') {
    problems.push(`${section}: the run names no ${run.engine} version; no stamp`)
    return { kind: 'inconsistent' }
  }
  if (run.verdict === 'error') {
    if (line === undefined) {
      problems.push(`${section}: the solver run ended in error (${why}); no verdict and no stamp`)
      return { kind: 'none' }
    }
    problems.push(`${section}: the run says error but its verdict lines say ${line.verdict}; no stamp`)
    return { kind: 'inconsistent' }
  }
  if (run.verdict !== 'sat' && run.verdict !== 'unsat' && run.verdict !== 'unknown') {
    problems.push(`${section}: ${run.verdict} is not a solver verdict; no stamp`)
    return { kind: 'inconsistent' }
  }
  if (line === undefined) {
    problems.push(`${section}: its verdict lines carry no verdict (${why}); no stamp`)
    return { kind: 'inconsistent' }
  }
  if (line.verdict !== run.verdict) {
    problems.push(`${section}: the run says ${run.verdict} but its verdict lines say ${line.verdict}; no stamp`)
    return { kind: 'inconsistent' }
  }
  return { kind: 'verdict', line }
}

/** Every rlimit a command line passes: Z3's `rlimit=N`, the Bench's API runner's `--rlimit N`. */
function argvRlimits(argv: readonly string[]): number[] {
  const out: number[] = []
  argv.forEach((a, k) => {
    const m = /^rlimit=(\d+)$/.exec(a)
    if (m?.[1] !== undefined) out.push(Number(m[1]))
    const next = argv[k + 1]
    if (a === '--rlimit' && next !== undefined && /^\d+$/.test(next)) out.push(Number(next))
  })
  return out
}

/**
 * The rlimit a solver run ran under: the one its command line passes, which must agree with its budget, or its budget
 * alone when the command line passes none. `null` when they disagree: a problem, and no stamp prints either.
 */
function rlimitOf(run: ReceiptRun, section: string, problems: string[]): number | undefined | null {
  const passed = [...new Set(argvRlimits(run.argv))]
  const budget = run.budget.rlimit
  if (passed.length > 1 || (passed.length === 1 && budget !== undefined && passed[0] !== budget)) {
    problems.push(`${section}: its command line passes rlimit ${passed.join(' and ')} but its budget records ${budget ?? 'none'}; no stamp`)
    return null
  }
  return passed[0] ?? budget
}

/**
 * The solver runs. Each is read from its own lines first. Runs that read the same input answer the same query,
 * whatever their steps say, so an input on which one run says sat and another unsat is a disagreement: no run on it
 * earns a stamp, and each carries the defeater against both sides (spine section 8.8). A Z3 run is then read in its
 * declared direction. A Z3 violation query's unsat takes every cvc5 run on its input as its cross-check ("agree" only
 * when every one of them says unsat), and every premise query named after a violation query on its input, with every
 * run on their inputs, as its premise (premise queries that disagree leave it unstamped; any unsat empties the claim). A cvc5 run is never read
 * alone, and the ones no Z3 run takes are named.
 */
function deriveSolvers(receipt: Receipt, options: ReceiptOptions, out: Out): void {
  const runs = receipt.runs
  const runAt = (i: number): ReceiptRun => runs[i] as ReceiptRun
  const solver = runs.flatMap((r, i) => (isSolver(r) ? [i] : []))
  const reads = new Map<number, SolverRead>()
  for (const i of solver) {
    const run = runAt(i)
    if (out.voided(run.inputSha256)) {
      out.problems.push(`${runSection(run, i)}: the statement it read has changed since the run, so its claim is voided to [?] (I7); no stamp`)
      reads.set(i, { kind: 'none' })
    } else reads.set(i, readSolverRun(run, runSection(run, i), out.problems))
  }
  const verdictOf = (i: number): SolverLine['verdict'] | undefined => {
    const r = reads.get(i)
    return r?.kind === 'verdict' ? r.line.verdict : undefined
  }
  const nameOf = (i: number): string => `${checkerOf(runAt(i).engine, runAt(i).version).name} ${runAt(i).version.trim()} (${runSection(runAt(i), i)})`
  const isViolationUnsat = (i: number): boolean => isZ3(runAt(i)) && verdictOf(i) === 'unsat' && directionOf(runAt(i).step).direction === 'violation'

  // the runs on each input
  const onInput = new Map<string, number[]>()
  for (const i of solver) onInput.set(runAt(i).inputSha256, [...(onInput.get(runAt(i).inputSha256) ?? []), i])
  const peers = (i: number): number[] => (onInput.get(runAt(i).inputSha256) ?? []).filter((j) => j !== i)
  const disagree = (indices: readonly number[]): boolean => {
    const vs = indices.map(verdictOf)
    return vs.includes('sat') && vs.includes('unsat')
  }
  const contradicted = (i: number): boolean => disagree([i, ...peers(i)])

  // The z3 section summarises one run, the headline query: a Z3 run that read the same SMT-LIB (through the section's
  // entry, when both entries ran it). It backs no stamp itself. When it agrees with none of those runs, it misreports
  // them, and none of them is stamped.
  const refusedBySection = new Map<number, string>()
  const z3 = receipt.z3
  if (z3) {
    const same = solver.filter((i) => isZ3(runAt(i)) && runAt(i).inputSha256 === z3.smtlibSha256)
    const byEntry = same.filter((i) => (runAt(i).argv[0] === 'z3') === (z3.entry === 'cli'))
    const candidates = (byEntry.length > 0 ? byEntry : same).filter((i) => reads.get(i)?.kind === 'verdict')
    if (same.length === 0) out.problems.push('z3: the section names a query that no Z3 run in the receipt read; it backs no stamp')
    const agrees = (i: number): boolean => {
      const r = reads.get(i)
      return r?.kind === 'verdict' && r.line.verdict === z3.verdict && (z3.reason_unknown === undefined || r.line.reason === z3.reason_unknown)
    }
    if (candidates.length > 0 && !candidates.some(agrees)) {
      for (const i of candidates) {
        const { line } = reads.get(i) as { readonly line: SolverLine }
        refusedBySection.set(i, `the z3 section says ${z3.verdict}${z3.reason_unknown !== undefined ? ` (${z3.reason_unknown})` : ''} but the run's verdict lines say ${line.verdict}${line.reason !== undefined ? ` (${line.reason})` : ''}`)
      }
    }
  }

  // the premise reading for a violation query's names: every premise query of those names, and every run on their inputs
  const premiseNotes = new Set<string>()
  const premiseOf = (names: readonly string[]): { readonly reading: 'sat' | 'unsat' | 'not-run' } | { readonly refused: string } => {
    const named = solver.filter((j) => {
      const d = directionOf(runAt(j).step)
      return d.direction === 'premise' && names.includes(d.name)
    })
    const inputs = new Set(named.map((j) => runAt(j).inputSha256))
    const related = solver.filter((j) => inputs.has(runAt(j).inputSha256))
    const label = names.length === 1 ? (names[0] === '' ? 'the premise queries with no name' : `the premise queries named ${names[0]}`) : `the premise queries named ${names.map((n) => (n === '' ? '(none)' : n)).join(' or ')}`
    if (inputs.size > 1) premiseNotes.add(`${label} read ${inputs.size} different inputs, so the receipt does not say which is the premise of the violation query beside them; every one counts`)
    const bad = related.find((j) => reads.get(j)?.kind === 'inconsistent')
    if (bad !== undefined) return { refused: `it pairs with ${runSection(runAt(bad), bad)}, whose verdict and verdict lines disagree` }
    if (disagree(related)) return { refused: `${label} disagree: one says sat and another unsat` }
    const vs = related.map(verdictOf)
    return { reading: vs.includes('unsat') ? 'unsat' : vs.includes('sat') ? 'sat' : 'not-run' }
  }

  // the cross-check of a Z3 violation query's unsat: every cvc5 run on its input
  const crossCheckOf = (i: number, section: string): Extract<RawOutput, { kind: 'smt-unsat' }>['crossCheck'] => {
    const cvc5 = peers(i).filter((j) => !isZ3(runAt(j)))
    if (cvc5.length === 0) return undefined
    const answered = cvc5.filter((j) => reads.get(j)?.kind === 'verdict')
    const versions = [...new Set(answered.map((j) => runAt(j).version.trim()))].sort()
    if (answered.length === cvc5.length && answered.every((j) => verdictOf(j) === 'unsat')) {
      if (versions.length > 1) {
        out.problems.push(`${section}: the cvc5 runs on its input name ${versions.length} versions (${versions.join(', ')}), so no one checker agrees; the Z3 stamp stands alone`)
        return undefined
      }
      const first = runAt(answered[0] as number)
      return { solver: checkerOf(first.engine, first.version), verdict: 'unsat', sameInput: true }
    }
    // an unknown is no verdict, so there is no agreement; an errored or voided run is named already
    const unknownAt = answered.find((j) => verdictOf(j) === 'unknown')
    return unknownAt === undefined ? undefined : { solver: checkerOf(runAt(unknownAt).engine, runAt(unknownAt).version), verdict: 'unknown', sameInput: true }
  }

  for (const i of solver) {
    const run = runAt(i)
    const read = reads.get(i)
    if (!isZ3(run) || read?.kind !== 'verdict') continue
    const { line } = read
    const section = runSection(run, i)
    const refused = refusedBySection.get(i)
    if (refused !== undefined) {
      out.problems.push(`${section}: ${refused}; no stamp`)
      continue
    }
    const rlimit = rlimitOf(run, section, out.problems)
    if (rlimit === null) continue
    const solverChecker = checkerOf(run.engine, run.version)
    if (line.verdict === 'unknown') {
      // the reason is the one the lines carry (the CLI prints Z3's `(:reason-unknown "…")`), never the section's alone
      out.add(section, { kind: 'smt-unknown', solver: solverChecker, reason: line.reason ?? '', ...(rlimit !== undefined ? { rlimit } : {}), ...(options.guardsEnforcement?.(run, i) ? { guardsEnforcement: true } : {}) })
      continue
    }
    if (contradicted(i)) {
      const other = peers(i).find((j) => verdictOf(j) !== undefined && verdictOf(j) !== 'unknown' && verdictOf(j) !== line.verdict) as number
      out.add(section, { kind: 'shadow-mismatch', sides: [nameOf(i), nameOf(other)], detail: `one says ${line.verdict} and the other ${verdictOf(other)} on the same input` })
      continue
    }
    // a run on the same input whose verdict and lines disagree: its true answer could contradict this one
    const unread = peers(i).find((j) => reads.get(j)?.kind === 'inconsistent')
    if (unread !== undefined) {
      out.problems.push(`${section}: it shares its input with ${runSection(runAt(unread), unread)}, whose verdict and verdict lines disagree; no stamp`)
      continue
    }
    const { direction } = directionOf(run.step)
    if (direction === undefined) {
      out.add(section, { kind: 'smt-direction-unknown', solver: solverChecker, verdict: line.verdict })
      continue
    }
    if (direction === 'premise') {
      out.add(section, { kind: 'smt-premise', solver: solverChecker, verdict: line.verdict })
      continue
    }
    if (line.verdict === 'sat') {
      const replayed = options.replay?.(run, i)
      out.add(section, { kind: 'smt-sat', solver: solverChecker, model: line.model ?? '', replay: replayed?.replay ?? 'pending', witness: replayed?.witness ?? { length: 1, unit: 'steps' } })
      continue
    }
    // every violation query on this input answers the same query, so all their premise queries bear on it, whatever
    // name each run's step gives (the Bench CLI names a repeated step violation-2)
    const names = [...new Set([i, ...peers(i)].filter((j) => directionOf(runAt(j).step).direction === 'violation').map((j) => directionOf(runAt(j).step).name))].sort()
    const premise = premiseOf(names)
    if ('refused' in premise) {
      out.problems.push(`${section}: ${premise.refused}; no stamp`)
      continue
    }
    const crossCheck = crossCheckOf(i, section)
    out.add(section, { kind: 'smt-unsat', solver: solverChecker, ...(rlimit !== undefined ? { rlimit } : {}), ...(crossCheck ? { crossCheck } : {}), premise: premise.reading })
  }
  for (const note of premiseNotes) out.problems.push(note)

  // the cvc5 runs no Z3 run takes, by name
  for (const i of solver) {
    const run = runAt(i)
    if (isZ3(run) || reads.get(i)?.kind !== 'verdict') continue
    const section = runSection(run, i)
    const z3Peers = peers(i).filter((j) => isZ3(runAt(j)))
    const d = directionOf(run.step)
    if (contradicted(i)) {
      out.problems.push(`${section}: the solver runs on its input disagree, one sat and another unsat; no stamp for any of them`)
      continue
    }
    if (z3Peers.some(isViolationUnsat)) continue // a cross-check
    if (d.direction === 'premise' && solver.some((j) => isViolationUnsat(j) && directionOf(runAt(j).step).name === d.name)) continue // a premise query
    const z3Answer = z3Peers.find((j) => verdictOf(j) !== undefined)
    const why =
      d.direction === 'premise'
        ? 'a cvc5 premise query that no Z3 violation query pairs with'
        : z3Answer !== undefined
          ? `a cvc5 ${verdictOf(i)} beside a Z3 ${verdictOf(z3Answer)} on the same input; only a Z3 unsat of a violation query takes a cross-check`
          : z3Peers.length > 0
            ? 'a cvc5 run beside a Z3 run on the same input that gave no verdict'
            : 'a cvc5 run with no Z3 run on the same input'
    out.problems.push(`${section}: ${why}; no stamp`)
  }
}

// ------------------------------------------------------------------ TLC

/** A bound from TLC's flags: `-depth 20` is "depth 20". */
function flagBound(flags: readonly string[]): string | undefined {
  const i = flags.indexOf('-depth')
  return i >= 0 && flags[i + 1] !== undefined ? `depth ${flags[i + 1]}` : undefined
}

/** The flags appear in the command line in order (other arguments may stand between them). */
function carriesFlags(argv: readonly string[], flags: readonly string[]): boolean {
  let k = 0
  for (const a of argv) if (k < flags.length && a === flags[k]) k += 1
  return k === flags.length
}

/** TLC's report in the receipt's words: a run that printed no result is a stopped one. */
const tlcResultOf = (r: ReturnType<typeof parseTlcReport>['result']): 'no-error' | 'deadlock' | 'violated' | 'stopped' => (r === 'unfinished' ? 'stopped' : r)

/**
 * The tlc section, read against the one TLC run it reports (the model-check run whose command line carries its
 * flags, and which read the section's spec). The run's verdict, the section's result and what parseTlcReport reads
 * from the run's lines must all agree; a count the lines print must equal the section's; and [M] · complete needs the
 * lines to show TLC completing with nothing left on the queue. Anything else is a problem and no stamp.
 */
function tlcRaw(t: NonNullable<Receipt['tlc']>, candidates: readonly { run: ReceiptRun; i: number }[], options: ReceiptOptions): { raw: RawOutput; index: number } | string {
  if (candidates.length === 0) return 'no TLC model-check run in the receipt backs the section; no stamp'
  const matching = candidates.filter(({ run }) => carriesFlags(run.argv, t.flags))
  if (matching.length === 0) return `no TLC run's command line carries the section's flags (${t.flags.join(' ') || 'none'}); no stamp`
  if (matching.length > 1) return `${matching.length} TLC runs carry the section's flags, so which one it reports is not stated; no stamp`
  const { run, i } = matching[0] as { run: ReceiptRun; i: number }
  if (run.inputSha256 !== t.specSha256) return `runs[${i}] read an input whose SHA-256 is not the section's spec hash, so the section does not report what it read; no stamp`
  const engine = checkerOf(run.engine, run.version)
  if (engine.version === '') return `runs[${i}] names no TLC version; no stamp`
  if (t.flags.includes('-simulate') || run.argv.includes('-simulate')) return 'a -simulate run needs its trace count, which receipt@1 does not carry yet; no stamp'
  const report = parseTlcReport(run.verdictLines)
  if (report.errorLines.length > 0) return `TLC reported an error that is not a verdict (${report.errorLines[0]}); no stamp`
  const read = tlcResultOf(report.result)
  if (read !== t.result || run.verdict !== t.result) return `the section says ${t.result}, runs[${i}] says ${run.verdict} and its verdict lines say ${read}; no stamp`
  if (report.distinctStates !== undefined && report.distinctStates !== t.distinctStates) return `the section says ${t.distinctStates} distinct states but the verdict lines say ${report.distinctStates}; no stamp`
  const constants: Constants = Object.entries(t.constants)
  const done = (raw: RawOutput): { raw: RawOutput; index: number } => ({ raw, index: i })
  switch (t.result) {
    case 'no-error':
    case 'stopped': {
      if (t.result === 'no-error' && t.complete) {
        if (!report.complete || report.distinctStates === undefined) return 'the section says complete, but the verdict lines do not show TLC completing with nothing left on the queue; no stamp'
        return done({ kind: 'tlc-complete', engine, constants, distinctStates: report.distinctStates })
      }
      if (t.complete) return 'a stopped run is never a complete exploration; no stamp'
      const bound = options.tlc?.bound ?? flagBound(t.flags)
      if (bound === undefined) return 'the run stopped before a complete exploration but names no bound; no stamp'
      return done({ kind: 'model-check-bounded', engine, bound, constants, ...(report.distinctStates !== undefined ? { distinctStates: report.distinctStates } : {}) })
    }
    case 'deadlock': {
      if (t.complete) return 'a stop at "Deadlock reached" is never a complete exploration; no stamp'
      if (report.distinctStates === undefined) return 'the verdict lines of a deadlock stop print no distinct-state count; no stamp'
      const witness = report.traceStates !== undefined ? traceWitness(report.traceStates) : undefined
      const deadlockFreedom = options.tlc?.deadlockFreedom === true
      // a deadlock that violates deadlock freedom is [R], which prints its witness's length from the trace
      if (deadlockFreedom && witness === undefined) return 'a deadlock that violates deadlock freedom, but the verdict lines hold no trace to give its length; no stamp'
      return done({ kind: 'tlc-deadlock', engine, distinctStates: report.distinctStates, deadlockFreedom, ...(witness ? { witness } : {}) })
    }
    case 'violated':
      if (report.traceStates === undefined) return 'a violation whose verdict lines hold no trace; no stamp until its length is known'
      return done({ kind: 'tlc-violation', engine, property: report.property ?? 'the property', witness: traceWitness(report.traceStates) })
  }
}

/** Run verdicts that say a trace conformed, and ones that say it did not. */
const ACCEPTING = new Set(['accepted', 'passed', 'no-error'])
const REJECTING = new Set(['rejected', 'failed', 'violated'])

/**
 * The traces section, read against the trace-validation runs (spine section 9.4: one run per trace). Each run prints
 * exactly one record, whose verdict agrees with its own counts (parseTraceRecord) and with the run's verdict. The runs
 * pair with the section's verdicts by seed when every run and every verdict names one, each seed once on each side, so
 * their order does not matter; otherwise they pair in the order both list them, with the same seeds where both name
 * one. Each record is its verdict (a rejected trace at the same first non-conforming line); a trace listed twice is
 * never counted twice; and the section's n, which counts accepted traces only, is the number of accepted records. The
 * runs must name one non-empty TLC version.
 */
function tracesRaw(tv: NonNullable<Receipt['traces']>, runs: readonly { run: ReceiptRun; i: number }[], options: ReceiptOptions): RawOutput | string {
  if (options.traceProperty === undefined) return 'say whether the claim is safety-shaped or a liveness claim; no stamp'
  if (runs.length === 0) return 'no TLC run in the receipt prints a trace-validation record; no stamp'
  const versions = new Set(runs.map(({ run }) => run.version.trim()))
  if (versions.has('')) return 'a trace-validation run names no TLC version; no stamp'
  if (versions.size > 1) return `the trace-validation runs name ${versions.size} TLC versions; no stamp`
  // each run, read alone: one record, which agrees with its own counts and with the run's verdict
  const records: TraceRecord[] = []
  for (const { run, i } of runs) {
    if (run.verdict === 'error') return `runs[${i}] ended in error; no stamp`
    if (!ACCEPTING.has(run.verdict) && !REJECTING.has(run.verdict)) return `runs[${i}] says ${run.verdict}, which is not a trace-validation verdict; no stamp`
    const lines = run.verdictLines.map((l) => l.trim()).filter((l) => TRACE_RECORD.test(l))
    if (lines.length !== 1) return `runs[${i}] prints ${lines.length} trace-validation records; a run validates one trace (spine section 9.4); no stamp`
    let rec: TraceRecord
    try {
      rec = parseTraceRecord(lines[0] as string)
    } catch (e) {
      return `runs[${i}]: ${message(e)}; no stamp`
    }
    if (ACCEPTING.has(run.verdict) && rec.verdict !== 'accepted') return `runs[${i}] says ${run.verdict} but the record it prints says ${rec.verdict}; no stamp`
    if (REJECTING.has(run.verdict) && rec.verdict === 'accepted') return `runs[${i}] says ${run.verdict} but the record it prints says accepted; no stamp`
    records.push(rec)
  }
  // then the runs against the section, trace by trace
  if (runs.length !== tv.verdicts.length) return `the section lists ${tv.verdicts.length} traces but ${runs.length} trace-validation runs print records; no stamp`
  const listed = new Set<string>()
  const seeds = new Set<number>()
  for (const v of tv.verdicts) {
    if (listed.has(v.trace)) return `the trace ${v.trace} is listed twice, so it would be counted twice; no stamp`
    listed.add(v.trace)
    // a seed names its trace: two traces under one seed would count one trace twice
    if (v.seed !== undefined && seeds.has(v.seed)) return `the section names seed ${v.seed} for 2 traces, so one trace would be counted twice; no stamp`
    if (v.seed !== undefined) seeds.add(v.seed)
  }
  // which run validated which trace: by seed when every run and every verdict names one, else in the order both list them
  type Verdict = NonNullable<Receipt['traces']>['verdicts'][number]
  const bySeed = runs.every(({ run }) => run.budget.seed !== undefined) && tv.verdicts.every((v) => v.seed !== undefined)
  const order: number[] = []
  if (bySeed) {
    // each seed names one trace of the section (a repeated one is refused above); the runs are read in the order of
    // their seeds, so a problem names the same run whatever order the receipt lists them in
    for (const k of [...runs.keys()].sort((a, b) => Number(runs[a]?.run.budget.seed) - Number(runs[b]?.run.budget.seed))) {
      const { run, i } = runs[k] as { run: ReceiptRun; i: number }
      const at = tv.verdicts.findIndex((v) => v.seed === run.budget.seed)
      if (at < 0) return `runs[${i}] ran with seed ${run.budget.seed}, which no trace in the section names; no stamp`
      if (order.includes(at)) return `two trace-validation runs ran with seed ${run.budget.seed}; no stamp`
      order[k] = at
    }
  } else for (const k of runs.keys()) order[k] = k
  // the traces in the section's order, so the witnesses of rejected traces come out in one order whatever the runs' is
  const traces: TraceInput[] = []
  for (const k of [...runs.keys()].sort((a, b) => (order[a] as number) - (order[b] as number))) {
    const { run, i } = runs[k] as { run: ReceiptRun; i: number }
    const rec = records[k] as TraceRecord
    const v = tv.verdicts[order[k] as number] as Verdict
    if (rec.verdict !== v.verdict) return `${v.trace}: the section says ${v.verdict} but its record says ${rec.verdict}; no stamp`
    if (v.verdict === 'rejected' && rec.firstUnmatched !== v.firstNonConformingLine) return `${v.trace}: the section says line ${v.firstNonConformingLine ?? 'none'} but its record says line ${rec.firstUnmatched}; no stamp`
    const seed = run.budget.seed
    if (v.seed !== undefined && seed !== undefined && v.seed !== seed) return `${v.trace}: the section says seed ${v.seed} but runs[${i}] ran with seed ${seed}; no stamp`
    const s = v.seed ?? seed
    traces.push({ trace: v.trace, record: rec, ...(s !== undefined ? { seed: s } : {}) })
  }
  const first = (runs[0] as { run: ReceiptRun }).run
  let raw: RawOutput
  try {
    raw = rawFromTraces(traces, { engine: checkerOf(first.engine, first.version), property: options.traceProperty })
  } catch (e) {
    return `${message(e)}; no stamp`
  }
  const accepted = raw.kind === 'trace-validation' ? raw.accepted : 0
  if (tv.n !== accepted) return `the section's n is ${tv.n}, but ${accepted} of its traces were accepted, and n counts accepted traces only (spine section 9.4); no stamp`
  return raw
}

// ------------------------------------------------------------------ Lean

/**
 * The Lean version: the toolchain's (`leanprover/lean4:v4.35.0`), or else the one version every `lean` run names (a
 * `lake`, comparator or leanchecker run reports its own version, not Lean's). A toolchain with no dotted version and
 * runs that name several are a problem.
 */
function leanVersion(receipt: Receipt): string | { readonly problem: string } {
  const t = receipt.lean?.toolchain
  const m = t ? /v?(\d+\.\d+\.\d+(?:-[0-9A-Za-z.]+)?)\s*$/.exec(t) : null
  if (m?.[1]) return m[1]
  const versions = [...new Set(receipt.runs.filter((r) => /^lean$/i.test(r.engine)).map((r) => r.version.trim()))].sort()
  if (versions.length === 1 && versions[0] !== '') return versions[0] as string
  if (versions.length > 1) return { problem: `the toolchain names no version and the Lean runs name ${versions.length} (${versions.join(', ')})` }
  return { problem: 'no toolchain or run names the Lean version' }
}

const sameSet = (a: readonly string[], b: readonly string[]): boolean => new Set(a).size === new Set(b).size && a.every((x) => b.includes(x))

/**
 * The Lean runs and the lean section under spine sections 8.8 and 9.6, read in one order across every Lean run: a
 * sandbox failure or a killed checker is a tool error; a comparator mismatch voids to [?]; a line of the closed list
 * of rejections (or a checker the section says rejects) is a rejection; any other error line, a non-zero exit, a run
 * that ended in error, or a run the CLI marked rejected or failed with no line of the closed list is no verdict. Then
 * the section's axioms must be the ones the runs' `#print axioms` lines print, theorem by theorem (a theorem printed
 * twice counts every axiom either list names), with its sorry count and its `_native` axioms, and an axiom list
 * printed with no theorem's name must hold only axioms the section lists; `sorryAx` and a custom axiom give the
 * "modulo" reading. Only an acceptance earns [P]: a Lean run marked accepted, with exit 0, an accept line in its own
 * lines and no error line ("kernel + compiler" when a `_native` axiom is listed). The section's checker rows never
 * make an acceptance; "n checkers" counts the checkers the accepting `--paranoid` runs' own lines show accepting, and
 * those runs must agree on it.
 */
function leanRaw(receipt: Receipt, lean: Checker): RawOutput | string {
  const runs = receipt.runs.flatMap((run) => (isLean(run) ? [{ run, report: parseLeanReport(run.verdictLines) }] : []))
  const exitsOf = (run: ReceiptRun, report: LeanReport): number[] => [run.exitCode, ...report.exitCodes]
  // Each step reads every Lean run, and where several runs give a reading of one kind, the one reported is chosen by
  // its own text (the first in sort order), never by the run's place in the receipt: the same runs in another order
  // give the same raw output.
  const firstOf = (xs: readonly string[]): string | undefined => [...xs].sort()[0]
  const sandbox = firstOf(runs.flatMap(({ report }) => (report.sandboxLine !== undefined ? [report.sandboxLine] : [])))
  if (sandbox !== undefined) return { kind: 'lean-tool-error', lean, line: sandbox }
  const killed = runs.flatMap(({ run, report }) => exitsOf(run, report).filter((c) => c === 137 || c === 143)).sort((a, b) => a - b)[0]
  if (killed !== undefined) return { kind: 'lean-tool-error', lean, exitCode: killed }
  // a statement mismatch in any run outranks a constant mismatch in another (the comparator checks a challenge's
  // theorems one run at a time, and each run reports its own)
  const mismatches = runs.flatMap(({ report }) => (report.mismatch ? [report.mismatch] : []))
  const kind = mismatches.some((m) => m.kind === 'statement') ? 'statement' : 'constant'
  const mismatchLine = firstOf(mismatches.filter((m) => m.kind === kind).map((m) => m.line))
  if (mismatchLine !== undefined) return { kind: 'lean-mismatch', lean, mismatch: kind, line: mismatchLine }
  const rejectedLine = firstOf(runs.flatMap(({ report }) => (report.rejectedLine !== undefined ? [report.rejectedLine] : [])))
  if (rejectedLine !== undefined) return { kind: 'lean-rejected', lean, line: rejectedLine }
  const l = receipt.lean
  const rejecting = firstOf((l?.checkers ?? []).filter((c) => c.verdict === 'rejects').map((c) => c.name))
  if (rejecting !== undefined) return { kind: 'lean-rejected', lean, line: `${rejecting} rejects the solution` }
  // no verdict: of the runs that end without one, the reading that names an error line (the first in sort order), or
  // else the lowest non-zero exit
  const unread = runs.flatMap(({ run, report }) => {
    const nonZero = exitsOf(run, report).filter((c) => c !== 0).sort((a, b) => a - b)[0]
    const line = firstOf(report.errorLines)
    return run.verdict === 'error' || run.verdict === 'rejected' || run.verdict === 'failed' || nonZero !== undefined || line !== undefined ? [{ nonZero, line }] : []
  })
  const key = (u: { readonly nonZero?: number; readonly line?: string }): string => `${u.line === undefined ? 1 : 0}\u0000${u.line ?? ''}\u0000${String(u.nonZero ?? 0).padStart(12, '0')}`
  const noVerdict = [...unread].sort((a, b) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0))[0]
  if (noVerdict !== undefined) {
    return { kind: 'lean-no-verdict', lean, ...(noVerdict.nonZero !== undefined ? { exitCode: noVerdict.nonZero } : {}), ...(noVerdict.line !== undefined ? { line: noVerdict.line } : {}) }
  }
  if (!l) return 'no lean section and no verdict from a Lean run'
  if (l.theorems.length === 0) return 'the lean section lists no theorem, so it has no axioms to list; no stamp'

  // the section's axioms, theorem by theorem, are the ones the runs' #print axioms lines print
  const printed = new Map<string, readonly string[]>()
  for (const { report } of runs) for (const [name, axioms] of report.axioms) if (name !== '') printed.set(name, [...new Set([...(printed.get(name) ?? []), ...axioms])])
  for (const t of l.theorems) {
    const seen = printed.get(t.name)
    if (seen === undefined) return `the lean section lists axioms for ${t.name}, but no Lean run's verdict lines print them (#print axioms); no stamp`
    if (!sameSet(seen, t.axioms)) return `${t.name}: the lean section lists [${t.axioms.join(', ')}] but the verdict lines print [${seen.join(', ')}]; no stamp`
  }
  for (const name of printed.keys()) if (!l.theorems.some((t) => t.name === name)) return `the verdict lines print axioms for ${name}, which the lean section does not list; no stamp`
  const all = l.theorems.flatMap((t) => t.axioms)
  const unnamed = [...new Set(runs.flatMap(({ report }) => report.axioms.get('') ?? []))].filter((a) => !all.includes(a))
  if (unnamed.length > 0) return `the verdict lines print the axioms [${unnamed.join(', ')}] with no theorem's name, and the lean section lists none of them; no stamp`
  const warnings = runs.reduce((n, { report }) => n + report.sorryWarnings, 0)
  if (l.sorryCount === 0 && warnings > 0) return `the lean section counts no sorry, but the verdict lines warn of ${warnings}; no stamp`
  if (l.sorryCount > 0 && warnings === 0 && !all.includes('sorryAx')) return `the lean section counts ${l.sorryCount} sorry, but no verdict line shows one; no stamp`
  const printedNative = [...new Set(all.filter((a) => a.includes('._native.')))]
  if (!sameSet(l.nativeAxioms, printedNative)) return `the lean section's native axioms [${l.nativeAxioms.join(', ')}] are not the _native axioms the verdict lines print [${printedNative.join(', ')}]; no stamp`

  const sorryLemmas = l.theorems.filter((t) => t.axioms.includes('sorryAx')).map((t) => t.name)
  if (l.sorryCount > 0 || sorryLemmas.length > 0) return { kind: 'lean-sorry', lean, lemmas: sorryLemmas, count: Math.max(l.sorryCount, sorryLemmas.length) }
  const custom = [...new Set(all.filter((a) => a !== 'sorryAx' && !STANDARD_AXIOMS.has(a) && !a.includes('._native.')))]
  if (custom.length > 0) return { kind: 'lean-custom-axiom', lean, axioms: custom }

  // an acceptance needs exit 0 with an accept line and no error line (spine section 9.6), in a Lean run's own lines
  const accepting = runs.filter(
    ({ run, report }) =>
      run.verdict === 'accepted' &&
      exitsOf(run, report).every((c) => c === 0) &&
      (report.comparatorAccepted || report.acceptingCheckers.length > 0) &&
      !run.verdictLines.some(isErrorLine) &&
      report.sandboxLine === undefined,
  )
  if (accepting.length === 0) return 'no Lean run accepted the solution with exit 0, an accept line and no error line (spine section 9.6); no stamp'
  if (printedNative.length > 0) return { kind: 'lean-native', lean, nativeAxioms: printedNative }
  const axioms = [...new Set(all)]
  const paranoid = accepting.filter(({ run }) => run.argv.includes('--paranoid'))
  if (paranoid.length === 0) return { kind: 'lean-accepted', lean, axioms }
  const counts = [...new Set(paranoid.map(({ report }) => new Set(report.acceptingCheckers).size))].sort((a, b) => a - b)
  if (counts.length > 1) return `the --paranoid runs' lines show ${counts.join(' and ')} accepting checkers; no stamp`
  const shown = counts[0] as number
  const said = l.checkers.filter((c) => c.verdict === 'accepts').length
  if (shown > 0 && said > 0 && shown !== said) return `the lean section says ${said} checkers accept but the --paranoid run's lines show ${shown}; no stamp`
  return shown > 0 ? { kind: 'lean-accepted', lean, axioms, checkers: shown } : { kind: 'lean-accepted', lean, axioms }
}
