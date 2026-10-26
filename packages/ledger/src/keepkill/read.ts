// The keep/kill reads (keep/kill rules, common.reads, common.outcome, common.estimate, common.decisions,
// common.deviations and each comparison's decision). A read uses the events whose at precedes it, together
// with the governing expSeed, the rules and the content in force; it first checks that the rules it applies
// hash to the value the draw recorded and refuses otherwise. Every read returns a learner-zero run record
// (run@1) with the digest of the event set it used, so anyone with the export can derive it again; the
// record's id is unique to the read (readRecordId), so every read's record can be kept beside the others. A
// read never changes a learner state and never locks anything (I5); it reports, descriptively, for one learner.
//
// Pure: no DOM, storage or network.

import type { RunRecord } from '@statespace/schema'
import { canonicalJson, LedgerError } from '../canonical.ts'
import type { ExpSeedDraw, LedgerEvent } from '../event.ts'
import type { Log } from '../log.ts'
import { eventSetDigest, governingDraw, orderedEvents, supersededDraws } from '../log.ts'
import { sha256Hex } from '../sha256.ts'
import { addDays, compareInstants, instantKey, localDayOf, localTimeOf, SECONDS_PER_DAY, shiftKey } from '../time.ts'
import { allocate, firstWindowArm } from './allocate.ts'
import { armRecordsOf } from './arm-record.ts'
import type { Entry } from './entry.ts'
import { entriesOf } from './entry.ts'
import type { KeepKillContent } from './facts.ts'
import { firstLearning, isPracticeItem, outcomeEvent, sessionsOf } from './facts.ts'
import type { KcComparison } from './rules.ts'
import { KC_COMPARISON_LIST, PARAMETERS, PROOF_BLOCKS, RULES_PATH, RULES_SHA256, unitsOf, WINDOWS } from './rules.ts'
import type { Interval, Phase } from './stats.ts'
import { decideCommon, decideNote, decideWindows, wilson } from './stats.ts'
import type { DeclaredBreak } from './windows.ts'
import { daysOf, windowBeforeDraw, windowsOf } from './windows.ts'

export type { Phase }

/** The engine and version a read record names. */
export const READ_ENGINE = 'statespace-ledger'
export const READ_VERSION = 'keepkill-read-1'

/** How many hexadecimal digits of the record's own digest end a read record's id (readRecordId). */
export const READ_ID_DIGEST_HEX = 8

export interface ReadInput {
  /** The comparison's id: misconception-note, proof-blocks-distractors, witness-generalization or reserve-weeks. */
  readonly comparison: string
  readonly phase: Phase
  /** The read's instant: it uses the events whose at precedes it. */
  readonly at: string
  readonly log: Log
  readonly content: KeepKillContent
  /** The content build the resolvers read, recorded in the run record's inputs when given. */
  readonly contentBuild?: { readonly name: string; readonly sha256: string }
  /** Comparison 4: declared breaks, and the day a week starts (default Monday [D]). */
  readonly breaks?: readonly DeclaredBreak[]
  readonly weekStartsOn?: number
  /** When the record is written; defaults to the read's instant. */
  readonly recordedAt?: string
}

export interface UnitRow {
  readonly unit: string
  readonly stratum: string
  readonly arm: string
  /** Comparison 1: the shipped default for the unit's treatment. */
  readonly defaultArm?: string
  readonly entry: Entry
  /** Units exposed under a superseded expSeed are deviations, left out of every estimate. */
  readonly excluded?: 'superseded-seed'
  readonly outcome?: { readonly event: string; readonly at: string; readonly correct: boolean }
  readonly deviations: number
}

export interface WindowRow {
  readonly index: number
  readonly arm: string
  readonly weeks: readonly string[]
  readonly complete: boolean
  readonly entersAt: string
  readonly entered: boolean
  /** Counted weeks with graded or Bench work, for complete windows. */
  readonly weeksWithWork: number | null
  /** KCs first learned in the window, scored at their first fresh event 30 days or more later. */
  readonly firstLearned: { readonly x: number; readonly n: number; readonly kcs: number }
  /** Time on task in the window, the sum of ms over its events. */
  readonly ms: number
}

export interface ArmFigures {
  readonly arm: string
  readonly allocated: number
  readonly entered: number
  readonly withOutcome: number
  readonly missing: number
  readonly correct: number
  readonly accuracy: number | null
  readonly wilson: readonly [number, number] | null
  /** The median time on task (ms) of the arm's units' manipulated practice items. */
  readonly medianMs: number | null
  readonly deviations: number
}

export interface ReadResult {
  readonly comparison: string
  readonly number: number
  readonly phase: Phase
  readonly at: string
  readonly expSeed: number
  readonly drawnAt: string
  readonly rulesSha256: string
  readonly eventDigest: string
  readonly eventCount: number
  readonly supersededSeeds: readonly number[]
  readonly units?: readonly UnitRow[]
  readonly windows?: readonly WindowRow[]
  readonly arms: readonly ArmFigures[]
  readonly estimate: string
  readonly interval: Interval | null
  readonly decision: string
  readonly rule: string
  readonly withdrawn: readonly string[]
  readonly malformedArmRecords: number
}

export interface ReadOutcome {
  readonly result: ReadResult
  /** The learner-zero run record of this read (run@1). */
  readonly record: RunRecord
}

/** A read of one comparison, with its run record. Throws a LedgerError when the read must refuse to run. */
export function readComparison(input: ReadInput): ReadOutcome {
  const draw = governingDraw(input.log.expSeeds)
  if (draw === undefined) throw new LedgerError('refused', 'the comparisons are off: the log holds no expSeed draw')
  if (draw.rulesSha256 !== RULES_SHA256) {
    throw new LedgerError('refused', `the rules this read applies hash to ${RULES_SHA256}, but the governing draw recorded ${draw.rulesSha256}; an amendment's own record is needed`)
  }
  instantKey(input.at)
  const used = orderedEvents(input.log).filter((e) => compareInstants(e.at, input.at) < 0)
  const base = {
    phase: input.phase,
    at: input.at,
    expSeed: draw.expSeed,
    drawnAt: draw.drawnAt,
    rulesSha256: RULES_SHA256,
    eventDigest: eventSetDigest(used),
    eventCount: used.length,
    supersededSeeds: supersededDraws(input.log.expSeeds).map((d) => d.expSeed),
  }
  const result = input.comparison === WINDOWS.id ? readWindows(input, draw, used, base) : readKc(input, draw, used, base)
  return { result, record: recordOf(result, input) }
}

type Base = Pick<ReadResult, 'phase' | 'at' | 'expSeed' | 'drawnAt' | 'rulesSha256' | 'eventDigest' | 'eventCount' | 'supersededSeeds'>

const median = (values: number[]): number | null => {
  if (values.length === 0) return null
  const s = [...values].sort((a, b) => a - b)
  const mid = s.length >> 1
  return s.length % 2 === 1 ? (s[mid] as number) : ((s[mid - 1] as number) + (s[mid] as number)) / 2
}

const isProofBlocks = (t: { family: string; template: number } | undefined): boolean =>
  t !== undefined && t.family === PROOF_BLOCKS.family && t.template === PROOF_BLOCKS.template

/** Whether a practice item carries the comparison's manipulation, given that its primary KC is an entered unit. */
function manipulates(comparison: KcComparison, e: LedgerEvent, content: KeepKillContent): boolean {
  if (!isPracticeItem(e)) return false
  if (comparison.id === 'misconception-note') return true
  const t = content.template(e)
  if (comparison.id === 'proof-blocks-distractors') return isProofBlocks(t)
  return t !== undefined && (comparison.families ?? []).includes(t.family)
}

function readKc(input: ReadInput, draw: ExpSeedDraw, used: readonly LedgerEvent[], base: Base): ReadResult {
  const comparison = KC_COMPARISON_LIST.find((c) => c.id === input.comparison)
  if (comparison === undefined) throw new LedgerError('refused', `no comparison ${JSON.stringify(input.comparison)} in ${RULES_PATH}`)
  const { content } = input
  const allocation = new Map(allocate(comparison, draw.expSeed).map((a) => [a.unit, a]))
  const sessions = sessionsOf(used)
  const entries = entriesOf(comparison, { ordered: used, content, draw, sessions })

  // Arm records: exposures under a superseded seed, and deviations per unit.
  const superseded = new Set<string>()
  const deviations = new Map<string, number>()
  let malformed = 0
  for (const e of used) {
    const { records, malformed: m } = armRecordsOf(e)
    malformed += m
    const r = records.find((x) => x.comparison === comparison.id)
    if (r === undefined) continue
    const kc = content.primaryKc(e)
    const allocated = kc === undefined ? undefined : allocation.get(kc)
    if (kc === undefined || allocated === undefined) continue
    if (r.expSeed !== draw.expSeed) superseded.add(kc)
    if (r.expSeed !== draw.expSeed || r.arm !== allocated.arm || r.fallback !== undefined) deviations.set(kc, (deviations.get(kc) ?? 0) + 1)
  }

  const delay = PARAMETERS.outcome_delay_days * SECONDS_PER_DAY
  const skip = (e: LedgerEvent): boolean => isPracticeItem(e) && isProofBlocks(content.template(e))
  const units: UnitRow[] = unitsOf(comparison).map(({ unit, stratum }) => {
    const arm = (allocation.get(unit) as { arm: string }).arm
    const entry = entries.get(unit) as Entry
    const excluded = superseded.has(unit) ? ('superseded-seed' as const) : undefined
    const defaultArm = comparison.id === 'misconception-note' ? ((content.treatment(unit) ?? 'novice') === 'expert' ? 'collapsed' : 'open') : undefined
    let outcome: UnitRow['outcome']
    if (entry.status === 'entered' && excluded === undefined) {
      const e = outcomeEvent(unit, shiftKey(instantKey(entry.at), delay), used, content, skip)
      if (e !== undefined) outcome = { event: e.id, at: e.at, correct: e.ok === true }
    }
    return {
      unit,
      stratum,
      arm,
      ...(defaultArm !== undefined ? { defaultArm } : {}),
      entry,
      ...(excluded !== undefined ? { excluded } : {}),
      ...(outcome !== undefined ? { outcome } : {}),
      deviations: deviations.get(unit) ?? 0,
    }
  })

  const arms: ArmFigures[] = comparison.arms.map((arm) => {
    const mine = units.filter((u) => u.arm === arm)
    const entered = mine.filter((u) => u.entry.status === 'entered' && u.excluded === undefined)
    const scored = entered.filter((u) => u.outcome !== undefined)
    const correct = scored.filter((u) => u.outcome?.correct === true).length
    const enteredAt = new Map(entered.map((u) => [u.unit, (u.entry as { at: string }).at]))
    const ms: number[] = []
    for (const e of used) {
      const kc = content.primaryKc(e)
      const at = kc === undefined ? undefined : enteredAt.get(kc)
      if (at === undefined || e.ms === undefined || compareInstants(e.at, at) < 0 || !manipulates(comparison, e, content)) continue
      ms.push(e.ms)
    }
    return {
      arm,
      allocated: mine.length,
      entered: entered.length,
      withOutcome: scored.length,
      missing: entered.length - scored.length,
      correct,
      accuracy: scored.length > 0 ? correct / scored.length : null,
      wilson: scored.length > 0 ? wilson(correct, scored.length) : null,
      medianMs: median(ms),
      deviations: mine.reduce((s, u) => s + u.deviations, 0),
    }
  })

  const [a0, a1] = arms as [ArmFigures, ArmFigures]
  if (comparison.id === 'misconception-note') {
    const d = decideNote({ xo: a0.correct, no: a0.withOutcome, xc: a1.correct, nc: a1.withOutcome, phase: input.phase })
    return { ...base, comparison: comparison.id, number: comparison.number, units, arms, estimate: `${a0.arm} minus ${a1.arm}`, interval: d.interval, decision: d.decision, rule: 'comparison 1: read in either direction', withdrawn: d.withdrawn, malformedArmRecords: malformed }
  }
  const cheaperInTime = comparison.cheaperAlternative && a0.medianMs !== null && a1.medianMs !== null && a1.medianMs < a0.medianMs
  const d = decideCommon({ xb: a1.correct, nb: a1.withOutcome, xa: a0.correct, na: a0.withOutcome, phase: input.phase, cheaperAlternative: comparison.cheaperAlternative, alternativeCheaperInTime: cheaperInTime })
  return { ...base, comparison: comparison.id, number: comparison.number, units, arms, estimate: `${a1.arm} minus ${a0.arm}`, interval: d.interval, decision: d.decision, rule: d.rule, withdrawn: d.decision === 'harm stop' ? [`${a1.arm}, from every unit`] : [], malformedArmRecords: malformed }
}

/** Kinds that make a week count as one with graded or Bench work (comparison 4's outcome). */
const WORK_KINDS = new Set<LedgerEvent['kind']>(['call', 'item', 'probe', 'audit', 'prove-it', 'lab-check', 'receipt-import'])

function readWindows(input: ReadInput, draw: ExpSeedDraw, used: readonly LedgerEvent[], base: Base): ReadResult {
  const { content } = input
  const [reserve, noReserve] = WINDOWS.arms
  const first = used[0]
  const rows: WindowRow[] = []
  let stopped = false
  if (first !== undefined) {
    const windows = windowsOf({ firstEventAt: first.at, firstEventDay: first.day, readDay: localDayOf(input.at), ...(input.breaks !== undefined ? { breaks: input.breaks } : {}), ...(input.weekStartsOn !== undefined ? { weekStartsOn: input.weekStartsOn } : {}) })
    const firstArm = firstWindowArm(WINDOWS, draw.expSeed).arm
    const universe = KC_COMPARISON_LIST[0] === undefined ? [] : unitsOf(KC_COMPARISON_LIST[0]).map((u) => u.unit)
    const learned = new Map<string, string>()
    for (const kc of universe) {
      const fl = firstLearning(kc, used, content)
      if (fl !== undefined) learned.set(kc, fl.at)
    }
    const delay = PARAMETERS.outcome_delay_days * SECONDS_PER_DAY
    for (const w of windows) {
      const arm = stopped ? reserve : w.index % 2 === 1 ? firstArm : firstArm === reserve ? noReserve : reserve
      const entered = !windowBeforeDraw(w, draw.drawnAt)
      const days = daysOf(w)
      let weeksWithWork: number | null = null
      if (w.complete) {
        weeksWithWork = w.weeks.filter((start) => {
          const week = new Set([0, 1, 2, 3, 4, 5, 6].map((i) => addDays(start, i)))
          return used.some((e) => WORK_KINDS.has(e.kind) && e.provenance !== 'agent' && week.has(e.day))
        }).length
      }
      let x = 0
      let n = 0
      let kcs = 0
      for (const [kc, at] of learned) {
        if (!days.has(localDayOf(at))) continue
        kcs += 1
        const e = outcomeEvent(kc, shiftKey(instantKey(at), delay), used, content, () => false)
        if (e !== undefined) {
          n += 1
          if (e.ok === true) x += 1
        }
      }
      const ms = used.reduce((s, e) => (days.has(e.day) && e.ms !== undefined ? s + e.ms : s), 0)
      rows.push({ index: w.index, arm: arm as string, weeks: w.weeks, complete: w.complete, entersAt: w.entersAt, entered, weeksWithWork, firstLearned: { x, n, kcs }, ms })
      // The harm stop, read at each window's end once each arm has a complete window.
      if (w.complete && entered && !stopped) {
        const done = rows.filter((r) => r.complete && r.entered)
        const counts = (a: string): number[] => done.filter((r) => r.arm === a).map((r) => r.weeksWithWork as number)
        const rs = counts(reserve as string)
        const ns = counts(noReserve as string)
        if (rs.length >= PARAMETERS.harm_read_windows_per_arm && ns.length >= PARAMETERS.harm_read_windows_per_arm && Math.max(...ns) <= Math.min(...rs) - PARAMETERS.window_margin_weeks) stopped = true
      }
    }
  }
  const done = rows.filter((r) => r.complete && r.entered)
  const of = (a: string): WindowRow[] => done.filter((r) => r.arm === a)
  const pool = (list: WindowRow[]): { x: number; n: number } => list.reduce((s, r) => ({ x: s.x + r.firstLearned.x, n: s.n + r.firstLearned.n }), { x: 0, n: 0 })
  const d = decideWindows({
    reserve: of(reserve as string).map((r) => r.weeksWithWork as number),
    noReserve: of(noReserve as string).map((r) => r.weeksWithWork as number),
    accReserve: pool(of(reserve as string)),
    accNoReserve: pool(of(noReserve as string)),
    msReserve: of(reserve as string).map((r) => r.ms),
    msNoReserve: of(noReserve as string).map((r) => r.ms),
    phase: input.phase,
  })
  const arms: ArmFigures[] = WINDOWS.arms.map((arm) => {
    const all = rows.filter((r) => r.arm === arm)
    const complete = of(arm)
    const acc = pool(complete)
    return {
      arm,
      allocated: all.length,
      entered: all.filter((r) => r.entered).length,
      withOutcome: complete.length,
      missing: all.filter((r) => r.entered && !r.complete).length,
      correct: acc.x,
      accuracy: acc.n > 0 ? acc.x / acc.n : null,
      wilson: acc.n > 0 ? wilson(acc.x, acc.n) : null,
      medianMs: median(complete.map((r) => r.ms)),
      deviations: 0,
    }
  })
  return {
    ...base,
    comparison: WINDOWS.id,
    number: WINDOWS.number,
    windows: rows,
    arms,
    estimate: 'counted weeks with graded or Bench work per complete window, by arm; no interval is claimed',
    interval: null,
    decision: d.decision,
    rule: d.rule,
    withdrawn: stopped || d.decision === 'harm stop' ? [`${noReserve as string}, from every later window`] : [],
    malformedArmRecords: 0,
  }
}

const pct = (v: number): string => `${Math.round(v * 100)}%`

/** The run@1 record of a read: the digest of the event set, the rules' hash and every figure, under an id unique to the read. */
export function recordOf(result: ReadResult, input: Pick<ReadInput, 'contentBuild' | 'recordedAt'>): RunRecord {
  const lines = [
    `keep/kill read of comparison ${result.number} (${result.comparison}), ${result.phase}, at ${result.at}`,
    `expSeed drawn ${result.drawnAt}; rules ${result.rulesSha256}; ${result.supersededSeeds.length} superseded draw(s)`,
    `event set ${result.eventDigest}: ${result.eventCount} events before the read`,
    ...result.arms.map((a) => {
      const acc = a.accuracy === null || a.wilson === null ? 'no outcome yet' : `${a.correct} of ${a.withOutcome} correct, ${pct(a.accuracy)} (Wilson ${pct(a.wilson[0])} to ${pct(a.wilson[1])})`
      return `${a.arm}: ${a.allocated} allocated, ${a.entered} entered, ${a.withOutcome} with an outcome, ${a.missing} missing; ${acc}; median time per manipulated practice item ${a.medianMs === null ? 'none' : `${Math.round(a.medianMs)} ms`}; ${a.deviations} deviation(s)`
    }),
    result.interval === null ? `estimate: ${result.estimate}` : `estimate (${result.estimate}): ${pct(result.interval.d)}, Newcombe ${pct(result.interval.L)} to ${pct(result.interval.U)}`,
    `decision: ${result.decision} (${result.rule})${result.withdrawn.length > 0 ? `; withdrawn: ${result.withdrawn.join('; ')}` : ''}`,
    'one learner; descriptive; no causal claim',
  ]
  const hex = result.eventDigest.replace(/^sha256:/, '')
  const record: RunRecord = {
    id: '', // replaced below by readRecordId, which hashes everything else the record holds
    title: `Keep/kill read of comparison ${result.number} (${result.comparison}), ${result.phase}, ${localDayOf(result.at)}: ${result.decision}`,
    origin: 'recorded',
    records: `a ${result.phase} keep/kill read of comparison ${result.number} over learner-zero's event log, with the digest of the event set it used (content/governance/keepkill-rules.yaml, common.reads)`,
    engine: READ_ENGINE,
    version: READ_VERSION,
    version_string: `@statespace/ledger ${READ_VERSION}, applying the keep/kill rules ${result.rulesSha256}`,
    binary: null,
    binary_sha256: null,
    image: null,
    recorded_at: input.recordedAt ?? result.at,
    started_at: result.at,
    duration_s: null,
    argv: ['statespace-ledger', 'keepkill-read', '--comparison', result.comparison, '--phase', result.phase, '--at', result.at],
    inputs: [
      { name: 'event set', sha256: hex, role: `the ${result.eventCount} events whose at precedes the read: SHA-256 of their canonical JSON array sorted by id (eventSetDigest)` },
      { path: RULES_PATH, sha256: result.rulesSha256, role: 'the keep/kill rules the read applied; the governing draw records the same hash' },
      ...(input.contentBuild !== undefined ? [{ name: input.contentBuild.name, sha256: input.contentBuild.sha256, role: 'the content build whose KC tags, templates and treatments the read resolved' }] : []),
    ],
    budget: {},
    exit_code: null,
    verdict_lines: lines,
    outputs: [],
    values: { ...result },
    environment: { os: null, cpu_count: null },
    unrecorded: [
      { field: 'binary', reason: 'the read is a pure function of the event set, the rules and the content, run inside the site; no single file ran' },
      { field: 'binary_sha256', reason: 'no single file ran (see binary); the inputs are hashed instead' },
      { field: 'image', reason: 'the result depends only on the hashed inputs, not on the browser build that computed it' },
      { field: 'duration_s', reason: 'the read keeps no clock, and its duration does not change its result' },
      { field: 'exit_code', reason: 'no process ran; a read that must refuse throws instead of returning a record' },
      { field: 'environment.os', reason: 'the read is a pure function of the hashed inputs; the operating system of the browser that computed it does not change it' },
      { field: 'environment.cpu_count', reason: 'as for environment.os: the number of processors does not change the result' },
    ],
    notes: [
      'One learner; descriptive; no causal claim (keep/kill rules, common.reporting). A read never changes a learner state and never locks anything.',
      'Anyone with the event-log export, the rules file and the content in force can derive this read again with readComparison from @statespace/ledger; the event set digest must match.',
      `The id names the comparison, the phase, the local date and time of the read and the first ${READ_ID_DIGEST_HEX} hexadecimal digits of the SHA-256 of this record's canonical JSON without its id, so each read is kept under an id of its own and the same read derived again gets the same id.`,
      ...(input.contentBuild === undefined ? ['The content build was not named by the caller, so it is not among the inputs.'] : []),
    ],
  }
  return { ...record, id: readRecordId(result, record) }
}

/**
 * A read record's id: RUN-lz-keepkill-<comparison>-<phase>-<yyyymmdd>-<hhmmss>-<digest>. The date and time are
 * the read's instant as written, in its own offset; the digest is the first READ_ID_DIGEST_HEX hexadecimal
 * digits of the SHA-256 of the record's canonical JSON with its id left out. Two reads whose records differ in
 * anything (the instant, the event set, the content build, the time the record was written, a figure) get
 * different ids, so every read's record can be kept, and committed to runs/ under its own name (GATE-runs
 * requires the file name to be the id); the same read derived again from the export gets the same id.
 */
export function readRecordId(result: Pick<ReadResult, 'comparison' | 'phase' | 'at'>, record: RunRecord): string {
  const { id: _replaced, ...body } = record
  const stamp = `${localDayOf(result.at).replaceAll('-', '')}-${localTimeOf(result.at).replaceAll(':', '')}`
  return `RUN-lz-keepkill-${result.comparison}-${result.phase}-${stamp}-${sha256Hex(canonicalJson(body)).slice(0, READ_ID_DIGEST_HEX)}`
}
