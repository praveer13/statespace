// Usage: node pglite-tx.mjs <pglite package dir>
import { pathToFileURL } from 'node:url'
import path from 'node:path'
const { PGlite } = await import(pathToFileURL(path.join(process.argv[2], 'dist/index.js')).href)
const db = new PGlite()
await db.exec(`create table acct(id int primary key, bal bigint not null); insert into acct values (1, 100);`)
const t0 = performance.now(); const log = (s) => console.log(Math.round(performance.now() - t0) + 'ms', s)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
// application-level read-modify-write, two "workers" interleaved as tightly as the API allows
const worker = (name, delay) => db.transaction(async (tx) => {
  const r = await tx.query('select bal from acct where id = 1'); log(`${name} read ${r.rows[0].bal}`)
  await sleep(delay)
  if (Number(r.rows[0].bal) >= 80) { await tx.query('update acct set bal = $1 where id = 1', [Number(r.rows[0].bal) - 80]); log(`${name} wrote ${Number(r.rows[0].bal) - 80}`) }
})
await Promise.all([worker('W1', 300), worker('W2', 0)])
log('final bal ' + (await db.query('select bal from acct where id = 1')).rows[0].bal)
