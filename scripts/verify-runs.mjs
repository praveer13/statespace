#!/usr/bin/env node
// GATE-runs (spine sections 9.5 and 11.2; ARCHITECTURE.md sections 9.2 and 9.3; W0-S11).
//
// Registry integrity, and every run reference resolves to runs/<RUN-id>.json.
//
//   node scripts/verify-runs.mjs              the fast lane
//   node scripts/verify-runs.mjs --release    the nightly and release lanes: every {{run:}} resolves, every
//                                             recorded input still hashes as recorded, the index is current
//   node scripts/verify-runs.mjs --json       print the report as JSON
//   node scripts/verify-runs.mjs --root DIR   check the tree under DIR
//   node scripts/verify-runs.mjs --self-check plant faults in a scratch copy; the gate must fail on each
//
// The fast lane fails on:
//   registry   a runs/RUN-*.json that does not parse, does not validate against run@1, or whose id is not
//              its file name; an output file under the repository that is missing or no longer has its
//              recorded SHA-256 and size; a configuration output path that names no file; a primary_config
//              that names no configuration; two configurations with one id; an imported record with a
//              null core field that its unrecorded list does not explain
//   references an [X RUN-id] tag that does not resolve (the tag claims an executed run on disk); a
//              {{run:ID}} with a malformed ID or a #path that names nothing in the record; a {{run:ID}}
//              that does not resolve in learner copy not labeled draft (content/stages/, labs/)
// It reports, and the release lane fails on: {{run:ID}} references in documents and drafts that do not
// resolve yet (forward references: the run is recorded before the sentence ships), inputs whose files
// changed since the run, and a stale runs/index.json. The format placeholders {{run:RUN-id}}, {{run:ID}}
// and [X RUN-id] in code spans are exempt.
//
// TODO(W1-T29): "a tool bump re-runs everything and opens a reviewable diff" needs `statespace run <RUN-id>`
// (W1-T29). Until then the nightly lane runs this script with --release, and re-running is manual.
//
// Exit status: 0 green, 1 findings, 2 the gate could not run.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// The run@1 validator is the schema package's TypeScript, which Node 22 runs with type stripping.
if (!process.features.typescript && !process.env.RUNS_GATE_STRIP) {
  const again = spawnSync(process.execPath, ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', ...process.argv.slice(1)], {
    stdio: 'inherit',
    env: { ...process.env, RUNS_GATE_STRIP: '1' },
  });
  process.exit(again.status ?? 1);
}

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..');
const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const option = (name) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
};

const reg = await import(pathToFileURL(path.join(HERE, 'runs', 'registry.mjs')).href);

if (flag('--self-check')) {
  const { selfCheckRuns } = await import(pathToFileURL(path.join(HERE, 'runs', 'gate-self-check.mjs')).href);
  console.log('GATE-runs self-check: copy the registry and the scanned tree to a scratch directory, plant one fault at a time, require the gate to fail on it');
  const results = await selfCheckRuns({ repo: REPO, script: fileURLToPath(import.meta.url) });
  for (const r of results) console.log(`  ${r.ok ? 'ok  ' : 'FAIL'}  ${r.name}${r.detail ? `: ${r.detail}` : ''}`);
  const bad = results.filter((r) => !r.ok).length;
  console.log(`GATE-runs self-check: ${bad === 0 ? 'PASS' : 'FAIL'} (${results.length - bad} of ${results.length} held)`);
  process.exit(bad === 0 ? 0 : 1);
}

const ROOT = path.resolve(option('--root') ?? REPO);
const RELEASE = flag('--release');
const started = Date.now();

/** Where references are read. research/, runs/, vendor/ and the v1 history are not. */
const SCAN = ['README.md', 'docs', 'curriculum', 'tracker', 'labs', 'content', 'design', 'runs/README.md', 'schemas/README.md', 'packages', 'apps', 'bench', 'scripts'];
const EXEMPT = ['docs/history/', 'design/canvas/'];
const SKIP_DIRS = new Set(['node_modules', '.git', '.lake', 'target', '_solutions', '__pycache__', '.venv', 'dist', 'generated', 'fixtures']);
/** Document types: in code directories (packages, apps, bench, scripts) only READMEs are read. */
const TEXT = new Set(['.md', '.mdx', '.yaml', '.yml', '.json', '.txt', '.html']);
const CODE_ROOTS = ['packages/', 'apps/', 'bench/', 'scripts/'];
/** Learner copy: an unresolved {{run:}} fails the fast lane unless the file is labeled draft. */
const COPY = [/^content\/stages\//, /^labs\//];

let validator;
try {
  const schema = await import(pathToFileURL(path.join(REPO, 'packages', 'schema', 'src', 'index.ts')).href);
  validator = (doc) => schema.validate('run', doc);
} catch (e) {
  console.error(`GATE-runs: could not load the run@1 validator from packages/schema: ${e instanceof Error ? e.message : e}`);
  process.exit(2);
}

const findings = [];
const warnings = [];
const counts = { records: 0, outputsChecked: 0, inputsChecked: 0, references: 0, tags: 0, templates: 0, resolved: 0, forward: 0, placeholders: 0, files: 0 };
const fail = (check, where, detail) => findings.push({ check, where, detail });
const warn = (check, where, detail) => warnings.push({ check, where, detail });

// ------------------------------------------------------------------ 1. the registry
const records = reg.loadRegistry(ROOT);
const byId = new Map();
for (const r of records) {
  counts.records += 1;
  if (r.error) {
    fail('registry', r.file, `does not parse: ${r.error}`);
    continue;
  }
  byId.set(r.id, r.doc);
  const v = validator(r.doc);
  if (!v.ok) {
    fail('registry', r.file, `does not validate against run@1: ${v.issues.slice(0, 4).map((i) => `${i.instancePath || '/'} ${i.keyword}${i.message ? ` (${i.message})` : ''}`).join('; ')}`);
  }
  if (r.doc && r.doc.id !== r.id) fail('registry', r.file, `id ${JSON.stringify(r.doc.id)} is not the file name ${r.id}`);
  const doc = r.doc ?? {};

  // Outputs are the evidence: a file under the repository must still be what the run wrote.
  const checkOutput = (o, where) => {
    if (!o || typeof o.path !== 'string' || reg.isPlaceholderPath(o.path) || o.path.endsWith('/')) return;
    const abs = path.join(ROOT, o.path);
    if (!fs.existsSync(abs)) {
      fail('registry', r.file, `${where}: output ${o.path} is missing`);
      return;
    }
    if (!fs.statSync(abs).isFile()) return;
    counts.outputsChecked += 1;
    const bytes = fs.readFileSync(abs);
    const hash = reg.sha256(bytes);
    if (typeof o.sha256 === 'string' && hash !== o.sha256) fail('registry', r.file, `${where}: output ${o.path} has SHA-256 ${hash.slice(0, 12)}..., the record says ${o.sha256.slice(0, 12)}...`);
    else if (Number.isInteger(o.bytes) && bytes.length !== o.bytes) fail('registry', r.file, `${where}: output ${o.path} has ${bytes.length} bytes, the record says ${o.bytes}`);
  };
  const topPaths = new Set();
  for (const [i, o] of (Array.isArray(doc.outputs) ? doc.outputs : []).entries()) {
    checkOutput(o, `outputs/${i}`);
    if (o && typeof o.path === 'string') topPaths.add(o.path);
  }
  const configs = Array.isArray(doc.configs) ? doc.configs : [];
  const ids = new Set();
  for (const [i, c] of configs.entries()) {
    if (!c || typeof c !== 'object') continue;
    if (ids.has(c.id)) fail('registry', r.file, `configs/${i}: a second configuration with id ${JSON.stringify(c.id)}`);
    ids.add(c.id);
    for (const [j, o] of (Array.isArray(c.outputs) ? c.outputs : []).entries()) {
      if (typeof o === 'string') {
        if (!reg.isPlaceholderPath(o) && !topPaths.has(o) && !fs.existsSync(path.join(ROOT, o))) fail('registry', r.file, `configs/${i}/outputs/${j}: ${o} names no file`);
      } else checkOutput(o, `configs/${i}/outputs/${j}`);
    }
  }
  if (doc.primary_config !== undefined && !ids.has(doc.primary_config)) fail('registry', r.file, `primary_config ${JSON.stringify(doc.primary_config)} names no configuration`);

  // An imported record explains every null core field.
  if (doc.origin === 'imported') {
    const explained = new Set((Array.isArray(doc.unrecorded) ? doc.unrecorded : []).map((u) => u.field));
    for (const f of reg.NULLABLE_CORE) if (doc[f] === null && !explained.has(f)) fail('registry', r.file, `an imported record leaves ${f} null without an unrecorded entry`);
    for (const f of reg.NULLABLE_ENVIRONMENT) if (doc.environment && doc.environment[f] === null && !explained.has(`environment.${f}`)) fail('registry', r.file, `an imported record leaves environment.${f} null without an unrecorded entry`);
    for (const f of explained) {
      const value = f.startsWith('environment.') ? doc.environment?.[f.slice(12)] : doc[f];
      if (value !== null && value !== undefined) fail('registry', r.file, `unrecorded names ${f}, which has a value`);
    }
  }

  // Inputs drift as the repository moves on: the record then describes an older tree.
  const inputs = [...(Array.isArray(doc.inputs) ? doc.inputs : []), ...configs.flatMap((c) => (Array.isArray(c?.inputs) ? c.inputs : []))];
  for (const input of inputs) {
    if (!input || typeof input.path !== 'string' || reg.isPlaceholderPath(input.path) || input.path.endsWith('/') || input.path === '.') continue;
    const abs = path.join(ROOT, input.path);
    if (!fs.existsSync(abs)) {
      warn('inputs', r.file, `input ${input.path} is no longer in the repository`);
      continue;
    }
    if (!fs.statSync(abs).isFile() || typeof input.sha256 !== 'string') continue;
    counts.inputsChecked += 1;
    if (reg.sha256File(abs) !== input.sha256) warn('inputs', r.file, `input ${input.path} changed since the run (re-record before release)`);
  }
}

// The index.
const indexFile = path.join(ROOT, 'runs', 'index.json');
if (records.length > 0) {
  const fresh = reg.indexText(ROOT);
  const current = fs.existsSync(indexFile) ? fs.readFileSync(indexFile, 'utf8') : null;
  if (current !== fresh) warn('index', 'runs/index.json', current === null ? 'missing; write it with node scripts/runs/build-index.mjs' : 'stale: a record was added or changed; regenerate with node scripts/runs/build-index.mjs');
}

// ------------------------------------------------------------------ 2. the references
function listFiles() {
  const out = [];
  const walk = (rel) => {
    const abs = path.join(ROOT, rel);
    let st;
    try {
      st = fs.lstatSync(abs);
    } catch {
      return;
    }
    const p = reg.posix(rel);
    if (EXEMPT.some((e) => `${p}/`.startsWith(e))) return;
    if (st.isDirectory()) {
      if (SKIP_DIRS.has(path.basename(abs))) return;
      for (const e of fs.readdirSync(abs).sort()) walk(path.join(rel, e));
    } else if (st.isFile()) {
      const ext = path.extname(p);
      if (CODE_ROOTS.some((c) => p.startsWith(c))) {
        if (/README\.md$/.test(p)) out.push(p);
      } else if (TEXT.has(ext)) out.push(p);
    }
  };
  for (const s of SCAN) walk(s);
  return out;
}

for (const file of listFiles()) {
  counts.files += 1;
  const text = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const copy = COPY.some((re) => re.test(file));
  const draft = reg.isDraft(text, file);
  for (const ref of reg.referencesOf(text)) {
    counts.references += 1;
    const where = `${file}:${ref.line}:${ref.column}`;
    if ((ref.inCode && reg.PLACEHOLDER_IDS.has(ref.id)) || reg.isFormMention(ref)) {
      counts.placeholders += 1;
      continue;
    }
    if (ref.form === 'tag') {
      counts.tags += 1;
      if (byId.has(ref.id)) counts.resolved += 1;
      else fail('references', where, `[X ${ref.id}] claims an executed run, but runs/${ref.id}.json does not exist (record the run, or write {{run:${ref.id}}} until it is recorded)`);
      continue;
    }
    counts.templates += 1;
    if (!reg.RUN_ID.test(ref.id)) {
      fail('references', where, `{{run:${ref.id}}} is not a run ID (RUN-{kebab})`);
      continue;
    }
    if (byId.has(ref.id)) {
      counts.resolved += 1;
      if (ref.path !== null && reg.resolvePath(byId.get(ref.id), ref.path) === undefined) fail('references', where, `{{run:${ref.id}#${ref.path}}}: the record has nothing at ${ref.path}`);
      continue;
    }
    counts.forward += 1;
    const detail = `{{run:${ref.id}}} does not resolve: runs/${ref.id}.json does not exist`;
    if (copy && !draft) fail('references', where, `${detail}, in learner copy not labeled draft`);
    else if (RELEASE) fail('references', where, `${detail} (the release lane resolves every reference)`);
  }
}

// ------------------------------------------------------------------ report
const releaseFailures = RELEASE ? warnings.map((w) => ({ ...w, check: `${w.check} (release)` })) : [];
const all = [...findings, ...releaseFailures];
if (flag('--json')) {
  // process.exitCode, not process.exit: a large report written to a pipe must be flushed before exit.
  process.stdout.write(`${JSON.stringify({ root: ROOT, release: RELEASE, counts, findings: all, warnings: RELEASE ? [] : warnings }, null, 2)}\n`);
  process.exitCode = all.length === 0 ? 0 : 1;
} else {
console.log('GATE-runs');
console.log(`  read  ${counts.records} run records (${counts.outputsChecked} output files and ${counts.inputsChecked} input files hashed); ${counts.references} run references in ${counts.files} files: ${counts.tags} [X] tags, ${counts.templates} {{run:}} templates, ${counts.placeholders} format placeholders`);
console.log(`  pass  ${counts.resolved} references resolve; ${counts.forward} {{run:}} references wait for their runs (documents and drafts; ${RELEASE ? 'the release lane fails on them' : 'the release lane fails on them'})`);
if (!RELEASE) {
  const byCheck = new Map();
  for (const w of warnings) byCheck.set(w.check, [...(byCheck.get(w.check) ?? []), w]);
  for (const [check, list] of byCheck) {
    console.log(`  warn  ${check}: ${list.length} (the release lane fails on them)`);
    for (const w of list.slice(0, 8)) console.log(`          ${w.where}: ${w.detail}`);
    if (list.length > 8) console.log(`          ... and ${list.length - 8} more`);
  }
}
for (const f of all) console.log(`  FAIL  ${f.check}  ${f.where}: ${f.detail}`);
const seconds = ((Date.now() - started) / 1000).toFixed(1);
if (all.length > 0) {
  console.log(`GATE-runs: FAIL (${all.length} finding${all.length === 1 ? '' : 's'}${RELEASE ? ', release' : ''}; ${seconds} s)`);
  process.exit(1);
}
console.log(`GATE-runs: PASS (${counts.records} records, ${counts.resolved} resolved references${RELEASE ? ', release' : ''}; ${seconds} s)`);
}
