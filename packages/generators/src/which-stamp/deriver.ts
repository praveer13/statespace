// GEN-which-stamp's checker: the verdict-to-stamp deriver of packages/stamps (spine section 8.8; ASSESSMENT.md
// section 4.13), the same code GATE-stamps applies to the course's own receipts, behind an EnginePort so the family
// keys and grades the way every family does. A recorded output's lines go through the parser for its engine, the raw
// output through deriveStamp, and the reply carries the derivation as plain data: the stamp's code and qualifier, a
// "modulo" reading, or the reason no stamp is earned, with the claim-strip segment the output bears on.
//
// The check is exact: a parse and a table lookup. Lines no parser can read are no verdict, which discards the seed.
//
// Pure: no DOM, storage or network.

import {
  codeText,
  deriveStamp,
  ParseError,
  parseLeanReport,
  parseSolverLines,
  parseTlcReport,
  parseTraceRecord,
  rawFromLean,
  rawFromSolver,
  rawFromTlc,
  rawFromTraces,
  SEGMENT_LABELS,
} from '@statespace/stamps'
import type { RawOutput, SolverContext, StripSegment } from '@statespace/stamps'
import type { EnginePort, InstrumentReply, InstrumentRequest } from '../core/port.ts'
import type { RecordedOutput } from './recorded.ts'

export const STAMP_DERIVER = 'stamp-deriver'
export const STAMP_DERIVER_VERSION = '1'

/** What the deriver gives a recorded output, as plain data. */
export type DerivedView =
  | { readonly kind: 'stamp'; readonly code: string; readonly qualifier: readonly string[]; readonly text: string; readonly raw: string; readonly segment: StripSegment }
  | { readonly kind: 'modulo'; readonly text: string; readonly raw: string; readonly segment: StripSegment }
  | { readonly kind: 'none'; readonly reason: string; readonly text: string; readonly raw: string; readonly segment: StripSegment }

export interface DeriverQuery {
  readonly op: 'derive'
  readonly output: RecordedOutput
}

/**
 * The strip segment an output bears on (M-assurance-strip): a check of the model's proposition, of the model's
 * correspondence with the running system, or of the requirement's fit. Pure data about raw-output kinds.
 */
export function segmentOf(kind: RawOutput['kind']): StripSegment {
  switch (kind) {
    case 'trace-validation':
    case 'differential':
    case 'one-database':
    case 'shadow-mismatch':
      return 'correspondence'
    case 'requirement-scenarios':
      return 'requirement'
    default:
      return 'proposition'
  }
}

export const segmentLabel = (s: StripSegment): string => SEGMENT_LABELS[s]

/** The raw output of a recorded output's lines, read by the parser for its engine. Throws ParseError for no verdict. */
export function rawOf(o: RecordedOutput): RawOutput {
  const c = o.context
  switch (o.parser) {
    case 'solver':
      return rawFromSolver(parseSolverLines(o.lines), { solver: o.checker, ...(c as Partial<SolverContext>) } as SolverContext)
    case 'tlc':
      return rawFromTlc(parseTlcReport(o.lines), {
        engine: o.checker,
        constants: o.constants ?? [],
        ...(typeof c.deadlockFreedom === 'boolean' ? { deadlockFreedom: c.deadlockFreedom } : {}),
        ...(typeof c.bound === 'string' ? { bound: c.bound } : {}),
      })
    case 'lean':
      return rawFromLean(parseLeanReport(o.lines), {
        lean: o.checker,
        ...(typeof c.exitCode === 'number' ? { exitCode: c.exitCode } : {}),
        ...(typeof c.paranoid === 'boolean' ? { paranoid: c.paranoid } : {}),
      })
    case 'trace':
      return rawFromTraces(
        (o.traces ?? []).map((t) => ({ trace: t.trace, record: parseTraceRecord(t.line), ...(t.sha256 === undefined ? {} : { sha256: t.sha256 }) })),
        { engine: o.checker, property: c.property === 'liveness' ? 'liveness' : 'safety' },
      )
  }
}

/** The deriver's answer for a recorded output. */
export function deriveView(o: RecordedOutput): DerivedView {
  const raw = rawOf(o)
  const d = deriveStamp(raw, { lane: 'reported', source: o.run })
  const segment = segmentOf(raw.kind)
  if (d.kind === 'stamp') return { kind: 'stamp', code: d.stamp.code, qualifier: [...d.stamp.qualifier], text: codeText(d.stamp), raw: raw.kind, segment }
  if (d.kind === 'modulo') return { kind: 'modulo', text: d.text, raw: raw.kind, segment }
  return { kind: 'none', reason: d.reason, text: d.text, raw: raw.kind, segment }
}

class DeriverError extends Error {
  readonly code: string
  constructor(code: string, message: string) {
    super(message)
    this.name = 'DeriverError'
    this.code = code
  }
}

const isQuery = (x: unknown): x is DeriverQuery =>
  typeof x === 'object' && x !== null && (x as { op?: unknown }).op === 'derive' && typeof (x as { output?: unknown }).output === 'object' && (x as { output?: unknown }).output !== null

/** The deriver as a port: `parsed` with the derivation as its witness, or `rejected` when no parser reads the lines. */
export const stampDeriverPort: EnginePort = {
  async run<I, W>(req: InstrumentRequest<I>): Promise<InstrumentReply<W>> {
    if (req.engine !== STAMP_DERIVER) throw new DeriverError('unknown-engine', `the stamp deriver runs ${STAMP_DERIVER}, not ${req.engine}`)
    if (req.version !== STAMP_DERIVER_VERSION) throw new DeriverError('version-mismatch', `the stamp deriver is version ${STAMP_DERIVER_VERSION}, not ${req.version}`)
    if (!isQuery(req.input)) throw new DeriverError('invalid-input', 'not a stamp-deriver query')
    const provenance = { engine: STAMP_DERIVER, version: STAMP_DERIVER_VERSION, build: `@statespace/stamps deriveStamp`, budget: req.budget }
    try {
      const view = deriveView(req.input.output)
      return { verdict: { kind: 'parsed', issues: [] }, witness: view as unknown as W, stats: { ms: 0 }, provenance }
    } catch (e) {
      if (e instanceof ParseError) return { verdict: { kind: 'rejected', issues: [e.message] }, stats: { ms: 0 }, provenance }
      throw e
    }
  },
}
