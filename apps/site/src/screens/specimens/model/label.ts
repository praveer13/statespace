// A specimen label, generated (DESIGN.md section 6.5; spine section 5.1): the stamp, the witness, whether it is minimal,
// where it was found and with which tool, all read from the lines of the runs the record points at; the property it
// violates, the cause, the class and the fix, which only a person can say, from the record; the status, from the
// learner's events (status.ts). Nothing here is typed into a label: the stamp is derived by @statespace/stamps from the
// solver's own line (never built by hand; GATE-stamps), and a witness is shown only as the lines say it.
//
// Pure: no DOM, storage, clock or network.

import { checkerOf, deriveStamp, rawFromSolver } from '@statespace/stamps'
import type { Derivation } from '@statespace/stamps'
import { modelPairs, readCore, readMinimum, readVerdict, replayOf, witnessSteps } from './blocks.ts'
import { rich } from './text.ts'
import type { RichPart } from './text.ts'
import type { AlsoEvidence, Block, CabinetEntry, Evidence, MainEvidence, MinimalEvidence, RunFacts } from './types.ts'

// ------------------------------------------------------------------ the stamp

/**
 * The derivation of the main query (spine section 8.8 through @statespace/stamps): the stamp it earns, or the reading it
 * earns instead of one. A sat of a violation query is REFUTED once its witness replays; an unknown keeps the solver's
 * reason; a premise query that is unsat reads as contradictory premises, and earns no stamp.
 *
 * The witness's length is read from the witness the line prints (`witnessSteps`: the primed variables of its model), the
 * rule the build holds a record's own statement of it to; the label never takes it from the record.
 *
 * The lane is `reported`: the run is the course's own, recorded and not run in this tab, and it mints no learner stamp
 * (spine section 9.3), so the screen draws the stamp without a badge and puts the recorded-run badge beside it.
 */
export function deriveMain(evidence: Evidence): Derivation {
  const e = evidence.main
  const facts = evidence.runs[e.run] as RunFacts
  const line = readVerdict(e.lines)
  if (line === null) throw new Error(`${e.run} ${JSON.stringify(e.query)} carries no solver verdict`)
  const replay = replayOf([...(e.replay?.lines ?? []), ...e.lines])
  const premise = e.premise === undefined ? undefined : readVerdict(e.premise.lines)?.verdict
  const raw = rawFromSolver(line, {
    solver: checkerOf(facts.engine, facts.version),
    direction: e.direction,
    ...(facts.rlimit !== null ? { rlimit: facts.rlimit } : {}),
    replay,
    witness: { length: witnessSteps(line.model ?? ''), unit: 'steps' },
    ...(premise === 'sat' || premise === 'unsat' ? { premise } : {}),
  })
  return deriveStamp(raw, { lane: 'reported', source: e.run })
}

// ------------------------------------------------------------------ the evidence blocks

export interface BlockView {
  /** witness: a sat with its model, replayed; answer: an unsat or an unknown; raw: lines with no verdict. */
  readonly kind: 'witness' | 'answer' | 'raw'
  readonly caption: readonly RichPart[] | null
  /** "Z3 returned sat", "Z3 returned unknown: incomplete (theory arithmetic)", or the line itself when it carries no verdict. */
  readonly heading: string
  /** A model's assignments as the solver printed them, one per row. */
  readonly rows: readonly { readonly name: string; readonly value: string }[]
  /** What the replay says, after its label: `a=0 b=0 amount=1: a >= 0 ok, ...`; null when there is no witness to replay. */
  readonly replay: string | null
  /** The block's lines, verbatim, with the run they are from. */
  readonly lines: readonly string[]
  readonly run: string
}

const replayText = (lines: readonly string[]): string | null => {
  const line = lines.find((l) => /(?:^|\s)replay ok:/.test(l))
  return line === undefined ? null : line.slice(line.indexOf('replay ok:') + 'replay ok:'.length).trim()
}

function blockView(block: Block, replay: Block | undefined, caption: string | null, evidence: Evidence): BlockView {
  const words = caption === null ? null : rich(caption)
  const line = readVerdict(block.lines)
  const facts = evidence.runs[block.run] as RunFacts
  const tool = checkerOf(facts.engine, facts.version).name
  if (line === null) return { kind: 'raw', caption: words, heading: block.lines[0]?.replace(/^\d+(?:\.\d+)?m?s py:\s+/, '').trim() ?? '', rows: [], replay: null, lines: block.lines, run: block.run }
  if (line.verdict === 'sat') {
    const rows = modelPairs(line.model ?? '').map(([name, value]) => ({ name, value }))
    return { kind: 'witness', caption: words, heading: `${tool} returned sat`, rows, replay: replayText([...(replay?.lines ?? []), ...block.lines]), lines: block.lines, run: block.run }
  }
  const reason = line.verdict === 'unknown' && line.reason !== undefined ? `: ${line.reason}` : ''
  return { kind: 'answer', caption: words, heading: `${tool} returned ${line.verdict}${reason}`, rows: [], replay: null, lines: block.lines, run: block.run }
}

// ------------------------------------------------------------------ minimal?

export interface MinimalView {
  /** The row's value, with `code` spans for what is set in the code face: "yes: `amount = 1` under an Optimize objective", "not minimized", or an em dash and why. */
  readonly text: string
  /** A second sentence: what confirms it. Null when nothing does. */
  readonly basis: string | null
  /** The runs the answer rests on. */
  readonly runs: readonly string[]
  readonly minimal: boolean
}

export function minimalView(m: MinimalEvidence): MinimalView {
  switch (m.kind) {
    case 'optimize': {
      const value = readMinimum(m.block.lines, m.objective) ?? ''
      return {
        text: `yes: \`${m.objective} = ${value}\` under an Optimize objective`,
        basis: m.confirm === undefined ? null : 'A plain query for anything smaller is unsat.',
        runs: [m.block.run],
        minimal: true,
      }
    }
    case 'core': {
      const core = readCore(m.block.lines)
      const names = m.constraints.length > 0 ? m.constraints : (core?.members ?? [])
      return {
        text: `yes: an unsat core of ${names.length} ${names.length === 1 ? 'constraint' : 'constraints'}: ${names.map((n) => `\`${n}\``).join(' and ')}`,
        basis: 'Alone it is unsat, and dropping any one of them leaves it sat.',
        runs: [m.block.run],
        minimal: true,
      }
    }
    case 'none':
      return { text: 'not minimized', basis: null, runs: [], minimal: false }
    case 'not-applicable':
      return { text: `— ${m.why}`, basis: null, runs: [], minimal: false }
  }
}

// ------------------------------------------------------------------ the label

export interface LabelView {
  readonly id: string
  readonly title: string
  readonly draft: boolean
  readonly derivation: Derivation
  /** The main query's block, then the further ones. */
  readonly main: BlockView
  readonly also: readonly BlockView[]
  readonly violates: readonly RichPart[]
  readonly because: readonly RichPart[]
  readonly classText: readonly RichPart[]
  readonly curedBy: { readonly text: readonly RichPart[]; readonly claim: string | null; readonly fixed: string | null }
  readonly minimal: MinimalView
  readonly foundIn: { readonly lesson: string | null; readonly labStage: string | null; readonly tool: string; readonly run: RunFacts }
  /** Every other run the label draws on. */
  readonly otherRuns: readonly RunFacts[]
  readonly kcs: readonly { readonly id: string; readonly name: string }[]
  readonly incident: null | { readonly date: string; readonly sourceTitle: string; readonly sourceUrl: string; readonly toyModel: boolean }
  /** The compact provenance block: Sheet, Rev, Drawn, Checked by (DESIGN.md section 6.1). An empty field is null: a dash, never a guess. */
  readonly provenance: { readonly sheet: string; readonly rev: string; readonly drawn: string | null; readonly checkedBy: string }
}

const checkerName = (r: RunFacts): string => {
  const c = checkerOf(r.engine, r.version)
  return `${c.name} ${c.version}`
}

/** What the label says of a main query that asks for the premises alone: it is generated from the record's direction, not typed. */
export const PREMISE_CAPTION = 'The premise query: the premises alone, with no property to violate.'

export function buildLabel(entry: CabinetEntry): LabelView {
  const { record, evidence } = entry
  const mainRun = evidence.runs[evidence.main.run] as RunFacts
  const main: MainEvidence = evidence.main
  const also: readonly AlsoEvidence[] = evidence.also
  return {
    id: record.id,
    title: record.title,
    draft: record.draft === true,
    derivation: deriveMain(evidence),
    main: blockView(main, main.replay, main.direction === 'premise' ? PREMISE_CAPTION : null, evidence),
    also: also.map((a) => blockView(a, a.replay, a.caption, evidence)),
    violates: rich(record.violates),
    because: rich(record.because),
    classText: rich(record.class),
    curedBy: { text: rich(record.cured_by.text), claim: record.cured_by.claim ?? null, fixed: record.cured_by.fixed ?? null },
    minimal: minimalView(evidence.minimal),
    foundIn: { lesson: record.found_in.lesson ?? null, labStage: record.found_in.lab_stage ?? null, tool: checkerName(mainRun), run: mainRun },
    otherRuns: Object.values(evidence.runs).filter((r) => r.id !== mainRun.id),
    kcs: record.kcs.map((id) => ({ id, name: entry.kcNames[id] ?? id })),
    incident: record.incident === undefined ? null : { date: record.incident.date, sourceTitle: record.incident.source.title, sourceUrl: record.incident.source.url, toyModel: record.incident.toy_model },
    provenance: { sheet: record.id, rev: entry.rev.slice(0, 12), drawn: mainRun.date, checkedBy: `${checkerName(mainRun)} · ${mainRun.id}` },
  }
}

export { rich, runTokens } from './text.ts'
export type { RichPart } from './text.ts'
