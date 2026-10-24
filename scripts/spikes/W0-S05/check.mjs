// Checks the draft lasso@1 schema (Ajv, JSON Schema 2020-12, strict mode) and the reading rules
// (lasso-read.mjs) against every fixture in fixtures/manifest.json, and the text-trace fallback
// against the JSON trace of the same run. Exits 1 when any fixture does not behave as the
// manifest says.
//
//   npm ci && node check.mjs            print a table
//   node check.mjs --json               print one JSON summary (record.mjs embeds it)
import Ajv2020 from 'ajv/dist/2020.js';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compareTextToJson, readCounterexample, readTextTrace } from './lasso-read.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../../..');
const manifest = JSON.parse(readFileSync(join(here, 'fixtures/manifest.json'), 'utf8'));
const schemaBytes = readFileSync(join(root, manifest.schema));
const schema = JSON.parse(schemaBytes.toString('utf8'));
const ajvVersion = JSON.parse(readFileSync(join(here, 'node_modules/ajv/package.json'), 'utf8')).version;

const ajv = new Ajv2020({ strict: true, allErrors: true });
const validate = ajv.compile(schema);

const rows = [];
const reads = new Map();

for (const f of manifest.json) {
  const trace = JSON.parse(readFileSync(join(root, f.path), 'utf8'));
  const schemaOk = validate(trace);
  const read = schemaOk ? readCounterexample(trace) : null;
  reads.set(f.id, { trace, read });
  const got = {
    schema: schemaOk,
    ...(read && {
      kind: read.kind,
      ok: read.ok,
      n: read.n,
      loopStart: read.loopStart ?? undefined,
      stem: read.stem?.length,
      cycle: read.cycle?.length,
      stutter: read.stutter ?? undefined,
      closingLabel: read.closing?.label,
      closingChanges: read.cycleSteps?.at(-1).changes,
    }),
  };
  const problems = [];
  for (const [key, want] of Object.entries(f.expect)) {
    if (key === 'errorIncludes') {
      if (!read?.errors.some((e) => e.includes(want))) problems.push(`no error containing "${want}"`);
    } else if (got[key] !== want) problems.push(`${key}: expected ${JSON.stringify(want)}, got ${JSON.stringify(got[key])}`);
  }
  rows.push({
    id: f.id,
    path: f.path,
    schemaValid: schemaOk,
    schemaErrors: schemaOk ? [] : validate.errors.slice(0, 3).map((e) => `${e.instancePath || '/'} ${e.message}`),
    reading: read && { kind: read.kind, ok: read.ok, n: read.n, loopStart: read.loopStart, stem: read.stem?.length, cycle: read.cycle?.length, stutter: read.stutter, errors: read.errors },
    pass: problems.length === 0,
    problems,
  });
}

// What the steps of the unmodified TLC traces look like: which keys an action carries.
const shapes = {};
let stutterLabels = 0;
for (const f of manifest.json.filter((x) => x.origin === 'tlc')) {
  for (const [, action] of reads.get(f.id).trace.counterexample.action) {
    const key = Object.keys(action).sort().join('+');
    shapes[key] = (shapes[key] ?? 0) + 1;
    if (action.location.module === '--TLA+ BUILTINS--') stutterLabels += 1;
  }
}

const textRows = [];
for (const f of manifest.text) {
  const text = readFileSync(join(root, f.path), 'utf8');
  const parsed = readTextTrace(text);
  const paired = reads.get(f.pairedWith);
  const diffs = compareTextToJson(parsed, paired.trace, paired.read);
  const closing = parsed.closing && (parsed.closing.kind === 'back' ? `back:${parsed.closing.to}` : `stutter:${parsed.closing.index}`);
  const problems = diffs.map((d) => `differs from ${f.pairedWith}: ${d}`);
  if (closing !== f.expect.closing) problems.push(`closing: expected ${f.expect.closing}, got ${closing}`);
  if (parsed.propertyNamed !== f.expect.propertyNamed) problems.push(`propertyNamed: expected ${f.expect.propertyNamed}, got ${parsed.propertyNamed}`);
  if (parsed.property !== f.expect.property) problems.push(`property: expected ${f.expect.property}, got ${parsed.property}`);
  textRows.push({ id: f.id, path: f.path, pairedWith: f.pairedWith, states: parsed.states.length, closing, property: parsed.property, propertyNamed: parsed.propertyNamed, pass: problems.length === 0, problems });
}

const pass = [...rows, ...textRows].every((r) => r.pass);
const summary = {
  tool: { engine: 'ajv', version: ajvVersion, dialect: '2020-12', strict: true, node: process.version },
  schema: { path: manifest.schema, sha256: createHash('sha256').update(schemaBytes).digest('hex') },
  manifestSha256: createHash('sha256').update(readFileSync(join(here, 'fixtures/manifest.json'))).digest('hex'),
  counts: {
    fixtures: rows.length,
    schemaValid: rows.filter((r) => r.schemaValid).length,
    schemaRejected: rows.filter((r) => !r.schemaValid).length,
    lassos: rows.filter((r) => r.reading?.kind === 'lasso' && r.reading.ok).length,
    textTraces: textRows.length,
  },
  pass,
  tlcTraces: manifest.json.filter((x) => x.origin === 'tlc').length,
  actionKeys: shapes,
  stepsInModuleBuiltins: stutterLabels,
  fixtures: rows,
  textTraces: textRows,
};

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(summary, null, 2));
} else {
  console.log(`ajv ${ajvVersion}, JSON Schema 2020-12, strict; schema ${manifest.schema}`);
  for (const r of rows) {
    const rd = r.reading;
    const shape = rd ? `${rd.kind}${rd.kind === 'lasso' && rd.ok ? ` k=${rd.loopStart} stem=${rd.stem} cycle=${rd.cycle}${rd.stutter ? ' stutter' : ''}` : ''}${rd.ok ? '' : ` (${rd.errors[0]})`}` : `schema rejects: ${r.schemaErrors[0]}`;
    console.log(`${r.pass ? 'pass' : 'FAIL'}  ${r.id.padEnd(30)} ${r.schemaValid ? 'valid  ' : 'invalid'} ${shape}`);
    for (const p of r.problems) console.log(`      ${p}`);
  }
  for (const r of textRows) {
    console.log(`${r.pass ? 'pass' : 'FAIL'}  ${r.id.padEnd(30)} text    ${r.states} states, ${r.closing}, property ${r.property ?? '(not named)'}`);
    for (const p of r.problems) console.log(`      ${p}`);
  }
  console.log(`action keys over the ${summary.tlcTraces} TLC traces: ${JSON.stringify(shapes)}; steps in module --TLA+ BUILTINS--: ${stutterLabels}`);
  console.log(pass ? `all ${rows.length + textRows.length} checks behave as the manifest says` : 'FAILED');
}
process.exit(pass ? 0 : 1);
