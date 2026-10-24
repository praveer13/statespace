#!/usr/bin/env node
// GATE-schema (spine section 11.2): the one JSON Schema source and everything generated from it.
//
//   node scripts/verify-schema.mjs            run the gate
//   node scripts/verify-schema.mjs --strict   also fail on work that a later task owns (the W0 exit)
//   node scripts/verify-schema.mjs --write    regenerate the generated files and the hash vectors first
//   node scripts/verify-schema.mjs --self-check   plant faults in a scratch copy; the gate must fail on each
//
// What it checks:
//   1. every published schema is well formed, stays inside the supported keyword subset and uses only
//      patterns that ECMAScript and Python read alike (schemas/codegen/subset.mjs)
//   2. the generated TypeScript and Python files equal a fresh generation (types in sync), and their
//      declared shapes equal each other and the schemas
//   3. every record validates: fixtures, definitions, generated mutants and the records found in the
//      repository, by the TypeScript validator and by Python's jsonschema, which must agree on each
//   4. the statement-hash trim is the one in the schema, is ECMAScript's set, and both languages
//      reproduce every shared vector (schemas/vectors/statement-hash.json)
//   5. the keep/kill rules file's SHA-256 equals the one recorded in RUN-keepkill-rules
//
// Needs Node 22.6 or later (it runs the package's TypeScript directly) and uv for the Python half.
// Dependency-free otherwise.

import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const STRICT = argv.includes('--strict');
const WRITE = argv.includes('--write');

// ------------------------------------------------------------------ run the package's TypeScript directly
if (Number(process.versions.node.split('.')[0]) < 22) {
  console.error('GATE-schema needs Node 22 or later');
  process.exit(1);
}
if (!process.features.typescript && !process.env.SCHEMA_GATE_STRIP) {
  const again = spawnSync(process.execPath, ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', ...process.argv.slice(1)], {
    stdio: 'inherit',
    env: { ...process.env, SCHEMA_GATE_STRIP: '1' },
  });
  process.exit(again.status ?? 1);
}
const emitWarning = process.emitWarning;
process.emitWarning = function patched(warning, ...rest) {
  const type = typeof rest[0] === 'string' ? rest[0] : rest[0]?.type;
  if (type === 'ExperimentalWarning') return undefined;
  return emitWarning.call(process, warning, ...rest);
};

if (argv.includes('--self-check')) {
  // The gate's own tests: plant faults in a scratch copy and require the gate to fail on each.
  const { selfCheck } = await import(pathToFileURL(path.join(ROOT, 'schemas', 'codegen', 'self-check.mjs')).href);
  console.log('GATE-schema self-check: plant a fault in a scratch copy, run the gate there, require it to fail on the right check');
  const results = await selfCheck(ROOT);
  for (const r of results) console.log(`  ${r.ok ? 'ok  ' : 'FAIL'}  ${r.name}${r.detail ? `: ${r.detail}` : ''}`);
  const bad = results.filter((r) => !r.ok).length;
  console.log(`GATE-schema self-check: ${bad === 0 ? 'PASS' : 'FAIL'} (${results.length - bad} of ${results.length} held)`);
  process.exit(bad === 0 ? 0 : 1);
}

const here = (...parts) => path.join(ROOT, ...parts);
const rel = (file) => path.relative(ROOT, file).split(path.sep).join('/');
const importTs = (...parts) => import(pathToFileURL(here(...parts)).href);

const { check: codegenCheck, write: codegenWrite, generate, generateSelftest } = await import(pathToFileURL(here('schemas', 'codegen', 'generate.mjs')).href);
const { ALLOWED_KEYWORDS, DIALECT, checkKeywords, walkSchemas } = await import(pathToFileURL(here('schemas', 'codegen', 'subset.mjs')).href);
const { ID_RE, loadPublished, loadSchemaFile, manifestOf, sha256Hex } = await import(pathToFileURL(here('schemas', 'codegen', 'model.mjs')).href);
const vectorsModule = await import(pathToFileURL(here('schemas', 'vectors', 'generate-statement-hash.mjs')).href);

// ------------------------------------------------------------------ configuration
/** The schemas the spine names for W0-T02, and who owns each. A missing one owned by a later task is pending. */
const EXPECTED = [
  { name: 'defs', owner: 'W0-T02' },
  { name: 'claim', owner: 'W0-T02' },
  { name: 'event', owner: 'W0-T02' },
  { name: 'ir', owner: 'W0-T02' },
  { name: 'receipt', owner: 'W0-S11', pending: true },
  { name: 'run', owner: 'W0-S11', pending: true },
];

/** Schema names that appear in `schema:` fields but are not validated by this gate. */
const FOREIGN = new Set(['tracker']);

/** Schemas the spine and ARCHITECTURE.md section 18 name but a later task publishes: a record that declares one waits. */
const LATER = new Set(['receipt', 'run', 'plan', 'report', 'specimen', 'trace', 'history', 'bundle', 'labbundle', 'auditbundle', 'lasso']);

const SKIP_DIRS = new Set(['.git', 'node_modules', 'dist', '.venv', '__pycache__', 'states', 'vendor']);
const SKIP_PREFIXES = ['research/evidence/', 'docs/history/', 'design/canvas/', 'schemas/fixtures/', 'schemas/codegen/selftest/'];

const KEEPKILL_FILE = 'content/governance/keepkill-rules.yaml';
const KEEPKILL_RUN = 'runs/RUN-keepkill-rules.json';

const PY_PINS = ['--with', 'jsonschema==4.26.0', '--with', 'pyyaml==6.0.3'];

/** [what, pattern, text, portable]: the same pattern read by ECMAScript (u flag) and by Python's re.search. */
const A64 = 'a'.repeat(64);
const PROBES = [
  ['$ before a final newline', '^[0-9a-f]{64}$', `${A64}\n`, false],
  ['\\d on an Arabic-Indic digit', '^\\d$', '\u0663', false],
  ['\\w on e with an acute accent', '^\\w$', '\u00e9', false],
  ['. on a carriage return', '^.$', '\r', false],
  ['. on a line separator', '^.$', '\u2028', false],
  ['\\s on U+0085 (kept by ECMAScript)', '^\\s$', '\u0085', false],
  ['\\s on U+FEFF (removed by ECMAScript)', '^\\s$', '\ufeff', false],
  ['the idiom (?![\\s\\S]) before a final newline', `^[0-9a-f]{64}(?![\\s\\S])`, `${A64}\n`, true],
  ['the idiom at the true end', `^[0-9a-f]{64}(?![\\s\\S])`, A64, true],
  ['[\\s\\S] on U+2028', '^[\\s\\S]$', '\u2028', true],
  ['[\\s\\S] on U+0085', '^[\\s\\S]$', '\u0085', true],
  ['[\\s\\S] on U+FEFF', '^[\\s\\S]$', '\ufeff', true],
  ['[\\s\\S] on a newline', '^[\\s\\S]$', '\n', true],
  ['[\\s\\S] on an astral character', '^[\\s\\S]$', '\u{1f600}', true],
  ['[0-9] on an Arabic-Indic digit', '^[0-9]$', '\u0663', true],
];

// ------------------------------------------------------------------ reporting
const started = Date.now();
const stats = { checks: 0, failed: 0, pending: 0 };
const ok = (name, detail = '') => {
  stats.checks += 1;
  console.log(`  ok    ${name}${detail ? `: ${detail}` : ''}`);
};
const fail = (name, detail) => {
  stats.checks += 1;
  stats.failed += 1;
  console.log(`  FAIL  ${name}: ${detail}`);
};
const pending = (name, detail) => {
  if (STRICT) return fail(name, `${detail} (--strict treats work owned by a later task as a failure)`);
  stats.pending += 1;
  console.log(`  todo  ${name}: ${detail}`);
  return undefined;
};
const guarded = async (name, fn) => {
  try {
    await fn();
  } catch (e) {
    fail(name, e instanceof Error ? e.stack?.split('\n').slice(0, 3).join(' | ') ?? e.message : String(e));
  }
};
const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const first = (list, n = 5) => list.slice(0, n).join('\n          ') + (list.length > n ? `\n          ... and ${list.length - n} more` : '');

console.log('GATE-schema');

if (WRITE) {
  const { written, digest } = codegenWrite(ROOT);
  fs.writeFileSync(here('schemas', 'vectors', 'statement-hash.json'), vectorsModule.vectorsText);
  console.log(`  wrote ${written.length} generated files and schemas/vectors/statement-hash.json (${digest})`);
}

// ------------------------------------------------------------------ 1. the schemas
const published = loadPublished(here('schemas'));
const byName = new Map(published.map((d) => [d.name, d]));
const recordDocs = published.filter((d) => isObject(d.doc?.properties?.schema) && 'const' in d.doc.properties.schema);
/** Schemas that describe a value (claim, event, IR, ...), as opposed to a document of shared definitions. */
const rootDocs = published.filter((d) => isObject(d.doc) && ('type' in d.doc || 'properties' in d.doc));

await guarded('schemas', async () => {
  const problems = [];
  const refs = [];
  for (const d of published) {
    const at = d.file;
    if (d.parseError) {
      problems.push(`${at}: not valid JSON (${d.parseError})`);
      continue;
    }
    if (!isObject(d.doc)) {
      problems.push(`${at}: the document must be an object`);
      continue;
    }
    if (d.doc.$schema !== DIALECT) problems.push(`${at}: $schema must be ${DIALECT}`);
    const m = typeof d.doc.$id === 'string' ? ID_RE.exec(d.doc.$id) : null;
    if (!m) problems.push(`${at}: $id must be urn:statespace:<name>@<major>, got ${JSON.stringify(d.doc.$id)}`);
    else if (m[1] !== d.name) problems.push(`${at}: $id names ${m[1]} but the file is ${d.name}.schema.json`);
    for (const key of ['title', 'description']) {
      if (typeof d.doc[key] !== 'string' || d.doc[key].trim() === '') problems.push(`${at}: the root needs a ${key}`);
    }
    for (const p of checkKeywords(d.doc)) problems.push(`${at}${p}`);
    walkSchemas(d.doc, (schema, pointer) => {
      if (isObject(schema) && typeof schema.$ref === 'string') refs.push({ file: d.file, pointer, ref: schema.$ref, doc: d });
    });
    if (recordDocs.includes(d)) {
      const tag = d.doc.properties.schema.const;
      if (tag !== `statespace/${d.name}@${d.major}`) problems.push(`${at}: the schema const ${JSON.stringify(tag)} must be statespace/${d.name}@${d.major}, which $id implies`);
      if (!Array.isArray(d.doc.required) || !d.doc.required.includes('schema')) problems.push(`${at}: a record schema must require "schema"`);
      if (d.doc.additionalProperties !== false) problems.push(`${at}: a record schema must close its root object with additionalProperties: false`);
    }
  }
  for (const { file, pointer, ref, doc } of refs) {
    const hash = ref.indexOf('#');
    const target = hash === -1 ? ref : ref.slice(0, hash);
    const fragment = hash === -1 ? '' : ref.slice(hash + 1);
    const targetDoc = target === '' ? doc : published.find((d) => d.doc?.$id === target);
    const where = `${file}${pointer}`;
    if (!targetDoc) problems.push(`${where}: $ref ${ref} names no published schema`);
    else if (fragment !== '') {
      const m = /^\/\$defs\/([^/]+)$/.exec(fragment);
      if (!m) problems.push(`${where}: $ref ${ref}: use #, #/$defs/<name> or urn:statespace:<name>@<n>#/$defs/<name>`);
      else if (!isObject(targetDoc.doc.$defs) || !(m[1] in targetDoc.doc.$defs)) problems.push(`${where}: $ref ${ref} names no $defs entry`);
    }
    if (target !== '' && !target.startsWith('urn:statespace:')) problems.push(`${where}: $ref ${ref}: a reference to another schema uses its urn:statespace $id`);
  }
  if (problems.length > 0) fail('schemas', `\n          ${first(problems, 12)}`);
  else ok('schemas', `${published.length} published (${published.map((d) => d.name).join(', ')}); ${rootDocs.length} describe a value, ${recordDocs.length} of them tagged records; subset and portable patterns hold`);

  const drafts = path.join(ROOT, 'schemas', 'drafts');
  if (fs.existsSync(drafts)) {
    const files = fs.readdirSync(drafts).filter((f) => f.endsWith('.json'));
    const bad = files.filter((f) => {
      try {
        return !isObject(readJson(path.join(drafts, f)));
      } catch {
        return true;
      }
    });
    if (bad.length > 0) fail('drafts', `${bad.join(', ')} is not a JSON object`);
    else ok('drafts', `${files.length} draft${files.length === 1 ? '' : 's'} parse; drafts are not published and generate no types`);
  }
});

await guarded('expected schemas', async () => {
  const missing = [];
  for (const e of EXPECTED) {
    if (byName.has(e.name)) continue;
    if (e.pending) pending(`schema ${e.name}`, `schemas/${e.name}.schema.json is published by ${e.owner}; the generators pick it up when it lands`);
    else missing.push(`${e.name}.schema.json (${e.owner})`);
  }
  if (missing.length > 0) fail('expected schemas', `missing ${missing.join(', ')}`);
  else ok('expected schemas', EXPECTED.filter((e) => !e.pending).map((e) => e.name).join(', ') + ' present');
});

// ------------------------------------------------------------------ 2. generated files in sync
let manifest = {};
let generated;
let generatedFresh = false;
await guarded('generated files', async () => {
  generated = generate(ROOT);
  const { stale, digest } = codegenCheck(ROOT);
  generatedFresh = stale.length === 0;
  if (stale.length > 0) fail('generated files', `out of date with schemas/ (${digest}): ${stale.join(', ')}; run node schemas/codegen/generate.mjs`);
  else ok('generated files', `6 files equal a fresh generation from schemas/ (${digest.slice(0, 19)}...)`);
  manifest = generated.manifest;
});

await guarded('statement-hash.json', async () => {
  const file = here('schemas', 'vectors', 'statement-hash.json');
  const current = fs.existsSync(file) ? fs.readFileSync(file, 'utf8').replaceAll('\r\n', '\n') : null;
  if (current !== vectorsModule.vectorsText) fail('statement-hash.json', 'differs from a fresh generation; run node schemas/vectors/generate-statement-hash.mjs');
  else ok('statement-hash.json', `equals a fresh generation (${vectorsModule.vectorCount} vectors, every expected value from the engine's own trimEnd and node:crypto)`);
});

// The package must load: this parses every generated file under Node's type stripping, which is a
// syntax check of the TypeScript, and exercises the exports.
let pkg;
let hashModule;
await guarded('package loads', async () => {
  await importTs('packages', 'schema', 'src', 'generated', 'types.ts');
  pkg = await importTs('packages', 'schema', 'src', 'index.ts');
  hashModule = await importTs('packages', 'schema', 'src', 'statement-hash.ts');
  const names = [...pkg.SCHEMA_NAMES].sort().join(',');
  const expected = published.map((d) => d.name).sort().join(',');
  if (names !== expected) fail('package loads', `the package embeds ${names}, schemas/ holds ${expected}`);
  else ok('package loads', '@statespace/schema imports under Node and embeds every published schema');
});
if (!pkg) {
  finish();
}

// The TypeScript compiler, when the workspace is installed: the generated types must compile under the
// settings of packages/schema/tsconfig.json (npm run typecheck runs the same).
await guarded('typescript', async () => {
  const tsc = here('node_modules', '.bin', 'tsc');
  if (!fs.existsSync(tsc)) {
    console.log('  note  typescript: node_modules/.bin/tsc is not installed here, so the compile of packages/schema is left to npm run typecheck');
    return;
  }
  const version = spawnSync(tsc, ['--version'], { cwd: ROOT, encoding: 'utf8' }).stdout.trim();
  const problems = [];
  for (const project of ['packages/schema', 'packages/schema/test']) {
    const run = spawnSync(tsc, ['-p', project], { cwd: ROOT, encoding: 'utf8' });
    if (run.status !== 0) problems.push(`${project}: ${(run.stdout || run.stderr).trim().split('\n').slice(0, 4).join(' | ')}`);
  }
  if (problems.length > 0) fail('typescript', `\n          ${first(problems)}`);
  else ok('typescript', `${version}: packages/schema and its tests compile (strict, exactOptionalPropertyTypes, erasable syntax only)`);
});

// ------------------------------------------------------------------ cases for the two validators
/** @type {Array<{id:string, kind:string, ref?:string, schema?:object, value:any, expect?:{valid:boolean, path?:string, keyword?:string}}>} */
const cases = [];
const yamlFiles = [];
const yamlExpect = new Map();
const extraTsDocs = [];

function listFiles(dir, exts) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => exts.some((e) => f.endsWith(e)) && f !== 'index.json').sort();
}

await guarded('fixtures', async () => {
  const problems = [];
  let valid = 0;
  let invalid = 0;
  const waiting = [];
  for (const d of rootDocs) {
    const base = here('schemas', 'fixtures', d.name);
    const okFiles = listFiles(path.join(base, 'valid'), ['.json', '.yaml']);
    const badFiles = listFiles(path.join(base, 'invalid'), ['.json', '.yaml']);
    const owner = EXPECTED.find((e) => e.name === d.name)?.owner;
    if (owner !== 'W0-T02' && okFiles.length === 0 && badFiles.length === 0) {
      // A schema another task publishes: its owner adds the fixtures. Once it adds any, every rule below applies.
      waiting.push(`${d.name}: its owner (${owner ?? 'the task that publishes it'}) adds valid and invalid fixtures under schemas/fixtures/${d.name}/`);
      continue;
    }
    if (okFiles.length === 0) problems.push(`${d.name}: no valid fixture in schemas/fixtures/${d.name}/valid/`);
    if (badFiles.length === 0) problems.push(`${d.name}: no invalid fixture in schemas/fixtures/${d.name}/invalid/`);
    let index = [];
    try {
      index = readJson(path.join(base, 'invalid', 'index.json'));
    } catch (e) {
      if (badFiles.length > 0) problems.push(`${d.name}: schemas/fixtures/${d.name}/invalid/index.json: ${e.message}`);
    }
    const listed = new Set(index.map((e) => e.file));
    for (const f of badFiles) if (!listed.has(f)) problems.push(`${d.name}: invalid fixture ${f} has no entry in index.json`);
    for (const e of index) if (!badFiles.includes(e.file)) problems.push(`${d.name}: index.json names ${e.file}, which is not in invalid/`);
    for (const f of okFiles) {
      const file = path.join(base, 'valid', f);
      const id = `${d.name}/valid/${f}`;
      if (f.endsWith('.yaml')) {
        yamlFiles.push({ path: rel(file), ref: d.name });
        yamlExpect.set(rel(file), { id, expect: { valid: true } });
      } else cases.push({ id, kind: 'fixture', ref: d.name, value: readJson(file), expect: { valid: true } });
      valid += 1;
    }
    for (const e of index) {
      const file = path.join(base, 'invalid', e.file);
      if (!fs.existsSync(file)) continue;
      const id = `${d.name}/invalid/${e.file}`;
      const expect = { valid: false, path: e.instancePath, keyword: e.keyword };
      if (e.file.endsWith('.yaml')) {
        yamlFiles.push({ path: rel(file), ref: d.name });
        yamlExpect.set(rel(file), { id, expect });
      } else cases.push({ id, kind: 'fixture', ref: d.name, value: readJson(file), expect });
      invalid += 1;
    }
  }
  // The shared definitions: every $defs entry needs valid and invalid values, which are wrapped in a $ref.
  const defsDoc = byName.get('defs');
  const defsFixtures = readJson(here('schemas', 'fixtures', 'defs.json'));
  let defCases = 0;
  for (const name of Object.keys(defsDoc?.doc?.$defs ?? {})) {
    const entry = defsFixtures[name];
    if (!entry || !Array.isArray(entry.valid) || entry.valid.length === 0 || !Array.isArray(entry.invalid) || entry.invalid.length === 0) {
      problems.push(`defs: schemas/fixtures/defs.json needs valid and invalid values for $defs/${name}`);
      continue;
    }
    const wrapper = { $schema: DIALECT, $id: `urn:statespace:defcheck-${name}@1`, $ref: `urn:statespace:defs@1#/$defs/${name}` };
    extraTsDocs.push({ name: `defcheck-${name}`, id: wrapper.$id, schema: null, json: wrapper });
    entry.valid.forEach((value, i) => cases.push({ id: `defs/${name}/valid/${i}`, kind: 'defs', schema: wrapper, ref: wrapper.$id, value, expect: { valid: true } }));
    entry.invalid.forEach((value, i) => cases.push({ id: `defs/${name}/invalid/${i}`, kind: 'defs', schema: wrapper, ref: wrapper.$id, value, expect: { valid: false } }));
    defCases += entry.valid.length + entry.invalid.length;
  }
  for (const name of Object.keys(defsFixtures)) {
    if (!(name in (defsDoc?.doc?.$defs ?? {}))) problems.push(`defs: schemas/fixtures/defs.json has values for $defs/${name}, which does not exist`);
  }
  for (const w of waiting) pending('fixtures', w);
  if (problems.length > 0) fail('fixtures', `\n          ${first(problems, 12)}`);
  else ok('fixtures', `${valid} valid and ${invalid} invalid record fixtures, ${defCases} values for ${Object.keys(defsFixtures).length} shared definitions`);
});

// The machinery self-test: a schema that uses every supported keyword, with its own examples.
let selftest;
await guarded('self-test generation', async () => {
  selftest = generateSelftest(ROOT);
  const doc = loadSchemaFile(here('schemas', 'codegen', 'selftest', 'kitchen-sink.schema.json'));
  const problems = checkKeywords(doc.doc);
  if (problems.length > 0) throw new Error(problems.join('; '));
  const examples = readJson(here('schemas', 'codegen', 'selftest', 'kitchen-sink.examples.json'));
  extraTsDocs.push({ name: 'selftest', id: doc.doc.$id, schema: doc.doc.properties.schema.const, json: doc.doc });
  examples.valid.forEach((value, i) => cases.push({ id: `selftest/valid/${i}`, kind: 'selftest', schema: doc.doc, ref: doc.doc.$id, value, expect: { valid: true } }));
  examples.invalid.forEach((e, i) => cases.push({ id: `selftest/invalid/${i}`, kind: 'selftest', schema: doc.doc, ref: doc.doc.$id, value: e.doc, expect: { valid: false, path: e.instancePath, keyword: e.keyword } }));
  selftest.doc = doc.doc;
  selftest.examples = examples;
  // The generated selftest TypeScript must be valid, erasable TypeScript.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'schema-gate-'));
  try {
    fs.writeFileSync(path.join(dir, 'types.ts'), selftest.tsTypes);
    await import(pathToFileURL(path.join(dir, 'types.ts')).href);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  ok('self-test generation', `the kitchen-sink schema generates TypeScript that parses (${Object.keys(selftest.manifest).length} object types across all schemas) and Python`);
});

// ------------------------------------------------------------------ mutants of every valid document
const REPLACEMENTS = [null, true, 0, -1, 1.5, 4294967296, '', 'x', '\n', [], {}];

function setAt(doc, p, value) {
  if (p.length === 0) return value;
  const copy = structuredClone(doc);
  let target = copy;
  for (const k of p.slice(0, -1)) target = target[k];
  target[p[p.length - 1]] = value;
  return copy;
}
function removeAt(doc, p) {
  const copy = structuredClone(doc);
  let target = copy;
  for (const k of p.slice(0, -1)) target = target[k];
  const last = p[p.length - 1];
  if (Array.isArray(target)) target.splice(last, 1);
  else delete target[last];
  return copy;
}
const pointerOf = (p) => p.map((k) => `/${String(k).replaceAll('~', '~0').replaceAll('/', '~1')}`).join('');

function mutantsOf(doc, cap) {
  const nodes = [];
  const walk = (v, p) => {
    nodes.push({ p, v });
    if (Array.isArray(v)) v.forEach((x, i) => walk(x, [...p, i]));
    else if (isObject(v)) for (const k of Object.keys(v)) walk(v[k], [...p, k]);
  };
  walk(doc, []);
  const structural = [];
  const values = [];
  for (const { p, v } of nodes) {
    const at = pointerOf(p) || '(root)';
    if (p.length > 0) structural.push({ how: `remove ${at}`, doc: removeAt(doc, p) });
    if (isObject(v)) structural.push({ how: `add an unknown key at ${at}`, doc: setAt(doc, [...p, 'zz-unknown'], 1) });
    for (const r of [null, 0, '', [], {}, true]) structural.push({ how: `set ${at} to ${JSON.stringify(r)}`, doc: setAt(doc, p, r) });
    for (const r of REPLACEMENTS.filter((x) => ![null, 0, '', true].includes(x) && !(Array.isArray(x) && x.length === 0) && !(isObject(x) && Object.keys(x).length === 0))) {
      values.push({ how: `set ${at} to ${JSON.stringify(r)}`, doc: setAt(doc, p, r) });
    }
    if (typeof v === 'string') {
      values.push({ how: `append a newline to ${at}`, doc: setAt(doc, p, `${v}\n`) });
      values.push({ how: `prepend a space to ${at}`, doc: setAt(doc, p, ` ${v}`) });
      values.push({ how: `append x to ${at}`, doc: setAt(doc, p, `${v}x`) });
      values.push({ how: `cut ${at} short`, doc: setAt(doc, p, v.slice(0, Math.floor(v.length / 2))) });
      values.push({ how: `upper-case ${at}`, doc: setAt(doc, p, v.toUpperCase()) });
    }
    if (typeof v === 'number') {
      values.push({ how: `add 1 to ${at}`, doc: setAt(doc, p, v + 1) });
      values.push({ how: `subtract 1 from ${at}`, doc: setAt(doc, p, v - 1) });
      values.push({ how: `double ${at}`, doc: setAt(doc, p, v * 2) });
    }
    if (Array.isArray(v) && v.length > 0) {
      values.push({ how: `duplicate the first item of ${at}`, doc: setAt(doc, p, [...v, structuredClone(v[0])]) });
      values.push({ how: `append null to ${at}`, doc: setAt(doc, p, [...v, null]) });
    }
  }
  const room = Math.max(0, cap - structural.length);
  const stride = values.length > room && room > 0 ? Math.ceil(values.length / room) : 1;
  const sampled = room === 0 ? [] : values.filter((_, i) => i % stride === 0);
  return [...structural, ...sampled];
}

await guarded('mutants', async () => {
  const bases = cases.filter((c) => c.expect?.valid === true && c.kind !== 'defs');
  for (const base of bases) {
    mutantsOf(base.value, 260).forEach((m, i) => {
      cases.push({ id: `${base.id} mutant ${i}: ${m.how}`, kind: 'mutant', ref: base.ref, schema: base.schema, value: m.doc });
    });
  }
});

// ------------------------------------------------------------------ the same text, read by each language's JSON parser
// Numbers and duplicate keys are where two JSON parsers can differ, so these go to each language as text.
const EVENT_BASE = { id: '"ev-1"', v: '1', kind: '"call"', ref: '"call:S1.L3/c1"', provenance: '"own"', exposure: '"unseen"', at: '"2026-10-24T05:20:00Z"', tz: '60', day: '"2026-10-24"', dev: '"d1"' };
/** An event as JSON text, with some fields given as raw text and an optional tail of more members. */
const eventText = (replace = {}, tail = '') => `{${Object.entries({ ...EVENT_BASE, ...replace }).map(([k, v]) => `"${k}":${v}`).join(',')}${tail}}`;
const RAW_CASES = [
  ['v as 1.0', eventText({ v: '1.0' }), true],
  ['v as 1e0', eventText({ v: '1e0' }), true],
  ['v as 1E2', eventText({ v: '1E2' }), true],
  ['v as a 30-digit integer', eventText({ v: '123456789012345678901234567890' }), true],
  ['v as true', eventText({ v: 'true' }), false],
  ['v as 0.0', eventText({ v: '0.0' }), false],
  ['tz as 60.0', eventText({ tz: '60.0' }), true],
  ['tz as 6e1', eventText({ tz: '6e1' }), true],
  ['tz as -0', eventText({ tz: '-0' }), true],
  ['tz as 1.5', eventText({ tz: '1.5' }), false],
  ['seed as 4294967295.0', eventText({}, ',"seed":4294967295.0'), true],
  ['seed as 4.294967295e9', eventText({}, ',"seed":4.294967295e9'), true],
  ['seed as 4294967296.0', eventText({}, ',"seed":4294967296.0'), false],
  ['seed as 2 to the 64', eventText({}, ',"seed":18446744073709551616'), false],
  ['ms as -0.0', eventText({}, ',"ms":-0.0'), true],
  ['ms as 1e400', eventText({}, ',"ms":1e400'), true],
  ['ok as 1', eventText({}, ',"ok":1'), false],
  ['a duplicated key keeps the last value', eventText({ id: '"has space"' }, ',"id":"ok"'), true],
  ['an escaped letter in a string', eventText({ id: '"\\u0065v-1"' }), true],
  ['a lone surrogate in dev', eventText({ dev: '"\\ud800"' }), false],
  ['a NUL in ref', eventText({ ref: '"call:S1.L3/c1\\u0000"' }), false],
];
await guarded('raw json', async () => {
  for (const [name, raw, valid] of RAW_CASES) {
    cases.push({ id: `raw: ${name}`, kind: 'raw', ref: 'event', raw, value: JSON.parse(raw), expect: { valid } });
  }
  ok('raw json', `${RAW_CASES.length} documents sent as text, to be read by JSON.parse and by json.loads`);
});

// ------------------------------------------------------------------ records found in the repository
const FOUND = [];
function scanRecords() {
  const out = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      const r = rel(file);
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name) || SKIP_PREFIXES.some((p) => `${r}/`.startsWith(p))) continue;
        walk(file);
      } else if (entry.isFile() && /\.(json|ya?ml)$/.test(entry.name)) {
        if (SKIP_PREFIXES.some((p) => r.startsWith(p))) continue;
        out.push({ file, rel: r });
      }
    }
  };
  walk(ROOT);
  return out;
}

const TAG = /^statespace\/([a-z][a-z0-9-]*)@([0-9]+)$/;
await guarded('records', async () => {
  const waitingRecords = new Map();
  const wrongMajor = [];
  const unknown = new Map();
  let jsonRecords = 0;
  for (const { file, rel: r } of scanRecords()) {
    let name;
    let major;
    let via = 'schema';
    let value;
    if (file.endsWith('.json')) {
      try {
        value = readJson(file);
      } catch {
        continue; // not ours to judge; GATE-runs checks runs/ itself
      }
      const tag = isObject(value) && typeof value.schema === 'string' ? TAG.exec(value.schema) : null;
      if (tag) [, name, major] = tag;
      else if (/^runs\/RUN-[^/]+\.json$/.test(r)) {
        name = 'run';
        via = 'path';
      } else continue;
    } else {
      const text = fs.readFileSync(file, 'utf8');
      const tag = /^schema:\s*["']?statespace\/([a-z][a-z0-9-]*)@([0-9]+)["']?\s*(?:#.*)?$/m.exec(text);
      if (!tag) continue;
      [, name, major] = tag;
    }
    if (FOREIGN.has(name)) continue;
    FOUND.push({ rel: r, name });
    const doc = byName.get(name);
    if (doc && rootDocs.includes(doc)) {
      if (major !== undefined && Number(major) !== doc.major) {
        wrongMajor.push(`${r} declares statespace/${name}@${major}, but the published schema is ${name}@${doc.major}`);
        continue;
      }
      if (file.endsWith('.json')) {
        cases.push({ id: `record ${r}`, kind: 'record', ref: name, value, expect: { valid: true } });
        jsonRecords += 1;
      } else {
        yamlFiles.push({ path: r, ref: name });
        yamlExpect.set(r, { id: `record ${r}`, expect: { valid: true } });
      }
    } else if (LATER.has(name)) {
      const list = waitingRecords.get(name) ?? [];
      list.push(r);
      waitingRecords.set(name, list);
    } else {
      const list = unknown.get(name) ?? [];
      list.push(r);
      unknown.set(name, list);
    }
  }
  for (const [name, list] of waitingRecords) {
    const owner = EXPECTED.find((e) => e.name === name)?.owner ?? 'a later task';
    pending('records', `${list.length} file${list.length === 1 ? '' : 's'} (${name === 'run' ? 'runs/RUN-*.json' : list.slice(0, 2).join(', ')}) are ${name}@1 records, whose schema ${owner} publishes; they are validated once it lands`);
  }
  if (wrongMajor.length > 0) fail('records', `\n          ${first(wrongMajor)}`);
  else ok('records', `${FOUND.length} files declare a statespace/... schema: ${jsonRecords} JSON records validated, ${FOUND.filter((f) => !f.rel.endsWith('.json') && byName.has(f.name)).length} YAML records validated`);
  if (unknown.size > 0) {
    console.log(`  note  records: ${[...unknown].map(([n, l]) => `${n} (${l.length} file${l.length === 1 ? '' : 's'})`).join(', ')} declare schemas that schemas/ does not publish; they are other formats' own records and are not validated here`);
  }
});

// ------------------------------------------------------------------ the TypeScript verdicts
const tsRegistry = pkg.createRegistry([...pkg.SCHEMA_DOCUMENTS, ...extraTsDocs]);
function tsVerdict(c) {
  const issues = tsRegistry.compileSchema(c.ref)(c.value);
  return { valid: issues.length === 0, errors: issues.map((i) => ({ path: i.instancePath, keyword: i.keyword })) };
}
const tsResults = cases.map((c) => {
  try {
    return tsVerdict(c);
  } catch (e) {
    return { valid: null, error: e.message };
  }
});

// ------------------------------------------------------------------ the trim set
await guarded('trim set', async () => {
  const { codePoints } = generated.spec;
  const spec = codePoints.map((c) => c.value);
  const specSet = new Set(spec);

  // (a) the engine's own trimEnd over every code point
  const engine = [];
  for (let cp = 0; cp <= 0x10ffff; cp += 1) if (`a${String.fromCodePoint(cp)}`.trimEnd() === 'a') engine.push(cp);
  const missing = engine.filter((c) => !specSet.has(c));
  const extra = spec.filter((c) => !engine.includes(c));
  if (missing.length > 0 || extra.length > 0) {
    fail('trim set', `the schema's set differs from this engine's trimEnd: missing ${missing.map(fmt).join(' ')}, extra ${extra.map(fmt).join(' ')}`);
    return;
  }

  // (b) ECMAScript's definition, derived independently from the engine's Unicode tables
  const zs = [];
  for (let cp = 0; cp <= 0x10ffff; cp += 1) if (/^\p{Zs}$/u.test(String.fromCodePoint(cp))) zs.push(cp);
  const derived = new Set([0x09, 0x0b, 0x0c, 0xfeff, ...zs, 0x0a, 0x0d, 0x2028, 0x2029]);
  const sameAsDefinition = derived.size === specSet.size && [...derived].every((c) => specSet.has(c));
  if (!sameAsDefinition) {
    fail('trim set', 'the schema does not equal WhiteSpace plus LineTerminator derived from the engine (U+0009, U+000B, U+000C, U+FEFF, every Zs, U+000A, U+000D, U+2028, U+2029)');
    return;
  }

  // (c) each entry's annotations are true
  const wrong = [];
  for (const c of codePoints) {
    const ch = String.fromCodePoint(c.value);
    if (!new RegExp(`^\\p{${c.category}}$`, 'u').test(ch)) wrong.push(`${fmt(c.value)} is not category ${c.category}`);
    const isLineTerminator = [0x0a, 0x0d, 0x2028, 0x2029].includes(c.value);
    if ((c.ecma === 'LineTerminator') !== isLineTerminator) wrong.push(`${fmt(c.value)} is mislabeled ${c.ecma}`);
  }
  if (wrong.length > 0) {
    fail('trim set', wrong.join('; '));
    return;
  }

  // (d) written once
  let annotations = 0;
  const count = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const f = path.join(dir, e.name);
      if (e.isDirectory()) count(f);
      else if (e.name.endsWith('.json')) annotations += (fs.readFileSync(f, 'utf8').match(/"x-statementHash"\s*:/g) ?? []).length;
    }
  };
  count(here('schemas'));
  if (annotations !== 1) {
    fail('trim set', `x-statementHash is written ${annotations} times under schemas/; the spine wants it once`);
    return;
  }
  ok('trim set', `${spec.length} code points: the schema's list equals this engine's trimEnd over all 1114112 code points and WhiteSpace plus LineTerminator derived from \\p{Zs}; x-statementHash is written once`);
});
const fmt = (c) => `U+${c.toString(16).toUpperCase().padStart(4, '0')}`;

// ------------------------------------------------------------------ the statement-hash vectors, TypeScript side
const vectorFile = here('schemas', 'vectors', 'statement-hash.json');
let vectors = [];
const tsVector = new Map();
await guarded('vectors (TypeScript)', async () => {
  const spec = readJson(vectorFile);
  vectors = spec.vectors;
  const bad = [];
  let valid = 0;
  let errors = 0;
  const { codePoints } = generated.spec;
  const ids = new Set(vectors.map((v) => v.id));
  for (const c of codePoints) if (!ids.has(`trim-${fmt(c.value)}`)) bad.push(`no vector for ${fmt(c.value)}`);
  for (const must of ['keep-U+0085', 'keep-U+001C', 'keep-U+001D', 'keep-U+001E', 'keep-U+001F', 'trim-U+FEFF', 'bom-leading-kept', 'invalid-utf8-surrogate-encoded', 'crlf-bytes']) {
    if (!ids.has(must)) bad.push(`the vector set must include ${must}, which separates ECMAScript from Python's str.rstrip()`);
  }
  const attempt = async (fn) => {
    try {
      return { hash: await fn() };
    } catch (e) {
      if (e instanceof hashModule.StatementHashError) return { error: e.code };
      throw e;
    }
  };
  for (const v of vectors) {
    const row = { text: null, bytes: null };
    if ('text' in v) row.text = await attempt(() => hashModule.statementHashOfText(v.text));
    if ('bytesHex' in v) row.bytes = await attempt(() => hashModule.statementHashOfBytes(Buffer.from(v.bytesHex, 'hex')));
    if ('text' in v && !v.error) row.preimageHex = Buffer.from(hashModule.statementPreimage(v.text)).toString('hex');
    tsVector.set(v.id, row);
    if (v.error) {
      errors += 1;
      const entry = v.error === 'invalid-utf8' ? 'bytes' : 'text';
      if (row[entry]?.error !== v.error) bad.push(`${v.id}: ${entry} entry point gave ${JSON.stringify(row[entry])}, expected the error ${v.error}`);
      continue;
    }
    valid += 1;
    if (row.text?.hash !== v.sha256) bad.push(`${v.id}: text entry point gave ${JSON.stringify(row.text)}, expected ${v.sha256}`);
    if (row.bytes?.hash !== v.sha256) bad.push(`${v.id}: bytes entry point gave ${JSON.stringify(row.bytes)}, expected ${v.sha256}`);
    if (row.preimageHex !== v.canonicalHex) bad.push(`${v.id}: preimage ${row.preimageHex}, expected ${v.canonicalHex}`);
    const independent = crypto.createHash('sha256').update(Buffer.from(v.canonicalHex, 'hex')).digest('hex');
    if (independent !== v.sha256) bad.push(`${v.id}: sha256 does not match canonicalHex`);
  }
  if (bad.length > 0) fail('vectors (TypeScript)', `\n          ${first(bad)}`);
  else ok('vectors (TypeScript)', `${valid} hash vectors and ${errors} error vectors reproduced by packages/schema (text and bytes entry points)`);
});

// ------------------------------------------------------------------ the Python half
function pythonCommand() {
  const probe = spawnSync('uv', ['--version'], { encoding: 'utf8' });
  if (probe.status === 0) return { cmd: 'uv', args: ['run', '--no-project', '--quiet', ...PY_PINS, 'python', '-I', '-B'] };
  const direct = spawnSync('python3', ['-I', '-B', '-c', 'import jsonschema, yaml, referencing'], { encoding: 'utf8' });
  if (direct.status === 0) return { cmd: 'python3', args: ['-I', '-B'] };
  throw new Error('the Python half needs uv (https://docs.astral.sh/uv/) or a python3 with jsonschema and pyyaml installed');
}

let py;
await guarded('python', async () => {
  if (!generatedFresh) {
    console.log('  note  python: skipped, because the generated files are out of date (run node schemas/codegen/generate.mjs); its answers would be about the old files');
    return;
  }
  const { cmd, args } = pythonCommand();
  const request = {
    cases: cases.map((c) => ({ ref: c.kind === 'defs' || c.kind === 'selftest' ? null : c.ref, schema: c.schema ?? null, raw: c.raw ?? null, value: c.raw === undefined ? c.value : null })),
    probes: PROBES.map(([, pattern, text]) => ({ pattern, text })),
    yamlFiles,
    vectors: rel(vectorFile),
    extraSchemas: [selftest?.doc].filter(Boolean),
    typeNames: [...Object.keys(manifest), ...aliasNames(generated.model)],
    selftestRecords: selftest?.pyRecords,
    selftestTypeNames: selftest ? [...Object.keys(selftest.manifest), ...aliasNames(selftest.model)] : [],
  };
  const run = spawnSync(cmd, [...args, here('schemas', 'codegen', 'gate_py.py')], {
    input: JSON.stringify(request),
    encoding: 'utf8',
    maxBuffer: 1 << 30,
    cwd: ROOT,
  });
  if (run.status !== 0) throw new Error(`the Python helper failed (exit ${run.status}): ${(run.stderr || run.stdout).trim().split('\n').slice(-6).join(' | ')}`);
  py = JSON.parse(run.stdout);
  ok('python', `Python ${py.versions.python}, jsonschema ${py.versions.jsonschema}, referencing ${py.versions.referencing}, PyYAML ${py.versions.pyyaml}`);
});

// ------------------------------------------------------------------ comparisons
if (py) {
  await guarded('dialect probes', async () => {
    const differ = [];
    const badIdiom = [];
    PROBES.forEach(([what, pattern, text, portable], i) => {
      const js = new RegExp(pattern, 'u').test(text);
      const pyr = py.probes[i];
      if (portable && js !== pyr) badIdiom.push(`${what}: ECMAScript ${js}, Python ${pyr}`);
      if (!portable && js !== pyr) differ.push(`${what} (ECMAScript ${js}, Python ${pyr})`);
      if (!portable && js === pyr) badIdiom.push(`${what}: the languages now agree, so the lint rule for it may be relaxed (review schemas/codegen/subset.mjs)`);
    });
    if (badIdiom.some((b) => !b.includes('may be relaxed'))) fail('dialect probes', `\n          ${first(badIdiom)}`);
    else {
      ok('dialect probes', `${differ.length} of ${PROBES.filter((p) => !p[3]).length} constructs the lint forbids read differently in ECMAScript and Python; the ${PROBES.filter((p) => p[3]).length} portable probes agree`);
      for (const b of badIdiom) console.log(`  note  dialect probes: ${b}`);
      for (const d of differ) console.log(`  note  dialect probes: ${d}`);
    }
  });

  await guarded('meta-schema', async () => {
    const bad = py.metaschema.filter((m) => !m.ok).map((m) => `${m.id}: ${m.error}`);
    if (bad.length > 0) fail('meta-schema', `\n          ${first(bad)}`);
    else ok('meta-schema', `${py.metaschema.length} schemas pass the draft 2020-12 meta-schema (jsonschema)`);
  });

  await guarded('validators agree', async () => {
    const bad = [];
    const counts = { fixture: 0, defs: 0, selftest: 0, record: 0, mutant: 0, raw: 0 };
    let accepted = 0;
    let rejected = 0;
    cases.forEach((c, i) => {
      const ts = tsResults[i];
      const pyr = py.cases[i];
      if (ts.valid === null) {
        bad.push(`${c.id}: the TypeScript validator threw ${ts.error}`);
        return;
      }
      counts[c.kind] += 1;
      if (ts.valid) accepted += 1;
      else rejected += 1;
      if (ts.valid !== pyr.valid) {
        bad.push(`${c.id}: TypeScript says ${ts.valid ? 'valid' : 'invalid'}, Python says ${pyr.valid ? 'valid' : 'invalid'} (${(ts.valid ? pyr : ts).errors.map((e) => `${e.path || '/'} ${e.keyword}`).join(', ')})`);
        return;
      }
      if (c.expect) {
        if (c.expect.valid !== ts.valid) {
          bad.push(`${c.id}: expected ${c.expect.valid ? 'valid' : 'invalid'} but both validators say ${ts.valid ? 'valid' : 'invalid'} (${ts.errors.map((e) => `${e.path || '/'} ${e.keyword}`).join(', ')})`);
        } else if (!c.expect.valid && c.expect.keyword !== undefined) {
          const hit = (r) => r.errors.some((e) => e.path === c.expect.path && e.keyword === c.expect.keyword);
          if (!hit(ts) || !hit(pyr)) {
            bad.push(`${c.id}: expected ${c.expect.keyword} at ${c.expect.path || '/'}; TypeScript: ${ts.errors.map((e) => `${e.path || '/'} ${e.keyword}`).join(', ')}; Python: ${pyr.errors.map((e) => `${e.path || '/'} ${e.keyword}`).join(', ')}`);
          }
        }
      }
    });
    if (bad.length > 0) fail('validators agree', `\n          ${first(bad, 8)}`);
    else {
      ok('validators agree', `${cases.length} documents (${counts.fixture} fixtures, ${counts.defs} definition values, ${counts.selftest} self-test, ${counts.raw} sent as raw JSON text, ${counts.record} repository records, ${counts.mutant} generated mutants): TypeScript and Python reach the same verdict on all; ${accepted} valid, ${rejected} invalid; every invalid fixture fails on its stated keyword and path in both`);
    }
  });

  await guarded('yaml', async () => {
    const bad = [];
    let n = 0;
    for (const item of py.yaml) {
      const want = yamlExpect.get(item.path);
      if (item.error) {
        bad.push(`${item.path}: ${item.error}`);
        continue;
      }
      const ts = tsRegistry.compileSchema(yamlFiles.find((f) => f.path === item.path).ref)(item.doc);
      const tsErrors = ts.map((i) => ({ path: i.instancePath, keyword: i.keyword }));
      const tsValid = ts.length === 0;
      if (tsValid !== item.verdict.valid) bad.push(`${item.path}: TypeScript says ${tsValid ? 'valid' : 'invalid'}, Python says ${item.verdict.valid ? 'valid' : 'invalid'}`);
      else if (want.expect.valid !== tsValid) bad.push(`${want.id}: expected ${want.expect.valid ? 'valid' : 'invalid'}`);
      else if (!want.expect.valid && want.expect.keyword !== undefined) {
        const hit = (errors) => errors.some((e) => e.path === want.expect.path && e.keyword === want.expect.keyword);
        if (!hit(tsErrors) || !hit(item.verdict.errors)) bad.push(`${want.id}: expected ${want.expect.keyword} at ${want.expect.path}`);
      }
      n += 1;
    }
    if (bad.length > 0) fail('yaml', `\n          ${first(bad)}`);
    else ok('yaml', `${n} YAML records read by PyYAML and validated by both validators`);
  });

  await guarded('types in sync', async () => {
    const bad = [];
    const compareLang = (label, model, tsText, pyTypes, pyMaps) => {
      const expectedShapes = manifestOf(model);
      const aliases = aliasNames(model);
      // the TypeScript interfaces, read back from the generated text
      const tsShapes = parseTsInterfaces(tsText);
      compareShapes(`TypeScript${label}`, expectedShapes, tsShapes, bad);
      const tsAliases = parseTsAliases(tsText);
      if (JSON.stringify([...tsAliases].sort()) !== JSON.stringify([...aliases].sort())) bad.push(`TypeScript${label}: aliases ${tsAliases.join(',')} differ from the schemas' ${aliases.join(',')}`);
      // the Python TypedDicts, read back by introspection
      const pyShapes = {};
      for (const [name, t] of Object.entries(pyTypes)) if (t && t.keys) pyShapes[name] = { keys: t.keys, required: new Set(t.required) };
      compareShapes(`Python${label}`, expectedShapes, pyShapes, bad);
      for (const name of aliases) if (pyTypes[name]?.alias !== true) bad.push(`Python${label}: ${name} should be an alias`);
      // the two against each other
      for (const name of Object.keys(expectedShapes)) {
        const a = tsShapes[name];
        const b = pyShapes[name];
        if (a && b && JSON.stringify(a.keys) !== JSON.stringify(b.keys)) bad.push(`${name}: TypeScript has keys ${a.keys.join(',')} but Python has ${b.keys.join(',')}`);
      }
      // the type tables: by record tag, and by schema name
      const tsMaps = parseTsMaps(tsText);
      const wantRecords = Object.fromEntries(model.records.map((r) => [r.schemaConst, r.typeName]));
      const wantRoots = Object.fromEntries(model.roots.map((r) => [r.name, r.typeName]));
      const same = (a, b) => JSON.stringify(Object.entries(a).sort()) === JSON.stringify(Object.entries(b).sort());
      if (!same(tsMaps.RecordTypes ?? {}, wantRecords)) bad.push(`TypeScript${label}: RecordTypes ${JSON.stringify(tsMaps.RecordTypes)} differs from ${JSON.stringify(wantRecords)}`);
      if (!same(tsMaps.SchemaTypes ?? {}, wantRoots)) bad.push(`TypeScript${label}: SchemaTypes ${JSON.stringify(tsMaps.SchemaTypes)} differs from ${JSON.stringify(wantRoots)}`);
      if (!same(pyMaps.recordTypes, wantRecords)) bad.push(`Python${label}: RECORD_TYPES ${JSON.stringify(pyMaps.recordTypes)} differs from ${JSON.stringify(wantRecords)}`);
      if (!same(pyMaps.schemaTypes, wantRoots)) bad.push(`Python${label}: SCHEMA_TYPES ${JSON.stringify(pyMaps.schemaTypes)} differs from ${JSON.stringify(wantRoots)}`);
      return { shapes: tsShapes, pyShapes };
    };
    const tsText = fs.readFileSync(here('packages', 'schema', 'src', 'generated', 'types.ts'), 'utf8');
    const { shapes: tsShapes, pyShapes } = compareLang('', generated.model, tsText, py.types, py);
    // the root types straight from each schema file, without the type model
    for (const d of rootDocs.filter((x) => isObject(x.doc.properties))) {
      const name = d.doc['x-typeName'] ?? d.name[0].toUpperCase() + d.name.slice(1);
      const keys = Object.keys(d.doc.properties);
      const required = new Set(d.doc.required ?? []);
      for (const [lang, shapes] of [['TypeScript', tsShapes], ['Python', pyShapes]]) {
        const t = shapes[name];
        if (!t) bad.push(`${lang}: no type ${name} for ${d.file}`);
        else if (JSON.stringify(t.keys) !== JSON.stringify(keys) || [...required].some((k) => !t.required.has(k)) || [...t.required].some((k) => !required.has(k))) {
          bad.push(`${lang} ${name} does not have the properties and required keys of ${d.file}`);
        }
      }
    }
    // the self-test schema, which has keys that are not Python identifiers, a recursive type and unions
    if (selftest && py.selftestTypes) {
      compareLang(' (self-test)', selftest.model, selftest.tsTypes, py.selftestTypes, { recordTypes: py.selftestRecordTypes, schemaTypes: py.selftestSchemaTypes });
    }
    const total = Object.keys(manifest).length;
    if (bad.length > 0) fail('types in sync', `\n          ${first(bad, 10)}`);
    else {
      ok('types in sync', `${total} object types and ${aliasNames(generated.model).length} aliases: the TypeScript interfaces and the Python TypedDicts have the same keys, in the same order, with the same required keys, as the schemas; the type tables by tag and by name match; the self-test schema (${Object.keys(selftest?.manifest ?? {}).length} object types) agrees too`);
    }
  });

  await guarded('vectors (Python)', async () => {
    const bad = [];
    let agree = 0;
    let errorVectors = 0;
    for (const v of vectors) {
      const p = py.vectors.results.find((r) => r.id === v.id);
      const t = tsVector.get(v.id);
      if (!p || !t) {
        bad.push(`${v.id}: no result`);
        continue;
      }
      if (v.error) {
        errorVectors += 1;
        const entries = v.error === 'invalid-utf8' ? ['bytes', 'file'] : ['text'];
        for (const e of entries) {
          if (p[e]?.error !== v.error) bad.push(`${v.id}: Python ${e} entry point gave ${JSON.stringify(p[e])}, expected the error ${v.error}`);
        }
        if (entries.every((e) => p[e]?.error === v.error) && (v.error === 'invalid-utf8' ? t.bytes?.error === v.error : t.text?.error === v.error)) agree += 1;
        continue;
      }
      let good = true;
      for (const e of ['text', 'bytes', 'file']) {
        if (p[e]?.hash !== v.sha256) {
          bad.push(`${v.id}: Python ${e} entry point gave ${JSON.stringify(p[e])}, expected ${v.sha256}`);
          good = false;
        }
      }
      if (p.preimageHex !== v.canonicalHex) {
        bad.push(`${v.id}: Python preimage ${p.preimageHex}, expected ${v.canonicalHex}`);
        good = false;
      }
      if (t.text?.hash !== p.text?.hash || t.bytes?.hash !== p.bytes?.hash) {
        bad.push(`${v.id}: TypeScript and Python disagree`);
        good = false;
      }
      if (good) agree += 1;
    }
    // Python's str.rstrip() would not agree: show that the vectors catch it.
    const rstrip = new Set(py.vectors.rstripSet);
    const trim = new Set(py.vectors.trimSet);
    const onlyPython = [...rstrip].filter((c) => !trim.has(c));
    const onlySchema = [...trim].filter((c) => !rstrip.has(c));
    if (onlyPython.length === 0 && onlySchema.length === 0) bad.push("str.rstrip() equals the schema's set, so the premise for not using it is gone; review x-statementHash");
    for (const c of [...onlyPython, ...onlySchema]) {
      const id = onlyPython.includes(c) ? `keep-${fmt(c)}` : `trim-${fmt(c)}`;
      if (!vectors.some((v) => v.id === id)) bad.push(`no vector separates Python's str.rstrip() on ${fmt(c)}`);
    }
    if (bad.length > 0) fail('vectors (Python)', `\n          ${first(bad)}`);
    else {
      ok('vectors (Python)', `statespace.schema reproduces all ${vectors.length} vectors through its text, bytes and file entry points`);
      ok('hash agreement', `TypeScript and Python agree on all ${agree} of ${vectors.length} shared vectors (${errorVectors} are errors both reject with the same code); str.rstrip() would differ from the schema's set on ${onlyPython.length + onlySchema.length} code points (${[...onlyPython, ...onlySchema].map(fmt).join(' ')})`);
    }
  });
}

// ------------------------------------------------------------------ the keep/kill rules hash
await guarded('keep/kill rules', async () => {
  const rules = here(...KEEPKILL_FILE.split('/'));
  const run = here(...KEEPKILL_RUN.split('/'));
  const haveRules = fs.existsSync(rules);
  const haveRun = fs.existsSync(run);
  if (!haveRules && !haveRun) {
    pending('keep/kill rules', `${KEEPKILL_FILE} and ${KEEPKILL_RUN} are committed by W0-T07; this gate then checks that the file's SHA-256 never changes`);
    return;
  }
  if (haveRules !== haveRun) {
    fail('keep/kill rules', `${haveRules ? KEEPKILL_FILE : KEEPKILL_RUN} exists without ${haveRules ? KEEPKILL_RUN : KEEPKILL_FILE}`);
    return;
  }
  const actual = crypto.createHash('sha256').update(fs.readFileSync(rules)).digest('hex');
  const recorded = recordedHashes(readJson(run), KEEPKILL_FILE);
  if (recorded.size === 0) {
    fail('keep/kill rules', `${KEEPKILL_RUN} does not record a SHA-256 for ${KEEPKILL_FILE}: list it in inputs as {path, sha256}, in input and inputSha256, or as a sha256sum line in the outputs`);
  } else if (recorded.size > 1) {
    fail('keep/kill rules', `${KEEPKILL_RUN} records ${recorded.size} different hashes for ${KEEPKILL_FILE}`);
  } else if (!recorded.has(actual)) {
    fail('keep/kill rules', `${KEEPKILL_FILE} hashes to ${actual}, but ${KEEPKILL_RUN} records ${[...recorded][0]}: the rules changed after they were fixed`);
  } else ok('keep/kill rules', `${KEEPKILL_FILE} hashes to the SHA-256 recorded in ${KEEPKILL_RUN}`);
});

/** Every SHA-256 the run record gives for a file: an inputs entry, input and inputSha256, or a sha256sum line. */
function recordedHashes(record, file) {
  const found = new Set();
  const hex = /^[0-9a-f]{64}$/;
  const visit = (v) => {
    if (typeof v === 'string') {
      const m = /^([0-9a-f]{64})\s+\*?(\S+)$/.exec(v.trim());
      if (m && m[2] === file) found.add(m[1]);
    } else if (Array.isArray(v)) v.forEach(visit);
    else if (isObject(v)) {
      if (v.path === file) for (const k of ['sha256', 'sha_256', 'sha256Hex']) if (typeof v[k] === 'string' && hex.test(v[k])) found.add(v[k]);
      for (const x of Object.values(v)) visit(x);
    }
  };
  visit(record);
  if (record.input === file && typeof record.inputSha256 === 'string' && hex.test(record.inputSha256)) found.add(record.inputSha256);
  if (isObject(record.inputs) && typeof record.inputs[file] === 'string' && hex.test(record.inputs[file])) found.add(record.inputs[file]);
  if (isObject(record.inputs) && isObject(record.inputs[file]) && typeof record.inputs[file].sha256 === 'string') found.add(record.inputs[file].sha256);
  return found;
}

// ------------------------------------------------------------------ helpers for the shape comparison
/** Read `export interface Name { key?: type; ... }` blocks from a generated TypeScript file. */
function parseTsInterfaces(text) {
  const out = {};
  let current = null;
  for (const line of text.split('\n')) {
    const open = /^export interface ([A-Za-z0-9_]+) \{$/.exec(line);
    if (open) {
      current = { keys: [], required: new Set() };
      out[open[1]] = current;
      continue;
    }
    if (current && line === '}') {
      current = null;
      continue;
    }
    if (current) {
      const prop = /^ {2}("(?:[^"\\]|\\.)*"|[A-Za-z_$][A-Za-z0-9_$]*)(\?)?: .*;$/.exec(line);
      if (prop) {
        const key = prop[1].startsWith('"') ? JSON.parse(prop[1]) : prop[1];
        current.keys.push(key);
        if (!prop[2]) current.required.add(key);
      }
    }
  }
  delete out.RecordTypes;
  delete out.SchemaTypes;
  return out;
}

function aliasNames(model) {
  return model.decls.filter((d) => d.kind === 'alias').map((d) => d.name);
}

/** The `export type Name = ...;` names of a generated TypeScript file. */
function parseTsAliases(text) {
  return [...text.matchAll(/^export type ([A-Za-z0-9_]+) = /gm)].map((m) => m[1]);
}

/** The name-to-type tables of a generated TypeScript file: RecordTypes (by schema tag) and SchemaTypes (by schema name). */
function parseTsMaps(text) {
  const out = {};
  for (const name of ['RecordTypes', 'SchemaTypes']) {
    const body = new RegExp(`^export interface ${name} \\{\\n([\\s\\S]*?)^\\}`, 'm').exec(text);
    out[name] = {};
    for (const m of (body?.[1] ?? '').matchAll(/^ {2}("(?:[^"\\]|\\.)*"): ([A-Za-z0-9_]+);$/gm)) out[name][JSON.parse(m[1])] = m[2];
  }
  return out;
}

function compareShapes(lang, expected, actual, bad) {
  for (const [name, e] of Object.entries(expected)) {
    const a = actual[name];
    if (!a) {
      bad.push(`${lang}: no type ${name}`);
      continue;
    }
    if (JSON.stringify(a.keys) !== JSON.stringify(e.keys)) bad.push(`${lang} ${name}: keys ${a.keys.join(',')} differ from the schema's ${e.keys.join(',')}`);
    const want = [...e.required].sort().join();
    if ([...a.required].sort().join() !== want) bad.push(`${lang} ${name}: required keys ${[...a.required].sort().join(',')} differ from the schema's ${want}`);
  }
  for (const name of Object.keys(actual)) if (!(name in expected)) bad.push(`${lang}: type ${name} is not in the schemas`);
}

function finish() {
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  const todo = stats.pending > 0 ? `, ${stats.pending} waiting on a later task` : '';
  if (stats.failed > 0) {
    console.log(`GATE-schema: FAIL (${stats.failed} of ${stats.checks} checks failed${todo}; ${seconds} s)`);
    process.exit(1);
  }
  console.log(`GATE-schema: PASS (${stats.checks} checks${todo}${STRICT ? ', strict' : ''}; ${seconds} s)`);
  process.exit(0);
}

finish();
