// W1-T12: run every S1 Python script in Pyodide in Chromium, Firefox and WebKit, one module worker per
// engine, a fresh Python namespace per script (the INS-z3 way). Runs where Playwright's browsers are
// installed: the pinned Playwright container (run it through record.mjs).
//
//   node pyodide-browser.mjs --engines <dir> --inputs <dir> --out <dir> --playwright <index.mjs>
//        [--browsers chromium,firefox,webkit]
//
// <engines> holds pyodide/ (the 314.0.7 npm package) and the Z3 wheel; <inputs> is runs/inputs/S1. A local
// static server stands in for the instrument origin: no COOP or COEP headers, as on static hosting. For each
// browser it writes <out>/<browser>/<RUN-id>.log (the script's lines, as printed) and <out>/<browser>/meta.json
// (versions and times), and prints one summary line per run. Spike code, not product code.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const opt = (name) => argv.flatMap((a, i) => (a === `--${name}` ? [argv[i + 1]] : []))[0];
const enginesDir = path.resolve(opt('engines') ?? '');
const inputsDir = path.resolve(opt('inputs') ?? '');
const outDir = path.resolve(opt('out') ?? '');
const pw = await import(pathToFileURL(path.resolve(opt('playwright') ?? '')).href);
const browsers = (opt('browsers') ?? 'chromium,firefox,webkit').split(',');
const wheel = fs.readdirSync(enginesDir).find((f) => f.endsWith('.whl'));
if (!wheel) throw new Error('no wheel in --engines');

// every run: which script, and the extra files it reads (relative to its folder)
const RUNS = [];
for (const id of fs.readdirSync(inputsDir).filter((d) => d.startsWith('RUN-')).sort()) {
  const dir = path.join(inputsDir, id);
  const script = fs.readdirSync(dir).find((f) => f.endsWith('.py'));
  if (!script) continue;
  const files = [];
  const walk = (rel) => {
    for (const e of fs.readdirSync(path.join(dir, rel), { withFileTypes: true })) {
      if (e.isDirectory()) walk(path.join(rel, e.name));
      else if (e.name.endsWith('.smt2')) files.push({ path: path.join(rel, e.name), text: fs.readFileSync(path.join(dir, rel, e.name), 'utf8') });
    }
  };
  walk('.');
  RUNS.push({ id, name: script, source: fs.readFileSync(path.join(dir, script), 'utf8'), files });
}

const types = { '.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript', '.wasm': 'application/wasm', '.json': 'application/json', '.zip': 'application/zip', '.whl': 'application/octet-stream' };
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x').pathname;
  let file = null;
  if (url === '/') file = path.join(here, 'browser', 'index.html');
  else if (url === '/worker.mjs') file = path.join(here, 'browser', 'worker.mjs');
  else if (url === '/wheel-name') { res.writeHead(200, { 'content-type': 'text/plain' }); return res.end(wheel); }
  else if (url.startsWith('/wheels/')) file = path.join(enginesDir, path.basename(url));
  else if (url.startsWith('/pyodide/')) file = path.join(enginesDir, 'pyodide', path.basename(url));
  if (!file || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': types[path.extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const origin = `http://127.0.0.1:${server.address().port}`;

let failed = false;
for (const name of browsers) {
  const dir = path.join(outDir, name);
  fs.mkdirSync(dir, { recursive: true });
  const browser = await pw[name].launch();
  const meta = { browser: name, version: browser.version(), started_at: new Date().toISOString(), runs: {} };
  const page = await browser.newPage();
  try {
    await page.goto(origin);
    await page.waitForFunction(() => window.ready === true, null, { timeout: 30000 });
    const t0 = Date.now();
    const init = await page.evaluate(() => window.start());
    if (init.error) throw new Error(`init: ${init.error}`);
    Object.assign(meta, { engine: init, init_wall_ms: Date.now() - t0 });
    for (const run of RUNS) {
      const t = Date.now();
      const r = await page.evaluate((job) => window.runJob(job), { name: run.name, source: run.source, files: run.files });
      const lines = r.lines ?? [];
      fs.writeFileSync(path.join(dir, `${run.id}.log`), lines.length ? `${lines.join('\n')}\n` : '');
      meta.runs[run.id] = { script: run.name, wall_ms: Date.now() - t, script_ms: r.ms ?? null, error: r.error ?? null, stderr: r.stderr ?? [] };
      if (r.error) failed = true;
      console.log(`${name} ${run.id}: ${r.error ? `ERROR ${r.error.split('\n').slice(-1)[0]}` : `${lines.length} lines in ${r.ms} ms`}`);
    }
  } catch (e) {
    failed = true;
    meta.error = String(e && e.message ? e.message : e).split('\n')[0];
    console.log(`${name}: FAILED ${meta.error}`);
  }
  meta.finished_at = new Date().toISOString();
  fs.writeFileSync(path.join(dir, 'meta.json'), `${JSON.stringify(meta, null, 2)}\n`);
  await browser.close().catch(() => {});
}
server.close();
process.exit(failed ? 1 : 0);
