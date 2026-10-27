// GEN-which-stamp (ASSESSMENT.md section 4.13): the stamp and qualifier a raw tool output earns. Three templates,
// structurally different: t1 shows a recorded output's verdict lines and asks which stamp they earn; t2 shows the stamp
// with one to three qualifier fields blanked and asks which completion is the deriver's; t3 asks which segment of a
// claim's strip (proposition of the model, correspondence, requirement fit) the output bears on.
//
// Instance supply: the verdict lines of executed runs, by run id (recorded.ts, copied from
// content/generators/GEN-which-stamp/fixtures.json). The seed chooses the run, the template's blanks and the option
// order; numbers are never altered. Keys are never stored: key() hands the instance's lines to the deriver of
// packages/stamps (deriver.ts) through the port, and the option the deriver's answer matches is the key. Distractors
// are mutants.ts's wrong stamps, each one cataloged misconception.
//
// Pure: no DOM, storage or network.

import { createDraw, deriveSeed } from '@statespace/rng'
import type { SeededDraw } from '@statespace/rng'
import { STRIP_SEGMENTS } from '@statespace/stamps'
import type { StripSegment } from '@statespace/stamps'
import { defineGenerator, discard, isDiscard } from '../core/define.ts'
import { assembleOptions, certifyChoice } from '../core/distractors.ts'
import { chooseDistractors } from './choose.ts'
import type { ConfirmResult, DistinguishResult, Mutant } from '../core/distractors.ts'
import { gradeItem } from '../core/grade.ts'
import { ask, engineAtVersion } from '../core/port.ts'
import type { EnginePort } from '../core/port.ts'
import type { Band, ChoicePart, Generator, InstanceBase, KeyBase, Measure, TemplateId, TemplateSpec } from '../core/types.ts'
import { deriveView, segmentLabel, STAMP_DERIVER, STAMP_DERIVER_VERSION, stampDeriverPort } from './deriver.ts'
import type { DerivedView, DeriverQuery } from './deriver.ts'
import { blankedText, fieldMutants, SEGMENT_MUTANT, SEGMENT_WHY, T1_RULES, withField } from './mutants.ts'
import type { StampValue } from './mutants.ts'
import { RECORDED } from './recorded.ts'
import type { RecordedOutput } from './recorded.ts'

export { deriveView, segmentOf, STAMP_DERIVER, STAMP_DERIVER_VERSION, stampDeriverPort } from './deriver.ts'
export type { DerivedView } from './deriver.ts'
export { RECORDED } from './recorded.ts'
export type { RecordedOutput } from './recorded.ts'

export const WHICH_STAMP_ID = 'GEN-which-stamp' as const
const PART = 'main'

export const WHICH_STAMP_BASIS = "the stamp deriver of packages/stamps (spine section 8.8), the same code that stamps the course's receipts, run in this page on the run's recorded lines: a parse and a table lookup"

export interface WhichStampData {
  /** The recorded output the item shows: its run, its verdict lines and what the deriver reads beside them. */
  readonly output: RecordedOutput
  /** Each option's value, by option id. */
  readonly values: Readonly<Record<string, StampValue>>
  /** t2: the qualifier fields blanked, by index. */
  readonly blanks?: readonly number[]
}

export interface WhichStampInstance extends InstanceBase {
  readonly data: WhichStampData
}

export interface WhichStampKey extends KeyBase {
  /** What the deriver gave the recorded output. */
  readonly derived: DerivedView
}

const TEMPLATES: readonly TemplateSpec[] = [
  {
    id: 't1',
    name: 'raw output to stamp',
    kcs: { primary: 'KC-1.three-answers', secondary: ['KC-2.axioms-and-trust', 'KC-5.bounded-scope'] },
    bands: { 1: { tier: [1, 1] }, 2: { tier: [2, 2] }, 3: { tier: [3, 3] } },
  },
  {
    id: 't2',
    name: 'complete the qualifier',
    kcs: { primary: 'KC-5.bounded-scope', secondary: ['KC-1.unknown-fails-closed'] },
    bands: { 1: { blanks: [1, 1] }, 2: { blanks: [2, 2] }, 3: { blanks: [3, 3] } },
  },
  {
    id: 't3',
    name: 'which strip segment',
    kcs: { primary: 'KC-4.trust-stack', secondary: ['KC-9.tcb'] },
    bands: { 1: { tier: [1, 1] }, 2: { tier: [2, 2] }, 3: { tier: [3, 3] } },
  },
]

// ---------------------------------------------------------------- copy

const fence = (lines: readonly string[]): string => ['```', ...lines.map((l) => l.trimEnd()), '```'].join('\n')

/** What the lines cannot say, in words: the facts beside the run that the deriver reads. */
function circumstances(o: RecordedOutput): string[] {
  const c = o.context
  const out: string[] = []
  if (c.direction === 'violation') out.push('The query asks for a violation of the property, so a sat answer is a state that breaks it.')
  if (c.replay === 'replayed') out.push("The model was replayed in the interpreter and breaks the property there.")
  if (o.parser === 'solver' && c.direction === 'violation' && c.replay === undefined && o.lines.some((l) => / sat /.test(l))) out.push('The model has not been replayed yet.')
  if (c.guardsEnforcement === true) out.push('This check guards a deploy gate.')
  if (c.deadlockFreedom === false) out.push('The property under check is an invariant, not deadlock freedom, and the spec is meant to terminate.')
  if (o.constants !== undefined && o.constants.length > 0) out.push(`Constants: \`${o.constants.map(([k, v]) => `${k} = ${v}`).join(', ')}\`.`)
  if (c.paranoid === true) out.push('The comparator ran with `--paranoid`.')
  if (typeof c.exitCode === 'number') out.push(`The run exited with code ${c.exitCode}.`)
  if (c.property === 'liveness') out.push('The claim the traces bear on is a liveness claim ("eventually").')
  if (c.property === 'safety') out.push('The claim the traces bear on is safety-shaped.')
  return out
}

function shown(o: RecordedOutput): string {
  const who = `${o.checker.name} ${o.checker.version}`
  const facts = circumstances(o)
  return [`Raw output of ${who}, recorded run [X ${o.run}]:`, '', fence(o.lines), ...(facts.length > 0 ? ['', facts.join(' ')] : [])].join('\n')
}

// ---------------------------------------------------------------- templates

interface Built {
  readonly output: RecordedOutput
  readonly stem: string
  readonly ask: string
  readonly reference: StampValue
  readonly referenceWhy: string
  readonly mutants: readonly Mutant<StampValue>[]
  readonly distractors: number
  readonly blanks?: readonly number[]
}

const ruleMutant = (r: (typeof T1_RULES)[string][number]): Mutant<StampValue> => ({
  tag: r.tag,
  operator: r.operator,
  why: () => r.why,
  apply: (ref) => {
    if (ref.view === undefined || ref.output === undefined) return null
    const t = r.text(ref.view, ref.output)
    return t === null ? null : { text: t }
  },
})

const fixed = (tag: Mutant<StampValue>['tag'], operator: string, why: string, text: string): Mutant<StampValue> => ({ tag, operator, why: () => why, apply: () => ({ text }) })

function referenceWhy(v: DerivedView): string {
  if (v.kind === 'stamp') return `This is what the deriver gives these lines: \`${v.text}\`. The stamp names its checker and its bound where it has one, and nothing the lines do not state.`
  if (v.kind === 'modulo') return `This is what the deriver gives these lines: "${v.text}". An assumed lemma or axiom earns no [P] of its own; each assumption is carried as [A].`
  return `This is what the deriver gives these lines: ${v.text}.`
}

function t1(band: Band, draw: SeededDraw): Built {
  const output = draw.pick(RECORDED.filter((o) => o.tier === band))
  const view = deriveView(output)
  return {
    output,
    stem: shown(output),
    ask: 'Which stamp does this output earn?',
    reference: { text: view.text, view, output },
    referenceWhy: referenceWhy(view),
    mutants: (T1_RULES[view.raw] ?? []).map(ruleMutant),
    distractors: 3,
  }
}

/** The recorded outputs whose stamp has at least k qualifier fields that a field rule reads. */
function qualifierPool(k: number): RecordedOutput[] {
  return RECORDED.filter((o) => {
    const v = deriveView(o)
    return v.kind === 'stamp' && v.qualifier.filter((q) => fieldMutants(q).length > 0).length >= k
  })
}

function t2(band: Band, draw: SeededDraw): Built {
  const output = draw.pick(qualifierPool(band))
  const view = deriveView(output)
  if (view.kind !== 'stamp') throw new Error('t2 draws only outputs that earn a stamp')
  const readable = view.qualifier.map((q, i) => ({ q, i })).filter(({ q }) => fieldMutants(q).length > 0)
  const blanks = draw
    .sample(readable, band)
    .map(({ i }) => i)
    .sort((a, b) => a - b)
  // Each mutant changes one blanked field the way one misconception would, and keeps the others as the deriver gave them;
  // with two or more blanks, a mutant may also change two fields at once [D], so the deriver's completion is not the
  // one closest to every other option. choose.ts shows two.
  const singles = blanks.flatMap((i) => fieldMutants(view.qualifier[i] as string).map((w) => ({ i, w })))
  const mutants: Mutant<StampValue>[] = [
    ...singles.map(({ i, w }) => fixed(w.tag, w.operator, w.why, withField(view.code, view.qualifier, i, w.value))),
    ...singles.flatMap((a, x) =>
      singles.slice(x + 1).filter((b) => b.i !== a.i).map((b) => {
        const both = view.qualifier.map((q, k) => (k === a.i ? a.w.value : k === b.i ? b.w.value : q))
        return fixed(a.w.tag, `${a.w.operator}, and ${b.w.operator}`, `Two fields are wrong. ${a.w.why} ${b.w.why}`, withField(view.code, both, a.i, a.w.value))
      }),
    ),
  ]
  return {
    output,
    stem: `${shown(output)}\n\nThe stamp it earns, with ${band === 1 ? 'one field' : `${band} fields`} of the qualifier left blank: \`${blankedText(view.code, view.qualifier, blanks)}\``,
    ask: 'Which completion is the stamp these lines earn?',
    reference: { text: view.text, view, output },
    referenceWhy: referenceWhy(view),
    mutants,
    distractors: 2,
    blanks,
  }
}

function t3(band: Band, draw: SeededDraw): Built {
  const output = draw.pick(RECORDED.filter((o) => o.tier === band))
  const view = deriveView(output)
  const others = STRIP_SEGMENTS.filter((s) => s !== view.segment)
  const mutants = others.map((s): Mutant<StampValue> => {
    const m =
      view.segment === 'correspondence' ? (s === 'proposition' ? SEGMENT_MUTANT.toProposition : SEGMENT_MUTANT.testToRequirement) : s === 'requirement' ? SEGMENT_MUTANT.toRequirement : SEGMENT_MUTANT.toCorrespondence
    return fixed(m.tag, m.operator, m.why, segmentLabel(s))
  })
  return {
    output,
    stem: `${shown(output)}\n\nA claim card shows three segments: the proposition of the model, the model's correspondence with the running system, and the requirement's fit.`,
    ask: 'Which segment of the claim strip does this output bear on?',
    reference: { text: segmentLabel(view.segment), view, output },
    referenceWhy: SEGMENT_WHY[view.segment],
    mutants,
    distractors: 2,
  }
}

const BUILDERS: Readonly<Record<'t1' | 't2' | 't3', (band: Band, draw: SeededDraw) => Built>> = { t1, t2, t3 }

// ---------------------------------------------------------------- make, key, grade

function make(seed: number, band: Band, template: TemplateId): WhichStampInstance {
  const spec = TEMPLATES.find((t) => t.id === template)
  if (spec === undefined || template === 't4') throw new RangeError(`${WHICH_STAMP_ID} has no template ${String(template)}`)
  const draw = createDraw(deriveSeed(seed, `${WHICH_STAMP_ID}/${template}/b${band}`))
  const b = BUILDERS[template](band, draw)
  // The distractors shown, chosen among the wrong stamps so the key does not stand out (choose.ts).
  const chosen = chooseDistractors({ reference: b.reference, candidates: b.mutants, n: b.distractors, draw: draw.fork('choose'), render: (v) => v.text })
  const { options, values } = assembleOptions({
    reference: b.reference,
    referenceWhy: b.referenceWhy,
    mutants: chosen,
    distractors: b.distractors,
    draw: draw.fork('options'),
    render: (v) => v.text,
  })
  // Only the shown text is kept for each option: the reference's derivation is recomputed at grade time.
  const kept: Record<string, StampValue> = {}
  for (const [id, v] of Object.entries(values)) kept[id] = { text: v.text }
  const part: ChoicePart = { kind: 'choice', id: PART, prompt: b.ask, options }
  return {
    family: WHICH_STAMP_ID,
    template,
    band,
    seed,
    kcs: spec.kcs,
    item: { stem: b.stem, parts: [part] },
    data: { output: b.output, values: kept, ...(b.blanks === undefined ? {} : { blanks: b.blanks }) },
  }
}

/** The text the deriver's answer gives this template's key option. */
function keyText(inst: WhichStampInstance, v: DerivedView): string {
  return inst.template === 't3' ? segmentLabel(v.segment) : v.text
}

async function key(inst: WhichStampInstance, port: EnginePort) {
  const input: DeriverQuery = { op: 'derive', output: inst.data.output }
  const r = await ask<DeriverQuery, DerivedView>(port, { engine: STAMP_DERIVER, version: STAMP_DERIVER_VERSION, input, budget: { wallMs: 1000 } })
  if (r.kind === 'unknown') return discard(r.budget ? 'budget' : 'unknown', `the stamp deriver could not read the output: ${r.reason}`)
  if (r.reply.verdict.kind !== 'parsed' || r.reply.witness === undefined) return discard('unknown', `no parser reads these lines: ${r.reply.verdict.kind === 'rejected' ? r.reply.verdict.issues.join('; ') : r.reply.verdict.kind}`)
  const derived = r.reply.witness
  const want = keyText(inst, derived)
  const confirm = async (ref: StampValue): Promise<ConfirmResult> => (ref.text === want ? { confirmed: true } : { rejected: `the deriver gives "${want}", not "${ref.text}"` })
  // Options differ by their text: a stamp, a reading or a segment is categorical.
  const distinguish = async (a: StampValue, b: StampValue): Promise<DistinguishResult> => (a.text === b.text ? { same: true } : { differ: inst.template === 't3' ? { segment: want } : { derived: want } })
  const part = inst.item.parts[0] as ChoicePart
  const choice = await certifyChoice({ part: PART, options: part.options, values: inst.data.values, confirm, distinguish })
  if (isDiscard(choice)) return choice
  const k: WhichStampKey = { engine: engineAtVersion(r.reply), choices: [choice], statements: [], derived }
  return k
}

function measure(inst: WhichStampInstance): Measure {
  if (inst.template === 't2') return { blanks: inst.data.blanks?.length ?? 0 }
  return { tier: inst.data.output.tier }
}

export const whichStampGenerator: Generator<WhichStampInstance, WhichStampKey> = defineGenerator<WhichStampInstance, WhichStampKey>({
  id: WHICH_STAMP_ID,
  fixture: false,
  title: 'Which stamp: the stamp and qualifier a raw output earns',
  templates: TEMPLATES,
  engines: [STAMP_DERIVER],
  misconceptions: ['dp:X1', 'dp:T5', 'dp:T6', 'dp:L3', 'dp:L8', 'dp:G8', 'dp:Z1', 'dp:Z2', 'dp:Z3', 'dp:T1'],
  make,
  key,
  grade: (inst, answer, k) => gradeItem(inst, answer, k, { basis: WHICH_STAMP_BASIS, engine: k.engine }),
  measure,
  structure: (inst) => {
    const kind = deriveView(inst.data.output).raw
    if (inst.template === 't1') return `stamp:${kind}`
    if (inst.template === 't2') return `qualifier:${inst.data.blanks?.length ?? 0}:${kind}`
    return `segment:${kind}`
  },
})

export const generator = whichStampGenerator
export const ports: Readonly<Record<string, EnginePort>> = { [STAMP_DERIVER]: stampDeriverPort }

/** The strip segments, for tests and the site. */
export const SEGMENTS: readonly StripSegment[] = STRIP_SEGMENTS
