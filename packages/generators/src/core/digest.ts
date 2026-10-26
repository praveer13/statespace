// Determinism digests (I3: "same seed, same instance in three browsers"). A family's sample is a fixed set of
// seeds per template and band, graded and display halves and the edges of the seed space included; its digest is
// the SHA-256 of the canonical JSON of every sampled instance. GATE-generators computes it in Node on every run
// and compares it with the digest Chromium, Firefox and WebKit computed from the same code
// (`determinism.json` beside the family, written by `verify-generators.mjs --engines --write`). The same function
// runs in all four engines, so equal digests mean equal instances.
//
// CORE_REV names the version of this framework's instance and key procedures. It is written into every family's
// determinism.json, so a change to the core that changes what families make or how they key makes every recorded
// digest stale until it is re-recorded in three engines, and the content build's template fingerprint (itemRev)
// changes with the file. Bump it whenever such a change lands.
//
// Pure: no DOM, storage or network.

import { canonicalJson, sha256Hex } from '@statespace/ledger'
import { liveTemplates } from './define.ts'
import { seedSequence } from './seed.ts'
import { BANDS } from './types.ts'
import type { Band, Generator, InstanceBase, KeyBase, TemplateId } from './types.ts'

export const CORE_REV = 'generators-core@1'

/** The digest file's format. */
export const DETERMINISM_SCHEMA = 'statespace/generator-determinism@1'

/** The three browser engines a digest must be confirmed in (spine section 11.2, GATE-generators). */
export const BROWSER_ENGINES = ['chromium', 'firefox', 'webkit'] as const

/** The seeds sampled in every template and band [D]: the edges, then graded and display seeds from fixed starts. */
export interface SampleSpec {
  readonly graded: number
  readonly display: number
}

export const DEFAULT_SAMPLE: SampleSpec = { graded: 48, display: 16 }

const EDGES: readonly number[] = [0x00000000, 0x00000001, 0x7fffffff, 0x80000000, 0xfffffffe, 0xffffffff]
const GRADED_START = 0x0005eed5
const DISPLAY_START = 0x8005eed5

/** The sampled seeds, the same for every family, template and band. */
export function sampleSeeds(spec: SampleSpec = DEFAULT_SAMPLE): number[] {
  const seeds = [...EDGES, ...seedSequence(GRADED_START, spec.graded), ...seedSequence(DISPLAY_START, spec.display)]
  return [...new Set(seeds)]
}

/** A cell of the sample: one template at one band. */
export const cellOf = (template: TemplateId, band: Band): string => `${template}/b${band}`

export interface FamilyDigest {
  readonly family: string
  readonly core: string
  readonly seeds: number
  /** sha256:<hex> per cell. */
  readonly cells: Readonly<Record<string, string>>
  /** sha256:<hex> over the cells. */
  readonly digest: string
}

const sha = (text: string): string => `sha256:${sha256Hex(text)}`

/**
 * The digest of a family's sample. make() is called for every sampled seed of every live template and band; a
 * pending template has no cells, so the digest changes, and must be re-recorded, when it goes live.
 */
export function familyDigest(gen: Pick<Generator<InstanceBase, KeyBase>, 'id' | 'templates' | 'make'>, spec: SampleSpec = DEFAULT_SAMPLE): FamilyDigest {
  const seeds = sampleSeeds(spec)
  const cells: Record<string, string> = {}
  for (const t of liveTemplates(gen)) {
    for (const band of BANDS) {
      const rows = seeds.map((seed) => ({ seed, instance: gen.make(seed, band, t.id) }))
      cells[cellOf(t.id, band)] = sha(canonicalJson(rows))
    }
  }
  return { family: gen.id, core: CORE_REV, seeds: seeds.length, cells, digest: sha(canonicalJson(cells)) }
}

/** One engine's confirmation of a digest, as determinism.json records it. */
export interface EngineDigest {
  readonly engine: string
  readonly version: string
  readonly digest: string
}

/** determinism.json: the digest and the engines that computed it. */
export interface DeterminismRecord {
  readonly schema: typeof DETERMINISM_SCHEMA
  readonly family: string
  readonly core: string
  readonly sample: SampleSpec
  readonly seeds: number
  readonly cells: Readonly<Record<string, string>>
  readonly digest: string
  readonly engines: readonly EngineDigest[]
  /** The run that recorded it. */
  readonly run: string
}

/** Problems with a recorded determinism file against the digest computed now; empty when they agree. */
export function determinismProblems(record: unknown, now: FamilyDigest, spec: SampleSpec = DEFAULT_SAMPLE): string[] {
  if (typeof record !== 'object' || record === null) return ['no determinism.json: record it with --engines --write']
  const r = record as Partial<DeterminismRecord>
  const out: string[] = []
  if (r.schema !== DETERMINISM_SCHEMA) out.push(`schema is ${JSON.stringify(r.schema)}, not ${DETERMINISM_SCHEMA}`)
  if (r.family !== now.family) out.push(`the file is for ${String(r.family)}, not ${now.family}`)
  if (r.core !== now.core) out.push(`recorded under ${String(r.core)}; the core is now ${now.core}: re-record in three engines`)
  if (r.sample?.graded !== spec.graded || r.sample?.display !== spec.display) out.push('recorded with another sample: re-record in three engines')
  if (r.digest !== now.digest) {
    const recorded = r.cells ?? {}
    // A cell present on one side only is a template that went live, or one now pending, since the recording.
    const changed = [...new Set([...Object.keys(now.cells), ...Object.keys(recorded)])].sort().filter((c) => recorded[c] !== now.cells[c])
    out.push(`the instances changed since they were recorded (${changed.length > 0 ? changed.join(', ') : 'the cells differ'}): if the change is intended, re-record in three engines`)
  }
  const engines = Array.isArray(r.engines) ? r.engines : []
  for (const e of BROWSER_ENGINES) {
    const hit = engines.find((x) => x?.engine === e)
    if (!hit) out.push(`no ${e} digest: determinism must be confirmed in Chromium, Firefox and WebKit`)
    else if (hit.digest !== r.digest) out.push(`${e} computed ${String(hit.digest)}, not the recorded ${String(r.digest)}: the instances differ between engines`)
  }
  return out
}
