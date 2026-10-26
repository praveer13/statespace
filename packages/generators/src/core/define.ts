// defineGenerator: a family's definition checked against the contract once, when its module loads, so a
// malformed family fails in its own tests and in GATE-generators' contract check, never in front of a learner.
//
// Pure: no DOM, storage or network.

import { BANDS, TEMPLATE_IDS } from './types.ts'
import type { Band, BandSpec, Discard, Generator, InstanceBase, KeyBase, PendingEngine, TemplateId, TemplateSpec } from './types.ts'

export const GEN_ID = /^GEN-[a-z0-9]+(?:-[a-z0-9]+)*$/
export const KC_ID = /^KC-[1-9][0-9]*\.[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/
export const MISCONCEPTION_KEY = /^dp:[A-Z][0-9]+$/
export const ENGINE_NAME = /^[a-z][a-z0-9-]*$/
/** A tracker task: W{n}-T{nn}, or W0-S{nn} for a W0 spike (tracker/README.md section 2). */
export const TASK_ID = /^W[0-9]+-[TS][0-9]{2,}$/

/** The template counts the spine allows a family, pending templates included (spine section 8.3; GATE-generators). */
export const MIN_TEMPLATES = 2
export const MAX_TEMPLATES = 4

export class GeneratorDefinitionError extends Error {
  readonly problems: readonly string[]

  constructor(id: string, problems: readonly string[]) {
    super(`${id}: ${problems.length} problem(s) in the generator definition: ${problems.join('; ')}`)
    this.name = 'GeneratorDefinitionError'
    this.problems = problems
  }
}

/** A seed the checker could not key. `cause` lets the gate tell a checker's unknown from a generator's bug. */
export interface DiscardOf extends Discard {
  readonly cause: DiscardCause
}

/**
 * Why a seed was discarded: the checker returned unknown or stopped at its budget; two options were equivalent;
 * the instance was vacuous (nothing could violate it); or the checker rejected the generator's own reference,
 * which a correct generator never produces and GATE-generators fails.
 */
export type DiscardCause = 'unknown' | 'budget' | 'equivalent' | 'vacuous' | 'reference-rejected'

export function discard(cause: DiscardCause, reason: string): DiscardOf {
  return Object.freeze({ discard: reason, cause })
}

export function isDiscard(value: unknown): value is Discard {
  return typeof value === 'object' && value !== null && typeof (value as { discard?: unknown }).discard === 'string'
}

/** The cause of a discard, when it carries one. */
export function discardCause(value: Discard): DiscardCause | undefined {
  const c = (value as Partial<DiscardOf>).cause
  return c === 'unknown' || c === 'budget' || c === 'equivalent' || c === 'vacuous' || c === 'reference-rejected' ? c : undefined
}

function bandProblems(t: TemplateSpec): string[] {
  const out: string[] = []
  const specs: BandSpec[] = []
  for (const b of BANDS) {
    const spec = (t.bands as Partial<Record<Band, BandSpec>> | undefined)?.[b]
    if (spec === undefined || typeof spec !== 'object') {
      out.push(`${t.id}: band ${b} has no spec`)
      continue
    }
    for (const [axis, range] of Object.entries(spec)) {
      if (!Array.isArray(range) || range.length !== 2 || !range.every((x) => typeof x === 'number' && Number.isFinite(x))) {
        out.push(`${t.id}: band ${b} axis ${axis} is not a [min, max] pair of numbers`)
      } else if ((range[0] as number) > (range[1] as number)) {
        out.push(`${t.id}: band ${b} axis ${axis} has min ${range[0]} above max ${range[1]}`)
      }
    }
    specs.push(spec)
  }
  if (out.length > 0 || specs.length !== BANDS.length) return out
  const axes = Object.keys(specs[0] as BandSpec).sort()
  if (axes.length === 0) out.push(`${t.id}: the bands constrain no axis`)
  for (let i = 1; i < specs.length; i++) {
    const these = Object.keys(specs[i] as BandSpec).sort()
    if (these.join(',') !== axes.join(',')) out.push(`${t.id}: band ${i + 1} constrains ${these.join(', ')} but band 1 constrains ${axes.join(', ')}`)
  }
  if (out.length > 0) return out
  // Axes are oriented so that larger is harder. A band never asks for less than the band below it, and each band
  // asks for more than the one below on at least one axis.
  for (let i = 1; i < specs.length; i++) {
    const lo = specs[i - 1] as BandSpec
    const hi = specs[i] as BandSpec
    let rises = false
    for (const axis of axes) {
      const [a0, a1] = lo[axis] as readonly [number, number]
      const [b0, b1] = hi[axis] as readonly [number, number]
      if (b0 < a0 || b1 < a1) out.push(`${t.id}: band ${i + 1} axis ${axis} [${b0}, ${b1}] falls below band ${i}'s [${a0}, ${a1}]`)
      if (b0 > a0 || b1 > a1) rises = true
    }
    if (!rises) out.push(`${t.id}: band ${i + 1} asks for nothing more than band ${i}`)
  }
  return out
}

/** A pending template's problems: `{engine, lands}` with an engine the family cannot reach yet and a tracker task. */
function pendingProblems(t: TemplateSpec, engines: readonly unknown[]): string[] {
  const p: unknown = (t as { pending?: unknown }).pending
  if (p === undefined) return []
  if (typeof p !== 'object' || p === null || Array.isArray(p)) return [`${t.id}: pending must be { engine, lands }`]
  const { engine, lands } = p as { engine?: unknown; lands?: unknown }
  const out: string[] = []
  if (typeof engine !== 'string' || !ENGINE_NAME.test(engine)) out.push(`${t.id}: the pending engine ${JSON.stringify(engine)} is not an engine name`)
  else if (engines.includes(engine)) {
    out.push(`${t.id}: pending on ${engine}, which the family lists among its live templates' engines; a template is pending only on an engine the family cannot consult yet`)
  }
  if (typeof lands !== 'string' || !TASK_ID.test(lands)) out.push(`${t.id}: pending.lands ${JSON.stringify(lands)} is not a tracker task ID such as W3-T27`)
  return out
}

/** Every way a definition breaks the contract; empty when it holds. */
export function definitionProblems(def: Generator<InstanceBase, KeyBase>): string[] {
  const out: string[] = []
  if (typeof def.id !== 'string' || !GEN_ID.test(def.id)) out.push(`the id ${JSON.stringify(def.id)} is not a GEN- ID`)
  if (typeof def.title !== 'string' || def.title.trim() === '') out.push('the title is empty')
  if (typeof def.fixture !== 'boolean') out.push('fixture must be true or false')
  const templates: readonly TemplateSpec[] = Array.isArray(def.templates) ? def.templates : []
  const n = templates.length
  if (n < MIN_TEMPLATES || n > MAX_TEMPLATES) out.push(`a family has ${MIN_TEMPLATES} to ${MAX_TEMPLATES} templates, pending ones included, this one ${n}`)
  const objects = templates.filter((t) => typeof t === 'object' && t !== null)
  if (objects.length > 0 && objects.every((t) => t.pending !== undefined)) out.push('every template is pending: a family serves at least one template now')
  const engines: readonly unknown[] = Array.isArray(def.engines) ? def.engines : []
  const names = new Set<string>()
  templates.forEach((t, i) => {
    if (typeof t !== 'object' || t === null) {
      out.push(`template ${i + 1} is not an object`)
      return
    }
    const want = TEMPLATE_IDS[i]
    if (t.id !== want) out.push(`template ${i + 1} must be ${String(want)}, not ${JSON.stringify(t.id)}`)
    if (typeof t.name !== 'string' || t.name.trim() === '') out.push(`${t.id}: the name is empty`)
    else if (names.has(t.name)) out.push(`${t.id}: the name ${JSON.stringify(t.name)} repeats`)
    else names.add(t.name)
    const kcs = t.kcs
    if (!kcs || typeof kcs.primary !== 'string' || !KC_ID.test(kcs.primary)) out.push(`${t.id}: the primary KC is not a KC ID`)
    const secondary = Array.isArray(kcs?.secondary) ? kcs.secondary : null
    if (secondary === null) out.push(`${t.id}: secondary KCs must be a list`)
    else {
      if (secondary.length > 2) out.push(`${t.id}: at most two secondary KCs, not ${secondary.length}`)
      for (const k of secondary) if (typeof k !== 'string' || !KC_ID.test(k)) out.push(`${t.id}: secondary ${JSON.stringify(k)} is not a KC ID`)
      if (new Set([kcs.primary, ...secondary]).size !== secondary.length + 1) out.push(`${t.id}: a KC repeats among the tags`)
    }
    out.push(...bandProblems(t))
    out.push(...pendingProblems(t, engines))
  })
  if (!Array.isArray(def.engines) || def.engines.length === 0) out.push('a family names at least one engine')
  else for (const e of def.engines) if (typeof e !== 'string' || !ENGINE_NAME.test(e)) out.push(`the engine ${JSON.stringify(e)} is not an engine name`)
  if (!Array.isArray(def.misconceptions)) out.push('misconceptions must be a list')
  else {
    for (const m of def.misconceptions) if (typeof m !== 'string' || !MISCONCEPTION_KEY.test(m)) out.push(`${JSON.stringify(m)} is not a dp: misconception key`)
    if (new Set(def.misconceptions).size !== def.misconceptions.length) out.push('a misconception tag repeats')
  }
  for (const fn of ['make', 'key', 'grade', 'measure', 'structure'] as const) if (typeof def[fn] !== 'function') out.push(`${fn} is not a function`)
  for (const fn of ['replay', 'samples'] as const) if (def[fn] !== undefined && typeof def[fn] !== 'function') out.push(`${fn} is not a function`)
  return out
}

/** A family, checked against the contract; throws a GeneratorDefinitionError listing every problem. */
export function defineGenerator<I extends InstanceBase, K extends KeyBase>(def: Generator<I, K>): Generator<I, K> {
  const problems = definitionProblems(def as unknown as Generator<InstanceBase, KeyBase>)
  if (problems.length > 0) throw new GeneratorDefinitionError(String(def.id), problems)
  const freeze = (t: TemplateSpec): TemplateSpec => Object.freeze({ ...t, ...(t.pending === undefined ? {} : { pending: Object.freeze({ ...t.pending }) }) })
  return Object.freeze({ ...def, templates: Object.freeze(def.templates.map(freeze)) })
}

/** The template spec of a family, or a RangeError for one it does not have. */
export function templateOf(gen: Pick<Generator<InstanceBase, KeyBase>, 'id' | 'templates'>, id: string): TemplateSpec {
  const t = gen.templates.find((x) => x.id === id)
  if (!t) throw new RangeError(`${gen.id} has no template ${JSON.stringify(id)}`)
  return t
}

/** A template waiting for an engine of a later wave. */
export type PendingTemplate = TemplateSpec & { readonly pending: PendingEngine }

/** True for a template that waits for an engine of a later wave (TemplateSpec.pending). */
export const isPending = (t: TemplateSpec): t is PendingTemplate => t.pending !== undefined

/** The templates a family serves now, in order: every template that is not pending. */
export function liveTemplates(gen: Pick<Generator<InstanceBase, KeyBase>, 'templates'>): readonly TemplateSpec[] {
  return gen.templates.filter((t) => !isPending(t))
}

/** The templates a family declares but cannot serve yet, in order. */
export function pendingTemplates(gen: Pick<Generator<InstanceBase, KeyBase>, 'templates'>): readonly PendingTemplate[] {
  return gen.templates.filter(isPending)
}

/** Thrown when a pending template is asked for an item: it is declared, never drawn, until its engine lands. */
export class PendingTemplateError extends RangeError {
  readonly family: string
  readonly template: TemplateId
  readonly pending: PendingEngine

  constructor(family: string, t: PendingTemplate) {
    super(`${family} ${t.id} (${t.name}) is pending until ${t.pending.lands} brings ${t.pending.engine}: it is never drawn`)
    this.name = 'PendingTemplateError'
    this.family = family
    this.template = t.id
    this.pending = t.pending
  }
}

/** The spec of a template the family serves now: a RangeError for one it does not have, a PendingTemplateError for a pending one. */
export function liveTemplateOf(gen: Pick<Generator<InstanceBase, KeyBase>, 'id' | 'templates'>, id: string): TemplateSpec {
  const t = templateOf(gen, id)
  if (isPending(t)) throw new PendingTemplateError(String(gen.id), t)
  return t
}

/** True for a band. */
export const isBand = (b: unknown): b is Band => b === 1 || b === 2 || b === 3
