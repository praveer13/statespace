// W0-T02: records the runs this task relies on as runs/<RUN-id>.json, with their outputs under runs/<RUN-id>/.
//
//   node scripts/spikes/W0-T02/record.mjs
//
// It runs, one at a time and from the repository root:
//   RUN-schema-gate        the gate, the gate under --strict, the gate on Python 3.11 and 3.12, the package's own
//                          tests and typecheck, the type check of every valid fixture (scripts/spikes/W0-T02/type-check.mjs) and the
//                          promotion of W0-S05's lasso draft in a scratch copy (scripts/spikes/W0-T02/lasso-promotion.mjs)
//   RUN-schema-self-check  the gate's planted-fault tests (node scripts/verify-schema.mjs --self-check)
//   RUN-trimright-engines  trimEnd over all code points in Node and in the three browser engines of the pinned Playwright
//                          image, and Python's str.rstrip() over the same code points
// Run it last: the records hash the files they ran against.

import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const rel = (p) => path.relative(root, p).split(path.sep).join('/');
const nowIso = () => new Date().toISOString();

/** Replace absolute paths of this machine so that nothing private reaches the published record. */
const scrub = (text) => text.replaceAll(root, '<repo>').replaceAll(os.tmpdir(), '<sandbox>').replaceAll(os.homedir(), '<home>');

function run(argv, { env = {}, cwd = root, timeout = 900000 } = {}) {
  const started = Date.now();
  const startedAt = nowIso();
  const r = spawnSync(argv[0], argv.slice(1), { cwd, encoding: 'utf8', env: { ...process.env, ...env }, maxBuffer: 1 << 28, timeout });
  return {
    argv,
    started_at: startedAt,
    duration_s: Number(((Date.now() - started) / 1000).toFixed(3)),
    exit_code: r.status,
    stdout: scrub(r.stdout ?? ''),
    stderr: scrub(r.stderr ?? ''),
  };
}

const first = (cmd, args) => spawnSync(cmd, args, { encoding: 'utf8' }).stdout.trim();
const treeDigest = (dir) => {
  const entries = [];
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const f = path.join(d, e.name);
      if (e.isDirectory()) {
        if (e.name !== '__pycache__' && e.name !== 'node_modules') walk(f);
      } else entries.push(`${rel(f)} ${sha(fs.readFileSync(f))}`);
    }
  };
  walk(path.join(root, dir));
  return { path: `${dir}/`, sha256: sha(entries.join('\n')), files: entries.length };
};
const fileInput = (file, role) => ({ path: file, sha256: sha(fs.readFileSync(path.join(root, file))), role });

const environment = () => ({
  os: `${first('uname', ['-s'])} ${first('uname', ['-r'])} ${first('uname', ['-m'])}`,
  cpu_count: os.cpus().length,
  ram_gib: Math.round(os.totalmem() / 2 ** 30),
  node: process.version,
  uv: first('uv', ['--version']),
  python_default: first('python3', ['--version']),
  container: null,
});

function writeOutput(runId, name, text) {
  const file = path.join(root, 'runs', runId, name);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
  const buf = Buffer.from(text);
  return { path: rel(file), sha256: sha(buf), bytes: buf.length };
}

const verdictOf = (stdout) => stdout.split('\n').filter((l) => /^(\s+(ok|FAIL|todo|note)\s|GATE-schema)/.test(l)).map((l) => l.replace(/\s+$/, ''));

const nodeBinary = { binary: 'node (the host binary; no container)', binary_sha256: sha(fs.readFileSync(process.execPath)) };

function writeRecord(record) {
  const file = path.join(root, 'runs', `${record.id}.json`);
  fs.writeFileSync(file, `${JSON.stringify(record, null, 2)}\n`);
  console.log(`wrote ${rel(file)}`);
}

// ----------------------------------------------------------------------------------------------- RUN-schema-gate
{
  const id = 'RUN-schema-gate';
  const runs = [];
  const outputs = [];
  const add = (cfgId, purpose, argv, opts, outName) => {
    const r = run(argv, opts);
    outputs.push(writeOutput(id, outName, `${r.stdout}${r.stderr ? `\n--- stderr ---\n${r.stderr}` : ''}`));
    runs.push({ id: cfgId, purpose, argv: argv.map((a) => scrub(a)), env: opts?.env ?? {}, exit_code: r.exit_code, started_at: r.started_at, duration_s: r.duration_s, verdict_lines: verdictOf(r.stdout), output: outputs.at(-1).path, stdout: r.stdout });
    return r;
  };

  add('gate', 'the gate as the fast lane runs it', ['node', 'scripts/verify-schema.mjs'], {}, 'gate.txt');
  add('gate-strict', 'the gate with --strict, which fails on work a later task owns (expected exit 1 until W0-S11 and W0-T07 land)', ['node', 'scripts/verify-schema.mjs', '--strict'], {}, 'gate-strict.txt');
  add('gate-python-3.11', 'the gate with uv choosing Python 3.11, the oldest version the generated types support', ['node', 'scripts/verify-schema.mjs'], { env: { UV_PYTHON: '3.11' } }, 'gate-python-3.11.txt');
  add('gate-python-3.12', 'the gate with uv choosing Python 3.12', ['node', 'scripts/verify-schema.mjs'], { env: { UV_PYTHON: '3.12' } }, 'gate-python-3.12.txt');
  add('package-typecheck', 'npm run typecheck for @statespace/schema (tsc over src and test)', ['npm', 'run', 'typecheck', '-w', '@statespace/schema'], {}, 'package-typecheck.txt');
  add('package-tests', 'npm test for @statespace/schema (node --test over test/*.test.ts)', ['npm', 'test', '-w', '@statespace/schema'], {}, 'package-tests.txt');
  add('type-check', 'every valid fixture as a typed literal under tsc and pyright, and pyright strict over bench/statespace/schema', ['node', 'scripts/spikes/W0-T02/type-check.mjs'], {}, 'type-check.txt');
  add('lasso-promotion', "W0-S05's lasso draft promoted in a scratch copy: types regenerated, the gate run, the TLC trace recorded for the Hold spec validated in both languages", ['node', 'scripts/spikes/W0-T02/lasso-promotion.mjs'], {}, 'lasso-promotion.txt');

  const primary = runs[0];
  const tests = /# tests (\d+)\n# suites \d+\n# pass (\d+)\n# fail (\d+)/.exec(runs.find((r) => r.id === 'package-tests').stdout);
  const python = /Python ([\d.]+), jsonschema ([\d.]+), referencing ([\d.]+), PyYAML ([\d.]+)/.exec(primary.stdout);
  const tscVersion = first(path.join(root, 'node_modules', '.bin', 'tsc'), ['--version']);
  const typeCheck = JSON.parse(runs.find((r) => r.id === 'type-check').stdout);
  const lasso = JSON.parse(runs.find((r) => r.id === 'lasso-promotion').stdout);
  const verdict = (name) => lasso.verdicts.find((v) => v.document === name);
  const extraVerdicts = [
    `type-check: ${typeCheck.fixtures} valid fixtures as typed literals; tsc ${typeCheck.typescript.version.replace('Version ', '')} exit ${typeCheck.typescript.exit}; pyright (strict, Python 3.11) over them and over bench/statespace/schema: ${typeCheck.pyright[0].summary}`,
    `lasso-promotion: ${lasso.gate.summary}; the TLC trace recorded for the Hold spec (${lasso.trace.steps} steps): TypeScript ${verdict('recorded').typescript ? 'accepts' : 'rejects'}, Python ${verdict('recorded').python ? 'accepts' : 'rejects'}; with one item missing from a step: TypeScript ${verdict('a step with one item too few').typescript ? 'accepts' : 'rejects'}, Python ${verdict('a step with one item too few').python ? 'accepts' : 'rejects'}; with an unknown key: TypeScript ${verdict('an unknown key').typescript ? 'accepts' : 'rejects'}, Python ${verdict('an unknown key').python ? 'accepts' : 'rejects'}`,
  ];
  for (const r of runs) delete r.stdout;
  writeRecord({
    id,
    title: 'GATE-schema: types in sync, every record validated by two validators, and the statement hash reproduced by TypeScript and Python on every shared vector',
    engine: 'node',
    version: process.versions.node,
    ...nodeBinary,
    image: null,
    argv: primary.argv,
    inputs: [
      fileInput('scripts/verify-schema.mjs', 'the gate'),
      fileInput('schemas/codegen/gate_py.py', 'the Python half of the gate'),
      fileInput('schemas/defs.schema.json', 'shared definitions and the statement-hash specification'),
      fileInput('schemas/claim.schema.json', 'claim@1'),
      fileInput('schemas/event.schema.json', 'event@1'),
      fileInput('schemas/ir.schema.json', 'IR@1 (skeleton)'),
      fileInput('schemas/vectors/statement-hash.json', 'the shared hash vectors'),
      fileInput('packages/schema/src/statement-hash.ts', 'the TypeScript statement hash'),
      fileInput('bench/statespace/schema/statement_hash.py', 'the Python statement hash'),
      treeDigest('schemas/fixtures'),
      treeDigest('schemas/codegen'),
      treeDigest('packages/schema'),
      treeDigest('bench/statespace/schema'),
    ].map((i) => ({ ...i, role: i.role ?? (i.path.startsWith('schemas/fixtures') ? 'fixtures' : i.path.startsWith('schemas/codegen') ? 'generators, lint and self-test' : i.path.startsWith('packages/schema') ? 'the TypeScript package, generated files included' : 'the Python package, generated files included') })),
    budget: { network: 'uv fetches the pinned Python packages when its cache is cold', timeout_s: 900, mutants_per_valid_document: 260, memory: 'host' },
    environment: { ...environment(), python_packages: python ? { python: python[1], jsonschema: python[2], referencing: python[3], pyyaml: python[4] } : null, typescript: tscVersion },
    started_at: primary.started_at,
    duration_s: primary.duration_s,
    exit_code: primary.exit_code,
    verdict_lines: [...primary.verdict_lines, ...extraVerdicts],
    outputs,
    configs: runs,
    package_tests: tests ? { tests: Number(tests[1]), pass: Number(tests[2]), fail: Number(tests[3]) } : null,
    recorded_at: nowIso(),
    notes: [
      'The Python half of the gate runs Python through uv with jsonschema and pyyaml pinned by version; the versions are in environment.python_packages. The default interpreter of this host is in environment.python_default; the configurations gate-python-3.11 and gate-python-3.12 pin others with UV_PYTHON.',
      'gate-strict is expected to fail: --strict turns the work that W0-S11 (receipt and run schemas, run records) and W0-T07 (keep/kill rules) own into failures, and it is meant for the W0 exit.',
      'The type-check configuration uses the pyright package from PyPI, pinned to 1.1.411, which fetches its own npm package on first use; the fixtures are written to a scratch directory and nothing is written to the repository.',
      'Nothing here is emulated. The statement hash was also run on real engines, which the browser engines of RUN-trimright-engines cover; this run uses Node.',
    ],
  });
}

// ----------------------------------------------------------------------------------------------- RUN-schema-self-check
{
  const id = 'RUN-schema-self-check';
  const r = run(['node', 'scripts/verify-schema.mjs', '--self-check']);
  const out = writeOutput(id, 'self-check.txt', `${r.stdout}${r.stderr ? `\n--- stderr ---\n${r.stderr}` : ''}`);
  const lines = r.stdout.split('\n').filter((l) => /^\s+(ok|FAIL)\s/.test(l) || l.startsWith('GATE-schema self-check'));
  writeRecord({
    id,
    title: "GATE-schema's own tests: a fault planted in a scratch copy makes the gate fail on the check that should catch it",
    engine: 'node',
    version: process.versions.node,
    ...nodeBinary,
    image: null,
    argv: r.argv,
    inputs: [fileInput('scripts/verify-schema.mjs', 'the gate'), fileInput('schemas/codegen/self-check.mjs', 'the planted faults'), treeDigest('schemas'), treeDigest('packages/schema'), treeDigest('bench/statespace/schema')],
    budget: { network: 'uv fetches the pinned Python packages when its cache is cold', timeout_s: 900, per_scenario_timeout_s: 180 },
    environment: environment(),
    started_at: r.started_at,
    duration_s: r.duration_s,
    exit_code: r.exit_code,
    verdict_lines: lines,
    outputs: [out],
    recorded_at: nowIso(),
    notes: ['Each scenario copies schemas/, packages/schema, bench/statespace/schema and the gate to a scratch directory, plants one fault there, and runs the copy of the gate. The repository itself is never modified.'],
  });
}

// ----------------------------------------------------------------------------------------------- RUN-trimright-engines
{
  const id = 'RUN-trimright-engines';
  const outputs = [];
  const configs = [];

  const host = run(['node', 'scripts/spikes/W0-T02/trimright-engines.mjs', '--node-only']);
  outputs.push(writeOutput(id, 'host-node.json', host.stdout));
  configs.push({ id: 'host-node', purpose: "Node 22, the host's engine, with its own Unicode tables", argv: host.argv, exit_code: host.exit_code, started_at: host.started_at, duration_s: host.duration_s, output: outputs.at(-1).path });

  const image = 'mcr.microsoft.com/playwright:v1.63.0-noble';
  const digest = first('docker', ['image', 'inspect', image, '--format', '{{index .RepoDigests 0}}']).split('@')[1] ?? null;
  const dockerArgv = ['docker', 'run', '--rm', '--memory=6g', '-v', `${root}:/repo:ro`, '-w', '/repo', image, 'node', 'scripts/spikes/W0-T02/trimright-engines.mjs'];
  const container = run(dockerArgv);
  outputs.push(writeOutput(id, 'container-engines.json', container.stdout));
  configs.push({ id: 'container-engines', purpose: 'Node 24 and the Chromium, Firefox and WebKit builds of the pinned Playwright image', argv: container.argv.map((a) => (a === `${root}:/repo:ro` || a.includes('<repo>') ? '<repo>:/repo:ro' : a)), exit_code: container.exit_code, started_at: container.started_at, duration_s: container.duration_s, output: outputs.at(-1).path });

  const pyScript = `
import json, sys, unicodedata
s = [cp for cp in range(0x110000) if ("a" + chr(cp)).rstrip() == "a"]
print(json.dumps({"python": sys.version.split()[0], "unicodedata": unicodedata.unidata_version, "rstripCount": len(s), "rstrip": ["U+%04X" % c for c in s]}))
`;
  const py = run(['python3', '-I', '-B', '-c', pyScript.trim()]);
  outputs.push(writeOutput(id, 'python-rstrip.json', py.stdout));
  configs.push({ id: 'python-rstrip', purpose: "the code points Python's str.rstrip() removes from the end of a string, over all 1114112 code points", argv: ['python3', '-I', '-B', '-c', '<inline script: rstrip over all code points>'], exit_code: py.exit_code, started_at: py.started_at, duration_s: py.duration_s, output: outputs.at(-1).path });

  const schemaSet = JSON.parse(fs.readFileSync(path.join(root, 'schemas', 'defs.schema.json'), 'utf8')).$defs.statementSha256['x-statementHash'].trimRight.codePoints.map((c) => c.cp);
  const hostJson = JSON.parse(host.stdout);
  const containerJson = JSON.parse(container.stdout);
  const pyJson = JSON.parse(py.stdout);
  const verdict = [];
  for (const e of [...hostJson.engines, ...containerJson.engines]) {
    const where = e.engine === 'node' ? `node ${e.version} (V8 ${e.v8}, Unicode ${e.unicode})` : `${e.engine} ${e.version}`;
    verdict.push(`${where}: trimEnd removes ${e.trimEndCount} code points; equals the schema's list: ${e.equalsSchemaSet}; trimRight is trimEnd: ${e.trimRightIsTrimEnd}`);
  }
  const onlyPy = pyJson.rstrip.filter((c) => !schemaSet.includes(c));
  const onlySchema = schemaSet.filter((c) => !pyJson.rstrip.includes(c));
  verdict.push(`python ${pyJson.python} (unicodedata ${pyJson.unicodedata}): str.rstrip() removes ${pyJson.rstripCount} code points; also removes ${onlyPy.join(' ')} (the schema's list keeps them); keeps ${onlySchema.join(' ')} (the schema's list removes it)`);
  verdict.push(`the schema's list: ${schemaSet.length} code points`);

  writeRecord({
    id,
    title: "Which code points String.prototype.trimEnd removes in Node and in three browser engines, against the statement hash's trim set and against Python's str.rstrip()",
    engine: 'playwright',
    version: '1.63.0',
    binary: 'the Chromium, Firefox and WebKit builds inside the pinned image, and its Node; node on the host for the host-node configuration',
    binary_sha256: null,
    image,
    argv: configs[1].argv,
    inputs: [fileInput('schemas/defs.schema.json', "the trim set, x-statementHash.trimRight.codePoints"), fileInput('scripts/spikes/W0-T02/trimright-engines.mjs', 'the measurement')],
    budget: { container_memory: '6g', network: 'none used by the measurement', timeout_s: 900 },
    environment: { ...environment(), container: { runtime: 'docker', server_version: first('docker', ['version', '--format', '{{.Server.Version}}']), image, digest, run_flags: ['--rm', '--memory=6g', 'repository mounted read-only at /repo'] }, engines: { host_node: process.version } },
    started_at: configs[0].started_at,
    duration_s: Number(configs.reduce((a, c) => a + c.duration_s, 0).toFixed(3)),
    exit_code: configs.every((c) => c.exit_code === 0) ? 0 : 1,
    verdict_lines: verdict,
    outputs,
    configs,
    recorded_at: nowIso(),
    notes: [
      'The browsers are those of the pinned Playwright image, driven headless; they are not real devices. The measurement is of a language operation, String.prototype.trimEnd, which does not depend on the device.',
      'The code point set a regular expression class \\s matches equals the trimEnd set in every engine measured (regexWhitespaceClassEqualsTrimEnd in the outputs), as ECMAScript defines both from WhiteSpace and LineTerminator.',
      'Python does not appear in the browser configurations; its set is measured on the host with the default python3 of the machine.',
    ],
  });
}
