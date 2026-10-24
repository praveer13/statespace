#!/usr/bin/env node
// W0-S08: run the specimens of rls-spec.mjs under Node, against PostgreSQL (node-postgres) or PGlite.
//
//   node run-node.mjs --engine pg     --dsn 127.0.0.1:<port> --label pg-18.6      --worlds 200 --out <file.json>
//   node run-node.mjs --engine pglite --pglite @electric-sql/pglite --label pglite-0.5.11-node --worlds 200 --out <file.json>
//
// --pglite names a dependency of this folder's package.json ("@electric-sql/pglite" is 0.5.11, "pglite-0510" is 0.5.10).
// Part 1 (named specimens), Part 2 (seeded worlds) and the single-session specimens run on one connection, in that order.

import { parseArgs } from 'node:util'
import { readFileSync, writeFileSync } from 'node:fs'
import pg from 'pg'
import { SPEC_VERSION, normRow, pgliteExecutor, counting, runPart1, runPart2, runSingleSession, runSerialize } from './rls-spec.mjs'

const { values: a } = parseArgs({
  options: {
    engine: { type: 'string' }, dsn: { type: 'string' }, pglite: { type: 'string', default: '@electric-sql/pglite' },
    label: { type: 'string' }, worlds: { type: 'string', default: '200' }, out: { type: 'string' },
  },
})
if (!a.engine || !a.label || !a.out) { console.error('usage: see the header of run-node.mjs'); process.exit(2) }

function pgExecutor(client) {
  return {
    name: 'pg',
    async run(sql, params = []) {
      try {
        const r = await client.query({ text: sql, values: params, rowMode: 'array' })
        if (r.fields && r.fields.length > 0) return { kind: 'rows', fields: r.fields.map((f) => f.name), rows: r.rows.map(normRow), count: r.rows.length }
        return { kind: 'count', count: r.rowCount ?? 0 }
      } catch (e) {
        return { kind: 'error', sqlstate: e.code ?? null, message: e.message, detail: e.detail ?? null }
      }
    },
  }
}

const started_at = new Date().toISOString()
const t0 = performance.now()
let base, db, client, pkg = null
if (a.engine === 'pg') {
  const [host, port] = a.dsn.split(':')
  client = new pg.Client({ host, port: Number(port), user: 'postgres', database: 'postgres' })
  await client.connect()
  base = pgExecutor(client)
} else if (a.engine === 'pglite') {
  const resolved = import.meta.resolve(a.pglite)
  pkg = JSON.parse(readFileSync(new URL('../package.json', resolved), 'utf8'))
  const { PGlite } = await import(a.pglite)
  db = new PGlite()
  await db.waitReady
  base = pgliteExecutor(db)
} else { console.error('engine must be pg or pglite'); process.exit(2) }

const ex = counting(base)
const version = (await ex.run('SELECT version()')).rows[0][0]
console.error(`[${a.label}] ${version}`)
const worlds = Number(a.worlds)

const part1 = await runPart1(ex)
console.error(`[${a.label}] part 1: ${part1.steps.length} steps, ${part1.checks.filter((c) => c.pass).length}/${part1.checks.length} checks pass`)
const part2 = await runPart2(ex, worlds, { onProgress: (i, n) => console.error(`[${a.label}] part 2: world ${i}/${n}`) })
const singleSession = await runSingleSession(ex)
const serialize = a.engine === 'pglite' ? await runSerialize(db) : null

const result = {
  spec_version: SPEC_VERSION, label: a.label, engine: a.engine, server_version: version,
  package: pkg ? { name: pkg.name, version: pkg.version } : null, node: process.version,
  started_at, duration_s: Math.round((performance.now() - t0)) / 1000,
  statements: { count: ex.st.count, errors: ex.st.errors, ms: Math.round(ex.st.ms) },
  part1, part2: { n: worlds, worlds: part2 }, single_session: singleSession, serialize,
}
writeFileSync(a.out, JSON.stringify(result))
if (client) await client.end()
if (db) await db.close()
console.error(`[${a.label}] done in ${result.duration_s} s, ${result.statements.count} statements, wrote ${a.out}`)
