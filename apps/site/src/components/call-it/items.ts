// Reducing what content and generators hold to the sheet's two shapes. An authored cell's `call` (a lesson's instrument block)
// becomes a choice; a generated instance, with the key its checker computed, becomes a choice (a three-way verdict, a
// trace-length interval, a which-anomaly question) or a set (multiple true/false). The ref a call is written under is the one
// event@1 allows: call:S{n}.L{k}/c{cell} for a cell, call:GEN-{family}/{template} for a generated item (ARCHITECTURE.md
// section 7.2), and the item's primary KC travels with it, because the call's record is all the Mirror reads.
//
// The generator and key shapes are written structurally, so this folder does not depend on the generator framework. Its own types
// (InstanceBase and KeyBase, packages/generators/src/core/types.ts) are assignable to them as this is written, and no test here
// holds that: the family that builds on the framework (W1-T24) is where the two meet, through itemFromInstance.

import type { LessonInstrumentBlock } from '@statespace/schema'
import type { CallItem, CallOption, CallStatement, ChoiceItem, SetItem } from './types.ts'

/** The ref of a call on an authored cell: `call:S1.L1/c1` for cell 1 of S1.L1. */
export const cellRef = (lesson: string, cell: number): string => `call:${lesson}/c${cell}`

/** The ref of a call on a generated item: `call:GEN-call-it/t1`. */
export const generatedRef = (family: string, template: string): string => `call:${family}/${template}`

export interface CellContext {
  /** The lesson the cell sits in: S1.L1. */
  readonly lesson: string
  /** The segment's primary KC: a cell's call is for its segment's components, the first being primary. */
  readonly kc?: string
  /** engine@version of the run that keyed the call, when the page carries it. */
  readonly engine?: string
}

/**
 * The call of an instrument cell as a choice, or undefined when the cell asks for none (a free-run cell, or a drawer's). The
 * block's `itemRev` is the item's revision when the build has derived it.
 */
export function itemFromCell(block: Pick<LessonInstrumentBlock, 'cell' | 'call' | 'itemRev'>, ctx: CellContext): ChoiceItem | undefined {
  const call = block.call
  if (call === undefined) return undefined
  return {
    form: 'choice',
    identity: { ref: cellRef(ctx.lesson, block.cell) },
    prompt: call.prompt,
    options: call.options.map((o): CallOption => ({ id: o.id, text: o.text, why: o.why, ...(o.mis === undefined ? {} : { mis: o.mis }) })),
    key: call.key,
    ...(ctx.kc === undefined ? {} : { kc: ctx.kc }),
    ...(block.itemRev === undefined ? {} : { rev: block.itemRev }),
    ...(ctx.engine === undefined ? {} : { engine: ctx.engine }),
  }
}

// ---- generated instances

interface OriginLike {
  readonly kind: string
  readonly tag?: string
}

type PartLike =
  | {
      readonly kind: 'choice'
      readonly id: string
      readonly prompt: string
      readonly options: readonly { readonly id: string; readonly text: string; readonly why: string; readonly origin: OriginLike }[]
    }
  | {
      readonly kind: 'multi-tf'
      readonly id: string
      readonly prompt: string
      readonly statements: readonly { readonly id: string; readonly text: string; readonly why: string; readonly origin: OriginLike }[]
    }
  | { readonly kind: 'constructed'; readonly id: string; readonly prompt: string }

/** A generated instance (packages/generators InstanceBase) as far as the sheet reads it. */
export interface InstanceLike {
  readonly family: string
  readonly template: string
  readonly band: number
  readonly seed: number
  readonly kcs: { readonly primary: string }
  readonly item: { readonly stem: string; readonly parts: readonly PartLike[] }
  readonly bound?: string
}

/** The key the family's checker computed for it (packages/generators KeyBase). */
export interface KeyLike {
  readonly engine: string
  readonly choices: readonly { readonly part: string; readonly answer: string }[]
  readonly statements: readonly { readonly part: string; readonly truth: Readonly<Record<string, boolean>> }[]
  readonly bound?: string
}

const tagOf = (o: OriginLike): string | undefined => (o.kind === 'mutant' && typeof o.tag === 'string' ? o.tag : undefined)

/**
 * A generated instance as a call item, or undefined when it is not one the sheet can ask: it must have exactly one part, a
 * choice or a multiple true/false set, and the key must answer it. The family's own `instance` record (its ref and band,
 * which event@1 has no field for) is kept beside the call.
 */
export function itemFromInstance(inst: InstanceLike, key: KeyLike, instanceRef: string): CallItem | undefined {
  if (inst.item.parts.length !== 1) return undefined
  const part = inst.item.parts[0] as PartLike
  const common = {
    identity: { ref: generatedRef(inst.family, inst.template), seed: inst.seed },
    stem: inst.item.stem,
    prompt: part.prompt,
    kc: inst.kcs.primary,
    engine: key.engine,
    ...(key.bound !== undefined ? { bound: key.bound } : inst.bound !== undefined ? { bound: inst.bound } : {}),
    extra: { instance: { ref: instanceRef, band: inst.band } },
  }
  if (part.kind === 'choice') {
    const answer = key.choices.find((c) => c.part === part.id)?.answer
    if (answer === undefined || !part.options.some((o) => o.id === answer)) return undefined
    const item: ChoiceItem = {
      form: 'choice',
      ...common,
      options: part.options.map((o): CallOption => ({ id: o.id, text: o.text, why: o.why, ...(tagOf(o.origin) === undefined ? {} : { mis: tagOf(o.origin) as string }) })),
      key: answer,
    }
    return item
  }
  if (part.kind === 'multi-tf') {
    const truth = key.statements.find((s) => s.part === part.id)?.truth
    if (truth === undefined || part.statements.some((s) => typeof truth[s.id] !== 'boolean')) return undefined
    const item: SetItem = {
      form: 'set',
      ...common,
      statements: part.statements.map((s): CallStatement => ({ id: s.id, text: s.text, why: s.why, truth: truth[s.id] as boolean, ...(tagOf(s.origin) === undefined ? {} : { mis: tagOf(s.origin) as string }) })),
    }
    return item
  }
  return undefined
}
