#!/usr/bin/env node
// Generates the TypeScript and Python types, the embedded schema documents and the statement-hash
// constants from schemas/*.schema.json, the single source.
//
//   node schemas/codegen/generate.mjs            write the generated files
//   node schemas/codegen/generate.mjs --check    fail if a generated file differs from a fresh generation
//
// Dependency-free. GATE-schema (scripts/verify-schema.mjs) runs the check on every pull request.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildModel, loadPublished, loadSchemaFile, manifestOf, schemaDigest, statementHashSpec, lf } from './model.mjs';
import * as ts from './emit-ts.mjs';
import * as py from './emit-py.mjs';

export const OUTPUTS = {
  tsTypes: 'packages/schema/src/generated/types.ts',
  tsSchemas: 'packages/schema/src/generated/schemas.ts',
  tsSpec: 'packages/schema/src/generated/statement-hash-spec.ts',
  pyRecords: 'bench/statespace/schema/records.py',
  pySchemas: 'bench/statespace/schema/schemas.py',
  pySpec: 'bench/statespace/schema/_statement_hash_spec.py',
};

export const repoRoot = () => path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function requireLoadable(docs) {
  const bad = docs.filter((d) => d.parseError || typeof d.id !== 'string');
  if (bad.length > 0) {
    throw new Error(bad.map((d) => `${d.file}: ${d.parseError ?? 'no $id'}`).join('\n'));
  }
}

/** Generate every output in memory. Returns the file texts keyed by repo-relative path. */
export function generate(root = repoRoot()) {
  const docs = loadPublished(path.join(root, 'schemas'));
  requireLoadable(docs);
  const model = buildModel(docs);
  const digest = `sha256:${schemaDigest(docs)}`;
  const spec = statementHashSpec(docs);
  const files = new Map([
    [OUTPUTS.tsTypes, ts.emitTypes(model, digest)],
    [OUTPUTS.tsSchemas, ts.emitSchemas(docs, model, digest)],
    [OUTPUTS.tsSpec, ts.emitStatementHashSpec(spec, digest)],
    [OUTPUTS.pyRecords, py.emitRecords(model, digest)],
    [OUTPUTS.pySchemas, py.emitSchemas(docs, model, digest)],
    [OUTPUTS.pySpec, py.emitStatementHashSpec(spec, digest)],
  ]);
  return { docs, model, digest, spec, files, manifest: manifestOf(model) };
}

/** Generate from the published schemas plus the self-test schema, for the machinery test. */
export function generateSelftest(root = repoRoot()) {
  const docs = loadPublished(path.join(root, 'schemas'));
  const selftest = loadSchemaFile(path.join(root, 'schemas', 'codegen', 'selftest', 'kitchen-sink.schema.json'));
  requireLoadable([...docs, selftest]);
  const all = [...docs, selftest];
  const model = buildModel(all);
  const digest = `sha256:${schemaDigest(all)}`;
  return {
    docs: all,
    model,
    manifest: manifestOf(model),
    tsTypes: ts.emitTypes(model, digest),
    pyRecords: py.emitRecords(model, digest),
  };
}

export function check(root = repoRoot()) {
  const { files, digest } = generate(root);
  const stale = [];
  for (const [rel, text] of files) {
    const file = path.join(root, rel);
    const current = fs.existsSync(file) ? lf(fs.readFileSync(file, 'utf8')) : null;
    if (current !== text) stale.push(rel);
  }
  return { stale, digest };
}

export function write(root = repoRoot()) {
  const { files, digest } = generate(root);
  for (const [rel, text] of files) {
    const file = path.join(root, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, text);
  }
  return { written: [...files.keys()], digest };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = repoRoot();
  if (process.argv.includes('--check')) {
    const { stale, digest } = check(root);
    if (stale.length > 0) {
      console.error(`generated files are out of date with schemas/ (${digest}):\n  ${stale.join('\n  ')}\nrun: node schemas/codegen/generate.mjs`);
      process.exit(1);
    }
    console.log(`generated files match schemas/ (${digest})`);
  } else {
    const { written, digest } = write(root);
    console.log(`wrote ${written.length} files from schemas/ (${digest})\n  ${written.join('\n  ')}`);
  }
}
