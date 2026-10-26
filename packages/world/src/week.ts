// A week of the Clearinghouse as a pure function of its inputs (docs/WORLD.md sections 4 and 5): the edition seed, the
// weeks the learner opened (each with the seed drawn when it opened), and the sound proposals the learner admitted.
// It returns the canonical history of every week, chained (week k starts from week k−1's end), and each week's 1–3
// incidents. Nothing about the world is stored (I2): the screen recomputes all of it from these inputs.
//
// Keys: an instance is admitted only when the reference pipeline produces a key that agrees with its member, and, for
// the gap-class family, when the naive baseline misses the bar while the reference meets it on that very instance
// (WORLD.md section 4.2, step 5). The key itself reaches the screen only through `keyOf`, which the screen calls after
// the learner files (WORLD.md section 3.1, item 4).

import type { Cmd, Program, State } from '@statespace/interp'
import { createDraw, deriveSeed } from '@statespace/rng'
import { checkCommand } from './check.ts'
import type { CheckResult } from './check.ts'
import { DEFAULT_INCIDENTS, EDITION_SEED, RULES } from './edition.ts'
import { GATE_BATCH, GATE_BATCH_COMMANDS, OFFERED_EVIDENCE, parse, PROPOSALS } from './families.ts'
import type { GapFamily, Member, ProposalFamily } from './families.ts'
import { acctVal, balanceOf, BASE_PROGRAM, callText, intVal, runCall, runWeekTraffic, standingWorld, user, withCommands } from './world.ts'
import type { Standing, WeekRun } from './world.ts'

export interface WeekInput {
  readonly k: number
  /** The uint32 drawn when the learner opened the week (crypto.getRandomValues on the main origin). */
  readonly seed: number
  /** 1 to 3 incidents, from the week plan. */
  readonly size?: number
  /** A label for the learner, never an input to any draw (WORLD.md section 5, rule 8). */
  readonly label?: string
}

export interface Adoption {
  /** The week in which the learner admitted the sound proposal; it joins the world from the next week. */
  readonly week: number
  readonly family: string
}

export interface WorldInputs {
  readonly editionSeed?: number
  readonly weeks: readonly WeekInput[]
  readonly adopted?: readonly Adoption[]
}

export interface Scenario {
  readonly id: string
  readonly text: string
}

interface IncidentBase {
  readonly k: number
  readonly slot: number
  /** The event's variant id: audit:<anchor>/<id>. */
  readonly id: string
  readonly anchor: string
  readonly rev: string
  readonly subject: string
  readonly member: 'sound' | 'flawed'
  readonly weekSeed: number
  readonly scenarios: readonly Scenario[]
  readonly primary: string
  readonly acceptable: readonly string[]
  readonly loadBearing: readonly string[]
  readonly why: string
  readonly kcs: readonly string[]
  /** The incident's global position, for its block of 10 (AUDIT-DESK.md section 5.2). */
  readonly position: number
}

export interface ProposalIncident extends IncidentBase {
  readonly kind: 'proposal'
  readonly family: ProposalFamily
  readonly claim: string
  readonly evidence: string
  readonly diff: readonly string[]
  readonly command: Cmd
  readonly commandText: string
  /** The call the scenarios name, on this week's opening state. */
  readonly sampleCall: string
}

export interface GapIncident extends IncidentBase {
  readonly kind: 'gap'
  readonly family: GapFamily
  readonly claim: string
  readonly diff: readonly string[]
  /** The batch, in this instance's order. */
  readonly batch: readonly string[]
}

export type Incident = ProposalIncident | GapIncident

export interface Week {
  readonly input: WeekInput
  readonly run: WeekRun
  readonly program: Program
  readonly incidents: readonly Incident[]
  /** Families skipped this week because no admissible instance was found (logged for the gates). */
  readonly skipped: readonly string[]
  /** The sound probability of each block this week touched, in per mille: internal, never shown (WORLD.md 4.2). */
  readonly blocks: readonly { readonly block: number; readonly perMille: number }[]
}

export interface World {
  readonly standing: Standing
  readonly weeks: readonly Week[]
}

// ------------------------------------------------------------------------------------------------ seeds

const stream = (seed: number, purpose: string, slot: number, attempt: number) => createDraw(deriveSeed(seed, `${purpose}:${slot}:${attempt}`))

/** p = 0.30 + 0.30·u for a block of 10, as an integer per mille (no floating point on seeded paths). */
const blockPerMille = (seed: number, block: number): number => 300 + createDraw(deriveSeed(seed, `block:${block}`)).below(301)

// ------------------------------------------------------------------------------------------------ the components

/** A command's run through the course checker, reference (premise check on) or naive (premise check dropped). */
export const runChecker = (w: Standing, week: WeekRun, text: string, naive: boolean): CheckResult => checkCommand(w, week, parse(text), null, { premise: !naive })

function memberOf(f: ProposalFamily, m: 'sound' | 'flawed'): Member {
  return m === 'sound' ? f.sound : f.flawed
}

/** The call the scenarios name: the richest account of the first tenant, sending to the next one, 5 credits. */
function sampleCallFor(w: Standing, s: State, cmd: Cmd) {
  const users = [...(w.tenants[0]?.users ?? [])].sort((a, b) => (balanceOf(s, user(b)) > balanceOf(s, user(a)) ? 1 : -1))
  let ai = 0
  const args = cmd.params.map((p) => (p.ty === 'account' ? acctVal(user(users[ai++ % users.length] as string)) : intVal(5n)))
  return { name: cmd.name, args }
}

// ------------------------------------------------------------------------------------------------ scenarios and keys

function proposalScenarios(f: ProposalFamily, sampleCall: string): Scenario[] {
  const out: Scenario[] = [
    { id: 's1', text: `${sampleCall} succeeds on this week’s opening state.` },
    { id: 's2', text: `After ${sampleCall}, the total over every account, mint and sink included, is zero.` },
    { id: 's3', text: `After ${sampleCall}, mint’s balance is what it was before.` },
    { id: 's4', text: `The new ${f.edits} can run at all: its guard holds in some state of this week’s sample.` },
  ]
  out.push(
    f.sound.ruleEdit !== null
      ? { id: 's5', text: 'The rule the check ran against is the world’s pinned rule, word for word.' }
      : { id: 's5', text: `Some run of the new ${f.edits} in this week’s sample breaks a world rule.` },
  )
  return out
}

function gapScenarios(): Scenario[] {
  return [
    { id: 's1', text: 'The checker shown admits command 1.' },
    { id: 's2', text: 'The checker shown admits command 2.' },
    { id: 's3', text: 'The checker shown admits command 3.' },
    { id: 's4', text: 'Every command in the batch can run: each guard holds in some state of the sample.' },
    { id: 's5', text: 'Every command the checker shown admits can run.' },
  ]
}

export interface Key {
  readonly truth: 'sound' | 'flawed'
  readonly primary: string | null
  readonly acceptable: readonly string[]
  readonly loadBearing: readonly string[]
  readonly answers: readonly boolean[]
  /** The reference pipeline's verdicts with their bound, for the reveal. */
  readonly reference: readonly CheckResult[]
  /** For a gap-class incident: the shown component's outputs, and whether each side met the bar. */
  readonly shown?: readonly CheckResult[]
  readonly bar?: { readonly naiveMet: boolean; readonly referenceMet: boolean }
}

function weekRunOf(world: World, k: number): { w: Standing; week: Week } {
  const week = world.weeks.find((x) => x.input.k === k)
  if (week === undefined) throw new Error(`week ${k} is not in this world`)
  return { w: world.standing, week }
}

const barMet = (results: readonly CheckResult[], reference: readonly CheckResult[]): boolean =>
  results.every((r, i) => r.verdict !== 'admit' || reference[i]?.verdict === 'admit') && results.every((r) => r.verdict !== 'admit' || (r.guardHeld ?? 0) > 0)

function proposalKey(w: Standing, run: WeekRun, inc: ProposalIncident): Key {
  const m = memberOf(inc.family, inc.member)
  const ref = checkCommand(w, run, inc.command, m.ruleEdit)
  const truth = ref.verdict === 'admit' ? 'sound' : 'flawed'
  const program = withCommands(run.program, [inc.command])
  const call = sampleCallFor(w, run.start, inc.command)
  const r = runCall(program, run.start, call)
  const quiet = checkCommand(w, run, inc.command, null)
  const answers = [
    'ok' in r.outcome,
    !r.fired.includes('conserved'),
    balanceOf(r.after, { tag: 'mint' }) === balanceOf(run.start, { tag: 'mint' }),
    (quiet.guardHeld ?? 0) > 0,
    m.ruleEdit !== null ? (RULES.find((x) => x.id === m.ruleEdit?.rule)?.pinned ?? '') === m.ruleEdit.text : quiet.verdict === 'refute',
  ]
  return {
    truth,
    primary: truth === 'flawed' ? inc.primary : null,
    acceptable: truth === 'flawed' ? inc.acceptable : [],
    loadBearing: truth === 'flawed' ? inc.loadBearing : [],
    answers,
    reference: [ref],
  }
}

function gapKey(w: Standing, run: WeekRun, inc: GapIncident): Key {
  const reference = inc.batch.map((t) => runChecker(w, run, t, false))
  const naive = inc.batch.map((t) => runChecker(w, run, t, true))
  const shown = inc.member === 'sound' ? reference : naive
  const claimHolds = shown.every((r, i) => r.verdict !== 'admit' || reference[i]?.verdict === 'admit')
  const truth = claimHolds ? 'sound' : 'flawed'
  return {
    truth,
    primary: truth === 'flawed' ? inc.primary : null,
    acceptable: truth === 'flawed' ? inc.acceptable : [],
    loadBearing: truth === 'flawed' ? inc.loadBearing : [],
    answers: [shown[0]?.verdict === 'admit', shown[1]?.verdict === 'admit', shown[2]?.verdict === 'admit', reference.every((r) => (r.guardHeld ?? 0) > 0), claimHolds],
    reference,
    shown,
    bar: { naiveMet: barMet(naive, reference), referenceMet: barMet(reference, reference) },
  }
}

/** The incident's key from the reference pipeline. The screen calls it only after the learner files. */
export function keyOf(world: World, inc: Incident): Key {
  const { w, week } = weekRunOf(world, inc.k)
  return inc.kind === 'proposal' ? proposalKey(w, week.run, inc) : gapKey(w, week.run, inc)
}

/** The shown component's raw outputs under the event, without the rules' flags: what the learner may run before filing. */
export function runShownComponent(world: World, inc: GapIncident): readonly { readonly command: string; readonly says: string; readonly runs: number }[] {
  const { w, week } = weekRunOf(world, inc.k)
  return inc.batch.map((t, i) => {
    const r = runChecker(w, week.run, t, inc.member === 'flawed')
    const says = r.verdict === 'admit' ? 'admitted' : r.verdict === 'vacuous' ? 'refused: no premise witness' : r.verdict === 'refute' ? `refused: ${r.witness?.call ?? ''} fires a rule` : 'refused: a pinned rule changed'
    return { command: `command ${i + 1}`, says, runs: r.runs }
  })
}

// ------------------------------------------------------------------------------------------------ composing a week

const hex = (n: number): string => (n >>> 0).toString(16).padStart(8, '0')

function composeWeek(w: Standing, run: WeekRun, input: WeekInput, firstPosition: number, adoptedHere: ReadonlySet<string>, blockSeedAt: (block: number) => number) {
  const size = Math.max(1, Math.min(3, input.size ?? DEFAULT_INCIDENTS))
  const incidents: Incident[] = []
  const skipped: string[] = []
  const blocks = new Map<number, number>()
  const eligible = PROPOSALS.filter((f) => !adoptedHere.has(f.edits))
  const order = stream(input.seed, 'families', 0, 0).shuffle(eligible)
  let nextFamily = 0
  for (let slot = 0; slot < size; slot++) {
    const position = firstPosition + incidents.length
    const block = Math.floor(position / 10)
    const perMille = blocks.get(block) ?? blockPerMille(blockSeedAt(block), block)
    blocks.set(block, perMille)
    const gapSlot = slot === 1
    let admitted: Incident | null = null
    for (let attempt = 0; attempt < 4 && admitted === null; attempt++) {
      const member = stream(input.seed, 'member', slot, attempt).below(1000) < perMille ? 'sound' : 'flawed'
      const id = `ch-w${input.k}-${hex(input.seed)}-${slot}`
      if (gapSlot) {
        const f = GATE_BATCH
        const batch = stream(input.seed, 'batch', slot, attempt).shuffle(GATE_BATCH_COMMANDS)
        const inc: GapIncident = {
          kind: 'gap', k: input.k, slot, id, anchor: f.anchor, rev: f.rev, subject: f.subject, member, weekSeed: input.seed, scenarios: gapScenarios(),
          primary: f.primary, acceptable: f.acceptable, loadBearing: f.loadBearing, why: f.why, kcs: f.kcs, position,
          family: f, claim: f.claim, diff: member === 'sound' ? f.soundDiff : f.flawedDiff, batch,
        }
        const key = gapKey(w, run, inc)
        if (key.truth === member && key.bar !== undefined && !key.bar.naiveMet && key.bar.referenceMet) admitted = inc
      } else {
        const f = order[nextFamily % Math.max(1, order.length)]
        if (f === undefined) break
        const m = memberOf(f, member)
        const command = parse(m.command)
        const call = sampleCallFor(w, run.start, command)
        const inc: ProposalIncident = {
          kind: 'proposal', k: input.k, slot, id, anchor: f.anchor, rev: f.rev, subject: f.subject, member, weekSeed: input.seed,
          scenarios: proposalScenarios(f, callText(call)), primary: f.primary, acceptable: f.acceptable, loadBearing: f.loadBearing, why: f.why, kcs: f.kcs, position,
          family: f, claim: f.claim, evidence: stream(input.seed, 'evidence', slot, attempt).pick(OFFERED_EVIDENCE), diff: m.diff, command, commandText: m.command, sampleCall: callText(call),
        }
        if (proposalKey(w, run, inc).truth === member) admitted = inc
      }
    }
    if (!gapSlot) nextFamily++
    if (admitted === null) skipped.push(gapSlot ? GATE_BATCH.id : (order[(nextFamily - 1) % Math.max(1, order.length)]?.id ?? 'none'))
    else incidents.push(admitted)
  }
  return { incidents, skipped, blocks: [...blocks].map(([block, perMille]) => ({ block, perMille })) }
}

/** The whole world: the standing world and every opened week, chained, with its incidents. */
export function buildWorld(inputs: WorldInputs): World {
  const w = standingWorld(inputs.editionSeed ?? EDITION_SEED)
  const sorted = [...inputs.weeks].sort((a, b) => a.k - b.k)
  const adopted = inputs.adopted ?? []
  const weeks: Week[] = []
  let start = w.state
  let position = 0
  const blockStarts = new Map<number, number>()
  for (const input of sorted) {
    const families = new Set(adopted.filter((a) => a.week < input.k).map((a) => a.family))
    const replacements = PROPOSALS.filter((f) => families.has(f.id)).map((f) => parse(f.sound.command))
    const program = withCommands(BASE_PROGRAM, replacements)
    const run = runWeekTraffic(w, input.k, input.seed, program, start)
    const adoptedHere = new Set(PROPOSALS.filter((f) => families.has(f.id)).map((f) => f.edits))
    // A block's seed is the seed of the week in which its first incident was served.
    const blockSeedAt = (block: number): number => {
      if (!blockStarts.has(block)) blockStarts.set(block, input.seed)
      return blockStarts.get(block) as number
    }
    const composed = composeWeek(w, run, input, position, adoptedHere, blockSeedAt)
    position += composed.incidents.length
    weeks.push({ input, run, program, ...composed })
    start = run.end
  }
  return { standing: w, weeks }
}

// ------------------------------------------------------------------------------------------------ grading

export interface Filing {
  readonly call: 'sound' | 'gap'
  readonly scenarios: readonly boolean[]
  readonly named: string
  readonly lines: readonly string[]
}

export interface Grade {
  readonly truth: 'sound' | 'flawed'
  readonly found: boolean
  readonly classRight: boolean
  readonly evidenceValid: boolean
  readonly restatementRight: number
  readonly restatementOf: number
  readonly ok: boolean
  readonly callMatched: boolean
}

/** A finding graded against the key the reference pipeline computed (the Desk's rule, AUDIT-DESK.md section 6). */
export function grade(key: Key, f: Filing): Grade {
  const restatementRight = key.answers.filter((a, i) => f.scenarios[i] === a).length
  const restatementOf = key.answers.length
  const callMatched = (f.call === 'sound') === (key.truth === 'sound')
  if (key.truth === 'sound') {
    const accepted = f.named === 'none'
    return { truth: 'sound', found: false, classRight: accepted, evidenceValid: accepted, restatementRight, restatementOf, ok: accepted, callMatched }
  }
  const found = f.named !== 'none'
  const classRight = found && key.acceptable.includes(f.named)
  const evidenceValid = found && f.lines.length >= 1 && f.lines.length <= 3 && f.lines.some((l) => key.loadBearing.includes(l))
  return { truth: 'flawed', found, classRight, evidenceValid, restatementRight, restatementOf, ok: classRight && evidenceValid, callMatched }
}

/** The plug-in slots in pipeline order (WORLD.md section 3.2). */
export const SLOTS: readonly { readonly id: string; readonly name: string; readonly lab: string; readonly kind: 'plug-in' | 'attachment' }[] = [
  { id: 'front-end', name: 'front end', lab: 'LAB-3', kind: 'attachment' },
  { id: 'checker', name: 'checker', lab: 'LAB-4', kind: 'plug-in' },
  { id: 'interpreter', name: 'interpreter', lab: 'LAB-3', kind: 'attachment' },
  { id: 'compiler', name: 'compiler', lab: 'LAB-6', kind: 'plug-in' },
  { id: 'validator', name: 'validator', lab: 'LAB-9', kind: 'plug-in' },
  { id: 'outbox', name: 'outbox machine', lab: 'LAB-8', kind: 'plug-in' },
]
