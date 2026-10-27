// GEN-proof-structure (ASSESSMENT.md section 4.14): reading a proof's structure. Three templates, structurally
// different: t1 the goal a line of the proof leaves (chosen among goals), t2 Proof Blocks (the order of a proof's
// blocks, with distractor blocks that must be left out), t3 the hypothesis a step needs.
//
// Keys are never stored. key() asks the family's checker, the tactic model (tactics.ts, engine.ts), to run the
// instance's own script over its own definitions: for t1 the goals after the line, for t2 whether each order is a
// proof, for t3 whether each candidate closes the step and whether deleting the key's hypothesis breaks it.
// ASSESSMENT.md section 4.14 keys this family by Goal Replay strips recorded on Lean 4.35.0; until they are recorded
// for it, every item says that its goals come from this page's model, written in Lean's notation [D].
//
// Pure: no DOM, storage or network.

import { createDraw, deriveSeed } from '@statespace/rng'
import type { SeededDraw } from '@statespace/rng'
import { defineGenerator, discard, isDiscard } from '../core/define.ts'
import { assembleOptions, certifyChoice } from '../core/distractors.ts'
import type { ConfirmResult, DistinguishResult, Mutant } from '../core/distractors.ts'
import { gradeItem } from '../core/grade.ts'
import { ask, engineAtVersion } from '../core/port.ts'
import type { Answer, EnginePort } from '../core/port.ts'
import type { Band, ChoicePart, Generator, InstanceBase, Json, KeyBase, Measure, MisconceptionKey, TemplateId, TemplateSpec } from '../core/types.ts'
import { dropLine, storyOf, swapLines, theoryText, ungeneralized, withLine, withTac } from './corpus.ts'
import type { Story, StoryId } from './corpus.ts'
import { chooseDistractors } from './choose.ts'
import { decide, TACTIC_MODEL, TACTIC_MODEL_MAX_REWRITES, TACTIC_MODEL_VERSION, tacticModelPort } from './engine.ts'
import type { RunQuery, RunWitness } from './engine.ts'
import { cons, runScript, showGoal, showGoals, showLine, showScript, splitsOf, stepsOf, substitute, tv } from './tactics.ts'
import type { Goal, Line, Script, Tac, Theory } from './tactics.ts'

export { TACTIC_MODEL, TACTIC_MODEL_VERSION, tacticModelPort } from './engine.ts'
export { runScript, showGoals } from './tactics.ts'

export const PROOF_STRUCTURE_ID = 'GEN-proof-structure' as const
const PART = 'main'

export const PROOF_STRUCTURE_BASIS = "the tactic model in this page: a small model of Lean's induction, cases, simp only, rw, exact and omega over the definitions shown, run at grade time (not Lean 4.35.0)"

const MODEL_NOTE = "Goals and errors here come from this page's tactic model, written in Lean's notation; they are not Lean's own output."

/** t1: an option is a goal state; t2: an order of blocks; t3: a candidate hypothesis. */
export type ProofValue =
  | { readonly kind: 'goals'; readonly text: string }
  | { readonly kind: 'order'; readonly order: readonly number[]; readonly script: Script }
  | { readonly kind: 'candidate'; readonly label: string; readonly script: Script }

export interface ProofStructureData {
  readonly story: StoryId
  readonly theory: Theory
  /** The proof as the corpus closes it. */
  readonly script: Script
  /** t1: the line (0-based) whose result is asked. */
  readonly asked?: number
  /** t2: the blocks in display order. */
  readonly blocks?: readonly Line[]
  /** t2: how many of the blocks belong to no proof. */
  readonly distractors?: number
  /** t3: the script without the key's hypothesis, which the checker must find broken. */
  readonly deleted?: Script
  readonly values: Readonly<Record<string, ProofValue>>
}

export interface ProofStructureInstance extends InstanceBase {
  readonly data: ProofStructureData
}

export type ProofStructureKey = KeyBase

const TEMPLATES: readonly TemplateSpec[] = [
  {
    id: 't1',
    name: 'next goal',
    kcs: { primary: 'KC-2.goal-state-reading', secondary: ['KC-2.proof-reading'] },
    bands: {
      1: { steps: [3, 4], splits: [0, 0] },
      2: { steps: [5, 9], splits: [1, 1] },
      3: { steps: [10, 14], splits: [2, 2] },
    },
  },
  {
    id: 't2',
    name: 'Proof Blocks',
    kcs: { primary: 'KC-2.induction-principle', secondary: ['KC-2.proof-reading'] },
    bands: {
      1: { blocks: [5, 5], distractors: [1, 1] },
      2: { blocks: [7, 7], distractors: [1, 1] },
      3: { blocks: [10, 10], distractors: [2, 2] },
    },
  },
  {
    id: 't3',
    name: 'needed hypothesis',
    kcs: { primary: 'KC-2.generalized-ih', secondary: ['KC-2.induction-principle'] },
    bands: {
      1: { candidates: [2, 2], ungeneralized: [0, 0] },
      2: { candidates: [3, 3], ungeneralized: [0, 0] },
      3: { candidates: [4, 4], ungeneralized: [1, 1] },
    },
  },
]

// ---------------------------------------------------------------- shared

interface Built {
  readonly stem: string
  readonly ask: string
  readonly story: Story
  readonly reference: ProofValue
  readonly referenceWhy: string
  readonly mutants: readonly Mutant<ProofValue>[]
  readonly distractors: number
  readonly extra: Partial<ProofStructureData>
  /** What an option means to the checker, so the shown set never holds two it cannot tell apart; the text when absent. */
  readonly meaning?: (v: ProofValue) => string
}

const fixed = (tag: MisconceptionKey, operator: string, why: string, value: ProofValue): Mutant<ProofValue> => ({ tag, operator, why: () => why, apply: () => value })

const code = (lines: readonly string[]): string => `\n\n\`\`\`lean\n${lines.join('\n')}\n\`\`\`\n\n`

const outcome = (w: RunWitness): string => (w.ok ? 'the proof is accepted' : w.error !== undefined ? `line ${w.line ?? '?'}: ${w.error}` : `open goals: ${w.goals}`)

function render(v: ProofValue): string {
  if (v.kind === 'goals') return v.text
  if (v.kind === 'order') return v.order.join(' → ')
  return v.label
}

const theoryBlock = (th: Theory): string => `Definitions, lemmas and the theorem:${code(theoryText(th))}`

/** The script with every line rendered and indented, for the stem. */
const scriptBlock = (s: Script): string => code(showScript(s))

/** The induction hypothesis stated for the whole list n :: ns instead of ns: the circular reading. */
function circularIh(goal: Goal, consLine: Line | undefined): string | null {
  if (consLine === undefined || consLine.k !== 'case' || consLine.ctor !== 'cons') return null
  const [h, tl, ih] = consLine.names as [string, string, string]
  let changed = false
  const ctx = goal.ctx.map((e) => {
    if (e.kind !== 'hyp' || e.h.name !== ih) return e
    changed = true
    const s = { [tl]: cons(tv(h), tv(tl)) }
    return { ...e, h: { ...e.h, eq: { l: substitute(e.h.eq.l, s), r: substitute(e.h.eq.r, s) } } }
  })
  return changed ? showGoals([{ ...goal, ctx }]) : null
}

// ---------------------------------------------------------------- t1: next goal

function t1(band: Band, draw: SeededDraw): Built {
  const id: StoryId = band === 1 ? 'P1' : band === 2 ? draw.pick(['P2', 'P3', 'P4'] as const) : 'P5'
  const story = storyOf(id, draw.fork('story'))
  const th = story.theory
  const s = story.script
  const consLine = s.find((l) => l.k === 'case' && l.ctor === 'cons')
  const goalsAt = (script: Script, upto: number): Goal[] | null => {
    const r = runScript(th, script, { upto })
    return r.error !== undefined ? null : [...r.goals]
  }
  type Cand = { k: number; key: string; mutants: Mutant<ProofValue>[] }
  const cands: Cand[] = []
  for (let k = 0; k < s.length; k++) {
    const after = goalsAt(s, k + 1)
    if (after === null || after.length === 0) continue
    const key = showGoals(after)
    const before = goalsAt(s, k)
    const line = s[k] as Line
    const mutants: Mutant<ProofValue>[] = [fixed('dp:L2', 'automation closes it', 'This says nothing is left to prove after the line. The model still has a goal open after it, which a later line has to close.', { kind: 'goals', text: 'no goals: nothing is left to prove after this line' })]
    if (before !== null && before.length > 0) mutants.push(fixed('dp:L4', 'the line changes nothing', 'This is the goal before the line, unchanged. The line does change it.', { kind: 'goals', text: showGoals(before) }))
    const further = goalsAt(s, k + 2)
    if (k + 1 < s.length && further !== null && further.length > 0) mutants.push(fixed('dp:L4', 'one line too far', 'This is the goal after the next line as well: it runs one line further than asked.', { kind: 'goals', text: showGoals(further) }))
    const first = line.k === 'tacs' || line.k === 'case' ? line.tacs[0] : undefined
    if (first !== undefined && first.t === 'simp') {
      const left: Tac = { ...first, side: 'l' }
      const lhsOnly = goalsAt(withLine(s, k, withTac(line, 0, left)), k + 1)
      if (lhsOnly !== null && lhsOnly.length > 0) mutants.push(fixed('dp:L4', 'the left side only', '`simp only` rewrites both sides of the equation. This rewrites only the left side.', { kind: 'goals', text: showGoals(lhsOnly) }))
    }
    if (story.needsGen && story.induction !== undefined && k > story.induction) {
      const ungen = goalsAt(ungeneralized(story), k + 1)
      if (ungen !== null && ungen.length > 0) mutants.push(fixed('dp:L5', 'hypothesis not generalized', `This is the goal without \`generalizing ${story.gen.join(' ')}\`: the hypothesis would hold only for the original ${story.gen.join(', ')}, and the context would not list ${story.gen.join(', ')} again after it.`, { kind: 'goals', text: showGoals(ungen) }))
    }
    // Halfway readings of the line [D]: one side of the equation rewritten, or the context and the target updated
    // one without the other. They sit between the goal before the line and the goal after it, so the key is not the
    // option closest to all the others.
    if (before !== null && before.length >= 1 && before.length === after.length) {
      // On the focused goal; any other open goals are shown as they are after the line.
      const [b0, a0] = [before[0] as Goal, after[0] as Goal]
      const showGoals1 = (g: Goal): string => showGoals([g, ...after.slice(1)])
      const tac = line.k === 'tacs' || line.k === 'case' ? line.tacs[0] : undefined
      if (tac !== undefined && (tac.t === 'simp' || tac.t === 'rw')) {
        const how = tac.t === 'simp' ? '`simp only` rewrites both sides of the equation.' : '`rw` rewrites every occurrence, on both sides of the equation.'
        mutants.push(fixed('dp:L4', 'the right side only', `${how} This rewrites only the right side.`, { kind: 'goals', text: showGoals1({ ...a0, target: { l: b0.target.l, r: a0.target.r } }) }))
        if (tac.t === 'rw') mutants.push(fixed('dp:L4', 'the left side only', `${how} This rewrites only the left side.`, { kind: 'goals', text: showGoals1({ ...a0, target: { l: a0.target.l, r: b0.target.r } }) }))
      }
      mutants.push(fixed('dp:L4', 'the context left as it was', 'This updates the target but keeps the context from before the line. The line changes the context too: it adds or renames what it introduces.', { kind: 'goals', text: showGoals1({ ctx: b0.ctx, target: a0.target }) }))
      mutants.push(fixed('dp:L4', 'the target left as it was', 'This updates the context but keeps the target from before the line. The line changes the target as well.', { kind: 'goals', text: showGoals1({ ctx: a0.ctx, target: b0.target }) }))
    }
    const circ = circularIh(after[0] as Goal, consLine)
    if (circ !== null) mutants.push(fixed('dp:L6', 'hypothesis for the whole list', 'This states the induction hypothesis for the very list of this case. Induction gives the hypothesis for the tail only; for the whole list it would be the goal itself, a circular step.', { kind: 'goals', text: circ }))
    const distinct = new Set(mutants.map((m) => (m.apply(null as never, draw) as { text: string }).text).filter((t) => t !== key))
    if (distinct.size >= 3) cands.push({ k, key, mutants })
  }
  const c = draw.pick(cands)
  const done = s.slice(0, c.k)
  const before = goalsAt(s, c.k) ?? []
  const line = s[c.k] as Line
  const beforeText = before.length > 0 ? before.map(showGoal) : ['(the alternative opens the case: no goal is focused before it)']
  return {
    stem: `${theoryBlock(th)}The proof so far:${done.length > 0 ? scriptBlock(done) : ' nothing yet.\n\n'}Goal before the next line:${code(beforeText)}Next line: \`${showLine(line)}\`. ${MODEL_NOTE}`,
    ask: 'Which goal is open after that line? (Context first, then ⊢ and the target.)',
    story,
    reference: { kind: 'goals', text: c.key },
    referenceWhy: `This is the goal the model computes after \`${showLine(line)}\`.`,
    mutants: c.mutants,
    distractors: 3,
    extra: { asked: c.k },
  }
}

// ---------------------------------------------------------------- t2: Proof Blocks

function t2(band: Band, draw: SeededDraw): Built {
  const id: StoryId = band === 3 ? 'P5' : draw.pick(['P2', 'P3', 'P4'] as const)
  const story = storyOf(id, draw.fork('story'), band === 1)
  const th = story.theory
  const s = story.script
  const rwAt = story.rwIh as { line: number; tac: number }
  const ind = story.induction as number
  const rwLine = s[rwAt.line] as Line
  type Block = { line: Line; replaces: number; tag: MisconceptionKey; operator: string; why: string }
  const circ: Block = { line: withTac(rwLine, rwAt.tac, { t: 'rw', rules: [th.theorem.name] }), replaces: rwAt.line, tag: 'dp:L6', operator: 'the theorem used in its own proof', why: `This order uses \`${th.theorem.name}\`, the theorem being proved. A proof cannot use the theorem it proves; the model reports it as an unknown identifier, as Lean does.` }
  const indLine = s[ind] as Line
  const ungenB: Block = { line: indLine.k === 'induction' ? { ...indLine, gen: [] } : indLine, replaces: ind, tag: 'dp:L5', operator: 'hypothesis not generalized', why: `This order starts the induction without \`generalizing ${story.gen.join(' ')}\`, so the hypothesis holds only for the original ${story.gen.join(', ')} and \`rw [ih]\` finds no instance of it.` }
  const auto: Block = { line: withTac(rwLine, rwAt.tac, { t: 'omega' }), replaces: rwAt.line, tag: 'dp:L2', operator: 'automation instead of the hypothesis', why: 'This order puts `omega` where the hypothesis is needed. The goal still mentions the recursive call, which only the hypothesis speaks about, so `omega` cannot close it.' }
  const pool: Block[] = band === 3 ? [circ, ungenB] : [story.needsGen ? draw.pick([ungenB, circ]) : draw.pick([circ, auto])]
  const blocks = draw.shuffle([...s.map((line) => ({ line, original: true as boolean })), ...pool.map((p) => ({ line: p.line, original: false }))])
  // Block numbers are positions in the shuffled list, 1-based. The same line text never appears twice.
  const numberOf = (line: Line): number => blocks.findIndex((x) => showLine(x.line) === showLine(line)) + 1
  const order = (script: Script): ProofValue => ({ kind: 'order', order: script.map(numberOf), script })
  const singles: { tag: MisconceptionKey; operator: string; why: string; script: Script }[] = pool.map((p) => ({ tag: p.tag, operator: p.operator, why: p.why, script: withLine(s, p.replaces, p.line) }))
  const nilAt = s.findIndex((l) => l.k === 'case' && l.ctor === 'nil')
  singles.push({ tag: 'dp:L6', operator: 'base case left out', why: 'This order leaves out the `nil` alternative. Induction needs the base case as well as the step; without it the model reports the alternative missing.', script: dropLine(s, nilAt) })
  // Every adjacent swap the model rejects, alone and on top of each other mistake [D], so the item can show a set in
  // which no order sits at the centre of the others; the choice is made by choose.ts.
  const swapsOf = (base: Script): { i: number; script: Script }[] => {
    const out: { i: number; script: Script }[] = []
    for (let i = 0; i + 1 < base.length; i++) {
      // Two alternatives may come in either order, so swapping them is no mistake.
      if ((base[i] as Line).k === 'case' && (base[i + 1] as Line).k === 'case') continue
      const swapped = swapLines(base, i, i + 1)
      if (!runScript(th, swapped).ok) out.push({ i, script: swapped })
    }
    return out
  }
  const swapWhy = (base: Script, i: number): string => `This order swaps two neighbouring lines, \`${showLine(base[i] as Line)}\` and \`${showLine(base[i + 1] as Line)}\`, and the model rejects it: each line has to meet the goal it fits.`
  const mutants: Mutant<ProofValue>[] = [
    ...singles.map((m) => fixed(m.tag, m.operator, m.why, order(m.script))),
    ...swapsOf(s).map((x) => fixed('dp:L4', 'two lines swapped', swapWhy(s, x.i), order(x.script))),
    ...singles.flatMap((m) => swapsOf(m.script).map((x) => fixed(m.tag, `${m.operator}, and two lines swapped`, `Two mistakes at once. ${m.why} ${swapWhy(m.script, x.i).replace(/^This order /, 'It also ')}`, order(x.script)))),
  ]
  const list = blocks.map((x, i) => `${i + 1}. \`${showLine(x.line)}\``).join('\n')
  return {
    stem: `${theoryBlock(th)}Blocks, in no particular order:\n\n${list}\n\nA proof uses some of the blocks, one per line, read top to bottom; the alternatives \`| … =>\` mark the cases, and indentation follows them. ${pool.length === 1 ? 'One block belongs' : `${pool.length} blocks belong`} to no proof. ${MODEL_NOTE}`,
    ask: 'Which order is a proof of the theorem?',
    story,
    reference: order(s),
    referenceWhy: 'In this order the model closes every goal: the induction, its base case, then the step, each line on the goal it fits.',
    mutants,
    distractors: band === 3 ? 4 : 3,
    extra: { blocks: blocks.map((x) => x.line), distractors: pool.length },
    meaning: (v) => (v.kind === 'goals' ? v.text : outcome(decide({ op: 'run', theory: th, script: v.script }, TACTIC_MODEL_MAX_REWRITES).witness as RunWitness)),
  }
}

// ---------------------------------------------------------------- t3: needed hypothesis

function t3(band: Band, draw: SeededDraw): Built {
  const id: StoryId = band === 3 ? draw.pick(['P2', 'P3', 'P5'] as const) : draw.pick(['P2', 'P3', 'P4'] as const)
  const story = storyOf(id, draw.fork('story'))
  const th = story.theory
  const s = story.script
  const rwAt = story.rwIh as { line: number; tac: number }
  const rwLine = s[rwAt.line] as Line
  const shown = withLine(s, rwAt.line, withTac(rwLine, rwAt.tac, { t: 'rw', rules: ['?'] }))
  const without = withTac(rwLine, rwAt.tac, null)
  const deleted = without.k === 'tacs' && without.tacs.length === 0 ? dropLine(s, rwAt.line) : withLine(s, rwAt.line, without)
  const on = story.on?.n ?? 'the list'
  const gen = story.gen.join(' ')
  // Every candidate reads the same way, a name, where it comes from and what it says, in a shorter or a longer
  // wording drawn for each [D], so neither its length nor its punctuation nor its words single out the hypothesis the
  // step needs.
  const g = story.gen.join(' and ')
  const say = (short: string, long: string): string => (draw.bool() ? short : long)
  // Each distractor is offered in a short, a middle and a long wording; choose.ts shows one of them.
  const both = (tag: MisconceptionKey, operator: string, why: string, labels: readonly string[], script: Script): Mutant<ProofValue>[] => labels.map((label) => fixed(tag, operator, why, { kind: 'candidate', label, script }))
  const refLabel =
    story.gen.length > 0
      ? say(`\`ih\`, from \`induction ${on} generalizing ${gen}\`: it holds at each ${g}`, `\`ih\`, from \`induction ${on} generalizing ${gen}\`: it holds at each ${g} on the way`)
      : say(`\`ih\`, from \`induction ${on}\`: it holds for the tail`, `\`ih\`, from \`induction ${on}\`: it holds for the tail of the list`)
  const mutants: Mutant<ProofValue>[] = [
    ...both('dp:L6', 'the theorem itself', `\`${th.theorem.name}\` is the theorem being proved. A proof cannot use the theorem it proves; the model reports an unknown identifier, as Lean does.`, [`\`${th.theorem.name}\`, the theorem itself, being proved`, `\`${th.theorem.name}\`, the theorem itself: the claim this proof proves`, `\`${th.theorem.name}\`, the theorem itself: it is the very claim this proof is in the middle of proving`], withLine(s, rwAt.line, withTac(rwLine, rwAt.tac, { t: 'rw', rules: [th.theorem.name] }))),
    ...both('dp:L2', 'automation closes it', 'Without the rewrite, the goal still mentions the recursive call, which only the hypothesis speaks about; the lines after it cannot close the case.', [`nothing: the step closes without it`, `nothing: with the rewrite left out, the step closes`, `nothing: with the rewrite left out, the step from \`induction ${on}\` closes on its own`], deleted),
  ]
  if (band === 3) {
    mutants.push(
      ...both('dp:L5', 'hypothesis not generalized', `Without \`generalizing ${gen}\`, the hypothesis speaks only about the original ${story.gen.join(', ')}, but the unfolded goal needs it at a different one.`, [`\`ih\`, from plain \`induction ${on}\`, at the first ${g}`, `\`ih\`, from plain \`induction ${on}\`: it holds at the first ${g}`, `\`ih\`, from \`induction ${on}\` with no \`generalizing\`: it holds at the first ${g} it started from`], ungeneralized(story)),
    )
  }
  return {
    stem: `${theoryBlock(th)}The proof, with one rewrite left blank:${scriptBlock(shown)}${MODEL_NOTE}`,
    ask: 'Which hypothesis does `rw [?]` need? The checker deletes it and runs the proof again to see that the step breaks.',
    story,
    reference: { kind: 'candidate', label: refLabel, script: s },
    referenceWhy: story.gen.length > 0 ? `After unfolding, the goal mentions the recursive call at a value of ${story.gen.join(', ')} other than the original one, so the hypothesis must hold for every ${story.gen.join(', ')}: \`generalizing ${gen}\` gives that.` : 'After unfolding, the goal mentions the recursive call on the tail, which the induction hypothesis rewrites.',
    mutants,
    distractors: band,
    extra: { deleted },
    meaning: (v) => (v.kind === 'goals' ? v.text : JSON.stringify(v.script)),
  }
}

const BUILDERS: Readonly<Record<string, (band: Band, draw: SeededDraw) => Built>> = { t1, t2, t3 }

// ---------------------------------------------------------------- make, key, grade

function make(seed: number, band: Band, template: TemplateId): ProofStructureInstance {
  const spec = TEMPLATES.find((t) => t.id === template)
  const build = BUILDERS[template]
  if (spec === undefined || build === undefined) throw new RangeError(`${PROOF_STRUCTURE_ID} has no template ${String(template)}`)
  const draw = createDraw(deriveSeed(seed, `${PROOF_STRUCTURE_ID}/${template}/b${band}`))
  const b = build(band, draw)
  // The distractors shown, chosen among the mistakes so the key does not stand out (choose.ts).
  const chosen = chooseDistractors({ reference: b.reference, candidates: b.mutants, n: b.distractors, draw: draw.fork('choose'), render, ...(b.meaning === undefined ? {} : { meaning: b.meaning }) })
  const { options, values } = assembleOptions({ reference: b.reference, referenceWhy: b.referenceWhy, mutants: chosen, distractors: b.distractors, draw: draw.fork('options'), render })
  const part: ChoicePart = { kind: 'choice', id: PART, prompt: b.ask, options }
  return {
    family: PROOF_STRUCTURE_ID,
    template,
    band,
    seed,
    kcs: spec.kcs,
    item: { stem: b.stem, parts: [part] },
    data: { story: b.story.id, theory: b.story.theory, script: b.story.script, ...b.extra, values },
  }
}

function run(port: EnginePort, inst: ProofStructureInstance, script: Script, upto?: number): Promise<Answer<RunWitness>> {
  const input: RunQuery = { op: 'run', theory: inst.data.theory, script, ...(upto === undefined ? {} : { upto }) }
  return ask<RunQuery, RunWitness>(port, { engine: TACTIC_MODEL, version: TACTIC_MODEL_VERSION, input, budget: { wallMs: 2000, maxStates: TACTIC_MODEL_MAX_REWRITES } })
}

async function key(inst: ProofStructureInstance, port: EnginePort) {
  let engine: string | undefined
  const reply = async (script: Script, upto?: number): Promise<RunWitness | { unknown: string; budget: boolean }> => {
    const r = await run(port, inst, script, upto)
    if (r.kind === 'unknown') return { unknown: r.reason, budget: r.budget }
    engine = engineAtVersion(r.reply)
    return r.reply.witness as RunWitness
  }
  const undecided = (w: RunWitness | { unknown: string; budget: boolean }): w is { unknown: string; budget: boolean } => 'unknown' in w
  let confirm: (ref: ProofValue) => Promise<ConfirmResult>
  let distinguish: (a: ProofValue, b: ProofValue) => Promise<DistinguishResult>
  if (inst.template === 't1') {
    const k = inst.data.asked as number
    let goals = ''
    confirm = async (ref) => {
      // The goals after the asked line, computed from the instance's own script.
      const w = await reply(inst.data.script, k + 1)
      if (undecided(w)) return w
      goals = w.goals
      if (w.error !== undefined) return { rejected: `the script fails before the asked line: ${w.error}` }
      return ref.kind === 'goals' && ref.text === w.goals ? { confirmed: true } : { rejected: `the model's goal after the line is ${w.goals}` }
    }
    distinguish = async (a, b) => (render(a) === render(b) ? { same: true } : { differ: { 'the goal after the line, by this page’s model': goals } })
  } else {
    const outcomes = new Map<string, string>()
    const outcomeOf = async (v: ProofValue): Promise<string | { unknown: string; budget: boolean }> => {
      if (v.kind === 'goals') throw new Error('a goals option in an order or candidate item')
      const cached = outcomes.get(render(v))
      if (cached !== undefined) return cached
      const w = await reply(v.script)
      if (undecided(w)) return w
      const o = outcome(w)
      outcomes.set(render(v), o)
      return o
    }
    confirm = async (ref) => {
      const o = await outcomeOf(ref)
      if (typeof o !== 'string') return o
      if (o !== 'the proof is accepted') return { rejected: `the reference does not elaborate: ${o}` }
      if (inst.template === 't3') {
        // Hypothesis deletion: the key is the hypothesis whose deletion breaks the step.
        const w = await reply(inst.data.deleted as Script)
        if (undecided(w)) return w
        if (w.ok) return { rejected: 'deleting the hypothesis leaves a proof the model accepts, so the step does not need it' }
      }
      return { confirmed: true }
    }
    distinguish = async (a, b) => {
      const oa = await outcomeOf(a)
      if (typeof oa !== 'string') return oa
      const ob = await outcomeOf(b)
      if (typeof ob !== 'string') return ob
      if (oa === ob) return { same: true }
      return { differ: { [render(a)]: oa, [render(b)]: ob } }
    }
  }
  const part = inst.item.parts[0] as ChoicePart
  const choice = await certifyChoice({ part: PART, options: part.options, values: inst.data.values, confirm, distinguish })
  if (isDiscard(choice)) return choice
  if (engine === undefined) return discard('unknown', 'the tactic model gave no verdict')
  const k: ProofStructureKey = { engine, choices: [choice], statements: [] }
  return k
}

function measure(inst: ProofStructureInstance): Measure {
  const s = inst.data.script
  switch (inst.template) {
    case 't1':
      return { steps: stepsOf(s), splits: splitsOf(s) }
    case 't2':
      return { blocks: inst.data.blocks?.length ?? 0, distractors: inst.data.distractors ?? 0 }
    default: {
      const opts = (inst.item.parts[0] as ChoicePart).options
      return { candidates: opts.length, ungeneralized: opts.some((o) => o.origin.kind === 'mutant' && o.origin.tag === 'dp:L5') ? 1 : 0 }
    }
  }
}

/** Replays a distinction: for orders and candidates, runs both again and checks the outcomes the witness records. */
function replay(inst: ProofStructureInstance, part: string, a: string, b: string, witness: Json): boolean {
  if (part !== PART) return false
  const va = inst.data.values[a]
  const vb = inst.data.values[b]
  if (va === undefined || vb === undefined || typeof witness !== 'object' || witness === null || Array.isArray(witness)) return false
  if (va.kind === 'goals' || vb.kind === 'goals') {
    const after = runScript(inst.data.theory, inst.data.script, { upto: (inst.data.asked as number) + 1 })
    return va.kind === 'goals' && vb.kind === 'goals' && va.text !== vb.text && Object.values(witness).includes(showGoals(after.goals))
  }
  const w = witness as Record<string, Json>
  const oa = outcome(decide({ op: 'run', theory: inst.data.theory, script: va.script }, TACTIC_MODEL_MAX_REWRITES).witness as RunWitness)
  const ob = outcome(decide({ op: 'run', theory: inst.data.theory, script: vb.script }, TACTIC_MODEL_MAX_REWRITES).witness as RunWitness)
  return oa !== ob && w[render(va)] === oa && w[render(vb)] === ob
}

export const proofStructureGenerator: Generator<ProofStructureInstance, ProofStructureKey> = defineGenerator<ProofStructureInstance, ProofStructureKey>({
  id: PROOF_STRUCTURE_ID,
  fixture: false,
  title: "Proof structure: the next goal, the order of a proof's blocks, the hypothesis a step needs",
  templates: TEMPLATES,
  engines: [TACTIC_MODEL],
  misconceptions: ['dp:L2', 'dp:L4', 'dp:L5', 'dp:L6'],
  make,
  key,
  grade: (inst, answer, k) => gradeItem(inst, answer, k, { basis: PROOF_STRUCTURE_BASIS, engine: k.engine }),
  measure,
  structure: (inst) => `${inst.template === 't1' ? 'goal' : inst.template === 't2' ? 'blocks' : 'hypothesis'}|${inst.data.story}`,
  replay,
})

export const generator = proofStructureGenerator
export const ports: Readonly<Record<string, EnginePort>> = { [TACTIC_MODEL]: tacticModelPort }
