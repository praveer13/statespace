// Shared helpers for the GATE-links tests. The planted-fixture tests run the gate on the
// real repository files with one planted defect each, so they exercise the formats the
// gate reads in production; a defect is always added (a row, a line, a marker), never
// patched into text that a spine revision may reword.

import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { checkLinks } from '../src/check.ts'
import type { Inputs, Proposal, Report, SourceFile } from '../src/check.ts'
import { loadInputs } from '../../../scripts/verify-links.mjs'

export const ROOT = fileURLToPath(new URL('../../..', import.meta.url))

/** The gate's inputs, read from the repository. */
export function realInputs(options: { strict?: boolean } = {}): Inputs {
  const inputs = loadInputs(ROOT, options)
  if ('missing' in inputs) throw new Error(`cannot read ${inputs.missing}`)
  if ('invalid' in inputs) throw new Error(inputs.invalid)
  return inputs
}

export interface Edits {
  spine?: (text: string) => string
  evidence?: (text: string) => string
  tasks?: (text: string) => string
  trackerMd?: (text: string) => string
  proposals?: (p: { proposals: Proposal[] }) => { proposals: Proposal[] }
  files?: (files: SourceFile[]) => SourceFile[]
  strict?: boolean
}

/** Run the gate on the repository's files with edits applied. */
export function gate(edits: Edits = {}): Report {
  const base = realInputs({ strict: edits.strict === true })
  const inputs: Inputs = { ...base }
  if (edits.spine) inputs.spine = edits.spine(base.spine)
  if (edits.evidence) inputs.evidence = edits.evidence(base.evidence)
  if (edits.tasks) inputs.tasks = edits.tasks(base.tasks)
  if (edits.trackerMd) inputs.trackerMd = edits.trackerMd(base.trackerMd)
  if (edits.proposals) inputs.proposals = edits.proposals(structuredClone({ proposals: base.proposals?.proposals ?? [] }))
  if (edits.files) inputs.files = edits.files(base.files)
  // The scanned copy of an edited document changes with it.
  const sync: Record<string, string> = { 'docs/spine/SPINE.md': inputs.spine, 'tracker/tasks.yaml': inputs.tasks, 'docs/TRACKER.md': inputs.trackerMd }
  inputs.files = inputs.files.map((f) => (f.path in sync ? { ...f, text: sync[f.path] as string } : f))
  return checkLinks(inputs)
}

/** The failures of one check, optionally those whose message contains (or matches) a text. */
export function failed(report: Report, check: string, text?: string | RegExp) {
  return report.failures.filter((f) => f.check === check && (text === undefined || (typeof text === 'string' ? f.message.includes(text) : text.test(f.message))))
}

/** Append `row` after the last row of the table whose header line starts with `headerStart`. */
export function addRow(spine: string, headerStart: string, row: string): string {
  const lines = spine.split('\n')
  const h = lines.findIndex((l) => l.startsWith(headerStart))
  if (h < 0) throw new Error(`no table header starts with ${headerStart}`)
  let end = h + 2
  while (end < lines.length && (lines[end] as string).startsWith('|')) end++
  lines.splice(end, 0, row)
  return lines.join('\n')
}

/** Insert a row at the end of the lesson table of one stage section (spine "3.n"). */
export function insertInStage(spine: string, section: string, row: string): string {
  const lines = spine.split('\n')
  const start = lines.findIndex((l) => l.startsWith(`### ${section} `))
  const h = lines.findIndex((l, i) => i > start && l.startsWith('| ID | Tier |'))
  let end = h + 2
  while ((lines[end] as string).startsWith('|')) end++
  lines.splice(end, 0, row)
  return lines.join('\n')
}

/** Rewrite a file of a scratch tree. */
export function edit(dir: string, path: string, fn: (text: string) => string): void {
  writeFileSync(join(dir, path), fn(readFileSync(join(dir, path), 'utf8')))
}
