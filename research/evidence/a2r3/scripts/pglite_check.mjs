// node pglite_check.mjs <node_modules dir>
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
const require = createRequire(process.argv[2] + '/');
const entry = require.resolve('@electric-sql/pglite');
const { PGlite } = await import(pathToFileURL(entry).href);
const db = new PGlite();
console.log((await db.query('select version()')).rows[0].version);
await db.exec('create table acct(id int primary key, bal bigint not null); insert into acct values (1,100);');
// Try to interleave two transactions on the one instance: T1 opens, T2 is issued while T1 is open.
const log = [];
let releaseT1;
const t1 = db.transaction(async (tx) => {
  log.push('T1 begin');
  const r = await tx.query('select bal from acct where id=1'); log.push('T1 read ' + r.rows[0].bal);
  await new Promise((res) => { releaseT1 = res; });
  await tx.query('update acct set bal = $1 where id=1', [r.rows[0].bal - 80]); log.push('T1 write');
});
await new Promise((r) => setTimeout(r, 50));
const t2 = db.transaction(async (tx) => {
  log.push('T2 begin');
  const r = await tx.query('select bal from acct where id=1'); log.push('T2 read ' + r.rows[0].bal);
  await tx.query('update acct set bal = $1 where id=1', [r.rows[0].bal - 80]); log.push('T2 write');
});
await new Promise((r) => setTimeout(r, 200));
log.push('(T2 started while T1 open? ' + log.includes('T2 begin') + ')');
releaseT1();
await t1; await t2;
console.log(log.join(' | '));
console.log('final bal', (await db.query('select bal from acct where id=1')).rows[0].bal);
console.log('overflow:', await db.query('select 9223372036854775807::bigint + 1').then(() => 'no error', (e) => e.code + ' ' + e.message));
