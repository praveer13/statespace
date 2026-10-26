// Grading: a part at a time, then the item. A choice part matches when the response is the key's option; a
// true/false set matches only when every statement does (spine section 8.5); a response that is not in the
// part's language is ungraded, and so is an item the checker could not decide (ASSESSMENT.md section 4.1).
// A miss on a mutant carries the mutant's tag and why (layer 2) and the witness that tells it from the key
// (layer 1).
//
// Pure: no DOM, storage or network.

import { COPY } from './copy.ts'
import { distinctionOf } from './distractors.ts'
import type { ChoiceKey, ChoicePart, Grade, InstanceBase, ItemAnswer, Json, KeyBase, MisconceptionKey, TrueFalseKey, TrueFalsePart, Ungraded, WitnessClass } from './types.ts'

/** One part's result. */
export interface PartGrade {
  readonly part: string
  readonly ok: boolean | null
  readonly ungraded?: Ungraded
  readonly why: string
  readonly misconception?: MisconceptionKey
  readonly note?: string
  readonly witness?: Json
  readonly class?: WitnessClass
}

/** What every grade of an item states beside its verdict. */
export interface GradeContext {
  /** What the verdict rests on: the checker and the fragment. */
  readonly basis: string
  /** engine@version that keyed the item. */
  readonly engine?: string
  /** The bound, when the check is bounded (I10). */
  readonly bound?: string
}

/** A grade that records no verdict, with the reason it states. */
export function ungradedGrade(reason: Ungraded, ctx: GradeContext & { readonly summary?: string; readonly response?: Json }): Grade {
  const why = reason === 'unknown' ? COPY.ungradedUnknown : reason === 'budget' ? COPY.ungradedBudget : COPY.outsideLanguage(ctx.summary ?? 'see the item')
  return withContext({ ok: null, ungraded: reason, why, ...(ctx.response === undefined ? {} : { response: ctx.response }) }, ctx)
}

function withContext(g: Omit<Grade, 'basis' | 'engine' | 'bound'>, ctx: GradeContext): Grade {
  return {
    ...g,
    basis: ctx.basis,
    ...(ctx.engine === undefined ? {} : { engine: ctx.engine }),
    ...(ctx.bound === undefined ? {} : { bound: ctx.bound }),
  }
}

/** A part the checker could not decide (an Answer of kind unknown): ungraded, unknown or budget, never a miss. */
export function ungradedPart(part: string, answer: { readonly reason: string; readonly budget: boolean }): PartGrade {
  return { part, ok: null, ungraded: answer.budget ? 'budget' : 'unknown', why: answer.budget ? COPY.ungradedBudget : COPY.ungradedUnknown }
}

/** Grade a choice part: the response must be one of its option ids. */
export function gradeChoicePart(part: ChoicePart, key: ChoiceKey, response: Json | undefined): PartGrade {
  const chosen = typeof response === 'string' ? part.options.find((o) => o.id === response) : undefined
  if (chosen === undefined) return { part: part.id, ok: null, ungraded: 'outside-language', why: COPY.outsideLanguage(`one of ${part.options.map((o) => o.id).join(', ')}`) }
  if (chosen.id === key.answer) return { part: part.id, ok: true, why: COPY.matched, note: chosen.why }
  const d = distinctionOf(key, chosen.id, key.answer)
  return {
    part: part.id,
    ok: false,
    why: `${COPY.missed} ${COPY.told(chosen.id, key.answer)}`,
    ...(chosen.origin.kind === 'mutant' ? { misconception: chosen.origin.tag } : {}),
    note: chosen.why,
    ...(d === undefined ? {} : { witness: d.witness }),
  }
}

/** Grade a true/false part: the response maps every statement id to true or false; right only when every statement is. */
export function gradeTrueFalsePart(part: TrueFalsePart, key: TrueFalseKey, response: Json | undefined): PartGrade {
  const ids = part.statements.map((s) => s.id)
  const valid =
    typeof response === 'object' &&
    response !== null &&
    !Array.isArray(response) &&
    Object.keys(response).length === ids.length &&
    ids.every((id) => typeof (response as Record<string, Json>)[id] === 'boolean')
  if (!valid) return { part: part.id, ok: null, ungraded: 'outside-language', why: COPY.outsideLanguage(`true or false for each of ${ids.join(', ')}`) }
  const answers = response as Record<string, boolean>
  const wrong = part.statements.filter((s) => answers[s.id] !== key.truth[s.id])
  if (wrong.length === 0) return { part: part.id, ok: true, why: COPY.matched }
  // The first missed statement gives the tag, note and witness; the event keeps the whole response for analysis.
  const first = part.statements.find((s) => s.id === wrong[0]?.id)
  const refutation = first === undefined ? undefined : key.refutations[first.id]
  return {
    part: part.id,
    ok: false,
    why: `${COPY.missed} ${COPY.statementsMissed(wrong.map((s) => s.id))}`,
    ...(first?.origin.kind === 'mutant' ? { misconception: first.origin.tag } : {}),
    ...(first === undefined ? {} : { note: first.why }),
    ...(refutation === undefined ? {} : { witness: refutation }),
  }
}

/**
 * The item's grade from its parts' grades. Any ungraded part leaves the item ungraded; otherwise the item matches
 * only when every part does, and a miss reports the first part that missed.
 */
export function combineParts(parts: readonly PartGrade[], ctx: GradeContext & { readonly response?: Json }): Grade {
  if (parts.length === 0) throw new Error('an item has at least one part')
  const response = ctx.response === undefined ? {} : { response: ctx.response }
  const ungraded = parts.find((p) => p.ok === null)
  if (ungraded !== undefined) return withContext({ ok: null, ungraded: ungraded.ungraded ?? 'outside-language', why: ungraded.why, ...response }, ctx)
  const missed = parts.find((p) => p.ok === false)
  if (missed === undefined) {
    const last = parts[parts.length - 1] as PartGrade
    return withContext(
      {
        ok: true,
        why: COPY.matched,
        ...(last.note === undefined ? {} : { note: last.note }),
        ...(last.witness === undefined ? {} : { witness: last.witness }),
        ...(last.class === undefined ? {} : { class: last.class }),
        ...response,
      },
      ctx,
    )
  }
  return withContext(
    {
      ok: false,
      why: missed.why,
      ...(missed.misconception === undefined ? {} : { misconception: missed.misconception }),
      ...(missed.note === undefined ? {} : { note: missed.note }),
      ...(missed.witness === undefined ? {} : { witness: missed.witness }),
      ...(missed.class === undefined ? {} : { class: missed.class }),
      ...response,
    },
    ctx,
  )
}

/**
 * Grade an item whose parts are choices and true/false sets against its key; constructed parts go to the
 * family's own grader. The answer's keys must be the item's part ids, or the item is ungraded.
 */
export async function gradeItem(
  inst: InstanceBase,
  answer: ItemAnswer,
  key: KeyBase,
  ctx: GradeContext & {
    readonly constructed?: (partId: string, response: Json | undefined) => Promise<PartGrade>
    readonly class?: WitnessClass
  },
): Promise<Grade> {
  const partIds = inst.item.parts.map((p) => p.id)
  const response = answer as unknown as Json
  if (typeof answer !== 'object' || answer === null || Array.isArray(answer)) return ungradedGrade('outside-language', { ...ctx, summary: `an answer for each of ${partIds.join(', ')}`, response })
  const extra = Object.keys(answer).filter((k) => !partIds.includes(k))
  if (extra.length > 0) return ungradedGrade('outside-language', { ...ctx, summary: `answers for ${partIds.join(', ')} only`, response })
  const parts: PartGrade[] = []
  for (const part of inst.item.parts) {
    const r = answer[part.id]
    if (part.kind === 'choice') {
      const k = key.choices.find((c) => c.part === part.id)
      if (!k) throw new Error(`${inst.family}: the key has no choice key for part ${part.id}`)
      parts.push(gradeChoicePart(part, k, r))
    } else if (part.kind === 'multi-tf') {
      const k = key.statements.find((s) => s.part === part.id)
      if (!k) throw new Error(`${inst.family}: the key has no true/false key for part ${part.id}`)
      parts.push(gradeTrueFalsePart(part, k, r))
    } else {
      if (!ctx.constructed) throw new Error(`${inst.family}: part ${part.id} is constructed and the family gave no grader for it`)
      parts.push(await ctx.constructed(part.id, r))
    }
  }
  const g = combineParts(parts, { ...ctx, response })
  return g.ok !== null && ctx.class !== undefined && g.class === undefined ? { ...g, class: ctx.class } : g
}

/** The chance of answering an item by guessing (spine section 8.5): 1 in k per choice, 1 in 2^m per set, none with a constructed part. */
export function chanceOf(item: InstanceBase['item']): { readonly oneIn: number } | 'none' {
  let n = 1
  for (const p of item.parts) {
    if (p.kind === 'constructed') return 'none'
    // 2^m by repeated doubling: exact for any realistic m, and no ** (the determinism lint bans it).
    if (p.kind === 'multi-tf') for (let i = 0; i < p.statements.length; i++) n *= 2
    else n *= p.options.length
  }
  return { oneIn: n }
}
