// W0-T02: do the generated types accept the records the schemas accept, and are they sound to a type checker?
//
// 1. Every valid fixture (JSON and YAML) is written as a typed literal, `const v1: Claim = {...}` in TypeScript and
//    `v1: Claim = {...}` in Python, and checked by tsc (the pinned TypeScript, strict, exactOptionalPropertyTypes)
//    and by pyright (strict, target Python 3.11).
// 2. The same pyright run checks the whole of bench/statespace/schema (strict, jsonschema installed).
//
// Nothing is written to the repository: the literals go to a scratch directory. Run from the repository root:
//   node scripts/spikes/W0-T02/type-check.mjs
// It prints one JSON object and exits 1 if either checker reports an error.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const tsc = path.join(root, 'node_modules', '.bin', 'tsc');
const PYRIGHT = 'pyright==1.1.411';
const PINS = ['--with', 'jsonschema==4.26.0', '--with', 'pyyaml==6.0.3', '--with', PYRIGHT];
const uv = (args, opts = {}) => spawnSync('uv', ['run', '--no-project', '--quiet', ...PINS, ...args], { encoding: 'utf8', cwd: root, ...opts });

const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'ss-w0t02-types-'));
const report = { typescript: null, pyright: [] };
let failed = false;

try {
  // 1. typed literals from the valid fixtures
  const writer = `
import glob, json, sys, yaml
out = sys.argv[1]
types = {"claim": "Claim", "event": "LedgerEvent", "ir": "IR"}
ts = ["import type { Claim, LedgerEvent, IR } from '" + sys.argv[2] + "/packages/schema/src/index.ts';"]
py = ["from statespace.schema.records import Claim, LedgerEvent, IR", ""]
n = 0
for name, t in types.items():
    for f in sorted(glob.glob("schemas/fixtures/" + name + "/valid/*")):
        doc = yaml.safe_load(open(f)) if f.endswith(".yaml") else json.load(open(f))
        n += 1
        ts.append("export const v%d: %s = %s;" % (n, t, json.dumps(doc)))
        py.append("v%d: %s = %r" % (n, t, doc))
open(out + "/typed-fixtures.ts", "w").write("\\n".join(ts) + "\\n")
open(out + "/typed_fixtures.py", "w").write("\\n".join(py) + "\\n")
print(n)
`;
  const wrote = uv(['python', '-I', '-B', '-c', writer, scratch, root]);
  if (wrote.status !== 0) throw new Error(`could not write the typed fixtures: ${wrote.stderr}`);
  report.fixtures = Number(wrote.stdout.trim());

  // 2. TypeScript
  fs.writeFileSync(path.join(scratch, 'tsconfig.json'), JSON.stringify({
    compilerOptions: { target: 'ES2022', lib: ['ES2022'], types: [], strict: true, noEmit: true, allowImportingTsExtensions: true, verbatimModuleSyntax: true, exactOptionalPropertyTypes: true, noUncheckedIndexedAccess: true, skipLibCheck: true, moduleResolution: 'bundler', module: 'ESNext' },
    files: ['typed-fixtures.ts'],
  }));
  const compiled = spawnSync(tsc, ['-p', path.join(scratch, 'tsconfig.json')], { encoding: 'utf8', cwd: root });
  report.typescript = { version: spawnSync(tsc, ['--version'], { encoding: 'utf8' }).stdout.trim(), exit: compiled.status, output: (compiled.stdout + compiled.stderr).trim() };
  if (compiled.status !== 0) failed = true;

  // 3. pyright over the typed literals and over the package
  // The package is linked into the scratch directory so that pyright, which wants relative include paths, checks it too.
  fs.symlinkSync(path.join(root, 'bench', 'statespace', 'schema'), path.join(scratch, 'package'), 'dir');
  fs.writeFileSync(path.join(scratch, 'pyrightconfig.json'), JSON.stringify({ typeCheckingMode: 'strict', pythonVersion: '3.11', extraPaths: [path.join(root, 'bench')], reportMissingModuleSource: 'none', include: ['typed_fixtures.py', 'package'] }));
  const run = uv(['python', '-m', 'pyright', '-p', scratch]);
  const text = (run.stdout + run.stderr).trim();
  const summary = /(\d+) errors?, (\d+) warnings?, (\d+) informations?/.exec(text);
  const files = (text.match(/^\/.*\.py$/gm) ?? []).length;
  report.pyright.push({ label: 'typed fixtures and bench/statespace/schema, strict, Python 3.11', exit: run.status, summary: summary ? summary[0] : text.split('\n').slice(-2).join(' | ') });
  if (run.status !== 0) failed = true;
} finally {
  fs.rmSync(scratch, { recursive: true, force: true });
}

console.log(JSON.stringify(report, null, 2));
process.exit(failed ? 1 : 0);
