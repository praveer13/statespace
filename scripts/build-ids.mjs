#!/usr/bin/env node
// Generate packages/ids from docs/spine/SPINE.md (and docs/EVIDENCE.md for the `dp:`
// misconception keys): src/registry.json, one entry per catalog ID with its kind and
// section, and src/index.ts, the literal-union types over the same IDs. Dependency-free.
//
//   node scripts/build-ids.mjs                  write both files
//   node scripts/build-ids.mjs --check          exit 1 if the committed files are out of date
//   node scripts/build-ids.mjs --against FILE   also exit 1 if an ID of the registry FILE
//                                               (an earlier revision) is gone or names another kind
//   node scripts/build-ids.mjs --root DIR       read and write under DIR (tests)

import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// The generator is the package's TypeScript, which Node runs as it is from 22.18; before that it needs a flag.
if (!process.features.typescript) {
  const again = spawnSync(process.execPath, ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', ...process.argv.slice(1)], { stdio: 'inherit' });
  process.exit(again.status ?? 1);
}
const { REGISTRY_PATH, TYPES_PATH } = await import('../packages/ids/src/check.ts');
const { buildRegistry, diffRegistries, EVIDENCE_PATH, generateTypes, serializeRegistry, SPINE_PATH } = await import('../packages/ids/src/registry.ts');

const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** @param {string} path @returns {string | null} */
function readOrNull(path) {
  try {
    return readFileSync(path, 'utf8');
  } catch (e) {
    if (/** @type {NodeJS.ErrnoException} */ (e).code === 'ENOENT') return null;
    throw e;
  }
}

/**
 * @param {string[]} argv
 * @param {{ out?: (s: string) => void, err?: (s: string) => void }} [io]
 * @returns {number} the exit code
 */
export function main(argv, io = {}) {
  const out = io.out ?? ((s) => process.stdout.write(`${s}\n`));
  const err = io.err ?? ((s) => process.stderr.write(`${s}\n`));
  let root = defaultRoot;
  let check = false;
  /** @type {string | null} */
  let against = null;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') {
      out('usage: node scripts/build-ids.mjs [--check] [--against registry.json] [--root dir]');
      return 0;
    } else if (a === '--check') check = true;
    else if (a === '--root') root = resolve(argv[++i] ?? '');
    else if (a === '--against') against = resolve(argv[++i] ?? '');
    else {
      err(`usage: node scripts/build-ids.mjs [--check] [--against registry.json] [--root dir]\nunknown argument: ${a}`);
      return 2;
    }
  }
  const spine = readOrNull(join(root, SPINE_PATH));
  const evidence = readOrNull(join(root, EVIDENCE_PATH));
  if (spine === null || evidence === null) {
    err(`build-ids: cannot read ${spine === null ? SPINE_PATH : EVIDENCE_PATH} under ${root}`);
    return 2;
  }
  const { registry, problems } = buildRegistry(spine, evidence);
  if (problems.length > 0) {
    for (const p of problems) err(`${p.file}${p.line === null ? '' : `:${p.line}`}: ${p.message}`);
    err(`build-ids: ${problems.length} problem(s); the registry was not written`);
    return 1;
  }
  const files = [
    [REGISTRY_PATH, serializeRegistry(registry)],
    [TYPES_PATH, generateTypes(registry)],
  ];
  let status = 0;
  if (against !== null) {
    const earlier = readOrNull(against);
    if (earlier === null) {
      err(`build-ids: cannot read ${against}`);
      return 2;
    }
    const d = diffRegistries(JSON.parse(earlier), registry);
    out(`against ${against}: ${d.added.length} added, ${d.removed.length} removed, ${d.retyped.length} retyped, ${d.changed.length} changed (fields only)`);
    for (const id of d.removed) err(`removed: ${id}`);
    for (const id of d.retyped) err(`retyped: ${id} now names another kind of thing`);
    if (d.removed.length > 0 || d.retyped.length > 0) status = 1;
  }
  if (check) {
    for (const [path, want] of files) {
      if (readOrNull(join(root, path)) !== want) {
        err(`${path} is out of date; run \`node scripts/build-ids.mjs\``);
        status = 1;
      }
    }
    if (status === 0) out(`build-ids: ${files.map(([p]) => p).join(' and ')} are current (${registry.entries.length} entries)`);
    return status;
  }
  for (const [path, text] of files) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  }
  out(`build-ids: wrote ${files.map(([p]) => p).join(' and ')} (${registry.entries.length} entries)`);
  return status;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  // a reader that closes the pipe early (`| head`) is not an error
  process.stdout.on('error', (e) => {
    if (/** @type {NodeJS.ErrnoException} */ (e).code !== 'EPIPE') throw e;
  });
  process.exitCode = main(process.argv.slice(2));
}
