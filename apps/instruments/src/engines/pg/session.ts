// One PGlite instance, one connection, one cell at a time (ARCHITECTURE.md section 6.4; W0-S08 decision 4). A run
// resets the session, loads the cell's world if it names one, then sends the cell's statements one by one, as psql
// does, and collects each result as data. Two "concurrent" sessions cannot exist here: there is one connection, so
// concurrency is replayed from Bench histories (INS-history), never shown by this engine.
//
// Kept free of worker globals, so the same code runs under Node for a smoke check.

import { splitSql } from './split.ts'
import { ROWS_SHOWN, isNumericOid, psqlLines, type PgColumn, type PgMessage, type PgStep, type PgWitness } from './steps.ts'

/** The slice of PGlite's API this module uses. */
export interface PgDb {
  execProtocol(message: Uint8Array, opts?: { throwOnError?: boolean }): Promise<{ messages: readonly unknown[] }>
  exec(sql: string): Promise<unknown>
  isInTransaction(): boolean
}
export interface PgProtocol {
  readonly serialize: { query(sql: string): Uint8Array }
}

type Line = { stream: 'stdout' | 'stderr'; text: string }

/** Bytes of witness JSON kept; the supervisor's cap is 64 KiB. */
const WITNESS_BUDGET = 60_000

interface Msg {
  readonly name?: string
  readonly fields?: readonly unknown[]
  readonly text?: string
  readonly status?: string
  readonly severity?: string
  readonly code?: string
  readonly message?: string
  readonly detail?: string
  readonly hint?: string
  readonly where?: string
}

function pgMessage(m: Msg): PgMessage {
  return {
    severity: String(m.severity ?? 'ERROR'),
    code: String(m.code ?? ''),
    message: String(m.message ?? ''),
    ...(m.detail ? { detail: String(m.detail) } : {}),
    ...(m.hint ? { hint: String(m.hint) } : {}),
    ...(m.where ? { where: String(m.where) } : {}),
  }
}

export class PgSession {
  private readonly db: PgDb
  private readonly protocol: PgProtocol
  /** True once a cell has run; the next run resets first. */
  private dirty = false

  constructor(db: PgDb, protocol: PgProtocol) {
    this.db = db
    this.protocol = protocol
  }

  /** One statement on the connection, as data. */
  async statement(sql: string, line: number): Promise<PgStep> {
    const r = await this.db.execProtocol(this.protocol.serialize.query(sql), { throwOnError: false })
    let columns: PgColumn[] | null = null
    const rows: (string | null)[][] = []
    let rowCount = 0
    let tag: string | null = null
    let error: PgMessage | null = null
    const notices: PgMessage[] = []
    let tx: PgStep['tx'] = 'I'
    for (const raw of r.messages) {
      const m = raw as Msg
      switch (m.name) {
        case 'rowDescription':
          columns = ((m.fields ?? []) as { name?: unknown; dataTypeID?: unknown }[]).map((f) => ({ name: String(f.name ?? '?'), numeric: isNumericOid(Number(f.dataTypeID)) }))
          break
        case 'dataRow':
          rowCount++
          if (rows.length < ROWS_SHOWN) rows.push((m.fields ?? []).map((v) => (v === null || v === undefined ? null : String(v))))
          break
        case 'commandComplete':
          tag = String(m.text ?? '')
          break
        case 'error':
          error = pgMessage(m)
          break
        case 'notice':
          notices.push(pgMessage(m))
          break
        case 'readyForQuery':
          tx = m.status === 'T' || m.status === 'E' ? m.status : 'I'
          break
      }
    }
    const head = sql.split('\n', 1)[0].slice(0, 160)
    return { line, head, tag: error === null ? tag : null, columns: error === null ? columns : null, rows: error === null && columns !== null ? rows : null, rowCount, error, notices, tx }
  }

  /**
   * Back to a fresh session on the same instance: no transaction, the superuser, every setting reset, and every
   * schema and role a cell made dropped. Returns a reason when the session is not clean afterwards.
   */
  async reset(): Promise<string | null> {
    if (this.db.isInTransaction()) await this.statement('ROLLBACK', 0)
    // RESET SESSION AUTHORIZATION does nothing on PGlite 0.5.11 [X RUN-pglite-rls]; naming postgres works.
    for (const sql of ['SET SESSION AUTHORIZATION postgres', 'RESET ROLE', 'DISCARD ALL']) await this.statement(sql, 0)
    const schemas = await this.statement("SELECT nspname FROM pg_namespace WHERE nspname NOT LIKE 'pg\\_%' AND nspname <> 'information_schema'", 0)
    for (const [s] of schemas.rows ?? []) if (s !== null) await this.statement(`DROP SCHEMA "${s.replace(/"/g, '""')}" CASCADE`, 0)
    const roles = await this.statement("SELECT rolname FROM pg_roles WHERE rolname <> 'postgres' AND rolname NOT LIKE 'pg\\_%'", 0)
    const names = (roles.rows ?? []).map(([r]) => `"${String(r).replace(/"/g, '""')}"`)
    if (names.length > 0) {
      await this.statement(`DROP OWNED BY ${names.join(', ')} CASCADE`, 0)
      for (const r of names) await this.statement(`DROP ROLE ${r}`, 0)
    }
    for (const sql of ['CREATE SCHEMA public AUTHORIZATION pg_database_owner', 'GRANT USAGE ON SCHEMA public TO PUBLIC', 'DISCARD ALL']) await this.statement(sql, 0)
    const check = await this.statement(
      "SELECT current_user, session_user, (SELECT count(*) FROM pg_roles WHERE rolname <> 'postgres' AND rolname NOT LIKE 'pg\\_%'), (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public')",
      0,
    )
    const row = check.rows?.[0]
    if (row === undefined || row[0] !== 'postgres' || row[1] !== 'postgres' || row[2] !== '0' || row[3] !== '0') return `the session did not reset cleanly (${JSON.stringify(row ?? check.error)})`
    return null
  }

  /** Run a cell: reset if a cell ran before, load the world, then the statements; lines stream through `emit`. */
  async run(code: string, world: { readonly id: string; readonly sql: string } | null, version: string, emit: (l: Line) => void): Promise<{ witness: PgWitness; lines: Line[]; verdict: string[] }> {
    if (this.dirty) {
      const bad = await this.reset()
      if (bad !== null) throw Object.assign(new Error(bad), { code: 'engine-crashed' })
    }
    this.dirty = true
    const lines: Line[] = []
    const say = (l: Line): void => {
      lines.push(l)
      emit(l)
    }
    if (world !== null) {
      // The world is the course's own fixture, byte for byte the recorded run's prelude; it runs as the superuser.
      await this.db.exec(world.sql)
      await this.statement('RESET ROLE', 0)
      say({ stream: 'stderr', text: `-- loaded ${world.id} first, as the recorded run did` })
    }
    const steps: PgStep[] = []
    for (const st of splitSql(code)) {
      const step = await this.statement(st.sql, st.line)
      steps.push(step)
      for (const l of psqlLines(step)) say(l)
    }
    const rolledBack = this.db.isInTransaction()
    if (rolledBack) {
      await this.statement('ROLLBACK', 0)
      say({ stream: 'stderr', text: '-- the cell ended inside a transaction block; it was rolled back, as psql does on exit' })
    }
    // Keep the witness under the reply cap: drop rows from the end, then whole steps, never truncate JSON.
    let kept = steps
    let cut = 0
    const size = (s: readonly PgStep[]): number => JSON.stringify(s).length
    while (kept.length > 0 && size(kept) > WITNESS_BUDGET) {
      kept = kept.slice(0, -1)
      cut++
    }
    const verdict = steps.map((s) => (s.error !== null ? `${s.error.severity} ${s.error.code}` : (s.tag ?? '')))
    return { witness: { pg: 1, version, world: world?.id ?? null, steps: kept, rolledBack, stepsCut: cut }, lines, verdict }
  }
}
