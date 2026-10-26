// Validation against schemas/lesson.schema.json, through @statespace/schema's validator: the same checks that
// GATE-schema runs in TypeScript and Python. The schema's root dispatches on the record's id (a page, a stage or a
// lab) and the definition the id selects judges the record; this checker asks for that definition directly, so a
// record of the wrong kind is reported at its id, and a page is checked as a whole. A block that fails is checked
// again against its own type's definition, because a failed oneOf says only that no alternative matched; the
// block's own definition says which field is wrong.

import { SCHEMA_DOCUMENTS, createRegistry } from '@statespace/schema'
import type { SchemaDocument, ValidationIssue } from '@statespace/schema'

const LESSON = 'urn:statespace:lesson@1'
const BLOCK_DEFS = { prose: 'proseBlock', instrument: 'instrumentBlock', item: 'itemBlock', claim: 'claimBlock', specimen: 'specimenBlock', card: 'cardBlock' } as const
const WRAPPED = [...Object.values(BLOCK_DEFS), 'page', 'stage', 'lab'] as const

export interface SchemaIssue {
  /** A JSON Pointer into the checked record. */
  path: string
  keyword: string
  message: string
}

export interface SchemaChecker {
  /** Check a lesson or drawer record against the page definition. */
  page(record: unknown): SchemaIssue[]
  /** Check a stage record (content/stages/S1/stage.yaml) against the stage definition. */
  stage(record: unknown): SchemaIssue[]
  /** Check a lab record (content/stages/S1/lab.yaml) against the lab definition. */
  lab(record: unknown): SchemaIssue[]
  /**
   * Check a record of any of the three kinds against the schema's root, which picks the definition by the id: the
   * verdict GATE-schema reaches on the same record, in TypeScript and in Python.
   */
  record(record: unknown): SchemaIssue[]
}

const isObject = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v)

/** A checker over the published schemas, or over a set of documents of your own. */
export function makeSchemaChecker(documents: readonly SchemaDocument[] = SCHEMA_DOCUMENTS): SchemaChecker {
  const wrappers: SchemaDocument[] = WRAPPED.map((def) => ({
    name: `lesson-${def}`,
    id: `urn:statespace:lesson-${def}@1`,
    schema: null,
    json: { $ref: `${LESSON}#/$defs/${def}` },
  }))
  const registry = createRegistry([...documents, ...wrappers])
  const issues = (name: string, value: unknown): SchemaIssue[] => registry.compileSchema(name)(value).map(toIssue)
  const toIssue = (i: ValidationIssue): SchemaIssue => ({ path: i.instancePath, keyword: i.keyword, message: i.message })

  /** A failed block is checked again against its own type's definition, so the issue names the field. */
  const drill = (record: unknown, found: SchemaIssue[]): SchemaIssue[] => {
    const out: SchemaIssue[] = []
    for (const issue of found) {
      const m = /^\/segments\/(\d+)\/blocks\/(\d+)$/.exec(issue.path)
      if (issue.keyword !== 'oneOf' || m === null || !isObject(record)) {
        out.push(issue)
        continue
      }
      const segment = (record.segments as unknown[] | undefined)?.[Number(m[1])]
      const block = isObject(segment) ? (segment.blocks as unknown[] | undefined)?.[Number(m[2])] : undefined
      const type = isObject(block) ? block.type : undefined
      if (typeof type !== 'string' || !(type in BLOCK_DEFS)) {
        out.push({ ...issue, message: `is not one of the six block types (prose, instrument, item, claim, specimen, card)` })
        continue
      }
      for (const inner of issues(`lesson-${BLOCK_DEFS[type as keyof typeof BLOCK_DEFS]}`, block)) out.push({ ...inner, path: `${issue.path}${inner.path}` })
    }
    return out
  }

  return {
    page: (record) => drill(record, issues('lesson-page', record)),
    stage: (record) => issues('lesson-stage', record),
    lab: (record) => issues('lesson-lab', record),
    record: (record) => drill(record, issues('lesson', record)),
  }
}
