// W0-S01: fetch the pinned engine assets for the instrument-origin spike and verify them.
//
// Usage: node fetch-engines.mjs <out-dir>
//
// Downloads Pyodide 314.0.7 (npm tarball, checked against the registry's sha512 integrity)
// and the z3_solver 5.3.1.0 pyemscripten wheel (checked against PyPI's sha256), then extracts
// the tarball with the system `tar`. Nothing downloaded here is executed on the host: the
// files are served to browsers inside the Playwright container. Third-party copies are never
// committed (research/evidence/THIRD-PARTY.md); this script restores them on demand.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

export const PINS = {
  pyodide: {
    version: '314.0.7',
    url: 'https://registry.npmjs.org/pyodide/-/pyodide-314.0.7.tgz',
    integrity: 'sha512-0YvXxEhfEdpLfb/XkM2BFAeMROq0iMUX2bzzH9pOttyMcWkwq+HbE5uyuGD82LN7y2q+SNvi/6V5JEsOlD2R1A==',
    license: 'MPL-2.0',
  },
  z3: {
    version: '5.3.1.0',
    file: 'z3_solver-5.3.1.0-py3-none-pyemscripten_2026_0_wasm32.whl',
    url: 'https://files.pythonhosted.org/packages/7b/05/574cc7c432cbd8dd2f29fce6dbe0dffc3dc34d48ec73723de44dc3905489/z3_solver-5.3.1.0-py3-none-pyemscripten_2026_0_wasm32.whl',
    sha256: '62143abf1f1f94e9b1c173db60b2f6b747f4b0780da81f4b05342bdef006bf90',
    license: 'MIT',
  },
};

async function download(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url}: HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

function hash(alg, buf, enc) {
  return crypto.createHash(alg).update(buf).digest(enc);
}

export async function fetchEngines(outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  const report = {};

  // Pyodide: npm tarball, sha512 integrity.
  const tgzPath = path.join(outDir, 'pyodide-314.0.7.tgz');
  let tgz = fs.existsSync(tgzPath) ? fs.readFileSync(tgzPath) : await download(PINS.pyodide.url);
  const integrity = 'sha512-' + hash('sha512', tgz, 'base64');
  if (integrity !== PINS.pyodide.integrity) throw new Error(`pyodide tarball integrity mismatch: ${integrity}`);
  fs.writeFileSync(tgzPath, tgz);
  const pyDir = path.join(outDir, 'pyodide');
  fs.rmSync(pyDir, { recursive: true, force: true });
  fs.mkdirSync(pyDir);
  // The npm tarball holds everything under package/; strip it.
  execFileSync('tar', ['-xzf', tgzPath, '-C', pyDir, '--strip-components=1', '--no-same-owner']);
  report.pyodide = { ...PINS.pyodide, tarballSha256: hash('sha256', tgz, 'hex'), files: fs.readdirSync(pyDir).sort() };

  // Z3: the pyemscripten wheel, sha256 from PyPI.
  const whlPath = path.join(outDir, PINS.z3.file);
  let whl = fs.existsSync(whlPath) ? fs.readFileSync(whlPath) : await download(PINS.z3.url);
  const whlSha = hash('sha256', whl, 'hex');
  if (whlSha !== PINS.z3.sha256) throw new Error(`z3 wheel sha256 mismatch: ${whlSha}`);
  fs.writeFileSync(whlPath, whl);
  report.z3 = { ...PINS.z3, bytes: whl.length };

  fs.writeFileSync(path.join(outDir, 'engines.json'), JSON.stringify(report, null, 2) + '\n');
  return report;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const outDir = process.argv[2];
  if (!outDir) { console.error('usage: node fetch-engines.mjs <out-dir>'); process.exit(2); }
  const r = await fetchEngines(path.resolve(outDir));
  console.log(JSON.stringify({ pyodideFiles: r.pyodide.files, z3Bytes: r.z3.bytes }));
}
