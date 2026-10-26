// GATE-generators' checks on one family, as pure code (spine section 11.2: "purity, determinism across three
// engines, 2-4 templates, unknown discarded, distractors distinct from keys"). scripts/verify-generators.mjs
// discovers the families, installs the clock-and-entropy guard around these checks, runs the determinism lint
// and the browsers, and reports; the tests run the same checks on planted families.
//
//   contract     the definition holds (defineGenerator's rules)
//   registry     the family, its template count (pending templates included), its misconception tags, its KC tags
//                and each pending template's landing task are the spine's and the tracker's
//   pending      no template stays pending once its engine has a port here. Every check below skips a pending
//                template, which is never drawn, and the report notes when it lands
//   purity       make() gives the same plain-JSON instance on every call, interleaved with other seeds, and
//                carries the seed, band and template it was asked for
//   shape        the item is well formed: options with whys, one reference, mutant tags the family declares,
//                true/false sets with between 1 and m - 1 intended truths
//   templates    the live templates' shapes never coincide (structural, not parameter, variety)
//   banding      every instance's measure falls inside its band's ranges
//   determinism  the sample's digest equals the digest recorded in Chromium, Firefox and WebKit
//   unknown      a key whose checker answers unknown, or stops at its budget, discards the seed; a grade whose
//                checker does so is ungraded; a draw redraws past a discarded seed, deterministically
//   distractors  each kept key confirms the reference and tells every pair of options apart on a witness that
//                replays; no seed is discarded because the checker rejected the generator's own reference
//   grading      the key's answer matches, each distractor misses with its tag, and an answer outside the
//                language is ungraded
//
// Pure: no DOM, storage or network.

import { canonicalJson } from '@statespace/ledger'
import { definitionProblems, discardCause, isDiscard, KC_ID, liveTemplates, pendingTemplates, templateOf } from './define.ts'
import { determinismProblems, familyDigest, sampleSeeds } from './digest.ts'
import type { FamilyDigest, SampleSpec } from './digest.ts'
import { assertInstance, drawInstance } from './draw.ts'
import type { EngineName, EnginePort, InstrumentReply, InstrumentRequest } from './port.ts'
import { formatSeed, seedSequence, successor } from './seed.ts'
import { BANDS } from './types.ts'
import type { Band, Generator, Grade, InstanceBase, ItemAnswer, KeyBase, SampleAnswer, TemplateId } from './types.ts'

export type CheckId = 'contract' | 'registry' | 'pending' | 'purity' | 'shape' | 'templates' | 'banding' | 'determinism' | 'unknown' | 'distractors' | 'grading'

export const CHECK_IDS: readonly CheckId[] = ['contract', 'registry', 'pending', 'purity', 'shape', 'templates', 'banding', 'determinism', 'unknown', 'distractors', 'grading']

export interface Finding {
  readonly check: CheckId
  readonly family: string
  readonly message: string
  /** template/band/seed, when the finding is about one instance. */
  readonly where?: string
}

/** What the gate reads from the spine's registry (packages/ids) and the tracker (tracker/tasks.yaml). */
export interface RegistryView {
  /** Generator families and the template count the spine gives each. */
  readonly generators: ReadonlyMap<string, number>
  readonly misconceptions: ReadonlySet<string>
  readonly kcs: ReadonlySet<string>
  /** Task IDs a pending template may land with; the check is skipped when absent. */
  readonly tasks?: ReadonlySet<string>
}

/** A pending template, as the report lists it. */
export interface PendingNote {
  readonly template: TemplateId
  readonly engine: EngineName
  readonly lands: string
}

export interface CheckOptions {
  /** The digest sample; DEFAULT_SAMPLE when absent. */
  readonly sample?: SampleSpec
  /** Seeds per template and band for the purity, unknown, key and grading checks [D]. */
  readonly keySeeds?: number
  /** A port over the live templates' engines; without one the checks that need a checker report that they could not run. */
  readonly port?: EnginePort
  /** Every engine a port is available for here, so a template cannot stay pending once its engine has one. */
  readonly portEngines?: ReadonlySet<string>
  readonly registry?: RegistryView
  /** The family's committed determinism.json, parsed; undefined when there is none. */
  readonly determinism?: unknown
  /** Skip the determinism comparison (the browser harness computes digests, it does not compare them). */
  readonly skipDeterminism?: boolean
}

export interface FamilyStats {
  readonly instances: number
  readonly keyed: number
  readonly discarded: Readonly<Record<string, number>>
  readonly graded: number
  readonly engineFree: boolean
}

export interface FamilyReport {
  readonly family: string
  readonly fixture: boolean
  readonly findings: readonly Finding[]
  readonly notes: readonly string[]
  readonly stats: FamilyStats
  readonly digest: FamilyDigest | null
  /** The templates the checks skipped because they wait for an engine of a later wave. */
  readonly pending: readonly PendingNote[]
}

export const DEFAULT_KEY_SEEDS = 8

const at = (t: TemplateId, b: Band, seed: number): string => `${t}/b${b}/${formatSeed(seed)}`
const errorText = (e: unknown): string => (e instanceof Error ? e.message : String(e))

/** A port that counts requests and answers each through `answer`. */
function countingPort(answer: (req: InstrumentRequest) => Promise<InstrumentReply>): EnginePort & { count: number } {
  const port = {
    count: 0,
    async run<I, W>(req: InstrumentRequest<I>): Promise<InstrumentReply<W>> {
      port.count += 1
      return (await answer(req as InstrumentRequest)) as InstrumentReply<W>
    },
  }
  return port
}

/** A port whose every engine answers `unknown` (an undecided query). */
export function unknownPort(): EnginePort & { count: number } {
  return countingPort(async (req) => ({
    verdict: { kind: 'unknown', reason: 'injected by GATE-generators' },
    stats: { ms: 0 },
    provenance: { engine: req.engine, version: req.version, build: 'injected', budget: req.budget },
  }))
}

/** A port whose every engine stops at its budget (the bus's budget-exhausted error). */
export function budgetPort(): EnginePort & { count: number } {
  return countingPort(async () => {
    throw Object.assign(new Error('budget exhausted (injected by GATE-generators)'), { code: 'budget-exhausted' })
  })
}

/** The sample answers the core can build for an item: everything right, each wrong option or flipped statement, and one outside the language. */
export function genericSamples(inst: InstanceBase, key: KeyBase): { readonly samples: SampleAnswer[]; readonly constructed: boolean } {
  const right: Record<string, string | Record<string, boolean>> = {}
  let constructed = false
  for (const part of inst.item.parts) {
    if (part.kind === 'choice') {
      const k = key.choices.find((c) => c.part === part.id)
      if (k) right[part.id] = k.answer
    } else if (part.kind === 'multi-tf') {
      const k = key.statements.find((s) => s.part === part.id)
      if (k) right[part.id] = { ...k.truth }
    } else constructed = true
  }
  if (constructed) return { samples: [], constructed }
  const samples: SampleAnswer[] = [{ label: 'the key', answer: right, expect: 'ok' }]
  for (const part of inst.item.parts) {
    if (part.kind === 'choice') {
      for (const o of part.options) {
        if (o.id === right[part.id]) continue
        samples.push({
          label: `option ${o.id} of ${part.id}`,
          answer: { ...right, [part.id]: o.id },
          expect: 'miss',
          ...(o.origin.kind === 'mutant' ? { misconception: o.origin.tag } : {}),
        })
      }
      samples.push({ label: `a response outside ${part.id}'s options`, answer: { ...right, [part.id]: '?' }, expect: 'ungraded' })
    } else if (part.kind === 'multi-tf') {
      const truth = right[part.id] as Record<string, boolean>
      for (const s of part.statements) {
        samples.push({
          label: `statement ${s.id} of ${part.id} flipped`,
          answer: { ...right, [part.id]: { ...truth, [s.id]: !truth[s.id] } },
          expect: 'miss',
          ...(s.origin.kind === 'mutant' ? { misconception: s.origin.tag } : {}),
        })
      }
    }
  }
  return { samples, constructed }
}

function shapeProblems(gen: Generator, inst: InstanceBase): string[] {
  const out: string[] = []
  const t = gen.templates.find((x) => x.id === inst.template)
  const kcs = inst.kcs
  if (!kcs || typeof kcs.primary !== 'string' || !KC_ID.test(kcs.primary)) out.push('the primary KC is not a KC ID')
  else if (t && kcs.primary !== t.kcs.primary && !t.kcs.secondary.includes(kcs.primary)) out.push(`the primary KC ${kcs.primary} is not among ${t.id}'s tags`)
  if (!Array.isArray(kcs?.secondary) || kcs.secondary.length > 2 || !kcs.secondary.every((k) => KC_ID.test(k))) out.push('at most two secondary KC IDs')
  if (inst.bound !== undefined && (typeof inst.bound !== 'string' || inst.bound.trim() === '')) out.push('a bound, when present, is a non-empty sentence')
  const item = inst.item
  if (!item || typeof item.stem !== 'string' || item.stem.trim() === '') out.push('the stem is empty')
  // Families are other tasks' code: check the runtime shape before trusting the types.
  const rawParts: unknown = (item as { parts?: unknown } | undefined)?.parts
  if (!Array.isArray(rawParts) || rawParts.length === 0) return [...out, 'the item has no parts']
  const ids = item.parts.map((p) => p.id)
  if (new Set(ids).size !== ids.length) out.push('two parts share an id')
  const declared = new Set<string>(gen.misconceptions)
  for (const part of item.parts) {
    if (typeof part.prompt !== 'string' || part.prompt.trim() === '') out.push(`part ${part.id}: the prompt is empty`)
    if (part.kind === 'choice') {
      if (part.options.length < 2) out.push(`part ${part.id}: a choice has at least two options`)
      part.options.forEach((o, i) => {
        if (o.id !== String.fromCharCode(65 + i)) out.push(`part ${part.id}: option ${i + 1} is labeled ${JSON.stringify(o.id)}, not ${String.fromCharCode(65 + i)}`)
        if (typeof o.text !== 'string' || o.text.trim() === '') out.push(`part ${part.id}: option ${o.id} has no text`)
        if (typeof o.why !== 'string' || o.why.trim() === '') out.push(`part ${part.id}: option ${o.id} has no why`)
        if (o.origin?.kind === 'mutant' && !declared.has(o.origin.tag)) out.push(`part ${part.id}: option ${o.id}'s tag ${o.origin.tag} is not among the family's misconceptions`)
      })
      if (new Set(part.options.map((o) => o.text)).size !== part.options.length) out.push(`part ${part.id}: two options read the same`)
      const refs = part.options.filter((o) => o.origin?.kind === 'reference').length
      if (refs !== 1) out.push(`part ${part.id}: ${refs} reference options; a choice has exactly one`)
    } else if (part.kind === 'multi-tf') {
      const m = part.statements.length
      if (m < 2) out.push(`part ${part.id}: a true/false set has at least two statements`)
      const truths = part.statements.filter((s) => s.origin?.kind === 'reference').length
      if (truths < 1 || truths > m - 1) out.push(`part ${part.id}: ${truths} of ${m} statements meant true; between 1 and ${m - 1} keeps "all true" and "all false" at zero`)
      for (const s of part.statements) {
        if (typeof s.why !== 'string' || s.why.trim() === '') out.push(`part ${part.id}: statement ${s.id} has no why`)
        if (s.origin?.kind === 'mutant' && !declared.has(s.origin.tag)) out.push(`part ${part.id}: statement ${s.id}'s tag ${s.origin.tag} is not among the family's misconceptions`)
      }
      if (new Set(part.statements.map((s) => s.id)).size !== m) out.push(`part ${part.id}: two statements share an id`)
    } else if (!part.language || typeof part.language.name !== 'string' || part.language.name.trim() === '' || typeof part.language.summary !== 'string' || part.language.summary.trim() === '') {
      out.push(`part ${part.id}: a constructed part names its language and summarizes it`)
    }
  }
  return out
}

function keyProblems(gen: Generator, inst: InstanceBase, key: KeyBase): string[] {
  const out: string[] = []
  if (typeof key.engine !== 'string' || !/^[a-z][a-z0-9-]*@[A-Za-z0-9][A-Za-z0-9._+-]*$/.test(key.engine)) out.push(`the key's engine ${JSON.stringify(key.engine)} is not engine@version`)
  if (inst.bound !== undefined && key.bound === undefined) out.push('the instance is bounded but its key states no bound (I10)')
  if (!Array.isArray(key.choices) || !Array.isArray(key.statements)) return [...out, 'a key lists its choice and true/false keys']
  for (const part of inst.item.parts) {
    if (part.kind === 'choice') {
      const k = key.choices.find((c) => c.part === part.id)
      if (!k) {
        out.push(`no choice key for part ${part.id}`)
        continue
      }
      const ref = part.options.find((o) => o.origin.kind === 'reference')
      if (ref && k.answer !== ref.id) out.push(`part ${part.id}: the checker keyed ${k.answer}, but the reference is ${ref.id}`)
      const want = new Set<string>()
      for (let i = 0; i < part.options.length; i++) for (let j = i + 1; j < part.options.length; j++) want.add(`${(part.options[i] as { id: string }).id}|${(part.options[j] as { id: string }).id}`)
      const got = new Set<string>()
      for (const d of k.distinctions) {
        const pair = [d.a, d.b].sort().join('|')
        got.add(pair)
        if (d.witness === null || d.witness === undefined) out.push(`part ${part.id}: options ${d.a} and ${d.b} have no witness`)
        else if (gen.replay && !gen.replay(inst, part.id, d.a, d.b, d.witness)) out.push(`part ${part.id}: the witness for ${d.a} and ${d.b} does not replay: they agree on ${canonicalJson(d.witness)}`)
      }
      const missing = [...want].filter((p) => !got.has(p))
      if (missing.length > 0) out.push(`part ${part.id}: no witness tells apart ${missing.map((p) => p.replace('|', ' and ')).join(', ')}`)
    } else if (part.kind === 'multi-tf') {
      const k = key.statements.find((s) => s.part === part.id)
      if (!k) {
        out.push(`no true/false key for part ${part.id}`)
        continue
      }
      let trues = 0
      for (const s of part.statements) {
        const v = k.truth[s.id]
        if (typeof v !== 'boolean') {
          out.push(`part ${part.id}: statement ${s.id} has no keyed truth`)
          continue
        }
        if (v) trues += 1
        if (v !== (s.origin.kind === 'reference')) out.push(`part ${part.id}: statement ${s.id} was meant ${s.origin.kind === 'reference'}, the checker keyed ${v}`)
        if (!v && k.refutations[s.id] === undefined) out.push(`part ${part.id}: false statement ${s.id} has no refuting witness`)
      }
      if (trues < 1 || trues > part.statements.length - 1) out.push(`part ${part.id}: ${trues} statements keyed true; a set keeps between 1 and ${part.statements.length - 1}`)
    }
  }
  return out
}

function gradeProblems(sample: SampleAnswer, g: Grade, key: KeyBase): string[] {
  const out: string[] = []
  const want = sample.expect === 'ok' ? true : sample.expect === 'miss' ? false : null
  if (g.ok !== want) out.push(`${sample.label}: graded ${String(g.ok)}, expected ${String(want)}`)
  if (sample.expect === 'ungraded' && g.ungraded === undefined) out.push(`${sample.label}: an ungraded answer says why (unknown, budget or outside-language)`)
  if (sample.expect === 'miss' && sample.misconception !== undefined && g.misconception !== sample.misconception) out.push(`${sample.label}: tagged ${String(g.misconception)}, expected ${sample.misconception}`)
  if (typeof g.why !== 'string' || g.why.trim() === '') out.push(`${sample.label}: the grade has no why`)
  if (typeof g.basis !== 'string' || g.basis.trim() === '') out.push(`${sample.label}: the grade names no basis`)
  if (key.bound !== undefined && g.ok !== null && g.bound === undefined) out.push(`${sample.label}: the key is bounded but the grade prints no bound (I10)`)
  return out
}

/** Run every check on one family. Exceptions from the family's code become findings, never crashes. */
export async function checkFamily(gen: Generator, opts: CheckOptions = {}): Promise<FamilyReport> {
  const findings: Finding[] = []
  const notes: string[] = []
  const add = (check: CheckId, message: string, where?: string): void => {
    findings.push({ check, family: String(gen.id), message, ...(where === undefined ? {} : { where }) })
  }
  const discarded: Record<string, number> = {}
  let instances = 0
  let keyed = 0
  let graded = 0
  let engineFree = true

  try {
    for (const p of definitionProblems(gen)) add('contract', p)
  } catch (e) {
    add('contract', `the definition could not be read: ${errorText(e)}`)
  }
  if (findings.length > 0) return { family: String(gen.id), fixture: gen.fixture === true, findings, notes, stats: { instances, keyed, discarded, graded, engineFree: false }, digest: null, pending: [] }

  // Pending templates count toward the spine's template count and carry KC tags like any other, so the registry
  // reads them; every check after `pending` reads only the live ones.
  const live = liveTemplates(gen)
  const waiting = pendingTemplates(gen)
  const pending: PendingNote[] = waiting.map((t) => ({ template: t.id, engine: t.pending.engine, lands: t.pending.lands }))

  // registry
  const reg = opts.registry
  if (reg) {
    if (!gen.fixture) {
      const n = reg.generators.get(gen.id)
      if (n === undefined) add('registry', `${gen.id} is not a generator family of the spine (section 8.3)`)
      else if (n !== gen.templates.length) add('registry', `the spine gives ${gen.id} ${n} templates; the family defines ${gen.templates.length}${waiting.length > 0 ? `, ${waiting.length} of them pending` : ''}`)
    }
    for (const m of gen.misconceptions) if (!reg.misconceptions.has(m)) add('registry', `${m} is not a misconception key of docs/EVIDENCE.md section 6`)
    for (const t of gen.templates) for (const k of [t.kcs.primary, ...t.kcs.secondary]) if (!reg.kcs.has(k)) add('registry', `${t.id}: ${k} is not a KC of the graph`)
    if (reg.tasks) for (const t of waiting) if (!reg.tasks.has(t.pending.lands)) add('registry', `${t.id}: pending until ${t.pending.lands}, which is not a task of the tracker`)
  } else notes.push('registry: no registry given; the spine checks did not run')

  // pending: declared and counted, never drawn, skipped below, and never pending by accident once a port exists.
  for (const t of waiting) {
    notes.push(`pending: ${t.id} (${t.name}) waits for ${t.pending.engine}, which ${t.pending.lands} brings; the checks below skip it`)
    if (opts.portEngines?.has(t.pending.engine)) {
      add('pending', `${t.id} is pending on ${t.pending.engine}, but a port for ${t.pending.engine} is here: make the template live (remove pending and list ${t.pending.engine} in engines) so the gate checks it`)
    }
  }
  if (waiting.length > 0 && opts.portEngines === undefined) notes.push('pending: no port inventory given, so whether a pending engine already has a port was not checked')
  if (live.length < 2) notes.push(`templates: ${live.map((t) => t.id).join(', ')} is the only live template; structural variety is checked once a second goes live`)

  const keySeeds = opts.keySeeds ?? DEFAULT_KEY_SEEDS
  const seeds = sampleSeeds(opts.sample)
  // Evenly spaced over the sample, so the key checks meet graded seeds, display seeds and the edges alike.
  const take = Math.min(seeds.length, Math.max(keySeeds, 1))
  const checkSeeds = Array.from({ length: take }, (_, i) => seeds[Math.floor((i * seeds.length) / take)] as number)
  const shapes = new Map<TemplateId, Map<string, string>>()

  // purity, shape, banding, templates: on the whole digest sample, which make() covers anyway.
  for (const t of live) {
    const shapeSet = new Map<string, string>()
    shapes.set(t.id, shapeSet)
    for (const band of BANDS) {
      const spec = templateOf(gen, t.id).bands[band]
      for (const seed of seeds) {
        const where = at(t.id, band, seed)
        let first: InstanceBase
        try {
          first = gen.make(seed, band, t.id)
          assertInstance(gen, first, seed, band, t.id)
        } catch (e) {
          add('purity', `make threw: ${errorText(e)}`, where)
          continue
        }
        instances += 1
        let text: string
        try {
          text = canonicalJson(first)
        } catch (e) {
          add('purity', `the instance is not plain JSON data: ${errorText(e)}`, where)
          continue
        }
        if (checkSeeds.includes(seed)) {
          try {
            const other = gen.make(successor(seed), band, t.id)
            void canonicalJson(other)
            const again = canonicalJson(gen.make(seed, band, t.id))
            if (again !== text) add('purity', 'make gave a different instance for the same seed, band and template', where)
          } catch (e) {
            add('purity', `make threw on a repeat: ${errorText(e)}`, where)
          }
        }
        for (const p of shapeProblems(gen, first)) add('shape', p, where)
        let measure: Readonly<Record<string, number>>
        try {
          measure = gen.measure(first)
          const sig = gen.structure(first)
          if (typeof sig !== 'string' || sig === '') add('templates', 'structure() returned no shape', where)
          else if (!shapeSet.has(sig)) shapeSet.set(sig, where)
        } catch (e) {
          add('banding', `measure or structure threw: ${errorText(e)}`, where)
          continue
        }
        for (const [axis, range] of Object.entries(spec)) {
          const v = measure[axis]
          if (typeof v !== 'number' || !Number.isFinite(v)) add('banding', `the measure has no ${axis}`, where)
          else if (v < range[0] || v > range[1]) add('banding', `${axis} ${v} is outside band ${band}'s [${range[0]}, ${range[1]}]`, where)
        }
        for (const axis of Object.keys(measure)) if (!(axis in spec)) add('banding', `the measure's axis ${axis} is not one the bands constrain`, where)
      }
    }
  }
  const owners = new Map<string, TemplateId>()
  for (const [t, set] of shapes) {
    for (const [sig, where] of set) {
      const prior = owners.get(sig)
      if (prior !== undefined) add('templates', `${t} and ${prior} produce the same shape ${sig}: templates must differ in structure, not only in parameters`, where)
      else owners.set(sig, t)
    }
  }

  // determinism
  let digest: FamilyDigest | null = null
  if (!opts.skipDeterminism) {
    try {
      digest = familyDigest(gen, opts.sample)
      for (const p of determinismProblems(opts.determinism, digest, opts.sample)) add('determinism', p)
    } catch (e) {
      add('determinism', `the digest could not be computed: ${errorText(e)}`)
    }
  }

  // unknown, distractors, grading: they need a checker.
  const port = opts.port
  if (!port) {
    add('unknown', `no port over ${gen.engines.join(', ')}: the unknown, distractor and grading checks could not run`)
    return { family: String(gen.id), fixture: gen.fixture === true, findings, notes, stats: { instances, keyed, discarded, graded, engineFree: false }, digest, pending }
  }
  let discardedSeed: { t: TemplateId; band: Band; seed: number } | null = null
  let keyedSeed: { t: TemplateId; band: Band; seed: number } | null = null
  for (const t of live) {
    for (const band of BANDS) {
      let cellKeyed = 0
      for (const seed of checkSeeds) {
        const where = at(t.id, band, seed)
        let inst: InstanceBase
        try {
          inst = gen.make(seed, band, t.id)
        } catch {
          continue // reported above
        }
        // unknown: an undecided checker and a budget stop must both discard.
        for (const [name, stub] of [
          ['unknown', unknownPort()],
          ['budget stop', budgetPort()],
        ] as const) {
          try {
            const k = await gen.key(inst, stub)
            if (stub.count > 0) {
              engineFree = false
              if (!isDiscard(k)) add('unknown', `the checker answered ${name} to all ${stub.count} queries, and the key was kept`, where)
              else {
                const cause = discardCause(k)
                if (cause !== undefined && cause !== 'unknown' && cause !== 'budget') add('unknown', `a ${name} answer discarded the seed as "${cause}", not as unknown or budget`, where)
              }
            }
          } catch (e) {
            add('unknown', `key threw on ${name}: ${errorText(e)}`, where)
          }
        }
        let key: KeyBase | null = null
        try {
          const k = await gen.key(inst, port)
          if (isDiscard(k)) {
            const cause = discardCause(k) ?? 'unspecified'
            discarded[cause] = (discarded[cause] ?? 0) + 1
            if (cause === 'reference-rejected') add('distractors', `the checker rejected the generator's own reference: ${k.discard}`, where)
            discardedSeed ??= { t: t.id, band, seed }
          } else key = k
        } catch (e) {
          add('distractors', `key threw: ${errorText(e)}`, where)
        }
        if (key === null) continue
        keyed += 1
        cellKeyed += 1
        keyedSeed ??= { t: t.id, band, seed }
        for (const p of keyProblems(gen, inst, key)) add('distractors', p, where)
        // grading
        let generic: ReturnType<typeof genericSamples>
        try {
          generic = genericSamples(inst, key)
        } catch (e) {
          add('grading', `no sample answers could be built from the key: ${errorText(e)}`, where)
          continue
        }
        let samples: readonly SampleAnswer[] = generic.samples
        if (generic.constructed) {
          try {
            samples = gen.samples ? gen.samples(inst, key) : []
          } catch (e) {
            add('grading', `samples threw: ${errorText(e)}`, where)
            samples = []
          }
          if (samples.length === 0) add('grading', 'the item has a constructed part and the family gives no sample answers to grade', where)
        }
        for (const s of samples) {
          try {
            const g = await gen.grade(inst, s.answer, key, port)
            graded += 1
            for (const p of gradeProblems(s, g, key)) add('grading', p, where)
            const stub = unknownPort()
            const gu = await gen.grade(inst, s.answer, key, stub)
            if (stub.count > 0 && gu.ok !== null) add('unknown', `${s.label}: the grader's checker answered unknown, and the answer was graded ${String(gu.ok)}`, where)
          } catch (e) {
            add('grading', `${s.label}: grade threw: ${errorText(e)}`, where)
          }
        }
        const outside: ItemAnswer = { '?': 'not a part of this item' }
        try {
          const g = await gen.grade(inst, outside, key, port)
          if (g.ok !== null) add('grading', `an answer naming no part of the item was graded ${String(g.ok)}`, where)
        } catch (e) {
          add('grading', `grade threw on an answer outside the item: ${errorText(e)}`, where)
        }
      }
      if (cellKeyed === 0) {
        // Every sampled seed was discarded: the cell still serves if a draw finds a keyable seed, as a learner's would.
        const first = checkSeeds[0] as number
        try {
          const d = await drawInstance(gen, port, { seed: first, band, template: t.id })
          if (d.status !== 'drawn') add('distractors', `no seed of ${t.id} band ${band} could be keyed (${checkSeeds.length} sampled, ${d.discarded.length} drawn from ${formatSeed(first)}): the cell cannot serve an item`)
        } catch (e) {
          add('distractors', `the draw for ${t.id} band ${band} threw: ${errorText(e)}`)
        }
      }
    }
  }

  // The redraw: a seed whose key is discarded is never served; the next seed is drawn deterministically.
  const target = discardedSeed ?? keyedSeed
  if (target !== null && !engineFree) {
    const forced = discardedSeed === null
    const first = target.seed
    const probe: Generator = forced
      ? { ...gen, key: (inst, p) => (inst.seed === first ? gen.key(inst, unknownPort()) : gen.key(inst, p)) }
      : gen
    try {
      const a = await drawInstance(probe, port, { seed: first, band: target.band, template: target.t })
      const b = await drawInstance(probe, port, { seed: first, band: target.band, template: target.t })
      if (a.status !== 'drawn') add('unknown', `the draw from ${formatSeed(first)} found no keyable seed in ${a.discarded.length} tries`)
      else {
        if (a.seed === first) add('unknown', `the draw served ${formatSeed(first)}, whose key was discarded`)
        if (!a.discarded.some((d) => d.seed === first)) add('unknown', `the draw did not record ${formatSeed(first)} as discarded`)
        const expected = seedSequence(first, a.discarded.length + 1)
        if (a.seed !== expected[expected.length - 1]) add('unknown', `the draw served ${formatSeed(a.seed)}, not the next seed of the sequence`)
        if (b.status !== 'drawn' || b.seed !== a.seed || canonicalJson(b.instance) !== canonicalJson(a.instance)) add('unknown', 'two draws from the same seed served different instances')
      }
    } catch (e) {
      add('unknown', `the draw threw: ${errorText(e)}`)
    }
  } else if (engineFree) notes.push('unknown: the family keys without consulting an engine, so no checker can answer unknown')

  return { family: String(gen.id), fixture: gen.fixture === true, findings, notes, stats: { instances, keyed, discarded, graded, engineFree }, digest, pending }
}
