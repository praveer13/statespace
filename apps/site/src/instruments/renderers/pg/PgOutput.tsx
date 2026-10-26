// INS-pglite's live result: each statement of the cell in order, with the server's command tag, its rows as a ruled
// table (numbers to the right, SQL NULL written as NULL, never as an empty cell), and any error with its SQLSTATE,
// DETAIL and HINT. The steps come from the reply's witness, parsed here as data; when it is missing or does not
// parse, the psql-style text output stands in. Everything renders through text (ARCHITECTURE.md section 5.7).

import type { RunReply } from '../../protocol.ts'
import './pg.css'

interface Column {
  readonly name: string
  readonly numeric: boolean
}
interface Message {
  readonly severity: string
  readonly code: string
  readonly message: string
  readonly detail?: string
  readonly hint?: string
  readonly where?: string
}
interface Step {
  readonly line: number
  readonly head: string
  readonly tag: string | null
  readonly columns: readonly Column[] | null
  readonly rows: readonly (readonly (string | null)[])[] | null
  readonly rowCount: number
  readonly error: Message | null
  readonly notices: readonly Message[]
}
interface Witness {
  readonly pg: 1
  readonly version: string
  readonly world: string | null
  readonly steps: readonly Step[]
  readonly rolledBack: boolean
  readonly stepsCut: number
}

const str = (v: unknown): v is string => typeof v === 'string'
const isMessage = (m: unknown): m is Message => {
  const o = m as Record<string, unknown> | null
  return o !== null && typeof o === 'object' && str(o.severity) && str(o.code) && str(o.message)
}
const isStep = (s: unknown): s is Step => {
  const o = s as Record<string, unknown> | null
  if (o === null || typeof o !== 'object' || typeof o.line !== 'number' || !str(o.head) || typeof o.rowCount !== 'number') return false
  if (!(o.tag === null || str(o.tag))) return false
  if (!(o.error === null || isMessage(o.error)) || !Array.isArray(o.notices) || !o.notices.every(isMessage)) return false
  if (o.columns === null) return o.rows === null
  if (!Array.isArray(o.columns) || !o.columns.every((c) => c !== null && typeof c === 'object' && str((c as Column).name) && typeof (c as Column).numeric === 'boolean')) return false
  return Array.isArray(o.rows) && o.rows.every((r) => Array.isArray(r) && r.every((v) => v === null || str(v)))
}

export function parsePgWitness(w: string | null): Witness | null {
  if (w === null) return null
  try {
    const v = JSON.parse(w) as Record<string, unknown>
    if (v.pg !== 1 || !str(v.version) || !(v.world === null || str(v.world)) || !Array.isArray(v.steps) || !v.steps.every(isStep)) return null
    return { pg: 1, version: v.version, world: v.world, steps: v.steps, rolledBack: v.rolledBack === true, stepsCut: typeof v.stepsCut === 'number' ? v.stepsCut : 0 }
  } catch {
    return null
  }
}

const n = (x: number): string => x.toLocaleString('en-US')
const flat = (v: string): string => v.replace(/\r?\n/g, ' ⏎ ')

const WORLD_NAMES: Readonly<Record<string, string>> = {
  'S7.L4-world-no-read-policies': "S7.L4's template world without the three read policies",
  'S7.L4-world-all-policies': "S7.L4's template world with every policy",
}

function MessageBlock({ m, kind }: { readonly m: Message; readonly kind: 'error' | 'notice' }) {
  return (
    <div className={kind === 'error' ? 'pg-error' : 'pg-notice'}>
      <p className="pg-msg">
        <strong>
          {m.severity} {m.code}
        </strong>{' '}
        {m.message}
      </p>
      {m.detail !== undefined ? <p className="pg-msg-extra">DETAIL: {m.detail}</p> : null}
      {m.hint !== undefined ? <p className="pg-msg-extra">HINT: {m.hint}</p> : null}
      {m.where !== undefined ? <p className="pg-msg-extra">CONTEXT: {m.where}</p> : null}
    </div>
  )
}

function Rows({ step }: { readonly step: Step }) {
  const cols = step.columns ?? []
  const rows = step.rows ?? []
  return (
    <>
      <div className="pg-table" role="region" aria-label={`Rows of the statement on line ${step.line}`} tabIndex={0}>
        <table>
          <thead>
            <tr>
              {cols.map((c, k) => (
                <th key={k} scope="col" data-numeric={c.numeric ? 'true' : undefined}>
                  {c.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                {cols.map((c, k) => {
                  const v = r[k] ?? null
                  return (
                    <td key={k} data-numeric={c.numeric ? 'true' : undefined}>
                      {v === null ? <span className="pg-null">NULL</span> : flat(v)}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="pg-count">
        ({n(step.rowCount)} {step.rowCount === 1 ? 'row' : 'rows'}
        {step.rowCount > rows.length ? `; the first ${n(rows.length)} shown` : ''})
      </p>
    </>
  )
}

function StepItem({ step }: { readonly step: Step }) {
  const tagShown = step.tag !== null && (step.columns === null || !/^(SELECT|SHOW|FETCH|EXPLAIN|VALUES|TABLE)\b/.test(step.tag))
  return (
    <li className="pg-step" data-kind={step.error !== null ? 'error' : step.columns !== null ? 'rows' : 'command'}>
      <p className="pg-step-head">
        <span className="pg-line">line {step.line}</span> <code className="pg-sql">{step.head}</code>
        {tagShown ? <span className="pg-tag">{step.tag}</span> : null}
      </p>
      {step.notices.map((m, i) => (
        <MessageBlock key={i} m={m} kind="notice" />
      ))}
      {step.error !== null ? <MessageBlock m={step.error} kind="error" /> : null}
      {step.columns !== null ? <Rows step={step} /> : null}
    </li>
  )
}

export function PgOutput({ reply }: { readonly reply: RunReply }) {
  const w = parsePgWitness(reply.witness)
  const text = (
    <div className="code-block cell-live-out" role="region" aria-label="The run as psql-style text" tabIndex={0}>
      <pre>
        {reply.output.map((l, i) => (
          <span key={i} className={l.stream === 'stderr' ? 'cell-live-stderr' : undefined}>
            {l.text}
            {'\n'}
          </span>
        ))}
      </pre>
    </div>
  )
  return (
    <div className="pg-out">
      {w !== null && w.world !== null ? (
        <p className="pg-note">
          Loaded first, as the recorded run did: {WORLD_NAMES[w.world] ?? w.world}. Then the cell's statements, one at a time.
        </p>
      ) : null}
      {w === null ? (
        text
      ) : w.steps.length === 0 ? (
        <p className="cell-pending">The cell holds no SQL statement.</p>
      ) : (
        <ol className="pg-steps">
          {w.steps.map((s, i) => (
            <StepItem key={i} step={s} />
          ))}
        </ol>
      )}
      {w !== null && w.stepsCut > 0 ? <p className="pg-note">{n(w.stepsCut)} later statements are left out of the table; the text below has them all.</p> : null}
      {w !== null && w.rolledBack ? <p className="pg-note">The cell ended inside a transaction block, so it was rolled back, as psql does when it exits.</p> : null}
      {reply.error !== null ? (
        <div className="code-block cell-live-err" role="region" aria-label="The engine's error" tabIndex={0}>
          <pre>{reply.error}</pre>
        </div>
      ) : null}
      <p className="pg-note pg-one">
        One connection: PGlite runs a single session, so these statements ran one after another and nothing here ran
        concurrently. Where this stage shows sessions interleaving, it shows the recorded Bench histories.
      </p>
      {w !== null ? (
        <details className="pg-text">
          <summary>The same run as psql-style text</summary>
          {text}
        </details>
      ) : null}
      {w !== null ? (
        <p className="pg-version">
          <code>select version()</code>: {w.version}
        </p>
      ) : null}
    </div>
  )
}
