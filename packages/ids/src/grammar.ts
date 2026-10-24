// The ID grammar of the statespace spine (docs/spine/SPINE.md, "ID conventions (exact)")
// and a scanner that finds ID tokens in prose, tables, YAML and JSON. Pure: no I/O.

import { blankUrls } from './markdown.ts'

const KEBAB = '[a-z][a-z0-9]*(?:-[a-z0-9]+)*'
const RUN_SLUG = '[a-z0-9]+(?:-[a-z0-9]+)*'

/**
 * Every ID kind, in the order the registry lists them. `pattern` is the exact format of
 * a whole ID (anchored when compiled into a regular expression).
 */
export const KINDS = [
  { kind: 'invariant', pattern: 'I[1-9][0-9]*', example: 'I6' },
  { kind: 'owner-decision', pattern: 'OD-[1-9][0-9]*', example: 'OD-5' },
  { kind: 'stage', pattern: 'S[1-9][0-9]*', example: 'S6' },
  { kind: 'lesson', pattern: 'S[1-9][0-9]*\\.L[0-9]+', example: 'S4.L6' },
  { kind: 'lab', pattern: 'LAB-[1-9][0-9]*', example: 'LAB-6' },
  { kind: 'lab-stage', pattern: 'LAB-[1-9][0-9]*\\.[1-9][0-9]*', example: 'LAB-6.4' },
  { kind: 'lab-check', pattern: 'LAB-[1-9][0-9]*\\.c[1-9][0-9]*', example: 'LAB-6.c4' },
  { kind: 'drawer', pattern: 'D-[0-9]{2}', example: 'D-03' },
  { kind: 'kc', pattern: `KC-[1-9][0-9]*\\.${KEBAB}`, example: 'KC-4.cti-or-bug' },
  { kind: 'specimen', pattern: 'SP-[1-9][0-9]*\\.[1-9][0-9]*', example: 'SP-5.1' },
  { kind: 'claim-template', pattern: 'CL-[1-9][0-9]*\\.[1-9][0-9]*', example: 'CL-2.4' },
  { kind: 'seam', pattern: 'SEAM-[1-9][0-9]*', example: 'SEAM-1' },
  { kind: 'erosion', pattern: 'ER-[1-9][0-9]*', example: 'ER-1' },
  { kind: 'gap-class', pattern: 'G[1-9][0-9]*[a-z]?', example: 'G6c' },
  { kind: 'anchor', pattern: 'AUD-[1-9][0-9]*\\.[1-9][0-9]*', example: 'AUD-2.3' },
  { kind: 'mechanic', pattern: `M-${KEBAB}`, example: 'M-call-it' },
  { kind: 'generator', pattern: `GEN-${KEBAB}`, example: 'GEN-cti-or-bug' },
  { kind: 'instrument', pattern: `INS-${KEBAB}`, example: 'INS-z3' },
  { kind: 'run', pattern: `RUN-${RUN_SLUG}`, example: 'RUN-tlc-doublespend' },
  { kind: 'screen', pattern: `SCR-${KEBAB}`, example: 'SCR-today' },
  { kind: 'gate', pattern: `GATE-${KEBAB}`, example: 'GATE-numbers' },
  { kind: 'brief-change', pattern: 'V2-[0-9]{2}', example: 'V2-07' },
  { kind: 'wave', pattern: 'W[0-6]', example: 'W3' },
  { kind: 'task', pattern: 'W[0-6]-[TS][0-9]{2}', example: 'W3-T11' },
  { kind: 'misconception', pattern: 'dp:[A-Z][1-9][0-9]*', example: 'dp:G4' },
] as const

export type Kind = (typeof KINDS)[number]['kind']

/** Kinds in the order of {@link KINDS}. */
export const KIND_NAMES: readonly Kind[] = KINDS.map((k) => k.kind)

/**
 * The scan regex tries the most specific alternative first at each position (a check
 * before a stage before a lab, a task before a wave) and takes the leftmost token, so
 * the inside of `dp:S5` or `LAB-3.c4` is never read as a second ID. The scan patterns
 * are looser than the exact formats so that a typo (`S1.L11`, `W3-T1`, `V2-7`) is a
 * token that fails to resolve, rather than text that goes unchecked.
 */
const SCAN_ORDER: readonly (readonly [Kind, string])[] = [
  ['misconception', 'dp:[A-Z][0-9]+'],
  ['lab-check', 'LAB-[0-9]+\\.c[0-9]+'],
  ['lab-stage', 'LAB-[0-9]+\\.[0-9]+'],
  ['lab', 'LAB-[0-9]+'],
  ['kc', `KC-[0-9]+\\.${KEBAB}`],
  ['lesson', 'S[1-9][0-9]*\\.L[0-9]+'],
  ['stage', 'S[1-9][0-9]*'],
  ['specimen', 'SP-[0-9]+\\.[0-9]+'],
  ['claim-template', 'CL-[0-9]+\\.[0-9]+'],
  ['seam', 'SEAM-[0-9]+'],
  ['erosion', 'ER-[0-9]+'],
  ['anchor', 'AUD-[0-9]+\\.[0-9]+'],
  ['gap-class', 'G[0-9]+[a-z]?'],
  ['generator', `GEN-${KEBAB}`],
  ['mechanic', `M-${KEBAB}`],
  ['instrument', `INS-${KEBAB}`],
  ['run', `RUN-${RUN_SLUG}`],
  ['screen', `SCR-${KEBAB}`],
  ['gate', `GATE-${KEBAB}`],
  ['drawer', 'D-[0-9]+'],
  ['task', 'W[0-9]-[TS][0-9]+'],
  ['wave', 'W[0-9]'],
  ['owner-decision', 'OD-[0-9]+'],
  ['brief-change', 'V2-[0-9]+'],
  ['invariant', 'I[1-9][0-9]*'],
]

const group = (kind: Kind): string => kind.replaceAll('-', '_')

const SCAN = new RegExp(
  `(?<![A-Za-z0-9-])(?:${SCAN_ORDER.map(([k, p]) => `(?<${group(k)}>${p})`).join('|')})(?![A-Za-z0-9])`,
  'g',
)

/** Exact-format patterns, one per kind, for validating a whole string as an ID. */
export const EXACT = Object.fromEntries(KINDS.map((k) => [k.kind, new RegExp(`^${k.pattern}$`)])) as Record<Kind, RegExp>

/** The kind of a string that is exactly one ID, or null. */
export function kindOfId(id: string): Kind | null {
  for (const k of KINDS) if (EXACT[k.kind].test(id)) return k.kind
  return null
}

/**
 * Tokens that spell an ID's format, not an ID: the spine's `{{run:RUN-id}}` and
 * `[X RUN-id]` placeholders (RUN-id is exempt in GATE-runs too).
 */
export const PLACEHOLDERS: ReadonlySet<string> = new Set(['RUN-id'])

export interface IdToken {
  id: string
  kind: Kind
  line: number
  col: number
}

/**
 * Find every ID token in one line. Link destinations and bare URLs are blanked first. A
 * token that is the stem of a wildcard (`INS-bench-*`, `RUN-lz-*`) or a placeholder is
 * not reported; `**GATE-numbers**` is bold text, not a wildcard.
 */
export function scanLine(line: string, lineNo = 1): IdToken[] {
  const text = blankUrls(line)
  const out: IdToken[] = []
  SCAN.lastIndex = 0
  for (let m = SCAN.exec(text); m !== null; m = SCAN.exec(text)) {
    const id = m[0]
    const end = m.index + id.length
    if (text.startsWith('-*', end) || text.startsWith('.*', end)) continue
    if (PLACEHOLDERS.has(id)) continue
    const groups = m.groups ?? {}
    const hit = SCAN_ORDER.find(([k]) => groups[group(k)] !== undefined)
    if (hit === undefined) continue
    out.push({ id, kind: hit[0], line: lineNo, col: m.index + 1 })
  }
  return out
}

/** Find every ID token in a document. */
export function scanText(text: string): IdToken[] {
  const out: IdToken[] = []
  const lines = text.split('\n')
  for (let i = 0; i < lines.length; i++) out.push(...scanLine(lines[i] as string, i + 1))
  return out
}

/** Every distinct ID of one kind in a string, in order of appearance (a cell's references). */
export function idsOfKind(text: string, kind: Kind): string[] {
  const seen = new Set<string>()
  for (const t of scanLine(text)) if (t.kind === kind) seen.add(t.id)
  return [...seen]
}

/** Every distinct ID of any kind in a string, in order of appearance. */
export function allIds(text: string): string[] {
  return [...new Set(scanLine(text).map((t) => t.id))]
}
