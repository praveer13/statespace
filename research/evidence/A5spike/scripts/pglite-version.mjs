const [, , entry] = process.argv;
const { PGlite } = await import(entry);
const db = new PGlite();
const t0 = Date.now();
const r = await db.query('select version()');
console.log(r.rows[0].version, '| ready+query ms', Date.now() - t0);
try { await db.query("select 9223372036854775807::bigint + 1"); } catch (e) { console.log('bigint+1 ->', e.code, e.message); }
await db.close();
