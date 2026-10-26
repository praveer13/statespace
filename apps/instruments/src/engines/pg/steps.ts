// What one statement of a cell gave back, as data (ARCHITECTURE.md section 6.4, Outputs: rows, row counts and
// SQLSTATE codes as data), and the same thing as psql would print it, so the text output reads like the recorded
// Bench logs. The reply's `witness` carries the steps as JSON for the site's ruled-table renderer
// (apps/site/src/instruments/renderers/pg); the site parses it as data and renders it through text APIs only.

export interface PgColumn {
  readonly name: string
  /** A numeric type (int2/4/8, numeric, float4/8, oid): psql and the table right-align it. */
  readonly numeric: boolean
}

export interface PgMessage {
  readonly severity: string
  readonly code: string
  readonly message: string
  readonly detail?: string
  readonly hint?: string
  readonly where?: string
}

export interface PgStep {
  /** The statement's first line in the cell. */
  readonly line: number
  /** The statement's first line of text, cut to 160 characters. */
  readonly head: string
  /** The server's command tag (`UPDATE 0`, `INSERT 0 1`, `CREATE POLICY`), or null after an error. */
  readonly tag: string | null
  readonly columns: readonly PgColumn[] | null
  /** Text-format values, null for SQL NULL; at most ROWS_SHOWN of them. */
  readonly rows: readonly (readonly (string | null)[])[] | null
  /** How many rows the statement returned, all of them. */
  readonly rowCount: number
  readonly error: PgMessage | null
  readonly notices: readonly PgMessage[]
  /** The transaction state after the statement: idle, in a block, or in a failed block. */
  readonly tx: 'I' | 'T' | 'E'
}

export interface PgWitness {
  readonly pg: 1
  /** `select version()`, verbatim. */
  readonly version: string
  /** The world loaded before the cell's code, or null. */
  readonly world: string | null
  readonly steps: readonly PgStep[]
  /** True when the cell ended inside a transaction block, which was then rolled back. */
  readonly rolledBack: boolean
  /** Steps left out of the witness to keep it under the reply cap; the text output still has them. */
  readonly stepsCut: number
}

export const ROWS_SHOWN = 200

const NUMERIC_OIDS = new Set([20, 21, 23, 26, 700, 701, 1700])
export const isNumericOid = (oid: number): boolean => NUMERIC_OIDS.has(oid)

const flat = (v: string): string => v.replace(/\r?\n/g, '\\n')

/** psql's aligned format: a centred header, ` | ` between columns, numbers to the right, "(n rows)". */
function table(columns: readonly PgColumn[], rows: readonly (readonly (string | null)[])[], rowCount: number): string[] {
  const cells = rows.map((r) => r.map((v) => (v === null ? '' : flat(v))))
  const w = columns.map((c, k) => Math.max(c.name.length, ...cells.map((r) => (r[k] ?? '').length)))
  const centre = (s: string, width: number): string => {
    const left = Math.floor((width - s.length) / 2)
    return ' '.repeat(left) + s + ' '.repeat(width - s.length - left)
  }
  const lines = [columns.map((c, k) => ` ${centre(c.name, w[k])} `).join('|')]
  lines.push(w.map((x) => '-'.repeat(x + 2)).join('+'))
  for (const r of cells) {
    lines.push(
      columns
        .map((c, k) => {
          const v = r[k] ?? ''
          return ` ${c.numeric ? v.padStart(w[k]) : v.padEnd(w[k])} `
        })
        .join('|')
        .replace(/ +$/, ''),
    )
  }
  if (rowCount > rows.length) lines.push(`… ${rowCount - rows.length} more rows not shown`)
  lines.push(`(${rowCount} ${rowCount === 1 ? 'row' : 'rows'})`, '')
  return lines
}

function message(prefix: string, m: PgMessage): string[] {
  const out = [`${prefix}${m.severity}:  ${m.code}: ${m.message}`]
  if (m.detail !== undefined) out.push(`DETAIL:  ${m.detail}`)
  if (m.hint !== undefined) out.push(`HINT:  ${m.hint}`)
  if (m.where !== undefined) out.push(`CONTEXT:  ${m.where}`)
  return out
}

/** The step as psql prints it with VERBOSITY verbose (less the LOCATION line), split into stdout and stderr lines. */
export function psqlLines(s: PgStep): { stream: 'stdout' | 'stderr'; text: string }[] {
  const out: { stream: 'stdout' | 'stderr'; text: string }[] = []
  for (const n of s.notices) for (const t of message(`<cell>:${s.line}: `, n)) out.push({ stream: 'stderr', text: t })
  if (s.error !== null) {
    for (const t of message(`<cell>:${s.line}: `, s.error)) out.push({ stream: 'stderr', text: t })
    return out
  }
  if (s.columns !== null && s.rows !== null) {
    for (const t of table(s.columns, s.rows, s.rowCount)) out.push({ stream: 'stdout', text: t })
    if (s.tag !== null && !/^(SELECT|SHOW|FETCH|EXPLAIN|VALUES|TABLE)\b/.test(s.tag)) out.push({ stream: 'stdout', text: s.tag })
  } else if (s.tag !== null) out.push({ stream: 'stdout', text: s.tag })
  return out
}
