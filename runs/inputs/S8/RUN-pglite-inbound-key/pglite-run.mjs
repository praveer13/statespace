// pglite-run.mjs <dir> <cfg> <mode: whole|split> <file>: run a SQL file on a fresh in-memory PGlite 0.5.11 under Node.
// whole: one db.exec of the file (stops at the first error); split: one db.query per statement split at ";\n".
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
const MOD = '<sandbox>/scripts/spikes/W0-S08/node_modules/@electric-sql/pglite/dist/index.js'
const [dir, cfg, mode, file] = process.argv.slice(2)
const { PGlite } = await import(MOD)
const pkg = JSON.parse(fs.readFileSync(path.join(path.dirname(MOD), '..', 'package.json'), 'utf8'))
const db = new PGlite(); await db.waitReady
const version = (await db.query('select version() as v')).rows[0].v
const sql = fs.readFileSync(path.join(dir, file), 'utf8')
const lines = []
const show = (r) => { if (r.fields?.length) { lines.push(r.fields.map((f) => f.name).join(' | ')); for (const row of r.rows) lines.push(r.fields.map((f) => String(row[f.name])).join(' | ')); lines.push(`(${r.rows.length} rows)`) } else lines.push(`affectedRows ${r.affectedRows ?? 0}`) }
const started_at = new Date().toISOString(); const t0 = performance.now()
let exit = 0
const stmts = mode === 'whole' ? [sql] : sql.split(/;\n/).map((s) => s.replace(/^(--[^\n]*\n)+/g, '').trim()).filter(Boolean)
for (const s of stmts) {
  try { const rs = mode === 'whole' ? await db.exec(s) : [await db.query(s)]; rs.forEach(show) }
  catch (e) { lines.push(`ERROR: ${e.code ?? ''}: ${e.message}`); exit = 1; if (mode === 'whole') break }
}
const duration_s = Math.round(performance.now() - t0) / 1000
await db.close()
const log = lines.join('\n') + '\n'
const wasm = path.join(path.dirname(MOD), 'pglite.wasm')
const res = { cfg, engine: 'pglite', package: `${pkg.name}@${pkg.version}`, version_string: version, node: process.version, mode, file, started_at, duration_s, exit_code: exit, wasm_sha256: fs.existsSync(wasm) ? crypto.createHash('sha256').update(fs.readFileSync(wasm)).digest('hex') : null, log }
fs.mkdirSync(path.join(dir, 'results'), { recursive: true })
fs.writeFileSync(path.join(dir, 'results', `${cfg}.json`), JSON.stringify(res, null, 2))
fs.writeFileSync(path.join(dir, 'results', `${cfg}.log`), log)
console.log(version, res.wasm_sha256); console.log(log)
