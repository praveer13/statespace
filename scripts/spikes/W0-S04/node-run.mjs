#!/usr/bin/env node
// W0-S04: run every harness job through Spectacle under Node (V8), headless.
//
//   node scripts/spikes/W0-S04/node-run.mjs [jobId ...]
//
// Spectacle's scripts and the driver are loaded as classic scripts into this
// realm with vm.runInThisContext. Module loading uses the "shim" mode (no
// network). Reads jobs from <cache>/jobs (tlc.mjs) and Spectacle from
// <cache>/spectacle (fetch-spectacle.mjs). Writes
// runs/RUN-spectacle-s5s8/spectacle/node.json.
import vm from 'node:vm';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '../../..');
const CACHE = process.env.W0S04_CACHE || path.join(os.tmpdir(), 'statespace-w0s04');
const JS = path.join(CACHE, 'spectacle', 'js');
const JOBS = path.join(CACHE, 'jobs');

async function main() {
  globalThis.require = createRequire(import.meta.url);
  globalThis.__dirname = JS;
  for (const f of ['lib/lodash.min.js', 'hash-sum/hash-sum.js', 'tree-sitter.js', 'eval.js']) {
    vm.runInThisContext(fs.readFileSync(path.join(JS, f), 'utf8'), { filename: f });
  }
  vm.runInThisContext('var enableEvalTracing = false; var parser;');
  vm.runInThisContext(fs.readFileSync(path.join(HERE, 'harness', 'driver.js'), 'utf8'), { filename: 'driver.js' });
  const W = vm.runInThisContext('W0S04');
  const boot = await W.initParser({ languageUrl: path.join(JS, 'tree-sitter-tlaplus.wasm') });

  const index = JSON.parse(fs.readFileSync(path.join(JOBS, 'index.json'), 'utf8'));
  const only = process.argv.slice(2);
  const results = [];
  for (const entry of index) {
    if (only.length && !only.includes(entry.id)) continue;
    const job = JSON.parse(fs.readFileSync(path.join(JOBS, `${entry.id}.json`), 'utf8'));
    const t0 = performance.now();
    const r = await W.runJob(job, { mode: 'shim', native: true, wallMs: 600000 });
    r.wallMs = performance.now() - t0;
    results.push(r);
    const ex = r.explore;
    process.stderr.write(`${entry.id}: ${r.ok ? 'ok' : 'FAIL'} ${ex ? `distinct=${ex.distinct} exact=${ex.distinctExact} first=${ex.first ? ex.first.kind + (ex.first.invariant ? ':' + ex.first.invariant : '') : 'none'} ${ex.ms.toFixed(0)}ms` : (r.parse && !r.parse.ok ? 'parse: ' + r.parse.error.slice(0, 80) : '')}${r.pairs ? ` graphEqual=${r.pairs.graphEqual}` : ''}${r.errors.length ? ' ERR ' + r.errors[0].slice(0, 160) : ''}\n`);
  }
  const fp = [W.fingerprintProbe(100, 100), W.fingerprintProbe(1000, 100), W.fingerprintProbe(1000, 1000)];
  const out = {
    engine: 'node',
    userAgent: `Node.js ${process.version} (V8 ${process.versions.v8})`,
    platform: `${os.type()} ${os.release()} ${os.arch()}`,
    cpus: os.cpus().length,
    parserInitMs: boot.ms,
    fingerprintProbe: fp,
    results
  };
  if (!only.length) {
    const dest = path.join(REPO, 'runs/RUN-spectacle-s5s8/spectacle');
    fs.mkdirSync(dest, { recursive: true });
    fs.writeFileSync(path.join(dest, 'node.json'), JSON.stringify(out, null, 1) + '\n');
  } else {
    console.log(JSON.stringify(out, null, 1));
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
