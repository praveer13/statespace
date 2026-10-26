// Resolving a specimen record's pointers to the lines of the runs it names, and checking what the label is going to
// say of them (DESIGN.md section 6.5: labels are generated from runs and never typed; GATE-specimens).
//
// The record holds pointers: a run and a query in it. This resolver reads each pointed-to block of verdict lines, and
// refuses a record whose pointers do not say what the label needs:
//   - every run is recorded, and every query names exactly one verdict line of its run;
//   - the main query carries a solver verdict, and a sat of a violation query replays (a line `replay ok:` in its own
//     lines, or in the query of another run that the record names, whose values are then the witness's own);
//   - every sat the label shows replays, so that REFUTED is never drawn over a witness that was not checked;
//   - a premise query sits only beside an unsat violation query;
//   - a length is stated only beside the sat of a violation query, and is the one the witness has (the run prints a model
//     and no length, so the record may state it, and `witnessSteps` reads it from the model's primed variables); a witness
//     of several steps has its length stated: a label never says "1 step" over a witness of two;
//   - a minimal claim rests on an Optimize query (one that says so) that minimized the objective the record names and
//     whose objective has a value, and a plain query of the same run, if named, that is unsat; or on an unsat core that
//     its harness checked is minimal.
// It is pure, over a RunSource: the build reads runs/ with it, and a learner's own specimen can be resolved against the
// runs of a receipt the same way. Nothing in the result is typed by a person: what a record states beside a pointer is
// checked against the run, and the label reads the run.

import type { Specimen } from '@statespace/schema'
import { isOptimizeBlock, locateBlock, modelPairs, printedMinimum, readCore, readMinimum, readVerdict, replayOf, replayedValues, witnessSteps } from './blocks.ts'
import { runTokens } from './text.ts'
import type { AlsoEvidence, Block, Evidence, MainEvidence, MinimalEvidence, RunFacts, RunLike, RunSource } from './types.ts'

export interface Resolved {
  /** The evidence, or null when anything is a problem: a label is never built from half its evidence. */
  readonly evidence: Evidence | null
  readonly problems: readonly string[]
}

const dateOf = (s: unknown): string | null => (typeof s === 'string' && /^[0-9]{4}-[0-9]{2}-[0-9]{2}/.test(s) ? s.slice(0, 10) : null)

/** What a chip and the label say of a run: its engine and version as it recorded them, its date, and its rlimit. */
export function runFacts(run: RunLike): RunFacts {
  const rlimit = run.budget?.rlimit
  return {
    id: run.id,
    engine: run.engine ?? '',
    version: run.version ?? '',
    date: dateOf(run.started_at) ?? dateOf(run.recorded_at),
    rlimit: typeof rlimit === 'number' && Number.isInteger(rlimit) && rlimit > 0 ? rlimit : null,
  }
}

interface Ref {
  readonly run: string
  readonly query: string
}

export function resolveEvidence(record: Specimen, source: RunSource): Resolved {
  const problems: string[] = []
  const runs: Record<string, RunFacts> = {}
  const problem = (where: string, what: string): void => {
    problems.push(`${record.id} ${where}: ${what}`)
  }

  const runOf = (id: string, where: string): RunLike | null => {
    const r = source.get(id)
    if (r === undefined) {
      problem(where, `${id} is not recorded (runs/${id}.json is not there)`)
      return null
    }
    if (runs[id] === undefined) {
      runs[id] = runFacts(r)
      if (runs[id].engine === '' || runs[id].version === '') problem(where, `${id} records no engine or no version, so the label cannot name its tool`)
    }
    return r
  }

  const blockOf = (ref: Ref, where: string): Block | null => {
    const r = runOf(ref.run, where)
    if (r === null) return null
    const located = locateBlock(r.verdict_lines ?? [], ref.query)
    if (!located.ok) {
      problem(where, `${ref.run}: ${located.problem}`)
      return null
    }
    return { run: ref.run, query: ref.query, lines: located.lines }
  }

  /** A sat the label shows must have replayed: in its own lines, or in the query another run's record names. */
  const checkReplay = (where: string, own: Block, model: string | undefined, pointer: Ref | undefined): Block | undefined => {
    const label = `${own.run} ${JSON.stringify(own.query)}`
    if (replayOf(own.lines) === 'failed') problem(where, `${label} says its witness does not replay`)
    if (pointer === undefined) {
      if (replayOf(own.lines) !== 'replayed') problem(where, `${label} is a sat whose lines hold no "replay ok" line, so its witness is not known to replay: name the query of a run that replays it (replay)`)
      return undefined
    }
    const there = blockOf(pointer, `${where}.replay`)
    if (there === null) return undefined
    if (replayOf(there.lines) !== 'replayed') {
      problem(`${where}.replay`, `${pointer.run} ${JSON.stringify(pointer.query)} does not say "replay ok"`)
      return there
    }
    // the replay must be of this very witness: the values on its line are the model's, no more and no fewer
    const model2 = new Map(modelPairs(model ?? ''))
    const replayed = replayedValues(there.lines)
    const names = new Set([...model2.keys(), ...replayed.keys()])
    for (const name of names) {
      if (model2.get(name) !== replayed.get(name)) problem(`${where}.replay`, `the replay of ${pointer.run} ${JSON.stringify(pointer.query)} checks ${name} = ${replayed.get(name) ?? '(nothing)'}, and the witness has ${name} = ${model2.get(name) ?? '(nothing)'}`)
    }
    return there
  }

  // ---------------------------------------------------------------- the main query
  const m = record.evidence.main
  let main: MainEvidence | null = null
  const mainBlock = blockOf(m, 'evidence.main')
  if (mainBlock !== null) {
    const verdict = readVerdict(mainBlock.lines)
    if (verdict === null) problem('evidence.main', `${m.run} ${JSON.stringify(m.query)} carries no solver verdict (sat, unsat or unknown) where a verdict stands on a line`)
    else {
      let replay: Block | undefined
      const witnessed = verdict.verdict === 'sat' && m.direction === 'violation'
      if (witnessed) replay = checkReplay('evidence.main', mainBlock, verdict.model, m.replay)
      else if (m.replay !== undefined) problem('evidence.main.replay', 'a replay is named for a query that is not a sat of a violation query: there is no witness to replay')
      if (m.steps !== undefined && verdict.verdict !== 'sat') problem('evidence.main.steps', `a length is the length of a witness, and the query's verdict is ${verdict.verdict}`)
      else if (m.steps !== undefined && !witnessed) problem('evidence.main.steps', 'a length is the length of the witness of a violation query, and this is a premise query')
      else if (witnessed) {
        // the stamp's length is read from the witness (label.ts); a length the record states is checked against that reading
        const read = witnessSteps(verdict.model ?? '')
        const steps = (n: number): string => `${n} step${n === 1 ? '' : 's'}`
        const chain = `the longest run of primes among its variables gives ${read}, where x_p is one step after x and x_pp two`
        if (m.steps === undefined && read > 1) problem('evidence.main.steps', `the witness of ${m.run} ${JSON.stringify(m.query)} has ${steps(read)} (${chain}) and the record states no length: state steps: ${read}`)
        else if (m.steps !== undefined && m.steps !== read) problem('evidence.main.steps', `the record states a witness of ${steps(m.steps)}, and the witness of ${m.run} ${JSON.stringify(m.query)} has ${steps(read)} (${chain})`)
      }
      let premise: Block | undefined
      if (m.premise !== undefined) {
        if (!(m.direction === 'violation' && verdict.verdict === 'unsat')) problem('evidence.main.premise', 'a premise query sits beside the unsat of a violation query, and this query is not one')
        const b = blockOf(m.premise, 'evidence.main.premise')
        if (b !== null) {
          const v = readVerdict(b.lines)
          if (v === null || v.verdict === 'unknown') problem('evidence.main.premise', `${b.run} ${JSON.stringify(b.query)} carries no sat or unsat`)
          else premise = b
        }
      }
      if (verdict.verdict === 'sat' && m.direction === 'premise' && m.premise !== undefined) problem('evidence.main.premise', 'a premise query is named for a premise query')
      main = { ...mainBlock, direction: m.direction, ...(premise ? { premise } : {}), ...(replay ? { replay } : {}) }
    }
  }

  // ---------------------------------------------------------------- the further queries
  const also: AlsoEvidence[] = []
  ;(record.evidence.also ?? []).forEach((a, i) => {
    const where = `evidence.also[${i}]`
    const b = blockOf(a, where)
    if (b === null) return
    const verdict = readVerdict(b.lines)
    let replay: Block | undefined
    if (verdict?.verdict === 'sat') replay = checkReplay(where, b, verdict.model, a.replay)
    else if (a.replay !== undefined) problem(`${where}.replay`, 'a replay is named for a query that is not a sat')
    also.push({ ...b, caption: a.caption, ...(replay ? { replay } : {}) })
  })

  // ---------------------------------------------------------------- minimal?
  const mi = record.evidence.minimal
  let minimal: MinimalEvidence | null = null
  if (mi.kind === 'none') minimal = { kind: 'none' }
  else if (mi.kind === 'not-applicable') minimal = { kind: 'not-applicable', why: mi.why ?? '' }
  else if (mi.run !== undefined && mi.query !== undefined) {
    const b = blockOf({ run: mi.run, query: mi.query }, 'evidence.minimal')
    if (b !== null) {
      const verdict = readVerdict(b.lines)
      if (mi.kind === 'optimize') {
        const objective = mi.objective ?? ''
        // the objective the lines print, and the one the run records for the query, are what was minimized: the record only names it;
        // where a run says neither (the W0 harness prints the model alone), the query's own name must mention it
        const printed = printedMinimum(b.lines)
        const recorded = recordedObjective(source.get(mi.run), mi.query)
        if (verdict?.verdict !== 'sat') problem('evidence.minimal', `${b.run} ${JSON.stringify(b.query)} is not a sat, so it holds no minimum`)
        else if (!isOptimizeBlock(b.lines)) problem('evidence.minimal', `${b.run} ${JSON.stringify(b.query)} does not say it ran under an Optimize objective: Z3's witness is minimal only under one (DESIGN.md section 6.5)`)
        else if (printed !== null && printed.objective !== objective) problem('evidence.minimal', `${b.run} ${JSON.stringify(b.query)} prints the minimum of ${printed.objective}, and the record names the objective ${objective}: the label would show a value that was not minimized`)
        else if (recorded !== null && recorded !== objective) problem('evidence.minimal', `${b.run} records the objective ${recorded} for ${JSON.stringify(b.query)}, and the record names ${objective}`)
        else if (printed === null && recorded === null && !mentions(b.query, objective)) problem('evidence.minimal', `${b.run} ${JSON.stringify(b.query)} prints no minimum, the run records no objective for it and the query's name does not mention ${objective}: nothing in the run says it minimized ${objective}`)
        else if (readMinimum(b.lines, objective) === null) problem('evidence.minimal', `${b.run} ${JSON.stringify(b.query)} holds no value for the objective ${objective}`)
        else {
          let confirm: Block | undefined
          if (mi.confirm !== undefined) {
            const c = blockOf({ run: mi.run, query: mi.confirm }, 'evidence.minimal.confirm')
            if (c !== null) {
              if (readVerdict(c.lines)?.verdict !== 'unsat') problem('evidence.minimal.confirm', `${c.run} ${JSON.stringify(c.query)} is not unsat, so it does not confirm that nothing smaller exists`)
              else confirm = c
            }
          }
          minimal = { kind: 'optimize', objective, block: b, ...(confirm ? { confirm } : {}) }
        }
      } else {
        const core = readCore(b.lines)
        if (verdict?.verdict !== 'unsat') problem('evidence.minimal', `${b.run} ${JSON.stringify(b.query)} is not an unsat, so it holds no core`)
        else if (core === null) problem('evidence.minimal', `${b.run} ${JSON.stringify(b.query)} prints no unsat core`)
        else if (!core.minimal) problem('evidence.minimal', `${b.run} ${JSON.stringify(b.query)} does not say that its core alone is unsat and that dropping any one member leaves it sat`)
        else {
          const values = source.get(mi.run)?.values as { queries?: Record<string, { core_constraints?: unknown }> } | undefined
          const words = values?.queries?.[mi.query]?.core_constraints
          minimal = { kind: 'core', block: b, constraints: Array.isArray(words) && words.every((w) => typeof w === 'string') ? (words as string[]) : [] }
        }
      }
    }
  } else problem('evidence.minimal', `a ${mi.kind} claim names the run and the query it rests on`)

  // ---------------------------------------------------------------- the runs the words cite
  // A run chip in a line of the record's text is a citation, so its run is recorded and joins the runs the label draws on.
  // A value reference is not used: the label reads values from the lines it shows, and never from a path into a record.
  const words: [string, string][] = [
    ['violates', record.violates],
    ['because', record.because],
    ['class', record.class],
    ['cured_by.text', record.cured_by.text],
    ...(record.evidence.also ?? []).map((a, i): [string, string] => [`evidence.also[${i}].caption`, a.caption]),
    ...(mi.why === undefined ? [] : [['evidence.minimal.why', mi.why] as [string, string]]),
  ]
  for (const [where, text] of words) {
    if (/\{\{run:[^}]*#/.test(text)) problem(where, 'a value reference ({{run:RUN-id#values.name}}) is not used in a specimen record: the label reads values from the lines it shows')
    else if (/\{\{(?!run:RUN-[a-z0-9]+(?:-[a-z0-9]+)*\}\})/.test(text)) problem(where, 'a double-brace token other than {{run:RUN-id}}')
    for (const id of runTokens(text)) runOf(id, where)
  }

  // A record that resolves to no evidence always says why: it is never left out of the cabinet without a word.
  if (problems.length === 0 && (main === null || minimal === null)) problem('evidence', `the ${main === null ? 'main query' : 'minimal claim'} resolved to nothing, and no reason was found: a rule of this resolver is missing`)
  if (problems.length > 0 || main === null || minimal === null) return { evidence: null, problems }
  return { evidence: { runs, main, also, minimal }, problems }
}

/** Whether a name holds a word, whole: `amount` is in "S1.2 minimal amount via Optimize", and `a` is not. */
const mentions = (name: string, word: string): boolean => new RegExp(`(?<![A-Za-z0-9_])${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![A-Za-z0-9_])`).test(name)

/** The objective a run records for one of its queries under `values.queries` (the W1 harnesses do); null when it records none. */
function recordedObjective(run: RunLike | undefined, query: string): string | null {
  const queries = (run?.values as { queries?: Record<string, { objective?: unknown } | undefined> } | undefined)?.queries
  const objective = queries?.[query]?.objective
  return typeof objective === 'string' ? objective : null
}

/** The ids of every run a record points at, in a stable order: the main query's first. */
export function runsOf(record: Specimen): string[] {
  const e = record.evidence
  const ids = [e.main.run, e.main.premise?.run, e.main.replay?.run, ...(e.also ?? []).flatMap((a) => [a.run, a.replay?.run]), e.minimal.run]
  return [...new Set(ids.filter((id): id is string => id !== undefined))]
}
