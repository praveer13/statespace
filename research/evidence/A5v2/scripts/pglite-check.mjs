// Usage: node pglite-check.mjs <path to pglite package dir>
import { pathToFileURL } from 'node:url'
import path from 'node:path'
const dir = process.argv[2]
const t0 = performance.now()
const { PGlite } = await import(pathToFileURL(path.join(dir, 'dist', 'index.js')).href)
const db = await PGlite.create()
console.log('init ms', Math.round(performance.now() - t0))
console.log((await db.query('select version()')).rows[0].version)
console.log((await db.query("show transaction_isolation")).rows[0])
await db.exec("create table acct(id int primary key, bal bigint); insert into acct values (1, 9223372036854775807)")
try { await db.query('update acct set bal = bal + 1 where id = 1') } catch (e) { console.log('overflow error code', e.code, e.message) }
// NULL guard no-op: UPDATE ... WHERE bal >= NULL updates zero rows
await db.exec("insert into acct values (2, 100)")
const r = await db.query('update acct set bal = bal - 10 where id = 2 and bal >= $1', [null])
console.log('null-guard affectedRows', r.affectedRows)
await db.close()
