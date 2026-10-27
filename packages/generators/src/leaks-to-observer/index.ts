// GEN-leaks-to-observer (ASSESSMENT.md section 4.11): two states that differ only in data the observer may not see,
// and that the observer can tell apart after the view runs, or "none". This build serves pick mode. Three templates,
// structurally different: t1 a field leak through a projection (with declassified fields), t2 a count channel (a
// total computed over more documents than the observer can see), t3 a size or abort observer (a Content-Length
// header, a unique-constraint failure). About half the instances are the projected or fixed pair member, whose key is
// "none".
//
// Keys are never stored: key() asks the pair check (engine.ts) to judge every pair option and to decide "none" by
// trying every state of the printed scope, in this page. Every grade prints the scope as its bound.
//
// Pure: no DOM, storage or network.

import { createDraw, deriveSeed } from '@statespace/rng'
import type { SeededDraw } from '@statespace/rng'
import { defineGenerator, discard, isDiscard } from '../core/define.ts'
import { assembleOptions, certifyChoice } from '../core/distractors.ts'
import { chooseDistractors, WORDS } from './choose.ts'
import type { ConfirmResult, DistinguishResult, Mutant } from '../core/distractors.ts'
import { gradeItem } from '../core/grade.ts'
import { ask, engineAtVersion } from '../core/port.ts'
import type { Answer, EnginePort } from '../core/port.ts'
import type { Band, ChoicePart, Generator, InstanceBase, Json, KeyBase, Measure, TemplateId, TemplateSpec } from '../core/types.ts'
import { PAIR_CHECK, PAIR_CHECK_MAX_STATES, PAIR_CHECK_VERSION, pairCheckPort } from './engine.ts'
import type { PairQuery } from './engine.ts'
import { defaultState, findLeak, judgePair, renderPair, scopeSize, scopeText } from './model.ts'
import type { Cell, Channel, Pair, PairJudgment, Val, World } from './model.ts'

export { PAIR_CHECK, PAIR_CHECK_VERSION, pairCheckPort } from './engine.ts'
export { findLeak, judgePair, observe, lowEq } from './model.ts'
export type { Pair, World } from './model.ts'

export const LEAKS_ID = 'GEN-leaks-to-observer' as const
const PART = 'main'

export const LEAKS_BASIS =
  'the pair check in this page: each pair judged for low-equivalence and for what the observer sees, and "none" decided by trying every state of the printed scope (checked by this page over this instance, not a Z3 run)'

export type LeakValue = { readonly kind: 'pair'; readonly pair: Pair; readonly form?: 1 } | { readonly kind: 'none'; readonly says: string }

export interface LeaksData {
  readonly world: World
  readonly values: Readonly<Record<string, LeakValue>>
  /** Measures the world cannot carry: t2's slots and revocation, t3's channels and aborts. */
  readonly measure: Readonly<Record<string, number>>
}

export interface LeaksInstance extends InstanceBase {
  readonly data: LeaksData
}

export interface LeaksKey extends KeyBase {
  readonly scope: number
}

const TEMPLATES: readonly TemplateSpec[] = [
  {
    id: 't1',
    name: 'field leak',
    kcs: { primary: 'KC-7.observer-equivalence', secondary: ['KC-7.enforcement-vs-ni', 'KC-7.declassification'] },
    bands: {
      1: { fields: [2, 2], declassified: [1, 1] },
      2: { fields: [3, 3], declassified: [1, 1] },
      3: { fields: [5, 5], declassified: [2, 2] },
    },
  },
  {
    id: 't2',
    name: 'count channel',
    kcs: { primary: 'KC-7.side-channels', secondary: ['KC-7.observer-equivalence'] },
    bands: {
      1: { slots: [3, 3], revoked: [0, 0] },
      2: { slots: [4, 4], revoked: [0, 0] },
      3: { slots: [4, 4], revoked: [1, 1] },
    },
  },
  {
    id: 't3',
    name: 'size or abort observer',
    kcs: { primary: 'KC-7.enforcement-vs-ni', secondary: ['KC-7.side-channels', 'KC-9.observations'] },
    bands: {
      1: { channels: [1, 1], aborts: [0, 0] },
      2: { channels: [1, 1], aborts: [1, 1] },
      3: { channels: [2, 2], aborts: [1, 1] },
    },
  },
]

export const renderValue = (v: LeakValue): string => (v.kind === 'pair' ? renderPair(v.pair, v.form ?? 0) : v.says)

/** What an option means: the pair's difference, or "none"; two wordings of one option mean the same. */
const meaningOf = (v: LeakValue): string => (v.kind === 'pair' ? JSON.stringify(v.pair.diff) : 'none')

// ---------------------------------------------------------------- copy

function judgmentText(j: PairJudgment): string {
  if (j.ok) return `a leak witness: low-equivalent for u, and \`${j.channel}\` differs between the two responses`
  switch (j.why) {
    case 'not-low-equivalent':
      return `not low-equivalent: \`${j.cell}\` is data u may know, and the two states differ in it`
    case 'indistinguishable':
      return 'u cannot tell the two states apart: everything u observes is the same in both'
    case 'outside-scope':
      return `outside the scope: \`${j.cell}\` takes a value the item does not allow`
  }
}

const WHY = {
  enforcement: 'Every read passing the access check is enforcement, not noninterference. Noninterference asks whether what u observes depends on data u may not see, whatever the checks let through.',
  bodyOnly: (what: string): string =>
    `u observes ${what} as well as the response body. Reading the observer as "the response body only" is an assumption about the observer, not a fact about the system, and the stem states otherwise.`,
  totalMetadata: 'The total is part of the response, so u observes it like any other field: a count is data, and a count over documents u cannot see carries information about them.',
  ownData: 'These states differ in data u may know, so they are not low-equivalent: u telling them apart reveals nothing u was not allowed to learn.',
  declassified: (f: string): string => `\`${f}\` is declassified for u, so it is low: a pair that differs in it is not low-equivalent, and seeing the difference is the release working as stated.`,
  hidden: 'These states differ only in data u may not see, but nothing u observes depends on it: both responses are the same, so this pair shows no leak.',
} as const

// ---------------------------------------------------------------- builders

interface Built {
  readonly world: World
  readonly stem: string
  readonly reference: LeakValue
  readonly referenceWhy: string
  readonly mutants: readonly Mutant<LeakValue>[]
  readonly measure: Readonly<Record<string, number>>
}

const fixed = (tag: Mutant<LeakValue>['tag'], operator: string, why: string, value: LeakValue | null): Mutant<LeakValue> => ({ tag, operator, why: () => why, apply: () => value })

/**
 * A distractor in each of its wordings [D]: a pair in its longer and shorter form, "none" in the two sentences given.
 * choose.ts shows one wording at most.
 */
function worded(tag: Mutant<LeakValue>['tag'], operator: string, why: string, value: LeakValue | null, alt?: string): Mutant<LeakValue>[] {
  if (value === null) return [fixed(tag, operator, why, null)]
  if (value.kind === 'pair') return [fixed(tag, operator, why, value), fixed(tag, operator, why, { ...value, form: 1 })]
  return [fixed(tag, operator, why, value), ...(alt === undefined ? [] : [fixed(tag, operator, why, { kind: 'none', says: alt })])]
}

const str = (name: string, a: string, b: string, low: boolean): Cell => ({ name, values: [a, b], low })
const flag = (name: string, low: boolean): Cell => ({ name, values: [true, false], low })

/** A pair that differs in one cell, from the default state. */
function one(w: World, cell: string): Pair {
  const c = w.cells.find((x) => x.name === cell)
  if (c === undefined) throw new RangeError(`no cell ${cell}`)
  return { base: defaultState(w), diff: { [cell]: [c.values[0] as Val, c.values[1] as Val] } }
}

const pairOf = (w: World, cell: string): LeakValue => ({ kind: 'pair', pair: one(w, cell) })

/** The key's pair, in a wording drawn for it. */
const keyPair = (w: World, cell: string, draw: SeededDraw): LeakValue => (draw.bool() ? pairOf(w, cell) : { kind: 'pair', pair: one(w, cell), form: 1 })

const ASK_LINE = 'Pick two states that differ only in data u may not see and that u can tell apart after the request, or "none".'

function t1(band: Band, draw: SeededDraw): Built {
  const all = ['title', 'body', 'note', 'tags', 'email']
  const fields = band === 1 ? draw.sample(['title', 'note'], 2) : band === 2 ? ['title', 'body', 'note'] : all
  const declassified = draw.sample(fields, band === 3 ? 2 : 1)
  const leak = draw.bool()
  const high = fields.filter((f) => !declassified.includes(f))
  // The projection: in the leaking view, at least one private field; in the projected pair member, released fields only.
  const projected = leak ? [...draw.sample(declassified, draw.int(0, declassified.length)), draw.pick(high)] : draw.sample(declassified, draw.int(1, declassified.length))
  const order = fields.filter((f) => projected.includes(f))
  const cells: Cell[] = [str('a.title', 'atA', 'atB', true), ...fields.map((f) => str(`d.${f}`, `${f.slice(0, 2)}A`, `${f.slice(0, 2)}B`, declassified.includes(f))), str('e.title', 'etA', 'etB', false)]
  const channels: Channel[] = [{ name: 'body.mine', expr: { c: 'a.title' }, seen: true }, ...order.map((f) => ({ name: `body.shared.${f}`, expr: { c: `d.${f}` }, seen: true }))]
  const world: World = { cells, channels }
  const leaking = order.filter((f) => !declassified.includes(f))
  const releasedShown = order.filter((f) => declassified.includes(f))
  const reference: LeakValue = leaking.length > 0 ? keyPair(world, `d.${draw.pick(leaking)}`, draw) : { kind: 'none', says: draw.pick(["No two such states, as each field the view returns is u's own or released to u", "No two such states, as the view returns u's own and released fields"]) }
  const hiddenD = fields.filter((f) => !declassified.includes(f) && !order.includes(f))
  const mutants: Mutant<LeakValue>[] = [
    ...worded('dp:A4', 'enforcement read as noninterference', WHY.enforcement, leaking.length > 0 ? { kind: 'none', says: 'No two such states, as each field u receives passed the sharing check' } : null, 'No two such states, as the sharing check passed for d'),
    ...worded('dp:A12', 'a pair in the observer\'s own data', WHY.ownData, pairOf(world, 'a.title')),
    ...releasedShown.flatMap((f) => worded('dp:A12', 'a pair in a released field', WHY.declassified(`d.${f}`), pairOf(world, `d.${f}`))),
    ...worded('dp:A13', 'a difference nothing shows', WHY.hidden, pairOf(world, 'e.title')),
    ...hiddenD.flatMap((f) => worded('dp:A13', 'a difference nothing shows', WHY.hidden, pairOf(world, `d.${f}`))),
  ]
  const stem = [
    `*World:* tenants A and B. User u belongs to tenant A and owns document a. Document d belongs to B and is shared with u; document e belongs to B and is not shared. Document d's ${declassified.map((f) => `\`${f}\``).join(' and ')} ${declassified.length === 1 ? 'is' : 'are'} released (declassified) to whoever it is shared with; its other fields (${high.map((f) => `\`${f}\``).join(', ')}) are private to B.`,
    '',
    `*View:* \`GET /mine\` returns \`{mine: a.title, shared: {${order.join(', ')}}}\` from document d; the sharing check passes for d. *Observer:* u, who sees the response body.`,
    '',
    `*Scope:* ${scopeText(world)}: ${scopeSize(world)} states.`,
    '',
    `${ASK_LINE} This page checks your pick by trying every pair of states in this scope.`,
  ].join('\n')
  return {
    world,
    stem,
    reference,
    referenceWhy:
      reference.kind === 'pair'
        ? `The two states agree on everything u may know (its own document and d's released fields) and differ in a private field of d, which the view returns: u sees the difference, so the view leaks it although the sharing check passed.`
        : 'The view returns only u\'s own title and fields released to u. Two states that agree on everything u may know give the same response, so no pair inside the scope leaks.',
    mutants,
    measure: {},
  }
}

function t2(band: Band, draw: SeededDraw): Built {
  // Slots: who owns each document, whether u can see it now, whether it matches the search, and whether the total counts it.
  interface Slot {
    readonly id: string
    readonly what: string
    readonly visible: boolean
    readonly matches: boolean
    readonly counted: boolean
  }
  const leak = draw.bool()
  let slots: Slot[]
  let total: string
  if (band === 1) {
    total = leak ? 'the number of matching documents in the whole table' : 'the number of matching documents u can see'
    slots = [
      { id: 'ax', what: "u's own document", visible: true, matches: true, counted: true },
      { id: 'bx', what: "B's private document", visible: false, matches: true, counted: leak },
      { id: 'by', what: "B's private document", visible: false, matches: false, counted: false },
    ]
  } else if (band === 2) {
    total = leak ? 'the number of matching documents on team x, whoever owns them' : 'the number of matching documents on team x that u can see'
    slots = [
      { id: 'ax', what: "u's own document, on team x", visible: true, matches: true, counted: true },
      { id: 'cx', what: "B's document on team x, shared with u", visible: true, matches: true, counted: true },
      { id: 'bx', what: "B's private document on team x", visible: false, matches: true, counted: leak },
      { id: 'by', what: "B's private document on team y", visible: false, matches: true, counted: false },
    ]
  } else {
    total = leak ? 'the number of matching documents u owns or was ever shared, read from the share log' : 'the number of matching documents u can see now'
    slots = [
      { id: 'ax', what: "u's own document", visible: true, matches: true, counted: true },
      { id: 'cx', what: "B's document, shared with u", visible: true, matches: true, counted: true },
      { id: 'rx', what: "B's document, shared with u and then revoked", visible: false, matches: true, counted: leak },
      { id: 'by', what: "B's private document, never shared", visible: false, matches: true, counted: false },
    ]
  }
  const cells: Cell[] = slots.map((s) => flag(`${s.id}.exists`, s.visible))
  const channels: Channel[] = [
    { name: 'body.hits', expr: { ids: slots.filter((s) => s.visible && s.matches).map((s) => ({ cell: `${s.id}.exists`, id: s.id })) }, seen: true },
    { name: 'body.total', expr: { count: slots.filter((s) => s.counted).map((s) => `${s.id}.exists`) }, seen: true },
  ]
  const world: World = { cells, channels }
  const leaking = slots.filter((s) => !s.visible && s.counted)
  const hiddenUncounted = slots.filter((s) => !s.visible && !s.counted)
  const reference: LeakValue = leaking.length > 0 ? keyPair(world, `${(leaking[0] as Slot).id}.exists`, draw) : { kind: 'none', says: draw.pick(['No two such states, as hits and totals depend on documents visible to u', 'No two such states, as both the hits and totals depend on visible documents']) }
  const mutants: Mutant<LeakValue>[] = [
    ...(leaking.length === 0
      ? slots.filter((s) => !s.visible && s.matches).flatMap((s) => worded('dp:A13', 'a difference nothing shows', WHY.hidden, pairOf(world, `${s.id}.exists`)))
      : [
          ...worded('dp:A4', 'enforcement read as noninterference', WHY.enforcement, { kind: 'none', says: 'No two such states, as each hit u receives passed the access check' }, 'No two such states, as the access check passed for each hit'),
          ...worded('dp:P1', 'the observer reads the rows only', WHY.totalMetadata, { kind: 'none', says: 'No two such states, as u sees the rows it may read and the total is metadata' }, 'No two such states, as the total is metadata'),
        ]),
    ...worded('dp:A12', "a pair in the observer's own data", WHY.ownData, pairOf(world, 'ax.exists')),
    ...slots.filter((s) => s.visible && s.id !== 'ax').flatMap((s) => worded('dp:A12', "a pair in data u can see", WHY.ownData, pairOf(world, `${s.id}.exists`))),
    ...hiddenUncounted.flatMap((s) => worded('dp:A13', 'a difference nothing shows', WHY.hidden, pairOf(world, `${s.id}.exists`))),
  ]
  const list = slots.map((s) => `\`${s.id}\` (${s.what}${s.matches ? '' : ', not matching the search'})`).join(', ')
  const stem = [
    `*World:* tenants A and B; user u belongs to A. Documents: ${list}. Each may exist or not; u may know whether the documents it can see exist, and nothing about the others.`,
    '',
    `*View:* \`Search(q)\` returns \`{hits, total}\`: the matching documents u can see, and \`total\`, ${total}. *Observer:* u, who sees the response body.`,
    '',
    `*Scope:* ${scopeText(world)}: ${scopeSize(world)} states.`,
    '',
    `${ASK_LINE} This page checks your pick by trying every pair of states in this scope.`,
  ].join('\n')
  return {
    world,
    stem,
    reference,
    referenceWhy:
      reference.kind === 'pair'
        ? `The two states agree on every document u can see, so they are low-equivalent, and \`total\` counts a document u cannot see: it is one higher in one state than in the other. The hits passed the access check; the count did not need to.`
        : 'Both the hits and the total are computed from documents u can see, so low-equivalent states give the same response: no pair inside the scope leaks.',
    mutants,
    measure: { slots: slots.length, revoked: band === 3 ? 1 : 0 },
  }
}

function t3(band: Band, draw: SeededDraw): Built {
  const size = band !== 2
  const aborts = band !== 1
  const leak = draw.bool()
  // In the leaking variant, every channel the band names depends on B's private data; in the fixed one, none does.
  const cells: Cell[] = [
    str('u.name', 'ana', 'ann', true),
    ...(size ? [str('d.body', 'ok', 'okay', false), str('d.title', 'tA', 'tB', false)] : [str('d.title', 'tA', 'tB', false)]),
    ...(aborts ? [flag('b.plan.exists', false)] : []),
  ]
  const channels: Channel[] = [
    ...(size ? [{ name: 'body.error', expr: { k: 'forbidden' }, seen: true }] : []),
    { name: 'body.you', expr: { c: 'u.name' }, seen: true },
    ...(size ? [{ name: 'Content-Length', expr: leak ? { lens: ['d.body'], plus: 20 } : { k: 24 }, seen: true }] : []),
    ...(aborts ? [{ name: 'insert outcome', expr: leak ? { ifc: 'b.plan.exists', then: { k: 'unique-constraint error' }, else: { k: 'ok' } } : { k: 'ok' }, seen: true }] : []),
  ]
  const world: World = { cells, channels }
  const sees = [size ? 'the Content-Length header' : null, aborts ? 'whether its insert fails' : null].filter((x) => x !== null).join(' and ')
  const reference: LeakValue = leak ? keyPair(world, size && (!aborts || draw.bool()) ? 'd.body' : 'b.plan.exists', draw) : { kind: 'none', says: draw.pick(['No two such states, as u observes the same in each pair of states', 'No two such states, as u sees the same for any data of the other tenant']) }
  const mutants: Mutant<LeakValue>[] = [
    ...worded('dp:P1', 'the observer ignores side channels', WHY.bodyOnly(sees), leak ? { kind: 'none', says: 'No two such states, as u sees the response body and it says "forbidden" either way' } : null, 'No two such states, as the body says "forbidden" either way'),
    ...worded('dp:A12', "a pair in the observer's own data", WHY.ownData, pairOf(world, 'u.name')),
    ...worded('dp:A13', 'a difference nothing shows', WHY.hidden, pairOf(world, 'd.title')),
    ...worded('dp:A13', 'a difference nothing shows', WHY.hidden, !leak && size ? pairOf(world, 'd.body') : !leak && aborts ? pairOf(world, 'b.plan.exists') : null),
    ...worded('dp:A13', 'a difference nothing shows', WHY.hidden, !leak && size && aborts ? pairOf(world, 'b.plan.exists') : null),
  ]
  const requests = [
    size ? `\`GET /doc/d\` for B's private document d answers \`{error: "forbidden", you: u.name}\` with a \`Content-Length\` header, ${leak ? "computed from the stored document's body" : 'the length of the error response itself'}` : null,
    aborts ? `\`POST /plans {name: "q3"}\` inserts a plan named q3 for u's tenant into a table whose plan names are unique ${leak ? 'across all tenants' : 'within each tenant'}, and answers \`{you: u.name}\`; B may have a plan named q3 (\`b.plan.exists\`), and u sees whether its insert failed` : null,
  ].filter((x) => x !== null)
  const stem = [
    `*World:* tenants A and B; user u belongs to A and is called \`u.name\`. ${size ? "B's document d (title `d.title`, body `d.body`)" : "B's document title `d.title`"}${aborts ? ' and B\'s plans are' : ' is'} private to B.`,
    '',
    `*View:* ${requests.join('. Then ')}. Every access check passes as designed: u is never shown B's data. *Observer:* u, who sees the response body and ${sees}.`,
    '',
    `*Scope:* ${scopeText(world)}: ${scopeSize(world)} states.`,
    '',
    `${ASK_LINE} This page checks your pick by trying every pair of states in this scope.`,
  ].join('\n')
  return {
    world,
    stem,
    reference,
    referenceWhy:
      reference.kind === 'pair'
        ? `The two states agree on everything u may know, and u is refused B's data in both, but u observes ${sees}, which depends on B's private data here: the two observations differ, so the view leaks although every access check passed.`
        : `u observes ${sees} as well as the body, but here none of it depends on B's data: low-equivalent states look the same to u, so no pair in the scope leaks.`,
    mutants,
    measure: { channels: (size ? 1 : 0) + (aborts ? 1 : 0), aborts: aborts ? 1 : 0 },
  }
}

const BUILDERS: Readonly<Record<string, (band: Band, draw: SeededDraw) => Built>> = { t1, t2, t3 }

function make(seed: number, band: Band, template: TemplateId): LeaksInstance {
  const spec = TEMPLATES.find((t) => t.id === template)
  const build = BUILDERS[template]
  if (spec === undefined || build === undefined) throw new RangeError(`${LEAKS_ID} has no template ${String(template)}`)
  const draw = createDraw(deriveSeed(seed, `${LEAKS_ID}/${template}/b${band}`))
  const b = build(band, draw)
  // The distractors shown, chosen among the wrong answers and their wordings so the key does not stand out (choose.ts).
  const chosen = chooseDistractors({ reference: b.reference, candidates: b.mutants, n: 3, draw: draw.fork('choose'), render: renderValue, meaning: meaningOf, features: [WORDS] })
  const { options, values } = assembleOptions({ reference: b.reference, referenceWhy: b.referenceWhy, mutants: chosen, distractors: 3, draw: draw.fork('options'), render: renderValue })
  const part: ChoicePart = { kind: 'choice', id: PART, prompt: 'Pick the pair, or "none".', options }
  return {
    family: LEAKS_ID,
    template,
    band,
    seed,
    kcs: spec.kcs,
    item: { stem: b.stem, parts: [part] },
    bound: `every state of the printed scope (${scopeSize(b.world)} states); nothing outside it`,
    data: { world: b.world, values, measure: b.measure },
  }
}

// ---------------------------------------------------------------- key and grade

function query<W>(port: EnginePort, input: PairQuery): Promise<Answer<W>> {
  return ask<PairQuery, W>(port, { engine: PAIR_CHECK, version: PAIR_CHECK_VERSION, input, budget: { wallMs: 2000, maxStates: PAIR_CHECK_MAX_STATES } })
}

async function key(inst: LeaksInstance, port: EnginePort) {
  const world = inst.data.world
  const none = await query<Pair>(port, { op: 'none', world })
  if (none.kind === 'unknown') return discard(none.budget ? 'budget' : 'unknown', `the pair check could not decide "none": ${none.reason}`)
  const found = none.reply.verdict.kind === 'sat' ? (none.reply.witness ?? null) : null
  const facts = new Map<LeakValue, { ok: boolean; text: string }>()
  const judge = async (v: LeakValue): Promise<{ ok: boolean; text: string } | { unknown: string; budget: boolean }> => {
    const cached = facts.get(v)
    if (cached !== undefined) return cached
    let fact: { ok: boolean; text: string }
    if (v.kind === 'none') fact = found === null ? { ok: true, text: 'right: no pair in the scope leaks' } : { ok: false, text: `wrong: this page finds one: ${renderPair(found)}` }
    else {
      const r = await query<PairJudgment>(port, { op: 'judge', world, pair: v.pair })
      if (r.kind === 'unknown') return { unknown: r.reason, budget: r.budget }
      const j = r.reply.witness
      if (j === undefined) return { unknown: 'no judgment', budget: false }
      fact = { ok: j.ok, text: judgmentText(j) }
    }
    facts.set(v, fact)
    return fact
  }
  const confirm = async (ref: LeakValue): Promise<ConfirmResult> => {
    const f = await judge(ref)
    if ('unknown' in f) return f
    return f.ok ? { confirmed: true } : { rejected: f.text }
  }
  const labelOf = (v: LeakValue): string => Object.keys(inst.data.values).find((id) => inst.data.values[id] === v) ?? '?'
  const distinguish = async (a: LeakValue, b: LeakValue): Promise<DistinguishResult> => {
    const fa = await judge(a)
    const fb = await judge(b)
    if ('unknown' in fa) return fa
    if ('unknown' in fb) return fb
    if (renderValue(a) === renderValue(b) || (fa.ok && fb.ok)) return { same: true }
    return { differ: { [labelOf(a)]: fa.text, [labelOf(b)]: fb.text } }
  }
  const part = inst.item.parts[0] as ChoicePart
  const choice = await certifyChoice({ part: PART, options: part.options, values: inst.data.values, confirm, distinguish })
  if (isDiscard(choice)) return choice
  const k: LeaksKey = { engine: engineAtVersion(none.reply), choices: [choice], statements: [], scope: scopeSize(world), ...(inst.bound === undefined ? {} : { bound: inst.bound }) }
  return k
}

function measure(inst: LeaksInstance): Measure {
  if (inst.template !== 't1') return inst.data.measure
  const fields = inst.data.world.cells.filter((c) => c.name.startsWith('d.'))
  return { fields: fields.length, declassified: fields.filter((c) => c.low).length }
}

export const leaksGenerator: Generator<LeaksInstance, LeaksKey> = defineGenerator<LeaksInstance, LeaksKey>({
  id: LEAKS_ID,
  fixture: false,
  title: 'Leaks to observer: a pair the observer tells apart, or none',
  templates: TEMPLATES,
  engines: [PAIR_CHECK],
  misconceptions: ['dp:A4', 'dp:A12', 'dp:A13', 'dp:P1'],
  make,
  key,
  grade: (inst, answer, k) => gradeItem(inst, answer, k, { basis: LEAKS_BASIS, engine: k.engine, ...(k.bound === undefined ? {} : { bound: k.bound }) }),
  measure,
  // The channels' expression kinds: projections (t1), counts and id lists (t2), lengths, constants and aborts (t3).
  structure: (inst) => {
    const kind = (c: Channel): string => Object.keys(c.expr)[0] ?? '?'
    return `channels:${inst.data.world.channels.map(kind).sort().join(',')}|cells:${inst.data.world.cells.map((c) => typeof c.values[0]).sort().join(',')}`
  },
  replay: (inst, part, a, b, witness) => {
    if (part !== PART || typeof witness !== 'object' || witness === null || Array.isArray(witness)) return false
    const va = inst.data.values[a]
    const vb = inst.data.values[b]
    if (va === undefined || vb === undefined) return false
    const okOf = (v: LeakValue): boolean => (v.kind === 'none' ? findLeak(inst.data.world) === null : judgePair(inst.data.world, v.pair).ok)
    const w = witness as Record<string, Json>
    return typeof w[a] === 'string' && typeof w[b] === 'string' && !(okOf(va) && okOf(vb))
  },
})

export const generator = leaksGenerator
export const ports: Readonly<Record<string, EnginePort>> = { [PAIR_CHECK]: pairCheckPort }
