// W0-S01: assemble the three static sites for the instrument-origin spike.
//
// Usage: node build.mjs <engines-dir> <out-dir> [--main <origin>] [--inst <origin>] [--xsite <origin>] [--attacker <origin>]
//
// Defaults are stand-in origins under the reserved .test TLD. To deploy the spike to the real
// hosting plan (an owner action), pass the real origins; they then appear only in <out-dir>,
// never in a committed file (OD-5).
//
// Output:
//   <out>/main/          the main origin: index.html (config A), sandboxed.html (B), xsite.html (C)
//   <out>/instruments/   the instrument origin: sw.js, diag page, b/<buildId>/{host,worker,manifest,engines}
//   <out>/attacker/      a hostile embedder for the negative handshake test
//   <out>/build.json     build id, origins and the engine manifest summary
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.join(HERE, 'site');

export const DEFAULT_ORIGINS = {
  main: 'https://course-domain.test',
  inst: 'https://instruments.course-domain.test',
  xsite: 'https://instruments.other-host.test',
  attacker: 'https://attacker.test',
};

const PYODIDE_FILES = ['pyodide.mjs', 'pyodide.asm.mjs', 'pyodide.asm.wasm', 'python_stdlib.zip', 'pyodide-lock.json'];
const Z3_WHEEL = 'z3_solver-5.3.1.0-py3-none-pyemscripten_2026_0_wasm32.whl';
const TYPES = {
  '.mjs': 'text/javascript', '.js': 'text/javascript', '.wasm': 'application/wasm', '.zip': 'application/zip',
  '.json': 'application/json', '.whl': 'application/octet-stream', '.bin': 'application/octet-stream',
};

const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

function listFiles(dir, base = dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    return d.isDirectory() ? listFiles(p, base) : [path.relative(base, p)];
  }).sort();
}

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

const fill = (text, vars) => text.replace(/__([A-Z_]+)__/g, (m, k) => (k in vars ? vars[k] : m));

export function build(enginesDir, outDir, origins = DEFAULT_ORIGINS) {
  const engineSources = [
    ...PYODIDE_FILES.map((f) => ({ src: path.join(enginesDir, 'pyodide', f), rel: `engines/pyodide/314.0.7/${f}` })),
    { src: path.join(enginesDir, Z3_WHEEL), rel: `engines/z3/5.3.1.0/${Z3_WHEEL}` },
  ].map((e) => ({ ...e, buf: fs.readFileSync(e.src) }));
  const decoyExpected = Buffer.from('statespace W0-S01 decoy: original bytes\n');
  const decoyServed = Buffer.from('statespace W0-S01 decoy: tampered bytes\n');

  // The build id is a content hash over the instrument sources, the engine bytes and the origins.
  const idInput = [
    ...listFiles(path.join(SITE, 'instruments')).map((f) => [f, sha256(fs.readFileSync(path.join(SITE, 'instruments', f)))]),
    ...engineSources.map((e) => [e.rel, sha256(e.buf)]),
    ['origins', JSON.stringify(origins)],
  ];
  const buildId = sha256(Buffer.from(JSON.stringify(idInput))).slice(0, 12);
  const vars = {
    BUILD: buildId,
    ALLOWED_PARENTS: JSON.stringify([origins.main]),
    TOPNAV_CROSS_SITE: origins.attacker ? `${origins.attacker}/landing.html` : '',
  };

  fs.rmSync(outDir, { recursive: true, force: true });
  const inst = path.join(outDir, 'instruments');
  const b = path.join(inst, 'b', buildId);

  for (const f of listFiles(path.join(SITE, 'instruments'))) {
    const text = fs.readFileSync(path.join(SITE, 'instruments', f), 'utf8');
    write(path.join(inst, f.replace(/^b\/BUILD\//, `b/${buildId}/`)), fill(text, vars));
  }
  const assets = engineSources.map((e) => {
    write(path.join(b, e.rel), e.buf);
    return { path: `/b/${buildId}/${e.rel}`, sha256: sha256(e.buf), bytes: e.buf.length, type: TYPES[path.extname(e.rel)] };
  });
  write(path.join(b, 'engines/decoy/tampered.bin'), decoyServed);
  const manifest = {
    build: buildId,
    engines: {
      z3: {
        version: '5.3.1', wheel: '5.3.1.0', pyodide: '314.0.7',
        bytes: assets.reduce((n, a) => n + a.bytes, 0),
        assets,
      },
    },
    decoys: [{
      path: `/b/${buildId}/engines/decoy/tampered.bin`, sha256: sha256(decoyExpected), bytes: decoyExpected.length,
      type: 'application/octet-stream', note: 'the served bytes differ from the listed hash; the service worker must refuse them',
    }],
  };
  write(path.join(b, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

  const page = fs.readFileSync(path.join(SITE, 'main', 'page.html'), 'utf8');
  const main = path.join(outDir, 'main');
  const configs = {
    'index.html': { CONFIG: 'A', INSTRUMENT_ORIGIN: origins.inst, SANDBOX: '' },
    'sandboxed.html': { CONFIG: 'B', INSTRUMENT_ORIGIN: origins.inst, SANDBOX: 'allow-scripts allow-same-origin' },
  };
  if (origins.xsite) configs['xsite.html'] = { CONFIG: 'C', INSTRUMENT_ORIGIN: origins.xsite, SANDBOX: '' };
  for (const [name, v] of Object.entries(configs)) write(path.join(main, name), fill(page, { ...vars, ...v }));
  for (const f of ['main.js', 'navigated.html']) fs.copyFileSync(path.join(SITE, 'main', f), path.join(main, f));

  const attacker = path.join(outDir, 'attacker');
  for (const f of ['attack.html', 'attack.js', 'landing.html']) {
    write(path.join(attacker, f), fill(fs.readFileSync(path.join(SITE, 'attacker', f), 'utf8'), { ...vars, INSTRUMENT_ORIGIN: origins.inst }));
  }

  const info = { buildId, origins, manifest: { bytes: manifest.engines.z3.bytes, assets: assets.map(({ path: p, sha256: h, bytes }) => ({ path: p, sha256: h, bytes })) } };
  write(path.join(outDir, 'build.json'), JSON.stringify(info, null, 2) + '\n');
  return info;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [enginesDir, outDir, ...rest] = process.argv.slice(2);
  if (!enginesDir || !outDir) {
    console.error('usage: node build.mjs <engines-dir> <out-dir> [--main o] [--inst o] [--xsite o|none] [--attacker o]');
    process.exit(2);
  }
  const origins = { ...DEFAULT_ORIGINS };
  for (let i = 0; i < rest.length; i += 2) {
    const k = rest[i].replace(/^--/, '');
    if (!(k in origins)) { console.error(`unknown option ${rest[i]}`); process.exit(2); }
    origins[k] = rest[i + 1] === 'none' ? null : rest[i + 1].replace(/\/$/, '');
  }
  const info = build(path.resolve(enginesDir), path.resolve(outDir), origins);
  console.log(JSON.stringify({ buildId: info.buildId, engineBytes: info.manifest.bytes }));
}
