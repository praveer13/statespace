// GEN-spot-the-gap (ASSESSMENT.md section 4.16): an audit case, a variant of an Audit Desk anchor, and the gap class
// the learner names for it. Four templates by the kind of defeater: t1 rebutting (G1, G2, G12), t2 undermining (G4,
// G5, G7), t3 undercutting (G8, G10, G13), t4 sound. Every class is always offered, with "none: sound", in the
// taxonomy's order read cyclically from a drawn class, so the misconception lies in the choice and not in which
// options appear or where.
//
// Keys are never stored. key() asks the family's checker, the gap check (engine.ts), to run the case's checks on the
// case's own artifact; the class it certifies must be the one the generator's operator meant, and the evidence it
// returns is what the feedback shows. This build serves the class step of the Audit Desk's five; the call on the
// statement alone, "This proves: ___" and evidence anchored to lines wait for a page that shows several parts.
//
// Pure: no DOM, storage or network.

import { createDraw, deriveSeed } from '@statespace/rng'
import { defineGenerator, discard, isDiscard } from '../core/define.ts'
import { certifyChoice } from '../core/distractors.ts'
import type { ConfirmResult, DistinguishResult } from '../core/distractors.ts'
import { gradeItem } from '../core/grade.ts'
import { ask, engineAtVersion } from '../core/port.ts'
import type { EnginePort } from '../core/port.ts'
import type { Band, ChoiceOption, ChoicePart, Generator, InstanceBase, Json, KeyBase, Measure, MisconceptionKey, TemplateId, TemplateSpec } from '../core/types.ts'
import { buildT1, buildT2, buildT3, buildT4 } from './cases.ts'
import type { Built } from './cases.ts'
import { GAP_CHECK, GAP_CHECK_MAX_STATES, GAP_CHECK_VERSION, gapCheckPort, scopeOf } from './engine.ts'
import type { AuditQuery, Finding, GapCase, GapClass } from './engine.ts'

export { GAP_CHECK, GAP_CHECK_VERSION, gapCheckPort } from './engine.ts'

export const SPOT_THE_GAP_ID = 'GEN-spot-the-gap' as const
const PART = 'main'

export const SPOT_THE_GAP_BASIS = "the gap check in this page: the case's checks run on its own artifact over a printed finite scope, at grade time (not the anchor's own Z3, TLC or comparator run)"

/** The taxonomy (spine section 6.1), in order, with each class's kind and a one-line definition. */
export const CLASSES: readonly { readonly id: GapClass; readonly name: string; readonly kind: string; readonly def: string }[] = [
  { id: 'G1', name: 'Statement too weak', kind: 'rebutting', def: 'G1 is a statement too weak for the requirement: it permits a behaviour the requirement forbids.' },
  { id: 'G2', name: 'Vacuous premise', kind: 'rebutting', def: 'G2 is a vacuous premise: hypotheses that cannot hold together, so the claim is about nothing.' },
  { id: 'G3', name: 'Wrong property kind', kind: 'rebutting', def: 'G3 is the wrong property kind: a liveness or a two-run property stated as a single-state one.' },
  { id: 'G4', name: 'Encoding and type-semantics slip', kind: 'undermining', def: "G4 is an encoding slip: the model's arithmetic or types differ from the code's." },
  { id: 'G5', name: 'Bounded or inconclusive presented as proof', kind: 'undermining', def: 'G5 is a bounded or inconclusive result presented as a proof.' },
  { id: 'G6', name: 'Hidden trust', kind: 'undermining', def: 'G6 is hidden trust: an escape hatch, a native computation, a skipped kernel or a check that never ran.' },
  { id: 'G7', name: 'Unstated environment assumption', kind: 'undermining', def: 'G7 is an unstated environment assumption, often hidden in fairness or configuration.' },
  { id: 'G8', name: 'Model–implementation drift', kind: 'undercutting', def: 'G8 is drift: the proof is about a different statement, definition or artifact from the one shipped.' },
  { id: 'G9', name: 'Granularity', kind: 'undercutting', def: 'G9 is granularity: one atomic step in the model is several in the code.' },
  { id: 'G10', name: 'Observer too weak', kind: 'undercutting', def: 'G10 is an observer too weak: it equates states an attacker tells apart.' },
  { id: 'G11', name: 'Test presented as proof, or common-mode evidence', kind: 'undermining', def: 'G11 is a test presented as a proof, or evidence that shares one blind spot.' },
  { id: 'G12', name: 'Requirement mismatch', kind: 'rebutting', def: 'G12 is a requirement mismatch: the statement says something other than the requirement, such as forbidding a legitimate behaviour.' },
  { id: 'G13', name: 'Induction failure confused with a bug', kind: 'undercutting', def: 'G13 is an induction failure confused with a bug: an unreachable counterexample to induction answered by changing correct code.' },
  { id: 'none', name: 'none: sound', kind: '', def: 'None: sound means every check on the case passes and the claim says no more than its evidence.' },
]

const optionText = (c: (typeof CLASSES)[number]): string => (c.id === 'none' ? 'none: sound' : `${c.id} · ${c.name} (${c.kind})`)

export interface SpotTheGapData {
  readonly anchor: string
  readonly operator: string
  readonly case: GapCase
  readonly level: number
  /** Each option's class, by option id. */
  readonly values: Readonly<Record<string, GapClass>>
}

export interface SpotTheGapInstance extends InstanceBase {
  readonly data: SpotTheGapData
}

export interface SpotTheGapKey extends KeyBase {
  /** Every class the checker certifies; a finding naming any of them is correct (keys are multi-label). */
  readonly acceptable: readonly GapClass[]
  /** What certifies the key, as the checker found it. */
  readonly evidence: Readonly<Record<string, string>>
  /** A state where the case's premises hold, when it has premises that can. */
  readonly premise?: Json
}

const TEMPLATES: readonly TemplateSpec[] = [
  {
    id: 't1',
    name: 'rebutting',
    kcs: { primary: 'KC-2.kernel-not-requirement', secondary: ['KC-1.non-vacuity-check'] },
    bands: { 1: { evidence: [1, 1] }, 2: { evidence: [2, 2] }, 3: { evidence: [3, 3] } },
  },
  {
    id: 't2',
    name: 'undermining',
    kcs: { primary: 'KC-4.trust-stack', secondary: ['KC-1.encoding-is-the-claim'] },
    bands: { 1: { evidence: [1, 1] }, 2: { evidence: [2, 2] }, 3: { evidence: [3, 3] } },
  },
  {
    id: 't3',
    name: 'undercutting',
    kcs: { primary: 'KC-10.agent-proposal-triage', secondary: ['KC-4.trust-stack'] },
    bands: { 1: { evidence: [1, 1] }, 2: { evidence: [2, 2] }, 3: { evidence: [3, 3] } },
  },
  {
    id: 't4',
    name: 'sound',
    kcs: { primary: 'KC-10.agent-proposal-triage', secondary: ['KC-4.trust-stack', 'KC-2.kernel-not-requirement'] },
    bands: { 1: { distance: [0, 0] }, 2: { distance: [1, 1] }, 3: { distance: [2, 2] } },
  },
]

const BUILDERS: Readonly<Record<string, (band: 1 | 2 | 3, draw: ReturnType<typeof createDraw>) => Built>> = { t1: buildT1, t2: buildT2, t3: buildT3, t4: buildT4 }

function make(seed: number, band: Band, template: TemplateId): SpotTheGapInstance {
  const spec = TEMPLATES.find((t) => t.id === template)
  const build = BUILDERS[template]
  if (spec === undefined || build === undefined) throw new RangeError(`${SPOT_THE_GAP_ID} has no template ${String(template)}`)
  const draw = createDraw(deriveSeed(seed, `${SPOT_THE_GAP_ID}/${template}/b${band}`))
  const b = build(band, draw)
  const flawed = b.intended !== 'none'
  const ref = CLASSES.find((c) => c.id === b.intended) as (typeof CLASSES)[number]
  const options: ChoiceOption[] = []
  const values: Record<string, GapClass> = {}
  // The taxonomy's order, read cyclically from a drawn class [D]: neighbours stay neighbours, but no class, "none"
  // among them, is always first or always last.
  const start = draw.int(0, CLASSES.length - 1)
  const shown = [...CLASSES.slice(start), ...CLASSES.slice(0, start)]
  shown.forEach((c, i) => {
    const id = String.fromCharCode(65 + i)
    values[id] = c.id
    if (c.id === b.intended) {
      options.push({ id, text: optionText(c), why: b.why, origin: { kind: 'reference' } })
      return
    }
    // A wrong class on a flawed case is a surface reading (dp:X2); "none" on a flawed case carries the case's own
    // misconception; any flaw named on a sound case is the rejecter's overconfidence (dp:X3).
    const tag: MisconceptionKey = !flawed ? 'dp:X3' : c.id === 'none' ? (b.noneTag ?? 'dp:G8') : 'dp:X2'
    const why = !flawed
      ? `${c.def} The checker finds no gap in this case: ${b.why}`
      : c.id === 'none'
        ? (b.noneWhy ?? `${c.def} This case has a gap: ${b.why}`)
        : `${c.def} That is not this case's gap: it is ${ref.id}, ${ref.name.toLowerCase()}.`
    options.push({ id, text: optionText(c), why, origin: { kind: 'mutant', tag, operator: c.id === 'none' ? 'accept the claim' : `name ${c.id}` } })
  })
  const part: ChoicePart = { kind: 'choice', id: PART, prompt: 'Which gap does the claim have? Pick a class, or "none: sound".', options }
  const stem = `**Generated case [D]**, a variant of ${b.anchor}: this page's generator wrote the claim and its artifact; only the checker's findings are computed. The claim is quoted as an agent wrote it, UNREVIEWED:\n\n> ${b.claim}\n\n${b.artifact}When you submit, this page runs the case's checks on its artifact and prints the scope they cover.`
  return {
    family: SPOT_THE_GAP_ID,
    template,
    band,
    seed,
    kcs: spec.kcs,
    item: { stem, parts: [part] },
    bound: scopeOf(b.case),
    data: { anchor: b.anchor, operator: b.operator, case: b.case, level: b.level, values },
  }
}

async function key(inst: SpotTheGapInstance, port: EnginePort) {
  const input: AuditQuery = { op: 'audit', case: inst.data.case }
  const r = await ask<AuditQuery, Finding>(port, { engine: GAP_CHECK, version: GAP_CHECK_VERSION, input, budget: { wallMs: 2000, maxStates: GAP_CHECK_MAX_STATES } })
  if (r.kind === 'unknown') return discard(r.budget ? 'budget' : 'unknown', `the gap check could not decide the case: ${r.reason}`)
  const finding = r.reply.witness as Finding
  const confirm = async (ref: GapClass): Promise<ConfirmResult> =>
    finding.classes.length > 0 && finding.classes[0] === ref ? { confirmed: true } : { rejected: `the checker certifies ${finding.classes.join(', ') || 'no class it can name'}, not ${ref}` }
  // Classes differ by value; the witness for any pair is the evidence that certifies the key.
  const distinguish = async (a: GapClass, b: GapClass): Promise<DistinguishResult> => (a === b ? { same: true } : { differ: finding.evidence as Json })
  const part = inst.item.parts[0] as ChoicePart
  const choice = await certifyChoice({ part: PART, options: part.options, values: inst.data.values, confirm, distinguish })
  if (isDiscard(choice)) return choice
  const k: SpotTheGapKey = {
    engine: engineAtVersion(r.reply),
    choices: [choice],
    statements: [],
    bound: finding.bound,
    acceptable: finding.classes,
    evidence: finding.evidence,
    ...(finding.premise === undefined ? {} : { premise: finding.premise as Json }),
  }
  return k
}

function measure(inst: SpotTheGapInstance): Measure {
  return inst.template === 't4' ? { distance: inst.data.level } : { evidence: inst.data.level }
}

export const spotTheGapGenerator: Generator<SpotTheGapInstance, SpotTheGapKey> = defineGenerator<SpotTheGapInstance, SpotTheGapKey>({
  id: SPOT_THE_GAP_ID,
  fixture: false,
  title: 'Spot the gap: the gap class of an audit case, or none',
  templates: TEMPLATES,
  engines: [GAP_CHECK],
  misconceptions: ['dp:X2', 'dp:X3', 'dp:Z1', 'dp:L3', 'dp:X4', 'dp:Z2', 'dp:T5', 'dp:Z4', 'dp:T14', 'dp:A16', 'dp:O3', 'dp:G8'],
  make,
  key,
  grade: (inst, answer, k) => gradeItem(inst, answer, k, { basis: SPOT_THE_GAP_BASIS, engine: k.engine, ...(k.bound === undefined ? {} : { bound: k.bound }) }),
  measure,
  structure: (inst) => `${TEMPLATES.find((t) => t.id === inst.template)?.name ?? inst.template}|${inst.data.case.kind}`,
})

export const generator = spotTheGapGenerator
export const ports: Readonly<Record<string, EnginePort>> = { [GAP_CHECK]: gapCheckPort }
