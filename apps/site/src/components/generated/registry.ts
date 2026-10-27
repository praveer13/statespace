// The generator families this site can draw from, loaded on first use so a page without a generated item never
// downloads one. A family module is packages/generators/src/<slug>/index.ts: it exports `generator`, and `ports`
// for the engines it runs as plain code in the tab (the negate box). A family whose checker needs an engine on the
// instrument origin waits until the bus serves generated items, and stays out of this table until then.
//
// To make a new family live on the site: add one line to LOADERS below. Nothing else on the site changes.

import type { EnginePort, Generator, InstanceBase, InstrumentReply, InstrumentRequest, KeyBase, TemplateId } from '@statespace/generators/core'
import { isPending } from '@statespace/generators/core'
import templateIndex from './templates.generated.json'

export interface FamilyModule {
  readonly generator: Generator<InstanceBase, KeyBase>
  readonly ports?: Readonly<Record<string, EnginePort>>
}

const LOADERS: Readonly<Record<string, () => Promise<FamilyModule>>> = {
  'GEN-negate-it': () => import('@statespace/generators/negate-it') as unknown as Promise<FamilyModule>,
  'GEN-spec-it': () => import('@statespace/generators/spec-it') as unknown as Promise<FamilyModule>,
  'GEN-proof-structure': () => import('@statespace/generators/proof-structure') as unknown as Promise<FamilyModule>,
  'GEN-spot-the-gap': () => import('@statespace/generators/spot-the-gap') as unknown as Promise<FamilyModule>,
  'GEN-trace-allowed': () => import('@statespace/generators/trace-allowed') as unknown as Promise<FamilyModule>,
  'GEN-lasso-or-not': () => import('@statespace/generators/lasso-or-not') as unknown as Promise<FamilyModule>,
  'GEN-anomaly-id': () => import('@statespace/generators/anomaly-id') as unknown as Promise<FamilyModule>,
  'GEN-leaks-to-observer': () => import('@statespace/generators/leaks-to-observer') as unknown as Promise<FamilyModule>,
  'GEN-find-the-witness': () => import('@statespace/generators/find-the-witness') as unknown as Promise<FamilyModule>,
  'GEN-call-it': () => import('@statespace/generators/call-it') as unknown as Promise<FamilyModule>,
  'GEN-which-stamp': () => import('@statespace/generators/which-stamp') as unknown as Promise<FamilyModule>,
  'GEN-wp-it': () => import('@statespace/generators/wp-it') as unknown as Promise<FamilyModule>,
  'GEN-cti-or-bug': () => import('@statespace/generators/cti-or-bug') as unknown as Promise<FamilyModule>,
  'GEN-defend': () => import('@statespace/generators/defend') as unknown as Promise<FamilyModule>,
}

/** The families this build draws from, in a stable order. */
export const LIVE_FAMILIES: readonly string[] = Object.keys(LOADERS).sort()

export const isLiveFamily = (family: string): boolean => family in LOADERS

/** A live template as the template index lists it: its id and its primary KC. */
export interface TemplateEntry {
  readonly template: string
  readonly primary: string
}

const INDEX = (templateIndex as { families: Readonly<Record<string, readonly TemplateEntry[]>> }).families

/**
 * The family's live templates without loading the family (scripts/site/build-templates.mjs writes the index from the
 * families' own declarations at build time), in the family's order; empty for a family this build has no generator for.
 */
export const templatesOf = (family: string): readonly TemplateEntry[] => (family in LOADERS ? (INDEX[family] ?? []) : [])

const loaded = new Map<string, Promise<FamilyModule>>()

/** The family's module, or null when this build has no generator for it. */
export function loadFamily(family: string): Promise<FamilyModule> | null {
  const load = LOADERS[family]
  if (load === undefined) return null
  let p = loaded.get(family)
  if (p === undefined) {
    p = load()
    loaded.set(family, p)
  }
  return p
}

/** True when the family defines the template and the template is not waiting for a later engine. */
export function isLiveTemplate(mod: FamilyModule, template: string): template is TemplateId {
  const spec = mod.generator.templates.find((t) => t.id === template)
  return spec !== undefined && !isPending(spec)
}

/** Error with a bus error code, as the instrument bus rejects a request. */
class PortError extends Error {
  readonly code: string
  constructor(code: string, message: string) {
    super(message)
    this.code = code
  }
}

/** One port over the family's own engines; a request for any other engine is refused, never answered. */
export function portOf(mod: FamilyModule): EnginePort {
  const ports = mod.ports ?? {}
  return {
    run<I, W>(req: InstrumentRequest<I>): Promise<InstrumentReply<W>> {
      const port = ports[req.engine]
      if (port === undefined) return Promise.reject(new PortError('unknown-engine', `no engine ${req.engine} runs in this page`))
      return port.run<I, W>(req)
    },
  }
}
