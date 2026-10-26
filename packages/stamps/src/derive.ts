// Spine section 8.8 as a total function: one raw output in, one derivation out (a stamp, a "modulo" reading, or
// no stamp with its reason). Stamps are computed at read time and never stored (I2); an agent's assertion has no
// path to a stamp (I8); every [M], [T] and grader stamp prints its bound (I10). The switch is exhaustive, so a new
// raw-output kind does not compile until it has a row.

import { SEP, constantsText, fmtCount, fmtRlimit, witnessText } from './format.ts'
import type { Checker, RawOutput } from './raw.ts'
import { rowOf } from './rows.ts'
import type { Defeater, Derivation, Lane, Stamp, UnreviewedQuote } from './types.ts'
import { specOf, type StampCode } from './vocabulary.ts'

export interface StampContext {
  /** The lane of the result: re-checked in this tab, reported from the learner's machine, or self-assessed. */
  readonly lane: Lane
  /** Where the raw output came from, for the card's provenance: a receipt path and run, a reply, a run ID. */
  readonly source: string
}

export class StampGrammarError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'StampGrammarError'
  }
}

/** The open defeater every solver [P] carries until its encoding is cross-checked against the code. */
export const ENCODING_UNVERIFIED: Defeater = { text: 'encoding unverified', against: 'claim' }

const checker = (c: Checker): string => `${c.name} ${c.version}`

/** A bound states constants or a number (I10): "Init = 100, …", "12 seeds", "n = 200", "depth 20". */
export function looksLikeBound(part: string): boolean {
  return part === 'no constants' || /[0-9=]/.test(part)
}

/** A [P] qualifier names its checker and the checker's version: "Z3 5.3.1 unsat", "Lean 4.35.0 kernel". */
export function namesCheckerAndVersion(part: string): boolean {
  return /[A-Za-z][\w+.-]*\s+v?\d+(?:\.\d+)+/.test(part)
}

/** Check a stamp's grammar: qualifier present, the bound first for [M] and [T], checker and version for [P]. */
export function grammarProblems(code: StampCode, qualifier: readonly string[]): string[] {
  const problems: string[] = []
  const spec = specOf(code)
  if (qualifier.length === 0) problems.push(`${code} needs a qualifier: ${spec.requires}`)
  for (const part of qualifier) {
    if (part.trim() === '' || part !== part.trim()) problems.push(`${code} has an empty or padded qualifier part: "${part}"`)
    if (part.includes(SEP.trim())) problems.push(`${code} has a qualifier part that holds a separator: "${part}"`)
  }
  if (spec.boundFirst && qualifier.length > 0 && !looksLikeBound(qualifier[0] ?? '')) {
    problems.push(`${code} prints its bound first (constants or n), not "${qualifier[0]}"`)
  }
  if (code === '[P]' && qualifier.length > 0 && !namesCheckerAndVersion(qualifier[0] ?? '')) {
    problems.push(`[P] names its checker and version first, not "${qualifier[0]}"`)
  }
  return problems
}

function makeStamp(code: StampCode, qualifier: readonly (string | undefined | false)[], ctx: StampContext, row: string, defeaters: readonly Defeater[] = []): Stamp {
  const parts = qualifier.filter((p): p is string => typeof p === 'string')
  const problems = grammarProblems(code, parts)
  if (problems.length > 0) throw new StampGrammarError(`${row}: ${problems.join('; ')}`)
  rowOf(row)
  const stamp = {
    code,
    word: specOf(code).word,
    qualifier: Object.freeze(parts),
    lane: ctx.lane,
    source: ctx.source,
    row,
    defeaters: Object.freeze([...defeaters]),
  }
  return Object.freeze(stamp) as unknown as Stamp
}

const stamp = (code: StampCode, qualifier: readonly (string | undefined | false)[], ctx: StampContext, row: string, defeaters: readonly Defeater[] = []): Derivation => ({
  kind: 'stamp',
  stamp: makeStamp(code, qualifier, ctx, row, defeaters),
})

type NoStamp = Extract<Derivation, { kind: 'none' }>

const none = (reason: NoStamp['reason'], text: string, row: string, extra: Pick<NoStamp, 'defeater' | 'quote' | 'witnesses'> = {}): Derivation => {
  rowOf(row)
  return { kind: 'none', reason, text, row, ...extra }
}

const quote = (text: string, by: string, label: UnreviewedQuote['label'] = 'UNREVIEWED'): UnreviewedQuote => ({ label, quote: text, by })

const plural = (n: number, one: string, many: string): string => `${fmtCount(n)} ${n === 1 ? one : many}`

/** The [?] qualifier for a solver's unknown: "canceled at rlimit 5e6", or the reason verbatim. */
function unknownReason(reason: string, rlimit: number | undefined): string {
  const r = reason.trim()
  if (rlimit !== undefined && /^(?:canceled|cancelled|max\. resource limit exceeded|resource limits? reached|rlimit)$/i.test(r)) return `${r} at rlimit ${fmtRlimit(rlimit)}`
  return r === '' ? 'no reason given' : r
}

/** Derive the stamp a raw output earns under spine section 8.8. */
export function deriveStamp(raw: RawOutput, ctx: StampContext): Derivation {
  switch (raw.kind) {
    case 'smt-unsat': {
      const cc = raw.crossCheck
      if (cc && cc.sameInput && cc.verdict === 'sat') {
        // Two solvers contradict each other on one input: one of them, or the encoding, is wrong. Neither side is stamped.
        return none('shadow-mismatch', `${checker(raw.solver)} says unsat and ${checker(cc.solver)} says sat on the same input: no stamp`, 'shadow-mismatch', {
          defeater: { text: `${checker(raw.solver)} and ${checker(cc.solver)} disagree`, against: 'both-sides' },
        })
      }
      // agreement needs the second solver's unsat on the same input; its unknown is no verdict, so the [P] stands alone
      const agree = cc !== undefined && cc.sameInput && cc.verdict === 'unsat'
      const head = agree ? `${checker(raw.solver)} and ${checker(cc.solver)} agree` : `${checker(raw.solver)} ${raw.method ?? 'unsat'}`
      const defeaters: Defeater[] = [ENCODING_UNVERIFIED]
      if (raw.premise === 'unsat') defeaters.push({ text: 'the premises are unsatisfiable, so the claim holds vacuously', against: 'claim' })
      return stamp('[P]', [head, 'uncertified', raw.rlimit !== undefined && `rlimit ${fmtRlimit(raw.rlimit)}`], ctx, 'smt-unsat', defeaters)
    }
    case 'smt-sat': {
      if (raw.replay === 'failed') {
        return none('no-replay', `${checker(raw.solver)} returned sat, but its model does not replay in the interpreter: no stamp`, 'smt-sat-no-replay', {
          defeater: { text: 'a model that does not replay: the verification-condition generator is suspect', against: 'vc-generator' },
        })
      }
      if (raw.replay === 'pending') return none('replay-pending', `${checker(raw.solver)} returned sat; the stamp waits until its witness replays`, 'smt-sat')
      return stamp('[R]', [witnessText(raw.witness)], ctx, 'smt-sat')
    }
    case 'smt-unknown': {
      const d = stamp('[?]', [unknownReason(raw.reason, raw.rlimit)], ctx, 'smt-unknown')
      return raw.guardsEnforcement && d.kind === 'stamp' ? { ...d, enforcement: 'fail-closed' } : d
    }
    case 'smt-premise':
      return raw.verdict === 'sat'
        ? none('premise-witness', `the premise query is sat: a premise witness, which supports the claim beside it and earns no stamp of its own`, 'smt-premise')
        : none('premise-witness', `the premise query is unsat: the premises are contradictory, so any claim over them holds vacuously`, 'smt-premise', {
            defeater: { text: 'the premises are unsatisfiable, so the claim holds vacuously', against: 'claim' },
          })
    case 'smt-direction-unknown':
      return none('direction-unknown', `${checker(raw.solver)} returned ${raw.verdict}, but the query's direction is not stated, so the result cannot be read either way`, 'smt-premise')
    case 'tlc-complete':
      return stamp('[M]', [constantsText(raw.constants), 'complete', plural(raw.distinctStates, 'distinct state', 'distinct states')], ctx, 'tlc-complete')
    case 'tlc-violation':
      return stamp('[R]', [witnessText(raw.witness)], ctx, 'tlc-violation')
    case 'model-check-bounded':
      return stamp(
        '[M]',
        [raw.bound, raw.constants && raw.constants.length > 0 && constantsText(raw.constants), 'partial', raw.distinctStates !== undefined && plural(raw.distinctStates, 'distinct state', 'distinct states')],
        ctx,
        'model-check-bounded',
      )
    case 'tlc-simulate':
      return stamp('[T]', [plural(raw.n, raw.unit === 'traces' ? 'trace' : 'sampled state', raw.unit), raw.constants.length > 0 ? constantsText(raw.constants) : 'no constants', checker(raw.engine)], ctx, 'tlc-simulate')
    case 'tlc-deadlock':
      if (raw.deadlockFreedom) {
        if (!raw.witness) throw new StampGrammarError('tlc-deadlock: a violated deadlock freedom needs its witness length')
        return stamp('[R]', [witnessText(raw.witness)], ctx, 'tlc-deadlock')
      }
      return stamp('[?]', [`stopped at deadlock, ${plural(raw.distinctStates, 'distinct state', 'distinct states')}`], ctx, 'tlc-deadlock')
    case 'inductive-bounded':
      return stamp('[M]', [constantsText(raw.constants), `inductive at ${raw.at}`, checker(raw.engine)], ctx, 'inductive-bounded')
    case 'smt-inductive-param': {
      const defeaters: Defeater[] = [{ text: 'encoding unverified (the SMT translation of the spec)', against: 'claim' }]
      if (raw.premise === 'unsat') defeaters.push({ text: 'the premises are unsatisfiable, so the claim holds vacuously', against: 'claim' })
      if (raw.premise === 'not-run') defeaters.push({ text: 'no premise witness', against: 'claim' })
      return stamp('[P]', [`${checker(raw.solver)} unsat`, 'uncertified', `for every ${raw.parameter}`, raw.rlimit !== undefined && `rlimit ${fmtRlimit(raw.rlimit)}`], ctx, 'smt-inductive-param', defeaters)
    }
    case 'lean-accepted':
      return stamp('[P]', [`${checker(raw.lean)} kernel`, 'axioms listed', raw.checkers !== undefined && plural(raw.checkers, 'checker', 'checkers')], ctx, 'lean-accepted')
    case 'lean-sorry': {
      const k = Math.max(raw.count, raw.lemmas.length)
      const assumed = raw.lemmas.length > 0 ? raw.lemmas.map((l) => makeStamp('[A]', [`${l} is left as sorry`], ctx, 'lean-sorry')) : [makeStamp('[A]', [`${plural(k, 'declaration uses', 'declarations use')} sorry`], ctx, 'lean-sorry')]
      return { kind: 'modulo', text: `PROVED modulo ${plural(k, 'assumed lemma', 'assumed lemmas')}`, assumed }
    }
    case 'lean-custom-axiom':
      return {
        kind: 'modulo',
        text: `PROVED modulo ${plural(raw.axioms.length, 'assumed axiom', 'assumed axioms')}`,
        assumed: raw.axioms.map((a) => makeStamp('[A]', [`axiom ${a} is assumed`], ctx, 'lean-custom-axiom')),
      }
    case 'lean-native':
      return stamp('[P]', [`${checker(raw.lean)} kernel + compiler`, 'axioms listed'], ctx, 'lean-native')
    case 'lean-mismatch':
      return stamp('[?]', [raw.mismatch === 'statement' ? 'statement mismatch' : 'statement mismatch (a constant differs)'], ctx, 'lean-mismatch')
    case 'lean-tool-error': {
      const why = raw.line !== undefined ? `the sandbox failed: ${raw.line}` : `a checker was killed (exit ${raw.exitCode ?? 'unknown'})`
      return none('tool-error', `no verdict and no stamp: ${why}. This is never read as a rejection.`, 'lean-tool-error')
    }
    case 'lean-rejected':
      return none('checker-rejected', `no stamp: ${raw.line}`, 'lean-rejected')
    case 'lean-no-verdict': {
      const why =
        raw.line !== undefined
          ? `an error that is not a rejection: ${raw.line}`
          : raw.exitCode !== undefined && raw.exitCode !== 0
            ? `exit ${raw.exitCode} with no rejection line`
            : 'the run ended without an accept line, a rejection or a sandbox line'
      return none('no-verdict', `no verdict and no stamp: ${why}. An acceptance needs exit 0, an accept line and no error line.`, 'lean-no-verdict')
    }
    case 'differential':
      return stamp('[T]', [`n = ${fmtCount(raw.n)}`, raw.statistics, raw.engines.map(checker).join(' and ')], ctx, 'differential')
    case 'shadow-mismatch':
      return none('shadow-mismatch', `${raw.sides[0]} and ${raw.sides[1]} disagree: ${raw.detail}. No stamp for either side.`, 'shadow-mismatch', {
        defeater: { text: `${raw.sides[0]} and ${raw.sides[1]} disagree`, against: 'both-sides' },
      })
    case 'one-database':
      return stamp('[T]', ['1 instance', checker(raw.engine)], ctx, 'one-database')
    case 'trace-validation': {
      const witnesses = raw.rejected.map((r) => ({ trace: r.trace, firstNonConformingLine: r.firstNonConformingLine }))
      if (raw.property === 'liveness') {
        return none('liveness-untestable', 'finite traces cannot test eventuality: the correspondence of a liveness claim stays assumed', 'trace-validation', { witnesses })
      }
      if (raw.accepted === 0) return none('trace-unearned', 'no accepted trace: partial, error and rejected traces earn no stamp', 'trace-validation', { witnesses })
      const d = stamp('[T]', [plural(raw.accepted, 'seed', 'seeds'), `${checker(raw.engine)} trace validation`], ctx, 'trace-validation')
      return witnesses.length > 0 && d.kind === 'stamp' ? { ...d, witnesses } : d
    }
    case 'setting-read-back':
      return stamp('[C]', [`${raw.setting} read back from ${raw.source}`, `at ${raw.at}`], ctx, 'setting-read-back')
    case 'runtime-check':
      return stamp('[E]', [raw.where], ctx, 'runtime-check')
    case 'model-assertion':
      return none('model-assertion', `${raw.by} says so; that is quoted text, never a stamp`, 'model-assertion', { quote: quote(raw.text, raw.by) })
    case 'clearinghouse-quiet':
      return stamp('[T]', [plural(raw.calls, 'world call', 'world calls'), `${raw.rule} stayed quiet`], ctx, 'clearinghouse-quiet')
    case 'clearinghouse-fires':
      if (raw.replay !== 'replayed') return none(raw.replay === 'failed' ? 'no-replay' : 'replay-pending', `${raw.rule} fired; the stamp waits until its witness replays`, 'clearinghouse-fires')
      return stamp('[R]', [witnessText(raw.witness)], ctx, 'clearinghouse-fires')
    case 'course-claim-under-audit':
      return none('course-claim-under-audit', 'a course-authored claim under audit is quoted text, never a stamp', 'course-claim-under-audit', { quote: quote(raw.text, 'the course', 'UNDER AUDIT') })
    case 'statement-hash-changed':
      return stamp('[?]', ['statement hash changed'], ctx, 'statement-hash-changed')
    case 'agent-assertion':
      return none('agent-assertion', 'the agent says so; that is quoted text, never a stamp', 'agent-assertion', { quote: quote(raw.text, raw.by ?? 'the agent') })
    case 'grader': {
      const count = raw.passed !== undefined ? `${fmtCount(raw.passed)} of ${fmtCount(raw.n)} ${raw.unit}` : `${fmtCount(raw.n)} ${raw.unit}`
      const interval = raw.interval && `Wilson ${raw.interval[0].toFixed(2)}–${raw.interval[1].toFixed(2)}`
      return stamp('[T]', [count, interval], ctx, 'grader')
    }
    case 'self-grade':
      return stamp('[A]', ['self-assessed', raw.what], { ...ctx, lane: 'self-assessed' }, 'self-grade')
    case 'assumption':
      return stamp('[A]', [raw.why], ctx, 'assumption')
    case 'not-covered':
      return stamp('[N]', [raw.what], ctx, 'not-covered')
    case 'requirement-scenarios':
      return raw.counterexample !== undefined
        ? stamp('[R]', ['1 scenario', raw.counterexample], ctx, 'requirement-scenarios')
        : stamp('[T]', [plural(raw.n, 'requirement scenario', 'requirement scenarios')], ctx, 'requirement-scenarios')
    default: {
      const unreachable: never = raw
      throw new Error(`no row of spine section 8.8 for ${JSON.stringify(unreachable)}`)
    }
  }
}

/** The stamp of a derivation, or undefined when it has none. */
export const stampOf = (d: Derivation): Stamp | undefined => (d.kind === 'stamp' ? d.stamp : undefined)
