// Usage: node pglite.mjs <pglite package dir>
import { pathToFileURL } from 'node:url'
import path from 'node:path'
const dir = process.argv[2]
const t0 = performance.now()
const { PGlite } = await import(pathToFileURL(path.join(dir, 'dist/index.js')).href)
const db = new PGlite()
const v = await db.query('select version()')
console.log(Math.round(performance.now()-t0)+'ms', v.rows[0].version)
await db.exec(`create table acct(id int primary key, bal bigint not null check (bal >= 0)); insert into acct values (1, 9223372036854775807), (2, 0);`)
try { await db.query('update acct set bal = bal + 1 where id = 1'); console.log('overflow: no error') } catch (e) { console.log('overflow error', e.code, e.message) }
// three-valued logic: guard with NULL amount silently matches no rows
const r = await db.query('update acct set bal = bal - $1 where id = 2 and bal >= $1 returning bal', [null])
console.log('NULL-amount guarded update rowCount', r.affectedRows, 'rows', JSON.stringify(r.rows))
const iso = await db.query('show transaction_isolation'); console.log('default isolation', iso.rows[0].transaction_isolation)
