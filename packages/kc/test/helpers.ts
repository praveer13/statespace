// Shared helpers for the kc tests: the gate's real inputs, read once from the repository by the script's own
// loader, so the tests exercise the files the gate reads in production.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import type { KcInputs } from '../src/check.ts'
import { loadInputs } from '../../../scripts/verify-kc.mjs'
import { parseYaml } from '../../ids/src/yaml-subset.ts'
import { scanBlocks } from '../../ids/src/markdown.ts'

export const ROOT = fileURLToPath(new URL('../../..', import.meta.url))

const loaded = await loadInputs(ROOT)
if ('missing' in loaded) throw new Error(`cannot read ${loaded.missing}`)

/** The gate's inputs as the repository holds them. */
export const realInputs: KcInputs = loaded.inputs

export const read = (rel: string): string => readFileSync(join(ROOT, rel), 'utf8')
export const yaml = (rel: string): unknown => parseYaml(read(rel))
export const spineBlocks = () => scanBlocks(read('docs/spine/SPINE.md'))

/** The registry's entries (packages/ids/src/registry.json). */
export const registry = (JSON.parse(read('packages/ids/src/registry.json')) as { entries: KcInputs['registry'] }).entries

/** packages/content's page reader, loaded at run time so this package's type check does not compile that package. */
export async function parsePageSource(text: string): Promise<{ record: Record<string, unknown> | null; problems: { severity: string; message: string }[] }> {
  const mod = (await import(pathToFileURL(join(ROOT, 'packages/content/src/build/index.ts')).href)) as {
    parsePageSource: (t: string) => { record: Record<string, unknown> | null; problems: { severity: string; message: string }[] }
  }
  return mod.parsePageSource(text)
}

/** A deep copy of the parsed graph document, to plant faults in. */
export const graphDoc = (): Record<string, any> => structuredClone(realInputs.graphDoc) as Record<string, any>

/**
 * S1.L2 written in packages/content's syntax (packages/content/README.md section 1). Its first segment declares
 * `segmentKcs` (`## Title {minutes=N kcs=...}`) and holds a prequestion on both of the lesson's KCs, a cell with an
 * authored Call It, and `segmentItem`; an exit segment, which declares nothing, holds an exit item on both KCs.
 *   case (a): the segment declares both KCs, and its graded item carries only KC-1.three-answers;
 *   case (b): the segment declares only KC-1.three-answers, and its graded item (not a call) carries both.
 */
export function s1l2Source(segmentKcs: readonly string[], segmentItem: string): string {
  return `---
id: S1.L2
tier: bridge
title: "Three answers: sat, unsat, unknown"
draft: true
kcs: [KC-1.three-answers, KC-1.unknown-fails-closed]
---

## Three answers {minutes=15 kcs=${segmentKcs.join(',')}}

::item role=prequestion family=GEN-call-it template=t1 kcs=KC-1.three-answers,KC-1.unknown-fails-closed

:::instrument ins=INS-z3 cell=1 recorded=RUN-z3-unknown-pow
A query Z3 cannot decide.

\`\`\`python
from z3 import *
\`\`\`

@call key=C
What will Z3 return?

- A. \`sat\`
  - why: a solution exists, but the verdict reports this run.
  - mis: dp:Z6
- B. \`unsat\`
  - why: the constraint has a solution.
  - mis: dp:Z5
- C. \`unknown\`
  - why: the reason names the gap.
:::

${segmentItem}

## Exit {minutes=3}

::item role=exit family=GEN-which-stamp template=t1 kcs=KC-1.unknown-fails-closed,KC-1.three-answers
`
}

export const CASE_A = s1l2Source(['KC-1.three-answers', 'KC-1.unknown-fails-closed'], '::item role=segment family=GEN-call-it template=t4 kcs=KC-1.three-answers')
export const CASE_B = s1l2Source(['KC-1.three-answers'], '::item role=segment family=GEN-which-stamp template=t1 kcs=KC-1.three-answers,KC-1.unknown-fails-closed')
